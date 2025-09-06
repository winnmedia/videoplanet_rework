'use client'

import { clsx } from 'clsx'
import { useState, useCallback, useMemo } from 'react'

import type { 
  ProjectCalendarEvent, 
  CalendarFilterOptions,
  Project,
  ProjectPhase,
  ConflictDetectionResult
} from '@/entities/calendar'
import { 
  ConflictDetectionService, 
  ColorAssignmentService,
  CALENDAR_COLORS 
} from '@/entities/calendar'

import { DragDropCalendarView } from './DragDropCalendarView'
import { EnhancedCalendarFilters } from './EnhancedCalendarFilters'
import { EnhancedProjectLegend } from './EnhancedProjectLegend'

interface CalendarDashboardProps {
  // Core data
  projects: Project[]
  events: ProjectCalendarEvent[]
  selectedDate?: Date
  
  // Event handlers
  onEventMove: (eventId: string, newStartDate: string, newEndDate: string) => void
  onEventClick: (event: ProjectCalendarEvent) => void
  onDateSelect?: (date: Date) => void
  
  // Additional props
  className?: string
  isLoading?: boolean
}

export function CalendarDashboard({
  projects,
  events,
  selectedDate = new Date(),
  onEventMove,
  onEventClick,
  onDateSelect,
  className,
  isLoading = false
}: CalendarDashboardProps) {
  // Calendar view state
  const [currentDate, setCurrentDate] = useState(selectedDate)
  const [visibleProjects, setVisibleProjects] = useState<string[]>(
    projects.map(p => p.id)
  )
  
  // Calendar filters state
  const [filters, setFilters] = useState<CalendarFilterOptions>({
    showConflictsOnly: false,
    selectedProjects: projects.map(p => p.id),
    selectedPhaseTypes: ['pre-production', 'production', 'post-production'],
    dateRange: {
      start: new Date().toISOString().split('T')[0],
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    }
  })

  // Detect conflicts in all events
  const conflictResult = useMemo((): ConflictDetectionResult => {
    return ConflictDetectionService.detectConflicts(events)
  }, [events])

  // Filter events based on current filters and visible projects
  const filteredEvents = useMemo(() => {
    let filtered = events

    // Apply visibility filter
    filtered = filtered.filter(event => 
      visibleProjects.includes(event.project.id)
    )

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
  }, [events, filters, visibleProjects])

  // Get conflicting project IDs
  const conflictingProjects = useMemo(() => {
    const projectIds = new Set<string>()
    conflictResult.conflicts.forEach(conflict => {
      conflict.events.forEach(event => {
        projectIds.add(event.project.id)
      })
    })
    return Array.from(projectIds)
  }, [conflictResult])

  // Event handlers
  const handleDateSelect = useCallback((date: Date) => {
    setCurrentDate(date)
    onDateSelect?.(date)
  }, [onDateSelect])

  const handleMonthNavigate = useCallback((direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }, [])

  const handleFiltersChange = useCallback((newFilters: CalendarFilterOptions) => {
    setFilters(newFilters)
  }, [])

  const handleFiltersReset = useCallback(() => {
    setFilters({
      showConflictsOnly: false,
      selectedProjects: projects.map(p => p.id),
      selectedPhaseTypes: ['pre-production', 'production', 'post-production'],
      dateRange: {
        start: new Date().toISOString().split('T')[0],
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }
    })
  }, [projects])

  const handleProjectToggle = useCallback((projectId: string, visible: boolean) => {
    setVisibleProjects(prev => {
      if (visible) {
        return [...prev, projectId]
      } else {
        return prev.filter(id => id !== projectId)
      }
    })

    // Sync with filters
    setFilters(prev => ({
      ...prev,
      selectedProjects: visible
        ? [...prev.selectedProjects, projectId]
        : prev.selectedProjects.filter(id => id !== projectId)
    }))
  }, [])

  const handleToggleAllProjects = useCallback((visible: boolean) => {
    if (visible) {
      setVisibleProjects(projects.map(p => p.id))
      setFilters(prev => ({
        ...prev,
        selectedProjects: projects.map(p => p.id)
      }))
    } else {
      setVisibleProjects([])
      setFilters(prev => ({
        ...prev,
        selectedProjects: []
      }))
    }
  }, [projects])

  // Loading state
  if (isLoading) {
    return (
      <div className={clsx('space-y-6', className)}>
        <div className="animate-pulse">
          <div className="bg-gray-200 h-20 rounded-lg mb-4" />
          <div className="bg-gray-200 h-96 rounded-lg" />
        </div>
      </div>
    )
  }

  return (
    <div className={clsx('space-y-6', className)} role="main" aria-label="캘린더 대시보드">
      {/* Conflict Alert Banner */}
      {conflictResult.hasConflicts && (
        <div 
          className="bg-red-50 border border-red-200 rounded-lg p-4"
          role="alert"
          aria-live="polite"
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                촬영 일정 충돌 감지됨
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  {conflictResult.conflictCount}개의 촬영 일정 충돌이 발견되었습니다. 
                  일정을 드래그하여 조정하거나 "충돌만 보기" 필터를 활성화하여 확인하세요.
                </p>
              </div>
              <div className="mt-3">
                <button
                  onClick={() => handleFiltersChange({ ...filters, showConflictsOnly: true })}
                  className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-2 rounded text-sm font-medium transition-colors"
                >
                  충돌만 보기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Filters */}
      <EnhancedCalendarFilters
        filters={filters}
        projects={projects}
        conflictCount={conflictResult.conflictCount}
        onFiltersChange={handleFiltersChange}
        onReset={handleFiltersReset}
      />

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Calendar View - Takes up most space */}
        <div className="xl:col-span-3">
          <DragDropCalendarView
            events={filteredEvents}
            selectedDate={currentDate}
            filters={filters}
            onDateSelect={handleDateSelect}
            onEventMove={onEventMove}
            onEventClick={onEventClick}
            onNavigateMonth={handleMonthNavigate}
            onFiltersChange={handleFiltersChange}
          />
        </div>

        {/* Fixed Project Legend - Right sidebar */}
        <div className="xl:col-span-1">
          <div className="sticky top-6">
            <EnhancedProjectLegend
              projects={projects}
              visibleProjects={visibleProjects}
              conflictingProjects={conflictingProjects}
              onProjectToggle={handleProjectToggle}
              onToggleAll={handleToggleAllProjects}
            />
          </div>
        </div>
      </div>

      {/* Calendar Stats Footer */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold text-gray-900">
              {projects.length}
            </div>
            <div className="text-sm text-gray-500">전체 프로젝트</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-gray-900">
              {events.length}
            </div>
            <div className="text-sm text-gray-500">전체 일정</div>
          </div>
          <div>
            <div className="text-2xl font-semibold text-green-600">
              {visibleProjects.length}
            </div>
            <div className="text-sm text-gray-500">표시 중</div>
          </div>
          <div>
            <div className={clsx(
              'text-2xl font-semibold',
              conflictResult.conflictCount > 0 ? 'text-red-600' : 'text-gray-400'
            )}>
              {conflictResult.conflictCount}
            </div>
            <div className="text-sm text-gray-500">충돌 감지</div>
          </div>
        </div>
      </div>

      {/* Accessibility Info */}
      <div className="sr-only">
        <h2>캘린더 사용법</h2>
        <ul>
          <li>방향키를 사용하여 날짜를 탐색할 수 있습니다</li>
          <li>탭 키를 사용하여 일정 간 이동이 가능합니다</li>
          <li>스페이스바 또는 엔터키로 일정을 선택할 수 있습니다</li>
          <li>일정을 드래그하여 다른 날짜로 이동할 수 있습니다</li>
          <li>충돌하는 일정은 점선 테두리와 경고 아이콘으로 표시됩니다</li>
        </ul>
      </div>
    </div>
  )
}