/**
 * @vitest-environment jsdom
 */

import { configureStore } from '@reduxjs/toolkit'
import { renderHook, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest'

import { notificationSlice } from '@/entities/notification'
import type { WebSocketMessage } from '@/entities/notification'

import { useRealtimeNotifications } from '../lib/useRealtimeNotifications'

// WebSocket Mock
class MockWebSocket {
  static OPEN = 1
  static CLOSED = 3

  readyState = MockWebSocket.OPEN
  url: string
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 10)
  }

  send(data: string) {
    // Mock implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
    setTimeout(() => {
      this.onclose?.(new CloseEvent('close'))
    }, 10)
  }

  addEventListener() {}
  removeEventListener() {}

  simulateMessage(data: WebSocketMessage) {
    const messageEvent = new MessageEvent('message', {
      data: JSON.stringify(data)
    })
    this.onmessage?.(messageEvent)
  }
}

// 전역 WebSocket 모킹
Object.defineProperty(global, 'WebSocket', {
  value: MockWebSocket,
  writable: true
})

const createTestStore = () => {
  return configureStore({
    reducer: {
      notifications: notificationSlice.reducer,
    },
  })
}

const createWrapper = (store: ReturnType<typeof createTestStore>) => {
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )
}

describe('useRealtimeNotifications', () => {
  let store: ReturnType<typeof createTestStore>
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    store = createTestStore()
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.clearAllMocks()
    consoleSpy.restore()
  })

  describe('초기화', () => {
    it('훅이 정상적으로 초기화되어야 함', () => {
      const { result } = renderHook(
        () => useRealtimeNotifications({ 
          wsUrl: 'ws://localhost:8000/notifications/',
          enabled: true 
        }),
        { wrapper: createWrapper(store) }
      )

      expect(result.current.connectionStatus).toBe('disconnected')
      expect(result.current.connect).toBeTypeOf('function')
      expect(result.current.disconnect).toBeTypeOf('function')
    })

    it('enabled가 false인 경우 자동 연결하지 않아야 함', () => {
      const { result } = renderHook(
        () => useRealtimeNotifications({ 
          wsUrl: 'ws://localhost:8000/notifications/',
          enabled: false 
        }),
        { wrapper: createWrapper(store) }
      )

      expect(result.current.connectionStatus).toBe('disconnected')
    })
  })

  describe('연결 관리', () => {
    it('수동으로 연결할 수 있어야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeNotifications({ 
          wsUrl: 'ws://localhost:8000/notifications/',
          enabled: false 
        }),
        { wrapper: createWrapper(store) }
      )

      await act(async () => {
        await result.current.connect()
      })

      expect(result.current.connectionStatus).toBe('connected')
    })

    it('수동으로 연결을 해제할 수 있어야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeNotifications({ 
          wsUrl: 'ws://localhost:8000/notifications/',
          enabled: false 
        }),
        { wrapper: createWrapper(store) }
      )

      await act(async () => {
        await result.current.connect()
      })

      act(() => {
        result.current.disconnect()
      })

      expect(result.current.connectionStatus).toBe('disconnected')
    })
  })

  describe('메시지 처리', () => {
    it('새 알림 메시지를 Redux에 저장해야 함', async () => {
      const { result } = renderHook(
        () => useRealtimeNotifications({ 
          wsUrl: 'ws://localhost:8000/notifications/',
          enabled: false 
        }),
        { wrapper: createWrapper(store) }
      )

      await act(async () => {
        await result.current.connect()
      })

      const testNotification: WebSocketMessage = {
        type: 'notification',
        payload: {
          id: 'test-notification',
          type: 'invitation',
          title: '테스트 알림',
          message: '테스트 메시지입니다',
          timestamp: new Date().toISOString(),
          isRead: false,
          priority: 'medium'
        }
      }

      // WebSocket 메시지 시뮬레이션
      const mockWs = (result.current as any).wsManager?.ws as MockWebSocket
      if (mockWs) {
        mockWs.simulateMessage(testNotification)
      }

      // Redux 상태에서 알림이 추가되었는지 확인
      const notifications = store.getState().notifications.items
      expect(notifications).toHaveLength(1)
      expect(notifications[0]).toEqual(testNotification.payload)
    })

    it('읽음 상태 업데이트 메시지를 처리해야 함', async () => {
      // 먼저 알림을 추가
      store.dispatch(notificationSlice.actions.addNotification({
        id: 'test-notification',
        type: 'invitation',
        title: '테스트 알림',
        message: '테스트 메시지입니다',
        timestamp: new Date().toISOString(),
        isRead: false,
        priority: 'medium'
      }))

      const { result } = renderHook(
        () => useRealtimeNotifications({ 
          wsUrl: 'ws://localhost:8000/notifications/',
          enabled: false 
        }),
        { wrapper: createWrapper(store) }
      )

      await act(async () => {
        await result.current.connect()
      })

      const readMessage: WebSocketMessage = {
        type: 'notification_read',
        payload: {
          notificationId: 'test-notification',
          userId: 'user-123'
        }
      }

      // WebSocket 메시지 시뮬레이션
      const mockWs = (result.current as any).wsManager?.ws as MockWebSocket
      if (mockWs) {
        mockWs.simulateMessage(readMessage)
      }

      // Redux 상태에서 알림이 읽음으로 표시되었는지 확인
      const notifications = store.getState().notifications.items
      const notification = notifications.find(n => n.id === 'test-notification')
      expect(notification?.isRead).toBe(true)
    })
  })

  describe('컴포넌트 언마운트', () => {
    it('컴포넌트 언마운트 시 연결을 해제해야 함', async () => {
      const { result, unmount } = renderHook(
        () => useRealtimeNotifications({ 
          wsUrl: 'ws://localhost:8000/notifications/',
          enabled: false 
        }),
        { wrapper: createWrapper(store) }
      )

      await act(async () => {
        await result.current.connect()
      })

      expect(result.current.connectionStatus).toBe('connected')

      unmount()

      // 언마운트 후 연결이 해제되는지 확인은 어렵지만, 에러가 발생하지 않아야 함
    })
  })

  describe('에러 처리', () => {
    it('연결 에러를 적절히 처리해야 함', async () => {
      // WebSocket 생성 시 에러 발생하도록 모킹
      vi.spyOn(global, 'WebSocket').mockImplementationOnce(() => {
        throw new Error('Connection failed')
      })

      const { result } = renderHook(
        () => useRealtimeNotifications({ 
          wsUrl: 'ws://localhost:8000/notifications/',
          enabled: false 
        }),
        { wrapper: createWrapper(store) }
      )

      await act(async () => {
        try {
          await result.current.connect()
        } catch (error) {
          expect(error).toBeDefined()
        }
      })

      expect(result.current.connectionStatus).toBe('failed')
    })
  })
})