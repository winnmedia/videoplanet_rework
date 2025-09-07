/**
 * @fileoverview Team Member Invitation API Tests
 * @description 팀원 초대 API의 기본 동작을 테스트
 * @layer app/api
 */

import { NextRequest } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { POST } from './route'

// SendGrid 모킹
vi.mock('../../../../../lib/email/simple-sendgrid', () => ({
  simpleSendGrid: {
    send: vi.fn()
  }
}))

// 쿨다운 모킹
vi.mock('../../../../../lib/email/cooldown', () => ({
  emailCooldown: {
    check: vi.fn(),
    getRemainingSeconds: vi.fn()
  }
}))

describe('/api/projects/[id]/invite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_APP_URL = 'https://test.vlanet.net'
    process.env.SENDGRID_API_KEY = 'test-api-key'
    process.env.SENDGRID_FROM_EMAIL = 'test@vlanet.net'
    process.env.NODE_ENV = 'test'
  })

  describe('POST 요청', () => {
    it('유효한 요청으로 초대 이메일을 성공적으로 발송해야 함', async () => {
      // Arrange
      const { simpleSendGrid } = await vi.importMock('../../../../../lib/email/simple-sendgrid')
      const { emailCooldown } = await vi.importMock('../../../../../lib/email/cooldown')
      
      emailCooldown.check.mockReturnValue(true)
      simpleSendGrid.send.mockResolvedValue({ success: true })

      const requestBody = {
        email: 'test@example.com',
        role: 'editor',
        inviterName: '홍길동',
        projectName: '테스트 프로젝트',
        message: '함께 작업해요!'
      }

      const request = new NextRequest('http://localhost:3000/api/projects/test123/invite', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      // Act
      const response = await POST(request, { params: { id: 'test123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('초대 이메일이 성공적으로 발송되었습니다.')
      expect(data.invitation.email).toBe(requestBody.email)
      expect(data.invitation.role).toBe(requestBody.role)
      expect(data.inviteLink).toContain('https://test.vlanet.net/invite/')
    })

    it('쿨다운 제한에 걸렸을 때 429 상태를 반환해야 함', async () => {
      // Arrange
      const { emailCooldown } = await vi.importMock('../../../../../lib/email/cooldown')
      
      emailCooldown.check.mockReturnValue(false)
      emailCooldown.getRemainingSeconds.mockReturnValue(30)

      const requestBody = {
        email: 'test@example.com',
        role: 'editor',
        inviterName: '홍길동',
        projectName: '테스트 프로젝트'
      }

      const request = new NextRequest('http://localhost:3000/api/projects/test123/invite', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      // Act
      const response = await POST(request, { params: { id: 'test123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(429)
      expect(data.error).toBe('Rate limit exceeded')
      expect(data.retryAfter).toBe(30)
    })

    it('유효하지 않은 이메일로 400 상태를 반환해야 함', async () => {
      // Arrange
      const requestBody = {
        email: 'invalid-email',
        role: 'editor',
        inviterName: '홍길동',
        projectName: '테스트 프로젝트'
      }

      const request = new NextRequest('http://localhost:3000/api/projects/test123/invite', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      // Act
      const response = await POST(request, { params: { id: 'test123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.message).toBe('입력 데이터가 올바르지 않습니다.')
    })

    it('이메일 발송 실패 시 500 상태를 반환해야 함', async () => {
      // Arrange
      const { simpleSendGrid } = await vi.importMock('../../../../../lib/email/simple-sendgrid')
      const { emailCooldown } = await vi.importMock('../../../../../lib/email/cooldown')
      
      emailCooldown.check.mockReturnValue(true)
      simpleSendGrid.send.mockResolvedValue({ 
        success: false, 
        error: 'SendGrid API error' 
      })

      const requestBody = {
        email: 'test@example.com',
        role: 'editor',
        inviterName: '홍길동',
        projectName: '테스트 프로젝트'
      }

      const request = new NextRequest('http://localhost:3000/api/projects/test123/invite', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      // Act
      const response = await POST(request, { params: { id: 'test123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(data.error).toBe('Email sending failed')
      expect(data.details).toBe('SendGrid API error')
    })

    it('필수 필드 누락 시 400 상태를 반환해야 함', async () => {
      // Arrange
      const requestBody = {
        email: 'test@example.com'
        // role, inviterName, projectName 누락
      }

      const request = new NextRequest('http://localhost:3000/api/projects/test123/invite', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      // Act
      const response = await POST(request, { params: { id: 'test123' } })
      const data = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
    })

    it('SendGrid 호출 시 올바른 파라미터를 전달해야 함', async () => {
      // Arrange
      const { simpleSendGrid } = await vi.importMock('../../../../../lib/email/simple-sendgrid')
      const { emailCooldown } = await vi.importMock('../../../../../lib/email/cooldown')
      
      emailCooldown.check.mockReturnValue(true)
      simpleSendGrid.send.mockResolvedValue({ success: true })

      const requestBody = {
        email: 'test@example.com',
        role: 'editor',
        inviterName: '홍길동',
        projectName: '테스트 프로젝트',
        message: '함께 해요!'
      }

      const request = new NextRequest('http://localhost:3000/api/projects/test123/invite', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      })

      // Act
      await POST(request, { params: { id: 'test123' } })

      // Assert
      expect(simpleSendGrid.send).toHaveBeenCalledWith({
        to: 'test@example.com',
        subject: '[VLANET] 테스트 프로젝트 프로젝트 초대',
        text: expect.stringContaining('홍길동님이 회원님을 VLANET 프로젝트에 초대했습니다')
      })
    })
  })
})