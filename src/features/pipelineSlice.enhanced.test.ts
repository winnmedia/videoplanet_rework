/**
 * @file Enhanced Pipeline Slice Tests
 * @description 직렬화 최적화된 파이프라인 슬라이스 테스트
 */

import { configureStore } from '@reduxjs/toolkit'
import { 
  enhancedPipelineSlice,
  updatePipelineStep,
  setPipelineData,
  clearPipelineProgress,
  syncWithAuthState,
  batchUpdatePipeline,
  optimisticProjectUpdate,
  selectPipelineState,
  selectCurrentStep,
  selectCompletedSteps,
  selectCanMoveToStep,
  selectPipelineProgress,
  selectIsStepCompleted
} from '../processes/userPipeline/model/pipelineSlice.enhanced'
import { PipelineStep } from '@/shared/types/store'

describe('Enhanced Pipeline Slice', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        pipeline: enhancedPipelineSlice.reducer
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            // 이제 Set 대신 배열을 사용하므로 직렬화 문제 없음
            ignoredActions: []
          }
        })
    })
  })

  describe('직렬화 및 상태 관리', () => {
    test('completedSteps가 배열로 관리되어 직렬화 가능해야 한다', () => {
      // Act: 단계 업데이트
      store.dispatch(updatePipelineStep({
        step: 'login',
        userData: { id: 'user-123', email: 'test@example.com' }
      }))

      const state = store.getState().pipeline

      // Assert: 직렬화 가능한 배열 형태
      expect(Array.isArray(state.completedSteps)).toBe(true)
      expect(state.completedSteps).toContain('signup')
      expect(state.currentStep).toBe('login')

      // JSON 직렬화 테스트
      expect(() => JSON.stringify(state)).not.toThrow()
      
      const serialized = JSON.stringify(state)
      const deserialized = JSON.parse(serialized)
      expect(deserialized.completedSteps).toEqual(['signup'])
    })

    test('중복 단계가 completedSteps에 추가되지 않아야 한다', () => {
      // Arrange: 동일 단계로 여러 번 이동
      store.dispatch(updatePipelineStep({ step: 'login' }))
      store.dispatch(updatePipelineStep({ step: 'login' }))
      store.dispatch(updatePipelineStep({ step: 'login' }))

      const state = store.getState().pipeline

      // Assert: 중복 없이 한 번만 추가
      expect(state.completedSteps.filter(step => step === 'signup').length).toBe(1)
      expect(state.currentStep).toBe('login')
    })
  })

  describe('배치 업데이트', () => {
    test('batchUpdatePipeline이 여러 상태를 원자적으로 업데이트해야 한다', () => {
      // Act: 배치 업데이트
      store.dispatch(batchUpdatePipeline({
        step: 'project',
        userData: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        },
        projectData: {
          id: 'proj-123',
          name: 'Test Project',
          description: 'Test Description'
        },
        sessionData: {
          startedAt: '2024-01-01T00:00:00Z',
          timeSpent: 3600
        }
      }))

      const state = store.getState().pipeline

      // Assert: 모든 데이터가 원자적으로 업데이트됨
      expect(state.currentStep).toBe('project')
      expect(state.completedSteps).toEqual(['signup', 'login'])
      expect(state.userProgress.profile?.name).toBe('Test User')
      expect(state.userProgress.projects[0]?.name).toBe('Test Project')
      expect(state.sessionData.startedAt).toBe('2024-01-01T00:00:00Z')
      expect(state.sessionData.timeSpent).toBe(3600)
    })
  })

  describe('외부 상태 동기화', () => {
    test('syncWithAuthState가 인증 상태를 파이프라인과 동기화해야 한다', () => {
      // Act: 인증 상태 동기화
      store.dispatch(syncWithAuthState({
        isAuthenticated: true,
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        },
        targetStep: 'project'
      }))

      const state = store.getState().pipeline

      // Assert: 파이프라인 상태가 인증 상태에 맞게 업데이트됨
      expect(state.currentStep).toBe('project')
      expect(state.completedSteps).toEqual(['signup', 'login'])
      expect(state.userProgress.profile?.id).toBe('user-123')
      expect(state.userProgress.profile?.name).toBe('Test User')
    })
  })

  describe('낙관적 업데이트', () => {
    test('optimisticProjectUpdate가 낙관적 업데이트를 처리해야 한다', () => {
      // Act: 낙관적 프로젝트 업데이트
      store.dispatch(optimisticProjectUpdate({
        project: {
          id: 'proj-123',
          name: 'Optimistic Project',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z'
        },
        optimisticId: 'temp-123'
      }))

      const state = store.getState().pipeline

      // Assert: 낙관적 업데이트가 적용됨
      expect(state.userProgress.projects.length).toBe(1)
      expect(state.userProgress.projects[0].name).toBe('Optimistic Project')
      expect(state.userProgress.currentProject).toBe('proj-123')
      expect(state.optimisticUpdates).toHaveProperty('temp-123')
    })

    test('낙관적 업데이트 실패 시 롤백되어야 한다', () => {
      // Arrange: 낙관적 업데이트 적용
      store.dispatch(optimisticProjectUpdate({
        project: {
          id: 'proj-123',
          name: 'Optimistic Project',
          status: 'active',
          createdAt: '2024-01-01T00:00:00Z'
        },
        optimisticId: 'temp-123'
      }))

      // Act: 업데이트 실패로 롤백
      store.dispatch({
        type: 'pipeline/rollbackOptimisticUpdate',
        payload: { optimisticId: 'temp-123' }
      })

      const state = store.getState().pipeline

      // Assert: 상태가 롤백됨
      expect(state.userProgress.projects.length).toBe(0)
      expect(state.userProgress.currentProject).toBeNull()
      expect(state.optimisticUpdates).not.toHaveProperty('temp-123')
    })
  })

  describe('Selectors', () => {
    beforeEach(() => {
      // 테스트 데이터 설정
      store.dispatch(updatePipelineStep({ step: 'login' }))
      store.dispatch(updatePipelineStep({ step: 'project' }))
    })

    test('selectCurrentStep이 현재 단계를 반환해야 한다', () => {
      const currentStep = selectCurrentStep(store.getState())
      expect(currentStep).toBe('project')
    })

    test('selectCompletedSteps가 완료된 단계 목록을 반환해야 한다', () => {
      const completedSteps = selectCompletedSteps(store.getState())
      expect(completedSteps).toEqual(['signup', 'login'])
    })

    test('selectCanMoveToStep이 단계 이동 가능성을 정확히 판단해야 한다', () => {
      const canMoveToInvite = selectCanMoveToStep(store.getState(), 'invite')
      const canMoveToSignup = selectCanMoveToStep(store.getState(), 'signup')
      
      expect(canMoveToInvite).toBe(true)  // 다음 단계로 이동 가능
      expect(canMoveToSignup).toBe(false) // 이전 단계로 이동 불가
    })

    test('selectIsStepCompleted가 단계 완료 상태를 정확히 반환해야 한다', () => {
      const isSignupCompleted = selectIsStepCompleted(store.getState(), 'signup')
      const isInviteCompleted = selectIsStepCompleted(store.getState(), 'invite')
      
      expect(isSignupCompleted).toBe(true)  // 완료된 단계
      expect(isInviteCompleted).toBe(false) // 미완료 단계
    })

    test('selectPipelineProgress가 전체 진행률을 계산해야 한다', () => {
      const progress = selectPipelineProgress(store.getState())
      
      expect(progress.completed).toBe(2) // signup, login 완료
      expect(progress.total).toBe(7)     // 전체 단계 수
      expect(progress.percentage).toBeCloseTo(28.57, 2) // 2/7 * 100
      expect(progress.currentStepIndex).toBe(2) // project 단계 인덱스
    })
  })

  describe('에러 처리 및 복원력', () => {
    test('잘못된 단계 전환 시도가 상태를 손상시키지 않아야 한다', () => {
      const initialState = store.getState().pipeline

      // Act: 잘못된 단계로 이동 시도
      store.dispatch(updatePipelineStep({ 
        step: 'invalid-step' as PipelineStep 
      }))

      const finalState = store.getState().pipeline

      // Assert: 상태가 변경되지 않음
      expect(finalState).toEqual(initialState)
    })

    test('null userData로 업데이트 시도가 안전하게 처리되어야 한다', () => {
      // Act: null 사용자 데이터로 업데이트
      store.dispatch(updatePipelineStep({
        step: 'login',
        userData: null
      }))

      const state = store.getState().pipeline

      // Assert: 상태가 안전하게 업데이트됨
      expect(state.currentStep).toBe('login')
      expect(state.userProgress.profile).toBeNull()
    })
  })

  describe('성능 최적화', () => {
    test('대량 단계 업데이트가 효율적으로 처리되어야 한다', () => {
      const startTime = performance.now()

      // Act: 여러 단계를 빠르게 업데이트
      const steps: PipelineStep[] = ['login', 'project', 'invite', 'planning', 'prompt']
      steps.forEach(step => {
        store.dispatch(updatePipelineStep({ step }))
      })

      const endTime = performance.now()

      // Assert: 성능 기준 내에서 완료
      expect(endTime - startTime).toBeLessThan(100) // 100ms 이내

      const state = store.getState().pipeline
      expect(state.currentStep).toBe('prompt')
      expect(state.completedSteps).toEqual(['signup', 'login', 'project', 'invite', 'planning'])
    })
  })
})