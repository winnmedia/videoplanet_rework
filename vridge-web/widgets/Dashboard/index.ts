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

// Types and Interfaces
export type {
  // Core Data Types
  ProjectStatus,
  ActivityItem,
  DashboardStats,
  DashboardData,
  
  // Component Props
  DashboardWidgetProps,
  ProjectStatusCardProps,
  RecentActivityFeedProps,
  EmptyStateProps,
  
  // Mock Data Types
  MockProjectData
} from './model/types'

// Re-export commonly used utilities (if any)
// 향후 API 레이어와 유틸리티 함수들이 추가될 경우 여기서 re-export