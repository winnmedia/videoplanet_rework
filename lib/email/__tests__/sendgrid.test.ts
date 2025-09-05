import { describe, it, expect, beforeEach, vi } from 'vitest'
import sgMail from '@sendgrid/mail'
import { sendGridService, generateVerificationCode, generateInviteToken } from '../sendgrid'

// Mock SendGrid
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn(),
  },
}))

// Mock React Email render
vi.mock('@react-email/render', () => ({
  render: vi.fn().mockResolvedValue('<html>Test Email</html>'),
}))

describe('SendGrid Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment variables
    process.env.SENDGRID_API_KEY = 'test-api-key'
    process.env.SENDGRID_FROM_EMAIL = 'test@example.com'
    process.env.NODE_ENV = 'test'
  })

  describe('sendEmail', () => {
    it('개발 모드에서 SendGrid가 설정되지 않았을 때 로그만 출력해야 함', async () => {
      process.env.NODE_ENV = 'development'
      delete process.env.SENDGRID_API_KEY

      const consoleSpy = vi.spyOn(console, 'log')
      
      const result = await sendGridService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test Content</p>',
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toContain('dev-mode-')
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[DEV MODE] Email would be sent to:'),
        'recipient@example.com'
      )
    })

    it('프로덕션 모드에서 이메일을 전송해야 함', async () => {
      process.env.NODE_ENV = 'production'
      
      vi.mocked(sgMail.send).mockResolvedValueOnce([
        {
          statusCode: 202,
          headers: { 'x-message-id': 'test-message-id' },
          body: '',
        },
        {},
      ] as any)

      const result = await sendGridService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test Content</p>',
      })

      expect(result.success).toBe(true)
      expect(result.messageId).toBe('test-message-id')
      expect(sgMail.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'recipient@example.com',
          from: 'test@example.com',
          subject: 'Test Subject',
          html: '<p>Test Content</p>',
        })
      )
    })

    it('이메일 전송 실패 시 에러를 반환해야 함', async () => {
      process.env.NODE_ENV = 'production'
      
      const error = new Error('SendGrid API Error')
      vi.mocked(sgMail.send).mockRejectedValueOnce(error)

      const result = await sendGridService.sendEmail({
        to: 'recipient@example.com',
        subject: 'Test Subject',
        html: '<p>Test Content</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('SendGrid API Error')
    })

    it('유효하지 않은 이메일 형식을 거부해야 함', async () => {
      const result = await sendGridService.sendEmail({
        to: 'invalid-email',
        subject: 'Test Subject',
        html: '<p>Test Content</p>',
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('Invalid')
    })
  })

  describe('sendBulkEmails', () => {
    it('여러 이메일을 동시에 전송해야 함', async () => {
      process.env.NODE_ENV = 'production'
      
      vi.mocked(sgMail.send)
        .mockResolvedValueOnce([
          {
            statusCode: 202,
            headers: { 'x-message-id': 'msg-1' },
            body: '',
          },
          {},
        ] as any)
        .mockResolvedValueOnce([
          {
            statusCode: 202,
            headers: { 'x-message-id': 'msg-2' },
            body: '',
          },
          {},
        ] as any)

      const emails = [
        {
          to: 'user1@example.com',
          subject: 'Subject 1',
          html: '<p>Content 1</p>',
        },
        {
          to: 'user2@example.com',
          subject: 'Subject 2',
          html: '<p>Content 2</p>',
        },
      ]

      const results = await sendGridService.sendBulkEmails(emails)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[0].messageId).toBe('msg-1')
      expect(results[1].success).toBe(true)
      expect(results[1].messageId).toBe('msg-2')
    })

    it('일부 이메일 전송 실패를 처리해야 함', async () => {
      process.env.NODE_ENV = 'production'
      
      vi.mocked(sgMail.send)
        .mockResolvedValueOnce([
          {
            statusCode: 202,
            headers: { 'x-message-id': 'msg-1' },
            body: '',
          },
          {},
        ] as any)
        .mockRejectedValueOnce(new Error('Failed to send'))

      const emails = [
        {
          to: 'user1@example.com',
          subject: 'Subject 1',
          html: '<p>Content 1</p>',
        },
        {
          to: 'user2@example.com',
          subject: 'Subject 2',
          html: '<p>Content 2</p>',
        },
      ]

      const results = await sendGridService.sendBulkEmails(emails)

      expect(results).toHaveLength(2)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[1].error).toBe('Failed to send')
    })
  })

  describe('renderTemplate', () => {
    it('React 컴포넌트를 HTML로 렌더링해야 함', async () => {
      const { render } = await import('@react-email/render')
      const TestComponent = () => <div>Test Email</div>

      const html = await sendGridService.renderTemplate(<TestComponent />)

      expect(render).toHaveBeenCalled()
      expect(html).toBe('<html>Test Email</html>')
    })
  })

  describe('utility functions', () => {
    it('generateVerificationCode는 6자리 숫자를 생성해야 함', () => {
      const code = generateVerificationCode()
      
      expect(code).toHaveLength(6)
      expect(/^\d{6}$/.test(code)).toBe(true)
      expect(parseInt(code)).toBeGreaterThanOrEqual(100000)
      expect(parseInt(code)).toBeLessThanOrEqual(999999)
    })

    it('generateInviteToken은 32자 토큰을 생성해야 함', () => {
      const token = generateInviteToken()
      
      expect(token).toHaveLength(32)
      expect(/^[a-zA-Z0-9]{32}$/.test(token)).toBe(true)
    })

    it('생성된 토큰들은 유니크해야 함', () => {
      const tokens = new Set()
      
      for (let i = 0; i < 100; i++) {
        tokens.add(generateInviteToken())
      }
      
      expect(tokens.size).toBe(100)
    })
  })

  describe('service status', () => {
    it('서비스가 준비 상태를 반환해야 함', () => {
      const isReady = sendGridService.isReady()
      
      expect(typeof isReady).toBe('boolean')
    })

    it('전송 통계를 반환해야 함', () => {
      const stats = sendGridService.getStats()
      
      expect(stats).toHaveProperty('sent')
      expect(stats).toHaveProperty('failed')
      expect(typeof stats.sent).toBe('number')
      expect(typeof stats.failed).toBe('number')
    })
  })
})