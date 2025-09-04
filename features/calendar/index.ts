// features/calendar Public API
// This file provides the public interface for the calendar feature
// All imports from outside this layer MUST use this index file

export { CalendarFilters } from './ui/CalendarFilters'
export { CalendarView } from './ui/CalendarView'
export { ConflictAlert } from './ui/ConflictAlert'
export { GanttView } from './ui/GanttView'
export { ProjectLegend } from './ui/ProjectLegend'
export { WeekView } from './ui/WeekView'

// Re-export types for public consumption
export type {
  CalendarFilter,
  CalendarViewSettings,
  CalendarEvent,
  Project,
  ProjectLegendItem,
  PhaseType,
  ConflictType,
  ConflictSeverity
} from '@/entities/project/model/calendar-types'