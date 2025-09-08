/**
 * @fileoverview SendGrid 에러 처리 테스트 (결정론적 테스트)
 * @description 네트워크 실패, 인증 실패, API 에러 등 다양한 에러 시나리오 테스트
 */

import { describe, it, expect, beforeEach, vi, afterEach, beforeAll, afterAll } from 'vitest'
import { setupServer } from 'msw/node'

// MSW 핸들러 및 테스트 헬퍼 임포트
import { 
  sendGridHandlers, 
  sendGridTestHelpers,
  sendGridTestEmails,
  expectedSendGridResponses
} from '../../../shared/api/__tests__/msw-sendgrid-handlers'

// Mock SendGrid (실제 네트워크 호출 방지)
const mockSendGridSend = vi.fn()
const mockSendGridSetApiKey = vi.fn()

vi.mock('@sendgrid/mail', () => ({
  default: {
    send: mockSendGridSend,
    setApiKey: mockSendGridSetApiKey,
  },
}))

// 결정론적 테스트를 위한 시간 고정
const FIXED_DATE = new Date('2024-01-15T10:30:00Z')
const FIXED_TIMESTAMP = FIXED_DATE.getTime()

vi.setSystemTime(FIXED_DATE)

// 결정론적 Math.random 값들
const FIXED_RANDOM_VALUES = [0.123456789, 0.987654321, 0.456789123, 0.789123456, 0.321654987]
let randomCallCount = 0

const originalMathRandom = Math.random
beforeAll(() => {
  Math.random = () => {
    const value = FIXED_RANDOM_VALUES[randomCallCount % FIXED_RANDOM_VALUES.length]
    randomCallCount++
    return value
  }
})

afterAll(() => {
  Math.random = originalMathRandom
})

// MSW 서버 설정
const server = setupServer(...sendGridHandlers)

// 테스트용 이메일 서비스 (실제 sendGridService와 유사한 인터페이스)
class TestEmailService {
  private apiKey: string | null = null
  private fromEmail: string = 'test@example.com'
  private initialized = false

  constructor() {
    this.initialize()
  }

  private initialize() {
    this.apiKey = process.env.SENDGRID_API_KEY || null
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'test@example.com'
    this.initialized = !!this.apiKey
  }

  async sendEmail(data: {
    to: string
    subject: string
    html: string
    text?: string
  }) {
    if (!this.initialized) {
      throw new Error('SendGrid service not initialized')
    }

    try {
      const response = await mockSendGridSend({
        to: data.to,
        from: this.fromEmail,
        subject: data.subject,
        html: data.html,
        text: data.text,
      })

      return {
        success: true,
        messageId: response?.[0]?.headers?.['x-message-id'] || 'test-message-id',
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }

  isReady(): boolean {
    return this.initialized
  }
}

describe('SendGrid 에러 처리 테스트', () => {
  let emailService: TestEmailService
  const originalEnv = process.env

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterAll(() => {
    server.close()
  })

  beforeEach(() => {
    vi.resetAllMocks()
    randomCallCount = 0
    
    // 테스트 환경 설정
    process.env = {
      ...originalEnv,
      SENDGRID_API_KEY: 'SG.test-api-key-12345',
      SENDGRID_FROM_EMAIL: 'test@videoplanet.com',
      NODE_ENV: 'test',
    }
    
    emailService = new TestEmailService()
    sendGridTestHelpers.resetAllScenarios()
  })

  afterEach(() => {
    process.env = originalEnv
    server.resetHandlers()
  })

  describe('네트워크 에러 시나리오', () => {
    it('네트워크 타임아웃 시 적절한 에러를 반환해야 함', async () => {
      // MSW에서 타임아웃 시나리오 설정
      sendGridTestHelpers.setTimeoutScenario()
      
      // Mock이 타임아웃 에러를 던지도록 설정
      mockSendGridSend.mockRejectedValue(new Error('Network timeout'))

      const result = await emailService.sendEmail({
        to: sendGridTestEmails.timeout,
        subject: 'Timeout Test',
        html: '<p>This should timeout</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network timeout')
    })

    it('연결 거부 시 적절한 에러를 반환해야 함', async () => {
      mockSendGridSend.mockRejectedValue(new Error('ECONNREFUSED'))

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Connection Test',
        html: '<p>This should fail to connect</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('ECONNREFUSED')
    })

    it('DNS 해결 실패 시 적절한 에러를 반환해야 함', async () => {
      mockSendGridSend.mockRejectedValue(new Error('ENOTFOUND api.sendgrid.com'))

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'DNS Test',
        html: '<p>This should fail DNS resolution</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('ENOTFOUND api.sendgrid.com')
    })

    it('네트워크 지연 시나리오 처리를 해야 함', async () => {
      // 2초 지연 설정
      sendGridTestHelpers.setNetworkDelayScenario(2000)
      
      mockSendGridSend.mockResolvedValue([{
        statusCode: 202,
        headers: { 'x-message-id': 'delayed-message-123' },
      }])

      const startTime = Date.now()
      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Delay Test',
        html: '<p>This should be delayed</p>',
      })
      const endTime = Date.now()

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('delayed-message-123')
      // 실제 네트워크 지연은 MSW에서 처리되므로, mock에서는 즉시 반환됨
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('인증 에러 시나리오', () => {
    it('유효하지 않은 API 키로 인한 401 에러를 처리해야 함', async () => {
      sendGridTestHelpers.setAuthErrorScenario()
      
      mockSendGridSend.mockRejectedValue(new Error('Unauthorized: Invalid API key'))

      const result = await emailService.sendEmail({
        to: sendGridTestEmails.authError,
        subject: 'Auth Test',
        html: '<p>This should fail authentication</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized: Invalid API key')
    })

    it('만료된 API 키로 인한 401 에러를 처리해야 함', async () => {
      mockSendGridSend.mockRejectedValue(new Error('API key expired'))

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Expired Key Test',
        html: '<p>This should fail with expired key</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('API key expired')
    })

    it('권한 없는 발신자 이메일로 인한 403 에러를 처리해야 함', async () => {
      mockSendGridSend.mockRejectedValue(new Error('Forbidden: Sender not verified'))

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Forbidden Test',
        html: '<p>This should fail with forbidden error</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Forbidden: Sender not verified')
    })
  })

  describe('API 에러 시나리오', () => {
    it('속도 제한 초과 시 429 에러를 처리해야 함', async () => {
      sendGridTestHelpers.setRateLimitScenario()
      
      mockSendGridSend.mockRejectedValue(new Error('Too Many Requests'))

      const result = await emailService.sendEmail({
        to: sendGridTestEmails.rateLimit,
        subject: 'Rate Limit Test',
        html: '<p>This should hit rate limit</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Too Many Requests')
    })

    it('SendGrid 서버 에러 시 500 에러를 처리해야 함', async () => {
      sendGridTestHelpers.setApiErrorScenario()
      
      mockSendGridSend.mockRejectedValue(new Error('Internal Server Error'))

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Server Error Test',
        html: '<p>This should fail with server error</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Internal Server Error')
    })

    it('유효하지 않은 요청 형식으로 인한 400 에러를 처리해야 함', async () => {
      mockSendGridSend.mockRejectedValue(new Error('Bad Request: Invalid email format'))

      const result = await emailService.sendEmail({
        to: 'invalid-email-format',
        subject: 'Validation Test',
        html: '<p>This should fail validation</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Bad Request: Invalid email format')
    })

    it('이메일 배달 실패 시 적절한 에러를 처리해야 함', async () => {
      mockSendGridSend.mockRejectedValue(new Error('Email bounced: Recipient address rejected'))

      const result = await emailService.sendEmail({
        to: sendGridTestEmails.bounce,
        subject: 'Bounce Test',
        html: '<p>This should bounce</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Email bounced: Recipient address rejected')
    })
  })

  describe('서비스 초기화 에러', () => {
    it('API 키가 없을 때 서비스가 준비되지 않음을 확인해야 함', () => {
      delete process.env.SENDGRID_API_KEY
      const uninitializedService = new TestEmailService()
      
      expect(uninitializedService.isReady()).toBe(false)
    })

    it('초기화되지 않은 서비스로 이메일 발송 시 에러를 던져야 함', async () => {
      delete process.env.SENDGRID_API_KEY
      const uninitializedService = new TestEmailService()
      
      await expect(uninitializedService.sendEmail({
        to: 'test@example.com',
        subject: 'Init Test',
        html: '<p>This should fail</p>',
      })).rejects.toThrow('SendGrid service not initialized')
    })

    it('잘못된 환경 변수 설정 시 초기화 실패를 처리해야 함', () => {
      process.env.SENDGRID_API_KEY = '' // 빈 문자열
      const invalidService = new TestEmailService()
      
      expect(invalidService.isReady()).toBe(false)
    })
  })

  describe('재시도 로직 시뮬레이션', () => {
    it('첫 번째 시도 실패 후 두 번째 시도에서 성공해야 함', async () => {
      let callCount = 0
      mockSendGridSend.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          throw new Error('Temporary network error')
        }
        return Promise.resolve([{
          statusCode: 202,
          headers: { 'x-message-id': 'retry-success-123' },
        }])
      })

      // 간단한 재시도 로직 구현
      let result
      try {
        result = await emailService.sendEmail({
          to: 'test@example.com',
          subject: 'Retry Test',
          html: '<p>This should succeed on retry</p>',
        })
      } catch (error) {
        // 첫 번째 실패 후 재시도
        result = await emailService.sendEmail({
          to: 'test@example.com',
          subject: 'Retry Test',
          html: '<p>This should succeed on retry</p>',
        })
      }

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('retry-success-123')
      expect(callCount).toBe(2)
    })

    it('최대 재시도 횟수 초과 시 최종 실패해야 함', async () => {
      mockSendGridSend.mockRejectedValue(new Error('Persistent network error'))

      // 3번 재시도 후 실패
      const maxRetries = 3
      let lastError
      
      for (let i = 0; i <= maxRetries; i++) {
        try {
          await emailService.sendEmail({
            to: 'test@example.com',
            subject: 'Max Retry Test',
            html: '<p>This should fail after max retries</p>',
          })
          break
        } catch (error) {
          lastError = error
          if (i === maxRetries) {
            // 최대 재시도 횟수 도달
            break
          }
        }
      }

      expect(mockSendGridSend).toHaveBeenCalledTimes(maxRetries + 1)
    })
  })

  describe('에지 케이스 에러 처리', () => {
    it('빈 응답 처리를 해야 함', async () => {
      mockSendGridSend.mockResolvedValue(null)

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Empty Response Test',
        html: '<p>This should handle empty response</p>',
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('test-message-id')
    })

    it('잘못된 형식의 응답 처리를 해야 함', async () => {
      mockSendGridSend.mockResolvedValue([{
        statusCode: 202,
        headers: {}, // x-message-id 누락
      }])

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Invalid Response Test',
        html: '<p>This should handle invalid response format</p>',
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('test-message-id') // 기본값 사용
    })

    it('예상치 못한 예외 처리를 해야 함', async () => {
      mockSendGridSend.mockImplementation(() => {
        throw new TypeError('Cannot read property of undefined')
      })

      const result = await emailService.sendEmail({
        to: 'test@example.com',
        subject: 'Unexpected Error Test',
        html: '<p>This should handle unexpected errors</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Cannot read property of undefined')
    })
  })

  describe('결정론적 에러 응답', () => {
    it('동일한 에러 조건에서 항상 동일한 응답을 반환해야 함', async () => {
      const errorMessage = 'Deterministic error message'
      mockSendGridSend.mockRejectedValue(new Error(errorMessage))

      const results = await Promise.all([
        emailService.sendEmail({
          to: 'test1@example.com',
          subject: 'Deterministic Test 1',
          html: '<p>Test 1</p>',
        }),
        emailService.sendEmail({
          to: 'test2@example.com',
          subject: 'Deterministic Test 2',
          html: '<p>Test 2</p>',
        }),
        emailService.sendEmail({
          to: 'test3@example.com',
          subject: 'Deterministic Test 3',
          html: '<p>Test 3</p>',
        }),
      ])

      results.forEach(result => {
        expect(result.success).toBe(false)
        expect(result.error).toBe(errorMessage)
      })

      // 모든 결과가 동일해야 함
      const firstResult = results[0]
      results.slice(1).forEach(result => {
        expect(result).toEqual(firstResult)
      })
    })
  })
})