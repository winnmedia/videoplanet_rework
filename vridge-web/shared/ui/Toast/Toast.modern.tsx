/**
 * @fileoverview 초미니멀 Toast 컴포넌트 - Tailwind CSS 기반
 * @description VRidge 디자인 시스템의 Toast 알림 컴포넌트
 */

'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { ReactNode, useEffect, useRef, useState } from 'react'

import { cn } from '../../lib/utils'

// Toast variants 정의
const toastVariants = cva(
  [
    'flex items-start gap-3',
    'p-4 rounded-lg border',
    'shadow-lg backdrop-blur-sm',
    'animate-slide-up',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'transition-all duration-200 ease-out',
    'max-w-md w-full',
    'relative overflow-hidden'
  ],
  {
    variants: {
      variant: {
        success: [
          'bg-success-50 border-success-200 text-success-700',
          'focus:ring-success-500',
          'dark:bg-success-900/20 dark:border-success-800 dark:text-success-300'
        ],
        error: [
          'bg-error-50 border-error-200 text-error-700',
          'focus:ring-error-500',
          'dark:bg-error-900/20 dark:border-error-800 dark:text-error-300'
        ],
        warning: [
          'bg-warning-50 border-warning-200 text-warning-700',
          'focus:ring-warning-500',
          'dark:bg-warning-900/20 dark:border-warning-800 dark:text-warning-300'
        ],
        info: [
          'bg-vridge-50 border-vridge-200 text-vridge-700',
          'focus:ring-vridge-500',
          'dark:bg-vridge-900/20 dark:border-vridge-800 dark:text-vridge-300'
        ]
      }
    },
    defaultVariants: {
      variant: 'info'
    }
  }
)

const positionVariants = cva(
  'fixed z-toast pointer-events-auto',
  {
    variants: {
      position: {
        'top-right': 'top-4 right-4',
        'top-left': 'top-4 left-4',
        'bottom-right': 'bottom-4 right-4',
        'bottom-left': 'bottom-4 left-4',
        'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
        'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
        'center': 'top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'
      }
    },
    defaultVariants: {
      position: 'top-right'
    }
  }
)

export interface ToastProps extends VariantProps<typeof toastVariants> {
  /**
   * 알림 메시지
   */
  message: string
  
  /**
   * 토스트 변형
   */
  variant?: 'success' | 'error' | 'warning' | 'info'
  
  /**
   * 화면상 위치
   */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center' | 'center'
  
  /**
   * 닫기 콜백
   */
  onClose?: () => void
  
  /**
   * 자동 닫기 여부
   */
  autoClose?: boolean
  
  /**
   * 자동 닫기 지연 시간 (ms)
   */
  autoCloseDelay?: number
  
  /**
   * 추가 콘텐츠
   */
  children?: ReactNode
  
  /**
   * 추가 클래스명
   */
  className?: string
}

/**
 * 아이콘 컴포넌트들
 */
const SuccessIcon = () => (
  <svg 
    data-testid="toast-icon-success"
    className="w-5 h-5 text-success-500" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
)

const ErrorIcon = () => (
  <svg 
    data-testid="toast-icon-error"
    className="w-5 h-5 text-error-500" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const WarningIcon = () => (
  <svg 
    data-testid="toast-icon-warning"
    className="w-5 h-5 text-warning-500" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
)

const InfoIcon = () => (
  <svg 
    data-testid="toast-icon-info"
    className="w-5 h-5 text-vridge-500" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const CloseIcon = () => (
  <svg 
    className="w-4 h-4" 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

/**
 * 변형별 아이콘 매핑
 */
const iconMap = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon
}

/**
 * 변형별 접근성 텍스트 매핑
 */
const ariaLabelMap = {
  success: '성공 알림',
  error: '오류 알림',
  warning: '경고 알림',
  info: '정보 알림'
}

/**
 * Toast 컴포넌트
 * 
 * @description VRidge 디자인 시스템의 Toast 알림 컴포넌트
 * 초미니멀한 디자인과 완벽한 접근성, 사용자 경험을 제공합니다.
 * 
 * @example
 * ```tsx
 * // 기본 정보 토스트
 * <Toast message="저장되었습니다" />
 * 
 * // 성공 토스트
 * <Toast 
 *   message="성공적으로 업로드되었습니다" 
 *   variant="success" 
 * />
 * 
 * // 자동 닫기가 있는 에러 토스트
 * <Toast 
 *   message="오류가 발생했습니다" 
 *   variant="error"
 *   autoClose={true}
 *   autoCloseDelay={5000}
 *   onClose={() => console.log('토스트 닫힘')}
 * />
 * ```
 */
export const Toast = ({
  message,
  variant = 'info',
  position = 'top-right',
  onClose,
  autoClose = false,
  autoCloseDelay = 3000,
  children,
  className
}: ToastProps) => {
  const [isVisible, setIsVisible] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const toastRef = useRef<HTMLDivElement>(null)

  const IconComponent = iconMap[variant]
  const ariaLabel = ariaLabelMap[variant]

  // 자동 닫기 로직
  useEffect(() => {
    if (autoClose && onClose && !isPaused) {
      timeoutRef.current = setTimeout(() => {
        onClose()
      }, autoCloseDelay)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [autoClose, onClose, autoCloseDelay, isPaused])

  // 키보드 이벤트 처리
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && onClose) {
      onClose()
    }
  }

  // 마우스 호버 처리 (자동 닫기 일시정지)
  const handleMouseEnter = () => {
    if (autoClose) {
      setIsPaused(true)
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }

  const handleMouseLeave = () => {
    if (autoClose) {
      setIsPaused(false)
    }
  }

  // 닫기 처리
  const handleClose = () => {
    setIsVisible(false)
    setTimeout(() => {
      onClose?.()
    }, 150) // 애니메이션 완료 후 제거
  }

  if (!isVisible) return null

  return (
    <div className={positionVariants({ position })}>
      <div
        ref={toastRef}
        className={cn(toastVariants({ variant }), className)}
        role="alert"
        aria-live="polite"
        aria-describedby={`toast-message-${variant}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {/* 아이콘 */}
        <div className="flex-shrink-0 pt-0.5">
          <IconComponent />
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 min-w-0">
          <div 
            id={`toast-message-${variant}`}
            className="sr-only"
          >
            {`${ariaLabel}: ${message}`}
          </div>
          
          <p className="text-sm font-medium leading-5">
            {message}
          </p>
          
          {children && (
            <div className="mt-2">
              {children}
            </div>
          )}
        </div>

        {/* 닫기 버튼 */}
        {onClose && (
          <button
            type="button"
            className={cn(
              'flex-shrink-0 p-1 rounded',
              'hover:bg-black/5 dark:hover:bg-white/5',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              variant === 'success' && 'focus:ring-success-500',
              variant === 'error' && 'focus:ring-error-500',
              variant === 'warning' && 'focus:ring-warning-500',
              variant === 'info' && 'focus:ring-vridge-500',
              'transition-colors duration-150'
            )}
            onClick={handleClose}
            aria-label="Toast 닫기"
          >
            <CloseIcon />
          </button>
        )}

        {/* 자동 닫기 프로그레스 바 */}
        {autoClose && !isPaused && (
          <div className="absolute bottom-0 left-0 w-full h-1 bg-black/10 dark:bg-white/10 overflow-hidden">
            <div 
              className={cn(
                'h-full animate-progress-bar',
                variant === 'success' && 'bg-success-500',
                variant === 'error' && 'bg-error-500',
                variant === 'warning' && 'bg-warning-500',
                variant === 'info' && 'bg-vridge-500'
              )}
              style={{
                animation: `progressBar ${autoCloseDelay}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes progressBar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  )
}

Toast.displayName = 'Toast'