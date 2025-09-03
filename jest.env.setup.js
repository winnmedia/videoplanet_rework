/**
 * Jest 환경변수 설정
 * variables.md 기반 테스트 환경 통합 구성
 * CLAUDE.md Part 4.4.2 - 보안 및 설정 관리 준수
 */

// 테스트용 환경변수 설정 (variables.md 기반)
process.env.NODE_ENV = 'test'

// 앱 기본 설정 (테스트용)
process.env.NEXT_PUBLIC_APP_NAME = 'Video Planet, VLANET'
process.env.NEXT_PUBLIC_APP = 'VideoPlanet'
process.env.NEXT_PUBLIC_APP_ENV = 'test'
process.env.NEXT_PUBLIC_PRODUCTION_DOMAIN = 'localhost'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'

// API 및 백엔드 연동 (테스트용 모킹)
process.env.NEXT_PUBLIC_API_BASE = 'http://localhost:8000'
process.env.NEXT_PUBLIC_BACKEND_API = 'http://localhost:8000'

// WebSocket 실시간 기능 (테스트용)
process.env.NEXT_PUBLIC_WS_URL = 'ws://localhost:8000'
process.env.NEXT_PUBLIC_WS_RECONNECT_INTERVAL = '1000'
process.env.NEXT_PUBLIC_WS_HEARTBEAT_INTERVAL = '5000'
process.env.NEXT_PUBLIC_WS_MAX_RECONNECT_ATTEMPTS = '3'
process.env.NEXT_PUBLIC_WS_MESSAGE_QUEUE_SIZE = '100'

// 분석 및 보안 (테스트 환경에서는 비활성화)
process.env.NEXT_PUBLIC_GA_ID = 'test-ga-id'
process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY = 'test-recaptcha-key'

// NextAuth (테스트용)
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-jest-testing-only'

// 외부 API 키 (테스트용 모킹)
process.env.GEMINI_API_KEY = 'test-gemini-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.GOOGLE_API_KEY = 'test-google-key'
process.env.HUGGINGFACE_API_KEY = 'test-huggingface-key'

// 메일 서비스 (테스트용)
process.env.FROM_EMAIL = 'test@example.com'
process.env.SENDGRID_API_KEY = 'test-sendgrid-key'

/**
 * Jest 전용 글로벌 설정
 */

// 타임아웃 설정 (Flaky 테스트 방지)
jest.setTimeout(10000)

// 경고 필터링 (React 18+ 관련 경고 제거)
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    if (
      // React 18 Strict Mode 경고 필터링
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is deprecated')
    ) {
      return
    }
    originalError.call(console, ...args)
  }

  console.warn = (...args) => {
    if (
      // Next.js 개발 모드 경고 필터링
      typeof args[0] === 'string' &&
      (args[0].includes('Fast Refresh') || args[0].includes('webpack'))
    ) {
      return
    }
    originalWarn.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

/**
 * Mock Service Worker (MSW) 글로벌 설정
 */
import { server } from './src/shared/api/mocks/server'

// MSW 서버 시작/종료 설정
beforeAll(() => {
  // MSW 서버 시작
  server.listen({
    onUnhandledRequest: 'warn',
  })
})

afterEach(() => {
  // 각 테스트 후 MSW 핸들러 초기화
  server.resetHandlers()
})

afterAll(() => {
  // 모든 테스트 완료 후 MSW 서버 종료
  server.close()
})

/**
 * React Testing Library 글로벌 설정
 */

// IntersectionObserver 모킹 (최신 브라우저 API)
class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserver,
})

Object.defineProperty(global, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: IntersectionObserver,
})

// ResizeObserver 모킹
class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: ResizeObserver,
})

// matchMedia 모킹 (반응형 디자인 테스트용)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

/**
 * 환경변수 검증 로그 (개발용)
 */
if (process.env.NODE_ENV === 'test') {
  // Dynamic import는 Jest에서 문제가 될 수 있으므로 try-catch로 감쌈
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { checkEnvHealth } = require('./src/shared/lib/env-validation')
    checkEnvHealth()
    console.log('✅ Jest 환경변수 설정 완료')
  } catch (error) {
    console.warn('⚠️ Jest 환경변수 일부 누락:', error.message)
  }
}