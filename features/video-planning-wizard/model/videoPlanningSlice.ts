/**
 * @fileoverview Video Planning Wizard Redux Slice
 * @description 영상 기획 위저드의 전체 상태를 관리하는 Redux Toolkit 2.0 slice
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { VideoPlanningWizardApi } from '../api/videoPlanningApi'

import type {
  WizardStep,
  WizardState,
  PlanningInput,
  PlanningStage,
  VideoShot,
  InsertShot,
  ExportOptions
} from './types'

// ============================
// 비동기 액션 (Thunks)
// ============================

/**
 * STEP 1 → STEP 2: 4단계 기획 생성 (기존 방식)
 */
export const generateFourStages = createAsyncThunk(
  'videoPlanningWizard/generateFourStages',
  async (input: PlanningInput, { rejectWithValue }) => {
    try {
      const stages = await VideoPlanningWizardApi.generateFourStages(input)
      return { input, stages, isAIGenerated: false }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '4단계 기획 생성에 실패했습니다.'
      return rejectWithValue(errorMessage)
    }
  }
)

/**
 * STEP 1 → STEP 2: AI 기반 4단계 기획 생성 (신규 기능)
 */
export const generateFourStagesWithAI = createAsyncThunk(
  'videoPlanningWizard/generateFourStagesWithAI',
  async (input: PlanningInput, { rejectWithValue }) => {
    try {
      const stages = await VideoPlanningWizardApi.generateFourStagesWithAI(input)
      return { input, stages, isAIGenerated: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'AI 기반 4단계 기획 생성에 실패했습니다.'
      return rejectWithValue(errorMessage)
    }
  }
)

/**
 * STEP 2 → STEP 3: 12개 숏 생성
 */
export const generateTwelveShots = createAsyncThunk(
  'videoPlanningWizard/generateTwelveShots',
  async (
    { stages, originalInput }: { stages: PlanningStage[]; originalInput: PlanningInput },
    { rejectWithValue }
  ) => {
    try {
      const result = await VideoPlanningWizardApi.generateTwelveShots(stages, originalInput)
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '12개 숏 생성에 실패했습니다.'
      return rejectWithValue(errorMessage)
    }
  }
)

/**
 * 개별 숏의 스토리보드 생성
 */
export const generateStoryboard = createAsyncThunk(
  'videoPlanningWizard/generateStoryboard',
  async ({ shotId, shot }: { shotId: string; shot: VideoShot }, { rejectWithValue }) => {
    try {
      const storyboardUrl = await VideoPlanningWizardApi.generateStoryboard(shot)
      return { shotId, storyboardUrl }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '스토리보드 생성에 실패했습니다.'
      return rejectWithValue({ shotId, error: errorMessage })
    }
  }
)

/**
 * 기획서 내보내기 (JSON/PDF)
 */
export const exportPlan = createAsyncThunk(
  'videoPlanningWizard/exportPlan',
  async (
    {
      fourStagesPlan,
      twelveShotsPlan,
      options,
    }: {
      fourStagesPlan: any
      twelveShotsPlan: any
      options: ExportOptions
    },
    { rejectWithValue }
  ) => {
    try {
      const downloadUrl = await VideoPlanningWizardApi.exportPlan(fourStagesPlan, twelveShotsPlan, options)
      return { downloadUrl, format: options.format }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '기획서 내보내기에 실패했습니다.'
      return rejectWithValue(errorMessage)
    }
  }
)

/**
 * 프로젝트 저장
 */
export const savePlanningProject = createAsyncThunk(
  'videoPlanningWizard/savePlanningProject',
  async (
    projectData: {
      title: string
      input: PlanningInput
      stages: PlanningStage[]
      shots: VideoShot[]
      insertShots: InsertShot[]
    },
    { rejectWithValue }
  ) => {
    try {
      const projectId = await VideoPlanningWizardApi.savePlanningProject(projectData)
      return { projectId, projectData }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '프로젝트 저장에 실패했습니다.'
      return rejectWithValue(errorMessage)
    }
  }
)

// ============================
// 초기 상태
// ============================

const initialState: WizardState = {
  // 위저드 단계
  currentStep: 1,
  
  // 입력 데이터
  input: {
    title: '',
    logline: '',
    toneManner: '잔잔',
    genre: '드라마',
    target: '20대',
    duration: '60초',
    format: '실사 촬영',
    tempo: '보통',
    storyStructure: '기승전결',
    storyIntensity: '적당히',
  },
  
  // 생성된 데이터
  stages: [],
  shots: [],
  insertShots: [],
  
  // AI 생성 관련
  isAIGenerated: false,
  aiGenerationMode: 'standard', // 'standard' | 'ai'
  
  // UI 상태
  isLoading: false,
  error: null,
}

// ============================
// Slice 정의
// ============================

const videoPlanningWizardSlice = createSlice({
  name: 'videoPlanningWizard',
  initialState,
  reducers: {
    // 단계 이동
    setStep: (state, action: PayloadAction<WizardStep>) => {
      state.currentStep = action.payload
      state.error = null // 단계 변경 시 에러 초기화
    },
    
    // 입력 데이터 업데이트
    setInput: (state, action: PayloadAction<Partial<PlanningInput>>) => {
      state.input = { ...state.input, ...action.payload }
    },
    
    // AI 생성 모드 설정
    setAIGenerationMode: (state, action: PayloadAction<'standard' | 'ai'>) => {
      state.aiGenerationMode = action.payload
    },
    
    // 4단계 업데이트
    updateStage: (state, action: PayloadAction<{ stageId: string; updates: Partial<PlanningStage> }>) => {
      const { stageId, updates } = action.payload
      const stageIndex = state.stages.findIndex(stage => stage.id === stageId)
      if (stageIndex !== -1) {
        state.stages[stageIndex] = { ...state.stages[stageIndex], ...updates }
      }
    },
    
    // 12숏 업데이트
    updateShot: (state, action: PayloadAction<{ shotId: string; updates: Partial<VideoShot> }>) => {
      const { shotId, updates } = action.payload
      const shotIndex = state.shots.findIndex(shot => shot.id === shotId)
      if (shotIndex !== -1) {
        state.shots[shotIndex] = { ...state.shots[shotIndex], ...updates }
      }
    },
    
    // 인서트 숏 업데이트
    updateInsertShot: (state, action: PayloadAction<{ insertId: string; updates: Partial<InsertShot> }>) => {
      const { insertId, updates } = action.payload
      const insertIndex = state.insertShots.findIndex(insert => insert.id === insertId)
      if (insertIndex !== -1) {
        state.insertShots[insertIndex] = { ...state.insertShots[insertIndex], ...updates }
      }
    },
    
    // 로딩 상태 직접 설정 (내부 작업용)
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
      if (action.payload) {
        state.error = null // 로딩 시작 시 에러 초기화
      }
    },
    
    // 에러 상태 직접 설정
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      if (action.payload) {
        state.isLoading = false // 에러 발생 시 로딩 종료
      }
    },
    
    // 전체 상태 초기화
    reset: () => initialState,
    
    // 현재 단계 데이터 초기화 (되돌리기용)
    resetCurrentStageData: (state) => {
      switch (state.currentStep) {
        case 2:
          state.stages = []
          break
        case 3:
          state.shots = []
          state.insertShots = []
          break
        default:
          break
      }
      state.error = null
    },
  },
  
  extraReducers: (builder) => {
    // ============================
    // generateFourStages
    // ============================
    builder
      .addCase(generateFourStages.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(generateFourStages.fulfilled, (state, action) => {
        state.isLoading = false
        state.input = action.payload.input
        state.stages = action.payload.stages
        state.isAIGenerated = action.payload.isAIGenerated
        state.currentStep = 2 // 자동으로 STEP 2로 이동
        state.error = null
      })
      .addCase(generateFourStages.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
    // ============================
    // generateFourStagesWithAI (신규)
    // ============================
      .addCase(generateFourStagesWithAI.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(generateFourStagesWithAI.fulfilled, (state, action) => {
        state.isLoading = false
        state.input = action.payload.input
        state.stages = action.payload.stages
        state.isAIGenerated = action.payload.isAIGenerated
        state.aiGenerationMode = 'ai'
        state.currentStep = 2 // 자동으로 STEP 2로 이동
        state.error = null
      })
      .addCase(generateFourStagesWithAI.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
    // ============================
    // generateTwelveShots
    // ============================
      .addCase(generateTwelveShots.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(generateTwelveShots.fulfilled, (state, action) => {
        state.isLoading = false
        state.shots = action.payload.shots
        state.insertShots = action.payload.insertShots
        state.currentStep = 3 // 자동으로 STEP 3으로 이동
        state.error = null
      })
      .addCase(generateTwelveShots.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
    // ============================
    // generateStoryboard
    // ============================
      .addCase(generateStoryboard.pending, (state, action) => {
        state.isLoading = true
        state.error = null
        
        // 개별 숏의 로딩 상태는 컴포넌트에서 관리 (optimistic update)
      })
      .addCase(generateStoryboard.fulfilled, (state, action) => {
        state.isLoading = false
        const { shotId, storyboardUrl } = action.payload
        
        // 해당 숏에 스토리보드 URL 업데이트
        const shotIndex = state.shots.findIndex(shot => shot.id === shotId)
        if (shotIndex !== -1) {
          state.shots[shotIndex].storyboardUrl = storyboardUrl
        }
        
        state.error = null
      })
      .addCase(generateStoryboard.rejected, (state, action) => {
        state.isLoading = false
        const payload = action.payload as { shotId: string; error: string }
        state.error = payload.error
        
        // 개별 숏 에러는 컴포넌트에서 처리
      })
      
    // ============================
    // exportPlan
    // ============================
      .addCase(exportPlan.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(exportPlan.fulfilled, (state, action) => {
        state.isLoading = false
        state.error = null
        // 다운로드는 컴포넌트에서 처리
        // action.payload에 downloadUrl과 format이 있음
      })
      .addCase(exportPlan.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
      
    // ============================
    // savePlanningProject
    // ============================
      .addCase(savePlanningProject.pending, (state) => {
        state.isLoading = true
        state.error = null
      })
      .addCase(savePlanningProject.fulfilled, (state) => {
        state.isLoading = false
        state.error = null
        // 저장 성공 알림은 컴포넌트에서 처리
      })
      .addCase(savePlanningProject.rejected, (state, action) => {
        state.isLoading = false
        state.error = action.payload as string
      })
  },
})

// ============================
// 액션 내보내기
// ============================

export const {
  setStep,
  setInput,
  setAIGenerationMode,
  updateStage,
  updateShot,
  updateInsertShot,
  setLoading,
  setError,
  reset,
  resetCurrentStageData,
} = videoPlanningWizardSlice.actions

// ============================
// 셀렉터
// ============================

export const selectWizardState = (state: { videoPlanningWizard: WizardState }) => state.videoPlanningWizard
export const selectCurrentStep = (state: { videoPlanningWizard: WizardState }) => state.videoPlanningWizard.currentStep
export const selectInput = (state: { videoPlanningWizard: WizardState }) => state.videoPlanningWizard.input
export const selectStages = (state: { videoPlanningWizard: WizardState }) => state.videoPlanningWizard.stages
export const selectShots = (state: { videoPlanningWizard: WizardState }) => state.videoPlanningWizard.shots
export const selectInsertShots = (state: { videoPlanningWizard: WizardState }) => state.videoPlanningWizard.insertShots
export const selectIsLoading = (state: { videoPlanningWizard: WizardState }) => state.videoPlanningWizard.isLoading
export const selectError = (state: { videoPlanningWizard: WizardState }) => state.videoPlanningWizard.error
export const selectIsAIGenerated = (state: { videoPlanningWizard: WizardState }) => state.videoPlanningWizard.isAIGenerated
export const selectAIGenerationMode = (state: { videoPlanningWizard: WizardState }) => state.videoPlanningWizard.aiGenerationMode

// 파생 데이터 셀렉터
export const selectTotalDuration = (state: { videoPlanningWizard: WizardState }) => {
  return state.videoPlanningWizard.shots.reduce((total, shot) => total + shot.duration, 0)
}

export const selectProgressPercentage = (state: { videoPlanningWizard: WizardState }) => {
  const currentStep = state.videoPlanningWizard.currentStep
  return Math.round((currentStep / 3) * 100)
}

export const selectCanGoToNextStep = (state: { videoPlanningWizard: WizardState }) => {
  const { currentStep, input, stages, shots } = state.videoPlanningWizard
  
  switch (currentStep) {
    case 1:
      // 필수 입력 필드 확인
      return input.title?.length > 0 && input.logline?.length > 0
    case 2:
      // 4단계가 생성되어 있어야 함
      return stages.length >= 4
    case 3:
      // 12개 숏이 생성되어 있어야 함
      return shots.length >= 12
    default:
      return false
  }
}

// Reducer 내보내기
export default videoPlanningWizardSlice.reducer