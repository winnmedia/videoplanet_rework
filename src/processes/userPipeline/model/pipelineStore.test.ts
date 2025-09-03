import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect, beforeEach } from '@jest/globals'
import { pipelineSlice, PipelineState, PipelineStep } from './pipelineStore'
import { clearPipelineProgress, updatePipelineStep, setPipelineData } from './pipelineActions'

describe('Pipeline Store', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        pipeline: pipelineSlice.reducer
      }
    })
  })

  describe('초기 상태', () => {
    it('should initialize with signup step', () => {
      const state = store.getState().pipeline
      expect(state.currentStep).toBe('signup')
      expect(state.completedSteps).toEqual(new Set())
      expect(state.userProgress.profile).toBeNull()
      expect(state.sessionData.startedAt).toBeNull()
    })
  })

  describe('파이프라인 진행', () => {
    it('should update current step and mark previous as completed', () => {
      // Act: 회원가입 완료 후 로그인 단계로 이동
      store.dispatch(updatePipelineStep({
        step: 'login',
        userData: { email: 'test@example.com', id: '123' }
      }))

      // Assert
      const state = store.getState().pipeline
      expect(state.currentStep).toBe('login')
      expect(state.completedSteps.has('signup')).toBe(true)
      expect(state.userProgress.profile?.email).toBe('test@example.com')
    })

    it('should prevent backward navigation', () => {
      // Arrange: 프로젝트 단계까지 진행
      store.dispatch(updatePipelineStep({ step: 'login' }))
      store.dispatch(updatePipelineStep({ step: 'project' }))

      // Act: 이전 단계로 돌아가려고 시도
      store.dispatch(updatePipelineStep({ step: 'signup' }))

      // Assert: 단계가 변경되지 않음
      const state = store.getState().pipeline
      expect(state.currentStep).toBe('project')
    })
  })

  describe('데이터 영속성', () => {
    it('should persist project data across steps', () => {
      // Act: 프로젝트 데이터 설정
      store.dispatch(setPipelineData({
        projectId: 'proj-123',
        projectData: { name: 'Test Project', description: 'Test Description' }
      }))

      // Assert
      const state = store.getState().pipeline
      expect(state.userProgress.currentProject).toBe('proj-123')
      expect(state.userProgress.projects).toHaveLength(1)
      expect(state.userProgress.projects[0].name).toBe('Test Project')
    })

    it('should maintain session data throughout pipeline', () => {
      const startTime = new Date().toISOString()
      
      // Act: 세션 시작
      store.dispatch(updatePipelineStep({ 
        step: 'login',
        sessionData: { startedAt: startTime }
      }))

      // 여러 단계 진행
      store.dispatch(updatePipelineStep({ step: 'project' }))
      store.dispatch(updatePipelineStep({ step: 'invite' }))

      // Assert: 세션 데이터 유지
      const state = store.getState().pipeline
      expect(state.sessionData.startedAt).toBe(startTime)
    })
  })

  describe('파이프라인 리셋', () => {
    it('should clear all pipeline progress', () => {
      // Arrange: 파이프라인 일부 진행
      store.dispatch(updatePipelineStep({ step: 'login' }))
      store.dispatch(updatePipelineStep({ step: 'project' }))
      store.dispatch(setPipelineData({ projectId: 'proj-123' }))

      // Act: 파이프라인 초기화
      store.dispatch(clearPipelineProgress())

      // Assert: 초기 상태로 복원
      const state = store.getState().pipeline
      expect(state.currentStep).toBe('signup')
      expect(state.completedSteps).toEqual(new Set())
      expect(state.userProgress.currentProject).toBeNull()
      expect(state.sessionData.startedAt).toBeNull()
    })
  })

  describe('에러 처리', () => {
    it('should handle invalid step transitions gracefully', () => {
      // Act: 존재하지 않는 단계로 이동 시도
      store.dispatch(updatePipelineStep({ step: 'invalid-step' as PipelineStep }))

      // Assert: 상태가 변경되지 않음
      const state = store.getState().pipeline
      expect(state.currentStep).toBe('signup')
    })

    it('should maintain data integrity on failed updates', () => {
      // Arrange: 초기 데이터 설정
      store.dispatch(updatePipelineStep({ 
        step: 'login', 
        userData: { email: 'test@example.com', id: '123' }
      }))

      // Act: 잘못된 데이터로 업데이트 시도
      store.dispatch(updatePipelineStep({ 
        step: 'project', 
        userData: null 
      }))

      // Assert: 기존 유저 데이터 보존
      const state = store.getState().pipeline
      expect(state.userProgress.profile?.email).toBe('test@example.com')
    })
  })
})