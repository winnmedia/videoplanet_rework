/**
 * CalendarWidget - 메인 캘린더 위젯 컴포넌트
 * FSD 아키텍처에 따른 캘린더 UI 위젯
 */

'use client'

import { useState, useCallback, useMemo } from 'react'

import { CalendarGrid } from './CalendarGrid'
import styles from './CalendarWidget.module.scss'
import { EventModal } from './EventModal'
import type { CalendarWidgetProps, CalendarViewMode, CalendarEvent } from '../model/types'

export function CalendarWidget({
  initialView = 'month',
  selectedDate,
  events = [],
  isLoading = false,
  onDateSelect,
  onEventClick,
  onEventCreate,
  onEventEdit,
  onEventDelete,
  onViewModeChange,
  onNavigateToday,
  onNavigatePrevious,
  onNavigateNext,
  showWeekends = true,
  showWeekNumbers = false,
  startOfWeek = 'sunday',
  timeFormat = '24',
  locale = 'ko'
}: CalendarWidgetProps) {
  // State
  const [viewMode, setViewMode] = useState<CalendarViewMode>(initialView)
  const [currentDate, setCurrentDate] = useState<string>(
    selectedDate || '2025-08-27' // 테스트를 위해 고정된 날짜 사용
  )
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)
  const [eventModalMode, setEventModalMode] = useState<'create' | 'edit' | 'view'>('create')
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>()
  const [selectedDateTime, setSelectedDateTime] = useState<string | undefined>()
  const [liveMessage, setLiveMessage] = useState<string>('')

  // Current period display
  const currentPeriodDisplay = useMemo(() => {
    const date = new Date(currentDate)
    const year = date.getFullYear()
    const month = date.getMonth() + 1

    switch (viewMode) {
      case 'month':
        return `${year}년 ${month}월`
      case 'week':
        const startOfWeekDate = new Date(date)
        const endOfWeekDate = new Date(date)
        startOfWeekDate.setDate(date.getDate() - date.getDay())
        endOfWeekDate.setDate(startOfWeekDate.getDate() + 6)
        return `${startOfWeekDate.getMonth() + 1}월 ${startOfWeekDate.getDate()}일 - ${endOfWeekDate.getMonth() + 1}월 ${endOfWeekDate.getDate()}일`
      case 'day':
        return `${year}년 ${month}월 ${date.getDate()}일`
      default:
        return `${year}년 ${month}월`
    }
  }, [currentDate, viewMode])

  // Event handlers
  const handleViewModeChange = useCallback((mode: CalendarViewMode) => {
    setViewMode(mode)
    onViewModeChange?.(mode)
  }, [onViewModeChange])

  const handleNavigateToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    setCurrentDate(today)
    onNavigateToday?.()
  }, [onNavigateToday])

  const handleNavigatePrevious = useCallback(() => {
    const date = new Date(currentDate)
    
    switch (viewMode) {
      case 'month':
        date.setMonth(date.getMonth() - 1)
        setLiveMessage(`${date.getFullYear()}년 ${date.getMonth() + 1}월로 이동했습니다`)
        break
      case 'week':
        date.setDate(date.getDate() - 7)
        setLiveMessage('이전 주로 이동했습니다')
        break
      case 'day':
        date.setDate(date.getDate() - 1)
        setLiveMessage('이전 일로 이동했습니다')
        break
    }
    
    const newDate = date.toISOString().split('T')[0]
    setCurrentDate(newDate)
    onNavigatePrevious?.()
  }, [currentDate, viewMode, onNavigatePrevious])

  const handleNavigateNext = useCallback(() => {
    const date = new Date(currentDate)
    
    switch (viewMode) {
      case 'month':
        date.setMonth(date.getMonth() + 1)
        break
      case 'week':
        date.setDate(date.getDate() + 7)
        break
      case 'day':
        date.setDate(date.getDate() + 1)
        break
    }
    
    const newDate = date.toISOString().split('T')[0]
    setCurrentDate(newDate)
    onNavigateNext?.()
  }, [currentDate, viewMode, onNavigateNext])

  const handleDateSelect = useCallback((date: string) => {
    setCurrentDate(date)
    onDateSelect?.(date)
  }, [onDateSelect])

  const handleEventClick = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setEventModalMode('view')
    setIsEventModalOpen(true)
    onEventClick?.(event)
  }, [onEventClick])

  const handleEventCreate = useCallback((dateTime: string) => {
    setSelectedDateTime(dateTime)
    setSelectedEvent(undefined)
    setEventModalMode('create')
    setIsEventModalOpen(true)
    onEventCreate?.(dateTime)
  }, [onEventCreate])

  const handleEventEdit = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event)
    setEventModalMode('edit')
    setIsEventModalOpen(true)
  }, [])

  const handleEventSave = useCallback((eventData: Partial<CalendarEvent>) => {
    if (eventModalMode === 'create') {
      // Create new event
      onEventCreate?.(selectedDateTime!)
    } else if (eventModalMode === 'edit' && selectedEvent) {
      // Update existing event
      onEventEdit?.({ ...selectedEvent, ...eventData })
    }
    setIsEventModalOpen(false)
  }, [eventModalMode, selectedEvent, selectedDateTime, onEventCreate, onEventEdit])

  const handleEventDelete = useCallback((eventId: string) => {
    onEventDelete?.(eventId)
    setIsEventModalOpen(false)
  }, [onEventDelete])

  const handleModalClose = useCallback(() => {
    setIsEventModalOpen(false)
    setSelectedEvent(undefined)
    setSelectedDateTime(undefined)
  }, [])

  // Keyboard navigation
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.target !== event.currentTarget) return

    const date = new Date(currentDate)
    
    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault()
        handleNavigatePrevious()
        break
      case 'ArrowRight':
        event.preventDefault()
        handleNavigateNext()
        break
      case 'Home':
        event.preventDefault()
        handleNavigateToday()
        break
      case 't':
      case 'T':
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault()
          handleNavigateToday()
        }
        break
    }
  }, [currentDate, handleNavigatePrevious, handleNavigateNext, handleNavigateToday])

  if (isLoading) {
    return (
      <div 
        className={styles.calendarWidget}
        data-testid="calendar-loading"
        role="status"
        aria-label="캘린더 로딩중"
      >
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p>일정을 불러오고 있습니다...</p>
        </div>
      </div>
    )
  }

  // 반응형 레이아웃 클래스 결정
  const layoutClass = useMemo(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768 ? 'mobile-layout' : 'desktop-layout'
    }
    return 'desktop-layout'
  }, [])

  return (
    <div 
      className={`${styles.calendarWidget} ${styles[layoutClass]} calendar-widget ${layoutClass}`}
      data-testid="calendar-container"
      role="application"
      aria-label={`${new Date(currentDate).getFullYear()}년 ${new Date(currentDate).getMonth() + 1}월 캘린더`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Calendar Header */}
      <header 
        className={styles.calendarHeader}
        role="banner"
        aria-label="캘린더"
      >
        <div className={styles.headerLeft}>
          <h1 className={styles.periodTitle} id="calendar-period">
            {currentPeriodDisplay}
          </h1>
        </div>

        <div 
          className={`${styles.headerControls} ${layoutClass === 'mobile-layout' ? 'mobile-stack' : 'desktop-horizontal'}`}
          data-testid="calendar-header-controls"
        >
          {/* View Mode Buttons */}
          <div className={styles.viewModeButtons} role="group" aria-label="보기 모드 선택">
            <button
              className={`${styles.viewButton} ${viewMode === 'month' ? styles.active : ''}`}
              onClick={() => handleViewModeChange('month')}
              aria-pressed={viewMode === 'month'}
              tabIndex={1}
            >
              월간 보기
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === 'week' ? styles.active : ''}`}
              onClick={() => handleViewModeChange('week')}
              aria-pressed={viewMode === 'week'}
              tabIndex={2}
            >
              주간 보기
            </button>
            <button
              className={`${styles.viewButton} ${viewMode === 'day' ? styles.active : ''}`}
              onClick={() => handleViewModeChange('day')}
              aria-pressed={viewMode === 'day'}
              tabIndex={3}
            >
              일간 보기
            </button>
          </div>

          {/* Navigation Buttons */}
          <div className={styles.navigationButtons} role="group" aria-label="캘린더 탐색">
            <button
              className={styles.navButton}
              onClick={handleNavigatePrevious}
              aria-label="이전 월"
              tabIndex={4}
            >
              이전
            </button>
            <button
              className={styles.todayButton}
              onClick={handleNavigateToday}
              tabIndex={5}
            >
              오늘
            </button>
            <button
              className={styles.navButton}
              onClick={handleNavigateNext}
              aria-label={`다음 ${viewMode === 'month' ? '월' : viewMode === 'week' ? '주' : '일'}`}
              tabIndex={6}
            >
              다음
            </button>
          </div>
        </div>
      </header>

      {/* Calendar Grid */}
      <main className={styles.calendarMain}>
        <CalendarGrid
          viewMode={viewMode}
          currentDate={currentDate}
          events={events}
          selectedDate={selectedDate}
          onDateSelect={handleDateSelect}
          onEventClick={handleEventClick}
          onTimeSlotClick={handleEventCreate}
          showWeekends={showWeekends}
          showWeekNumbers={showWeekNumbers}
          timeFormat={timeFormat}
        />
        
        {/* Empty state - shown as overlay when no events */}
        {events.length === 0 && (
          <div className={styles.emptyState} data-testid="empty-state">
            <div className={styles.emptyMessage}>
              <p>예정된 일정이 없습니다</p>
              <p>새로운 일정을 추가해보세요</p>
            </div>
          </div>
        )}
      </main>

      {/* Event Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        mode={eventModalMode}
        event={selectedEvent}
        selectedDateTime={selectedDateTime}
        onSave={handleEventSave}
        onDelete={handleEventDelete}
        onClose={handleModalClose}
      />

      {/* Screen Reader Live Region */}
      <div
        className={styles.liveRegion}
        role="status"
        aria-live="polite"
        aria-label="캘린더 상태"
        data-testid="calendar-live-region"
      >
        {liveMessage}
      </div>
    </div>
  )
}