/**
 * ConflictDetection Feature - Public API
 * FSD 아키텍처 준수: 외부 접근은 이 배럴 파일을 통해서만
 */

// UI 컴포넌트
export { ConflictDetectionSystem } from './ui/ConflictDetectionSystem'

// 타입 정의
export type {
  ConflictInfo,
  ConflictDetectionResult,
  ConflictResolutionAction,
  ConflictDetectionOptions
} from './model/types'

export {
  ConflictSeverity,
  ConflictResolution
} from './model/types'