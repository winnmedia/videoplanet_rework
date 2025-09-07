import sgMail from '@sendgrid/mail'
import { z } from 'zod'

// 환경 변수 검증
const envSchema = z.object({
  SENDGRID_API_KEY: z.string().min(1),
  SENDGRID_FROM_EMAIL: z.string().email().default('service@vlanet.net'),
})

// 단순 이메일 데이터
export interface SimpleEmailData {
  to: string
  subject: string
  text: string
}

// 전송 결과
export interface SendResult {
  success: boolean
  error?: string
}

class SimpleSendGrid {
  private initialized = false
  private fromEmail = 'service@vlanet.net'

  constructor() {
    // 프로덕션 빌드 중에는 초기화 하지 않음 (런타임에서만)
    if (typeof window === 'undefined' && process.env.NODE_ENV !== 'production') {
      this.initialize()
    }
  }

  private initialize(): void {
    try {
      // 환경 변수 존재 확인
      if (!process.env.SENDGRID_API_KEY || !process.env.SENDGRID_FROM_EMAIL) {
        console.warn('⚠️ SendGrid environment variables not found')
        return
      }

      const env = envSchema.parse({
        SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
        SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
      })

      sgMail.setApiKey(env.SENDGRID_API_KEY)
      this.fromEmail = env.SENDGRID_FROM_EMAIL
      this.initialized = true
      console.log('✅ SimpleSendGrid initialized')
    } catch (error) {
      console.error('❌ SimpleSendGrid initialization failed:', error)
      // 프로덕션 빌드 중에는 오류를 발생시키지 않음
      if (process.env.NODE_ENV === 'production' && process.env.NEXT_PHASE !== 'phase-production-build') {
        throw error
      }
    }
  }

  async send(data: SimpleEmailData): Promise<SendResult> {
    try {
      // 런타임에서 초기화 시도
      if (!this.initialized) {
        this.initialize()
      }

      if (!this.initialized) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('📧 [DEV] Email would be sent:', data)
          return { success: true }
        }
        throw new Error('SendGrid not initialized')
      }

      // 기본 재시도 로직 (3회)
      let lastError: Error | null = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          await sgMail.send({
            to: data.to,
            from: this.fromEmail,
            subject: data.subject,
            text: data.text,
          })

          console.log(`✅ Email sent to ${data.to}`)
          return { success: true }
        } catch (error) {
          lastError = error as Error
          console.warn(`⚠️ Attempt ${attempt} failed:`, error)

          if (attempt < 3) {
            // 1초 대기 후 재시도
            await new Promise(resolve => setTimeout(resolve, 1000))
          }
        }
      }

      console.error('❌ All attempts failed')
      return {
        success: false,
        error: lastError?.message || 'Failed to send email',
      }
    } catch (error) {
      console.error('❌ Email send error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    }
  }
}

// 싱글톤 인스턴스
export const simpleSendGrid = new SimpleSendGrid()
