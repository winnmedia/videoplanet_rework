/**
 * @description Video Planning Widget Public API
 * @purpose FSD 아키텍처에 따른 위젯 인터페이스 노출
 */

// ===========================
// UI 컴포넌트 exports
// ===========================
export { VideoPlanningWidget } from './ui/VideoPlanningWidget';
export { PlanningBoard } from './ui/PlanningBoard';
export { ScriptEditor } from './ui/ScriptEditor';
export { ShotList } from './ui/ShotList';
export { ProgressTracker } from './ui/ProgressTracker';
export { CollaborationPanel } from './ui/CollaborationPanel';

// ===========================
// 타입 정의 exports
// ===========================
export type {
  // 메인 엔티티 타입들
  VideoPlanningProject,
  PlanningTemplate,
  PlanningCard,
  ScriptSection,
  Shot,
  TeamMember,
  PlanningComment,
  ProgressStats,
  ProjectVersion,

  // 열거형 타입들
  ProjectType,
  PlanningStage,
  TaskPriority,
  TaskStatus,

  // 컴포넌트 Props 타입들
  VideoPlanningWidgetProps,
  PlanningBoardProps,
  ScriptEditorProps,
  ShotListProps,
  ProgressTrackerProps,
  CollaborationPanelProps,

  // API 응답 타입들
  VideoPlanningResponse,
  VideoPlanningListResponse,
  PlanningTemplateResponse,

  // 이벤트 핸들러 타입들
  PlanningEvents,

  // 유틸리티 타입들
  TimeEstimate,
  BudgetBreakdown,
  PlanningSettings,
  Attachment
} from './model/types';

// ===========================
// API 및 유틸리티 exports
// ===========================
export { VideoPlanningApi, planningUtils } from './api/planningApi';

// ===========================
// 기본 export (메인 위젯)
// ===========================
export { VideoPlanningWidget as default } from './ui/VideoPlanningWidget';