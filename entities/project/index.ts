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
  InviteProjectMemberDto
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