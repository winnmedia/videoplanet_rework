/**
 * SendGrid 환경 변수 검증 시스템
 * CLAUDE.md Part 4.4.2 - 보안 및 설정 관리 준수
 * FSD 아키텍처: shared/lib 레이어
 */

import { z } from 'zod'

/**
 * SendGrid 환경 변수 Zod 스키마
 */
const sendGridEnvSchema = z.object({
  // SendGrid API 키 (필수)
  SENDGRID_API_KEY: z
    .string()
    .min(1, 'SendGrid API 키가 필요합니다')
    .startsWith('SG.', 'SendGrid API 키는 "SG."으로 시작해야 합니다')
    .refine(
      val => {
        // 프로덕션에서는 실제 API 키만 허용
        if (process.env.NODE_ENV === 'production') {
          return val !== 'dummy-sendgrid-key' && val.length >= 69 // SendGrid API 키는 일반적으로 69자
        }
        // 개발환경에서는 더미 키도 허용하되 형식은 맞춰야 함
        return val.length >= 10
      },
      { message: '프로덕션에서는 유효한 SendGrid API 키가 필요합니다' }
    ),

  // 발신자 이메일 (필수)
  SENDGRID_FROM_EMAIL: z
    .string()
    .email('올바른 이메일 형식이 필요합니다')
    .refine(
      email => {
        // 프로덕션에서는 실제 도메인 이메일만 허용
        if (process.env.NODE_ENV === 'production') {
          return !email.includes('example.com') && !email.includes('test.com')
        }
        return true
      },
      { message: '프로덕션에서는 실제 도메인 이메일이 필요합니다' }
    ),

  // 발신자 이름 (선택적)
  SENDGRID_FROM_NAME: z
    .string()
    .min(1, '발신자 이름은 최소 1자 이상이어야 합니다')
    .max(100, '발신자 이름은 100자를 초과할 수 없습니다')
    .optional()
    .default('VideoPlanet'),

  // 검증된 발신자 이메일 (SendGrid 검증 필수)
  VERIFIED_SENDER: z
    .string()
    .email('올바른 검증된 발신자 이메일 형식이 필요합니다')
    .optional()
    .refine(
      email => {
        // 프로덕션에서는 SENDGRID_FROM_EMAIL과 동일하거나 별도 검증된 이메일
        if (process.env.NODE_ENV === 'production' && email) {
          return !email.includes('example.com') && !email.includes('test.com')
        }
        return true
      },
      { message: '프로덕션에서는 SendGrid에서 검증된 발신자 이메일이 필요합니다' }
    ),

  // SendGrid 템플릿 설정 (선택적)
  SENDGRID_TEMPLATE_ID_VERIFICATION: z.string().optional(),
  SENDGRID_TEMPLATE_ID_PASSWORD_RESET: z.string().optional(),
  SENDGRID_TEMPLATE_ID_NOTIFICATION: z.string().optional(),
})

/**
 * SendGrid 환경 변수 타입
 */
export type SendGridEnv = z.infer<typeof sendGridEnvSchema>

/**
 * SendGrid 폴백 설정
 */
const sendGridFallbackConfig = {
  SENDGRID_API_KEY: 'SG.dummy-key-for-development',
  SENDGRID_FROM_EMAIL: 'service@vlanet.net',
  SENDGRID_FROM_NAME: 'VideoPlanet',
  VERIFIED_SENDER: 'service@vlanet.net',
} as const

/**
 * SendGrid 환경 변수 검증 및 로드
 *
 * @returns 검증된 SendGrid 환경 변수
 * @throws Error 필수 환경 변수가 누락되었을 때
 */
export function validateSendGridEnv(): SendGridEnv {
  try {
    const rawEnv = {
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
      SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL,
      SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME,
      VERIFIED_SENDER: process.env.VERIFIED_SENDER,
      SENDGRID_TEMPLATE_ID_VERIFICATION: process.env.SENDGRID_TEMPLATE_ID_VERIFICATION,
      SENDGRID_TEMPLATE_ID_PASSWORD_RESET: process.env.SENDGRID_TEMPLATE_ID_PASSWORD_RESET,
      SENDGRID_TEMPLATE_ID_NOTIFICATION: process.env.SENDGRID_TEMPLATE_ID_NOTIFICATION,
    }

    const validatedEnv = sendGridEnvSchema.parse(rawEnv)

    // 개발환경에서 검증 성공 로그
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ SendGrid 환경 변수 검증 성공')
      console.log(`📧 발신자: ${validatedEnv.SENDGRID_FROM_NAME} <${validatedEnv.SENDGRID_FROM_EMAIL}>`)
    }

    return validatedEnv
  } catch (error) {
    const errorMessage =
      error instanceof z.ZodError
        ? `SendGrid 환경 변수 검증 실패: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
        : `SendGrid 환경 변수 검증 실패: ${error}`

    // 개발환경에서는 폴백 설정으로 동작
    if (process.env.NODE_ENV === 'development') {
      console.warn(`⚠️ ${errorMessage}`)
      console.warn('🔧 개발환경에서 SendGrid 폴백 설정 사용')

      return {
        ...sendGridFallbackConfig,
        SENDGRID_TEMPLATE_ID_VERIFICATION: process.env.SENDGRID_TEMPLATE_ID_VERIFICATION,
        SENDGRID_TEMPLATE_ID_PASSWORD_RESET: process.env.SENDGRID_TEMPLATE_ID_PASSWORD_RESET,
        SENDGRID_TEMPLATE_ID_NOTIFICATION: process.env.SENDGRID_TEMPLATE_ID_NOTIFICATION,
      }
    }

    // 프로덕션에서는 엄격한 검증
    console.error(`❌ ${errorMessage}`)

    if (error instanceof z.ZodError) {
      console.error('SendGrid 환경 변수 상세 오류:')
      error.errors.forEach((err, index) => {
        console.error(`  ${index + 1}. ${err.path.join('.')}: ${err.message}`)
      })

      // 누락된 환경 변수에 대한 가이드 제공
      const missingKeys = error.errors
        .filter(err => err.code === 'invalid_type' && err.received === 'undefined')
        .map(err => err.path.join('.'))

      if (missingKeys.length > 0) {
        console.error('\n📋 누락된 SendGrid 환경 변수:')
        missingKeys.forEach(key => {
          console.error(`  - ${key}`)
        })

        console.error('\n💡 해결 방법:')
        console.error('  1. .env.local 파일에 누락된 환경 변수를 추가하세요')
        console.error('  2. Vercel 대시보드에서 환경 변수를 설정하세요')
        console.error('  3. SendGrid 계정에서 API 키와 검증된 발신자를 확인하세요')
      }
    }

    throw new Error(`SendGrid 환경 변수 검증 실패로 인해 이메일 기능을 사용할 수 없습니다: ${errorMessage}`)
  }
}

/**
 * SendGrid 환경 변수 상태 확인 (개발 전용)
 * 개발환경에서 SendGrid 설정 상태를 확인합니다
 */
export function checkSendGridHealth(): void {
  if (process.env.NODE_ENV !== 'development') return

  console.log('🔧 SendGrid 환경 변수 상태 확인:')

  try {
    const sendGridEnv = validateSendGridEnv()

    console.log('✅ SendGrid 환경 변수 검증 통과')
    console.log(`📧 발신자 이메일: ${sendGridEnv.SENDGRID_FROM_EMAIL}`)
    console.log(`👤 발신자 이름: ${sendGridEnv.SENDGRID_FROM_NAME}`)
    console.log(`🔑 API 키 상태: ${sendGridEnv.SENDGRID_API_KEY ? '설정됨' : '누락'}`)
    console.log(`✉️ 검증된 발신자: ${sendGridEnv.VERIFIED_SENDER || '미설정'}`)

    // 템플릿 설정 확인
    const templates = {
      Verification: sendGridEnv.SENDGRID_TEMPLATE_ID_VERIFICATION,
      'Password Reset': sendGridEnv.SENDGRID_TEMPLATE_ID_PASSWORD_RESET,
      Notification: sendGridEnv.SENDGRID_TEMPLATE_ID_NOTIFICATION,
    }

    const templateStatus = Object.entries(templates)
      .map(([name, id]) => `${name}: ${id ? '설정됨' : '미설정'}`)
      .join(', ')

    console.log(`📋 템플릿 상태: ${templateStatus}`)
  } catch (error) {
    console.warn('⚠️ SendGrid 환경 변수 일부 누락 또는 잘못 설정됨')
    console.warn(`오류: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * SendGrid 설정 객체 생성
 * 검증된 환경 변수를 기반으로 SendGrid 클라이언트 설정을 생성합니다
 */
export function createSendGridConfig(): SendGridEnv & {
  isConfigured: boolean
  isDevelopment: boolean
} {
  const sendGridEnv = validateSendGridEnv()

  return {
    ...sendGridEnv,
    isConfigured: Boolean(sendGridEnv.SENDGRID_API_KEY && sendGridEnv.SENDGRID_FROM_EMAIL),
    isDevelopment: process.env.NODE_ENV === 'development',
  }
}

/**
 * 검증된 SendGrid 환경 변수 내보내기 (앱 전역 사용)
 */
export const sendGridConfig = (() => {
  try {
    return createSendGridConfig()
  } catch (error) {
    console.warn('SendGrid 설정 초기화 실패, 기본값 사용:', error)
    return {
      ...sendGridFallbackConfig,
      isConfigured: false,
      isDevelopment: process.env.NODE_ENV === 'development',
      SENDGRID_TEMPLATE_ID_VERIFICATION: undefined,
      SENDGRID_TEMPLATE_ID_PASSWORD_RESET: undefined,
      SENDGRID_TEMPLATE_ID_NOTIFICATION: undefined,
    }
  }
})()
