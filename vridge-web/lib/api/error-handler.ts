import { NextResponse, NextRequest } from 'next/server'

// 에러 타입 정의
export interface APIError {
  error: string
  message: string
  statusCode: number
  timestamp: string
  path?: string
  details?: Record<string, unknown> | string | number | null
}

// HTTP 상태 코드별 기본 메시지
const statusMessages: Record<number, string> = {
  400: '잘못된 요청입니다',
  401: '인증이 필요합니다',
  403: '접근 권한이 없습니다',
  404: '요청한 리소스를 찾을 수 없습니다',
  405: '허용되지 않은 메서드입니다',
  409: '충돌이 발생했습니다',
  422: '처리할 수 없는 요청입니다',
  429: '너무 많은 요청이 발생했습니다',
  500: '서버 내부 오류가 발생했습니다',
  502: '게이트웨이 오류가 발생했습니다',
  503: '서비스를 일시적으로 사용할 수 없습니다',
  504: '게이트웨이 시간 초과가 발생했습니다',
}

// API 에러 응답 생성
export function createErrorResponse(
  statusCode: number,
  message?: string,
  details?: Record<string, unknown> | string | number | null,
  path?: string
): NextResponse {
  const errorResponse: APIError = {
    error: getErrorName(statusCode),
    message: message || statusMessages[statusCode] || '알 수 없는 오류가 발생했습니다',
    statusCode,
    timestamp: new Date().toISOString(),
    path,
    details: process.env.NODE_ENV === 'development' ? details : undefined,
  }

  return NextResponse.json(errorResponse, { status: statusCode })
}

// 에러 이름 가져오기
function getErrorName(statusCode: number): string {
  const errorNames: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    502: 'BAD_GATEWAY',
    503: 'SERVICE_UNAVAILABLE',
    504: 'GATEWAY_TIMEOUT',
  }

  return errorNames[statusCode] || 'ERROR'
}

// Next.js API 라우트 핸들러 타입 (NextRequest 지원) - Next.js 15 호환
type NextApiHandler = (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => Promise<Response | NextResponse>

// 에러 처리 래퍼
export function withErrorHandler<T extends NextApiHandler>(
  handler: T
): T {
  return (async (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => {
    try {
      return await handler(request, context)
    } catch (error) {
      console.error('API Error:', error)
      
      // Custom error types
      if (error instanceof ValidationError) {
        return createErrorResponse(422, error.message, error.fields)
      }
      
      if (error instanceof AuthenticationError) {
        return createErrorResponse(401, error.message)
      }
      
      if (error instanceof AuthorizationError) {
        return createErrorResponse(403, error.message)
      }
      
      if (error instanceof NotFoundError) {
        return createErrorResponse(404, error.message)
      }
      
      if (error instanceof Error) {
        // 특정 에러 메시지 패턴 처리
        if (error.message.toLowerCase().includes('unauthorized')) {
          return createErrorResponse(401, error.message)
        }
        if (error.message.toLowerCase().includes('not found')) {
          return createErrorResponse(404, error.message)
        }
        if (error.message.toLowerCase().includes('validation')) {
          return createErrorResponse(422, error.message)
        }
        if (error.message.toLowerCase().includes('forbidden')) {
          return createErrorResponse(403, error.message)
        }
        
        // 기본 서버 에러
        return createErrorResponse(500, error.message)
      }
      
      return createErrorResponse(500)
    }
  }) as T
}

// 유효성 검사 에러 처리
export class ValidationError extends Error {
  constructor(
    message: string,
    public fields?: Record<string, string[]>
  ) {
    super(message)
    this.name = 'ValidationError'
  }
}

// 인증 에러 처리
export class AuthenticationError extends Error {
  constructor(message: string = '인증이 필요합니다') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

// 권한 에러 처리
export class AuthorizationError extends Error {
  constructor(message: string = '접근 권한이 없습니다') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

// NotFound 에러 처리
export class NotFoundError extends Error {
  constructor(message: string = '리소스를 찾을 수 없습니다') {
    super(message)
    this.name = 'NotFoundError'
  }
}