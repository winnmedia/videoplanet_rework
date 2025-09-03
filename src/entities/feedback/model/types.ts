export type FeedbackStatus = 'pending' | 'approved' | 'rejected' | 'implemented'

export type FeedbackPriority = 'low' | 'medium' | 'high' | 'urgent'

export type FeedbackType = 'general' | 'bug' | 'feature' | 'improvement' | 'question'

export interface FeedbackAttachment {
  id: number
  name: string
  url: string
  size: number
  mimeType: string
  uploadedAt: string
}

export interface FeedbackComment {
  id: number
  content: string
  author: {
    id: number
    username: string
    firstName?: string
    lastName?: string
  }
  created: string
  updated?: string
  isInternal: boolean
}

export interface Feedback {
  /** 피드백 고유 ID */
  id: number
  
  /** 프로젝트 정보 */
  project: {
    id: number
    name: string
  }
  
  /** 피드백 작성자 */
  author: {
    id: number
    username: string
    email: string
    firstName?: string
    lastName?: string
  }
  
  /** 피드백 제목 */
  title: string
  
  /** 피드백 내용 */
  content: string
  
  /** 피드백 유형 */
  type: FeedbackType
  
  /** 피드백 상태 */
  status: FeedbackStatus
  
  /** 피드백 우선순위 */
  priority: FeedbackPriority
  
  /** 관련 타임스탬프 (비디오 시간) */
  timestamp?: number
  
  /** 첨부파일 목록 */
  attachments: FeedbackAttachment[]
  
  /** 댓글 목록 */
  comments: FeedbackComment[]
  
  /** 담당자 */
  assignee?: {
    id: number
    username: string
    firstName?: string
    lastName?: string
  }
  
  /** 생성 날짜 */
  created: string
  
  /** 수정 날짜 */
  updated: string
  
  /** 해결 날짜 */
  resolvedAt?: string
  
  /** 태그 목록 */
  tags: string[]
  
  /** 내부 전용 여부 */
  isInternal: boolean
  
  /** 이메일 알림 여부 */
  emailNotification: boolean
}

export interface CreateFeedbackRequest {
  projectId: number
  title: string
  content: string
  type: FeedbackType
  priority: FeedbackPriority
  timestamp?: number
  attachments?: File[]
  tags?: string[]
  isInternal?: boolean
  emailNotification?: boolean
}

export interface UpdateFeedbackRequest {
  title?: string
  content?: string
  type?: FeedbackType
  status?: FeedbackStatus
  priority?: FeedbackPriority
  assigneeId?: number
  tags?: string[]
  isInternal?: boolean
}

export interface FeedbackFilters {
  projectId?: number
  authorId?: number
  assigneeId?: number
  status?: FeedbackStatus
  type?: FeedbackType
  priority?: FeedbackPriority
  search?: string
  tags?: string[]
  isInternal?: boolean
  dateFrom?: string
  dateTo?: string
}

export interface FeedbackListResponse {
  feedbacks: Feedback[]
  total: number
  page: number
  pageSize: number
  filters: FeedbackFilters
}

export interface FeedbackStats {
  total: number
  byStatus: Record<FeedbackStatus, number>
  byType: Record<FeedbackType, number>
  byPriority: Record<FeedbackPriority, number>
  averageResolutionTime: number
  overdueCount: number
}