/**
 * ScheduleEventCard - 캘린더 이벤트 카드 컴포넌트
 * 각 일정을 시각적으로 표시하는 카드
 */

'use client'

import { useMemo, useCallback } from 'react'

import styles from './ScheduleEventCard.module.scss'
import type { ScheduleEventCardProps } from '../model/types'

export function ScheduleEventCard({
  event,
  viewMode,
  isCompact = false,
  isDragging = false,
  onClick,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd
}: ScheduleEventCardProps) {
  // 이벤트 시간 표시 계산
  const timeDisplay = useMemo(() => {
    const startDate = new Date(event.startDate)
    const endDate = new Date(event.endDate)
    
    if (event.isAllDay) {
      return '종일'
    }
    
    const formatTime = (date: Date) => {
      return date.toLocaleTimeString('ko-KR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Seoul'
      })
    }
    
    // 월간 뷰에서도 전체 시간 범위를 표시
    return `${formatTime(startDate)} - ${formatTime(endDate)}`
  }, [event.startDate, event.endDate, event.isAllDay, viewMode, isCompact])

  // 이벤트 지속 시간 계산 (주간/일간 뷰에서 높이 결정)
  const duration = useMemo(() => {
    if (event.isAllDay) return 24 * 60 // 24시간을 분으로
    
    const startDate = new Date(event.startDate)
    const endDate = new Date(event.endDate)
    return Math.max((endDate.getTime() - startDate.getTime()) / (1000 * 60), 30) // 최소 30분
  }, [event.startDate, event.endDate, event.isAllDay])

  // 카테고리별 아이콘
  const categoryIcon = useMemo(() => {
    switch (event.category) {
      case 'meeting':
        return '👥'
      case 'project-deadline':
        return '⏰'
      case 'milestone':
        return '🎯'
      case 'personal':
        return '👤'
      case 'holiday':
        return '🎉'
      default:
        return '📅'
    }
  }, [event.category])

  // 우선순위별 표시
  const priorityIndicator = useMemo(() => {
    if (event.priority === 'high') return '🔴'
    if (event.priority === 'medium') return '🟡'
    return null
  }, [event.priority])

  // 클릭 핸들러
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(event)
  }, [onClick, event])

  const handleEdit = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onEdit?.(event)
  }, [onEdit, event])

  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete?.(event.id)
  }, [onDelete, event.id])

  // 드래그 앤 드롭 핸들러
  const handleDragStart = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('application/json', JSON.stringify(event))
      e.dataTransfer.effectAllowed = 'move'
    }
    onDragStart?.(event)
  }, [event, onDragStart])

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // 드롭된 위치 정보는 상위 컴포넌트에서 처리
    onDragEnd?.(event, '') // 새로운 dateTime은 상위에서 계산
  }, [event, onDragEnd])

  // 키보드 접근성
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick(e as any)
    }
  }, [handleClick])

  // 동적 스타일 계산
  const cardStyle = useMemo(() => {
    const baseStyle: React.CSSProperties = {
      backgroundColor: event.backgroundColor || '#e6ecff',
      color: event.textColor || '#0031ff',
      borderLeft: `4px solid ${event.projectColor || '#0031ff'}`
    }

    // 주간/일간 뷰에서는 시간에 따른 높이 설정
    if ((viewMode === 'week' || viewMode === 'day') && !isCompact) {
      const heightInPixels = Math.max((duration / 60) * 50, 30) // 1시간당 50px, 최소 30px
      baseStyle.height = `${heightInPixels}px`
    }

    return baseStyle
  }, [event.backgroundColor, event.textColor, event.projectColor, viewMode, isCompact, duration])

  return (
    <div
      className={`${styles.eventCard} ${
        styles[viewMode]
      } ${isCompact ? styles.compact : ''} ${
        isDragging ? `${styles.dragging} dragging` : ''
      } ${event.isCompleted ? styles.completed : ''} ${
        event.priority === 'high' ? styles.highPriority : ''
      } hover-lift`}
      style={cardStyle}
      role="button"
      tabIndex={0}
      aria-label={`${event.title} ${timeDisplay} ${event.projectTitle ? `프로젝트: ${event.projectTitle}` : ''}`}
      aria-pressed={false}
      aria-grabbed={isDragging}
      draggable={!isCompact}
      data-testid="schedule-event-card"
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      {/* 이벤트 내용 */}
      <div className={styles.eventContent}>
        {/* 헤더 영역 */}
        <div className={styles.eventHeader}>
          <div className={styles.eventMeta}>
            <span className={styles.categoryIcon} aria-hidden="true">
              {categoryIcon}
            </span>
            {priorityIndicator && (
              <span className={styles.priorityIndicator} aria-label={`${event.priority} 우선순위`}>
                {priorityIndicator}
              </span>
            )}
            {!isCompact && (
              <span className={styles.timeDisplay} aria-label={`시간: ${timeDisplay}`}>
                {timeDisplay}
              </span>
            )}
          </div>
          
          {!isCompact && (
            <div className={styles.eventActions}>
              <button
                className={styles.actionButton}
                onClick={handleEdit}
                aria-label={`${event.title} 편집`}
                title="편집"
              >
                ✏️
              </button>
              <button
                className={styles.actionButton}
                onClick={handleDelete}
                aria-label={`${event.title} 삭제`}
                title="삭제"
              >
                🗑️
              </button>
            </div>
          )}
        </div>

        {/* 제목 */}
        <div className={styles.eventTitle} title={event.title}>
          {event.title}
        </div>

        {/* 세부 정보 (컴팩트 모드가 아닐 때만) */}
        {!isCompact && (
          <>
            {event.description && (
              <div className={styles.eventDescription} title={event.description}>
                {event.description}
              </div>
            )}
            
            {event.projectTitle && (
              <div className={styles.projectInfo}>
                <span className={styles.projectLabel}>프로젝트:</span>
                <span className={styles.projectTitle}>{event.projectTitle}</span>
              </div>
            )}
            
            {event.assignedTo && event.assignedTo.length > 0 && (
              <div className={styles.assignees}>
                <span className={styles.assigneeIcon}>👤</span>
                <span className={styles.assigneeCount}>
                  {event.assignedTo.length}명 참여
                </span>
              </div>
            )}
          </>
        )}

        {/* 완료 상태 표시 */}
        {event.isCompleted && (
          <div className={styles.completedBadge} aria-label="완료됨">
            ✅
          </div>
        )}

        {/* 반복 일정 표시 */}
        {event.recurrence !== 'none' && (
          <div className={styles.recurrenceBadge} aria-label={`${event.recurrence} 반복`}>
            🔁
          </div>
        )}
      </div>

      {/* 드래그 핸들 (마우스 호버 시만 표시) */}
      {!isCompact && (
        <div className={styles.dragHandle} aria-hidden="true">
          ⋮⋮
        </div>
      )}

      {/* 충돌 표시기 */}
      {/* 이 부분은 상위 컴포넌트에서 충돌을 감지했을 때만 렌더링 */}
    </div>
  )
}

// 이벤트 카드의 기본 높이를 계산하는 유틸리티 함수
export function calculateEventHeight(
  event: { startDate: string; endDate: string; isAllDay: boolean },
  viewMode: 'month' | 'week' | 'day'
): number {
  if (viewMode === 'month') return 20 // 월간 뷰에서는 고정 높이
  
  if (event.isAllDay) return 30 // 종일 이벤트는 30px
  
  const startDate = new Date(event.startDate)
  const endDate = new Date(event.endDate)
  const durationInMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60)
  
  // 1시간당 50px, 최소 30px
  return Math.max((durationInMinutes / 60) * 50, 30)
}