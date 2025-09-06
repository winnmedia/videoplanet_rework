/**
 * @vitest-environment jsdom
 */

import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest'
import { NotificationWebSocketManager } from '../NotificationWebSocketManager'
import type { WebSocketMessage } from '@/entities/notification'

// WebSocket Mock
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  url: string
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  private listeners: Record<string, ((event: any) => void)[]> = {}

  constructor(url: string) {
    this.url = url
    // 비동기로 연결 성공 시뮬레이션
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
      this.dispatchEvent('open', new Event('open'))
    }, 10)
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open')
    }
    // Send는 성공적으로 처리됨
  }

  close(code?: number, reason?: string) {
    this.readyState = MockWebSocket.CLOSING
    setTimeout(() => {
      this.readyState = MockWebSocket.CLOSED
      const closeEvent = new CloseEvent('close', { code: code || 1000, reason: reason || '' })
      this.onclose?.(closeEvent)
      this.dispatchEvent('close', closeEvent)
    }, 10)
  }

  addEventListener(type: string, listener: (event: any) => void) {
    if (!this.listeners[type]) {
      this.listeners[type] = []
    }
    this.listeners[type].push(listener)
  }

  removeEventListener(type: string, listener: (event: any) => void) {
    if (this.listeners[type]) {
      this.listeners[type] = this.listeners[type].filter(l => l !== listener)
    }
  }

  dispatchEvent(type: string, event: any) {
    if (this.listeners[type]) {
      this.listeners[type].forEach(listener => listener(event))
    }
  }

  // 테스트용 헬퍼 메서드
  simulateMessage(data: WebSocketMessage) {
    if (this.readyState === MockWebSocket.OPEN) {
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(data)
      })
      this.onmessage?.(messageEvent)
      this.dispatchEvent('message', messageEvent)
    }
  }

  simulateError() {
    const errorEvent = new Event('error')
    this.onerror?.(errorEvent)
    this.dispatchEvent('error', errorEvent)
  }

  simulateClose(code = 1000, reason = '') {
    this.readyState = MockWebSocket.CLOSED
    const closeEvent = new CloseEvent('close', { code, reason })
    this.onclose?.(closeEvent)
    this.dispatchEvent('close', closeEvent)
  }
}

// 전역 WebSocket 모킹
Object.defineProperty(global, 'WebSocket', {
  value: MockWebSocket,
  writable: true
})

describe('NotificationWebSocketManager', () => {
  let manager: NotificationWebSocketManager
  let mockOnMessage: ReturnType<typeof vi.fn>
  let mockOnConnectionStatusChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockOnMessage = vi.fn()
    mockOnConnectionStatusChange = vi.fn()
    manager = new NotificationWebSocketManager({
      url: 'ws://localhost:8000/notifications/',
      onMessage: mockOnMessage,
      onConnectionStatusChange: mockOnConnectionStatusChange
    })
  })

  afterEach(() => {
    manager?.disconnect()
    vi.clearAllMocks()
  })

  describe('연결 관리', () => {
    it('WebSocket 연결을 성공적으로 생성해야 함', async () => {
      await manager.connect()

      expect(mockOnConnectionStatusChange).toHaveBeenCalledWith('connected')
    })

    it('연결 실패 시 재연결을 시도해야 함', async () => {
      // WebSocket 생성 시 즉시 에러 발생
      vi.spyOn(global, 'WebSocket').mockImplementationOnce(() => {
        const ws = new MockWebSocket('ws://localhost:8000/notifications/')
        setTimeout(() => ws.simulateError(), 5)
        return ws as any
      })

      await manager.connect().catch(() => {}) // 에러 무시

      expect(mockOnConnectionStatusChange).toHaveBeenCalledWith('reconnecting')
    })

    it('연결 해제를 정상적으로 처리해야 함', async () => {
      await manager.connect()
      
      manager.disconnect()

      expect(mockOnConnectionStatusChange).toHaveBeenCalledWith('disconnected')
    })

    it('이미 연결된 상태에서 재연결 시도 시 무시해야 함', async () => {
      await manager.connect()
      mockOnConnectionStatusChange.mockClear()

      await manager.connect()

      expect(mockOnConnectionStatusChange).not.toHaveBeenCalled()
    })
  })

  describe('메시지 처리', () => {
    beforeEach(async () => {
      await manager.connect()
      mockOnMessage.mockClear()
    })

    it('유효한 알림 메시지를 처리해야 함', () => {
      const notificationMessage: WebSocketMessage = {
        type: 'notification',
        payload: {
          id: 'test-notification',
          type: 'invitation',
          title: '테스트 알림',
          message: '테스트 메시지',
          timestamp: new Date().toISOString(),
          isRead: false,
          priority: 'medium'
        }
      }

      const ws = (manager as any).ws as MockWebSocket
      ws.simulateMessage(notificationMessage)

      expect(mockOnMessage).toHaveBeenCalledWith(notificationMessage)
    })

    it('읽음 상태 업데이트 메시지를 처리해야 함', () => {
      const readMessage: WebSocketMessage = {
        type: 'notification_read',
        payload: {
          notificationId: 'test-notification',
          userId: 'user-123'
        }
      }

      const ws = (manager as any).ws as MockWebSocket
      ws.simulateMessage(readMessage)

      expect(mockOnMessage).toHaveBeenCalledWith(readMessage)
    })

    it('잘못된 형식의 메시지는 무시해야 함', () => {
      const ws = (manager as any).ws as MockWebSocket
      
      // 잘못된 JSON
      const invalidMessageEvent = new MessageEvent('message', {
        data: 'invalid json'
      })
      ws.onmessage?.(invalidMessageEvent)

      expect(mockOnMessage).not.toHaveBeenCalled()
    })

    it('스키마에 맞지 않는 메시지는 무시해야 함', () => {
      const ws = (manager as any).ws as MockWebSocket
      
      const invalidMessage = {
        invalidType: 'unknown',
        payload: {}
      }
      
      const messageEvent = new MessageEvent('message', {
        data: JSON.stringify(invalidMessage)
      })
      ws.onmessage?.(messageEvent)

      expect(mockOnMessage).not.toHaveBeenCalled()
    })
  })

  describe('재연결 로직', () => {
    it('예기치 않은 연결 종료 시 자동 재연결해야 함', async () => {
      await manager.connect()
      mockOnConnectionStatusChange.mockClear()

      // 예기치 않은 연결 종료 (코드 1006 = abnormal closure)
      const ws = (manager as any).ws as MockWebSocket
      ws.simulateClose(1006, 'Connection lost')

      expect(mockOnConnectionStatusChange).toHaveBeenCalledWith('reconnecting')

      // 재연결 성공까지 대기
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockOnConnectionStatusChange).toHaveBeenCalledWith('connected')
    })

    it('정상적인 연결 종료 시 재연결하지 않아야 함', async () => {
      await manager.connect()
      mockOnConnectionStatusChange.mockClear()

      // 정상적인 연결 종료
      const ws = (manager as any).ws as MockWebSocket
      ws.simulateClose(1000, 'Normal closure')

      expect(mockOnConnectionStatusChange).toHaveBeenCalledWith('disconnected')
      
      // 재연결 시도가 없음을 확인
      await new Promise(resolve => setTimeout(resolve, 100))
      
      expect(mockOnConnectionStatusChange).not.toHaveBeenCalledWith('reconnecting')
    })

    it('최대 재연결 시도 횟수를 초과하면 포기해야 함', async () => {
      // WebSocket이 계속 실패하도록 모킹
      vi.spyOn(global, 'WebSocket').mockImplementation(() => {
        const ws = new MockWebSocket('ws://localhost:8000/notifications/')
        setTimeout(() => ws.simulateError(), 5)
        return ws as any
      })

      await manager.connect().catch(() => {}) // 초기 연결 실패 무시

      // 충분한 시간 대기 (재연결 시도가 모두 실패할 때까지)
      await new Promise(resolve => setTimeout(resolve, 1000))

      expect(mockOnConnectionStatusChange).toHaveBeenCalledWith('failed')
    })
  })

  describe('핑/퐁 관리', () => {
    it('주기적으로 핑을 보내야 함', async () => {
      const mockSend = vi.fn()
      vi.spyOn(global, 'WebSocket').mockImplementation(() => {
        const ws = new MockWebSocket('ws://localhost:8000/notifications/')
        ws.send = mockSend
        return ws as any
      })

      await manager.connect()

      // 핑 간격보다 긴 시간 대기
      await new Promise(resolve => setTimeout(resolve, 100))

      expect(mockSend).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }))
    })
  })

  describe('상태 관리', () => {
    it('연결 상태를 정확히 추적해야 함', async () => {
      expect(manager.getConnectionStatus()).toBe('disconnected')

      await manager.connect()
      expect(manager.getConnectionStatus()).toBe('connected')

      manager.disconnect()
      expect(manager.getConnectionStatus()).toBe('disconnected')
    })

    it('연결된 상태에서만 메시지를 보낼 수 있어야 함', async () => {
      expect(() => manager.sendMessage({ type: 'ping' })).toThrow()

      await manager.connect()
      expect(() => manager.sendMessage({ type: 'ping' })).not.toThrow()
    })
  })
})