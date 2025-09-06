/**
 * Video Planning Entity - Public API
 * @description Exports all video planning domain models and services
 * @layer entities
 */

// Core Domain Models
export type {
  VideoPlan,
  ProjectType,
  PlanningStage,
  TaskPriority,
  TaskStatus
} from './model/types'

// Client & Project Info
export type {
  ClientInfo,
  ProjectTimeline,
  ProjectBudget
} from './model/types'

// LLM Integration
export type {
  LLMGenerationRequest,
  LLMGenerationResponse,
  GeneratedStage,
  GeneratedTask
} from './model/types'

// Content Models
export type {
  ScriptData,
  ScriptSection,
  Shot,
  StoryboardFrame,
  FrameAnnotation
} from './model/types'

// Collaboration
export type {
  PlanningCard,
  TeamMember,
  PlanningComment,
  Attachment
} from './model/types'

// Templates & Progress
export type {
  PlanningTemplate,
  ProgressStats,
  ProjectVersion,
  ProjectSettings
} from './model/types'

// Export Operations
export type {
  ExportRequest,
  ExportResponse
} from './model/types'

// Marp PDF Export (새로운 기능)
export type {
  MarpExportOptions,
  MarpExportRequest,
  MarpExportResponse,
  MarpPdfConfig
} from './model/marp-export.schema'

export {
  validateMarpExportRequest,
  validatePdfConfig,
  safeMarpExportRequest,
  MarpExportRequestSchema,
  MarpExportResponseSchema,
  MarpPdfConfigSchema
} from './model/marp-export.schema'