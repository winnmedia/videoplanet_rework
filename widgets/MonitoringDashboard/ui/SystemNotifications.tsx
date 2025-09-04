'use client'

/**
 * System Notifications Component
 * 실시간 시스템 알림 및 이벤트 로그 컴포넌트
 */

import React, { useMemo, useState, useCallback } from 'react'

import { FeedbackEvent } from '@/processes/feedback-collection/lib/notificationEngine'

import styles from './SystemNotifications.module.scss'
import { SystemNotificationsProps, EventLogEntry } from '../model/types'

interface NotificationItem {
  id: string
  timestamp: Date
  type: 'notification' | 'event'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  icon: string
  color: string
  source?: string
  details?: Record<string, any>
}

export const SystemNotifications: React.FC<SystemNotificationsProps> = ({
  events,
  maxItems = 50,
  onEventClick,
  onClearAll,
  className = '',
  'data-testid': testId = 'system-notifications'
}) => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all')
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  // 이벤트를 알림 아이템으로 변환
  const notificationItems = useMemo((): NotificationItem[] => {
    return events.slice(0, maxItems).map(event => {
      const item = convertEventToNotification(event)
      return item
    }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }, [events, maxItems])

  // 필터링된 아이템들
  const filteredItems = useMemo(() => {
    if (filter === 'all') return notificationItems
    return notificationItems.filter(item => item.severity === filter)
  }, [notificationItems, filter])

  // 심각도별 갯수 계산
  const severityCounts = useMemo(() => {
    return notificationItems.reduce((counts, item) => {
      counts[item.severity] = (counts[item.severity] || 0) + 1
      return counts
    }, {} as Record<string, number>)
  }, [notificationItems])

  // 아이템 확장/축소 토글
  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }, [])

  // 알림 클릭 핸들러
  const handleItemClick = useCallback((item: NotificationItem) => {
    if (onEventClick) {
      // NotificationItem을 FeedbackEvent로 변환
      const event: FeedbackEvent = {
        id: item.id,
        type: 'feedback_added', // 기본값
        projectId: item.source || 'unknown',
        timestamp: item.timestamp,
        data: item.details || {}
      }
      onEventClick(event)
    }
    toggleExpanded(item.id)
  }, [onEventClick, toggleExpanded])

  // 이벤트를 알림으로 변환하는 함수
  function convertEventToNotification(event: FeedbackEvent): NotificationItem {
    const typeConfig = {
      'feedback_added': {
        title: '새 피드백',
        message: '새로운 피드백이 추가되었습니다',
        icon: '💬',
        color: '#17a2b8',
        severity: 'medium' as const
      },
      'feedback_updated': {
        title: '피드백 업데이트',
        message: '피드백이 업데이트되었습니다',
        icon: '✏️',
        color: '#ffc107',
        severity: 'low' as const
      },
      'feedback_resolved': {
        title: '피드백 해결',
        message: '피드백이 해결되었습니다',
        icon: '✅',
        color: '#28a745',
        severity: 'low' as const
      },
      'stage_completed': {
        title: '단계 완료',
        message: '워크플로우 단계가 완료되었습니다',
        icon: '✓',
        color: '#28a745',
        severity: 'medium' as const
      },
      'user_online': {
        title: '사용자 접속',
        message: '사용자가 접속했습니다',
        icon: '👤',
        color: '#17a2b8',
        severity: 'low' as const
      }
    }

    const config = typeConfig[event.type] || {
      title: '시스템 이벤트',
      message: `이벤트: ${event.type}`,
      icon: '🔔',
      color: '#6c757d',
      severity: 'low' as const
    }

    return {
      id: event.id,
      timestamp: event.timestamp,
      type: 'notification',
      severity: config.severity,
      title: config.title,
      message: config.message,
      icon: config.icon,
      color: config.color,
      source: event.projectId,
      details: event.data
    }
  }

  // 상대 시간 표시
  function getRelativeTime(timestamp: Date): string {
    const now = new Date()
    const diffMs = now.getTime() - timestamp.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) return `${diffSeconds}초 전`
    if (diffMinutes < 60) return `${diffMinutes}분 전`
    if (diffHours < 24) return `${diffHours}시간 전`
    if (diffDays < 7) return `${diffDays}일 전`
    
    return timestamp.toLocaleDateString('ko-KR')
  }

  if (!events.length) {
    return (
      <div 
        className={`${styles.container} ${styles.empty} ${className}`}
        data-testid={testId}
        role="region"
        aria-label="시스템 알림 - 비어있음"
      >
        <div className={styles.emptyState}>
          <div className={styles.emptyIcon} aria-hidden="true">🔔</div>
          <h3>알림 없음</h3>
          <p>아직 시스템 알림이 없습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`${styles.container} ${className}`}
      data-testid={testId}
      role="region"
      aria-labelledby="notifications-title"
    >
      {/* 헤더 */}
      <div className={styles.header}>
        <h2 id="notifications-title" className={styles.title}>
          시스템 알림
          <span className={styles.totalCount} aria-label={`총 ${notificationItems.length}개 알림`}>
            {notificationItems.length}
          </span>
        </h2>
        
        {onClearAll && (
          <button
            className={styles.clearButton}
            onClick={onClearAll}
            aria-label="모든 알림 삭제"
            type="button"
          >
            모두 삭제
          </button>
        )}
      </div>

      {/* 필터 */}
      <div className={styles.filters} role="tablist" aria-label="심각도별 필터">
        {[
          { key: 'all', label: '전체', count: notificationItems.length },
          { key: 'critical', label: '위험', count: severityCounts.critical || 0 },
          { key: 'high', label: '높음', count: severityCounts.high || 0 },
          { key: 'medium', label: '중간', count: severityCounts.medium || 0 },
          { key: 'low', label: '낮음', count: severityCounts.low || 0 }
        ].map(filterOption => (
          <button
            key={filterOption.key}
            className={`
              ${styles.filterButton}
              ${filter === filterOption.key ? styles.filterActive : ''}
              ${filterOption.key !== 'all' ? styles[`severity${filterOption.key.charAt(0).toUpperCase() + filterOption.key.slice(1)}`] : ''}
            `}
            onClick={() => setFilter(filterOption.key as any)}
            role="tab"
            aria-selected={filter === filterOption.key}
            aria-controls="notification-list"
            type="button"
          >
            {filterOption.label}
            {filterOption.count > 0 && (
              <span className={styles.filterCount}>{filterOption.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* 알림 목록 */}
      <div 
        id="notification-list"
        className={styles.list}
        role="tabpanel"
        aria-labelledby="notifications-title"
      >
        {filteredItems.map(item => {
          const isExpanded = expandedItems.has(item.id)
          
          return (
            <div
              key={item.id}
              className={`
                ${styles.item}
                ${styles[`severity${item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}`]}
                ${isExpanded ? styles.expanded : ''}
              `}
              onClick={() => handleItemClick(item)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleItemClick(item)
                }
              }}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-label={`${item.title}: ${item.message} - ${getRelativeTime(item.timestamp)}`}
            >
              {/* 알림 아이콘 */}
              <div 
                className={styles.itemIcon}
                style={{ color: item.color }}
                aria-hidden="true"
              >
                {item.icon}
              </div>
              
              {/* 알림 내용 */}
              <div className={styles.itemContent}>
                <div className={styles.itemHeader}>
                  <h3 className={styles.itemTitle}>{item.title}</h3>
                  <div className={styles.itemMeta}>
                    <span className={styles.itemTime}>
                      {getRelativeTime(item.timestamp)}
                    </span>
                    {item.source && (
                      <span className={styles.itemSource}>
                        {item.source}
                      </span>
                    )}
                  </div>
                </div>
                
                <p className={styles.itemMessage}>{item.message}</p>
                
                {/* 상세 정보 */}
                {isExpanded && item.details && (
                  <div className={styles.itemDetails}>
                    <h4>상세 정보</h4>
                    <pre className={styles.detailsContent}>
                      {JSON.stringify(item.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
              
              {/* 심각도 인디케이터 */}
              <div 
                className={`${styles.severityIndicator} ${styles[`severity${item.severity.charAt(0).toUpperCase() + item.severity.slice(1)}`]}`}
                aria-label={`심각도: ${item.severity}`}
              />
              
              {/* 확장 아이콘 */}
              <div className={styles.expandIcon} aria-hidden="true">
                {isExpanded ? '▼' : '▶'}
              </div>
            </div>
          )
        })}
      </div>

      {/* 페이지네이션 */}
      {filteredItems.length === 0 && filter !== 'all' && (
        <div className={styles.noResults} role="status">
          선택한 심각도의 알림이 없습니다.
        </div>
      )}
      
      {filteredItems.length >= maxItems && (
        <div className={styles.loadMore} role="status">
          최대 {maxItems}개의 알림이 표시됩니다. 더 많은 알림을 보려면 필터를 사용하세요.
        </div>
      )}
    </div>
  )
}