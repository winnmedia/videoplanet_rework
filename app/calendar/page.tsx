'use client'

import { useState, useMemo, useCallback } from 'react'

import type { 
  Project, 
  ProjectLegendItem, 
  CalendarFilterOptions, 
  CalendarViewMode,
  ProjectCalendarEvent
} from '@/entities/calendar'
import { CalendarFilters, CalendarView, ConflictAlert, ProjectLegend, WeekView } from '@/features/calendar'
import { DragDropCalendarView } from '@/features/calendar/ui/DragDropCalendarView'
import { SideBar } from '@/widgets'

export default function CalendarPage() {
  // 상태 관리
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filter, setFilter] = useState<CalendarFilterOptions>({
    selectedProjects: [],
    selectedOrganizations: [],
    selectedAssignees: [],
    selectedPhaseTypes: [],
    showConflictsOnly: false,
    showMyProjectsOnly: false,
    dateRange: {
      start: new Date().toISOString(),
      end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    }
  })
  const [projectVisibility, setProjectVisibility] = useState<Record<string, boolean>>({})
  
  // Mock 데이터 - useMemo로 래핑하여 의존성 최적화
  const mockProjects: Project[] = useMemo(() => [
    {
      id: 'proj1',
      name: 'VRidge 웹 플랫폼',
      status: 'active',
      color: '#3B82F6',
      hue: 217,
      startDate: '2025-08-01',
      endDate: '2025-12-31',
      description: 'VRidge 웹 플랫폼 개발 프로젝트',
      phases: [],
      createdAt: '2025-08-01T00:00:00.000Z',
      updatedAt: '2025-08-01T00:00:00.000Z'
    },
    {
      id: 'proj2',
      name: '홍보 영상 제작',
      status: 'active',
      color: '#10B981',
      hue: 160,
      startDate: '2025-08-15',
      endDate: '2025-10-31',
      description: '회사 홍보 영상 제작',
      phases: [],
      createdAt: '2025-08-15T00:00:00.000Z',
      updatedAt: '2025-08-15T00:00:00.000Z'
    },
    {
      id: 'proj3',
      name: '클라이언트 프레젠테이션',
      status: 'on-hold',
      color: '#F59E0B',
      hue: 43,
      startDate: '2025-07-01',
      endDate: '2025-11-30',
      description: '신규 클라이언트 대상 프레젠테이션 준비',
      phases: [],
      createdAt: '2025-09-01T00:00:00.000Z',
      updatedAt: '2025-09-01T00:00:00.000Z'
    }
  ], [])

  const mockEvents: ProjectCalendarEvent[] = useMemo(() => [
    {
      id: 'event1',
      title: '프로젝트 킥오프',
      startDate: '2025-08-28',
      endDate: '2025-08-28',
      priority: 'high' as const,
      createdBy: 'user1',
      category: 'project-deadline' as const,
      isAllDay: false,
      recurrence: 'none' as const,
      isCompleted: true,
      project: {
        ...mockProjects[0],
        hue: 210,
        startDate: '2025-08-28',
        endDate: '2025-09-28'
      },
      phase: {
        id: 'phase1',
        projectId: 'proj1',
        name: '프로젝트 킥오프',
        type: 'pre-production' as const,
        startDate: '2025-08-28',
        endDate: '2025-08-28',
        duration: 1,
        isMovable: true,
        status: 'completed' as const,
        conflictLevel: 'none',
        isEditable: true
      },
      isConflicting: false,
      isDraggable: true,
      isResizable: false
    },
    {
      id: 'event2',
      title: '영상 촬영',
      startDate: '2025-08-29',
      endDate: '2025-08-30',
      priority: 'medium' as const,
      createdBy: 'user2',
      category: 'filming' as const,
      isAllDay: false,
      recurrence: 'none' as const,
      isCompleted: false,
      project: {
        ...mockProjects[1],
        hue: 140,
        startDate: '2025-08-29',
        endDate: '2025-09-15'
      },
      phase: {
        id: 'phase2',
        projectId: 'proj2',
        name: '영상 촬영',
        type: 'production',
        startDate: '2025-08-29',
        endDate: '2025-08-30',
        duration: 2,
        isMovable: true,
        status: 'in-progress',
        conflictLevel: 'warning',
        isEditable: true,
        conflictDetails: [{
          type: 'resource',
          description: '카메라 장비가 다른 프로젝트와 중복 예약되었습니다.',
          conflictingPhaseIds: ['phase3'],
          severity: 'medium'
        }]
      },
      isConflicting: true,
      isDraggable: true,
      isResizable: true
    },
    {
      id: 'event3',
      title: '클라이언트 미팅',
      startDate: '2025-08-30',
      endDate: '2025-08-30',
      priority: 'high' as const,
      createdBy: 'user3',
      category: 'meeting' as const,
      isAllDay: false,
      recurrence: 'none' as const,
      isCompleted: false,
      project: {
        ...mockProjects[2],
        hue: 45,
        startDate: '2025-08-30',
        endDate: '2025-09-30'
      },
      phase: {
        id: 'phase3',
        projectId: 'proj3',
        name: '클라이언트 미팅',
        type: 'review',
        startDate: '2025-08-30',
        endDate: '2025-08-30',
        duration: 1,
        isMovable: true,
        status: 'pending',
        conflictLevel: 'warning',
        isEditable: true,
        conflictDetails: [{
          type: 'schedule',
          description: '동일 시간대에 다른 미팅이 예정되어 있습니다.',
          conflictingPhaseIds: ['phase2'],
          severity: 'high'
        }]
      },
      isConflicting: true,
      isDraggable: true,
      isResizable: false
    }
  ], [mockProjects])

  // 필터링된 이벤트 계산
  const filteredEvents = useMemo(() => {
    let events = mockEvents
    
    // 프로젝트 필터
    if (filter.selectedProjects.length > 0) {
      events = events.filter(event => filter.selectedProjects.includes(event.project.id))
    }
    
    // 조직 필터
    if ((filter.selectedOrganizations || []).length > 0) {
      events = events.filter(event => 
        event.project.organization && (filter.selectedOrganizations || []).includes(event.project.organization)
      )
    }
    
    // 페이즈 타입 필터
    if (filter.selectedPhaseTypes.length > 0) {
      events = events.filter(event => filter.selectedPhaseTypes.includes(event.phase.type))
    }
    
    // 충돌만 보기
    if (filter.showConflictsOnly) {
      events = events.filter(event => event.isConflicting)
    }
    
    // 내 프로젝트만 보기
    if (filter.showMyProjectsOnly) {
      events = events.filter(event => event.project.manager === '현재 사용자') // TODO: 실제 사용자 정보
    }
    
    // 프로젝트 가시성 필터
    events = events.filter(event => 
      projectVisibility[event.project.id] !== false
    )
    
    return events
  }, [mockEvents, filter, projectVisibility])
  
  // ViewSettings 정의 추가
  const viewSettings = useMemo(() => ({
    mode: 'month' as const,
    showWeekends: true,
    showWeekNumbers: false,
    timeZone: 'Asia/Seoul'
  }), [])

  // 범례 아이템 계산
  const legendItems = useMemo((): ProjectLegendItem[] => {
    return mockProjects.map(project => ({
      project,
      palette: {
        primary: project.color,
        secondary: project.color + '40', // Add transparency
        accent: project.color + 'CC',
        text: '#FFFFFF'
      },
      isVisible: projectVisibility[project.id] !== false,
      phaseCount: project.phases.length || 0
    }))
  }, [mockProjects, projectVisibility])
  
  // 충돌 이벤트 필터링
  const conflictingEvents = useMemo(() => {
    return filteredEvents.filter(event => event.isConflicting)
  }, [filteredEvents])
  
  // 이벤트 핸들러들
  const handleEventClick = useCallback((event: ProjectCalendarEvent) => {
    console.log('Event clicked:', event)
  }, [])
  
  const handleEventDrag = useCallback((eventId: string, newStartDate: string, newEndDate: string) => {
    console.log('Event dragged:', { eventId, newStartDate, newEndDate })
    // TODO: 실제 API 호출로 이벤트 업데이트
  }, [])
  
  const handleDateSelect = useCallback((date: Date) => {
    setSelectedDate(date)
  }, [])
  
  const handleNavigateMonth = useCallback((direction: 'prev' | 'next') => {
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1)
      } else {
        newDate.setMonth(newDate.getMonth() + 1)
      }
      return newDate
    })
  }, [])
  
  const handleNavigateWeek = useCallback((direction: 'prev' | 'next') => {
    setSelectedDate(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setDate(newDate.getDate() - 7)
      } else {
        newDate.setDate(newDate.getDate() + 7)
      }
      return newDate
    })
  }, [])
  
  const handleFilterReset = useCallback(() => {
    setFilter({
      selectedProjects: [],
      selectedOrganizations: [],
      selectedAssignees: [],
      selectedPhaseTypes: [],
      showConflictsOnly: false,
      showMyProjectsOnly: false,
      dateRange: {
        start: new Date().toISOString(),
        end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    })
  }, [])
  
  const handleProjectToggle = useCallback((projectId: string, visible: boolean) => {
    setProjectVisibility(prev => ({
      ...prev,
      [projectId]: visible
    }))
  }, [])
  
  const handleLegendModeToggle = useCallback((showMyProjectsOnly: boolean) => {
    setFilter(prev => ({ ...prev, showMyProjectsOnly }))
  }, [])
  
  const handleConflictResolve = useCallback((eventId: string, resolution: 'reschedule' | 'ignore') => {
    console.log('Conflict resolved:', { eventId, resolution })
    // TODO: 실제 충돌 해결 로직
  }, [])
  
  // Mock 데이터
  const organizations = ['VRidge팀', '마케팅팀', '영업팀']
  const assignees = ['김개발', '이마케터', '박영업', '최디자인']

  return (
    <div className="min-h-screen bg-gray-50" role="application" aria-label="캘린더 애플리케이션">
      {/* 사이드바 */}
      <SideBar />
      
      {/* 메인 컨텐츠 */}
      <main className="ml-[18.75rem] pt-20 min-h-screen">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* Page Header */}
          <header className="mb-8" role="banner" aria-label="캘린더">
            <h1 data-testid="calendar-heading" className="text-3xl font-bold text-gray-900">전체 일정</h1>
            <p className="text-gray-600 mt-2">프로젝트 일정을 한눈에 확인하세요</p>
          </header>
          
          {/* 뷰 모드 전환 버튼 */}
          <div className="flex items-center gap-2 mb-6" role="group" aria-label="보기 모드 선택">
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                viewMode === 'month' 
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
              aria-pressed={viewMode === 'month'}
              data-testid="calendar-view-month"
            >
              월간 보기
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                viewMode === 'week' 
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
              aria-pressed={viewMode === 'week'}
              data-testid="calendar-view-week"
            >
              주간 보기
            </button>
            <button
              onClick={() => setViewMode('gantt')}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                viewMode === 'gantt' 
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
              aria-pressed={viewMode === 'gantt'}
              data-testid="calendar-view-gantt"
            >
              간트 보기
            </button>
          </div>
          
          {/* 충돌 알림 */}
          {conflictingEvents.length > 0 && (
            <div className="mb-6">
              <ConflictAlert
                conflictingEvents={conflictingEvents}
                onResolve={handleConflictResolve}
                onDismiss={() => console.log('Conflict alert dismissed')}
              />
            </div>
          )}
          
          {/* 필터링 */}
          <div className="mb-6">
            <CalendarFilters
              filter={{
                projects: filter.selectedProjects,
                organizations: filter.selectedOrganizations || [],
                assignees: filter.selectedAssignees || [],
                phaseTypes: filter.selectedPhaseTypes,
                showConflictsOnly: filter.showConflictsOnly,
                showMyProjectsOnly: filter.showMyProjectsOnly || false,
                startDate: filter.dateRange.start,
                endDate: filter.dateRange.end
              }}
              projects={mockProjects}
              organizations={organizations}
              assignees={assignees}
              onFilterChange={(newFilter) => setFilter({
                selectedProjects: newFilter.projects,
                selectedOrganizations: newFilter.organizations,
                selectedAssignees: newFilter.assignees,
                selectedPhaseTypes: newFilter.phaseTypes,
                showConflictsOnly: newFilter.showConflictsOnly,
                showMyProjectsOnly: newFilter.showMyProjectsOnly,
                dateRange: {
                  start: newFilter.startDate || new Date().toISOString(),
                  end: newFilter.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                }
              })}
              onReset={handleFilterReset}
            />
          </div>
          
          {/* 프로젝트 범례 */}
          <div className="mb-6">
            <ProjectLegend
              legendItems={legendItems.map(item => ({
                ...item,
                phaseCount: item.phaseCount || 0
              }))}
              showMyProjectsOnly={filter.showMyProjectsOnly || false}
              onToggleProject={handleProjectToggle}
              onToggleMode={handleLegendModeToggle}
            />
          </div>
          
          {/* 캘린더 뷰 */}
          <div className="mb-8">
            {viewMode === 'month' && (
              <CalendarView
                events={filteredEvents}
                viewSettings={viewSettings}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onEventClick={handleEventClick}
                onNavigateMonth={handleNavigateMonth}
              />
            )}
            
            {viewMode === 'week' && (
              <WeekView
                events={filteredEvents}
                viewSettings={viewSettings}
                selectedDate={selectedDate}
                onDateSelect={handleDateSelect}
                onEventClick={handleEventClick}
                onNavigateWeek={handleNavigateWeek}
              />
            )}
            
            {viewMode === 'gantt' && (
              <DragDropCalendarView
                events={filteredEvents}
                selectedDate={selectedDate}
                filters={filter}
                onDateSelect={handleDateSelect}
                onEventMove={handleEventDrag}
                onEventClick={handleEventClick}
                onNavigateMonth={handleNavigateMonth}
                onFiltersChange={setFilter}
              />
            )}
          </div>
        </div>
      </main>
      
      {/* 라이브 리전 (스크린 리더용) */}
      <div
        role="status"
        aria-live="polite"
        aria-label="캘린더 상태"
        className="sr-only"
      >
        {viewMode} 모드에서 {filteredEvents.length}개의 일정을 표시 중입니다.
      </div>
    </div>
  )
}
