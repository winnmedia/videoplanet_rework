/**
 * 실시간 데이터 수집 시스템
 * 사용자 행동, API 호출, 성능 지표를 실시간으로 수집하고 처리
 */

import { 
  BusinessMetric, 
  UserJourneyEvent, 
  ApiPerformanceMetric, 
  WebVitals, 
  SubMenuUsability,
  DataQualityMetric,
  MonitoringSchemaValidator 
} from '@/shared/api/monitoring-schemas'
import { apiMonitor, AlertManager } from '@/lib/api/monitoring'

export interface DataCollectionConfig {
  batchSize: number
  flushInterval: number // 밀리초
  maxRetries: number
  compressionEnabled: boolean
  samplingRate: number // 0-1, 데이터 샘플링 비율
  debugMode: boolean
}

export class RealTimeDataCollector {
  private static instance: RealTimeDataCollector
  private config: DataCollectionConfig
  private eventQueue: Map<string, any[]> = new Map()
  private flushTimer: NodeJS.Timeout | null = null
  private alertManager: AlertManager
  private isOnline: boolean = true
  private sessionId: string
  private retryQueues: Map<string, any[]> = new Map()

  private constructor(config: Partial<DataCollectionConfig> = {}) {
    this.config = {
      batchSize: 50,
      flushInterval: 5000, // 5초
      maxRetries: 3,
      compressionEnabled: true,
      samplingRate: 1.0, // 100% 수집 (프로덕션에서는 0.1-0.3 권장)
      debugMode: process.env.NODE_ENV !== 'production',
      ...config
    }
    
    this.alertManager = new AlertManager()
    this.sessionId = this.generateSessionId()
    
    this.initializeQueues()
    this.startPeriodicFlush()
    this.setupNetworkListeners()
    this.setupErrorHandlers()
    
    if (this.config.debugMode) {
      console.log('[RealTimeDataCollector] Initialized with config:', this.config)
    }
  }

  static getInstance(config?: Partial<DataCollectionConfig>): RealTimeDataCollector {
    if (!RealTimeDataCollector.instance) {
      RealTimeDataCollector.instance = new RealTimeDataCollector(config)
    }
    return RealTimeDataCollector.instance
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  private initializeQueues(): void {
    const eventTypes = [
      'business_metrics',
      'user_journey',
      'api_performance', 
      'web_vitals',
      'submenu_usability',
      'data_quality'
    ]
    
    eventTypes.forEach(type => {
      this.eventQueue.set(type, [])
      this.retryQueues.set(type, [])
    })
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flushAllQueues()
    }, this.config.flushInterval)
  }

  private setupNetworkListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true
        this.retryFailedEvents()
      })
      
      window.addEventListener('offline', () => {
        this.isOnline = false
      })

      // 페이지 언로드 시 데이터 강제 플러시
      window.addEventListener('beforeunload', () => {
        this.flushAllQueues(true) // 동기 플러시
      })

      // 탭 포커스 변경 감지
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.flushAllQueues()
        }
      })
    }
  }

  private setupErrorHandlers(): void {
    if (typeof window !== 'undefined') {
      // 글로벌 에러 캐치
      window.addEventListener('error', (event) => {
        this.collectError({
          type: 'javascript_error',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
          timestamp: new Date().toISOString()
        })
      })

      // Promise rejection 캐치
      window.addEventListener('unhandledrejection', (event) => {
        this.collectError({
          type: 'unhandled_promise_rejection',
          message: event.reason?.message || 'Unhandled promise rejection',
          stack: event.reason?.stack,
          timestamp: new Date().toISOString()
        })
      })
    }
  }

  /**
   * 비즈니스 메트릭 수집
   */
  collectBusinessMetric(metric: Omit<BusinessMetric, 'timestamp'>): void {
    if (!this.shouldSample()) return

    try {
      const fullMetric: BusinessMetric = {
        ...metric,
        timestamp: new Date().toISOString()
      }

      const validated = MonitoringSchemaValidator.validateBusinessMetric(fullMetric)
      this.addToQueue('business_metrics', validated)

      if (this.config.debugMode) {
        console.log('[DataCollector] Business metric collected:', metric.metricName, metric.value)
      }
    } catch (error) {
      console.error('[DataCollector] Failed to collect business metric:', error)
      apiMonitor.logError('Business metric validation failed', error as Error, { metric })
    }
  }

  /**
   * 사용자 여정 이벤트 수집
   */
  collectUserJourneyEvent(event: Omit<UserJourneyEvent, 'sessionId' | 'timestamp'>): void {
    if (!this.shouldSample()) return

    try {
      const fullEvent: UserJourneyEvent = {
        ...event,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        deviceType: this.detectDeviceType()
      }

      const validated = MonitoringSchemaValidator.validateUserJourneyEvent(fullEvent)
      this.addToQueue('user_journey', validated)

      // 중요 이벤트는 즉시 플러시
      if (['error', 'conversion'].includes(event.eventType)) {
        this.flushQueue('user_journey')
      }

      if (this.config.debugMode) {
        console.log('[DataCollector] User journey event:', event.eventType, event.eventName)
      }
    } catch (error) {
      console.error('[DataCollector] Failed to collect user journey event:', error)
      apiMonitor.logError('User journey event validation failed', error as Error, { event })
    }
  }

  /**
   * API 성능 메트릭 수집 (기존 시스템 확장)
   */
  collectApiPerformance(metric: Omit<ApiPerformanceMetric, 'timestamp'>): void {
    if (!this.shouldSample()) return

    try {
      const fullMetric: ApiPerformanceMetric = {
        ...metric,
        timestamp: new Date().toISOString()
      }

      const validated = MonitoringSchemaValidator.validateApiPerformanceMetric(fullMetric)
      this.addToQueue('api_performance', validated)

      // 기존 모니터링 시스템에도 기록
      apiMonitor.recordApiCall(
        metric.endpoint,
        metric.method,
        metric.statusCode,
        metric.responseTime,
        {
          requestId: metric.requestId,
          success: metric.success,
          errorType: metric.errorType,
          retryAttempts: metric.retryAttempts,
          userId: metric.userId
        }
      )

      // 느린 응답 즉시 알림
      if (metric.responseTime > 3000) {
        this.alertManager.emit('slow_response', {
          endpoint: metric.endpoint,
          responseTime: metric.responseTime,
          timestamp: fullMetric.timestamp
        })
      }

      if (this.config.debugMode) {
        console.log('[DataCollector] API performance:', metric.endpoint, `${metric.responseTime}ms`)
      }
    } catch (error) {
      console.error('[DataCollector] Failed to collect API performance metric:', error)
    }
  }

  /**
   * Web Vitals 수집
   */
  collectWebVitals(vitals: Omit<WebVitals, 'sessionId' | 'timestamp'>): void {
    if (!this.shouldSample()) return

    try {
      const fullVitals: WebVitals = {
        ...vitals,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString()
      }

      const validated = MonitoringSchemaValidator.validateWebVitals(fullVitals)
      this.addToQueue('web_vitals', validated)

      // 성능 임계값 체크 및 즉시 알림
      if (vitals.metrics.lcp && vitals.metrics.lcp > 2500) {
        this.alertManager.emit('poor_lcp', {
          page: vitals.page,
          lcp: vitals.metrics.lcp,
          timestamp: fullVitals.timestamp
        })
      }

      if (vitals.metrics.cls && vitals.metrics.cls > 0.1) {
        this.alertManager.emit('poor_cls', {
          page: vitals.page,
          cls: vitals.metrics.cls,
          timestamp: fullVitals.timestamp
        })
      }

      if (this.config.debugMode) {
        console.log('[DataCollector] Web Vitals:', vitals.page, vitals.metrics)
      }
    } catch (error) {
      console.error('[DataCollector] Failed to collect web vitals:', error)
    }
  }

  /**
   * 서브메뉴 사용성 메트릭 수집
   */
  collectSubMenuUsability(usability: Omit<SubMenuUsability, 'sessionId' | 'timestamp'>): void {
    if (!this.shouldSample()) return

    try {
      const fullUsability: SubMenuUsability = {
        ...usability,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        touchDevice: this.isTouchDevice()
      }

      const validated = MonitoringSchemaValidator.validateSubMenuUsability ? 
        MonitoringSchemaValidator.validateSubMenuUsability(fullUsability) : fullUsability

      this.addToQueue('submenu_usability', validated)

      // 서브메뉴 에러 즉시 알림
      if (!usability.success) {
        this.alertManager.emit('submenu_error', {
          menuId: usability.menuId,
          action: usability.action,
          error: usability.errorDetails,
          timestamp: fullUsability.timestamp
        })
      }

      if (this.config.debugMode) {
        console.log('[DataCollector] SubMenu usability:', usability.menuId, usability.action)
      }
    } catch (error) {
      console.error('[DataCollector] Failed to collect submenu usability:', error)
    }
  }

  /**
   * 에러 정보 수집
   */
  collectError(error: {
    type: string
    message: string
    filename?: string
    lineno?: number
    colno?: number
    stack?: string
    timestamp: string
  }): void {
    // 에러는 항상 수집 (샘플링하지 않음)
    this.collectUserJourneyEvent({
      userId: undefined,
      eventType: 'error',
      eventName: error.type,
      page: typeof window !== 'undefined' ? window.location.pathname : 'unknown',
      properties: {
        message: error.message,
        filename: error.filename || '',
        lineno: error.lineno || 0,
        colno: error.colno || 0,
        stack: error.stack || ''
      },
      success: false,
      errorMessage: error.message
    })

    // 즉시 플러시
    this.flushQueue('user_journey')
  }

  /**
   * 데이터 품질 메트릭 수집
   */
  collectDataQuality(quality: Omit<DataQualityMetric, 'timestamp'>): void {
    try {
      const fullQuality: DataQualityMetric = {
        ...quality,
        timestamp: new Date().toISOString()
      }

      const validated = MonitoringSchemaValidator.validateDataQuality(fullQuality)
      this.addToQueue('data_quality', validated)

      // 품질 문제 즉시 알림
      if (quality.businessImpact === 'critical' || quality.businessImpact === 'high') {
        this.alertManager.emit('data_quality_issue', {
          source: quality.dataSource,
          impact: quality.businessImpact,
          anomalies: quality.anomaliesDetected,
          timestamp: fullQuality.timestamp
        })
      }
    } catch (error) {
      console.error('[DataCollector] Failed to collect data quality metric:', error)
    }
  }

  private shouldSample(): boolean {
    return Math.random() < this.config.samplingRate
  }

  private detectDeviceType(): 'desktop' | 'mobile' | 'tablet' {
    if (typeof window === 'undefined') return 'desktop'
    
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  private isTouchDevice(): boolean {
    if (typeof window === 'undefined') return false
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
  }

  private addToQueue(queueName: string, data: any): void {
    const queue = this.eventQueue.get(queueName) || []
    queue.push(data)
    this.eventQueue.set(queueName, queue)

    // 배치 크기에 도달하면 즉시 플러시
    if (queue.length >= this.config.batchSize) {
      this.flushQueue(queueName)
    }
  }

  private async flushQueue(queueName: string, isSync: boolean = false): Promise<void> {
    const queue = this.eventQueue.get(queueName)
    if (!queue || queue.length === 0) return

    const batch = queue.splice(0, this.config.batchSize)
    
    try {
      if (this.isOnline) {
        if (isSync) {
          // 동기적 전송 (페이지 종료 시)
          this.sendBatchSync(queueName, batch)
        } else {
          await this.sendBatchAsync(queueName, batch)
        }
      } else {
        // 오프라인 시 재시도 큐에 추가
        const retryQueue = this.retryQueues.get(queueName) || []
        retryQueue.push(...batch)
        this.retryQueues.set(queueName, retryQueue)
      }
    } catch (error) {
      console.error(`[DataCollector] Failed to flush queue ${queueName}:`, error)
      
      // 실패한 데이터를 재시도 큐에 추가
      const retryQueue = this.retryQueues.get(queueName) || []
      retryQueue.push(...batch)
      this.retryQueues.set(queueName, retryQueue)
    }
  }

  private async flushAllQueues(isSync: boolean = false): Promise<void> {
    const promises: Promise<void>[] = []
    
    for (const queueName of this.eventQueue.keys()) {
      if (isSync) {
        this.flushQueue(queueName, true)
      } else {
        promises.push(this.flushQueue(queueName))
      }
    }
    
    if (!isSync) {
      await Promise.all(promises)
    }
  }

  private async sendBatchAsync(queueName: string, batch: any[]): Promise<void> {
    const endpoint = this.getEndpointForQueue(queueName)
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Session-ID': this.sessionId,
        'X-Data-Source': 'real-time-collector'
      },
      body: JSON.stringify({
        events: batch,
        metadata: {
          timestamp: new Date().toISOString(),
          sessionId: this.sessionId,
          batchSize: batch.length,
          compression: this.config.compressionEnabled
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    if (this.config.debugMode) {
      console.log(`[DataCollector] Successfully sent ${batch.length} events to ${queueName}`)
    }
  }

  private sendBatchSync(queueName: string, batch: any[]): void {
    const endpoint = this.getEndpointForQueue(queueName)
    
    // Beacon API 사용 (페이지 종료 시에도 전송 보장)
    if (navigator.sendBeacon) {
      const data = JSON.stringify({
        events: batch,
        metadata: {
          timestamp: new Date().toISOString(),
          sessionId: this.sessionId,
          batchSize: batch.length,
          sync: true
        }
      })
      
      navigator.sendBeacon(endpoint, data)
    }
  }

  private getEndpointForQueue(queueName: string): string {
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://api.yourdomain.com' 
      : '/api'
    
    const endpoints: Record<string, string> = {
      'business_metrics': `${baseUrl}/monitoring/business-metrics`,
      'user_journey': `${baseUrl}/monitoring/user-journey`,
      'api_performance': `${baseUrl}/monitoring/api-performance`,
      'web_vitals': `${baseUrl}/monitoring/web-vitals`,
      'submenu_usability': `${baseUrl}/monitoring/submenu-usability`,
      'data_quality': `${baseUrl}/monitoring/data-quality`
    }
    
    return endpoints[queueName] || `${baseUrl}/monitoring/generic`
  }

  private async retryFailedEvents(): Promise<void> {
    for (const [queueName, retryQueue] of this.retryQueues.entries()) {
      if (retryQueue.length > 0) {
        const batch = retryQueue.splice(0, this.config.batchSize)
        try {
          await this.sendBatchAsync(queueName, batch)
        } catch (error) {
          // 재시도 실패 시 다시 큐에 추가 (최대 재시도 횟수 제한)
          retryQueue.unshift(...batch)
        }
      }
    }
  }

  /**
   * 수집기 설정 업데이트
   */
  updateConfig(newConfig: Partial<DataCollectionConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (this.config.debugMode) {
      console.log('[DataCollector] Config updated:', this.config)
    }
  }

  /**
   * 수집기 상태 조회
   */
  getStatus(): {
    isOnline: boolean
    sessionId: string
    queueSizes: Record<string, number>
    retryQueueSizes: Record<string, number>
    config: DataCollectionConfig
  } {
    const queueSizes: Record<string, number> = {}
    const retryQueueSizes: Record<string, number> = {}
    
    for (const [name, queue] of this.eventQueue.entries()) {
      queueSizes[name] = queue.length
    }
    
    for (const [name, queue] of this.retryQueues.entries()) {
      retryQueueSizes[name] = queue.length
    }
    
    return {
      isOnline: this.isOnline,
      sessionId: this.sessionId,
      queueSizes,
      retryQueueSizes,
      config: this.config
    }
  }

  /**
   * 수집기 정리 및 종료
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
    }
    
    // 남은 데이터 모두 플러시
    this.flushAllQueues(true)
    
    if (this.config.debugMode) {
      console.log('[DataCollector] Destroyed')
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const realTimeDataCollector = RealTimeDataCollector.getInstance()

// 편의 함수들
export const collectBusinessMetric = realTimeDataCollector.collectBusinessMetric.bind(realTimeDataCollector)
export const collectUserJourneyEvent = realTimeDataCollector.collectUserJourneyEvent.bind(realTimeDataCollector)
export const collectApiPerformance = realTimeDataCollector.collectApiPerformance.bind(realTimeDataCollector)
export const collectWebVitals = realTimeDataCollector.collectWebVitals.bind(realTimeDataCollector)
export const collectSubMenuUsability = realTimeDataCollector.collectSubMenuUsability.bind(realTimeDataCollector)
export const collectDataQuality = realTimeDataCollector.collectDataQuality.bind(realTimeDataCollector)