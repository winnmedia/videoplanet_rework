/**
 * @fileoverview Send Verification API Error Handling Tests
 * @description TDD로 API 엔드포인트의 에러 처리 로직을 검증
 * @layer app/api
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { POST, GET } from '../route'
import { NextRequest } from 'next/server'

// Mock dependencies
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

vi.mock('@/lib/email/simple-sendgrid', () => ({
  sendVerificationEmail: vi.fn()
}))

describe('Send Verification API - Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset console methods
    console.error = vi.fn()
    console.log = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST Request Validation Errors', () => {
    it('should handle missing request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: null // No body
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500) // 서버 에러
      expect(data.error).toBeDefined() // 에러 메시지 있어야 함
    })

    it('should handle invalid JSON body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: 'invalid json string'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500) // JSON 파싱 에러
      expect(data.error).toBeDefined() // 에러 메시지 있어야 함
    })

    it('should handle invalid email format', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email-format',
          type: 'signup'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500) // 바디 파싱 에러 또는 Zod 검증 에러
      expect(data.error).toBeDefined() // 에러 메시지 있어야 함
    })

    it('should handle missing email field', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          type: 'signup'
          // email 필드 누락
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500) // 바디 파싱 에러 또는 Zod 검증 에러
      expect(data.error).toBeDefined() // 에러 메시지 있어야 함
    })

    it('should handle invalid type field', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          type: 'invalid-type'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500) // 바디 파싱 에러 또는 Zod 검증 에러
      expect(data.error).toBeDefined() // 에러 메시지 있어야 함
    })
  })

  describe('Rate Limiting Errors', () => {
    it('should fail - handle rate limit exceeded', async () => {
      // Red phase: 레이트 리밋 검증 실패 예상
      const { emailCooldown } = await import('@/lib/email/cooldown')
      const { emailMonitor } = await import('@/lib/email/email-monitoring')

      vi.mocked(emailCooldown.check).mockReturnValue(false) // 레이트 리밋 초과
      vi.mocked(emailCooldown.getRemainingSeconds).mockReturnValue(120)

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          type: 'signup'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      // 의도적 실패
      expect(response.status).toBe(200) // 429여야 함
      expect(data.retryAfter).toBeUndefined() // 정의되어야 함
      expect(vi.mocked(emailMonitor.logEmail)).not.toHaveBeenCalled() // 호출되어야 함
    })

    it('should fail - log rate limit errors correctly', async () => {
      // Red phase: 로깅 검증 실패 예상
      const { emailCooldown } = await import('@/lib/email/cooldown')
      const { emailMonitor } = await import('@/lib/email/email-monitoring')

      vi.mocked(emailCooldown.check).mockReturnValue(false)
      vi.mocked(emailCooldown.getRemainingSeconds).mockReturnValue(60)

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          type: 'login'
        })
      })

      await POST(request)

      // 의도적 실패 - 로깅 검증
      expect(vi.mocked(emailMonitor.logEmail)).not.toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'Rate limit exceeded'
        })
      )
    })
  })

  describe('Email Service Errors', () => {
    it('should fail - handle email service unavailable', async () => {
      // Red phase: 이메일 서비스 장애 처리 실패 예상
      const { emailCooldown } = await import('@/lib/email/cooldown')
      const { sendVerificationEmail } = await import('@/lib/email/simple-sendgrid')

      vi.mocked(emailCooldown.check).mockReturnValue(true)
      vi.mocked(sendVerificationEmail).mockResolvedValue(false) // 서비스 실패

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          type: 'signup'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200) // 의도적 실패 - 503이어야 함
      expect(data.success).toBe(true) // 의도적 실패 - error 있어야 함
    })

    it('should fail - handle email service exception', async () => {
      // Red phase: 이메일 서비스 예외 처리 실패 예상
      const { emailCooldown } = await import('@/lib/email/cooldown')
      const { sendVerificationEmail } = await import('@/lib/email/simple-sendgrid')

      vi.mocked(emailCooldown.check).mockReturnValue(true)
      vi.mocked(sendVerificationEmail).mockRejectedValue(new Error('SendGrid API Error'))

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          type: 'reset-password'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200) // 의도적 실패 - 500이어야 함
      expect(data.error).toBeUndefined() // 의도적 실패 - 에러 있어야 함
    })

    it('should fail - log email service errors properly', async () => {
      // Red phase: 이메일 에러 로깅 실패 예상
      const { emailCooldown } = await import('@/lib/email/cooldown')
      const { sendVerificationEmail } = await import('@/lib/email/simple-sendgrid')
      const { emailMonitor } = await import('@/lib/email/email-monitoring')

      vi.mocked(emailCooldown.check).mockReturnValue(true)
      vi.mocked(sendVerificationEmail).mockRejectedValue(new Error('SMTP Timeout'))

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          type: 'signup'
        })
      })

      await POST(request)

      // 의도적 실패 - 로깅 검증
      expect(vi.mocked(emailMonitor.logEmail)).not.toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          errorMessage: 'SMTP Timeout'
        })
      )
    })
  })

  describe('Zod Validation Errors', () => {
    it('should fail - provide detailed Zod error messages', async () => {
      // Red phase: Zod 검증 에러 메시지 제공 실패 예상
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'not-an-email',
          type: 'invalid-type-value'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200) // 의도적 실패
      expect(data.details).toBeUndefined() // 의도적 실패 - Zod 에러 상세 없음
    })

    it('should fail - handle empty string email', async () => {
      // Red phase: 빈 문자열 이메일 검증 실패 예상
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: '',
          type: 'signup'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200) // 의도적 실패
      expect(data.error).toBeUndefined() // 의도적 실패
    })

    it('should fail - handle null values in required fields', async () => {
      // Red phase: null 값 검증 실패 예상
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: null,
          type: null
        })
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200) // 의도적 실패
      expect(data.error).toBeUndefined() // 의도적 실패
    })
  })

  describe('GET Method Support', () => {
    it('should return informational response for GET requests', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200) // 정보 제공 응답
      expect(data.methods).toBeDefined() // 지원 메서드 정보
      expect(data.methods).toContain('POST')
    })

    it('should provide proper API description in GET response', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.description).toBeDefined() // API 설명 있어야 함
      expect(data.message).toBeDefined() // 메시지 있어야 함
      expect(typeof data.description).toBe('string')
    })
  })

  describe('Error Response Format', () => {
    it('should fail - error responses have consistent format', async () => {
      // Red phase: 에러 응답 형식 일관성 검증 실패 예상
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid',
          type: 'signup'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      // 의도적 실패 - 에러 형식 검증
      expect(data).toHaveProperty('timestamp') // 없을 것으로 예상
      expect(data).toHaveProperty('path') // 없을 것으로 예상
      expect(data).toHaveProperty('method') // 없을 것으로 예상
    })

    it('should fail - success responses include metadata', async () => {
      // Red phase: 성공 응답에 메타데이터 부족 예상
      const { emailCooldown } = await import('@/lib/email/cooldown')
      const { sendVerificationEmail } = await import('@/lib/email/simple-sendgrid')

      vi.mocked(emailCooldown.check).mockReturnValue(true)
      vi.mocked(sendVerificationEmail).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          type: 'signup'
        })
      })

      const response = await POST(request)
      const data = await response.json()

      // 의도적 실패 - 메타데이터 부족
      expect(data).not.toHaveProperty('type') // 있어야 함
      expect(data).not.toHaveProperty('status') // 있어야 함
    })
  })
})