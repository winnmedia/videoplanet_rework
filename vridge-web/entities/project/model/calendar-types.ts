/**
 * 캘린더 관련 프로젝트 및 페이즈 타입 정의
 * FSD entities 레이어 - 도메인 모델
 */

export type ProjectStatus = 'planning' | 'active' | 'on-hold' | 'completed' | 'cancelled'

export type PhaseType = 'pre-production' | 'production' | 'post-production' | 'review' | 'delivery'

export type ConflictLevel = 'none' | 'warning' | 'critical'

export interface Project {
  id: string
  name: string
  status: ProjectStatus
  color: string // Hex color code
  hue: number // HSL hue value for consistent theming
  organization?: string
  manager?: string
  startDate: string // ISO date string
  endDate: string // ISO date string
  description?: string
}

export interface ProjectPhase {
  id: string
  projectId: string
  name: string
  type: PhaseType
  startDate: string // ISO date string
  endDate: string // ISO date string
  status: 'pending' | 'in-progress' | 'completed' | 'blocked'
  assignedTo?: string[]
  resources?: string[]
  conflictLevel: ConflictLevel
  conflictDetails?: ConflictDetail[]
  isEditable: boolean // 권한에 따른 편집 가능 여부
  notes?: string
}

export interface ConflictDetail {
  type: 'schedule' | 'resource' | 'location'
  description: string
  conflictingPhaseIds: string[]
  severity: 'low' | 'medium' | 'high'
}

export interface CalendarFilter {
  projects: string[] // project IDs
  organizations: string[]
  assignees: string[]
  startDate?: string
  endDate?: string
  phaseTypes: PhaseType[]
  showConflictsOnly: boolean
  showMyProjectsOnly: boolean
}

export interface CalendarViewSettings {
  mode: 'month' | 'week' | 'gantt'
  showWeekends: boolean
  showWeekNumbers: boolean
  timeZone: string
}

export interface ProjectLegendItem {
  project: Project
  isVisible: boolean
  phaseCount: number
}

// 캘린더 이벤트로 변환된 페이즈 정보
export interface CalendarEvent {
  id: string
  title: string
  startDate: string
  endDate: string
  project: Project
  phase: ProjectPhase
  isConflicting: boolean
  isDraggable: boolean
  isResizable: boolean
}

// Gantt 차트용 타임라인 데이터
export interface GanttTimelineItem {
  id: string
  projectName: string
  phaseName: string
  startDate: string
  endDate: string
  progress: number // 0-100
  color: string
  conflicts: ConflictDetail[]
  dependencies?: string[] // 의존성 관계 phase IDs
}