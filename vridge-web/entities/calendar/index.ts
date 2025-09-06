/**
 * Calendar Entity - Public API
 * @description Exports all calendar domain models and services
 * @layer entities
 */

// Core Domain Models
export type {
  CalendarEvent,
  CalendarDay,
  CalendarWeek,
  CalendarMonth,
  CalendarViewMode,
  EventCategory,
  EventPriority,
  RecurrenceType
} from './model/types'

// Enhanced Project Domain Models
export type {
  Project,
  ProjectPhase,
  ProjectPhaseType,
  ProjectCalendarEvent,
  ProjectColorPalette,
  ProjectLegendItem
} from './model/types'

// Enhanced Conflict Detection
export type {
  CalendarConflict,
  EnhancedCalendarConflict,
  ConflictDetectionResult,
  TimeSlot
} from './model/types'

// Calendar State Management
export type {
  CalendarFilterOptions,
  CalendarViewState
} from './model/types'

// API Contracts
export type {
  CalendarEventsResponse,
  CalendarEventCreateRequest,
  CalendarEventUpdateRequest
} from './model/types'

// Enhanced Domain Operations
export type {
  DragEventData,
  DropZoneData
} from './model/types'

// Domain Services
export { ConflictDetectionService, CONFLICT_DETECTION_RULES } from './lib/conflictDetection'
export { ColorAssignmentService, CALENDAR_COLORS } from './lib/colorAssignment'
export { ConflictResolutionService } from './lib/conflictResolution'

// Conflict Resolution Types
export type {
  ResolutionStrategy,
  AutoResolutionStrategy,
  AvailableTimeSlot,
  ConflictResolutionOption,
  ResolutionValidationResult,
  AutoResolutionResult,
  ProposedResolution,
  AutoResolutionOptions
} from './lib/conflictResolution'

// Style Constants and Utilities
export * from './constants/styles'
export * from './lib/styleUtils'