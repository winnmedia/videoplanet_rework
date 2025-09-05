/**
 * Comprehensive Error Handler
 * 통합 에러 처리 시스템 핵심 클래스
 */

import type { 
  AppError, 
  ErrorContext, 
  ErrorCategory, 
  ErrorSeverity,
  ErrorDisplayOptions,
  ErrorReportData 
} from './types';

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: Set<(error: AppError) => void> = new Set();
  private reportQueue: ErrorReportData[] = [];
  private maxReportQueueSize = 100;

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * 에러 핸들링 메인 진입점
   */
  handleError(error: Error | AppError, context?: Partial<ErrorContext>): void {
    const appError = this.normalizeError(error, context);
    
    // 에러 로깅
    this.logError(appError);
    
    // 에러 보고 (비동기)
    this.reportError(appError);
    
    // 리스너들에게 알림
    this.notifyListeners(appError);
    
    // 자동 복구 시도 (해당되는 경우)
    this.attemptAutoRecovery(appError);
  }

  /**
   * 에러 정규화 - 모든 에러를 AppError 형식으로 변환
   */
  private normalizeError(error: Error | AppError, context?: Partial<ErrorContext>): AppError {
    if (this.isAppError(error)) {
      // 컨텍스트 업데이트
      return {
        ...error,
        context: {
          ...error.context,
          ...context
        }
      };
    }

    // 일반 Error를 AppError로 변환
    const baseContext: ErrorContext = {
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      ...context
    };

    // 네트워크 에러 감지
    if (this.isNetworkError(error)) {
      return {
        code: 'NETWORK_ERROR',
        message: error.message || 'Network error occurred',
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        context: baseContext,
        stack: error.stack,
        cause: error
      };
    }

    // 기본 시스템 에러
    return {
      code: 'SYSTEM_ERROR',
      message: error.message || 'An unexpected error occurred',
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.MEDIUM,
      context: baseContext,
      stack: error.stack,
      cause: error
    };
  }

  /**
   * 에러 타입 체크
   */
  private isAppError(error: any): error is AppError {
    return error && typeof error.code === 'string' && typeof error.category === 'string';
  }

  /**
   * 네트워크 에러 감지
   */
  private isNetworkError(error: Error): boolean {
    const networkIndicators = [
      'NetworkError', 'fetch', 'NETWORK_', 'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED', 'ERR_CONNECTION',
      'timeout', 'TIMEOUT', 'ENOTFOUND', 'ECONNREFUSED'
    ];
    
    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();
    
    return networkIndicators.some(indicator => 
      message.includes(indicator.toLowerCase()) || 
      name.includes(indicator.toLowerCase())
    );
  }

  /**
   * 에러 로깅 (레벨별)
   */
  private logError(error: AppError): void {
    const logData = {
      code: error.code,
      message: error.message,
      category: error.category,
      severity: error.severity,
      timestamp: error.context.timestamp,
      component: error.context.component,
      userId: error.context.userId
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error('🚨 CRITICAL ERROR:', logData);
        break;
      case ErrorSeverity.HIGH:
        console.error('❌ HIGH SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn('⚠️ MEDIUM SEVERITY ERROR:', logData);
        break;
      case ErrorSeverity.LOW:
        console.info('ℹ️ LOW SEVERITY ERROR:', logData);
        break;
    }

    // 개발 환경에서는 전체 스택 트레이스 출력
    if (process.env.NODE_ENV === 'development' && error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }

  /**
   * 에러 보고 시스템
   */
  private async reportError(error: AppError): Promise<void> {
    // 보고 큐에 추가
    const reportData: ErrorReportData = {
      error,
      reportedAt: new Date().toISOString()
    };

    this.reportQueue.push(reportData);

    // 큐 크기 관리
    if (this.reportQueue.length > this.maxReportQueueSize) {
      this.reportQueue.shift();
    }

    // Critical 에러는 즉시 보고
    if (error.severity === ErrorSeverity.CRITICAL) {
      await this.flushReports();
    }
  }

  /**
   * 에러 보고 플러시 (배치 처리)
   */
  private async flushReports(): Promise<void> {
    if (this.reportQueue.length === 0) return;

    try {
      // 실제 환경에서는 외부 서비스로 보고
      if (process.env.NODE_ENV === 'production') {
        await fetch('/api/errors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ errors: this.reportQueue })
        });
      }

      // 보고 완료 후 큐 비우기
      this.reportQueue = [];
    } catch (reportError) {
      console.error('Failed to report errors:', reportError);
    }
  }

  /**
   * 자동 복구 시도
   */
  private async attemptAutoRecovery(error: AppError): Promise<void> {
    switch (error.category) {
      case ErrorCategory.NETWORK:
        await this.attemptNetworkRecovery(error);
        break;
      case ErrorCategory.API:
        await this.attemptAPIRecovery(error);
        break;
      default:
        // 자동 복구 불가
        break;
    }
  }

  /**
   * 네트워크 복구 시도
   */
  private async attemptNetworkRecovery(error: AppError): Promise<void> {
    // 간단한 연결성 체크
    try {
      await fetch('/api/health', { method: 'HEAD' });
      console.log('Network recovery: Connection restored');
    } catch {
      // 복구 실패 - 사용자에게 알림 필요
    }
  }

  /**
   * API 복구 시도
   */
  private async attemptAPIRecovery(error: AppError): Promise<void> {
    // API 재시도 로직 (지수 백오프)
    // 실제 구현에서는 더 정교한 재시도 메커니즘 필요
  }

  /**
   * 에러 리스너 등록
   */
  addErrorListener(listener: (error: AppError) => void): () => void {
    this.errorListeners.add(listener);
    
    // 언등록 함수 반환
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /**
   * 리스너들에게 에러 알림
   */
  private notifyListeners(error: AppError): void {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  /**
   * 주기적 보고 플러시 (5분마다)
   */
  startPeriodicReporting(): void {
    setInterval(() => {
      if (this.reportQueue.length > 0) {
        this.flushReports();
      }
    }, 5 * 60 * 1000); // 5분
  }

  /**
   * 에러 통계 조회
   */
  getErrorStats(): { total: number; byCategory: Record<string, number>; bySeverity: Record<string, number> } {
    const stats = {
      total: this.reportQueue.length,
      byCategory: {} as Record<string, number>,
      bySeverity: {} as Record<string, number>
    };

    this.reportQueue.forEach(report => {
      const { category, severity } = report.error;
      
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
      stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
    });

    return stats;
  }
}

// 전역 에러 핸들러 초기화
export const errorHandler = ErrorHandler.getInstance();