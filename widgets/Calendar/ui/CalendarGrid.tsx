/**
 * CalendarGrid - 캘린더 그리드 컴포넌트
 * 월간/주간/일간 뷰를 지원하는 메인 그리드
 */

'use client'

import { useMemo, useCallback, useState } from 'react'

import styles from './CalendarGrid.module.scss'
import { ScheduleEventCard } from './ScheduleEventCard'
import type { CalendarGridProps, CalendarEvent, CalendarDay, CalendarWeek } from '../model/types'

export function CalendarGrid({
  viewMode,
  currentDate,
  events,
  selectedDate,
  onDateSelect,
  onEventClick,
  onTimeSlotClick,
  showWeekends = true,
  showWeekNumbers = false,
  timeFormat = '24'
}: CalendarGridProps) {
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null)
  const [dragOverDate, setDragOverDate] = useState<string | null>(null)
  
  // 충돌 감지 로직
  const detectConflicts = useCallback((date: string) => {
    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.startDate).toISOString().split('T')[0]
      const eventEnd = new Date(event.endDate).toISOString().split('T')[0]
      return date >= eventStart && date <= eventEnd
    })

    if (dayEvents.length <= 1) return []

    const conflicts = []
    for (let i = 0; i < dayEvents.length; i++) {
      for (let j = i + 1; j < dayEvents.length; j++) {
        const event1 = dayEvents[i]
        const event2 = dayEvents[j]
        
        const start1 = new Date(event1.startDate).getTime()
        const end1 = new Date(event1.endDate).getTime()
        const start2 = new Date(event2.startDate).getTime()
        const end2 = new Date(event2.endDate).getTime()
        
        // 시간 겹침 체크
        if (start1 < end2 && start2 < end1) {
          conflicts.push({ event1, event2 })
        }
      }
    }
    
    return conflicts.length > 0
  }, [events])
  
  // 드래그앤드롭 핸들러
  const handleEventDragStart = useCallback((event: CalendarEvent) => {
    setDraggedEvent(event)
  }, [])

  const handleEventDragEnd = useCallback((event: CalendarEvent, newDateTime: string) => {
    setDraggedEvent(null)
    setDragOverDate(null)
    // 실제 이벤트 이동은 상위 컴포넌트에서 처리
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, date: string) => {
    e.preventDefault()
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move'
    }
    setDragOverDate(date)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOverDate(null)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, date: string) => {
    e.preventDefault()
    if (draggedEvent) {
      // 이벤트 이동 처리
      setDragOverDate(null)
      setDraggedEvent(null)
    }
  }, [draggedEvent])

  // 요일 헤더 생성
  const weekdayHeaders = useMemo(() => {
    const headers = ['일', '월', '화', '수', '목', '금', '토']
    return showWeekends ? headers : headers.slice(1, 6)
  }, [showWeekends])

  // 월간 뷰 데이터 생성
  const monthViewData = useMemo(() => {
    const date = new Date(currentDate + 'T00:00:00') // 시간대 문제 방지
    const year = date.getFullYear()
    const month = date.getMonth()
    const today = new Date().toISOString().split('T')[0]
    
    // 월의 첫날과 마지막날
    const firstDayOfMonth = new Date(year, month, 1)
    const lastDayOfMonth = new Date(year, month + 1, 0)
    
    // 캘린더 시작일 (이전 월의 일부 날짜 포함)
    const startDate = new Date(firstDayOfMonth)
    startDate.setDate(startDate.getDate() - firstDayOfMonth.getDay())
    
    // 캘린더 종료일 (다음 월의 일부 날짜 포함)
    const endDate = new Date(lastDayOfMonth)
    endDate.setDate(endDate.getDate() + (6 - lastDayOfMonth.getDay()))
    
    const weeks: CalendarWeek[] = []
    const currentWeekDate = new Date(startDate)
    let weekNumber = 1
    
    while (currentWeekDate <= endDate) {
      const days: CalendarDay[] = []
      
      // 한 주의 7일 생성
      for (let i = 0; i < 7; i++) {
        if (!showWeekends && (i === 0 || i === 6)) {
          currentWeekDate.setDate(currentWeekDate.getDate() + 1)
          continue
        }
        
        const dateStr = currentWeekDate.toISOString().split('T')[0]
        const dayEvents = events.filter(event => {
          const eventStart = new Date(event.startDate).toISOString().split('T')[0]
          const eventEnd = new Date(event.endDate).toISOString().split('T')[0]
          return dateStr >= eventStart && dateStr <= eventEnd
        })
        
        days.push({
          date: dateStr,
          isToday: dateStr === today,
          isCurrentMonth: currentWeekDate.getMonth() === month,
          isWeekend: i === 0 || i === 6,
          events: dayEvents
        })
        
        currentWeekDate.setDate(currentWeekDate.getDate() + 1)
      }
      
      if (days.length > 0) {
        weeks.push({ weekNumber: weekNumber++, days })
      }
    }
    
    return weeks
  }, [currentDate, events, showWeekends])

  // 주간 뷰 시간 슬롯 생성
  const timeSlots = useMemo(() => {
    if (viewMode !== 'week' && viewMode !== 'day') return []
    
    const slots = []
    for (let hour = 0; hour < 24; hour++) {
      const time12 = hour === 0 ? '12:00 AM' : hour < 12 ? `${hour}:00 AM` : hour === 12 ? '12:00 PM' : `${hour - 12}:00 PM`
      const time24 = `${hour.toString().padStart(2, '0')}:00`
      
      slots.push({
        hour,
        display: timeFormat === '12' ? time12 : time24,
        time24: time24
      })
    }
    return slots
  }, [viewMode, timeFormat])

  // 주간 뷰 날짜들 생성
  const weekDates = useMemo(() => {
    if (viewMode !== 'week') return []
    
    const startOfWeek = new Date(currentDate)
    const day = startOfWeek.getDay()
    startOfWeek.setDate(startOfWeek.getDate() - day)
    
    const dates = []
    for (let i = 0; i < 7; i++) {
      if (!showWeekends && (i === 0 || i === 6)) {
        startOfWeek.setDate(startOfWeek.getDate() + 1)
        continue
      }
      
      const date = new Date(startOfWeek)
      const dateStr = date.toISOString().split('T')[0]
      const dayEvents = events.filter(event => {
        const eventStart = new Date(event.startDate).toISOString().split('T')[0]
        const eventEnd = new Date(event.endDate).toISOString().split('T')[0]
        return dateStr >= eventStart && dateStr <= eventEnd
      })
      
      dates.push({
        date: dateStr,
        dayOfWeek: date.getDay(),
        displayDate: `${date.getMonth() + 1}/${date.getDate()}`,
        isToday: dateStr === new Date().toISOString().split('T')[0],
        events: dayEvents
      })
      
      startOfWeek.setDate(startOfWeek.getDate() + 1)
    }
    
    return dates
  }, [currentDate, viewMode, events, showWeekends])

  // 이벤트 핸들러
  const handleDateClick = useCallback((date: string) => {
    onDateSelect?.(date)
  }, [onDateSelect])

  const handleEventClick = useCallback((event: CalendarEvent) => {
    onEventClick?.(event)
  }, [onEventClick])

  const handleTimeSlotClick = useCallback((date: string, time: string) => {
    const dateTime = `${date}T${time}:00.000Z`
    onTimeSlotClick?.(dateTime)
  }, [onTimeSlotClick])

  // 키보드 네비게이션
  const handleDateKeyDown = useCallback((event: React.KeyboardEvent, date: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleDateClick(date)
    }
  }, [handleDateClick])

  // 월간 뷰 렌더링
  if (viewMode === 'month') {
    return (
      <>
        <div 
          id="calendar-grid-description" 
          className="sr-only"
          style={{ position: 'absolute', left: '-10000px', width: '1px', height: '1px', overflow: 'hidden' }}
        >
          캘린더 그리드
        </div>
        <div 
          className={styles.calendarGrid}
          role="grid"
          aria-label="캘린더 그리드"
          aria-describedby="calendar-grid-description"
          data-testid="calendar-grid"
        >
        {/* 요일 헤더 */}
        <div className={styles.monthHeader} role="row">
          {showWeekNumbers && (
            <div className={styles.weekNumberHeader} role="columnheader">
              주
            </div>
          )}
          {weekdayHeaders.map((day, index) => (
            <div
              key={day}
              className={styles.dayHeader}
              role="columnheader"
              aria-label={`${day}요일`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* 월간 그리드 */}
        <div className={styles.monthGrid}>
          {monthViewData.map((week, weekIndex) => (
            <div key={week.weekNumber} className={styles.weekRow} role="row">
              {showWeekNumbers && (
                <div className={styles.weekNumber} role="gridcell">
                  {week.weekNumber}
                </div>
              )}
              {week.days.map((day, dayIndex) => {
                const hasConflict = detectConflicts(day.date)
                return (
                  <div
                    key={day.date}
                    className={`${styles.dayCell} ${
                      day.isToday ? styles.today : ''
                    } ${day.isCurrentMonth ? '' : styles.otherMonth} ${
                      day.isWeekend ? styles.weekend : ''
                    } ${selectedDate === day.date ? styles.selected : ''} ${
                      hasConflict ? styles.conflict : ''
                    } ${dragOverDate === day.date ? styles.dragOver : ''} hover-lift`}
                    role="gridcell"
                    aria-label={`${new Date(day.date).getDate()}일${day.events.length > 0 ? `, ${day.events.length}개의 일정` : ''}`}
                    aria-current={day.isToday ? 'date' : undefined}
                    tabIndex={weekIndex === 0 && dayIndex === 0 ? 7 : 0}
                    onClick={() => handleDateClick(day.date)}
                    onKeyDown={(e) => handleDateKeyDown(e, day.date)}
                    onDragOver={(e) => handleDragOver(e, day.date)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, day.date)}
                    data-testid={`calendar-date-${day.date}`}
                  >
                    <div className={`${styles.dateNumber} ${day.isToday ? styles.today + ' calendar-today primary-highlight' : ''}`}>
                      {new Date(day.date).getDate()}
                    </div>
                    
                    {/* 충돌 표시기 */}
                    {hasConflict && day.events.length > 1 && (
                      <>
                        <div 
                          className={styles.conflictIndicator}
                          data-testid="conflict-indicator"
                          aria-label="일정 충돌 발생"
                          title={`${day.events.length}개의 일정이 겹칩니다`}
                        >
                          ⚠️
                        </div>
                        <div 
                          role="tooltip"
                          className={styles.conflictTooltip}
                          aria-label={`${day.events.length}개의 일정이 겹칩니다`}
                        >
                          {day.events.length}개의 일정이 겹칩니다
                        </div>
                      </>
                    )}
                    
                    {/* 드롭 존 */}
                    <div 
                      className={`${styles.dropZone} ${dragOverDate === day.date ? 'drop-zone-active' : ''}`}
                      data-testid={`drop-zone-${day.date}`}
                      role="region"
                      aria-dropeffect="move"
                    />
                    
                    {/* 일정 표시 */}
                    <div className={styles.eventsContainer}>
                      {day.events.slice(0, 3).map((event) => (
                        <ScheduleEventCard
                          key={event.id}
                          event={event}
                          viewMode="month"
                          isCompact={true}
                          isDragging={draggedEvent?.id === event.id}
                          onClick={handleEventClick}
                          onDragStart={handleEventDragStart}
                          onDragEnd={handleEventDragEnd}
                        />
                      ))}
                      {day.events.length > 3 && (
                        <div className={styles.moreEvents}>
                          +{day.events.length - 3} 더보기
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        </div>
      </>
    )
  }

  // 주간 뷰 렌더링
  if (viewMode === 'week') {
    return (
      <div 
        className={styles.weekGrid}
        role="grid"
        aria-label="주간 캘린더 그리드"
        data-testid="calendar-grid"
      >
        {/* 주간 헤더 */}
        <div className={styles.weekHeader} role="row">
          <div className={styles.timeColumn} role="columnheader">시간</div>
          {weekDates.map((dateInfo) => (
            <div
              key={dateInfo.date}
              className={`${styles.weekDayHeader} ${dateInfo.isToday ? styles.today : ''}`}
              role="columnheader"
              aria-label={`${dateInfo.displayDate} ${weekdayHeaders[dateInfo.dayOfWeek]}요일`}
            >
              <div className={styles.dayName}>{weekdayHeaders[dateInfo.dayOfWeek]}</div>
              <div className={styles.dayDate}>{dateInfo.displayDate}</div>
            </div>
          ))}
        </div>

        {/* 시간 슬롯 그리드 */}
        <div className={styles.weekContent}>
          {timeSlots.map((timeSlot) => (
            <div key={timeSlot.hour} className={styles.timeRow} role="row">
              <div className={styles.timeLabel} role="gridcell">
                {timeSlot.display}
              </div>
              {weekDates.map((dateInfo) => (
                <div
                  key={`${dateInfo.date}-${timeSlot.hour}`}
                  className={styles.timeSlot}
                  role="gridcell"
                  aria-label={`${dateInfo.displayDate} ${timeSlot.display}`}
                  tabIndex={0}
                  onClick={() => handleTimeSlotClick(dateInfo.date, timeSlot.time24)}
                  data-testid={`time-slot-${dateInfo.date}-${timeSlot.time24}`}
                >
                  {/* 해당 시간대의 이벤트들 */}
                  {dateInfo.events
                    .filter((event) => {
                      const eventStart = new Date(event.startDate)
                      return eventStart.getHours() === timeSlot.hour
                    })
                    .map((event) => (
                      <ScheduleEventCard
                        key={event.id}
                        event={event}
                        viewMode="week"
                        isCompact={false}
                        isDragging={draggedEvent?.id === event.id}
                        onClick={handleEventClick}
                        onDragStart={handleEventDragStart}
                        onDragEnd={handleEventDragEnd}
                      />
                    ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 일간 뷰 렌더링
  if (viewMode === 'day') {
    const dayEvents = events.filter(event => {
      const eventStart = new Date(event.startDate).toISOString().split('T')[0]
      const eventEnd = new Date(event.endDate).toISOString().split('T')[0]
      return currentDate >= eventStart && currentDate <= eventEnd
    })

    return (
      <div 
        className={styles.dayGrid}
        role="grid"
        aria-label="일간 캘린더 그리드"
        data-testid="calendar-grid"
      >
        {/* 일간 헤더 */}
        <div className={styles.dayHeader} role="row">
          <div className={styles.timeColumn} role="columnheader">시간</div>
          <div className={styles.dayColumn} role="columnheader">
            {new Date(currentDate).toLocaleDateString('ko-KR', {
              month: 'long',
              day: 'numeric',
              weekday: 'long'
            })}
          </div>
        </div>

        {/* 시간 슬롯들 */}
        <div className={styles.dayContent}>
          {timeSlots.map((timeSlot) => (
            <div key={timeSlot.hour} className={styles.dayTimeRow} role="row">
              <div className={styles.timeLabel} role="gridcell">
                {timeSlot.display}
              </div>
              <div
                className={styles.dayTimeSlot}
                role="gridcell"
                aria-label={`${timeSlot.display} 시간대`}
                tabIndex={0}
                onClick={() => handleTimeSlotClick(currentDate, timeSlot.time24)}
                data-testid={`time-slot-${currentDate}-${timeSlot.time24}`}
              >
                {/* 해당 시간대의 이벤트들 */}
                {dayEvents
                  .filter((event) => {
                    const eventStart = new Date(event.startDate)
                    return eventStart.getHours() === timeSlot.hour
                  })
                  .map((event) => (
                    <ScheduleEventCard
                      key={event.id}
                      event={event}
                      viewMode="day"
                      isCompact={false}
                      isDragging={draggedEvent?.id === event.id}
                      onClick={handleEventClick}
                      onDragStart={handleEventDragStart}
                      onDragEnd={handleEventDragEnd}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return null
}