'use client'

import { useState, useCallback, memo } from 'react'

import { NotificationCenter } from '@/shared/ui'
import type { Notification as UINotification } from '@/shared/ui'
import { useNotifications } from '@/shared/hooks/useNotifications'

// 임시 Notification 타입 (실제로는 entities/notification에서 import)
interface Notification {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  isRead: boolean
  timestamp: string
  actionUrl?: string
  metadata?: Record<string, any>
}

// 엔티티 Notification을 UI Notification으로 변환하는 어댑터
const adaptNotificationForUI = (notification: Notification): UINotification => ({
  id: notification.id,
  type: notification.type as any,
  title: notification.title,
  message: notification.message,
  timestamp: new Date(notification.timestamp),
  isRead: notification.isRead,
  actionUrl: notification.actionUrl,
  metadata: notification.metadata
})

interface NotificationBellProps {
  className?: string
  'data-testid'?: string
  wsUrl?: string
  enableRealtime?: boolean
}

export const NotificationBell = memo(function NotificationBell({ 
  className, 
  'data-testid': testId,
  wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/notifications/',
  enableRealtime = true
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)

  // 통합 알림 Hook 사용 - 모든 로직이 여기에 통합됨
  const {
    notifications,
    unreadCount,
    isLoading,
    isConnected,
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    refreshNotifications
  } = useNotifications()

  // 이벤트 핸들러들
  const handleBellClick = useCallback(() => {
    setIsOpen(!isOpen)
    if (!isOpen && unreadCount > 0) {
      // 알림 패널을 열 때 새로고침
      refreshNotifications()
    }
  }, [isOpen, unreadCount, refreshNotifications])

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead()
    setIsOpen(false)
  }, [markAllAsRead])

  const handleNotificationItemClick = useCallback((notification: Notification) => {
    handleNotificationClick(notification)
    setIsOpen(false) // 패널 닫기
  }, [handleNotificationClick])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  // UI용 알림 데이터 변환
  const uiNotifications = notifications.map(adaptNotificationForUI)

  return (
    <>
      {/* 알림 벨 아이콘 */}
      <button
        onClick={handleBellClick}
        className={`
          relative p-2 rounded-lg transition-colors duration-200
          hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500
          ${className || ''}
        `}
        data-testid={testId || 'notification-bell'}
        aria-label={`알림 ${unreadCount > 0 ? `(${unreadCount}개 읽지 않음)` : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {/* 벨 아이콘 */}
        <svg 
          className="w-6 h-6 text-gray-600" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
          />
        </svg>

        {/* 읽지 않은 알림 카운트 배지 */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1"
            data-testid="notification-count"
            aria-label={`읽지 않은 알림 ${unreadCount}개`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}

        {/* 연결 상태 표시 */}
        {enableRealtime && (
          <span
            className={`absolute bottom-0 right-0 w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-gray-400'
            }`}
            title={isConnected ? '실시간 연결됨' : '연결 끊어짐'}
            aria-hidden="true"
          />
        )}
      </button>

      {/* 알림 센터 패널 */}
      {isOpen && (
        <div className="fixed inset-0 z-50" onClick={handleClose}>
          <div className="absolute top-16 right-4 w-96">
            <div onClick={(e) => e.stopPropagation()}>
              <NotificationCenter
                notifications={uiNotifications}
                isLoading={isLoading}
                onNotificationClick={handleNotificationItemClick}
                onMarkAsRead={markAsRead}
                onMarkAllRead={handleMarkAllRead}
                onClose={handleClose}
                showMarkAllRead={unreadCount > 0}
                emptyMessage="새로운 알림이 없습니다"
                loadingMessage="알림을 불러오는 중..."
                data-testid="notification-center"
              />
            </div>
          </div>
        </div>
      )}
    </>
  )
})

NotificationBell.displayName = 'NotificationBell'