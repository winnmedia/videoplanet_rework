/**
 * Calendar Conflict Detection Domain Service
 * @description Core domain logic for detecting calendar conflicts
 * @layer entities
 */

import type { 
  ProjectCalendarEvent, 
  EnhancedCalendarConflict, 
  ConflictDetectionResult,
  ProjectPhaseType
} from '../model/types'

/**
 * Conflict Detection Service
 * @description Pure domain service for detecting calendar conflicts
 */
export class ConflictDetectionService {
  /**
   * Detects all conflicts in a set of calendar events
   */
  static detectConflicts(events: ProjectCalendarEvent[]): ConflictDetectionResult {
    const conflicts: EnhancedCalendarConflict[] = []
    const affectedEvents = new Set<ProjectCalendarEvent>()

    // Only check for filming phase conflicts as per requirements
    const filmingEvents = events.filter(event => event.phase.type === 'filming')

    // Check for filming overlaps (primary conflict type)
    for (let i = 0; i < filmingEvents.length; i++) {
      for (let j = i + 1; j < filmingEvents.length; j++) {
        const event1 = filmingEvents[i]
        const event2 = filmingEvents[j]

        const conflict = this.checkFilmingOverlap(event1, event2)
        if (conflict) {
          conflicts.push(conflict)
          affectedEvents.add(event1)
          affectedEvents.add(event2)
        }
      }
    }

    return {
      hasConflicts: conflicts.length > 0,
      conflicts,
      affectedEvents: Array.from(affectedEvents),
      conflictCount: conflicts.length
    }
  }

  /**
   * Checks if two filming events overlap (main conflict detection rule)
   */
  private static checkFilmingOverlap(
    event1: ProjectCalendarEvent, 
    event2: ProjectCalendarEvent
  ): EnhancedCalendarConflict | null {
    // Only check filming phase overlaps
    if (event1.phase.type !== 'filming' || event2.phase.type !== 'filming') {
      return null
    }

    const start1 = new Date(event1.startDate)
    const end1 = new Date(event1.endDate)
    const start2 = new Date(event2.startDate)
    const end2 = new Date(event2.endDate)

    // Check for date overlap
    const hasOverlap = start1 <= end2 && start2 <= end1

    if (hasOverlap) {
      return {
        id: `conflict-${event1.id}-${event2.id}`,
        type: 'filming-overlap',
        severity: 'warning',
        events: [event1, event2],
        message: `촬영 일정 충돌: ${event1.project.name}과 ${event2.project.name}`,
        suggestedResolution: '촬영 일정을 다른 날짜로 조정하세요',
        createdAt: new Date().toISOString()
      }
    }

    return null
  }

  /**
   * Predicts conflicts for a proposed event move
   */
  static predictConflicts(
    movingEvent: ProjectCalendarEvent,
    newStartDate: string,
    newEndDate: string,
    allEvents: ProjectCalendarEvent[]
  ): EnhancedCalendarConflict[] {
    // Create temporary event with new dates
    const tempEvent: ProjectCalendarEvent = {
      ...movingEvent,
      startDate: newStartDate,
      endDate: newEndDate
    }

    // Check conflicts with all other events (except itself)
    const otherEvents = allEvents.filter(event => event.id !== movingEvent.id)
    const testEvents = [...otherEvents, tempEvent]

    const result = this.detectConflicts(testEvents)
    
    // Return only conflicts involving the moved event
    return result.conflicts.filter(conflict => 
      conflict.events.some(event => event.id === movingEvent.id)
    )
  }

  /**
   * Validates if a drop zone would create conflicts
   */
  static isValidDropZone(
    draggedEvent: ProjectCalendarEvent,
    dropDate: string,
    allEvents: ProjectCalendarEvent[]
  ): boolean {
    const draggedDuration = this.calculateEventDuration(draggedEvent)
    const newEndDate = this.addDaysToDate(dropDate, draggedDuration - 1)

    const predictedConflicts = this.predictConflicts(
      draggedEvent,
      dropDate,
      newEndDate,
      allEvents
    )

    // Allow drop if no conflicts or only minor warnings
    return predictedConflicts.every(conflict => conflict.severity === 'warning')
  }

  /**
   * Helper: Calculate event duration in days
   */
  private static calculateEventDuration(event: ProjectCalendarEvent): number {
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)
    const diffTime = Math.abs(end.getTime() - start.getTime())
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
  }

  /**
   * Helper: Add days to a date string
   */
  private static addDaysToDate(dateString: string, days: number): string {
    const date = new Date(dateString)
    date.setDate(date.getDate() + days)
    return date.toISOString().split('T')[0]
  }
}

/**
 * Conflict Detection Rules Registry
 */
export const CONFLICT_DETECTION_RULES = {
  FILMING_OVERLAP: {
    id: 'filming-overlap',
    name: '촬영 일정 충돌',
    description: '같은 시간대에 두 개 이상의 촬영이 예정되어 있습니다',
    applies: (event1: ProjectCalendarEvent, event2: ProjectCalendarEvent) => {
      return event1.phase.type === 'filming' && event2.phase.type === 'filming'
    },
    severity: 'warning' as const
  }
} as const