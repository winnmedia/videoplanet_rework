import { NextRequest } from 'next/server'

import { withErrorHandler, createErrorResponse, ValidationError, AuthenticationError, AuthorizationError, NotFoundError } from '@/lib/api/error-handler'

/**
 * Test endpoint for demonstrating error handling
 * This endpoint simulates various error scenarios based on query parameters
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  const searchParams = request.nextUrl.searchParams
  const scenario = searchParams.get('scenario')
  
  // Simulate different error scenarios
  switch (scenario) {
    case 'validation':
      throw new ValidationError('입력 데이터가 유효하지 않습니다', {
        email: ['이메일 형식이 올바르지 않습니다'],
        password: ['비밀번호는 8자 이상이어야 합니다']
      })
      
    case 'unauthorized':
      throw new AuthenticationError('로그인이 필요한 서비스입니다')
      
    case 'forbidden':
      throw new AuthorizationError('이 리소스에 접근할 권한이 없습니다')
      
    case 'not-found':
      throw new NotFoundError('요청한 데이터를 찾을 수 없습니다')
      
    case 'server-error':
      throw new Error('서버 내부 오류가 발생했습니다')
      
    case 'timeout':
      // Simulate a long-running process
      await new Promise((resolve) => setTimeout(resolve, 10000))
      return new Response('Timeout test', { status: 200 })
      
    case 'success':
    default:
      return new Response(JSON.stringify({
        success: true,
        message: '정상적으로 처리되었습니다',
        data: {
          timestamp: new Date().toISOString(),
          scenario: scenario || 'default'
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      })
  }
})

/**
 * POST endpoint for testing validation errors
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  let body: unknown
  
  try {
    body = await request.json()
  } catch {
    return createErrorResponse(400, 'Invalid JSON format')
  }
  
  // Type guard to check if body is a valid object
  if (!body || typeof body !== 'object') {
    return createErrorResponse(400, 'Invalid request body')
  }
  
  const typedBody = body as { email?: unknown; password?: unknown }
  
  // Validate required fields
  const errors: Record<string, string[]> = {}
  
  if (!typedBody.email) {
    errors.email = ['이메일은 필수 항목입니다']
  } else if (typeof typedBody.email !== 'string' || !typedBody.email.includes('@')) {
    errors.email = ['올바른 이메일 형식이 아닙니다']
  }
  
  if (!typedBody.password) {
    errors.password = ['비밀번호는 필수 항목입니다']
  } else if (typeof typedBody.password !== 'string' || typedBody.password.length < 8) {
    errors.password = ['비밀번호는 8자 이상이어야 합니다']
  }
  
  if (Object.keys(errors).length > 0) {
    throw new ValidationError('입력 데이터 검증 실패', errors)
  }
  
  // Simulate successful processing
  return new Response(JSON.stringify({
    success: true,
    message: '데이터가 성공적으로 처리되었습니다',
    data: {
      email: typedBody.email,
      createdAt: new Date().toISOString()
    }
  }), {
    status: 201,
    headers: {
      'Content-Type': 'application/json',
    },
  })
})

/**
 * DELETE endpoint for testing authorization
 */
export const DELETE = withErrorHandler(async (request: NextRequest) => {
  // Check for authorization header
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader) {
    throw new AuthenticationError('인증 토큰이 필요합니다')
  }
  
  if (!authHeader.startsWith('Bearer ')) {
    throw new AuthenticationError('유효하지 않은 인증 토큰 형식입니다')
  }
  
  const token = authHeader.substring(7)
  
  // Simulate token validation
  if (token !== 'valid-token') {
    throw new AuthorizationError('삭제 권한이 없습니다')
  }
  
  // Simulate successful deletion
  return new Response(null, { status: 204 })
})