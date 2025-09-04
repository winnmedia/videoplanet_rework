/**
 * 로딩 상태 및 스켈레톤 컴포넌트
 * FSD 경계: shared/ui - 재사용 가능한 로딩 UI 컴포넌트
 * Tailwind CSS v4 + React 19 기반
 * Core Web Vitals 최적화: CLS 최소화, 성능 최적화
 */

import React, { memo } from 'react'

/**
 * 로딩 스피너 컴포넌트
 * 성능 최적화: memo 사용, 불필요한 리렌더링 방지
 */
export const LoadingSpinner = memo<{
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'neutral' | 'white'
  className?: string
  'aria-label'?: string
}>(({
  size = 'md',
  color = 'primary',
  className = '',
  'aria-label': ariaLabel = '로딩 중'
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  }

  const colorClasses = {
    primary: 'text-primary-500',
    neutral: 'text-neutral-500',
    white: 'text-white'
  }

  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label={ariaLabel}
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
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
      />
    </svg>
  )
})

LoadingSpinner.displayName = 'LoadingSpinner'

/**
 * 프로그레스 바 컴포넌트
 * 진행률이 있는 작업에 사용
 */
export const ProgressBar = memo<{
  progress: number // 0-100
  variant?: 'default' | 'success' | 'warning' | 'error'
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
  'aria-label'?: string
}>(({
  progress,
  variant = 'default',
  size = 'md',
  showLabel = false,
  className = '',
  'aria-label': ariaLabel = '진행률'
}) => {
  // 진행률 범위 제한 (0-100)
  const clampedProgress = Math.max(0, Math.min(100, progress))

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  }

  const variantClasses = {
    default: 'bg-primary-500',
    success: 'bg-success-500',
    warning: 'bg-warning-500',
    error: 'bg-error-500'
  }

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="mb-1 flex justify-between text-sm text-neutral-600 dark:text-neutral-400">
          <span>{ariaLabel}</span>
          <span>{Math.round(clampedProgress)}%</span>
        </div>
      )}
      <div 
        className={`w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700 ${sizeClasses[size]}`}
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={ariaLabel}
      >
        <div
          className={`h-full transition-all duration-300 ease-out ${variantClasses[variant]}`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  )
})

ProgressBar.displayName = 'ProgressBar'

/**
 * 스켈레톤 컴포넌트
 * 콘텐츠 로딩 중 레이아웃 구조를 보여줌
 * CLS 방지를 위해 실제 콘텐츠와 유사한 크기 유지
 */
export const Skeleton = memo<{
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
  lines?: number
  className?: string
  animation?: 'pulse' | 'shimmer' | 'none'
}>(({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
  animation = 'pulse'
}) => {
  const animationClasses = {
    pulse: 'animate-pulse-soft',
    shimmer: 'animate-shimmer',
    none: ''
  }

  const baseClasses = `bg-neutral-200 dark:bg-neutral-700 ${animationClasses[animation]}`

  // 텍스트 스켈레톤 (여러 줄 지원)
  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`} aria-hidden="true">
        {Array.from({ length: lines }).map((_, index) => {
          const isLastLine = index === lines - 1
          const lineWidth = isLastLine && lines > 1 
            ? `${60 + Math.random() * 20}%` 
            : width || '100%'
          
          return (
            <div
              key={index}
              className={`h-4 rounded ${baseClasses}`}
              style={{
                width: lineWidth,
                height: height || '1rem'
              }}
            />
          )
        })}
      </div>
    )
  }

  // 원형 스켈레톤 (아바타, 아이콘 등)
  if (variant === 'circular') {
    const size = width || height || '2.5rem'
    return (
      <div
        className={`rounded-full ${baseClasses} ${className}`}
        style={{
          width: size,
          height: size
        }}
        aria-hidden="true"
      />
    )
  }

  // 사각형 스켈레톤 (이미지, 카드 등)
  return (
    <div
      className={`rounded ${baseClasses} ${className}`}
      style={{
        width: width || '100%',
        height: height || '8rem'
      }}
      aria-hidden="true"
    />
  )
})

Skeleton.displayName = 'Skeleton'

/**
 * 빈 상태 컴포넌트
 * 데이터가 없을 때 표시되는 컴포넌트
 */
export const EmptyState = memo<{
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
  className?: string
}>(({
  icon,
  title,
  description,
  action,
  className = ''
}) => {
  return (
    <div className={`flex flex-col items-center justify-center py-12 text-center ${className}`}>
      {/* 아이콘 */}
      {icon && (
        <div className="mb-4 text-6xl text-neutral-400 dark:text-neutral-500">
          {typeof icon === 'string' ? (
            <span role="img" aria-hidden="true">{icon}</span>
          ) : (
            icon
          )}
        </div>
      )}

      {/* 제목 */}
      <h3 className="mb-2 text-lg font-semibold text-neutral-900 dark:text-neutral-100">
        {title}
      </h3>

      {/* 설명 */}
      {description && (
        <p className="mb-6 max-w-sm text-sm text-neutral-600 dark:text-neutral-400">
          {description}
        </p>
      )}

      {/* 액션 버튼 */}
      {action && (
        <button
          onClick={action.onClick}
          className={`rounded px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-neutral-900 ${
            action.variant === 'secondary'
              ? 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
              : 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500'
          }`}
        >
          {action.label}
        </button>
      )}
    </div>
  )
})

EmptyState.displayName = 'EmptyState'

/**
 * 복합 스켈레톤 템플릿들
 * 일반적인 레이아웃 패턴에 대한 프리셋
 */

/**
 * 카드 리스트 스켈레톤
 */
export const CardListSkeleton = memo<{
  count?: number
  className?: string
}>(({
  count = 3,
  className = ''
}) => {
  return (
    <div className={`space-y-4 ${className}`} aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-700">
          <div className="flex items-start space-x-3">
            <Skeleton variant="circular" width="3rem" height="3rem" />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" height="1.25rem" width="60%" />
              <Skeleton variant="text" lines={2} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
})

CardListSkeleton.displayName = 'CardListSkeleton'

/**
 * 테이블 스켈레톤
 */
export const TableSkeleton = memo<{
  rows?: number
  columns?: number
  className?: string
}>(({
  rows = 5,
  columns = 4,
  className = ''
}) => {
  return (
    <div className={`space-y-3 ${className}`} aria-hidden="true">
      {/* 헤더 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={`header-${index}`} variant="text" height="1.5rem" width="80%" />
        ))}
      </div>
      
      {/* 구분선 */}
      <div className="h-px bg-neutral-200 dark:bg-neutral-700" />
      
      {/* 데이터 행들 */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton 
              key={`cell-${rowIndex}-${colIndex}`} 
              variant="text" 
              height="1.25rem" 
              width={`${60 + Math.random() * 30}%`} 
            />
          ))}
        </div>
      ))}
    </div>
  )
})

TableSkeleton.displayName = 'TableSkeleton'

/**
 * 프로필 헤더 스켈레톤
 */
export const ProfileHeaderSkeleton = memo<{
  className?: string
}>(({
  className = ''
}) => {
  return (
    <div className={`flex items-center space-x-4 ${className}`} aria-hidden="true">
      <Skeleton variant="circular" width="4rem" height="4rem" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" height="1.5rem" width="40%" />
        <Skeleton variant="text" height="1rem" width="60%" />
        <Skeleton variant="text" height="1rem" width="30%" />
      </div>
    </div>
  )
})

ProfileHeaderSkeleton.displayName = 'ProfileHeaderSkeleton'

/**
 * 조건부 로딩 래퍼 컴포넌트
 * 로딩 상태에 따라 스켈레톤 또는 실제 콘텐츠를 표시
 */
export const ConditionalLoader = memo<{
  isLoading: boolean
  skeleton: React.ReactNode
  children: React.ReactNode
  className?: string
}>(({
  isLoading,
  skeleton,
  children,
  className = ''
}) => {
  return (
    <div className={className}>
      {isLoading ? skeleton : children}
    </div>
  )
})

ConditionalLoader.displayName = 'ConditionalLoader'

/**
 * 지연 로딩 인디케이터
 * 일정 시간 후에만 로딩 상태를 표시 (깜빡임 방지)
 */
export const DelayedSpinner = memo<{
  delay?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  color?: 'primary' | 'neutral' | 'white'
  className?: string
}>(({
  delay = 300,
  size = 'md',
  color = 'primary',
  className = ''
}) => {
  const [show, setShow] = React.useState(false)

  React.useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  if (!show) return null

  return (
    <LoadingSpinner 
      size={size} 
      color={color} 
      className={`animate-fade-in ${className}`} 
    />
  )
})

DelayedSpinner.displayName = 'DelayedSpinner'