// features/calendar Public API
// This file provides the public interface for the calendar feature
// All imports from outside this layer MUST use this index file

// Legacy Calendar Components (for backwards compatibility)
export { CalendarFilters } from './ui/CalendarFilters'
export { CalendarView } from './ui/CalendarView'
export { ConflictAlert } from './ui/ConflictAlert'
export { GanttView } from './ui/GanttView'
export { ProjectLegend } from './ui/ProjectLegend'
export { WeekView } from './ui/WeekView'

// New Enhanced Calendar Components (Production Ready)
export { DragDropCalendarView } from './ui/DragDropCalendarView'
export { EnhancedCalendarFilters } from './ui/EnhancedCalendarFilters'
export { EnhancedProjectLegend } from './ui/EnhancedProjectLegend'
export { CalendarDashboard } from './ui/CalendarDashboard'

// Re-export enhanced calendar entities and services
export type {
  ProjectCalendarEvent,
  Project,
  ProjectPhase,
  ProjectPhaseType,
  CalendarFilterOptions,
  CalendarViewState,
  ProjectLegendItem,
  ProjectColorPalette,
  EnhancedCalendarConflict,
  ConflictDetectionResult,
  DragEventData,
  DropZoneData
} from '@/entities/calendar'

export { 
  ConflictDetectionService, 
  ColorAssignmentService,
  CONFLICT_DETECTION_RULES,
  CALENDAR_COLORS
} from '@/entities/calendar'

// Legacy types (for backwards compatibility)
export type {
  CalendarFilter,
  CalendarViewSettings,
  CalendarEvent,
  PhaseType,
  ConflictType,
  ConflictSeverity
} from '@/entities/project/model/calendar-types'