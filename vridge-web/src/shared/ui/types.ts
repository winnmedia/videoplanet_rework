/**
 * shared/ui 타입 정의
 * 에러 처리 및 로딩 상태 컴포넌트의 타입 시스템
 */

import { ReactNode } from 'react'

// Base Error Types
export interface HttpError {
  status: number
  message: string
  details?: string
  code?: string
  timestamp?: string
}

export interface NetworkError {
  message: string
  isOffline: boolean
  retryCount?: number
  lastRetryAt?: Date
}

// Component Props Types
export interface ErrorDisplayProps {
  error: HttpError | Error
  onRetry?: () => void
  onClose?: () => void
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'minimal' | 'fullscreen'
}

export interface HttpErrorPageProps {
  status: 400 | 401 | 403 | 404 | 500 | 502 | 503 | 504
  title?: string
  description?: string
  onRetry?: () => void
  onHome?: () => void
  onLogin?: () => void
  showDeveloperInfo?: boolean
  className?: string
}

export interface NetworkErrorProps {
  error: NetworkError
  onRetry?: () => void
  onOfflineMode?: () => void
  className?: string
}

export interface LoadingStateProps {
  isLoading: boolean
  error?: HttpError | NetworkError | null
  children: ReactNode
  loadingComponent?: ReactNode
  errorComponent?: ReactNode
  className?: string
}

export interface OfflineIndicatorProps {
  isOffline: boolean
  onRetry?: () => void
  className?: string
  position?: 'top' | 'bottom' | 'floating'
}

export interface RetryButtonProps {
  onRetry: () => void
  isRetrying?: boolean
  retryCount?: number
  maxRetries?: number
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'minimal'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export interface SkeletonProps {
  width?: string | number
  height?: string | number
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  animation?: 'pulse' | 'wave' | 'none'
}

export interface EmptyStateProps {
  icon?: ReactNode | string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary'
  }
  className?: string
}

// Accessibility Types
export interface A11yErrorProps {
  ariaLabel?: string
  ariaDescribedBy?: string
  announceError?: boolean
  focusOnMount?: boolean
  role?: 'alert' | 'alertdialog' | 'status'
}

// Animation Types
export interface AnimationProps {
  animate?: boolean
  duration?: number
  delay?: number
  easing?: 'ease-in-out' | 'ease-in' | 'ease-out' | 'linear'
}

// Extended Props with Accessibility & Animation
export interface AccessibleErrorProps extends ErrorDisplayProps, A11yErrorProps, AnimationProps {}
export interface AccessibleLoadingProps extends LoadingStateProps, A11yErrorProps, AnimationProps {}

// Compound Component Types
export type ErrorDisplayVariant = 'alert' | 'page' | 'inline' | 'toast'
export type LoadingVariant = 'spinner' | 'skeleton' | 'progress' | 'dots'
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical'

// Hook Return Types
export interface UseErrorHandlerReturn {
  error: HttpError | NetworkError | null
  isLoading: boolean
  retry: () => void
  clearError: () => void
  reportError: (error: Error | HttpError) => void
}

export interface UseOfflineReturn {
  isOffline: boolean
  wasOffline: boolean
  onlineAt: Date | null
  offlineAt: Date | null
}

export interface UseRetryReturn {
  retry: () => Promise<void>
  isRetrying: boolean
  retryCount: number
  canRetry: boolean
  resetRetries: () => void
}

// Performance Optimization Types
export interface PerformanceConfig {
  lazy?: boolean
  preload?: boolean
  priority?: 'high' | 'normal' | 'low'
  maxCacheTime?: number
}

// Theme Configuration
export interface ErrorThemeConfig {
  colors: {
    error: string
    warning: string
    success: string
    info: string
  }
  spacing: {
    compact: string
    normal: string
    comfortable: string
  }
  animations: {
    enabled: boolean
    duration: number
  }
}