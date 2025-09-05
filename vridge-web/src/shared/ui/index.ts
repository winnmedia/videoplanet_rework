/**
 * shared/ui Public API
 * FSD 경계: 모든 UI 컴포넌트의 재사용 가능한 Public 인터페이스
 * Tailwind CSS v4 + React 19 기반 디자인 시스템
 * WCAG 2.1 AA 준수, Core Web Vitals 최적화
 */

// Error Handling Components
export {
  ErrorBoundary,
  DefaultErrorFallback,
  MinimalErrorFallback,
  ProjectErrorBoundary,
  AuthErrorBoundary,
  withErrorBoundary,
  useErrorHandler
} from './ErrorBoundary'

// Error Display Components
export {
  HttpErrorPage,
  NetworkErrorDisplay,
  LoadingStateDisplay,
  OfflineIndicator,
  RetryButton,
  ErrorAlert,
  SkeletonScreen
} from './ErrorDisplay'

// Loading & State Components
export {
  LoadingSpinner,
  ProgressBar,
  Skeleton,
  EmptyState,
  CardListSkeleton,
  TableSkeleton,
  ProfileHeaderSkeleton,
  ConditionalLoader,
  DelayedSpinner
} from './LoadingStates'

// Performance Optimization Components - Completely removed from public API
// These components will be imported directly when needed

// Network Status Hooks
export {
  useNetworkStatus,
  useOnlineStatus,
  useConnectionQuality,
  useNetworkStatusChange
} from '../lib/hooks/useNetworkStatus'

// Utility Types
export type {
  ErrorDisplayProps,
  LoadingStateProps,
  HttpErrorPageProps,
  NetworkErrorProps,
  OfflineIndicatorProps,
  RetryButtonProps,
  HttpError,
  NetworkError,
  SkeletonProps,
  EmptyStateProps,
  AccessibleErrorProps,
  AccessibleLoadingProps,
  ErrorDisplayVariant,
  LoadingVariant,
  ErrorSeverity,
  UseErrorHandlerReturn,
  UseOfflineReturn,
  UseRetryReturn,
  PerformanceConfig,
  ErrorThemeConfig
} from './types'

// Network Status Types
export type {
  NetworkStatus,
  UseNetworkStatusOptions
} from '../lib/hooks/useNetworkStatus'

// Store Provider
export { StoreProvider } from './StoreProvider/StoreProvider'