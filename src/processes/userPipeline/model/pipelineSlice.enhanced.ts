/**
 * @file Enhanced Pipeline Slice
 * @description 직렬화 최적화 및 고도화된 파이프라인 상태 관리
 */

import { createSlice, createSelector, type PayloadAction } from '@reduxjs/toolkit'
import { 
  type PipelineStep,
  type UserProgress,
  type SessionData,
  type User,
  type Project,
  type OptimisticUpdateMeta
} from '@/shared/types/store'

// ============================================================================
// 상태 인터페이스 정의
// ============================================================================

export interface EnhancedPipelineState {
  // 기본 파이프라인 상태
  currentStep: PipelineStep
  completedSteps: PipelineStep[] // Set 대신 배열 사용으로 직렬화 해결
  userProgress: UserProgress
  sessionData: SessionData
  isLoading: boolean
  error: string | null

  // 고급 기능
  optimisticUpdates: Record<string, OptimisticUpdateMeta>
  lastSyncTimestamp: string | null
  transitionHistory: Array<{
    from: PipelineStep
    to: PipelineStep
    timestamp: string
    metadata?: Record<string, any>
  }>
}

// ============================================================================
// 초기 상태
// ============================================================================

const initialState: EnhancedPipelineState = {
  currentStep: 'signup',
  completedSteps: [],
  userProgress: {
    profile: null,
    projects: [],
    currentProject: null,
    planningDrafts: []
  },
  sessionData: {
    startedAt: null,
    lastActivity: null,
    timeSpent: 0
  },
  isLoading: false,
  error: null,
  optimisticUpdates: {},
  lastSyncTimestamp: null,
  transitionHistory: []
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

const PIPELINE_ORDER: PipelineStep[] = [
  'signup',
  'login', 
  'project',
  'invite',
  'planning',
  'prompt',
  'feedback'
]

/**
 * 단계 전환 유효성 검사
 */
const isValidStepTransition = (
  currentStep: PipelineStep, 
  targetStep: PipelineStep
): boolean => {
  const currentIndex = PIPELINE_ORDER.indexOf(currentStep)
  const targetIndex = PIPELINE_ORDER.indexOf(targetStep)
  
  if (currentIndex === -1 || targetIndex === -1) {
    return false
  }
  
  // 이전 단계로 되돌아가기 방지 (같은 단계는 허용)
  return targetIndex >= currentIndex
}

/**
 * 배열에서 중복 제거 (순서 유지)
 */
const addToCompletedSteps = (
  completedSteps: PipelineStep[], 
  step: PipelineStep
): PipelineStep[] => {
  if (completedSteps.includes(step)) {
    return completedSteps
  }
  return [...completedSteps, step]
}

/**
 * 현재 시간 ISO 문자열 반환
 */
const getCurrentTimestamp = (): string => new Date().toISOString()

// ============================================================================
// 슬라이스 정의
// ============================================================================

export const enhancedPipelineSlice = createSlice({
  name: 'pipeline',
  initialState,
  reducers: {
    /**
     * 파이프라인 단계 업데이트 (기본)
     */
    updatePipelineStep: (
      state, 
      action: PayloadAction<{
        step: PipelineStep
        userData?: Partial<User>
        sessionData?: Partial<SessionData>
      }>
    ) => {
      const { step, userData, sessionData } = action.payload
      
      // 유효한 단계 전환 체크
      if (!isValidStepTransition(state.currentStep, step)) {
        console.warn(`Invalid step transition from ${state.currentStep} to ${step}`)
        return
      }
      
      // 전환 이력 기록
      if (state.currentStep !== step) {
        state.transitionHistory.push({
          from: state.currentStep,
          to: step,
          timestamp: getCurrentTimestamp(),
          metadata: { userData, sessionData }
        })
        
        // 이전 단계를 완료 목록에 추가
        state.completedSteps = addToCompletedSteps(state.completedSteps, state.currentStep)
      }
      
      // 현재 단계 업데이트
      state.currentStep = step
      
      // 사용자 데이터 업데이트
      if (userData !== undefined && userData !== null) {
        state.userProgress.profile = {
          ...state.userProgress.profile,
          ...userData
        } as User
      }
      
      // 세션 데이터 업데이트
      if (sessionData) {
        state.sessionData = {
          ...state.sessionData,
          ...sessionData
        }
      }
      
      // 마지막 활동 시간 업데이트
      state.sessionData.lastActivity = getCurrentTimestamp()
      state.lastSyncTimestamp = getCurrentTimestamp()
    },

    /**
     * 파이프라인 데이터 설정
     */
    setPipelineData: (
      state,
      action: PayloadAction<{
        projectId?: string
        projectData?: Omit<Project, 'id'>
        planningData?: any
      }>
    ) => {
      const { projectId, projectData, planningData } = action.payload
      
      if (projectId && projectData) {
        const newProject: Project = {
          id: projectId,
          createdAt: getCurrentTimestamp(),
          status: 'draft',
          ...projectData
        }
        
        state.userProgress.projects.push(newProject)
        state.userProgress.currentProject = projectId
      }
      
      if (planningData) {
        state.userProgress.planningDrafts.push(planningData)
      }
      
      state.lastSyncTimestamp = getCurrentTimestamp()
    },

    /**
     * 배치 업데이트 - 여러 상태를 원자적으로 업데이트
     */
    batchUpdatePipeline: (
      state,
      action: PayloadAction<{
        step?: PipelineStep
        userData?: Partial<User>
        projectData?: { id: string } & Omit<Project, 'id'>
        sessionData?: Partial<SessionData>
      }>
    ) => {
      const { step, userData, projectData, sessionData } = action.payload
      
      // 단계 업데이트
      if (step && isValidStepTransition(state.currentStep, step)) {
        if (state.currentStep !== step) {
          state.completedSteps = addToCompletedSteps(state.completedSteps, state.currentStep)
          state.transitionHistory.push({
            from: state.currentStep,
            to: step,
            timestamp: getCurrentTimestamp(),
            metadata: { userData, projectData, sessionData }
          })
        }
        state.currentStep = step
      }
      
      // 사용자 데이터 업데이트
      if (userData) {
        state.userProgress.profile = {
          ...state.userProgress.profile,
          ...userData
        } as User
      }
      
      // 프로젝트 데이터 업데이트
      if (projectData) {
        const newProject: Project = {
          createdAt: getCurrentTimestamp(),
          status: 'draft',
          ...projectData
        }
        state.userProgress.projects.push(newProject)
        state.userProgress.currentProject = projectData.id
      }
      
      // 세션 데이터 업데이트
      if (sessionData) {
        state.sessionData = {
          ...state.sessionData,
          ...sessionData
        }
      }
      
      state.sessionData.lastActivity = getCurrentTimestamp()
      state.lastSyncTimestamp = getCurrentTimestamp()
    },

    /**
     * 외부 상태와 동기화 (예: 인증 상태)
     */
    syncWithAuthState: (
      state,
      action: PayloadAction<{
        isAuthenticated: boolean
        user?: User
        targetStep?: PipelineStep
      }>
    ) => {
      const { isAuthenticated, user, targetStep } = action.payload
      
      if (isAuthenticated && user) {
        state.userProgress.profile = user
        
        // 인증 완료 시 적절한 단계로 이동
        if (targetStep && isValidStepTransition(state.currentStep, targetStep)) {
          // login 단계까지 완료된 것으로 처리
          state.completedSteps = addToCompletedSteps(state.completedSteps, 'signup')
          state.completedSteps = addToCompletedSteps(state.completedSteps, 'login')
          state.currentStep = targetStep
        }
      }
      
      state.lastSyncTimestamp = getCurrentTimestamp()
    },

    /**
     * 낙관적 업데이트
     */
    optimisticProjectUpdate: (
      state,
      action: PayloadAction<{
        project: Project
        optimisticId: string
      }>
    ) => {
      const { project, optimisticId } = action.payload
      
      // 낙관적 업데이트 메타데이터 저장
      state.optimisticUpdates[optimisticId] = {
        id: optimisticId,
        type: 'create',
        timestamp: getCurrentTimestamp(),
        rollbackData: {
          projectsCount: state.userProgress.projects.length,
          currentProject: state.userProgress.currentProject
        }
      }
      
      // 즉시 상태 업데이트
      state.userProgress.projects.push(project)
      state.userProgress.currentProject = project.id
    },

    /**
     * 낙관적 업데이트 확인
     */
    confirmOptimisticUpdate: (
      state,
      action: PayloadAction<{ optimisticId: string; finalData?: any }>
    ) => {
      const { optimisticId, finalData } = action.payload
      
      if (state.optimisticUpdates[optimisticId]) {
        // 최종 데이터로 교체 (필요시)
        if (finalData) {
          // 구체적인 업데이트 로직 구현
        }
        
        // 낙관적 업데이트 메타데이터 제거
        delete state.optimisticUpdates[optimisticId]
      }
    },

    /**
     * 낙관적 업데이트 롤백
     */
    rollbackOptimisticUpdate: (
      state,
      action: PayloadAction<{ optimisticId: string }>
    ) => {
      const { optimisticId } = action.payload
      const updateMeta = state.optimisticUpdates[optimisticId]
      
      if (updateMeta && updateMeta.rollbackData) {
        // 롤백 데이터를 사용해 상태 복원
        if (updateMeta.type === 'create' && updateMeta.rollbackData.projectsCount !== undefined) {
          state.userProgress.projects = state.userProgress.projects.slice(0, updateMeta.rollbackData.projectsCount)
          state.userProgress.currentProject = updateMeta.rollbackData.currentProject
        }
        
        // 낙관적 업데이트 메타데이터 제거
        delete state.optimisticUpdates[optimisticId]
      }
    },

    /**
     * 파이프라인 진행 상황 초기화
     */
    clearPipelineProgress: (state) => {
      state.currentStep = 'signup'
      state.completedSteps = []
      state.userProgress = {
        profile: null,
        projects: [],
        currentProject: null,
        planningDrafts: []
      }
      state.sessionData = {
        startedAt: null,
        lastActivity: null,
        timeSpent: 0
      }
      state.isLoading = false
      state.error = null
      state.optimisticUpdates = {}
      state.transitionHistory = []
      state.lastSyncTimestamp = getCurrentTimestamp()
    },

    /**
     * 로딩 상태 설정
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    /**
     * 에러 상태 설정
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    }
  }
})

// ============================================================================
// 액션 내보내기
// ============================================================================

export const {
  updatePipelineStep,
  setPipelineData,
  batchUpdatePipeline,
  syncWithAuthState,
  optimisticProjectUpdate,
  confirmOptimisticUpdate,
  rollbackOptimisticUpdate,
  clearPipelineProgress,
  setLoading,
  setError
} = enhancedPipelineSlice.actions

// ============================================================================
// Memoized Selectors
// ============================================================================

// 기본 상태 선택자
export const selectPipelineState = (state: { pipeline: EnhancedPipelineState }) => state.pipeline

// 현재 단계
export const selectCurrentStep = createSelector(
  [selectPipelineState],
  (pipeline) => pipeline.currentStep
)

// 완료된 단계들
export const selectCompletedSteps = createSelector(
  [selectPipelineState],
  (pipeline) => pipeline.completedSteps
)

// 사용자 진행상황
export const selectUserProgress = createSelector(
  [selectPipelineState],
  (pipeline) => pipeline.userProgress
)

// 세션 데이터
export const selectSessionData = createSelector(
  [selectPipelineState],
  (pipeline) => pipeline.sessionData
)

// 특정 단계로 이동 가능 여부
export const selectCanMoveToStep = createSelector(
  [selectCurrentStep, (_state, targetStep: PipelineStep) => targetStep],
  (currentStep, targetStep) => isValidStepTransition(currentStep, targetStep)
)

// 특정 단계 완료 여부
export const selectIsStepCompleted = createSelector(
  [selectCompletedSteps, (_state, step: PipelineStep) => step],
  (completedSteps, step) => completedSteps.includes(step)
)

// 전체 진행률 계산
export const selectPipelineProgress = createSelector(
  [selectCurrentStep, selectCompletedSteps],
  (currentStep, completedSteps) => {
    const currentStepIndex = PIPELINE_ORDER.indexOf(currentStep)
    const completedCount = completedSteps.length
    const totalSteps = PIPELINE_ORDER.length
    
    return {
      completed: completedCount,
      total: totalSteps,
      currentStepIndex,
      percentage: (completedCount / totalSteps) * 100
    }
  }
)

// 낙관적 업데이트 상태
export const selectOptimisticUpdates = createSelector(
  [selectPipelineState],
  (pipeline) => pipeline.optimisticUpdates
)

// 전환 이력
export const selectTransitionHistory = createSelector(
  [selectPipelineState],
  (pipeline) => pipeline.transitionHistory
)

// 마지막 동기화 시간
export const selectLastSyncTimestamp = createSelector(
  [selectPipelineState],
  (pipeline) => pipeline.lastSyncTimestamp
)

// ============================================================================
// 기본 리듀서 내보내기
// ============================================================================

export default enhancedPipelineSlice.reducer