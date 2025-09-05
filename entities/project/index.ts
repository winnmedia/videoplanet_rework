// entities/project Public API
// This file provides the public interface for the project entity
// All imports from other layers MUST use this index file

// Domain Models
export type {
  Project,
  ProjectMember,
  ProjectSettings,
  CreateProjectDto,
  UpdateProjectDto,
  InviteProjectMemberDto,
  AutoScheduleResult
} from './model/types'

// Calendar-specific models
export type {
  ProjectStatus,
  PhaseType,
  ConflictLevel,
  Project as CalendarProject,
  ProjectPhase,
  ConflictDetail,
  CalendarFilter,
  CalendarViewSettings,
  CalendarEvent,
  ProjectLegendItem,
  ConflictType,
  ConflictSeverity
} from './model/calendar-types'

// API Services
export {
  projectApi,
  TeamInviteSchema,
  type TeamInviteData,
  type TeamInvite,
  type TeamMember
} from './api/projectApi'

// State Management
export {
  default as projectReducer,
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
} from './model/projectSlice'