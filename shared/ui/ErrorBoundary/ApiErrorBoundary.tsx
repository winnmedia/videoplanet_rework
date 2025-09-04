/**
 * API Error Boundary
 * API 통신 오류를 우아하게 처리하는 에러 바운더리 컴포넌트
 */

'use client'

import React, { Component, ReactNode } from 'react'

interface ApiError {
  message: string
  status: number
  code?: string
  details?: unknown
}

interface Props {
  children: ReactNode
  fallback?: (error: ApiError, retry: () => void) => ReactNode
  onError?: (error: ApiError, errorInfo: React.ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: ApiError | null
  errorId: string
}

class ApiErrorBoundary extends Component<Props, State> {
  private retryCount = 0
  private maxRetries = 3

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorId: ''
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // API 에러인지 확인
    const isApiError = error.name === 'ApiError' || 
                       error.message.includes('RAILWAY_') ||
                       error.message.includes('API') ||
                       error.message.includes('네트워크')

    if (isApiError) {
      return {
        hasError: true,
        error: {
          message: error.message,
          status: (error as any).status || 500,
          code: (error as any).code || 'UNKNOWN_ERROR'
        },
        errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }
    }

    // API 에러가 아니면 상위로 전파
    throw error
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // 에러 로깅 및 모니터링
    console.error('API Error Boundary caught an error:', error)
    
    // 개발 환경에서는 상세 정보 출력
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 API Error Details')
      console.error('Error:', error)
      console.error('Error Info:', errorInfo)
      console.error('Component Stack:', errorInfo.componentStack)
      console.groupEnd()
    }

    // 사용자 정의 에러 핸들러 호출
    if (this.props.onError && this.state.error) {
      this.props.onError(this.state.error, errorInfo)
    }

    // 에러 리포팅 서비스에 전송 (예: Sentry)
    // this.reportError(error, errorInfo)
  }

  private reportError = (error: Error, errorInfo: React.ErrorInfo) => {
    // 프로덕션 환경에서 에러 리포팅 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      // Sentry, LogRocket 등의 서비스로 전송
      console.error('Report to error service:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId: this.state.errorId
      })
    }
  }

  private handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++
      this.setState({
        hasError: false,
        error: null,
        errorId: ''
      })
    }
  }

  private renderDefaultFallback = (error: ApiError) => {
    const canRetry = this.retryCount < this.maxRetries
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200">
            {/* 에러 아이콘 */}
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg 
                  className="w-6 h-6 text-red-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
                  />
                </svg>
              </div>
            </div>

            {/* 에러 제목 */}
            <div className="text-center mb-4">
              <h1 className="text-xl font-semibold text-gray-900 mb-2">
                서비스 연결 문제
              </h1>
              <p className="text-sm text-gray-600">
                {this.getErrorMessage(error)}
              </p>
            </div>

            {/* 에러 상세 정보 (개발 환경에서만) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-3 bg-gray-50 rounded-md text-xs">
                <details>
                  <summary className="cursor-pointer text-gray-700 font-medium mb-2">
                    개발자 정보
                  </summary>
                  <div className="space-y-1 text-gray-600">
                    <div><strong>상태:</strong> {error.status}</div>
                    <div><strong>코드:</strong> {error.code}</div>
                    <div><strong>에러 ID:</strong> {this.state.errorId}</div>
                    <div><strong>재시도:</strong> {this.retryCount}/{this.maxRetries}</div>
                  </div>
                </details>
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="flex flex-col space-y-2">
              {canRetry && (
                <button
                  onClick={this.handleRetry}
                  className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md 
                           hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
                           focus:ring-offset-2 transition-colors duration-200"
                >
                  다시 시도 ({this.maxRetries - this.retryCount}회 남음)
                </button>
              )}
              
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-gray-600 text-white font-medium rounded-md 
                         hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 
                         focus:ring-offset-2 transition-colors duration-200"
              >
                페이지 새로고침
              </button>

              <button
                onClick={() => window.location.href = '/dashboard'}
                className="w-full px-4 py-2 bg-white text-gray-700 font-medium rounded-md 
                         border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 
                         focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
              >
                대시보드로 이동
              </button>
            </div>

            {/* 도움말 링크 */}
            <div className="text-center mt-4">
              <p className="text-xs text-gray-500">
                문제가 지속되면 관리자에게 문의하세요.
                <br />
                <span className="font-mono">에러 ID: {this.state.errorId}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  private getErrorMessage = (error: ApiError): string => {
    // Railway 백엔드 특화 에러 메시지
    if (error.code?.includes('RAILWAY_')) {
      switch (error.code) {
        case 'RAILWAY_CONNECTION_FAILED':
          return '백엔드 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.'
        case 'RAILWAY_ENDPOINT_NOT_FOUND':
          return '요청한 API를 찾을 수 없습니다. 서비스가 업데이트 중일 수 있습니다.'
        case 'RAILWAY_SERVER_ERROR':
          return '서버에서 일시적인 오류가 발생했습니다.'
        case 'RAILWAY_AUTH_FAILED':
          return '인증에 문제가 있습니다. 다시 로그인해주세요.'
        default:
          return '서비스 연결에 문제가 있습니다.'
      }
    }

    // 일반적인 HTTP 상태 코드 메시지
    switch (error.status) {
      case 0:
        return '네트워크 연결을 확인해주세요.'
      case 401:
        return '로그인이 필요합니다.'
      case 403:
        return '접근 권한이 없습니다.'
      case 404:
        return '요청한 페이지를 찾을 수 없습니다.'
      case 408:
        return '요청 시간이 초과되었습니다.'
      case 429:
        return '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.'
      case 500:
        return '서버 내부 오류가 발생했습니다.'
      case 502:
        return '서버 게이트웨이 오류가 발생했습니다.'
      case 503:
        return '서비스를 일시적으로 사용할 수 없습니다.'
      case 504:
        return '서버 응답 시간이 초과되었습니다.'
      default:
        return error.message || '알 수 없는 오류가 발생했습니다.'
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      // 사용자 정의 fallback이 있으면 사용
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry)
      }

      // 기본 fallback UI 렌더링
      return this.renderDefaultFallback(this.state.error)
    }

    return this.props.children
  }
}

export default ApiErrorBoundary