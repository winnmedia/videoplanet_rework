/**
 * 브라우저용 MSW 설정
 * 개발 환경과 Cypress E2E 테스트에서 사용
 */

import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

// 개발 환경에서 자동 시작
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  worker.start({
    onUnhandledRequest: 'warn',
    serviceWorker: {
      url: '/mockServiceWorker.js'
    }
  })
}