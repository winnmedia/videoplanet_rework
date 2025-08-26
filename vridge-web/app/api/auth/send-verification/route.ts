import { NextRequest, NextResponse } from 'next/server'
import { EmailService } from '@/shared/services/emailService'

// 인증 코드를 임시 저장할 메모리 스토어 (실제 운영에서는 Redis 등 사용)
const verificationCodes = new Map<string, { code: string; expires: number; type: 'signup' | 'reset' }>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, type } = body

    if (!email || !type) {
      return NextResponse.json(
        { error: '이메일과 타입이 필요합니다.' },
        { status: 400 }
      )
    }

    if (!['signup', 'reset'].includes(type)) {
      return NextResponse.json(
        { error: '올바르지 않은 타입입니다.' },
        { status: 400 }
      )
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: '올바른 이메일 주소를 입력해주세요.' },
        { status: 400 }
      )
    }

    // 인증번호 생성
    const code = EmailService.generateVerificationCode()
    const expires = Date.now() + 10 * 60 * 1000 // 10분 후 만료

    // 인증번호 저장
    verificationCodes.set(email, { code, expires, type: type as 'signup' | 'reset' })

    try {
      // 이메일 발송
      if (type === 'signup') {
        await EmailService.sendVerificationCode(email, code)
      } else {
        await EmailService.sendPasswordResetCode(email, code)
      }

      return NextResponse.json({
        message: '인증번호가 발송되었습니다.',
        success: true
      })
    } catch (emailError) {
      console.error('Email sending failed:', emailError)
      
      // SendGrid가 설정되지 않은 경우 개발 모드에서 콘솔에 코드 출력
      if (!process.env.SENDGRID_API_KEY) {
        console.log(`🔑 [DEV MODE] Verification code for ${email}: ${code}`)
        return NextResponse.json({
          message: '개발 모드: 콘솔에서 인증번호를 확인하세요.',
          success: true,
          devCode: code // 개발 모드에서만 반환
        })
      }

      return NextResponse.json(
        { error: '이메일 발송에 실패했습니다. 다시 시도해주세요.' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Send verification error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code, type } = body

    if (!email || !code || !type) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    const stored = verificationCodes.get(email)
    
    if (!stored) {
      return NextResponse.json(
        { error: '인증번호를 먼저 요청해주세요.' },
        { status: 400 }
      )
    }

    if (stored.expires < Date.now()) {
      verificationCodes.delete(email)
      return NextResponse.json(
        { error: '인증번호가 만료되었습니다. 다시 요청해주세요.' },
        { status: 400 }
      )
    }

    if (stored.code !== code || stored.type !== type) {
      return NextResponse.json(
        { error: '인증번호가 올바르지 않습니다.' },
        { status: 400 }
      )
    }

    // 인증 성공 - 코드 삭제
    verificationCodes.delete(email)

    return NextResponse.json({
      message: '이메일 인증이 완료되었습니다.',
      success: true
    })
  } catch (error) {
    console.error('Verify code error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}