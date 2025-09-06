/**
 * @fileoverview 협업 기능이 통합된 캘린더 뷰 컴포넌트
 * @description 기존 CalendarView에 실시간 협업 기능을 추가한 버전
 */

'use client'

import { useState, useMemo, useCallback } from 'react'

import type { CalendarEvent, CalendarViewSettings } from '@/entities/project/model/calendar-types'
import { withCalendarCollaboration } from '@/shared/lib/collaboration/hocs/withCollaboration'
import type { CollaborationInjectedProps } from '@/shared/lib/collaboration/hocs/withCollaboration'

// ===========================
// 협업 활동 피드 컴포넌트
// ===========================

const CollaborationActivityFeed: React.FC<{
  changes: CollaborationInjectedProps['collaborationState']['recentChanges']
  isOpen: boolean
  onClose: () => void
}> = ({ changes, isOpen, onClose }) => {
  if (!isOpen) return null

  const calendarChanges = changes.filter(change => change.type === 'calendar-event')

  return (
    <div className="absolute top-0 right-0 w-80 h-full bg-white border-l border-gray-200 shadow-lg z-10">
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">최근 활동</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      </div>
      
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {calendarChanges.length === 0 ? (
          <p className="text-gray-500 text-sm">최근 활동이 없습니다.</p>
        ) : (
          calendarChanges.slice(0, 10).map((change) => (
            <div key={change.id} className="border-b border-gray-100 pb-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-medium">
                  {change.userName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{change.userName}</span>님이{' '}
                    {change.action === 'create' && '일정을 생성했습니다'}
                    {change.action === 'update' && '일정을 수정했습니다'}
                    {change.action === 'delete' && '일정을 삭제했습니다'}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(change.timestamp).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ===========================
// 협업 사용자 인디케이터
// ===========================

const CalendarCollaborationIndicator: React.FC<{
  activeUsers: CollaborationInjectedProps['collaborationState']['activeUsers']
  onShowActivity: () => void
  hasActivity: boolean
}> = ({ activeUsers, onShowActivity, hasActivity }) => {
  const onlineUsers = activeUsers.filter(user => user.isOnline)
  
  if (onlineUsers.length <= 1) return null
  
  return (
    <div className="flex items-center gap-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        <span className="text-sm text-green-800 font-medium">
          {onlineUsers.length}명이 일정을 확인 중
        </span>
        <div className="flex -space-x-1 ml-2">
          {onlineUsers.slice(0, 3).map((user) => (
            <div
              key={user.id}
              className="w-6 h-6 bg-green-500 text-white text-xs rounded-full flex items-center justify-center ring-2 ring-white"
              title={user.name}
            >
              {user.name.charAt(0)}
            </div>
          ))}
        </div>
      </div>
      
      <button
        onClick={onShowActivity}
        className={`text-xs px-2 py-1 rounded-full transition-colors ${
          hasActivity 
            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        }`}
      >
        {hasActivity ? '활동 보기' : '활동 없음'}
      </button>
    </div>
  )
}

// ===========================
// 메인 컴포넌트
// ===========================

interface CalendarViewWithCollaborationProps extends CollaborationInjectedProps {
  events: CalendarEvent[]
  viewSettings: CalendarViewSettings
  selectedDate: Date
  onDateSelect: (date: Date) => void
  onEventClick: (event: CalendarEvent) => void
  onNavigateMonth: (direction: 'prev' | 'next') => void
}

const CalendarViewWithCollaborationBase: React.FC<CalendarViewWithCollaborationProps> = ({
  events,
  viewSettings,
  selectedDate,
  onDateSelect,
  onEventClick,
  onNavigateMonth,
  collaborationState,
  collaborationActions,
  onOptimisticUpdate,
  isCollaborating,
  hasConflicts
}) => {
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null)
  const [showActivityFeed, setShowActivityFeed] = useState(false)

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

  // 협업 기능이 통합된 이벤트 클릭 핸들러
  const handleEventClick = useCallback((event: CalendarEvent) => {
    // 1. 협업 시스템에 이벤트 조회 알림
    onOptimisticUpdate({
      changeId: `event-view-${event.id}-${Date.now()}`,
      resourceId: event.id,
      resourceType: 'calendar-event',
      action: 'update',
      data: { action: 'view', timestamp: new Date().toISOString() }
    })

    // 2. 기존 이벤트 클릭 핸들러 호출
    onEventClick(event)
  }, [onEventClick, onOptimisticUpdate])

  // 협업 기능이 통합된 날짜 선택 핸들러
  const handleDateSelect = useCallback((date: Date) => {
    // 1. 협업 시스템에 날짜 선택 알림
    onOptimisticUpdate({
      changeId: `date-select-${date.getTime()}-${Date.now()}`,
      resourceId: `date-${date.toISOString().split('T')[0]}`,
      resourceType: 'calendar-event',
      action: 'update',
      data: { selectedDate: date.toISOString(), action: 'select' }
    })

    // 2. 기존 날짜 선택 핸들러 호출
    onDateSelect(date)
  }, [onDateSelect, onOptimisticUpdate])

  // 유틸리티 함수들
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === selectedDate.getMonth()
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const isSelected = (date: Date) => {
    return date.toDateString() === selectedDate.toDateString()
  }

  const monthNames = [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ]

  const dayNames = ['일', '월', '화', '수', '목', '금', '토']

  const hasRecentActivity = collaborationState.recentChanges.some(
    change => change.type === 'calendar-event' &&
    new Date(change.timestamp).getTime() > Date.now() - 60000 * 5 // 5분 이내
  )

  return (
    <div className="relative">
      {/* 협업 인디케이터 */}
      {isCollaborating && (
        <div className="mb-4">
          <CalendarCollaborationIndicator
            activeUsers={collaborationState.activeUsers}
            onShowActivity={() => setShowActivityFeed(true)}
            hasActivity={hasRecentActivity}
          />
        </div>
      )}

      {/* 캘린더 메인 */}
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
                onClick={() => handleDateSelect(date)}
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
                        handleEventClick(event)
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

      {/* 활동 피드 */}
      <CollaborationActivityFeed
        changes={collaborationState.recentChanges}
        isOpen={showActivityFeed}
        onClose={() => setShowActivityFeed(false)}
      />
    </div>
  )
}

// HOC 적용하여 협업 기능이 주입된 컴포넌트 생성
export const CalendarViewWithCollaboration = withCalendarCollaboration(
  CalendarViewWithCollaborationBase
)