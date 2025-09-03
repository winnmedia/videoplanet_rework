'use client'

import { useEffect, useState } from 'react'
import { useAppDispatch, useAppSelector } from '@/app/store'
import { 
  setView,
  setCurrentDate,
  navigateToToday,
  navigateToPrevious,
  navigateToNext,
  loadEventsSuccess,
  selectEvent,
  setFilters
} from '@/features/calendar'
import type { CalendarView } from '@/features/calendar'
import { PageLayout } from '@/widgets/PageLayout'
import { Button } from '@/shared/ui/Button'
import { Typography } from '@/shared/ui/Typography'

export default function CalendarPage() {
  const dispatch = useAppDispatch()
  const { 
    events, 
    currentView, 
    currentDate, 
    selectedEvent
  } = useAppSelector((state) => state.calendar)

  const [showEventModal, setShowEventModal] = useState(false)

  // 초기 이벤트 데이터 로드 (실제로는 API에서)
  useEffect(() => {
    // 목업 데이터로 테스트
    const mockEvents = [
      {
        id: 'event_1',
        title: '팀 미팅',
        description: '주간 팀 미팅 및 프로젝트 진행 상황 공유',
        type: 'meeting' as const,
        status: 'confirmed' as const,
        priority: 'high' as const,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2시간 후
        isAllDay: false,
        duration: 120,
        resourceIds: [],
        organizer: {
          id: 'user_1',
          name: '김팀장',
          email: 'kim@example.com',
          avatar: '/avatars/kim.jpg'
        },
        participants: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user_1',
        settings: {
          isPrivate: false,
          allowGuests: true,
          requireApproval: false,
          sendReminders: true,
          reminderIntervals: [15, 60]
        }
      },
      {
        id: 'event_2',
        title: '비디오 리뷰 세션',
        description: '최종 편집본 검토 및 피드백',
        type: 'review' as const,
        status: 'scheduled' as const,
        priority: 'medium' as const,
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 내일
        endDate: new Date(Date.now() + 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(), // 내일 + 1.5시간
        isAllDay: false,
        duration: 90,
        resourceIds: ['room_1'],
        organizer: {
          id: 'user_2',
          name: '박PD',
          email: 'park@example.com'
        },
        participants: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'user_2',
        settings: {
          isPrivate: false,
          allowGuests: false,
          requireApproval: true,
          sendReminders: true,
          reminderIntervals: [30]
        }
      }
    ]
    
    dispatch(loadEventsSuccess({ events: mockEvents }))
  }, [dispatch])

  const handleViewChange = (view: CalendarView) => {
    dispatch(setView(view))
  }

  const handleDateSelect = (date: string) => {
    dispatch(setCurrentDate(date))
  }

  const handleEventClick = (eventId: string) => {
    dispatch(selectEvent(eventId))
    setShowEventModal(true)
  }

  const handleCreateEvent = () => {
    setShowEventModal(true)
    dispatch(selectEvent(null))
  }

  const formatDateForView = (dateStr: string, view: CalendarView) => {
    const date = new Date(dateStr)
    
    switch (view) {
      case 'month':
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekStart.getDate() + 6)
        return `${weekStart.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}`
      case 'day':
        return date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
      default:
        return date.toLocaleDateString('ko-KR')
    }
  }

  const getEventsForCurrentView = () => {
    const viewDate = new Date(currentDate)
    
    return events.filter(event => {
      const eventDate = new Date(event.startDate)
      
      switch (currentView) {
        case 'day':
          return eventDate.toDateString() === viewDate.toDateString()
        case 'week':
          const weekStart = new Date(viewDate)
          weekStart.setDate(viewDate.getDate() - viewDate.getDay())
          const weekEnd = new Date(weekStart)
          weekEnd.setDate(weekStart.getDate() + 6)
          return eventDate >= weekStart && eventDate <= weekEnd
        case 'month':
          return eventDate.getMonth() === viewDate.getMonth() && eventDate.getFullYear() === viewDate.getFullYear()
        default:
          return true
      }
    })
  }

  const viewedEvents = getEventsForCurrentView()

  return (
    <PageLayout title="캘린더">
      <div className="container mx-auto px-4 py-8">
        {/* 헤더 */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 space-y-4 lg:space-y-0">
          <div>
            <Typography variant="h1" className="text-gray-900 mb-2">
              캘린더
            </Typography>
            <Typography variant="body" className="text-gray-600">
              프로젝트 일정과 팀 스케줄을 관리하세요
            </Typography>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 뷰 선택 버튼 */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['month', 'week', 'day'] as CalendarView[]).map((view) => (
                <button
                  key={view}
                  onClick={() => handleViewChange(view)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                    currentView === view
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {view === 'month' && '월'}
                  {view === 'week' && '주'}  
                  {view === 'day' && '일'}
                </button>
              ))}
            </div>
            
            <Button onClick={handleCreateEvent} variant="primary">
              새 일정
            </Button>
          </div>
        </div>

        {/* 네비게이션 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button onClick={() => dispatch(navigateToPrevious())} variant="outline" size="sm">
              이전
            </Button>
            <Button onClick={() => dispatch(navigateToNext())} variant="outline" size="sm">
              다음
            </Button>
            <Button onClick={() => dispatch(navigateToToday())} variant="outline" size="sm">
              오늘
            </Button>
          </div>
          
          <Typography variant="h2" className="text-xl font-semibold text-gray-900">
            {formatDateForView(currentDate, currentView)}
          </Typography>
          
          <div className="flex items-center space-x-2">
            <select 
              onChange={(e) => dispatch(setFilters({ eventTypes: e.target.value ? [e.target.value] : undefined }))}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="">모든 유형</option>
              <option value="meeting">미팅</option>
              <option value="review">리뷰</option>
              <option value="deadline">마감일</option>
              <option value="shoot">촬영</option>
            </select>
          </div>
        </div>

        {/* 캘린더 뷰 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {currentView === 'month' && (
            <MonthView 
              events={viewedEvents} 
              currentDate={currentDate}
              onEventClick={handleEventClick}
              onDateClick={handleDateSelect}
            />
          )}
          
          {currentView === 'week' && (
            <WeekView 
              events={viewedEvents}
              currentDate={currentDate} 
              onEventClick={handleEventClick}
            />
          )}
          
          {currentView === 'day' && (
            <DayView 
              events={viewedEvents}
              currentDate={currentDate}
              onEventClick={handleEventClick}
            />
          )}
        </div>

        {/* 이벤트 목록 (간단 버전) */}
        <div className="mt-8">
          <Typography variant="h3" className="text-lg font-semibold text-gray-900 mb-4">
            {currentView === 'day' ? '오늘의 일정' : '예정된 일정'}
          </Typography>
          
          {viewedEvents.length > 0 ? (
            <div className="space-y-3">
              {viewedEvents.map((event) => (
                <div
                  key={event.id}
                  onClick={() => handleEventClick(event.id)}
                  className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm cursor-pointer transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <Typography variant="h4" className="font-medium text-gray-900 mb-1">
                        {event.title}
                      </Typography>
                      <Typography variant="body2" className="text-gray-600 mb-2">
                        {event.description}
                      </Typography>
                      <div className="flex items-center text-sm text-gray-500 space-x-4">
                        <span>
                          {new Date(event.startDate).toLocaleDateString('ko-KR')} {' '}
                          {new Date(event.startDate).toLocaleTimeString('ko-KR', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                        <span>진행자: {event.organizer.name}</span>
                      </div>
                    </div>
                    
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      event.type === 'meeting' 
                        ? 'bg-blue-100 text-blue-800'
                        : event.type === 'review'
                        ? 'bg-purple-100 text-purple-800'
                        : event.type === 'deadline'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {event.type === 'meeting' && '미팅'}
                      {event.type === 'review' && '리뷰'}
                      {event.type === 'deadline' && '마감일'}
                      {event.type === 'shoot' && '촬영'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Typography variant="body" className="text-gray-500">
                {currentView === 'day' ? '오늘 예정된 일정이 없습니다' : '예정된 일정이 없습니다'}
              </Typography>
            </div>
          )}
        </div>

        {/* 간단한 이벤트 모달 (실제로는 별도 컴포넌트로 분리) */}
        {showEventModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full m-4">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <Typography variant="h3" className="text-lg font-semibold">
                    {selectedEvent ? '일정 상세' : '새 일정'}
                  </Typography>
                  <button 
                    onClick={() => setShowEventModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <Typography variant="body" className="text-gray-600 mb-6">
                  일정 관리 기능은 추후 구현 예정입니다.
                </Typography>
                
                <div className="flex justify-end">
                  <Button onClick={() => setShowEventModal(false)} variant="outline">
                    닫기
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}

// 간단한 캘린더 뷰 컴포넌트들 (실제로는 별도 위젯으로 분리)
interface CalendarViewProps {
  events: Array<{
    id: string
    title: string
    startDate: string
    type: string
  }>
  currentDate: string
  onEventClick: (eventId: string) => void
  onDateClick?: (date: string) => void
}

function MonthView({ events: _events, currentDate: _currentDate, onEventClick: _onEventClick, onDateClick: _onDateClick }: CalendarViewProps) {
  return (
    <div className="p-6">
      <Typography variant="body" className="text-center text-gray-500 py-12">
        월 뷰는 추후 구현 예정입니다
      </Typography>
    </div>
  )
}

function WeekView({ events: _events, currentDate: _currentDate, onEventClick: _onEventClick }: Omit<CalendarViewProps, 'onDateClick'>) {
  return (
    <div className="p-6">
      <Typography variant="body" className="text-center text-gray-500 py-12">
        주 뷰는 추후 구현 예정입니다
      </Typography>
    </div>
  )
}

function DayView({ events, currentDate, onEventClick }: Omit<CalendarViewProps, 'onDateClick'>) {
  return (
    <div className="p-6">
      <Typography variant="body" className="text-center text-gray-500 py-12">
        일 뷰는 추후 구현 예정입니다
      </Typography>
    </div>
  )
}