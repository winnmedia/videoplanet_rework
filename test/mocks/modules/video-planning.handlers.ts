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

// Video Planning Wizard API Mock Data (Added for comprehensive testing)
const MOCK_FOUR_STAGES = [
  {
    id: 'stage-1',
    order: 1,
    title: '도입부 - 문제 제기',
    description: '타겟 고객이 공감할 수 있는 문제점을 제시하여 관심을 유발합니다.',
    duration: '15초',
    keyMessages: ['문제 상황 인식', '공감대 형성', '관심 유발'],
    visualConcepts: ['일상 속 불편함', '고객 페르소나', '문제 상황 연출'],
    notes: '타겟의 라이프스타일에 맞는 현실적인 문제 상황으로 구성'
  },
  {
    id: 'stage-2', 
    order: 2,
    title: '전개부 - 해결책 제시',
    description: '제품/서비스가 어떻게 문제를 해결하는지 구체적으로 보여줍니다.',
    duration: '20초',
    keyMessages: ['솔루션 소개', '핵심 기능 강조', '차별점 부각'],
    visualConcepts: ['제품 사용 장면', '기능 시연', '전후 비교'],
    notes: '제품의 핵심 가치를 직관적으로 이해할 수 있도록 구성'
  },
  {
    id: 'stage-3',
    order: 3, 
    title: '절정부 - 효과 검증',
    description: '실제 사용 후기나 데이터를 통해 효과를 입증합니다.',
    duration: '15초',
    keyMessages: ['사용 후기', '만족도 증명', '신뢰성 구축'],
    visualConcepts: ['만족한 고객', '개선된 상황', '긍정적 변화'],
    notes: '구체적인 수치나 실제 후기를 활용하여 신뢰성 강화'
  },
  {
    id: 'stage-4',
    order: 4,
    title: '마무리 - 행동 유도', 
    description: '명확한 액션을 유도하며 브랜드 메시지를 각인시킵니다.',
    duration: '10초',
    keyMessages: ['행동 유도', '브랜드 각인', '연락처 안내'],
    visualConcepts: ['브랜드 로고', 'CTA 문구', '연락처 정보'],
    notes: '간결하고 임팩트 있는 메시지로 구매 전환 유도'
  }
]

const MOCK_TWELVE_SHOTS = [
  {
    id: 'shot-1', shotNumber: 1, title: '일상 속 불편함 - 와이드샷',
    description: '바쁜 일상 속에서 문제 상황에 직면한 주인공의 모습',
    duration: '4초', shotType: 'wide', angle: 'eye_level', framing: '와이드샷'
  },
  {
    id: 'shot-2', shotNumber: 2, title: '고민하는 표정 - 클로즈업',
    description: '문제 상황으로 인해 고민하는 주인공의 클로즈업',
    duration: '3초', shotType: 'close_up', angle: 'slight_high', framing: '클로즈업'
  },
  {
    id: 'shot-3', shotNumber: 3, title: '제품 등장 - 미디엄샷',
    description: '해결책으로 제품이 등장하는 장면',
    duration: '5초', shotType: 'medium', angle: 'eye_level', framing: '미디엄샷'
  },
  {
    id: 'shot-4', shotNumber: 4, title: '제품 핵심 기능 - 익스트림 클로즈업',
    description: '제품의 핵심 기능을 강조하는 익스트림 클로즈업',
    duration: '6초', shotType: 'extreme_close_up', angle: 'slightly_low', framing: '익스트림 클로즈업'
  },
  {
    id: 'shot-5', shotNumber: 5, title: '사용 과정 - 오버 숄더',
    description: '제품을 사용하는 과정을 보여주는 오버 숄더샷',
    duration: '7초', shotType: 'over_shoulder', angle: 'eye_level', framing: '오버 숄더'
  },
  {
    id: 'shot-6', shotNumber: 6, title: '만족한 표정 - 미디엄 클로즈업',
    description: '제품 사용 후 만족한 주인공의 표정',
    duration: '4초', shotType: 'medium_close_up', angle: 'slightly_low', framing: '미디엄 클로즈업'
  },
  {
    id: 'shot-7', shotNumber: 7, title: '개선된 상황 - 와이드샷',
    description: '문제가 해결된 후의 개선된 상황',
    duration: '5초', shotType: 'wide', angle: 'eye_level', framing: '와이드샷'
  },
  {
    id: 'shot-8', shotNumber: 8, title: '고객 후기 - 버스트샷',
    description: '실제 고객의 만족 후기 장면',
    duration: '6초', shotType: 'bust', angle: 'eye_level', framing: '버스트샷'
  },
  {
    id: 'shot-9', shotNumber: 9, title: '제품 전체 - 풀샷',
    description: '제품의 전체적인 모습을 보여주는 풀샷',
    duration: '4초', shotType: 'full', angle: 'eye_level', framing: '풀샷'
  },
  {
    id: 'shot-10', shotNumber: 10, title: '브랜드 로고 - 클로즈업',
    description: '브랜드 로고를 강조하는 클로즈업',
    duration: '3초', shotType: 'close_up', angle: 'eye_level', framing: '클로즈업'
  },
  {
    id: 'shot-11', shotNumber: 11, title: 'CTA 문구 - 그래픽',
    description: '행동 유도 문구가 포함된 그래픽 화면',
    duration: '4초', shotType: 'graphic', angle: 'front', framing: '그래픽'
  },
  {
    id: 'shot-12', shotNumber: 12, title: '연락처 정보 - 그래픽',
    description: '연락처 정보가 표시되는 마무리 화면',
    duration: '3초', shotType: 'graphic', angle: 'front', framing: '그래픽'
  }
]

const MOCK_INSERT_SHOTS = [
  {
    id: 'insert-1', title: '제품 로고 인서트',
    description: '제품 브랜드 로고의 세밀한 디테일',
    duration: '2초', purpose: '브랜드 인지', order: 1, framing: '익스트림 클로즈업'
  },
  {
    id: 'insert-2', title: '사용법 가이드 인서트', 
    description: '제품 사용 방법을 자세히 보여주는 인서트',
    duration: '3초', purpose: '사용법 안내', order: 2, framing: '클로즈업'
  }
]

export const videoPlanningHandlers = [
  // Video Planning Wizard API Handlers
  http.post('*/api/video-planning/generate-stages', async ({ request }) => {
    await delay(2000) // LLM 응답 대기 시간 시뮬레이션
    
    const body = await request.json()
    const { input } = body || {}
    
    // 입력 검증
    if (!input?.title || !input?.logline) {
      return HttpResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '제목과 로그라인은 필수 항목입니다.',
        errors: ['title', 'logline']
      }, { status: 400 })
    }
    
    // 개발 방식에 따른 단계 변형 적용
    const stages = input.developmentMethod === 'problem_solution' 
      ? MOCK_FOUR_STAGES.map(stage => ({ ...stage, title: `[문제해결형] ${stage.title}` }))
      : MOCK_FOUR_STAGES
    
    return HttpResponse.json({
      success: true,
      stages: stages,
      metadata: {
        totalDuration: '60초',
        generatedAt: new Date().toISOString(),
        inputHash: 'mock-hash-123'
      }
    })
  }),

  http.post('*/api/video-planning/generate-shots', async ({ request }) => {
    await delay(3000) // 샷 생성 시간 시뮬레이션
    
    const body = await request.json()
    const { stages } = body || {}
    
    // 입력 검증
    if (!stages || !Array.isArray(stages) || stages.length !== 4) {
      return HttpResponse.json({
        success: false,
        error: 'VALIDATION_ERROR', 
        message: '4개의 단계가 필요합니다.',
        errors: ['stages']
      }, { status: 400 })
    }
    
    return HttpResponse.json({
      success: true,
      shots: MOCK_TWELVE_SHOTS,
      insertShots: MOCK_INSERT_SHOTS,
      metadata: {
        totalShots: 12,
        totalDuration: '60초',
        generatedAt: new Date().toISOString()
      }
    })
  }),

  http.post('*/api/video-planning/generate-storyboard', async ({ request }) => {
    await delay(4000) // 스토리보드 생성 시간 시뮬레이션
    
    const body = await request.json()
    const { shots } = body || {}
    
    // 입력 검증
    if (!shots || !Array.isArray(shots)) {
      return HttpResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '샷 정보가 필요합니다.',
        errors: ['shots']
      }, { status: 400 })
    }
    
    const storyboardFrames = shots.map((shot, index) => ({
      id: `frame-${index + 1}`,
      shotId: shot.id,
      imageUrl: `https://picsum.photos/640/360?random=${index + 1}`,
      thumbnailUrl: `https://picsum.photos/320/180?random=${index + 1}`,
      description: shot.description,
      notes: shot.notes || '',
      timestamp: `00:${String(index * 5).padStart(2, '0')}`
    }))
    
    return HttpResponse.json({
      success: true,
      storyboard: {
        id: 'storyboard-001',
        frames: storyboardFrames,
        layout: 'grid_3x4',
        aspectRatio: '16:9'
      },
      metadata: {
        totalFrames: storyboardFrames.length,
        generatedAt: new Date().toISOString()
      }
    })
  }),

  http.post('*/api/video-planning/export-plan', async ({ request }) => {
    await delay(6000) // PDF 생성 시간 시뮬레이션
    
    const body = await request.json()
    const { format, data } = body || {}
    
    // 입력 검증
    if (!data?.stages || !data?.shots) {
      return HttpResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '기획 데이터가 필요합니다.',
        errors: ['stages', 'shots']
      }, { status: 400 })
    }
    
    if (format === 'json') {
      return HttpResponse.json({
        success: true,
        exportData: {
          project: {
            title: data.title || '영상 기획서',
            createdAt: new Date().toISOString(),
            stages: data.stages,
            shots: data.shots,
            insertShots: data.insertShots || []
          },
          metadata: {
            format: 'json',
            version: '1.0',
            exportedAt: new Date().toISOString()
          }
        }
      })
    }
    
    // PDF 형식
    return HttpResponse.json({
      success: true,
      downloadUrl: 'https://example.com/video-plan.pdf',
      metadata: {
        format: 'pdf',
        layout: 'A4_landscape',
        pages: 8,
        fileSize: '2.4MB',
        generatedAt: new Date().toISOString()
      }
    })
  }),

  http.post('*/api/video-planning/save-project', async ({ request }) => {
    await delay(1000)
    
    const body = await request.json()
    const { title, planningData } = body || {}
    
    if (!title || !planningData) {
      return HttpResponse.json({
        success: false,
        error: 'VALIDATION_ERROR',
        message: '프로젝트 제목과 기획 데이터가 필요합니다.',
        errors: ['title', 'planningData']
      }, { status: 400 })
    }
    
    const projectId = `proj-vp-${Date.now()}`
    return HttpResponse.json({
      success: true,
      project: {
        id: projectId,
        title,
        ...planningData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    })
  }),

  http.get('*/api/video-planning/load-project/:projectId', async ({ params }) => {
    await delay(500)
    
    const { projectId } = params
    
    if (projectId === 'proj-vp-001') {
      return HttpResponse.json({
        success: true,
        project: {
          id: projectId,
          title: '테스트 비디오 기획',
          stages: MOCK_FOUR_STAGES,
          shots: MOCK_TWELVE_SHOTS,
          insertShots: MOCK_INSERT_SHOTS,
          createdAt: '2025-09-01T10:00:00Z',
          updatedAt: '2025-09-04T11:30:00Z'
        }
      })
    }
    
    return HttpResponse.json({
      success: false,
      error: 'NOT_FOUND',
      message: '프로젝트를 찾을 수 없습니다.'
    }, { status: 404 })
  }),

  http.get('*/api/video-planning/user-projects', async () => {
    await delay(300)
    
    return HttpResponse.json({
      success: true,
      projects: [
        {
          id: 'proj-vp-001',
          title: '테스트 비디오 기획',
          createdAt: '2025-09-01T10:00:00Z',
          updatedAt: '2025-09-04T11:30:00Z',
          status: 'active'
        }
      ],
      total: 1
    })
  }),

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