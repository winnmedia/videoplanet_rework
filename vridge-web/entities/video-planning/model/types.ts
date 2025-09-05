/**
 * Video Planning Entity - Core Domain Types
 * @description Pure domain models for video planning system with LLM integration
 * @layer entities
 */

// ===========================
// Core Domain Types
// ===========================

export type ProjectType = 
  | 'brand_video'      // 브랜드 비디오
  | 'educational'      // 교육 영상
  | 'promotional'      // 홍보 영상
  | 'tutorial'         // 튜토리얼
  | 'interview'        // 인터뷰
  | 'event'           // 이벤트
  | 'documentary'     // 다큐멘터리
  | 'commercial'      // 광고
  | 'social_media'    // 소셜 미디어
  | 'corporate'       // 기업 홍보

export type PlanningStage = 
  | 'concept'          // 컨셉 기획
  | 'script'          // 대본 작성
  | 'storyboard'      // 스토리보드
  | 'shot_list'       // 촬영 리스트
  | 'schedule'        // 일정 계획
  | 'budget'          // 예산 계획
  | 'casting'         // 캐스팅
  | 'location'        // 장소 섭외
  | 'equipment'       // 장비 준비
  | 'ready'           // 촬영 준비 완료

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked'

// ===========================
// Core Domain Models
// ===========================

/**
 * Video Plan Domain Model
 * @description Central domain model for video planning
 */
export interface VideoPlan {
  id: string
  title: string
  description: string
  type: ProjectType
  template?: PlanningTemplate
  currentStage: PlanningStage
  status: 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled'
  priority: TaskPriority
  
  // 기본 정보
  client: ClientInfo
  
  // 일정
  timeline: ProjectTimeline
  
  // 예산
  budget: ProjectBudget
  
  // 팀
  teamMembers: TeamMember[]
  projectManager: string
  
  // 콘텐츠
  script: ScriptData
  shots: Shot[]
  planningCards: PlanningCard[]
  
  // 협업 & 버전
  comments: PlanningComment[]
  versions: ProjectVersion[]
  
  // 메타데이터
  createdBy: string
  createdAt: string
  updatedAt: string
  lastActivity: string
  
  // 설정
  settings: ProjectSettings
}

/**
 * Client Information Domain Model
 */
export interface ClientInfo {
  id: string
  name: string
  company?: string
  email: string
}

/**
 * Project Timeline Domain Model
 */
export interface ProjectTimeline {
  startDate: string // ISO 8601
  endDate: string
  shootingDate?: string
  deliveryDate: string
}

/**
 * Project Budget Domain Model
 */
export interface ProjectBudget {
  total: number
  currency: string
  breakdown: {
    preProduction: number
    production: number
    postProduction: number
    miscellaneous: number
  }
  spent: number
  remaining: number
}

// ===========================
// LLM Integration Domain Models
// ===========================

/**
 * LLM Service Contract
 * @description Domain interface for LLM integration services
 */
export interface LLMGenerationRequest {
  type: 'script' | 'shots' | 'storyboard' | 'stages'
  input: {
    projectType: ProjectType
    description: string
    duration?: number // 분 단위
    targetAudience?: string
    tone?: 'professional' | 'casual' | 'creative' | 'educational'
    language?: 'ko' | 'en'
    constraints?: {
      budget?: 'low' | 'medium' | 'high'
      equipment?: string[]
      location?: string[]
      teamSize?: number
    }
  }
  context?: {
    existingScript?: ScriptSection[]
    existingShots?: Shot[]
    brandGuidelines?: string
  }
}

/**
 * LLM Generation Response
 */
export interface LLMGenerationResponse {
  success: boolean
  data: {
    script?: ScriptSection[]
    shots?: Shot[]
    storyboard?: StoryboardFrame[]
    stages?: GeneratedStage[]
  }
  metadata: {
    model: string
    tokensUsed: number
    processingTime: number
    confidence: number // 0-1
  }
  suggestions?: string[]
  errors?: string[]
}

/**
 * Generated Stage Domain Model
 */
export interface GeneratedStage {
  stage: PlanningStage
  tasks: GeneratedTask[]
  estimatedDuration: number // days
  dependencies: PlanningStage[]
  recommendations: string[]
}

/**
 * Generated Task Domain Model
 */
export interface GeneratedTask {
  title: string
  description: string
  priority: TaskPriority
  estimatedHours: number
  requiredSkills: string[]
  deliverables: string[]
}

// ===========================
// Content Domain Models
// ===========================

/**
 * Script Domain Model
 */
export interface ScriptData {
  sections: ScriptSection[]
  totalDuration: number
  wordCount: number
  lastModified: string
  version: string
}

/**
 * Script Section Domain Model
 */
export interface ScriptSection {
  id: string
  title: string
  order: number
  type: 'scene' | 'voiceover' | 'interview' | 'transition' | 'intro' | 'outro'
  content: string
  duration?: number // 초 단위
  notes?: string
  characterCount: number
  estimatedReadingTime: number // 초 단위
}

/**
 * Shot Domain Model
 */
export interface Shot {
  id: string
  shotNumber: string // "001", "002A", etc.
  title: string
  description: string
  shotType: 'wide' | 'medium' | 'close_up' | 'extreme_close' | 'over_shoulder' | 'insert' | 'establishing'
  angle: 'eye_level' | 'low' | 'high' | 'dutch' | 'bird_eye' | 'worm_eye'
  movement: 'static' | 'pan' | 'tilt' | 'dolly' | 'zoom' | 'handheld' | 'steadicam'
  location: string
  duration: number // 초 단위
  equipment: string[]
  lighting: string
  props: string[]
  cast: string[]
  notes: string
  priority: TaskPriority
  status: TaskStatus
  assignedTo?: string
  estimatedSetupTime: number // 분 단위
  scriptSectionId?: string
}

/**
 * Storyboard Frame Domain Model
 */
export interface StoryboardFrame {
  id: string
  shotId: string
  frameNumber: number
  description: string
  visualNotes: string
  duration: number
  shotType: Shot['shotType']
  imageUrl?: string
  annotations?: FrameAnnotation[]
}

/**
 * Frame Annotation Domain Model
 */
export interface FrameAnnotation {
  id: string
  type: 'arrow' | 'circle' | 'text' | 'highlight'
  position: { x: number; y: number }
  content: string
  color: string
}

// ===========================
// Collaboration Domain Models
// ===========================

/**
 * Planning Card Domain Model
 */
export interface PlanningCard {
  id: string
  title: string
  description: string
  stage: PlanningStage
  type: 'task' | 'milestone' | 'note' | 'decision'
  status: TaskStatus
  priority: TaskPriority
  assignedTo?: TeamMember
  dueDate?: string // ISO 8601
  tags: string[]
  attachments?: Attachment[]
  dependencies?: string[] // 의존하는 다른 카드 ID들
  estimatedHours?: number
  actualHours?: number
  createdBy: string
  createdAt: string
  updatedAt: string
  completedAt?: string
}

/**
 * Team Member Domain Model
 */
export interface TeamMember {
  id: string
  name: string
  role: 'director' | 'producer' | 'writer' | 'cinematographer' | 'editor' | 'client' | 'reviewer'
  email: string
  avatar?: string
  permissions: {
    canEdit: boolean
    canComment: boolean
    canApprove: boolean
    canAssign: boolean
  }
  isOnline: boolean
  lastSeen?: string
}

/**
 * Planning Comment Domain Model
 */
export interface PlanningComment {
  id: string
  cardId?: string
  scriptSectionId?: string
  shotId?: string
  content: string
  author: TeamMember
  createdAt: string
  updatedAt?: string
  mentions: string[] // 멘션된 사용자 ID들
  attachments?: Attachment[]
  isResolved: boolean
  parentCommentId?: string // 답글의 경우
}

/**
 * Attachment Domain Model
 */
export interface Attachment {
  id: string
  filename: string
  url: string
  type: 'image' | 'document' | 'video' | 'audio' | 'other'
  size: number // bytes
  uploadedBy: string
  uploadedAt: string
  thumbnail?: string
}

// ===========================
// Planning Template Domain
// ===========================

/**
 * Planning Template Domain Model
 */
export interface PlanningTemplate {
  id: string
  name: string
  type: ProjectType
  description: string
  estimatedDuration: number // 분 단위
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  defaultStages: PlanningStage[]
  scriptSections: ScriptSection[]
  suggestedShotTypes: string[]
  requiredRoles: string[]
  estimatedBudget?: {
    min: number
    max: number
    currency: string
  }
}

// ===========================
// Progress & Analytics Domain
// ===========================

/**
 * Progress Stats Domain Model
 */
export interface ProgressStats {
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  blockedTasks: number
  overdueTasks: number
  completionPercentage: number
  estimatedCompletionDate: string
  actualHoursSpent: number
  estimatedHoursRemaining: number
  budgetUsed: number
  budgetRemaining: number
  milestones: {
    id: string
    title: string
    dueDate: string
    status: TaskStatus
    progress: number
  }[]
}

/**
 * Project Version Domain Model
 */
export interface ProjectVersion {
  id: string
  version: string // "v1.0", "v1.1", etc.
  title: string
  description: string
  createdBy: string
  createdAt: string
  isPublished: boolean
  isDraft: boolean
  changes: {
    type: 'script' | 'shots' | 'schedule' | 'budget'
    description: string
    author: string
    timestamp: string
  }[]
}

/**
 * Project Settings Domain Model
 */
export interface ProjectSettings {
  allowPublicViewing: boolean
  requireApproval: boolean
  enableRealTimeCollab: boolean
  notificationsEnabled: boolean
}

// ===========================
// Export Operations Domain
// ===========================

/**
 * Export Request Domain Model
 */
export interface ExportRequest {
  projectId: string
  format: 'pdf' | 'docx' | 'csv' | 'json'
  sections: {
    includeScript: boolean
    includeShotList: boolean
    includeSchedule: boolean
    includeBudget: boolean
    includeStoryboard: boolean
  }
  options: {
    includeImages: boolean
    includeComments: boolean
    language: 'ko' | 'en'
  }
}

/**
 * Export Response Domain Model
 */
export interface ExportResponse {
  success: boolean
  downloadUrl?: string
  filename: string
  fileSize: number
  expiresAt: string
  errors?: string[]
}