// Video Planning Feature Public API
// FSD 규칙에 따른 외부 노출 인터페이스

// Redux Slice exports
export {
  planningSlice,
  PLANNING_STEPS,
  // Actions
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
  clearPlanning,
  // Selectors
  selectPlanningState,
  selectCurrentStep,
  selectProjectId,
  selectFormData,
  selectValidationErrors,
  selectStoryData,
  selectActData,
  selectShotData,
  selectIsLoading,
  selectError,
  selectExportSuccess,
  selectCanGoToActs,
  selectCanGoToShots,
  selectCanExport,
  selectProgress,
  selectIsFormValid,
} from './model/planningSlice'

// RTK Query API exports  
export {
  default as planningApi,
  useGenerateStoryMutation,
  useGenerate4ActMutation,
  useGenerate12ShotMutation,
  useExportToPDFMutation,
  useExportToJSONMutation,
} from './api/planningApi'

// Types exports
export type {
  PlanningStep,
  PlanningState,
  StoryFormData,
  ValidationErrors,
  StoryData,
  ActData,
  Act4Data,
  ShotData,
  Shot12Data,
  GenerateStoryRequest,
  Generate4ActRequest,
  Generate12ShotRequest,
  ExportPlanRequest,
  StoryResponse,
  Act4Response,
  Shot12Response,
  ExportPlanResponse,
} from './model/schemas'