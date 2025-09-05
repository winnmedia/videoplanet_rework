'use client'

import { useState, useMemo, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay
} from '@dnd-kit/core'
import {
  restrictToWindowEdges,
  restrictToFirstScrollableAncestor
} from '@dnd-kit/modifiers'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

import type { 
  ProjectCalendarEvent, 
  CalendarFilterOptions,
  ConflictDetectionResult,
  EnhancedCalendarConflict
} from '@/entities/calendar'
import { ConflictDetectionService, ColorAssignmentService } from '@/entities/calendar'
import { clsx } from 'clsx'

interface DragDropCalendarViewProps {
  events: ProjectCalendarEvent[]
  selectedDate: Date
  filters: CalendarFilterOptions
  onDateSelect: (date: Date) => void
  onEventMove: (eventId: string, newStartDate: string, newEndDate: string) => void
  onEventClick: (event: ProjectCalendarEvent) => void
  onNavigateMonth: (direction: 'prev' | 'next') => void
  onFiltersChange: (filters: CalendarFilterOptions) => void
  className?: string
}

interface DroppableCalendarCellProps {
  date: Date
  events: ProjectCalendarEvent[]
  isCurrentMonth: boolean
  isToday: boolean
  isSelected: boolean
  hasConflicts: boolean
  conflicts: EnhancedCalendarConflict[]
  onDateSelect: (date: Date) => void
  onEventClick: (event: ProjectCalendarEvent) => void
  dragOverlay?: ProjectCalendarEvent | null
}

function DroppableCalendarCell({
  date,
  events,
  isCurrentMonth,
  isToday,
  isSelected,
  hasConflicts,
  conflicts,
  onDateSelect,
  onEventClick,
  dragOverlay
}: DroppableCalendarCellProps) {
  const [isDraggedOver, setIsDraggedOver] = useState(false)

  return (
    <div
      data-date={date.toISOString().split('T')[0]}
      className={clsx(
        'min-h-32 border-r border-b border-gray-100 p-1 cursor-pointer transition-all duration-200',
        'hover:bg-gray-50',
        !isCurrentMonth && 'bg-gray-50 text-gray-400',
        isCurrentMonth && 'bg-white text-gray-900',
        isToday && 'bg-blue-50',
        isSelected && 'ring-2 ring-blue-500 ring-inset',
        hasConflicts && 'bg-red-50',
        isDraggedOver && 'bg-green-50 ring-2 ring-green-300'
      )}
      onClick={() => onDateSelect(date)}
      role="gridcell"
      tabIndex={isCurrentMonth ? 0 : -1}
      aria-label={`${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`}
    >
      {/* Date Number */}
      <div className="flex items-center justify-between mb-1">
        <span
          className={clsx(
            'text-sm font-medium',
            isToday && 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center',
            isSelected && !isToday && 'text-blue-600'
          )}
        >
          {date.getDate()}
        </span>
        
        {/* Conflict Warning Icon */}
        {hasConflicts && (
          <div 
            className="text-red-500 text-xs" 
            title={`${conflicts.length}개의 일정 충돌`}
            role="alert"
            aria-label={`${conflicts.length}개의 일정 충돌이 있습니다`}
          >
            ⚠️
          </div>
        )}
      </div>

      {/* Event List */}
      <div className="space-y-1">
        {events.slice(0, 3).map((event) => (
          <DraggableEventCard
            key={event.id}
            event={event}
            onClick={(e) => {
              e.stopPropagation()
              onEventClick(event)
            }}
          />
        ))}
        
        {/* More Events Indicator */}
        {events.length > 3 && (
          <div className="text-xs text-gray-500 px-1">
            +{events.length - 3}개 더
          </div>
        )}
      </div>
    </div>
  )
}

function DraggableEventCard({ 
  event, 
  onClick 
}: { 
  event: ProjectCalendarEvent
  onClick: (e: React.MouseEvent) => void
}) {
  const palette = ColorAssignmentService.generateProjectPalette(event.project.id)
  const phaseColor = ColorAssignmentService.getPhaseColor(event.project, event.phase.type)
  
  return (
    <div
      data-event-id={event.id}
      onClick={onClick}
      className={clsx(
        'text-xs px-1 py-0.5 rounded cursor-grab active:cursor-grabbing',
        'border-l-2 transition-all duration-200 hover:bg-opacity-30',
        'select-none', // Prevent text selection during drag
        event.isConflicting && [
          'border-dashed animate-pulse',
          // Diagonal stripe pattern for conflicts
          'bg-gradient-to-r from-red-100 via-transparent to-red-100',
          'bg-[length:8px_8px]'
        ]
      )}
      style={{
        backgroundColor: event.isConflicting ? undefined : `${phaseColor}20`,
        borderLeftColor: event.isConflicting ? '#ef4444' : phaseColor,
        borderWidth: event.isConflicting ? '2px' : '2px'
      }}
      title={`${event.project.name} - ${event.phase.name}${event.isConflicting ? ' (충돌)' : ''}`}
      role="button"
      tabIndex={0}
      aria-label={`${event.project.name} ${event.phase.name} 드래그하여 이동`}
      draggable
    >
      <div className="truncate font-medium">
        {event.phase.name}
      </div>
      {event.isConflicting && (
        <div className="text-red-600 text-xs font-semibold">
          충돌 감지
        </div>
      )}
    </div>
  )
}

export function DragDropCalendarView({
  events,
  selectedDate,
  filters,
  onDateSelect,
  onEventMove,
  onEventClick,
  onNavigateMonth,
  onFiltersChange,
  className
}: DragDropCalendarViewProps) {
  const [draggedEvent, setDraggedEvent] = useState<ProjectCalendarEvent | null>(null)
  const [previewConflicts, setPreviewConflicts] = useState<EnhancedCalendarConflict[]>([])

  // Configure drag sensors for mobile and desktop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filter events based on current filters
  const filteredEvents = useMemo(() => {
    let filtered = events

    // Apply conflict filter
    if (filters.showConflictsOnly) {
      filtered = filtered.filter(event => event.isConflicting)
    }

    // Apply project filter
    if (filters.selectedProjects.length > 0) {
      filtered = filtered.filter(event => 
        filters.selectedProjects.includes(event.project.id)
      )
    }

    // Apply phase type filter
    if (filters.selectedPhaseTypes.length > 0) {
      filtered = filtered.filter(event => 
        filters.selectedPhaseTypes.includes(event.phase.type)
      )
    }

    return filtered
  }, [events, filters])

  // Detect conflicts in current events
  const conflictResult = useMemo(() => {
    return ConflictDetectionService.detectConflicts(filteredEvents)
  }, [filteredEvents])

  // Calculate calendar days for current month
  const calendarDays = useMemo(() => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const firstDayOfWeek = firstDayOfMonth.getDay()
    const daysInMonth = lastDayOfMonth.getDate()
    
    const days: Date[] = []
    
    // Previous month days
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    // Next month days (fill to 42 days)
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i))
    }
    
    return days
  }, [selectedDate])

  // Get events for specific date
  const getEventsForDate = useCallback((date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return filteredEvents.filter(event => {
      const eventStart = event.startDate.split('T')[0]
      const eventEnd = event.endDate.split('T')[0]
      return dateStr >= eventStart && dateStr <= eventEnd
    })
  }, [filteredEvents])

  // Get conflicts for specific date
  const getConflictsForDate = useCallback((date: Date) => {
    const dayEvents = getEventsForDate(date)
    return conflictResult.conflicts.filter(conflict =>
      conflict.events.some(event => dayEvents.includes(event))
    )
  }, [getEventsForDate, conflictResult.conflicts])

  // Drag handlers
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const eventId = event.active.id as string
    const draggedEvent = filteredEvents.find(e => e.id === eventId)
    setDraggedEvent(draggedEvent || null)
  }, [filteredEvents])

  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    
    if (!over || !draggedEvent) return

    const dropDate = over.id as string
    if (!dropDate) return

    // Calculate new end date based on event duration
    const eventDuration = Math.ceil(
      (new Date(draggedEvent.endDate).getTime() - new Date(draggedEvent.startDate).getTime()) 
      / (1000 * 60 * 60 * 24)
    )
    
    const newEndDate = new Date(dropDate)
    newEndDate.setDate(newEndDate.getDate() + eventDuration)

    // Preview conflicts
    const predictedConflicts = ConflictDetectionService.predictConflicts(
      draggedEvent,
      dropDate,
      newEndDate.toISOString().split('T')[0],
      events
    )

    setPreviewConflicts(predictedConflicts)
  }, [draggedEvent, events])

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    
    setDraggedEvent(null)
    setPreviewConflicts([])
    
    if (!over || !active) return

    const eventId = active.id as string
    const dropDate = over.id as string
    
    if (!dropDate) return

    const draggedEvent = filteredEvents.find(e => e.id === eventId)
    if (!draggedEvent) return

    // Calculate new dates
    const eventDuration = Math.ceil(
      (new Date(draggedEvent.endDate).getTime() - new Date(draggedEvent.startDate).getTime()) 
      / (1000 * 60 * 60 * 24)
    )
    
    const newStartDate = dropDate
    const newEndDate = new Date(dropDate)
    newEndDate.setDate(newEndDate.getDate() + eventDuration)

    // Validate drop zone
    const isValidDrop = ConflictDetectionService.isValidDropZone(
      draggedEvent,
      newStartDate,
      events
    )

    if (isValidDrop) {
      onEventMove(eventId, newStartDate, newEndDate.toISOString().split('T')[0])
    } else {
      // Could show error message or prevent drop
      console.warn('Drop would create conflicts')
    }
  }, [filteredEvents, events, onEventMove])

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ]

  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      modifiers={[restrictToWindowEdges, restrictToFirstScrollableAncestor]}
    >
      <div className={clsx('bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden', className)}>
        {/* Calendar Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
          <button
            onClick={() => onNavigateMonth('prev')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            aria-label="이전 월"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          
          <h2 className="text-lg font-semibold text-gray-900">
            {selectedDate.getFullYear()}년 {monthNames[selectedDate.getMonth()]}
            {conflictResult.hasConflicts && (
              <span className="ml-2 text-sm text-red-600 font-normal">
                ({conflictResult.conflictCount}개 충돌)
              </span>
            )}
          </h2>
          
          <button
            onClick={() => onNavigateMonth('next')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            aria-label="다음 월"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Day Headers */}
        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {dayNames.map((day, index) => (
            <div
              key={day}
              className={clsx(
                'px-3 py-2 text-center text-sm font-medium',
                index === 0 && 'text-red-600',
                index === 6 && 'text-blue-600',
                index !== 0 && index !== 6 && 'text-gray-700'
              )}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div 
          className="grid grid-cols-7"
          role="grid"
          aria-label={`${selectedDate.getFullYear()}년 ${monthNames[selectedDate.getMonth()]} 캘린더 - 드래그하여 일정 이동 가능`}
        >
          {calendarDays.map((date) => {
            const dayEvents = getEventsForDate(date)
            const dayConflicts = getConflictsForDate(date)
            const hasConflicts = dayConflicts.length > 0
            const isCurrentMonth = date.getMonth() === selectedDate.getMonth()
            const isToday = date.toDateString() === new Date().toDateString()
            const isSelected = date.toDateString() === selectedDate.toDateString()

            return (
              <DroppableCalendarCell
                key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
                date={date}
                events={dayEvents}
                isCurrentMonth={isCurrentMonth}
                isToday={isToday}
                isSelected={isSelected}
                hasConflicts={hasConflicts}
                conflicts={dayConflicts}
                onDateSelect={onDateSelect}
                onEventClick={onEventClick}
                dragOverlay={draggedEvent}
              />
            )
          })}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {draggedEvent && (
            <div className="bg-blue-100 border-2 border-blue-300 rounded px-2 py-1 text-xs shadow-lg">
              {draggedEvent.project.name} - {draggedEvent.phase.name}
              {previewConflicts.length > 0 && (
                <div className="text-red-600 text-xs mt-1">
                  ⚠️ {previewConflicts.length}개 충돌 예상
                </div>
              )}
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  )
}