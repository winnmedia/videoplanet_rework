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
  MockProjectData,
  FeedbackSummaryStats,
  FeedbackSummary,
  InvitationStats,
  InvitationSummary,
  ScheduleStats,
  ProjectSchedule,
  UnreadStats,
  UnreadBadge
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

// 새로운 핵심 기능들을 위한 Mock 데이터

// 1. 피드백 요약 Mock 데이터
const MOCK_FEEDBACK_SUMMARIES: FeedbackSummary[] = [
  {
    id: 'feedback-1',
    type: 'comment',
    projectId: 'project-1',
    projectTitle: '브랜드 홍보 영상',
    authorName: '김클라이언트',
    content: '전체적으로 색감이 너무 어두운 것 같아요. 좀 더 밝게 수정해주세요.',
    timestamp: '2025-08-28T09:30:00Z',
    isRead: false,
    changeType: 'added'
  },
  {
    id: 'feedback-2',
    type: 'reply',
    projectId: 'project-1',
    projectTitle: '브랜드 홍보 영상',
    authorName: '박편집자',
    content: '네, 색감 조정해서 다시 업로드하겠습니다.',
    timestamp: '2025-08-28T10:15:00Z',
    isRead: false,
    parentId: 'feedback-1',
    changeType: 'added'
  },
  {
    id: 'feedback-3',
    type: 'emotion',
    projectId: 'project-2',
    projectTitle: '제품 소개 영상',
    authorName: '이마케팅',
    content: '이 부분 정말 좋네요!',
    timestamp: '2025-08-28T11:00:00Z',
    isRead: true,
    emotionType: 'love',
    changeType: 'added'
  },
  {
    id: 'feedback-4',
    type: 'comment',
    projectId: 'project-3',
    projectTitle: '이벤트 하이라이트',
    authorName: '최검토자',
    content: '자막 폰트를 더 읽기 쉬운 걸로 바꿔주세요.',
    timestamp: '2025-08-28T08:45:00Z',
    isRead: false,
    changeType: 'added'
  }
]

const MOCK_FEEDBACK_STATS: FeedbackSummaryStats = {
  totalUnread: 3,
  newComments: 2,
  newReplies: 1,
  emotionChanges: 0,
  recentItems: MOCK_FEEDBACK_SUMMARIES.slice(0, 5)
}

// 2. 초대 관리 Mock 데이터
const MOCK_INVITATIONS: InvitationSummary[] = [
  {
    id: 'invite-1',
    type: 'sent',
    projectId: 'project-1',
    projectTitle: '브랜드 홍보 영상',
    targetEmail: 'designer@example.com',
    targetName: '최디자이너',
    status: 'pending',
    sentAt: '2025-08-27T14:30:00Z',
    expiresAt: '2025-09-03T14:30:00Z',
    canResend: true,
    isRead: true
  },
  {
    id: 'invite-2',
    type: 'received',
    targetEmail: 'me@example.com',
    senderName: '김매니저',
    projectId: 'project-external',
    projectTitle: '외부 협업 프로젝트',
    status: 'pending',
    sentAt: '2025-08-28T10:00:00Z',
    expiresAt: '2025-09-04T10:00:00Z',
    canResend: false,
    isRead: false
  },
  {
    id: 'invite-3',
    type: 'sent',
    projectId: 'project-2',
    projectTitle: '제품 소개 영상',
    targetEmail: 'cameraman@example.com',
    targetName: '박촬영',
    status: 'accepted',
    sentAt: '2025-08-26T09:15:00Z',
    respondedAt: '2025-08-26T15:22:00Z',
    expiresAt: '2025-09-02T09:15:00Z',
    canResend: false,
    isRead: true
  }
]

const MOCK_INVITATION_STATS: InvitationStats = {
  sentPending: 1,
  sentAccepted: 1,
  sentDeclined: 0,
  receivedPending: 1,
  receivedUnread: 1,
  recentInvitations: MOCK_INVITATIONS
}

// 3. 편집 일정 간트 Mock 데이터
const MOCK_PROJECT_SCHEDULES: ProjectSchedule[] = [
  {
    id: 'schedule-1',
    title: '브랜드 홍보 영상',
    phases: {
      planning: {
        startDate: '2025-08-20',
        endDate: '2025-08-25',
        progress: 100,
        status: 'completed'
      },
      shooting: {
        startDate: '2025-08-26',
        endDate: '2025-08-30',
        progress: 75,
        status: 'in_progress'
      },
      editing: {
        startDate: '2025-08-31',
        endDate: '2025-09-10',
        progress: 0,
        status: 'not_started'
      }
    },
    overallProgress: 58,
    priority: 'high',
    isDelayed: false,
    nextMilestone: '촬영 완료 (8/30)'
  },
  {
    id: 'schedule-2',
    title: '제품 소개 영상',
    phases: {
      planning: {
        startDate: '2025-08-15',
        endDate: '2025-08-20',
        progress: 100,
        status: 'completed'
      },
      shooting: {
        startDate: '2025-08-21',
        endDate: '2025-08-25',
        progress: 100,
        status: 'completed'
      },
      editing: {
        startDate: '2025-08-26',
        endDate: '2025-09-05',
        progress: 45,
        status: 'in_progress'
      }
    },
    overallProgress: 82,
    priority: 'medium',
    isDelayed: true,
    nextMilestone: '편집 완료 (9/5)'
  }
]

const MOCK_SCHEDULE_STATS: ScheduleStats = {
  totalProjects: 3,
  onTimeProjects: 2,
  delayedProjects: 1,
  completedThisWeek: 0,
  upcomingDeadlines: MOCK_PROJECT_SCHEDULES.filter(s => {
    const now = new Date()
    return Object.values(s.phases).some(phase => {
      const endDate = new Date(phase.endDate)
      const diffDays = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      return diffDays <= 7 && diffDays > 0 && phase.status !== 'completed'
    })
  }),
  currentProjects: MOCK_PROJECT_SCHEDULES.filter(s => s.overallProgress < 100)
}

// 4. 읽지 않음 배지 Mock 데이터
const MOCK_UNREAD_BADGES: UnreadBadge[] = [
  {
    id: 'badge-feedback',
    type: 'feedback',
    entityId: 'all-feedback',
    count: 3,
    priority: 'high',
    lastUpdated: '2025-08-28T11:00:00Z'
  },
  {
    id: 'badge-invitation',
    type: 'invitation',
    entityId: 'all-invitations',
    count: 1,
    priority: 'medium',
    lastUpdated: '2025-08-28T10:00:00Z'
  },
  {
    id: 'badge-notification',
    type: 'notification',
    entityId: 'all-notifications',
    count: 2,
    priority: 'low',
    lastUpdated: '2025-08-28T09:30:00Z'
  }
]

const MOCK_UNREAD_STATS: UnreadStats = {
  totalUnread: 6,
  feedbackUnread: 3,
  invitationUnread: 1,
  notificationUnread: 2,
  badges: MOCK_UNREAD_BADGES
}

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
      }),
      // 새로운 핵심 기능 데이터 추가
      feedbackSummary: MOCK_FEEDBACK_STATS,
      invitationStats: MOCK_INVITATION_STATS,
      scheduleStats: MOCK_SCHEDULE_STATS,
      unreadStats: MOCK_UNREAD_STATS
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

/**
 * 새로운 핵심 기능 API 함수들
 */

/**
 * 피드백 요약 데이터 조회
 */
export const fetchFeedbackSummary = async (): Promise<FeedbackSummaryStats> => {
  try {
    await simulateDelay(300)
    return MOCK_FEEDBACK_STATS
  } catch (error) {
    console.error('Feedback summary fetch failed:', error)
    throw new Error('피드백 요약을 불러올 수 없습니다.')
  }
}

/**
 * 초대 관리 데이터 조회
 */
export const fetchInvitationStats = async (): Promise<InvitationStats> => {
  try {
    await simulateDelay(250)
    return MOCK_INVITATION_STATS
  } catch (error) {
    console.error('Invitation stats fetch failed:', error)
    throw new Error('초대 관리 데이터를 불러올 수 없습니다.')
  }
}

/**
 * 편집 일정 간트 데이터 조회
 */
export const fetchScheduleStats = async (): Promise<ScheduleStats> => {
  try {
    await simulateDelay(400)
    return MOCK_SCHEDULE_STATS
  } catch (error) {
    console.error('Schedule stats fetch failed:', error)
    throw new Error('편집 일정 데이터를 불러올 수 없습니다.')
  }
}

/**
 * 읽지 않음 배지 데이터 조회
 */
export const fetchUnreadStats = async (): Promise<UnreadStats> => {
  try {
    await simulateDelay(150)
    return MOCK_UNREAD_STATS
  } catch (error) {
    console.error('Unread stats fetch failed:', error)
    throw new Error('읽지 않음 데이터를 불러올 수 없습니다.')
  }
}

/**
 * 특정 피드백 아이템을 읽음 처리
 */
export const markFeedbackAsRead = async (feedbackId: string): Promise<void> => {
  try {
    await simulateDelay(200)
    
    // Mock: 실제 구현에서는 서버 상태 업데이트
    const feedback = MOCK_FEEDBACK_SUMMARIES.find(f => f.id === feedbackId)
    if (feedback) {
      feedback.isRead = true
    }
    
    // 읽지 않음 카운트 업데이트
    MOCK_FEEDBACK_STATS.totalUnread = Math.max(0, MOCK_FEEDBACK_STATS.totalUnread - 1)
  } catch (error) {
    console.error('Mark feedback as read failed:', error)
    throw new Error('피드백 읽음 처리에 실패했습니다.')
  }
}

/**
 * 초대 재전송
 */
export const resendInvitation = async (invitationId: string): Promise<void> => {
  try {
    await simulateDelay(500)
    
    // Mock: 실제 구현에서는 서버에 재전송 요청
    const invitation = MOCK_INVITATIONS.find(i => i.id === invitationId)
    if (invitation && invitation.canResend) {
      invitation.sentAt = new Date().toISOString()
      invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7일 후 만료
    }
  } catch (error) {
    console.error('Resend invitation failed:', error)
    throw new Error('초대 재전송에 실패했습니다.')
  }
}

/**
 * 초대 수락
 */
export const acceptInvitation = async (invitationId: string): Promise<void> => {
  try {
    await simulateDelay(600)
    
    // Mock: 실제 구현에서는 서버 상태 업데이트
    const invitation = MOCK_INVITATIONS.find(i => i.id === invitationId)
    if (invitation) {
      invitation.status = 'accepted'
      invitation.respondedAt = new Date().toISOString()
      invitation.isRead = true
    }
    
    // 통계 업데이트
    if (invitation?.type === 'received') {
      MOCK_INVITATION_STATS.receivedPending = Math.max(0, MOCK_INVITATION_STATS.receivedPending - 1)
      MOCK_INVITATION_STATS.receivedUnread = Math.max(0, MOCK_INVITATION_STATS.receivedUnread - 1)
    }
  } catch (error) {
    console.error('Accept invitation failed:', error)
    throw new Error('초대 수락에 실패했습니다.')
  }
}

// 향후 실제 API 클라이언트로 교체할 예정
export const dashboardApiClient = {
  fetchDashboardData,
  fetchProjects, 
  fetchRecentActivities,
  fetchProjectStats,
  fetchProjectById,
  refreshDashboardData,
  // 새로운 핵심 기능 API
  fetchFeedbackSummary,
  fetchInvitationStats,
  fetchScheduleStats,
  fetchUnreadStats,
  markFeedbackAsRead,
  resendInvitation,
  acceptInvitation
}

export default dashboardApiClient