/**
 * 표준화된 API 응답 형식 유틸리티
 * VideoPlanet 프로젝트의 모든 API 엔드포인트에서 일관된 응답 형식을 보장합니다.
 */

import { NextResponse } from 'next/server'
import { ZodError } from 'zod'

/**
 * 표준 성공 응답 타입
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
  timestamp: string
  correlationId?: string
}

/**
 * 표준 에러 응답 타입
 */
export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
    timestamp: string
    correlationId?: string
  }
}

/**
 * API 에러 코드 상수
 */
export const API_ERROR_CODES = {
  // 인증 관련 (AUTH_*)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS: 'AUTH_INSUFFICIENT_PERMISSIONS',

  // 검증 관련 (VALIDATION_*)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_MISSING_REQUIRED_FIELD: 'VALIDATION_MISSING_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',

  // 리소스 관련 (RESOURCE_*)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_ACCESS_DENIED: 'RESOURCE_ACCESS_DENIED',

  // 프로젝트 관련 (PROJECT_*)
  PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
  PROJECT_CREATE_FAILED: 'PROJECT_CREATE_FAILED',
  PROJECT_UPDATE_FAILED: 'PROJECT_UPDATE_FAILED',

  // 비디오 관련 (VIDEO_*)
  VIDEO_UPLOAD_FAILED: 'VIDEO_UPLOAD_FAILED',
  VIDEO_PROCESSING_FAILED: 'VIDEO_PROCESSING_FAILED',
  VIDEO_NOT_FOUND: 'VIDEO_NOT_FOUND',

  // 서버 관련 (SERVER_*)
  SERVER_INTERNAL_ERROR: 'SERVER_INTERNAL_ERROR',
  SERVER_SERVICE_UNAVAILABLE: 'SERVER_SERVICE_UNAVAILABLE',
  SERVER_TIMEOUT: 'SERVER_TIMEOUT',

  // 외부 서비스 관련 (EXTERNAL_*)
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',
  EXTERNAL_API_RATE_LIMIT: 'EXTERNAL_API_RATE_LIMIT',
} as const

/**
 * 성공 응답 생성
 */
export function createSuccessResponse<T>(
  data: T,
  message?: string,
  status: number = 200
): NextResponse<ApiSuccessResponse<T>> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    timestamp: new Date().toISOString(),
    correlationId: crypto.randomUUID(),
  }

  if (message) {
    response.message = message
  }

  return NextResponse.json(response, { status })
}

/**
 * 에러 응답 생성
 */
export function createErrorResponse(
  code: keyof typeof API_ERROR_CODES | string,
  message: string,
  status: number,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      timestamp: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
    },
  }

  if (details) {
    response.error.details = details
  }

  return NextResponse.json(response, { status })
}

/**
 * Zod 검증 오류 응답 생성
 */
export function createValidationErrorResponse(
  zodError: ZodError,
  customMessage?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    API_ERROR_CODES.VALIDATION_FAILED,
    customMessage || '입력 데이터 검증에 실패했습니다.',
    400,
    {
      validationErrors: zodError.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    }
  )
}

/**
 * 인증 필요 에러 응답
 */
export function createAuthRequiredResponse(message: string = '인증이 필요합니다.'): NextResponse<ApiErrorResponse> {
  return createErrorResponse(API_ERROR_CODES.AUTH_REQUIRED, message, 401)
}

/**
 * 권한 부족 에러 응답
 */
export function createForbiddenResponse(message: string = '접근 권한이 없습니다.'): NextResponse<ApiErrorResponse> {
  return createErrorResponse(API_ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS, message, 403)
}

/**
 * 리소스 없음 에러 응답
 */
export function createNotFoundResponse(resource: string = '리소스'): NextResponse<ApiErrorResponse> {
  return createErrorResponse(API_ERROR_CODES.RESOURCE_NOT_FOUND, `요청하신 ${resource}를 찾을 수 없습니다.`, 404)
}

/**
 * 서버 내부 오류 응답
 */
export function createInternalServerErrorResponse(
  message: string = '서버 내부 오류가 발생했습니다.',
  details?: unknown
): NextResponse<ApiErrorResponse> {
  // 프로덕션에서는 상세 정보 숨김
  const shouldHideDetails = process.env.NODE_ENV === 'production'

  return createErrorResponse(
    API_ERROR_CODES.SERVER_INTERNAL_ERROR,
    message,
    500,
    shouldHideDetails ? undefined : details
  )
}

/**
 * Rate Limit 초과 응답
 */
export function createRateLimitResponse(retryAfter: number = 60): NextResponse<ApiErrorResponse> {
  const response = createErrorResponse(
    API_ERROR_CODES.EXTERNAL_API_RATE_LIMIT,
    '요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.',
    429
  )

  response.headers.set('Retry-After', retryAfter.toString())
  return response
}

/**
 * 외부 서비스 오류 응답
 */
export function createExternalServiceErrorResponse(
  serviceName: string,
  message?: string
): NextResponse<ApiErrorResponse> {
  return createErrorResponse(
    API_ERROR_CODES.EXTERNAL_SERVICE_ERROR,
    message || `${serviceName} 서비스에서 오류가 발생했습니다.`,
    503
  )
}

/**
 * API 응답 타입 가드
 */
export function isApiSuccessResponse<T>(response: any): response is ApiSuccessResponse<T> {
  return response && response.success === true && 'data' in response
}

export function isApiErrorResponse(response: any): response is ApiErrorResponse {
  return response && response.success === false && 'error' in response
}
