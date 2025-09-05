/**
 * MSW Server Setup
 * 서버 사이드에서 MSW 설정 (테스트 및 SSR용)
 */

import { setupServer } from 'msw/node'

import { handlers, shouldEnableMSW, mswConfig } from './msw-handlers'

let server: ReturnType<typeof setupServer> | undefined

export const startMSWServer = () => {
  if (!shouldEnableMSW()) {
    return
  }

  if (!server) {
    server = setupServer(...handlers)
  }

  try {
    server.listen({
      onUnhandledRequest: mswConfig.onUnhandledRequest
    })
    
    console.log('🚀 MSW Server 활성화됨 (Node.js 환경)')
  } catch (error) {
    console.warn('MSW Server 시작 실패:', error)
  }
}

export const stopMSWServer = () => {
  if (server) {
    server.close()
    console.log('🛑 MSW Server 중지됨')
  }
}

export const resetMSWServer = () => {
  if (server) {
    server.resetHandlers()
  }
}

// 서버 환경에서 MSW 자동 시작
if (typeof window === 'undefined' && shouldEnableMSW()) {
  startMSWServer()
}

export { server }