/**
 * @description Video Planning Widget 타입 정의
 * @purpose 비디오 기획 시스템의 핵심 데이터 모델
 */

// 프로젝트 유형 및 템플릿
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
  | 'corporate';      // 기업 홍보

// 기획 단계
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
  | 'ready';          // 촬영 준비 완료

// 작업 우선순위
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

// 작업 상태
export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'completed' | 'blocked';

// 기획 템플릿
export interface PlanningTemplate {
  id: string;
  name: string;
  type: ProjectType;
  description: string;
  estimatedDuration: number; // 분 단위
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  defaultStages: PlanningStage[];
  scriptSections: ScriptSection[];
  suggestedShotTypes: string[];
  requiredRoles: string[];
  estimatedBudget?: {
    min: number;
    max: number;
    currency: string;
  };
}

// 대본 섹션
export interface ScriptSection {
  id: string;
  title: string;
  order: number;
  type: 'scene' | 'voiceover' | 'interview' | 'transition' | 'intro' | 'outro';
  content: string;
  duration?: number; // 초 단위
  notes?: string;
  characterCount: number;
  estimatedReadingTime: number; // 초 단위
}

// 촬영 샷
export interface Shot {
  id: string;
  shotNumber: string; // "001", "002A", etc.
  title: string;
  description: string;
  shotType: 'wide' | 'medium' | 'close_up' | 'extreme_close' | 'over_shoulder' | 'insert' | 'establishing';
  angle: 'eye_level' | 'low' | 'high' | 'dutch' | 'bird_eye' | 'worm_eye';
  movement: 'static' | 'pan' | 'tilt' | 'dolly' | 'zoom' | 'handheld' | 'steadicam';
  location: string;
  duration: number; // 초 단위
  equipment: string[];
  lighting: string;
  props: string[];
  cast: string[];
  notes: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo?: string;
  estimatedSetupTime: number; // 분 단위
  scriptSectionId?: string;
}

// 기획 보드 칸반 카드
export interface PlanningCard {
  id: string;
  title: string;
  description: string;
  stage: PlanningStage;
  type: 'task' | 'milestone' | 'note' | 'decision';
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo?: TeamMember;
  dueDate?: string; // ISO 8601
  tags: string[];
  attachments?: Attachment[];
  dependencies?: string[]; // 의존하는 다른 카드 ID들
  estimatedHours?: number;
  actualHours?: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

// 팀 멤버
export interface TeamMember {
  id: string;
  name: string;
  role: 'director' | 'producer' | 'writer' | 'cinematographer' | 'editor' | 'client' | 'reviewer';
  email: string;
  avatar?: string;
  permissions: {
    canEdit: boolean;
    canComment: boolean;
    canApprove: boolean;
    canAssign: boolean;
  };
  isOnline: boolean;
  lastSeen?: string;
}

// 첨부파일
export interface Attachment {
  id: string;
  filename: string;
  url: string;
  type: 'image' | 'document' | 'video' | 'audio' | 'other';
  size: number; // bytes
  uploadedBy: string;
  uploadedAt: string;
  thumbnail?: string;
}

// 댓글 및 협업
export interface PlanningComment {
  id: string;
  cardId?: string;
  scriptSectionId?: string;
  shotId?: string;
  content: string;
  author: TeamMember;
  createdAt: string;
  updatedAt?: string;
  mentions: string[]; // 멘션된 사용자 ID들
  attachments?: Attachment[];
  isResolved: boolean;
  parentCommentId?: string; // 답글의 경우
}

// 진행률 추적
export interface ProgressStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  completionPercentage: number;
  estimatedCompletionDate: string;
  actualHoursSpent: number;
  estimatedHoursRemaining: number;
  budgetUsed: number;
  budgetRemaining: number;
  milestones: {
    id: string;
    title: string;
    dueDate: string;
    status: TaskStatus;
    progress: number;
  }[];
}

// 버전 관리
export interface ProjectVersion {
  id: string;
  version: string; // "v1.0", "v1.1", etc.
  title: string;
  description: string;
  createdBy: string;
  createdAt: string;
  isPublished: boolean;
  isDraft: boolean;
  changes: {
    type: 'script' | 'shots' | 'schedule' | 'budget';
    description: string;
    author: string;
    timestamp: string;
  }[];
}

// 비디오 기획 프로젝트 (메인 엔티티)
export interface VideoPlanningProject {
  id: string;
  title: string;
  description: string;
  type: ProjectType;
  template?: PlanningTemplate;
  currentStage: PlanningStage;
  status: 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  priority: TaskPriority;
  
  // 기본 정보
  client: {
    id: string;
    name: string;
    company?: string;
    email: string;
  };
  
  // 일정
  startDate: string; // ISO 8601
  endDate: string;
  shootingDate?: string;
  deliveryDate: string;
  
  // 예산
  budget: {
    total: number;
    currency: string;
    breakdown: {
      preProduction: number;
      production: number;
      postProduction: number;
      miscellaneous: number;
    };
    spent: number;
    remaining: number;
  };
  
  // 팀
  teamMembers: TeamMember[];
  projectManager: string; // 팀 멤버 ID
  
  // 콘텐츠
  script: {
    sections: ScriptSection[];
    totalDuration: number;
    wordCount: number;
    lastModified: string;
    version: string;
  };
  
  shots: Shot[];
  planningCards: PlanningCard[];
  
  // 협업
  comments: PlanningComment[];
  versions: ProjectVersion[];
  
  // 메타데이터
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastActivity: string;
  
  // 설정
  settings: {
    allowPublicViewing: boolean;
    requireApproval: boolean;
    enableRealTimeCollab: boolean;
    notificationsEnabled: boolean;
  };
}

// API 응답 타입들
export interface VideoPlanningResponse {
  project: VideoPlanningProject;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface VideoPlanningListResponse {
  projects: VideoPlanningProject[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface PlanningTemplateResponse {
  templates: PlanningTemplate[];
  success: boolean;
}

// 컴포넌트 Props 타입들
export interface VideoPlanningWidgetProps {
  projectId: string;
  mode?: 'edit' | 'view' | 'present';
  showSidebar?: boolean;
  defaultStage?: PlanningStage;
  onProjectUpdate?: (project: VideoPlanningProject) => void;
  onError?: (error: string) => void;
  className?: string;
}

export interface PlanningBoardProps {
  cards: PlanningCard[];
  stages: PlanningStage[];
  teamMembers: TeamMember[];
  onCardMove: (cardId: string, newStage: PlanningStage) => void;
  onCardUpdate: (cardId: string, updates: Partial<PlanningCard>) => void;
  onCardCreate: (card: Omit<PlanningCard, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCardDelete: (cardId: string) => void;
  isReadOnly?: boolean;
  className?: string;
}

export interface ScriptEditorProps {
  sections: ScriptSection[];
  onSectionUpdate: (sectionId: string, updates: Partial<ScriptSection>) => void;
  onSectionCreate: (section: Omit<ScriptSection, 'id'>) => void;
  onSectionDelete: (sectionId: string) => void;
  onSectionReorder: (sectionIds: string[]) => void;
  isReadOnly?: boolean;
  showWordCount?: boolean;
  showTimingInfo?: boolean;
  className?: string;
}

export interface ShotListProps {
  shots: Shot[];
  scriptSections: ScriptSection[];
  teamMembers: TeamMember[];
  onShotUpdate: (shotId: string, updates: Partial<Shot>) => void;
  onShotCreate: (shot: Omit<Shot, 'id'>) => void;
  onShotDelete: (shotId: string) => void;
  onShotReorder: (shotIds: string[]) => void;
  groupBy?: 'location' | 'date' | 'equipment' | 'cast';
  isReadOnly?: boolean;
  className?: string;
}

export interface ProgressTrackerProps {
  project: VideoPlanningProject;
  stats: ProgressStats;
  showDetailedView?: boolean;
  showBudgetInfo?: boolean;
  className?: string;
}

export interface CollaborationPanelProps {
  project: VideoPlanningProject;
  comments: PlanningComment[];
  teamMembers: TeamMember[];
  currentUser: TeamMember;
  onCommentAdd: (comment: Omit<PlanningComment, 'id' | 'createdAt' | 'author'>) => void;
  onCommentUpdate: (commentId: string, updates: Partial<PlanningComment>) => void;
  onCommentDelete: (commentId: string) => void;
  onCommentResolve: (commentId: string) => void;
  onMemberInvite: (email: string, role: TeamMember['role']) => void;
  showOnlineStatus?: boolean;
  isReadOnly?: boolean;
  className?: string;
}

// 이벤트 핸들러 타입들
export interface PlanningEvents {
  onStageChange: (projectId: string, newStage: PlanningStage) => void;
  onStatusChange: (projectId: string, newStatus: VideoPlanningProject['status']) => void;
  onTeamMemberAdd: (projectId: string, member: Omit<TeamMember, 'id'>) => void;
  onTeamMemberRemove: (projectId: string, memberId: string) => void;
  onVersionSave: (projectId: string, version: Omit<ProjectVersion, 'id' | 'createdAt'>) => void;
  onExport: (projectId: string, format: 'pdf' | 'docx' | 'csv' | 'json') => void;
}

// 유틸리티 타입들
export interface TimeEstimate {
  hours: number;
  minutes: number;
  total: number; // 분 단위 총합
  formatted: string; // "2h 30m" 형식
}

export interface BudgetBreakdown {
  category: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentage: number;
}

export interface PlanningSettings {
  autoSave: boolean;
  autoSaveInterval: number; // 초 단위
  defaultShotDuration: number;
  defaultScriptTempo: number; // 분당 단어 수
  budgetCurrency: string;
  timezone: string;
  dateFormat: string;
}