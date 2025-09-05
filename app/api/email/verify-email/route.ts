import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { emailQueue } from '@/lib/email/queue'
import { sendGridService, generateVerificationCode } from '@/lib/email/sendgrid'
import { VerifyEmailTemplate } from '@/lib/email/templates/VerifyEmailTemplate'

// 요청 스키마
const requestSchema = z.object({
  email: z.string().email(),
})

// 인증 코드 저장소 (실제 운영에서는 Redis 등 사용)
declare global {
  var verificationStore: Map<string, { code: string; expires: number; type: 'signup' | 'reset' }>
}

if (!globalThis.verificationStore) {
  globalThis.verificationStore = new Map()
}

export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱 및 검증
    const body = await request.json()
    const { email } = requestSchema.parse(body)

    // 인증번호 생성
    const code = generateVerificationCode()
    const expires = Date.now() + 10 * 60 * 1000 // 10분 후 만료

    // 인증번호 저장
    globalThis.verificationStore.set(email, { 
      code, 
      expires, 
      type: 'signup' 
    })

    console.log('🔑 Stored verification code:', { email, code, expires })

    // React Email 템플릿 렌더링
    const emailHtml = await sendGridService.renderTemplate(
      VerifyEmailTemplate({
        verificationCode: code,
        userEmail: email,
      })
    )

    // 이메일을 큐에 추가
    const emailId = await emailQueue.add(
      {
        to: email,
        subject: '🚀 VLANET 이메일 인증 - 비디오 피드백 플랫폼에 오신 것을 환영합니다!',
        html: emailHtml,
      },
      {
        priority: 'high', // 인증 이메일은 높은 우선순위
      }
    )

    // 개발 모드에서 코드 반환
    const isDevelopment = process.env.NODE_ENV !== 'production'
    
    return NextResponse.json({
      success: true,
      message: '인증번호가 발송되었습니다.',
      emailId,
      ...(isDevelopment && { devCode: code }),
    })
  } catch (error) {
    console.error('Verify email error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: '올바른 이메일 주소를 입력해주세요.',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        success: false, 
        error: '이메일 발송에 실패했습니다. 다시 시도해주세요.' 
      },
      { status: 500 }
    )
  }
}

// GET 메서드로 큐 상태 조회
export async function GET() {
  const status = emailQueue.getStatus()
  
  return NextResponse.json({
    queue: status,
    sendGrid: {
      ready: sendGridService.isReady(),
      stats: sendGridService.getStats(),
    },
  })
}