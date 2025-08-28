/**
 * MSW (Mock Service Worker) Handlers
 * Railway 백엔드 API 안정성을 위한 개발 환경 모킹 시스템
 */

import { http, HttpResponse } from 'msw'
import type {
  SubMenuItemType,
  ProjectType,
  FeedbackType,
  MenuItemType
} from '@/shared/api/schemas'

// 모킹 데이터
const MOCK_SUBMENU_DATA: Record<string, SubMenuItemType[]> = {
  projects: [
    {
      id: 'proj-001',
      name: '웹사이트 리뉴얼 프로젝트',
      path: '/projects/proj-001',
      status: 'active',
      badge: 3,
      lastModified: new Date('2025-08-25T10:30:00Z').toISOString(),
      description: '회사 웹사이트 전체 리뉴얼 작업',
      priority: 'high'
    },
    {
      id: 'proj-002',
      name: '모바일 앱 개발',
      path: '/projects/proj-002',
      status: 'active',
      badge: 1,
      lastModified: new Date('2025-08-20T15:45:00Z').toISOString(),
      description: 'iOS/Android 앱 신규 개발',
      priority: 'medium'
    },
    {
      id: 'proj-003',
      name: 'UI/UX 디자인 시스템',
      path: '/projects/proj-003',
      status: 'active',
      badge: 5,
      lastModified: new Date('2025-08-26T14:15:00Z').toISOString(),
      description: '전사 디자인 시스템 구축',
      priority: 'high'
    }
  ],
  feedback: [
    {
      id: 'fb-001',
      name: '웹사이트 로딩 속도 개선',
      path: '/feedback/fb-001',
      status: 'active',
      badge: 2,
      lastModified: new Date('2025-08-27T16:20:00Z').toISOString(),
      description: 'UI/UX 개선 사항 피드백',
      priority: 'high'
    },
    {
      id: 'fb-002',
      name: '모바일 반응형 버그',
      path: '/feedback/fb-002',
      status: 'pending',
      badge: 4,
      lastModified: new Date('2025-08-25T13:45:00Z').toISOString(),
      description: '앱 사용성 개선 요청',
      priority: 'medium'
    }
  ],
  planning: [
    {
      id: 'plan-001',
      name: '컨셉 기획',
      path: '/planning/concept',
      status: 'active',
      badge: 2,
      lastModified: new Date('2025-08-27T08:30:00Z').toISOString(),
      description: '프로젝트 초기 컨셉 설계',
      priority: 'high'
    },
    {
      id: 'plan-002',
      name: '대본 작성',
      path: '/planning/script',
      status: 'pending',
      lastModified: new Date('2025-08-25T12:15:00Z').toISOString(),
      description: '영상 시나리오 작성 중',
      priority: 'medium'
    }
  ]
}

const MOCK_PROJECTS_DATA: ProjectType[] = [
  {
    id: 'proj-001',
    name: '웹사이트 리뉴얼 프로젝트',
    description: '회사 웹사이트 전체 리뉴얼 및 성능 최적화 작업',
    status: 'in-progress',
    createdAt: new Date('2025-08-01T10:00:00Z').toISOString(),
    updatedAt: new Date('2025-08-25T10:30:00Z').toISOString(),
    startDate: new Date('2025-08-01T09:00:00Z').toISOString(),
    endDate: new Date('2025-09-30T18:00:00Z').toISOString(),
    ownerId: 'user-001',
    tags: ['web', 'frontend', 'ux'],
    priority: 'high',
    progress: 65
  },
  {
    id: 'proj-002',
    name: '모바일 앱 개발',
    description: 'iOS/Android 네이티브 앱 신규 개발',
    status: 'planning',
    createdAt: new Date('2025-08-10T14:30:00Z').toISOString(),
    updatedAt: new Date('2025-08-20T15:45:00Z').toISOString(),
    startDate: new Date('2025-09-01T09:00:00Z').toISOString(),
    endDate: new Date('2025-12-31T18:00:00Z').toISOString(),
    ownerId: 'user-002',
    tags: ['mobile', 'ios', 'android'],
    priority: 'medium',
    progress: 20
  }
]

const MOCK_FEEDBACK_DATA: FeedbackType[] = [
  {
    id: 'fb-001',
    title: '웹사이트 로딩 속도 개선 요청',
    content: '메인 페이지 로딩 시간이 너무 길어 사용자 경험에 문제가 있습니다.',
    type: 'improvement',
    status: 'open',
    projectId: 'proj-001',
    authorId: 'user-001',
    assigneeId: 'user-005',
    createdAt: new Date('2025-08-27T09:15:00Z').toISOString(),
    updatedAt: new Date('2025-08-27T16:20:00Z').toISOString(),
    tags: ['performance', 'frontend', 'ux'],
    priority: 'high',
    attachments: []
  },
  {
    id: 'fb-002',
    title: '모바일 반응형 레이아웃 버그',
    content: '모바일 화면에서 네비게이션 메뉴가 제대로 표시되지 않는 문제가 있습니다.',
    type: 'bug',
    status: 'in-review',
    projectId: 'proj-001',
    authorId: 'user-002',
    assigneeId: 'user-003',
    createdAt: new Date('2025-08-25T14:30:00Z').toISOString(),
    updatedAt: new Date('2025-08-25T13:45:00Z').toISOString(),
    tags: ['mobile', 'responsive', 'bug'],
    priority: 'medium',
    attachments: []
  }
]

const MOCK_MENU_DATA: MenuItemType[] = [
  { id: 'dashboard', name: '대시보드', path: '/dashboard', icon: 'home', hasSubMenu: false },
  { id: 'projects', name: '프로젝트', path: '/projects', icon: 'projects', hasSubMenu: true },
  { id: 'feedback', name: '피드백', path: '/feedback', icon: 'feedback', hasSubMenu: true },
  { id: 'planning', name: '기획', path: '/planning', icon: 'planning', hasSubMenu: true },
  { id: 'calendar', name: '캘린더', path: '/calendar', icon: 'calendar', hasSubMenu: false }
]

// 응답 지연 시뮬레이션 (개발 환경 리얼리즘)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// MSW 핸들러 정의
export const handlers = [
  // 서브메뉴 API
  http.get('*/api/menu/submenu', async ({ request }) => {
    await delay(300) // 실제 네트워크 지연 시뮬레이션
    
    const url = new URL(request.url)
    const type = url.searchParams.get('type') as string
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    
    const items = MOCK_SUBMENU_DATA[type] || []
    const total = items.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedItems = items.slice(startIndex, endIndex)
    
    return HttpResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: `${type} 서브메뉴 조회 성공`,
      data: {
        items: paginatedItems,
        pagination: {
          page,
          limit,
          total,
          hasMore: endIndex < total
        }
      }
    })
  }),

  // 프로젝트 API
  http.get('*/api/projects', async ({ request }) => {
    await delay(200)
    
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const status = url.searchParams.get('status')
    const search = url.searchParams.get('search')
    
    let filteredProjects = [...MOCK_PROJECTS_DATA]
    
    if (status) {
      filteredProjects = filteredProjects.filter(p => p.status === status)
    }
    
    if (search) {
      const searchTerm = search.toLowerCase()
      filteredProjects = filteredProjects.filter(p => 
        p.name.toLowerCase().includes(searchTerm) ||
        p.description?.toLowerCase().includes(searchTerm)
      )
    }
    
    const total = filteredProjects.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedProjects = filteredProjects.slice(startIndex, endIndex)
    
    return HttpResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: '프로젝트 목록 조회 성공',
      data: {
        items: paginatedProjects,
        pagination: {
          page,
          limit,
          total,
          hasMore: endIndex < total
        }
      }
    })
  }),

  // 피드백 API
  http.get('*/api/feedback', async ({ request }) => {
    await delay(250)
    
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const status = url.searchParams.get('status')
    const type = url.searchParams.get('type')
    
    let filteredFeedback = [...MOCK_FEEDBACK_DATA]
    
    if (status) {
      filteredFeedback = filteredFeedback.filter(f => f.status === status)
    }
    
    if (type) {
      filteredFeedback = filteredFeedback.filter(f => f.type === type)
    }
    
    const total = filteredFeedback.length
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedFeedback = filteredFeedback.slice(startIndex, endIndex)
    
    return HttpResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: '피드백 목록 조회 성공',
      data: {
        items: paginatedFeedback,
        pagination: {
          page,
          limit,
          total,
          hasMore: endIndex < total
        }
      }
    })
  }),

  // 메뉴 아이템 API
  http.get('*/api/menu/items', async () => {
    await delay(150)
    
    return HttpResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: '메뉴 아이템 조회 성공',
      data: {
        items: MOCK_MENU_DATA
      }
    })
  }),

  // 인증 API
  http.post('*/users/login', async ({ request }) => {
    await delay(400)
    
    const body = await request.json() as { email: string; password: string }
    
    // 간단한 인증 시뮬레이션
    if (body.email === 'test@example.com' && body.password === 'password') {
      return HttpResponse.json({
        user: body.email,
        vridge_session: 'mock_session_token_12345',
        message: '로그인 성공'
      })
    }
    
    return HttpResponse.json(
      {
        error: '로그인 실패',
        message: '이메일 또는 비밀번호가 올바르지 않습니다.'
      },
      { status: 401 }
    )
  }),

  // 회원가입 API
  http.post('*/users/signup', async ({ request }) => {
    await delay(500)
    
    const body = await request.json() as { email: string; nickname: string; password: string }
    
    return HttpResponse.json({
      user: body.email,
      vridge_session: 'mock_session_token_67890',
      message: '회원가입 성공'
    }, { status: 201 })
  }),

  // Railway 헬스체크
  http.get('https://api.vlanet.net/health/', async () => {
    return HttpResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    })
  }),

  // 대시보드 통계 API
  http.get('*/api/dashboard/stats', async ({ request }) => {
    await delay(150)
    
    const url = new URL(request.url)
    const scenario = url.searchParams.get('scenario') // 'empty', 'partial', 'full'
    
    let statsData = MOCK_DASHBOARD_STATS
    let recentActivity = MOCK_RECENT_ACTIVITY
    let upcomingDeadlines = MOCK_UPCOMING_DEADLINES
    let recentProjects = MOCK_PROJECTS_DATA.slice(0, 3)
    
    // 시나리오별 데이터 조정
    if (scenario === 'empty') {
      statsData = EMPTY_DASHBOARD_DATA
      recentActivity = []
      upcomingDeadlines = []
      recentProjects = []
    } else if (scenario === 'partial') {
      statsData = PARTIAL_DASHBOARD_DATA  
      recentActivity = MOCK_RECENT_ACTIVITY.slice(0, 1)
      upcomingDeadlines = MOCK_UPCOMING_DEADLINES.slice(0, 1)
      recentProjects = MOCK_PROJECTS_DATA.slice(0, 1)
    }
    
    return HttpResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: '대시보드 데이터 조회 성공',
      data: {
        stats: statsData,
        recentProjects,
        recentActivity,
        upcomingDeadlines
      }
    })
  }),

  // 대시보드 알림/피드백 요약 API
  http.get('*/api/dashboard/notifications', async () => {
    await delay(100)
    
    return HttpResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      message: '알림 요약 조회 성공',
      data: {
        unreadCount: 7,
        feedbackSummary: {
          totalFeedback: 12,
          unresolved: 5,
          highPriority: 2
        },
        invitationSummary: {
          pending: 3,
          accepted: 8,
          declined: 1
        }
      }
    })
  }),

  // Railway API 폴백 핸들러 (실제 API 실패 시)
  http.all('https://api.vlanet.net/*', async () => {
    await delay(100)
    
    return HttpResponse.json({
      error: 'API_UNAVAILABLE',
      message: 'Railway 백엔드 서비스가 일시적으로 사용할 수 없습니다. 모킹된 데이터를 사용합니다.',
      fallback: true
    }, { status: 503 })
  })
]

// 대시보드 통계 API 추가
const MOCK_DASHBOARD_STATS = {
  totalProjects: 12,
  activeProjects: 8,
  completedProjects: 4,
  totalTeamMembers: 15,
  totalTasks: 156,
  completedTasks: 89,
  overdueTasks: 5,
  upcomingDeadlines: 3
}

const MOCK_RECENT_ACTIVITY = [
  {
    id: 'act-001',
    type: 'project_created',
    message: '새 프로젝트 "웹사이트 리뉴얼"이 생성되었습니다',
    timestamp: new Date('2025-08-28T10:30:00Z').toISOString(),
    userId: 'user-001',
    projectId: 'proj-001'
  },
  {
    id: 'act-002', 
    type: 'task_completed',
    message: '디자인 시안 1차 검토가 완료되었습니다',
    timestamp: new Date('2025-08-28T09:15:00Z').toISOString(),
    userId: 'user-002',
    projectId: 'proj-003'
  },
  {
    id: 'act-003',
    type: 'feedback_received',
    message: '모바일 UI에 대한 피드백이 등록되었습니다',
    timestamp: new Date('2025-08-27T16:45:00Z').toISOString(), 
    userId: 'user-003',
    feedbackId: 'fb-002'
  }
]

const MOCK_UPCOMING_DEADLINES = [
  {
    id: 'deadline-001',
    title: 'UI 디자인 최종 승인',
    projectId: 'proj-001',
    projectName: '웹사이트 리뉴얼 프로젝트',
    dueDate: new Date('2025-08-30T18:00:00Z').toISOString(),
    priority: 'high',
    daysRemaining: 2
  },
  {
    id: 'deadline-002', 
    title: '개발 환경 구축',
    projectId: 'proj-002',
    projectName: '모바일 앱 개발',
    dueDate: new Date('2025-09-01T17:00:00Z').toISOString(),
    priority: 'medium', 
    daysRemaining: 4
  }
]

// Empty state 시나리오 데이터
const EMPTY_DASHBOARD_DATA = {
  totalProjects: 0,
  activeProjects: 0,
  completedProjects: 0,
  totalTeamMembers: 1,
  totalTasks: 0,
  completedTasks: 0,
  overdueTasks: 0,
  upcomingDeadlines: 0
}

const PARTIAL_DASHBOARD_DATA = {
  totalProjects: 1,
  activeProjects: 1,
  completedProjects: 0,
  totalTeamMembers: 2,
  totalTasks: 3,
  completedTasks: 0,
  overdueTasks: 1,
  upcomingDeadlines: 1
}

// 에러 시뮬레이션을 위한 확장 핸들러
export const errorHandlers = [
  // 네트워크 에러 시뮬레이션
  http.get('*/api/menu/submenu', () => {
    return HttpResponse.error()
  }),
  
  // 서버 에러 시뮬레이션
  http.get('*/api/projects', () => {
    return HttpResponse.json({
      error: 'INTERNAL_SERVER_ERROR',
      message: '서버 내부 오류가 발생했습니다.'
    }, { status: 500 })
  }),
  
  // 인증 에러 시뮬레이션
  http.post('*/users/login', () => {
    return HttpResponse.json({
      error: 'UNAUTHORIZED',
      message: '인증에 실패했습니다.'
    }, { status: 401 })
  }),

  // 대시보드 API 에러 시나리오
  http.get('*/api/dashboard/stats', () => {
    return HttpResponse.json({
      error: 'DASHBOARD_LOAD_FAILED',
      message: '대시보드 데이터를 불러올 수 없습니다.'
    }, { status: 500 })
  }),
  
  // 대시보드 타임아웃 시뮬레이션
  http.get('*/api/dashboard/notifications', async () => {
    await delay(30000) // 30초 지연
    return HttpResponse.error()
  })
]

// 개발 환경에서 MSW 활성화 여부 확인
export const shouldEnableMSW = () => {
  return process.env.NODE_ENV === 'development' && 
         process.env.NEXT_PUBLIC_ENABLE_MSW !== 'false'
}

// MSW 설정 유틸리티
export const mswConfig = {
  onUnhandledRequest: 'warn' as const,
  delayApiCalls: true,
  enableErrorSimulation: false
}