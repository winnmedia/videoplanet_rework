/**
 * @fileoverview 영상 기획 위저드 Feature Public API
 * @description FSD 아키텍처에 따른 feature 레이어 export
 */

// ============================
// UI 컴포넌트 exports
// ============================
export { VideoPlanningWizard } from './ui/VideoPlanningWizard'
export { PlanningInputForm } from './ui/PlanningInputForm'
export { FourStagesReview } from './ui/FourStagesReview'
export { TwelveShotsEditor } from './ui/TwelveShotsEditor'

// ============================
// API 서비스 exports
// ============================
export { VideoPlanningWizardApi, videoPlanningUtils } from './api/videoPlanningApi'

// ============================
// 타입 정의 exports
// ============================
export type {
  // 기본 데이터 타입
  ToneManner,
  Genre,
  Target,
  Duration,
  Format,
  Tempo,
  StoryStructure,
  StoryIntensity,
  PresetType,

  // 단계별 데이터 타입
  PlanningInput,
  PresetConfig,
  PlanningStage,
  FourStagesPlan,
  VideoShot,
  InsertShot,
  TwelveShotsPlan,

  // 숏 관련 세부 타입
  ShotType,
  CameraMove,
  Composition,
  Transition,

  // 내보내기 관련 타입
  ExportOptions,
  ExportResult,

  // API 요청/응답 타입
  GenerateStagesRequest,
  GenerateStagesResponse,
  GenerateShotsRequest,
  GenerateShotsResponse,
  GenerateStoryboardRequest,
  GenerateStoryboardResponse,
  ExportPlanRequest,
  ExportPlanResponse,

  // 컴포넌트 Props 타입
  VideoPlanningWizardProps,
  PlanningInputFormProps,
  FourStagesReviewProps,
  TwelveShotsEditorProps,

  // 위저드 상태 관리 타입
  WizardStep,
  WizardState,
  WizardActions,

  // 유틸리티 타입
  RequiredFields,
  OptionalFields
} from './model/types'

// ============================
// 상수 exports
// ============================
export { PRESETS } from './model/types'