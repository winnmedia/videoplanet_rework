/**
 * API 요청 재시도 핸들러
 * 네트워크 실패, 서버 에러 등에 대한 지능적인 재시도 전략 제공
 */

import { ApiError } from './client'

export interface RetryConfig {
  maxRetries: number
  baseDelay: number // 기본 지연 시간 (ms)
  maxDelay: number // 최대 지연 시간 (ms)
  backoffMultiplier: number // 지수 백오프 승수
  retryableStatusCodes: number[] // 재시도 가능한 HTTP 상태 코드
  retryableErrorTypes: string[] // 재시도 가능한 에러 유형
  jitter: boolean // 지터 사용 여부
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1초
  maxDelay: 10000, // 10초
  backoffMultiplier: 2,
  retryableStatusCodes: [
    408, // Request Timeout
    429, // Too Many Requests
    500, // Internal Server Error
    502, // Bad Gateway
    503, // Service Unavailable
    504  // Gateway Timeout
  ],
  retryableErrorTypes: [
    'NETWORK_ERROR',
    'TIMEOUT_ERROR',
    'CONNECTION_FAILED',
    'RAILWAY_CONNECTION_FAILED',
    'RAILWAY_SERVER_ERROR'
  ],
  jitter: true
}

export interface RetryContext {
  attempt: number
  totalAttempts: number
  lastError: Error | ApiError
  nextDelay: number
}

export type RetryDecisionFunction = (context: RetryContext) => boolean
export type RetryDelayFunction = (context: RetryContext) => number

/**
 * 재시도 가능한 에러인지 확인
 */
export function isRetryableError(
  error: Error | ApiError, 
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  // API 에러인 경우
  if ('status' in error && typeof error.status === 'number') {
    return config.retryableStatusCodes.includes(error.status)
  }
  
  // 에러 코드 기반 판단
  if ('code' in error && typeof error.code === 'string') {
    return config.retryableErrorTypes.includes(error.code)
  }
  
  // 에러 메시지 기반 판단
  const message = error.message.toLowerCase()
  const networkErrors = [
    'network error',
    'connection failed',
    'timeout',
    'fetch failed',
    'cors error',
    'railway connection'
  ]
  
  return networkErrors.some(networkError => message.includes(networkError))
}

/**
 * 지수 백오프 지연 시간 계산
 */
export function calculateBackoffDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1)
  let delay = Math.min(exponentialDelay, config.maxDelay)
  
  // 지터 적용 (랜덤화를 통한 thundering herd 방지)
  if (config.jitter) {
    delay = delay * (0.5 + Math.random() * 0.5)
  }
  
  return Math.floor(delay)
}

/**
 * 지연 실행
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 재시도 가능한 함수 실행기
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  customDecision?: RetryDecisionFunction,
  customDelay?: RetryDelayFunction,
  onRetry?: (context: RetryContext) => void
): Promise<T> {
  let lastError: Error | ApiError = new Error('Unknown error')
  
  for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error | ApiError
      
      // 마지막 시도인 경우 에러 던지기
      if (attempt > config.maxRetries) {
        throw lastError
      }
      
      // 재시도 가능한 에러인지 확인
      const shouldRetry = customDecision 
        ? customDecision({
            attempt,
            totalAttempts: config.maxRetries + 1,
            lastError,
            nextDelay: calculateBackoffDelay(attempt, config)
          })
        : isRetryableError(lastError, config)
      
      if (!shouldRetry) {
        throw lastError
      }
      
      // 지연 시간 계산
      const delayMs = customDelay
        ? customDelay({
            attempt,
            totalAttempts: config.maxRetries + 1,
            lastError,
            nextDelay: calculateBackoffDelay(attempt, config)
          })
        : calculateBackoffDelay(attempt, config)
      
      // 재시도 콜백 실행
      if (onRetry) {
        onRetry({
          attempt,
          totalAttempts: config.maxRetries + 1,
          lastError,
          nextDelay: delayMs
        })
      }
      
      // 지연 후 재시도
      await delay(delayMs)
    }
  }
  
  throw lastError
}

/**
 * Circuit Breaker 패턴을 위한 기본 구현
 */
export class CircuitBreaker {
  private failureCount = 0
  private successCount = 0
  private lastFailureTime = 0
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED'
  
  constructor(
    private readonly failureThreshold = 5,
    private readonly successThreshold = 2,
    private readonly timeout = 60000 // 1분
  ) {}
  
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime < this.timeout) {
        throw new Error('Circuit breaker is OPEN')
      } else {
        this.state = 'HALF_OPEN'
      }
    }
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (error) {
      this.onFailure()
      throw error
    }
  }
  
  private onSuccess(): void {
    this.failureCount = 0
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++
      if (this.successCount >= this.successThreshold) {
        this.state = 'CLOSED'
        this.successCount = 0
      }
    }
  }
  
  private onFailure(): void {
    this.failureCount++
    this.lastFailureTime = Date.now()
    
    if (this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN'
    }
  }
  
  getState(): string {
    return this.state
  }
  
  getMetrics(): { failures: number; successes: number; state: string } {
    return {
      failures: this.failureCount,
      successes: this.successCount,
      state: this.state
    }
  }
}

// 전역 Circuit Breaker 인스턴스
export const apiCircuitBreaker = new CircuitBreaker()

/**
 * 재시도 로직이 적용된 fetch 래퍼
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  retryConfig?: Partial<RetryConfig>
): Promise<Response> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig }
  
  return withRetry(
    () => apiCircuitBreaker.execute(() => fetch(url, init)),
    config,
    undefined,
    undefined,
    (context) => {
      console.warn(`API 재시도 중... (${context.attempt}/${context.totalAttempts})`, {
        url,
        error: context.lastError.message,
        nextDelay: context.nextDelay
      })
    }
  )
}

/**
 * 특정 API 엔드포인트별 재시도 설정
 */
export const ENDPOINT_RETRY_CONFIGS: Record<string, Partial<RetryConfig>> = {
  '/api/menu': {
    maxRetries: 2,
    baseDelay: 500
  },
  '/api/projects': {
    maxRetries: 3,
    baseDelay: 1000
  },
  '/api/feedback': {
    maxRetries: 3,
    baseDelay: 1000
  },
  '/api/health': {
    maxRetries: 1,
    baseDelay: 200
  }
}

/**
 * 엔드포인트별 재시도 설정 가져오기
 */
export function getRetryConfigForEndpoint(endpoint: string): RetryConfig {
  const matchingConfig = Object.entries(ENDPOINT_RETRY_CONFIGS)
    .find(([pattern]) => endpoint.startsWith(pattern))
  
  return {
    ...DEFAULT_RETRY_CONFIG,
    ...(matchingConfig ? matchingConfig[1] : {})
  }
}