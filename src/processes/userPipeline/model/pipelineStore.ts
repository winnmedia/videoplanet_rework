import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { enableMapSet } from 'immer'

// Enable MapSet plugin for Immer
enableMapSet()

// 파이프라인 단계 타입 정의
export type PipelineStep = 
  | 'signup' 
  | 'login' 
  | 'project' 
  | 'invite' 
  | 'planning' 
  | 'prompt' 
  | 'feedback'

// 사용자 프로필 인터페이스
export interface UserProfile {
  id: string
  email: string
  name?: string
  avatar?: string
}

// 프로젝트 데이터 인터페이스
export interface ProjectData {
  id: string
  name: string
  description?: string
  createdAt: string
  status: 'draft' | 'active' | 'completed'
}

// 세션 데이터 인터페이스
export interface SessionData {
  startedAt: string | null
  lastActivity: string | null
  timeSpent: number // seconds
}

// 사용자 진행 상황 인터페이스
export interface UserProgress {
  profile: UserProfile | null
  projects: ProjectData[]
  currentProject: string | null
  planningDrafts: any[] // TODO: 타입 정의 예정
}

// 파이프라인 상태 인터페이스
export interface PipelineState {
  currentStep: PipelineStep
  completedSteps: Set<PipelineStep>
  userProgress: UserProgress
  sessionData: SessionData
  isLoading: boolean
  error: string | null
}

// 초기 상태
const initialState: PipelineState = {
  currentStep: 'signup',
  completedSteps: new Set<PipelineStep>(),
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
  error: null
}

// 파이프라인 단계 순서 정의
const PIPELINE_ORDER: PipelineStep[] = [
  'signup',
  'login', 
  'project',
  'invite',
  'planning',
  'prompt',
  'feedback'
]

// 단계 유효성 검사 함수
const isValidStepTransition = (
  currentStep: PipelineStep, 
  targetStep: PipelineStep
): boolean => {
  const currentIndex = PIPELINE_ORDER.indexOf(currentStep)
  const targetIndex = PIPELINE_ORDER.indexOf(targetStep)
  
  // 존재하지 않는 단계 체크
  if (currentIndex === -1 || targetIndex === -1) {
    return false
  }
  
  // 이전 단계로 되돌아가기 방지 (단, 같은 단계는 허용)
  return targetIndex >= currentIndex
}

// 파이프라인 슬라이스
export const pipelineSlice = createSlice({
  name: 'pipeline',
  initialState,
  reducers: {
    // 파이프라인 단계 업데이트
    updatePipelineStep: (
      state, 
      action: PayloadAction<{
        step: PipelineStep
        userData?: Partial<UserProfile>
        sessionData?: Partial<SessionData>
      }>
    ) => {
      const { step, userData, sessionData } = action.payload
      
      // 유효한 단계 전환 체크
      if (!isValidStepTransition(state.currentStep, step)) {
        return // 상태 변경 없이 반환
      }
      
      // 이전 단계를 완료 목록에 추가 (같은 단계가 아닐 경우)
      if (state.currentStep !== step) {
        state.completedSteps.add(state.currentStep)
      }
      
      // 현재 단계 업데이트
      state.currentStep = step
      
      // 사용자 데이터 업데이트
      if (userData && userData !== null) {
        state.userProgress.profile = {
          ...state.userProgress.profile,
          ...userData
        } as UserProfile
      }
      
      // 세션 데이터 업데이트
      if (sessionData) {
        state.sessionData = {
          ...state.sessionData,
          ...sessionData
        }
      }
      
      // 마지막 활동 시간 업데이트
      state.sessionData.lastActivity = new Date().toISOString()
    },

    // 파이프라인 데이터 설정
    setPipelineData: (
      state,
      action: PayloadAction<{
        projectId?: string
        projectData?: Omit<ProjectData, 'id'>
        planningData?: any
      }>
    ) => {
      const { projectId, projectData, planningData } = action.payload
      
      if (projectId && projectData) {
        // 새 프로젝트 추가
        const newProject: ProjectData = {
          id: projectId,
          createdAt: new Date().toISOString(),
          status: 'draft',
          ...projectData
        }
        
        state.userProgress.projects.push(newProject)
        state.userProgress.currentProject = projectId
      }
      
      if (planningData) {
        state.userProgress.planningDrafts.push(planningData)
      }
    },

    // 파이프라인 진행 상황 초기화
    clearPipelineProgress: (state) => {
      state.currentStep = 'signup'
      state.completedSteps.clear()
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
    },

    // 로딩 상태 설정
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    // 에러 상태 설정
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    }
  }
})

// 액션 내보내기
export const {
  updatePipelineStep,
  setPipelineData,
  clearPipelineProgress,
  setLoading,
  setError
} = pipelineSlice.actions

// 기본 리듀서 내보내기
export default pipelineSlice.reducer