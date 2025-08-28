'use client'

import React from 'react'
import { EmptyState } from '@/shared/ui/EmptyState/EmptyState.modern'
import type { RecentActivityFeedProps } from '../model/types'

// 활동 타입별 아이콘과 색상 매핑
const ACTIVITY_CONFIGS = {
  project_created: {
    icon: '📁',
    bgColor: 'bg-blue-50',
    iconColor: 'text-blue-600'
  },
  phase_completed: {
    icon: '✅',
    bgColor: 'bg-green-50',
    iconColor: 'text-green-600'
  },
  file_uploaded: {
    icon: '📎',
    bgColor: 'bg-purple-50',
    iconColor: 'text-purple-600'
  },
  comment_added: {
    icon: '💬',
    bgColor: 'bg-orange-50',
    iconColor: 'text-orange-600'
  },
  status_changed: {
    icon: '🔄',
    bgColor: 'bg-gray-50',
    iconColor: 'text-gray-600'
  }
} as const

/**
 * 최근 활동 피드 컴포넌트 (Tailwind CSS 기반)
 * 프로젝트 관련 최근 활동을 시간순으로 표시
 */
export const RecentActivityFeed: React.FC<RecentActivityFeedProps> = ({
  activities = [],
  maxItems = 10,
  showTimestamp = true,
  onActivityClick
}) => {
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

  // 빈 상태 처리
  if (displayActivities.length === 0) {
    return (
      <EmptyState
        icon={
          <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        title="아직 활동이 없습니다"
        description="프로젝트를 생성하거나 작업을 시작하면 최근 활동이 여기에 표시됩니다."
        data-testid="activity-feed-empty"
      />
    )
  }

  return (
    <div className="space-y-4" role="feed" aria-label="최근 활동 피드">
      {displayActivities.map((activity, index) => {
        const isClickable = Boolean(onActivityClick)
        const config = ACTIVITY_CONFIGS[activity.type]
        
        return (
          <div
            key={activity.id}
            className={`
              flex items-start space-x-3 p-3 rounded-lg transition-colors duration-200
              ${isClickable 
                ? 'hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20' 
                : 'bg-white'
              }
            `}
            onClick={isClickable ? () => handleActivityClick(activity.id) : undefined}
            role={isClickable ? 'button' : 'article'}
            tabIndex={isClickable ? 0 : undefined}
            onKeyDown={(e) => {
              if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                handleActivityClick(activity.id)
              }
            }}
            data-testid={`activity-${activity.id}`}
          >
            {/* 활동 아이콘 */}
            <div className={`
              flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg
              ${config.bgColor} ${config.iconColor}
            `}>
              <span role="img" aria-hidden="true">
                {config.icon}
              </span>
            </div>

            {/* 활동 내용 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <h4 className="text-sm font-medium text-gray-900 truncate pr-2">
                  {activity.title}
                </h4>
                {showTimestamp && (
                  <time 
                    className="flex-shrink-0 text-xs text-gray-500"
                    dateTime={activity.timestamp}
                    title={new Date(activity.timestamp).toLocaleString('ko-KR')}
                  >
                    {formatTimestamp(activity.timestamp)}
                  </time>
                )}
              </div>

              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {activity.description}
              </p>

              <div className="flex items-center text-xs text-gray-500 mt-2">
                <span>{activity.userName}</span>
                {activity.projectTitle && (
                  <>
                    <span className="mx-1">·</span>
                    <span className="truncate">
                      {activity.projectTitle}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {/* 더보기 표시 */}
      {activities.length > maxItems && (
        <div className="text-center py-3 border-t border-gray-100">
          <p className="text-sm text-gray-500">
            총 {activities.length}개 중 {maxItems}개 표시
          </p>
        </div>
      )}
    </div>
  )
}

// 기본 props 설정
RecentActivityFeed.displayName = 'RecentActivityFeed'