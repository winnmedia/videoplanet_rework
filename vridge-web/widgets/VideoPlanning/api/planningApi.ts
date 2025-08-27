/**
 * @description Video Planning API Layer
 * @purpose Mock 데이터와 실제 API 호출을 위한 인터페이스 제공
 */

import type {
  VideoPlanningProject,
  VideoPlanningResponse,
  VideoPlanningListResponse,
  PlanningTemplate,
  PlanningTemplateResponse,
  PlanningCard,
  ScriptSection,
  Shot,
  TeamMember,
  PlanningComment,
  ProgressStats,
  ProjectType,
  PlanningStage,
  TaskStatus
} from '../model/types';

// Mock 데이터
const mockTeamMembers: TeamMember[] = [
  {
    id: 'user-director-001',
    name: '김감독',
    role: 'director',
    email: 'director@vlanet.co.kr',
    avatar: '/avatars/director-001.jpg',
    permissions: {
      canEdit: true,
      canComment: true,
      canApprove: true,
      canAssign: true
    },
    isOnline: true,
    lastSeen: '2025-08-26T14:00:00Z'
  },
  {
    id: 'user-producer-001',
    name: '박프로듀서',
    role: 'producer',
    email: 'producer@vlanet.co.kr',
    avatar: '/avatars/producer-001.jpg',
    permissions: {
      canEdit: true,
      canComment: true,
      canApprove: true,
      canAssign: true
    },
    isOnline: false,
    lastSeen: '2025-08-26T11:30:00Z'
  },
  {
    id: 'user-writer-001',
    name: '이작가',
    role: 'writer',
    email: 'writer@vlanet.co.kr',
    avatar: '/avatars/writer-001.jpg',
    permissions: {
      canEdit: true,
      canComment: true,
      canApprove: false,
      canAssign: false
    },
    isOnline: true,
    lastSeen: '2025-08-26T13:45:00Z'
  },
  {
    id: 'user-client-001',
    name: '최클라이언트',
    role: 'client',
    email: 'client@customer.com',
    avatar: '/avatars/client-001.jpg',
    permissions: {
      canEdit: false,
      canComment: true,
      canApprove: true,
      canAssign: false
    },
    isOnline: true,
    lastSeen: '2025-08-26T13:55:00Z'
  }
];

const mockScriptSections: ScriptSection[] = [
  {
    id: 'script-001',
    title: '오프닝 - 브랜드 소개',
    order: 1,
    type: 'intro',
    content: '화면에 VLANET 로고가 서서히 나타나며, 모던하고 신뢰감 있는 브랜드 이미지를 전달합니다. 배경음악은 경쾌하면서도 전문적인 느낌을 주어야 합니다.',
    duration: 15,
    notes: '로고 애니메이션은 2D 모션그래픽으로 제작, 브랜드 컬러 (#0031ff) 강조',
    characterCount: 68,
    estimatedReadingTime: 12
  },
  {
    id: 'script-002',
    title: '서비스 핵심 기능 소개',
    order: 2,
    type: 'scene',
    content: '비디오 제작부터 피드백까지, VLANET이 제공하는 통합 솔루션을 직관적인 UI와 함께 소개합니다. 실제 사용 시나리오를 기반으로 한 데모 영상을 통해 사용자 경험을 생생하게 전달합니다.',
    duration: 60,
    notes: '실제 제품 스크린샷 사용, 마우스 커서 애니메이션 추가',
    characterCount: 95,
    estimatedReadingTime: 18
  },
  {
    id: 'script-003',
    title: '고객 성공 사례',
    order: 3,
    type: 'interview',
    content: '"VLANET을 도입한 후 비디오 제작 효율성이 300% 향상되었습니다." - 실제 고객 인터뷰를 통해 신뢰성을 높이고 구체적인 성과를 제시합니다.',
    duration: 30,
    notes: '고객 인터뷰 영상, 통계 그래픽 오버레이 필요',
    characterCount: 76,
    estimatedReadingTime: 14
  },
  {
    id: 'script-004',
    title: 'CTA - 서비스 신청',
    order: 4,
    type: 'outro',
    content: '지금 바로 VLANET을 경험해보세요. 14일 무료 체험을 통해 여러분의 비디오 제작 프로세스를 혁신적으로 개선할 수 있습니다.',
    duration: 15,
    notes: 'CTA 버튼 강조, 웹사이트 URL 표시',
    characterCount: 58,
    estimatedReadingTime: 10
  }
];

const mockShots: Shot[] = [
  {
    id: 'shot-001',
    shotNumber: '001',
    title: 'VLANET 로고 애니메이션',
    description: '브랜드 로고가 서서히 나타나는 2D 애니메이션',
    shotType: 'close_up',
    angle: 'eye_level',
    movement: 'static',
    location: '포스트 프로덕션',
    duration: 8,
    equipment: ['After Effects', '2D 모션그래픽 툴'],
    lighting: '디지털 라이팅',
    props: ['VLANET 로고 파일', '브랜드 가이드라인'],
    cast: [],
    notes: '브랜드 컬러 (#0031ff) 사용, 3초 페이드인 효과',
    priority: 'high',
    status: 'completed',
    estimatedSetupTime: 0,
    scriptSectionId: 'script-001'
  },
  {
    id: 'shot-002',
    shotNumber: '002',
    title: '서비스 데모 - 대시보드',
    description: 'VLANET 대시보드 화면 스크린 레코딩',
    shotType: 'medium',
    angle: 'eye_level',
    movement: 'pan',
    location: '스튜디오',
    duration: 25,
    equipment: ['4K 모니터', 'OBS Studio', 'Mac Studio'],
    lighting: '스크린 라이트',
    props: ['마우스 커서 애니메이션'],
    cast: [],
    notes: '마우스 움직임 자연스럽게, UI 요소 강조 효과 추가',
    priority: 'high',
    status: 'in_progress',
    estimatedSetupTime: 15,
    scriptSectionId: 'script-002'
  },
  {
    id: 'shot-003',
    shotNumber: '003',
    title: '고객 인터뷰',
    description: '실제 고객 인터뷰 촬영',
    shotType: 'medium',
    angle: 'eye_level',
    movement: 'static',
    location: '고객사 사무실',
    duration: 20,
    equipment: ['Sony FX3', '85mm 렌즈', '무선 마이크', '조명 키트'],
    lighting: '키 라이트 + 필 라이트 + 백라이트',
    props: ['VLANET 브랜딩 소품'],
    cast: ['김대표 (고객사 CEO)'],
    notes: '편안하고 신뢰감 있는 분위기, 배경에 회사 로고 살짝 보이게',
    priority: 'medium',
    status: 'todo',
    assignedTo: 'user-director-001',
    estimatedSetupTime: 45,
    scriptSectionId: 'script-003'
  },
  {
    id: 'shot-004',
    shotNumber: '004',
    title: 'CTA 그래픽',
    description: '서비스 신청 버튼과 URL 그래픽',
    shotType: 'close_up',
    angle: 'eye_level',
    movement: 'static',
    location: '포스트 프로덕션',
    duration: 10,
    equipment: ['After Effects', '타이포그래피 툴'],
    lighting: '디지털',
    props: ['CTA 버튼 디자인', 'URL 텍스트'],
    cast: [],
    notes: '버튼 호버 효과, 긴급감 있는 컬러 사용',
    priority: 'medium',
    status: 'todo',
    estimatedSetupTime: 0,
    scriptSectionId: 'script-004'
  }
];

const mockPlanningCards: PlanningCard[] = [
  {
    id: 'card-001',
    title: '클라이언트 컨셉 미팅',
    description: 'VLANET 브랜드 가이드라인과 타겟 오디언스 확정',
    stage: 'concept',
    type: 'milestone',
    status: 'completed',
    priority: 'high',
    assignedTo: mockTeamMembers[0], // 김감독
    dueDate: '2025-08-22T18:00:00Z',
    tags: ['브랜딩', '기획'],
    createdBy: 'user-director-001',
    createdAt: '2025-08-20T09:00:00Z',
    updatedAt: '2025-08-22T16:30:00Z',
    completedAt: '2025-08-22T16:30:00Z'
  },
  {
    id: 'card-002',
    title: '대본 초안 작성',
    description: '120초 브랜드 홍보 영상 대본 작성 완료',
    stage: 'script',
    type: 'task',
    status: 'completed',
    priority: 'high',
    assignedTo: mockTeamMembers[2], // 이작가
    dueDate: '2025-08-26T18:00:00Z',
    tags: ['대본', '스토리텔링'],
    estimatedHours: 8,
    actualHours: 6,
    createdBy: 'user-director-001',
    createdAt: '2025-08-23T10:00:00Z',
    updatedAt: '2025-08-26T14:00:00Z',
    completedAt: '2025-08-26T14:00:00Z'
  },
  {
    id: 'card-003',
    title: '스토리보드 제작',
    description: '주요 씬별 스토리보드 및 컨셉 이미지 제작',
    stage: 'storyboard',
    type: 'task',
    status: 'in_progress',
    priority: 'high',
    assignedTo: mockTeamMembers[0], // 김감독
    dueDate: '2025-08-28T18:00:00Z',
    tags: ['스토리보드', '비주얼'],
    estimatedHours: 12,
    actualHours: 4,
    createdBy: 'user-director-001',
    createdAt: '2025-08-26T09:00:00Z',
    updatedAt: '2025-08-26T14:00:00Z'
  },
  {
    id: 'card-004',
    title: '촬영 장비 예약',
    description: 'Sony FX3, 렌즈킷, 조명장비 예약 완료',
    stage: 'equipment',
    type: 'task',
    status: 'todo',
    priority: 'medium',
    assignedTo: mockTeamMembers[1], // 박프로듀서
    dueDate: '2025-08-30T18:00:00Z',
    tags: ['장비', '예약'],
    estimatedHours: 2,
    createdBy: 'user-producer-001',
    createdAt: '2025-08-26T11:00:00Z',
    updatedAt: '2025-08-26T11:00:00Z'
  },
  {
    id: 'card-005',
    title: '고객사 촬영 일정 조율',
    description: '인터뷰 촬영을 위한 고객사 방문 일정 확정',
    stage: 'schedule',
    type: 'task',
    status: 'todo',
    priority: 'urgent',
    assignedTo: mockTeamMembers[1], // 박프로듀서
    dueDate: '2025-08-27T18:00:00Z',
    tags: ['일정', '고객사'],
    dependencies: ['card-004'],
    estimatedHours: 1,
    createdBy: 'user-producer-001',
    createdAt: '2025-08-26T13:00:00Z',
    updatedAt: '2025-08-26T13:00:00Z'
  }
];

const mockComments: PlanningComment[] = [
  {
    id: 'comment-001',
    cardId: 'card-002',
    content: '대본이 정말 잘 나왔네요! 특히 고객 성공사례 부분이 인상적입니다.',
    author: mockTeamMembers[0], // 김감독
    createdAt: '2025-08-26T14:15:00Z',
    mentions: [],
    isResolved: false
  },
  {
    id: 'comment-002',
    scriptSectionId: 'script-003',
    content: '고객 인터뷰 부분에서 구체적인 수치를 더 강조하면 어떨까요? 300% 향상이라는 부분을 그래픽으로도 표현해봅시다.',
    author: mockTeamMembers[3], // 최클라이언트
    createdAt: '2025-08-26T14:30:00Z',
    mentions: ['user-director-001', 'user-writer-001'],
    isResolved: false
  },
  {
    id: 'comment-003',
    shotId: 'shot-002',
    content: 'UI 데모 촬영시 마우스 움직임이 너무 빠르면 시청자가 따라가기 어려울 수 있습니다. 좀 더 천천히 진행해주세요.',
    author: mockTeamMembers[2], // 이작가
    createdAt: '2025-08-26T15:00:00Z',
    mentions: ['user-director-001'],
    isResolved: true
  }
];

const mockProgressStats: ProgressStats = {
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
    },
    {
      id: 'milestone-002', 
      title: '촬영 완료',
      dueDate: '2025-09-05T18:00:00Z',
      status: 'todo',
      progress: 0
    },
    {
      id: 'milestone-003',
      title: '후반작업 완료',
      dueDate: '2025-09-08T18:00:00Z', 
      status: 'todo',
      progress: 0
    }
  ]
};

const mockProject: VideoPlanningProject = {
  id: 'project-001',
  title: 'VLANET 브랜드 홍보 영상',
  description: 'VLANET 서비스의 핵심 가치와 차별점을 효과적으로 전달하는 120초 브랜드 홍보 영상',
  type: 'brand_video',
  currentStage: 'script',
  status: 'active',
  priority: 'high',
  client: {
    id: 'client-vlanet-001',
    name: 'VLANET',
    company: 'VLANET Corporation',
    email: 'marketing@vlanet.co.kr'
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
  comments: mockComments,
  versions: [
    {
      id: 'version-001',
      version: 'v1.0',
      title: '초기 버전',
      description: '클라이언트 미팅 후 첫 번째 버전',
      createdBy: 'user-director-001',
      createdAt: '2025-08-20T18:00:00Z',
      isPublished: false,
      isDraft: true,
      changes: []
    },
    {
      id: 'version-002',
      version: 'v1.2',
      title: '대본 수정 반영',
      description: '클라이언트 피드백 반영하여 대본 수정',
      createdBy: 'user-writer-001',
      createdAt: '2025-08-26T14:00:00Z',
      isPublished: true,
      isDraft: false,
      changes: [
        {
          type: 'script',
          description: '고객 성공사례 섹션 내용 구체화',
          author: 'user-writer-001',
          timestamp: '2025-08-26T14:00:00Z'
        }
      ]
    }
  ],
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
};

const mockTemplates: PlanningTemplate[] = [
  {
    id: 'template-brand-001',
    name: '브랜드 홍보 영상',
    type: 'brand_video',
    description: '기업 또는 서비스의 브랜드 가치를 전달하는 홍보 영상 템플릿',
    estimatedDuration: 120,
    difficulty: 'intermediate',
    defaultStages: ['concept', 'script', 'storyboard', 'shot_list', 'schedule', 'equipment'],
    scriptSections: [
      {
        id: 'template-section-001',
        title: '브랜드 소개',
        order: 1,
        type: 'intro',
        content: '브랜드 로고와 핵심 메시지 전달',
        duration: 15,
        characterCount: 0,
        estimatedReadingTime: 0
      },
      {
        id: 'template-section-002',
        title: '핵심 가치 제시',
        order: 2,
        type: 'scene',
        content: '제품/서비스의 주요 특징과 차별점',
        duration: 60,
        characterCount: 0,
        estimatedReadingTime: 0
      },
      {
        id: 'template-section-003',
        title: '고객 증언',
        order: 3,
        type: 'interview',
        content: '실제 고객의 성공 사례나 추천',
        duration: 30,
        characterCount: 0,
        estimatedReadingTime: 0
      },
      {
        id: 'template-section-004',
        title: '행동 촉구',
        order: 4,
        type: 'outro',
        content: 'CTA와 연락처 정보',
        duration: 15,
        characterCount: 0,
        estimatedReadingTime: 0
      }
    ],
    suggestedShotTypes: ['establishing', 'medium', 'close_up', 'insert'],
    requiredRoles: ['director', 'producer', 'writer', 'cinematographer'],
    estimatedBudget: {
      min: 3000000,
      max: 8000000,
      currency: 'KRW'
    }
  },
  {
    id: 'template-tutorial-001',
    name: '튜토리얼 영상',
    type: 'tutorial',
    description: '제품 사용법이나 서비스 이용 가이드 영상 템플릿',
    estimatedDuration: 300,
    difficulty: 'beginner',
    defaultStages: ['concept', 'script', 'shot_list', 'schedule'],
    scriptSections: [
      {
        id: 'template-section-005',
        title: '개요 설명',
        order: 1,
        type: 'intro',
        content: '튜토리얼 목표와 학습 내용 소개',
        duration: 30,
        characterCount: 0,
        estimatedReadingTime: 0
      },
      {
        id: 'template-section-006',
        title: '단계별 설명',
        order: 2,
        type: 'scene',
        content: '실제 사용 과정을 단계별로 시연',
        duration: 240,
        characterCount: 0,
        estimatedReadingTime: 0
      },
      {
        id: 'template-section-007',
        title: '정리 및 팁',
        order: 3,
        type: 'outro',
        content: '핵심 포인트 정리와 추가 팁',
        duration: 30,
        characterCount: 0,
        estimatedReadingTime: 0
      }
    ],
    suggestedShotTypes: ['medium', 'close_up', 'insert'],
    requiredRoles: ['director', 'writer'],
    estimatedBudget: {
      min: 1000000,
      max: 3000000,
      currency: 'KRW'
    }
  }
];

// API 함수들
export class VideoPlanningApi {
  private static readonly API_BASE = '/api/video-planning';
  private static readonly MOCK_DELAY = 100; // 테스트를 위해 지연 시간 단축

  /**
   * 프로젝트 목록 조회
   */
  static async getProjects(
    page: number = 1,
    pageSize: number = 10,
    filters?: {
      status?: VideoPlanningProject['status'];
      type?: ProjectType;
      assignedTo?: string;
    }
  ): Promise<VideoPlanningListResponse> {
    await new Promise(resolve => setTimeout(resolve, this.MOCK_DELAY));

    // Mock 구현 - 실제로는 API 호출
    let projects = [mockProject];

    if (filters) {
      if (filters.status) {
        projects = projects.filter(p => p.status === filters.status);
      }
      if (filters.type) {
        projects = projects.filter(p => p.type === filters.type);
      }
      if (filters.assignedTo) {
        projects = projects.filter(p => 
          p.teamMembers.some(member => member.id === filters.assignedTo)
        );
      }
    }

    return {
      projects,
      total: projects.length,
      page,
      pageSize,
      hasMore: false
    };
  }

  /**
   * 특정 프로젝트 조회
   */
  static async getProject(projectId: string): Promise<VideoPlanningResponse> {
    await new Promise(resolve => setTimeout(resolve, this.MOCK_DELAY));

    if (projectId === 'project-001') {
      return {
        project: mockProject,
        success: true
      };
    }

    if (projectId === 'loading-project') {
      await new Promise(resolve => setTimeout(resolve, 200)); // 테스트 시간 단축
      return {
        project: mockProject,
        success: true
      };
    }

    if (projectId === 'error-project') {
      throw new Error('프로젝트를 불러올 수 없습니다');
    }

    if (projectId === 'network-error-project') {
      throw new Error('네트워크 연결을 확인해주세요');
    }

    if (projectId === 'restricted-project') {
      throw new Error('이 프로젝트에 접근할 권한이 없습니다');
    }

    if (projectId === 'empty-project') {
      return {
        project: {
          ...mockProject,
          id: 'empty-project',
          planningCards: [],
          shots: [],
          script: { ...mockProject.script, sections: [] },
          comments: []
        },
        success: true
      };
    }

    if (projectId === 'invalid-project') {
      throw new Error('프로젝트를 찾을 수 없습니다');
    }

    throw new Error('프로젝트를 찾을 수 없습니다');
  }

  /**
   * 프로젝트 생성
   */
  static async createProject(
    project: Omit<VideoPlanningProject, 'id' | 'createdAt' | 'updatedAt' | 'lastActivity'>
  ): Promise<VideoPlanningResponse> {
    await new Promise(resolve => setTimeout(resolve, this.MOCK_DELAY));

    const newProject: VideoPlanningProject = {
      ...project,
      id: `project-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    return {
      project: newProject,
      success: true,
      message: '프로젝트가 성공적으로 생성되었습니다'
    };
  }

  /**
   * 프로젝트 업데이트
   */
  static async updateProject(
    projectId: string,
    updates: Partial<VideoPlanningProject>
  ): Promise<VideoPlanningResponse> {
    await new Promise(resolve => setTimeout(resolve, this.MOCK_DELAY));

    const updatedProject = {
      ...mockProject,
      ...updates,
      id: projectId,
      updatedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString()
    };

    return {
      project: updatedProject,
      success: true,
      message: '프로젝트가 성공적으로 업데이트되었습니다'
    };
  }

  /**
   * 프로젝트 삭제
   */
  static async deleteProject(projectId: string): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, this.MOCK_DELAY));

    return {
      success: true,
      message: '프로젝트가 성공적으로 삭제되었습니다'
    };
  }

  /**
   * 기획 템플릿 목록 조회
   */
  static async getTemplates(): Promise<PlanningTemplateResponse> {
    await new Promise(resolve => setTimeout(resolve, this.MOCK_DELAY));

    return {
      templates: mockTemplates,
      success: true
    };
  }

  /**
   * 진행률 통계 조회
   */
  static async getProgressStats(projectId: string): Promise<ProgressStats> {
    await new Promise(resolve => setTimeout(resolve, this.MOCK_DELAY));

    return mockProgressStats;
  }

  /**
   * 팀 멤버 초대
   */
  static async inviteTeamMember(
    projectId: string,
    email: string,
    role: TeamMember['role']
  ): Promise<{ success: boolean; message: string }> {
    await new Promise(resolve => setTimeout(resolve, this.MOCK_DELAY));

    return {
      success: true,
      message: `${email}에게 초대 이메일을 발송했습니다`
    };
  }

  /**
   * 댓글 추가
   */
  static async addComment(
    projectId: string,
    comment: Omit<PlanningComment, 'id' | 'createdAt' | 'author'>
  ): Promise<PlanningComment> {
    await new Promise(resolve => setTimeout(resolve, this.MOCK_DELAY));

    const newComment: PlanningComment = {
      ...comment,
      id: `comment-${Date.now()}`,
      author: mockTeamMembers[0], // 현재 사용자
      createdAt: new Date().toISOString()
    };

    return newComment;
  }

  /**
   * 프로젝트 내보내기
   */
  static async exportProject(
    projectId: string,
    format: 'pdf' | 'docx' | 'csv' | 'json'
  ): Promise<{ success: boolean; downloadUrl: string; message: string }> {
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      success: true,
      downloadUrl: `/api/exports/${projectId}.${format}`,
      message: `${format.toUpperCase()} 파일로 내보내기가 완료되었습니다`
    };
  }
}

// 유틸리티 함수들
export const planningUtils = {
  /**
   * 시간 형식 변환 (초 → "MM:SS" 또는 "HH:MM:SS")
   */
  formatDuration: (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  },

  /**
   * 상대 시간 계산 ("3일 전", "2시간 후" 등)
   */
  getRelativeTime: (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInSeconds < 60) return '방금 전';
    if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    if (diffInDays < 7) return `${diffInDays}일 전`;
    
    return date.toLocaleDateString('ko-KR');
  },

  /**
   * 진행률 계산
   */
  calculateProgress: (completed: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  },

  /**
   * 예산 사용률 계산
   */
  calculateBudgetUsage: (spent: number, total: number): number => {
    if (total === 0) return 0;
    return Math.round((spent / total) * 100);
  },

  /**
   * 한국어 숫자 포맷팅 (1,000,000 → "100만")
   */
  formatKoreanCurrency: (amount: number): string => {
    if (amount >= 100000000) {
      return `${Math.floor(amount / 100000000)}억${amount % 100000000 !== 0 ? ` ${Math.floor((amount % 100000000) / 10000)}만` : ''}원`;
    } else if (amount >= 10000) {
      return `${Math.floor(amount / 10000)}만원`;
    } else {
      return `${amount.toLocaleString('ko-KR')}원`;
    }
  }
};