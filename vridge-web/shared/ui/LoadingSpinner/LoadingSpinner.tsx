'use client'

import { HTMLAttributes, memo, useEffect, useState } from 'react'

import styles from './LoadingSpinner.module.scss'

export interface LoadingSpinnerProps extends HTMLAttributes<HTMLDivElement> {
  /** 스피너 크기 */
  size?: 'sm' | 'md' | 'lg' | 'xl'
  /** 스피너 색상 변형 */
  variant?: 'primary' | 'white' | 'gray'
  /** 중앙 정렬 여부 */
  centered?: boolean
  /** 전체 화면 중앙 정렬 여부 */
  fullscreen?: boolean
  /** 텍스트 표시 여부 */
  showText?: boolean
  /** 표시할 텍스트 (기본: "로딩 중") */
  text?: string
}

/**
 * LoadingSpinner - 4개 모듈에서 공통 사용하는 로딩 스피너
 * 
 * @features
 * - 4가지 크기 지원 (sm, md, lg, xl)
 * - 3가지 색상 변형 (primary, white, gray)
 * - 중앙 정렬 및 전체 화면 모드
 * - 접근성 완전 지원 (WCAG 2.1 AA)
 * - reduced-motion 지원
 * - 레거시 디자인 토큰 100% 적용
 */
export const LoadingSpinner = memo<LoadingSpinnerProps>(({
  size = 'md',
  variant = 'primary',
  centered = false,
  fullscreen = false,
  showText = false,
  text = '로딩 중',
  className = '',
  style,
  ...props
}) => {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    // prefers-reduced-motion 감지
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // 안전한 props 처리
  const safeSize = ['sm', 'md', 'lg', 'xl'].includes(size) ? size : 'md'
  const safeVariant = ['primary', 'white', 'gray'].includes(variant) ? variant : 'primary'

  const classNames = [
    styles.spinner,
    styles[safeSize],
    styles[safeVariant],
    centered && styles.centered,
    fullscreen && styles.fullscreen,
    reducedMotion && styles.reducedMotion,
    className
  ].filter(Boolean).join(' ')

  const ariaLabel = showText && text ? text : '로딩 중'

  return (
    <div
      className={classNames}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      aria-busy="true"
      style={style}
      {...props}
    >
      <div className={styles.spinnerCircle} />
      {showText && (
        <span className={styles.text} aria-hidden="true">
          {text}
        </span>
      )}
    </div>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'