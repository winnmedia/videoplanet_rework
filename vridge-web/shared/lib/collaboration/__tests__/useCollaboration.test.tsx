/**
 * @fileoverview 협업 훅 테스트
 * @description useCollaboration 훅의 단위 테스트 및 통합 테스트
 */

import { act, renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

import { useVideoPlanningCollaboration, useCalendarCollaboration } from '../hooks/useCollaboration'
import collaborationSlice, { 
  pollCollaborationData, 
  performOptimisticUpdate,
  selectActiveUsers,
  selectRecentChanges 
} from '../slice'

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
          ignoredActions: ['collaboration/pollData/fulfilled', 'collaboration/submitChange/fulfilled']
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

describe('useCollaboration 훅 테스트', () => {
  beforeAll(() => {
    // MSW 서버에 협업 핸들러 추가
    server.use(...collaborationHandlers)
  })

  beforeEach(() => {
    // 각 테스트 전에 협업 데이터 초기화
    fetch('/api/collaboration/reset', { method: 'POST' })
  })

  afterAll(() => {
    server.resetHandlers()
  })

  describe('기본 기능 테스트', () => {
    test('초기 상태가 올바르게 설정되어야 한다', () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      expect(result.current.state.activeUsers).toEqual([])
      expect(result.current.state.recentChanges).toEqual([])
      expect(result.current.state.conflicts).toEqual([])
      expect(result.current.state.isPolling).toBe(false)
    })

    test('폴링이 자동으로 시작되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 폴링이 시작될 때까지 대기
      await waitFor(() => {
        expect(result.current.state.isPolling).toBe(true)
      })
      
      // 폴링 완료까지 대기
      await waitFor(() => {
        expect(result.current.state.isPolling).toBe(false)
      })
      
      // 활성 사용자가 로드되었는지 확인
      expect(result.current.state.activeUsers.length).toBeGreaterThan(0)
    })

    test('수동 폴링이 작동해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 폴링 중단
      act(() => {
        result.current.actions.stopPolling()
      })
      
      // 수동 폴링 실행
      await act(async () => {
        await result.current.actions.poll()
      })
      
      // 데이터가 로드되었는지 확인
      expect(result.current.state.activeUsers.length).toBeGreaterThan(0)
    })
  })

  describe('낙관적 업데이트 테스트', () => {
    test('낙관적 업데이트가 즉시 UI에 반영되어야 한다', () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      const updatePayload = {
        changeId: 'test-change-1',
        resourceId: 'stage-1',
        resourceType: 'video-planning' as const,
        action: 'update' as const,
        data: { title: '수정된 단계 제목' }
      }
      
      // 낙관적 업데이트 실행
      act(() => {
        result.current.actions.performOptimisticUpdate(updatePayload)
      })
      
      // 변경사항이 즉시 반영되었는지 확인
      const recentChanges = result.current.state.recentChanges
      expect(recentChanges).toHaveLength(1)
      expect(recentChanges[0].id).toBe('test-change-1')
      expect(recentChanges[0].resourceId).toBe('stage-1')
    })

    test('중복된 변경사항은 한 번만 처리되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      const updatePayload = {
        changeId: 'duplicate-change',
        resourceId: 'stage-1',
        resourceType: 'video-planning' as const,
        action: 'update' as const,
        data: { title: '중복 테스트' }
      }
      
      // 같은 변경사항을 두 번 실행
      act(() => {
        result.current.actions.performOptimisticUpdate(updatePayload)
        result.current.actions.performOptimisticUpdate(updatePayload)
      })
      
      // 서버 제출까지 대기 (디바운스 포함)
      await waitFor(() => {
        const recentChanges = result.current.state.recentChanges
        const duplicateChanges = recentChanges.filter(c => c.id === 'duplicate-change')
        expect(duplicateChanges).toHaveLength(1)
      }, { timeout: 3000 })
    })
  })

  describe('충돌 처리 테스트', () => {
    test('충돌 발생 시 모달이 자동으로 표시되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 강제 충돌 생성
      await fetch('/api/collaboration/force-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId: 'test-resource', resourceType: 'video-planning' })
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

    test('충돌 해결이 올바르게 작동해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 강제 충돌 생성
      await fetch('/api/collaboration/force-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId: 'test-resource', resourceType: 'video-planning' })
      })
      
      // 충돌 로드
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.conflicts.length).toBeGreaterThan(0)
      })
      
      const conflictId = result.current.state.conflicts[0].id
      
      // 충돌 해결
      act(() => {
        result.current.actions.resolveConflict({
          conflictId,
          resolution: 'local',
          mergedData: { resolved: true }
        })
      })
      
      // 충돌이 해결되었는지 확인
      await waitFor(() => {
        expect(result.current.state.conflicts).toHaveLength(0)
        expect(result.current.state.showConflictModal).toBe(false)
      })
    })
  })

  describe('특화된 훅 테스트', () => {
    test('Video Planning 전용 훅이 올바른 설정을 가져야 한다', () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // Video Planning은 더 빠른 폴링(2초)과 활동 피드를 사용
      expect(result.current.state.showActivityFeed).toBe(false) // 초기 상태
    })

    test('Calendar 전용 훅이 올바른 설정을 가져야 한다', () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useCalendarCollaboration(), { wrapper })
      
      // Calendar는 더 느린 폴링(5초)과 활동 피드 비활성화를 사용
      expect(result.current.state.showActivityFeed).toBe(false)
    })
  })

  describe('생명주기 및 정리 테스트', () => {
    test('컴포넌트 언마운트 시 폴링이 중단되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result, unmount } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 폴링이 시작될 때까지 대기
      await waitFor(() => {
        expect(result.current.state.activeUsers.length).toBeGreaterThan(0)
      })
      
      // 언마운트
      unmount()
      
      // 폴링이 중단되었는지 확인하기 위해 스토어 상태 직접 확인
      const finalState = store.getState().collaboration
      expect(finalState.isPolling).toBe(false)
    })

    test('윈도우 포커스/블러에 따른 폴링 제어가 작동해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 초기 폴링 시작 대기
      await waitFor(() => {
        expect(result.current.state.activeUsers.length).toBeGreaterThan(0)
      })
      
      // 윈도우 블러 이벤트 시뮬레이션
      act(() => {
        window.dispatchEvent(new Event('blur'))
      })
      
      // 잠시 대기 후 폴링 상태 확인
      await waitFor(() => {
        expect(store.getState().collaboration.isPolling).toBe(false)
      })
      
      // 윈도우 포커스 이벤트 시뮬레이션
      act(() => {
        window.dispatchEvent(new Event('focus'))
      })
      
      // 폴링이 재시작되었는지 확인
      await waitFor(() => {
        expect(store.getState().collaboration.isPolling).toBe(true)
      })
    })
  })

  describe('에러 처리 테스트', () => {
    test('네트워크 오류 시 에러 상태가 설정되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // MSW에서 네트워크 오류 시뮬레이션
      server.use(
        ...collaborationHandlers.map(handler => 
          // 모든 협업 API를 오류로 응답하도록 수정
          handler.resolver.mockImplementationOnce(() => {
            throw new Error('Network Error')
          })
        )
      )
      
      // 폴링 실행
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
    })

    test('서버 오류 시 재시도 메커니즘이 작동해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 첫 번째 요청은 실패, 두 번째는 성공하도록 설정
      let requestCount = 0
      server.use(
        ...collaborationHandlers.map(handler => {
          if (handler.info.path === '/api/collaboration/poll') {
            return handler.resolver.mockImplementation(() => {
              requestCount++
              if (requestCount === 1) {
                throw new Error('Server Error')
              }
              return handler.resolver.mockResolvedValueOnce({
                success: true,
                data: {
                  activeUsers: [],
                  changes: [],
                  serverVersion: Date.now(),
                  timestamp: new Date().toISOString()
                }
              })
            })
          }
          return handler
        })
      )
      
      // 첫 번째 폴링 (실패)
      await act(async () => {
        try {
          await result.current.actions.poll()
        } catch (error) {
          // 첫 번째는 실패할 수 있음
        }
      })
      
      // 두 번째 폴링 (성공)
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.pollingError).toBe(null)
        expect(requestCount).toBeGreaterThanOrEqual(2)
      })
    })
  })
})

describe('Redux slice 단위 테스트', () => {
  test('낙관적 업데이트 액션이 올바르게 상태를 변경해야 한다', () => {
    const store = createTestStore()
    
    const payload = {
      changeId: 'test-change',
      resourceId: 'test-resource',
      resourceType: 'video-planning',
      action: 'update' as const,
      data: { test: 'data' }
    }
    
    store.dispatch(performOptimisticUpdate(payload))
    
    const state = store.getState().collaboration
    expect(state.recentChanges).toHaveLength(1)
    expect(state.recentChanges[0].id).toBe('test-change')
    expect(state.pendingChanges['test-change']).toBeDefined()
  })

  test('폴링 액션이 올바르게 상태를 변경해야 한다', async () => {
    const store = createTestStore()
    
    // 폴링 시작 시 isPolling이 true가 되는지 확인
    const pollingPromise = store.dispatch(pollCollaborationData())
    
    let state = store.getState().collaboration
    expect(state.isPolling).toBe(true)
    
    // 폴링 완료까지 대기
    await pollingPromise
    
    state = store.getState().collaboration
    expect(state.isPolling).toBe(false)
    expect(state.lastPolled).toBeTruthy()
  })

  test('셀렉터가 올바른 값을 반환해야 한다', () => {
    const store = createTestStore()
    
    // 테스트 데이터 추가
    store.dispatch(performOptimisticUpdate({
      changeId: 'test',
      resourceId: 'resource',
      resourceType: 'video-planning',
      action: 'update',
      data: {}
    }))
    
    const state = store.getState()
    
    expect(selectActiveUsers(state)).toEqual([])
    expect(selectRecentChanges(state)).toHaveLength(1)
  })
})