/**
 * MSW Browser Setup
 * 클라이언트 사이드에서 MSW 설정
 */

import { setupWorker } from 'msw/browser'

import { handlers, shouldEnableMSW, mswConfig } from './msw-handlers'

let worker: ReturnType<typeof setupWorker> | undefined

export const startMSW = async () => {
  if (!shouldEnableMSW() || typeof window === 'undefined') {
    return
  }

  if (!worker) {
    worker = setupWorker(...handlers)
  }

  try {
    await worker.start({
      onUnhandledRequest: mswConfig.onUnhandledRequest,
      serviceWorker: {
        url: '/mockServiceWorker.js'
      }
    })
    
    console.log('🚀 MSW (Mock Service Worker) 활성화됨')
    console.log('📡 모든 API 요청이 모킹됩니다')
    
    // 개발 환경에서만 전역 객체에 MSW 제어 함수 추가
    if (process.env.NODE_ENV === 'development') {
      ;(window as any).__MSW_WORKER__ = worker
    }
  } catch (error) {
    console.warn('MSW 시작 실패:', error)
  }
}

export const stopMSW = async () => {
  if (worker) {
    await worker.stop()
    console.log('🛑 MSW 중지됨')
  }
}

// 런타임에서 MSW 제어를 위한 유틸리티
export const mswControls = {
  start: startMSW,
  stop: stopMSW,
  restart: async () => {
    await stopMSW()
    await startMSW()
  },
  isRunning: () => Boolean(worker?.listHandlers()?.length)
}