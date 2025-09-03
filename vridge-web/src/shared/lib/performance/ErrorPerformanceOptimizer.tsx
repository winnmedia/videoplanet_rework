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
const LazyHttpErrorPage = lazy(() => 
  import('../ui/ErrorDisplay').then(module => ({
    default: module.HttpErrorPage
  }))
)

const LazyNetworkErrorDisplay = lazy(() =>
  import('../ui/ErrorDisplay').then(module => ({
    default: module.NetworkErrorDisplay
  }))
)

/**
 * 성능 최적화된 에러 페이지 래퍼
 * - 코드 스플리팅으로 초기 로딩 최적화
 * - 레이아웃 시프트 방지
 * - 메모이제이션으로 불필요한 리렌더링 방지
 */
export const OptimizedErrorPage = memo<{
  status: 400 | 401 | 403 | 404 | 500 | 502 | 503 | 504
  title?: string
  description?: string
  onRetry?: () => void
  onHome?: () => void
  onLogin?: () => void
  className?: string
}>(({
  status,
  title,
  description,
  onRetry,
  onHome,
  onLogin,
  className
}) => {
  // 메모이제이션된 props
  const memoizedProps = useMemo(() => ({
    status,
    title,
    description,
    onRetry,
    onHome,
    onLogin,
    className
  }), [status, title, description, onRetry, onHome, onLogin, className])

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

  return (
    <Suspense fallback={<ErrorFallback />}>
      <LazyHttpErrorPage {...memoizedProps} />
    </Suspense>
  )
})

OptimizedErrorPage.displayName = 'OptimizedErrorPage'

/**
 * 성능 최적화된 네트워크 에러 디스플레이
 */
export const OptimizedNetworkError = memo<{
  error: { message: string; isOffline: boolean; retryCount?: number }
  onRetry?: () => void
  onOfflineMode?: () => void
  className?: string
}>(({
  error,
  onRetry,
  onOfflineMode,
  className
}) => {
  const memoizedProps = useMemo(() => ({
    error,
    onRetry,
    onOfflineMode,
    className
  }), [error, onRetry, onOfflineMode, className])

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

  return (
    <Suspense fallback={<NetworkErrorFallback />}>
      <LazyNetworkErrorDisplay {...memoizedProps} />
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
export const INPOptimizedButton = memo<{
  onClick: () => void
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  className?: string
  'aria-label'?: string
}>(({
  onClick,
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  className = '',
  'aria-label': ariaLabel
}) => {
  const { disableAnimations } = useErrorPerformance()

  // 디바운스된 클릭 핸들러 (중복 클릭 방지)
  const handleClick = useCallback(
    React.useMemo(() => {
      let isProcessing = false
      return () => {
        if (isProcessing || disabled) return
        isProcessing = true
        onClick()
        // 200ms 후 다시 클릭 가능 (INP 최적화)
        setTimeout(() => { isProcessing = false }, 200)
      }
    }, [onClick, disabled]),
    [onClick, disabled]
  )

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