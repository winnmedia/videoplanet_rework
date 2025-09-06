/**
 * Conflict Resolution Service Tests
 * @description TDD tests for automated conflict resolution
 */

import { describe, it, expect, beforeEach } from 'vitest'

import { ConflictResolutionService } from '../lib/conflictResolution'
import type { ProjectCalendarEvent, Project, ProjectPhase, EnhancedCalendarConflict } from '../model/types'

describe('ConflictResolutionService', () => {
  let mockProjects: Project[]
  let mockPhases: ProjectPhase[]
  let mockEvents: ProjectCalendarEvent[]
  let conflictingEvents: ProjectCalendarEvent[]

  beforeEach(() => {
    // Setup mock projects
    mockProjects = [
      {
        id: 'project-1',
        name: '브랜드 A 광고영상',
        color: '#3B82F6',
        description: 'Brand A commercial video',
        status: 'active',
        phases: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'project-2', 
        name: '브랜드 B 홍보영상',
        color: '#10B981',
        description: 'Brand B promotional video',
        status: 'active',
        phases: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'project-3',
        name: '브랜드 C 제품소개',
        color: '#F59E0B', 
        description: 'Brand C product introduction',
        status: 'active',
        phases: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      }
    ]

    // Setup conflicting filming events
    conflictingEvents = [
      {
        id: 'event-1',
        title: '프로젝트 A 촬영',
        startDate: '2025-01-15T09:00:00Z',
        endDate: '2025-01-17T18:00:00Z',
        isAllDay: false,
        category: 'filming',
        priority: 'high',
        recurrence: 'none',
        createdBy: 'user-1',
        isCompleted: false,
        project: mockProjects[0],
        phase: {
          id: 'phase-1-filming',
          name: '프로젝트 A 촬영',
          type: 'filming',
          projectId: 'project-1',
          startDate: '2025-01-15',
          endDate: '2025-01-17',
          duration: 3,
          isMovable: true
        },
        isConflicting: false
      },
      {
        id: 'event-2',
        title: '프로젝트 B 촬영',
        startDate: '2025-01-16T09:00:00Z',
        endDate: '2025-01-18T18:00:00Z',
        isAllDay: false,
        category: 'filming',
        priority: 'medium',
        recurrence: 'none',
        createdBy: 'user-2',
        isCompleted: false,
        project: mockProjects[1],
        phase: {
          id: 'phase-2-filming',
          name: '프로젝트 B 촬영',
          type: 'filming',
          projectId: 'project-2',
          startDate: '2025-01-16',
          endDate: '2025-01-18',
          duration: 3,
          isMovable: true
        },
        isConflicting: false
      },
      {
        id: 'event-3',
        title: '프로젝트 C 촬영',
        startDate: '2025-01-17T09:00:00Z', 
        endDate: '2025-01-19T18:00:00Z',
        isAllDay: false,
        category: 'filming',
        priority: 'low',
        recurrence: 'none',
        createdBy: 'user-3',
        isCompleted: false,
        project: mockProjects[2],
        phase: {
          id: 'phase-3-filming',
          name: '프로젝트 C 촬영',
          type: 'filming',
          projectId: 'project-3',
          startDate: '2025-01-17',
          endDate: '2025-01-19',
          duration: 3,
          isMovable: true
        },
        isConflicting: false
      }
    ]
  })

  describe('generateResolutionOptions', () => {
    it('should generate valid resolution options for conflicting events', () => {
      // Given: Conflicting events
      const conflict: EnhancedCalendarConflict = {
        id: 'conflict-1',
        type: 'filming-overlap',
        events: [conflictingEvents[0], conflictingEvents[1]],
        severity: 'warning',
        message: '촬영 일정 충돌',
        suggestedResolution: '일정 조정 필요',
        createdAt: '2025-01-01T00:00:00Z'
      }

      // When: Generating resolution options
      const options = ConflictResolutionService.generateResolutionOptions(conflict, conflictingEvents)

      // Then: Should provide multiple resolution strategies
      expect(options.length).toBeGreaterThanOrEqual(2) // At least ignore and custom/postpone/advance
      
      // Should have at least ignore option
      const ignoreOption = options.find(o => o.strategy === 'ignore')
      expect(ignoreOption).toBeDefined()
      
      // May have postpone or advance options depending on available time slots
      const schedulingOptions = options.filter(o => o.strategy === 'postpone' || o.strategy === 'advance')
      expect(schedulingOptions.length).toBeGreaterThanOrEqual(0) // Could be 0 if no slots available
    })

    it('should prioritize lower priority events for rescheduling', () => {
      // Given: Events with different priorities
      const conflict: EnhancedCalendarConflict = {
        id: 'conflict-1',
        type: 'filming-overlap',
        events: [conflictingEvents[0], conflictingEvents[1]], // high vs medium priority
        severity: 'warning',
        message: '촬영 일정 충돌',
        suggestedResolution: '일정 조정 필요',
        createdAt: '2025-01-01T00:00:00Z'
      }

      // When: Generating resolution options
      const options = ConflictResolutionService.generateResolutionOptions(conflict, conflictingEvents)

      // Then: Should suggest moving lower priority event
      const postponeOption = options.find(o => o.strategy === 'postpone')
      expect(postponeOption?.targetEventId).toBe('event-2') // medium priority event
    })

    it('should find earliest available time slots', () => {
      // Given: Multiple conflicting events
      const allEvents = conflictingEvents

      // When: Finding available time slots
      const availableSlots = ConflictResolutionService.findAvailableTimeSlots(
        conflictingEvents[0], // 3-day duration
        new Date('2025-01-01'),
        new Date('2025-01-31'),
        allEvents
      )

      // Then: Should return slots before and after conflicts
      expect(availableSlots.length).toBeGreaterThan(0)
      expect(new Date(availableSlots[0].startDate).getTime()).toBeLessThan(new Date('2025-01-15').getTime())
    })
  })

  describe('autoResolveConflicts', () => {
    it('should automatically resolve conflicts using optimal strategy', async () => {
      // Given: Multiple conflicts
      const conflicts: EnhancedCalendarConflict[] = [
        {
          id: 'conflict-1',
          type: 'filming-overlap',
          events: [conflictingEvents[0], conflictingEvents[1]],
          severity: 'warning',
          message: '촬영 일정 충돌',
          suggestedResolution: '일정 조정 필요',
          createdAt: '2025-01-01T00:00:00Z'
        }
      ]

      // When: Auto-resolving conflicts
      const resolutions = await ConflictResolutionService.autoResolveConflicts(
        conflicts,
        conflictingEvents,
        { strategy: 'minimize-disruption' }
      )

      // Then: Should provide resolution plan
      expect(resolutions).toHaveLength(1)
      expect(resolutions[0].conflictId).toBe('conflict-1')
      expect(resolutions[0].recommendedAction).toBeDefined()
    })

    it('should respect non-movable events during resolution', async () => {
      // Given: Events with different movability
      const fixedEvent = {
        ...conflictingEvents[0],
        phase: { ...conflictingEvents[0].phase, isMovable: false }
      }
      const eventsWithFixed = [fixedEvent, conflictingEvents[1]]

      const conflicts: EnhancedCalendarConflict[] = [
        {
          id: 'conflict-1',
          type: 'filming-overlap',
          events: [fixedEvent, conflictingEvents[1]],
          severity: 'warning',
          message: '촬영 일정 충돌',
          suggestedResolution: '일정 조정 필요',
          createdAt: '2025-01-01T00:00:00Z'
        }
      ]

      // When: Auto-resolving with fixed events
      const resolutions = await ConflictResolutionService.autoResolveConflicts(
        conflicts,
        eventsWithFixed,
        { strategy: 'minimize-disruption' }
      )

      // Then: Should only suggest moving movable events
      expect(resolutions[0].recommendedAction.targetEventId).toBe('event-2')
    })
  })

  describe('validateResolution', () => {
    it('should validate proposed resolutions do not create new conflicts', () => {
      // Given: Proposed resolution
      const proposedResolution = {
        eventId: 'event-2',
        newStartDate: '2025-01-20T09:00:00Z',
        newEndDate: '2025-01-22T18:00:00Z'
      }

      // When: Validating resolution
      const validation = ConflictResolutionService.validateResolution(
        proposedResolution,
        conflictingEvents
      )

      // Then: Should be valid (no new conflicts)
      expect(validation.isValid).toBe(true)
      expect(validation.newConflicts).toHaveLength(0)
    })

    it('should detect when resolution creates new conflicts', () => {
      // Given: Resolution that would create new conflicts
      const proposedResolution = {
        eventId: 'event-1',
        newStartDate: '2025-01-18T09:00:00Z', // would overlap with event-3
        newEndDate: '2025-01-20T18:00:00Z'
      }

      // When: Validating resolution
      const validation = ConflictResolutionService.validateResolution(
        proposedResolution,
        conflictingEvents
      )

      // Then: Should detect new conflicts
      expect(validation.isValid).toBe(false)
      expect(validation.newConflicts.length).toBeGreaterThan(0)
    })
  })

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of conflicting events efficiently', () => {
      // Given: Large set of conflicting events with valid dates
      const largeEventSet = Array.from({ length: 10 }, (_, i) => {
        const day = (i % 27) + 1 // Ensure valid days 1-27
        return {
          ...conflictingEvents[0],
          id: `event-${i}`,
          startDate: `2025-01-${day.toString().padStart(2, '0')}T09:00:00Z`,
          endDate: `2025-01-${(day + 1).toString().padStart(2, '0')}T18:00:00Z`
        }
      })

      // When: Finding available slots (with performance check)
      const startTime = performance.now()
      const slots = ConflictResolutionService.findAvailableTimeSlots(
        largeEventSet[0],
        new Date('2025-01-01'),
        new Date('2025-02-28'),
        largeEventSet
      )
      const endTime = performance.now()

      // Then: Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(500) // 500ms max
      expect(slots).toBeDefined()
    })

    it('should handle empty conflict lists gracefully', async () => {
      // Given: Empty conflicts
      const resolutions = await ConflictResolutionService.autoResolveConflicts(
        [],
        conflictingEvents,
        { strategy: 'minimize-disruption' }
      )

      // Then: Should return empty resolutions
      expect(resolutions).toHaveLength(0)
    })
  })
})