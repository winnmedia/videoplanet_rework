/**
 * @fileoverview 활동 피드 컴포넌트
 * @description 협업자들의 최근 활동을 보여주는 피드
 */

'use client'

import { memo } from 'react'
import clsx from 'clsx'

import type { ActivityFeedProps, CollaborationChange } from '../types'

export const ActivityFeed = memo(function ActivityFeed({
  changes,
  activeUsers,
  isOpen,
  onClose,
  className
}: ActivityFeedProps) {
  
  if (!isOpen) {
    return null
  }
  
  const getChangeIcon = (action: CollaborationChange['action']) => {
    switch (action) {
      case 'create':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        )
      case 'update':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        )
      case 'delete':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )
    }
  }
  
  const getChangeColor = (action: CollaborationChange['action']) => {
    switch (action) {
      case 'create':
        return 'text-green-500'
      case 'update':
        return 'text-blue-500'  
      case 'delete':
        return 'text-red-500'
    }
  }
  
  const getActionLabel = (action: CollaborationChange['action']) => {
    switch (action) {
      case 'create':
        return '생성함'
      case 'update':
        return '수정함'
      case 'delete':
        return '삭제함'
    }
  }
  
  const getResourceTypeLabel = (type: string) => {
    switch (type) {
      case 'video-planning':
        return '비디오 기획'
      case 'calendar-event':
        return '캘린더 이벤트'
      default:
        return type
    }
  }
  
  const formatTimestamp = (timestamp: string) => {
    const now = new Date()
    const changeTime = new Date(timestamp)
    const diffInMinutes = Math.floor((now.getTime() - changeTime.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) {
      return '방금 전'
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}분 전`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}시간 전`
    } else {
      return changeTime.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric'
      })
    }
  }
  
  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* 활동 피드 */}
      <div
        className={clsx(
          'fixed top-0 right-0 h-screen w-80 max-w-full z-50',
          'bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm',
          'border-l border-gray-200/50 dark:border-gray-700/50',
          'shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          'overflow-hidden flex flex-col',
          className
        )}
        role="region"
        aria-label="협업 활동 피드"
        data-testid="activity-feed"
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            최근 활동
          </h3>
          
          <button
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
            onClick={onClose}
            aria-label="활동 피드 닫기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* 활성 사용자 */}
        <div className="px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            현재 접속자 ({activeUsers.length})
          </h4>
          <div className="space-y-2">
            {activeUsers.map((user) => (
              <div key={user.id} className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs font-medium flex items-center justify-center">
                  {user.avatar ? (
                    <img 
                      src={user.avatar} 
                      alt={user.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    user.name.charAt(0)
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {user.name}
                    </span>
                    <div className={clsx(
                      'w-2 h-2 rounded-full',
                      user.isOnline ? 'bg-green-400' : 'bg-gray-300'
                    )} />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {user.role}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* 활동 목록 */}
        <div className="flex-1 overflow-y-auto">
          {changes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-4 text-center">
              <div className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                아직 활동이 없습니다
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {changes.map((change) => (
                <div 
                  key={change.id}
                  className="flex space-x-3"
                  data-testid={`activity-item-${change.id}`}
                >
                  {/* 아이콘 */}
                  <div className={clsx(
                    'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                    'bg-gray-100 dark:bg-gray-700',
                    getChangeColor(change.action)
                  )}>
                    {getChangeIcon(change.action)}
                  </div>
                  
                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {change.userName}
                      </span>
                      <span className="text-gray-600 dark:text-gray-300 ml-1">
                        님이 {getResourceTypeLabel(change.resourceType)}을 {getActionLabel(change.action)}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatTimestamp(change.timestamp)}
                    </div>
                    
                    {/* 변경된 데이터 미리보기 (간단히) */}
                    {change.data && Object.keys(change.data).length > 0 && (
                      <div className="mt-2 text-xs">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded px-2 py-1 truncate">
                          {change.resourceId}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
})