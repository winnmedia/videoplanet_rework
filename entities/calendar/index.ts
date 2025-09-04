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

// Domain Services
export type {
  CalendarConflict,
  TimeSlot
} from './model/types'

// API Contracts
export type {
  CalendarEventsResponse,
  CalendarEventCreateRequest,
  CalendarEventUpdateRequest
} from './model/types'

// Domain Operations
export type {
  DragEventData,
  DropZoneData
} from './model/types'