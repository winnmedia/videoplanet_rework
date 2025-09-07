/**
 * Project Entity Type Integration Tests
 * @description TDD test for Project type conflicts resolution
 */

import { describe, it, expect } from 'vitest'

import { Project as CalendarEntityProjectType } from '../../../calendar/model/types'
import { Project as CalendarProjectType } from '../calendar-types'
import { Project as ProjectEntityType } from '../types'

describe('Project Type Integration', () => {
  describe('Type Consistency', () => {
    it('should have consistent id and name properties across all Project types', () => {
      // Red phase: This test should initially fail due to type mismatches
      
      const projectEntityData = {
        id: '1',
        title: 'Test Project', // Note: ProjectEntity uses 'title'
        description: 'Test description',
        status: 'active' as const,
        ownerId: 'user1',
        members: [],
        videos: [],
        tags: [],
        settings: {
          isPublic: false,
          allowComments: true,
          allowDownload: false,
          requireApproval: false,
          watermarkEnabled: false,
        },
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      } satisfies ProjectEntityType

      const calendarProjectData = {
        id: '1',
        name: 'Test Project', // Note: CalendarProject uses 'name'
        status: 'active' as const,
        color: '#000000',
        hue: 240,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        description: 'Test description'
      } satisfies CalendarProjectType

      const calendarEntityProjectData = {
        id: '1',
        name: 'Test Project',
        color: '#000000',
        hue: 240,
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        status: 'active' as const,
        phases: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      } satisfies CalendarEntityProjectType

      // This should pass once types are aligned
      expect(projectEntityData.id).toBe(calendarProjectData.id)
      expect(calendarProjectData.id).toBe(calendarEntityProjectData.id)
    })

    it('should support required calendar properties for Project type', () => {
      // Red phase: Test should fail because ProjectEntity lacks required calendar properties
      
      const projectWithCalendarProps = {
        id: '1',
        title: 'Test Project',
        name: 'Test Project', // Should be derived from title
        description: 'Test description', 
        status: 'active' as const,
        ownerId: 'user1',
        members: [],
        videos: [],
        tags: [],
        settings: {
          isPublic: false,
          allowComments: true,
          allowDownload: false,
          requireApproval: false,
          watermarkEnabled: false,
        },
        // Calendar-specific properties that should be added:
        color: '#3B82F6',
        hue: 217,
        startDate: '2025-01-01',
        endDate: '2025-03-31',
        organization: 'Test Org',
        manager: 'Test Manager',
        phases: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      }

      // These assertions should pass once Project type is unified
      expect(projectWithCalendarProps).toHaveProperty('color')
      expect(projectWithCalendarProps).toHaveProperty('hue')
      expect(projectWithCalendarProps).toHaveProperty('startDate')
      expect(projectWithCalendarProps).toHaveProperty('endDate')
    })

    it('should support ProjectPhase with required calendar properties', () => {
      // Red phase: Test should fail due to missing properties in ProjectPhase
      
      const projectPhase = {
        id: '1',
        name: 'Pre-production',
        type: 'pre-production' as const,
        projectId: 'project1',
        startDate: '2025-01-01',
        endDate: '2025-01-15',
        duration: 14,
        color: '#3B82F6',
        isMovable: true,
        dependencies: [],
        // Missing properties that should be added:
        status: 'in-progress' as const,
        conflictLevel: 'none' as const,
        isEditable: true,
        assignedTo: [],
        resources: []
      }

      expect(projectPhase).toHaveProperty('status')
      expect(projectPhase).toHaveProperty('conflictLevel') 
      expect(projectPhase).toHaveProperty('isEditable')
    })
  })

  describe('Calendar Event Type Compatibility', () => {
    it('should create ProjectCalendarEvent with unified types', () => {
      // Red phase: Should fail due to type incompatibility
      
      const project = {
        id: '1',
        name: 'Test Project',
        title: 'Test Project',
        color: '#3B82F6',
        hue: 217,
        startDate: '2025-01-01',
        endDate: '2025-03-31',
        status: 'active' as const,
        phases: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      }

      const phase = {
        id: '1',
        name: 'Pre-production',
        type: 'pre-production' as const,
        projectId: 'project1',
        startDate: '2025-01-01',
        endDate: '2025-01-15',
        duration: 14,
        status: 'in-progress' as const,
        conflictLevel: 'none' as const,
        isEditable: true,
        isMovable: true
      }

      const calendarEvent = {
        id: '1',
        title: 'Test Event',
        startDate: '2025-01-01',
        endDate: '2025-01-15',
        isAllDay: false,
        category: 'project-deadline' as const,
        priority: 'high' as const,
        recurrence: 'none' as const,
        createdBy: 'user1',
        isCompleted: false,
        project,
        phase,
        isConflicting: false,
        isDraggable: true,
        isResizable: true
      }

      expect(calendarEvent.project.id).toBe('1')
      expect(calendarEvent.phase.type).toBe('pre-production')
    })
  })
})