import { NextRequest, NextResponse } from 'next/server'

// 인증 코드를 임시 저장할 메모리 스토어 (실제 운영에서는 Redis 등 사용)
// send-verification route와 동일한 스토어를 공유해야 함
const verificationCodes = new Map<string, { code: string; expires: number; type: 'signup' | 'reset' }>()

// 전역 스토어를 공유하기 위해 globalThis 사용
declare global {
  var verificationStore: Map<string, { code: string; expires: number; type: 'signup' | 'reset' }>
}

// 전역 저장소 초기화
if (!globalThis.verificationStore) {
  globalThis.verificationStore = new Map()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, code, type } = body

    if (!email || !code || !type) {
      return NextResponse.json(
        { error: '필수 정보가 누락되었습니다.' },
        { status: 400 }
      )
    }

    const stored = globalThis.verificationStore.get(email)
    
    if (!stored) {
      return NextResponse.json(
        { error: '인증번호를 먼저 요청해주세요.' },
        { status: 400 }
      )
    }

    if (stored.expires < Date.now()) {
      globalThis.verificationStore.delete(email)
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
    globalThis.verificationStore.delete(email)

    return NextResponse.json({
      message: '이메일 인증이 완료되었습니다.',
      success: true
    })
  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    )
  }
}