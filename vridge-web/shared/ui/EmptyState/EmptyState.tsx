import React from 'react'

import styles from './EmptyState.module.scss'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  icon?: React.ReactNode
  className?: string
}

/**
 * EmptyState - 초미니멀 디자인의 빈 상태 컴포넌트
 * 데이터가 없거나 검색 결과가 없을 때 표시
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className = ''
}: EmptyStateProps) {
  return (
    <div className={`${styles.container} ${className}`}>
      {icon && (
        <div className={styles.iconWrapper}>
          {icon}
        </div>
      )}
      
      <h3 className={styles.title}>{title}</h3>
      
      {description && (
        <p className={styles.description}>{description}</p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          className={styles.actionButton}
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}