/**
 * FSD 준수 시스템 전역 에러 처리 아키텍처
 * 경계: shared/lib - 모든 레이어에서 사용 가능한 유틸리티
 */

import { z } from 'zod'

// 표준 HTTP 에러 코드 열거형
export enum HttpErrorCode {
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
}

// 비즈니스 도메인 에러 코드
export enum BusinessErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  PERMISSION_DENIED = 'PERMISSION_DENIED', 
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  DUPLICATE_RESOURCE = 'DUPLICATE_RESOURCE',
  OPERATION_FAILED = 'OPERATION_FAILED',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
}

// API 에러 응답 스키마 (Zod 런타임 검증)
export const ApiErrorResponseSchema = z.object({
  error_code: z.string(),
  error_message: z.string(),
  details: z.record(z.any()).optional(),
  timestamp: z.string().optional(),
  request_id: z.string().optional(),
})

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>

// 표준화된 에러 클래스 계층
export abstract class BaseError extends Error {
  abstract readonly code: string
  abstract readonly httpStatus: HttpErrorCode
  public readonly timestamp: string
  public readonly context?: Record<string, any>

  constructor(message: string, context?: Record<string, any>) {
    super(message)
    this.timestamp = new Date().toISOString()
    this.context = context
    this.name = this.constructor.name
  }
}

export class ValidationError extends BaseError {
  readonly code = BusinessErrorCode.VALIDATION_FAILED
  readonly httpStatus = HttpErrorCode.BAD_REQUEST
}

export class AuthenticationError extends BaseError {
  readonly code = BusinessErrorCode.PERMISSION_DENIED
  readonly httpStatus = HttpErrorCode.UNAUTHORIZED
}

export class AuthorizationError extends BaseError {
  readonly code = BusinessErrorCode.PERMISSION_DENIED
  readonly httpStatus = HttpErrorCode.FORBIDDEN
}

export class NotFoundError extends BaseError {
  readonly code = BusinessErrorCode.RESOURCE_NOT_FOUND
  readonly httpStatus = HttpErrorCode.NOT_FOUND
}

export class ConflictError extends BaseError {
  readonly code = BusinessErrorCode.DUPLICATE_RESOURCE
  readonly httpStatus = HttpErrorCode.CONFLICT
}

export class ExternalServiceError extends BaseError {
  readonly code = BusinessErrorCode.EXTERNAL_SERVICE_ERROR
  readonly httpStatus = HttpErrorCode.BAD_GATEWAY
}

// 에러 변환 유틸리티
export class ErrorTransformer {
  /**
   * API 응답을 표준 에러로 변환
   */
  static fromApiResponse(response: unknown): BaseError {
    try {
      const parsed = ApiErrorResponseSchema.parse(response)
      
      switch (parsed.error_code) {
        case BusinessErrorCode.VALIDATION_FAILED:
          return new ValidationError(parsed.error_message, parsed.details)
        case BusinessErrorCode.PERMISSION_DENIED:
          return new AuthorizationError(parsed.error_message, parsed.details)
        case BusinessErrorCode.RESOURCE_NOT_FOUND:
          return new NotFoundError(parsed.error_message, parsed.details)
        case BusinessErrorCode.DUPLICATE_RESOURCE:
          return new ConflictError(parsed.error_message, parsed.details)
        case BusinessErrorCode.EXTERNAL_SERVICE_ERROR:
          return new ExternalServiceError(parsed.error_message, parsed.details)
        default:
          return new ExternalServiceError(
            parsed.error_message || '알 수 없는 서버 에러가 발생했습니다.',
            parsed.details
          )
      }
    } catch (parseError) {
      // API 응답이 표준 형식이 아닌 경우
      return new ExternalServiceError(
        '서버로부터 예상치 못한 응답을 받았습니다.',
        { originalResponse: response, parseError: parseError.message }
      )
    }
  }

  /**
   * HTTP 상태 코드 기반 에러 생성
   */
  static fromHttpStatus(status: number, message?: string): BaseError {
    const defaultMessage = message || '요청을 처리할 수 없습니다.'
    
    switch (status) {
      case HttpErrorCode.BAD_REQUEST:
        return new ValidationError(defaultMessage)
      case HttpErrorCode.UNAUTHORIZED:
        return new AuthenticationError(message || '인증이 필요합니다.')
      case HttpErrorCode.FORBIDDEN:
        return new AuthorizationError(message || '접근 권한이 없습니다.')
      case HttpErrorCode.NOT_FOUND:
        return new NotFoundError(message || '요청한 리소스를 찾을 수 없습니다.')
      case HttpErrorCode.CONFLICT:
        return new ConflictError(message || '리소스 충돌이 발생했습니다.')
      case HttpErrorCode.UNPROCESSABLE_ENTITY:
        return new ValidationError(message || '입력 데이터가 올바르지 않습니다.')
      default:
        return new ExternalServiceError(
          message || '서버에서 예상치 못한 오류가 발생했습니다.',
          { httpStatus: status }
        )
    }
  }
}

// 에러 로깅 인터페이스 (PII 데이터 제외)
export interface ErrorLogger {
  logError(error: BaseError, context?: Record<string, any>): void
}

export class ConsoleErrorLogger implements ErrorLogger {
  logError(error: BaseError, context?: Record<string, any>): void {
    const logData = {
      code: error.code,
      message: error.message,
      httpStatus: error.httpStatus,
      timestamp: error.timestamp,
      context: this.sanitizeContext(error.context),
      additionalContext: this.sanitizeContext(context),
    }

    console.error('[ERROR_LOG]', JSON.stringify(logData, null, 2))
  }

  /**
   * PII 데이터 제거 및 안전한 로깅을 위한 컨텍스트 정제
   */
  private sanitizeContext(context?: Record<string, any>): Record<string, any> | undefined {
    if (!context) return undefined

    const sanitized: Record<string, any> = {}
    const piiFields = ['email', 'password', 'token', 'api_key', 'secret']

    for (const [key, value] of Object.entries(context)) {
      if (piiFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]'
      } else {
        sanitized[key] = value
      }
    }

    return sanitized
  }
}

// 전역 에러 핸들러
export class GlobalErrorHandler {
  private logger: ErrorLogger

  constructor(logger: ErrorLogger = new ConsoleErrorLogger()) {
    this.logger = logger
  }

  /**
   * Promise rejection 글로벌 핸들러
   */
  handleUnhandledRejection = (event: PromiseRejectionEvent): void => {
    const error = this.normalizeError(event.reason)
    this.logger.logError(error, { type: 'unhandled_rejection' })
    
    // 개발 환경에서는 콘솔에 출력
    if (process.env.NODE_ENV === 'development') {
      console.error('Unhandled Promise Rejection:', error)
    }
  }

  /**
   * 일반 에러 글로벌 핸들러  
   */
  handleError = (event: ErrorEvent): void => {
    const error = this.normalizeError(event.error || event.message)
    this.logger.logError(error, { 
      type: 'runtime_error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    })
  }

  /**
   * 에러를 표준 형식으로 정규화
   */
  private normalizeError(error: unknown): BaseError {
    if (error instanceof BaseError) {
      return error
    }

    if (error instanceof Error) {
      return new ExternalServiceError(error.message, { 
        originalError: error.name,
        stack: error.stack 
      })
    }

    return new ExternalServiceError(
      typeof error === 'string' ? error : '알 수 없는 에러가 발생했습니다.',
      { originalError: error }
    )
  }

  /**
   * 글로벌 에러 핸들러 등록
   */
  register(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleError)
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection)
    }
  }

  /**
   * 글로벌 에러 핸들러 해제
   */
  unregister(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleError)
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection)
    }
  }
}

// 에러 바운더리를 위한 유틸리티
export interface ErrorBoundaryState {
  hasError: boolean
  error?: BaseError
  errorId?: string
}

export const createErrorBoundaryState = (error?: Error): ErrorBoundaryState => {
  if (!error) {
    return { hasError: false }
  }

  const normalizedError = error instanceof BaseError 
    ? error 
    : new ExternalServiceError(error.message)

  return {
    hasError: true,
    error: normalizedError,
    errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }
}

// 재시도 로직을 위한 유틸리티
export interface RetryConfig {
  maxAttempts: number
  baseDelay: number
  maxDelay: number
  backoffMultiplier: number
}

export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelay = 1000,
      maxDelay = 10000,
      backoffMultiplier = 2
    } = config

    let lastError: Error
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error as Error
        
        if (attempt === maxAttempts) break
        if (!this.isRetryableError(error)) break

        const delay = Math.min(baseDelay * Math.pow(backoffMultiplier, attempt - 1), maxDelay)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError!
  }

  private static isRetryableError(error: unknown): boolean {
    if (error instanceof BaseError) {
      // 5xx 에러나 네트워크 에러만 재시도
      return error.httpStatus >= 500 || error instanceof ExternalServiceError
    }
    
    // 네트워크 에러 패턴 확인
    const errorMessage = (error as Error)?.message?.toLowerCase() || ''
    return errorMessage.includes('network') || 
           errorMessage.includes('timeout') ||
           errorMessage.includes('connection')
  }
}