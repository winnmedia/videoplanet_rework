/**
 * HTTP 에러 및 네트워크 에러 디스플레이 컴포넌트
 * FSD 경계: shared/ui - 재사용 가능한 에러 UI 컴포넌트
 * Tailwind CSS v4 + React 19 기반
 * WCAG 2.1 AA 준수, Core Web Vitals 최적화
 */

import React, { useEffect, useRef } from 'react'
import { HttpErrorPageProps, NetworkErrorProps, OfflineIndicatorProps, RetryButtonProps } from './types'

/**
 * HTTP 상태별 에러 페이지 컴포넌트
 * 접근성: ARIA labels, 키보드 네비게이션, 스크린 리더 지원
 * 성능: layout shift 최소화, 이미지 최적화
 */
export const HttpErrorPage: React.FC<HttpErrorPageProps> = ({
  status,
  title,
  description,
  onRetry,
  onHome,
  onLogin,
  showDeveloperInfo = process.env.NODE_ENV === 'development',
  className = ''
}) => {
  const mainRef = useRef<HTMLElement>(null)

  // 에러 상태별 설정
  const errorConfig = {
    400: {
      icon: '⚠️',
      defaultTitle: '잘못된 요청',
      defaultDescription: '요청하신 내용을 처리할 수 없습니다. 입력 정보를 확인해 주세요.',
      color: 'warning',
      canRetry: true
    },
    401: {
      icon: '🔐',
      defaultTitle: '인증이 필요합니다',
      defaultDescription: '로그인이 필요한 서비스입니다. 로그인 후 다시 시도해 주세요.',
      color: 'error',
      canRetry: false
    },
    403: {
      icon: '⛔',
      defaultTitle: '접근 권한이 없습니다',
      defaultDescription: '이 페이지에 접근할 권한이 없습니다. 관리자에게 문의해 주세요.',
      color: 'error',
      canRetry: false
    },
    404: {
      icon: '🔍',
      defaultTitle: '페이지를 찾을 수 없습니다',
      defaultDescription: '요청하신 페이지가 존재하지 않거나 이동되었습니다.',
      color: 'neutral',
      canRetry: false
    },
    500: {
      icon: '⚠️',
      defaultTitle: '서버 오류가 발생했습니다',
      defaultDescription: '일시적인 서버 오류입니다. 잠시 후 다시 시도해 주세요.',
      color: 'error',
      canRetry: true
    },
    502: {
      icon: '🔧',
      defaultTitle: '게이트웨이 오류',
      defaultDescription: '서버 연결에 문제가 있습니다. 잠시 후 다시 시도해 주세요.',
      color: 'error',
      canRetry: true
    },
    503: {
      icon: '🚧',
      defaultTitle: '서비스 이용 불가',
      defaultDescription: '현재 서비스 점검 중입니다. 잠시 후 다시 시도해 주세요.',
      color: 'warning',
      canRetry: true
    },
    504: {
      icon: '⏱️',
      defaultTitle: '요청 시간 초과',
      defaultDescription: '서버 응답 시간이 초과되었습니다. 다시 시도해 주세요.',
      color: 'warning',
      canRetry: true
    }
  }

  const config = errorConfig[status]
  const finalTitle = title || config.defaultTitle
  const finalDescription = description || config.defaultDescription

  // 접근성: 에러 페이지 로드 시 포커스 이동
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.focus()
    }
  }, [])

  // 색상 클래스 매핑 (Tailwind 디자인 토큰 활용)
  const getColorClasses = (colorType: string) => {
    switch (colorType) {
      case 'error':
        return {
          bg: 'bg-error-50 dark:bg-error-950',
          border: 'border-error-200 dark:border-error-800',
          text: 'text-error-600 dark:text-error-400',
          icon: 'text-error-500'
        }
      case 'warning':
        return {
          bg: 'bg-warning-50 dark:bg-warning-950',
          border: 'border-warning-200 dark:border-warning-800',
          text: 'text-warning-600 dark:text-warning-400',
          icon: 'text-warning-500'
        }
      case 'neutral':
        return {
          bg: 'bg-neutral-50 dark:bg-neutral-900',
          border: 'border-neutral-200 dark:border-neutral-700',
          text: 'text-neutral-600 dark:text-neutral-400',
          icon: 'text-neutral-500'
        }
      default:
        return {
          bg: 'bg-neutral-50 dark:bg-neutral-900',
          border: 'border-neutral-200 dark:border-neutral-700',
          text: 'text-neutral-600 dark:text-neutral-400',
          icon: 'text-neutral-500'
        }
    }
  }

  const colorClasses = getColorClasses(config.color)

  return (
    <main
      ref={mainRef}
      className={`flex min-h-content items-center justify-center p-4 ${className}`}
      tabIndex={-1}
      role="main"
      aria-labelledby="error-title"
      aria-describedby="error-description"
    >
      <div className="w-full max-w-md text-center">
        {/* 에러 아이콘 */}
        <div className="mb-6">
          <span 
            className={`text-8xl ${colorClasses.icon}`}
            role="img"
            aria-label={`HTTP ${status} 에러`}
          >
            {config.icon}
          </span>
        </div>

        {/* 에러 정보 */}
        <div className={`rounded-lg border p-6 ${colorClasses.bg} ${colorClasses.border}`}>
          <div className="mb-2 text-2xl font-bold text-neutral-900 dark:text-neutral-100">
            HTTP {status}
          </div>
          
          <h1 
            id="error-title"
            className="mb-3 text-xl font-semibold text-neutral-800 dark:text-neutral-200"
          >
            {finalTitle}
          </h1>
          
          <p 
            id="error-description"
            className={`mb-6 text-sm leading-relaxed ${colorClasses.text}`}
          >
            {finalDescription}
          </p>

          {/* 액션 버튼들 */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {/* 상태별 주 액션 버튼 */}
            {status === 401 && onLogin && (
              <button
                onClick={onLogin}
                className="rounded bg-primary-500 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-neutral-900"
              >
                로그인하기
              </button>
            )}

            {config.canRetry && onRetry && (
              <RetryButton
                onRetry={onRetry}
                variant="primary"
                className="sm:order-1"
              />
            )}

            {/* 홈으로 가기 버튼 */}
            {onHome && (
              <button
                onClick={onHome}
                className="rounded border border-neutral-300 bg-white px-6 py-2.5 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 dark:focus:ring-offset-neutral-900"
              >
                홈으로 가기
              </button>
            )}
          </div>

          {/* 개발자 정보 (개발 환경에서만) */}
          {showDeveloperInfo && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200">
                개발자 정보
              </summary>
              <div className="mt-2 rounded bg-neutral-100 p-3 text-xs font-mono text-neutral-800 dark:bg-neutral-800 dark:text-neutral-200">
                <div><strong>상태 코드:</strong> {status}</div>
                <div><strong>타임스탬프:</strong> {new Date().toISOString()}</div>
                <div><strong>User Agent:</strong> {navigator.userAgent}</div>
                <div><strong>URL:</strong> {window.location.href}</div>
              </div>
            </details>
          )}
        </div>
      </div>
    </main>
  )
}

/**
 * 네트워크 에러 디스플레이 컴포넌트
 * 오프라인 상태, 네트워크 timeout, 연결 실패 등을 처리
 */
export const NetworkErrorDisplay: React.FC<NetworkErrorProps> = ({
  error,
  onRetry,
  onOfflineMode,
  className = ''
}) => {
  return (
    <div 
      className={`rounded-lg border border-warning-200 bg-warning-50 p-4 dark:border-warning-800 dark:bg-warning-950 ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-2xl text-warning-500" role="img" aria-label="네트워크 오류">
            📡
          </span>
        </div>
        <div className="ml-3 w-full">
          <h3 className="text-sm font-medium text-warning-800 dark:text-warning-200">
            네트워크 연결 오류
          </h3>
          <p className="mt-1 text-sm text-warning-600 dark:text-warning-400">
            {error.message}
          </p>
          
          {error.retryCount && error.retryCount > 0 && (
            <p className="mt-1 text-xs text-warning-500 dark:text-warning-500">
              재시도 횟수: {error.retryCount}번
            </p>
          )}

          <div className="mt-3 flex gap-2">
            {onRetry && (
              <RetryButton
                onRetry={onRetry}
                variant="secondary"
                size="sm"
              />
            )}
            {error.isOffline && onOfflineMode && (
              <button
                onClick={onOfflineMode}
                className="rounded border border-warning-300 bg-warning-100 px-3 py-1.5 text-xs font-medium text-warning-700 transition-colors hover:bg-warning-200 focus:outline-none focus:ring-2 focus:ring-warning-500 focus:ring-offset-2 dark:border-warning-700 dark:bg-warning-800 dark:text-warning-200 dark:hover:bg-warning-700"
              >
                오프라인 모드
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * 오프라인 상태 표시기
 * 네트워크 연결 상태를 실시간으로 모니터링하고 표시
 */
export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  isOffline,
  onRetry,
  className = '',
  position = 'top'
}) => {
  if (!isOffline) return null

  const positionClasses = {
    top: 'fixed top-0 left-0 right-0 z-toast',
    bottom: 'fixed bottom-0 left-0 right-0 z-toast',
    floating: 'fixed top-4 right-4 z-toast max-w-sm'
  }

  return (
    <div 
      className={`animate-slide-down ${positionClasses[position]} ${className}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-error-500 px-4 py-3 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="mr-2 text-lg" role="img" aria-label="오프라인">
              📡
            </span>
            <span className="text-sm font-medium">
              인터넷 연결이 끊어졌습니다
            </span>
          </div>
          {onRetry && (
            <button
              onClick={onRetry}
              className="ml-4 text-xs underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-error-500"
            >
              다시 연결
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * 재시도 버튼 컴포넌트
 * 에러 상황에서 사용자가 액션을 취할 수 있도록 지원
 */
export const RetryButton: React.FC<RetryButtonProps> = ({
  onRetry,
  isRetrying = false,
  retryCount = 0,
  maxRetries,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = ''
}) => {
  const canRetry = maxRetries ? retryCount < maxRetries : true
  const isDisabled = disabled || isRetrying || !canRetry

  const variantClasses = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500 disabled:bg-primary-300',
    secondary: 'border border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-500 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700',
    minimal: 'text-primary-600 hover:text-primary-700 hover:underline focus:ring-primary-500'
  }

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  }

  return (
    <button
      onClick={onRetry}
      disabled={isDisabled}
      className={`rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 dark:focus:ring-offset-neutral-900 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      aria-label={isRetrying ? '재시도 중...' : '다시 시도'}
    >
      {isRetrying ? (
        <span className="flex items-center">
          <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          재시도 중...
        </span>
      ) : (
        <>
          다시 시도
          {maxRetries && (
            <span className="ml-1 text-xs opacity-75">
              ({retryCount}/{maxRetries})
            </span>
          )}
        </>
      )}
    </button>
  )
}

/**
 * 에러 알림 컴포넌트
 * 인라인 에러 표시용 (폼 검증 오류, API 오류 등)
 */
export const ErrorAlert: React.FC<{
  message: string
  onClose?: () => void
  variant?: 'error' | 'warning' | 'info'
  className?: string
}> = ({
  message,
  onClose,
  variant = 'error',
  className = ''
}) => {
  const variantConfig = {
    error: {
      icon: '❌',
      classes: 'bg-error-50 border-error-200 text-error-800 dark:bg-error-950 dark:border-error-800 dark:text-error-200'
    },
    warning: {
      icon: '⚠️',
      classes: 'bg-warning-50 border-warning-200 text-warning-800 dark:bg-warning-950 dark:border-warning-800 dark:text-warning-200'
    },
    info: {
      icon: 'ℹ️',
      classes: 'bg-primary-50 border-primary-200 text-primary-800 dark:bg-primary-950 dark:border-primary-800 dark:text-primary-200'
    }
  }

  const config = variantConfig[variant]

  return (
    <div 
      className={`flex items-center justify-between rounded border p-3 ${config.classes} ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center">
        <span className="mr-2 text-sm" role="img" aria-hidden="true">
          {config.icon}
        </span>
        <span className="text-sm font-medium">{message}</span>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="ml-3 flex-shrink-0 opacity-70 hover:opacity-100 focus:opacity-100 focus:outline-none"
          aria-label="알림 닫기"
        >
          <span className="text-lg">×</span>
        </button>
      )}
    </div>
  )
}

/**
 * 로딩 상태 디스플레이 컴포넌트
 * 데이터 로딩 중 표시되는 컴포넌트
 */
export const LoadingStateDisplay: React.FC<{
  message?: string
  variant?: 'spinner' | 'dots' | 'progress'
  className?: string
}> = ({
  message = '로딩 중...',
  variant = 'spinner',
  className = ''
}) => {
  const renderLoadingIndicator = () => {
    switch (variant) {
      case 'dots':
        return (
          <div className="flex space-x-1">
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary-500" style={{ animationDelay: '0ms' }}></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary-500" style={{ animationDelay: '150ms' }}></div>
            <div className="h-2 w-2 animate-bounce rounded-full bg-primary-500" style={{ animationDelay: '300ms' }}></div>
          </div>
        )
      case 'progress':
        return (
          <div className="w-full max-w-xs">
            <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
              <div className="h-full animate-pulse bg-primary-500"></div>
            </div>
          </div>
        )
      default:
        return (
          <svg className="h-8 w-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        )
    }
  }

  return (
    <div 
      className={`flex flex-col items-center justify-center p-8 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      {renderLoadingIndicator()}
      <span className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
        {message}
      </span>
    </div>
  )
}

/**
 * 스켈레톤 스크린 컴포넌트
 * 콘텐츠 로딩 중 레이아웃 구조를 미리 보여줌
 */
export const SkeletonScreen: React.FC<{
  lines?: number
  className?: string
}> = ({
  lines = 3,
  className = ''
}) => {
  return (
    <div className={`animate-pulse space-y-3 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 rounded bg-neutral-200 dark:bg-neutral-700"
          style={{
            width: `${Math.random() * 40 + 60}%`
          }}
        />
      ))}
    </div>
  )
}