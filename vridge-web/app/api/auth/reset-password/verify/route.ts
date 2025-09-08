/**
 * @fileoverview 비밀번호 재설정 검증 API 엔드포인트
 * @description 토큰 검증 및 새 비밀번호 설정
 * @layer app/api/auth/reset-password/verify
 * @author Claude (AI Assistant)
 */

import { NextRequest, NextResponse } from 'next/server'

import { PasswordResetVerifySchema, validateData } from '@/shared/api/schemas'
import { createApiResponse, createApiError, API_ERROR_CODES } from '@/shared/lib/api-response'
import {
  verifyPasswordResetToken,
  markPasswordResetTokenAsUsed,
  updateUserPassword,
  hashPassword,
} from '@/shared/lib/db/mock-db'

/**
 * POST /api/auth/reset-password/verify
 * 토큰 검증 후 비밀번호 재설정
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
    const validation = validateData(PasswordResetVerifySchema, body)
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

    const { token, newPassword } = validation.data

    // 토큰 검증
    const tokenValidation = verifyPasswordResetToken(token)
    if (!tokenValidation.valid || !tokenValidation.email) {
      return NextResponse.json(
        createApiError({
          code: API_ERROR_CODES.AUTH_INVALID_TOKEN,
          message: '유효하지 않거나 만료된 토큰입니다.',
          statusCode: 400,
        }),
        { status: 400 }
      )
    }

    try {
      // 새 비밀번호 해싱
      const hashedPassword = await hashPassword(newPassword)

      // 사용자 비밀번호 업데이트
      const updateSuccess = await updateUserPassword(tokenValidation.email, hashedPassword)

      if (!updateSuccess) {
        return NextResponse.json(
          createApiError({
            code: API_ERROR_CODES.INTERNAL_ERROR,
            message: '비밀번호 변경 중 오류가 발생했습니다.',
            statusCode: 500,
          }),
          { status: 500 }
        )
      }

      // 토큰을 사용됨으로 표시
      markPasswordResetTokenAsUsed(token)

      return NextResponse.json(
        createApiResponse({
          message: '비밀번호가 성공적으로 변경되었습니다.',
        }),
        { status: 200 }
      )
    } catch (error) {
      console.error('비밀번호 업데이트 중 오류:', error)

      return NextResponse.json(
        createApiError({
          code: API_ERROR_CODES.INTERNAL_ERROR,
          message: '비밀번호 변경 중 오류가 발생했습니다.',
          statusCode: 500,
        }),
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('비밀번호 재설정 검증 API 오류:', error)

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
