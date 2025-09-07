/**
 * @fileoverview Send Verification Email API Route
 * @description 이메일 인증 발송을 위한 API 엔드포인트
 * @layer app/api
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      )
    }

    // TODO: 실제 이메일 발송 로직 구현
    console.log('Verification email requested for:', email)

    // 임시 응답
    return NextResponse.json(
      { 
        message: 'Verification email sent successfully',
        email,
        status: 'pending'
      },
      { status: 200 }
    )

  } catch (error) {
    console.error('Send verification error:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to send verification email',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}