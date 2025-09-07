// @ts-nocheck
/**
 * Core Web Vitals 자동 모니터링 시스템
 * LCP, INP, CLS, TTFB 등 핵심 성능 지표를 실시간 수집하고 분석
 */

import { WebVitals, MonitoringSchemaValidator } from '@/shared/api/monitoring-schemas'

import { realTimeDataCollector } from './real-time-data-collector'

import { alertManager } from '@/lib/api/monitoring'

// Web Vitals 임계값 정의 (Google 기준)
export const WEB_VITALS_THRESHOLDS = {
  LCP: {
    good: 2500,    // 2.5초 미만
    poor: 4000     // 4초 이상
  },
  INP: {
    good: 200,     // 200ms 미만
    poor: 500      // 500ms 이상
  },
  CLS: {
    good: 0.1,     // 0.1 미만
    poor: 0.25     // 0.25 이상
  },
  TTFB: {
    good: 800,     // 800ms 미만
    poor: 1800     // 1.8초 이상
  },
  FCP: {
    good: 1800,    // 1.8초 미만
    poor: 3000     // 3초 이상
  }
} as const

// 성능 등급 정의
export type PerformanceRating = 'good' | 'needs-improvement' | 'poor'

// 디바이스 성능 정보
export interface DeviceInfo {
  connection?: string
  deviceMemory?: number
  hardwareConcurrency?: number
  platform?: string
  userAgent?: string
  viewport?: { width: number; height: number }
}

// 네비게이션 타이밍 정보
export interface NavigationTimingData {
  domContentLoaded: number
  loadComplete: number
  firstPaint?: number
  navigationStart: number
  responseStart: number
  domInteractive: number
}

// Web Vitals 수집 설정
export interface WebVitalsConfig {
  enableLCP: boolean
  enableINP: boolean
  enableCLS: boolean
  enableTTFB: boolean
  enableFCP: boolean
  sampleRate: number // 0-1
  reportAllChanges: boolean
  enableDeviceInfo: boolean
  enableTimingAPI: boolean
  alertThresholds: {
    lcp: number
    inp: number
    cls: number
    ttfb: number
    fcp: number
  }
}

// 메트릭 수집 상태
interface MetricCollectionState {
  lcp?: number
  inp?: number
  cls?: number
  ttfb?: number
  fcp?: number
  collectedMetrics: Set<string>
  isComplete: boolean
  startTime: number
}

export class WebVitalsMonitor {
  private static instance: WebVitalsMonitor
  private config: WebVitalsConfig
  private observer: PerformanceObserver | null = null
  private clsObserver: PerformanceObserver | null = null
  private navigationObserver: PerformanceObserver | null = null
  private collectionState: MetricCollectionState
  private sessionId: string
  private debugMode: boolean
  private deviceInfo: DeviceInfo = {}
  private navigationTiming: NavigationTimingData | null = null
  
  private constructor(config: Partial<WebVitalsConfig> = {}) {
    this.config = {
      enableLCP: true,
      enableINP: true,
      enableCLS: true,
      enableTTFB: true,
      enableFCP: true,
      sampleRate: 0.1, // 10% 샘플링 (프로덕션 권장)
      reportAllChanges: false,
      enableDeviceInfo: true,
      enableTimingAPI: true,
      alertThresholds: {
        lcp: WEB_VITALS_THRESHOLDS.LCP.poor,
        inp: WEB_VITALS_THRESHOLDS.INP.poor,
        cls: WEB_VITALS_THRESHOLDS.CLS.poor,
        ttfb: WEB_VITALS_THRESHOLDS.TTFB.poor,
        fcp: WEB_VITALS_THRESHOLDS.FCP.poor
      },
      ...config
    }
    
    this.debugMode = process.env.NODE_ENV !== 'production'
    this.sessionId = this.generateSessionId()
    this.collectionState = this.initializeCollectionState()
    
    if (typeof window !== 'undefined') {
      this.initializeMonitoring()
    }
    
    if (this.debugMode) {
      console.log('[WebVitalsMonitor] Initialized with config:', this.config)
    }
  }

  static getInstance(config?: Partial<WebVitalsConfig>): WebVitalsMonitor {
    if (!WebVitalsMonitor.instance) {
      WebVitalsMonitor.instance = new WebVitalsMonitor(config)
    }
    return WebVitalsMonitor.instance
  }

  private initializeCollectionState(): MetricCollectionState {
    return {
      collectedMetrics: new Set(),
      isComplete: false,
      startTime: Date.now()
    }
  }

  private generateSessionId(): string {
    return `vitals_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  private initializeMonitoring(): void {
    // 샘플링 체크
    if (Math.random() > this.config.sampleRate) {
      if (this.debugMode) {
        console.log('[WebVitalsMonitor] Skipping due to sampling rate')
      }
      return
    }

    this.collectDeviceInfo()
    this.collectNavigationTiming()
    this.setupWebVitalsObservers()
    this.setupPageLoadListeners()
    
    if (this.debugMode) {
      console.log('[WebVitalsMonitor] Monitoring started')
    }
  }

  private collectDeviceInfo(): void {
    if (!this.config.enableDeviceInfo) return

    try {
      const nav = navigator as any
      
      this.deviceInfo = {
        connection: nav.connection?.effectiveType || nav.mozConnection?.effectiveType || 'unknown',
        deviceMemory: nav.deviceMemory || 4, // 기본값 4GB
        hardwareConcurrency: nav.hardwareConcurrency || 4, // 기본값 4 코어
        platform: nav.platform || 'unknown',
        userAgent: nav.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    } catch (error) {
      console.warn('[WebVitalsMonitor] Failed to collect device info:', error)
    }
  }

  private collectNavigationTiming(): void {
    if (!this.config.enableTimingAPI) return

    try {
      const timing = performance.timing
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

      if (navigation) {
        this.navigationTiming = {
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
          loadComplete: navigation.loadEventEnd - navigation.navigationStart,
          firstPaint: this.getFirstPaint(),
          navigationStart: navigation.navigationStart,
          responseStart: navigation.responseStart - navigation.navigationStart,
          domInteractive: navigation.domInteractive - navigation.navigationStart
        }
      } else if (timing) {
        // Fallback to legacy timing API
        this.navigationTiming = {
          domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
          loadComplete: timing.loadEventEnd - timing.navigationStart,
          navigationStart: timing.navigationStart,
          responseStart: timing.responseStart - timing.navigationStart,
          domInteractive: timing.domInteractive - timing.navigationStart
        }
      }

      // TTFB 계산 및 수집
      if (this.config.enableTTFB && this.navigationTiming) {
        const ttfb = this.navigationTiming.responseStart
        this.collectionState.ttfb = ttfb
        this.collectionState.collectedMetrics.add('ttfb')
        
        this.reportMetric('TTFB', ttfb, this.ratePerformance('TTFB', ttfb))
      }
    } catch (error) {
      console.warn('[WebVitalsMonitor] Failed to collect navigation timing:', error)
    }
  }

  private getFirstPaint(): number | undefined {
    try {
      const paintEntries = performance.getEntriesByType('paint')
      const fp = paintEntries.find(entry => entry.name === 'first-paint')
      return fp ? fp.startTime : undefined
    } catch (error) {
      return undefined
    }
  }

  private setupWebVitalsObservers(): void {
    // LCP (Largest Contentful Paint) 관찰
    if (this.config.enableLCP && 'PerformanceObserver' in window) {
      this.setupLCPObserver()
    }

    // INP (Interaction to Next Paint) 관찰
    if (this.config.enableINP) {
      this.setupINPObserver()
    }

    // CLS (Cumulative Layout Shift) 관찰
    if (this.config.enableCLS && 'PerformanceObserver' in window) {
      this.setupCLSObserver()
    }

    // FCP (First Contentful Paint) 관찰
    if (this.config.enableFCP && 'PerformanceObserver' in window) {
      this.setupFCPObserver()
    }
  }

  private setupLCPObserver(): void {
    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        const lastEntry = entries[entries.length - 1] as any
        
        if (lastEntry) {
          const lcp = lastEntry.startTime
          this.collectionState.lcp = lcp
          this.collectionState.collectedMetrics.add('lcp')
          
          this.reportMetric('LCP', lcp, this.ratePerformance('LCP', lcp))
          
          if (this.debugMode) {
            console.log(`[WebVitalsMonitor] LCP: ${lcp.toFixed(2)}ms`)
          }
        }
      })
      
      observer.observe({ entryTypes: ['largest-contentful-paint'] })
      this.observer = observer
      
      // 페이지 숨김 시 최종 LCP 값 보고
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden' && this.collectionState.lcp) {
          this.reportMetric('LCP', this.collectionState.lcp, this.ratePerformance('LCP', this.collectionState.lcp), true)
        }
      })
    } catch (error) {
      console.warn('[WebVitalsMonitor] Failed to setup LCP observer:', error)
    }
  }

  private setupINPObserver(): void {
    try {
      // INP는 사용자 상호작용을 추적
      let worstInteraction = 0
      
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        
        entries.forEach((entry: any) => {
          // 처리 시간 계산 (startTime부터 duration까지)
          const interactionTime = entry.processingStart - entry.startTime + entry.duration
          
          if (interactionTime > worstInteraction) {
            worstInteraction = interactionTime
            this.collectionState.inp = interactionTime
            this.collectionState.collectedMetrics.add('inp')
            
            if (this.config.reportAllChanges || interactionTime > this.config.alertThresholds.inp) {
              this.reportMetric('INP', interactionTime, this.ratePerformance('INP', interactionTime))
            }
          }
        })
      })
      
      observer.observe({ 
        entryTypes: ['event'],
        buffered: true 
      })

      // Fallback: FID (First Input Delay) 관찰
      const fidObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        
        entries.forEach((entry: any) => {
          const fid = entry.processingStart - entry.startTime
          
          // FID를 INP의 첫 상호작용으로 사용
          if (!this.collectionState.inp || fid < this.collectionState.inp) {
            this.collectionState.inp = fid
            this.collectionState.collectedMetrics.add('inp')
            
            this.reportMetric('INP (FID)', fid, this.ratePerformance('INP', fid))
          }
        })
      })
      
      fidObserver.observe({ entryTypes: ['first-input'] })
      
    } catch (error) {
      console.warn('[WebVitalsMonitor] Failed to setup INP observer:', error)
    }
  }

  private setupCLSObserver(): void {
    try {
      let clsValue = 0
      const clsEntries: any[] = []
      
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        
        entries.forEach((entry: any) => {
          // layout-shift 항목만 처리
          if (entry.entryType === 'layout-shift' && !entry.hadRecentInput) {
            clsValue += entry.value
            clsEntries.push(entry)
            
            this.collectionState.cls = clsValue
            this.collectionState.collectedMetrics.add('cls')
            
            if (this.config.reportAllChanges) {
              this.reportMetric('CLS', clsValue, this.ratePerformance('CLS', clsValue))
            }
            
            if (this.debugMode && entry.value > 0.05) {
              console.log(`[WebVitalsMonitor] Layout shift detected: ${entry.value.toFixed(4)}, Total CLS: ${clsValue.toFixed(4)}`)
              console.log('Shifted elements:', entry.sources)
            }
          }
        })
      })
      
      observer.observe({ entryTypes: ['layout-shift'] })
      this.clsObserver = observer
      
      // 페이지 숨김 시 최종 CLS 값 보고
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.reportMetric('CLS', clsValue, this.ratePerformance('CLS', clsValue), true)
        }
      })
      
    } catch (error) {
      console.warn('[WebVitalsMonitor] Failed to setup CLS observer:', error)
    }
  }

  private setupFCPObserver(): void {
    try {
      const observer = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries()
        
        entries.forEach((entry: any) => {
          if (entry.name === 'first-contentful-paint') {
            const fcp = entry.startTime
            this.collectionState.fcp = fcp
            this.collectionState.collectedMetrics.add('fcp')
            
            this.reportMetric('FCP', fcp, this.ratePerformance('FCP', fcp))
            
            if (this.debugMode) {
              console.log(`[WebVitalsMonitor] FCP: ${fcp.toFixed(2)}ms`)
            }
          }
        })
      })
      
      observer.observe({ entryTypes: ['paint'] })
      
    } catch (error) {
      console.warn('[WebVitalsMonitor] Failed to setup FCP observer:', error)
    }
  }

  private setupPageLoadListeners(): void {
    // 페이지 로드 완료 시 수집된 메트릭 종합 보고
    if (document.readyState === 'complete') {
      this.handlePageLoadComplete()
    } else {
      window.addEventListener('load', () => {
        this.handlePageLoadComplete()
      })
    }

    // 페이지 언로드 시 최종 보고
    window.addEventListener('beforeunload', () => {
      this.reportFinalMetrics()
    })

    // Viewport 변경 감지
    window.addEventListener('resize', this.debounce(() => {
      if (this.config.enableDeviceInfo) {
        this.deviceInfo.viewport = {
          width: window.innerWidth,
          height: window.innerHeight
        }
      }
    }, 500))
  }

  private handlePageLoadComplete(): void {
    // 페이지 로드 후 잠시 대기 (CLS 안정화)
    setTimeout(() => {
      this.reportComprehensiveMetrics()
    }, 1000)
  }

  private reportMetric(
    metricName: string, 
    value: number, 
    rating: PerformanceRating, 
    isFinal: boolean = false
  ): void {
    // 임계값 체크 및 알림
    if (rating === 'poor') {
      alertManager.emit('poor_web_vital', {
        metric: metricName.toLowerCase(),
        value,
        threshold: this.getThresholdForMetric(metricName),
        page: window.location.pathname,
        sessionId: this.sessionId,
        deviceInfo: this.deviceInfo,
        isFinal
      })
    }

    if (this.debugMode) {
      console.log(`[WebVitalsMonitor] ${metricName}: ${value.toFixed(2)}${this.getUnitForMetric(metricName)} (${rating})${isFinal ? ' [FINAL]' : ''}`)
    }
  }

  private reportComprehensiveMetrics(): void {
    try {
      const webVitals: WebVitals = {
        page: window.location.pathname,
        userId: this.getUserId(),
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        metrics: {
          lcp: this.collectionState.lcp,
          inp: this.collectionState.inp,
          cls: this.collectionState.cls,
          ttfb: this.collectionState.ttfb,
          fcp: this.collectionState.fcp
        },
        deviceInfo: this.config.enableDeviceInfo ? this.deviceInfo : undefined,
        navigationTiming: this.config.enableTimingAPI ? this.navigationTiming : undefined
      }

      const validated = MonitoringSchemaValidator.validateWebVitals(webVitals)
      realTimeDataCollector.collectWebVitals(validated)

      // 성능 점수 계산 및 비즈니스 메트릭으로 수집
      const performanceScore = this.calculatePerformanceScore()
      realTimeDataCollector.collectBusinessMetric({
        metricName: 'page_performance_score',
        value: performanceScore,
        unit: 'score',
        source: 'web_vitals_monitor',
        businessSlice: 'user_engagement',
        dimensions: {
          page: window.location.pathname,
          deviceType: this.getDeviceType(),
          connectionType: this.deviceInfo.connection || 'unknown'
        }
      })

      if (this.debugMode) {
        console.log('[WebVitalsMonitor] Comprehensive metrics reported:', {
          metrics: webVitals.metrics,
          performanceScore,
          collectedCount: this.collectionState.collectedMetrics.size
        })
      }

    } catch (error) {
      console.error('[WebVitalsMonitor] Failed to report comprehensive metrics:', error)
    }
  }

  private reportFinalMetrics(): void {
    if (this.collectionState.collectedMetrics.size > 0) {
      this.reportComprehensiveMetrics()
    }
  }

  private calculatePerformanceScore(): number {
    let score = 0
    let weights = 0

    const metrics = [
      { name: 'LCP', value: this.collectionState.lcp, weight: 25 },
      { name: 'INP', value: this.collectionState.inp, weight: 25 },
      { name: 'CLS', value: this.collectionState.cls, weight: 25 },
      { name: 'FCP', value: this.collectionState.fcp, weight: 15 },
      { name: 'TTFB', value: this.collectionState.ttfb, weight: 10 }
    ]

    metrics.forEach(metric => {
      if (metric.value !== undefined) {
        const rating = this.ratePerformance(metric.name, metric.value)
        let metricScore = 0
        
        switch (rating) {
          case 'good':
            metricScore = 90 + Math.random() * 10 // 90-100
            break
          case 'needs-improvement':
            metricScore = 50 + Math.random() * 40 // 50-90
            break
          case 'poor':
            metricScore = Math.random() * 50 // 0-50
            break
        }
        
        score += metricScore * metric.weight
        weights += metric.weight
      }
    })

    return weights > 0 ? Math.round(score / weights) : 0
  }

  private ratePerformance(metricName: string, value: number): PerformanceRating {
    const thresholds = WEB_VITALS_THRESHOLDS[metricName as keyof typeof WEB_VITALS_THRESHOLDS]
    if (!thresholds) return 'needs-improvement'
    
    if (value <= thresholds.good) return 'good'
    if (value <= thresholds.poor) return 'needs-improvement'
    return 'poor'
  }

  private getThresholdForMetric(metricName: string): number {
    const key = metricName.toLowerCase() as keyof typeof this.config.alertThresholds
    return this.config.alertThresholds[key] || 0
  }

  private getUnitForMetric(metricName: string): string {
    switch (metricName.toUpperCase()) {
      case 'CLS':
        return ''
      default:
        return 'ms'
    }
  }

  private getUserId(): string | undefined {
    // 실제 구현에서는 인증된 사용자 ID를 반환
    try {
      const userInfo = localStorage.getItem('user_info')
      return userInfo ? JSON.parse(userInfo).id : undefined
    } catch {
      return undefined
    }
  }

  private getDeviceType(): string {
    const width = window.innerWidth
    if (width < 768) return 'mobile'
    if (width < 1024) return 'tablet'
    return 'desktop'
  }

  private debounce(func: Function, wait: number): (...args: any[]) => void {
    let timeout: NodeJS.Timeout
    return function executedFunction(...args: any[]) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<WebVitalsConfig>): void {
    this.config = { ...this.config, ...newConfig }
    
    if (this.debugMode) {
      console.log('[WebVitalsMonitor] Config updated:', this.config)
    }
  }

  /**
   * 현재 수집된 메트릭 조회
   */
  getCurrentMetrics(): {
    lcp?: number
    inp?: number
    cls?: number
    ttfb?: number
    fcp?: number
    performanceScore: number
    collectedCount: number
  } {
    return {
      lcp: this.collectionState.lcp,
      inp: this.collectionState.inp,
      cls: this.collectionState.cls,
      ttfb: this.collectionState.ttfb,
      fcp: this.collectionState.fcp,
      performanceScore: this.calculatePerformanceScore(),
      collectedCount: this.collectionState.collectedMetrics.size
    }
  }

  /**
   * 특정 메트릭 강제 보고
   */
  reportMetricNow(metricName: string): void {
    const value = this.collectionState[metricName.toLowerCase() as keyof MetricCollectionState] as number
    if (value !== undefined) {
      this.reportMetric(metricName, value, this.ratePerformance(metricName, value), true)
    }
  }

  /**
   * 모니터 정리 및 종료
   */
  destroy(): void {
    if (this.observer) {
      this.observer.disconnect()
      this.observer = null
    }
    
    if (this.clsObserver) {
      this.clsObserver.disconnect()
      this.clsObserver = null
    }
    
    if (this.navigationObserver) {
      this.navigationObserver.disconnect()
      this.navigationObserver = null
    }
    
    // 최종 메트릭 보고
    this.reportFinalMetrics()
    
    if (this.debugMode) {
      console.log('[WebVitalsMonitor] Destroyed')
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const webVitalsMonitor = WebVitalsMonitor.getInstance()

// 편의 함수들
export const initWebVitalsMonitoring = (config?: Partial<WebVitalsConfig>) => {
  return WebVitalsMonitor.getInstance(config)
}

export const getCurrentWebVitals = () => webVitalsMonitor.getCurrentMetrics()
export const reportWebVitalNow = (metric: string) => webVitalsMonitor.reportMetricNow(metric)