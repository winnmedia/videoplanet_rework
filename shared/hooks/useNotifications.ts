/**
 * 알림 시스템 통합 Hook
 * @description 모든 알림 관련 로직을 단일화한 Custom Hook
 * @layer shared/hooks
 * 
 * 기능:
 * - Redux 상태 관리
 * - WebSocket 연결 관리
 * - 읽음/클릭 처리
 * - 새로고침 로직
 */

import { useCallback, useEffect, useRef, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { createSelector } from '@reduxjs/toolkit'

import type { RootState } from '@/app/store/store'
import type { Notification } from '@/entities/notification'

interface NotificationState {
  items: Notification[]
  unreadCount: number
  isLoading: boolean
  isConnected: boolean
  lastUpdated: string | null
}

// 임시 액션 타입들 (실제로는 entities/notification/model/slice에서 import)
interface NotificationActions {
  addNotification: (notification: Notification) => any
  markAsRead: (id: string) => any
  markAllAsRead: () => any
  removeNotification: (id: string) => any
  setConnectionStatus: (status: boolean) => any
  setLoading: (loading: boolean) => any
  updateUnreadCount: (count: number) => any
}

/**
 * 알림 시스템 통합 Hook
 */
export function useNotifications() {
  const dispatch = useDispatch()
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  // 메모이제이션된 셀렉터 생성
  const selectNotificationState = useMemo(
    () => createSelector(
      [(state: RootState) => state.notifications || {}],
      (notifications) => ({
        items: notifications.items || [],
        unreadCount: notifications.unreadCount || 0,
        isLoading: notifications.isLoading || false,
        isConnected: notifications.connectionStatus === 'connected',
        lastUpdated: notifications.lastFetched || null
      })
    ),
    []
  )

  // Redux 상태 조회 (메모이제이션된 셀렉터 사용)
  const notificationState = useSelector(selectNotificationState)

  // 임시 액션들 (실제로는 entities/notification/model/slice에서 import)
  const actions: NotificationActions = {
    addNotification: (notification) => ({ type: 'notification/add', payload: notification }),
    markAsRead: (id) => ({ type: 'notification/markAsRead', payload: id }),
    markAllAsRead: () => ({ type: 'notification/markAllAsRead' }),
    removeNotification: (id) => ({ type: 'notification/remove', payload: id }),
    setConnectionStatus: (status) => ({ type: 'notification/setConnectionStatus', payload: status }),
    setLoading: (loading) => ({ type: 'notification/setLoading', payload: loading }),
    updateUnreadCount: (count) => ({ type: 'notification/updateUnreadCount', payload: count })
  }

  /**
   * WebSocket 연결 설정
   */
  const connectWebSocket = useCallback(() => {
    if (typeof window === 'undefined') return

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/notifications'
    
    try {
      wsRef.current = new WebSocket(wsUrl)

      wsRef.current.onopen = () => {
        console.log('🔌 Notification WebSocket connected')
        dispatch(actions.setConnectionStatus(true))
        reconnectAttempts.current = 0

        // 인증 토큰 전송 (실제 구현에서는 JWT 토큰 사용)
        wsRef.current?.send(JSON.stringify({
          type: 'auth',
          token: 'user-session-token' // TODO: 실제 토큰 사용
        }))
      }

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)

          switch (data.type) {
            case 'notification':
              dispatch(actions.addNotification(data.payload))
              // 브라우저 알림 표시 (권한이 있는 경우)
              if (Notification.permission === 'granted') {
                new Notification(data.payload.title, {
                  body: data.payload.message,
                  icon: '/favicon.ico',
                  tag: data.payload.id
                })
              }
              break

            case 'unread_count':
              dispatch(actions.updateUnreadCount(data.payload.count))
              break

            case 'mark_read':
              dispatch(actions.markAsRead(data.payload.id))
              break

            case 'pong':
              // Heartbeat 응답
              break

            default:
              console.warn('Unknown notification message type:', data.type)
          }
        } catch (error) {
          console.error('Failed to parse notification message:', error)
        }
      }

      wsRef.current.onclose = (event) => {
        console.log('🔌 Notification WebSocket disconnected:', event.code, event.reason)
        dispatch(actions.setConnectionStatus(false))
        
        // 자동 재연결 (정상 종료가 아닌 경우)
        if (event.code !== 1000 && reconnectAttempts.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000)
          console.log(`🔄 Attempting to reconnect in ${delay}ms...`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++
            connectWebSocket()
          }, delay)
        }
      }

      wsRef.current.onerror = (error) => {
        console.error('🚨 Notification WebSocket error:', error)
        dispatch(actions.setConnectionStatus(false))
      }

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      dispatch(actions.setConnectionStatus(false))
    }
  }, [dispatch])

  /**
   * WebSocket 연결 해제
   */
  const disconnectWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounting')
      wsRef.current = null
    }
    
    dispatch(actions.setConnectionStatus(false))
  }, [dispatch])

  /**
   * 알림 읽음 처리
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      // 낙관적 업데이트
      dispatch(actions.markAsRead(notificationId))

      // API 호출
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        // 실패 시 롤백 (실제 구현에서는 더 정교한 에러 처리)
        console.error('Failed to mark notification as read')
      }

      // WebSocket을 통해 다른 클라이언트에게도 알림
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'mark_read',
          notificationId
        }))
      }

    } catch (error) {
      console.error('Error marking notification as read:', error)
    }
  }, [dispatch])

  /**
   * 모든 알림 읽음 처리
   */
  const markAllAsRead = useCallback(async () => {
    try {
      // 낙관적 업데이트
      dispatch(actions.markAllAsRead())

      // API 호출
      const response = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        console.error('Failed to mark all notifications as read')
      }

    } catch (error) {
      console.error('Error marking all notifications as read:', error)
    }
  }, [dispatch])

  /**
   * 알림 클릭 처리
   */
  const handleNotificationClick = useCallback(async (notification: Notification) => {
    // 읽음 처리
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }

    // 액션 URL이 있으면 이동
    if (notification.actionUrl) {
      if (typeof window !== 'undefined') {
        // 내부 링크인지 외부 링크인지 판단
        const isExternalLink = notification.actionUrl.startsWith('http')
        
        if (isExternalLink) {
          window.open(notification.actionUrl, '_blank', 'noopener,noreferrer')
        } else {
          // Next.js router 사용 (실제 구현에서는 useRouter 훅 사용)
          window.location.href = notification.actionUrl
        }
      }
    }
  }, [markAsRead])

  /**
   * 알림 새로고침
   */
  const refreshNotifications = useCallback(async () => {
    try {
      dispatch(actions.setLoading(true))

      const response = await fetch('/api/notifications', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        
        // 실제 구현에서는 전체 알림 목록을 Redux에 저장
        console.log('Refreshed notifications:', data)
      }

    } catch (error) {
      console.error('Error refreshing notifications:', error)
    } finally {
      dispatch(actions.setLoading(false))
    }
  }, [dispatch])

  /**
   * 알림 제거
   */
  const removeNotification = useCallback(async (notificationId: string) => {
    try {
      dispatch(actions.removeNotification(notificationId))

      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        console.error('Failed to remove notification')
      }

    } catch (error) {
      console.error('Error removing notification:', error)
    }
  }, [dispatch])

  /**
   * 브라우저 알림 권한 요청
   */
  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false
    }

    if (Notification.permission === 'granted') {
      return true
    }

    if (Notification.permission === 'denied') {
      return false
    }

    const permission = await Notification.requestPermission()
    return permission === 'granted'
  }, [])

  /**
   * Heartbeat 전송 (연결 유지)
   */
  const sendHeartbeat = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'ping' }))
    }
  }, [])

  // 초기 연결 및 정리
  useEffect(() => {
    connectWebSocket()
    
    // Heartbeat 설정 (30초마다)
    const heartbeatInterval = setInterval(sendHeartbeat, 30000)

    return () => {
      clearInterval(heartbeatInterval)
      disconnectWebSocket()
    }
  }, [connectWebSocket, disconnectWebSocket, sendHeartbeat])

  // 브라우저 알림 권한 초기 요청
  useEffect(() => {
    requestNotificationPermission()
  }, [requestNotificationPermission])

  return {
    // 상태
    notifications: notificationState.items,
    unreadCount: notificationState.unreadCount,
    isLoading: notificationState.isLoading,
    isConnected: notificationState.isConnected,
    lastUpdated: notificationState.lastUpdated,

    // 액션
    markAsRead,
    markAllAsRead,
    handleNotificationClick,
    refreshNotifications,
    removeNotification,
    requestNotificationPermission,

    // 연결 관리
    connectWebSocket,
    disconnectWebSocket,
    isWebSocketConnected: wsRef.current?.readyState === WebSocket.OPEN
  }
}