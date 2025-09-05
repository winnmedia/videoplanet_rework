/**
 * Calendar Implementation Example
 * @description Production-ready example of how to integrate the Calendar Dashboard
 * This shows how pages should implement the calendar functionality
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import { 
  CalendarDashboard,
  type ProjectCalendarEvent,
  type Project,
  type ProjectPhase,
  ConflictDetectionService,
  ColorAssignmentService
} from '@/features/calendar'

// Example data that would typically come from API
const EXAMPLE_PROJECTS: Project[] = [
  {
    id: 'proj-1',
    name: '삼성 갤럭시 광고',
    color: '#3B82F6', // Will be overridden by ColorAssignmentService
    description: 'Samsung Galaxy commercial production',
    status: 'active',
    phases: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-15T00:00:00Z'
  },
  {
    id: 'proj-2', 
    name: 'LG 홈어플라이언스 홍보영상',
    color: '#10B981',
    description: 'LG home appliances promotional video',
    status: 'active',
    phases: [],
    createdAt: '2025-01-02T00:00:00Z',
    updatedAt: '2025-01-16T00:00:00Z'
  },
  {
    id: 'proj-3',
    name: '현대자동차 신차 런칭',
    color: '#F59E0B',
    description: 'Hyundai new car launch video',
    status: 'active',
    phases: [],
    createdAt: '2025-01-03T00:00:00Z',
    updatedAt: '2025-01-17T00:00:00Z'
  }
]

const EXAMPLE_PHASES: ProjectPhase[] = [
  // 삼성 갤럭시 프로젝트 페이즈
  {
    id: 'phase-1-planning',
    name: '삼성 갤럭시 기획',
    type: 'planning',
    projectId: 'proj-1',
    startDate: '2025-01-20',
    endDate: '2025-01-24',
    duration: 5,
    isMovable: true
  },
  {
    id: 'phase-1-filming',
    name: '삼성 갤럭시 촬영',
    type: 'filming', 
    projectId: 'proj-1',
    startDate: '2025-01-25',
    endDate: '2025-01-27',
    duration: 3,
    isMovable: true
  },
  {
    id: 'phase-1-editing',
    name: '삼성 갤럭시 편집',
    type: 'editing',
    projectId: 'proj-1', 
    startDate: '2025-01-28',
    endDate: '2025-02-02',
    duration: 6,
    isMovable: true
  },
  
  // LG 홈어플라이언스 프로젝트 페이즈
  {
    id: 'phase-2-planning',
    name: 'LG 홈어플라이언스 기획',
    type: 'planning',
    projectId: 'proj-2',
    startDate: '2025-01-22',
    endDate: '2025-01-25',
    duration: 4,
    isMovable: true
  },
  {
    id: 'phase-2-filming', // CONFLICT: Overlaps with proj-1 filming
    name: 'LG 홈어플라이언스 촬영',
    type: 'filming',
    projectId: 'proj-2',
    startDate: '2025-01-26', // Overlaps with Samsung filming
    endDate: '2025-01-28',
    duration: 3,
    isMovable: true
  },
  {
    id: 'phase-2-editing',
    name: 'LG 홈어플라이언스 편집',
    type: 'editing',
    projectId: 'proj-2',
    startDate: '2025-01-29',
    endDate: '2025-02-04',
    duration: 7,
    isMovable: true
  },
  
  // 현대자동차 프로젝트 페이즈
  {
    id: 'phase-3-planning',
    name: '현대자동차 기획',
    type: 'planning',
    projectId: 'proj-3',
    startDate: '2025-02-05',
    endDate: '2025-02-08',
    duration: 4,
    isMovable: true
  },
  {
    id: 'phase-3-filming',
    name: '현대자동차 촬영',
    type: 'filming',
    projectId: 'proj-3',
    startDate: '2025-02-10',
    endDate: '2025-02-12',
    duration: 3,
    isMovable: true
  }
]

export function CalendarExampleUsage() {
  const [selectedDate, setSelectedDate] = useState(new Date('2025-01-25'))

  // Generate calendar events from projects and phases
  const calendarEvents = useMemo((): ProjectCalendarEvent[] => {
    return EXAMPLE_PHASES.map(phase => {
      const project = EXAMPLE_PROJECTS.find(p => p.id === phase.projectId)!
      
      return {
        id: `event-${phase.id}`,
        title: phase.name,
        startDate: `${phase.startDate}T09:00:00Z`,
        endDate: `${phase.endDate}T18:00:00Z`,
        isAllDay: false,
        category: phase.type === 'filming' ? 'filming' : 'project-deadline',
        priority: phase.type === 'filming' ? 'high' : 'medium',
        recurrence: 'none',
        createdBy: 'user-1',
        isCompleted: false,
        project,
        phase,
        isConflicting: false // Will be calculated below
      }
    })
  }, [])

  // Apply conflict detection
  const eventsWithConflicts = useMemo(() => {
    const conflictResult = ConflictDetectionService.detectConflicts(calendarEvents)
    
    return calendarEvents.map(event => {
      const isConflicting = conflictResult.affectedEvents.some(affected => affected.id === event.id)
      const conflictDetails = conflictResult.conflicts.filter(conflict =>
        conflict.events.some(e => e.id === event.id)
      )
      
      return {
        ...event,
        isConflicting,
        conflictDetails
      }
    })
  }, [calendarEvents])

  // Event handlers
  const handleEventMove = useCallback((eventId: string, newStartDate: string, newEndDate: string) => {
    console.log('Event moved:', { eventId, newStartDate, newEndDate })
    
    // In production, this would update the database via API
    // Example API call:
    // await updatePhaseSchedule(eventId, { startDate: newStartDate, endDate: newEndDate })
    
    // For now, just log the action
    alert(`일정이 이동되었습니다:\n${eventId}\n새 시작일: ${newStartDate}\n새 종료일: ${newEndDate}`)
  }, [])

  const handleEventClick = useCallback((event: ProjectCalendarEvent) => {
    console.log('Event clicked:', event)
    
    // In production, this might open an event details modal
    alert(`일정 상세:\n${event.title}\n${event.project.name}\n${event.phase.type} 단계`)
  }, [])

  const handleDateSelect = useCallback((date: Date) => {
    console.log('Date selected:', date)
    setSelectedDate(date)
  }, [])

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            VRidge 캘린더 - 제작 일정 관리
          </h1>
          <p className="text-lg text-gray-600">
            드래그 앤 드롭으로 촬영 일정을 조정하고 충돌을 실시간으로 감지하세요
          </p>
        </div>

        {/* Calendar Dashboard */}
        <CalendarDashboard
          projects={EXAMPLE_PROJECTS}
          events={eventsWithConflicts}
          selectedDate={selectedDate}
          onEventMove={handleEventMove}
          onEventClick={handleEventClick}
          onDateSelect={handleDateSelect}
        />

        {/* Usage Instructions */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">사용법</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">드래그 앤 드롭</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• 일정 카드를 드래그하여 다른 날짜로 이동</li>
                <li>• 충돌 감지 시 경고 표시</li>
                <li>• 유효하지 않은 위치로는 이동 불가</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">필터 및 범례</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• "충돌만 보기"로 문제 있는 일정만 확인</li>
                <li>• 프로젝트별 색상으로 구분</li>
                <li>• 범례에서 프로젝트 표시/숨기기</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Technical Details */}
        <div className="mt-6 bg-blue-50 rounded-lg border border-blue-200 p-6">
          <h2 className="text-xl font-semibold text-blue-900 mb-4">구현 세부사항</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <h3 className="font-medium text-blue-900 mb-2">충돌 감지</h3>
              <ul className="text-blue-800 space-y-1">
                <li>• 촬영 페이즈만 충돌 검사</li>
                <li>• 실시간 충돌 예측</li>
                <li>• 시각적 충돌 표시</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-2">접근성</h3>
              <ul className="text-blue-800 space-y-1">
                <li>• 키보드 네비게이션 지원</li>
                <li>• 스크린 리더 호환</li>
                <li>• ARIA 레이블 완비</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-900 mb-2">성능</h3>
              <ul className="text-blue-800 space-y-1">
                <li>• React 19 최적화</li>
                <li>• 모바일 친화적 터치</li>
                <li>• 대량 데이터 처리</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}