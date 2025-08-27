/**
 * DatePicker - 날짜 선택 컴포넌트
 * 캘린더 내에서 특정 날짜를 선택할 때 사용
 */

'use client'

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'

import styles from './DatePicker.module.scss'
import type { DatePickerProps } from '../model/types'

export function DatePicker({
  selectedDate,
  minDate,
  maxDate,
  disabledDates = [],
  onChange,
  onClose,
  showToday = true,
  showClear = true,
  locale = 'ko',
  format = 'YYYY-MM-DD'
}: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    return selectedDate ? new Date(selectedDate) : new Date()
  })
  const [focusedDate, setFocusedDate] = useState<string | null>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // 현재 월의 캘린더 데이터 생성
  const calendarData = useMemo(() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const today = new Date().toISOString().split('T')[0]
    
    // 월의 첫날과 마지막날
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    
    // 캘린더 시작일 (이전 월 포함)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())
    
    // 캘린더 종료일 (다음 월 포함)
    const endDate = new Date(lastDay)
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()))
    
    const days = []
    const current = new Date(startDate)
    
    while (current <= endDate) {
      const dateStr = current.toISOString().split('T')[0]
      const isCurrentMonth = current.getMonth() === month
      const isToday = dateStr === today
      const isSelected = dateStr === selectedDate
      const isDisabled = isDateDisabled(dateStr)
      
      days.push({
        date: dateStr,
        day: current.getDate(),
        isCurrentMonth,
        isToday,
        isSelected,
        isDisabled,
        isWeekend: current.getDay() === 0 || current.getDay() === 6
      })
      
      current.setDate(current.getDate() + 1)
    }
    
    // 주 단위로 그룹화
    const weeks = []
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7))
    }
    
    return weeks
  }, [currentMonth, selectedDate, minDate, maxDate, disabledDates])

  // 날짜 비활성화 검사
  const isDateDisabled = useCallback((date: string) => {
    if (minDate && date < minDate) return true
    if (maxDate && date > maxDate) return true
    if (disabledDates.includes(date)) return true
    return false
  }, [minDate, maxDate, disabledDates])

  // 월 네비게이션
  const navigateMonth = useCallback((direction: 'prev' | 'next') => {
    setCurrentMonth(prev => {
      const newDate = new Date(prev)
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
  }, [])

  // 오늘 날짜로 이동
  const goToToday = useCallback(() => {
    const today = new Date()
    setCurrentMonth(today)
    const todayStr = today.toISOString().split('T')[0]
    if (!isDateDisabled(todayStr)) {
      onChange?.(todayStr)
    }
  }, [onChange, isDateDisabled])

  // 선택 해제
  const clearSelection = useCallback(() => {
    onChange?.(undefined as any)
  }, [onChange])

  // 날짜 선택
  const selectDate = useCallback((date: string) => {
    if (isDateDisabled(date)) return
    onChange?.(date)
  }, [onChange, isDateDisabled])

  // 키보드 네비게이션
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    const currentFocused = focusedDate || selectedDate || new Date().toISOString().split('T')[0]
    const currentDate = new Date(currentFocused)
    let newDate = new Date(currentDate)
    let shouldPreventDefault = true

    switch (event.key) {
      case 'ArrowUp':
        newDate.setDate(currentDate.getDate() - 7)
        break
      case 'ArrowDown':
        newDate.setDate(currentDate.getDate() + 7)
        break
      case 'ArrowLeft':
        newDate.setDate(currentDate.getDate() - 1)
        break
      case 'ArrowRight':
        newDate.setDate(currentDate.getDate() + 1)
        break
      case 'Home':
        newDate.setDate(1)
        break
      case 'End':
        newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)
        break
      case 'PageUp':
        if (event.shiftKey) {
          newDate.setFullYear(currentDate.getFullYear() - 1)
        } else {
          newDate.setMonth(currentDate.getMonth() - 1)
        }
        break
      case 'PageDown':
        if (event.shiftKey) {
          newDate.setFullYear(currentDate.getFullYear() + 1)
        } else {
          newDate.setMonth(currentDate.getMonth() + 1)
        }
        break
      case 'Enter':
      case ' ':
        selectDate(currentFocused)
        break
      case 'Escape':
        onClose?.()
        break
      default:
        shouldPreventDefault = false
    }

    if (shouldPreventDefault) {
      event.preventDefault()
      const newDateStr = newDate.toISOString().split('T')[0]
      
      // 월이 바뀌면 currentMonth도 업데이트
      if (newDate.getMonth() !== currentMonth.getMonth() || newDate.getFullYear() !== currentMonth.getFullYear()) {
        setCurrentMonth(newDate)
      }
      
      setFocusedDate(newDateStr)
    }
  }, [focusedDate, selectedDate, currentMonth, selectDate, onClose])

  // 외부 클릭 감지
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        onClose?.()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onClose])

  // 월/년 표시
  const monthYearDisplay = useMemo(() => {
    return currentMonth.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long'
    })
  }, [currentMonth, locale])

  return (
    <div
      ref={datePickerRef}
      className={styles.datePicker}
      role="dialog"
      aria-label="날짜 선택"
      aria-modal="true"
      onKeyDown={handleKeyDown}
      tabIndex={-1}
    >
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.monthYear}>
          {monthYearDisplay}
        </div>
        
        <div className={styles.navigation}>
          <button
            className={styles.navButton}
            onClick={() => navigateMonth('prev')}
            aria-label="이전 달"
            type="button"
          >
            ‹
          </button>
          <button
            className={styles.navButton}
            onClick={() => navigateMonth('next')}
            aria-label="다음 달"
            type="button"
          >
            ›
          </button>
        </div>
      </div>

      {/* 액션 버튼 */}
      {(showToday || showClear) && (
        <div className={styles.actions}>
          {showToday && (
            <button
              className={styles.actionButton}
              onClick={goToToday}
              type="button"
            >
              오늘
            </button>
          )}
          {showClear && selectedDate && (
            <button
              className={styles.actionButton}
              onClick={clearSelection}
              type="button"
            >
              선택 해제
            </button>
          )}
        </div>
      )}

      {/* 요일 헤더 */}
      <div className={styles.weekdayHeaders}>
        {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
          <div
            key={day}
            className={`${styles.weekdayHeader} ${
              index === 0 || index === 6 ? styles.weekend : ''
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* 캘린더 그리드 */}
      <div className={styles.calendar} role="grid" aria-label="캘린더">
        {calendarData.map((week, weekIndex) => (
          <div key={weekIndex} className={styles.week} role="row">
            {week.map((dayData) => (
              <button
                key={dayData.date}
                className={`${styles.day} ${
                  dayData.isCurrentMonth ? '' : styles.otherMonth
                } ${dayData.isToday ? styles.today : ''} ${
                  dayData.isSelected ? styles.selected : ''
                } ${dayData.isDisabled ? styles.disabled : ''} ${
                  dayData.isWeekend ? styles.weekend : ''
                } ${focusedDate === dayData.date ? styles.focused : ''}`}
                role="gridcell"
                aria-label={new Date(dayData.date).toLocaleDateString(locale, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                aria-current={dayData.isToday ? 'date' : undefined}
                aria-selected={dayData.isSelected}
                aria-disabled={dayData.isDisabled}
                tabIndex={dayData.isSelected || (focusedDate === dayData.date) ? 0 : -1}
                onClick={() => selectDate(dayData.date)}
                disabled={dayData.isDisabled}
                type="button"
              >
                {dayData.day}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}