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
  html?: string
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
    // 빌드 시점에는 초기화하지 않고 런타임에서만 초기화
    if (typeof window === 'undefined' && !process.env.NEXT_PHASE?.includes('build')) {
      this.initialize()
    }
  }

  private initialize(): void {
    try {
      console.log('🚀 Initializing SimpleSendGrid...')
      
      // 환경 변수 상세 확인
      const apiKey = process.env.SENDGRID_API_KEY
      const fromEmail = process.env.SENDGRID_FROM_EMAIL
      
      console.log('🔍 Environment check:', {
        hasApiKey: !!apiKey,
        apiKeyLength: apiKey?.length || 0,
        hasFromEmail: !!fromEmail,
        fromEmail: fromEmail || 'not set',
        nodeEnv: process.env.NODE_ENV,
        nextPhase: process.env.NEXT_PHASE || 'not set'
      })
      
      if (!apiKey || !fromEmail) {
        const missing = []
        if (!apiKey) missing.push('SENDGRID_API_KEY')
        if (!fromEmail) missing.push('SENDGRID_FROM_EMAIL')
        console.warn(`⚠️ SendGrid environment variables missing: ${missing.join(', ')}`)
        return
      }

      // Zod 검증
      const env = envSchema.parse({
        SENDGRID_API_KEY: apiKey,
        SENDGRID_FROM_EMAIL: fromEmail,
      })

      // SendGrid 초기화
      try {
        sgMail.setApiKey(env.SENDGRID_API_KEY)
        this.fromEmail = env.SENDGRID_FROM_EMAIL
        this.initialized = true
        console.log('✅ SimpleSendGrid initialized successfully')
        console.log(`📧 From email set to: ${this.fromEmail}`)
      } catch (sgError) {
        console.error('❌ SendGrid API initialization failed:', sgError)
        throw sgError
      }
      
    } catch (error) {
      console.error('❌ SimpleSendGrid initialization failed:', error)
      
      // 프로덕션에서만 에러 throw, 빌드 시에는 무시
      const isProductionRuntime = process.env.NODE_ENV === 'production' && 
                                 !process.env.NEXT_PHASE?.includes('build')
      
      if (isProductionRuntime) {
        throw error
      }
    }
  }

  async send(data: SimpleEmailData): Promise<SendResult> {
    try {
      console.log('📤 Attempting to send email...')
      
      // 런타임에서 초기화 시도
      if (!this.initialized) {
        console.log('🔄 Attempting runtime initialization...')
        this.initialize()
      }

      if (!this.initialized) {
        if (process.env.NODE_ENV !== 'production') {
          console.log('📧 [DEV] Email would be sent:', {
            to: data.to,
            subject: data.subject,
            hasText: !!data.text,
            hasHtml: !!data.html
          })
          return { success: true }
        }
        throw new Error('SendGrid not initialized - missing environment variables')
      }
      
      console.log(`📧 Sending email to: ${data.to.substring(0, 3)}***`)

      // 디버깅 정보 출력
      console.log(`📝 Email payload preview:`, {
        to: data.to,
        from: this.fromEmail,
        subject: data.subject,
        hasText: !!data.text,
        hasHtml: !!data.html,
        textLength: data.text?.length || 0,
        htmlLength: data.html?.length || 0
      })
      
      // 재시도 로직 (3회)
      let lastError: Error | null = null
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🚀 Attempt ${attempt}/3 - Sending email...`)
          
          const emailPayload: any = {
            to: data.to,
            from: this.fromEmail,
            subject: data.subject,
            text: data.text,
          }

          // HTML 콘텐츠가 있으면 추가
          if (data.html) {
            emailPayload.html = data.html
          }

          // SendGrid API 호출
          const response = await sgMail.send(emailPayload)
          
          console.log(`✅ Email sent successfully on attempt ${attempt}:`, {
            statusCode: response?.[0]?.statusCode,
            messageId: response?.[0]?.headers?.['x-message-id'],
            to: data.to.substring(0, 3) + '***'
          })
          
          return { success: true }
        } catch (error) {
          lastError = error as Error
          console.error(`❌ Attempt ${attempt} failed:`, {
            errorName: error instanceof Error ? error.name : 'Unknown',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            statusCode: (error as any)?.code || (error as any)?.statusCode,
            response: (error as any)?.response?.body
          })

          if (attempt < 3) {
            const waitTime = attempt * 1000 // 1s, 2s 대기
            console.log(`⏳ Waiting ${waitTime}ms before retry...`)
            await new Promise(resolve => setTimeout(resolve, waitTime))
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

/**
 * 인증 이메일 발송 헬퍼 함수 (HTML 템플릿 사용)
 */
export async function sendVerificationEmail(email: string, verificationCode: string, userName?: string): Promise<boolean> {
  try {
    console.log(`📧 Preparing verification email for ${email.substring(0, 3)}***`)
    
    // HTML 템플릿 시스템 사용 (정적 import로 변경)
    let createSignupVerificationEmail
    try {
      const templates = await import('./templates')
      createSignupVerificationEmail = templates.createSignupVerificationEmail
      console.log('✅ Email templates imported successfully')
    } catch (templateError) {
      console.error('❌ Failed to import email templates:', templateError)
      throw new Error(`Template import failed: ${templateError instanceof Error ? templateError.message : 'Unknown template error'}`)
    }
    
    const signupData = {
      userEmail: email,
      verificationCode,
      userName: userName || email,
      expiryMinutes: 10,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet.kr'
    }

    console.log('🌐 Template data prepared:', {
      userEmail: email.substring(0, 3) + '***',
      codeLength: verificationCode.length,
      userName: userName?.substring(0, 3) + '***' || 'not provided',
      baseUrl: signupData.baseUrl
    })

    const emailTemplate = createSignupVerificationEmail(signupData)
    
    console.log('🎨 Email template generated:', {
      subject: emailTemplate.subject,
      hasHtml: !!emailTemplate.htmlContent,
      hasText: !!emailTemplate.plainTextContent,
      htmlLength: emailTemplate.htmlContent?.length || 0,
      textLength: emailTemplate.plainTextContent?.length || 0
    })

    const result = await simpleSendGrid.send({
      to: email,
      subject: emailTemplate.subject,
      text: emailTemplate.plainTextContent,
      html: emailTemplate.htmlContent,
    })

    console.log(`📊 Send result: ${result.success ? 'SUCCESS' : 'FAILED'}`)
    if (!result.success) {
      console.error('❌ Send error:', result.error)
    }

    return result.success
  } catch (error) {
    console.error('❌ Verification email sending failed:', error)
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace'
    })
    return false
  }
}

/**
 * 비밀번호 재설정 이메일 발송 헬퍼 함수 (HTML 템플릿 사용)
 */
export async function sendPasswordResetEmail(email: string, resetCode: string, userName?: string): Promise<boolean> {
  try {
    // 새로운 HTML 템플릿 시스템 사용
    const { createPasswordResetEmail } = require('./templates')
    
    const resetData = {
      userEmail: email,
      resetCode,
      userName: userName || email,
      expiryMinutes: 10,
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'https://videoplanet.kr'
    }

    const emailTemplate = createPasswordResetEmail(resetData)

    const result = await simpleSendGrid.send({
      to: email,
      subject: emailTemplate.subject,
      text: emailTemplate.plainTextContent,
      html: emailTemplate.htmlContent,
    })

    return result.success
  } catch (error) {
    console.error('비밀번호 재설정 이메일 발송 실패:', error)
    return false
  }
}
