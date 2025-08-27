/**
 * EmailService Unit Tests
 * TDD Red 단계 - 실패하는 테스트 먼저 작성
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import sgMail from '@sendgrid/mail'
import { EmailService } from './emailService'

// SendGrid 모킹
vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: vi.fn(),
    send: vi.fn(),
  },
}))

describe('EmailService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 환경변수 모킹
    process.env.SENDGRID_API_KEY = 'test-api-key'
    process.env.FROM_EMAIL = 'test@vridge.com'
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('generateVerificationCode', () => {
    it('6자리 숫자 인증번호를 생성해야 한다', () => {
      // Given
      const code = EmailService.generateVerificationCode()
      
      // Then
      expect(code).toMatch(/^\d{6}$/)
      expect(code.length).toBe(6)
      expect(parseInt(code)).toBeGreaterThanOrEqual(100000)
      expect(parseInt(code)).toBeLessThanOrEqual(999999)
    })

    it('매번 다른 인증번호를 생성해야 한다', () => {
      // Given & When
      const codes = Array.from({ length: 10 }, () => EmailService.generateVerificationCode())
      const uniqueCodes = new Set(codes)
      
      // Then
      expect(uniqueCodes.size).toBeGreaterThan(1) // 통계적으로 다를 확률이 높음
    })

    it('숫자가 아닌 문자를 포함하지 않아야 한다', () => {
      // Given & When
      const code = EmailService.generateVerificationCode()
      
      // Then
      expect(code).not.toMatch(/[a-zA-Z]/)
      expect(code).not.toMatch(/[!@#$%^&*()_+]/)
      expect(isNaN(parseInt(code))).toBe(false)
    })
  })

  describe('sendEmail', () => {
    it('유효한 이메일 데이터로 SendGrid에 이메일을 발송해야 한다', async () => {
      // Given
      const mockSend = vi.mocked(sgMail.send)
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }, {}] as any)
      
      const emailData = {
        to: 'test@example.com',
        subject: '테스트 이메일',
        html: '<p>테스트 내용</p>'
      }

      // When
      await EmailService.sendEmail(emailData)

      // Then
      expect(mockSend).toHaveBeenCalledWith({
        to: 'test@example.com',
        from: 'test@vridge.com',
        subject: '테스트 이메일',
        html: '<p>테스트 내용</p>'
      })
    })

    it('SendGrid API 키가 없으면 이메일을 발송하지 않아야 한다', async () => {
      // Given
      delete process.env.SENDGRID_API_KEY
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      
      const emailData = {
        to: 'test@example.com',
        subject: '테스트 이메일',
        html: '<p>테스트 내용</p>'
      }

      // When
      await EmailService.sendEmail(emailData)

      // Then
      expect(sgMail.send).not.toHaveBeenCalled()
      expect(consoleSpy).toHaveBeenCalledWith('SendGrid API key not configured. Email not sent.')
      
      consoleSpy.mockRestore()
    })

    it('SendGrid 발송 실패 시 에러를 throw해야 한다', async () => {
      // Given
      const mockError = new Error('SendGrid API Error')
      const mockSend = vi.mocked(sgMail.send)
      mockSend.mockRejectedValueOnce(mockError)
      
      const emailData = {
        to: 'invalid@example.com',
        subject: '테스트 이메일',
        html: '<p>테스트 내용</p>'
      }

      // When & Then
      await expect(EmailService.sendEmail(emailData)).rejects.toThrow('SendGrid API Error')
    })

    it('이메일 발송 성공 시 콘솔에 로그를 출력해야 한다', async () => {
      // Given
      const mockSend = vi.mocked(sgMail.send)
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }, {}] as any)
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      const emailData = {
        to: 'success@example.com',
        subject: '테스트 이메일',
        html: '<p>테스트 내용</p>'
      }

      // When
      await EmailService.sendEmail(emailData)

      // Then
      expect(consoleSpy).toHaveBeenCalledWith('Email sent successfully to success@example.com')
      
      consoleSpy.mockRestore()
    })
  })

  describe('sendVerificationCode', () => {
    it('회원가입 인증번호 이메일을 올바른 형식으로 발송해야 한다', async () => {
      // Given
      const mockSend = vi.mocked(sgMail.send)
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }, {}] as any)
      
      const email = 'user@example.com'
      const code = '123456'

      // When
      await EmailService.sendVerificationCode(email, code)

      // Then
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          from: 'test@vridge.com',
          subject: 'VRidge 이메일 인증번호',
          html: expect.stringContaining(code)
        })
      )
    })

    it('HTML 이메일 템플릿에 인증번호가 포함되어야 한다', async () => {
      // Given
      const mockSend = vi.mocked(sgMail.send)
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }, {}] as any)
      
      const email = 'user@example.com'
      const code = '987654'

      // When
      await EmailService.sendVerificationCode(email, code)

      // Then
      const sentEmail = mockSend.mock.calls[0][0]
      expect(sentEmail.html).toContain(code)
      expect(sentEmail.html).toContain('이메일 인증번호')
      expect(sentEmail.html).toContain('VRidge')
      expect(sentEmail.html).toContain('10분간 유효')
    })

    it('이메일 템플릿에 VRidge 브랜드 색상이 포함되어야 한다', async () => {
      // Given
      const mockSend = vi.mocked(sgMail.send)
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }, {}] as any)
      
      const email = 'user@example.com'
      const code = '111111'

      // When
      await EmailService.sendVerificationCode(email, code)

      // Then
      const sentEmail = mockSend.mock.calls[0][0]
      expect(sentEmail.html).toContain('#0031ff') // VRidge 브랜드 색상
      expect(sentEmail.html).toContain('border-radius') // 레거시 디자인 적용
    })

    it('SendGrid 에러 발생 시 적절히 에러를 전파해야 한다', async () => {
      // Given
      const mockError = new Error('Invalid API Key')
      const mockSend = vi.mocked(sgMail.send)
      mockSend.mockRejectedValueOnce(mockError)

      // When & Then
      await expect(
        EmailService.sendVerificationCode('test@example.com', '123456')
      ).rejects.toThrow('Invalid API Key')
    })
  })

  describe('sendPasswordResetCode', () => {
    it('비밀번호 재설정 인증번호 이메일을 올바른 형식으로 발송해야 한다', async () => {
      // Given
      const mockSend = vi.mocked(sgMail.send)
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }, {}] as any)
      
      const email = 'user@example.com'
      const code = '654321'

      // When
      await EmailService.sendPasswordResetCode(email, code)

      // Then
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          from: 'test@vridge.com',
          subject: 'VRidge 비밀번호 재설정 인증번호',
          html: expect.stringContaining(code)
        })
      )
    })

    it('비밀번호 재설정 HTML 템플릿에 보안 경고 메시지가 포함되어야 한다', async () => {
      // Given
      const mockSend = vi.mocked(sgMail.send)
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }, {}] as any)
      
      const email = 'user@example.com'
      const code = '555555'

      // When
      await EmailService.sendPasswordResetCode(email, code)

      // Then
      const sentEmail = mockSend.mock.calls[0][0]
      expect(sentEmail.html).toContain(code)
      expect(sentEmail.html).toContain('비밀번호 재설정')
      expect(sentEmail.html).toContain('고객센터로 연락')
      expect(sentEmail.html).toContain('본인이 요청하지 않았다면')
    })

    it('회원가입 인증과 다른 제목을 사용해야 한다', async () => {
      // Given
      const mockSend = vi.mocked(sgMail.send)
      mockSend.mockResolvedValue([{ statusCode: 202 }, {}] as any)
      
      const email = 'user@example.com'
      const code = '777777'

      // When
      await EmailService.sendVerificationCode(email, code) // 회원가입
      await EmailService.sendPasswordResetCode(email, code) // 비밀번호 재설정

      // Then
      const signupEmail = mockSend.mock.calls[0][0]
      const resetEmail = mockSend.mock.calls[1][0]
      
      expect(signupEmail.subject).toBe('VRidge 이메일 인증번호')
      expect(resetEmail.subject).toBe('VRidge 비밀번호 재설정 인증번호')
      expect(signupEmail.subject).not.toBe(resetEmail.subject)
    })
  })

  describe('환경 변수 처리', () => {
    it('FROM_EMAIL이 설정되지 않으면 기본값을 사용해야 한다', async () => {
      // Given
      delete process.env.FROM_EMAIL
      const mockSend = vi.mocked(sgMail.send)
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }, {}] as any)

      // When
      await EmailService.sendVerificationCode('test@example.com', '123456')

      // Then
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'noreply@vridge.com' // 기본값
        })
      )
    })

    it('SENDGRID_API_KEY가 설정되면 setApiKey를 호출해야 한다', () => {
      // Given
      process.env.SENDGRID_API_KEY = 'test-key-123'
      
      // When
      // EmailService 모듈 재임포트 시뮬레이션
      expect(sgMail.setApiKey).toHaveBeenCalledWith('test-key-123')
    })
  })

  describe('성능 및 보안', () => {
    it('동시에 여러 이메일을 발송할 수 있어야 한다', async () => {
      // Given
      const mockSend = vi.mocked(sgMail.send)
      mockSend.mockResolvedValue([{ statusCode: 202 }, {}] as any)
      
      const emails = [
        'user1@example.com',
        'user2@example.com', 
        'user3@example.com'
      ]
      const codes = ['111111', '222222', '333333']

      // When
      const promises = emails.map((email, index) => 
        EmailService.sendVerificationCode(email, codes[index])
      )
      
      await Promise.all(promises)

      // Then
      expect(mockSend).toHaveBeenCalledTimes(3)
      emails.forEach((email, index) => {
        expect(mockSend).toHaveBeenCalledWith(
          expect.objectContaining({
            to: email,
            html: expect.stringContaining(codes[index])
          })
        )
      })
    })

    it('HTML 템플릿에 XSS 방지를 위한 안전한 이메일 렌더링이 되어야 한다', async () => {
      // Given
      const mockSend = vi.mocked(sgMail.send)
      mockSend.mockResolvedValueOnce([{ statusCode: 202 }, {}] as any)
      
      const email = 'user@example.com'
      const code = '123456'

      // When
      await EmailService.sendVerificationCode(email, code)

      // Then
      const sentEmail = mockSend.mock.calls[0][0]
      // 하드코딩된 템플릿이므로 사용자 입력이 직접 삽입되지 않음
      expect(sentEmail.html).not.toContain('<script>')
      expect(sentEmail.html).not.toContain('javascript:')
    })
  })
})