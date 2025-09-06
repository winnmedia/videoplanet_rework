/**
 * InvitationSummaryCard 컴포넌트
 * TDD Green Phase: 초대 관리 요약 카드 위젯 구현
 * 
 * 기능:
 * - 전송/재전송/수락/거절/받은 초대 현황 표시
 * - 빠른 액션 (재전송, 수락, 거절)
 * - 읽지 않음 배지
 * - 만료 임박 경고
 */

import type { InvitationSummaryCardProps } from '../model/types'

export function InvitationSummaryCard({
  data,
  onViewDetails,
  onResendInvitation,
  onAcceptInvitation,
  onDeclineInvitation,
  onItemClick
}: InvitationSummaryCardProps) {
  // 만료까지 남은 시간 계산
  const getTimeToExpiry = (expiresAt: string): { days: number; isExpiringSoon: boolean } => {
    try {
      const now = new Date()
      const expiry = new Date(expiresAt)
      const diffMs = expiry.getTime() - now.getTime()
      const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
      
      return {
        days: Math.max(0, days),
        isExpiringSoon: days <= 2 && days > 0
      }
    } catch {
      return { days: 0, isExpiringSoon: false }
    }
  }

  // 초대 상태에 따른 배지 스타일
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-warning-500 text-white'
      case 'accepted':
        return 'bg-success-500 text-white'
      case 'declined':
        return 'bg-error-500 text-white'
      case 'expired':
        return 'bg-gray-500 text-white'
      default:
        return 'bg-gray-200 text-gray-700'
    }
  }

  // 초대 상태 텍스트
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '대기중'
      case 'accepted': return '수락됨'
      case 'declined': return '거절됨'
      case 'expired': return '만료됨'
      default: return status
    }
  }

  // 초대 타입 아이콘
  const getTypeIcon = (type: string) => {
    return type === 'sent' ? (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
      </svg>
    )
  }

  const hasUnread = data.receivedUnread > 0
  const isEmpty = data.recentInvitations.length === 0
  const totalInvitations = data.sentPending + data.sentAccepted + data.sentDeclined + data.receivedPending

  return (
    <div
      className="p-6 bg-white border border-gray-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200"
      role="region"
      aria-label="초대 관리"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary-50 rounded-xl">
            <svg className="w-5 h-5 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">초대 관리 요약</h3>
            <p className="text-sm text-gray-500">
              {totalInvitations > 0 
                ? `전송 대기 ${data.sentPending}개, 받은 초대 ${data.receivedPending}개`
                : '초대 내역 없음'
              }
            </p>
          </div>
        </div>

        {/* 읽지 않음 배지 */}
        {hasUnread && (
          <div
            className="inline-flex items-center justify-center min-w-6 h-6 px-2 rounded-full text-xs font-bold text-white bg-primary-500"
            aria-label={`읽지 않은 초대 ${data.receivedUnread}개`}
            data-testid="unread-badge"
          >
            {data.receivedUnread > 9 ? '9+' : data.receivedUnread}
          </div>
        )}
      </div>

      {/* 통계 */}
      {!isEmpty && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-warning-500">{data.sentPending}</div>
            <div className="text-xs text-gray-500">전송 대기</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-success-500">{data.sentAccepted}</div>
            <div className="text-xs text-gray-500">수락됨</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-error-500">{data.sentDeclined}</div>
            <div className="text-xs text-gray-500">거절됨</div>
          </div>
        </div>
      )}

      {/* 최근 초대 리스트 */}
      <div className="space-y-3 mb-4">
        {isEmpty ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 mx-auto mb-3 text-gray-300">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 mb-1">초대 내역이 없습니다</p>
            <p className="text-xs text-gray-400">팀 멤버를 초대하거나 초대를 받으면 여기에 표시됩니다.</p>
          </div>
        ) : (
          data.recentInvitations.map((invitation) => {
            const { days, isExpiringSoon } = getTimeToExpiry(invitation.expiresAt)
            
            return (
              <div
                key={invitation.id}
                className="w-full p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors duration-150 group cursor-pointer"
                onClick={() => onItemClick?.(invitation.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onItemClick?.(invitation.id)
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`${invitation.type === 'sent' ? invitation.targetName : invitation.senderName}님과의 초대`}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                      invitation.isRead ? 'bg-gray-200 text-gray-500' : 'bg-primary-500 text-white'
                    }`}>
                      {getTypeIcon(invitation.type)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {invitation.type === 'sent' ? invitation.targetName || invitation.targetEmail : invitation.senderName}
                      </span>
                      <div className="flex items-center gap-2">
                        {isExpiringSoon && (
                          <span className="text-xs text-warning-600 font-medium">
                            곧 만료 ({days}일)
                          </span>
                        )}
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadge(invitation.status)}`}>
                          {getStatusText(invitation.status)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">{invitation.projectTitle}</p>
                        <p className="text-xs text-gray-500">
                          {invitation.type === 'sent' ? '전송됨' : '받음'} • {invitation.targetEmail}
                        </p>
                      </div>
                      
                      {/* 빠른 액션 버튼들 */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {invitation.type === 'sent' && invitation.status === 'pending' && (
                          invitation.canResend ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onResendInvitation?.(invitation.id)
                              }}
                              className="px-2 py-1 text-xs text-primary-600 hover:bg-primary-100 rounded"
                              title="재전송"
                              aria-label="재전송"
                            >
                              재전송
                            </button>
                          ) : (
                            <div className="relative group/tooltip">
                              <button
                                disabled
                                className="px-2 py-1 text-xs text-gray-400 bg-gray-100 rounded cursor-not-allowed"
                                title="재전송 쿨다운 중"
                                aria-label="재전송 쿨다운 중"
                              >
                                쿨다운
                              </button>
                              <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity whitespace-nowrap z-10">
                                60초 후 재전송 가능
                              </div>
                            </div>
                          )
                        )}
                        {invitation.type === 'received' && invitation.status === 'pending' && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onAcceptInvitation?.(invitation.id)
                              }}
                              className="px-2 py-1 text-xs text-success-600 hover:bg-success-100 rounded"
                              title="수락"
                              aria-label="수락"
                            >
                              수락
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onDeclineInvitation?.(invitation.id)
                              }}
                              className="px-2 py-1 text-xs text-error-600 hover:bg-error-100 rounded"
                              title="거절"
                              aria-label="거절"
                            >
                              거절
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* 액션 버튼 */}
      {onViewDetails && (
        <button
          onClick={onViewDetails}
          className="w-full px-4 py-2 text-sm font-medium text-primary-500 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors duration-150"
        >
          전체보기
        </button>
      )}
    </div>
  )
}