/**
 * Notification Engine Tests
 * Phase 3 - 실시간 피드백 시스템 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { NotificationEngine, type FeedbackEvent, type NotificationSubscriber } from './notificationEngine'

describe('NotificationEngine', () => {
  let engine: NotificationEngine
  let mockSubscriber: NotificationSubscriber
  let receivedEvents: FeedbackEvent[]

  beforeEach(() => {
    engine = new NotificationEngine()
    receivedEvents = []
    
    mockSubscriber = {
      id: 'test-subscriber-1',
      projectId: 'test-project',
      onEvent: (event: FeedbackEvent) => {
        receivedEvents.push(event)
      }
    }
  })

  afterEach(() => {
    vi.clearAllTimers()
  })

  describe('구독 및 해지', () => {
    it('should subscribe successfully', () => {
      const unsubscribe = engine.subscribe(mockSubscriber)
      
      expect(typeof unsubscribe).toBe('function')
      expect(engine.getConnectionStatus('test-subscriber-1')).toBe('connected')
      expect(engine.getActiveSubscribersCount('test-project')).toBe(1)
    })

    it('should unsubscribe successfully', () => {
      const unsubscribe = engine.subscribe(mockSubscriber)
      
      expect(engine.getActiveSubscribersCount('test-project')).toBe(1)
      
      unsubscribe()
      
      expect(engine.getConnectionStatus('test-subscriber-1')).toBe('disconnected')
      expect(engine.getActiveSubscribersCount('test-project')).toBe(0)
    })

    it('should handle multiple subscribers for same project', () => {
      const subscriber2: NotificationSubscriber = {
        id: 'test-subscriber-2',
        projectId: 'test-project',
        onEvent: vi.fn()
      }

      engine.subscribe(mockSubscriber)
      engine.subscribe(subscriber2)
      
      expect(engine.getActiveSubscribersCount('test-project')).toBe(2)
    })
  })

  describe('이벤트 발행 및 수신', () => {
    it('should publish and receive events', () => {
      engine.subscribe(mockSubscriber)

      const testEvent: FeedbackEvent = {
        id: 'event-1',
        type: 'feedback_added',
        projectId: 'test-project',
        userId: 'user-1',
        timestamp: new Date(),
        data: { message: 'Test feedback' }
      }

      engine.publish(testEvent)

      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0]).toEqual(testEvent)
    })

    it('should filter events by project', () => {
      const subscriber2: NotificationSubscriber = {
        id: 'test-subscriber-2',
        projectId: 'other-project',
        onEvent: vi.fn()
      }

      engine.subscribe(mockSubscriber)
      engine.subscribe(subscriber2)

      const testEvent: FeedbackEvent = {
        id: 'event-1',
        type: 'feedback_added',
        projectId: 'test-project',
        timestamp: new Date(),
        data: { message: 'Test feedback' }
      }

      engine.publish(testEvent)

      expect(receivedEvents).toHaveLength(1)
      expect(subscriber2.onEvent).not.toHaveBeenCalled()
    })

    it('should apply custom event filters', () => {
      const filteredSubscriber: NotificationSubscriber = {
        id: 'filtered-subscriber',
        projectId: 'test-project',
        onEvent: vi.fn(),
        filter: (event) => event.type === 'feedback_resolved'
      }

      engine.subscribe(filteredSubscriber)

      // This event should be filtered out
      engine.publish({
        id: 'event-1',
        type: 'feedback_added',
        projectId: 'test-project',
        timestamp: new Date(),
        data: {}
      })

      // This event should pass the filter
      engine.publish({
        id: 'event-2',
        type: 'feedback_resolved',
        projectId: 'test-project',
        timestamp: new Date(),
        data: {}
      })

      expect(filteredSubscriber.onEvent).toHaveBeenCalledTimes(1)
    })
  })

  describe('이벤트 히스토리 관리', () => {
    it('should store event history', () => {
      const testEvent: FeedbackEvent = {
        id: 'event-1',
        type: 'feedback_added',
        projectId: 'test-project',
        timestamp: new Date(),
        data: {}
      }

      engine.publish(testEvent)

      const history = engine.getProjectEventHistory('test-project')
      expect(history).toHaveLength(1)
      expect(history[0]).toEqual(testEvent)
    })

    it('should send recent events to new subscribers', () => {
      // Publish event before subscription
      const testEvent: FeedbackEvent = {
        id: 'event-1',
        type: 'feedback_added',
        projectId: 'test-project',
        timestamp: new Date(),
        data: { message: 'Historical event' }
      }

      engine.publish(testEvent)

      // Now subscribe - should receive the historical event
      engine.subscribe(mockSubscriber)

      expect(receivedEvents).toHaveLength(1)
      expect(receivedEvents[0]).toEqual(testEvent)
    })

    it('should limit event history to 100 events', () => {
      // Publish 150 events
      for (let i = 0; i < 150; i++) {
        engine.publish({
          id: `event-${i}`,
          type: 'feedback_added',
          projectId: 'test-project',
          timestamp: new Date(),
          data: { index: i }
        })
      }

      const history = engine.getProjectEventHistory('test-project')
      expect(history).toHaveLength(100)
      
      // Should keep the most recent events (50-149)
      expect(history[0].data.index).toBe(50)
      expect(history[99].data.index).toBe(149)
    })

    it('should limit returned history by specified limit', () => {
      // Publish 20 events
      for (let i = 0; i < 20; i++) {
        engine.publish({
          id: `event-${i}`,
          type: 'feedback_added',
          projectId: 'test-project',
          timestamp: new Date(),
          data: { index: i }
        })
      }

      const limitedHistory = engine.getProjectEventHistory('test-project', 5)
      expect(limitedHistory).toHaveLength(5)
      
      // Should return last 5 events (15-19)
      expect(limitedHistory[0].data.index).toBe(15)
      expect(limitedHistory[4].data.index).toBe(19)
    })
  })

  describe('연결 상태 관리', () => {
    it('should track connection status', () => {
      expect(engine.getConnectionStatus('nonexistent')).toBe('disconnected')

      engine.subscribe(mockSubscriber)
      expect(engine.getConnectionStatus('test-subscriber-1')).toBe('connected')
    })

    it('should handle subscriber errors gracefully', () => {
      const errorSubscriber: NotificationSubscriber = {
        id: 'error-subscriber',
        projectId: 'test-project',
        onEvent: () => {
          throw new Error('Subscriber error')
        }
      }

      engine.subscribe(errorSubscriber)

      // Should not throw when publishing to failing subscriber
      expect(() => {
        engine.publish({
          id: 'event-1',
          type: 'feedback_added',
          projectId: 'test-project',
          timestamp: new Date(),
          data: {}
        })
      }).not.toThrow()

      // Should mark subscriber as disconnected
      expect(engine.getConnectionStatus('error-subscriber')).toBe('disconnected')
    })
  })

  describe('실시간 시뮬레이션', () => {
    it('should start and stop simulation', () => {
      vi.useFakeTimers()
      
      engine.subscribe(mockSubscriber)
      const stopSimulation = engine.simulateRealtimeEvents('test-project')

      // Fast-forward time to trigger events
      vi.advanceTimersByTime(10000) // 10 seconds

      expect(receivedEvents.length).toBeGreaterThan(0)

      // Stop simulation
      stopSimulation()
      const eventCountAfterStop = receivedEvents.length

      // Advance time more and verify no more events
      vi.advanceTimersByTime(10000)
      expect(receivedEvents.length).toBe(eventCountAfterStop)

      vi.useRealTimers()
    })

    it('should generate different types of events', () => {
      vi.useFakeTimers()
      
      engine.subscribe(mockSubscriber)
      const stopSimulation = engine.simulateRealtimeEvents('test-project')

      // Generate multiple events
      vi.advanceTimersByTime(15000) // 15 seconds = ~5 events

      // Should have received various event types
      const eventTypes = receivedEvents.map(e => e.type)
      const uniqueTypes = [...new Set(eventTypes)]
      
      expect(uniqueTypes.length).toBeGreaterThan(1)
      expect(uniqueTypes).toContain('feedback_added')

      stopSimulation()
      vi.useRealTimers()
    })
  })
})