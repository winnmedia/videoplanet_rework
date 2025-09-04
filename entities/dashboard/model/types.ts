/**
 * Dashboard Entity - Core Domain Types
 * @description Pure dashboard domain models for activity feeds, metrics, and aggregations
 * @layer entities
 */

// ===========================
// Core Dashboard Domain Models
// ===========================

/**
 * Project Status Domain Model
 */
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

/**
 * Activity Feed Domain Model
 * @description Central activity tracking for dashboard feeds
 */
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

/**
 * Dashboard Metrics Aggregation
 */
export interface DashboardStats {
  totalProjects: number
  activeProjects: number
  completedProjects: number
  totalTeamMembers: number
  pendingTasks: number
}

/**
 * Main Dashboard Data Aggregation
 */
export interface DashboardData {
  stats: DashboardStats
  recentProjects: ProjectStatus[]
  recentActivity: ActivityItem[]
  upcomingDeadlines: ProjectStatus[]
  
  // Core dashboard features
  feedbackSummary: FeedbackSummaryStats
  invitationStats: InvitationStats
  scheduleStats: ScheduleStats
  unreadStats: UnreadStats
}

// ===========================
// Feedback Management Domain
// ===========================

/**
 * Feedback Summary Domain Model
 * @description Aggregates comments, replies, and emotion changes
 */
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
  emotionType?: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry'
  changeType?: 'added' | 'updated' | 'removed'
}

export interface FeedbackSummaryStats {
  totalUnread: number
  newComments: number
  newReplies: number
  emotionChanges: number
  recentItems: FeedbackSummary[]
}

// ===========================
// Invitation Management Domain
// ===========================

/**
 * Invitation Summary Domain Model
 * @description Tracks sent/received invitations across projects
 */
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
}

// ===========================
// Schedule Management Domain
// ===========================

/**
 * Project Schedule Domain Model
 * @description Gantt-style schedule tracking with phases
 */
export interface ProjectSchedule {
  id: string
  title: string
  phases: {
    planning: PhaseSchedule
    shooting: PhaseSchedule
    editing: PhaseSchedule
  }
  overallProgress: number
  priority: 'high' | 'medium' | 'low'
  isDelayed: boolean
  nextMilestone?: string
}

export interface PhaseSchedule {
  startDate: string
  endDate: string
  progress: number // 0-100
  status: 'not_started' | 'in_progress' | 'completed' | 'overdue'
}

export interface ScheduleStats {
  totalProjects: number
  onTimeProjects: number
  delayedProjects: number
  completedThisWeek: number
  upcomingDeadlines: ProjectSchedule[]
  currentProjects: ProjectSchedule[]
}

// ===========================
// Notification System Domain
// ===========================

/**
 * Unread Badge System
 * @description Centralized unread count management
 */
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

// ===========================
// Domain Services & Filters
// ===========================

/**
 * Dashboard Filtering Domain
 */
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

/**
 * Quick Action Domain Model
 */
export interface QuickAction {
  id: string
  label: string
  icon: string
  action: () => void
  disabled?: boolean
  badge?: number
}