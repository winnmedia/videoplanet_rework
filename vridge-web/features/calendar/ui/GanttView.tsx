'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
// import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
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
  
  const ganttRef = useRef<HTMLDivElement>(null)
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null)

  // 간트 차트용 시간라인 데이터 변환
  const timelineItems = useMemo((): GanttTimelineItem[] => {
    const projectMap = new Map<string, GanttTimelineItem[]>()
    
    events.forEach(event => {
      const projectId = event.project.id
      if (!projectMap.has(projectId)) {
        projectMap.set(projectId, [])
      }
      
      const item: GanttTimelineItem = {
        id: event.id,
        projectName: event.project.name,
        phaseName: event.phase.name,
        startDate: event.startDate,
        endDate: event.endDate,
        progress: Math.random() * 100, // Mock progress
        color: event.project.color,
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
        
        <h2 className="text-lg font-semibold text-gray-900">
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

      <div ref={ganttRef} className="flex">
        {/* 프로젝트/페이즈 목록 (고정) */}
        <div className="w-48 bg-gray-50 border-r border-gray-200">
          <div className="p-3 border-b border-gray-200 bg-gray-100">
            <h3 className="text-sm font-medium text-gray-700">프로젝트 / 페이즈</h3>
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
                    className="w-3 h-3 rounded-sm border"
                    style={{ 
                      backgroundColor: `${item.color}40`,
                      borderColor: item.color
                    }}
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
                  {/* 간트 바 */}
                  <div
                    data-event-id={item.id}
                    className={`
                      absolute top-2 h-8 rounded cursor-pointer
                      border-l-4 transition-all duration-200
                      ${hasConflicts ? 'border-dashed bg-red-100 border-red-500' : 'border-solid bg-opacity-20'}
                      ${hoveredEvent === item.id ? 'shadow-lg z-20 bg-opacity-40' : 'z-10'}
                      ${event?.isDraggable ? 'hover:shadow-md' : 'cursor-default'}
                      ${dragState.eventId === item.id ? 'shadow-lg z-30' : ''}
                    `}
                    style={{ 
                      left: `${startX}px`,
                      width: `${Math.max(width, 20)}px`,
                      backgroundColor: hasConflicts ? undefined : `${item.color}20`,
                      borderLeftColor: item.color,
                    }}
                    onClick={() => onEventClick(event!)}
                    onMouseEnter={() => setHoveredEvent(item.id)}
                    onMouseLeave={() => setHoveredEvent(null)}
                    onMouseDown={(e) => handleMouseDown(e, item.id, 'move')}
                    title={`${item.projectName} - ${item.phaseName}`}
                  >
                    {/* 진행률 바 */}
                    <div 
                      className="absolute top-0 left-0 h-full bg-green-400 rounded-l opacity-30"
                      style={{ width: `${item.progress}%` }}
                    />
                    
                    {/* 텍스트 */}
                    <div className="absolute inset-0 flex items-center px-2">
                      <span className="text-xs font-medium text-gray-800 truncate">
                        {item.phaseName}
                      </span>
                    </div>
                    
                    {/* 충돌 경고 */}
                    {hasConflicts && (
                      <div className="absolute -top-1 -right-1 text-red-500 text-sm">
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
                        />
                        <div 
                          className="absolute right-0 top-0 w-2 h-full cursor-ew-resize bg-gray-400 opacity-0 hover:opacity-100 rounded-r"
                          onMouseDown={(e) => {
                            e.stopPropagation()
                            handleMouseDown(e, item.id, 'resize-end')
                          }}
                        />
                      </>
                    )}
                  </div>
                  
                  {/* 오늘 날짜 표시선 */}
                  {index === 0 && (
                    <div 
                      className="absolute top-0 w-0.5 h-full bg-blue-500 z-40"
                      style={{ 
                        left: `${dateToPixel(new Date().toISOString().split('T')[0], ganttRef.current?.clientWidth || 800)}px`
                      }}
                    />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}