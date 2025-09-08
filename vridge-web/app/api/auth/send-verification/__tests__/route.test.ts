/**
 * @fileoverview Send Verification Email API Tests
 * @description API 엔드포인트 동작 검증
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from '../route'

// Mock 설정
vi.mock('@/lib/email/simple-sendgrid', () => ({
  sendVerificationEmail: vi.fn()
}))

vi.mock('@/lib/email/cooldown', () => ({
  emailCooldown: {
    check: vi.fn(),
    getRemainingSeconds: vi.fn()
  }
}))

vi.mock('@/lib/email/email-monitoring', () => ({
  emailMonitor: {
    logEmail: vi.fn()
  },
  EmailType: {}
}))

// Dynamic import for mocks
const getMocks = async () => {
  const { sendVerificationEmail } = await import('@/lib/email/simple-sendgrid')
  const { emailCooldown } = await import('@/lib/email/cooldown')
  const { emailMonitor } = await import('@/lib/email/email-monitoring')
  
  return {
    mockSendVerificationEmail: sendVerificationEmail,
    mockEmailCooldown: emailCooldown,
    mockEmailMonitor: emailMonitor
  }
}

// 환경 변수 모킹
const originalEnv = process.env

beforeAll(() => {
  process.env = {
    ...originalEnv,
    SENDGRID_API_KEY: 'test-api-key',
    SENDGRID_FROM_EMAIL: 'test@example.com',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    NODE_ENV: 'test'
  }
})

afterAll(() => {
  process.env = originalEnv
})

describe('/api/auth/send-verification', () => {
  let mocks: Awaited<ReturnType<typeof getMocks>>

  beforeAll(async () => {
    mocks = await getMocks()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockEmailCooldown.check.mockReturnValue(true)
    mocks.mockSendVerificationEmail.mockResolvedValue(true)
  })

  describe('POST', () => {
    it('환경 변수가 없으면 500 오류를 반환해야 함', async () => {
      // 환경 변수 제거
      const tempKey = process.env.SENDGRID_API_KEY
      delete process.env.SENDGRID_API_KEY

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          type: 'signup'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Service configuration error')
      expect(data.message).toContain('이메일 서비스 설정에 문제가 있습니다')

      // 환경 변수 복원
      process.env.SENDGRID_API_KEY = tempKey
    })

    it('유효하지 않은 JSON이면 400 오류를 반환해야 함', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Invalid request format')
    })

    it('유효하지 않은 이메일이면 400 오류를 반환해야 함', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
          type: 'signup'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.message).toContain('입력 데이터가 올바르지 않습니다')
    })

    it('쿨다운 중이면 429 오류를 반환해야 함', async () => {
      mocks.mockEmailCooldown.check.mockReturnValue(false)
      mocks.mockEmailCooldown.getRemainingSeconds.mockReturnValue(30)

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          type: 'signup'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('이메일 발송 제한')
      expect(data.retryAfter).toBe(30)
    })

    it('이메일 발송 실패 시 500 오류를 반환해야 함', async () => {
      mocks.mockSendVerificationEmail.mockRejectedValue(new Error('SendGrid API Error'))

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          type: 'signup'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('이메일 발송 서비스 오류가 발생했습니다.')
      expect(data.retryAfter).toBe(30)
    })

    it('이메일 발송이 false를 반환하면 503 오류를 반환해야 함', async () => {
      mocks.mockSendVerificationEmail.mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          type: 'signup'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(503)
      expect(data.error).toContain('이메일 발송 중 오류가 발생했습니다')
      expect(data.retryAfter).toBe(60)
    })

    it('성공적인 요청은 200을 반환해야 함', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          type: 'signup'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('회원가입 인증 이메일이 발송되었습니다.')
      expect(data.type).toBe('signup')
      expect(data.status).toBe('sent')
      
      // 모니터링 호출 검증
      expect(mocks.mockEmailMonitor.logEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'verification',
          status: 'success'
        })
      )
    })

    it('각 타입별 메시지를 올바르게 반환해야 함', async () => {
      const testCases = [
        { type: 'signup', expectedMessage: '회원가입 인증 이메일이 발송되었습니다.' },
        { type: 'login', expectedMessage: '로그인 인증 이메일이 발송되었습니다.' },
        { type: 'reset-password', expectedMessage: '비밀번호 재설정 이메일이 발송되었습니다.' }
      ]

      for (const testCase of testCases) {
        const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
          method: 'POST',
          body: JSON.stringify({
            email: 'test@example.com',
            type: testCase.type
          })
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.message).toBe(testCase.expectedMessage)
        expect(data.type).toBe(testCase.type)
      }
    })
  })

  describe('GET', () => {
    it('API 정보를 반환해야 함', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.message).toBe('Send verification endpoint')
      expect(data.methods).toEqual(['POST'])
      expect(data.description).toContain('POST method')
    })
  })
})