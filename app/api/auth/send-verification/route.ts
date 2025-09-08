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

  try {
    const body = await request.json()

    // Zod 검증 (type 필드 포함)
    const validatedData = SendVerificationSchema.parse(body)
    const { email, type } = validatedData

    if (!email || !type) {
      return NextResponse.json({ error: '이메일과 타입이 필요합니다.' }, { status: 400 })
    }

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

    // 실제 이메일 발송 로직
    console.log(`Verification email requested for: ${email}, type: ${type}`)

    try {
      // SimpleSendGrid를 사용한 실제 이메일 발송
      const { sendVerificationEmail } = await import('@/lib/email/simple-sendgrid')

      // 기본 인증 코드 생성
      const verificationCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

      const emailResult = await sendVerificationEmail(email, verificationCode)

      const deliveryTime = Date.now() - startTime

      if (emailResult) {
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
        // 실패 로깅
        emailMonitor.logEmail({
          type: emailType,
          status: 'failed',
          userHash,
          errorMessage: 'Email service unavailable',
          metadata: {
            provider: 'sendgrid',
            requestType: type,
            deliveryTime,
            attemptCount: 1,
          },
        })

        return NextResponse.json(
          {
            error: '이메일 발송 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
            message: '이메일 서비스가 일시적으로 이용할 수 없습니다.',
          },
          { status: 503 }
        )
      }
    } catch (emailError) {
      console.error('Email sending failed:', emailError)

      const deliveryTime = Date.now() - startTime
      emailMonitor.logEmail({
        type: emailType,
        status: 'failed',
        userHash,
        errorMessage: emailError instanceof Error ? emailError.message : 'Email sending failed',
        metadata: {
          provider: 'sendgrid',
          requestType: type,
          deliveryTime,
          errorType: 'send_error',
        },
      })

      return NextResponse.json(
        {
          error: '이메일 발송 서비스 오류가 발생했습니다.',
          message: emailError instanceof Error ? emailError.message : 'Unknown email error',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Send verification error:', error)

    // 에러 로깅 (가능한 경우)
    if (userHash && emailType) {
      emailMonitor.logEmail({
        type: emailType,
        status: 'failed',
        userHash,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          provider: 'system',
          deliveryTime: Date.now() - startTime,
          errorType: 'validation_error',
        },
      })
    }

    // Zod 검증 오류
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
          message: '입력 데이터가 올바르지 않습니다.',
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      {
        error: 'Failed to send verification email',
        message: error instanceof Error ? error.message : 'Unknown error',
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
