/**
 * @fileoverview 협업 상태 표시 컴포넌트
 * @description 활성 사용자 및 협업 상태를 보여주는 간단한 인디케이터
 */

'use client'

import clsx from 'clsx'
import { memo } from 'react'

import type { CollaborationIndicatorProps } from '../types'

export const CollaborationIndicator = memo(function CollaborationIndicator({
  activeUsers,
  className,
  maxDisplayUsers = 3
}: CollaborationIndicatorProps) {
  const displayUsers = activeUsers.slice(0, maxDisplayUsers)
  const remainingCount = Math.max(0, activeUsers.length - maxDisplayUsers)
  
  if (activeUsers.length === 0) {
    return (
      <div 
        className={clsx(
          'flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400',
          className
        )}
        data-testid="collaboration-indicator-empty"
      >
        <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full" />
        <span>협업자 없음</span>
      </div>
    )
  }
  
  return (
    <div 
      className={clsx(
        'flex items-center space-x-2',
        className
      )}
      data-testid="collaboration-indicator"
    >
      {/* 온라인 상태 표시 */}
      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      
      {/* 사용자 아바타들 */}
      <div className="flex -space-x-1">
        {displayUsers.map((user) => (
          <div
            key={user.id}
            className={clsx(
              'w-6 h-6 rounded-full border-2 border-white dark:border-gray-800',
              'flex items-center justify-center text-xs font-medium',
              'bg-gradient-to-br from-blue-500 to-purple-600 text-white',
              user.isOnline 
                ? 'ring-2 ring-green-400 ring-offset-1' 
                : 'opacity-60'
            )}
            title={`${user.name} (${user.role})`}
            data-testid={`user-avatar-${user.id}`}
          >
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span>{user.name.charAt(0)}</span>
            )}
          </div>
        ))}
        
        {/* 추가 사용자 수 표시 */}
        {remainingCount > 0 && (
          <div
            className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800 bg-gray-500 text-white text-xs font-medium flex items-center justify-center"
            title={`${remainingCount}명의 추가 협업자`}
          >
            +{remainingCount}
          </div>
        )}
      </div>
      
      {/* 협업자 수 텍스트 */}
      <span className="text-sm text-gray-600 dark:text-gray-300">
        {activeUsers.length}명 협업 중
      </span>
    </div>
  )
})