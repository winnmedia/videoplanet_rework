import { useEffect, useRef, useCallback } from 'react'
import { useDispatch } from 'react-redux'

import { NotificationWebSocketManager } from '@/shared/lib/websocket'
import { 
  addNotification, 
  markAsRead, 
  setConnectionStatus,
  type WebSocketMessage,
  type ConnectionStatus
} from '@/entities/notification'

export interface UseRealtimeNotificationsConfig {
  wsUrl: string
  enabled?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
  onConnected?: () => void
  onDisconnected?: () => void
  onError?: (error: Error) => void
}

export interface UseRealtimeNotificationsReturn {
  connectionStatus: ConnectionStatus
  connect: () => Promise<void>
  disconnect: () => void
  isConnected: boolean
  isConnecting: boolean
}

export function useRealtimeNotifications(
  config: UseRealtimeNotificationsConfig
): UseRealtimeNotificationsReturn {
  const dispatch = useDispatch()
  const wsManagerRef = useRef<NotificationWebSocketManager | null>(null)
  const connectionStatusRef = useRef<ConnectionStatus>('disconnected')
  const configRef = useRef(config)

  // 최신 config 유지
  configRef.current = config

  // WebSocket 메시지 처리 콜백
  const handleMessage = useCallback((message: WebSocketMessage) => {
    console.log('WebSocket 메시지 수신:', message)

    switch (message.type) {
      case 'notification':
        // 새 알림을 Redux 스토어에 추가
        dispatch(addNotification(message.payload))
        break

      case 'notification_read':
        // 알림을 읽음으로 표시
        dispatch(markAsRead(message.payload.notificationId))
        break

      case 'connection_status':
        // 연결 상태 업데이트
        const status = message.payload.status
        connectionStatusRef.current = status
        dispatch(setConnectionStatus(status))
        break

      default:
        console.warn('알 수 없는 WebSocket 메시지 타입:', message)
    }
  }, [dispatch])

  // 연결 상태 변경 처리 콜백
  const handleConnectionStatusChange = useCallback((status: ConnectionStatus) => {
    console.log('WebSocket 연결 상태 변경:', status)
    
    connectionStatusRef.current = status
    dispatch(setConnectionStatus(status))

    const currentConfig = configRef.current

    // 상태별 콜백 호출
    switch (status) {
      case 'connected':
        currentConfig.onConnected?.()
        break
      case 'disconnected':
      case 'failed':
        currentConfig.onDisconnected?.()
        break
    }
  }, [dispatch])

  // WebSocket 매니저 초기화
  const initializeWebSocketManager = useCallback(() => {
    if (wsManagerRef.current) {
      return wsManagerRef.current
    }

    const { wsUrl, reconnectInterval, maxReconnectAttempts } = configRef.current

    wsManagerRef.current = new NotificationWebSocketManager({
      url: wsUrl,
      onMessage: handleMessage,
      onConnectionStatusChange: handleConnectionStatusChange,
      reconnectInterval,
      maxReconnectAttempts
    })

    return wsManagerRef.current
  }, [handleMessage, handleConnectionStatusChange])

  // 수동 연결
  const connect = useCallback(async () => {
    try {
      const manager = initializeWebSocketManager()
      await manager.connect()
    } catch (error) {
      console.error('WebSocket 연결 실패:', error)
      configRef.current.onError?.(error as Error)
      throw error
    }
  }, [initializeWebSocketManager])

  // 수동 연결 해제
  const disconnect = useCallback(() => {
    if (wsManagerRef.current) {
      wsManagerRef.current.disconnect()
      wsManagerRef.current = null
    }
  }, [])

  // 자동 연결 (enabled가 true인 경우)
  useEffect(() => {
    if (config.enabled) {
      connect().catch(error => {
        console.error('자동 연결 실패:', error)
        config.onError?.(error as Error)
      })
    }

    return () => {
      disconnect()
    }
  }, [config.enabled, config.wsUrl]) // wsUrl이 변경되면 재연결

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      disconnect()
    }
  }, [disconnect])

  return {
    connectionStatus: connectionStatusRef.current,
    connect,
    disconnect,
    isConnected: connectionStatusRef.current === 'connected',
    isConnecting: connectionStatusRef.current === 'reconnecting'
  }
}