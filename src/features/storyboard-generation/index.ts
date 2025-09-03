// FSD Public API - features/storyboard-generation
export { StoryboardGrid } from './StoryboardGrid'

// 타입 re-export (편의성을 위해)
export type { 
  StoryboardGrid as StoryboardGridData,
  GeneratedImage,
  ImageGenerationRequest,
  StyleSettings
} from '@/shared/api/gemini'