/**
 * @fileoverview 협업 시스템 에러 처리 및 엣지 케이스 테스트
 * @description 네트워크 장애, 서버 오류, 데이터 손상, 동시성 문제 등 다양한 예외 상황 테스트
 * @coverage 에러 복구, 재시도 메커니즘, 데이터 무결성, 경계 조건
 */

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest'

import { useVideoPlanningCollaboration, useCalendarCollaboration } from '../hooks/useCollaboration'
import collaborationSlice, { 
  pollCollaborationData,
  performOptimisticUpdate,
  submitChange,
  resolveConflict,
  resetCollaborationState
} from '../slice'

// MSW 설정
import { server } from '@/shared/api/__tests__/setup/msw-setup'
import { collaborationHandlers, errorHandlers } from './collaboration-handlers'
import { http, HttpResponse } from 'msw'

// 테스트용 스토어 생성
function createTestStore() {
  return configureStore({
    reducer: {
      collaboration: collaborationSlice
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          ignoredActions: [
            'collaboration/pollData/fulfilled',
            'collaboration/submitChange/fulfilled',
            'collaboration/resolveConflict/fulfilled'
          ]
        }
      })
  })
}

function createWrapper(store: ReturnType<typeof createTestStore>) {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }
}

describe('협업 시스템 에러 처리 및 엣지 케이스 테스트', () => {
  beforeAll(() => {
    server.use(...collaborationHandlers)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  beforeEach(async () => {
    await fetch('/api/collaboration/reset', { method: 'POST' })
    vi.clearAllTimers()
  })

  afterAll(() => {
    server.resetHandlers()
    vi.restoreAllMocks()
  })

  describe('네트워크 장애 처리', () => {
    it('네트워크 연결 실패 시 적절한 에러 상태가 설정되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 네트워크 오류 핸들러 설정
      server.use(
        http.get('/api/collaboration/poll', () => {
          return HttpResponse.error()
        })
      )
      
      // 폴링 시도
      await act(async () => {
        try {
          await result.current.actions.poll()
        } catch (error) {
          // 에러는 예상됨
        }
      })
      
      // 에러 상태 확인
      await waitFor(() => {
        expect(result.current.state.pollingError).toBeTruthy()
        expect(result.current.state.isPolling).toBe(false)
        expect(result.current.state.connectionStatus).toBe('disconnected')
      })
    })

    it('간헐적 네트워크 오류 시 자동 재시도가 작동해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      let attemptCount = 0
      
      // 처음 3번은 실패, 4번째는 성공
      server.use(
        http.get('/api/collaboration/poll', () => {
          attemptCount++
          if (attemptCount <= 3) {
            return HttpResponse.error()
          }
          return HttpResponse.json({
            success: true,
            data: {
              activeUsers: [],
              changes: [],
              serverVersion: Date.now(),
              timestamp: new Date().toISOString()
            }
          })
        })
      )
      
      // 재시도 로직 테스트
      vi.useFakeTimers()
      
      await act(async () => {
        try {
          await result.current.actions.poll()
        } catch (error) {
          // 첫 번째 시도는 실패할 수 있음
        }
      })
      
      // 재시도 간격 시뮬레이션 (지수 백오프)
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          vi.advanceTimersByTime(Math.pow(2, i) * 1000) // 1s, 2s, 4s
          await vi.runAllTimersAsync()
        })
      }
      
      vi.useRealTimers()
      
      // 최종적으로 성공했는지 확인
      await waitFor(() => {
        expect(result.current.state.pollingError).toBe(null)
        expect(result.current.state.connectionStatus).toBe('connected')
        expect(attemptCount).toBe(4)
      }, { timeout: 10000 })
    })

    it('네트워크 타임아웃 시 적절히 처리되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 타임아웃 시뮬레이션
      server.use(
        http.get('/api/collaboration/poll', async () => {
          await new Promise(resolve => setTimeout(resolve, 30000)) // 30초 지연
          return HttpResponse.json({ success: true, data: {} })
        })
      )
      
      // 타임아웃 설정으로 폴링 시도
      const startTime = Date.now()
      
      await act(async () => {
        try {
          await result.current.actions.poll()
        } catch (error) {
          // 타임아웃 에러 예상
        }
      })
      
      const duration = Date.now() - startTime
      
      // 합리적인 시간 내에 타임아웃되었는지 확인
      expect(duration).toBeLessThan(10000) // 10초 이내
      expect(result.current.state.pollingError?.type).toBe('timeout')
    })

    it('부분적 네트워크 장애 시 오프라인 모드로 전환되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 초기 연결 성공
      await act(async () => {
        await result.current.actions.poll()
      })
      
      expect(result.current.state.connectionStatus).toBe('connected')
      
      // 네트워크 장애 시뮬레이션
      server.use(
        http.get('/api/collaboration/poll', () => HttpResponse.error()),
        http.post('/api/collaboration/submit', () => HttpResponse.error())
      )
      
      // 여러 번 실패 후 오프라인 모드 전환 확인
      for (let i = 0; i < 3; i++) {
        await act(async () => {
          try {
            await result.current.actions.poll()
          } catch (error) {
            // 실패 예상
          }
        })
      }
      
      await waitFor(() => {
        expect(result.current.state.connectionStatus).toBe('offline')
        expect(result.current.state.offlineMode).toBe(true)
      })
      
      // 오프라인 모드에서 로컬 변경사항 저장 확인
      act(() => {
        result.current.actions.performOptimisticUpdate({
          changeId: 'offline-change',
          resourceId: 'resource-1',
          resourceType: 'video-planning',
          action: 'update',
          data: { title: '오프라인 변경' }
        })
      })
      
      expect(result.current.state.recentChanges).toHaveLength(1)
      expect(result.current.state.pendingChanges['offline-change']).toBeTruthy()
    })
  })

  describe('서버 오류 처리', () => {
    it('500 서버 오류 시 적절한 에러 메시지가 표시되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 500 오류 시뮬레이션
      server.use(
        http.get('/api/collaboration/poll', () => {
          return HttpResponse.json({
            success: false,
            error: 'Internal Server Error',
            code: 'INTERNAL_ERROR'
          }, { status: 500 })
        })
      )
      
      await act(async () => {
        try {
          await result.current.actions.poll()
        } catch (error) {
          // 에러 예상
        }
      })
      
      await waitFor(() => {
        expect(result.current.state.pollingError).toBeTruthy()
        expect(result.current.state.pollingError?.code).toBe('INTERNAL_ERROR')
        expect(result.current.state.pollingError?.message).toContain('서버 오류')
      })
    })

    it('404 리소스 없음 오류 시 적절히 처리되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 404 오류 시뮬레이션
      server.use(
        http.post('/api/collaboration/submit', () => {
          return HttpResponse.json({
            success: false,
            error: 'Resource not found',
            code: 'RESOURCE_NOT_FOUND'
          }, { status: 404 })
        })
      )
      
      act(() => {
        result.current.actions.performOptimisticUpdate({
          changeId: 'not-found-test',
          resourceId: 'non-existent-resource',
          resourceType: 'video-planning',
          action: 'update',
          data: { title: '존재하지 않는 리소스' }
        })
      })
      
      await waitFor(() => {
        expect(result.current.state.submitError).toBeTruthy()
        expect(result.current.state.submitError?.code).toBe('RESOURCE_NOT_FOUND')
        // 404 오류 시 낙관적 업데이트 롤백 확인
        expect(result.current.state.pendingChanges['not-found-test']).toBeFalsy()
      })
    })

    it('401 인증 오류 시 재인증 프로세스가 트리거되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 401 오류 시뮬레이션
      server.use(
        http.get('/api/collaboration/poll', () => {
          return HttpResponse.json({
            success: false,
            error: 'Unauthorized',
            code: 'AUTH_REQUIRED'
          }, { status: 401 })
        })
      )
      
      await act(async () => {
        try {
          await result.current.actions.poll()
        } catch (error) {
          // 인증 오류 예상
        }
      })
      
      await waitFor(() => {
        expect(result.current.state.authError).toBeTruthy()
        expect(result.current.state.requiresReauth).toBe(true)
        expect(result.current.state.connectionStatus).toBe('unauthorized')
      })
    })

    it('503 서비스 사용 불가 시 재시도 후 폴백 모드로 전환되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 503 오류 시뮬레이션
      server.use(
        http.get('/api/collaboration/poll', () => {
          return HttpResponse.json({
            success: false,
            error: 'Service Temporarily Unavailable',
            code: 'SERVICE_UNAVAILABLE',
            retryAfter: 5000
          }, { status: 503 })
        })
      )
      
      vi.useFakeTimers()
      
      await act(async () => {
        try {
          await result.current.actions.poll()
        } catch (error) {
          // 503 오류 예상
        }
      })
      
      // 서비스 사용 불가 상태 확인
      expect(result.current.state.serviceUnavailable).toBe(true)
      expect(result.current.state.retryAfter).toBe(5000)
      
      // 재시도 시간 대기
      await act(async () => {
        vi.advanceTimersByTime(6000)
        await vi.runAllTimersAsync()
      })
      
      vi.useRealTimers()
      
      // 재시도 후에도 실패하면 폴백 모드 전환 확인
      await waitFor(() => {
        expect(result.current.state.fallbackMode).toBe(true)
      })
    })
  })

  describe('데이터 무결성 및 검증', () => {
    it('잘못된 응답 데이터 시 데이터 검증이 작동해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 잘못된 데이터 구조 응답
      server.use(
        http.get('/api/collaboration/poll', () => {
          return HttpResponse.json({
            success: true,
            data: {
              activeUsers: 'invalid_format', // 배열이어야 하는데 문자열
              changes: null, // 배열이어야 하는데 null
              serverVersion: 'not_a_number', // 숫자여야 하는데 문자열
              timestamp: 'invalid_date'
            }
          })
        })
      )
      
      await act(async () => {
        try {
          await result.current.actions.poll()
        } catch (error) {
          // 검증 오류 예상
        }
      })
      
      await waitFor(() => {
        expect(result.current.state.validationError).toBeTruthy()
        expect(result.current.state.validationError?.type).toBe('INVALID_RESPONSE_FORMAT')
      })
    })

    it('순환 참조가 있는 데이터 시 안전하게 처리되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 순환 참조를 포함한 데이터 시뮬레이션
      const circularData: any = { users: [] }
      circularData.users.push({ id: 'user1', parent: circularData })
      
      server.use(
        http.get('/api/collaboration/poll', () => {
          return HttpResponse.json({
            success: true,
            data: circularData
          })
        })
      )
      
      await act(async () => {
        try {
          await result.current.actions.poll()
        } catch (error) {
          // 순환 참조 오류 예상
        }
      })
      
      // 앱이 크래시하지 않고 에러가 적절히 처리되는지 확인
      expect(result.current.state.pollingError?.type).toBe('CIRCULAR_REFERENCE')
      expect(result.current.state.activeUsers).toEqual([]) // 기본값 유지
    })

    it('매우 큰 데이터 응답 시 성능 저하 없이 처리되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 매우 큰 데이터 생성 (1000개 변경사항)
      const largeChangesData = Array.from({ length: 1000 }, (_, i) => ({
        id: `large-change-${i}`,
        userId: `user-${i % 10}`,
        userName: `사용자${i % 10}`,
        type: 'video-planning',
        action: 'update',
        resourceId: `resource-${i}`,
        resourceType: 'planning-stage',
        data: { title: `대용량 테스트 ${i}`.repeat(100) }, // 큰 텍스트
        timestamp: new Date().toISOString(),
        version: i
      }))
      
      server.use(
        http.get('/api/collaboration/poll', () => {
          return HttpResponse.json({
            success: true,
            data: {
              activeUsers: [],
              changes: largeChangesData,
              serverVersion: Date.now(),
              timestamp: new Date().toISOString()
            }
          })
        })
      )
      
      const startTime = Date.now()
      
      await act(async () => {
        await result.current.actions.poll()
      })
      
      const processingTime = Date.now() - startTime
      
      // 처리 시간이 5초를 넘지 않아야 함
      expect(processingTime).toBeLessThan(5000)
      
      // 데이터가 제한된 개수로 잘렸는지 확인 (메모리 보호)
      expect(result.current.state.recentChanges.length).toBeLessThanOrEqual(50)
    })

    it('데이터 손상 복구 메커니즘이 작동해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 초기 정상 데이터로 상태 설정
      await act(async () => {
        await result.current.actions.poll()
      })
      
      const initialUsers = result.current.state.activeUsers.length
      
      // 손상된 데이터 응답
      server.use(
        http.get('/api/collaboration/poll', () => {
          return HttpResponse.json({
            success: true,
            data: {
              activeUsers: [
                { id: null, name: undefined, role: 'invalid' }, // 잘못된 사용자 데이터
                { id: 'user-2' } // 필수 필드 누락
              ],
              changes: [
                { id: 'change-1' } // 필수 필드 누락
              ],
              serverVersion: -1, // 잘못된 버전
              timestamp: new Date().toISOString()
            }
          })
        })
      )
      
      await act(async () => {
        try {
          await result.current.actions.poll()
        } catch (error) {
          // 데이터 검증 오류
        }
      })
      
      // 데이터 손상 감지 및 복구 확인
      await waitFor(() => {
        expect(result.current.state.dataCorruptionDetected).toBe(true)
        // 이전 유효한 상태로 롤백되었는지 확인
        expect(result.current.state.activeUsers.length).toBe(initialUsers)
      })
    })
  })

  describe('동시성 및 경쟁 조건', () => {
    it('동시 업데이트 시 데이터 일관성이 유지되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 동시에 여러 업데이트 실행
      const updates = Array.from({ length: 10 }, (_, i) => ({
        changeId: `concurrent-${i}`,
        resourceId: 'same-resource', // 같은 리소스에 동시 업데이트
        resourceType: 'video-planning' as const,
        action: 'update' as const,
        data: { title: `동시 업데이트 ${i}`, version: i }
      }))
      
      // Promise.all로 동시 실행
      await act(async () => {
        await Promise.all(updates.map(update => 
          result.current.actions.performOptimisticUpdate(update)
        ))
      })
      
      // 모든 업데이트가 순서대로 처리되었는지 확인
      expect(result.current.state.recentChanges).toHaveLength(10)
      
      // 마지막 업데이트가 최종 상태인지 확인
      const lastChange = result.current.state.recentChanges[9]
      expect(lastChange.data.title).toBe('동시 업데이트 9')
      
      // 모든 업데이트가 서버에 제출될 때까지 대기
      await waitFor(() => {
        expect(Object.keys(result.current.state.pendingChanges)).toHaveLength(0)
      }, { timeout: 10000 })
    })

    it('폴링과 업데이트 동시 실행 시 상태 충돌이 없어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 폴링과 업데이트를 동시에 실행
      await act(async () => {
        const pollPromise = result.current.actions.poll()
        
        // 폴링과 동시에 여러 업데이트 실행
        for (let i = 0; i < 5; i++) {
          result.current.actions.performOptimisticUpdate({
            changeId: `race-condition-${i}`,
            resourceId: `resource-${i}`,
            resourceType: 'video-planning',
            action: 'update',
            data: { title: `경쟁 조건 테스트 ${i}` }
          })
        }
        
        await pollPromise
      })
      
      // 상태가 일관성 있게 유지되는지 확인
      expect(result.current.state.recentChanges.length).toBeGreaterThan(0)
      expect(result.current.state.isPolling).toBe(false)
      
      // 모든 업데이트가 정상적으로 처리되었는지 확인
      const raceConditionChanges = result.current.state.recentChanges.filter(
        change => change.id.startsWith('race-condition-')
      )
      expect(raceConditionChanges).toHaveLength(5)
    })

    it('빠른 연속 폴링 시 중복 요청이 방지되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      let requestCount = 0
      
      // 요청 횟수 카운팅
      server.use(
        http.get('/api/collaboration/poll', () => {
          requestCount++
          return HttpResponse.json({
            success: true,
            data: {
              activeUsers: [],
              changes: [],
              serverVersion: Date.now(),
              timestamp: new Date().toISOString()
            }
          })
        })
      )
      
      // 빠른 연속 폴링 시도
      await act(async () => {
        const promises = []
        for (let i = 0; i < 5; i++) {
          promises.push(result.current.actions.poll())
        }
        await Promise.all(promises)
      })
      
      // 실제 요청은 1번만 실행되었는지 확인 (중복 방지)
      expect(requestCount).toBe(1)
    })

    it('메모리 부족 상황 시 적절한 처리가 이루어져야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 메모리 부족 상황 시뮬레이션을 위한 큰 데이터 생성
      const originalMemoryUsage = (performance as any).memory?.usedJSHeapSize || 0
      
      try {
        // 매우 큰 배열 생성 시도
        const largeArray = new Array(10000000).fill({
          id: 'memory-test',
          data: new Array(1000).fill('large-string-data'.repeat(100))
        })
        
        act(() => {
          result.current.actions.performOptimisticUpdate({
            changeId: 'memory-stress-test',
            resourceId: 'memory-resource',
            resourceType: 'video-planning',
            action: 'update',
            data: largeArray
          })
        })
        
        // 메모리 사용량이 과도하게 증가했는지 확인
        const currentMemoryUsage = (performance as any).memory?.usedJSHeapSize || 0
        const memoryIncrease = currentMemoryUsage - originalMemoryUsage
        
        if (memoryIncrease > 100 * 1024 * 1024) { // 100MB 이상
          // 메모리 부족 처리가 작동하는지 확인
          await waitFor(() => {
            expect(result.current.state.memoryPressure).toBe(true)
            expect(result.current.state.recentChanges.length).toBeLessThan(1000) // 데이터 제한
          })
        }
      } catch (error) {
        // 메모리 부족으로 인한 오류가 적절히 처리되는지 확인
        expect(error.message).toContain('memory')
      }
    })
  })

  describe('경계 조건 및 극한 상황', () => {
    it('빈 응답 데이터 시 기본값이 설정되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 빈 응답 데이터
      server.use(
        http.get('/api/collaboration/poll', () => {
          return HttpResponse.json({
            success: true,
            data: {
              activeUsers: [],
              changes: [],
              serverVersion: 0,
              timestamp: new Date().toISOString()
            }
          })
        })
      )
      
      await act(async () => {
        await result.current.actions.poll()
      })
      
      // 기본값이 올바르게 설정되었는지 확인
      expect(result.current.state.activeUsers).toEqual([])
      expect(result.current.state.recentChanges).toEqual([])
      expect(result.current.state.serverVersion).toBe(0)
      expect(result.current.state.pollingError).toBe(null)
    })

    it('null 및 undefined 값들이 안전하게 처리되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // null/undefined가 포함된 업데이트 시도
      act(() => {
        result.current.actions.performOptimisticUpdate({
          changeId: null as any,
          resourceId: undefined as any,
          resourceType: 'video-planning',
          action: 'update',
          data: null as any
        })
      })
      
      // 잘못된 값들이 필터링되고 기본값으로 대체되는지 확인
      expect(result.current.state.recentChanges).toHaveLength(0) // 잘못된 업데이트는 무시
      expect(result.current.state.validationError).toBeTruthy() // 검증 오류 발생
    })

    it('매우 긴 문자열 데이터가 적절히 제한되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 매우 긴 문자열로 업데이트 시도
      const longString = 'a'.repeat(1000000) // 1MB 문자열
      
      act(() => {
        result.current.actions.performOptimisticUpdate({
          changeId: 'long-string-test',
          resourceId: 'resource-1',
          resourceType: 'video-planning',
          action: 'update',
          data: { title: longString }
        })
      })
      
      // 문자열이 적절한 길이로 제한되었는지 확인
      const change = result.current.state.recentChanges.find(c => c.id === 'long-string-test')
      expect(change?.data.title.length).toBeLessThan(10000) // 10KB 제한
    })

    it('시간 관련 경계값들이 올바르게 처리되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 극한 날짜 값들로 테스트
      const extremeDates = [
        new Date(0).toISOString(), // Unix epoch
        new Date(8640000000000000).toISOString(), // JavaScript 최대 날짜
        'invalid-date',
        '',
        null
      ]
      
      extremeDates.forEach((date, index) => {
        act(() => {
          try {
            result.current.actions.performOptimisticUpdate({
              changeId: `date-test-${index}`,
              resourceId: 'resource-1',
              resourceType: 'video-planning',
              action: 'update',
              data: { timestamp: date }
            })
          } catch (error) {
            // 잘못된 날짜로 인한 오류는 예상됨
          }
        })
      })
      
      // 유효한 날짜만 처리되었는지 확인
      const validChanges = result.current.state.recentChanges.filter(
        change => change.timestamp && new Date(change.timestamp).getTime() > 0
      )
      
      expect(validChanges.length).toBeGreaterThan(0)
      expect(validChanges.length).toBeLessThanOrEqual(2) // 유효한 날짜만 2개
    })

    it('컴포넌트 언마운트 중 비동기 작업이 안전하게 취소되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result, unmount } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 긴 폴링 작업 시작
      server.use(
        http.get('/api/collaboration/poll', async () => {
          await new Promise(resolve => setTimeout(resolve, 5000)) // 5초 지연
          return HttpResponse.json({
            success: true,
            data: {
              activeUsers: [],
              changes: [],
              serverVersion: Date.now(),
              timestamp: new Date().toISOString()
            }
          })
        })
      )
      
      // 폴링 시작
      act(() => {
        result.current.actions.poll()
      })
      
      expect(result.current.state.isPolling).toBe(true)
      
      // 1초 후 언마운트
      setTimeout(() => {
        unmount()
      }, 1000)
      
      // 언마운트 후 상태가 정리되었는지 확인
      await waitFor(() => {
        const finalState = store.getState().collaboration
        expect(finalState.isPolling).toBe(false)
      })
      
      // 메모리 누수가 없는지 확인 (에러 콘솔이 발생하지 않음)
      expect(console.error).not.toHaveBeenCalledWith(
        expect.stringContaining('memory leak')
      )
    })
  })

  describe('복구 및 자가 치유', () => {
    it('상태 불일치 감지 시 자동 복구가 작동해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 정상 상태 설정
      await act(async () => {
        await result.current.actions.poll()
      })
      
      // 상태를 인위적으로 손상
      act(() => {
        store.dispatch({
          type: 'collaboration/corruptState',
          payload: {
            activeUsers: 'corrupted',
            recentChanges: null,
            serverVersion: -999
          }
        })
      })
      
      // 다음 폴링에서 상태 불일치 감지 및 복구
      await act(async () => {
        await result.current.actions.poll()
      })
      
      // 상태가 복구되었는지 확인
      await waitFor(() => {
        expect(Array.isArray(result.current.state.activeUsers)).toBe(true)
        expect(Array.isArray(result.current.state.recentChanges)).toBe(true)
        expect(result.current.state.serverVersion).toBeGreaterThanOrEqual(0)
        expect(result.current.state.selfHealingTriggered).toBe(true)
      })
    })

    it('부분적 데이터 손실 시 캐시에서 복구되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 초기 데이터 로드
      await act(async () => {
        await result.current.actions.poll()
      })
      
      const initialUsers = result.current.state.activeUsers
      const initialChanges = result.current.state.recentChanges
      
      // 빈 데이터 응답 (부분적 손실 시뮬레이션)
      server.use(
        http.get('/api/collaboration/poll', () => {
          return HttpResponse.json({
            success: true,
            data: {
              activeUsers: [],
              changes: [],
              serverVersion: Date.now(),
              timestamp: new Date().toISOString()
            }
          })
        })
      )
      
      await act(async () => {
        await result.current.actions.poll()
      })
      
      // 캐시된 데이터로 복구되었는지 확인
      expect(result.current.state.activeUsers.length).toBeGreaterThanOrEqual(
        Math.min(initialUsers.length, 1) // 최소 1명은 유지
      )
      expect(result.current.state.dataRestoredFromCache).toBe(true)
    })
  })
})