/**
 * @fileoverview MSW 핸들러 - SendGrid API 모킹 (테스트용)
 * @description SendGrid API 호출을 모킹하여 결정론적 테스트 환경 제공
 */

import { http, HttpResponse } from 'msw'
import { z } from 'zod'

// SendGrid API 응답 타입 정의
interface SendGridResponse {
  statusCode: number
  headers: {
    'x-message-id'?: string
    'x-request-id'?: string
  }
  body: string
}

interface SendGridErrorResponse {
  errors: Array<{
    message: string
    field?: string
    help?: string
  }>
}

// SendGrid 이메일 요청 스키마
const SendGridEmailSchema = z.object({
  to: z.string().email(),
  from: z.string().email(),
  subject: z.string().min(1),
  text: z.string().optional(),
  html: z.string().optional(),
  attachments: z.array(z.object({
    content: z.string(),
    filename: z.string(),
    type: z.string(),
    disposition: z.string().optional(),
  })).optional(),
})

// 결정론적 테스트를 위한 고정된 응답 데이터
const DETERMINISTIC_MESSAGE_IDS = [
  'sg-msg-001-test',
  'sg-msg-002-test',
  'sg-msg-003-test',
  'sg-msg-004-test',
  'sg-msg-005-test',
]

let messageIdCounter = 0

// 테스트 시나리오별 응답을 제어하기 위한 상태
export const sendGridTestState = {
  shouldFail: false,
  shouldTimeout: false,
  shouldReturnInvalidResponse: false,
  errorType: 'API_ERROR' as 'API_ERROR' | 'AUTH_ERROR' | 'RATE_LIMIT' | 'VALIDATION_ERROR',
  responseDelay: 0,
  
  // 상태 초기화
  reset() {
    this.shouldFail = false
    this.shouldTimeout = false
    this.shouldReturnInvalidResponse = false
    this.errorType = 'API_ERROR'
    this.responseDelay = 0
    messageIdCounter = 0
  },

  // 특정 에러 시나리오 설정
  setErrorScenario(type: 'API_ERROR' | 'AUTH_ERROR' | 'RATE_LIMIT' | 'VALIDATION_ERROR') {
    this.shouldFail = true
    this.errorType = type
  },

  // 네트워크 지연 시뮬레이션
  setDelay(ms: number) {
    this.responseDelay = ms
  },

  // 타임아웃 시나리오
  setTimeout() {
    this.shouldTimeout = true
  },

  // 유효하지 않은 응답 시나리오
  setInvalidResponse() {
    this.shouldReturnInvalidResponse = true
  }
}

/**
 * SendGrid v3 Mail Send API 핸들러
 * POST https://api.sendgrid.com/v3/mail/send
 */
export const sendGridMailHandler = http.post('https://api.sendgrid.com/v3/mail/send', async ({ request }) => {
  // 지연 시뮬레이션
  if (sendGridTestState.responseDelay > 0) {
    await new Promise(resolve => setTimeout(resolve, sendGridTestState.responseDelay))
  }

  // 타임아웃 시나리오
  if (sendGridTestState.shouldTimeout) {
    // 실제로는 타임아웃이 발생하지만, 테스트에서는 오류로 처리
    throw new Error('Network timeout')
  }

  // 유효하지 않은 응답 시나리오
  if (sendGridTestState.shouldReturnInvalidResponse) {
    return new HttpResponse('Invalid JSON response', { 
      status: 200,
      headers: { 'content-type': 'application/json' }
    })
  }

  try {
    const body = await request.json() as unknown

    // Authorization 헤더 검증
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json({
        errors: [{
          message: 'The provided authorization grant is invalid, expired, or revoked',
          field: 'authorization',
          help: 'Check that your API key is correct'
        }]
      }, { 
        status: 401,
        headers: {
          'x-request-id': 'req-test-auth-error'
        }
      })
    }

    // 에러 시나리오 처리
    if (sendGridTestState.shouldFail) {
      switch (sendGridTestState.errorType) {
        case 'AUTH_ERROR':
          return HttpResponse.json({
            errors: [{
              message: 'The provided authorization grant is invalid, expired, or revoked',
              field: 'authorization'
            }]
          }, { 
            status: 401,
            headers: { 'x-request-id': 'req-test-auth-fail' }
          })

        case 'RATE_LIMIT':
          return HttpResponse.json({
            errors: [{
              message: 'Too Many Requests',
              field: null,
              help: 'Please wait and try again later'
            }]
          }, { 
            status: 429,
            headers: {
              'x-request-id': 'req-test-rate-limit',
              'x-ratelimit-remaining': '0',
              'x-ratelimit-reset': '1640995200'
            }
          })

        case 'VALIDATION_ERROR':
          return HttpResponse.json({
            errors: [{
              message: 'Bad Request Body',
              field: 'to',
              help: 'Please check your request body'
            }]
          }, { 
            status: 400,
            headers: { 'x-request-id': 'req-test-validation-fail' }
          })

        case 'API_ERROR':
        default:
          return HttpResponse.json({
            errors: [{
              message: 'Internal server error',
              field: null
            }]
          }, { 
            status: 500,
            headers: { 'x-request-id': 'req-test-api-error' }
          })
      }
    }

    // 요청 본문 검증
    const validation = SendGridEmailSchema.safeParse(body)
    if (!validation.success) {
      const firstError = validation.error.errors[0]
      return HttpResponse.json({
        errors: [{
          message: `Validation failed: ${firstError.message}`,
          field: firstError.path.join('.'),
          help: 'Please check your request parameters'
        }]
      }, { 
        status: 400,
        headers: { 'x-request-id': 'req-test-validation-error' }
      })
    }

    const emailData = validation.data

    // 특정 이메일 주소에 대한 특별한 처리 (테스트용)
    if (emailData.to.includes('error-test')) {
      return HttpResponse.json({
        errors: [{
          message: 'Simulated email delivery failure',
          field: 'to'
        }]
      }, { 
        status: 400,
        headers: { 'x-request-id': 'req-test-delivery-fail' }
      })
    }

    if (emailData.to.includes('bounce-test')) {
      return HttpResponse.json({
        errors: [{
          message: 'Email bounced',
          field: 'to',
          help: 'The email address is not deliverable'
        }]
      }, { 
        status: 400,
        headers: { 'x-request-id': 'req-test-bounce' }
      })
    }

    // 성공적인 응답
    const messageId = DETERMINISTIC_MESSAGE_IDS[messageIdCounter % DETERMINISTIC_MESSAGE_IDS.length]
    messageIdCounter++

    const response: SendGridResponse = {
      statusCode: 202,
      headers: {
        'x-message-id': messageId,
        'x-request-id': `req-test-${messageIdCounter}`
      },
      body: ''
    }

    return HttpResponse.json([response], { 
      status: 202,
      headers: {
        'x-message-id': messageId,
        'x-request-id': `req-test-${messageIdCounter}`
      }
    })

  } catch (error) {
    console.error('SendGrid MSW handler error:', error)
    return HttpResponse.json({
      errors: [{
        message: 'Invalid JSON in request body',
        field: 'body'
      }]
    }, { 
      status: 400,
      headers: { 'x-request-id': 'req-test-json-error' }
    })
  }
})

/**
 * 모든 SendGrid API 핸들러 모음
 */
export const sendGridHandlers = [
  sendGridMailHandler,
]

/**
 * 테스트 헬퍼 함수들
 */
export const sendGridTestHelpers = {
  // 성공 시나리오로 설정
  setSuccessScenario() {
    sendGridTestState.reset()
  },

  // 인증 에러 시나리오
  setAuthErrorScenario() {
    sendGridTestState.setErrorScenario('AUTH_ERROR')
  },

  // 속도 제한 시나리오
  setRateLimitScenario() {
    sendGridTestState.setErrorScenario('RATE_LIMIT')
  },

  // API 에러 시나리오
  setApiErrorScenario() {
    sendGridTestState.setErrorScenario('API_ERROR')
  },

  // 네트워크 지연 시나리오
  setNetworkDelayScenario(ms: number = 2000) {
    sendGridTestState.setDelay(ms)
  },

  // 타임아웃 시나리오
  setTimeoutScenario() {
    sendGridTestState.setTimeout()
  },

  // 모든 상태 초기화
  resetAllScenarios() {
    sendGridTestState.reset()
  },

  // 현재 상태 확인
  getCurrentState() {
    return { ...sendGridTestState }
  }
}

/**
 * 테스트에서 사용할 수 있는 이메일 주소들 (특별한 동작)
 */
export const sendGridTestEmails = {
  success: 'success-test@example.com',
  error: 'error-test@example.com',
  bounce: 'bounce-test@example.com',
  timeout: 'timeout-test@example.com',
  rateLimit: 'rate-limit-test@example.com',
  authError: 'auth-error-test@example.com',
}

/**
 * 결정론적 테스트용 예상 응답 데이터
 */
export const expectedSendGridResponses = {
  messageIds: DETERMINISTIC_MESSAGE_IDS,
  successResponse: {
    statusCode: 202,
    headers: {
      'x-message-id': 'sg-msg-001-test'
    }
  },
  authErrorResponse: {
    errors: [{
      message: 'The provided authorization grant is invalid, expired, or revoked',
      field: 'authorization'
    }]
  },
  rateLimitResponse: {
    errors: [{
      message: 'Too Many Requests',
      field: null,
      help: 'Please wait and try again later'
    }]
  }
}