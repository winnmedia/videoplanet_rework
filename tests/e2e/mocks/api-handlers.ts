/**
 * MSW (Mock Service Worker) API 핸들러 설정
 * 결정론적 E2E 테스트를 위한 API 모킹
 * 
 * @author Grace (QA Lead)
 * @date 2025-09-07
 * @purpose 플래키 테스트 방지, 외부 의존성 격리, 테스트 데이터 일관성
 */

import { http, HttpResponse } from 'msw'

// 🎯 테스트 데이터 생성기 (결정론적)
class MockDataGenerator {
  private static seed = 12345 // 고정 시드로 일관성 보장

  /**
   * 결정론적 UUID 생성 (테스트용)
   */
  static generateId(prefix = ''): string {
    this.seed = (this.seed * 9301 + 49297) % 233280
    const id = Math.abs(this.seed).toString(16).padStart(8, '0')
    return `${prefix}${id}`
  }
}

// 🔐 인증 API 핸들러
const authHandlers = [
  // 로그인
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      success: true,
      user: { id: '1', email: 'test@example.com', name: 'Test User' },
      token: 'mock-jwt-token'
    })
  }),

  // 현재 사용자 정보
  http.get('/api/auth/me', () => {
    return HttpResponse.json({
      success: true,
      user: { id: '1', email: 'test@example.com', name: 'Test User' }
    })
  })
]

// 📊 대시보드 API 핸들러
const dashboardHandlers = [
  http.get('/api/dashboard', () => {
    return HttpResponse.json({
      success: true,
      data: {
        projects: { total: 12, active: 8, completed: 4 },
        recentActivity: [],
        notifications: { unread: 5 }
      }
    })
  })
]

// 📁 프로젝트 API 핸들러
const projectHandlers = [
  http.get('/api/projects', () => {
    return HttpResponse.json({
      success: true,
      data: [],
      pagination: { page: 1, limit: 12, total: 0 }
    })
  })
]

// 🔗 모든 핸들러 통합
export const handlers = [
  ...authHandlers,
  ...dashboardHandlers,
  ...projectHandlers
]

// 핸들러 그룹별 내보내기
export {
  authHandlers,
  dashboardHandlers,
  projectHandlers,
  MockDataGenerator
}

// 테스트 환경별 핸들러 필터링
export const getHandlersForEnvironment = (env: 'development' | 'test' | 'production') => {
  switch (env) {
    case 'test':
      return handlers
    case 'development':
      return handlers
    case 'production':
      return []
    default:
      return handlers
  }
}