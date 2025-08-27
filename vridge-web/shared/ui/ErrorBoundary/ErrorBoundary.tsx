'use client'

import { Component, ErrorInfo, ReactNode } from 'react'

import styles from './ErrorBoundary.module.scss'
import { Button } from '../Button/Button'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** 커스텀 에러 메시지 */
  errorMessage?: string
  /** 커스텀 fallback UI */
  fallback?: ReactNode | ((error: Error, errorInfo: ErrorInfo) => ReactNode)
  /** 에러 발생 시 호출될 콜백 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /** 에러 세부사항 표시 여부 (개발 모드에서만) */
  showDetails?: boolean
  /** 재시도 버튼 표시 여부 */
  showRetry?: boolean
  /** 크기 변형 */
  size?: 'sm' | 'md' | 'lg'
  /** 추가 클래스명 */
  className?: string
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

/**
 * ErrorBoundary - 4개 모듈에서 공통 사용하는 React 에러 경계
 * 
 * @features
 * - JavaScript 에러 자동 포착 및 UI 표시
 * - 커스텀 fallback UI 지원
 * - 에러 보고 및 로깅
 * - 복구 기능 (새로고침, 재시도)
 * - 접근성 완전 지원 (WCAG 2.1 AA)
 * - 개발/프로덕션 모드 차별화
 * - 레거시 디자인 토큰 100% 적용
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0
    }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    })

    // 에러 보고 콜백 호출
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // 에러 로깅 (개발 모드)
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error)
      console.error('Error Info:', errorInfo)
    }
  }

  handleRefresh = () => {
    window.location.reload()
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: this.state.retryCount + 1
    })
  }

  render() {
    if (this.state.hasError) {
      const { 
        fallback, 
        errorMessage = '오류가 발생했습니다',
        showDetails = false,
        showRetry = false,
        size = 'md',
        className = ''
      } = this.props

      // 커스텀 fallback UI가 있으면 사용
      if (fallback) {
        if (typeof fallback === 'function') {
          return fallback(this.state.error!, this.state.errorInfo!)
        }
        return fallback
      }

      // 기본 에러 UI
      const classNames = [
        styles.errorBoundary,
        styles[size],
        className
      ].filter(Boolean).join(' ')

      const isDevelopment = process.env.NODE_ENV === 'development'
      const shouldShowDetails = showDetails && isDevelopment && this.state.error

      return (
        <div className={classNames} role="alert" aria-live="assertive">
          <div className={styles.content}>
            <div className={styles.icon}>
              <svg
                width="48"
                height="48" 
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
                <circle cx="12" cy="16" r="1" fill="currentColor"/>
              </svg>
            </div>
            
            <h2 className={styles.title}>{errorMessage}</h2>
            
            <p className={styles.description}>
              페이지를 새로고침해주세요.
            </p>

            <div className={styles.actions}>
              <Button
                variant="primary"
                onClick={this.handleRefresh}
                aria-label="새로고침"
              >
                새로고침
              </Button>
              
              {showRetry && (
                <Button
                  variant="outline"
                  onClick={this.handleRetry}
                  aria-label="재시도"
                >
                  재시도
                </Button>
              )}
            </div>

            {shouldShowDetails && (
              <details className={styles.details}>
                <summary>에러 세부사항</summary>
                <div className={styles.errorDetails}>
                  <pre className={styles.errorMessage}>
                    {this.state.error?.toString()}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className={styles.stackTrace}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}