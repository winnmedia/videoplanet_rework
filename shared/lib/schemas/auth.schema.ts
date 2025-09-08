/**
 * @fileoverview 인증 API 스키마 정의
 * @description Zod를 사용한 인증 관련 입력/출력 데이터 검증 스키마
 * @layer shared/lib/schemas
 * @author Claude (AI Assistant)
 */

import { z } from 'zod'

// 호환성을 위한 ID 검증 스키마 (긴급 패치)
const UserIdSchema = z
  .string()
  .min(1, 'ID는 필수입니다')
  .refine(val => {
    // UUID 형식이거나 일반 문자열 허용
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(val) || /^[a-zA-Z0-9\-_]+$/.test(val)
  }, '유효하지 않은 ID 형식입니다')

/**
 * 로그인 요청 스키마
 */
export const loginRequestSchema = z.object({
  email: z
    .string()
    .min(1, '이메일을 입력해주세요.')
    .email('올바른 이메일 형식을 입력해주세요.')
    .max(254, '이메일이 너무 깁니다.'),
  password: z
    .string()
    .min(1, '비밀번호를 입력해주세요.')
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
    .max(128, '비밀번호가 너무 깁니다.'),
})

/**
 * 회원가입 요청 스키마
 */
export const signupRequestSchema = z
  .object({
    email: z
      .string()
      .min(1, '이메일을 입력해주세요.')
      .email('올바른 이메일 형식을 입력해주세요.')
      .max(254, '이메일이 너무 깁니다.'),
    password: z
      .string()
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
      .max(128, '비밀번호가 너무 깁니다.')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다.'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
    name: z
      .string()
      .min(1, '이름을 입력해주세요.')
      .max(50, '이름이 너무 깁니다.')
      .regex(/^[가-힣a-zA-Z\s]+$/, '이름은 한글, 영문만 입력 가능합니다.'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  })

/**
 * 사용자 정보 스키마
 */
export const userSchema = z.object({
  id: UserIdSchema,
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  name: z.string().min(1, '이름이 필요합니다.'),
  role: z.enum(['user', 'admin', 'moderator']).default('user'),
  isEmailVerified: z.boolean().default(false),
  createdAt: z.string().datetime('올바른 날짜 형식이 아닙니다.'),
  updatedAt: z.string().datetime('올바른 날짜 형식이 아닙니다.').optional(),
})

/**
 * 로그인 응답 스키마
 */
export const loginResponseSchema = z.object({
  user: userSchema.omit({
    createdAt: true,
    updatedAt: true,
  }),
  token: z.string().min(1, '토큰이 필요합니다.'),
  refreshToken: z.string().min(1, '리프레시 토큰이 필요합니다.'),
  expiresIn: z.number().positive('만료 시간은 양수여야 합니다.'),
})

/**
 * 회원가입 응답 스키마
 */
export const signupResponseSchema = z.object({
  user: userSchema.omit({
    createdAt: true,
    updatedAt: true,
  }),
  message: z.string().min(1, '메시지가 필요합니다.'),
})

// 타입 추론
export type LoginRequest = z.infer<typeof loginRequestSchema>
export type SignupRequest = z.infer<typeof signupRequestSchema>
export type User = z.infer<typeof userSchema>
export type LoginResponse = z.infer<typeof loginResponseSchema>
export type SignupResponse = z.infer<typeof signupResponseSchema>
