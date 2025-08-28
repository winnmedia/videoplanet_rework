/**
 * MSW Test Setup Configuration
 * 
 * 모든 테스트에서 사용할 MSW 서버 설정과 유틸리티 함수들을 제공합니다.
 * FSD Shared Layer - Jest와 Cypress에서 공통 사용
 */

import { setupServer } from 'msw/node'
import { setupWorker } from 'msw/browser'
import { HttpResponse, http } from 'msw'

import { 
  navigationSuccessHandlers,
  navigationErrorHandlers,
  navigationDelayHandlers,
  navigationTimeoutHandlers,
  getNavigationHandlers
} from '../mocks/navigation-mocks'

// Jest (Node.js) 환경용 MSW 서버
export const server = setupServer(...navigationSuccessHandlers)

// 브라우저 환경용 MSW 워커 (Cypress에서 사용)
export const worker = setupWorker(...navigationSuccessHandlers)

// Jest 환경 설정
export const setupMSWForJest = () => {
  // 모든 테스트 시작 전 서버 시작
  beforeAll(() => {
    server.listen({
      // 핸들러에 없는 요청에 대해 경고 표시
      onUnhandledRequest: 'warn'
    })
  })

  // 각 테스트 후 핸들러 초기화
  afterEach(() => {
    server.resetHandlers()
  })

  // 모든 테스트 완료 후 서버 종료
  afterAll(() => {
    server.close()
  })
}

// Cypress 환경 설정을 위한 태스크들
export const mswCypressTasks = {
  // MSW 워커 시작
  startMSW: () => {
    return worker.start({
      onUnhandledRequest: 'warn'
    })
  },

  // MSW 워커 중지
  stopMSW: () => {
    return worker.stop()
  },

  // 성공 응답으로 설정
  mockApiSuccess: (config: Record<string, any>) => {
    const handlers = Object.entries(config).map(([endpoint, response]) => {
      return http.get(endpoint, () => HttpResponse.json(response))
    })
    
    server.use(...handlers)
    return null
  },

  // 실패 응답으로 설정
  mockApiFailure: (config: { endpoint: string; statusCode: number; message: string }) => {
    const handler = http.get(config.endpoint, () => {
      return HttpResponse.json(
        { 
          error: 'API Error',
          message: config.message 
        },
        { status: config.statusCode }
      )
    })
    
    server.use(handler)
    return null
  },

  // 지연 응답 설정
  mockApiDelay: (config: { [endpoint: string]: { delay: number } }) => {
    const handlers = Object.entries(config).map(([endpoint, { delay }]) => {
      return http.get(endpoint, async () => {
        await new Promise(resolve => setTimeout(resolve, delay))
        return HttpResponse.json({ message: 'Delayed response' })
      })
    })
    
    server.use(...handlers)
    return null
  },

  // 타임아웃 시뮬레이션
  mockApiTimeout: (config: { endpoint: string; timeout: number }) => {
    const handler = http.get(config.endpoint, async () => {
      await new Promise(resolve => setTimeout(resolve, config.timeout))
      return HttpResponse.json({ message: 'Timeout response' })
    })
    
    server.use(handler)
    return null
  }
}

// 테스트 헬퍼 함수들
export class MSWTestUtils {
  // 핸들러 시나리오 변경
  static switchToScenario(scenario: 'success' | 'error' | 'delay' | 'timeout') {
    const handlers = getNavigationHandlers(scenario)
    server.use(...handlers)
  }

  // 특정 엔드포인트만 모킹 변경
  static mockEndpoint(
    endpoint: string, 
    response: any, 
    options: { status?: number; delay?: number } = {}
  ) {
    const handler = http.get(endpoint, async () => {
      if (options.delay) {
        await new Promise(resolve => setTimeout(resolve, options.delay))
      }
      
      return HttpResponse.json(response, { 
        status: options.status || 200 
      })
    })
    
    server.use(handler)
  }

  // 네트워크 에러 시뮬레이션
  static mockNetworkError(endpoint: string) {
    const handler = http.get(endpoint, () => {
      return HttpResponse.error()
    })
    
    server.use(handler)
  }

  // 순차적 응답 (첫 번째 실패, 두 번째 성공 등)
  static mockSequentialResponses(endpoint: string, responses: Array<{
    response: any
    status?: number
    delay?: number
  }>) {
    let callCount = 0
    
    const handler = http.get(endpoint, async () => {
      const currentResponse = responses[callCount] || responses[responses.length - 1]
      callCount++
      
      if (currentResponse.delay) {
        await new Promise(resolve => setTimeout(resolve, currentResponse.delay))
      }
      
      return HttpResponse.json(currentResponse.response, {
        status: currentResponse.status || 200
      })
    })
    
    server.use(handler)
  }

  // 조건부 응답 (요청 파라미터에 따라)
  static mockConditionalResponse(
    endpoint: string,
    conditions: Array<{
      condition: (request: Request) => boolean
      response: any
      status?: number
    }>
  ) {
    const handler = http.get(endpoint, ({ request }) => {
      const matchingCondition = conditions.find(c => c.condition(request))
      
      if (matchingCondition) {
        return HttpResponse.json(matchingCondition.response, {
          status: matchingCondition.status || 200
        })
      }
      
      // 기본 응답
      return HttpResponse.json({ error: 'No matching condition' }, { status: 400 })
    })
    
    server.use(handler)
  }

  // 핸들러 리셋
  static resetHandlers() {
    server.resetHandlers(...navigationSuccessHandlers)
  }

  // 요청 로깅 (디버깅용)
  static enableRequestLogging() {
    server.use(
      http.all('*', ({ request }) => {
        console.log(`[MSW] ${request.method} ${request.url}`)
        // 실제 요청은 다음 핸들러로 전달
        return
      })
    )
  }
}

// Jest에서 사용할 수 있는 전역 유틸리티 설정
if (typeof global !== 'undefined') {
  // @ts-ignore
  global.MSWTestUtils = MSWTestUtils
}

// TypeScript를 위한 전역 타입 선언
declare global {
  var MSWTestUtils: typeof MSWTestUtils
}

// Jest 환경에서 자동 설정을 원하는 경우 아래 주석 해제
// setupMSWForJest()

export default {
  server,
  worker,
  setupMSWForJest,
  mswCypressTasks,
  MSWTestUtils
}