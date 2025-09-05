/**
 * MSW Request Handlers - Modularized for 5 Core Modules
 * VRidge 병렬 개발을 위한 모듈별 전문화된 API 모킹
 */

import { http, HttpResponse, delay } from 'msw'

import { authHandlers } from './modules/auth.handlers'
import { calendarHandlers } from './modules/calendar.handlers'
import { dashboardHandlers } from './modules/dashboard.handlers'
import { emailVerificationHandlers } from './modules/email-verification.handlers'
import { externalHandlers } from './modules/external.handlers'
import { projectHandlers } from './modules/project.handlers'
import { videoFeedbackHandlers } from './modules/video-feedback.handlers'
import { videoPlanningHandlers } from './modules/video-planning.handlers'
import { collaborationHandlers } from '@/shared/lib/collaboration/__tests__/collaboration-handlers'

// Base API URL - adjust this based on your actual API
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

/**
 * 통합된 핸들러 배열 - 모든 모듈의 핸들러 결합
 */
export const handlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...calendarHandlers,
  ...emailVerificationHandlers,
  ...projectHandlers,
  ...videoPlanningHandlers,
  ...videoFeedbackHandlers,
  ...externalHandlers,
  ...collaborationHandlers,
  
  // Catch-all handler for unhandled requests (optional)
  http.get('*', ({ request }) => {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) {
      console.warn(`Unhandled API request: ${request.method} ${url.pathname}`)
      return HttpResponse.json(
        { 
          error: 'Not Found',
          message: `API endpoint ${url.pathname} not found`,
          timestamp: new Date().toISOString()
        }, 
        { status: 404 }
      )
    }
    // Non-API requests pass through
    return undefined
  }),
]

/**
 * 에러 시나리오 테스트용 핸들러
 */
export const errorHandlers = [
  // 인증 실패 시나리오
  http.post(`${API_BASE_URL}/auth/login`, async () => {
    await delay(100)
    return HttpResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    )
  }),
  
  // 서버 에러 시나리오
  http.get(`${API_BASE_URL}/dashboard/feed`, async () => {
    await delay(500)
    return HttpResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }),
  
  // 네트워크 타임아웃 시나리오
  http.get(`${API_BASE_URL}/calendar/schedules`, async () => {
    await delay(10000) // 10초 지연으로 타임아웃 시뮬레이션
    return HttpResponse.json(null)
  }),
]

/**
 * 모듈별 핸들러 개별 내보내기 (테스트에서 선택적 사용)
 */
export {
  authHandlers,
  dashboardHandlers,
  calendarHandlers,
  emailVerificationHandlers,
  projectHandlers,
  videoPlanningHandlers,
  videoFeedbackHandlers,
  externalHandlers,
  collaborationHandlers
}