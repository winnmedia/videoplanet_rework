/**
 * Entities Layer - Public API
 * @description Business entities and domain models
 * All cross-layer imports MUST use this index file
 */

// Calendar Entity - 명시적 재export로 충돌 방지
export {
  // Calendar specific types
  type CalendarEvent,
  type CalendarDay,
  type CalendarWeek,
  type CalendarMonth,
  type CalendarViewMode,
  type EventCategory,
  type EventPriority,
  type RecurrenceType,
  type ProjectPhase,
  type ProjectPhaseType,
  type ProjectCalendarEvent,
  type ProjectColorPalette,
  type ProjectLegendItem,
  type CalendarConflict,
  type EnhancedCalendarConflict,
  type ConflictDetectionResult,
  type TimeSlot,
  type CalendarFilterOptions,
  type CalendarViewState,
  type CalendarEventsResponse,
  type CalendarEventCreateRequest,
  type CalendarEventUpdateRequest,
  type DragEventData,
  type DropZoneData,
  // Services
  ConflictDetectionService,
  CONFLICT_DETECTION_RULES,
  ColorAssignmentService,
  CALENDAR_COLORS
} from './calendar'

// Dashboard Entity
export {
  type DashboardData,
  type DashboardStats,
  type ProjectStatus,
  type ActivityItem,
  type FeedbackSummary,
  type FeedbackSummaryStats,
  type InvitationSummary,
  type InvitationStats,
  type ProjectSchedule,
  type PhaseSchedule,
  type ScheduleStats,
  type UnreadBadge,
  type UnreadStats,
  type DashboardFilters,
  type QuickAction
} from './dashboard'

// Feedback Entity
export {
  type Feedback,
  type FeedbackReply,
  type Attachment,
  type CreateFeedbackDto,
  type UpdateFeedbackDto,
  type CreateReplyDto
} from './feedback'

// Menu Entity
export * from './menu'

// Project Entity - calendar 타입과 별도로 export
export {
  // Project specific types (calendar 타입 제외)
  type Project,
  type ProjectMember,
  type ProjectSettings,
  type CreateProjectDto,
  type UpdateProjectDto,
  type InviteProjectMemberDto,
  type AutoScheduleResult,
  // Calendar-specific models (alias로 export)
  type CalendarProject,
  type PhaseType,
  type ConflictLevel,
  type ConflictDetail,
  type CalendarFilter,
  type CalendarViewSettings,
  type ConflictType,
  type ConflictSeverity,
  // API
  projectApi,
  TeamInviteSchema,
  type TeamInviteData,
  type TeamInvite,
  type TeamMember
} from './project'

// Project State Management - default export 별도 처리
export { default as projectReducer } from './project/model/projectSlice'
export {
  // Actions
  setAutoSchedulePreview,
  clearErrors,
  clearCreateError,
  clearInviteError,
  setCurrentProject,
  addPendingInvitation,
  removePendingInvitation,
  // Async Thunks
  createProject,
  inviteTeamMember,
  fetchProjects,
  // Selectors
  selectProjects,
  selectCurrentProject,
  selectIsCreating,
  selectIsInviting,
  selectCreateError,
  selectInviteError,
  selectAutoSchedulePreview,
  selectCurrentUserRole,
  selectPermissions,
  selectPendingInvitations,
  selectInvitationCooldown,
  // Types
  type ProjectState
} from './project/model/projectSlice'

// RBAC Entity
export * from './rbac'

// User Entity
export * from './user'

// Video Planning Entity
export * from './video-planning'

// Shared Entity Services
export * from './api'
export * from './lib'
export * from './model'
export * from './ui'