/**
 * @description 피드백 상태 바 컴포넌트
 * @purpose 피드백 세션 상태 및 통계 정보 표시
 */

'use client'

import React from 'react'

import styles from './FeedbackStatusBar.module.scss'
import type { FeedbackStatusBarProps } from '../model/types'

export function FeedbackStatusBar({
  session,
  stats,
  onStatusChange,
  isReadOnly = false,
  className = ''
}: FeedbackStatusBarProps) {
  
  const getStatusLabel = (status: string): string => {
    const labels: Record<string, string> = {
      draft: '초안',
      pending: '검토 대기',
      in_review: '검토중',
      revision_needed: '수정 필요',
      approved: '승인됨',
      rejected: '거절됨',
      completed: '완료'
    }
    return labels[status] || status
  }
  
  return (
    <div 
      className={`${styles.feedbackStatusBar} ${styles.statusBar} ${styles.vridgePrimary} ${className}`}
      data-testid="feedback-status-bar"
    >
      {/* 피드백 통계 */}
      {stats && (
        <div className={styles.statsSection}>
          <span className={styles.stat}>
            총 댓글: {(stats.commentsByStatus?.resolved || 0) + (stats.commentsByStatus?.open || 0) + (stats.commentsByStatus?.archived || 0)}개
          </span>
          <span className={styles.stat}>
            해결됨: {stats.commentsByStatus?.resolved || 0}개
          </span>
          <span className={styles.stat}>
            미해결: {stats.commentsByStatus?.open || 0}개
          </span>
          {(stats.commentsByPriority?.high || 0) > 0 && (
            <span className={styles.stat}>
              높은 우선순위: {stats.commentsByPriority?.high || 0}개
            </span>
          )}
        </div>
      )}

      {/* 상태 변경 */}
      {!isReadOnly && (
        <select 
          value={session.status}
          onChange={(e) => onStatusChange(session.id, e.target.value as any)}
          className={styles.statusSelect}
          role="combobox"
          aria-label="상태 변경"
        >
          <option value="pending">검토 대기</option>
          <option value="in_review">검토중</option>
          <option value="revision_needed">수정 필요</option>
          <option value="approved">승인됨</option>
          <option value="completed">완료</option>
        </select>
      )}
      
      {/* 상태 표시 */}
      {isReadOnly && (
        <div className={styles.statusDisplay}>
          <span className={`${styles.statusBadge} ${styles[`status-badge-${session.status.replace('_', '-')}`]}`}>
            {getStatusLabel(session.status)}
          </span>
        </div>
      )}
    </div>
  )
}