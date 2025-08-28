'use client'

import { useState, useMemo, useCallback } from 'react'
import { SideBar } from '@/widgets'
import { CalendarView } from '@/features/calendar/ui/CalendarView'
import { WeekView } from '@/features/calendar/ui/WeekView'
import { GanttView } from '@/features/calendar/ui/GanttView'
import { CalendarFilters } from '@/features/calendar/ui/CalendarFilters'
import { ProjectLegend } from '@/features/calendar/ui/ProjectLegend'
import { ConflictAlert } from '@/features/calendar/ui/ConflictAlert'
import type { CalendarFilter, CalendarViewSettings, CalendarEvent, Project, ProjectLegendItem } from '@/entities/project/model/calendar-types'

export default function CalendarPage() {
  // 상태 관리
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'gantt'>('month')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [filter, setFilter] = useState<CalendarFilter>({
    projects: [],
    organizations: [],
    assignees: [],
    phaseTypes: [],
    showConflictsOnly: false,
    showMyProjectsOnly: false
  })
  const [viewSettings] = useState<CalendarViewSettings>({
    mode: 'month',
    showWeekends: true,
    showWeekNumbers: false,
    timeZone: 'Asia/Seoul'
  })
  const [projectVisibility, setProjectVisibility] = useState<Record<string, boolean>>({})
  
  // Mock 데이터
  const mockProjects: Project[] = [
    {
      id: 'proj1',
      name: 'VRidge 웹 플랫폼',
      status: 'active',
      color: '#3B82F6',
      hue: 217,
      organization: 'VRidge팀',
      manager: '김개발',
      startDate: '2025-08-01',
      endDate: '2025-12-31',
      description: 'VRidge 웹 플랫폼 개발 프로젝트'
    },
    {
      id: 'proj2',
      name: '홍보 영상 제작',
      status: 'active',
      color: '#10B981',
      hue: 158,
      organization: '마케팅팀',
      manager: '이마케터',
      startDate: '2025-08-15',
      endDate: '2025-09-30',
      description: '회사 홍보 영상 제작'
    },
    {
      id: 'proj3',
      name: '클라이언트 프레젠테이션',
      status: 'planning',
      color: '#F59E0B',
      hue: 43,
      organization: '영업팀',
      manager: '박영업',
      startDate: '2025-09-01',
      endDate: '2025-09-15',
      description: '신규 클라이언트 대상 프레젠테이션 준비'
    }
  ]

  const mockEvents: CalendarEvent[] = [
    {
      id: 'event1',
      title: '프로젝트 킥오프',
      startDate: '2025-08-28',
      endDate: '2025-08-28',
      project: mockProjects[0],
      phase: {
        id: 'phase1',
        projectId: 'proj1',
        name: '프로젝트 킥오프',
        type: 'pre-production',
        startDate: '2025-08-28',
        endDate: '2025-08-28',
        status: 'completed',
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
      project: mockProjects[1],
      phase: {
        id: 'phase2',
        projectId: 'proj2',
        name: '영상 촬영',
        type: 'production',
        startDate: '2025-08-29',
        endDate: '2025-08-30',
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
      project: mockProjects[2],
      phase: {
        id: 'phase3',
        projectId: 'proj3',
        name: '클라이언트 미팅',
        type: 'review',
        startDate: '2025-08-30',
        endDate: '2025-08-30',
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
  ]

  // 필터링된 이벤트 계산
  const filteredEvents = useMemo(() => {
    let events = mockEvents
    
    // 프로젝트 필터
    if (filter.projects.length > 0) {
      events = events.filter(event => filter.projects.includes(event.project.id))
    }
    
    // 조직 필터
    if (filter.organizations.length > 0) {
      events = events.filter(event => 
        event.project.organization && filter.organizations.includes(event.project.organization)
      )
    }
    
    // 페이즈 타입 필터
    if (filter.phaseTypes.length > 0) {
      events = events.filter(event => filter.phaseTypes.includes(event.phase.type))
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
  
  // 범례 아이템 계산
  const legendItems = useMemo((): ProjectLegendItem[] => {
    return mockProjects.map(project => ({
      project,
      isVisible: projectVisibility[project.id] !== false,
      phaseCount: mockEvents.filter(event => event.project.id === project.id).length
    }))
  }, [mockProjects, projectVisibility, mockEvents])
  
  // 충돌 이벤트 필터링
  const conflictingEvents = useMemo(() => {
    return filteredEvents.filter(event => event.isConflicting)
  }, [filteredEvents])
  
  // 이벤트 핸들러들
  const handleEventClick = useCallback((event: CalendarEvent) => {
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
      projects: [],
      organizations: [],
      assignees: [],
      phaseTypes: [],
      showConflictsOnly: false,
      showMyProjectsOnly: false
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
            <h1 className="text-3xl font-bold text-gray-900">전체 일정</h1>
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
              filter={filter}
              projects={mockProjects}
              organizations={organizations}
              assignees={assignees}
              onFilterChange={setFilter}
              onReset={handleFilterReset}
            />
          </div>
          
          {/* 프로젝트 범례 */}
          <div className="mb-6">
            <ProjectLegend
              legendItems={legendItems}
              showMyProjectsOnly={filter.showMyProjectsOnly}
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
              <GanttView
                events={filteredEvents}
                selectedDate={selectedDate}
                onEventClick={handleEventClick}
                onEventDrag={handleEventDrag}
                onNavigateMonth={handleNavigateMonth}
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