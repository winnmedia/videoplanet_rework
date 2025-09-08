/**
 * @fileoverview 회원가입 API 엔드포인트
 * @description 사용자 회원가입 처리를 위한 API 엔드포인트
 * @layer app/api
 * @author Claude (AI Assistant)
 */

import { NextRequest } from 'next/server'
import { ZodError } from 'zod'

import { sendVerificationEmail } from '@/lib/email/simple-sendgrid'
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationErrorResponse,
  createInternalServerErrorResponse,
  API_ERROR_CODES,
} from '@/shared/lib/api-response'
import { generateAccessToken } from '@/shared/lib/auth/jwt'
import { findUserByEmail, createUser, hashPassword } from '@/shared/lib/db/mock-db'
import { signupRequestSchema, SignupResponse } from '@/shared/lib/schemas/auth.schema'

/**
 * POST /api/auth/signup
 * 사용자 회원가입 처리
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
    const validationResult = signupRequestSchema.safeParse(requestBody)
    if (!validationResult.success) {
      return createValidationErrorResponse(validationResult.error)
    }

    const { email, password, name } = validationResult.data

    // 기존 사용자 확인
    const existingUser = await findUserByEmail(email)
    if (existingUser) {
      return createErrorResponse(API_ERROR_CODES.RESOURCE_ALREADY_EXISTS, '이미 등록된 이메일입니다.', 409)
    }

    // 비밀번호 해싱
    const hashedPassword = await hashPassword(password)

    // 새 사용자 생성
    const newUser = await createUser({
      email,
      name,
      hashedPassword,
      role: 'user',
    })

    // 인증 토큰 생성 (이메일 인증용)
    const verificationToken = generateAccessToken({
      id: newUser.id,
      email: newUser.email,
      role: newUser.role,
    })

    // 인증 이메일 발송 시도
    let emailSent = false

    try {
      emailSent = await sendVerificationEmail(email, verificationToken)
    } catch (error) {
      console.error('인증 이메일 발송 실패:', error)
    }

    // 응답 메시지 구성
    let message = '회원가입이 완료되었습니다.'
    if (emailSent) {
      message += ' 인증 이메일을 발송했습니다. 이메일을 확인해주세요.'
    } else {
      message += ' 하지만 인증 이메일 발송에 실패했습니다. 관리자에게 문의해주세요.'
    }

    // 회원가입 응답 데이터 구성
    const signupResponse: SignupResponse = {
      user: newUser,
      message,
    }

    // 성공 응답 (201 Created)
    return createSuccessResponse(signupResponse, message, 201)
  } catch (error) {
    console.error('회원가입 처리 중 오류:', error)

    return createInternalServerErrorResponse(
      '회원가입 처리 중 서버 오류가 발생했습니다.',
      process.env.NODE_ENV === 'development' ? error : undefined
    )
  }
}
