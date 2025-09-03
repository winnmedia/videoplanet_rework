/**
 * 실시간 알림 카운트 데이터 파이프라인 테스트
 * 
 * 테스트 범위:
 * - WebSocket 연결을 통한 실시간 알림 수신
 * - CustomEvent를 통한 브라우저 내 알림 전파
 * - 중복 카운팅 방지 및 동기화 메커니즘
 * - DTO → ViewModel 변환 검증 (Zod 스키마)
 * - 메모리 누수 방지 (이벤트 리스너 cleanup)
 * 
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { z } from 'zod'
import { RealtimeNotificationPipeline, useRealtimeNotificationCount } from './realtime-notification-pipeline'
import { WebSocketClient } from './websocket/WebSocketClient'

// Test doubles
class MockWebSocketClient {
  private listeners: Record<string, Function> = {}
  public on = jest.fn((event: string, listener: Function) => {
    this.listeners[event] = listener
  })
  
  public off = jest.fn((event: string) => {
    delete this.listeners[event]
  })
  
  // 테스트 헬퍼: 메시지 시뮬레이션
  simulateMessage(type: string, payload: any) {
    if (this.listeners.onMessage) {
      this.listeners.onMessage({
        id: `test-${Date.now()}`,
        type,
        payload,
        timestamp: Date.now(),
        sequenceNumber: Date.now()
      })
    }
  }
  
  isConnected = jest.fn(() => true)
  
  connect = jest.fn(() => Promise.resolve())
  
  disconnect = jest.fn()
}

// Mock DOM CustomEvent
const mockCustomEvents: CustomEvent[] = []
const originalDispatchEvent = window.dispatchEvent
const originalAddEventListener = window.addEventListener
const originalRemoveEventListener = window.removeEventListener

beforeEach(() => {
  mockCustomEvents.length = 0
  
  // Mock window.dispatchEvent
  window.dispatchEvent = jest.fn((event: Event) => {
    mockCustomEvents.push(event as CustomEvent)
    return true
  })
  
  // Mock window.addEventListener
  window.addEventListener = jest.fn()
  window.removeEventListener = jest.fn()
})

afterEach(() => {
  window.dispatchEvent = originalDispatchEvent
  window.addEventListener = originalAddEventListener  
  window.removeEventListener = originalRemoveEventListener
})

describe('실시간 알림 카운트 데이터 파이프라인', () => {
  let pipeline: RealtimeNotificationPipeline
  let mockWsClient: MockWebSocketClient

  beforeEach(() => {
    mockWsClient = new MockWebSocketClient()
    // @ts-ignore - mocking for test
    pipeline = new RealtimeNotificationPipeline(mockWsClient)
  })

  afterEach(() => {
    pipeline?.destroy()
  })

  describe('WebSocket 메시지 수신 및 변환', () => {
    it('알림 생성 이벤트를 정확히 파싱하고 변환해야 함', async () => {
      const testNotification = {
        id: 'notification-1',
        userId: 'user-123',
        type: 'feedback_received',
        title: '새로운 피드백',
        message: '프로젝트에 새 피드백이 등록되었습니다',
        isRead: false,
        createdAt: '2025-01-16T10:00:00Z',
        projectId: 'project-456'
      }

      await act(async () => {
        await pipeline.initialize('user-123')
      })

      // WebSocket 메시지 시뮬레이션 (올바른 payload 구조)
      act(() => {
        mockWsClient.simulateMessage('notification_created', {
          type: 'notification_created',
          notification: testNotification,
          unreadCount: 1,
          timestamp: Date.now()
        })
      })

      // CustomEvent가 발생했는지 확인
      expect(mockCustomEvents).toHaveLength(1)
      expect(mockCustomEvents[0].type).toBe('realtimeNotificationUpdate')
      
      const eventDetail = mockCustomEvents[0].detail
      expect(eventDetail).toEqual({
        type: 'notification_created',
        notification: testNotification,
        unreadCount: 1
      })
    })

    it('잘못된 스키마의 알림을 거부해야 함', async () => {
      const invalidNotification = {
        id: '', // 필수 필드 누락
        type: 'invalid_type'
      }

      await pipeline.initialize('user-123')

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      act(() => {
        mockWsClient.simulateMessage('notification_created', invalidNotification)
      })

      // 에러가 로깅되고 이벤트가 발생하지 않아야 함
      expect(consoleSpy).toHaveBeenCalled()
      expect(mockCustomEvents).toHaveLength(0)

      consoleSpy.mockRestore()
    })

    it('알림 읽음 처리 이벤트를 정확히 처리해야 함', async () => {
      await pipeline.initialize('user-123')

      act(() => {
        mockWsClient.simulateMessage('notification_read', {
          type: 'notification_read',
          notificationId: 'notification-1',
          userId: 'user-123',
          readAt: '2025-01-16T10:05:00Z',
          unreadCount: 0,
          timestamp: Date.now()
        })
      })

      expect(mockCustomEvents).toHaveLength(1)
      expect(mockCustomEvents[0].detail.type).toBe('notification_read')
    })
  })

  describe('중복 카운팅 방지', () => {
    it('동일한 알림 ID의 중복 이벤트를 방지해야 함', async () => {
      const notification = {
        id: 'notification-duplicate',
        userId: 'user-123',
        type: 'project_update',
        title: '테스트',
        message: '테스트 메시지',
        isRead: false,
        createdAt: '2025-01-16T10:00:00Z',
        projectId: 'project-456'
      }

      await pipeline.initialize('user-123')

      // 같은 알림을 두 번 수신
      act(() => {
        const payload = {
          type: 'notification_created',
          notification,
          unreadCount: 1,
          timestamp: Date.now()
        }
        mockWsClient.simulateMessage('notification_created', payload)
        mockWsClient.simulateMessage('notification_created', payload)
      })

      // 이벤트는 한 번만 발생해야 함
      expect(mockCustomEvents).toHaveLength(1)
    })

    it('시퀀스 번호를 통한 순서 보장을 확인해야 함', async () => {
      await pipeline.initialize('user-123')

      const notification1 = { id: 'n1', sequenceNumber: 2, /* ...other fields */ }
      const notification2 = { id: 'n2', sequenceNumber: 1, /* ...other fields */ }

      // 순서가 뒤바뀐 알림 전송
      act(() => {
        mockWsClient.simulateMessage('notification_created', notification1)
        mockWsClient.simulateMessage('notification_created', notification2)  
      })

      // 최신 시퀀스만 처리되어야 함
      expect(mockCustomEvents).toHaveLength(1)
    })
  })

  describe('카운트 정확도 및 동기화', () => {
    it('실시간 읽지 않은 알림 카운트를 정확히 추적해야 함', async () => {
      await pipeline.initialize('user-123')
      
      // 초기 카운트 확인
      expect(pipeline.getUnreadCount()).toBe(0)

      // 새 알림 추가
      act(() => {
        mockWsClient.simulateMessage('notification_created', {
          type: 'notification_created',
          notification: {
            id: 'n1', userId: 'user-123', type: 'feedback_received',
            title: 'Test', message: 'Test', isRead: false, 
            createdAt: '2025-01-16T10:00:00Z', projectId: 'project-1'
          },
          unreadCount: 1,
          timestamp: Date.now()
        })
      })

      expect(pipeline.getUnreadCount()).toBe(1)

      // 알림 읽음 처리
      act(() => {
        mockWsClient.simulateMessage('notification_read', {
          type: 'notification_read',
          notificationId: 'n1',
          userId: 'user-123', 
          readAt: '2025-01-16T10:05:00Z',
          unreadCount: 0,
          timestamp: Date.now()
        })
      })

      expect(pipeline.getUnreadCount()).toBe(0)
    })

    it('다른 사용자의 알림은 카운트에 포함하지 않아야 함', async () => {
      await pipeline.initialize('user-123')

      act(() => {
        mockWsClient.simulateMessage('notification_created', {
          type: 'notification_created',
          notification: {
            id: 'n1', userId: 'other-user', type: 'feedback_received',
            title: 'Test', message: 'Test', isRead: false,
            createdAt: '2025-01-16T10:00:00Z', projectId: 'project-1'
          },
          unreadCount: 1,
          timestamp: Date.now()
        })
      })

      expect(pipeline.getUnreadCount()).toBe(0)
      expect(mockCustomEvents).toHaveLength(0)
    })
  })

  describe('메모리 안전성', () => {
    it('destroy 호출 시 모든 이벤트 리스너가 정리되어야 함', () => {
      pipeline.destroy()

      // WebSocket 리스너 정리 확인
      expect(mockWsClient.off).toHaveBeenCalledWith('onMessage')
      expect(mockWsClient.off).toHaveBeenCalledWith('onConnectionChange')

      // DOM 이벤트 리스너 정리 확인 (실제로는 mock이므로 호출 확인)
      expect(window.removeEventListener).toHaveBeenCalled()
    })

    it('컴포넌트 언마운트 시 정리 함수가 실행되어야 함', () => {
      const { unmount } = renderHook(() => 
        useRealtimeNotificationCount('user-123')
      )

      const destroySpy = jest.spyOn(RealtimeNotificationPipeline.prototype, 'destroy')
      
      unmount()

      expect(destroySpy).toHaveBeenCalled()
      destroySpy.mockRestore()
    })
  })
})

describe('useRealtimeNotificationCount Hook', () => {
  beforeEach(() => {
    // Mock WebSocket client
    jest.doMock('./websocket/WebSocketClient', () => ({
      getWebSocketClient: () => new MockWebSocketClient()
    }))
  })

  it('초기 상태값을 올바르게 반환해야 함', () => {
    const { result } = renderHook(() => useRealtimeNotificationCount('user-123'))

    expect(result.current).toEqual({
      unreadCount: 0,
      isConnected: false,
      error: null,
      lastUpdate: null
    })
  })

  it('실시간 업데이트를 반영해야 함', async () => {
    const { result } = renderHook(() => useRealtimeNotificationCount('user-123'))

    // CustomEvent 시뮬레이션
    act(() => {
      window.dispatchEvent(new CustomEvent('realtimeNotificationUpdate', {
        detail: {
          type: 'notification_created',
          unreadCount: 3,
          notification: { id: 'test' }
        }
      }))
    })

    await act(async () => {
      // state update 대기
    })

    expect(result.current.unreadCount).toBe(3)
    expect(result.current.lastUpdate).not.toBeNull()
  })

  it('testUnreadBadgeAccuracy 테스트 시나리오를 지원해야 함', () => {
    const { result } = renderHook(() => useRealtimeNotificationCount('user-123'))

    // E2E 테스트에서 사용할 deterministic 이벤트
    act(() => {
      window.dispatchEvent(new CustomEvent('newNotification', {
        detail: {
          type: 'comment',
          projectId: 'test-project',
          message: '새로운 댓글이 달렸습니다'
        }
      }))
    })

    // Hook이 커스텀 이벤트를 처리하고 카운트를 업데이트해야 함
    expect(result.current.unreadCount).toBeGreaterThan(0)
  })
})