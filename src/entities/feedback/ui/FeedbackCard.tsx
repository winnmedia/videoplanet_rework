import { AdminCard } from 'shared/ui'
import { Feedback } from '../model/types'
import { 
  getStatusConfig, 
  getPriorityConfig, 
  getTypeConfig, 
  formatTimestamp,
  calculateResolutionTime,
  isOverdueFeedback
} from '../lib/utils'

export interface FeedbackCardProps {
  /** 피드백 데이터 */
  feedback: Feedback
  
  /** 카드 클릭 이벤트 */
  onView?: (feedback: Feedback) => void
  
  /** 피드백 편집 이벤트 */
  onEdit?: (feedback: Feedback) => void
  
  /** 피드백 삭제 이벤트 */
  onDelete?: (feedback: Feedback) => void
  
  /** 상태 변경 이벤트 */
  onStatusChange?: (feedback: Feedback, newStatus: Feedback['status']) => void
  
  /** 추가 CSS 클래스 */
  className?: string
  
  /** 테스트를 위한 ID */
  'data-testid'?: string
}

function FeedbackStatusBadge({ status }: { status: Feedback['status'] }) {
  const config = getStatusConfig(status)
  
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  )
}

function FeedbackPriorityBadge({ priority }: { priority: Feedback['priority'] }) {
  const config = getPriorityConfig(priority)
  
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  )
}

function FeedbackTypeBadge({ type }: { type: Feedback['type'] }) {
  const config = getTypeConfig(type)
  
  return (
    <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      <span className="mr-1">{config.icon}</span>
      {config.label}
    </span>
  )
}

function FeedbackMetadata({ feedback }: { feedback: Feedback }) {
  const resolutionTime = calculateResolutionTime(feedback.created, feedback.resolvedAt)
  const isOverdue = isOverdueFeedback(feedback.created, feedback.priority, feedback.status)
  const createdDate = new Date(feedback.created).toLocaleDateString('ko-KR')
  const authorName = feedback.author.firstName && feedback.author.lastName
    ? `${feedback.author.lastName}${feedback.author.firstName}`
    : feedback.author.username
  
  return (
    <div className="text-xs text-neutral-500 space-y-1">
      <div className="flex justify-between items-center">
        <span>작성자: {authorName}</span>
        {isOverdue && (
          <span className="text-red-600 font-medium">지연</span>
        )}
      </div>
      
      <div className="flex justify-between">
        <span>프로젝트: {feedback.project.name}</span>
        <span>작성일: {createdDate}</span>
      </div>
      
      {feedback.timestamp && (
        <div className="flex justify-between">
          <span>타임스탬프: {formatTimestamp(feedback.timestamp)}</span>
        </div>
      )}
      
      {resolutionTime && (
        <div className="flex justify-between">
          <span>해결 시간: {resolutionTime}일</span>
        </div>
      )}
      
      {feedback.assignee && (
        <div className="flex justify-between">
          <span>담당자:</span>
          <span className="font-medium">
            {feedback.assignee.firstName && feedback.assignee.lastName
              ? `${feedback.assignee.lastName}${feedback.assignee.firstName}`
              : feedback.assignee.username}
          </span>
        </div>
      )}
    </div>
  )
}

function FeedbackTags({ tags }: { tags: string[] }) {
  if (tags.length === 0) return null
  
  return (
    <div className="pt-2">
      <div className="flex flex-wrap gap-1">
        {tags.slice(0, 3).map((tag, index) => (
          <span
            key={index}
            className="px-2 py-1 bg-neutral-100 text-neutral-600 text-xs rounded-full"
          >
            #{tag}
          </span>
        ))}
        {tags.length > 3 && (
          <span className="px-2 py-1 bg-neutral-100 text-neutral-500 text-xs rounded-full">
            +{tags.length - 3}
          </span>
        )}
      </div>
    </div>
  )
}

function FeedbackAttachments({ attachments }: { attachments: Feedback['attachments'] }) {
  if (attachments.length === 0) return null
  
  return (
    <div className="flex items-center gap-1 text-xs text-neutral-500">
      <span>📎</span>
      <span>{attachments.length}개 첨부파일</span>
    </div>
  )
}

function FeedbackComments({ comments }: { comments: Feedback['comments'] }) {
  if (comments.length === 0) return null
  
  return (
    <div className="flex items-center gap-1 text-xs text-neutral-500">
      <span>💬</span>
      <span>{comments.length}개 댓글</span>
    </div>
  )
}

function FeedbackActions({ 
  feedback, 
  onView,
  onEdit, 
  onDelete,
  onStatusChange 
}: { 
  feedback: Feedback
  onView?: (feedback: Feedback) => void
  onEdit?: (feedback: Feedback) => void
  onDelete?: (feedback: Feedback) => void
  onStatusChange?: (feedback: Feedback, newStatus: Feedback['status']) => void
}) {
  const hasActions = onView || onEdit || onDelete || onStatusChange
  if (!hasActions) return null
  
  return (
    <div className="flex items-center gap-2">
      {onView && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onView(feedback)
          }}
          className="text-xs text-primary-600 hover:text-primary-700 focus-ring px-2 py-1 rounded"
          aria-label={`${feedback.title} 피드백 상세보기`}
        >
          보기
        </button>
      )}
      
      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(feedback)
          }}
          className="text-xs text-neutral-600 hover:text-neutral-700 focus-ring px-2 py-1 rounded"
          aria-label={`${feedback.title} 피드백 편집`}
        >
          편집
        </button>
      )}
      
      {onStatusChange && feedback.status === 'pending' && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onStatusChange(feedback, 'approved')
            }}
            className="text-xs text-green-600 hover:text-green-700 focus-ring px-2 py-1 rounded"
            aria-label={`${feedback.title} 피드백 승인`}
          >
            승인
          </button>
          
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onStatusChange(feedback, 'rejected')
            }}
            className="text-xs text-red-600 hover:text-red-700 focus-ring px-2 py-1 rounded"
            aria-label={`${feedback.title} 피드백 거부`}
          >
            거부
          </button>
        </>
      )}
      
      {onDelete && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onDelete(feedback)
          }}
          className="text-xs text-admin-error hover:text-red-700 focus-ring px-2 py-1 rounded"
          aria-label={`${feedback.title} 피드백 삭제`}
        >
          삭제
        </button>
      )}
    </div>
  )
}

export function FeedbackCard({
  feedback,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  className,
  'data-testid': testId,
}: FeedbackCardProps) {
  const truncatedContent = feedback.content.length > 120 
    ? `${feedback.content.slice(0, 120)}...`
    : feedback.content
  
  const isOverdue = isOverdueFeedback(feedback.created, feedback.priority, feedback.status)
  
  const cardVariant = isOverdue ? 'warning' : 
                     feedback.isInternal ? 'info' : 'default'
  
  const actionComponent = (
    <FeedbackActions
      feedback={feedback}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      onStatusChange={onStatusChange}
    />
  )
  
  return (
    <AdminCard
      title={feedback.title}
      action={actionComponent}
      variant={cardVariant}
      className={className}
      data-testid={testId}
      aria-label={`${feedback.title} 피드백 카드`}
    >
      <div className="space-y-3">
        {/* 배지들 */}
        <div className="flex items-center gap-2 flex-wrap">
          <FeedbackStatusBadge status={feedback.status} />
          <FeedbackPriorityBadge priority={feedback.priority} />
          <FeedbackTypeBadge type={feedback.type} />
          {feedback.isInternal && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
              내부전용
            </span>
          )}
        </div>
        
        {/* 피드백 내용 미리보기 */}
        <div className="text-sm text-neutral-700">
          {truncatedContent}
        </div>
        
        {/* 메타데이터 */}
        <FeedbackMetadata feedback={feedback} />
        
        {/* 첨부파일 및 댓글 */}
        <div className="flex items-center gap-4">
          <FeedbackAttachments attachments={feedback.attachments} />
          <FeedbackComments comments={feedback.comments} />
        </div>
        
        {/* 태그 */}
        <FeedbackTags tags={feedback.tags} />
      </div>
    </AdminCard>
  )
}

export default FeedbackCard