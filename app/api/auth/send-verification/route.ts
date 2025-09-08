/**
 * @fileoverview Send Verification Email API Route
 * @description 이메일 인증 발송을 위한 API 엔드포인트
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// 이메일 인증 요청 스키마
const SendVerificationSchema = z.object({
  email: z.string().email('유효한 이메일 주소를 입력해주세요'),
  type: z.enum(['signup', 'login', 'reset-password']).default('signup'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Zod 검증 (type 필드 포함)
    const validatedData = SendVerificationSchema.parse(body)
    const { email, type } = validatedData

    if (!email || !type) {
      return NextResponse.json({ error: '이메일과 타입이 필요합니다.' }, { status: 400 })
    }

    // TODO: 실제 이메일 발송 로직 구현
    console.log(`Verification email requested for: ${email}, type: ${type}`)

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
        email,
        type,
        status: 'pending',
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Send verification error:', error)

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
