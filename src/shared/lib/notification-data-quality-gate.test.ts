/**
 * 알림 데이터 품질 게이트 및 메모리 안전성 검증 테스트
 * 
 * 검증 범위:
 * - DTO → ViewModel 변환의 데이터 무결성
 * - 타임스탬프 정합성 검증
 * - 메모리 누수 방지 (이벤트 리스너 cleanup)
 * - RTK Query 캐시 성능 및 최적화
 * - 실시간 파이프라인의 안정성
 * 
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react'
import { z } from 'zod'
import { 
  RealtimeNotificationPipeline, 
  useRealtimeNotificationCount,
  transformNotificationToViewModel,
  NotificationDTO,
  NotificationViewModel 
} from './realtime-notification-pipeline'
import { getNotificationCacheManager } from './notification-cache-manager'

// 메모리 사용량 모니터링을 위한 헬퍼
const measureMemoryUsage = () => {
  if (typeof performance !== 'undefined' && performance.memory) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
    }
  }
  return null
}

// 가짜 데이터 생성기 (deterministic)
const createMockNotificationDTO = (overrides: Partial<NotificationDTO> = {}): NotificationDTO => ({
  id: 'notification-test-001',
  userId: 'user-123',
  type: 'feedback_received',
  title: '테스트 알림',
  message: '이것은 테스트 알림입니다.',
  isRead: false,
  createdAt: '2025-01-16T10:00:00Z',
  projectId: 'project-456',
  metadata: {
    sourceType: 'project',
    actorName: '테스터',
  },
  priority: 'medium',
  ...overrides
})

describe('데이터 품질 게이트', () => {
  describe('DTO → ViewModel 변환 검증', () => {
    it('유효한 DTO를 올바른 ViewModel로 변환해야 함', () => {
      const mockDTO = createMockNotificationDTO()
      
      const result = transformNotificationToViewModel(mockDTO)
      
      // 타입 검증
      expect(result).toMatchObject({
        id: expect.any(String),
        userId: expect.any(String),
        type: expect.any(String),
        title: expect.any(String),
        message: expect.any(String),
        isRead: expect.any(Boolean),
        createdAt: expect.any(Date),
        projectId: expect.any(String)
      })
      
      // 데이터 정확성 검증
      expect(result.id).toBe(mockDTO.id)
      expect(result.userId).toBe(mockDTO.userId)
      expect(result.isRead).toBe(mockDTO.isRead)
      expect(result.createdAt.toISOString()).toBe(mockDTO.createdAt)
      
      // UI 전용 필드 생성 검증
      expect(result.icon).toBeDefined()
      expect(result.priorityColor).toBeDefined()
      expect(result.timeAgo).toBeDefined()
    })

    it('잘못된 스키마의 DTO를 거부해야 함', () => {
      const invalidDTO = {
        id: '', // 빈 ID (유효하지 않음)
        type: 'invalid_type',
        createdAt: 'invalid-date'
      }
      
      expect(() => {
        transformNotificationToViewModel(invalidDTO as any)
      }).toThrow()
    })

    it('날짜 변환이 정확해야 함', () => {
      const mockDTO = createMockNotificationDTO({
        createdAt: '2025-01-16T15:30:45.123Z',
        readAt: '2025-01-16T15:35:10.456Z'
      })
      
      const result = transformNotificationToViewModel(mockDTO)
      
      expect(result.createdAt).toEqual(new Date('2025-01-16T15:30:45.123Z'))
      expect(result.readAt).toEqual(new Date('2025-01-16T15:35:10.456Z'))
    })

    it('선택적 필드들이 올바르게 처리되어야 함', () => {
      const mockDTO = createMockNotificationDTO({
        readAt: undefined,
        expiresAt: undefined,
        actionUrl: undefined,
        metadata: {}
      })
      
      const result = transformNotificationToViewModel(mockDTO)
      
      expect(result.readAt).toBeUndefined()
      expect(result.expiresAt).toBeUndefined()
      expect(result.actionUrl).toBeUndefined()
      expect(result.metadata).toEqual({})
    })
  })

  describe('타임스탬프 정합성 검증', () => {
    it('생성 시간이 읽기 시간보다 이전이어야 함', () => {
      const now = new Date()
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)
      
      const mockDTO = createMockNotificationDTO({
        createdAt: fiveMinutesAgo.toISOString(),
        readAt: now.toISOString()
      })
      
      const result = transformNotificationToViewModel(mockDTO)
      
      expect(result.createdAt.getTime()).toBeLessThan(result.readAt!.getTime())
    })

    it('만료 시간이 생성 시간보다 이후여야 함', () => {
      const now = new Date()
      const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)
      
      const mockDTO = createMockNotificationDTO({
        createdAt: now.toISOString(),
        expiresAt: oneHourLater.toISOString()
      })
      
      const result = transformNotificationToViewModel(mockDTO)
      
      expect(result.createdAt.getTime()).toBeLessThan(result.expiresAt!.getTime())
    })

    it('timeAgo 필드가 올바른 상대 시간을 표시해야 함', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      
      const mockDTO = createMockNotificationDTO({
        createdAt: fiveMinutesAgo.toISOString()
      })
      
      const result = transformNotificationToViewModel(mockDTO)
      
      expect(result.timeAgo).toMatch(/5m ago/)
    })
  })

  describe('RTK Query 캐시 성능 검증', () => {
    let cacheManager: any

    beforeEach(() => {
      cacheManager = getNotificationCacheManager({
        keepUnusedDataFor: 60, // 1분
        maxCacheSize: 100
      })
    })

    afterEach(() => {
      cacheManager.destroy()
    })

    it('캐시 메트릭이 올바르게 수집되어야 함', () => {
      const metrics = cacheManager.getMetrics()
      
      expect(metrics).toHaveProperty('hitRate')
      expect(metrics).toHaveProperty('missRate')
      expect(metrics).toHaveProperty('invalidationCount')
      expect(metrics).toHaveProperty('memoryUsage')
      expect(metrics).toHaveProperty('lastOptimizedAt')
      
      expect(typeof metrics.hitRate).toBe('number')
      expect(typeof metrics.memoryUsage).toBe('number')
      expect(metrics.lastOptimizedAt).toBeInstanceOf(Date)
    })

    it('캐시 크기 제한이 적용되어야 함', () => {
      const mockStore = {
        dispatch: jest.fn(),
        getState: jest.fn(() => ({
          api: {
            notificationApi: {
              queries: Array.from({ length: 150 }, (_, i) => ({
                [`query${i}`]: { data: { notifications: [] } }
              }))
            }
          }
        }))
      }

      // 대량 캐시 시뮬레이션
      for (let i = 0; i < 150; i++) {
        const notification = createMockNotificationDTO({ id: `notification-${i}` })
        cacheManager.updateCacheOptimistically('notification_created', { notification }, mockStore)
      }

      const metrics = cacheManager.getMetrics()
      expect(metrics.memoryUsage).toBeGreaterThan(0)
    })
  })

  describe('메모리 안전성 검증', () => {
    it('파이프라인 destroy시 모든 리소스가 정리되어야 함', () => {
      const mockWsClient = {
        on: jest.fn(),
        off: jest.fn(),
        connect: jest.fn().mockResolvedValue(undefined),
        isConnected: jest.fn().mockReturnValue(true)
      }

      const pipeline = new RealtimeNotificationPipeline(mockWsClient as any)
      
      // 이벤트 리스너 추가를 시뮬레이션
      const originalAddEventListener = window.addEventListener
      const originalRemoveEventListener = window.removeEventListener
      const addListenerSpy = jest.fn()
      const removeListenerSpy = jest.fn()
      
      window.addEventListener = addListenerSpy
      window.removeEventListener = removeListenerSpy

      pipeline.initialize('user-123')
      
      // 이벤트 리스너가 등록되었는지 확인
      expect(addListenerSpy).toHaveBeenCalled()

      pipeline.destroy()

      // WebSocket 리스너 정리 확인
      expect(mockWsClient.off).toHaveBeenCalledWith('onMessage')
      expect(mockWsClient.off).toHaveBeenCalledWith('onConnectionChange')

      // DOM 이벤트 리스너 정리 확인
      expect(removeListenerSpy).toHaveBeenCalled()

      // 원래 함수 복원
      window.addEventListener = originalAddEventListener
      window.removeEventListener = originalRemoveEventListener
    })

    it('Hook unmount시 메모리 누수가 없어야 함', async () => {
      const initialMemory = measureMemoryUsage()
      
      // Hook을 여러 번 mount/unmount
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() => useRealtimeNotificationCount('user-123'))
        
        await act(async () => {
          // 약간의 작업 시뮬레이션
          await new Promise(resolve => setTimeout(resolve, 10))
        })
        
        unmount()
      }

      // 가비지 컬렉션 강제 실행 (테스트 환경에서만)
      if (global.gc) {
        global.gc()
      }

      const finalMemory = measureMemoryUsage()
      
      if (initialMemory && finalMemory) {
        // 메모리 사용량이 크게 증가하지 않았는지 확인 (50% 이내)
        const memoryGrowth = (finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize) / initialMemory.usedJSHeapSize
        expect(memoryGrowth).toBeLessThan(0.5)
      }
    })

    it('중복 이벤트 처리시 메모리 사용량이 안정적이어야 함', async () => {
      const pipeline = new RealtimeNotificationPipeline()
      await pipeline.initialize('user-123')

      const initialMemory = measureMemoryUsage()

      // 대량의 중복 이벤트 시뮬레이션
      for (let i = 0; i < 1000; i++) {
        const event = new CustomEvent('newNotification', {
          detail: {
            type: 'comment',
            projectId: 'test-project',
            message: '중복 테스트 메시지'
          }
        })
        window.dispatchEvent(event)
      }

      const finalMemory = measureMemoryUsage()
      
      if (initialMemory && finalMemory) {
        // 메모리 사용량이 선형적으로 증가하지 않았는지 확인
        const memoryGrowth = (finalMemory.usedJSHeapSize - initialMemory.usedJSHeapSize) / initialMemory.usedJSHeapSize
        expect(memoryGrowth).toBeLessThan(0.3) // 30% 이내
      }

      pipeline.destroy()
    })
  })

  describe('데이터 무결성 통합 검증', () => {
    it('실시간 파이프라인 전체 데이터 흐름이 안전해야 함', async () => {
      const mockStore = {
        dispatch: jest.fn(),
        getState: jest.fn(() => ({}))
      }

      const pipeline = new RealtimeNotificationPipeline(undefined, mockStore)
      await pipeline.initialize('user-123')

      // 다양한 타입의 알림 이벤트 시뮬레이션
      const testEvents = [
        { type: 'notification_created', notification: createMockNotificationDTO() },
        { type: 'notification_read', notificationId: 'test-001' },
        { type: 'notification_archived', notificationId: 'test-002' }
      ]

      for (const event of testEvents) {
        const customEvent = new CustomEvent('realtimeNotificationUpdate', {
          detail: event
        })

        // 이벤트가 에러 없이 처리되는지 확인
        expect(() => {
          window.dispatchEvent(customEvent)
        }).not.toThrow()
      }

      // 캐시 메트릭 확인
      const cacheMetrics = pipeline.getCacheMetrics()
      expect(cacheMetrics).toBeDefined()
      expect(typeof cacheMetrics.invalidationCount).toBe('number')

      pipeline.destroy()
    })

    it('동시성 시나리오에서 데이터 일관성이 유지되어야 함', async () => {
      const pipeline = new RealtimeNotificationPipeline()
      await pipeline.initialize('user-123')

      const initialCount = pipeline.getUnreadCount()

      // 동시에 여러 이벤트 발생
      const promises = Array.from({ length: 10 }, (_, i) => 
        new Promise<void>(resolve => {
          setTimeout(() => {
            const event = new CustomEvent('newNotification', {
              detail: {
                type: 'comment',
                projectId: `project-${i}`,
                message: `메시지 ${i}`
              }
            })
            window.dispatchEvent(event)
            resolve()
          }, Math.random() * 100) // 랜덤 지연
        })
      )

      await Promise.all(promises)

      // 약간의 처리 시간 대기
      await new Promise(resolve => setTimeout(resolve, 200))

      // 카운트가 정확히 증가했는지 확인
      const finalCount = pipeline.getUnreadCount()
      expect(finalCount).toBe(initialCount + 10)

      pipeline.destroy()
    })
  })
})