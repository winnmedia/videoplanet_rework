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

// Mock Data Types
export interface MockProjectData {
  projects: ProjectStatus[]
  activities: ActivityItem[]
  stats: DashboardStats
}