export interface ProjectStatus {
  id: string
  title: string
  status: 'planning' | 'shooting' | 'editing' | 'completed' | 'cancelled'
  progress: number // 0-100
  startDate: string
  endDate?: string
  priority: 'high' | 'medium' | 'low'
  teamMembers?: number
}

export interface ActivityItem {
  id: string
  type: 'project_created' | 'phase_completed' | 'file_uploaded' | 'comment_added' | 'status_changed'
  title: string
  description: string
  timestamp: string
  userId: string
  userName: string
  projectId?: string
  projectTitle?: string
}

export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalTeamMembers: number
  pendingTasks: number
}

export interface DashboardData {
  stats: DashboardStats
  recentProjects: ProjectStatus[]
  recentActivity: ActivityItem[]
  upcomingDeadlines: ProjectStatus[]
  // 새로운 핵심 기능 데이터
  feedbackSummary: FeedbackSummaryStats
  invitationStats: InvitationStats
  scheduleStats: ScheduleStats
  unreadStats: UnreadStats
}

// New Dashboard Core Features - Based on DEVPLAN.md Requirements

// 1. 새 피드백 요약 (새 코멘트/대댓글/감정표현 변화 집계)
export interface FeedbackSummary {
  id: string
  type: 'comment' | 'reply' | 'emotion'
  projectId: string
  projectTitle: string
  authorName: string
  content: string
  timestamp: string
  isRead: boolean
  parentId?: string // 대댓글인 경우
  emotionType?: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry' // 감정표현 타입
  changeType?: 'added' | 'updated' | 'removed' // 변화 유형
}

export interface FeedbackSummaryStats {
  totalUnread: number
  newComments: number
  newReplies: number
  emotionChanges: number
  recentItems: FeedbackSummary[]
  [key: string]: unknown
}

// 2. 초대 관리 요약 (전송/재전송/수락/거절/받은 초대 현황)
export interface InvitationSummary {
  id: string
  type: 'sent' | 'received'
  projectId?: string
  projectTitle?: string
  targetEmail: string
  targetName?: string
  senderName?: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  sentAt: string
  respondedAt?: string
  expiresAt: string
  canResend: boolean
  isRead: boolean
}

export interface InvitationStats {
  sentPending: number
  sentAccepted: number
  sentDeclined: number
  receivedPending: number
  receivedUnread: number
  recentInvitations: InvitationSummary[]
  [key: string]: unknown
}

// 3. 편집 일정 간트 요약 (프로젝트별 기획·촬영·편집 진행 상황)
export interface ProjectSchedule {
  id: string
  title: string
  phases: {
    planning: {
      startDate: string
      endDate: string
      progress: number // 0-100
      status: 'not_started' | 'in_progress' | 'completed' | 'overdue'
    }
    shooting: {
      startDate: string
      endDate: string
      progress: number
      status: 'not_started' | 'in_progress' | 'completed' | 'overdue'
    }
    editing: {
      startDate: string
      endDate: string
      progress: number
      status: 'not_started' | 'in_progress' | 'completed' | 'overdue'
    }
  }
  overallProgress: number
  priority: 'high' | 'medium' | 'low'
  isDelayed: boolean
  nextMilestone?: string
}

export interface ScheduleStats {
  totalProjects: number
  onTimeProjects: number
  delayedProjects: number
  completedThisWeek: number
  upcomingDeadlines: ProjectSchedule[]
  currentProjects: ProjectSchedule[]
  [key: string]: unknown
}

// 4. 읽지 않음 배지 시스템
export interface UnreadBadge {
  id: string
  type: 'feedback' | 'invitation' | 'notification'
  entityId: string
  count: number // 최대 9, 그 이상은 9+로 표시
  priority: 'low' | 'medium' | 'high'
  lastUpdated: string
}

export interface UnreadStats {
  totalUnread: number
  feedbackUnread: number
  invitationUnread: number
  notificationUnread: number
  badges: UnreadBadge[]
}

// 보조 기능 타입
export interface DashboardFilters {
  projectIds: string[]
  organizationIds: string[]
  dateRange: {
    start: string
    end: string
  }
  priority?: 'high' | 'medium' | 'low'
  status?: string[]
}

export interface QuickAction {
  id: string
  label: string
  icon: string
  action: () => void
  disabled?: boolean
  badge?: number
}

// Component Props
export interface DashboardWidgetProps {
  data?: DashboardData
  isLoading?: boolean
  onProjectClick?: (projectId: string) => void
  onRefresh?: () => void
}

export interface ProjectStatusCardProps {
  project: ProjectStatus
  onClick?: (projectId: string) => void
  showProgress?: boolean
  compact?: boolean
}

export interface RecentActivityFeedProps {
  activities: ActivityItem[]
  maxItems?: number
  showTimestamp?: boolean
  onActivityClick?: (activityId: string) => void
}

export interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
  illustration?: 'no-projects' | 'no-activity' | 'error' | 'loading'
}

// 새 위젯 컴포넌트 Props
export interface FeedbackSummaryCardProps {
  data: FeedbackSummaryStats
  onViewDetails?: () => void
  onMarkAllRead?: () => void
  onItemClick?: (itemId: string) => void
}

export interface InvitationSummaryCardProps {
  data: InvitationStats
  onViewDetails?: () => void
  onResendInvitation?: (invitationId: string) => void
  onAcceptInvitation?: (invitationId: string) => void
  onDeclineInvitation?: (invitationId: string) => void
  onItemClick?: (itemId: string) => void
}

export interface ScheduleSummaryCardProps {
  data: ScheduleStats
  viewType: 'week' | 'month'
  onViewTypeChange?: (type: 'week' | 'month') => void
  onProjectClick?: (projectId: string) => void
  onViewDetails?: () => void
  onCreateProject?: () => void // 빈 상태 CTA 개선을 위한 새 프로젝트 생성 콜백
}

export interface UnreadBadgeProps {
  count: number
  priority?: 'low' | 'medium' | 'high'
  size?: 'sm' | 'md' | 'lg'
  showZero?: boolean
  className?: string
  ariaLabel?: string
}

// Mock Data Types
export interface MockProjectData {
  projects: ProjectStatus[]
  activities: ActivityItem[]
  stats: DashboardStats
}
