/**
 * Calendar Widget - Type Definitions
 * FSD 아키텍처에 따른 캘린더 관련 타입 정의
 */

// ===========================
// Core Calendar Types
// ===========================

export type CalendarViewMode = 'month' | 'week' | 'day'

export type EventCategory = 'project-deadline' | 'milestone' | 'meeting' | 'personal' | 'holiday' | 'filming'

export type EventPriority = 'high' | 'medium' | 'low'

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

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
  
  // UI state
  backgroundColor?: string
  textColor?: string
  color?: string // 이벤트 테마 색상
}

export interface CalendarDay {
  date: string // YYYY-MM-DD format
  isToday: boolean
  isCurrentMonth: boolean
  isWeekend: boolean
  isHoliday?: boolean
  holidayName?: string
  events: CalendarEvent[]
}

export interface CalendarWeek {
  weekNumber: number
  days: CalendarDay[]
}

export interface CalendarMonth {
  year: number
  month: number // 1-12
  monthName: string
  weeks: CalendarWeek[]
  totalEvents: number
}

// ===========================
// Component Props Types
// ===========================

export interface CalendarWidgetProps {
  initialView?: CalendarViewMode
  selectedDate?: string // YYYY-MM-DD format
  events?: CalendarEvent[]
  isLoading?: boolean
  
  // Event handlers
  onDateSelect?: (date: string) => void
  onEventClick?: (event: CalendarEvent) => void
  onEventCreate?: (dateTime: string) => void
  onEventEdit?: (event: CalendarEvent) => void
  onEventDelete?: (eventId: string) => void
  onViewModeChange?: (viewMode: CalendarViewMode) => void
  
  // Navigation handlers
  onNavigateToday?: () => void
  onNavigatePrevious?: () => void
  onNavigateNext?: () => void
  
  // Configuration
  showWeekends?: boolean
  showWeekNumbers?: boolean
  startOfWeek?: 'sunday' | 'monday'
  timeFormat?: '12' | '24'
  locale?: string
}

export interface CalendarGridProps {
  viewMode: CalendarViewMode
  currentDate: string // YYYY-MM-DD format
  events: CalendarEvent[]
  selectedDate?: string
  
  onDateSelect?: (date: string) => void
  onEventClick?: (event: CalendarEvent) => void
  onTimeSlotClick?: (dateTime: string) => void
  
  showWeekends?: boolean
  showWeekNumbers?: boolean
  timeFormat?: '12' | '24'
}

export interface ScheduleEventCardProps {
  event: CalendarEvent
  viewMode: CalendarViewMode
  isCompact?: boolean
  isDragging?: boolean
  
  onClick?: (event: CalendarEvent) => void
  onEdit?: (event: CalendarEvent) => void
  onDelete?: (eventId: string) => void
  onDragStart?: (event: CalendarEvent) => void
  onDragEnd?: (event: CalendarEvent, newDateTime: string) => void
}

export interface DatePickerProps {
  selectedDate?: string // YYYY-MM-DD format
  minDate?: string
  maxDate?: string
  disabledDates?: string[]
  
  onChange?: (date: string) => void
  onClose?: () => void
  
  showToday?: boolean
  showClear?: boolean
  locale?: string
  format?: string
}

export interface EventModalProps {
  isOpen: boolean
  mode: 'create' | 'edit' | 'view'
  event?: CalendarEvent
  selectedDateTime?: string // ISO 8601 format
  
  onSave?: (event: Partial<CalendarEvent>) => void
  onDelete?: (eventId: string) => void
  onClose?: () => void
  
  // Available projects for linking
  availableProjects?: Array<{
    id: string
    title: string
    color: string
  }>
}

// ===========================
// Calendar State & Context
// ===========================

export interface CalendarState {
  // Current view
  viewMode: CalendarViewMode
  currentDate: string // YYYY-MM-DD format
  selectedDate?: string
  
  // Events
  events: CalendarEvent[]
  isLoadingEvents: boolean
  
  // UI state
  isEventModalOpen: boolean
  eventModalMode: 'create' | 'edit' | 'view'
  selectedEvent?: CalendarEvent
  
  // Navigation
  canNavigateBack: boolean
  canNavigateForward: boolean
  
  // Settings
  showWeekends: boolean
  showWeekNumbers: boolean
  timeFormat: '12' | '24'
  startOfWeek: 'sunday' | 'monday'
}

export interface CalendarActions {
  // View actions
  setViewMode: (mode: CalendarViewMode) => void
  navigateToDate: (date: string) => void
  navigateToday: () => void
  navigatePrevious: () => void
  navigateNext: () => void
  
  // Event actions
  selectEvent: (event: CalendarEvent) => void
  createEvent: (event: Partial<CalendarEvent>) => void
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void
  deleteEvent: (eventId: string) => void
  
  // Modal actions
  openEventModal: (mode: 'create' | 'edit' | 'view', event?: CalendarEvent) => void
  closeEventModal: () => void
  
  // Settings
  toggleWeekends: () => void
  toggleWeekNumbers: () => void
  setTimeFormat: (format: '12' | '24') => void
  setStartOfWeek: (day: 'sunday' | 'monday') => void
}

// ===========================
// API Response Types
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
// Drag & Drop Types
// ===========================

export interface DragEventData {
  event: CalendarEvent
  sourceDate: string
  sourceTime?: string
}

export interface DropZoneData {
  date: string
  time?: string
  isValidDrop: boolean
}

// ===========================
// Calendar Utilities Types
// ===========================

export interface TimeSlot {
  time: string // HH:mm format
  dateTime: string // ISO 8601 format
  isBusinessHours: boolean
  events: CalendarEvent[]
  isAvailable: boolean
}

export interface CalendarConflict {
  type: 'overlap' | 'double-booking' | 'resource-conflict'
  events: CalendarEvent[]
  message: string
  severity: 'warning' | 'error'
}

// ===========================
// Mock Data Types (for testing)
// ===========================

export interface MockCalendarData {
  events: CalendarEvent[]
  projects: Array<{
    id: string
    title: string
    color: string
  }>
  holidays: Array<{
    date: string
    name: string
  }>
}