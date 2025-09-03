/**
 * useWebSocketConnection Hook
 * WebSocket 연결 상태 관리를 위한 React Hook
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getWebSocketClient, WebSocketClient, ConnectionState, WebSocketEventListeners } from './WebSocketClient'

interface UseWebSocketConnectionOptions {
  autoConnect?: boolean
  onConnectionChange?: (state: ConnectionState) => void
  onError?: (error: Error) => void
  onReconnectAttempt?: (attempt: number, maxAttempts: number) => void
}

interface UseWebSocketConnectionReturn {
  connectionState: ConnectionState
  isConnected: boolean
  isConnecting: boolean
  isReconnecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  queueSize: number
  client: WebSocketClient
}

export function useWebSocketConnection(
  options: UseWebSocketConnectionOptions = {}
): UseWebSocketConnectionReturn {
  const { 
    autoConnect = true, 
    onConnectionChange, 
    onError, 
    onReconnectAttempt 
  } = options
  
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [queueSize, setQueueSize] = useState(0)
  
  const clientRef = useRef<WebSocketClient>()
  const isInitializedRef = useRef(false)

  // WebSocket 클라이언트 초기화
  const initializeClient = useCallback(() => {
    if (isInitializedRef.current) return
    
    clientRef.current = getWebSocketClient()
    
    const eventListeners: Partial<WebSocketEventListeners> = {
      onConnectionChange: (state: ConnectionState) => {
        setConnectionState(state)
        onConnectionChange?.(state)
      },
      onError: (error: Error) => {
        onError?.(error)
      },
      onReconnectAttempt: (attempt: number, maxAttempts: number) => {
        onReconnectAttempt?.(attempt, maxAttempts)
      }
    }

    // 이벤트 리스너 등록
    Object.entries(eventListeners).forEach(([event, listener]) => {
      if (listener) {
        clientRef.current!.on(event as keyof WebSocketEventListeners, listener as any)
      }
    })

    isInitializedRef.current = true
  }, [onConnectionChange, onError, onReconnectAttempt])

  // 연결
  const connect = useCallback(async () => {
    if (!clientRef.current) {
      initializeClient()
    }
    
    if (clientRef.current) {
      await clientRef.current.connect()
    }
  }, [initializeClient])

  // 연결 해제
  const disconnect = useCallback(() => {
    if (clientRef.current) {
      clientRef.current.disconnect()
    }
  }, [])

  // 큐 크기 업데이트
  const updateQueueSize = useCallback(() => {
    if (clientRef.current) {
      setQueueSize(clientRef.current.getQueueSize())
    }
  }, [])

  // 초기화 및 자동 연결
  useEffect(() => {
    initializeClient()
    
    if (autoConnect) {
      connect().catch(console.error)
    }

    // 큐 크기 모니터링
    const queueMonitorInterval = setInterval(updateQueueSize, 1000)
    
    return () => {
      clearInterval(queueMonitorInterval)
      // 컴포넌트 언마운트 시 연결 해제하지 않음 (싱글톤 유지)
    }
  }, [autoConnect, connect, initializeClient, updateQueueSize])

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    isConnecting: connectionState === 'connecting',
    isReconnecting: connectionState === 'reconnecting',
    connect,
    disconnect,
    queueSize,
    client: clientRef.current!
  }
}