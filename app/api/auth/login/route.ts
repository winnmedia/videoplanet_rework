/**
 * @fileoverview 로그인 API 엔드포인트
 * @description 사용자 로그인 처리를 위한 API 엔드포인트
 * @layer app/api
 * @author Claude (AI Assistant)
 */

import { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createInternalServerErrorResponse,
  API_ERROR_CODES,
} from '@/shared/lib/api-response'
import { generateTokens } from '@/shared/lib/auth/jwt'
import { findUserByEmail, verifyPassword } from '@/shared/lib/db/mock-db'
import { loginRequestSchema, LoginResponse } from '@/shared/lib/schemas/auth.schema'

/**
 * POST /api/auth/login
 * 사용자 로그인 처리
 */
export async function POST(request: NextRequest) {
  try {
    // 요청 본문 파싱
    let requestBody
    try {
      requestBody = await request.json()
    } catch {
      return createValidationErrorResponse(
        new ZodError([
          {
            code: 'custom',
            message: '유효한 JSON 형식이 아닙니다.',
            path: ['body'],
          },
        ])
      )
    }

    // 입력 데이터 검증
    const validationResult = loginRequestSchema.safeParse(requestBody)
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error)
    }

    const { email, password } = validationResult.data

    // 사용자 조회
    const user = await findUserByEmail(email)
    if (!user) {
      return createErrorResponse(
        API_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        '이메일 또는 비밀번호가 올바르지 않습니다.',
        401
      )
    }

    // 비밀번호 검증
    const isPasswordValid = await verifyPassword(password, user.password)
    if (!isPasswordValid) {
      return createErrorResponse(
        API_ERROR_CODES.AUTH_INVALID_CREDENTIALS,
        '이메일 또는 비밀번호가 올바르지 않습니다.',
        401
      )
    }

    // 이메일 인증 상태 확인
    if (!user.isEmailVerified) {
      return createErrorResponse(
        API_ERROR_CODES.AUTH_INSUFFICIENT_PERMISSIONS,
        '이메일 인증이 필요합니다. 인증 메일을 확인해주세요.',
        403
      )
    }

    // 비밀번호를 제외한 사용자 정보 추출
    const { password: _password, ...userWithoutPassword } = user

    // JWT 토큰 생성
    const tokens = generateTokens(userWithoutPassword)

    // 로그인 응답 데이터 구성
    const loginResponse: LoginResponse = {
      user: userWithoutPassword,
      token: tokens.token,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
    }

    // 성공 응답
    return createSuccessResponse(loginResponse, '로그인이 완료되었습니다.')
  } catch (error) {
    console.error('로그인 처리 중 오류:', error)

    return createInternalServerErrorResponse(
      '로그인 처리 중 서버 오류가 발생했습니다.',
      process.env.NODE_ENV === 'development' ? error : undefined
    )
  }
}

// GET 메소드 추가 (405 오류 방지)
export async function GET() {
  return createSuccessResponse(
    {
      message: 'Login endpoint',
      methods: ['POST'],
      description: 'Use POST method with email and password fields',
    },
    '로그인 엔드포인트입니다.'
  )
}
