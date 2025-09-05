import { render } from '@react-email/render'
import sgMail from '@sendgrid/mail'
import { z } from 'zod'

// 환경 변수 검증 스키마
const envSchema = z.object({
  SENDGRID_API_KEY: z.string().min(1),
  SENDGRID_FROM_EMAIL: z.string().email(),
  SENDGRID_VERIFIED_SENDER: z.string().email().optional(),
})

// 이메일 전송 데이터 스키마
const emailDataSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
  attachments: z.array(z.object({
    content: z.string(),
    filename: z.string(),
    type: z.string(),
    disposition: z.string().optional(),
  })).optional(),
})

export type EmailData = z.infer<typeof emailDataSchema>

// 이메일 전송 결과 타입
export interface EmailResult {
  success: boolean
  messageId?: string
  error?: string
}

// 이메일 전송 통계
interface EmailStats {
  sent: number
  failed: number
  lastSent?: Date
  lastError?: string
}

class SendGridService {
  private initialized = false
  private stats: EmailStats = {
    sent: 0,
    failed: 0,
  }
  private fromEmail: string = ''
  private isProduction = process.env.NODE_ENV === 'production'

  constructor() {
    this.initialize()
  }

  private initialize(): void {
    try {
      // 환경 변수 검증
      const env = envSchema.parse({
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
        SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'service@vlanet.net',
        SENDGRID_VERIFIED_SENDER: process.env.SENDGRID_VERIFIED_SENDER,
      })

      // SendGrid API 키 설정
      sgMail.setApiKey(env.SENDGRID_API_KEY)
      this.fromEmail = env.SENDGRID_VERIFIED_SENDER || env.SENDGRID_FROM_EMAIL
      this.initialized = true

      console.log('✅ SendGrid service initialized successfully')
    } catch (error) {
      if (this.isProduction) {
        console.error('❌ Failed to initialize SendGrid:', error)
        throw new Error('Email service initialization failed')
      } else {
        console.warn('⚠️ SendGrid not configured for development mode')
      }
    }
  }

  /**
   * React Email 컴포넌트를 HTML로 렌더링
   */
  async renderTemplate(component: React.ReactElement): Promise<string> {
    try {
      return await render(component)
    } catch (error) {
      console.error('Failed to render email template:', error)
      throw new Error('Email template rendering failed')
    }
  }

  /**
   * 이메일 전송
   */
  async sendEmail(data: EmailData): Promise<EmailResult> {
    try {
      // 데이터 검증
      const validatedData = emailDataSchema.parse(data)

      if (!this.initialized) {
        if (!this.isProduction) {
          console.log('📧 [DEV MODE] Email would be sent to:', validatedData.to)
          console.log('📧 [DEV MODE] Subject:', validatedData.subject)
          return {
            success: true,
            messageId: 'dev-mode-' + Date.now(),
          }
        }
        throw new Error('Email service not initialized')
      }

      const msg = {
        to: validatedData.to,
        from: this.fromEmail,
        subject: validatedData.subject,
        html: validatedData.html,
        text: validatedData.text || this.htmlToText(validatedData.html),
        attachments: validatedData.attachments,
      }

      const [response] = await sgMail.send(msg)
      
      this.stats.sent++
      this.stats.lastSent = new Date()

      return {
        success: true,
        messageId: response.headers['x-message-id'],
      }
    } catch (error) {
      this.stats.failed++
      this.stats.lastError = error instanceof Error ? error.message : 'Unknown error'

      console.error('Email sending failed:', error)

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      }
    }
  }

  /**
   * 여러 이메일 동시 전송
   */
  async sendBulkEmails(emails: EmailData[]): Promise<EmailResult[]> {
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

  /**
   * HTML을 텍스트로 변환 (간단한 구현)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // HTML 태그 제거
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * 전송 통계 반환
   */
  getStats(): EmailStats {
    return { ...this.stats }
  }

  /**
   * 서비스 상태 확인
   */
  isReady(): boolean {
    return this.initialized
  }
}

// 싱글톤 인스턴스
export const sendGridService = new SendGridService()

// 유틸리티 함수들
export const generateVerificationCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export const generateInviteToken = (): string => {
  return Buffer.from(Date.now().toString() + Math.random().toString())
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 32)
}