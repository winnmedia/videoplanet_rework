/**
 * Calendar Accessibility Hook
 * @description WCAG 2.1 compliant accessibility features for calendar navigation
 */

import { useCallback, useEffect, useRef, useState } from 'react'

interface CalendarAccessibilityOptions {
  enableKeyboardNavigation?: boolean
  enableScreenReaderAnnouncements?: boolean
  enableFocusManagement?: boolean
  gridRowCount?: number
  gridColCount?: number
}

interface CalendarAccessibilityResult {
  // Keyboard Navigation
  handleKeyDown: (event: React.KeyboardEvent) => void
  focusedDate: Date | null
  setFocusedDate: (date: Date | null) => void
  
  // Screen Reader Support
  announceConflict: (conflictCount: number, severity: 'warning' | 'error') => void
  announceEventMove: (eventName: string, newDate: string) => void
  announceResolution: (resolutionType: string, success: boolean) => void
  
  // Focus Management
  focusCalendarGrid: () => void
  focusConflictAlert: () => void
  
  // ARIA Attributes
  getCalendarGridProps: () => Record<string, any>
  getCellProps: (date: Date, hasConflicts: boolean, eventCount: number) => Record<string, any>
  getConflictAlertProps: () => Record<string, any>
}

/**
 * Provides comprehensive accessibility features for calendar components
 */
export function useCalendarAccessibility(
  selectedDate: Date,
  onDateSelect: (date: Date) => void,
  options: CalendarAccessibilityOptions = {}
): CalendarAccessibilityResult {
  const {
    enableKeyboardNavigation = true,
    enableScreenReaderAnnouncements = true,
    enableFocusManagement = true,
    gridRowCount = 6,
    gridColCount = 7
  } = options

  const [focusedDate, setFocusedDate] = useState<Date | null>(selectedDate)
  const gridRef = useRef<HTMLElement | null>(null)
  const conflictAlertRef = useRef<HTMLElement | null>(null)
  const announcementRef = useRef<HTMLElement | null>(null)

  // Create live region for screen reader announcements
  useEffect(() => {
    if (!enableScreenReaderAnnouncements) return

    // Create or get existing announcement region
    let liveRegion = document.getElementById('calendar-announcements')
    if (!liveRegion) {
      liveRegion = document.createElement('div')
      liveRegion.id = 'calendar-announcements'
      liveRegion.setAttribute('aria-live', 'polite')
      liveRegion.setAttribute('aria-atomic', 'true')
      liveRegion.style.position = 'absolute'
      liveRegion.style.left = '-10000px'
      liveRegion.style.width = '1px'
      liveRegion.style.height = '1px'
      liveRegion.style.overflow = 'hidden'
      document.body.appendChild(liveRegion)
    }
    
    announcementRef.current = liveRegion

    return () => {
      // Cleanup on unmount
      if (liveRegion && document.body.contains(liveRegion)) {
        document.body.removeChild(liveRegion)
      }
    }
  }, [enableScreenReaderAnnouncements])

  /**
   * Handle keyboard navigation within calendar grid
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!enableKeyboardNavigation || !focusedDate) return

    const currentDate = new Date(focusedDate)
    let newDate: Date | null = null

    switch (event.key) {
      case 'ArrowUp':
        // Move up one week
        newDate = new Date(currentDate)
        newDate.setDate(currentDate.getDate() - 7)
        event.preventDefault()
        break

      case 'ArrowDown':
        // Move down one week
        newDate = new Date(currentDate)
        newDate.setDate(currentDate.getDate() + 7)
        event.preventDefault()
        break

      case 'ArrowLeft':
        // Move left one day
        newDate = new Date(currentDate)
        newDate.setDate(currentDate.getDate() - 1)
        event.preventDefault()
        break

      case 'ArrowRight':
        // Move right one day
        newDate = new Date(currentDate)
        newDate.setDate(currentDate.getDate() + 1)
        event.preventDefault()
        break

      case 'Home':
        // Move to first day of week
        newDate = new Date(currentDate)
        newDate.setDate(currentDate.getDate() - currentDate.getDay())
        event.preventDefault()
        break

      case 'End':
        // Move to last day of week
        newDate = new Date(currentDate)
        newDate.setDate(currentDate.getDate() + (6 - currentDate.getDay()))
        event.preventDefault()
        break

      case 'PageUp':
        // Previous month
        newDate = new Date(currentDate)
        if (event.shiftKey) {
          // Previous year
          newDate.setFullYear(currentDate.getFullYear() - 1)
        } else {
          newDate.setMonth(currentDate.getMonth() - 1)
        }
        event.preventDefault()
        break

      case 'PageDown':
        // Next month
        newDate = new Date(currentDate)
        if (event.shiftKey) {
          // Next year
          newDate.setFullYear(currentDate.getFullYear() + 1)
        } else {
          newDate.setMonth(currentDate.getMonth() + 1)
        }
        event.preventDefault()
        break

      case 'Enter':
      case ' ':
        // Select current date
        onDateSelect(currentDate)
        announce(`${currentDate.toLocaleDateString('ko-KR')} 선택됨`)
        event.preventDefault()
        break

      case 'Escape':
        // Return focus to today
        newDate = new Date()
        event.preventDefault()
        break

      default:
        return // Don't handle other keys
    }

    if (newDate) {
      setFocusedDate(newDate)
      announce(`${newDate.toLocaleDateString('ko-KR')}로 이동`)
    }
  }, [enableKeyboardNavigation, focusedDate, onDateSelect])

  /**
   * Make screen reader announcement
   */
  const announce = useCallback((message: string) => {
    if (!enableScreenReaderAnnouncements || !announcementRef.current) return

    // Clear previous announcement
    announcementRef.current.textContent = ''
    
    // Use setTimeout to ensure screen readers pick up the change
    setTimeout(() => {
      if (announcementRef.current) {
        announcementRef.current.textContent = message
      }
    }, 100)
  }, [enableScreenReaderAnnouncements])

  /**
   * Announce conflict information
   */
  const announceConflict = useCallback((conflictCount: number, severity: 'warning' | 'error') => {
    const severityText = severity === 'error' ? '긴급' : '경고'
    const message = `${severityText} 충돌 ${conflictCount}개가 감지되었습니다.`
    announce(message)
  }, [announce])

  /**
   * Announce event movement
   */
  const announceEventMove = useCallback((eventName: string, newDate: string) => {
    const message = `${eventName} 일정이 ${new Date(newDate).toLocaleDateString('ko-KR')}로 이동되었습니다.`
    announce(message)
  }, [announce])

  /**
   * Announce resolution result
   */
  const announceResolution = useCallback((resolutionType: string, success: boolean) => {
    const result = success ? '성공했습니다' : '실패했습니다'
    const message = `충돌 해결 (${resolutionType})이 ${result}.`
    announce(message)
  }, [announce])

  /**
   * Focus management
   */
  const focusCalendarGrid = useCallback(() => {
    if (!enableFocusManagement) return

    // Find and focus the calendar grid
    const gridElement = document.querySelector('[role="grid"]') as HTMLElement
    if (gridElement) {
      gridElement.focus()
      gridRef.current = gridElement
    }
  }, [enableFocusManagement])

  const focusConflictAlert = useCallback(() => {
    if (!enableFocusManagement) return

    // Find and focus the conflict alert
    const alertElement = document.querySelector('[role="alert"]') as HTMLElement
    if (alertElement) {
      alertElement.focus()
      conflictAlertRef.current = alertElement
    }
  }, [enableFocusManagement])

  /**
   * Get ARIA props for calendar grid
   */
  const getCalendarGridProps = useCallback(() => ({
    role: 'grid',
    'aria-label': `${selectedDate.getFullYear()}년 ${selectedDate.getMonth() + 1}월 캘린더`,
    'aria-rowcount': gridRowCount,
    'aria-colcount': gridColCount,
    onKeyDown: handleKeyDown,
    tabIndex: 0
  }), [selectedDate, gridRowCount, gridColCount, handleKeyDown])

  /**
   * Get ARIA props for calendar cells
   */
  const getCellProps = useCallback((
    date: Date, 
    hasConflicts: boolean, 
    eventCount: number
  ) => {
    const isSelected = date.toDateString() === selectedDate.toDateString()
    const isFocused = focusedDate?.toDateString() === date.toDateString()
    const isToday = date.toDateString() === new Date().toDateString()

    let ariaLabel = `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`
    
    if (isToday) ariaLabel += ', 오늘'
    if (isSelected) ariaLabel += ', 선택됨'
    if (eventCount > 0) ariaLabel += `, ${eventCount}개 일정`
    if (hasConflicts) ariaLabel += ', 충돌 있음'

    return {
      role: 'gridcell',
      'aria-label': ariaLabel,
      'aria-selected': isSelected,
      tabIndex: isFocused ? 0 : -1,
      'aria-current': isToday ? 'date' : undefined,
      'data-date': date.toISOString().split('T')[0]
    }
  }, [selectedDate, focusedDate])

  /**
   * Get ARIA props for conflict alert
   */
  const getConflictAlertProps = useCallback(() => ({
    role: 'alert',
    'aria-live': 'assertive',
    'aria-atomic': 'true',
    tabIndex: -1
  }), [])

  // Update focused date when selected date changes
  useEffect(() => {
    if (!focusedDate) {
      setFocusedDate(selectedDate)
    }
  }, [selectedDate, focusedDate])

  return {
    // Keyboard Navigation
    handleKeyDown,
    focusedDate,
    setFocusedDate,
    
    // Screen Reader Support
    announceConflict,
    announceEventMove,
    announceResolution,
    
    // Focus Management
    focusCalendarGrid,
    focusConflictAlert,
    
    // ARIA Attributes
    getCalendarGridProps,
    getCellProps,
    getConflictAlertProps
  }
}