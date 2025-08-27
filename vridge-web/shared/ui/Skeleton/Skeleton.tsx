import React from 'react'

import styles from './Skeleton.module.scss'

export interface SkeletonProps {
  variant?: 'text' | 'rect' | 'circle' | 'card'
  width?: string | number
  height?: string | number
  count?: number
  className?: string
  animation?: 'pulse' | 'wave' | 'none'
}

/**
 * Skeleton - 초미니멀 로딩 스켈레톤 컴포넌트
 * 콘텐츠 로딩 중 레이아웃 시프트 방지
 */
export function Skeleton({
  variant = 'text',
  width,
  height,
  count = 1,
  className = '',
  animation = 'pulse'
}: SkeletonProps) {
  const skeletons = Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      className={`
        ${styles.skeleton} 
        ${styles[variant]} 
        ${styles[animation]}
        ${className}
      `}
      style={{
        width: width || undefined,
        height: height || undefined,
      }}
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="로딩 중"
    />
  ))

  return count > 1 ? (
    <div className={styles.container}>
      {skeletons}
    </div>
  ) : (
    skeletons[0]
  )
}

/**
 * SkeletonCard - 카드 형태의 스켈레톤
 */
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`${styles.card} ${className}`}>
      <Skeleton variant="rect" height={200} />
      <div className={styles.cardContent}>
        <Skeleton variant="text" count={2} />
      </div>
    </div>
  )
}

/**
 * SkeletonList - 리스트 형태의 스켈레톤
 */
export function SkeletonList({ 
  count = 3, 
  className = '' 
}: { 
  count?: number
  className?: string 
}) {
  return (
    <div className={`${styles.list} ${className}`}>
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className={styles.listItem}>
          <Skeleton variant="circle" width={40} height={40} />
          <div className={styles.listContent}>
            <Skeleton variant="text" width="30%" />
            <Skeleton variant="text" width="60%" />
          </div>
        </div>
      ))}
    </div>
  )
}