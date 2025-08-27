/**
 * 영상 기획 모듈 MSW 핸들러
 */

import { http, HttpResponse, delay } from 'msw'

import { API_BASE_URL } from '../handlers'

// Mock 데이터 - API와 일치하도록 구성
const mockTeamMembers = [
  {
    id: 'user-director-001',
    name: '김감독',
    role: 'director',
    email: 'director@vlanet.co.kr',
    avatar: '/avatars/director-001.jpg',
    permissions: { canEdit: true, canComment: true, canApprove: true, canAssign: true },
    isOnline: true,
    lastSeen: '2025-08-26T14:00:00Z'
  },
  {
    id: 'user-writer-001',
    name: '김작가',
    role: 'writer',
    email: 'writer@vlanet.co.kr',
    avatar: '/avatars/writer-001.jpg',
    permissions: { canEdit: true, canComment: true, canApprove: false, canAssign: false },
    isOnline: true,
    lastSeen: '2025-08-26T13:45:00Z'
  }
]

const mockScriptSections = [
  {
    id: 'script-001',
    title: '브랜드 소개 장면',
    order: 1,
    type: 'scene',
    content: '화면에 브랜드 로고가 나타나며, 경쾌한 음악과 함께 제품 소개가 시작됩니다.',
    duration: 15,
    notes: '밝고 활기찬 느낌으로 연출',
    characterCount: 35,
    estimatedReadingTime: 8
  }
]

const mockShots = [
  {
    id: 'shot-001',
    shotNumber: '001',
    title: '브랜드 로고 클로즈업',
    description: '제품 위의 브랜드 로고를 클로즈업으로 촬영',
    shotType: 'close_up',
    angle: 'eye_level',
    movement: 'static',
    location: '스튜디오 A',
    duration: 10,
    equipment: ['Sony FX3', '50mm 렌즈', '조명 키트'],
    lighting: '키 라이트 + 필 라이트',
    props: ['제품 샘플', '화이트 배경'],
    cast: [],
    notes: '로고가 선명하게 보이도록 주의',
    priority: 'high',
    status: 'todo',
    estimatedSetupTime: 30,
    scriptSectionId: 'script-001'
  }
]

const mockPlanningCards = [
  {
    id: 'card-001',
    title: '컨셉 기획 완료',
    description: '클라이언트와 논의한 브랜드 컨셉을 기반으로 방향성 설정',
    stage: 'concept',
    type: 'milestone',
    status: 'completed',
    priority: 'high',
    assignedTo: mockTeamMembers[0],
    dueDate: '2025-08-30T18:00:00Z',
    tags: ['브랜딩', '컨셉'],
    createdBy: 'user-director-001',
    createdAt: '2025-08-20T09:00:00Z',
    updatedAt: '2025-08-25T15:30:00Z',
    completedAt: '2025-08-25T15:30:00Z'
  }
]

const mockProject = {
  id: 'project-001',
  title: 'VLANET 브랜드 홍보 영상',
  description: 'VLANET 서비스 소개 및 브랜드 이미지 구축을 위한 홍보 영상',
  type: 'brand_video',
  currentStage: 'script',
  status: 'active',
  priority: 'high',
  client: {
    id: 'client-001',
    name: 'VLANET',
    company: 'VLANET Corporation',
    email: 'client@vlanet.co.kr'
  },
  startDate: '2025-08-20T09:00:00Z',
  endDate: '2025-09-15T18:00:00Z',
  shootingDate: '2025-09-02T09:00:00Z',
  deliveryDate: '2025-09-12T18:00:00Z',
  budget: {
    total: 5000000,
    currency: 'KRW',
    breakdown: {
      preProduction: 1000000,
      production: 2500000,
      postProduction: 1200000,
      miscellaneous: 300000
    },
    spent: 750000,
    remaining: 4250000
  },
  teamMembers: mockTeamMembers,
  projectManager: 'user-director-001',
  script: {
    sections: mockScriptSections,
    totalDuration: 120,
    wordCount: 297,
    lastModified: '2025-08-26T14:00:00Z',
    version: 'v1.2'
  },
  shots: mockShots,
  planningCards: mockPlanningCards,
  comments: [],
  versions: [],
  createdBy: 'user-director-001',
  createdAt: '2025-08-20T09:00:00Z',
  updatedAt: '2025-08-26T15:00:00Z',
  lastActivity: '2025-08-26T15:00:00Z',
  settings: {
    allowPublicViewing: false,
    requireApproval: true,
    enableRealTimeCollab: true,
    notificationsEnabled: true
  }
}

const mockProgressStats = {
  totalTasks: 15,
  completedTasks: 6,
  inProgressTasks: 3,
  blockedTasks: 1,
  overdueTasks: 0,
  completionPercentage: 60,
  estimatedCompletionDate: '2025-09-08T18:00:00Z',
  actualHoursSpent: 28,
  estimatedHoursRemaining: 42,
  budgetUsed: 750000,
  budgetRemaining: 4250000,
  milestones: [
    {
      id: 'milestone-001',
      title: '프리프로덕션 완료',
      dueDate: '2025-08-30T18:00:00Z',
      status: 'in_progress',
      progress: 75
    }
  ]
}

export const videoPlanningHandlers = [
  // 특정 프로젝트 조회
  http.get(`${API_BASE_URL}/video-planning/projects/:projectId`, async ({ params }) => {
    const { projectId } = params
    
    // 테스트 환경에서는 지연 최소화
    if (process.env.NODE_ENV === 'test') {
      await delay(1)
    } else {
      await delay(100)
    }

    if (projectId === 'project-001' || !projectId) {
      return HttpResponse.json({
        project: mockProject,
        success: true
      })
    }

    if (projectId === 'loading-project') {
      await delay(200)
      return HttpResponse.json({
        project: mockProject,
        success: true
      })
    }

    if (projectId === 'error-project') {
      return HttpResponse.json({
        project: {},
        success: false,
        message: '프로젝트를 불러올 수 없습니다',
        errors: ['PROJECT_NOT_FOUND']
      }, { status: 404 })
    }

    if (projectId === 'network-error-project') {
      return HttpResponse.json({}, { status: 500 })
    }

    if (projectId === 'restricted-project') {
      return HttpResponse.json({
        project: {},
        success: false,
        message: '이 프로젝트에 접근할 권한이 없습니다',
        errors: ['ACCESS_DENIED']
      }, { status: 403 })
    }

    if (projectId === 'empty-project') {
      return HttpResponse.json({
        project: {
          ...mockProject,
          id: 'empty-project',
          planningCards: [],
          shots: [],
          script: { ...mockProject.script, sections: [] },
          comments: []
        },
        success: true
      })
    }

    // 기본값
    return HttpResponse.json({
      project: mockProject,
      success: true
    })
  }),

  // 프로젝트 목록 조회
  http.get(`${API_BASE_URL}/video-planning/projects`, async () => {
    if (process.env.NODE_ENV === 'test') {
      await delay(1)
    } else {
      await delay(100)
    }
    
    return HttpResponse.json({
      projects: [mockProject],
      total: 1,
      page: 1,
      pageSize: 10,
      hasMore: false
    })
  }),

  // 진행률 통계 조회
  http.get(`${API_BASE_URL}/video-planning/projects/:projectId/stats`, async ({ params }) => {
    const { projectId } = params
    
    if (process.env.NODE_ENV === 'test') {
      await delay(1)
    } else {
      await delay(100)
    }
    
    return HttpResponse.json(mockProgressStats)
  }),

  // 프로젝트 업데이트
  http.put(`${API_BASE_URL}/video-planning/projects/:projectId`, async ({ request, params }) => {
    const { projectId } = params
    const updates = await request.json()
    
    if (process.env.NODE_ENV === 'test') {
      await delay(1)
    } else {
      await delay(100)
    }

    const updatedProject = {
      ...mockProject,
      ...(typeof updates === 'object' && updates !== null ? updates : {}),
      id: projectId,
      updatedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    }

    return HttpResponse.json({
      project: updatedProject,
      success: true,
      message: '프로젝트가 성공적으로 업데이트되었습니다'
    })
  }),

  // 프로젝트 생성
  http.post(`${API_BASE_URL}/video-planning/projects`, async ({ request }) => {
    const projectData = await request.json()
    
    if (process.env.NODE_ENV === 'test') {
      await delay(1)
    } else {
      await delay(100)
    }

    const newProject = {
      ...(typeof projectData === 'object' && projectData !== null ? projectData : {}),
      id: `project-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    }

    return HttpResponse.json({
      project: newProject,
      success: true,
      message: '프로젝트가 성공적으로 생성되었습니다'
    })
  }),

  // 기획 템플릿 목록 조회 (기존 유지)
  http.get(`${API_BASE_URL}/video-planning/templates`, async () => {
    if (process.env.NODE_ENV === 'test') {
      await delay(1)
    } else {
      await delay(100)
    }
    return HttpResponse.json({ 
      templates: [],
      success: true
    })
  })
]

export const videoPlanningTestUtils = {
  clearSessions: () => {},
  getMockProject: () => mockProject,
  getMockProgressStats: () => mockProgressStats
}