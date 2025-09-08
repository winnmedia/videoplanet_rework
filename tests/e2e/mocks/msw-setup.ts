/**
 * MSW (Mock Service Worker) 설정 및 초기화
 * 브라우저 및 Node.js 환경에서 API 모킹
 *
 * @author Grace (QA Lead)
 * @date 2025-09-06
 * @purpose 결정론적 테스트, 외부 의존성 격리, 오프라인 테스트 지원
 */

import { setupWorker } from 'msw/browser'
import { setupServer } from 'msw/node'

import { handlers, getHandlersForEnvironment } from './api-handlers'

// 🌍 환경 감지
const isNode = typeof window === 'undefined'
const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'
const isE2E = process.env.PLAYWRIGHT_TEST === '1' || process.env.E2E_TEST === '1'

// 🔧 MSW 서버/워커 설정
let mockServer: any = null
let mockWorker: any = null

/**
 * MSW 초기화 (Node.js 환경 - 테스트)
 */
export async function setupMockServer() {
  if (isNode && !mockServer) {
    const environment = isTest ? 'test' : isDevelopment ? 'development' : 'production'
    const selectedHandlers = getHandlersForEnvironment(environment)

    mockServer = setupServer(...selectedHandlers)

    // 서버 시작
    mockServer.listen({
      onUnhandledRequest: (req: any) => {
        // E2E 테스트에서는 실제 API 호출도 허용
        if (isE2E && req.url.href.includes('vridge-xyc331ybx-vlanets-projects.vercel.app')) {
          return // 실제 프로덕션 API 호출 허용
        }

        console.warn(`[MSW] Unhandled request: ${req.method} ${req.url.href}`)
      },
    })

    console.log(`[MSW] Mock server started for ${environment} environment`)
    console.log(`[MSW] ${selectedHandlers.length} handlers registered`)
  }

  return mockServer
}

/**
 * MSW 워커 설정 (브라우저 환경)
 */
export async function setupMockWorker() {
  if (!isNode && !mockWorker) {
    const environment = isTest ? 'test' : isDevelopment ? 'development' : 'production'
    const selectedHandlers = getHandlersForEnvironment(environment)

    mockWorker = setupWorker(...selectedHandlers)

    // 브라우저에서 워커 시작
    await mockWorker.start({
      onUnhandledRequest: (req: any) => {
        if (isE2E && req.url.href.includes('vridge-xyc331ybx-vlanets-projects.vercel.app')) {
          return // 실제 프로덕션 API 호출 허용
        }

        console.warn(`[MSW] Unhandled request: ${req.method} ${req.url.href}`)
      },
      quiet: false, // 로그 출력 활성화 (개발/테스트 시)
    })

    console.log(`[MSW] Mock worker started for ${environment} environment`)
  }

  return mockWorker
}

/**
 * MSW 정리 (테스트 후 cleanup)
 */
export async function cleanupMocks() {
  if (mockServer) {
    mockServer.close()
    mockServer = null
    console.log('[MSW] Mock server closed')
  }

  if (mockWorker) {
    mockWorker.stop()
    mockWorker = null
    console.log('[MSW] Mock worker stopped')
  }
}

/**
 * 특정 테스트용 핸들러 추가
 */
export function addTestHandlers(newHandlers: any[]) {
  if (mockServer) {
    mockServer.use(...newHandlers)
  }

  if (mockWorker) {
    mockWorker.use(...newHandlers)
  }

  console.log(`[MSW] Added ${newHandlers.length} test-specific handlers`)
}

/**
 * 핸들러 재설정 (테스트 간 상태 초기화)
 */
export function resetHandlers() {
  if (mockServer) {
    mockServer.resetHandlers()
  }

  if (mockWorker) {
    mockWorker.resetHandlers()
  }

  console.log('[MSW] Handlers reset to original state')
}

/**
 * E2E 테스트용 선택적 모킹 설정
 */
export async function setupE2EMocking(
  options: {
    mockAuth?: boolean
    mockAPI?: boolean
    mockUploads?: boolean
    realBackend?: boolean
  } = {}
) {
  const {
    mockAuth = true, // 인증 모킹 (기본 활성화)
    mockAPI = false, // API 모킹 (기본 비활성화 - 실제 API 사용)
    mockUploads = true, // 업로드 모킹 (기본 활성화)
    realBackend = true, // 실제 백엔드 사용 (기본 활성화)
  } = options

  if (!realBackend) {
    // 모든 API 모킹
    await setupMockServer()
    return
  }

  // 선택적 모킹을 위한 커스텀 핸들러
  const selectiveHandlers = []

  if (mockAuth) {
    const { authHandlers } = await import('./api-handlers')
    selectiveHandlers.push(...authHandlers)
    console.log('[MSW] Authentication mocking enabled')
  }

  if (mockUploads) {
    const apiHandlers = await import('./api-handlers')
    // 업로드 관련 핸들러만 필터링 (feedbackHandlers가 없으면 빈 배열 사용)
    const feedbackHandlers = (apiHandlers as any).feedbackHandlers || []
    const uploadHandlers = feedbackHandlers.filter((handler: any) => handler.toString().includes('upload'))
    selectiveHandlers.push(...uploadHandlers)
    console.log('[MSW] File upload mocking enabled')
  }

  if (selectiveHandlers.length > 0) {
    if (isNode) {
      mockServer = setupServer(...selectiveHandlers)
      mockServer.listen({
        onUnhandledRequest: 'bypass', // 처리되지 않은 요청은 실제 서버로
      })
    } else {
      mockWorker = setupWorker(...selectiveHandlers)
      await mockWorker.start({
        onUnhandledRequest: 'bypass',
      })
    }

    console.log(`[MSW] Selective mocking enabled (${selectiveHandlers.length} handlers)`)
  }
}

/**
 * 네트워크 에러 시뮬레이션
 */
import { http } from 'msw'

export function simulateNetworkError(url: string, errorType: 'timeout' | 'server' | 'network' = 'network') {
  const errorHandler = http.all(url, async ({ request }) => {
    switch (errorType) {
      case 'timeout':
        await new Promise(resolve => setTimeout(resolve, 30000))
        return Response.json({ error: 'Request timeout' }, { status: 408 })
      case 'server':
        return Response.json({ error: 'Internal Server Error' }, { status: 500 })
      case 'network':
        throw new Error('Network connection failed')
      default:
        return Response.json({ error: 'Unknown error' }, { status: 500 })
    }
  })

  addTestHandlers([errorHandler])
  console.log(`[MSW] Network error simulation enabled for ${url} (${errorType})`)
}

/**
 * API 응답 지연 시뮬레이션
 */
export function simulateSlowAPI(url: string, delay: number = 3000) {
  const slowHandler = http.all(url, async ({ request }) => {
    await new Promise(resolve => setTimeout(resolve, delay))
    return Response.json({ message: `Slow response after ${delay}ms` })
  })

  addTestHandlers([slowHandler])
  console.log(`[MSW] Slow API simulation enabled for ${url} (${delay}ms delay)`)
}

/**
 * 테스트 데이터 상태 관리
 */
class MockDataState {
  private static instance: MockDataState
  private state: Map<string, any> = new Map()

  static getInstance(): MockDataState {
    if (!MockDataState.instance) {
      MockDataState.instance = new MockDataState()
    }
    return MockDataState.instance
  }

  setState(key: string, value: any) {
    this.state.set(key, value)
    console.log(`[MSW State] Set ${key}:`, value)
  }

  getState(key: string) {
    return this.state.get(key)
  }

  clearState() {
    this.state.clear()
    console.log('[MSW State] All state cleared')
  }
}

export const mockDataState = MockDataState.getInstance()

/**
 * 자동 환경 설정 (모듈 import 시 자동 실행)
 */
if (isTest || isE2E) {
  // 테스트 환경에서는 자동으로 MSW 설정
  if (isNode) {
    setupMockServer().catch(console.error)
  }
} else if (isDevelopment && !isNode) {
  // 개발 환경 브라우저에서는 선택적 설정
  console.log('[MSW] Development mode - MSW available but not started automatically')
  console.log('[MSW] Call setupMockWorker() to enable API mocking')
}

// 프로세스 종료 시 정리
if (isNode) {
  process.on('exit', cleanupMocks)
  process.on('SIGINT', cleanupMocks)
  process.on('SIGTERM', cleanupMocks)
}
