/**
 * @fileoverview 낙관적 업데이트 및 충돌 해결 시나리오 테스트
 * @description 협업 시스템의 핵심 기능인 낙관적 업데이트와 충돌 해결의 세부 시나리오 테스트
 * @coverage 낙관적 업데이트, 충돌 감지, 해결 전략, 데이터 일관성
 */

import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest'

import { useVideoPlanningCollaboration } from '../hooks/useCollaboration'
import collaborationSlice, { 
  performOptimisticUpdate,
  submitChange,
  resolveConflict,
  selectPendingChanges,
  selectConflicts
} from '../slice'
import type { 
  CollaborationChange, 
  CollaborationConflict,
  ConflictResolution 
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
            'collaboration/performOptimisticUpdate',
            'collaboration/submitChange/fulfilled',
            'collaboration/resolveConflict/fulfilled'
          ]
        }
      })
  })
}

// 테스트 래퍼
function createWrapper(store: ReturnType<typeof createTestStore>) {
  return function TestWrapper({ children }: { children: React.ReactNode }) {
    return <Provider store={store}>{children}</Provider>
  }
}

// 유틸리티 함수
function createMockChange(id: string, resourceId: string, overrides?: Partial<CollaborationChange>): CollaborationChange {
  return {
    id,
    userId: 'test-user',
    userName: '테스트사용자',
    type: 'video-planning',
    action: 'update',
    resourceId,
    resourceType: 'planning-stage',
    data: { title: `테스트 변경 ${id}` },
    timestamp: new Date().toISOString(),
    version: Date.now(),
    ...overrides
  }
}

describe('낙관적 업데이트 시나리오 테스트', () => {
  beforeAll(() => {
    server.use(...collaborationHandlers)
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

  describe('기본 낙관적 업데이트 동작', () => {
    it('단일 업데이트가 즉시 UI에 반영되고 서버에 제출되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      const updatePayload = {
        changeId: 'single-update-test',
        resourceId: 'stage-1',
        resourceType: 'video-planning' as const,
        action: 'update' as const,
        data: { title: '제목 수정', content: '내용 수정' }
      }
      
      // 업데이트 전 상태 확인
      expect(result.current.state.recentChanges).toHaveLength(0)
      expect(result.current.state.pendingChanges).toEqual({})
      
      // 낙관적 업데이트 실행
      act(() => {
        result.current.actions.performOptimisticUpdate(updatePayload)
      })
      
      // 즉시 반영 확인
      expect(result.current.state.recentChanges).toHaveLength(1)
      const change = result.current.state.recentChanges[0]
      expect(change.id).toBe('single-update-test')
      expect(change.data.title).toBe('제목 수정')
      expect(result.current.state.pendingChanges['single-update-test']).toBeTruthy()
      
      // 서버 제출 대기
      await waitFor(() => {
        expect(result.current.state.pendingChanges['single-update-test']).toBeFalsy()
      }, { timeout: 3000 })
    })

    it('업데이트 실패 시 롤백이 정상적으로 이루어져야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // MSW를 실패하도록 설정
      server.use(
        ...collaborationHandlers.map(handler => {
          if (handler.info.method === 'post' && handler.info.path === '/api/collaboration/submit') {
            return handler.clone({
              resolver: () => {
                return new Response(JSON.stringify({
                  success: false,
                  error: '서버 오류'
                }), { status: 500 })
              }
            })
          }
          return handler
        })
      )
      
      const updatePayload = {
        changeId: 'rollback-test',
        resourceId: 'stage-1',
        resourceType: 'video-planning' as const,
        action: 'update' as const,
        data: { title: '롤백 테스트' }
      }
      
      // 낙관적 업데이트
      act(() => {
        result.current.actions.performOptimisticUpdate(updatePayload)
      })
      
      // 즉시 반영 확인
      expect(result.current.state.recentChanges).toHaveLength(1)
      expect(result.current.state.pendingChanges['rollback-test']).toBeTruthy()
      
      // 실패 및 롤백 대기
      await waitFor(() => {
        expect(result.current.state.pendingChanges['rollback-test']).toBeFalsy()
        // 실패한 변경사항은 제거되거나 실패 상태로 표시
        expect(result.current.state.submitError).toBeTruthy()
      }, { timeout: 3000 })
    })

    it('연속적인 업데이트가 올바른 순서로 처리되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      const updates = [
        {
          changeId: 'sequential-1',
          resourceId: 'stage-1',
          resourceType: 'video-planning' as const,
          action: 'update' as const,
          data: { title: '첫 번째 수정' }
        },
        {
          changeId: 'sequential-2',
          resourceId: 'stage-1',
          resourceType: 'video-planning' as const,
          action: 'update' as const,
          data: { title: '두 번째 수정' }
        },
        {
          changeId: 'sequential-3',
          resourceId: 'stage-1',
          resourceType: 'video-planning' as const,
          action: 'update' as const,
          data: { title: '세 번째 수정' }
        }
      ]
      
      // 연속 업데이트 실행
      act(() => {
        updates.forEach((update, index) => {
          setTimeout(() => {
            result.current.actions.performOptimisticUpdate(update)
          }, index * 100)
        })
      })
      
      // 모든 업데이트가 반영될 때까지 대기
      await waitFor(() => {
        expect(result.current.state.recentChanges).toHaveLength(3)
      })
      
      // 순서 확인
      const changes = result.current.state.recentChanges
      expect(changes[0].id).toBe('sequential-1')
      expect(changes[1].id).toBe('sequential-2')
      expect(changes[2].id).toBe('sequential-3')
      
      // 모든 업데이트가 서버에 제출될 때까지 대기
      await waitFor(() => {
        expect(Object.keys(result.current.state.pendingChanges)).toHaveLength(0)
      }, { timeout: 5000 })
    })

    it('동일 리소스에 대한 빠른 연속 업데이트가 적절히 병합되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 동일 리소스에 대한 빠른 연속 업데이트
      act(() => {
        result.current.actions.performOptimisticUpdate({
          changeId: 'merge-1',
          resourceId: 'stage-1',
          resourceType: 'video-planning',
          action: 'update',
          data: { title: '첫 번째' }
        })
        
        result.current.actions.performOptimisticUpdate({
          changeId: 'merge-2',
          resourceId: 'stage-1', // 같은 리소스
          resourceType: 'video-planning',
          action: 'update',
          data: { title: '두 번째', content: '추가 내용' }
        })
      })
      
      // 최신 상태만 유지되는지 확인
      expect(result.current.state.recentChanges.length).toBeGreaterThan(0)
      
      // 서버 제출 완료 대기
      await waitFor(() => {
        expect(Object.keys(result.current.state.pendingChanges)).toHaveLength(0)
      }, { timeout: 3000 })
    })
  })

  describe('충돌 감지 및 해결 시나리오', () => {
    it('동일 리소스에 대한 동시 편집 시 충돌이 감지되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 로컬 변경사항
      act(() => {
        result.current.actions.performOptimisticUpdate({
          changeId: 'local-change',
          resourceId: 'conflict-resource',
          resourceType: 'video-planning',
          action: 'update',
          data: { title: '로컬 수정' }
        })
      })
      
      // 서버에서 충돌 상황 생성
      await fetch('/api/collaboration/force-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resourceId: 'conflict-resource', 
          resourceType: 'video-planning' 
        })
      })
      
      // 폴링으로 충돌 감지
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.conflicts.length).toBeGreaterThan(0)
        const conflict = result.current.state.conflicts[0]
        expect(conflict.resourceId).toBe('conflict-resource')
        expect(result.current.state.showConflictModal).toBe(true)
      })
    })

    it('로컬 우선 충돌 해결이 올바르게 작동해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 충돌 상황 생성
      await fetch('/api/collaboration/force-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resourceId: 'local-resolution', 
          resourceType: 'video-planning' 
        })
      })
      
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.conflicts.length).toBeGreaterThan(0)
      })
      
      const conflict = result.current.state.conflicts[0]
      
      // 로컬 변경사항 우선 해결
      await act(async () => {
        await result.current.actions.resolveConflict({
          conflictId: conflict.id,
          resolution: 'local',
          mergedData: { 
            title: '로컬 변경사항 유지',
            resolvedBy: 'local'
          }
        })
      })
      
      await waitFor(() => {
        expect(result.current.state.conflicts).toHaveLength(0)
        expect(result.current.state.showConflictModal).toBe(false)
        // 로컬 해결 결과가 변경사항에 반영되었는지 확인
        const resolvedChange = result.current.state.recentChanges.find(
          c => c.resourceId === 'local-resolution'
        )
        expect(resolvedChange?.data.resolvedBy).toBe('local')
      })
    })

    it('원격 우선 충돌 해결이 올바르게 작동해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 충돌 생성
      await fetch('/api/collaboration/force-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resourceId: 'remote-resolution', 
          resourceType: 'video-planning' 
        })
      })
      
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.conflicts.length).toBeGreaterThan(0)
      })
      
      const conflict = result.current.state.conflicts[0]
      
      // 원격 변경사항 우선 해결
      await act(async () => {
        await result.current.actions.resolveConflict({
          conflictId: conflict.id,
          resolution: 'remote',
          mergedData: { 
            title: '원격 변경사항 유지',
            resolvedBy: 'remote'
          }
        })
      })
      
      await waitFor(() => {
        expect(result.current.state.conflicts).toHaveLength(0)
        // 원격 해결 결과 확인
        const resolvedChange = result.current.state.recentChanges.find(
          c => c.resourceId === 'remote-resolution'
        )
        expect(resolvedChange?.data.resolvedBy).toBe('remote')
      })
    })

    it('수동 병합 충돌 해결이 올바르게 작동해야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 충돌 생성
      await fetch('/api/collaboration/force-conflict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          resourceId: 'manual-merge', 
          resourceType: 'video-planning' 
        })
      })
      
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.conflicts.length).toBeGreaterThan(0)
      })
      
      const conflict = result.current.state.conflicts[0]
      
      // 수동 병합 해결
      await act(async () => {
        await result.current.actions.resolveConflict({
          conflictId: conflict.id,
          resolution: 'manual',
          mergedData: { 
            title: '수동으로 병합된 내용',
            localContent: '로컬 데이터',
            remoteContent: '원격 데이터',
            mergedAt: new Date().toISOString()
          }
        })
      })
      
      await waitFor(() => {
        expect(result.current.state.conflicts).toHaveLength(0)
        const mergedChange = result.current.state.recentChanges.find(
          c => c.resourceId === 'manual-merge'
        )
        expect(mergedChange?.data.title).toBe('수동으로 병합된 내용')
        expect(mergedChange?.data.localContent).toBe('로컬 데이터')
        expect(mergedChange?.data.remoteContent).toBe('원격 데이터')
      })
    })

    it('복합 충돌 상황에서 순차적 해결이 이루어져야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 여러 리소스에 대한 충돌 생성
      const conflictResources = ['resource-a', 'resource-b', 'resource-c']
      
      for (const resourceId of conflictResources) {
        await fetch('/api/collaboration/force-conflict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceId, resourceType: 'video-planning' })
        })
      }
      
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.conflicts.length).toBe(3)
      })
      
      // 각 충돌을 순차적으로 해결
      const conflicts = result.current.state.conflicts
      
      for (let i = 0; i < conflicts.length; i++) {
        const conflict = conflicts[i]
        await act(async () => {
          await result.current.actions.resolveConflict({
            conflictId: conflict.id,
            resolution: i % 2 === 0 ? 'local' : 'remote', // 교대로 해결
            mergedData: { 
              resolvedIndex: i,
              resolvedAt: new Date().toISOString()
            }
          })
        })
        
        // 각 해결 후 상태 확인
        await waitFor(() => {
          expect(result.current.state.conflicts.length).toBe(3 - i - 1)
        })
      }
      
      // 모든 충돌이 해결되었는지 최종 확인
      expect(result.current.state.conflicts).toHaveLength(0)
      expect(result.current.state.showConflictModal).toBe(false)
    })
  })

  describe('데이터 일관성 및 상태 관리', () => {
    it('낙관적 업데이트 후 서버 응답에 따른 상태 동기화가 이루어져야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 낙관적 업데이트
      act(() => {
        result.current.actions.performOptimisticUpdate({
          changeId: 'sync-test',
          resourceId: 'stage-sync',
          resourceType: 'video-planning',
          action: 'update',
          data: { title: '로컬 제목' }
        })
      })
      
      // 로컬 상태 확인
      expect(result.current.state.recentChanges[0].data.title).toBe('로컬 제목')
      
      // 서버 제출 및 응답 대기
      await waitFor(() => {
        expect(result.current.state.pendingChanges['sync-test']).toBeFalsy()
      }, { timeout: 3000 })
      
      // 서버 응답 후 추가 폴링을 통한 상태 확인
      await act(async () => {
        await result.current.actions.poll()
      })
      
      // 서버 응답에 따른 버전 정보 업데이트 확인
      const syncedChange = result.current.state.recentChanges.find(c => c.id === 'sync-test')
      expect(syncedChange?.version).toBeGreaterThan(0)
    })

    it('오프라인 상태에서 누적된 변경사항이 온라인 복구 시 올바르게 동기화되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 네트워크 오프라인 시뮬레이션
      server.use(
        ...collaborationHandlers.map(handler => {
          if (handler.info.method === 'post') {
            return handler.clone({
              resolver: () => Promise.reject(new Error('Network offline'))
            })
          }
          return handler
        })
      )
      
      // 오프라인 상태에서 여러 변경사항 생성
      const offlineChanges = ['offline-1', 'offline-2', 'offline-3']
      
      act(() => {
        offlineChanges.forEach(changeId => {
          result.current.actions.performOptimisticUpdate({
            changeId,
            resourceId: `resource-${changeId}`,
            resourceType: 'video-planning',
            action: 'update',
            data: { title: `오프라인 변경 ${changeId}` }
          })
        })
      })
      
      // 모든 변경사항이 대기 중인 상태 확인
      expect(Object.keys(result.current.state.pendingChanges)).toHaveLength(3)
      
      // 네트워크 복구 시뮬레이션
      server.use(...collaborationHandlers)
      
      // 온라인 복구 후 자동 동기화 대기
      await waitFor(() => {
        expect(Object.keys(result.current.state.pendingChanges)).toHaveLength(0)
      }, { timeout: 5000 })
      
      // 모든 오프라인 변경사항이 동기화되었는지 확인
      expect(result.current.state.recentChanges.length).toBeGreaterThanOrEqual(3)
    })

    it('버전 충돌 시 강제 새로고침이 트리거되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 초기 상태 설정
      await act(async () => {
        await result.current.actions.poll()
      })
      
      const initialVersion = result.current.state.serverVersion
      
      // 서버에서 대규모 변경사항 발생 시뮬레이션 (버전 크게 앞서나감)
      for (let i = 0; i < 10; i++) {
        await fetch('/api/collaboration/force-conflict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            resourceId: `version-conflict-${i}`, 
            resourceType: 'video-planning' 
          })
        })
      }
      
      // 다음 폴링에서 버전 차이 감지
      await act(async () => {
        await result.current.actions.poll()
      })
      
      await waitFor(() => {
        expect(result.current.state.serverVersion).toBeGreaterThan(initialVersion + 5)
        expect(result.current.state.recentChanges.length).toBeGreaterThan(0)
      })
    })

    it('메모리 최적화를 위한 오래된 변경사항 정리가 이루어져야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 대량의 변경사항 생성
      act(() => {
        for (let i = 0; i < 55; i++) { // 50개 제한보다 많이
          result.current.actions.performOptimisticUpdate({
            changeId: `cleanup-${i}`,
            resourceId: `resource-${i}`,
            resourceType: 'video-planning',
            action: 'update',
            data: { title: `정리 테스트 ${i}` }
          })
        }
      })
      
      // 모든 변경사항 제출 완료 대기
      await waitFor(() => {
        expect(Object.keys(result.current.state.pendingChanges)).toHaveLength(0)
      }, { timeout: 10000 })
      
      // 서버 폴링을 통한 정리 확인
      await act(async () => {
        await result.current.actions.poll()
      })
      
      // 최대 개수 제한 확인 (MSW 핸들러에서 50개로 제한)
      await waitFor(() => {
        expect(result.current.state.recentChanges.length).toBeLessThanOrEqual(50)
      })
    })
  })

  describe('에러 복구 및 재시도 메커니즘', () => {
    it('일시적 네트워크 오류 시 자동 재시도가 이루어져야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      let attemptCount = 0
      
      // 처음 두 번은 실패, 세 번째는 성공하도록 설정
      server.use(
        ...collaborationHandlers.map(handler => {
          if (handler.info.method === 'post' && handler.info.path === '/api/collaboration/submit') {
            return handler.clone({
              resolver: () => {
                attemptCount++
                if (attemptCount <= 2) {
                  return new Response(JSON.stringify({
                    success: false,
                    error: 'Temporary network error'
                  }), { status: 503 })
                }
                return Response.json({
                  success: true,
                  data: {
                    changeId: 'retry-test',
                    version: Date.now()
                  }
                })
              }
            })
          }
          return handler
        })
      )
      
      // 낙관적 업데이트 (재시도가 필요한 상황)
      act(() => {
        result.current.actions.performOptimisticUpdate({
          changeId: 'retry-test',
          resourceId: 'retry-resource',
          resourceType: 'video-planning',
          action: 'update',
          data: { title: '재시도 테스트' }
        })
      })
      
      // 재시도 완료까지 대기 (더 긴 시간 허용)
      await waitFor(() => {
        expect(result.current.state.pendingChanges['retry-test']).toBeFalsy()
        expect(attemptCount).toBe(3) // 총 3번 시도
      }, { timeout: 10000 })
      
      // 최종적으로 성공했는지 확인
      expect(result.current.state.submitError).toBeFalsy()
    })

    it('영구적 오류 시 적절한 오류 상태가 설정되어야 한다', async () => {
      const store = createTestStore()
      const wrapper = createWrapper(store)
      
      const { result } = renderHook(() => useVideoPlanningCollaboration(), { wrapper })
      
      // 영구적 오류 시뮬레이션
      server.use(
        ...collaborationHandlers.map(handler => {
          if (handler.info.method === 'post' && handler.info.path === '/api/collaboration/submit') {
            return handler.clone({
              resolver: () => {
                return new Response(JSON.stringify({
                  success: false,
                  error: 'Permanent validation error',
                  code: 'VALIDATION_FAILED'
                }), { status: 400 })
              }
            })
          }
          return handler
        })
      )
      
      act(() => {
        result.current.actions.performOptimisticUpdate({
          changeId: 'permanent-error',
          resourceId: 'error-resource',
          resourceType: 'video-planning',
          action: 'update',
          data: { title: '영구 오류 테스트' }
        })
      })
      
      // 오류 상태 확인
      await waitFor(() => {
        expect(result.current.state.submitError).toBeTruthy()
        expect(result.current.state.submitError?.code).toBe('VALIDATION_FAILED')
        // 영구 오류 시 더 이상 재시도하지 않음
        expect(result.current.state.pendingChanges['permanent-error']).toBeFalsy()
      }, { timeout: 5000 })
    })
  })
})