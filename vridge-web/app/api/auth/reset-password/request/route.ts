/**
 * @fileoverview 비밀번호 재설정 요청 API 엔드포인트
 * @description 이메일로 비밀번호 재설정 링크 전송
 * @layer app/api/auth/reset-password/request
 * @author Claude (AI Assistant)
 */

import { NextRequest, NextResponse } from 'next/server'

import { sendPasswordResetEmail } from '@/lib/email/simple-sendgrid'
import { PasswordResetRequestSchema, validateData } from '@/shared/api/schemas'
import { createApiResponse, createApiError, API_ERROR_CODES } from '@/shared/lib/api-response'
import { findUserByEmail, createPasswordResetToken } from '@/shared/lib/db/mock-db'

/**
 * POST /api/auth/reset-password/request
 * 비밀번호 재설정 요청 및 이메일 발송
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // 요청 본문 파싱
    const body = await request.json().catch(() => null)

    if (!body) {
      return NextResponse.json(
        createApiError({
          code: API_ERROR_CODES.VALIDATION_FAILED,
          message: '요청 본문이 올바르지 않습니다.',
          statusCode: 400,
        }),
        { status: 400 }
      )
    }

    // 입력 데이터 검증
    const validation = validateData(PasswordResetRequestSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        createApiError({
          code: API_ERROR_CODES.VALIDATION_FAILED,
          message: validation.error,
          statusCode: 400,
        }),
        { status: 400 }
      )
    }

    const { email } = validation.data

    try {
      // 사용자 존재 확인
      const user = await findUserByEmail(email)

      if (user) {
        // 사용자가 존재하는 경우에만 토큰 생성 및 이메일 발송
        const resetToken = createPasswordResetToken(email)

        // 이메일 발송 (실패해도 보안상 성공 응답 반환)
        await sendPasswordResetEmail(email, resetToken).catch(error => {
          console.error('비밀번호 재설정 이메일 발송 실패:', error)
        })
      }

      // 보안상 사용자 존재 여부와 관계없이 항상 성공 응답 반환
      return NextResponse.json(
        createApiResponse({
          message: '비밀번호 재설정 링크를 이메일로 전송했습니다.',
        }),
        { status: 200 }
      )
    } catch (error) {
      console.error('비밀번호 재설정 요청 처리 중 오류:', error)

      // 보안상 내부 오류도 성공 응답으로 처리
      return NextResponse.json(
        createApiResponse({
          message: '비밀번호 재설정 링크를 이메일로 전송했습니다.',
        }),
        { status: 200 }
      )
    }
  } catch (error) {
    console.error('비밀번호 재설정 요청 API 오류:', error)

    return NextResponse.json(
      createApiError({
        code: API_ERROR_CODES.INTERNAL_ERROR,
        message: '서버 내부 오류가 발생했습니다.',
        statusCode: 500,
      }),
      { status: 500 }
    )
  }
}
