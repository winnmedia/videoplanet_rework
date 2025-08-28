import React from 'react'
import clsx from 'clsx'

export interface EmptyStateProps {
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    loading?: boolean
  }
  icon?: React.ReactNode
  className?: string
  variant?: 'default' | 'error' | 'success' | 'warning'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  'data-testid'?: string
}

/**
 * EmptyState - 현대적이고 접근 가능한 빈 상태 컴포넌트
 * 데이터가 없거나 에러 상황에서 사용자 친화적 메시지 표시
 * 404 에러, 네트워크 오류, 검색 결과 없음 등 다양한 상황 지원
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
  variant = 'default',
  size = 'md',
  showIcon = true,
  'data-testid': testId = 'empty-state'
}: EmptyStateProps) {
  
  // Variant에 따른 색상 및 스타일 설정
  const variantStyles = {
    default: {
      titleColor: 'text-gray-900',
      descriptionColor: 'text-gray-600',
      buttonColor: 'bg-primary hover:bg-primary-600 text-white'
    },
    error: {
      titleColor: 'text-red-600',
      descriptionColor: 'text-red-500',
      buttonColor: 'bg-red-600 hover:bg-red-700 text-white'
    },
    success: {
      titleColor: 'text-success-600',
      descriptionColor: 'text-success-500',
      buttonColor: 'bg-success-600 hover:bg-success-700 text-white'
    },
    warning: {
      titleColor: 'text-warning-600',
      descriptionColor: 'text-warning-500',
      buttonColor: 'bg-warning-600 hover:bg-warning-700 text-white'
    }
  }

  // 크기에 따른 스타일 설정
  const sizeStyles = {
    sm: {
      container: 'py-8 px-4',
      iconSize: 'w-8 h-8',
      titleSize: 'text-base',
      descriptionSize: 'text-sm',
      spacing: 'space-y-3'
    },
    md: {
      container: 'py-12 px-6',
      iconSize: 'w-12 h-12',
      titleSize: 'text-lg md:text-xl',
      descriptionSize: 'text-sm md:text-base',
      spacing: 'space-y-4'
    },
    lg: {
      container: 'py-16 px-8',
      iconSize: 'w-16 h-16',
      titleSize: 'text-xl md:text-2xl',
      descriptionSize: 'text-base md:text-lg',
      spacing: 'space-y-6'
    }
  }

  const currentVariant = variantStyles[variant]
  const currentSize = sizeStyles[size]

  // 기본 아이콘들 (variant에 따라)
  const getDefaultIcon = () => {
    if (!showIcon) return null
    
    switch (variant) {
      case 'error':
        return (
          <svg className={clsx(currentSize.iconSize, 'text-red-400')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      case 'success':
        return (
          <svg className={clsx(currentSize.iconSize, 'text-success-400')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'warning':
        return (
          <svg className={clsx(currentSize.iconSize, 'text-warning-400')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        )
      default:
        return (
          <svg className={clsx(currentSize.iconSize, 'text-gray-400')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )
    }
  }

  const displayIcon = icon || getDefaultIcon()

  return (
    <div 
      className={clsx(
        'flex flex-col items-center text-center animate-fade-in motion-reduce:animate-none',
        currentSize.container,
        currentSize.spacing,
        className
      )}
      role="status"
      aria-live="polite"
      data-testid={testId}
    >
      {displayIcon && (
        <div className="flex-shrink-0">
          {displayIcon}
        </div>
      )}
      
      <h3 className={clsx(
        currentSize.titleSize,
        currentVariant.titleColor,
        'font-semibold leading-tight'
      )}>
        {title}
      </h3>
      
      {description && (
        <p className={clsx(
          currentSize.descriptionSize,
          currentVariant.descriptionColor,
          'leading-relaxed max-w-md'
        )}>
          {description}
        </p>
      )}
      
      {action && (
        <button
          onClick={action.onClick}
          disabled={action.loading}
          className={clsx(
            'px-6 py-3 rounded-lg font-medium transition-all duration-200',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50',
            'disabled:opacity-75 disabled:cursor-not-allowed',
            currentVariant.buttonColor,
            action.loading && 'opacity-75 cursor-not-allowed'
          )}
          aria-label={action.label}
        >
          {action.loading ? (
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{action.label}</span>
            </div>
          ) : (
            action.label
          )}
        </button>
      )}
    </div>
  )
}