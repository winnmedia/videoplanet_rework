/**
 * Conflict Visualization Calendar Integration Tests
 * @description Comprehensive tests for conflict detection, resolution, and accessibility
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ConflictVisualizationCalendar } from '../ConflictVisualizationCalendar'
import type { ProjectCalendarEvent, Project, ProjectPhase } from '@/entities/calendar'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

describe('ConflictVisualizationCalendar', () => {
  let mockProjects: Project[]
  let mockEvents: ProjectCalendarEvent[]
  let mockFilters: any
  let mockHandlers: any

  beforeEach(() => {
    // Setup mock data
    mockProjects = [
      {
        id: 'project-1',
        name: '브랜드 A 광고영상',
        color: '#3B82F6',
        status: 'active',
        phases: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'project-2',
        name: '브랜드 B 홍보영상',
        color: '#10B981',
        status: 'active',
        phases: [],
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      }
    ]

    // Conflicting filming events
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
      }
    ]

    mockFilters = {
      showConflictsOnly: false,
      selectedProjects: [],
      selectedPhaseTypes: [],
      dateRange: {
        start: '2025-01-01',
        end: '2025-01-31'
      }
    }

    mockHandlers = {
      onDateSelect: vi.fn(),
      onEventClick: vi.fn(),
      onEventMove: vi.fn(),
      onNavigateMonth: vi.fn()
    }
  })

  describe('Conflict Detection and Visualization', () => {
    it('should detect and visually display conflicts', async () => {
      render(
        <ConflictVisualizationCalendar
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Should show conflict alert
      expect(screen.getByText(/일정 충돌 감지/)).toBeInTheDocument()
      
      // Should show conflict count in month header
      await waitFor(() => {
        expect(screen.getByText(/총 1개 충돌/)).toBeInTheDocument()
      })

      // Should highlight conflicting dates
      const conflictingCells = screen.getAllByRole('gridcell')
        .filter(cell => cell.getAttribute('aria-label')?.includes('충돌'))
      
      expect(conflictingCells.length).toBeGreaterThan(0)
    })

    it('should show conflict resolution options when expanded', async () => {
      const user = userEvent.setup()

      render(
        <ConflictVisualizationCalendar
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Expand conflict details
      const expandButton = screen.getByRole('button', { expanded: false })
      await user.click(expandButton)

      // Should show resolution options
      await waitFor(() => {
        expect(screen.getByText('일정 연기')).toBeInTheDocument()
        expect(screen.getByText('일정 앞당기기')).toBeInTheDocument()
        expect(screen.getByText('충돌 무시')).toBeInTheDocument()
      })
    })

    it('should handle auto-resolution', async () => {
      const user = userEvent.setup()

      render(
        <ConflictVisualizationCalendar
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Click auto-resolve button
      const autoResolveButton = screen.getByRole('button', { name: /자동 해결/ })
      await user.click(autoResolveButton)

      // Should show loading state
      expect(screen.getByText(/자동 해결 중.../)).toBeInTheDocument()
    })
  })

  describe('Accessibility Features', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <ConflictVisualizationCalendar
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()

      render(
        <ConflictVisualizationCalendar
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      const calendarGrid = screen.getByRole('grid')
      calendarGrid.focus()

      // Test arrow key navigation
      await user.keyboard('{ArrowRight}')
      await user.keyboard('{ArrowDown}')
      await user.keyboard('{ArrowLeft}')
      await user.keyboard('{ArrowUp}')

      // Test selection
      await user.keyboard('{Enter}')
      expect(mockHandlers.onDateSelect).toHaveBeenCalled()
    })

    it('should announce conflicts to screen readers', async () => {
      // Create live region spy
      const liveRegion = document.createElement('div')
      liveRegion.id = 'calendar-announcements'
      document.body.appendChild(liveRegion)

      render(
        <ConflictVisualizationCalendar
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Should announce conflicts after detection
      await waitFor(() => {
        expect(liveRegion.textContent).toContain('충돌')
      })

      document.body.removeChild(liveRegion)
    })

    it('should have proper ARIA labels for calendar cells', () => {
      render(
        <ConflictVisualizationCalendar
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Check for proper cell labeling
      const cells = screen.getAllByRole('gridcell')
      const conflictCell = cells.find(cell => 
        cell.getAttribute('aria-label')?.includes('충돌')
      )

      expect(conflictCell).toHaveAttribute('aria-label')
      expect(conflictCell?.getAttribute('aria-label')).toMatch(/2025년.*월.*일.*충돌/)
    })
  })

  describe('Performance', () => {
    it('should handle large numbers of events efficiently', async () => {
      // Create large dataset
      const largeEventSet = Array.from({ length: 100 }, (_, i) => ({
        ...mockEvents[0],
        id: `event-${i}`,
        startDate: `2025-01-${(i % 28) + 1}T09:00:00Z`,
        endDate: `2025-01-${(i % 28) + 2}T18:00:00Z`
      }))

      const startTime = performance.now()

      render(
        <ConflictVisualizationCalendar
          events={largeEventSet}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      const renderTime = performance.now() - startTime

      // Should render within reasonable time (2 seconds)
      expect(renderTime).toBeLessThan(2000)
      
      // Should still detect conflicts
      await waitFor(() => {
        expect(screen.getByText(/일정 충돌 감지/)).toBeInTheDocument()
      })
    })

    it('should debounce conflict detection on filter changes', async () => {
      const { rerender } = render(
        <ConflictVisualizationCalendar
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Rapidly change filters
      const startTime = performance.now()
      for (let i = 0; i < 5; i++) {
        rerender(
          <ConflictVisualizationCalendar
            events={mockEvents}
            selectedDate={new Date('2025-01-15')}
            filters={{ ...mockFilters, selectedProjects: [`project-${i}`] }}
            {...mockHandlers}
          />
        )
      }
      const endTime = performance.now()

      // Should handle rapid updates efficiently
      expect(endTime - startTime).toBeLessThan(100)
    })
  })

  describe('Filter Integration', () => {
    it('should show only conflicting events when conflict filter is enabled', async () => {
      const conflictFilters = {
        ...mockFilters,
        showConflictsOnly: true
      }

      render(
        <ConflictVisualizationCalendar
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={conflictFilters}
          {...mockHandlers}
        />
      )

      // Should still show conflicts
      await waitFor(() => {
        expect(screen.getByText(/일정 충돌 감지/)).toBeInTheDocument()
      })
    })

    it('should filter events by project', () => {
      const projectFilters = {
        ...mockFilters,
        selectedProjects: ['project-1']
      }

      render(
        <ConflictVisualizationCalendar
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={projectFilters}
          {...mockHandlers}
        />
      )

      // Should only show events from selected project
      const cells = screen.getAllByRole('gridcell')
      const eventCells = cells.filter(cell => 
        cell.textContent?.includes('프로젝트 A')
      )
      
      expect(eventCells.length).toBeGreaterThan(0)
    })
  })

  describe('Event Interaction', () => {
    it('should handle event clicks', async () => {
      const user = userEvent.setup()

      render(
        <ConflictVisualizationCalendar
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Find and click an event
      const eventButton = screen.getByRole('button', { name: /프로젝트 A 촬영/ })
      await user.click(eventButton)

      expect(mockHandlers.onEventClick).toHaveBeenCalledWith(mockEvents[0])
    })

    it('should handle month navigation', async () => {
      const user = userEvent.setup()

      render(
        <ConflictVisualizationCalendar
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Navigate to previous month
      const prevButton = screen.getByRole('button', { name: '이전 월' })
      await user.click(prevButton)

      expect(mockHandlers.onNavigateMonth).toHaveBeenCalledWith('prev')
    })

    it('should handle conflict resolution', async () => {
      const user = userEvent.setup()

      render(
        <ConflictVisualizationCalendar
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Expand conflict and select resolution
      const expandButton = screen.getByRole('button', { expanded: false })
      await user.click(expandButton)

      const postponeButton = screen.getByRole('option', { name: /일정 연기/ })
      await user.click(postponeButton)

      const applyButton = screen.getByRole('button', { name: /해결책 적용/ })
      await user.click(applyButton)

      // Should call onEventMove when resolution is applied
      await waitFor(() => {
        expect(mockHandlers.onEventMove).toHaveBeenCalled()
      })
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty events array', () => {
      render(
        <ConflictVisualizationCalendar
          events={[]}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Should not show conflict alerts
      expect(screen.queryByText(/일정 충돌 감지/)).not.toBeInTheDocument()
      
      // Should still show calendar grid
      expect(screen.getByRole('grid')).toBeInTheDocument()
    })

    it('should handle events without conflicts', () => {
      const nonConflictingEvents = [mockEvents[0]] // Only one event

      render(
        <ConflictVisualizationCalendar
          events={nonConflictingEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Should not show conflict alerts
      expect(screen.queryByText(/일정 충돌 감지/)).not.toBeInTheDocument()
    })
  })
})