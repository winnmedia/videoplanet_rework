'use client'

import clsx from 'clsx'
import { HTMLAttributes, memo, useEffect, useState } from 'react'

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
  /** 오버레이 모드 (부모 요소 위에 겹침) */
  overlay?: boolean
  /** 배경 스타일 (fullscreen일 때) */
  backdrop?: 'light' | 'dark' | 'transparent'
}

/**
 * LoadingSpinner - 현대적이고 성능 최적화된 로딩 스피너
 * 
 * @features
 * - 4가지 크기 지원 (sm, md, lg, xl)
 * - 3가지 색상 변형 (primary, white, gray) 
 * - 다양한 레이아웃 모드 (centered, fullscreen, overlay)
 * - 향상된 시각적 피드백과 접근성 (WCAG 2.1 AA)
 * - prefers-reduced-motion 완전 지원
 * - 성능 최적화된 CSS 애니메이션
 * - 배경 옵션으로 가독성 향상
 */
export const LoadingSpinner = memo<LoadingSpinnerProps>(({
  size = 'md',
  variant = 'primary',
  centered = false,
  fullscreen = false,
  showText = false,
  text = '로딩 중',
  overlay = false,
  backdrop = 'light',
  className,
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
  const safeSize = (['sm', 'md', 'lg', 'xl'] as const).includes(size) ? size : 'md'
  const safeVariant = (['primary', 'white', 'gray'] as const).includes(variant) ? variant : 'primary'

  // 크기별 스타일 설정
  const sizeStyles = {
    sm: { circle: 'w-4 h-4', text: 'text-xs' },
    md: { circle: 'w-8 h-8', text: 'text-sm' },
    lg: { circle: 'w-12 h-12', text: 'text-base' },
    xl: { circle: 'w-16 h-16', text: 'text-lg' }
  }

  // 색상별 스타일 설정
  const variantStyles = {
    primary: 'text-primary',
    white: 'text-white',
    gray: 'text-gray-400'
  }

  // 배경 스타일 설정
  const backdropStyles = {
    light: 'bg-white/80 backdrop-blur-sm',
    dark: 'bg-gray-900/80 backdrop-blur-sm',
    transparent: ''
  }

  const currentSize = sizeStyles[safeSize]
  const currentVariant = variantStyles[safeVariant]
  const currentBackdrop = backdrop !== 'transparent' ? backdropStyles[backdrop] : ''

  const containerClasses = clsx(
    // 기본 컨테이너 스타일
    'flex flex-col items-center justify-center space-y-3',
    
    // 레이아웃 모드
    centered && 'flex justify-center items-center',
    fullscreen && 'fixed inset-0 z-modal',
    overlay && 'absolute inset-0',
    
    // 배경 처리
    (fullscreen || overlay) && currentBackdrop,
    
    // 모션 감소 대응
    'motion-reduce:animate-none',
    
    className
  )

  const spinnerClasses = clsx(
    currentSize.circle,
    currentVariant,
    'animate-spin',
    'motion-reduce:animate-none'
  )

  const ariaLabel = showText && text ? text : '로딩 중'

  return (
    <div
      className={containerClasses}
      role="status"
      aria-label={ariaLabel}
      aria-live="polite"
      aria-busy="true"
      style={style}
      {...props}
    >
      {/* 스피너 원 */}
      <svg 
        className={spinnerClasses}
        fill="none" 
        viewBox="0 0 24 24"
      >
        <circle 
          className="opacity-25" 
          cx="12" 
          cy="12" 
          r="10" 
          stroke="currentColor" 
          strokeWidth="4"
        />
        <path 
          className="opacity-75" 
          fill="currentColor" 
          d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      
      {/* 모션 감소 사용자를 위한 정적 인디케이터 */}
      <div className={clsx(
        'hidden motion-reduce:block',
        currentSize.circle,
        currentVariant,
        'border-2 border-current border-t-transparent rounded-full opacity-50'
      )} />
      
      {/* 텍스트 */}
      {showText && (
        <span 
          className={clsx(
            currentSize.text,
            'text-gray-600 animate-pulse motion-reduce:animate-none'
          )}
          aria-hidden="true"
        >
          {text}
        </span>
      )}
    </div>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'