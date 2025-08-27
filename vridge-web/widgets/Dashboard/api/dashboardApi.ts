/**
 * Dashboard API Layer
 * 대시보드 데이터 페칭 및 관련 API 호출을 담당
 * FSD 아키텍처에서 API 레이어는 외부 의존성을 격리하는 역할
 */

import type { 
  DashboardData, 
  ProjectStatus, 
  ActivityItem, 
  DashboardStats,
  MockProjectData 
} from '../model/types'

// Mock 데이터 - 실제 API 구현 전까지 사용
const MOCK_STATS: DashboardStats = {
  totalProjects: 12,
  activeProjects: 5,
  completedProjects: 7,
  totalTeamMembers: 15,
  pendingTasks: 23
}

const MOCK_PROJECTS: ProjectStatus[] = [
  {
    id: 'project-1',
    title: '브랜드 홍보 영상',
    status: 'shooting',
    progress: 65,
    startDate: '2025-08-20',
    endDate: '2025-09-15',
    priority: 'high',
    teamMembers: 4
  },
  {
    id: 'project-2',
    title: '제품 소개 영상',
    status: 'editing',
    progress: 80,
    startDate: '2025-08-15',
    endDate: '2025-08-30',
    priority: 'medium',
    teamMembers: 3
  },
  {
    id: 'project-3',
    title: '이벤트 하이라이트',
    status: 'planning',
    progress: 25,
    startDate: '2025-08-25',
    endDate: '2025-09-10',
    priority: 'low',
    teamMembers: 2
  }
]

const MOCK_ACTIVITIES: ActivityItem[] = [
  {
    id: 'activity-1',
    type: 'phase_completed',
    title: '기획 단계 완료',
    description: '브랜드 홍보 영상 프로젝트의 기획 단계가 완료되었습니다.',
    timestamp: '2025-08-26T10:30:00Z',
    userId: 'user-1',
    userName: '김담당',
    projectId: 'project-1',
    projectTitle: '브랜드 홍보 영상'
  },
  {
    id: 'activity-2',
    type: 'file_uploaded',
    title: '파일 업로드',
    description: '새로운 영상 소스가 업로드되었습니다.',
    timestamp: '2025-08-26T09:15:00Z',
    userId: 'user-2',
    userName: '박편집',
    projectId: 'project-2',
    projectTitle: '제품 소개 영상'
  },
  {
    id: 'activity-3',
    type: 'project_created',
    title: '새 프로젝트 생성',
    description: '이벤트 하이라이트 프로젝트가 새로 생성되었습니다.',
    timestamp: '2025-08-26T08:45:00Z',
    userId: 'user-3',
    userName: '이기획',
    projectId: 'project-3',
    projectTitle: '이벤트 하이라이트'
  },
  {
    id: 'activity-4',
    type: 'status_changed',
    title: '상태 변경',
    description: '제품 소개 영상 프로젝트가 편집 단계로 이동했습니다.',
    timestamp: '2025-08-25T16:20:00Z',
    userId: 'user-1',
    userName: '김담당',
    projectId: 'project-2',
    projectTitle: '제품 소개 영상'
  },
  {
    id: 'activity-5',
    type: 'comment_added',
    title: '댓글 추가',
    description: '브랜드 홍보 영상에 새로운 피드백이 추가되었습니다.',
    timestamp: '2025-08-25T14:10:00Z',
    userId: 'user-4',
    userName: '최검토',
    projectId: 'project-1',
    projectTitle: '브랜드 홍보 영상'
  }
]

// 모의 네트워크 지연 시뮬레이션
const simulateDelay = (ms: number = 500) => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * 대시보드 전체 데이터 조회
 */
export const fetchDashboardData = async (): Promise<DashboardData> => {
  try {
    await simulateDelay(800) // 실제 API 호출 시뮬레이션

    return {
      stats: MOCK_STATS,
      recentProjects: MOCK_PROJECTS.slice(0, 5), // 최근 5개만
      recentActivity: MOCK_ACTIVITIES.slice(0, 10), // 최근 10개만
      upcomingDeadlines: MOCK_PROJECTS.filter(p => {
        if (!p.endDate) return false
        const endDate = new Date(p.endDate)
        const now = new Date()
        const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        return diffDays <= 7 && diffDays > 0 // 일주일 이내 마감
      })
    }
  } catch (error) {
    console.error('Dashboard data fetch failed:', error)
    throw new Error('대시보드 데이터를 불러올 수 없습니다.')
  }
}

/**
 * 프로젝트 목록 조회
 */
export const fetchProjects = async (limit?: number): Promise<ProjectStatus[]> => {
  try {
    await simulateDelay(300)
    
    return limit ? MOCK_PROJECTS.slice(0, limit) : MOCK_PROJECTS
  } catch (error) {
    console.error('Projects fetch failed:', error)
    throw new Error('프로젝트 목록을 불러올 수 없습니다.')
  }
}

/**
 * 최근 활동 조회
 */
export const fetchRecentActivities = async (limit: number = 10): Promise<ActivityItem[]> => {
  try {
    await simulateDelay(200)
    
    return MOCK_ACTIVITIES.slice(0, limit)
  } catch (error) {
    console.error('Activities fetch failed:', error)
    throw new Error('활동 내역을 불러올 수 없습니다.')
  }
}

/**
 * 프로젝트 통계 조회
 */
export const fetchProjectStats = async (): Promise<DashboardStats> => {
  try {
    await simulateDelay(150)
    
    return MOCK_STATS
  } catch (error) {
    console.error('Stats fetch failed:', error)
    throw new Error('통계 데이터를 불러올 수 없습니다.')
  }
}

/**
 * 특정 프로젝트 상세 조회
 */
export const fetchProjectById = async (projectId: string): Promise<ProjectStatus | null> => {
  try {
    await simulateDelay(200)
    
    const project = MOCK_PROJECTS.find(p => p.id === projectId)
    return project || null
  } catch (error) {
    console.error('Project fetch failed:', error)
    throw new Error('프로젝트 정보를 불러올 수 없습니다.')
  }
}

/**
 * 대시보드 새로고침 (캐시 무시)
 */
export const refreshDashboardData = async (): Promise<DashboardData> => {
  try {
    // 캐시를 무시하고 최신 데이터 조회
    await simulateDelay(1000) // 새로고침은 좀 더 느리게
    
    return fetchDashboardData()
  } catch (error) {
    console.error('Dashboard refresh failed:', error)
    throw new Error('대시보드 새로고침에 실패했습니다.')
  }
}

// 실제 API 구현을 위한 타입 정의 및 인터페이스
export interface DashboardApiConfig {
  baseUrl: string
  timeout: number
  retries: number
}

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

// 향후 실제 API 클라이언트로 교체할 예정
export const dashboardApiClient = {
  fetchDashboardData,
  fetchProjects, 
  fetchRecentActivities,
  fetchProjectStats,
  fetchProjectById,
  refreshDashboardData
}

export default dashboardApiClient