import { FeedbackStatus, FeedbackPriority, FeedbackType } from '../model/types'

/**
 * 상태별 표시 설정
 */
export const FEEDBACK_STATUS_CONFIG = {
  pending: {
    label: '대기중',
    color: 'bg-admin-warning text-white',
    description: '검토 대기중인 피드백',
  },
  approved: {
    label: '승인됨',
    color: 'bg-admin-success text-white',
    description: '승인된 피드백',
  },
  rejected: {
    label: '거부됨',
    color: 'bg-admin-error text-white',
    description: '거부된 피드백',
  },
  implemented: {
    label: '구현완료',
    color: 'bg-primary-600 text-white',
    description: '구현이 완료된 피드백',
  },
} as const

/**
 * 우선순위별 표시 설정
 */
export const FEEDBACK_PRIORITY_CONFIG = {
  low: {
    label: '낮음',
    color: 'bg-neutral-200 text-neutral-700',
    sortOrder: 1,
  },
  medium: {
    label: '보통',
    color: 'bg-blue-100 text-blue-700',
    sortOrder: 2,
  },
  high: {
    label: '높음',
    color: 'bg-amber-100 text-amber-700',
    sortOrder: 3,
  },
  urgent: {
    label: '긴급',
    color: 'bg-red-100 text-red-700',
    sortOrder: 4,
  },
} as const

/**
 * 유형별 표시 설정
 */
export const FEEDBACK_TYPE_CONFIG = {
  general: {
    label: '일반',
    color: 'bg-neutral-100 text-neutral-700',
    icon: '💬',
  },
  bug: {
    label: '버그',
    color: 'bg-red-100 text-red-700',
    icon: '🐛',
  },
  feature: {
    label: '기능요청',
    color: 'bg-green-100 text-green-700',
    icon: '✨',
  },
  improvement: {
    label: '개선사항',
    color: 'bg-blue-100 text-blue-700',
    icon: '📈',
  },
  question: {
    label: '질문',
    color: 'bg-purple-100 text-purple-700',
    icon: '❓',
  },
} as const

/**
 * 상태의 표시 정보를 가져옵니다
 */
export function getStatusConfig(status: FeedbackStatus) {
  return FEEDBACK_STATUS_CONFIG[status]
}

/**
 * 우선순위의 표시 정보를 가져옵니다
 */
export function getPriorityConfig(priority: FeedbackPriority) {
  return FEEDBACK_PRIORITY_CONFIG[priority]
}

/**
 * 유형의 표시 정보를 가져옵니다
 */
export function getTypeConfig(type: FeedbackType) {
  return FEEDBACK_TYPE_CONFIG[type]
}

/**
 * 우선순위를 기준으로 정렬 순서를 반환합니다
 */
export function getPrioritySortOrder(priority: FeedbackPriority): number {
  return FEEDBACK_PRIORITY_CONFIG[priority].sortOrder
}

/**
 * 두 우선순위를 비교합니다 (높은 우선순위가 먼저)
 */
export function comparePriorities(a: FeedbackPriority, b: FeedbackPriority): number {
  return getPrioritySortOrder(b) - getPrioritySortOrder(a)
}

/**
 * 피드백이 긴급한지 확인합니다
 */
export function isUrgentFeedback(priority: FeedbackPriority): boolean {
  return priority === 'urgent' || priority === 'high'
}

/**
 * 피드백이 완료되었는지 확인합니다
 */
export function isCompletedFeedback(status: FeedbackStatus): boolean {
  return status === 'implemented' || status === 'rejected'
}

/**
 * 피드백이 처리 대기중인지 확인합니다
 */
export function isPendingFeedback(status: FeedbackStatus): boolean {
  return status === 'pending'
}

/**
 * 피드백 해결 시간을 계산합니다 (일 단위)
 */
export function calculateResolutionTime(created: string, resolvedAt?: string): number | null {
  if (!resolvedAt) return null
  
  const createdDate = new Date(created)
  const resolvedDate = new Date(resolvedAt)
  const diffTime = resolvedDate.getTime() - createdDate.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * 피드백이 지연되었는지 확인합니다 (우선순위 기반)
 */
export function isOverdueFeedback(
  created: string,
  priority: FeedbackPriority,
  status: FeedbackStatus
): boolean {
  if (isCompletedFeedback(status)) return false
  
  const createdDate = new Date(created)
  const now = new Date()
  const daysSinceCreated = (now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
  
  // 우선순위별 SLA (일)
  const slaThresholds = {
    urgent: 1,
    high: 3,
    medium: 7,
    low: 14,
  }
  
  return daysSinceCreated > slaThresholds[priority]
}

/**
 * 타임스탬프를 사람이 읽기 쉬운 형식으로 변환합니다
 */
export function formatTimestamp(seconds?: number): string {
  if (!seconds) return '-'
  
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }
  
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
}

/**
 * 파일 크기를 사람이 읽기 쉬운 형식으로 변환합니다
 */
export function formatFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)}${units[unitIndex]}`
}

/**
 * 피드백 제목을 요약합니다
 */
export function truncateFeedbackTitle(title: string, maxLength: number = 50): string {
  if (title.length <= maxLength) return title
  return `${title.slice(0, maxLength)}...`
}

/**
 * 태그를 정규화합니다 (소문자, 공백 제거)
 */
export function normalizeTag(tag: string): string {
  return tag.toLowerCase().trim().replace(/\s+/g, '-')
}

/**
 * 태그 목록을 정규화하고 중복을 제거합니다
 */
export function normalizeTags(tags: string[]): string[] {
  const normalized = tags.map(normalizeTag).filter(tag => tag.length > 0)
  return Array.from(new Set(normalized))
}