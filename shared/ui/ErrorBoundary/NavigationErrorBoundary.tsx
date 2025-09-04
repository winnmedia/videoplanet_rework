'use client'

import React from 'react'

interface NavigationErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

interface NavigationErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

/**
 * NavigationErrorBoundary - 네비게이션 관련 에러 처리
 * 
 * NavigationProvider와 관련된 에러를 캐치하여
 * 우아한 fallback UI를 표시하고 사용자에게 복구 옵션 제공
 */
export class NavigationErrorBoundary extends React.Component<
  NavigationErrorBoundaryProps,
  NavigationErrorBoundaryState
> {
  constructor(props: NavigationErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    }
    
    this.resetError = this.resetError.bind(this)
  }

  static getDerivedStateFromError(error: Error): Partial<NavigationErrorBoundaryState> {
    // NavigationProvider 관련 에러만 캐치
    if (error.message.includes('NavigationProvider') || 
        error.message.includes('useNavigation')) {
      return { hasError: true, error }
    }
    
    // 다른 에러는 상위로 전파
    throw error
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // NavigationProvider 관련 에러 로깅
    console.error('NavigationErrorBoundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
    
    this.setState({
      error,
      errorInfo
    })
    
    // 선택적 에러 콜백 실행
    this.props.onError?.(error, errorInfo)
  }

  resetError() {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    })
  }

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback
      
      if (FallbackComponent) {
        return (
          <FallbackComponent 
            error={this.state.error || undefined}
            resetError={this.resetError}
          />
        )
      }
      
      return <DefaultNavigationErrorFallback resetError={this.resetError} />
    }

    return this.props.children
  }
}

/**
 * 기본 네비게이션 에러 fallback 컴포넌트
 */
function DefaultNavigationErrorFallback({ resetError }: { resetError: () => void }) {
  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gray-50"
      role="alert"
      aria-live="assertive"
    >
      <div className="max-w-md w-full mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="w-16 h-16 mx-auto mb-4 text-red-500">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.102 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            네비게이션을 초기화할 수 없습니다
          </h1>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            페이지 네비게이션 시스템에 문제가 발생했습니다.<br />
            잠시 후 다시 시도해주세요.
          </p>
          
          <div className="space-y-3">
            <button
              onClick={resetError}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
              aria-label="네비게이션 시스템 재시도"
            >
              다시 시도
            </button>
            
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="w-full px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
              aria-label="대시보드로 이동"
            >
              대시보드로 이동
            </button>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          문제가 지속되면 페이지를 새로고침하거나 관리자에게 문의하세요.
        </div>
      </div>
    </div>
  )
}

/**
 * HOC: 컴포넌트를 NavigationErrorBoundary로 감싸는 헬퍼
 */
export function withNavigationErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error?: Error; resetError: () => void }>
) {
  const WrappedComponent = (props: P) => (
    <NavigationErrorBoundary fallback={fallback}>
      <Component {...props} />
    </NavigationErrorBoundary>
  )
  
  WrappedComponent.displayName = `withNavigationErrorBoundary(${Component.displayName || Component.name})`
  
  return WrappedComponent
}

export default NavigationErrorBoundary