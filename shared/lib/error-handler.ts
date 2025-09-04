/**
 * @fileoverview FSD-compliant HTTP 에러 핸들링 시스템
 * @description 웹서비스 전역에서 발생하는 HTTP 에러들을 체계적으로 분류하고 처리
 */

import { z } from 'zod';

// HTTP 에러 상태 코드 타입 정의
export const HttpStatusCodeSchema = z.union([
  z.literal(400), // Bad Request
  z.literal(401), // Unauthorized  
  z.literal(403), // Forbidden
  z.literal(404), // Not Found
  z.literal(408), // Request Timeout
  z.literal(409), // Conflict
  z.literal(422), // Unprocessable Entity
  z.literal(429), // Too Many Requests
  z.literal(500), // Internal Server Error
  z.literal(502), // Bad Gateway
  z.literal(503), // Service Unavailable
  z.literal(504), // Gateway Timeout
]);

export type HttpStatusCode = z.infer<typeof HttpStatusCodeSchema>;

// 에러 심각도 레벨
export enum ErrorSeverity {
  LOW = 'low',        // 사용자 입력 오류 등
  MEDIUM = 'medium',  // API 일시 오류 등
  HIGH = 'high',      // 서비스 중단 등
  CRITICAL = 'critical' // 보안/데이터 손실 등
}

// 에러 카테고리
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  NETWORK = 'network',
  SERVER = 'server',
  CLIENT = 'client',
  TIMEOUT = 'timeout',
  RATE_LIMIT = 'rate_limit',
}

// 표준화된 에러 정보 인터페이스
export interface StandardizedError {
  readonly id: string;
  readonly message: string;
  readonly userMessage: string;
  readonly statusCode: HttpStatusCode;
  readonly category: ErrorCategory;
  readonly severity: ErrorSeverity;
  readonly timestamp: string;
  readonly context?: Record<string, unknown>;
  readonly retryable: boolean;
  readonly maxRetries?: number;
}

// 에러 매핑 설정
const ERROR_MAPPINGS: Record<HttpStatusCode, {
  category: ErrorCategory;
  severity: ErrorSeverity;
  retryable: boolean;
  maxRetries?: number;
}> = {
  400: { 
    category: ErrorCategory.VALIDATION, 
    severity: ErrorSeverity.LOW, 
    retryable: false 
  },
  401: { 
    category: ErrorCategory.AUTHENTICATION, 
    severity: ErrorSeverity.MEDIUM, 
    retryable: false 
  },
  403: { 
    category: ErrorCategory.AUTHORIZATION, 
    severity: ErrorSeverity.MEDIUM, 
    retryable: false 
  },
  404: { 
    category: ErrorCategory.CLIENT, 
    severity: ErrorSeverity.LOW, 
    retryable: false 
  },
  408: { 
    category: ErrorCategory.TIMEOUT, 
    severity: ErrorSeverity.MEDIUM, 
    retryable: true, 
    maxRetries: 3 
  },
  409: { 
    category: ErrorCategory.VALIDATION, 
    severity: ErrorSeverity.MEDIUM, 
    retryable: false 
  },
  422: { 
    category: ErrorCategory.VALIDATION, 
    severity: ErrorSeverity.LOW, 
    retryable: false 
  },
  429: { 
    category: ErrorCategory.RATE_LIMIT, 
    severity: ErrorSeverity.MEDIUM, 
    retryable: true, 
    maxRetries: 5 
  },
  500: { 
    category: ErrorCategory.SERVER, 
    severity: ErrorSeverity.HIGH, 
    retryable: true, 
    maxRetries: 2 
  },
  502: { 
    category: ErrorCategory.NETWORK, 
    severity: ErrorSeverity.HIGH, 
    retryable: true, 
    maxRetries: 3 
  },
  503: { 
    category: ErrorCategory.SERVER, 
    severity: ErrorSeverity.HIGH, 
    retryable: true, 
    maxRetries: 3 
  },
  504: { 
    category: ErrorCategory.TIMEOUT, 
    severity: ErrorSeverity.HIGH, 
    retryable: true, 
    maxRetries: 2 
  },
};

// 사용자 친화적 에러 메시지
const USER_MESSAGES: Record<ErrorCategory, string> = {
  [ErrorCategory.AUTHENTICATION]: '로그인이 필요합니다. 다시 로그인해주세요.',
  [ErrorCategory.AUTHORIZATION]: '이 작업을 수행할 권한이 없습니다.',
  [ErrorCategory.VALIDATION]: '입력하신 정보를 다시 확인해주세요.',
  [ErrorCategory.NETWORK]: '네트워크 연결을 확인해주세요.',
  [ErrorCategory.SERVER]: '서버에 일시적인 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
  [ErrorCategory.CLIENT]: '요청하신 페이지를 찾을 수 없습니다.',
  [ErrorCategory.TIMEOUT]: '요청 시간이 초과되었습니다. 다시 시도해주세요.',
  [ErrorCategory.RATE_LIMIT]: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
};

/**
 * HTTP 에러를 표준화된 형태로 변환하는 팩토리 함수
 */
export function createStandardizedError(
  statusCode: HttpStatusCode,
  originalMessage?: string,
  context?: Record<string, unknown>
): StandardizedError {
  const mapping = ERROR_MAPPINGS[statusCode];
  
  return {
    id: crypto.randomUUID(),
    message: originalMessage || `HTTP ${statusCode} Error`,
    userMessage: USER_MESSAGES[mapping.category],
    statusCode,
    category: mapping.category,
    severity: mapping.severity,
    timestamp: new Date().toISOString(),
    context,
    retryable: mapping.retryable,
    maxRetries: mapping.maxRetries,
  };
}

/**
 * 에러 로깅 유틸리티 (PII 필터링 포함)
 */
export function logError(error: StandardizedError): void {
  // PII 정보 제거
  const sanitizedContext = error.context ? sanitizeContext(error.context) : undefined;
  
  const logData = {
    ...error,
    context: sanitizedContext,
  };

  // 심각도에 따른 로깅 레벨 결정
  switch (error.severity) {
    case ErrorSeverity.LOW:
      console.info('[ERROR:LOW]', logData);
      break;
    case ErrorSeverity.MEDIUM:
      console.warn('[ERROR:MEDIUM]', logData);
      break;
    case ErrorSeverity.HIGH:
      console.error('[ERROR:HIGH]', logData);
      break;
    case ErrorSeverity.CRITICAL:
      console.error('[ERROR:CRITICAL]', logData);
      // Critical 에러는 외부 모니터링 시스템으로도 전송
      if (typeof window !== 'undefined' && 'sentry' in window) {
        // Sentry 등 외부 서비스로 전송
        console.error('[SENTRY]', logData);
      }
      break;
  }
}

/**
 * PII 정보 제거 함수
 */
function sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
  const piiKeys = ['password', 'token', 'secret', 'key', 'email', 'phone', 'ssn', 'cardNumber'];
  const sanitized = { ...context };
  
  for (const [key, value] of Object.entries(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (piiKeys.some(piiKey => lowerKey.includes(piiKey))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeContext(value as Record<string, unknown>);
    }
  }
  
  return sanitized;
}

/**
 * 재시도 가능한 에러인지 확인
 */
export function isRetryableError(error: StandardizedError): boolean {
  return error.retryable;
}

/**
 * 에러 복구 전략 결정
 */
export function getRecoveryStrategy(error: StandardizedError): 'retry' | 'redirect' | 'fallback' | 'none' {
  switch (error.category) {
    case ErrorCategory.AUTHENTICATION:
      return 'redirect'; // 로그인 페이지로 리다이렉트
    case ErrorCategory.TIMEOUT:
    case ErrorCategory.NETWORK:
    case ErrorCategory.SERVER:
      return error.retryable ? 'retry' : 'fallback';
    case ErrorCategory.RATE_LIMIT:
      return 'retry';
    case ErrorCategory.VALIDATION:
    case ErrorCategory.AUTHORIZATION:
      return 'fallback';
    default:
      return 'none';
  }
}

/**
 * HTTP 에러 핸들러 클래스 (FSD shared/lib 레이어)
 */
export class HttpErrorHandler {
  private static instance: HttpErrorHandler;
  private retryAttempts = new Map<string, number>();

  private constructor() {}

  public static getInstance(): HttpErrorHandler {
    if (!HttpErrorHandler.instance) {
      HttpErrorHandler.instance = new HttpErrorHandler();
    }
    return HttpErrorHandler.instance;
  }

  /**
   * HTTP 에러 처리 메인 함수
   */
  public async handleError(
    statusCode: HttpStatusCode,
    originalMessage?: string,
    context?: Record<string, unknown>
  ): Promise<StandardizedError> {
    const error = createStandardizedError(statusCode, originalMessage, context);
    
    // 에러 로깅
    logError(error);
    
    // 복구 전략 실행
    const strategy = getRecoveryStrategy(error);
    await this.executeRecoveryStrategy(error, strategy);
    
    return error;
  }

  /**
   * 복구 전략 실행
   */
  private async executeRecoveryStrategy(
    error: StandardizedError, 
    strategy: 'retry' | 'redirect' | 'fallback' | 'none'
  ): Promise<void> {
    switch (strategy) {
      case 'redirect':
        if (typeof window !== 'undefined') {
          // 클라이언트 사이드에서만 실행
          window.location.href = '/auth/login';
        }
        break;
      case 'fallback':
        // 폴백 UI 상태 설정 (상태 관리 시스템과 연계)
        console.info('[FALLBACK]', `Fallback strategy for error ${error.id}`);
        break;
      case 'retry':
        // 재시도 로직은 호출하는 쪽에서 처리
        console.info('[RETRY]', `Retry strategy available for error ${error.id}`);
        break;
      case 'none':
      default:
        // 특별한 처리 없음
        break;
    }
  }

  /**
   * 재시도 횟수 추적
   */
  public trackRetryAttempt(errorId: string): number {
    const currentAttempts = this.retryAttempts.get(errorId) || 0;
    const newAttempts = currentAttempts + 1;
    this.retryAttempts.set(errorId, newAttempts);
    return newAttempts;
  }

  /**
   * 재시도 카운터 리셋
   */
  public resetRetryCounter(errorId: string): void {
    this.retryAttempts.delete(errorId);
  }

  /**
   * 재시도 가능 여부 확인
   */
  public canRetry(error: StandardizedError): boolean {
    if (!error.retryable || !error.maxRetries) {
      return false;
    }
    
    const attempts = this.retryAttempts.get(error.id) || 0;
    return attempts < error.maxRetries;
  }
}

// 싱글톤 인스턴스 export
export const httpErrorHandler = HttpErrorHandler.getInstance();

// 편의 함수들
export const handleHttpError = httpErrorHandler.handleError.bind(httpErrorHandler);
export const canRetryError = httpErrorHandler.canRetry.bind(httpErrorHandler);
export const trackRetry = httpErrorHandler.trackRetryAttempt.bind(httpErrorHandler);
export const resetRetry = httpErrorHandler.resetRetryCounter.bind(httpErrorHandler);