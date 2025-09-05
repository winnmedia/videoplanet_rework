/**
 * @fileoverview AI Service Entity Public API
 * @description FSD 아키텍처에 따른 공개 인터페이스
 */

// API 클라이언트
export { GeminiClient } from './api/geminiClient'
export { PromptTemplateManager } from './api/promptTemplates'

// 타입 정의
export type {
  StoryGenerationRequest,
  StoryGenerationResponse,
  PlanningStage,
  GeminiApiResponse,
  GeminiApiError,
  PromptTemplate,
  GenerationOptions,
  UsageMetrics
} from './model/types'