/**
 * @file Integration Test MSW Handlers
 * @description 통합 상태 관리 시스템용 MSW 핸들러
 */

import { http, HttpResponse } from 'msw'
import { 
  type User,
  type Project,
  type VideoFeedback,
  type CalendarEvent
} from '@/shared/types/store'

// ============================================================================
// 테스트용 모의 데이터
// ============================================================================

const generateId = (prefix: string = 'id') => 
  `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

const mockUsers: User[] = [
  {
    id: 'user_test_1',
    email: 'admin@vlanet.com',
    name: 'Admin User',
    createdAt: '2024-01-01T00:00:00Z'
  },
  {
    id: 'user_test_2', 
    email: 'test@example.com',
    name: 'Test User',
    createdAt: '2024-01-02T00:00:00Z'
  }
]

const mockProjects: Project[] = [
  {
    id: 'proj_test_1',
    name: 'Test Video Project',
    description: 'A test project for integration tests',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z'
  }
]

const mockFeedbacks: VideoFeedback[] = [
  {
    id: 'feedback_test_1',
    projectId: 'proj_test_1',
    videoUrl: 'https://example.com/test-video.mp4',
    feedback: 'Test feedback message',
    rating: 4,
    createdAt: '2024-01-03T00:00:00Z',
    createdBy: 'user_test_1',
    status: 'pending'
  }
]

const mockEvents: CalendarEvent[] = [
  {
    id: 'event_test_1',
    title: 'Test Meeting',
    description: 'Integration test meeting',
    startDate: '2024-01-08T09:00:00Z',
    endDate: '2024-01-08T10:00:00Z',
    projectId: 'proj_test_1',
    attendees: ['user_test_1', 'user_test_2'],
    type: 'meeting'
  }
]

// ============================================================================
// 통합 테스트용 핸들러
// ============================================================================

export const integrationHandlers = [
  // 인증 API
  http.post('/api/v1/auth/login', async ({ request }) => {
    const body = await request.json() as any
    const { email } = body
    
    // 로그인 실패 시뮬레이션
    if (email === 'fail@test.com') {
      return new HttpResponse(
        JSON.stringify({
          success: false,
          error: 'Invalid credentials'
        }),
        { status: 401 }
      )
    }
    
    // 계정 잠금 시뮬레이션
    if (email === 'locked@test.com') {
      return new HttpResponse(
        JSON.stringify({
          success: false,
          error: 'Account locked'
        }),
        { status: 423 }
      )
    }
    
    const user = mockUsers.find(u => u.email === email) || mockUsers[1]
    
    // 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return HttpResponse.json({
      success: true,
      data: {
        user,
        tokens: {
          accessToken: `access_token_${user.id}`,
          refreshToken: `refresh_token_${user.id}`
        }
      }
    })
  }),

  http.post('/api/v1/auth/register', async ({ request }) => {
    const body = await request.json() as any
    
    // 이메일 중복 시뮬레이션
    if (mockUsers.some(u => u.email === body.email)) {
      return new HttpResponse(
        JSON.stringify({
          success: false,
          error: 'Email already exists'
        }),
        { status: 409 }
      )
    }
    
    const newUser: User = {
      id: generateId('user_test'),
      email: body.email,
      name: body.name,
      createdAt: new Date().toISOString()
    }
    
    mockUsers.push(newUser)
    
    return HttpResponse.json({
      success: true,
      data: { user: newUser }
    })
  }),

  http.get('/api/v1/auth/profile', ({ request }) => {
    const authHeader = request.headers.get('Authorization')
    
    if (!authHeader || !authHeader.startsWith('Bearer access_token_')) {
      return new HttpResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401 }
      )
    }
    
    const user = mockUsers[1]
    
    return HttpResponse.json({
      success: true,
      data: user
    })
  }),

  // 프로젝트 API
  http.get('/api/v1/projects', ({ request }) => {
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10')
    
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    const paginatedProjects = mockProjects.slice(startIndex, endIndex)
    
    return HttpResponse.json({
      success: true,
      data: paginatedProjects,
      pagination: {
        page,
        pageSize,
        total: mockProjects.length,
        hasNext: endIndex < mockProjects.length,
        hasPrev: page > 1
      }
    })
  }),

  http.post('/api/v1/projects', async ({ request }) => {
    const body = await request.json() as any
    
    // 낙관적 업데이트 실패 시뮬레이션
    if (body.name === 'FAIL_TEST') {
      await new Promise(resolve => setTimeout(resolve, 200))
      return new HttpResponse(
        JSON.stringify({
          success: false,
          error: 'Server error'
        }),
        { status: 500 }
      )
    }
    
    const newProject: Project = {
      id: generateId('proj_test'),
      createdAt: new Date().toISOString(),
      status: 'draft',
      ...body
    }
    
    mockProjects.push(newProject)
    
    // 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 300))
    
    return HttpResponse.json({
      success: true,
      data: newProject
    })
  }),

  http.patch('/api/v1/projects/:id', async ({ params, request }) => {
    const { id } = params
    const body = await request.json() as any
    
    const projectIndex = mockProjects.findIndex(p => p.id === id)
    
    if (projectIndex === -1) {
      return new HttpResponse(
        JSON.stringify({ error: 'Project not found' }),
        { status: 404 }
      )
    }
    
    const updatedProject = {
      ...mockProjects[projectIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }
    
    mockProjects[projectIndex] = updatedProject
    
    return HttpResponse.json({
      success: true,
      data: updatedProject
    })
  }),

  // 비디오 피드백 API
  http.get('/api/v1/feedback', ({ request }) => {
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    
    let filteredFeedbacks = mockFeedbacks
    
    if (projectId) {
      filteredFeedbacks = mockFeedbacks.filter(f => f.projectId === projectId)
    }
    
    return HttpResponse.json({
      success: true,
      data: filteredFeedbacks
    })
  }),

  http.post('/api/v1/feedback', async ({ request }) => {
    const body = await request.json() as any
    
    const newFeedback: VideoFeedback = {
      id: generateId('feedback_test'),
      createdAt: new Date().toISOString(),
      status: 'pending',
      ...body
    }
    
    mockFeedbacks.push(newFeedback)
    
    return HttpResponse.json({
      success: true,
      data: newFeedback
    })
  }),

  // 캘린더 API
  http.get('/api/v1/calendar/events', () => {
    return HttpResponse.json({
      success: true,
      data: mockEvents
    })
  }),

  http.post('/api/v1/calendar/events', async ({ request }) => {
    const body = await request.json() as any
    
    const newEvent: CalendarEvent = {
      id: generateId('event_test'),
      ...body
    }
    
    mockEvents.push(newEvent)
    
    return HttpResponse.json({
      success: true,
      data: newEvent
    })
  }),

  // 헬스 체크
  http.get('/api/v1/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'healthy',
        redis: 'healthy',
        api: 'healthy'
      }
    })
  }),

  // 에러 시뮬레이션
  http.get('/api/v1/test/network-error', () => {
    return HttpResponse.error()
  }),

  http.get('/api/v1/test/server-error', () => {
    return new HttpResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500 }
    )
  }),

  // 느린 응답 시뮬레이션 (성능 테스트용)
  http.get('/api/v1/test/slow-response', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    return HttpResponse.json({
      success: true,
      data: { message: 'Slow response completed' }
    })
  })
]

// ============================================================================
// 테스트 유틸리티
// ============================================================================

/**
 * 모의 데이터 상태 관리
 */
export const testDataManager = {
  /**
   * 모든 데이터 초기화
   */
  reset: () => {
    mockUsers.length = 2 // 기본 사용자 2명 유지
    mockProjects.length = 1 // 기본 프로젝트 1개 유지
    mockFeedbacks.length = 1 // 기본 피드백 1개 유지
    mockEvents.length = 1 // 기본 이벤트 1개 유지
  },

  /**
   * 대량 데이터 생성 (성능 테스트용)
   */
  generateBulkData: (count: number) => {
    for (let i = 0; i < count; i++) {
      mockProjects.push({
        id: generateId('bulk_proj'),
        name: `Bulk Project ${i + 1}`,
        description: `Generated project ${i + 1}`,
        status: 'active',
        createdAt: new Date().toISOString()
      })
    }
    console.log(`Generated ${count} bulk projects for testing`)
  },

  /**
   * 현재 데이터 상태 조회
   */
  getState: () => ({
    users: mockUsers.length,
    projects: mockProjects.length,
    feedbacks: mockFeedbacks.length,
    events: mockEvents.length
  }),

  /**
   * 특정 시나리오 설정
   */
  setupScenario: (scenario: 'empty' | 'bulk' | 'errors') => {
    testDataManager.reset()
    
    switch (scenario) {
      case 'empty':
        mockUsers.length = 0
        mockProjects.length = 0
        mockFeedbacks.length = 0
        mockEvents.length = 0
        break
        
      case 'bulk':
        testDataManager.generateBulkData(50)
        break
        
      case 'errors':
        // 에러 유발할 특수 데이터 추가
        mockProjects.push({
          id: 'error_project',
          name: 'FAIL_TEST',
          description: 'This will cause server error',
          status: 'active',
          createdAt: new Date().toISOString()
        })
        break
    }
  }
}

// ============================================================================
// 개발 도구
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  ;(window as any).__VLANET_TEST_DATA__ = testDataManager
}

export default integrationHandlers