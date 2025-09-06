/**
 * Calendar Conflict Resolution Domain Service
 * @description Automated conflict resolution and scheduling optimization
 * @layer entities
 */

import type {
  ProjectCalendarEvent,
  EnhancedCalendarConflict,
  EventPriority
} from '../model/types'

/**
 * Resolution Strategy Types
 */
export type ResolutionStrategy = 'postpone' | 'advance' | 'ignore' | 'custom'
export type AutoResolutionStrategy = 'minimize-disruption' | 'priority-based' | 'earliest-available'

/**
 * Time Slot for Available Scheduling
 */
export interface AvailableTimeSlot {
  startDate: string
  endDate: string
  score: number // Higher is better (based on business hours, weekends, etc.)
  reason: string
}

/**
 * Resolution Option
 */
export interface ConflictResolutionOption {
  strategy: ResolutionStrategy
  targetEventId: string
  suggestedDate?: string
  suggestedEndDate?: string
  impact: 'low' | 'medium' | 'high'
  description: string
  estimatedCost: number // Business impact score
}

/**
 * Resolution Validation Result
 */
export interface ResolutionValidationResult {
  isValid: boolean
  newConflicts: EnhancedCalendarConflict[]
  warnings: string[]
  suggestions: string[]
}

/**
 * Auto Resolution Result
 */
export interface AutoResolutionResult {
  conflictId: string
  recommendedAction: ConflictResolutionOption
  alternativeActions: ConflictResolutionOption[]
  confidence: number // 0-1 scale
}

/**
 * Proposed Resolution for Validation
 */
export interface ProposedResolution {
  eventId: string
  newStartDate: string
  newEndDate: string
}

/**
 * Auto Resolution Options
 */
export interface AutoResolutionOptions {
  strategy: AutoResolutionStrategy
  maxDaysToLookAhead?: number
  respectPriorities?: boolean
  avoidWeekends?: boolean
}

/**
 * Conflict Resolution Service
 * @description Provides automated conflict resolution strategies
 */
export class ConflictResolutionService {
  /**
   * Priority scoring for resolution decisions
   */
  private static readonly PRIORITY_SCORES: Record<EventPriority, number> = {
    high: 100,
    medium: 50,
    low: 25
  }

  /**
   * Business hours scoring multiplier
   */
  private static readonly BUSINESS_HOURS_SCORE = 1.0
  private static readonly WEEKEND_PENALTY = 0.7

  /**
   * Generates resolution options for a specific conflict
   */
  static generateResolutionOptions(
    conflict: EnhancedCalendarConflict,
    allEvents: ProjectCalendarEvent[]
  ): ConflictResolutionOption[] {
    const options: ConflictResolutionOption[] = []
    const conflictEvents = conflict.events

    // Find the event with lower priority for rescheduling
    const sortedByPriority = conflictEvents.sort((a, b) => 
      this.PRIORITY_SCORES[a.priority] - this.PRIORITY_SCORES[b.priority]
    )
    const targetEvent = sortedByPriority[0] // Lowest priority event
    
    if (!targetEvent.phase.isMovable) {
      // If target is not movable, try next event
      const nextTarget = sortedByPriority.find(e => e.phase.isMovable)
      if (!nextTarget) {
        // No movable events, can only ignore
        options.push({
          strategy: 'ignore',
          targetEventId: targetEvent.id,
          impact: 'low',
          description: '충돌을 무시하고 현재 일정을 유지합니다. 수동 조정이 필요할 수 있습니다.',
          estimatedCost: 10
        })
        return options
      }
    }

    const eventDuration = this.calculateEventDuration(targetEvent)
    const searchStart = new Date()
    const searchEnd = new Date()
    searchEnd.setMonth(searchEnd.getMonth() + 3) // Look ahead 3 months

    const availableSlots = this.findAvailableTimeSlots(
      targetEvent,
      searchStart,
      searchEnd,
      allEvents
    )

    // Postpone option (move to later date)
    const postponeSlot = availableSlots
      .filter(slot => new Date(slot.startDate) > new Date(targetEvent.endDate))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())[0]

    if (postponeSlot) {
      options.push({
        strategy: 'postpone',
        targetEventId: targetEvent.id,
        suggestedDate: postponeSlot.startDate,
        suggestedEndDate: postponeSlot.endDate,
        impact: this.calculateImpact(targetEvent, postponeSlot.startDate),
        description: `${targetEvent.project.name} 촬영을 ${new Date(postponeSlot.startDate).toLocaleDateString('ko-KR')}로 연기합니다.`,
        estimatedCost: this.calculateResolutionCost(targetEvent, 'postpone')
      })
    }

    // Advance option (move to earlier date)
    const advanceSlot = availableSlots
      .filter(slot => new Date(slot.endDate) < new Date(targetEvent.startDate))
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())[0]

    if (advanceSlot) {
      options.push({
        strategy: 'advance',
        targetEventId: targetEvent.id,
        suggestedDate: advanceSlot.startDate,
        suggestedEndDate: advanceSlot.endDate,
        impact: this.calculateImpact(targetEvent, advanceSlot.startDate),
        description: `${targetEvent.project.name} 촬영을 ${new Date(advanceSlot.startDate).toLocaleDateString('ko-KR')}로 앞당깁니다.`,
        estimatedCost: this.calculateResolutionCost(targetEvent, 'advance')
      })
    }

    // Ignore option (accept conflict)
    options.push({
      strategy: 'ignore',
      targetEventId: targetEvent.id,
      impact: 'medium',
      description: '충돌을 승인하고 현재 일정을 유지합니다. 리소스 조정이 필요할 수 있습니다.',
      estimatedCost: 20
    })

    // Custom option (manual intervention needed)
    options.push({
      strategy: 'custom',
      targetEventId: targetEvent.id,
      impact: 'high',
      description: '수동으로 일정을 조정합니다. 사용자가 직접 적절한 시간을 선택해야 합니다.',
      estimatedCost: 50
    })

    return options.sort((a, b) => a.estimatedCost - b.estimatedCost)
  }

  /**
   * Finds available time slots for an event
   */
  static findAvailableTimeSlots(
    event: ProjectCalendarEvent,
    searchStart: Date,
    searchEnd: Date,
    allEvents: ProjectCalendarEvent[]
  ): AvailableTimeSlot[] {
    const slots: AvailableTimeSlot[] = []
    const eventDuration = this.calculateEventDuration(event)
    
    // Filter out non-filming events for efficiency
    const filmingEvents = allEvents.filter(e => 
      e.phase.type === 'filming' && e.id !== event.id
    )

    const current = new Date(searchStart)
    while (current <= searchEnd) {
      const potentialStart = current.toISOString().split('T')[0]
      const potentialEnd = new Date(current)
      potentialEnd.setDate(potentialEnd.getDate() + eventDuration - 1)
      const potentialEndStr = potentialEnd.toISOString().split('T')[0]

      // Check if this slot conflicts with any existing events
      const hasConflict = filmingEvents.some(existingEvent => {
        const existingStart = existingEvent.startDate.split('T')[0]
        const existingEnd = existingEvent.endDate.split('T')[0]
        return potentialStart <= existingEnd && existingStart <= potentialEndStr
      })

      if (!hasConflict) {
        slots.push({
          startDate: potentialStart,
          endDate: potentialEndStr,
          score: this.calculateSlotScore(current),
          reason: this.getSlotReason(current)
        })
      }

      current.setDate(current.getDate() + 1)
    }

    return slots
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Return top 10 slots for performance
  }

  /**
   * Automatically resolves conflicts using specified strategy
   */
  static async autoResolveConflicts(
    conflicts: EnhancedCalendarConflict[],
    allEvents: ProjectCalendarEvent[],
    options: AutoResolutionOptions
  ): Promise<AutoResolutionResult[]> {
    const results: AutoResolutionResult[] = []

    for (const conflict of conflicts) {
      const resolutionOptions = this.generateResolutionOptions(conflict, allEvents)
      
      let recommendedOption: ConflictResolutionOption
      let confidence = 0.8

      switch (options.strategy) {
        case 'minimize-disruption':
          recommendedOption = resolutionOptions
            .filter(opt => opt.strategy !== 'ignore' && opt.strategy !== 'custom')
            .sort((a, b) => a.estimatedCost - b.estimatedCost)[0] || resolutionOptions[0]
          break

        case 'priority-based':
          recommendedOption = resolutionOptions
            .filter(opt => {
              const targetEvent = conflict.events.find(e => e.id === opt.targetEventId)
              return targetEvent && targetEvent.priority !== 'high'
            })[0] || resolutionOptions[0]
          break

        case 'earliest-available':
          recommendedOption = resolutionOptions
            .filter(opt => opt.suggestedDate)
            .sort((a, b) => {
              if (!a.suggestedDate || !b.suggestedDate) return 0
              return new Date(a.suggestedDate).getTime() - new Date(b.suggestedDate).getTime()
            })[0] || resolutionOptions[0]
          break

        default:
          recommendedOption = resolutionOptions[0]
      }

      // Adjust confidence based on option quality
      if (recommendedOption.strategy === 'ignore' || recommendedOption.strategy === 'custom') {
        confidence = 0.3
      }

      results.push({
        conflictId: conflict.id,
        recommendedAction: recommendedOption,
        alternativeActions: resolutionOptions.filter(opt => opt !== recommendedOption),
        confidence
      })
    }

    return results
  }

  /**
   * Validates a proposed resolution
   */
  static validateResolution(
    resolution: ProposedResolution,
    allEvents: ProjectCalendarEvent[]
  ): ResolutionValidationResult {
    const warnings: string[] = []
    const suggestions: string[] = []

    // Create a temporary event with new dates
    const targetEvent = allEvents.find(e => e.id === resolution.eventId)
    if (!targetEvent) {
      return {
        isValid: false,
        newConflicts: [],
        warnings: ['대상 이벤트를 찾을 수 없습니다.'],
        suggestions: []
      }
    }

    const tempEvent: ProjectCalendarEvent = {
      ...targetEvent,
      startDate: resolution.newStartDate,
      endDate: resolution.newEndDate
    }

    // Check for new conflicts
    const otherEvents = allEvents.filter(e => e.id !== resolution.eventId)
    const testEvents = [...otherEvents, tempEvent]

    // Import ConflictDetectionService (would need to import this)
    // For now, implement basic conflict check
    const newConflicts: EnhancedCalendarConflict[] = []
    
    otherEvents
      .filter(e => e.phase.type === 'filming')
      .forEach(event => {
        const eventStart = new Date(event.startDate)
        const eventEnd = new Date(event.endDate)
        const tempStart = new Date(tempEvent.startDate)
        const tempEnd = new Date(tempEvent.endDate)

        if (tempStart <= eventEnd && eventStart <= tempEnd) {
          newConflicts.push({
            id: `validation-conflict-${event.id}-${tempEvent.id}`,
            type: 'filming-overlap',
            events: [event, tempEvent],
            severity: 'warning',
            message: `새로운 충돌 발생: ${event.project.name}과 ${tempEvent.project.name}`,
            suggestedResolution: '다른 날짜를 선택하세요',
            createdAt: new Date().toISOString()
          })
        }
      })

    // Check for weekend scheduling
    const startDate = new Date(resolution.newStartDate)
    if (startDate.getDay() === 0 || startDate.getDay() === 6) {
      warnings.push('주말에 촬영이 예정되어 있습니다.')
      suggestions.push('가능하면 평일로 일정을 변경하는 것을 고려해보세요.')
    }

    // Check for very tight scheduling
    const nearbyEvents = otherEvents.filter(e => {
      const eventDate = new Date(e.startDate)
      const resolutionDate = new Date(resolution.newStartDate)
      const timeDiff = Math.abs(eventDate.getTime() - resolutionDate.getTime())
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24)
      return daysDiff < 2 // Within 2 days
    })

    if (nearbyEvents.length > 0) {
      warnings.push('인접한 날짜에 다른 일정이 있습니다.')
      suggestions.push('충분한 준비 시간을 고려해 주세요.')
    }

    return {
      isValid: newConflicts.length === 0,
      newConflicts,
      warnings,
      suggestions
    }
  }

  /**
   * Helper: Calculate event duration in days
   */
  private static calculateEventDuration(event: ProjectCalendarEvent): number {
    const start = new Date(event.startDate)
    const end = new Date(event.endDate)
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
  }

  /**
   * Helper: Calculate business impact of moving an event
   */
  private static calculateImpact(
    event: ProjectCalendarEvent,
    newDate: string
  ): 'low' | 'medium' | 'high' {
    const currentDate = new Date(event.startDate)
    const proposedDate = new Date(newDate)
    const daysDifference = Math.abs(
      (proposedDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    if (daysDifference <= 3) return 'low'
    if (daysDifference <= 7) return 'medium'
    return 'high'
  }

  /**
   * Helper: Calculate resolution cost (lower is better)
   */
  private static calculateResolutionCost(
    event: ProjectCalendarEvent,
    strategy: ResolutionStrategy
  ): number {
    let baseCost = this.PRIORITY_SCORES[event.priority]
    
    // Adjust cost by strategy
    switch (strategy) {
      case 'advance':
        baseCost *= 0.8 // Slightly prefer advancing
        break
      case 'postpone':
        baseCost *= 1.0 // Neutral
        break
      case 'ignore':
        baseCost *= 0.5 // Lowest cost but may have other impacts
        break
      case 'custom':
        baseCost *= 2.0 // Highest cost due to manual intervention
        break
    }

    return baseCost
  }

  /**
   * Helper: Calculate slot quality score
   */
  private static calculateSlotScore(date: Date): number {
    let score = this.BUSINESS_HOURS_SCORE
    
    // Penalize weekends
    if (date.getDay() === 0 || date.getDay() === 6) {
      score *= this.WEEKEND_PENALTY
    }

    // Prefer mid-week
    if (date.getDay() >= 2 && date.getDay() <= 4) {
      score *= 1.2
    }

    // Prefer near future (next few weeks)
    const today = new Date()
    const daysDiff = (date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    
    if (daysDiff >= 7 && daysDiff <= 21) {
      score *= 1.1 // Sweet spot
    } else if (daysDiff < 7) {
      score *= 0.8 // Too soon
    } else if (daysDiff > 30) {
      score *= 0.9 // Too far out
    }

    return score
  }

  /**
   * Helper: Get human-readable reason for slot recommendation
   */
  private static getSlotReason(date: Date): string {
    const day = date.getDay()
    const today = new Date()
    const daysDiff = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (day >= 2 && day <= 4 && daysDiff >= 7 && daysDiff <= 21) {
      return '최적의 시간대: 평일이며 적절한 준비 기간이 있습니다.'
    } else if (day === 0 || day === 6) {
      return '주말 일정: 추가 비용이 발생할 수 있습니다.'
    } else if (daysDiff < 7) {
      return '긴급 일정: 준비 시간이 부족할 수 있습니다.'
    } else {
      return '사용 가능한 일정입니다.'
    }
  }
}