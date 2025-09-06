/**
 * FeedbackSummaryCard 컴포넌트
 * TDD Green Phase: 피드백 요약 카드 위젯 구현
 * 
 * 기능:
 * - 새 코멘트/대댓글/감정표현 변화 집계 표시
 * - 읽지 않음 배지 (최대 9+)
 * - 클릭 시 상세 페이지 이동
 * - 읽음 처리 기능
 */

import type { FeedbackSummaryCardProps } from '../model/types'

export function FeedbackSummaryCard({
  data,
  onViewDetails,
  onMarkAllRead,
  onItemClick
}: FeedbackSummaryCardProps) {
  // 간단한 시간 포맷 유틸리티 (의존성 최소화)
  const formatRelativeTime = (timestamp: string): string => {
    try {
      const now = new Date()
      const date = new Date(timestamp)
      const diffMs = now.getTime() - date.getTime()
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      const diffHours = Math.floor(diffMinutes / 60)
      const diffDays = Math.floor(diffHours / 24)

      if (diffMinutes < 1) return '방금 전'
      if (diffMinutes < 60) return `${diffMinutes}분 전`
      if (diffHours < 24) return `${diffHours}시간 전`
      if (diffDays < 7) return `${diffDays}일 전`
      return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    } catch {
      return '방금 전'
    }
  }

  const getBadgeCount = (count: number) => {
    return count > 9 ? '9+' : count.toString()
  }

  const getBadgeColor = (count: number) => {
    if (count === 0) return 'hidden'
    if (count >= 5) return 'bg-error-500'
    if (count >= 2) return 'bg-warning-500'
    return 'bg-primary-500'
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case 'reply':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        )
      case 'emotion':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )
      default:
        return null
    }
  }

  const hasUnreadFeedback = data.totalUnread > 0
  const isEmpty = data.recentItems.length === 0

  return (
    <div
      data-testid="feedback-summary"
      className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200"
      role="region"
      aria-label="피드백 요약"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-vridge-50 rounded-xl">
            <svg className="w-5 h-5 text-vridge-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10m0 0V6a2 2 0 00-2-2H9a2 2 0 00-2 2v2m10 0v10a2 2 0 01-2 2H9a2 2 0 01-2-2V8m10 0H7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">새 피드백 요약</h3>
            <p className="text-sm text-gray-500">
              {hasUnreadFeedback ? `${data.totalUnread}개의 읽지 않은 피드백` : '모든 피드백 확인됨'}
            </p>
          </div>
        </div>

        {/* 읽지 않음 배지 */}
        {hasUnreadFeedback && (
          <div
            className={`inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-bold text-white ${getBadgeColor(data.totalUnread)}`}
            aria-label={`읽지 않은 피드백 ${data.totalUnread}개`}
          >
            {getBadgeCount(data.totalUnread)}
          </div>
        )}
      </div>

      {/* 통계 */}
      {!isEmpty && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-vridge-500">{data.newComments}</div>
            <div className="text-xs text-gray-500">새 댓글</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-primary-500">{data.newReplies}</div>
            <div className="text-xs text-gray-500">새 답글</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning-500">{data.emotionChanges}</div>
            <div className="text-xs text-gray-500">반응 변화</div>
          </div>
        </div>
      )}

      {/* 최근 피드백 리스트 */}
      <div className="space-y-3 mb-4">
        {isEmpty ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-1">새로운 피드백이 없습니다</p>
            <p className="text-xs text-gray-400">프로젝트에 새로운 댓글이나 반응이 추가되면 여기에 표시됩니다.</p>
          </div>
        ) : (
          data.recentItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onItemClick?.(item.id)}
              tabIndex={0}
              className="w-full p-3 text-left bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-150 group"
              aria-label={`${item.authorName}님의 ${item.type === 'comment' ? '댓글' : item.type === 'reply' ? '답글' : '반응'}`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                    item.isRead ? 'bg-gray-200 text-gray-500' : 'bg-vridge-500 text-white'
                  }`}>
                    {getTypeIcon(item.type)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900">{item.authorName}</span>
                    <span className="text-xs text-gray-500">{formatRelativeTime(item.timestamp)}</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-1">{item.projectTitle}</p>
                  <p className="text-sm text-gray-700 truncate">{item.content}</p>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* 액션 버튼들 */}
      <div className="flex gap-2">
        {onViewDetails && (
          <button
            onClick={onViewDetails}
            className="flex-1 px-4 py-2 text-sm font-medium text-vridge-500 bg-vridge-50 hover:bg-vridge-100 rounded-lg transition-colors duration-150"
          >
            전체보기
          </button>
        )}
        {hasUnreadFeedback && onMarkAllRead && (
          <button
            onClick={onMarkAllRead}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-vridge-500 hover:bg-vridge-600 rounded-lg transition-colors duration-150"
            aria-label="모두 읽음 처리"
          >
            모두 읽음 처리
          </button>
        )}
      </div>
    </div>
  )
}