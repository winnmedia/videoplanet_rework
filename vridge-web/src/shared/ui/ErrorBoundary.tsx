/**
 * FSD 준수 에러 바운더리 컴포넌트
 * 경계: shared/ui - 재사용 가능한 UI 컴포넌트
 */

import React, { Component, ReactNode, ErrorInfo } from 'react'
import {
  BaseError,
  createErrorBoundaryState,
  ErrorBoundaryState,
  GlobalErrorHandler,
  ConsoleErrorLogger
} from '../lib/error-handling'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: React.ComponentType<ErrorFallbackProps>
  onError?: (error: BaseError, errorInfo: ErrorInfo) => void
  resetOnPropsChange?: boolean
  resetKeys?: Array<string | number>
}

interface ErrorFallbackProps {
  error: BaseError
  errorId: string
  resetError: () => void
}

interface ErrorBoundaryComponentState extends ErrorBoundaryState {
  prevResetKeys?: Array<string | number>
}

/**
 * 기본 에러 폴백 컴포넌트 (Tailwind CSS 사용)
 */
export const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  errorId, 
  resetError 
}) => {
  const isDevelopment = process.env.NODE_ENV === 'development'

  const getErrorIcon = (error: BaseError): string => {
    switch (error.httpStatus) {
      case 401:
        return '🔐'
      case 403:
        return '⛔'
      case 404:
        return '🔍'
      case 500:
        return '⚠️'
      default:
        return '❌'
    }
  }

  const getErrorTitle = (error: BaseError): string => {
    switch (error.httpStatus) {
      case 401:
        return '로그인이 필요합니다'
      case 403:
        return '접근 권한이 없습니다'
      case 404:
        return '페이지를 찾을 수 없습니다'
      case 500:
        return '서버 오류가 발생했습니다'
      default:
        return '오류가 발생했습니다'
    }
  }

  return (
    <div className=\"flex min-h-96 items-center justify-center p-4\">
      <div className=\"w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center shadow-sm\">
        <div className=\"mb-4 text-6xl\">{getErrorIcon(error)}</div>
        
        <h2 className=\"mb-2 text-xl font-semibold text-red-800\">
          {getErrorTitle(error)}
        </h2>
        
        <p className=\"mb-4 text-sm text-red-600\">
          {error.message}
        </p>
        
        <div className=\"flex flex-col gap-2 sm:flex-row sm:justify-center\">
          <button
            onClick={resetError}
            className=\"rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2\"
          >
            다시 시도
          </button>
          
          <button
            onClick={() => window.location.reload()}
            className=\"rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2\"
          >
            새로고침
          </button>
        </div>
        
        {isDevelopment && (
          <details className=\"mt-6 text-left\">
            <summary className=\"cursor-pointer text-xs text-red-500 hover:text-red-700\">
              개발자 정보 (에러 ID: {errorId})
            </summary>
            <div className=\"mt-2 rounded bg-red-100 p-2 text-xs font-mono text-red-800\">
              <div><strong>코드:</strong> {error.code}</div>
              <div><strong>HTTP 상태:</strong> {error.httpStatus}</div>
              <div><strong>타임스탬프:</strong> {error.timestamp}</div>
              {error.context && (
                <div className=\"mt-2\">
                  <strong>컨텍스트:</strong>
                  <pre className=\"mt-1 whitespace-pre-wrap\">
                    {JSON.stringify(error.context, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

/**
 * 최소화된 인라인 에러 폴백 컴포넌트
 */
export const MinimalErrorFallback: React.FC<ErrorFallbackProps> = ({ 
  error, 
  resetError 
}) => (
  <div className=\"rounded border border-red-200 bg-red-50 p-4\">
    <div className=\"flex items-center justify-between\">
      <div className=\"flex items-center\">
        <span className=\"text-red-500\">⚠️</span>
        <span className=\"ml-2 text-sm text-red-700\">{error.message}</span>
      </div>
      <button
        onClick={resetError}
        className=\"ml-4 text-xs text-red-600 underline hover:text-red-800\"
      >
        다시 시도
      </button>
    </div>
  </div>
)

/**
 * React Error Boundary 구현
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryComponentState> {
  private errorHandler: GlobalErrorHandler

  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = createErrorBoundaryState()
    this.errorHandler = new GlobalErrorHandler(new ConsoleErrorLogger())
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryComponentState> {
    return createErrorBoundaryState(error)
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const boundaryState = createErrorBoundaryState(error)
    
    if (boundaryState.error) {
      // 에러 로깅
      this.errorHandler.handleError({
        error: boundaryState.error,
        message: boundaryState.error.message,
        filename: errorInfo.componentStack.split('\\n')[1] || 'ErrorBoundary',
        lineno: 0,
        colno: 0
      } as ErrorEvent)
      
      // 사용자 정의 에러 핸들러 호출
      this.props.onError?.(boundaryState.error, errorInfo)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    const { resetOnPropsChange, resetKeys } = this.props
    const { hasError, prevResetKeys } = this.state

    // resetKeys 변경 시 에러 상태 초기화
    if (hasError && resetKeys && resetKeys !== prevResetKeys) {
      this.setState({
        ...createErrorBoundaryState(),
        prevResetKeys: resetKeys
      })
      return
    }

    // props 변경 시 에러 상태 초기화 (resetOnPropsChange가 true일 때)
    if (hasError && resetOnPropsChange && prevProps.children !== this.props.children) {
      this.setState(createErrorBoundaryState())
    }
  }

  resetError = () => {
    this.setState(createErrorBoundaryState())
  }

  render() {
    const { hasError, error, errorId } = this.state
    const { children, fallback: FallbackComponent = DefaultErrorFallback } = this.props

    if (hasError && error && errorId) {
      return (
        <FallbackComponent
          error={error}
          errorId={errorId}
          resetError={this.resetError}
        />
      )
    }

    return children
  }
}

/**
 * Hook 기반 에러 바운더리 (함수형 컴포넌트용)
 */
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`
  return WrappedComponent
}

/**
 * 비동기 에러를 Error Boundary로 전달하는 Hook
 */
export const useErrorHandler = () => {
  return React.useCallback((error: Error | BaseError) => {
    // React Error Boundary는 render 단계의 에러만 캐치하므로
    // 비동기 에러를 동기 에러로 변환
    React.useState(() => {
      throw error
    })
  }, [])
}

/**
 * 특정 도메인용 에러 바운더리 프리셋
 */
export const ProjectErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={({ error, errorId, resetError }) => (
      <DefaultErrorFallback
        error={error}
        errorId={errorId}
        resetError={resetError}
      />
    )}
    onError={(error, errorInfo) => {
      // 프로젝트 관련 에러 특별 처리
      console.error('[PROJECT_ERROR_BOUNDARY]', {
        error: {
          code: error.code,
          message: error.message,
          httpStatus: error.httpStatus
        },
        componentStack: errorInfo.componentStack
      })
    }}
  >
    {children}
  </ErrorBoundary>
)

export const AuthErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary
    fallback={({ error, errorId, resetError }) => {
      // 인증 에러는 로그인 페이지로 리다이렉트 옵션 제공
      const handleLoginRedirect = () => {
        window.location.href = '/login'
      }

      return (
        <div className=\"flex min-h-96 items-center justify-center p-4\">
          <div className=\"w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center shadow-sm\">
            <div className=\"mb-4 text-6xl\">🔐</div>
            <h2 className=\"mb-2 text-xl font-semibold text-red-800\">
              인증 오류가 발생했습니다
            </h2>
            <p className=\"mb-4 text-sm text-red-600\">{error.message}</p>
            <div className=\"flex flex-col gap-2 sm:flex-row sm:justify-center\">
              <button
                onClick={handleLoginRedirect}
                className=\"rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700\"
              >
                로그인 페이지로
              </button>
              <button
                onClick={resetError}
                className=\"rounded border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50\"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      )
    }}
    onError={(error) => {
      // 인증 에러 특별 처리 - 토큰 삭제 등
      if (error.httpStatus === 401) {
        localStorage.removeItem('accessToken')
        sessionStorage.removeItem('accessToken')
      }
    }}
  >
    {children}
  </ErrorBoundary>
)