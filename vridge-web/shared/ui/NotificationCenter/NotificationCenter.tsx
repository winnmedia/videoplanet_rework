'use client'

import clsx from 'clsx'
import { useEffect, useRef, memo, useMemo, useCallback } from 'react'

import { useNotificationKeyboard } from './hooks/useNotificationKeyboard'
import type { NotificationCenterProps, Notification } from './types'
import { formatRelativeTime } from './utils/timeFormat'

export const NotificationCenter = memo(function NotificationCenter({
  isOpen,
  notifications,
  unreadCount,
  isLoading = false,
  onClose,
  onNotificationClick,
  onRefresh,
  onMarkAsRead,
  className,
  'data-testid': testId = 'notification-center'
}: NotificationCenterProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // 키보드 네비게이션 훅
  const { 
    focusedIndex, 
    handleKeyDown, 
    setNotificationRef, 
    refreshButtonRef, 
    closeButtonRef 
  } = useNotificationKeyboard({
    isOpen,
    notifications,
    onClose,
    onNotificationClick
  })

  // 포커스 관리 - 드로어가 열릴 때 첫 번째 포커스 가능한 요소에 포커스
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (refreshButtonRef.current) {
          refreshButtonRef.current.focus()
        }
      }, 10)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // 외부 클릭으로 닫기
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen, onClose])

  // 알림 타입별 아이콘 가져오기 (메모화)
  const getNotificationIcon = useCallback((type: Notification['type']) => {
    switch (type) {
      case 'invitation':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-icon="invitation">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        )
      case 'comment':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-icon="comment">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case 'reaction':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-icon="reaction">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )
      case 'conflict':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" data-icon="conflict">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5h5M9 7H4l5-5H4m11 4h-4.586a1 1 0 00-.707.293L9 12l4.707 5.707a1 1 0 00.707.293H19M5 13v4a2 2 0 002 2h10a2 2 0 002-2v-4" />
          </svg>
        )
    }
  }, [])

  // 알림 타입별 색상 가져오기 (메모화)
  const getNotificationColor = useCallback((type: Notification['type']) => {
    switch (type) {
      case 'invitation':
        return 'text-blue-500'
      case 'comment':
        return 'text-green-500'
      case 'reaction':
        return 'text-pink-500'
      case 'conflict':
        return 'text-yellow-500'
      default:
        return 'text-gray-500'
    }
  }, [])

  // 빈 상태 렌더링 (메모화)
  const renderEmptyState = useMemo(() => (
    <div className="text-center py-12" role="alert">
      <div className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15 17h5l-5 5v-5zM4 17h5l-5 5v-5zM12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        새 알림이 없습니다
      </h3>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        모든 알림을 확인했습니다
      </p>
    </div>
  ), [])

  // 로딩 상태 렌더링 (메모화)
  const renderLoadingState = useMemo(() => (
    <div className="flex flex-col items-center justify-center py-12" role="alert" aria-live="polite">
      <div 
        className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-3"
        data-testid="loading-spinner"
        aria-hidden="true"
      />
      <p className="text-sm text-gray-600 dark:text-gray-300">
        알림을 불러오는 중...
      </p>
    </div>
  ), [])

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* 알림 센터 드로어 */}
      <div
        ref={containerRef}
        className={clsx(
          'fixed top-0 right-0 h-screen w-96 max-w-full z-50',
          'bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm',
          'border-l border-gray-200/50 dark:border-gray-700/50',
          'shadow-2xl',
          'transform transition-transform duration-300 ease-out',
          'overflow-hidden flex flex-col',
          className
        )}
        role="region"
        aria-label={`알림 센터 - 읽지 않은 알림 ${unreadCount}개`}
        data-testid={testId}
        onKeyDown={handleKeyDown}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              알림
            </h2>
            {unreadCount > 0 && (
              <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              ref={refreshButtonRef}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
              onClick={onRefresh}
              type="button"
              aria-label="새로고침"
              data-testid="refresh-button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            
            <button
              ref={closeButtonRef}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
              onClick={onClose}
              type="button"
              aria-label="알림 센터 닫기"
              data-testid="close-button"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 알림 목록 */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          {isLoading ? renderLoadingState : (
            notifications.length === 0 ? renderEmptyState : (
              <ul role="list" aria-label="알림 목록" className="divide-y divide-gray-200/50 dark:divide-gray-700/50">
                {notifications.map((notification, index) => {
                  const isFocused = focusedIndex === index
                  
                  return (
                    <li key={notification.id}>
                      <button
                        ref={setNotificationRef(index)}
                        className={clsx(
                          'w-full text-left px-6 py-4 transition-colors',
                          'hover:bg-gray-50/70 dark:hover:bg-gray-700/50',
                          'focus:outline-none focus:bg-gray-50/70 dark:focus:bg-gray-700/50',
                          !notification.isRead && 'bg-blue-50/50 dark:bg-blue-900/20',
                          isFocused && 'bg-gray-50/70 dark:bg-gray-700/50'
                        )}
                        role="button"
                        tabIndex={index === 0 ? 0 : -1}
                        onClick={() => onNotificationClick(notification)}
                        onMouseEnter={() => !notification.isRead && onMarkAsRead(notification.id)}
                        aria-label={`${notification.title} - ${notification.message} - ${formatRelativeTime(notification.timestamp)}`}
                        data-testid={`notification-${notification.id}`}
                      >
                        <div className="flex space-x-3">
                          {/* 알림 아이콘 */}
                          <div className={clsx(
                            'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                            'bg-gray-100 dark:bg-gray-700',
                            getNotificationColor(notification.type)
                          )}>
                            {getNotificationIcon(notification.type)}
                          </div>
                          
                          {/* 알림 내용 */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <p className={clsx(
                                'text-sm font-medium truncate',
                                !notification.isRead 
                                  ? 'text-gray-900 dark:text-gray-100' 
                                  : 'text-gray-700 dark:text-gray-300'
                              )}>
                                {notification.title}
                              </p>
                              <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                                {!notification.isRead && (
                                  <div className="w-2 h-2 bg-blue-500 rounded-full" aria-hidden="true" />
                                )}
                                <time 
                                  className="text-xs text-gray-500 dark:text-gray-400"
                                  dateTime={notification.timestamp.toISOString()}
                                >
                                  {formatRelativeTime(notification.timestamp)}
                                </time>
                              </div>
                            </div>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )
          )}
        </div>
      </div>
    </>
  )
})