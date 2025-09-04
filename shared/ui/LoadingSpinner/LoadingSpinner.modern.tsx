'use client'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
  'data-testid'?: string
  label?: string
}

/**
 * 로딩 스피너 컴포넌트 (Tailwind CSS 기반)
 * 접근성을 고려한 로딩 상태 표시
 */
export function LoadingSpinner({
  size = 'md',
  className = '',
  'data-testid': testId = 'loading-spinner',
  label = '로딩 중...'
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }

  return (
    <div 
      className={`inline-flex items-center justify-center ${className}`}
      role="status"
      aria-live="polite"
      data-testid={testId}
    >
      <svg
        className={`animate-spin text-primary ${sizeClasses[size]}`}
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
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
      <span className="sr-only">{label}</span>
    </div>
  )
}

/**
 * 전체 페이지 로딩 오버레이
 */
export function LoadingOverlay({
  message = '데이터를 불러오는 중...',
  className = ''
}: {
  message?: string
  className?: string
}) {
  return (
    <div 
      className={`
        fixed inset-0 bg-white/80 backdrop-blur-sm z-50 
        flex items-center justify-center ${className}
      `}
      role="status"
      aria-live="polite"
      data-testid="loading-overlay"
    >
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-4" />
        <p className="text-gray-600 text-sm">{message}</p>
      </div>
    </div>
  )
}

/**
 * 인라인 로딩 상태 (버튼 등에 사용)
 */
export function InlineLoading({
  children,
  isLoading = false,
  loadingText = '처리 중...',
  className = ''
}: {
  children: React.ReactNode
  isLoading?: boolean
  loadingText?: string
  className?: string
}) {
  if (isLoading) {
    return (
      <div className={`flex items-center justify-center gap-2 ${className}`}>
        <LoadingSpinner size="sm" />
        <span className="text-sm">{loadingText}</span>
      </div>
    )
  }

  return <>{children}</>
}