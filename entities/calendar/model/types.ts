/**
 * Calendar Entity - Core Domain Types
 * @description Pure domain models for calendar system - no UI dependencies
 * @layer entities
 */

// ===========================
// Core Domain Types
// ===========================

export type CalendarViewMode = 'month' | 'week' | 'day'

export type EventCategory = 'project-deadline' | 'milestone' | 'meeting' | 'personal' | 'holiday' | 'filming'

export type EventPriority = 'high' | 'medium' | 'low'

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

/**
 * Core Calendar Event Domain Model
 * @description Central event entity representing any calendar item
 */
export interface CalendarEvent {
  id: string
  title: string
  description?: string
  startDate: string // ISO 8601 format
  endDate: string   // ISO 8601 format
  isAllDay: boolean
  category: EventCategory
  priority: EventPriority
  type?: string // 추가 타입 분류 (filming, editing 등)
  
  // Project relation
  projectId?: string
  projectTitle?: string
  projectColor?: string
  
  // Recurrence
  recurrence: RecurrenceType
  recurrenceEndDate?: string
  
  // User info
  createdBy: string
  assignedTo?: string[]
  
  // Status
  isCompleted: boolean
  completedAt?: string
  
  // UI state (moved from widgets - domain can have UI hints)
  backgroundColor?: string
  textColor?: string
  color?: string // 이벤트 테마 색상
}

/**
 * Calendar Day Domain Model
 */
export interface CalendarDay {
  date: string // YYYY-MM-DD format
  isToday: boolean
  isCurrentMonth: boolean
  isWeekend: boolean
  isHoliday?: boolean
  holidayName?: string
  events: CalendarEvent[]
}

/**
 * Calendar Week Domain Model
 */
export interface CalendarWeek {
  weekNumber: number
  days: CalendarDay[]
}

/**
 * Calendar Month Domain Model
 */
export interface CalendarMonth {
  year: number
  month: number // 1-12
  monthName: string
  weeks: CalendarWeek[]
  totalEvents: number
}

// ===========================
// Domain Services & Operations
// ===========================

/**
 * Calendar Conflict Detection Domain Model
 */
export interface CalendarConflict {
  type: 'overlap' | 'double-booking' | 'resource-conflict'
  events: CalendarEvent[]
  message: string
  severity: 'warning' | 'error'
}

/**
 * Time Slot Domain Model
 */
export interface TimeSlot {
  time: string // HH:mm format
  dateTime: string // ISO 8601 format
  isBusinessHours: boolean
  events: CalendarEvent[]
  isAvailable: boolean
}

// ===========================
// API Contract Types
// ===========================

export interface CalendarEventsResponse {
  events: CalendarEvent[]
  totalCount: number
  hasMore: boolean
  nextCursor?: string
}

export interface CalendarEventCreateRequest {
  title: string
  description?: string
  startDate: string
  endDate: string
  isAllDay: boolean
  category: EventCategory
  priority: EventPriority
  projectId?: string
  recurrence: RecurrenceType
  recurrenceEndDate?: string
  assignedTo?: string[]
}

export interface CalendarEventUpdateRequest extends Partial<CalendarEventCreateRequest> {
  id: string
  isCompleted?: boolean
}

// ===========================
// Project Domain Models
// ===========================

/**
 * Project Phase Types (Video Production Phases)
 */
export type ProjectPhaseType = 'planning' | 'filming' | 'editing'

/**
 * Project Phase Domain Model
 */
export interface ProjectPhase {
  id: string
  name: string
  type: ProjectPhaseType
  projectId: string
  startDate: string // ISO 8601
  endDate: string   // ISO 8601
  duration: number  // days
  color?: string    // inherited from project
  isMovable: boolean // drag-drop permission
  dependencies?: string[] // phase IDs this depends on
}

/**
 * Project Domain Model
 */
export interface Project {
  id: string
  name: string
  color: string     // unique color per project
  description?: string
  status: 'active' | 'completed' | 'on-hold' | 'cancelled'
  phases: ProjectPhase[]
  createdAt: string
  updatedAt: string
}

/**
 * Enhanced Calendar Event with Project Context
 */
export interface ProjectCalendarEvent extends Omit<CalendarEvent, 'projectId' | 'projectTitle' | 'projectColor'> {
  project: Project
  phase: ProjectPhase
  isConflicting: boolean
  conflictDetails?: CalendarConflict[]
}

// ===========================
// Enhanced Conflict Detection
// ===========================

/**
 * Enhanced Calendar Conflict
 */
export interface EnhancedCalendarConflict {
  id: string
  type: 'filming-overlap' | 'resource-conflict' | 'double-booking' | 'overlap'
  events: ProjectCalendarEvent[]
  message: string
  severity: 'warning' | 'error'
  suggestedResolution?: string
  createdAt: string
}

/**
 * Conflict Detection Result
 */
export interface ConflictDetectionResult {
  hasConflicts: boolean
  conflicts: EnhancedCalendarConflict[]
  affectedEvents: ProjectCalendarEvent[]
  conflictCount: number
}

// ===========================
// Color Assignment Domain
// ===========================

/**
 * Project Color Palette
 */
export interface ProjectColorPalette {
  primary: string    // main project color
  secondary: string  // lighter variant
  accent: string     // darker variant
  text: string       // text color for contrast
}

/**
 * Project Legend Item
 */
export interface ProjectLegendItem {
  project: Project
  palette: ProjectColorPalette
  isVisible: boolean
}

// ===========================
// Calendar Filter & View State
// ===========================

/**
 * Calendar Filter Options
 */
export interface CalendarFilterOptions {
  showConflictsOnly: boolean
  selectedProjects: string[]
  selectedPhaseTypes: ProjectPhaseType[]
  dateRange: {
    start: string
    end: string
  }
}

/**
 * Calendar View State
 */
export interface CalendarViewState {
  mode: CalendarViewMode
  selectedDate: string
  filters: CalendarFilterOptions
  dragState: {
    isDragging: boolean
    draggedEvent?: ProjectCalendarEvent
    previewConflicts?: EnhancedCalendarConflict[]
  }
}

// ===========================
// Domain Value Objects
// ===========================

/**
 * Enhanced Drag & Drop Operations
 */
export interface DragEventData {
  event: ProjectCalendarEvent
  sourceDate: string
  sourceTime?: string
  dragType: 'move' | 'resize'
}

export interface DropZoneData {
  date: string
  time?: string
  isValidDrop: boolean
  conflictPreview?: EnhancedCalendarConflict[]
}