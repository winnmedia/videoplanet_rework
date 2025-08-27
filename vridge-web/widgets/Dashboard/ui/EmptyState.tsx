'use client'

import React from 'react'

import styles from './EmptyState.module.scss'
import type { EmptyStateProps } from '../model/types'

// 일러스트레이션 타입별 이모지와 색상 매핑
const ILLUSTRATION_CONFIG = {
  'no-projects': {
    emoji: '📁',
    color: styles.illustrationPrimary,
    bgColor: styles.bgPrimary
  },
  'no-activity': {
    emoji: '📝',
    color: styles.illustrationInfo,
    bgColor: styles.bgInfo
  },
  'error': {
    emoji: '⚠️',
    color: styles.illustrationError,
    bgColor: styles.bgError
  },
  'loading': {
    emoji: '⏳',
    color: styles.illustrationWarning,
    bgColor: styles.bgWarning
  }
} as const

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  illustration = 'no-projects'
}) => {
  const config = ILLUSTRATION_CONFIG[illustration]

  const handleAction = () => {
    onAction?.()
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onAction?.()
    }
  }

  return (
    <div 
      className={styles.emptyState}
      role="region"
      aria-label="빈 상태"
    >
      {/* 일러스트레이션 */}
      <div 
        className={`${styles.illustration} ${config.color} ${config.bgColor}`}
        aria-hidden="true"
      >
        <span className={styles.illustrationEmoji}>
          {config.emoji}
        </span>
      </div>

      {/* 텍스트 콘텐츠 */}
      <div className={styles.content}>
        <h3 className={styles.title}>
          {title}
        </h3>
        
        <p className={styles.description}>
          {description}
        </p>

        {/* 액션 버튼 (있는 경우) */}
        {actionLabel && onAction && (
          <button
            className={styles.actionButton}
            onClick={handleAction}
            onKeyDown={handleKeyPress}
            type="button"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  )
}

// 기본 props 설정
EmptyState.displayName = 'EmptyState'