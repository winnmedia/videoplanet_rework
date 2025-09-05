/**
 * Conflict Detection Service Tests
 * @description TDD tests for calendar conflict detection domain logic
 */

import { describe, it, expect, beforeEach } from 'vitest'

import { ConflictDetectionService } from '../lib/conflictDetection'
import type { ProjectCalendarEvent, Project, ProjectPhase } from '../model/types'

describe('ConflictDetectionService', () => {
  let mockProjects: Project[]
  let mockPhases: ProjectPhase[]
  let mockEvents: ProjectCalendarEvent[]

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
      }
    ]

    // Setup mock phases
    mockPhases = [
      {
        id: 'phase-1-filming',
        name: '프로젝트 A 촬영',
        type: 'filming',
        projectId: 'project-1',
        startDate: '2025-01-15',
        endDate: '2025-01-17',
        duration: 3,
        isMovable: true
      },
      {
        id: 'phase-2-filming',
        name: '프로젝트 B 촬영',
        type: 'filming',
        projectId: 'project-2',
        startDate: '2025-01-16',
        endDate: '2025-01-18',
        duration: 3,
        isMovable: true
      },
      {
        id: 'phase-1-planning',
        name: '프로젝트 A 기획',
        type: 'planning',
        projectId: 'project-1',
        startDate: '2025-01-10',
        endDate: '2025-01-14',
        duration: 5,
        isMovable: true
      }
    ]

    // Setup mock events
    mockEvents = [
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
        phase: mockPhases[0],
        isConflicting: false
      },
      {
        id: 'event-2',
        title: '프로젝트 B 촬영',
        startDate: '2025-01-16T09:00:00Z',
        endDate: '2025-01-18T18:00:00Z',
        isAllDay: false,
        category: 'filming',
        priority: 'high',
        recurrence: 'none',
        createdBy: 'user-1',
        isCompleted: false,
        project: mockProjects[1],
        phase: mockPhases[1],
        isConflicting: false
      },
      {
        id: 'event-3',
        title: '프로젝트 A 기획',
        startDate: '2025-01-10T09:00:00Z',
        endDate: '2025-01-14T18:00:00Z',
        isAllDay: false,
        category: 'project-deadline',
        priority: 'medium',
        recurrence: 'none',
        createdBy: 'user-1',
        isCompleted: false,
        project: mockProjects[0],
        phase: mockPhases[2],
        isConflicting: false
      }
    ]
  })

  describe('detectConflicts', () => {
    it('should detect filming overlaps correctly', () => {
      // Given: Two filming events with overlapping dates
      const result = ConflictDetectionService.detectConflicts(mockEvents)

      // Then: Should detect exactly one conflict
      expect(result.hasConflicts).toBe(true)
      expect(result.conflictCount).toBe(1)
      expect(result.conflicts).toHaveLength(1)
      
      const conflict = result.conflicts[0]
      expect(conflict.type).toBe('filming-overlap')
      expect(conflict.severity).toBe('warning')
      expect(conflict.events).toHaveLength(2)
      expect(conflict.message).toContain('촬영 일정 충돌')
    })

    it('should NOT detect conflicts between planning and filming phases', () => {
      // Given: Only events without filming overlaps
      const nonConflictingEvents = [mockEvents[0], mockEvents[2]] // filming + planning

      // When: Detecting conflicts
      const result = ConflictDetectionService.detectConflicts(nonConflictingEvents)

      // Then: Should not detect any conflicts
      expect(result.hasConflicts).toBe(false)
      expect(result.conflictCount).toBe(0)
      expect(result.conflicts).toHaveLength(0)
    })

    it('should only flag filming phases for conflict detection as per DEVPLAN requirements', () => {
      // Given: Events with all phase types
      const allPhaseEvents = mockEvents

      // When: Detecting conflicts
      const result = ConflictDetectionService.detectConflicts(allPhaseEvents)

      // Then: Should only check filming overlaps
      expect(result.conflicts.every(c => c.type === 'filming-overlap')).toBe(true)
    })

    it('should identify affected events correctly', () => {
      // Given: Events with conflicts
      const result = ConflictDetectionService.detectConflicts(mockEvents)

      // Then: Should identify both conflicting filming events
      expect(result.affectedEvents).toHaveLength(2)
      expect(result.affectedEvents.map(e => e.id)).toEqual(
        expect.arrayContaining(['event-1', 'event-2'])
      )
    })
  })

  describe('predictConflicts', () => {
    it('should predict conflicts when moving an event to conflicting dates', () => {
      // Given: Moving event-1 to overlap more with event-2
      const movingEvent = mockEvents[0]
      const newStartDate = '2025-01-16'
      const newEndDate = '2025-01-19'

      // When: Predicting conflicts
      const predictedConflicts = ConflictDetectionService.predictConflicts(
        movingEvent,
        newStartDate,
        newEndDate,
        mockEvents
      )

      // Then: Should predict conflicts
      expect(predictedConflicts).toHaveLength(1)
      expect(predictedConflicts[0].type).toBe('filming-overlap')
    })

    it('should predict no conflicts when moving to non-conflicting dates', () => {
      // Given: Moving event-1 to non-conflicting dates
      const movingEvent = mockEvents[0]
      const newStartDate = '2025-01-20'
      const newEndDate = '2025-01-22'

      // When: Predicting conflicts
      const predictedConflicts = ConflictDetectionService.predictConflicts(
        movingEvent,
        newStartDate,
        newEndDate,
        mockEvents
      )

      // Then: Should predict no conflicts
      expect(predictedConflicts).toHaveLength(0)
    })
  })

  describe('isValidDropZone', () => {
    it('should allow drop in valid non-conflicting zones', () => {
      // Given: A drop zone without conflicts
      const draggedEvent = mockEvents[0]
      const dropDate = '2025-01-20'

      // When: Validating drop zone
      const isValid = ConflictDetectionService.isValidDropZone(
        draggedEvent,
        dropDate,
        mockEvents
      )

      // Then: Should be valid
      expect(isValid).toBe(true)
    })

    it('should allow drop zones with only warnings (not errors)', () => {
      // Given: A drop zone that would create warnings
      const draggedEvent = mockEvents[0]
      const dropDate = '2025-01-16' // Would overlap with event-2

      // When: Validating drop zone
      const isValid = ConflictDetectionService.isValidDropZone(
        draggedEvent,
        dropDate,
        mockEvents
      )

      // Then: Should be valid (warnings are allowed)
      expect(isValid).toBe(true) // Since conflicts are warnings, not errors
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty event arrays', () => {
      // Given: Empty events array
      const result = ConflictDetectionService.detectConflicts([])

      // Then: Should return empty conflict result
      expect(result.hasConflicts).toBe(false)
      expect(result.conflictCount).toBe(0)
      expect(result.conflicts).toHaveLength(0)
      expect(result.affectedEvents).toHaveLength(0)
    })

    it('should handle single event arrays', () => {
      // Given: Single event
      const result = ConflictDetectionService.detectConflicts([mockEvents[0]])

      // Then: Should not find conflicts
      expect(result.hasConflicts).toBe(false)
    })

    it('should handle events with same start/end dates (boundary case)', () => {
      // Given: Events that touch but don't overlap
      const touchingEvents = [
        {
          ...mockEvents[0],
          startDate: '2025-01-15T09:00:00Z',
          endDate: '2025-01-16T09:00:00Z'
        },
        {
          ...mockEvents[1],
          startDate: '2025-01-16T09:00:00Z',
          endDate: '2025-01-17T18:00:00Z'
        }
      ]

      // When: Detecting conflicts
      const result = ConflictDetectionService.detectConflicts(touchingEvents)

      // Then: Should detect overlap (same moment counts as overlap)
      expect(result.hasConflicts).toBe(true)
    })
  })

  describe('Performance Requirements', () => {
    it('should handle large event sets efficiently', () => {
      // Given: Large number of events
      const largeEventSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockEvents[0],
        id: `event-${i}`,
        startDate: `2025-01-${(i % 30) + 1}T09:00:00Z`,
        endDate: `2025-01-${(i % 30) + 1}T18:00:00Z`
      }))

      // When: Detecting conflicts (with performance measurement)
      const startTime = performance.now()
      const result = ConflictDetectionService.detectConflicts(largeEventSet)
      const endTime = performance.now()

      // Then: Should complete within reasonable time (< 100ms)
      expect(endTime - startTime).toBeLessThan(100)
      expect(result).toBeDefined()
    })
  })
})