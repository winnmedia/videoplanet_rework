'use client'

import { useState, useMemo, useRef, useEffect } from 'react'

// import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import { ColorAssignmentService, CALENDAR_CLASSES } from '@/entities/calendar/lib/colorAssignment'
import type { CalendarEvent, GanttTimelineItem } from '@/entities/project/model/calendar-types'

interface GanttViewProps {
  events: CalendarEvent[]
  selectedDate: Date
  onEventClick: (event: CalendarEvent) => void
  onEventDrag: (eventId: string, newStartDate: string, newEndDate: string) => void
  onNavigateMonth: (direction: 'prev' | 'next') => void
}

interface DragState {
  isDragging: boolean
  eventId: string | null
  dragType: 'move' | 'resize-start' | 'resize-end' | null
  startX: number
  originalStart: string
  originalEnd: string
}

interface KeyboardEventState {
  selectedEventId: string | null
  isEditMode: boolean
  editType: 'move' | 'resize-start' | 'resize-end' | null
  editAnnouncement: string
}

export function GanttView({
  events,
  selectedDate,
  onEventClick,
  onEventDrag,
  onNavigateMonth
}: GanttViewProps) {
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    eventId: null,
    dragType: null,
    startX: 0,
    originalStart: '',
    originalEnd: ''
  })
  
  // 키보드 네비게이션 상태
  const [keyboardState, setKeyboardState] = useState<KeyboardEventState>({
    selectedEventId: null,
    isEditMode: false,
    editType: null,
    editAnnouncement: ''
  })
  
  const ganttRef = useRef<HTMLDivElement>(null)
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null)
  const [liveRegionMessage, setLiveRegionMessage] = useState('')

  // 간트 차트용 시간라인 데이터 변환
  const timelineItems = useMemo((): GanttTimelineItem[] => {
    const projectMap = new Map<string, GanttTimelineItem[]>()
    
    events.forEach((event, index) => {
      const projectId = event.project.id
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, [])
      }

      // Tailwind 색상 팔레트 생성
      const colorPalette = ColorAssignmentService.generateProjectPalette(projectId, index)
      const tailwindClasses = ColorAssignmentService.getProjectTailwindClasses(projectId, index)
      
      const item: GanttTimelineItem = {
        id: event.id,
        projectName: event.project.name,
        phaseName: event.phase.name,
        startDate: event.startDate,
        endDate: event.endDate,
        progress: Math.random() * 100, // Mock progress
        color: colorPalette.primary, // Tailwind 기반 RGB 색상
        tailwindClasses, // 추가: Tailwind 클래스들
        conflicts: event.phase.conflictDetails || []
      }
      
      projectMap.get(projectId)!.push(item)
    })
    
    return Array.from(projectMap.values()).flat()
  }, [events])

  // 표시할 날짜 범위 계산 (현재 월 기준으로 ±2주)
  const dateRange = useMemo(() => {
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1)
    start.setDate(start.getDate() - 14) // 2주 전
    
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0)
    end.setDate(end.getDate() + 14) // 2주 후
    
    const dates: Date[] = []
    const current = new Date(start)
    
    while (current <= end) {
      dates.push(new Date(current))
      current.setDate(current.getDate() + 1)
    }
    
    return { start, end, dates }
  }, [selectedDate])

  // 날짜를 픽셀 위치로 변환
  const dateToPixel = (date: string, containerWidth: number) => {
    const targetDate = new Date(date)
    const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    const daysSinceStart = Math.ceil((targetDate.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    
    return (daysSinceStart / totalDays) * containerWidth
  }

  // 픽셀 위치를 날짜로 변환
  const pixelToDate = (pixel: number, containerWidth: number) => {
    const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))
    const dayOffset = Math.round((pixel / containerWidth) * totalDays)
    
    const resultDate = new Date(dateRange.start)
    resultDate.setDate(resultDate.getDate() + dayOffset)
    
    return resultDate.toISOString().split('T')[0]
  }

  // 키보드 네비게이션: 이벤트 선택
  const handleEventKeyDown = (e: React.KeyboardEvent, eventId: string) => {
    const event = events.find(ev => ev.id === eventId)
    if (!event) return

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault()
        if (!keyboardState.isEditMode) {
          // 일정 클릭 동작
          onEventClick(event)
        }
        break
        
      case 'e':
      case 'E':
        if (!keyboardState.isEditMode && event.isDraggable) {
          e.preventDefault()
          setKeyboardState({
            selectedEventId: eventId,
            isEditMode: true,
            editType: 'move',
            editAnnouncement: `${event.phase.name} 일정 이동 모드입니다. 화살표 키로 날짜를 조정하고 Enter로 확정, Escape로 취소하세요.`
          })
          setLiveRegionMessage(`${event.phase.name} 일정 이동 모드입니다. 화살표 키로 날짜를 조정하고 Enter로 확정, Escape로 취소하세요.`)
        }
        break
        
      case 'r':
      case 'R':
        if (!keyboardState.isEditMode && event.isDraggable) {
          e.preventDefault()
          setKeyboardState({
            selectedEventId: eventId,
            isEditMode: true,
            editType: 'resize-end',
            editAnnouncement: `${event.phase.name} 일정 기간 수정 모드입니다. 화살표 키로 종료일을 조정하고 Enter로 확정, Escape로 취소하세요.`
          })
          setLiveRegionMessage(`${event.phase.name} 일정 기간 수정 모드입니다. 화살표 키로 종료일을 조정하고 Enter로 확정, Escape로 취소하세요.`)
        }
        break
        
      case 'ArrowLeft':
      case 'ArrowRight':
        if (keyboardState.isEditMode && keyboardState.selectedEventId === eventId) {
          e.preventDefault()
          handleKeyboardEdit(e.key === 'ArrowRight' ? 1 : -1)
        }
        break
        
      case 'Enter':
        if (keyboardState.isEditMode && keyboardState.selectedEventId === eventId) {
          e.preventDefault()
          confirmKeyboardEdit()
        }
        break
        
      case 'Escape':
        if (keyboardState.isEditMode && keyboardState.selectedEventId === eventId) {
          e.preventDefault()
          cancelKeyboardEdit()
        }
        break
    }
  }

  // 키보드로 일정 수정
  const handleKeyboardEdit = (daysDelta: number) => {
    if (!keyboardState.selectedEventId) return
    
    const event = events.find(ev => ev.id === keyboardState.selectedEventId)
    if (!event) return

    const currentStart = new Date(event.startDate)
    const currentEnd = new Date(event.endDate)
    
    let newStart = event.startDate
    let newEnd = event.endDate
    let message = ''
    
    if (keyboardState.editType === 'move') {
      const newStartDate = new Date(currentStart)
      newStartDate.setDate(currentStart.getDate() + daysDelta)
      const newEndDate = new Date(currentEnd)
      newEndDate.setDate(currentEnd.getDate() + daysDelta)
      
      newStart = newStartDate.toISOString().split('T')[0]
      newEnd = newEndDate.toISOString().split('T')[0]
      message = `일정을 ${daysDelta > 0 ? '뒤로' : '앞으로'} ${Math.abs(daysDelta)}일 이동했습니다. 새 시작일: ${newStartDate.toLocaleDateString('ko-KR')}`
    } else if (keyboardState.editType === 'resize-end') {
      const newEndDate = new Date(currentEnd)
      newEndDate.setDate(currentEnd.getDate() + daysDelta)
      
      // 종료일이 시작일보다 앞설 수 없음
      if (newEndDate <= currentStart) {
        setLiveRegionMessage('종료일은 시작일보다 뒤여야 합니다.')
        return
      }
      
      newEnd = newEndDate.toISOString().split('T')[0]
      message = `일정 기간을 ${daysDelta > 0 ? '연장' : '단축'}했습니다. 새 종료일: ${newEndDate.toLocaleDateString('ko-KR')}`
    }
    
    // 임시 변경사항 적용 (실제로는 확정 시에만 API 호출)
    setLiveRegionMessage(message)
  }

  // 키보드 편집 확정
  const confirmKeyboardEdit = () => {
    if (!keyboardState.selectedEventId) return
    
    const event = events.find(ev => ev.id === keyboardState.selectedEventId)
    if (!event) return

    // 실제 변경사항 적용
    onEventDrag(keyboardState.selectedEventId, event.startDate, event.endDate)
    
    setKeyboardState({
      selectedEventId: null,
      isEditMode: false,
      editType: null,
      editAnnouncement: ''
    })
    
    setLiveRegionMessage(`${event.phase.name} 일정 수정이 완료되었습니다.`)
  }

  // 키보드 편집 취소
  const cancelKeyboardEdit = () => {
    setKeyboardState({
      selectedEventId: null,
      isEditMode: false,
      editType: null,
      editAnnouncement: ''
    })
    
    setLiveRegionMessage('일정 수정을 취소했습니다.')
  }

  // 드래그 시작
  const handleMouseDown = (e: React.MouseEvent, eventId: string, dragType: 'move' | 'resize-start' | 'resize-end') => {
    e.preventDefault()
    
    const event = events.find(ev => ev.id === eventId)
    if (!event || !event.isDraggable) return

    setDragState({
      isDragging: true,
      eventId,
      dragType,
      startX: e.clientX,
      originalStart: event.startDate,
      originalEnd: event.endDate
    })
  }

  // 드래그 중
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging || !ganttRef.current) return

      const rect = ganttRef.current.getBoundingClientRect()
      const containerWidth = rect.width - 200 // 프로젝트명 영역 제외
      const deltaX = e.clientX - dragState.startX
      const deltaDays = Math.round((deltaX / containerWidth) * dateRange.dates.length)
      
      // 임시로 스타일 업데이트 (실제 상태는 mouseup에서 변경)
      const eventElement = document.querySelector(`[data-event-id="${dragState.eventId}"]`) as HTMLElement
      if (eventElement) {
        if (dragState.dragType === 'move') {
          eventElement.style.transform = `translateX(${deltaX}px)`
        } else if (dragState.dragType === 'resize-end') {
          eventElement.style.width = `${eventElement.offsetWidth + deltaX}px`
        }
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragState.isDragging || !ganttRef.current) {
        setDragState(prev => ({ ...prev, isDragging: false }))
        return
      }

      const rect = ganttRef.current.getBoundingClientRect()
      const containerWidth = rect.width - 200
      const deltaX = e.clientX - dragState.startX
      const deltaDays = Math.round((deltaX / containerWidth) * dateRange.dates.length)
      
      const originalStart = new Date(dragState.originalStart)
      const originalEnd = new Date(dragState.originalEnd)
      
      let newStart = dragState.originalStart
      let newEnd = dragState.originalEnd
      
      if (dragState.dragType === 'move') {
        const newStartDate = new Date(originalStart)
        newStartDate.setDate(originalStart.getDate() + deltaDays)
        const newEndDate = new Date(originalEnd)
        newEndDate.setDate(originalEnd.getDate() + deltaDays)
        
        newStart = newStartDate.toISOString().split('T')[0]
        newEnd = newEndDate.toISOString().split('T')[0]
      } else if (dragState.dragType === 'resize-end') {
        const newEndDate = new Date(originalEnd)
        newEndDate.setDate(originalEnd.getDate() + deltaDays)
        newEnd = newEndDate.toISOString().split('T')[0]
      } else if (dragState.dragType === 'resize-start') {
        const newStartDate = new Date(originalStart)
        newStartDate.setDate(originalStart.getDate() + deltaDays)
        newStart = newStartDate.toISOString().split('T')[0]
      }
      
      // 드래그 효과 초기화
      const eventElement = document.querySelector(`[data-event-id="${dragState.eventId}"]`) as HTMLElement
      if (eventElement) {
        eventElement.style.transform = ''
        eventElement.style.width = ''
      }
      
      onEventDrag(dragState.eventId!, newStart, newEnd)
      setDragState({
        isDragging: false,
        eventId: null,
        dragType: null,
        startX: 0,
        originalStart: '',
        originalEnd: ''
      })
    }

    if (dragState.isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragState, dateRange.dates.length, onEventDrag])

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ]

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 스크린 리더용 실시간 알림 */}
      <div 
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only"
      >
        {liveRegionMessage}
      </div>
      
      {/* 키보드 사용법 안내 */}
      <div className="sr-only" id="gantt-keyboard-help">
        간트 차트 키보드 사용법: Tab으로 일정 선택, Enter로 상세보기, E키로 이동, R키로 기간 수정, 화살표 키로 조정, Enter로 확정, Escape로 취소
      </div>
      {/* 간트 차트 헤더 */}
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
        
        <h2 
          className="text-lg font-semibold text-gray-900"
          id="gantt-header-title"
        >
          {selectedDate.getFullYear()}년 {monthNames[selectedDate.getMonth()]} 간트 차트
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

      <div 
        ref={ganttRef} 
        className="flex"
        role="application"
        aria-labelledby="gantt-title"
        aria-describedby="gantt-keyboard-help"
      >
        {/* 프로젝트/페이즈 목록 (고정) */}
        <div className="w-48 bg-gray-50 border-r border-gray-200">
          <div className="p-3 border-b border-gray-200 bg-gray-100">
            <h3 
              id="gantt-title"
              className="text-sm font-medium text-gray-700"
            >
              프로젝트 / 페이즈
            </h3>
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {timelineItems.map((item, index) => (
              <div 
                key={item.id}
                className="p-3 border-b border-gray-100 hover:bg-gray-100 transition-colors duration-200"
                style={{ height: '48px' }}
              >
                <div className="flex items-center gap-2">
                  <div 
                    className={`w-3 h-3 rounded-sm ${item.tailwindClasses?.bg || 'bg-gray-100'} ${item.tailwindClasses?.border || 'border-gray-400'} border`}
                    title={`${item.projectName} 색상`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-gray-900 truncate">
                      {item.projectName}
                    </div>
                    <div className="text-xs text-gray-600 truncate">
                      {item.phaseName}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 타임라인 영역 */}
        <div className="flex-1 overflow-x-auto">
          {/* 날짜 헤더 */}
          <div className="flex border-b border-gray-200 bg-gray-50 sticky top-0 z-10">
            {dateRange.dates.map((date, index) => {
              if (index % 7 !== 0) return null // 주 단위로만 표시
              
              return (
                <div 
                  key={date.toISOString()}
                  className="min-w-24 p-2 text-center border-r border-gray-200 text-xs font-medium text-gray-700"
                >
                  {date.getMonth() + 1}/{date.getDate()}
                </div>
              )
            })}
          </div>

          {/* 간트 바 영역 */}
          <div className="relative max-h-96 overflow-y-auto">
            {timelineItems.map((item, index) => {
              const event = events.find(e => e.id === item.id)
              const startX = dateToPixel(item.startDate, ganttRef.current?.clientWidth || 800)
              const endX = dateToPixel(item.endDate, ganttRef.current?.clientWidth || 800)
              const width = endX - startX
              const hasConflicts = item.conflicts.length > 0
              
              return (
                <div 
                  key={item.id}
                  className="relative border-b border-gray-100"
                  style={{ height: '48px' }}
                >
                  {/* 간트 바 - 키보드 접근성 지원 */}
                  <div
                    data-event-id={item.id}
                    className={`
                      absolute top-2 h-8 rounded cursor-pointer border-l-4 transition-all duration-200 
                      focus:outline-none focus:ring-2 focus:ring-vridge-500
                      ${hasConflicts 
                        ? `${CALENDAR_CLASSES.CONFLICT_BG} ${CALENDAR_CLASSES.CONFLICT_BORDER}` 
                        : `${item.tailwindClasses?.bg || 'bg-gray-100/20'} ${item.tailwindClasses?.border || 'border-l-gray-400'} border-solid`
                      }
                      ${hoveredEvent === item.id ? 'shadow-lg z-20 opacity-80' : 'z-10'}
                      ${event?.isDraggable ? 'hover:shadow-md' : 'cursor-default'}
                      ${dragState.eventId === item.id ? 'shadow-lg z-30' : ''}
                      ${keyboardState.selectedEventId === item.id && keyboardState.isEditMode 
                        ? 'ring-2 ring-warning-500 bg-warning-100' 
                        : ''
                      }
                    `}
                    style={{ 
                      left: `${startX}px`,
                      width: `${Math.max(width, 20)}px`
                    }}
                    onClick={() => onEventClick(event!)}
                    onMouseEnter={() => setHoveredEvent(item.id)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onMouseDown={(e) => handleMouseDown(e, item.id, 'move')}
                    onKeyDown={(e) => handleEventKeyDown(e, item.id)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${
                      item.projectName
                    } - ${
                      item.phaseName
                    } 일정. 시작일: ${
                      new Date(item.startDate).toLocaleDateString('ko-KR')
                    }, 종료일: ${
                      new Date(item.endDate).toLocaleDateString('ko-KR')
                    }${
                      hasConflicts ? '. 일정 충돌 있음' : ''
                    }${
                      event?.isDraggable ? '. E키로 이동, R키로 기간 수정 가능' : ''
                    }`}
                    aria-describedby={keyboardState.selectedEventId === item.id ? 'keyboard-edit-help' : undefined}
                  >
                    {/* 진행률 바 */}
                    <div 
                      className={`absolute top-0 left-0 h-full rounded-l ${CALENDAR_CLASSES.PROGRESS_BAR}`}
                      style={{ width: `${item.progress}%` }}
                      aria-label={`진행률: ${Math.round(item.progress)}%`}
                    />
                    
                    {/* 텍스트 */}
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className={`text-xs font-medium truncate ${hasConflicts ? 'text-error-700' : 'text-gray-800'}`}>
                        {item.phaseName}
                      </span>
                    </div>
                    
                    {/* 충돌 경고 */}
                    {hasConflicts && (
                      <div className="absolute -top-1 -right-1 text-error-500 text-sm" aria-label="일정 충돌">
                        ⚠️
                      </div>
                    )}
                    
                    {/* 드래그 핸들 */}
                    {event?.isDraggable && (
                      <>
                        <div 
                          className="absolute left-0 top-0 w-2 h-full cursor-ew-resize bg-gray-400 opacity-0 hover:opacity-100 rounded-l"
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            handleMouseDown(e, item.id, 'resize-start')
                          }}
                          aria-hidden="true"
                        />
                        <div 
                          className="absolute right-0 top-0 w-2 h-full cursor-ew-resize bg-gray-400 opacity-0 hover:opacity-100 rounded-r"
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            handleMouseDown(e, item.id, 'resize-end')
                          }}
                          aria-hidden="true"
                        />
                      </>
                    )}
                    
                    {/* 키보드 편집 모드 도움말 */}
                    {keyboardState.selectedEventId === item.id && keyboardState.isEditMode && (
                      <div 
                        id="keyboard-edit-help"
                        className="sr-only"
                      >
                        {keyboardState.editAnnouncement}
                      </div>
                    )}
                  </div>
                  
                  {/* 오늘 날짜 표시선 */}
                  {index === 0 && (
                    <div 
                      className="absolute top-0 w-0.5 h-full bg-vridge-500 z-40 opacity-75"
                      style={{ 
                        left: `${dateToPixel(new Date().toISOString().split('T')[0], ganttRef.current?.clientWidth || 800)}px`
                      }}
                      aria-label="오늘 날짜"
                      role="img"
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
      
      {/* 키보드 사용법 안내 (토글 가능) */}
      <details className="border-t border-gray-200 bg-gray-50">
        <summary className="px-4 py-2 text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 focus:bg-gray-100 focus:outline-none">
          키보드 사용법 보기
        </summary>
        <div className="px-4 py-3 text-sm text-gray-600 bg-white border-t border-gray-100">
          <ul className="space-y-1">
            <li><kbd className="px-1 bg-gray-200 rounded text-xs">Tab</kbd> - 일정 간 이동</li>
            <li><kbd className="px-1 bg-gray-200 rounded text-xs">Enter</kbd> 또는 <kbd className="px-1 bg-gray-200 rounded text-xs">Space</kbd> - 일정 상세보기</li>
            <li><kbd className="px-1 bg-gray-200 rounded text-xs">E</kbd> - 일정 이동 모드</li>
            <li><kbd className="px-1 bg-gray-200 rounded text-xs">R</kbd> - 일정 기간 수정 모드</li>
            <li><kbd className="px-1 bg-gray-200 rounded text-xs">← →</kbd> - 편집 모드에서 날짜 조정</li>
            <li><kbd className="px-1 bg-gray-200 rounded text-xs">Enter</kbd> - 편집 확정</li>
            <li><kbd className="px-1 bg-gray-200 rounded text-xs">Esc</kbd> - 편집 취소</li>
          </ul>
        </div>
      </details>
    </div>
  )
}