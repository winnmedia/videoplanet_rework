/**
 * DragDropCalendarView Component Tests
 * @description TDD tests for drag-and-drop calendar functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import '@testing-library/jest-dom'

import type { ProjectCalendarEvent, CalendarFilterOptions, Project, ProjectPhase } from '@/entities/calendar'

import { DragDropCalendarView } from '../DragDropCalendarView'

// Mock @dnd-kit dependencies
vi.mock('@dnd-kit/core', () => ({
  DndContext: ({ children, onDragEnd, onDragStart, onDragOver }: any) => (
    <div data-testid="dnd-context" onDrop={() => onDragEnd?.({ active: { id: 'event-1' }, over: { id: '2025-01-20' } })}>
      {children}
    </div>
  ),
  useSensor: vi.fn(() => ({})),
  useSensors: vi.fn(() => []),
  PointerSensor: vi.fn(),
  KeyboardSensor: vi.fn(),
  closestCenter: vi.fn(),
  DragOverlay: ({ children }: any) => <div data-testid="drag-overlay">{children}</div>
}))

vi.mock('@dnd-kit/modifiers', () => ({
  restrictToWindowEdges: vi.fn(),
  restrictToFirstScrollableAncestor: vi.fn()
}))

vi.mock('@dnd-kit/sortable', () => ({
  sortableKeyboardCoordinates: vi.fn()
}))

describe('DragDropCalendarView', () => {
  let mockEvents: ProjectCalendarEvent[]
  let mockFilters: CalendarFilterOptions
  let mockHandlers: {
    onDateSelect: ReturnType<typeof vi.fn>
    onEventMove: ReturnType<typeof vi.fn>
    onEventClick: ReturnType<typeof vi.fn>
    onNavigateMonth: ReturnType<typeof vi.fn>
    onFiltersChange: ReturnType<typeof vi.fn>
  }

  beforeEach(() => {
    // Setup mock data
    const mockProject: Project = {
      id: 'project-1',
      name: '테스트 프로젝트',
      color: '#3B82F6',
      description: 'Test project',
      status: 'active',
      phases: [],
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    }

    const mockPhase: ProjectPhase = {
      id: 'phase-1',
      name: '촬영',
      type: 'filming',
      projectId: 'project-1',
      startDate: '2025-01-15',
      endDate: '2025-01-17',
      duration: 3,
      isMovable: true
    }

    mockEvents = [
      {
        id: 'event-1',
        title: '테스트 촬영',
        startDate: '2025-01-15T09:00:00Z',
        endDate: '2025-01-17T18:00:00Z',
        isAllDay: false,
        category: 'filming',
        priority: 'high',
        recurrence: 'none',
        createdBy: 'user-1',
        isCompleted: false,
        project: mockProject,
        phase: mockPhase,
        isConflicting: false
      }
    ]

    mockFilters = {
      showConflictsOnly: false,
      selectedProjects: ['project-1'],
      selectedPhaseTypes: ['planning', 'filming', 'editing'],
      dateRange: {
        start: '2025-01-01',
        end: '2025-01-31'
      }
    }

    mockHandlers = {
      onDateSelect: vi.fn(),
      onEventMove: vi.fn(),
      onEventClick: vi.fn(),
      onNavigateMonth: vi.fn(),
      onFiltersChange: vi.fn()
    }
  })

  describe('Rendering', () => {
    it('should render calendar grid with month navigation', () => {
      render(
        <DragDropCalendarView
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Should show month navigation
      expect(screen.getByLabelText('이전 월')).toBeInTheDocument()
      expect(screen.getByLabelText('다음 월')).toBeInTheDocument()
      expect(screen.getByText('2025년 1월')).toBeInTheDocument()

      // Should show day headers
      expect(screen.getByText('일')).toBeInTheDocument()
      expect(screen.getByText('월')).toBeInTheDocument()
      expect(screen.getByText('토')).toBeInTheDocument()

      // Should render calendar grid
      expect(screen.getByRole('grid')).toBeInTheDocument()
    })

    it('should display events in correct date cells', () => {
      render(
        <DragDropCalendarView
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Event should appear on the 15th, 16th, and 17th (3-day event)
      const eventElements = screen.getAllByText('촬영')
      expect(eventElements.length).toBeGreaterThan(0)
    })

    it('should show conflict indicators when events have conflicts', () => {
      const conflictingEvents = [
        {
          ...mockEvents[0],
          isConflicting: true
        }
      ]

      render(
        <DragDropCalendarView
          events={conflictingEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Should show conflict warning in header
      expect(screen.getByText(/1개 충돌/)).toBeInTheDocument()
    })
  })

  describe('Event Interaction', () => {
    it('should call onEventClick when clicking on an event', async () => {
      const user = userEvent.setup()

      render(
        <DragDropCalendarView
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      const eventElement = screen.getByText('촬영')
      await user.click(eventElement)

      expect(mockHandlers.onEventClick).toHaveBeenCalledWith(mockEvents[0])
    })

    it('should show draggable event with proper attributes', () => {
      render(
        <DragDropCalendarView
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      const eventElement = screen.getByText('촬영')
      const eventCard = eventElement.closest('[data-event-id]')

      expect(eventCard).toHaveAttribute('data-event-id', 'event-1')
      expect(eventCard).toHaveAttribute('draggable', 'true')
      expect(eventCard).toHaveClass('cursor-grab')
    })
  })

  describe('Date Navigation', () => {
    it('should call onDateSelect when clicking on a date cell', async () => {
      const user = userEvent.setup()

      render(
        <DragDropCalendarView
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Find a date cell (e.g., "10")
      const dateCell = screen.getByLabelText(/2025년 1월 10일/)
      await user.click(dateCell)

      expect(mockHandlers.onDateSelect).toHaveBeenCalled()
    })

    it('should call onNavigateMonth when clicking navigation buttons', async () => {
      const user = userEvent.setup()

      render(
        <DragDropCalendarView
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      const prevButton = screen.getByLabelText('이전 월')
      const nextButton = screen.getByLabelText('다음 월')

      await user.click(prevButton)
      expect(mockHandlers.onNavigateMonth).toHaveBeenCalledWith('prev')

      await user.click(nextButton)
      expect(mockHandlers.onNavigateMonth).toHaveBeenCalledWith('next')
    })
  })

  describe('Filtering', () => {
    it('should apply conflict-only filter correctly', () => {
      const mixedEvents = [
        mockEvents[0], // No conflict
        {
          ...mockEvents[0],
          id: 'event-2',
          isConflicting: true
        }
      ]

      const conflictFilters = {
        ...mockFilters,
        showConflictsOnly: true
      }

      render(
        <DragDropCalendarView
          events={mixedEvents}
          selectedDate={new Date('2025-01-15')}
          filters={conflictFilters}
          {...mockHandlers}
        />
      )

      // Should show conflict count in header when conflicts exist
      expect(screen.getByText(/1개 충돌/)).toBeInTheDocument()
    })

    it('should filter events by selected projects', () => {
      const multiProjectEvents = [
        mockEvents[0],
        {
          ...mockEvents[0],
          id: 'event-2',
          project: {
            ...mockEvents[0].project,
            id: 'project-2',
            name: '다른 프로젝트'
          }
        }
      ]

      const projectFilters = {
        ...mockFilters,
        selectedProjects: ['project-1'] // Only show project-1
      }

      render(
        <DragDropCalendarView
          events={multiProjectEvents}
          selectedDate={new Date('2025-01-15')}
          filters={projectFilters}
          {...mockHandlers}
        />
      )

      // Should only show events from project-1
      expect(screen.getByText('촬영')).toBeInTheDocument()
    })

    it('should filter events by phase types', () => {
      const phaseFilters = {
        ...mockFilters,
        selectedPhaseTypes: ['planning'] // Only show planning phases
      }

      render(
        <DragDropCalendarView
          events={mockEvents} // Has filming phase
          selectedDate={new Date('2025-01-15')}
          filters={phaseFilters}
          {...mockHandlers}
        />
      )

      // Should not show filming events
      const eventElements = screen.queryAllByText('촬영')
      expect(eventElements).toHaveLength(0)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <DragDropCalendarView
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Calendar should have proper grid role and label
      const calendarGrid = screen.getByRole('grid')
      expect(calendarGrid).toHaveAttribute('aria-label', expect.stringContaining('2025년 1월 캘린더'))

      // Date cells should have gridcell role
      const dateCells = screen.getAllByRole('gridcell')
      expect(dateCells.length).toBeGreaterThan(0)

      // Events should be focusable and have proper labels
      const eventElement = screen.getByText('촬영')
      expect(eventElement.closest('[role="button"]')).toBeInTheDocument()
      expect(eventElement.closest('[tabindex="0"]')).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()

      render(
        <DragDropCalendarView
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      const eventElement = screen.getByText('촬영')
      const eventCard = eventElement.closest('[role="button"]')!

      // Should respond to Enter key
      eventCard.focus()
      await user.keyboard('{Enter}')

      expect(mockHandlers.onEventClick).toHaveBeenCalled()
    })

    it('should provide proper screen reader announcements for conflicts', () => {
      const conflictingEvents = [
        {
          ...mockEvents[0],
          isConflicting: true
        }
      ]

      render(
        <DragDropCalendarView
          events={conflictingEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      // Should have alert role for conflict warnings
      const conflictElement = screen.getByRole('alert')
      expect(conflictElement).toBeInTheDocument()
    })
  })

  describe('Drag and Drop Integration', () => {
    it('should render within DndContext', () => {
      render(
        <DragDropCalendarView
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      expect(screen.getByTestId('dnd-context')).toBeInTheDocument()
    })

    it('should render drag overlay component', () => {
      render(
        <DragDropCalendarView
          events={mockEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      expect(screen.getByTestId('drag-overlay')).toBeInTheDocument()
    })
  })

  describe('Visual Conflict Indicators', () => {
    it('should apply conflict styles to conflicting events', () => {
      const conflictingEvents = [
        {
          ...mockEvents[0],
          isConflicting: true
        }
      ]

      render(
        <DragDropCalendarView
          events={conflictingEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      const eventElement = screen.getByText('촬영')
      const eventCard = eventElement.closest('[data-event-id]')!

      // Should have conflict styling classes
      expect(eventCard).toHaveClass('border-dashed', 'animate-pulse')
    })

    it('should show conflict detection text for conflicting events', () => {
      const conflictingEvents = [
        {
          ...mockEvents[0],
          isConflicting: true
        }
      ]

      render(
        <DragDropCalendarView
          events={conflictingEvents}
          selectedDate={new Date('2025-01-15')}
          filters={mockFilters}
          {...mockHandlers}
        />
      )

      expect(screen.getByText('충돌 감지')).toBeInTheDocument()
    })
  })
})