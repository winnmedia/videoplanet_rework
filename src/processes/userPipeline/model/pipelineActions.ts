// Re-export actions from the pipeline slice
export {
  updatePipelineStep,
  setPipelineData,
  clearPipelineProgress,
  setLoading,
  setError
} from './pipelineStore'

// Export types for external usage
export type {
  PipelineStep,
  PipelineState,
  UserProfile,
  ProjectData,
  SessionData,
  UserProgress
} from './pipelineStore'