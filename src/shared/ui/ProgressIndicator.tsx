'use client'

import { memo, useMemo } from 'react'
import clsx from 'clsx'

// 진행률 표시기 Props
interface ProgressIndicatorProps {
  // 기본 props
  value: number // 0-100
  status: 'idle' | 'in-progress' | 'completed' | 'error' | 'cancelled'
  label: string
  
  // 선택적 세부 정보
  description?: string
  currentItem?: string
  completed?: number
  total?: number
  estimatedTimeRemaining?: number // seconds
  error?: string
  
  // 표시 옵션
  showDetails?: boolean
  showPercentage?: boolean
  showSuccessAnimation?: boolean
  
  // 스타일링
  variant?: 'linear' | 'circular'
  size?: 'small' | 'medium' | 'large'
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange'
  className?: string
  
  // 콜백
  onRetry?: () => void
  onCancel?: () => void
}

// 스타일 매핑
const sizeClasses = {
  small: {
    container: 'space-y-1',
    bar: 'h-1',
    text: 'text-xs',
    circular: 'w-8 h-8'
  },
  medium: {
    container: 'space-y-2',
    bar: 'h-2',
    text: 'text-sm',
    circular: 'w-12 h-12'
  },
  large: {
    container: 'space-y-3',
    bar: 'h-3',
    text: 'text-base',
    circular: 'w-16 h-16'
  }
}

const colorClasses = {
  blue: {
    progress: 'bg-blue-500',
    background: 'bg-blue-100',
    text: 'text-blue-700'
  },
  green: {
    progress: 'bg-green-500',
    background: 'bg-green-100',
    text: 'text-green-700'
  },
  red: {
    progress: 'bg-red-500',
    background: 'bg-red-100',
    text: 'text-red-700'
  },
  purple: {
    progress: 'bg-purple-500',
    background: 'bg-purple-100',
    text: 'text-purple-700'
  },
  orange: {
    progress: 'bg-orange-500',
    background: 'bg-orange-100',
    text: 'text-orange-700'
  }
}

// 상태별 색상 결정
function getStatusColor(status: ProgressIndicatorProps['status']): keyof typeof colorClasses {
  switch (status) {
    case 'completed':
      return 'green'
    case 'error':
      return 'red'
    case 'cancelled':
      return 'orange'
    default:
      return 'blue'
  }
}

// 시간 포맷팅 유틸리티
function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}초`
  }
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}분 ${remainingSeconds}초`
}

// 원형 진행률 컴포넌트
const CircularProgress = memo<{
  value: number
  size: string
  color: string
  strokeWidth?: number
}>(({ value, size, color, strokeWidth = 2 }) => {
  const radius = 20 - strokeWidth
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / 100) * circumference

  return (
    <div className={clsx('relative inline-flex', sizeClasses[size as keyof typeof sizeClasses].circular)} data-testid="circular-progress">
      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
        {/* 배경 원 */}
        <circle
          cx="20"
          cy="20"
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className={colorClasses[color as keyof typeof colorClasses].background.replace('bg-', 'text-')}
        />
        {/* 진행률 원 */}
        <circle
          cx="20"
          cy="20"
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={clsx(
            colorClasses[color as keyof typeof colorClasses].progress.replace('bg-', 'text-'),
            'transition-all duration-300 ease-out'
          )}
        />
      </svg>
      {/* 중앙 퍼센트 표시 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={clsx(
          'font-medium',
          size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base',
          colorClasses[color as keyof typeof colorClasses].text
        )}>
          {Math.round(value)}%
        </span>
      </div>
    </div>
  )
})

CircularProgress.displayName = 'CircularProgress'

export const ProgressIndicator = memo<ProgressIndicatorProps>(({
  value,
  status,
  label,
  description,
  currentItem,
  completed,
  total,
  estimatedTimeRemaining,
  error,
  showDetails = false,
  showPercentage = true,
  showSuccessAnimation = false,
  variant = 'linear',
  size = 'medium',
  color,
  className,
  onRetry,
  onCancel
}) => {
  // 클램핑된 진행률 값
  const clampedValue = Math.max(0, Math.min(100, value))
  
  // 상태에 따른 색상 결정
  const effectiveColor = color || getStatusColor(status)
  
  // 스타일 클래스
  const sizeConfig = sizeClasses[size]
  const colorConfig = colorClasses[effectiveColor]
  
  // 상태 아이콘
  const StatusIcon = useMemo(() => {
    if (status === 'completed') {
      return (
        <svg 
          className={clsx(
            'w-5 h-5 text-green-500',
            showSuccessAnimation && 'animate-bounce'
          )}
          data-testid="success-icon"
          fill="currentColor" 
          viewBox="0 0 20 20"
        >
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      )
    }
    
    if (status === 'error') {
      return (
        <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      )
    }
    
    if (status === 'in-progress') {
      return (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
      )
    }
    
    return null
  }, [status, showSuccessAnimation])

  // 진행률 바 ID (접근성)
  const progressId = useMemo(() => `progress-${Math.random().toString(36).substr(2, 9)}`, [])
  const descriptionId = useMemo(() => `progress-desc-${Math.random().toString(36).substr(2, 9)}`, [])

  if (variant === 'circular') {
    return (
      <div 
        className={clsx(sizeConfig.container, 'flex flex-col items-center', className)}
        data-testid="progress-indicator"
      >
        <CircularProgress 
          value={clampedValue}
          size={size}
          color={effectiveColor}
        />
        
        <div className="text-center mt-2">
          <div className={clsx('font-medium', sizeConfig.text, colorConfig.text)}>
            {label}
          </div>
          
          {currentItem && (
            <div className={clsx('text-gray-600', sizeConfig.text)}>
              {currentItem}
            </div>
          )}
          
          {showDetails && completed !== undefined && total !== undefined && (
            <div className={clsx('text-gray-500', sizeConfig.text)}>
              {completed} / {total}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div 
      className={clsx(sizeConfig.container, 'w-full', className)}
      data-testid="progress-indicator"
    >
      {/* 헤더 영역 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {StatusIcon}
          <span className={clsx('font-medium', sizeConfig.text, colorConfig.text)}>
            {label}
          </span>
        </div>
        
        {showPercentage && (
          <span className={clsx('font-mono font-semibold', sizeConfig.text, colorConfig.text)}>
            {Math.round(clampedValue)}%
          </span>
        )}
      </div>

      {/* 진행률 바 */}
      <div className="w-full">
        <div
          role="progressbar"
          aria-valuenow={clampedValue}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label}
          aria-describedby={description ? descriptionId : undefined}
          tabIndex={0}
          id={progressId}
          className={clsx(
            'w-full rounded-full overflow-hidden',
            sizeConfig.bar,
            colorConfig.background,
            'size-' + size
          )}
        >
          <div
            className={clsx(
              'progress-fill h-full rounded-full transition-all duration-300 ease-out',
              colorConfig.progress
            )}
            style={{ width: `${clampedValue}%` }}
          />
        </div>
      </div>

      {/* 세부 정보 영역 */}
      {(showDetails || error || currentItem) && (
        <div className="space-y-1">
          {description && (
            <div 
              id={descriptionId}
              className={clsx('text-gray-600', sizeConfig.text)}
            >
              {description}
            </div>
          )}
          
          {currentItem && (
            <div className={clsx('text-gray-700', sizeConfig.text)}>
              📍 {currentItem}
            </div>
          )}
          
          {showDetails && (
            <div className="flex items-center justify-between">
              {completed !== undefined && total !== undefined && (
                <span className={clsx('text-gray-500', sizeConfig.text)}>
                  {completed} / {total} 완료
                </span>
              )}
              
              {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                <span className={clsx('text-gray-500', sizeConfig.text)}>
                  예상 완료: {formatTime(estimatedTimeRemaining)}
                </span>
              )}
            </div>
          )}
          
          {error && (
            <div className="flex items-center justify-between p-2 bg-red-50 rounded-md border border-red-200">
              <span className={clsx('text-red-700', sizeConfig.text)}>
                ⚠️ {error}
              </span>
              
              <div className="flex space-x-2">
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                  >
                    재시도
                  </button>
                )}
                {onCancel && (
                  <button
                    type="button"
                    onClick={onCancel}
                    className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                  >
                    취소
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
})

ProgressIndicator.displayName = 'ProgressIndicator'