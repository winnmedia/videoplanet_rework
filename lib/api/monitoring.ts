/**
 * API 모니터링 및 로깅 시스템
 * API 호출 추적, 성능 메트릭, 에러 모니터링을 제공
 */

import { ApiError } from './client'

// 로그 레벨 정의
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

// 메트릭 타입 정의
export interface ApiMetrics {
  endpoint: string
  method: string
  statusCode: number
  responseTime: number
  timestamp: string
  userAgent?: string
  userId?: string
  requestId: string
  success: boolean
  errorType?: string
  retryAttempts?: number
}

export interface ErrorLog {
  level: LogLevel
  message: string
  error?: Error | ApiError
  context?: Record<string, unknown>
  timestamp: string
  requestId: string
  endpoint?: string
  userId?: string
  stack?: string
}

// 성능 메트릭 수집기
class PerformanceCollector {
  private metrics: Map<string, ApiMetrics[]> = new Map()
  private readonly maxMetricsPerEndpoint = 1000
  
  record(metric: ApiMetrics): void {
    const key = `${metric.method}:${metric.endpoint}`
    const existingMetrics = this.metrics.get(key) || []
    
    existingMetrics.push(metric)
    
    // 메모리 사용량 제한을 위해 오래된 메트릭 제거
    if (existingMetrics.length > this.maxMetricsPerEndpoint) {
      existingMetrics.shift()
    }
    
    this.metrics.set(key, existingMetrics)
  }
  
  getMetrics(endpoint?: string, method?: string): ApiMetrics[] {
    if (endpoint && method) {
      const key = `${method}:${endpoint}`
      return this.metrics.get(key) || []
    }
    
    // 모든 메트릭 반환
    const allMetrics: ApiMetrics[] = []
    this.metrics.forEach(metrics => allMetrics.push(...metrics))
    return allMetrics
  }
  
  getAverageResponseTime(endpoint: string, method: string): number {
    const metrics = this.getMetrics(endpoint, method)
    if (metrics.length === 0) return 0
    
    const totalTime = metrics.reduce((sum, metric) => sum + metric.responseTime, 0)
    return totalTime / metrics.length
  }
  
  getErrorRate(endpoint: string, method: string): number {
    const metrics = this.getMetrics(endpoint, method)
    if (metrics.length === 0) return 0
    
    const errorCount = metrics.filter(metric => !metric.success).length
    return errorCount / metrics.length
  }
  
  getSummary(): Record<string, { avgResponseTime: number; errorRate: number; totalRequests: number }> {
    const summary: Record<string, { avgResponseTime: number; errorRate: number; totalRequests: number }> = {}
    
    this.metrics.forEach((metrics, key) => {
      const totalRequests = metrics.length
      const avgResponseTime = metrics.reduce((sum, metric) => sum + metric.responseTime, 0) / totalRequests
      const errorCount = metrics.filter(metric => !metric.success).length
      const errorRate = errorCount / totalRequests
      
      summary[key] = { avgResponseTime, errorRate, totalRequests }
    })
    
    return summary
  }
}

// 로그 수집기
class LogCollector {
  private logs: ErrorLog[] = []
  private readonly maxLogs = 5000
  
  log(log: ErrorLog): void {
    this.logs.push(log)
    
    // 메모리 제한을 위해 오래된 로그 제거
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
    
    // 콘솔 출력
    this.outputToConsole(log)
    
    // 프로덕션 환경에서는 외부 로깅 서비스로 전송
    if (process.env.NODE_ENV === 'production') {
      this.sendToExternalService(log)
    }
  }
  
  private outputToConsole(log: ErrorLog): void {
    const timestamp = new Date(log.timestamp).toISOString()
    const contextStr = log.context ? JSON.stringify(log.context, null, 2) : ''
    
    const message = `[${timestamp}] [${log.level.toUpperCase()}] ${log.message}${contextStr ? '\n' + contextStr : ''}`
    
    switch (log.level) {
      case LogLevel.DEBUG:
        console.debug(message, log.error)
        break
      case LogLevel.INFO:
        console.info(message, log.error)
        break
      case LogLevel.WARN:
        console.warn(message, log.error)
        break
      case LogLevel.ERROR:
        console.error(message, log.error)
        if (log.stack) {
          console.error(log.stack)
        }
        break
    }
  }
  
  private async sendToExternalService(log: ErrorLog): Promise<void> {
    // 실제 환경에서는 Sentry, DataDog, CloudWatch 등으로 전송
    try {
      // 예시: webhook으로 알림 전송
      if (log.level === LogLevel.ERROR) {
        // await fetch('/api/monitoring/alert', {
        //   method: 'POST',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify(log)
        // })
      }
    } catch (error) {
      console.warn('외부 로깅 서비스 전송 실패:', error)
    }
  }
  
  getLogs(level?: LogLevel, limit = 100): ErrorLog[] {
    let filteredLogs = this.logs
    
    if (level) {
      filteredLogs = this.logs.filter(log => log.level === level)
    }
    
    return filteredLogs.slice(-limit)
  }
  
  getErrorStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    
    this.logs.forEach(log => {
      if (log.level === LogLevel.ERROR && log.endpoint) {
        const key = log.endpoint
        stats[key] = (stats[key] || 0) + 1
      }
    })
    
    return stats
  }
}

// 모니터링 클래스
export class ApiMonitor {
  private static instance: ApiMonitor
  private performanceCollector = new PerformanceCollector()
  private logCollector = new LogCollector()
  private requestIdCounter = 0
  
  static getInstance(): ApiMonitor {
    if (!ApiMonitor.instance) {
      ApiMonitor.instance = new ApiMonitor()
    }
    return ApiMonitor.instance
  }
  
  generateRequestId(): string {
    this.requestIdCounter++
    return `req_${Date.now()}_${this.requestIdCounter}`
  }
  
  recordApiCall(
    endpoint: string,
    method: string,
    statusCode: number,
    responseTime: number,
    options: {
      requestId: string
      success: boolean
      errorType?: string
      retryAttempts?: number
      userId?: string
    }
  ): void {
    const metric: ApiMetrics = {
      endpoint,
      method,
      statusCode,
      responseTime,
      timestamp: new Date().toISOString(),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined,
      userId: options.userId,
      requestId: options.requestId,
      success: options.success,
      errorType: options.errorType,
      retryAttempts: options.retryAttempts
    }
    
    this.performanceCollector.record(metric)
  }
  
  logError(
    message: string,
    error?: Error | ApiError,
    context?: Record<string, unknown>
  ): void {
    const requestId = this.generateRequestId()
    
    const log: ErrorLog = {
      level: LogLevel.ERROR,
      message,
      error,
      context,
      timestamp: new Date().toISOString(),
      requestId,
      endpoint: context?.endpoint as string,
      userId: context?.userId as string,
      stack: error?.stack
    }
    
    this.logCollector.log(log)
  }
  
  logWarning(
    message: string,
    context?: Record<string, unknown>
  ): void {
    const requestId = this.generateRequestId()
    
    const log: ErrorLog = {
      level: LogLevel.WARN,
      message,
      context,
      timestamp: new Date().toISOString(),
      requestId,
      endpoint: context?.endpoint as string,
      userId: context?.userId as string
    }
    
    this.logCollector.log(log)
  }
  
  logInfo(
    message: string,
    context?: Record<string, unknown>
  ): void {
    const requestId = this.generateRequestId()
    
    const log: ErrorLog = {
      level: LogLevel.INFO,
      message,
      context,
      timestamp: new Date().toISOString(),
      requestId,
      endpoint: context?.endpoint as string,
      userId: context?.userId as string
    }
    
    this.logCollector.log(log)
  }
  
  // 성능 메트릭 조회
  getPerformanceMetrics(endpoint?: string, method?: string): ApiMetrics[] {
    return this.performanceCollector.getMetrics(endpoint, method)
  }
  
  getAverageResponseTime(endpoint: string, method: string): number {
    return this.performanceCollector.getAverageResponseTime(endpoint, method)
  }
  
  getErrorRate(endpoint: string, method: string): number {
    return this.performanceCollector.getErrorRate(endpoint, method)
  }
  
  getPerformanceSummary(): Record<string, { avgResponseTime: number; errorRate: number; totalRequests: number }> {
    return this.performanceCollector.getSummary()
  }
  
  // 로그 조회
  getLogs(level?: LogLevel, limit?: number): ErrorLog[] {
    return this.logCollector.getLogs(level, limit)
  }
  
  getErrorStats(): Record<string, number> {
    return this.logCollector.getErrorStats()
  }
  
  // 헬스체크 메소드
  healthCheck(): {
    status: 'healthy' | 'degraded' | 'unhealthy'
    metrics: {
      totalRequests: number
      avgResponseTime: number
      errorRate: number
      recentErrors: number
    }
  } {
    const summary = this.getPerformanceSummary()
    const totalRequests = Object.values(summary).reduce((sum, stat) => sum + stat.totalRequests, 0)
    const avgResponseTime = totalRequests > 0 
      ? Object.values(summary).reduce((sum, stat) => sum + stat.avgResponseTime * stat.totalRequests, 0) / totalRequests
      : 0
    const errorRate = totalRequests > 0
      ? Object.values(summary).reduce((sum, stat) => sum + stat.errorRate * stat.totalRequests, 0) / totalRequests
      : 0
    
    // 최근 5분간 에러 수
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000
    const recentErrors = this.getLogs(LogLevel.ERROR).filter(
      log => new Date(log.timestamp).getTime() > fiveMinutesAgo
    ).length
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    
    if (errorRate > 0.1 || avgResponseTime > 5000 || recentErrors > 10) {
      status = 'unhealthy'
    } else if (errorRate > 0.05 || avgResponseTime > 2000 || recentErrors > 5) {
      status = 'degraded'
    }
    
    return {
      status,
      metrics: {
        totalRequests,
        avgResponseTime,
        errorRate,
        recentErrors
      }
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const apiMonitor = ApiMonitor.getInstance()

// 유틸리티 함수들
export function withApiMonitoring<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  endpoint: string,
  method: string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const requestId = apiMonitor.generateRequestId()
    const startTime = Date.now()
    let success = false
    let statusCode = 500
    let errorType: string | undefined
    
    try {
      const result = await fn(...args)
      success = true
      statusCode = result?.status || 200
      return result
    } catch (error) {
      errorType = error instanceof Error ? error.constructor.name : 'UnknownError'
      
      apiMonitor.logError(
        `API 호출 실패: ${method} ${endpoint}`,
        error as Error,
        { endpoint, method, requestId, args: args.slice(0, 2) } // 민감한 데이터 제외
      )
      
      throw error
    } finally {
      const responseTime = Date.now() - startTime
      
      apiMonitor.recordApiCall(endpoint, method, statusCode, responseTime, {
        requestId,
        success,
        errorType
      })
    }
  }) as T
}

// 실시간 알림을 위한 이벤트 에미터 (선택적)
export class AlertManager {
  private subscribers: Map<string, ((alert: any) => void)[]> = new Map()
  
  subscribe(type: string, callback: (alert: any) => void): () => void {
    const callbacks = this.subscribers.get(type) || []
    callbacks.push(callback)
    this.subscribers.set(type, callbacks)
    
    // 구독 취소 함수 반환
    return () => {
      const updatedCallbacks = this.subscribers.get(type)?.filter(cb => cb !== callback) || []
      this.subscribers.set(type, updatedCallbacks)
    }
  }
  
  emit(type: string, alert: any): void {
    const callbacks = this.subscribers.get(type) || []
    callbacks.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        console.error('Alert callback 실행 중 에러:', error)
      }
    })
  }
}

export const alertManager = new AlertManager()