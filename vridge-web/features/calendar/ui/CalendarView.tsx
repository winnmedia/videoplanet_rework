'use client'

import { useState, useMemo } from 'react'

// import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline'
import type { CalendarEvent, CalendarViewSettings } from '@/entities/project/model/calendar-types'

interface CalendarViewProps {
  events: CalendarEvent[]
  viewSettings: CalendarViewSettings
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onNavigateMonth: (direction: 'prev' | 'next') => void
}

export function CalendarView({
  events,
  viewSettings,
  selectedDate,
  onDateSelect,
  onEventClick,
  onNavigateMonth
}: CalendarViewProps) {
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)

  // 현재 월의 날짜들 계산
  const calendarDays = useMemo(() => {
    const year = selectedDate.getFullYear()
    const month = selectedDate.getMonth()
    
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    const firstDayOfWeek = firstDayOfMonth.getDay()
    const daysInMonth = lastDayOfMonth.getDate()
    
    const days: Date[] = []
    
    // 이전 월의 마지막 날들
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      days.push(new Date(year, month, -i))
    }
    
    // 현재 월의 날들
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i))
    }
    
    // 다음 월의 첫 날들 (6주 * 7일 = 42일 채우기)
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i))
    }
    
    return days
  }, [selectedDate])

  // 특정 날짜의 이벤트들 가져오기
  const getEventsForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0]
    return events.filter(event => {
      const eventStart = new Date(event.startDate)
      const eventEnd = new Date(event.endDate)
      return date >= eventStart && date <= eventEnd
    })
  }

  // 날짜가 현재 월에 속하는지 확인
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === selectedDate.getMonth()
  }

  // 오늘 날짜인지 확인
  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  // 선택된 날짜인지 확인
  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString()
  }

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ]

  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* 캘린더 헤더 */}
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

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {dayNames.map((day, index) => (
          <div
            key={day}
            className={`px-3 py-2 text-center text-sm font-medium ${
              index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 캘린더 그리드 */}
      <div 
        className="grid grid-cols-7"
        role="grid"
        aria-label={`${selectedDate.getFullYear()}년 ${monthNames[selectedDate.getMonth()]} 캘린더`}
      >
        {calendarDays.map((date, index) => {
          const dayEvents = getEventsForDate(date)
          const hasConflicts = dayEvents.some(event => event.isConflicting)
          
          return (
            <div
              key={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
              role="gridcell"
              className={`
                min-h-32 border-r border-b border-gray-100 p-1 cursor-pointer
                transition-all duration-200 hover:bg-gray-50
                ${!isCurrentMonth(date) ? 'bg-gray-50 text-gray-400' : 'bg-white text-gray-900'}
                ${isToday(date) ? 'bg-blue-50' : ''}
                ${isSelected(date) ? 'ring-2 ring-blue-500 ring-inset' : ''}
                ${hasConflicts ? 'bg-red-50' : ''}
              `}
              onClick={() => onDateSelect(date)}
              onMouseEnter={() => setHoveredDate(date)}
              onMouseLeave={() => setHoveredDate(null)}
              tabIndex={isCurrentMonth(date) ? 0 : -1}
              aria-label={`${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`}
            >
              {/* 날짜 숫자 */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`
                    text-sm font-medium
                    ${isToday(date) ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''}
                    ${isSelected(date) && !isToday(date) ? 'text-blue-600' : ''}
                  `}
                >
                  {date.getDate()}
                </span>
                
                {/* 충돌 경고 아이콘 */}
                {hasConflicts && (
                  <div className="text-red-500" title="일정 충돌">
                    ⚠️
                  </div>
                )}
              </div>

              {/* 이벤트 목록 */}
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <div
                    key={event.id}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEventClick(event)
                    }}
                    className={`
                      text-xs px-1 py-0.5 rounded cursor-pointer
                      border-l-2 transition-all duration-200
                      ${event.isConflicting 
                        ? 'bg-red-100 border-red-500 text-red-800 border-dashed' 
                        : `bg-opacity-20 border-opacity-100`
                      }
                      hover:bg-opacity-30
                    `}
                    style={{
                      backgroundColor: event.isConflicting ? undefined : `${event.project.color}20`,
                      borderLeftColor: event.project.color,
                    }}
                    title={`${event.project.name} - ${event.phase.name}`}
                  >
                    <div className="truncate">
                      {event.phase.name}
                    </div>
                    {event.isConflicting && (
                      <div className="text-red-600 text-xs">
                        충돌
                      </div>
                    )}
                  </div>
                ))}
                
                {/* 더 많은 이벤트가 있는 경우 */}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-gray-500 px-1">
                    +{dayEvents.length - 3}개 더
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}