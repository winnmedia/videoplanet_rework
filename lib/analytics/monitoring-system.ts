// @ts-nocheck
/**
 * 통합 모니터링 시스템
 * 모든 모니터링 컴포넌트를 통합 관리하고 초기화하는 메인 시스템
 */

import { apiMonitor } from '@/lib/api/monitoring'

import { alertSystem, AlertChannel, AlertPriority } from './alert-system'
import { dataQualityMonitor } from './data-quality-monitor'
import { realTimeDataCollector, DataCollectionConfig } from './real-time-data-collector'
import { userJourneyMonitor, CriticalJourneyType } from './user-journey-monitor'
import { webVitalsMonitor, WebVitalsConfig } from './web-vitals-monitor'


// 통합 모니터링 시스템 설정
export interface MonitoringSystemConfig {
  environment: 'development' | 'staging' | 'production'
  dataCollection: Partial<DataCollectionConfig>
  webVitals: Partial<WebVitalsConfig>
  alerting: {
    defaultChannels: AlertChannel[]
    criticalChannels: AlertChannel[]
    enabledRules: string[]
    suppressionEnabled: boolean
  }
  features: {
    userJourneyTracking: boolean
    webVitalsMonitoring: boolean
    apiPerformanceTracking: boolean
    dataQualityChecks: boolean
    realTimeAlerts: boolean
  }
  sampling: {
    userEvents: number // 0-1
    webVitals: number // 0-1
    apiMetrics: number // 0-1
  }
  retention: {
    metricsRetentionHours: number
    alertsRetentionHours: number
  }
}

// 시스템 상태
export interface SystemStatus {
  initialized: boolean
  healthScore: number // 0-100
  activeComponents: string[]
  lastHealthCheck: string
  issues: Array<{
    component: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    timestamp: string
  }>
  metrics: {
    totalEvents: number
    activeJourneys: number
    activeAlerts: number
    dataQualityScore: number
    sloCompliance: number
  }
}

export class MonitoringSystem {
  private static instance: MonitoringSystem
  private config: MonitoringSystemConfig
  private initialized: boolean = false
  private healthCheckInterval: NodeJS.Timeout | null = null
  private lastHealthCheck: string = ''
  private debugMode: boolean

  private constructor(config: MonitoringSystemConfig) {
    this.config = this.validateConfig(config)
    this.debugMode = this.config.environment !== 'production'
    
    if (this.debugMode) {
      console.log('[MonitoringSystem] Initializing with config:', this.config)
    }
  }

  static getInstance(config?: MonitoringSystemConfig): MonitoringSystem {
    if (!MonitoringSystem.instance) {
      if (!config) {
        throw new Error('MonitoringSystem must be initialized with config on first call')
      }
      MonitoringSystem.instance = new MonitoringSystem(config)
    }
    return MonitoringSystem.instance
  }

  /**
   * 모니터링 시스템 초기화
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      if (this.debugMode) {
        console.log('[MonitoringSystem] Already initialized, skipping')
      }
      return
    }

    try {
      if (this.debugMode) {
        console.log('[MonitoringSystem] Starting initialization...')
      }

      // 1. 데이터 수집기 설정
      if (this.config.features.apiPerformanceTracking) {
        realTimeDataCollector.updateConfig(this.config.dataCollection)
        if (this.debugMode) {
          console.log('[MonitoringSystem] ✓ Real-time data collector configured')
        }
      }

      // 2. Web Vitals 모니터링 시작
      if (this.config.features.webVitalsMonitoring && typeof window !== 'undefined') {
        webVitalsMonitor.updateConfig({
          ...this.config.webVitals,
          sampleRate: this.config.sampling.webVitals
        })
        if (this.debugMode) {
          console.log('[MonitoringSystem] ✓ Web Vitals monitoring initialized')
        }
      }

      // 3. 사용자 여정 추적 시작
      if (this.config.features.userJourneyTracking) {
        // 사용자 여정 모니터는 이미 자동 초기화됨
        if (this.debugMode) {
          console.log('[MonitoringSystem] ✓ User journey tracking enabled')
        }
      }

      // 4. 알림 시스템 설정
      if (this.config.features.realTimeAlerts) {
        this.setupAlertSystem()
        if (this.debugMode) {
          console.log('[MonitoringSystem] ✓ Alert system configured')
        }
      }

      // 5. 데이터 품질 모니터링 시작
      if (this.config.features.dataQualityChecks) {
        // 데이터 품질 모니터는 이미 자동 시작됨
        if (this.debugMode) {
          console.log('[MonitoringSystem] ✓ Data quality monitoring enabled')
        }
      }

      // 6. 자동 이벤트 수집 설정
      this.setupAutomaticEventCollection()

      // 7. 헬스체크 시작
      this.startHealthChecks()

      // 8. 에러 핸들러 설정
      this.setupErrorHandlers()

      this.initialized = true
      this.lastHealthCheck = new Date().toISOString()

      // 초기화 완료 이벤트 전송
      realTimeDataCollector.collectBusinessMetric({
        metricName: 'monitoring_system_initialized',
        value: 1,
        unit: 'count',
        source: 'monitoring_system',
        businessSlice: 'system_health',
        dimensions: {
          environment: this.config.environment,
          features: JSON.stringify(this.config.features)
        }
      })

      if (this.debugMode) {
        console.log('[MonitoringSystem] ✅ Successfully initialized all components')
      }

    } catch (error) {
      console.error('[MonitoringSystem] Initialization failed:', error)
      
      // 초기화 실패 이벤트 전송
      realTimeDataCollector.collectBusinessMetric({
        metricName: 'monitoring_system_init_failed',
        value: 1,
        unit: 'count',
        source: 'monitoring_system',
        businessSlice: 'system_health',
        dimensions: {
          error: (error as Error).message
        }
      })
      
      throw error
    }
  }

  private validateConfig(config: MonitoringSystemConfig): MonitoringSystemConfig {
    // 기본값 설정 및 검증
    const defaults: MonitoringSystemConfig = {
      environment: 'development',
      dataCollection: {
        batchSize: 50,
        flushInterval: 5000,
        samplingRate: config.environment === 'production' ? 0.1 : 1.0
      },
      webVitals: {
        sampleRate: config.environment === 'production' ? 0.1 : 1.0,
        enableLCP: true,
        enableINP: true,
        enableCLS: true,
        enableTTFB: true,
        enableFCP: true
      },
      alerting: {
        defaultChannels: ['dashboard'],
        criticalChannels: ['dashboard', 'slack'],
        enabledRules: ['api_error_rate', 'slow_response', 'journey_abandonment', 'submenu_errors'],
        suppressionEnabled: true
      },
      features: {
        userJourneyTracking: true,
        webVitalsMonitoring: true,
        apiPerformanceTracking: true,
        dataQualityChecks: true,
        realTimeAlerts: true
      },
      sampling: {
        userEvents: config.environment === 'production' ? 0.3 : 1.0,
        webVitals: config.environment === 'production' ? 0.1 : 1.0,
        apiMetrics: 1.0
      },
      retention: {
        metricsRetentionHours: 24,
        alertsRetentionHours: 72
      }
    }

    return { ...defaults, ...config }
  }

  private setupAlertSystem(): void {
    // 기본 알림 규칙 활성화
    this.config.alerting.enabledRules.forEach(ruleId => {
      alertSystem.enableRule(ruleId)
    })

    // 알림 구독 설정 (대시보드용)
    alertSystem.subscribe('dashboard', (alert) => {
      if (this.debugMode) {
        console.log('[MonitoringSystem] Dashboard alert:', alert.title)
      }
    })
  }

  private setupAutomaticEventCollection(): void {
    if (typeof window === 'undefined') return

    // 페이지 로드 이벤트
    if (document.readyState === 'complete') {
      this.trackPageLoad()
    } else {
      window.addEventListener('load', () => this.trackPageLoad())
    }

    // 네비게이션 이벤트
    window.addEventListener('popstate', () => {
      this.trackNavigation(window.location.pathname)
    })

    // 사용자 상호작용 추적
    this.setupInteractionTracking()

    // 에러 추적
    this.setupErrorTracking()
  }

  private trackPageLoad(): void {
    realTimeDataCollector.collectUserJourneyEvent({
      eventType: 'page_view',
      eventName: 'page_loaded',
      page: window.location.pathname,
      properties: {
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      },
      success: true
    })

    // 주요 페이지별 사용자 여정 시작
    this.maybeStartUserJourney()
  }

  private trackNavigation(path: string): void {
    realTimeDataCollector.collectUserJourneyEvent({
      eventType: 'page_view',
      eventName: 'navigation',
      page: path,
      properties: {
        navigation_type: 'popstate'
      },
      success: true
    })
  }

  private setupInteractionTracking(): void {
    // 클릭 이벤트 추적
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      
      if (target.matches('button, a, [role="button"]')) {
        realTimeDataCollector.collectUserJourneyEvent({
          eventType: 'click',
          eventName: 'element_clicked',
          page: window.location.pathname,
          properties: {
            element_type: target.tagName.toLowerCase(),
            element_class: target.className,
            element_id: target.id,
            element_text: target.textContent?.slice(0, 50) || ''
          },
          success: true
        })
      }
    })

    // 폼 제출 추적
    document.addEventListener('submit', (event) => {
      const form = event.target as HTMLFormElement
      
      realTimeDataCollector.collectUserJourneyEvent({
        eventType: 'form_submit',
        eventName: 'form_submitted',
        page: window.location.pathname,
        properties: {
          form_id: form.id,
          form_name: form.name,
          form_action: form.action
        },
        success: true
      })
    })
  }

  private setupErrorTracking(): void {
    // JavaScript 에러
    window.addEventListener('error', (event) => {
      realTimeDataCollector.collectUserJourneyEvent({
        eventType: 'error',
        eventName: 'javascript_error',
        page: window.location.pathname,
        properties: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack || ''
        },
        success: false,
        errorMessage: event.message
      })
    })

    // Promise rejection 에러
    window.addEventListener('unhandledrejection', (event) => {
      realTimeDataCollector.collectUserJourneyEvent({
        eventType: 'error',
        eventName: 'promise_rejection',
        page: window.location.pathname,
        properties: {
          reason: event.reason?.toString() || 'Unknown rejection',
          stack: event.reason?.stack || ''
        },
        success: false,
        errorMessage: event.reason?.toString() || 'Promise rejection'
      })
    })
  }

  private maybeStartUserJourney(): void {
    const path = window.location.pathname
    
    // 페이지별 여정 시작 로직
    if (path === '/signup' || path === '/login') {
      userJourneyMonitor.startJourney(CriticalJourneyType.ONBOARDING)
    } else if (path === '/projects/create') {
      userJourneyMonitor.startJourney(CriticalJourneyType.PROJECT_CREATION)
    } else if (path.includes('/feedback/')) {
      userJourneyMonitor.startJourney(CriticalJourneyType.FEEDBACK_SUBMISSION)
    }
  }

  private startHealthChecks(): void {
    // 5분마다 헬스체크 실행
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck()
    }, 5 * 60 * 1000)
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const status = await this.getSystemStatus()
      this.lastHealthCheck = new Date().toISOString()

      // 헬스체크 메트릭 전송
      realTimeDataCollector.collectBusinessMetric({
        metricName: 'system_health_score',
        value: status.healthScore,
        unit: 'score',
        source: 'monitoring_system',
        businessSlice: 'system_health',
        dimensions: {
          active_components: status.activeComponents.join(','),
          issues_count: status.issues.length.toString()
        }
      })

      // 심각한 문제 발견 시 알림
      const criticalIssues = status.issues.filter(issue => issue.severity === 'critical')
      if (criticalIssues.length > 0) {
        await alertSystem.triggerAlert('system_health_critical', {
          healthScore: status.healthScore,
          criticalIssues,
          activeComponents: status.activeComponents
        })
      }

      if (this.debugMode && status.healthScore < 80) {
        console.warn(`[MonitoringSystem] Health score: ${status.healthScore}%, Issues: ${status.issues.length}`)
      }

    } catch (error) {
      console.error('[MonitoringSystem] Health check failed:', error)
    }
  }

  private setupErrorHandlers(): void {
    // 모니터링 시스템 자체의 에러 처리
    process.on?.('uncaughtException', (error) => {
      console.error('[MonitoringSystem] Uncaught exception:', error)
      realTimeDataCollector.collectBusinessMetric({
        metricName: 'monitoring_system_error',
        value: 1,
        unit: 'count',
        source: 'monitoring_system',
        businessSlice: 'system_health',
        dimensions: {
          error_type: 'uncaught_exception',
          error_message: error.message
        }
      })
    })

    process.on?.('unhandledRejection', (reason) => {
      console.error('[MonitoringSystem] Unhandled rejection:', reason)
      realTimeDataCollector.collectBusinessMetric({
        metricName: 'monitoring_system_error',
        value: 1,
        unit: 'count',
        source: 'monitoring_system',
        businessSlice: 'system_health',
        dimensions: {
          error_type: 'unhandled_rejection',
          error_reason: String(reason)
        }
      })
    })
  }

  /**
   * 시스템 상태 조회
   */
  async getSystemStatus(): Promise<SystemStatus> {
    const issues: SystemStatus['issues'] = []
    let healthScore = 100
    const activeComponents: string[] = []

    // 컴포넌트별 상태 확인
    try {
      // 데이터 수집기 상태
      const collectorStatus = realTimeDataCollector.getStatus()
      if (collectorStatus.isOnline) {
        activeComponents.push('data_collector')
      } else {
        issues.push({
          component: 'data_collector',
          severity: 'high',
          description: 'Data collector is offline',
          timestamp: new Date().toISOString()
        })
        healthScore -= 20
      }

      // 사용자 여정 모니터 상태
      const activeJourneys = userJourneyMonitor.getActiveJourneyCount()
      if (activeJourneys >= 0) {
        activeComponents.push('journey_monitor')
      }

      // API 모니터 상태
      const apiHealth = apiMonitor.healthCheck()
      if (apiHealth.status === 'healthy') {
        activeComponents.push('api_monitor')
      } else if (apiHealth.status === 'degraded') {
        issues.push({
          component: 'api_monitor',
          severity: 'medium',
          description: 'API performance degraded',
          timestamp: new Date().toISOString()
        })
        healthScore -= 10
      } else {
        issues.push({
          component: 'api_monitor',
          severity: 'critical',
          description: 'API monitoring unhealthy',
          timestamp: new Date().toISOString()
        })
        healthScore -= 30
      }

      // 데이터 품질 상태
      const dataQualityScore = dataQualityMonitor.getOverallHealthScore()
      if (dataQualityScore > 0.8) {
        activeComponents.push('data_quality_monitor')
      } else if (dataQualityScore > 0.6) {
        issues.push({
          component: 'data_quality_monitor',
          severity: 'medium',
          description: 'Data quality below threshold',
          timestamp: new Date().toISOString()
        })
        healthScore -= 15
      } else {
        issues.push({
          component: 'data_quality_monitor',
          severity: 'high',
          description: 'Poor data quality detected',
          timestamp: new Date().toISOString()
        })
        healthScore -= 25
      }

      // Web Vitals 모니터 상태
      const webVitals = webVitalsMonitor.getCurrentMetrics()
      if (webVitals.collectedCount > 0) {
        activeComponents.push('web_vitals_monitor')
      }

      // 알림 시스템 상태
      const alertStats = alertSystem.getAlertStats()
      if (alertStats.totalTriggered >= 0) {
        activeComponents.push('alert_system')
      }

    } catch (error) {
      issues.push({
        component: 'system_check',
        severity: 'critical',
        description: `System status check failed: ${(error as Error).message}`,
        timestamp: new Date().toISOString()
      })
      healthScore -= 40
    }

    return {
      initialized: this.initialized,
      healthScore: Math.max(0, healthScore),
      activeComponents,
      lastHealthCheck: this.lastHealthCheck,
      issues,
      metrics: {
        totalEvents: 0, // 실제 환경에서는 정확한 카운트 필요
        activeJourneys: userJourneyMonitor.getActiveJourneyCount(),
        activeAlerts: alertSystem.getActiveAlerts().length,
        dataQualityScore: dataQualityMonitor.getOverallHealthScore(),
        sloCompliance: 0.95 // 실제 환경에서는 정확한 계산 필요
      }
    }
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<MonitoringSystemConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    // 관련 컴포넌트 설정 업데이트
    if (newConfig.dataCollection) {
      realTimeDataCollector.updateConfig(newConfig.dataCollection)
    }
    
    if (newConfig.webVitals) {
      webVitalsMonitor.updateConfig(newConfig.webVitals)
    }
    
    if (this.debugMode) {
      console.log('[MonitoringSystem] Configuration updated')
    }
  }

  /**
   * 수동 이벤트 수집 메서드들
   */
  trackCustomEvent(eventName: string, properties: Record<string, any>, success: boolean = true): void {
    realTimeDataCollector.collectUserJourneyEvent({
      eventType: 'click',
      eventName,
      page: typeof window !== 'undefined' ? window.location.pathname : 'server',
      properties,
      success
    })
  }

  trackBusinessMetric(metricName: string, value: number, unit: string = 'count', businessSlice: string = 'custom'): void {
    realTimeDataCollector.collectBusinessMetric({
      metricName,
      value,
      unit,
      source: 'custom_tracking',
      businessSlice,
      dimensions: {
        tracked_at: new Date().toISOString()
      }
    })
  }

  /**
   * 정리 및 종료
   */
  async destroy(): Promise<void> {
    if (!this.initialized) return

    try {
      // 헬스체크 중지
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval)
        this.healthCheckInterval = null
      }

      // 각 컴포넌트 정리
      realTimeDataCollector.destroy()
      webVitalsMonitor.destroy()
      userJourneyMonitor.destroy()
      alertSystem.destroy()
      dataQualityMonitor.destroy()

      this.initialized = false

      if (this.debugMode) {
        console.log('[MonitoringSystem] Successfully destroyed all components')
      }

    } catch (error) {
      console.error('[MonitoringSystem] Error during destroy:', error)
    }
  }
}

// 기본 설정으로 인스턴스 생성하는 헬퍼 함수
export function createMonitoringSystem(config?: Partial<MonitoringSystemConfig>): MonitoringSystem {
  const defaultConfig: MonitoringSystemConfig = {
    environment: (process.env.NODE_ENV as any) || 'development',
    dataCollection: {},
    webVitals: {},
    alerting: {
      defaultChannels: ['dashboard'],
      criticalChannels: ['dashboard', 'slack'],
      enabledRules: ['api_error_rate', 'slow_response', 'journey_abandonment', 'submenu_errors'],
      suppressionEnabled: true
    },
    features: {
      userJourneyTracking: true,
      webVitalsMonitoring: true,
      apiPerformanceTracking: true,
      dataQualityChecks: true,
      realTimeAlerts: true
    },
    sampling: {
      userEvents: process.env.NODE_ENV === 'production' ? 0.3 : 1.0,
      webVitals: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      apiMetrics: 1.0
    },
    retention: {
      metricsRetentionHours: 24,
      alertsRetentionHours: 72
    }
  }

  return MonitoringSystem.getInstance({ ...defaultConfig, ...config })
}

// 싱글톤 인스턴스 내보내기 (초기화 전에는 사용 불가)
export const monitoringSystem = {
  getInstance: MonitoringSystem.getInstance,
  initialize: (config?: MonitoringSystemConfig) => {
    const instance = MonitoringSystem.getInstance(config || createMonitoringSystem().config)
    return instance.initialize()
  }
}

export default MonitoringSystem