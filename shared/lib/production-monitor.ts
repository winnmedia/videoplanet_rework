/**
 * Production Monitoring System
 * 운영 환경 지속적 모니터링 및 품질 관리 시스템
 */

import { performanceMonitor, type PerformanceMetric, type CoreWebVitals } from './performance-monitor'

export interface AlertRule {
  id: string
  name: string
  metric: string
  condition: 'gt' | 'lt' | 'eq' | 'spike' | 'drop'
  threshold: number
  window: number // 분 단위
  cooldown: number // 분 단위 (중복 알림 방지)
  severity: 'low' | 'medium' | 'high' | 'critical'
  enabled: boolean
}

export interface HealthCheck {
  id: string
  name: string
  url: string
  method: 'GET' | 'POST' | 'HEAD'
  expectedStatus: number
  timeout: number
  interval: number // 분 단위
  enabled: boolean
  headers?: Record<string, string>
  body?: unknown
}

export interface SmokeTest {
  id: string
  name: string
  category: 'api' | 'ui' | 'integration'
  steps: Array<{
    action: string
    expected: string
    timeout: number
  }>
  enabled: boolean
  schedule: string // cron 표현식
}

export interface UserBehaviorEvent {
  eventType: 'page_view' | 'click' | 'form_submit' | 'error' | 'performance'
  timestamp: Date
  userId?: string
  sessionId: string
  url: string
  userAgent: string
  data: Record<string, unknown>
}

export interface IncidentReport {
  id: string
  title: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'open' | 'investigating' | 'resolved' | 'closed'
  startTime: Date
  resolvedTime?: Date
  description: string
  affectedServices: string[]
  rootCause?: string
  resolution?: string
  timeline: Array<{
    timestamp: Date
    action: string
    author: string
  }>
}

class ProductionMonitor {
  private alerts = new Map<string, AlertRule>()
  private healthChecks = new Map<string, HealthCheck>()
  private smokeTests = new Map<string, SmokeTest>()
  private alertHistory = new Map<string, Date>() // 마지막 알림 시간
  private healthStatus = new Map<string, boolean>()
  private incidents = new Map<string, IncidentReport>()
  private userEvents: UserBehaviorEvent[] = []

  constructor() {
    this.setupDefaultAlerts()
    this.setupDefaultHealthChecks()
    this.setupDefaultSmokeTests()
    this.startMonitoring()
  }

  // ===== 알림 시스템 =====
  private setupDefaultAlerts(): void {
    const defaultAlerts: AlertRule[] = [
      // 성능 메트릭 알림
      {
        id: 'lcp-high',
        name: 'LCP 성능 저하',
        metric: 'LCP',
        condition: 'gt',
        threshold: 2500, // 2.5초
        window: 5,
        cooldown: 15,
        severity: 'high',
        enabled: true
      },
      {
        id: 'cls-high',
        name: 'CLS 레이아웃 시프트',
        metric: 'CLS',
        condition: 'gt',
        threshold: 0.1,
        window: 5,
        cooldown: 15,
        severity: 'medium',
        enabled: true
      },
      {
        id: 'fid-high',
        name: 'FID 입력 지연',
        metric: 'FID',
        condition: 'gt',
        threshold: 100, // 100ms
        window: 5,
        cooldown: 15,
        severity: 'high',
        enabled: true
      },
      // API 응답시간 알림
      {
        id: 'api-slow',
        name: 'API 응답 시간 증가',
        metric: 'apiResponseTime',
        condition: 'gt',
        threshold: 500, // 500ms
        window: 10,
        cooldown: 30,
        severity: 'medium',
        enabled: true
      },
      {
        id: 'api-spike',
        name: 'API 응답 시간 급증',
        metric: 'apiResponseTime',
        condition: 'spike',
        threshold: 2.0, // 2배 증가
        window: 5,
        cooldown: 15,
        severity: 'critical',
        enabled: true
      },
      // 비디오 로딩 알림
      {
        id: 'video-load-slow',
        name: '비디오 로딩 시간 증가',
        metric: 'videoLoadTime',
        condition: 'gt',
        threshold: 5000, // 5초
        window: 10,
        cooldown: 30,
        severity: 'medium',
        enabled: true
      },
      // 피드백 전달 지연
      {
        id: 'feedback-delay',
        name: '피드백 전달 지연',
        metric: 'feedbackDeliveryTime',
        condition: 'gt',
        threshold: 200, // 200ms
        window: 5,
        cooldown: 15,
        severity: 'high',
        enabled: true
      },
      // 에러율 증가
      {
        id: 'error-rate-spike',
        name: '에러율 급증',
        metric: 'errorRate',
        condition: 'spike',
        threshold: 3.0, // 3배 증가
        window: 5,
        cooldown: 10,
        severity: 'critical',
        enabled: true
      }
    ]

    defaultAlerts.forEach(alert => {
      this.alerts.set(alert.id, alert)
    })
  }

  private async sendAlert(alert: AlertRule, value: number, context?: unknown): Promise<void> {
    const now = new Date()
    const lastAlert = this.alertHistory.get(alert.id)
    
    // Cooldown 체크
    if (lastAlert && (now.getTime() - lastAlert.getTime()) < alert.cooldown * 60 * 1000) {
      return
    }

    this.alertHistory.set(alert.id, now)

    const alertData = {
      id: alert.id,
      name: alert.name,
      severity: alert.severity,
      metric: alert.metric,
      currentValue: value,
      threshold: alert.threshold,
      timestamp: now,
      context
    }

    console.warn(`🚨 [${alert.severity.toUpperCase()}] ${alert.name}: ${value} (임계값: ${alert.threshold})`)

    // 실제 환경에서는 다양한 채널로 알림 전송
    await Promise.all([
      this.sendSlackAlert(alertData),
      this.sendEmailAlert(alertData),
      this.sendWebhookAlert(alertData),
      this.createIncidentIfCritical(alertData)
    ])
  }

  private async sendSlackAlert(alert: { id: string; name: string; severity: string; metric: string; currentValue: number; threshold: number; timestamp: Date; context?: unknown }): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) return

    const color = {
      low: '#36a64f',
      medium: '#ff9500',
      high: '#ff4444',
      critical: '#cc0000'
    }[alert.severity]

    const slackMessage = {
      channel: '#alerts',
      username: 'VRidge Monitor',
      icon_emoji: ':warning:',
      attachments: [{
        color,
        title: alert.name,
        text: `메트릭: ${alert.metric}\n현재값: ${alert.currentValue}\n임계값: ${alert.threshold}`,
        timestamp: Math.floor(alert.timestamp.getTime() / 1000),
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Context',
            value: JSON.stringify(alert.context, null, 2),
            short: false
          }
        ]
      }]
    }

    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      })
    } catch (error) {
      console.error('Slack 알림 전송 실패:', error)
    }
  }

  private async sendEmailAlert(alert: { id: string; name: string; severity: string; metric: string; currentValue: number; threshold: number; timestamp: Date; context?: unknown }): Promise<void> {
    // SendGrid나 다른 이메일 서비스 사용
    // 기존 이메일 시스템과 연동
  }

  private async sendWebhookAlert(alert: { id: string; name: string; severity: string; metric: string; currentValue: number; threshold: number; timestamp: Date; context?: unknown }): Promise<void> {
    if (!process.env.ALERT_WEBHOOK_URL) return

    try {
      await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert)
      })
    } catch (error) {
      console.error('Webhook 알림 전송 실패:', error)
    }
  }

  private async createIncidentIfCritical(alert: { id: string; name: string; severity: string; metric: string; currentValue: number; threshold: number; timestamp: Date; context?: unknown }): Promise<void> {
    if (alert.severity !== 'critical') return

    const incident: IncidentReport = {
      id: `incident-${Date.now()}`,
      title: `Critical Alert: ${alert.name}`,
      severity: 'critical',
      status: 'open',
      startTime: alert.timestamp,
      description: `자동 생성된 인시던트: ${alert.name}\n메트릭: ${alert.metric} = ${alert.currentValue} (임계값: ${alert.threshold})`,
      affectedServices: [alert.metric],
      timeline: [{
        timestamp: alert.timestamp,
        action: '인시던트 자동 생성',
        author: 'System'
      }]
    }

    this.incidents.set(incident.id, incident)
    console.error(`🔥 Critical Incident Created: ${incident.id}`)
  }

  // ===== 헬스 체크 시스템 =====
  private setupDefaultHealthChecks(): void {
    const defaultHealthChecks: HealthCheck[] = [
      {
        id: 'api-health',
        name: 'API 서버 상태',
        url: '/api/health',
        method: 'GET',
        expectedStatus: 200,
        timeout: 5000,
        interval: 2, // 2분마다
        enabled: true
      },
      {
        id: 'database-health',
        name: '데이터베이스 연결',
        url: '/api/health/database',
        method: 'GET',
        expectedStatus: 200,
        timeout: 10000,
        interval: 5, // 5분마다
        enabled: true
      },
      {
        id: 'redis-health',
        name: 'Redis 캐시 상태',
        url: '/api/health/redis',
        method: 'GET',
        expectedStatus: 200,
        timeout: 3000,
        interval: 3, // 3분마다
        enabled: true
      },
      {
        id: 'video-upload',
        name: '비디오 업로드 서비스',
        url: '/api/health/upload',
        method: 'GET',
        expectedStatus: 200,
        timeout: 15000,
        interval: 10, // 10분마다
        enabled: true
      }
    ]

    defaultHealthChecks.forEach(check => {
      this.healthChecks.set(check.id, check)
    })
  }

  private async runHealthCheck(check: HealthCheck): Promise<boolean> {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), check.timeout)

      const response = await fetch(check.url, {
        method: check.method,
        headers: {
          'User-Agent': 'VRidge-HealthCheck/1.0',
          ...check.headers
        },
        body: check.method !== 'GET' ? JSON.stringify(check.body) : undefined,
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      const isHealthy = response.status === check.expectedStatus
      this.healthStatus.set(check.id, isHealthy)

      if (!isHealthy) {
        await this.handleUnhealthyService(check, response.status)
      }

      return isHealthy
    } catch (error) {
      console.error(`Health check failed for ${check.name}:`, error)
      this.healthStatus.set(check.id, false)
      await this.handleUnhealthyService(check, 0, error)
      return false
    }
  }

  private async handleUnhealthyService(check: HealthCheck, status: number, error?: Error): Promise<void> {
    const alertData = {
      id: `health-${check.id}`,
      name: `서비스 상태 이상: ${check.name}`,
      severity: 'high' as const,
      metric: 'health',
      currentValue: status,
      threshold: check.expectedStatus,
      timestamp: new Date(),
      context: { checkId: check.id, error: error?.message }
    }

    await this.sendSlackAlert(alertData)
    await this.sendWebhookAlert(alertData)
  }

  // ===== Smoke 테스트 시스템 =====
  private setupDefaultSmokeTests(): void {
    const defaultSmokeTests: SmokeTest[] = [
      {
        id: 'login-flow',
        name: '로그인 플로우 테스트',
        category: 'ui',
        steps: [
          {
            action: 'navigate to /login',
            expected: 'login form visible',
            timeout: 5000
          },
          {
            action: 'enter test credentials',
            expected: 'login successful',
            timeout: 10000
          },
          {
            action: 'verify dashboard access',
            expected: 'dashboard loaded',
            timeout: 5000
          }
        ],
        enabled: true,
        schedule: '*/15 * * * *' // 15분마다
      },
      {
        id: 'video-upload-api',
        name: '비디오 업로드 API 테스트',
        category: 'api',
        steps: [
          {
            action: 'POST /api/videos/upload',
            expected: 'upload token received',
            timeout: 5000
          },
          {
            action: 'upload test video file',
            expected: 'upload progress 100%',
            timeout: 30000
          },
          {
            action: 'verify video processed',
            expected: 'video status: ready',
            timeout: 60000
          }
        ],
        enabled: true,
        schedule: '0 */2 * * *' // 2시간마다
      },
      {
        id: 'feedback-system',
        name: '피드백 시스템 통합 테스트',
        category: 'integration',
        steps: [
          {
            action: 'create test project',
            expected: 'project created',
            timeout: 5000
          },
          {
            action: 'add feedback comment',
            expected: 'comment saved',
            timeout: 3000
          },
          {
            action: 'verify real-time notification',
            expected: 'notification received',
            timeout: 2000
          }
        ],
        enabled: true,
        schedule: '*/30 * * * *' // 30분마다
      }
    ]

    defaultSmokeTests.forEach(test => {
      this.smokeTests.set(test.id, test)
    })
  }

  private async runSmokeTest(test: SmokeTest): Promise<boolean> {
    console.log(`🧪 Running smoke test: ${test.name}`)
    
    try {
      for (const step of test.steps) {
        const startTime = Date.now()
        const success = await this.executeTestStep(step)
        const duration = Date.now() - startTime
        
        if (!success || duration > step.timeout) {
          console.error(`❌ Smoke test failed: ${test.name} at step "${step.action}"`)
          await this.handleFailedSmokeTest(test, step, duration)
          return false
        }
      }
      
      console.log(`✅ Smoke test passed: ${test.name}`)
      return true
    } catch (error) {
      console.error(`❌ Smoke test error: ${test.name}`, error)
      await this.handleFailedSmokeTest(test, null, 0, error)
      return false
    }
  }

  private async executeTestStep(step: { action: string; expected: string; timeout: number }): Promise<boolean> {
    // 실제 구현에서는 Playwright나 API 클라이언트 사용
    // 여기서는 모의 구현
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000))
    return Math.random() > 0.1 // 90% 성공률
  }

  private async handleFailedSmokeTest(test: SmokeTest, step: { action: string; expected: string; timeout: number } | null = null, duration: number, error?: Error): Promise<void> {
    const alertData = {
      id: `smoke-test-${test.id}`,
      name: `Smoke Test 실패: ${test.name}`,
      severity: 'medium' as const,
      metric: 'smokeTest',
      currentValue: 0,
      threshold: 1,
      timestamp: new Date(),
      context: { testId: test.id, step, duration, error: error?.message }
    }

    await this.sendSlackAlert(alertData)
    await this.sendWebhookAlert(alertData)
  }

  // ===== 사용자 행동 분석 =====
  trackUserEvent(event: Omit<UserBehaviorEvent, 'timestamp' | 'sessionId'>): void {
    const sessionId = this.getOrCreateSessionId()
    
    const userEvent: UserBehaviorEvent = {
      ...event,
      timestamp: new Date(),
      sessionId
    }

    this.userEvents.push(userEvent)

    // 최근 1000개 이벤트만 유지
    if (this.userEvents.length > 1000) {
      this.userEvents.splice(0, this.userEvents.length - 1000)
    }

    this.analyzeUserBehavior(userEvent)
  }

  private getOrCreateSessionId(): string {
    const sessionKey = 'vridge_session_id'
    let sessionId = sessionStorage.getItem(sessionKey)
    
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      sessionStorage.setItem(sessionKey, sessionId)
    }
    
    return sessionId
  }

  private analyzeUserBehavior(event: UserBehaviorEvent): void {
    // 에러 발생 패턴 분석
    if (event.eventType === 'error') {
      this.trackErrorPattern(event)
    }

    // 성능 저하 패턴 분석
    if (event.eventType === 'performance') {
      this.trackPerformancePattern(event)
    }

    // 사용자 이탈 패턴 분석
    this.trackEngagementPattern(event)
  }

  private trackErrorPattern(event: UserBehaviorEvent): void {
    const recentErrors = this.userEvents
      .filter(e => e.eventType === 'error' && e.timestamp > new Date(Date.now() - 10 * 60 * 1000))
    
    if (recentErrors.length > 5) {
      this.sendAlert({
        id: 'user-error-spike',
        name: '사용자 에러 급증',
        metric: 'userErrors',
        condition: 'gt',
        threshold: 5,
        window: 10,
        cooldown: 15,
        severity: 'high',
        enabled: true
      }, recentErrors.length, { errors: recentErrors.slice(-5) })
    }
  }

  private trackPerformancePattern(event: UserBehaviorEvent): void {
    if (event.data.loadTime > 5000) {
      this.trackUserEvent({
        eventType: 'performance',
        userId: event.userId,
        url: event.url,
        userAgent: event.userAgent,
        data: { issue: 'slow_load', loadTime: event.data.loadTime }
      })
    }
  }

  private trackEngagementPattern(event: UserBehaviorEvent): void {
    // 세션별 이벤트 카운트
    const sessionEvents = this.userEvents.filter(e => e.sessionId === event.sessionId)
    const sessionDuration = Date.now() - sessionEvents[0]?.timestamp.getTime() || 0

    if (sessionDuration > 30 * 60 * 1000 && sessionEvents.length < 5) {
      // 30분 이상 머물렀지만 상호작용이 적음 -> 이탈 위험
      this.trackUserEvent({
        eventType: 'engagement',
        userId: event.userId,
        url: event.url,
        userAgent: event.userAgent,
        data: { 
          pattern: 'low_engagement',
          duration: sessionDuration,
          interactions: sessionEvents.length 
        }
      })
    }
  }

  // ===== A/B 테스트 준비 =====
  prepareABTest(testId: string, variants: string[], trafficSplit: number[]): void {
    const userId = this.getCurrentUserId()
    const variant = this.assignUserToVariant(userId, testId, variants, trafficSplit)
    
    // A/B 테스트 참여 기록
    this.trackUserEvent({
      eventType: 'ab_test',
      userId,
      url: window.location.href,
      userAgent: navigator.userAgent,
      data: {
        testId,
        variant,
        timestamp: new Date()
      }
    })
  }

  private assignUserToVariant(userId: string, testId: string, variants: string[], splits: number[]): string {
    const hash = this.hashString(`${userId}_${testId}`)
    const bucket = hash % 100
    
    let cumulative = 0
    for (let i = 0; i < splits.length; i++) {
      cumulative += splits[i]
      if (bucket < cumulative) {
        return variants[i]
      }
    }
    
    return variants[0] // fallback
  }

  private hashString(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return Math.abs(hash)
  }

  private getCurrentUserId(): string {
    // 실제 구현에서는 인증된 사용자 ID 반환
    return sessionStorage.getItem('user_id') || 'anonymous'
  }

  // ===== 장애 대응 및 복구 =====
  createIncident(title: string, severity: IncidentReport['severity'], description: string): string {
    const incident: IncidentReport = {
      id: `incident-${Date.now()}`,
      title,
      severity,
      status: 'open',
      startTime: new Date(),
      description,
      affectedServices: [],
      timeline: [{
        timestamp: new Date(),
        action: '인시던트 생성',
        author: 'System'
      }]
    }

    this.incidents.set(incident.id, incident)
    console.log(`🔥 Incident Created: ${incident.id} - ${title}`)
    
    return incident.id
  }

  updateIncident(id: string, update: Partial<IncidentReport>): void {
    const incident = this.incidents.get(id)
    if (!incident) return

    Object.assign(incident, update)

    if (update.status) {
      incident.timeline.push({
        timestamp: new Date(),
        action: `상태 변경: ${update.status}`,
        author: update.resolution ? 'System' : 'Manual'
      })

      if (update.status === 'resolved') {
        incident.resolvedTime = new Date()
      }
    }

    this.incidents.set(id, incident)
  }

  getIncident(id: string): IncidentReport | undefined {
    return this.incidents.get(id)
  }

  listActiveIncidents(): IncidentReport[] {
    return Array.from(this.incidents.values())
      .filter(incident => incident.status === 'open' || incident.status === 'investigating')
      .sort((a, b) => b.startTime.getTime() - a.startTime.getTime())
  }

  // ===== 모니터링 시작 =====
  private startMonitoring(): void {
    // 성능 메트릭 감시
    performanceMonitor.onMetric(this.checkAlerts.bind(this))

    // 주기적 헬스 체크
    setInterval(() => {
      this.healthChecks.forEach(check => {
        if (check.enabled) {
          this.runHealthCheck(check)
        }
      })
    }, 60 * 1000) // 1분마다 체크

    // 주기적 Smoke 테스트 (간단한 구현)
    setInterval(() => {
      this.smokeTests.forEach(test => {
        if (test.enabled) {
          // 실제로는 cron schedule에 따라 실행
          this.runSmokeTest(test)
        }
      })
    }, 15 * 60 * 1000) // 15분마다 체크

    console.log('🔍 Production Monitor started')
  }

  private checkAlerts(metric: PerformanceMetric): void {
    this.alerts.forEach(alert => {
      if (!alert.enabled || alert.metric !== metric.name) return

      const windowStart = new Date(Date.now() - alert.window * 60 * 1000)
      const recentMetrics = performanceMonitor.getMetrics(metric.name)
        .filter(m => m.timestamp > windowStart)

      if (recentMetrics.length === 0) return

      const currentValue = this.calculateMetricValue(recentMetrics, alert.condition)
      
      if (this.shouldTriggerAlert(alert, currentValue, recentMetrics)) {
        this.sendAlert(alert, currentValue, metric.context)
      }
    })
  }

  private calculateMetricValue(metrics: PerformanceMetric[], condition: string): number {
    const values = metrics.map(m => m.value)
    
    switch (condition) {
      case 'spike':
        const recent = values.slice(-5).reduce((a, b) => a + b, 0) / 5
        const baseline = values.slice(0, -5).reduce((a, b) => a + b, 0) / (values.length - 5) || recent
        return recent / baseline
      
      case 'drop':
        const recentDrop = values.slice(-5).reduce((a, b) => a + b, 0) / 5
        const baselineDrop = values.slice(0, -5).reduce((a, b) => a + b, 0) / (values.length - 5) || recentDrop
        return baselineDrop / recentDrop
      
      default:
        return values.reduce((a, b) => a + b, 0) / values.length
    }
  }

  private shouldTriggerAlert(alert: AlertRule, value: number, metrics: PerformanceMetric[]): boolean {
    switch (alert.condition) {
      case 'gt':
        return value > alert.threshold
      case 'lt':
        return value < alert.threshold
      case 'eq':
        return Math.abs(value - alert.threshold) < 0.01
      case 'spike':
        return value > alert.threshold
      case 'drop':
        return value > alert.threshold
      default:
        return false
    }
  }

  // ===== 공개 API =====
  getSystemStatus(): {
    health: Record<string, boolean>
    alerts: AlertRule[]
    incidents: IncidentReport[]
    performance: Partial<CoreWebVitals>
  } {
    return {
      health: Object.fromEntries(this.healthStatus),
      alerts: Array.from(this.alerts.values()).filter(a => a.enabled),
      incidents: this.listActiveIncidents(),
      performance: performanceMonitor.getCoreWebVitals()
    }
  }

  getUserBehaviorInsights(): {
    totalEvents: number
    errorRate: number
    engagementScore: number
    topPages: Array<{ url: string; views: number }>
  } {
    const totalEvents = this.userEvents.length
    const errors = this.userEvents.filter(e => e.eventType === 'error').length
    const errorRate = totalEvents > 0 ? (errors / totalEvents) * 100 : 0

    const pageViews = this.userEvents
      .filter(e => e.eventType === 'page_view')
      .reduce((acc, event) => {
        acc[event.url] = (acc[event.url] || 0) + 1
        return acc
      }, {} as Record<string, number>)

    const topPages = Object.entries(pageViews)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([url, views]) => ({ url, views }))

    return {
      totalEvents,
      errorRate,
      engagementScore: Math.max(0, 100 - errorRate * 2),
      topPages
    }
  }

  destroy(): void {
    // 리소스 정리
    performanceMonitor.destroy()
    this.alerts.clear()
    this.healthChecks.clear()
    this.smokeTests.clear()
    this.userEvents.length = 0
    console.log('🔍 Production Monitor stopped')
  }
}

// 전역 싱글톤
export const productionMonitor = new ProductionMonitor()

// React Hook for easy integration
export function useProductionMonitor() {
  const trackEvent = (event: Omit<UserBehaviorEvent, 'timestamp' | 'sessionId'>) => {
    productionMonitor.trackUserEvent(event)
  }

  const getStatus = () => productionMonitor.getSystemStatus()
  const getInsights = () => productionMonitor.getUserBehaviorInsights()

  return {
    trackEvent,
    getStatus,
    getInsights,
    createIncident: productionMonitor.createIncident.bind(productionMonitor),
    updateIncident: productionMonitor.updateIncident.bind(productionMonitor)
  }
}