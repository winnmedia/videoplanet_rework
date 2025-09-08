/**
 * Comprehensive Error Boundary Component
 * React 에러를 포착하고 사용자 친화적으로 처리
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

// 네트워크 상태 열거형 (NetworkMonitor가 없을 경우 대비)
enum NetworkStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
  SLOW = 'slow',
  UNKNOWN = 'unknown'
}

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<ErrorBoundaryFallbackProps>;
  onError?: (error: Error) => void;
  isolate?: boolean;
  level?: 'page' | 'section' | 'component';
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorId: string | null;
  isRetrying: boolean;
  retryCount: number;
  networkStatus: NetworkStatus;
}

export interface ErrorBoundaryFallbackProps {
  error: Error | null;
  errorId: string | null;
  retry: () => void;
  isRetrying: boolean;
  retryCount: number;
  networkStatus: NetworkStatus;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  private maxRetries = 3;
  private retryTimeouts: NodeJS.Timeout[] = [];

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorId: null,
      isRetrying: false,
      retryCount: 0,
      networkStatus: typeof navigator !== 'undefined' ? 
        (navigator.onLine ? NetworkStatus.ONLINE : NetworkStatus.OFFLINE) : 
        NetworkStatus.UNKNOWN
    };
  }

  componentDidMount() {
    // 네트워크 상태 모니터링
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
    }
  }

  componentWillUnmount() {
    // 정리
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
    }
  }

  handleOnline = () => {
    this.setState({ networkStatus: NetworkStatus.ONLINE });
    
    // 네트워크 복구 시 자동 재시도
    if (this.state.hasError) {
      this.handleRetry();
    }
  };

  handleOffline = () => {
    this.setState({ networkStatus: NetworkStatus.OFFLINE });
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error: error,
      errorId: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.group('🚨 Error Boundary Caught Error');
    console.error('Original Error:', error);
    console.error('Error Info:', errorInfo);
    console.error('Component:', this.props.level || 'unknown');
    console.groupEnd();

    // 사용자 정의 에러 핸들러 실행
    if (this.props.onError) {
      this.props.onError(error);
    }

    // 외부 에러 로깅 서비스에 보고 (production 환경)
    if (process.env.NODE_ENV === 'production') {
      this.reportError(error, errorInfo);
    }
  }

  private async reportError(error: Error, errorInfo: ErrorInfo): Promise<void> {
    try {
      await fetch('/api/errors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error: {
            message: error.message,
            stack: error.stack,
            name: error.name
          },
          errorInfo: {
            componentStack: errorInfo.componentStack
          },
          context: {
            url: window.location.href,
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString(),
            level: this.props.level
          }
        })
      });
    } catch (reportError) {
      console.error('Failed to report error:', reportError);
    }
  }

  handleRetry = (): void => {
    if (this.state.retryCount >= this.maxRetries) {
      console.warn('Max retry attempts reached');
      return;
    }

    this.setState({ 
      isRetrying: true,
      retryCount: this.state.retryCount + 1
    });

    // 지수 백오프로 재시도
    const delay = Math.min(1000 * Math.pow(2, this.state.retryCount), 8000);
    
    const timeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        error: null,
        errorId: null,
        isRetrying: false
      });
    }, delay);

    this.retryTimeouts.push(timeoutId);
  };

  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorId={this.state.errorId}
          retry={this.handleRetry}
          isRetrying={this.state.isRetrying}
          retryCount={this.state.retryCount}
          networkStatus={this.state.networkStatus}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * 기본 에러 폴백 컴포넌트
 */
const DefaultErrorFallback: React.FC<ErrorBoundaryFallbackProps> = ({
  error,
  errorId,
  retry,
  isRetrying,
  retryCount,
  networkStatus
}) => {
  const isOffline = networkStatus === NetworkStatus.OFFLINE;
  const canRetry = retryCount < 3;

  return (
    <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-red-200 bg-red-50 p-8 text-center">
      <div className="mb-4 text-6xl">
        {isOffline ? '📶' : '⚠️'}
      </div>
      
      <h2 className="mb-2 text-xl font-semibold text-red-900">
        {isOffline ? '인터넷 연결이 끊어졌습니다' : '일시적인 문제가 발생했습니다'}
      </h2>
      
      <p className="mb-6 max-w-md text-red-700">
        {isOffline 
          ? '인터넷 연결을 확인하고 다시 시도해주세요.'
          : error?.message || '페이지를 불러오는 중 문제가 발생했습니다.'}
      </p>

      <div className="flex gap-3">
        {canRetry && (
          <button
            onClick={retry}
            disabled={isRetrying}
            className="rounded-md bg-red-600 px-4 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isRetrying 
              ? `재시도 중... (${retryCount + 1}/3)` 
              : '다시 시도'}
          </button>
        )}
        
        <button
          onClick={() => window.location.reload()}
          className="rounded-md border border-red-600 px-4 py-2 text-red-600 hover:bg-red-50"
        >
          페이지 새로고침
        </button>
      </div>

      {process.env.NODE_ENV === 'development' && error && (
        <details className="mt-6 w-full max-w-2xl">
          <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
            개발자 정보 (에러 ID: {errorId})
          </summary>
          <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-3 text-left text-xs text-gray-800">
            {JSON.stringify({
              message: error.message,
              stack: error.stack,
              name: error.name
            }, null, 2)}
          </pre>
        </details>
      )}

      <div className="mt-4 text-sm text-gray-500">
        네트워크 상태: {
          networkStatus === NetworkStatus.ONLINE ? '🟢 온라인' :
          networkStatus === NetworkStatus.OFFLINE ? '🔴 오프라인' :
          networkStatus === NetworkStatus.SLOW ? '🟡 느린 연결' : 
          '⚪ 알 수 없음'
        }
      </div>
    </div>
  );
};
