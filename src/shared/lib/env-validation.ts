/**
 * 환경변수 검증 시스템
 * variables.md 기반 Zod 스키마 검증
 * CLAUDE.md Part 4.4.2 - 보안 및 설정 관리 준수
 */

import { z } from 'zod'

/**
 * 프론트엔드 환경변수 Zod 스키마
 * variables.md의 모든 NEXT_PUBLIC_ 변수 포함
 */
const frontendEnvSchema = z.object({
  // 앱 기본 설정
  NEXT_PUBLIC_APP_NAME: z.string().min(1, '앱 이름이 필요합니다'),
  NEXT_PUBLIC_APP: z.string().min(1, '앱 식별자가 필요합니다'),
  NEXT_PUBLIC_APP_ENV: z.enum(['development', 'production', 'test']),
  NEXT_PUBLIC_PRODUCTION_DOMAIN: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url('올바른 앱 URL이 필요합니다'),

  // API 및 백엔드 연동
  NEXT_PUBLIC_API_BASE: z.string().url('올바른 API URL이 필요합니다'),
  NEXT_PUBLIC_BACKEND_API: z.string().url('올바른 백엔드 API URL이 필요합니다'),

  // WebSocket 실시간 기능
  NEXT_PUBLIC_WS_URL: z.string().min(1, 'WebSocket URL이 필요합니다'),
  NEXT_PUBLIC_WS_RECONNECT_INTERVAL: z.coerce.number().min(1000).max(30000),
  NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL: z.coerce.number().min(5000).max(120000),
  NEXT_PUBLIC_WS_MAX_RECONNECT_ATTEMPTS: z.coerce.number().min(1).max(50),
  NEXT_PUBLIC_WS_MESSAGE_QUEUE_SIZE: z.coerce.number().min(100).max(10000),

  // 분석 및 보안 (선택사항)
  NEXT_PUBLIC_GA_ID: z.string().optional(),
  NEXT_PUBLIC_RECAPTCHA_SITE_KEY: z.string().optional(),

  // 개발 환경
  NODE_ENV: z.enum(['development', 'production', 'test']),
})

/**
 * 서버사이드 환경변수 스키마 (비공개 키들)
 */
const serverEnvSchema = z.object({
  // NextAuth 인증
  NEXTAUTH_URL: z.string().url().optional(),
  NEXTAUTH_SECRET: z.string().min(32, 'NextAuth 비밀키는 최소 32자 이상이어야 합니다').optional(),

  // 외부 API 키
  GEMINI_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  HUGGINGFACE_API_KEY: z.string().optional(),

  // 메일 서비스
  FROM_EMAIL: z.string().email().optional(),
  SENDGRID_API_KEY: z.string().optional(),
})

/**
 * 통합 환경변수 타입
 */
export type FrontendEnv = z.infer<typeof frontendEnvSchema>
export type ServerEnv = z.infer<typeof serverEnvSchema>
export type AppEnv = FrontendEnv & ServerEnv

/**
 * 프론트엔드 환경변수 검증 및 로드
 * 앱 시작 시점에 실행, 실패 시 빌드/실행 중단
 */
export function validateFrontendEnv(): FrontendEnv {
  try {
    const env = {
      NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
      NEXT_PUBLIC_APP: process.env.NEXT_PUBLIC_APP,
      NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
      NEXT_PUBLIC_PRODUCTION_DOMAIN: process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NEXT_PUBLIC_API_BASE: process.env.NEXT_PUBLIC_API_BASE,
      NEXT_PUBLIC_BACKEND_API: process.env.NEXT_PUBLIC_BACKEND_API,
      NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
      NEXT_PUBLIC_WS_RECONNECT_INTERVAL: process.env.NEXT_PUBLIC_WS_RECONNECT_INTERVAL,
      NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL: process.env.NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL,
      NEXT_PUBLIC_WS_MAX_RECONNECT_ATTEMPTS: process.env.NEXT_PUBLIC_WS_MAX_RECONNECT_ATTEMPTS,
      NEXT_PUBLIC_WS_MESSAGE_QUEUE_SIZE: process.env.NEXT_PUBLIC_WS_MESSAGE_QUEUE_SIZE,
      NEXT_PUBLIC_GA_ID: process.env.NEXT_PUBLIC_GA_ID,
      NEXT_PUBLIC_RECAPTCHA_SITE_KEY: process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
      NODE_ENV: process.env.NODE_ENV,
    }

    return frontendEnvSchema.parse(env)
  } catch (error) {
    console.error('❌ 프론트엔드 환경변수 검증 실패:', error)
    
    if (error instanceof z.ZodError) {
      console.error('상세 오류:', error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        received: err.input
      })))
    }

    throw new Error('환경변수 검증 실패로 인해 애플리케이션을 시작할 수 없습니다.')
  }
}

/**
 * 서버사이드 환경변수 검증
 */
export function validateServerEnv(): ServerEnv {
  try {
    const env = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY,
      GOOGLE_API_KEY: process.env.GOOGLE_API_KEY,
      HUGGINGFACE_API_KEY: process.env.HUGGINGFACE_API_KEY,
      FROM_EMAIL: process.env.FROM_EMAIL,
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
    }

    return serverEnvSchema.parse(env)
  } catch (error) {
    console.error('❌ 서버 환경변수 검증 실패:', error)
    throw new Error('서버 환경변수 검증 실패')
  }
}

/**
 * 개발 환경에서 환경변수 상태 확인
 */
export function checkEnvHealth(): void {
  if (process.env.NODE_ENV !== 'development') return

  console.log('🔧 환경변수 상태 확인:')
  
  const frontendEnv = validateFrontendEnv()
  console.log('✅ 프론트엔드 환경변수 검증 통과')
  console.log(`📱 앱: ${frontendEnv.NEXT_PUBLIC_APP_NAME} (${frontendEnv.NEXT_PUBLIC_APP_ENV})`)
  console.log(`🌐 API: ${frontendEnv.NEXT_PUBLIC_API_BASE}`)
  console.log(`🔌 WebSocket: ${frontendEnv.NEXT_PUBLIC_WS_URL}`)

  try {
    const serverEnv = validateServerEnv()
    console.log('✅ 서버 환경변수 검증 통과')
    console.log(`🔑 API 키 상태: Gemini=${!!serverEnv.GEMINI_API_KEY}, OpenAI=${!!serverEnv.OPENAI_API_KEY}`)
  } catch (error) {
    console.warn('⚠️ 서버 환경변수 일부 누락 (개발환경에서는 선택사항)')
  }
}

/**
 * 검증된 환경변수 내보내기 (앱 전역 사용)
 */
export const env = validateFrontendEnv()

/**
 * 환경별 설정
 */
export const isProduction = env.NEXT_PUBLIC_APP_ENV === 'production'
export const isDevelopment = env.NEXT_PUBLIC_APP_ENV === 'development'
export const isTest = env.NEXT_PUBLIC_APP_ENV === 'test'

/**
 * API 설정
 */
export const apiConfig = {
  baseURL: env.NEXT_PUBLIC_API_BASE,
  backendURL: env.NEXT_PUBLIC_BACKEND_API,
  timeout: isDevelopment ? 30000 : 10000,
}

/**
 * WebSocket 설정
 */
export const wsConfig = {
  url: env.NEXT_PUBLIC_WS_URL,
  reconnectInterval: env.NEXT_PUBLIC_WS_RECONNECT_INTERVAL,
  heartbeatInterval: env.NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL,
  maxReconnectAttempts: env.NEXT_PUBLIC_WS_MAX_RECONNECT_ATTEMPTS,
  messageQueueSize: env.NEXT_PUBLIC_WS_MESSAGE_QUEUE_SIZE,
}