/**
 * Dashboard Entity - Public API
 * @description Exports all dashboard domain models and services
 * @layer entities
 */

// Core Dashboard Models
export type {
  DashboardData,
  DashboardStats,
  ProjectStatus,
  ActivityItem
} from './model/types'

// Feedback Management
export type {
  FeedbackSummary,
  FeedbackSummaryStats
} from './model/types'

// Invitation Management
export type {
  InvitationSummary,
  InvitationStats
} from './model/types'

// Schedule Management
export type {
  ProjectSchedule,
  PhaseSchedule,
  ScheduleStats
} from './model/types'

// Notification System
export type {
  UnreadBadge,
  UnreadStats
} from './model/types'

// Domain Services
export type {
  DashboardFilters,
  QuickAction
} from './model/types'