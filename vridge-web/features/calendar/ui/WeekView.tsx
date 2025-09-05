'use client'

import { useState, useMemo } from 'react'

// import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import type { CalendarEvent, CalendarViewSettings } from '@/entities/project/model/calendar-types'

interface WeekViewProps {
  events: CalendarEvent[]
  viewSettings: CalendarViewSettings
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onNavigateWeek: (direction: 'prev' | 'next') => void
}

export function WeekView({
  events,
  viewSettings,
  selectedDate,
  onDateSelect,
  onEventClick,
  onNavigateWeek
}: WeekViewProps) {
  const [hoveredEvent, setHoveredEvent] = useState<string | null>(null)

  // 현재 주의 날짜들 계산
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(selectedDate)
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay())
    
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      days.push(day)
    }
    
    return days
  }, [selectedDate])

  // 시간대별 슬롯 생성 (오전 8시 ~ 오후 8시)
  const timeSlots = useMemo(() => {
    const slots: string[] = []
    for (let hour = 8; hour <= 20; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
    }
    return slots
  }, [])

  // 특정 날짜와 시간의 이벤트들 가져오기
  const getEventsForTimeSlot = (date: Date, timeSlot: string) => {
    const dateStr = date.toISOString().split('T')[0]
    const [hour] = timeSlot.split(':').map(Number)
    
    return events.filter(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      const slotTime = new Date(date.getFullYear(), date.getMonth(), date.getDate(), hour)
      
      return eventStart <= slotTime && slotTime < eventEnd
    })
  }

  // 오늘 날짜인지 확인
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // 현재 시간 슬롯인지 확인
  const isCurrentTimeSlot = (timeSlot: string) => {
    const now = new Date()
    const [hour] = timeSlot.split(':').map(Number)
    return now.getHours() === hour
  }

  const dayNames = ['일', '월', '화', '수', '목', '금', '토']
  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ]

  // 주 범위 표시
  const weekRange = useMemo(() => {
    const start = weekDays[0]
    const end = weekDays[6]
    
    if (start.getMonth() === end.getMonth()) {
      return `${start.getFullYear()}년 ${monthNames[start.getMonth()]} ${start.getDate()}일 - ${end.getDate()}일`
    } else {
      return `${monthNames[start.getMonth()]} ${start.getDate()}일 - ${monthNames[end.getMonth()]} ${end.getDate()}일`
    }
  }, [weekDays, monthNames])

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 주간 뷰 헤더 */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-b border-gray-200">
        <button
          onClick={() => onNavigateWeek('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          aria-label="이전 주"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        
        <h2 className="text-lg font-semibold text-gray-900">
          {weekRange}
        </h2>
        
        <button
          onClick={() => onNavigateWeek('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          aria-label="다음 주"
        >
          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-8 bg-gray-50 border-b border-gray-200">
        <div className="px-3 py-2 text-center text-sm font-medium text-gray-700">
          시간
        </div>
        {weekDays.map((day, index) => (
          <div
            key={day.toISOString()}
            className={`px-3 py-2 text-center text-sm font-medium ${
              index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
            } ${isToday(day) ? 'bg-blue-100' : ''}`}
          >
            <div>{dayNames[index]}</div>
            <div className={`text-xs ${isToday(day) ? 'text-blue-800 font-bold' : 'text-gray-500'}`}>
              {day.getDate()}
            </div>
          </div>
        ))}
      </div>

      {/* 시간별 그리드 */}
      <div className="max-h-96 overflow-y-auto">
        {timeSlots.map((timeSlot) => (
          <div 
            key={timeSlot}
            className={`grid grid-cols-8 border-b border-gray-100 ${
              isCurrentTimeSlot(timeSlot) ? 'bg-yellow-50' : 'hover:bg-gray-50'
            }`}
            role="row"
          >
            {/* 시간 레이블 */}
            <div className="px-3 py-4 text-sm text-gray-600 bg-gray-50 border-r border-gray-100 text-center font-medium">
              {timeSlot}
            </div>
            
            {/* 각 요일별 시간 슬롯 */}
            {weekDays.map((day, dayIndex) => {
              const slotEvents = getEventsForTimeSlot(day, timeSlot)
              const hasConflicts = slotEvents.some(event => event.isConflicting)
              
              return (
                <div
                  key={`${day.toISOString()}-${timeSlot}`}
                  role="gridcell"
                  className={`
                    relative px-2 py-4 border-r border-gray-100 cursor-pointer
                    transition-colors duration-200
                    ${hasConflicts ? 'bg-red-50' : 'hover:bg-gray-100'}
                    ${isToday(day) ? 'bg-blue-50' : ''}
                  `}
                  onClick={() => onDateSelect(day)}
                  aria-label={`${day.getFullYear()}년 ${day.getMonth() + 1}월 ${day.getDate()}일 ${timeSlot}`}
                >
                  {/* 이벤트 렌더링 */}
                  {slotEvents.map((event, eventIndex) => (
                    <div
                      key={event.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick(event)
                      }}
                      onMouseEnter={() => setHoveredEvent(event.id)}
                      onMouseLeave={() => setHoveredEvent(null)}
                      className={`
                        absolute left-1 right-1 text-xs px-1 py-1 rounded cursor-pointer
                        border-l-2 transition-all duration-200 z-10
                        ${event.isConflicting 
                          ? 'bg-red-100 border-red-500 text-red-800 border-dashed' 
                          : 'bg-opacity-20 border-opacity-100'
                        }
                        ${hoveredEvent === event.id ? 'shadow-md z-20 bg-opacity-40' : ''}
                      `}
                      style={{
                        top: `${eventIndex * 24}px`,
                        backgroundColor: event.isConflicting ? undefined : `${event.project.color}20`,
                        borderLeftColor: event.project.color,
                      }}
                      title={`${event.project.name} - ${event.phase.name}`}
                    >
                      <div className="truncate font-medium">
                        {event.phase.name}
                      </div>
                      <div className="truncate text-gray-600">
                        {event.project.name}
                      </div>
                      
                      {/* 충돌 표시 */}
                      {event.isConflicting && (
                        <div className="flex items-center gap-1 text-red-600">
                          <span className="text-xs">⚠️</span>
                          <span className="text-xs">충돌</span>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* 빈 시간 슬롯 표시 */}
                  {slotEvents.length === 0 && (
                    <div className="h-full w-full opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <div className="h-full w-full bg-gray-200 rounded border-dashed border-2 border-gray-300 flex items-center justify-center">
                        <span className="text-xs text-gray-500">+</span>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}