import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { StoryData, Act4Data, Shot12Data } from './schemas'

// Step enumeration
export const PLANNING_STEPS = {
  STORY: 1,
  ACTS: 2,
  SHOTS: 3
} as const

export type PlanningStep = typeof PLANNING_STEPS[keyof typeof PLANNING_STEPS]

// Form data for step 1
export interface StoryFormData {
  outline: string
  genre: string
  targetLength: string
}

// Validation errors
export interface ValidationErrors {
  outline?: string
  genre?: string
  targetLength?: string
}

// Planning state interface
export interface PlanningState {
  // Current wizard state
  currentStep: PlanningStep
  projectId: string | null
  
  // Form data
  formData: StoryFormData
  validationErrors: ValidationErrors
  
  // Generated data
  storyData: StoryData | null
  actData: Act4Data | null
  shotData: Shot12Data | null
  
  // UI states
  isLoading: boolean
  error: string | null
  exportSuccess: boolean
}

// Initial state
const initialState: PlanningState = {
  currentStep: PLANNING_STEPS.STORY,
  projectId: null,
  
  formData: {
    outline: '',
    genre: '',
    targetLength: ''
  },
  validationErrors: {},
  
  storyData: null,
  actData: null,
  shotData: null,
  
  isLoading: false,
  error: null,
  exportSuccess: false
}

// Planning slice
export const planningSlice = createSlice({
  name: 'planning',
  initialState,
  reducers: {
    // Initialize planning wizard
    initializePlanning: (state, action: PayloadAction<{ projectId: string }>) => {
      state.projectId = action.payload.projectId
      state.currentStep = PLANNING_STEPS.STORY
      state.formData = initialState.formData
      state.validationErrors = {}
      state.storyData = null
      state.actData = null
      state.shotData = null
      state.error = null
      state.exportSuccess = false
    },
    
    // Step navigation
    setCurrentStep: (state, action: PayloadAction<PlanningStep>) => {
      const step = action.payload
      
      // Validate step accessibility
      if (step === PLANNING_STEPS.STORY) {
        state.currentStep = step
      } else if (step === PLANNING_STEPS.ACTS && state.storyData) {
        state.currentStep = step
      } else if (step === PLANNING_STEPS.SHOTS && state.actData) {
        state.currentStep = step
      }
      
      // Clear error when changing steps
      state.error = null
      state.validationErrors = {}
    },
    
    // Form data management
    updateFormField: (state, action: PayloadAction<{ field: keyof StoryFormData; value: string }>) => {
      const { field, value } = action.payload
      state.formData[field] = value
      
      // Clear related validation error
      if (state.validationErrors[field]) {
        delete state.validationErrors[field]
      }
    },
    
    setValidationErrors: (state, action: PayloadAction<ValidationErrors>) => {
      state.validationErrors = action.payload
    },
    
    clearValidationErrors: (state) => {
      state.validationErrors = {}
    },
    
    // Loading states
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
      if (action.payload) {
        state.error = null // Clear error when starting new operation
      }
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
      state.isLoading = false
    },
    
    clearError: (state) => {
      state.error = null
    },
    
    // Data management
    setStoryData: (state, action: PayloadAction<StoryData>) => {
      state.storyData = action.payload
      state.isLoading = false
      state.error = null
      state.currentStep = PLANNING_STEPS.ACTS
    },
    
    setActData: (state, action: PayloadAction<Act4Data>) => {
      state.actData = action.payload
      state.isLoading = false
      state.error = null
      state.currentStep = PLANNING_STEPS.SHOTS
    },
    
    setShotData: (state, action: PayloadAction<Shot12Data>) => {
      state.shotData = action.payload
      state.isLoading = false
      state.error = null
    },
    
    // Export status
    setExportSuccess: (state, action: PayloadAction<boolean>) => {
      state.exportSuccess = action.payload
      if (action.payload) {
        state.isLoading = false
        state.error = null
      }
    },
    
    // Reset wizard
    resetPlanning: (state) => {
      return {
        ...initialState,
        projectId: state.projectId // Keep project ID
      }
    },
    
    // Clear all data
    clearPlanning: () => {
      return initialState
    }
  }
})

// Export actions
export const {
  initializePlanning,
  setCurrentStep,
  updateFormField,
  setValidationErrors,
  clearValidationErrors,
  setLoading,
  setError,
  clearError,
  setStoryData,
  setActData,
  setShotData,
  setExportSuccess,
  resetPlanning,
  clearPlanning
} = planningSlice.actions

// Selectors
export const selectPlanningState = (state: { planning: PlanningState }) => state.planning
export const selectCurrentStep = (state: { planning: PlanningState }) => state.planning.currentStep
export const selectProjectId = (state: { planning: PlanningState }) => state.planning.projectId
export const selectFormData = (state: { planning: PlanningState }) => state.planning.formData
export const selectValidationErrors = (state: { planning: PlanningState }) => state.planning.validationErrors
export const selectStoryData = (state: { planning: PlanningState }) => state.planning.storyData
export const selectActData = (state: { planning: PlanningState }) => state.planning.actData
export const selectShotData = (state: { planning: PlanningState }) => state.planning.shotData
export const selectIsLoading = (state: { planning: PlanningState }) => state.planning.isLoading
export const selectError = (state: { planning: PlanningState }) => state.planning.error
export const selectExportSuccess = (state: { planning: PlanningState }) => state.planning.exportSuccess

// Computed selectors
export const selectCanGoToActs = (state: { planning: PlanningState }) => 
  Boolean(state.planning.storyData)

export const selectCanGoToShots = (state: { planning: PlanningState }) => 
  Boolean(state.planning.actData)

export const selectCanExport = (state: { planning: PlanningState }) => 
  Boolean(state.planning.storyData && state.planning.actData && state.planning.shotData)

export const selectProgress = (state: { planning: PlanningState }) => {
  const step = state.planning.currentStep
  if (step === PLANNING_STEPS.STORY) return 33
  if (step === PLANNING_STEPS.ACTS) return 66
  return 100
}

export const selectIsFormValid = (state: { planning: PlanningState }) => {
  const { outline, genre, targetLength } = state.planning.formData
  return Boolean(outline.trim() && genre && targetLength)
}

// Export reducer
export default planningSlice.reducer