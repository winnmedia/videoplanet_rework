/**
 * Navigation API Mocks - MSW Handlers
 * 
 * 네비게이션 관련 API 호출에 대한 결정론적 모킹을 제공합니다.
 * FSD Shared Layer - MSW 표준 사용
 */

import { http, HttpResponse } from 'msw'

// 타입 정의
interface DashboardStatus {
  projects: {
    total: number
    active: number
    completed: number
  }
  activities: Array<{
    id: string
    title: string
    timestamp: string
    type: 'project_created' | 'feedback_received' | 'task_completed'
  }>
}

interface MenuData {
  items: Array<{
    id: string
    title: string
    path: string
    icon?: string
    hasSubMenu: boolean
    subItems?: Array<{
      id: string
      title: string
      path: string
    }>
  }>
}

// 성공 응답 데이터
export const mockDashboardSuccess: DashboardStatus = {
  projects: {
    total: 5,
    active: 3,
    completed: 2
  },
  activities: [
    {
      id: '1',
      title: '새 프로젝트 "브랜드 영상" 생성됨',
      timestamp: new Date().toISOString(),
      type: 'project_created'
    },
    {
      id: '2', 
      title: '피드백 3건 받음',
      timestamp: new Date(Date.now() - 3600000).toISOString(), // 1시간 전
      type: 'feedback_received'
    }
  ]
}

export const mockMenuData: MenuData = {
  items: [
    {
      id: 'dashboard',
      title: '대시보드',
      path: '/dashboard',
      icon: '📊',
      hasSubMenu: false
    },
    {
      id: 'projects',
      title: '프로젝트',
      path: '/projects', 
      icon: '🎥',
      hasSubMenu: true,
      subItems: [
        { id: 'all-projects', title: '모든 프로젝트', path: '/projects' },
        { id: 'my-projects', title: '내 프로젝트', path: '/projects/my' },
        { id: 'create-project', title: '새 프로젝트', path: '/projects/create' }
      ]
    }
  ]
}

// MSW 핸들러들 - 성공 케이스
export const navigationSuccessHandlers = [
  // 대시보드 상태 조회
  http.get('/api/dashboard/status', () => {
    return HttpResponse.json(mockDashboardSuccess)
  }),

  // 메뉴 데이터 조회
  http.get('/api/menu', () => {
    return HttpResponse.json(mockMenuData)
  }),

  // 프로젝트 목록 조회
  http.get('/api/projects', () => {
    return HttpResponse.json({
      projects: [
        {
          id: '1',
          title: '샘플 프로젝트',
          status: 'shooting',
          progress: 65,
          startDate: new Date().toISOString(),
          priority: 'high',
          teamMembers: 3
        }
      ],
      total: 1
    })
  }),

  // 활동 피드 조회
  http.get('/api/activities', () => {
    return HttpResponse.json({
      activities: mockDashboardSuccess.activities,
      hasMore: false
    })
  })
]

// MSW 핸들러들 - 실패 케이스
export const navigationErrorHandlers = [
  // 대시보드 API 서버 에러
  http.get('/api/dashboard/status', () => {
    return HttpResponse.json(
      { 
        error: 'Internal Server Error',
        message: '대시보드 데이터를 불러올 수 없습니다'
      },
      { status: 500 }
    )
  }),

  // 메뉴 API 네트워크 에러 시뮬레이션
  http.get('/api/menu', () => {
    return HttpResponse.json(
      {
        error: 'Service Unavailable', 
        message: '서비스 일시 중단'
      },
      { status: 503 }
    )
  }),

  // 프로젝트 API 인증 실패
  http.get('/api/projects', () => {
    return HttpResponse.json(
      {
        error: 'Unauthorized',
        message: '인증이 필요합니다'
      },
      { status: 401 }
    )
  })
]

// MSW 핸들러들 - 지연 응답
export const navigationDelayHandlers = [
  // 대시보드 느린 응답 (2초 지연)
  http.get('/api/dashboard/status', async () => {
    await new Promise(resolve => setTimeout(resolve, 2000))
    return HttpResponse.json(mockDashboardSuccess)
  }),

  // 메뉴 매우 느린 응답 (5초 지연)
  http.get('/api/menu', async () => {
    await new Promise(resolve => setTimeout(resolve, 5000))
    return HttpResponse.json(mockMenuData)
  })
]

// MSW 핸들러들 - 타임아웃 시뮬레이션
export const navigationTimeoutHandlers = [
  // 무응답 상태 (30초 대기 후 타임아웃)
  http.get('/api/dashboard/status', async () => {
    await new Promise(resolve => setTimeout(resolve, 30000))
    return HttpResponse.json(mockDashboardSuccess)
  }),

  http.get('/api/projects', async () => {
    await new Promise(resolve => setTimeout(resolve, 30000))
    return HttpResponse.json({ projects: [], total: 0 })
  })
]

// 페이지네이션 테스트용 핸들러
export const navigationPaginationHandlers = [
  http.get('/api/projects', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page')) || 1
    const limit = Number(url.searchParams.get('limit')) || 10
    
    // 페이지별 다른 데이터 반환
    const projects = Array.from({ length: limit }, (_, i) => ({
      id: `${(page - 1) * limit + i + 1}`,
      title: `프로젝트 ${(page - 1) * limit + i + 1}`,
      status: 'active',
      progress: Math.floor(Math.random() * 100),
      startDate: new Date().toISOString(),
      priority: 'medium',
      teamMembers: Math.floor(Math.random() * 5) + 1
    }))
    
    return HttpResponse.json({
      projects,
      total: 50, // 전체 프로젝트 수
      page,
      hasMore: page * limit < 50
    })
  })
]

// 검색 기능 테스트용 핸들러
export const navigationSearchHandlers = [
  http.get('/api/projects/search', ({ request }) => {
    const url = new URL(request.url)
    const query = url.searchParams.get('q') || ''
    
    if (query === 'empty') {
      return HttpResponse.json({
        projects: [],
        total: 0,
        query
      })
    }
    
    if (query === 'error') {
      return HttpResponse.json(
        { error: 'Search service unavailable' },
        { status: 503 }
      )
    }
    
    // 검색 결과 모킹
    const projects = [
      {
        id: '1',
        title: `${query} 관련 프로젝트`,
        status: 'active',
        progress: 75,
        startDate: new Date().toISOString(),
        priority: 'high',
        teamMembers: 2
      }
    ]
    
    return HttpResponse.json({
      projects,
      total: 1,
      query
    })
  })
]

// 실제 테스트에서 사용할 통합 핸들러 세트들
export const getNavigationHandlers = (scenario: 'success' | 'error' | 'delay' | 'timeout' = 'success') => {
  switch (scenario) {
    case 'error':
      return navigationErrorHandlers
    case 'delay':
      return navigationDelayHandlers
    case 'timeout':
      return navigationTimeoutHandlers
    default:
      return navigationSuccessHandlers
  }
}

// 동적 핸들러 변경을 위한 헬퍼 함수들
export const createDynamicHandler = (
  endpoint: string,
  response: any,
  options: { status?: number; delay?: number } = {}
) => {
  return http.get(endpoint, async () => {
    if (options.delay) {
      await new Promise(resolve => setTimeout(resolve, options.delay))
    }
    
    return HttpResponse.json(response, { 
      status: options.status || 200 
    })
  })
}

// 테스트 중 핸들러 상태 초기화
export const resetNavigationHandlers = () => {
  // MSW 서버 인스턴스에서 핸들러 리셋
  // 이 함수는 각 테스트의 beforeEach에서 호출
  return navigationSuccessHandlers
}