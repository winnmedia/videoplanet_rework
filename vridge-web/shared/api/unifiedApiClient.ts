/**
 * Unified API Client for All Widgets
 * 4개 위젯에서 공통으로 사용하는 통합 API 클라이언트
 * 실제 API와의 통신을 담당하며, 개발 중에는 모킹 시스템 사용
 */

import { 
  mockApiCall, 
  MockWebSocket, 
  mockFileUpload,
  cachedMockApiCall,
  updateMockConfig,
  type ApiResponse,
  type PaginatedResponse,
  type MockUploadProgress
} from './mockSystem'

// 공통 API 타입 정의
export interface User {
  id: string
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'manager' | 'editor' | 'viewer'
  lastActive: string
}

export interface Project {
  id: string
  title: string
  description: string
  status: 'planning' | 'shooting' | 'editing' | 'review' | 'completed' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'urgent'
  progress: number
  startDate: string
  endDate?: string
  teamMembers: User[]
  tags: string[]
  budget?: {
    total: number
    used: number
    currency: string
  }
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: string
  content: string
  author: User
  timestamp: string
  edited?: boolean
  replies: Comment[]
  resolved: boolean
  priority: 'low' | 'medium' | 'high'
  mentions: string[]
}

export interface Video {
  id: string
  title: string
  projectId: string
  url: string
  thumbnail?: string
  duration: number
  resolution: {
    width: number
    height: number
  }
  size: number
  format: string
  uploadedAt: string
  metadata: {
    fps: number
    bitrate: number
    codec: string
  }
}

export interface Activity {
  id: string
  type: 'project_created' | 'file_uploaded' | 'comment_added' | 'status_changed' | 'phase_completed'
  title: string
  description: string
  userId: string
  userName: string
  projectId?: string
  projectTitle?: string
  timestamp: string
  metadata?: Record<string, any>
}

// API 요청/응답 타입
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  search?: string
}

export interface CreateProjectRequest {
  title: string
  description: string
  teamMembers: string[]
  startDate: string
  endDate?: string
  priority: Project['priority']
  tags: string[]
  budget?: Project['budget']
}

export interface UpdateProjectRequest extends Partial<CreateProjectRequest> {
  status?: Project['status']
  progress?: number
}

export interface CreateCommentRequest {
  content: string
  projectId?: string
  videoId?: string
  timestamp?: number // 비디오 댓글의 경우 타임스탬프
  coordinates?: { x: number; y: number } // 비디오 댓글의 좌표
  priority: Comment['priority']
  mentions?: string[]
  parentId?: string // 답글의 경우
}

// Mock 데이터
const MOCK_USERS: User[] = [
  {
    id: 'user-1',
    name: '김담당',
    email: 'kim@example.com',
    avatar: '/avatars/kim.jpg',
    role: 'manager',
    lastActive: '2025-08-26T12:30:00Z'
  },
  {
    id: 'user-2',
    name: '박편집',
    email: 'park@example.com',
    role: 'editor',
    lastActive: '2025-08-26T11:45:00Z'
  },
  {
    id: 'user-3',
    name: '이기획',
    email: 'lee@example.com',
    role: 'manager',
    lastActive: '2025-08-26T10:15:00Z'
  },
  {
    id: 'user-4',
    name: '최검토',
    email: 'choi@example.com',
    role: 'admin',
    lastActive: '2025-08-26T09:30:00Z'
  }
]

const MOCK_PROJECTS: Project[] = [
  {
    id: 'project-1',
    title: '브랜드 홍보 영상',
    description: '새로운 브랜드 런칭을 위한 홍보 영상 제작',
    status: 'shooting',
    priority: 'high',
    progress: 65,
    startDate: '2025-08-20',
    endDate: '2025-09-15',
    teamMembers: MOCK_USERS.slice(0, 3),
    tags: ['브랜드', '홍보', '런칭'],
    budget: {
      total: 5000000,
      used: 2800000,
      currency: 'KRW'
    },
    createdAt: '2025-08-20T09:00:00Z',
    updatedAt: '2025-08-26T10:30:00Z'
  },
  {
    id: 'project-2',
    title: '제품 소개 영상',
    description: '신제품 기능 및 특징을 소개하는 영상',
    status: 'editing',
    priority: 'medium',
    progress: 80,
    startDate: '2025-08-15',
    endDate: '2025-08-30',
    teamMembers: MOCK_USERS.slice(1, 4),
    tags: ['제품', '소개', '기능'],
    budget: {
      total: 3000000,
      used: 2400000,
      currency: 'KRW'
    },
    createdAt: '2025-08-15T09:00:00Z',
    updatedAt: '2025-08-26T09:15:00Z'
  }
]

/**
 * 통합 API 클라이언트 클래스
 */
export class UnifiedApiClient {
  private baseUrl: string
  private headers: Record<string, string>
  private wsClient?: MockWebSocket

  constructor(baseUrl = '/api', headers: Record<string, string> = {}) {
    this.baseUrl = baseUrl
    this.headers = {
      'Content-Type': 'application/json',
      ...headers
    }

    // 개발 환경에서는 모킹 시스템 활성화
    if (process.env.NODE_ENV === 'development') {
      updateMockConfig({
        baseDelay: 300,
        randomDelayRange: 200,
        errorRate: 0.05, // 5% 에러율
        enableLogging: true
      })
    }
  }

  // =================== 사용자 관리 ===================

  /**
   * 모든 사용자 조회
   */
  async getUsers(params: PaginationParams = {}): Promise<ApiResponse<PaginatedResponse<User>>> {
    return mockApiCall(() => ({
      items: MOCK_USERS.slice(0, params.limit || 10),
      pagination: {
        page: params.page || 1,
        limit: params.limit || 10,
        total: MOCK_USERS.length,
        totalPages: Math.ceil(MOCK_USERS.length / (params.limit || 10)),
        hasNext: false,
        hasPrev: false
      }
    }))
  }

  /**
   * 현재 사용자 정보 조회
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    return cachedMockApiCall('current-user', MOCK_USERS[0], { cacheTtl: 300000 })
  }

  /**
   * 사용자 정보 업데이트
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<ApiResponse<User>> {
    return mockApiCall(() => ({
      ...MOCK_USERS[0],
      ...updates,
      id: userId
    }))
  }

  // =================== 프로젝트 관리 ===================

  /**
   * 프로젝트 목록 조회
   */
  async getProjects(params: PaginationParams = {}): Promise<ApiResponse<PaginatedResponse<Project>>> {
    return mockApiCall(() => ({
      items: MOCK_PROJECTS.slice(0, params.limit || 10),
      pagination: {
        page: params.page || 1,
        limit: params.limit || 10,
        total: MOCK_PROJECTS.length,
        totalPages: Math.ceil(MOCK_PROJECTS.length / (params.limit || 10)),
        hasNext: false,
        hasPrev: false
      }
    }))
  }

  /**
   * 특정 프로젝트 조회
   */
  async getProject(projectId: string): Promise<ApiResponse<Project>> {
    return cachedMockApiCall(
      `project-${projectId}`,
      () => MOCK_PROJECTS.find(p => p.id === projectId) || MOCK_PROJECTS[0],
      { cacheTtl: 120000 }
    )
  }

  /**
   * 프로젝트 생성
   */
  async createProject(data: CreateProjectRequest): Promise<ApiResponse<Project>> {
    return mockApiCall(() => ({
      id: `project-${Date.now()}`,
      ...data,
      status: 'planning' as const,
      progress: 0,
      teamMembers: data.teamMembers.map(id => 
        MOCK_USERS.find(u => u.id === id) || MOCK_USERS[0]
      ),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }), { delay: 800 })
  }

  /**
   * 프로젝트 업데이트
   */
  async updateProject(projectId: string, updates: UpdateProjectRequest): Promise<ApiResponse<Project>> {
    const updatedProject = {
      ...MOCK_PROJECTS[0],
      ...updates,
      id: projectId,
      updatedAt: new Date().toISOString()
    };
    
    // teamMembers가 string[]인 경우 User[]로 변환
    if (updatedProject.teamMembers && Array.isArray(updatedProject.teamMembers) && 
        updatedProject.teamMembers.length > 0 && typeof updatedProject.teamMembers[0] === 'string') {
      updatedProject.teamMembers = MOCK_USERS.slice(0, updatedProject.teamMembers.length);
    }
    
    return mockApiCall(() => updatedProject as Project, { delay: 500 })
  }

  /**
   * 프로젝트 삭제
   */
  async deleteProject(projectId: string): Promise<ApiResponse<{ success: boolean }>> {
    return mockApiCall({ success: true }, { delay: 300 })
  }

  // =================== 댓글 관리 ===================

  /**
   * 댓글 목록 조회
   */
  async getComments(projectId?: string, videoId?: string): Promise<ApiResponse<Comment[]>> {
    const mockComments: Comment[] = [
      {
        id: 'comment-1',
        content: '이 부분 수정이 필요해 보입니다.',
        author: MOCK_USERS[0],
        timestamp: '2025-08-26T10:30:00Z',
        replies: [],
        resolved: false,
        priority: 'medium',
        mentions: []
      }
    ]

    return mockApiCall(mockComments)
  }

  /**
   * 댓글 생성
   */
  async createComment(data: CreateCommentRequest): Promise<ApiResponse<Comment>> {
    return mockApiCall(() => ({
      id: `comment-${Date.now()}`,
      content: data.content,
      author: MOCK_USERS[0],
      timestamp: new Date().toISOString(),
      replies: [],
      resolved: false,
      priority: data.priority,
      mentions: data.mentions || []
    }), { delay: 400 })
  }

  /**
   * 댓글 업데이트
   */
  async updateComment(commentId: string, content: string): Promise<ApiResponse<Comment>> {
    return mockApiCall(() => ({
      id: commentId,
      content,
      author: MOCK_USERS[0],
      timestamp: '2025-08-26T10:30:00Z',
      edited: true,
      replies: [],
      resolved: false,
      priority: 'medium',
      mentions: []
    }))
  }

  /**
   * 댓글 해결 상태 변경
   */
  async resolveComment(commentId: string, resolved: boolean): Promise<ApiResponse<Comment>> {
    return mockApiCall(() => ({
      id: commentId,
      content: '댓글 내용',
      author: MOCK_USERS[0],
      timestamp: '2025-08-26T10:30:00Z',
      replies: [],
      resolved,
      priority: 'medium',
      mentions: []
    }))
  }

  // =================== 파일/비디오 관리 ===================

  /**
   * 비디오 목록 조회
   */
  async getVideos(projectId?: string): Promise<ApiResponse<Video[]>> {
    const mockVideos: Video[] = [
      {
        id: 'video-1',
        title: '메인 영상',
        projectId: projectId || 'project-1',
        url: '/videos/main.mp4',
        thumbnail: '/thumbnails/main.jpg',
        duration: 180,
        resolution: { width: 1920, height: 1080 },
        size: 52428800, // 50MB
        format: 'mp4',
        uploadedAt: '2025-08-26T09:00:00Z',
        metadata: {
          fps: 30,
          bitrate: 2500,
          codec: 'h264'
        }
      }
    ]

    return mockApiCall(mockVideos)
  }

  /**
   * 파일 업로드
   */
  async uploadFile(
    file: File,
    projectId?: string,
    onProgress?: (progress: MockUploadProgress) => void
  ): Promise<ApiResponse<{ fileId: string; url: string }>> {
    return mockFileUpload(file, onProgress)
  }

  // =================== 실시간 기능 ===================

  /**
   * WebSocket 연결 설정
   */
  async connectWebSocket(): Promise<MockWebSocket> {
    if (!this.wsClient) {
      this.wsClient = new MockWebSocket({ connectionDelay: 500 })
    }

    await this.wsClient.connect()
    return this.wsClient
  }

  /**
   * WebSocket 연결 해제
   */
  disconnectWebSocket(): void {
    if (this.wsClient) {
      this.wsClient.disconnect()
      this.wsClient = undefined
    }
  }

  // =================== 통계 및 분석 ===================

  /**
   * 대시보드 통계 조회
   */
  async getDashboardStats(): Promise<ApiResponse<{
    totalProjects: number
    activeProjects: number
    completedProjects: number
    totalTeamMembers: number
    pendingTasks: number
  }>> {
    return cachedMockApiCall('dashboard-stats', {
      totalProjects: 12,
      activeProjects: 5,
      completedProjects: 7,
      totalTeamMembers: 15,
      pendingTasks: 23
    }, { cacheTtl: 60000 }) // 1분 캐시
  }

  /**
   * 활동 내역 조회
   */
  async getActivities(limit = 10): Promise<ApiResponse<Activity[]>> {
    const mockActivities: Activity[] = [
      {
        id: 'activity-1',
        type: 'phase_completed',
        title: '기획 단계 완료',
        description: '브랜드 홍보 영상 프로젝트의 기획 단계가 완료되었습니다.',
        userId: 'user-1',
        userName: '김담당',
        projectId: 'project-1',
        projectTitle: '브랜드 홍보 영상',
        timestamp: '2025-08-26T10:30:00Z'
      }
    ]

    return mockApiCall(mockActivities.slice(0, limit))
  }

  // =================== 유틸리티 메서드 ===================

  /**
   * API 상태 확인
   */
  async healthCheck(): Promise<ApiResponse<{ status: string; timestamp: string }>> {
    return mockApiCall({
      status: 'healthy',
      timestamp: new Date().toISOString()
    }, { delay: 100, disableErrors: true })
  }

  /**
   * 인증 토큰 갱신
   */
  async refreshToken(): Promise<ApiResponse<{ token: string; expiresAt: string }>> {
    return mockApiCall({
      token: `mock_token_${Date.now()}`,
      expiresAt: new Date(Date.now() + 3600000).toISOString() // 1시간 후
    }, { delay: 200 })
  }

  /**
   * 검색
   */
  async search(query: string, filters: Record<string, any> = {}): Promise<ApiResponse<{
    projects: Project[]
    users: User[]
    activities: Activity[]
  }>> {
    return mockApiCall({
      projects: MOCK_PROJECTS.filter(p => 
        p.title.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
      ),
      users: MOCK_USERS.filter(u => 
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.email.toLowerCase().includes(query.toLowerCase())
      ),
      activities: []
    }, { delay: 600 })
  }
}

// 싱글톤 인스턴스
export const apiClient = new UnifiedApiClient()

export default apiClient