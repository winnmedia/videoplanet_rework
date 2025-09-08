/**
 * @fileoverview Send Verification Email API Route
 * @description 이메일 인증 발송을 위한 API 엔드포인트
 * @layer app/api
 */

import { createHash } from 'crypto'

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { emailCooldown } from '@/lib/email/cooldown'
import { emailMonitor, EmailType } from '@/lib/email/email-monitoring'

// 환경 변수 검증 스키마
const envSchema = z.object({
  SENDGRID_API_KEY: z.string().min(1, 'SENDGRID_API_KEY is required'),
  SENDGRID_FROM_EMAIL: z.string().email('SENDGRID_FROM_EMAIL must be valid email'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NODE_ENV: z.string().default('development'),
})

// 이메일 인증 요청 스키마
const SendVerificationSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  type: z.enum(['signup', 'login', 'reset-password']).default('signup'),
})

// 타입 매핑
const typeToEmailType: Record<string, EmailType> = {
  signup: 'verification',
  login: 'verification',
  'reset-password': 'reset',
}

// 이메일을 해시로 변환 (PII 보호)
const hashEmail = (email: string): string => {
  return createHash('sha256').update(email.toLowerCase()).digest('hex').substring(0, 16)
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let userHash: string | undefined
  let emailType: EmailType | undefined
  let requestBody: any = null

  try {
    // 환경 변수 검증 (최우선)
    const envValidation = envSchema.safeParse(process.env)
    if (!envValidation.success) {
      console.error('❌ Environment validation failed:', envValidation.error.flatten())
      return NextResponse.json(
        {
          error: 'Service configuration error',
          message: '이메일 서비스 설정에 문제가 있습니다.',
          ...(process.env.NODE_ENV === 'development' && {
            details: envValidation.error.flatten(),
          }),
        },
        { status: 500 }
      )
    }

    console.log('✅ Environment validation passed')

    // 요청 body 파싱
    try {
      requestBody = await request.json()
    } catch (parseError) {
      console.error('❌ Request body parse failed:', parseError)
      return NextResponse.json(
        {
          error: 'Invalid request format',
          message: '요청 형식이 올바르지 않습니다.',
        },
        { status: 400 }
      )
    }

    // Zod 검증 (type 필드 포함)
    let validatedData
    try {
      validatedData = SendVerificationSchema.parse(requestBody)
    } catch (validationError) {
      console.error('❌ Validation failed:', validationError)
      return NextResponse.json(
        {
          error: 'Validation failed',
          message: '입력 데이터가 올바르지 않습니다.',
          ...(process.env.NODE_ENV === 'development' && {
            details: validationError instanceof z.ZodError ? validationError.flatten() : 'Unknown validation error',
          }),
        },
        { status: 400 }
      )
    }

    const { email, type } = validatedData
    console.log(`📧 Processing verification request - Type: ${type}, Email: ${email.substring(0, 3)}***`)

    // 모니터링을 위한 데이터 준비
    userHash = hashEmail(email)
    emailType = typeToEmailType[type]

    // 쿨다운 및 제한 확인 (모니터링 시스템 통합)
    if (!emailCooldown.check(email, emailType)) {
      // 실패 로깅
      emailMonitor.logEmail({
        type: emailType,
        status: 'failed',
        userHash,
        errorMessage: 'Rate limit exceeded',
        metadata: {
          provider: 'system',
          requestType: type,
          deliveryTime: Date.now() - startTime,
        },
      })

      return NextResponse.json(
        {
          error: '이메일 발송 제한에 도달했습니다. 잠시 후 다시 시도해주세요.',
          retryAfter: emailCooldown.getRemainingSeconds(email),
        },
        { status: 429 }
      )
    }

    // 이메일 발송 로직
    console.log(`📤 Attempting to send verification email - Type: ${type}`)

    try {
      // SimpleSendGrid 모듈 import (정적 import로 변경)
      let sendVerificationEmailFunc
      try {
        const sendGridModule = await import('@/lib/email/simple-sendgrid')
        sendVerificationEmailFunc = sendGridModule.sendVerificationEmail
        console.log('✅ SimpleSendGrid module imported successfully')
      } catch (importError) {
        console.error('❌ Failed to import SimpleSendGrid:', importError)
        throw new Error(
          `Module import failed: ${importError instanceof Error ? importError.message : 'Unknown import error'}`
        )
      }

      // 보안 인증 코드 생성 (더 강력한 생성 로직)
      const verificationCode = createHash('sha256')
        .update(`${email}-${Date.now()}-${Math.random()}`)
        .digest('hex')
        .substring(0, 16)
        .toUpperCase()

      console.log(`🔑 Generated verification code for ${email.substring(0, 3)}***`)

      // 이메일 발송 시도
      const emailResult = await sendVerificationEmailFunc(email, verificationCode)

      const deliveryTime = Date.now() - startTime

      if (emailResult) {
        console.log('✅ Email sent successfully')
        // 성공 로깅
        emailMonitor.logEmail({
          type: emailType,
          status: 'success',
          userHash,
          metadata: {
            provider: 'sendgrid',
            messageId: `msg_${Date.now()}`,
            requestType: type,
            deliveryTime,
            templateId: `template_${type}`,
            codeLength: verificationCode.length,
          },
        })

        // 타입별 메시지 구성
        const messages = {
          signup: '회원가입 인증 이메일이 발송되었습니다.',
          login: '로그인 인증 이메일이 발송되었습니다.',
          'reset-password': '비밀번호 재설정 이메일이 발송되었습니다.',
        }

        return NextResponse.json(
          {
            success: true,
            message: messages[type],
            type,
            status: 'sent',
          },
          { status: 200 }
        )
      } else {
        console.error('❌ Email sending returned false')
        // 실패 로깅
        emailMonitor.logEmail({
          type: emailType,
          status: 'failed',
          userHash,
          errorMessage: 'Email service returned false',
          metadata: {
            provider: 'sendgrid',
            requestType: type,
            deliveryTime,
            attemptCount: 1,
            failureReason: 'service_unavailable',
          },
        })

        return NextResponse.json(
          {
            error: '이메일 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            message: '이메일 서비스가 일시적으로 이용할 수 없습니다.',
            retryAfter: 60,
          },
          { status: 503 }
        )
      }
    } catch (emailError) {
      console.error('❌ Email sending failed:', emailError)
      console.error('❌ Error stack:', emailError instanceof Error ? emailError.stack : 'No stack trace')

      const deliveryTime = Date.now() - startTime
      const errorMessage = emailError instanceof Error ? emailError.message : 'Email sending failed'

      emailMonitor.logEmail({
        type: emailType,
        status: 'failed',
        userHash,
        errorMessage,
        metadata: {
          provider: 'sendgrid',
          requestType: type,
          deliveryTime,
          errorType: 'send_error',
          errorName: emailError instanceof Error ? emailError.name : 'UnknownError',
        },
      })

      // 프로덕션에서는 상세 에러 메시지 숨김
      const isProduction = process.env.NODE_ENV === 'production'

      return NextResponse.json(
        {
          error: '이메일 발송 서비스 오류가 발생했습니다.',
          message: '이메일 발송 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
          ...(process.env.NODE_ENV === 'development' && {
            details: errorMessage,
            stack: emailError instanceof Error ? emailError.stack : undefined,
          }),
          retryAfter: 30,
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('❌ Unhandled error in send-verification:', error)
    console.error('❌ Error details:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      requestBody: requestBody ? JSON.stringify(requestBody, null, 2) : 'No body parsed',
    })

    // 에러 로깅 (가능한 경우)
    if (userHash && emailType) {
      emailMonitor.logEmail({
        type: emailType,
        status: 'failed',
        userHash,
        errorMessage: error instanceof Error ? error.message : 'Unknown system error',
        metadata: {
          provider: 'system',
          deliveryTime: Date.now() - startTime,
          errorType: 'unhandled_error',
          errorName: error instanceof Error ? error.name : 'UnknownError',
        },
      })
    }

    // 프로덕션 안전 에러 응답
    const isProduction = process.env.NODE_ENV === 'production'
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: '서버에서 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        timestamp: new Date().toISOString(),
        ...(process.env.NODE_ENV === 'development' && {
          details: errorMessage,
          errorType: error instanceof Error ? error.name : 'Unknown',
          requestBody: requestBody,
        }),
      },
      { status: 500 }
    )
  }
}

// GET 메소드 추가 (405 오류 방지)
export async function GET() {
  return NextResponse.json(
    {
      message: 'Send verification endpoint',
      methods: ['POST'],
      description: 'Use POST method with email and type fields',
    },
    { status: 200 }
  )
}
