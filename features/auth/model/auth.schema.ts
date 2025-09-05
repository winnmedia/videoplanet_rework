import { z } from 'zod'

// 이메일 스키마
export const emailSchema = z
  .string()
  .min(1, '이메일을 입력해주세요')
  .email('유효한 이메일 주소를 입력해주세요')

// 비밀번호 스키마
export const passwordSchema = z
  .string()
  .min(8, '비밀번호는 최소 8자 이상이어야 합니다')
  .regex(/[A-Z]/, '대문자를 하나 이상 포함해야 합니다')
  .regex(/[a-z]/, '소문자를 하나 이상 포함해야 합니다')
  .regex(/[0-9]/, '숫자를 하나 이상 포함해야 합니다')
  .regex(/[^A-Za-z0-9]/, '특수문자를 하나 이상 포함해야 합니다')

// 로그인 스키마
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, '비밀번호를 입력해주세요'),
  rememberMe: z.boolean().optional()
})

// 회원가입 스키마
export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요'),
  name: z.string().min(2, '이름은 최소 2자 이상이어야 합니다').max(50, '이름은 50자 이내여야 합니다'),
  companyName: z.string().max(100, '회사명은 100자 이내여야 합니다').optional(),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: '이용약관에 동의해주세요' })
  }),
  marketingAccepted: z.boolean().optional()
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword']
})

// 비밀번호 재설정 요청 스키마
export const resetPasswordRequestSchema = z.object({
  email: emailSchema
})

// 비밀번호 재설정 스키마
export const resetPasswordSchema = z.object({
  token: z.string().min(1, '유효하지 않은 토큰입니다'),
  password: passwordSchema,
  confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요')
}).refine((data) => data.password === data.confirmPassword, {
  message: '비밀번호가 일치하지 않습니다',
  path: ['confirmPassword']
})

// 소셜 로그인 프로바이더
export const socialProviders = ['google', 'github'] as const
export type SocialProvider = typeof socialProviders[number]

// 타입 추출
export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ResetPasswordRequestInput = z.infer<typeof resetPasswordRequestSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>

// 유저 인터페이스
export interface User {
  id: string
  email: string
  name: string
  companyName?: string
  role: 'user' | 'admin'
  emailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

// 인증 응답
export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken?: string
}

// 에러 응답
export interface AuthError {
  message: string
  code?: string
  field?: string
}