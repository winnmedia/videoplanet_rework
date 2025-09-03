import React, { Component, ErrorInfo, ReactNode, useEffect, useRef, useState, createContext, useContext } from 'react'
import { logSecurityEvent } from '@/shared/lib/rbac-system'
import { AuthenticatedUser } from '@/features/authentication/model/types'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  retryCount: number
}

interface AccessibleErrorBoundaryProps {
  children: ReactNode
  fallback?: (error: Error, retry: () => void) => ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  maxRetries?: number
}

// Error Context for sharing error state across components
interface ErrorContextValue {
  reportError: (error: Error, context?: Record<string, unknown>) => void
  clearError: () => void
  hasActiveError: boolean
}

const ErrorContext = createContext<ErrorContextValue>({
  reportError: () => {},
  clearError: () => {},
  hasActiveError: false
})

export class AccessibleErrorBoundary extends Component<AccessibleErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeouts: NodeJS.Timeout[] = []
  
  constructor(props: AccessibleErrorBoundaryProps) {
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
    this.setState({ errorInfo })
    
    // Log error for security monitoring
    if (error.message.includes('permission') || error.message.includes('unauthorized')) {
      logSecurityEvent({
        type: 'PERMISSION_DENIED',
        userId: 'unknown',
        resource: 'UI_COMPONENT',
        permission: 'component:access',
        metadata: {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack
        }
      })
    }

    // Call external error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }

    // Announce error to screen readers
    this.announceError(error.message)
  }

  componentWillUnmount() {
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout))
  }

  private announceError = (message: string) => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'assertive')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = `오류가 발생했습니다: ${message}`
    
    document.body.appendChild(announcement)
    
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  private handleRetry = () => {
    const { maxRetries = 3 } = this.props
    
    if (this.state.retryCount >= maxRetries) {
      this.announceError('최대 재시도 횟수를 초과했습니다')
      return
    }

    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }))

    // Add a small delay before retry to prevent rapid retries
    const timeout = setTimeout(() => {
      this.announceError('다시 시도 중입니다')
    }, 100)
    
    this.retryTimeouts.push(timeout)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.handleRetry)
      }

      return (
        <FocusManagement autoFocus trapFocus>
          <div
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            aria-labelledby="error-title"
            aria-describedby="error-details"
            className="min-h-screen flex items-center justify-center bg-gray-50 px-4"
          >
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 space-y-4">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <svg
                    className="h-8 w-8 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                    />
                  </svg>
                </div>
                <div>
                  <h1 id="error-title" className="text-lg font-semibold text-gray-900">
                    오류가 발생했습니다
                  </h1>
                  <p className="text-sm text-gray-600">
                    페이지를 불러오는 중 문제가 발생했습니다
                  </p>
                </div>
              </div>

              <div 
                id="error-details" 
                aria-label="오류 상세 정보"
                className="bg-gray-50 rounded p-3 text-sm text-gray-700"
              >
                <strong>오류 메시지:</strong> {this.state.error.message}
                {this.state.retryCount > 0 && (
                  <div className="mt-2">
                    <strong>재시도 횟수:</strong> {this.state.retryCount}
                  </div>
                )}
              </div>

              <ErrorRecoveryActions
                retry={this.handleRetry}
                goBack={() => window.history.back()}
                requestPermission={() => {
                  // Implement permission request logic
                  this.announceError('권한 요청 기능은 준비 중입니다')
                }}
                disabled={this.state.retryCount >= (this.props.maxRetries || 3)}
              />
            </div>
          </div>
        </FocusManagement>
      )
    }

    return this.props.children
  }
}

// Permission Error Message Component
interface PermissionErrorMessageProps {
  permission: string
  resource?: string
  customMessage?: string
  severity?: 'low' | 'medium' | 'high'
  showRecoveryActions?: boolean
  onRequestPermission?: () => void
}

export function PermissionErrorMessage({
  permission,
  resource,
  customMessage,
  severity = 'medium',
  showRecoveryActions = false,
  onRequestPermission
}: PermissionErrorMessageProps) {
  const severityConfig = {
    low: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-600'
    },
    medium: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-600'
    },
    high: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-600'
    }
  }

  const config = severityConfig[severity]
  
  const getPermissionMessage = () => {
    if (customMessage) return customMessage
    
    if (severity === 'high') {
      return `높은 권한이 필요한 작업입니다. ${resource ? `'${resource}'에` : ''} 접근하기 위해서는 '${permission}' 권한이 필요합니다.`
    }
    
    return `이 작업을 수행하기 위해서는 '${permission}' 권한이 필요합니다. ${resource ? `리소스: ${resource}` : ''}`
  }

  return (
    <div
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      className={`rounded-md p-4 ${config.bgColor} ${config.borderColor} border`}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <svg
            className={`h-5 w-5 ${config.iconColor}`}
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M10 1C4.477 1 0 5.477 0 11c0 5.523 4.477 10 10 10s10-4.477 10-10C20 5.477 15.523 1 10 1zM8 7a1 1 0 012 0v4a1 1 0 11-2 0V7zM8 15a1 1 0 112 0 1 1 0 01-2 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className={`text-sm font-medium ${config.textColor}`}>
            권한 부족
          </h3>
          <div className={`mt-2 text-sm ${config.textColor}`}>
            <p>{getPermissionMessage()}</p>
            
            {showRecoveryActions && (
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex space-x-2">
                  <button
                    onClick={onRequestPermission}
                    className={`px-2 py-1.5 rounded-md text-sm font-medium ${config.textColor} hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    권한 요청
                  </button>
                  <button
                    onClick={() => window.history.back()}
                    className={`px-2 py-1.5 rounded-md text-sm font-medium ${config.textColor} hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    이전 페이지로
                  </button>
                  <button
                    onClick={() => {
                      // Open help documentation
                      window.open('/help/permissions', '_blank')
                    }}
                    className={`px-2 py-1.5 rounded-md text-sm font-medium ${config.textColor} hover:bg-opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                  >
                    도움말
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Focus Management Component
interface FocusManagementProps {
  children: ReactNode
  autoFocus?: boolean
  trapFocus?: boolean
  restoreFocus?: boolean
}

export function FocusManagement({
  children,
  autoFocus = false,
  trapFocus = false,
  restoreFocus = false
}: FocusManagementProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (restoreFocus) {
      previousActiveElement.current = document.activeElement as HTMLElement
    }

    if (autoFocus && containerRef.current) {
      const focusableElement = containerRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      
      if (focusableElement) {
        focusableElement.focus()
      }
    }

    return () => {
      if (restoreFocus && previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [autoFocus, restoreFocus])

  useEffect(() => {
    if (!trapFocus || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    ) as NodeListOf<HTMLElement>

    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault()
            firstElement.focus()
          }
        }
      }
    }

    container.addEventListener('keydown', handleKeyDown)
    return () => container.removeEventListener('keydown', handleKeyDown)
  }, [trapFocus])

  return (
    <div ref={containerRef} className="focus-management-container">
      {children}
    </div>
  )
}

// Error Recovery Actions Component
interface ErrorRecoveryActionsProps {
  retry?: () => void
  goBack?: () => void
  requestPermission?: () => void
  disabled?: boolean
  loading?: boolean
}

export function ErrorRecoveryActions({
  retry,
  goBack,
  requestPermission,
  disabled = false,
  loading = false
}: ErrorRecoveryActionsProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3" role="group" aria-label="오류 복구 작업">
      {retry && (
        <button
          onClick={retry}
          disabled={disabled || loading}
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-describedby="retry-help"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              재시도 중...
            </>
          ) : (
            '다시 시도'
          )}
        </button>
      )}
      
      {goBack && (
        <button
          onClick={goBack}
          disabled={disabled || loading}
          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          이전 페이지로
        </button>
      )}
      
      {requestPermission && (
        <button
          onClick={requestPermission}
          disabled={disabled || loading}
          className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          권한 요청
        </button>
      )}
      
      <div id="retry-help" className="sr-only">
        오류가 해결되지 않으면 페이지 새로고침을 시도하거나 관리자에게 문의하세요
      </div>
    </div>
  )
}