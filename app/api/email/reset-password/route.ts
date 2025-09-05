import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { emailQueue } from '@/lib/email/queue'
import { sendGridService, generateVerificationCode } from '@/lib/email/sendgrid'
import { ResetPasswordTemplate } from '@/lib/email/templates/ResetPasswordTemplate'

// 요청 스키마
const requestSchema = z.object({
  email: z.string().email(),
})

// 인증 코드 저장소 재사용
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

    // 리셋 코드 생성
    const code = generateVerificationCode()
    const expires = Date.now() + 10 * 60 * 1000 // 10분 후 만료

    // 리셋 코드 저장
    globalThis.verificationStore.set(email, { 
      code, 
      expires, 
      type: 'reset' 
    })

    console.log('🔐 Stored reset code:', { email, code, expires })

    // React Email 템플릿 렌더링
    const emailHtml = await sendGridService.renderTemplate(
      ResetPasswordTemplate({
        resetCode: code,
        userEmail: email,
      })
    )

    // 이메일을 큐에 추가 (높은 우선순위)
    const emailId = await emailQueue.add(
      {
        to: email,
        subject: '🔐 VLANET 비밀번호 재설정 - 보안 인증번호',
        html: emailHtml,
      },
      {
        priority: 'high', // 비밀번호 재설정은 높은 우선순위
      }
    )

    // 개발 모드에서 코드 반환
    const isDevelopment = process.env.NODE_ENV !== 'production'
    
    return NextResponse.json({
      success: true,
      message: '비밀번호 재설정 코드가 이메일로 발송되었습니다.',
      emailId,
      ...(isDevelopment && { devCode: code }),
    })
  } catch (error) {
    console.error('Reset password email error:', error)
    
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

// 인증 코드 확인 (선택적)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code } = z.object({
      email: z.string().email(),
      code: z.string().length(6),
    }).parse(body)

    const stored = globalThis.verificationStore.get(email)
    
    if (!stored) {
      return NextResponse.json(
        { success: false, error: '인증 코드를 찾을 수 없습니다.' },
        { status: 404 }
      )
    }

    if (stored.expires < Date.now()) {
      globalThis.verificationStore.delete(email)
      return NextResponse.json(
        { success: false, error: '인증 코드가 만료되었습니다.' },
        { status: 400 }
      )
    }

    if (stored.code !== code) {
      return NextResponse.json(
        { success: false, error: '잘못된 인증 코드입니다.' },
        { status: 400 }
      )
    }

    if (stored.type !== 'reset') {
      return NextResponse.json(
        { success: false, error: '비밀번호 재설정용 코드가 아닙니다.' },
        { status: 400 }
      )
    }

    // 인증 성공 - 코드 삭제
    globalThis.verificationStore.delete(email)

    return NextResponse.json({
      success: true,
      message: '인증이 완료되었습니다. 새 비밀번호를 설정해주세요.',
    })
  } catch (error) {
    console.error('Verify reset code error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          success: false, 
          error: '입력 데이터가 올바르지 않습니다.',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: '인증 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}