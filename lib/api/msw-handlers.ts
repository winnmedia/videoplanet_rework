/**
 * MSW (Mock Service Worker) Handlers
 * Railway 백엔드 API 안정성을 위한 개발 환경 모킹 시스템
 */

import { http, HttpResponse } from 'msw'

import type {
  PlanningInput,
  PlanningStage,
  VideoShot,
  InsertShot,
  GenerateStagesResponse,
  GenerateShotsResponse,
  GenerateStoryboardResponse,
  ExportPlanResponse
} from '@/features/video-planning-wizard/model/types'
import type {
  SubMenuItemType,
  ProjectType,
  FeedbackType,
  MenuItemType
} from '@/shared/api/schemas'
import { collaborationHandlers } from '@/shared/lib/collaboration/__tests__/collaboration-handlers'
import type {
  VideoFeedbackSession,
  VideoFeedbackResponse,
  VideoFeedbackListResponse,
  TimestampComment,
  VideoMarker,
  FeedbackStatus,
  FeedbackStats,
  VideoMetadata
} from '@/widgets/VideoFeedback/model/types'

// 협업 시스템 핸들러 임포트

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
      id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      name: '웹사이트 로딩 속도 개선',
      path: '/feedback/f47ac10b-58cc-4372-a567-0e02b2c3d479',
      status: 'active',
      badge: 2,
      lastModified: new Date('2025-08-27T16:20:00Z').toISOString(),
      description: 'UI/UX 개선 사항 피드백',
      priority: 'high'
    },
    {
      id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      name: '모바일 반응형 버그',
      path: '/feedback/6ba7b810-9dad-11d1-80b4-00c04fd430c8',
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
    id: 'f47ac10b-58cc-4372-a567-0e02b2c3d479',
    title: '웹사이트 로딩 속도 개선 요청',
    content: '메인 페이지 로딩 시간이 너무 길어 사용자 경험에 문제가 있습니다.',
    type: 'improvement',
    status: 'open',
    projectId: '123e4567-e89b-12d3-a456-426614174000',
    authorId: '987fcdeb-51a2-43f1-9876-543210987654',
    assigneeId: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    createdAt: new Date('2025-08-27T09:15:00Z').toISOString(),
    updatedAt: new Date('2025-08-27T16:20:00Z').toISOString(),
    tags: ['performance', 'frontend', 'ux'],
    priority: 'high',
    attachments: []
  },
  {
    id: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    title: '모바일 반응형 레이아웃 버그',
    content: '모바일 화면에서 네비게이션 메뉴가 제대로 표시되지 않는 문제가 있습니다.',
    type: 'bug',
    status: 'in-review',
    projectId: '123e4567-e89b-12d3-a456-426614174000',
    authorId: 'b2c3d4e5-f6a7-8901-bcde-f23456789012',
    assigneeId: 'c3d4e5f6-a7b8-9012-cdef-345678901234',
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

// Video Feedback API 모킹 데이터
const MOCK_VIDEO_METADATA: VideoMetadata = {
  id: 'video-001',
  filename: 'brand_promotion_v2.mp4',
  url: '/api/videos/brand_promotion_v2.mp4',
  thumbnail: '/api/videos/thumbnails/brand_promotion_v2.jpg',
  duration: 180, // 3분
  fileSize: 52428800, // 50MB
  format: 'mp4',
  resolution: {
    width: 1920,
    height: 1080
  },
  uploadedAt: '2025-08-25T14:30:00Z',
  uploadedBy: 'user-editor-001'
}

const MOCK_COMMENTS: TimestampComment[] = [
  {
    id: 'comment-001',
    videoId: 'video-001',
    timestamp: 15.5,
    x: 45.2,
    y: 32.1,
    content: '로고 크기가 너무 작아서 브랜드 인지도가 떨어질 것 같습니다. 좀 더 크게 해주세요.',
    author: {
      id: 'user-client-001',
      name: '김클라이언트',
      avatar: '/avatars/client-001.jpg',
      role: 'client'
    },
    createdAt: '2025-08-26T09:15:00Z',
    status: 'open',
    priority: 'high',
    tags: ['로고', '브랜딩']
  },
  {
    id: 'comment-002',
    videoId: 'video-001',
    timestamp: 45.0,
    content: '배경음악이 너무 커서 내레이션이 잘 들리지 않습니다.',
    author: {
      id: 'user-reviewer-001',
      name: '박검토자',
      avatar: '/avatars/reviewer-001.jpg',
      role: 'reviewer'
    },
    createdAt: '2025-08-26T09:32:00Z',
    status: 'open',
    priority: 'urgent',
    tags: ['음향', '믹싱']
  },
  {
    id: 'comment-003',
    videoId: 'video-001',
    timestamp: 90.5,
    x: 75.8,
    y: 20.3,
    content: '이 장면의 색감이 이전 씬과 달라서 일관성이 떨어져 보입니다.',
    author: {
      id: 'user-editor-002',
      name: '최편집자',
      avatar: '/avatars/editor-002.jpg',
      role: 'editor'
    },
    createdAt: '2025-08-26T10:45:00Z',
    status: 'resolved',
    priority: 'medium',
    tags: ['색보정', '연출']
  },
  {
    id: 'comment-004',
    videoId: 'video-001',
    timestamp: 120.0,
    content: '마지막 CTA 버튼의 애니메이션이 너무 빨라서 읽기 어렵습니다.',
    author: {
      id: 'user-client-002',
      name: '이담당자',
      avatar: '/avatars/client-002.jpg',
      role: 'client'
    },
    createdAt: '2025-08-26T11:20:00Z',
    status: 'open',
    priority: 'medium',
    tags: ['애니메이션', 'CTA']
  },
  {
    id: 'comment-005',
    videoId: 'video-001',
    timestamp: 165.2,
    x: 30.5,
    y: 80.7,
    content: '엔드 크레딧에 저작권 표시가 빠져있습니다.',
    author: {
      id: 'user-admin-001',
      name: '관리자',
      avatar: '/avatars/admin-001.jpg',
      role: 'admin'
    },
    createdAt: '2025-08-26T12:00:00Z',
    status: 'open',
    priority: 'high',
    tags: ['법무', '저작권']
  }
]

const MOCK_MARKERS: VideoMarker[] = [
  {
    id: 'marker-001',
    videoId: 'video-001',
    timestamp: 15.5,
    type: 'rectangle',
    coordinates: {
      x: 40.0,
      y: 25.0,
      width: 15.0,
      height: 20.0
    },
    style: {
      color: '#ff4444',
      strokeWidth: 2,
      opacity: 0.8
    },
    linkedCommentId: 'comment-001',
    createdBy: 'user-client-001',
    createdAt: '2025-08-26T09:15:30Z'
  },
  {
    id: 'marker-002',
    videoId: 'video-001',
    timestamp: 90.5,
    type: 'circle',
    coordinates: {
      x: 75.8,
      y: 20.3,
      radius: 8.0
    },
    style: {
      color: '#ffaa00',
      strokeWidth: 3,
      opacity: 0.9
    },
    linkedCommentId: 'comment-003',
    createdBy: 'user-editor-002',
    createdAt: '2025-08-26T10:45:15Z'
  }
]

const MOCK_VIDEO_FEEDBACK_SESSIONS: Record<string, VideoFeedbackSession> = {
  'session-001': {
    id: 'session-001',
    projectId: 'project-brand-promo',
    videoMetadata: MOCK_VIDEO_METADATA,
    status: 'in_review',
    title: '브랜드 홍보 영상 v2.0 피드백',
    description: '클라이언트 1차 검토 후 수정된 버전입니다. 로고 크기와 음향 밸런스를 조정했습니다.',
    version: 'v2.0',
    createdBy: 'user-editor-001',
    createdAt: '2025-08-25T14:30:00Z',
    updatedAt: '2025-08-26T12:00:00Z',
    deadline: '2025-08-28T18:00:00Z',
    reviewers: ['user-client-001', 'user-client-002', 'user-reviewer-001'],
    comments: MOCK_COMMENTS,
    markers: MOCK_MARKERS,
    totalComments: 5,
    resolvedComments: 1,
    pendingComments: 4
  },
  'session-002': {
    id: 'session-002',
    projectId: 'project-product-demo',
    videoMetadata: {
      ...MOCK_VIDEO_METADATA,
      id: 'video-002',
      filename: 'product_demo_v1.mp4',
      url: '/api/videos/product_demo_v1.mp4',
      duration: 120
    },
    status: 'approved',
    title: '제품 데모 영상 v1.0',
    description: '신제품 소개 영상 첫 버전',
    version: 'v1.0',
    createdBy: 'user-editor-001',
    createdAt: '2025-08-20T10:00:00Z',
    updatedAt: '2025-08-24T16:30:00Z',
    deadline: '2025-08-26T18:00:00Z',
    reviewers: ['user-client-001'],
    comments: [],
    markers: [],
    totalComments: 0,
    resolvedComments: 0,
    pendingComments: 0
  }
}

const MOCK_FEEDBACK_STATS: FeedbackStats = {
  totalSessions: 12,
  activeSessions: 3,
  completedSessions: 9,
  averageResolutionTime: 48, // 48시간
  commentsByStatus: {
    open: 15,
    resolved: 8,
    archived: 2
  },
  commentsByPriority: {
    low: 3,
    medium: 12,
    high: 7,
    urgent: 3
  }
}

// Video Planning API 모킹 데이터
const MOCK_FOUR_STAGES: PlanningStage[] = [
  {
    id: 'stage-1',
    title: '기',
    content: '훅으로 시작하여 시청자의 관심을 끌어야 합니다. 첫 3초가 가장 중요하며, 시각적 임팩트나 질문으로 시작하는 것이 효과적입니다.',
    goal: '관심 유발',
    duration: '5-8초',
    order: 1
  },
  {
    id: 'stage-2',
    title: '승',
    content: '문제 상황을 구체적으로 제시하고 시청자가 공감할 수 있는 상황을 연출합니다. 감정적 연결이 중요합니다.',
    goal: '문제 인식',
    duration: '15-20초',
    order: 2
  },
  {
    id: 'stage-3',
    title: '전',
    content: '해결책을 명확하고 설득력 있게 제시합니다. 구체적인 사례나 데이터를 활용하여 신뢰성을 높입니다.',
    goal: '해결책 제시',
    duration: '20-25초',
    order: 3
  },
  {
    id: 'stage-4',
    title: '결',
    content: '명확한 행동 유도(CTA)와 강력한 마무리로 시청자의 행동을 이끌어냅니다.',
    goal: '행동 유도',
    duration: '8-12초',
    order: 4
  }
]

const MOCK_TWELVE_SHOTS: VideoShot[] = [
  {
    id: 'shot-1',
    title: '오프닝 훅',
    description: '강력한 비주얼과 함께 호기심을 유발하는 질문으로 시작',
    shotType: '클로즈업',
    cameraMove: '줌인',
    composition: '중앙',
    duration: 3,
    dialogue: '당신은 이런 경험이 있나요?',
    transition: '컷',
    stageId: 'stage-1',
    order: 1
  },
  {
    id: 'shot-2',
    title: '상황 제시',
    description: '일반적인 문제 상황을 시각적으로 보여줌',
    shotType: '미디엄샷',
    cameraMove: '패닝',
    composition: '좌측',
    duration: 4,
    dialogue: '',
    transition: '페이드',
    stageId: 'stage-1',
    order: 2
  },
  {
    id: 'shot-3',
    title: '문제 인식 1',
    description: '시청자가 공감할 수 있는 구체적 문제점 제시',
    shotType: '와이드샷',
    cameraMove: '고정',
    composition: '정면',
    duration: 5,
    dialogue: '많은 사람들이 이 문제로 고민하고 있습니다.',
    transition: '컷',
    stageId: 'stage-2',
    order: 3
  },
  // ... 나머지 샷들을 위한 모킹 데이터
  ...Array.from({ length: 9 }, (_, i) => ({
    id: `shot-${i + 4}`,
    title: `샷 ${i + 4}`,
    description: `샷 ${i + 4}에 대한 상세 설명`,
    shotType: ['클로즈업', '미디엄샷', '와이드샷', '익스트림 클로즈업'][i % 4],
    cameraMove: ['고정', '줌인', '줌아웃', '패닝', '틸트'][i % 5],
    composition: ['정면', '좌측', '우측', '중앙'][i % 4],
    duration: 3 + (i % 3),
    dialogue: i % 2 === 0 ? `샷 ${i + 4} 대사 내용` : '',
    transition: ['컷', '페이드', '와이프'][i % 3],
    stageId: `stage-${Math.floor(i / 3) + 2}`,
    order: i + 4
  }))
]

const MOCK_INSERT_SHOTS: InsertShot[] = [
  {
    id: 'insert-1',
    title: '제품 클로즈업',
    description: '제품의 핵심 기능을 보여주는 상세 컷',
    timing: '2-4초 구간',
    purpose: '제품 강조',
    order: 1
  },
  {
    id: 'insert-2',
    title: '사용자 반응',
    description: '실제 사용자의 만족스러운 표정',
    timing: '25-27초 구간',
    purpose: '신뢰성 구축',
    order: 2
  },
  {
    id: 'insert-3',
    title: 'CTA 강화',
    description: '행동 유도를 위한 시각적 효과',
    timing: '45-48초 구간',
    purpose: '전환 향상',
    order: 3
  }
]

const MOCK_STORYBOARD_URLS = [
  '/mock-storyboards/shot-1.jpg',
  '/mock-storyboards/shot-2.jpg',
  '/mock-storyboards/shot-3.jpg'
]

const MOCK_PROJECT_DATA = {
  'proj-vp-001': {
    id: 'proj-vp-001',
    title: '테스트 영상 기획',
    input: {
      title: '테스트 영상',
      logline: '흥미로운 이야기를 통한 제품 소개',
      toneAndManner: '발랄',
      genre: '광고',
      target: '20-30대 여성',
      duration: '60초',
      format: '16:9',
      tempo: '보통',
      developmentMethod: '기승전결'
    },
    stages: MOCK_FOUR_STAGES,
    shots: MOCK_TWELVE_SHOTS,
    insertShots: MOCK_INSERT_SHOTS,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    progress: 75
  }
}

// 응답 지연 시뮬레이션 (개발 환경 리얼리즘)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// 피드백 상태 레이블 유틸리티
const getStatusLabel = (status: FeedbackStatus): string => {
  const labels: Record<FeedbackStatus, string> = {
    draft: '초안',
    pending: '검토 대기',
    in_review: '검토중',
    revision_needed: '수정 필요',
    approved: '승인됨',
    rejected: '거절됨',
    completed: '완료'
  }
  return labels[status] || status
}

// 초대 쿨다운 시뮬레이션용 메모리 스토리지
const mockInviteCooldowns = new Map<string, number>()

// MSW 핸들러 정의
export const handlers = [
  // 협업 시스템 핸들러들 추가
  ...collaborationHandlers,
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

  // Video Planning API 핸들러
  
  // 4단계 기획 생성 API
  http.post('*/api/video-planning/generate-stages', async ({ request }) => {
    await delay(2000) // LLM 응답 대기 시간 시뮬레이션
    
    const body = await request.json() as any
    // body가 직접 input 객체인 경우와 { input: ... } 형태인 경우 모두 처리
    const input: PlanningInput = body.input || body
    
    // 입력 검증
    if (!input?.title || !input?.logline) {
      return HttpResponse.json({
        success: false,
        error: '제목과 로그라인은 필수 입력 항목입니다.'
      }, { status: 400 })
    }
    
    // 개발 방식에 따른 단계 변형 시뮬레이션
    const stages = MOCK_FOUR_STAGES.map(stage => ({
      ...stage,
      content: `[${input.developmentMethod || '기승전결'}] ${stage.content}`
    }))
    
    const response: GenerateStagesResponse = {
      success: true,
      stages,
      timestamp: new Date().toISOString(),
      message: '4단계 기획이 성공적으로 생성되었습니다.',
      metadata: {
        totalDuration: stages.reduce((acc, stage) => {
          const duration = parseInt(stage.duration.match(/\d+/)?.[0] || '0')
          return acc + duration
        }, 0),
        qualityScore: 95
      }
    }
    
    return HttpResponse.json(response)
  }),

  // 12개 숏 생성 API
  http.post('*/api/video-planning/generate-shots', async ({ request }) => {
    await delay(3000) // 더 복잡한 LLM 처리 시간 시뮬레이션
    
    const body = await request.json() as { stages: PlanningStage[]; input: PlanningInput }
    
    if (!body.stages?.length || body.stages.length !== 4) {
      return HttpResponse.json({
        success: false,
        error: '4개의 단계 정보가 필요합니다.'
      }, { status: 400 })
    }
    
    // 단계별로 샷 배분 시뮬레이션
    const shotsPerStage = [2, 3, 4, 3] // 기승전결별 샷 개수
    let shotIndex = 0
    const generatedShots = []
    
    for (let i = 0; i < body.stages.length; i++) {
      const stage = body.stages[i]
      const shotCount = shotsPerStage[i]
      
      for (let j = 0; j < shotCount; j++) {
        generatedShots.push({
          ...MOCK_TWELVE_SHOTS[shotIndex],
          id: `shot-${shotIndex + 1}`,
          stageId: stage.id,
          title: `${stage.title}단계 샷 ${j + 1}`,
          description: `${stage.goal}을 위한 샷 ${j + 1}`,
          order: shotIndex + 1
        })
        shotIndex++
      }
    }
    
    const response: GenerateShotsResponse = {
      success: true,
      shots: generatedShots,
      insertShots: MOCK_INSERT_SHOTS,
      timestamp: new Date().toISOString(),
      message: '12개 숏과 인서트 3컷이 성공적으로 생성되었습니다.',
      metadata: {
        totalDuration: generatedShots.reduce((acc, shot) => acc + shot.duration, 0),
        shotTypeDistribution: generatedShots.reduce((acc, shot) => {
          acc[shot.shotType] = (acc[shot.shotType] || 0) + 1
          return acc
        }, {} as Record<string, number>),
        qualityScore: 92
      }
    }
    
    return HttpResponse.json(response)
  }),

  // 스토리보드 생성 API
  http.post('*/api/video-planning/generate-storyboard', async ({ request }) => {
    await delay(4000) // 이미지 생성 시간 시뮬레이션
    
    const body = await request.json() as { shot: VideoShot }
    
    if (!body.shot?.id) {
      return HttpResponse.json({
        success: false,
        error: '유효한 샷 정보가 필요합니다.'
      }, { status: 400 })
    }
    
    // 샷 ID에 따른 스토리보드 URL 시뮬레이션
    const shotIndex = parseInt(body.shot.id.replace('shot-', '')) - 1
    const storyboardUrl = MOCK_STORYBOARD_URLS[shotIndex % MOCK_STORYBOARD_URLS.length]
    
    const response: GenerateStoryboardResponse = {
      success: true,
      storyboardUrl,
      timestamp: new Date().toISOString(),
      message: '스토리보드가 성공적으로 생성되었습니다.',
      metadata: {
        imageSize: { width: 1920, height: 1080 },
        fileFormat: 'JPEG',
        quality: 'high'
      }
    }
    
    return HttpResponse.json(response)
  }),

  // 기획서 내보내기 API
  http.post('*/api/video-planning/export-plan', async ({ request }) => {
    await delay(5000) // PDF 생성 시간 시뮬레이션
    
    const body = await request.json() as {
      fourStagesPlan: any;
      twelveShotsPlan: any;
      options: { format: 'json' | 'pdf'; includeStoryboard: boolean; includeInserts: boolean }
    }
    
    if (!body.fourStagesPlan || !body.twelveShotsPlan) {
      return HttpResponse.json({
        success: false,
        error: '4단계 기획과 12숏 기획 데이터가 모두 필요합니다.'
      }, { status: 400 })
    }
    
    const fileName = body.options.format === 'pdf' ? 
      `planning_${Date.now()}.pdf` : 
      `planning_${Date.now()}.json`
      
    const downloadUrl = `/mock-exports/${fileName}`
    
    const response: ExportPlanResponse = {
      success: true,
      downloadUrl,
      timestamp: new Date().toISOString(),
      message: `${body.options.format.toUpperCase()} 기획서가 성공적으로 생성되었습니다.`,
      metadata: {
        fileSize: body.options.format === 'pdf' ? '2.4MB' : '156KB',
        pageCount: body.options.format === 'pdf' ? 8 : undefined,
        includesStoryboard: body.options.includeStoryboard,
        includesInserts: body.options.includeInserts
      }
    }
    
    return HttpResponse.json(response)
  }),

  // 프로젝트 저장 API
  http.post('*/api/video-planning/save-project', async ({ request }) => {
    await delay(800)
    
    const body = await request.json() as {
      title: string;
      input: PlanningInput;
      stages: PlanningStage[];
      shots: VideoShot[];
      insertShots: InsertShot[]
    }
    
    if (!body.title || !body.stages?.length) {
      return HttpResponse.json({
        success: false,
        error: '프로젝트 제목과 기획 데이터가 필요합니다.'
      }, { status: 400 })
    }
    
    const projectId = `proj-vp-${Date.now()}`
    
    return HttpResponse.json({
      success: true,
      projectId,
      message: '프로젝트가 성공적으로 저장되었습니다.'
    })
  }),

  // 프로젝트 로드 API
  http.get('*/api/video-planning/load-project/:projectId', async ({ params }) => {
    await delay(400)
    
    const { projectId } = params
    const project = MOCK_PROJECT_DATA[projectId as string]
    
    if (!project) {
      return HttpResponse.json({
        success: false,
        error: '프로젝트를 찾을 수 없습니다.'
      }, { status: 404 })
    }
    
    return HttpResponse.json({
      success: true,
      project: {
        title: project.title,
        input: project.input,
        stages: project.stages,
        shots: project.shots,
        insertShots: project.insertShots
      },
      message: '프로젝트가 성공적으로 로드되었습니다.'
    })
  }),

  // 사용자 프로젝트 목록 API
  http.get('*/api/video-planning/user-projects', async () => {
    await delay(300)
    
    const projects = Object.values(MOCK_PROJECT_DATA).map(project => ({
      id: project.id,
      title: project.title,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      progress: project.progress
    }))
    
    return HttpResponse.json({
      success: true,
      projects,
      message: '프로젝트 목록이 성공적으로 조회되었습니다.'
    })
  }),

  // Video Feedback API 핸들러
  
  // 비디오 피드백 세션 조회
  http.get('*/api/video-feedback/sessions/:sessionId', async ({ params }) => {
    await delay(process.env.NODE_ENV === 'test' ? 0 : 200)
    
    const { sessionId } = params
    
    // 특수 테스트 시나리오 처리
    if (sessionId === 'loading') {
      if (process.env.NODE_ENV === 'test') {
        await delay(5000) // 테스트에서는 타임아웃 시뮬레이션
        return HttpResponse.json({
          success: false,
          message: 'Loading timeout',
          errors: ['TIMEOUT']
        } as VideoFeedbackResponse, { status: 408 })
      } else {
        await new Promise(() => {}) // 개발 환경에서는 무한 로딩
      }
    }
    
    if (sessionId === 'not-found') {
      return HttpResponse.json({
        success: false,
        message: '세션을 찾을 수 없습니다.',
        errors: ['SESSION_NOT_FOUND']
      } as VideoFeedbackResponse, { status: 404 })
    }
    
    if (sessionId === 'network-error') {
      return HttpResponse.error()
    }
    
    const session = MOCK_VIDEO_FEEDBACK_SESSIONS[sessionId as string]
    if (!session) {
      return HttpResponse.json({
        success: false,
        message: '세션을 찾을 수 없습니다.',
        errors: ['SESSION_NOT_FOUND']
      } as VideoFeedbackResponse, { status: 404 })
    }
    
    return HttpResponse.json({
      success: true,
      session,
      message: '세션 조회 성공'
    } as VideoFeedbackResponse)
  }),

  // 피드백 세션 목록 조회
  http.get('*/api/video-feedback/sessions', async ({ request }) => {
    await delay(process.env.NODE_ENV === 'test' ? 0 : 300)
    
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10')
    const status = url.searchParams.get('status') as FeedbackStatus
    const projectId = url.searchParams.get('projectId')
    const reviewerId = url.searchParams.get('reviewerId')
    
    let sessions = Object.values(MOCK_VIDEO_FEEDBACK_SESSIONS)
    
    if (status) {
      sessions = sessions.filter(s => s.status === status)
    }
    
    if (projectId) {
      sessions = sessions.filter(s => s.projectId === projectId)
    }
    
    if (reviewerId) {
      sessions = sessions.filter(s => s.reviewers.includes(reviewerId))
    }
    
    const total = sessions.length
    const startIndex = (page - 1) * pageSize
    const paginatedSessions = sessions.slice(startIndex, startIndex + pageSize)
    
    return HttpResponse.json({
      sessions: paginatedSessions,
      total,
      page,
      pageSize,
      hasMore: startIndex + pageSize < total
    } as VideoFeedbackListResponse)
  }),

  // 댓글 추가
  http.post('*/api/video-feedback/sessions/:sessionId/comments', async ({ params, request }) => {
    await delay(process.env.NODE_ENV === 'test' ? 0 : 400)
    
    const { sessionId } = params
    const body = await request.json() as Omit<TimestampComment, 'id' | 'createdAt'>
    
    const session = MOCK_VIDEO_FEEDBACK_SESSIONS[sessionId as string]
    if (!session) {
      return HttpResponse.json({
        success: false,
        message: '세션을 찾을 수 없습니다.',
        errors: ['SESSION_NOT_FOUND']
      } as VideoFeedbackResponse, { status: 404 })
    }
    
    const newComment: TimestampComment = {
      ...body,
      id: `comment-${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    
    // Mock 데이터 업데이트
    session.comments.push(newComment)
    session.totalComments += 1
    session.pendingComments += 1
    session.updatedAt = new Date().toISOString()
    
    return HttpResponse.json({
      success: true,
      session,
      message: '댓글이 추가되었습니다.'
    } as VideoFeedbackResponse)
  }),

  // 댓글 수정
  http.put('*/api/video-feedback/sessions/:sessionId/comments/:commentId', async ({ params, request }) => {
    await delay(process.env.NODE_ENV === 'test' ? 0 : 350)
    
    const { sessionId, commentId } = params
    const body = await request.json() as Partial<TimestampComment>
    
    const session = MOCK_VIDEO_FEEDBACK_SESSIONS[sessionId as string]
    if (!session) {
      return HttpResponse.json({
        success: false,
        message: '세션을 찾을 수 없습니다.',
        errors: ['SESSION_NOT_FOUND']
      } as VideoFeedbackResponse, { status: 404 })
    }
    
    const commentIndex = session.comments.findIndex(c => c.id === commentId)
    if (commentIndex === -1) {
      return HttpResponse.json({
        success: false,
        message: '댓글을 찾을 수 없습니다.',
        errors: ['COMMENT_NOT_FOUND']
      } as VideoFeedbackResponse, { status: 404 })
    }
    
    // Mock 데이터 업데이트
    session.comments[commentIndex] = {
      ...session.comments[commentIndex],
      ...body,
      updatedAt: new Date().toISOString()
    }
    session.updatedAt = new Date().toISOString()
    
    return HttpResponse.json({
      success: true,
      session,
      message: '댓글이 수정되었습니다.'
    } as VideoFeedbackResponse)
  }),

  // 댓글 삭제
  http.delete('*/api/video-feedback/sessions/:sessionId/comments/:commentId', async ({ params }) => {
    await delay(process.env.NODE_ENV === 'test' ? 0 : 300)
    
    const { sessionId, commentId } = params
    
    const session = MOCK_VIDEO_FEEDBACK_SESSIONS[sessionId as string]
    if (!session) {
      return HttpResponse.json({
        success: false,
        message: '세션을 찾을 수 없습니다.',
        errors: ['SESSION_NOT_FOUND']
      } as VideoFeedbackResponse, { status: 404 })
    }
    
    const commentIndex = session.comments.findIndex(c => c.id === commentId)
    if (commentIndex === -1) {
      return HttpResponse.json({
        success: false,
        message: '댓글을 찾을 수 없습니다.',
        errors: ['COMMENT_NOT_FOUND']
      } as VideoFeedbackResponse, { status: 404 })
    }
    
    // Mock 데이터에서 삭제
    const deletedComment = session.comments.splice(commentIndex, 1)[0]
    session.totalComments -= 1
    if (deletedComment.status === 'open') {
      session.pendingComments -= 1
    } else if (deletedComment.status === 'resolved') {
      session.resolvedComments -= 1
    }
    session.updatedAt = new Date().toISOString()
    
    return HttpResponse.json({
      success: true,
      session,
      message: '댓글이 삭제되었습니다.'
    } as VideoFeedbackResponse)
  }),

  // 댓글 해결
  http.patch('*/api/video-feedback/sessions/:sessionId/comments/:commentId/resolve', async ({ params }) => {
    await delay(process.env.NODE_ENV === 'test' ? 0 : 250)
    
    const { sessionId, commentId } = params
    
    const session = MOCK_VIDEO_FEEDBACK_SESSIONS[sessionId as string]
    if (!session) {
      return HttpResponse.json({
        success: false,
        message: '세션을 찾을 수 없습니다.',
        errors: ['SESSION_NOT_FOUND']
      } as VideoFeedbackResponse, { status: 404 })
    }
    
    const commentIndex = session.comments.findIndex(c => c.id === commentId)
    if (commentIndex === -1) {
      return HttpResponse.json({
        success: false,
        message: '댓글을 찾을 수 없습니다.',
        errors: ['COMMENT_NOT_FOUND']
      } as VideoFeedbackResponse, { status: 404 })
    }
    
    // Mock 데이터 업데이트
    const comment = session.comments[commentIndex]
    if (comment.status !== 'resolved') {
      comment.status = 'resolved'
      comment.updatedAt = new Date().toISOString()
      session.resolvedComments += 1
      session.pendingComments -= 1
      session.updatedAt = new Date().toISOString()
    }
    
    return HttpResponse.json({
      success: true,
      session,
      message: '댓글이 해결되었습니다.'
    } as VideoFeedbackResponse)
  }),

  // 마커 추가
  http.post('*/api/video-feedback/sessions/:sessionId/markers', async ({ params, request }) => {
    await delay(process.env.NODE_ENV === 'test' ? 0 : 350)
    
    const { sessionId } = params
    const body = await request.json() as Omit<VideoMarker, 'id' | 'createdAt'>
    
    const session = MOCK_VIDEO_FEEDBACK_SESSIONS[sessionId as string]
    if (!session) {
      return HttpResponse.json({
        success: false,
        message: '세션을 찾을 수 없습니다.',
        errors: ['SESSION_NOT_FOUND']
      } as VideoFeedbackResponse, { status: 404 })
    }
    
    const newMarker: VideoMarker = {
      ...body,
      id: `marker-${Date.now()}`,
      createdAt: new Date().toISOString()
    }
    
    // Mock 데이터 업데이트
    session.markers.push(newMarker)
    session.updatedAt = new Date().toISOString()
    
    return HttpResponse.json({
      success: true,
      session,
      message: '마커가 추가되었습니다.'
    } as VideoFeedbackResponse)
  }),

  // 세션 상태 변경
  http.patch('*/api/video-feedback/sessions/:sessionId/status', async ({ params, request }) => {
    await delay(process.env.NODE_ENV === 'test' ? 0 : 300)
    
    const { sessionId } = params
    const body = await request.json() as { status: FeedbackStatus }
    
    const session = MOCK_VIDEO_FEEDBACK_SESSIONS[sessionId as string]
    if (!session) {
      return HttpResponse.json({
        success: false,
        message: '세션을 찾을 수 없습니다.',
        errors: ['SESSION_NOT_FOUND']
      } as VideoFeedbackResponse, { status: 404 })
    }
    
    // Mock 데이터 업데이트
    session.status = body.status
    session.updatedAt = new Date().toISOString()
    
    return HttpResponse.json({
      success: true,
      session,
      message: `상태가 ${getStatusLabel(body.status)}(으)로 변경되었습니다.`
    } as VideoFeedbackResponse)
  }),

  // 피드백 통계 조회
  http.get('*/api/video-feedback/stats', async ({ request }) => {
    await delay(process.env.NODE_ENV === 'test' ? 0 : 200)
    
    const url = new URL(request.url)
    const projectId = url.searchParams.get('projectId')
    
    // 프로젝트별 필터링 (실제로는 다른 통계를 반환할 수 있음)
    let stats = MOCK_FEEDBACK_STATS
    
    if (projectId === 'project-brand-promo') {
      // 특정 프로젝트의 통계
      stats = {
        ...MOCK_FEEDBACK_STATS,
        totalSessions: 3,
        activeSessions: 1,
        completedSessions: 2
      }
    }
    
    return HttpResponse.json({
      stats,
      success: true
    })
  }),

  // 프로젝트 생성 API (자동 스케줄링 포함)
  http.post('*/api/projects', async ({ request }) => {
    await delay(1000)
    
    const body = await request.json() as {
      title: string
      description?: string
      tags?: string[]
      settings?: any
      autoSchedule?: {
        planning: { duration: number }
        shooting: { duration: number }
        editing: { duration: number }
      }
    }
    
    // 입력 검증
    if (!body.title?.trim()) {
      return HttpResponse.json({
        success: false,
        error: '프로젝트 제목을 입력해주세요.'
      }, { status: 400 })
    }

    if (body.title === 'error') {
      return HttpResponse.json({
        success: false,
        error: '프로젝트 생성에 실패했습니다.'
      }, { status: 500 })
    }
    
    const projectId = `project_${Date.now()}`
    
    // 자동 스케줄링이 있으면 캘린더 이벤트 생성
    const calendarEvents = body.autoSchedule ? [
      {
        id: `${projectId}_planning`,
        title: `${body.title} - 기획`,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + body.autoSchedule.planning.duration * 7 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'planning',
        projectId
      },
      {
        id: `${projectId}_shooting`,
        title: `${body.title} - 촬영`,
        startDate: new Date(Date.now() + body.autoSchedule.planning.duration * 7 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + (body.autoSchedule.planning.duration * 7 + body.autoSchedule.shooting.duration) * 24 * 60 * 60 * 1000).toISOString(),
        type: 'shooting',
        projectId
      },
      {
        id: `${projectId}_editing`,
        title: `${body.title} - 편집`,
        startDate: new Date(Date.now() + (body.autoSchedule.planning.duration * 7 + body.autoSchedule.shooting.duration) * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() + (body.autoSchedule.planning.duration * 7 + body.autoSchedule.shooting.duration + body.autoSchedule.editing.duration * 7) * 24 * 60 * 60 * 1000).toISOString(),
        type: 'editing',
        projectId
      }
    ] : []
    
    const newProject = {
      id: projectId,
      title: body.title,
      description: body.description,
      status: 'draft',
      ownerId: 'current_user_id',
      members: [{
        userId: 'current_user_id',
        role: 'owner',
        joinedAt: new Date().toISOString()
      }],
      videos: [],
      tags: body.tags || [],
      settings: {
        isPublic: false,
        allowComments: true,
        allowDownload: false,
        requireApproval: true,
        watermarkEnabled: true,
        ...body.settings
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    
    return HttpResponse.json({
      success: true,
      data: {
        project: newProject,
        calendarEvents
      },
      message: '프로젝트가 성공적으로 생성되었습니다.'
    }, { status: 201 })
  }),

  // 팀원 초대 API (SendGrid 시뮬레이션)
  http.post('*/api/projects/:projectId/invite', async ({ params, request }) => {
    await delay(2000) // 이메일 전송 시간 시뮬레이션
    
    const { projectId } = params
    const body = await request.json() as {
      email: string
      role: 'editor' | 'viewer'
      message?: string
    }
    
    // 입력 검증
    if (!body.email?.trim() || !body.email.includes('@')) {
      return HttpResponse.json({
        success: false,
        error: '유효한 이메일 주소를 입력해주세요.'
      }, { status: 400 })
    }

    // 실패 시뮬레이션
    if (body.email === 'fail@test.com') {
      return HttpResponse.json({
        success: false,
        error: '이메일 전송에 실패했습니다.'
      }, { status: 500 })
    }
    
    // 쿨다운 시뮬레이션 (60초)
    const lastInviteTime = mockInviteCooldowns.get(body.email) || 0
    const now = Date.now()
    
    if (now - lastInviteTime < 60000) {
      const remainingTime = Math.ceil((60000 - (now - lastInviteTime)) / 1000)
      return HttpResponse.json({
        success: false,
        error: `${remainingTime}초 후에 다시 시도할 수 있습니다.`
      }, { status: 429 })
    }
    
    // 쿨다운 설정
    mockInviteCooldowns.set(body.email, now)
    
    const invitationId = `invite_${Date.now()}`
    
    return HttpResponse.json({
      success: true,
      data: {
        invitationId,
        email: body.email,
        projectId,
        expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString() // 7일 후
      },
      message: '초대 이메일이 성공적으로 전송되었습니다.'
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
  }),

  // Video Planning API 에러 핸들러들
  
  // LLM API 타임아웃 시뮬레이션
  http.post('*/api/video-planning/generate-stages', async () => {
    await delay(35000) // 35초 지연으로 타임아웃 시뮬레이션
    return HttpResponse.error()
  }),
  
  // 생성 실패 시뮬레이션
  http.post('*/api/video-planning/generate-shots', () => {
    return HttpResponse.json({
      success: false,
      error: 'LLM_GENERATION_FAILED',
      message: 'AI 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
    }, { status: 500 })
  }),
  
  // 스토리보드 생성 실패 시뮬레이션
  http.post('*/api/video-planning/generate-storyboard', () => {
    return HttpResponse.json({
      success: false,
      error: 'IMAGE_GENERATION_FAILED',
      message: '스토리보드 이미지 생성에 실패했습니다.'
    }, { status: 503 })
  }),
  
  // PDF 생성 실패 시뮬레이션
  http.post('*/api/video-planning/export-plan', () => {
    return HttpResponse.json({
      success: false,
      error: 'PDF_EXPORT_FAILED',
      message: 'PDF 생성 중 오류가 발생했습니다.'
    }, { status: 500 })
  }),
  
  // 프로젝트 저장 실패 시뮬레이션
  http.post('*/api/video-planning/save-project', () => {
    return HttpResponse.json({
      success: false,
      error: 'STORAGE_ERROR',
      message: '프로젝트 저장에 실패했습니다.'
    }, { status: 500 })
  }),
  
  // 네트워크 연결 실패 시뮬레이션
  http.get('*/api/video-planning/user-projects', () => {
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