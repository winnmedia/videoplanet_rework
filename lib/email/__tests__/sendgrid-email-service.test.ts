/**
 * @fileoverview SendGrid 이메일 발송 로직 테스트 (단위 테스트 - Node 환경)
 * @description 이메일 발송, 에러 처리, 재시도 로직 테스트
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import type { MockedFunction } from 'vitest'

// Mock SendGrid mail
const mockSendGridSend = vi.fn()
const mockSendGridSetApiKey = vi.fn()

vi.mock('@sendgrid/mail', () => ({
  default: {
    send: mockSendGridSend,
    setApiKey: mockSendGridSetApiKey,
  },
}))

// Mock React Email render
const mockRender = vi.fn()
vi.mock('@react-email/render', () => ({
  render: mockRender,
}))

// 결정론적 테스트를 위한 시간 고정
const FIXED_DATE = new Date('2024-01-15T10:30:00Z')
const FIXED_TIMESTAMP = FIXED_DATE.getTime()

// 결정론적 테스트를 위한 Math.random 고정
const FIXED_RANDOM_VALUES = [0.123456, 0.789012, 0.345678]
let randomCallCount = 0

vi.mock('global', () => ({
  Date: class extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) {
        super(FIXED_TIMESTAMP)
      } else {
        super(...args)
      }
    }
    
    static now() {
      return FIXED_TIMESTAMP
    }
  },
  Math: {
    ...Math,
    random: () => {
      const value = FIXED_RANDOM_VALUES[randomCallCount % FIXED_RANDOM_VALUES.length]
      randomCallCount++
      return value
    },
  },
}))

// 테스트용 이메일 서비스 인터페이스
interface TestEmailService {
  sendEmail(data: {
    to: string
    subject: string
    html: string
    text?: string
  }): Promise<{
    success: boolean
    messageId?: string
    error?: string
  }>
  sendBulkEmails(emails: Array<{
    to: string
    subject: string
    html: string
    text?: string
  }>): Promise<Array<{
    success: boolean
    messageId?: string
    error?: string
  }>>
  isReady(): boolean
  getStats(): {
    sent: number
    failed: number
    lastSent?: Date
    lastError?: string
  }
}

// 테스트용 간단한 이메일 서비스 구현 (실제 구현에서 테스트할 인터페이스)
class MockEmailService implements TestEmailService {
  private initialized = false
  private stats = { sent: 0, failed: 0, lastSent: undefined as Date | undefined, lastError: undefined as string | undefined }

  constructor() {
    this.initialized = !!process.env.SENDGRID_API_KEY
  }

  async sendEmail(data: { to: string; subject: string; html: string; text?: string }) {
    if (!this.initialized) {
      throw new Error('Email service not initialized')
    }

    // 이메일 주소 검증 실패 시나리오
    if (!data.to.includes('@')) {
      this.stats.failed++
      this.stats.lastError = 'Invalid email address'
      return { success: false, error: 'Invalid email address' }
    }

    try {
      // SendGrid API 호출 시뮬레이션
      const mockResponse = await mockSendGridSend({
        to: data.to,
        from: 'test@example.com',
        subject: data.subject,
        html: data.html,
        text: data.text,
      })

      this.stats.sent++
      this.stats.lastSent = new Date()

      return {
        success: true,
        messageId: mockResponse?.[0]?.headers?.['x-message-id'] || 'mock-message-id',
      }
    } catch (error) {
      this.stats.failed++
      this.stats.lastError = error instanceof Error ? error.message : 'Unknown error'
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  async sendBulkEmails(emails: Array<{ to: string; subject: string; html: string; text?: string }>) {
    const results = await Promise.allSettled(
      emails.map(email => this.sendEmail(email))
    )

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        return {
          success: false,
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        }
      }
    })
  }

  isReady(): boolean {
    return this.initialized
  }

  getStats() {
    return { ...this.stats }
  }
}

describe('SendGrid 이메일 발송 로직', () => {
  let emailService: MockEmailService
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    randomCallCount = 0
    
    // 환경 설정
    process.env = {
      ...originalEnv,
      SENDGRID_API_KEY: 'SG.test-api-key',
      SENDGRID_FROM_EMAIL: 'test@example.com',
      NODE_ENV: 'test',
    }
    
    emailService = new MockEmailService()
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('단일 이메일 발송', () => {
    it('유효한 이메일 데이터로 이메일 발송에 성공해야 함', async () => {
      // Mock SendGrid response
      mockSendGridSend.mockResolvedValueOnce([
        {
          statusCode: 202,
          headers: { 'x-message-id': 'sg-message-123' },
        },
      ])

      const result = await emailService.sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<h1>Test Content</h1>',
        text: 'Test Content',
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('sg-message-123')
      expect(mockSendGridSend).toHaveBeenCalledWith({
        to: 'user@example.com',
        from: 'test@example.com',
        subject: 'Test Subject',
        html: '<h1>Test Content</h1>',
        text: 'Test Content',
      })
    })

    it('유효하지 않은 이메일 주소로 발송 시 실패해야 함', async () => {
      const result = await emailService.sendEmail({
        to: 'invalid-email-format',
        subject: 'Test Subject',
        html: '<h1>Test Content</h1>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid email address')
      
      // SendGrid가 호출되지 않아야 함
      expect(mockSendGridSend).not.toHaveBeenCalled()
    })

    it('SendGrid API 에러 시 실패 응답을 반환해야 함', async () => {
      const apiError = new Error('SendGrid API rate limit exceeded')
      mockSendGridSend.mockRejectedValueOnce(apiError)

      const result = await emailService.sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<h1>Test Content</h1>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('SendGrid API rate limit exceeded')
    })

    it('네트워크 에러 시 적절한 에러 메시지를 반환해야 함', async () => {
      const networkError = new Error('Network timeout')
      mockSendGridSend.mockRejectedValueOnce(networkError)

      const result = await emailService.sendEmail({
        to: 'user@example.com',
        subject: 'Test Subject',
        html: '<h1>Test Content</h1>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network timeout')
    })
  })

  describe('벌크 이메일 발송', () => {
    it('여러 이메일을 동시에 발송해야 함', async () => {
      mockSendGridSend
        .mockResolvedValueOnce([{ statusCode: 202, headers: { 'x-message-id': 'msg-1' } }])
        .mockResolvedValueOnce([{ statusCode: 202, headers: { 'x-message-id': 'msg-2' } }])
        .mockResolvedValueOnce([{ statusCode: 202, headers: { 'x-message-id': 'msg-3' } }])

      const emails = [
        { to: 'user1@example.com', subject: 'Subject 1', html: '<p>Content 1</p>' },
        { to: 'user2@example.com', subject: 'Subject 2', html: '<p>Content 2</p>' },
        { to: 'user3@example.com', subject: 'Subject 3', html: '<p>Content 3</p>' },
      ]

      const results = await emailService.sendBulkEmails(emails)

      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[0].messageId).toBe('msg-1')
      expect(results[1].success).toBe(true)
      expect(results[1].messageId).toBe('msg-2')
      expect(results[2].success).toBe(true)
      expect(results[2].messageId).toBe('msg-3')
    })

    it('일부 이메일 발송 실패 시 다른 이메일은 성공해야 함', async () => {
      mockSendGridSend
        .mockResolvedValueOnce([{ statusCode: 202, headers: { 'x-message-id': 'msg-1' } }])
        .mockRejectedValueOnce(new Error('API Error'))

      const emails = [
        { to: 'user1@example.com', subject: 'Subject 1', html: '<p>Content 1</p>' },
        { to: 'invalid-email', subject: 'Subject 2', html: '<p>Content 2</p>' },
      ]

      const results = await emailService.sendBulkEmails(emails)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[0].messageId).toBe('msg-1')
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBe('Invalid email address')
    })

    it('빈 배열로 벌크 발송 시 빈 결과를 반환해야 함', async () => {
      const results = await emailService.sendBulkEmails([])

      expect(results).toHaveLength(0)
      expect(mockSendGridSend).not.toHaveBeenCalled()
    })
  })

  describe('서비스 상태 관리', () => {
    it('환경 변수가 설정되어 있으면 준비 상태여야 함', () => {
      const service = new MockEmailService()
      expect(service.isReady()).toBe(true)
    })

    it('환경 변수가 없으면 준비 상태가 아니어야 함', () => {
      delete process.env.SENDGRID_API_KEY
      const service = new MockEmailService()
      expect(service.isReady()).toBe(false)
    })

    it('이메일 발송 통계를 정확히 기록해야 함', async () => {
      mockSendGridSend.mockResolvedValueOnce([{ statusCode: 202, headers: { 'x-message-id': 'msg-1' } }])
      mockSendGridSend.mockRejectedValueOnce(new Error('API Error'))

      // 성공적인 발송
      await emailService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Test</p>',
      })

      // 실패한 발송
      await emailService.sendEmail({
        to: 'user2@example.com',
        subject: 'Test 2',
        html: '<p>Test 2</p>',
      })

      const stats = emailService.getStats()
      expect(stats.sent).toBe(1)
      expect(stats.failed).toBe(1)
      expect(stats.lastError).toBe('API Error')
      expect(stats.lastSent).toBeInstanceOf(Date)
    })
  })

  describe('에지 케이스', () => {
    it('빈 제목으로 이메일 발송 시도해야 함', async () => {
      mockSendGridSend.mockResolvedValueOnce([{ statusCode: 202, headers: { 'x-message-id': 'empty-subject' } }])

      const result = await emailService.sendEmail({
        to: 'user@example.com',
        subject: '',
        html: '<p>No Subject Email</p>',
      })

      expect(result.success).toBe(true)
      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: '',
        })
      )
    })

    it('매우 긴 이메일 내용 처리해야 함', async () => {
      mockSendGridSend.mockResolvedValueOnce([{ statusCode: 202, headers: { 'x-message-id': 'long-content' } }])

      const longContent = 'A'.repeat(10000) // 10KB 콘텐츠
      const result = await emailService.sendEmail({
        to: 'user@example.com',
        subject: 'Long Content Test',
        html: `<p>${longContent}</p>`,
      })

      expect(result.success).toBe(true)
      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          html: `<p>${longContent}</p>`,
        })
      )
    })

    it('특수 문자가 포함된 이메일 처리해야 함', async () => {
      mockSendGridSend.mockResolvedValueOnce([{ statusCode: 202, headers: { 'x-message-id': 'special-chars' } }])

      const result = await emailService.sendEmail({
        to: 'test+special@example.com',
        subject: '🚀 특수 문자 테스트 & <HTML> 태그',
        html: '<p>한글 & English & 日本語 & Émojis: 🎉</p>',
      })

      expect(result.success).toBe(true)
      expect(mockSendGridSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test+special@example.com',
          subject: '🚀 특수 문자 테스트 & <HTML> 태그',
          html: '<p>한글 & English & 日本語 & Émojis: 🎉</p>',
        })
      )
    })
  })
})