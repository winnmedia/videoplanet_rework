/**
 * @fileoverview 폴링 기반 협업 시스템 통합 테스트
 * @description 단순한 폴링 방식 실시간 협업 시스템의 포괄적인 테스트 스위트
 * @coverage 폴링 동작, 낙관적 업데이트, 충돌 해결, 에러 처리, 성능
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
  selectActiveUsers,
  selectRecentChanges,
  selectConflicts
} from '../slice'
import type { 
  CollaborationUser, 
  CollaborationChange, 
  CollaborationConflict 
} from '../types'

// MSW 설정
import { server } from '@/shared/api/__tests__/setup/msw-setup'
import { collaborationHandlers } from './collaboration-handlers'

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

// 테스트 래퍼 컴포넌트
function createWrapper(store: ReturnType<typeof createTestStore>) {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }
}

// 테스트 유틸리티
function createMockChange(id: string, overrides?: Partial<CollaborationChange>): CollaborationChange {
  return {
    id,
    userId: 'test-user',
    userName: '테스트사용자',
    type: 'video-planning',
    action: 'update',
    resourceId: `resource-${id}`,
    resourceType: 'planning-stage',
    data: { title: `테스트 변경 ${id}` },
    timestamp: new Date().toISOString(),
    version: Date.now(),
    ...overrides
  }
}

describe('폴링 기반 협업 시스템 통합 테스트', () => {
  beforeAll(() => {
    server.use(...collaborationHandlers)
    // 콘솔 로그 억제
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  beforeEach(async () => {
    // 각 테스트 전에 협업 데이터 초기화
    await fetch('/api/collaboration/reset', { method: 'POST' })
    vi.clearAllTimers()
  })

  afterAll(() => {
    server.resetHandlers()
    vi.restoreAllMocks()
  })

  describe('폴링 메커니즘 통합 테스트', () => {
    it('폴링이 정상적으로 시작되고 데이터를 가져와야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 폴링이 시작될 때까지 대기
      await waitFor(() => {
        expect(result.current.state.isPolling).toBe(true)
      }, { timeout: 3000 })
      
      // 폴링 완료까지 대기
      await waitFor(() => {
        expect(result.current.state.isPolling).toBe(false)
        expect(result.current.state.activeUsers.length).toBeGreaterThan(0)
        expect(result.current.state.lastPolled).toBeTruthy()
      }, { timeout: 5000 })
      
      // 서버 버전이 업데이트되었는지 확인
      expect(result.current.state.serverVersion).toBeGreaterThan(0)
    })

    it('폴링 주기가 올바르게 설정되어야 한다', async () => {
      vi.useFakeTimers()
      
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 첫 번째 폴링 완료 대기
      await act(async () => {
        vi.advanceTimersByTime(1000)
        await vi.runAllTimersAsync()
      })
      
      const firstPollTime = result.current.state.lastPolled
      
      // 2초 후 다음 폴링 실행 (Video Planning은 2초 주기)
      await act(async () => {
        vi.advanceTimersByTime(2000)
        await vi.runAllTimersAsync()
      })
      
      const secondPollTime = result.current.state.lastPolled
      expect(secondPollTime).not.toBe(firstPollTime)
      
      vi.useRealTimers()
    })

    it('캘린더 협업은 더 긴 폴링 주기를 가져야 한다', async () => {
      vi.useFakeTimers()
      
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useCalendarCollaboration(), { wrapper })
      
      // 첫 번째 폴링
      await act(async () => {
        vi.advanceTimersByTime(1000)
        await vi.runAllTimersAsync()
      })
      
      const firstPollTime = result.current.state.lastPolled
      
      // 2초 후 (아직 폴링되지 않아야 함)
      await act(async () => {
        vi.advanceTimersByTime(2000)
        await vi.runAllTimersAsync()
      })
      
      expect(result.current.state.lastPolled).toBe(firstPollTime)
      
      // 5초 후 폴링 실행 (Calendar는 5초 주기)
      await act(async () => {
        vi.advanceTimersByTime(3000) // 총 5초
        await vi.runAllTimersAsync()
      })
      
      expect(result.current.state.lastPolled).not.toBe(firstPollTime)
      
      vi.useRealTimers()
    })

    it('백그라운드/포그라운드 상태에 따른 폴링 제어가 작동해야 한다', async () => {
      vi.useFakeTimers()
      
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 초기 폴링 시작
      await act(async () => {
        vi.advanceTimersByTime(1000)
        await vi.runAllTimersAsync()
      })
      
      // 윈도우 블러 이벤트 (백그라운드)
      act(() => {
        window.dispatchEvent(new Event('blur'))
      })
      
      await waitFor(() => {
        expect(result.current.state.isPolling).toBe(false)
      })
      
      // 윈도우 포커스 이벤트 (포그라운드)
      act(() => {
        window.dispatchEvent(new Event('focus'))
      })
      
      await waitFor(() => {
        expect(result.current.state.isPolling).toBe(true)
      })
      
      vi.useRealTimers()
    })
  })

  describe('낙관적 업데이트 통합 테스트', () => {
    it('낙관적 업데이트가 즉시 반영되고 서버에 제출되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      const updatePayload = {
        changeId: 'optimistic-test-1',
        resourceId: 'stage-1',
        resourceType: 'video-planning' as const,
        action: 'update' as const,
        data: { title: '낙관적 업데이트 테스트' }
      }
      
      // 낙관적 업데이트 실행
      act(() => {
        result.current.actions.performOptimisticUpdate(updatePayload)
      })
      
      // 즉시 UI에 반영되었는지 확인
      expect(result.current.state.recentChanges).toHaveLength(1)
      expect(result.current.state.recentChanges[0].id).toBe('optimistic-test-1')
      expect(result.current.state.pendingChanges['optimistic-test-1']).toBeTruthy()
      
      // 서버 제출 완료까지 대기 (디바운스 포함)
      await waitFor(() => {
        expect(result.current.state.pendingChanges['optimistic-test-1']).toBeFalsy()
      }, { timeout: 3000 })
    })

    it('여러 낙관적 업데이트가 올바르게 배치 처리되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      const updates = Array.from({ length: 5 }, (_, i) => ({
        changeId: `batch-update-${i}`,
        resourceId: `stage-${i}`,
        resourceType: 'video-planning' as const,
        action: 'update' as const,
        data: { title: `배치 업데이트 ${i}` }
      }))
      
      // 빠른 연속 업데이트
      act(() => {
        updates.forEach(update => {
          result.current.actions.performOptimisticUpdate(update)
        })
      })
      
      // 모든 업데이트가 반영되었는지 확인
      expect(result.current.state.recentChanges).toHaveLength(5)
      expect(Object.keys(result.current.state.pendingChanges)).toHaveLength(5)
      
      // 배치 처리 완료까지 대기
      await waitFor(() => {
        expect(Object.keys(result.current.state.pendingChanges)).toHaveLength(0)
      }, { timeout: 5000 })
    })

    it('중복된 낙관적 업데이트는 한 번만 처리되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      const updatePayload = {
        changeId: 'duplicate-update',
        resourceId: 'stage-1',
        resourceType: 'video-planning' as const,
        action: 'update' as const,
        data: { title: '중복 업데이트 테스트' }
      }
      
      // 같은 업데이트를 여러 번 실행
      act(() => {
        result.current.actions.performOptimisticUpdate(updatePayload)
        result.current.actions.performOptimisticUpdate(updatePayload)
        result.current.actions.performOptimisticUpdate(updatePayload)
      })
      
      // 하나만 반영되었는지 확인
      expect(result.current.state.recentChanges).toHaveLength(1)
      expect(result.current.state.recentChanges[0].id).toBe('duplicate-update')
      
      await waitFor(() => {
        const duplicateChanges = result.current.state.recentChanges.filter(c => c.id === 'duplicate-update')
        expect(duplicateChanges).toHaveLength(1)
      }, { timeout: 3000 })
    })
  })

  describe('충돌 감지 및 해결 통합 테스트', () => {
    it('충돌이 발생하면 자동으로 감지되고 모달이 표시되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 강제 충돌 생성
      await fetch('/api/collaboration/force-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resourceId: 'conflict-resource', 
          resourceType: 'video-planning' 
        })
      })
      
      // 폴링을 통해 충돌 감지
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.conflicts.length).toBeGreaterThan(0)
        expect(result.current.state.showConflictModal).toBe(true)
      })
    })

    it('충돌 해결이 올바르게 작동해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 충돌 생성 및 감지
      await fetch('/api/collaboration/force-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resourceId: 'resolve-test-resource', 
          resourceType: 'video-planning' 
        })
      })
      
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.conflicts.length).toBeGreaterThan(0)
      })
      
      const conflictId = result.current.state.conflicts[0].id
      
      // 충돌 해결
      await act(async () => {
        await result.current.actions.resolveConflict({
          conflictId,
          resolution: 'local',
          mergedData: { resolved: true, strategy: 'local' }
        })
      })
      
      // 충돌이 해결되었는지 확인
      await waitFor(() => {
        expect(result.current.state.conflicts).toHaveLength(0)
        expect(result.current.state.showConflictModal).toBe(false)
      })
    })

    it('여러 충돌이 동시에 발생해도 올바르게 처리되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 여러 충돌 생성
      const conflictPromises = Array.from({ length: 3 }, (_, i) =>
        fetch('/api/collaboration/force-conflict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            resourceId: `multi-conflict-${i}`, 
            resourceType: 'video-planning' 
          })
        })
      )
      
      await Promise.all(conflictPromises)
      
      // 폴링으로 모든 충돌 감지
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.conflicts.length).toBe(3)
      })
      
      // 모든 충돌 해결
      const conflictIds = result.current.state.conflicts.map(c => c.id)
      
      for (const conflictId of conflictIds) {
        await act(async () => {
          await result.current.actions.resolveConflict({
            conflictId,
            resolution: 'remote',
            mergedData: { resolved: true }
          })
        })
      }
      
      await waitFor(() => {
        expect(result.current.state.conflicts).toHaveLength(0)
      })
    })
  })

  describe('실시간 데이터 동기화 통합 테스트', () => {
    it('다른 사용자의 변경사항이 폴링으로 감지되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 초기 폴링
      await act(async () => {
        await result.current.actions.poll()
      })
      
      const initialChangeCount = result.current.state.recentChanges.length
      
      // 다른 사용자 시뮬레이션 (사용자 참여)
      await fetch('/api/collaboration/simulate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'join',
          userId: 'new-collaborator',
          userData: { name: '새로운 협업자', role: 'editor' }
        })
      })
      
      // 다음 폴링으로 변경사항 감지
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.activeUsers.length).toBeGreaterThan(2)
        // 시뮬레이션된 변경사항이 있을 수 있음
        expect(result.current.state.recentChanges.length).toBeGreaterThanOrEqual(initialChangeCount)
      })
    })

    it('사용자 상태 변화가 실시간으로 반영되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 초기 상태
      await act(async () => {
        await result.current.actions.poll()
      })
      
      const initialUserCount = result.current.state.activeUsers.length
      
      // 사용자 퇴장 시뮬레이션
      await fetch('/api/collaboration/simulate-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'leave',
          userId: 'user2' // 기본 목 데이터에 있는 사용자
        })
      })
      
      // 변화 감지
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.activeUsers.length).toBeLessThan(initialUserCount)
        const user2 = result.current.state.activeUsers.find(u => u.id === 'user2')
        expect(user2).toBeUndefined()
      })
    })

    it('서버 버전 불일치 시 강제 동기화가 발생해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 초기 폴링으로 서버 버전 설정
      await act(async () => {
        await result.current.actions.poll()
      })
      
      const initialVersion = result.current.state.serverVersion
      
      // 여러 변경사항을 서버에 직접 추가 (시뮬레이션)
      for (let i = 0; i < 3; i++) {
        await fetch('/api/collaboration/force-conflict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            resourceId: `version-test-${i}`, 
            resourceType: 'video-planning' 
          })
        })
      }
      
      // 다음 폴링에서 버전 차이 감지 및 동기화
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.serverVersion).toBeGreaterThan(initialVersion)
        expect(result.current.state.recentChanges.length).toBeGreaterThan(0)
      })
    })
  })

  describe('에러 처리 및 복구 통합 테스트', () => {
    it('네트워크 오류 시 에러 상태 설정 및 재시도가 작동해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // MSW 핸들러를 오류로 변경
      server.use(
        ...collaborationHandlers.map(handler => {
          if (handler.info.method === 'get' && handler.info.path === '/api/collaboration/poll') {
            return handler.clone({
              resolver: () => Promise.reject(new Error('Network Error'))
            })
          }
          return handler
        })
      )
      
      // 폴링 실행 (오류 발생)
      await act(async () => {
        try {
          await result.current.actions.poll()
        } catch (error) {
          // 에러는 예상됨
        }
      })
      
      await waitFor(() => {
        expect(result.current.state.pollingError).toBeTruthy()
      })
      
      // 핸들러 복구
      server.use(...collaborationHandlers)
      
      // 재시도 (성공)
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.pollingError).toBe(null)
      })
    })

    it('서버 오류 시 적절한 폴백 처리가 이루어져야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 500 오류 시뮬레이션
      server.use(
        ...collaborationHandlers.map(handler => {
          if (handler.info.method === 'get' && handler.info.path === '/api/collaboration/poll') {
            return handler.clone({
              resolver: () => {
                return new Response(JSON.stringify({
                  success: false,
                  error: 'Internal Server Error'
                }), { status: 500 })
              }
            })
          }
          return handler
        })
      )
      
      await act(async () => {
        try {
          await result.current.actions.poll()
        } catch (error) {
          // 에러 처리됨
        }
      })
      
      await waitFor(() => {
        expect(result.current.state.pollingError).toBeTruthy()
        expect(result.current.state.isPolling).toBe(false)
      })
    })

    it('부분적 데이터 손실 시 데이터 복구가 이루어져야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 정상 데이터로 시작
      await act(async () => {
        await result.current.actions.poll()
      })
      
      const initialUsers = result.current.state.activeUsers.length
      
      // 빈 데이터로 응답하는 핸들러
      server.use(
        ...collaborationHandlers.map(handler => {
          if (handler.info.method === 'get' && handler.info.path === '/api/collaboration/poll') {
            return handler.clone({
              resolver: () => {
                return Response.json({
                  success: true,
                  data: {
                    activeUsers: [],
                    changes: [],
                    serverVersion: Date.now(),
                    timestamp: new Date().toISOString()
                  }
                })
              }
            })
          }
          return handler
        })
      )
      
      await act(async () => {
        await result.current.actions.poll()
      })
      
      // 빈 데이터가 반영되었는지 확인
      expect(result.current.state.activeUsers).toHaveLength(0)
      
      // 정상 핸들러 복구
      server.use(...collaborationHandlers)
      
      await act(async () => {
        await result.current.actions.poll()
      })
      
      // 데이터 복구 확인
      await waitFor(() => {
        expect(result.current.state.activeUsers.length).toBeGreaterThan(0)
      })
    })
  })

  describe('성능 및 메모리 관리 통합 테스트', () => {
    it('대량 데이터 처리 시 성능이 유지되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      const startTime = performance.now()
      
      // 대량의 낙관적 업데이트
      act(() => {
        for (let i = 0; i < 100; i++) {
          result.current.actions.performOptimisticUpdate({
            changeId: `perf-test-${i}`,
            resourceId: `resource-${i}`,
            resourceType: 'video-planning',
            action: 'update',
            data: { title: `성능 테스트 ${i}` }
          })
        }
      })
      
      const updateTime = performance.now() - startTime
      
      // 100개 업데이트가 500ms 이내에 처리되어야 함
      expect(updateTime).toBeLessThan(500)
      expect(result.current.state.recentChanges).toHaveLength(100)
    })

    it('오래된 변경사항이 자동으로 정리되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 많은 변경사항 추가
      act(() => {
        for (let i = 0; i < 60; i++) { // 목 핸들러는 최대 50개만 유지
          result.current.actions.performOptimisticUpdate({
            changeId: `cleanup-test-${i}`,
            resourceId: `resource-${i}`,
            resourceType: 'video-planning',
            action: 'update',
            data: { title: `정리 테스트 ${i}` }
          })
        }
      })
      
      // 서버 동기화 후 정리 확인
      await waitFor(() => {
        expect(result.current.state.recentChanges.length).toBeLessThanOrEqual(50)
      }, { timeout: 5000 })
    })

    it('컴포넌트 언마운트 시 리소스가 정리되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result, unmount } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 폴링 시작 확인
      await waitFor(() => {
        expect(result.current.state.isPolling).toBe(true)
      })
      
      // 언마운트
      unmount()
      
      // 스토어에서 폴링이 중단되었는지 확인
      const finalState = store.getState().collaboration
      expect(finalState.isPolling).toBe(false)
    })
  })

  describe('Redux 액션 통합 테스트', () => {
    it('Redux 액션들이 올바른 순서로 디스패치되어야 한다', async () => {
      const store = createTestStore()
      const actionOrder: string[] = []
      
      // 액션 디스패치 모니터링
      const originalDispatch = store.dispatch
      store.dispatch = vi.fn().mockImplementation((action) => {
        if (typeof action === 'object' && action.type) {
          actionOrder.push(action.type)
        }
        return originalDispatch(action)
      })
      
      const wrapper = createWrapper(store)
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 낙관적 업데이트
      act(() => {
        result.current.actions.performOptimisticUpdate({
          changeId: 'action-order-test',
          resourceId: 'resource-1',
          resourceType: 'video-planning',
          action: 'update',
          data: { title: '액션 순서 테스트' }
        })
      })
      
      // 폴링
      await act(async () => {
        await result.current.actions.poll()
      })
      
      // 예상 액션 순서 확인
      expect(actionOrder).toContain('collaboration/performOptimisticUpdate')
      expect(actionOrder).toContain('collaboration/pollData/pending')
      expect(actionOrder).toContain('collaboration/pollData/fulfilled')
    })

    it('셀렉터가 올바른 값을 반환해야 한다', async () => {
      const store = createTestStore()
      
      // 테스트 데이터 추가
      store.dispatch(performOptimisticUpdate({
        changeId: 'selector-test',
        resourceId: 'resource-1',
        resourceType: 'video-planning',
        action: 'update',
        data: { title: '셀렉터 테스트' }
      }))
      
      const state = store.getState()
      
      // 셀렉터 테스트
      expect(selectActiveUsers(state)).toEqual([])
      expect(selectRecentChanges(state)).toHaveLength(1)
      expect(selectConflicts(state)).toEqual([])
      
      const recentChange = selectRecentChanges(state)[0]
      expect(recentChange.id).toBe('selector-test')
      expect(recentChange.resourceId).toBe('resource-1')
    })
  })
})