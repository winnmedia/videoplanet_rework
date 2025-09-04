'use client'

import React from 'react'

import styles from './RecentActivityFeed.module.scss'
import type { RecentActivityFeedProps } from '../model/types'

// 활동 타입별 아이콘 매핑
const ACTIVITY_ICONS = {
  project_created: '📁',
  phase_completed: '✅',
  file_uploaded: '📎',
  comment_added: '💬',
  status_changed: '🔄'
} as const

// 활동 타입별 색상 클래스 매핑
const ACTIVITY_CLASSES = {
  project_created: styles.activityProjectCreated,
  phase_completed: styles.activityPhaseCompleted,
  file_uploaded: styles.activityFileUploaded,
  comment_added: styles.activityCommentAdded,
  status_changed: styles.activityStatusChanged
} as const

export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  activities = [], // 기본값으로 빈 배열 설정
  maxItems = 10,
  showTimestamp = true,
  onActivityClick
}) => {
  // maxItems만큼 제한
  const displayActivities = activities.slice(0, maxItems)

  const handleActivityClick = (activityId: string) => {
    onActivityClick?.(activityId)
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60))
    const diffInHours = Math.floor(diffInMinutes / 60)
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInMinutes < 1) {
      return '방금 전'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`
    } else if (diffInHours < 24) {
      return `${diffInHours}시간 전`
    } else if (diffInDays < 7) {
      return `${diffInDays}일 전`
    } else {
      return date.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      })
    }
  }

  if (displayActivities.length === 0) {
    return (
      <div className={styles.emptyFeed}>
        <div className={styles.emptyIcon}>📝</div>
        <p className={styles.emptyText}>아직 활동이 없습니다</p>
      </div>
    )
  }

  return (
    <div className={styles.activityFeed}>
      {displayActivities.map((activity, index) => {
        const isClickable = Boolean(onActivityClick)
        const activityIcon = ACTIVITY_ICONS[activity.type]
        const activityColorClass = ACTIVITY_CLASSES[activity.type]

        return (
          <div
            key={activity.id}
            className={`${styles.activityItem} ${isClickable ? styles.clickable : ''}`}
            onClick={isClickable ? () => handleActivityClick(activity.id) : undefined}
            role={isClickable ? 'button' : 'article'}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                handleActivityClick(activity.id)
              }
            }}
          >
            {/* 활동 아이콘 */}
            <div className={`${styles.activityIcon} ${activityColorClass}`}>
              <span className={styles.iconEmoji}>{activityIcon}</span>
            </div>

            {/* 활동 내용 */}
            <div className={styles.activityContent}>
              <div className={styles.activityHeader}>
                <h4 className={styles.activityTitle}>
                  {activity.title}
                </h4>
                {showTimestamp && (
                  <time 
                    className={styles.activityTime}
                    dateTime={activity.timestamp}
                    title={new Date(activity.timestamp).toLocaleString('ko-KR')}
                  >
                    {formatTimestamp(activity.timestamp)}
                  </time>
                )}
              </div>

              <p className={styles.activityDescription}>
                {activity.description}
              </p>

              <div className={styles.activityMeta}>
                <span className={styles.activityUser}>
                  {activity.userName}
                </span>
                {/* 프로젝트명 중복 표시 방지를 위해 주석 처리 */}
                {/* 
                {activity.projectTitle && (
                  <>
                    <span className={styles.metaSeparator}>·</span>
                    <span className={styles.activityProject}>
                      {activity.projectTitle}
                    </span>
                  </>
                )}
                */}
              </div>
            </div>

            {/* 구분선 (마지막 아이템 제외) */}
            {index < displayActivities.length - 1 && (
              <div className={styles.activityDivider} />
            )}
          </div>
        )
      })}

      {/* 더보기 표시 (필요한 경우) */}
      {activities.length > maxItems && (
        <div className={styles.loadMoreHint}>
          총 {activities.length}개 중 {maxItems}개 표시
        </div>
      )}
    </div>
  )
}

// 기본 props 설정
RecentActivityFeed.displayName = 'RecentActivityFeed'