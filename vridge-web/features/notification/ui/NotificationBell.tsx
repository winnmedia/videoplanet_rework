'use client'

import { useState, useCallback, memo } from 'react'
import { NotificationCenter, type Notification } from '@/shared/ui'

interface NotificationBellProps {
  className?: string
  'data-testid'?: string
}

// 임시 목 데이터 - 실제로는 API에서 가져올 것임
const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    type: 'invitation',
    title: '프로젝트 초대',
    message: 'VRidge 홍보 영상 프로젝트에 초대되었습니다',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2시간 전
    isRead: false,
    actionUrl: '/projects/123'
  },
  {
    id: 'notif-2',
    type: 'comment',
    title: '새 댓글',
    message: '영상 컨셉 검토 건에 새 댓글이 달렸습니다',
    timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1일 전
    isRead: true,
    actionUrl: '/feedback/456'
  },
  {
    id: 'notif-3',
    type: 'conflict',
    title: '촬영 일정 충돌',
    message: '12월 15일 촬영 일정에 다른 프로젝트와 충돌이 있습니다',
    timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2일 전
    isRead: false,
    actionUrl: '/calendar?conflict=789'
  },
  {
    id: 'notif-4',
    type: 'reaction',
    title: '좋아요 알림',
    message: '스토리보드 아이디어에 5개의 좋아요가 달렸습니다',
    timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3일 전
    isRead: true,
    actionUrl: '/planning/storyboard/101'
  }
]

export const NotificationBell = memo(function NotificationBell({ 
  className, 
  'data-testid': testId 
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications)
  const [isLoading, setIsLoading] = useState(false)

  const unreadCount = notifications.filter(n => !n.isRead).length

  const handleToggle = useCallback(() => {
    setIsOpen(prev => !prev)
  }, [])

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  const handleNotificationClick = useCallback((notification: Notification) => {
    console.log('알림 클릭:', notification)
    
    // 읽음 처리
    setNotifications(prev => 
      prev.map(n => 
        n.id === notification.id ? { ...n, isRead: true } : n
      )
    )

    // 실제로는 라우터를 사용하여 해당 페이지로 이동
    if (notification.actionUrl) {
      // router.push(notification.actionUrl)
      console.log('이동할 URL:', notification.actionUrl)
    }

    setIsOpen(false)
  }, [])

  const handleRefresh = useCallback(() => {
    setIsLoading(true)
    
    // 실제로는 API 호출
    console.log('알림 새로고침')
    
    // 임시 로딩 시뮬레이션
    setTimeout(() => {
      setIsLoading(false)
    }, 1000)
  }, [])

  const handleMarkAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      )
    )
  }, [])

  return (
    <>
      <button
        className={`relative p-2 text-gray-600 hover:text-gray-800 dark:text-gray-300 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors ${className || ''}`}
        onClick={handleToggle}
        aria-label={`알림 센터 ${unreadCount > 0 ? `- 읽지 않은 알림 ${unreadCount}개` : ''}`}
        data-testid={testId}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M15 17h5l-5 5v-5zM4 17v5l5-5H4zm11.5-14.5C17.5 0.5 19 2 19 4c0 2-1.5 3.5-3.5 3.5S12 6 12 4c0-2 1.5-3.5 3.5-3.5zM12 9c-4 0-8 1-8 4v7h16v-7c0-3-4-4-8-4z" 
          />
        </svg>
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationCenter
        isOpen={isOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        isLoading={isLoading}
        onClose={handleClose}
        onNotificationClick={handleNotificationClick}
        onRefresh={handleRefresh}
        onMarkAsRead={handleMarkAsRead}
      />
    </>
  )
})