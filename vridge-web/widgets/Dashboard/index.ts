/**
 * Dashboard Widget - FSD Public API
 * Feature-Sliced Design 아키텍처에 따른 공개 인터페이스
 * 다른 레이어에서는 이 파일을 통해서만 Dashboard 위젯에 접근
 */

// UI Components
export { DashboardWidget } from './ui/DashboardWidget'
export { ProjectStatusCard } from './ui/ProjectStatusCard'
export { RecentActivityFeed } from './ui/RecentActivityFeed'
export { EmptyState } from './ui/EmptyState'

// 새로운 핵심 기능 위젯들 (DEVPLAN.md 기준)
export { FeedbackSummaryCard } from './ui/FeedbackSummaryCard'
export { InvitationSummaryCard } from './ui/InvitationSummaryCard'
export { ScheduleSummaryCard } from './ui/ScheduleSummaryCard'
export { UnreadBadge } from './ui/UnreadBadge'

// Types and Interfaces
export type {
  // Core Data Types
  ProjectStatus,
  ActivityItem,
  DashboardStats,
  DashboardData,
  
  // 새로운 핵심 기능 데이터 타입들
  FeedbackSummary,
  FeedbackSummaryStats,
  InvitationSummary,
  InvitationStats,
  ProjectSchedule,
  ScheduleStats,
  UnreadBadge as UnreadBadgeType,
  UnreadStats,
  DashboardFilters,
  QuickAction,
  
  // Component Props
  DashboardWidgetProps,
  ProjectStatusCardProps,
  RecentActivityFeedProps,
  EmptyStateProps,
  
  // 새로운 컴포넌트 Props
  FeedbackSummaryCardProps,
  InvitationSummaryCardProps,
  ScheduleSummaryCardProps,
  UnreadBadgeProps,
  
  // Mock Data Types
  MockProjectData
} from './model/types'

// API Services
export { dashboardApiClient } from './api/dashboardApi'

// Re-export commonly used utilities (if any)
// 향후 API 레이어와 유틸리티 함수들이 추가될 경우 여기서 re-export