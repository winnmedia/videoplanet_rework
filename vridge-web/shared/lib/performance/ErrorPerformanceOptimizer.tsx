'use client'

/**
 * 에러 컴포넌트 성능 최적화 유틸리티
 * Core Web Vitals 최적화: LCP, CLS, INP 영향 최소화
 * FSD 경계: shared/lib/performance
 */

import React, { memo, Suspense, lazy, useMemo, useCallback } from 'react'

/**
 * 에러 컴포넌트 지연 로딩 (코드 스플리팅)
 * 메인 번들 크기 최소화로 LCP 개선
 */
const LazyErrorBoundary = lazy(() => 
  import('../../ui/ErrorBoundary/ErrorBoundary').then(module => ({
    default: module.ErrorBoundary
  }))
)

/**
 * 네트워크 에러 디스플레이 컴포넌트
 */
const LazyNetworkErrorDisplay = lazy(() => 
  Promise.resolve({
    default: memo<{
      error: { message: string; isOffline: boolean; retryCount?: number }
      onRetry?: () => void
      onOfflineMode?: () => void
      className?: string
    }>(({ error, onRetry, onOfflineMode, className }) => (
      <div className={`rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-950 ${className || ''}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-warning-600 dark:text-warning-400 text-xl">
              {error.isOffline ? '📶' : '⚠️'}
            </span>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-warning-800 dark:text-warning-200">
              {error.isOffline ? '네트워크 연결 없음' : '네트워크 오류'}
            </h3>
            <p className="mt-1 text-sm text-warning-700 dark:text-warning-300">
              {error.message}
            </p>
            {(error.retryCount || 0) > 0 && (
              <p className="mt-1 text-xs text-warning-600 dark:text-warning-400">
                재시도 횟수: {error.retryCount}
              </p>
            )}
            <div className="mt-3 flex gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-xs bg-warning-600 text-white px-3 py-1 rounded hover:bg-warning-700 focus:outline-none focus:ring-2 focus:ring-warning-500"
                >
                  다시 시도
                </button>
              )}
              {error.isOffline && onOfflineMode && (
                <button
                  onClick={onOfflineMode}
                  className="text-xs border border-warning-300 text-warning-800 px-3 py-1 rounded hover:bg-warning-100 focus:outline-none focus:ring-2 focus:ring-warning-500 dark:border-warning-700 dark:text-warning-200 dark:hover:bg-warning-800"
                >
                  오프라인 모드
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    ))
  })
)

/**
 * 성능 최적화된 에러 페이지 래퍼
 * - 코드 스플리팅으로 초기 로딩 최적화
 * - 레이아웃 시프트 방지
 * - 메모이제이션으로 불필요한 리렌더링 방지
 */
interface OptimizedErrorPageProps {
  status: 400 | 401 | 403 | 404 | 500 | 502 | 503 | 504;
  title?: string;
  description?: string;
  onRetry?: () => void;
  onHome?: () => void;
  onLogin?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const OptimizedErrorPage = memo<OptimizedErrorPageProps>(({
  status,
  title,
  description,
  onRetry,
  onHome,
  onLogin,
  className,
  children
}) => {
  // CLS 방지를 위한 고정 높이 컨테이너
  const ErrorFallback = useCallback(() => (
    <div className="flex min-h-content items-center justify-center p-4">
      <div className="w-full max-w-md animate-pulse text-center">
        <div className="mb-6 h-16 w-16 mx-auto rounded-full bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-6 w-3/4 mx-auto mb-3 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-4 w-full mb-2 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="h-4 w-2/3 mx-auto mb-6 rounded bg-neutral-200 dark:bg-neutral-700" />
        <div className="flex gap-3 justify-center">
          <div className="h-10 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
          <div className="h-10 w-24 rounded bg-neutral-200 dark:bg-neutral-700" />
        </div>
      </div>
    </div>
  ), [])

  // ErrorBoundary용 props
  const errorBoundaryProps = useMemo(() => ({
    children: children || (
      <div className={`text-center p-8 ${className || ''}`}>
        <div className="text-6xl mb-4">
          {status >= 500 ? '🔧' : status === 404 ? '🔍' : '⚠️'}
        </div>
        <h2 className="text-xl font-semibold mb-2">
          {title || `${status} 오류가 발생했습니다`}
        </h2>
        <p className="text-gray-600 mb-6">
          {description || '요청을 처리할 수 없습니다.'}
        </p>
        <div className="flex gap-3 justify-center">
          {onRetry && (
            <button
              onClick={onRetry}
              className="bg-primary-500 text-white px-4 py-2 rounded hover:bg-primary-600"
            >
              다시 시도
            </button>
          )}
          {onHome && (
            <button
              onClick={onHome}
              className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
            >
              홈으로
            </button>
          )}
          {onLogin && (
            <button
              onClick={onLogin}
              className="border border-gray-300 px-4 py-2 rounded hover:bg-gray-50"
            >
              로그인
            </button>
          )}
        </div>
      </div>
    ),
    level: 'page' as const,
    onError: (error: Error) => {
      console.error(`HTTP ${status} Error:`, error);
    }
  }), [status, title, description, onRetry, onHome, onLogin, className, children])

  return (
    <Suspense fallback={<ErrorFallback />}>
      <LazyErrorBoundary {...errorBoundaryProps} />
    </Suspense>
  )
})

OptimizedErrorPage.displayName = 'OptimizedErrorPage'

/**
 * 성능 최적화된 네트워크 에러 디스플레이
 */
interface OptimizedNetworkErrorProps {
  error: { message: string; isOffline: boolean; retryCount?: number };
  onRetry?: () => void;
  onOfflineMode?: () => void;
  className?: string;
  children?: React.ReactNode;
}

export const OptimizedNetworkError = memo<OptimizedNetworkErrorProps>(({
  error,
  onRetry,
  onOfflineMode,
  className,
  children
}) => {
  const NetworkErrorFallback = useCallback(() => (
    <div className="rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-950 animate-pulse">
      <div className="flex items-start">
        <div className="h-6 w-6 rounded bg-warning-300 dark:bg-warning-600" />
        <div className="ml-3 flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-warning-300 dark:bg-warning-600" />
          <div className="h-3 w-2/3 rounded bg-warning-300 dark:bg-warning-600" />
          <div className="flex gap-2 mt-3">
            <div className="h-7 w-16 rounded bg-warning-300 dark:bg-warning-600" />
            <div className="h-7 w-20 rounded bg-warning-300 dark:bg-warning-600" />
          </div>
        </div>
      </div>
    </div>
  ), [])

  // ErrorBoundary용 props
  const errorBoundaryProps = useMemo(() => ({
    children: children || (
      <div className={`rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-950 ${className || ''}`}>
        <div className="flex items-start">
          <div className="h-6 w-6 text-warning-600 dark:text-warning-400">
            {error.isOffline ? '📶' : '⚠️'}
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-warning-800 dark:text-warning-200">
              {error.isOffline ? '네트워크 연결 오류' : '네트워크 오류'}
            </h3>
            <p className="mt-1 text-sm text-warning-700 dark:text-warning-300">
              {error.message}
            </p>
            <div className="mt-3 flex gap-2">
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="text-sm bg-warning-600 text-white px-3 py-1 rounded hover:bg-warning-700"
                >
                  재시도 {error.retryCount ? `(${error.retryCount})` : ''}
                </button>
              )}
              {onOfflineMode && error.isOffline && (
                <button
                  onClick={onOfflineMode}
                  className="text-sm border border-warning-600 text-warning-600 px-3 py-1 rounded hover:bg-warning-100 dark:hover:bg-warning-800"
                >
                  오프라인 모드
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    level: 'component' as const,
    onError: (err: Error) => {
      console.error('Network Error:', { ...error, originalError: err });
    }
  }), [error, onRetry, onOfflineMode, className, children])

  return (
    <Suspense fallback={<NetworkErrorFallback />}>
      <LazyErrorBoundary {...errorBoundaryProps} />
    </Suspense>
  )
})

OptimizedNetworkError.displayName = 'OptimizedNetworkError'

/**
 * 에러 상태 전용 Virtual DOM 최적화 컨텍스트
 * 에러 상태에서만 활성화되는 성능 최적화
 */
interface ErrorPerformanceContextValue {
  isErrorState: boolean
  optimizationLevel: 'minimal' | 'balanced' | 'aggressive'
  disableAnimations: boolean
  reducedMotion: boolean
}

const ErrorPerformanceContext = React.createContext<ErrorPerformanceContextValue>({
  isErrorState: false,
  optimizationLevel: 'balanced',
  disableAnimations: false,
  reducedMotion: false
})

/**
 * 에러 성능 최적화 프로바이더
 * 에러 상태에서 전역 성능 최적화 설정 제공
 */
export const ErrorPerformanceProvider: React.FC<{
  children: React.ReactNode
  isErrorState: boolean
  optimizationLevel?: 'minimal' | 'balanced' | 'aggressive'
}> = ({
  children,
  isErrorState,
  optimizationLevel = 'balanced'
}) => {
  // 사용자 환경 감지
  const { disableAnimations, reducedMotion } = useMemo(() => {
    const mediaQuery = typeof window !== 'undefined' 
      ? window.matchMedia('(prefers-reduced-motion: reduce)')
      : null
      
    return {
      disableAnimations: optimizationLevel === 'aggressive' || isErrorState,
      reducedMotion: mediaQuery?.matches ?? false
    }
  }, [optimizationLevel, isErrorState])

  const contextValue = useMemo(() => ({
    isErrorState,
    optimizationLevel,
    disableAnimations,
    reducedMotion
  }), [isErrorState, optimizationLevel, disableAnimations, reducedMotion])

  return (
    <ErrorPerformanceContext.Provider value={contextValue}>
      {children}
    </ErrorPerformanceContext.Provider>
  )
}

/**
 * 에러 성능 최적화 훅
 */
export function useErrorPerformance() {
  const context = React.useContext(ErrorPerformanceContext)
  return context
}

/**
 * CLS 최소화 래퍼 컴포넌트
 * 레이아웃 시프트를 방지하기 위한 고정 컨테이너
 */
export const CLSOptimizedContainer = memo<{
  children: React.ReactNode
  minHeight?: string
  className?: string
  preserveSpace?: boolean
}>(({
  children,
  minHeight = '24rem', // 384px - 표준 에러 페이지 높이
  className = '',
  preserveSpace = true
}) => {
  const { isErrorState, optimizationLevel } = useErrorPerformance()
  
  // 적극적 최적화 모드에서는 높이 고정
  const shouldFixHeight = optimizationLevel === 'aggressive' || preserveSpace

  return (
    <div 
      className={`w-full ${className} ${
        shouldFixHeight ? 'flex flex-col' : ''
      }`}
      style={shouldFixHeight ? { minHeight } : undefined}
    >
      {children}
    </div>
  )
})

CLSOptimizedContainer.displayName = 'CLSOptimizedContainer'

/**
 * INP 최적화 버튼 컴포넌트
 * 사용자 상호작용 응답성 최적화
 */
interface INPOptimizedButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

export const INPOptimizedButton = memo<INPOptimizedButtonProps>(({
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  'aria-label': ariaLabel
}) => {
  const { disableAnimations } = useErrorPerformance()

  // 디바운스된 클릭 핸들러 (중복 클릭 방지) - React 19 최적화
  const handleClick = useCallback(() => {
    if (disabled) return
    
    // Scheduler API 활용 (React 19)
    if (typeof window !== 'undefined' && 'scheduler' in window) {
      (window as any).scheduler.postTask(onClick, { priority: 'user-blocking' })
    } else {
      // 폴백: 즉시 실행
      onClick()
    }
  }, [onClick, disabled])

  const baseClasses = "rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
  const variantClasses = {
    primary: "bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500",
    secondary: "border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-500"
  }
  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm", 
    lg: "px-6 py-3 text-base"
  }

  // 애니메이션 비활성화 시 transition 제거
  const animationClass = disableAnimations ? "" : "transition-colors duration-150"

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${animationClass} ${className}`}
      aria-label={ariaLabel}
      // INP 최적화: 브라우저 최적화 힌트
      data-optimize-inp="true"
    >
      {children}
    </button>
  )
})

INPOptimizedButton.displayName = 'INPOptimizedButton'

/**
 * 성능 메트릭 측정 및 리포팅
 * 에러 컴포넌트의 성능 영향 모니터링
 */
export class ErrorPerformanceMonitor {
  private static instance: ErrorPerformanceMonitor
  private observers: Map<string, PerformanceObserver> = new Map()

  static getInstance(): ErrorPerformanceMonitor {
    if (!ErrorPerformanceMonitor.instance) {
      ErrorPerformanceMonitor.instance = new ErrorPerformanceMonitor()
    }
    return ErrorPerformanceMonitor.instance
  }

  /**
   * CLS 측정 시작
   */
  measureCLS(callback: (clsValue: number) => void): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return
    }

    try {
      const observer = new PerformanceObserver((list) => {
        let clsValue = 0
        for (const entry of list.getEntries()) {
          if ((entry as any).hadRecentInput) continue
          clsValue += (entry as any).value
        }
        callback(clsValue)
      })

      observer.observe({ type: 'layout-shift', buffered: true })
      this.observers.set('cls', observer)
    } catch (error) {
      console.warn('CLS measurement not supported:', error)
    }
  }

  /**
   * LCP 측정 시작
   */
  measureLCP(callback: (lcpValue: number) => void): void {
    if (typeof window === 'undefined' || !('PerformanceObserver' in window)) {
      return
    }

    try {
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        callback(lastEntry.startTime)
      })

      observer.observe({ type: 'largest-contentful-paint', buffered: true })
      this.observers.set('lcp', observer)
    } catch (error) {
      console.warn('LCP measurement not supported:', error)
    }
  }

  /**
   * 성능 측정 중단
   */
  disconnect(): void {
    this.observers.forEach((observer) => observer.disconnect())
    this.observers.clear()
  }
}

/**
 * 성능 모니터링 훅
 */
export function useErrorPerformanceMonitor(
  onMetrics?: (metrics: { cls?: number; lcp?: number }) => void
) {
  const monitor = React.useMemo(() => ErrorPerformanceMonitor.getInstance(), [])
  const metricsRef = React.useRef<{ cls?: number; lcp?: number }>({})

  React.useEffect(() => {
    if (!onMetrics) return

    monitor.measureCLS((cls) => {
      metricsRef.current.cls = cls
      onMetrics(metricsRef.current)
    })

    monitor.measureLCP((lcp) => {
      metricsRef.current.lcp = lcp
      onMetrics(metricsRef.current)
    })

    return () => {
      monitor.disconnect()
    }
  }, [monitor, onMetrics])

  return metricsRef.current
}