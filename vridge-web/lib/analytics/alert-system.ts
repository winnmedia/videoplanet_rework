// @ts-nocheck
/**
 * 지능형 알림 시스템
 * 비즈니스 크리티컬한 이벤트를 감지하고 다중 채널로 실시간 알림 전송
 */

import {
  AlertConfig,
  BusinessMetric,
  UserJourneyEvent,
  ApiPerformanceMetric,
  MonitoringSchemaValidator,
} from '@/shared/api/monitoring-schemas'

import { apiMonitor } from '@/lib/api/monitoring'

// 알림 채널 타입
export type AlertChannel = 'email' | 'slack' | 'webhook' | 'dashboard' | 'sms'

// 알림 우선순위
export type AlertPriority = 'low' | 'medium' | 'high' | 'critical'

// 알림 상태
export type AlertStatus = 'pending' | 'sent' | 'acknowledged' | 'resolved' | 'suppressed'

// 알림 인스턴스
export interface Alert {
  alertId: string
  configId: string
  title: string
  description: string
  severity: AlertPriority
  status: AlertStatus
  triggeredAt: string
  acknowledgedAt?: string
  resolvedAt?: string
  suppressedUntil?: string
  channels: AlertChannel[]
  metadata: {
    metricName: string
    currentValue: number
    threshold: number
    businessSlice: string
    affectedUsers?: number
    relatedAlerts?: string[]
    context: Record<string, any>
  }
  attempts: Array<{
    channel: AlertChannel
    status: 'success' | 'failed' | 'retry'
    timestamp: string
    error?: string
  }>
}

// 알림 규칙 엔진
interface AlertRule {
  ruleId: string
  name: string
  condition: (data: any) => boolean
  severity: AlertPriority
  channels: AlertChannel[]
  cooldownMinutes: number
  maxAlertsPerHour: number
  businessSlice?: string
  enabled: boolean
  template: {
    title: string
    description: string
    actionItems?: string[]
  }
}

// 알림 통계
interface AlertStats {
  totalTriggered: number
  totalSent: number
  totalAcknowledged: number
  totalResolved: number
  totalSuppressed: number
  averageResolutionTime: number
  channelStats: Record<
    AlertChannel,
    {
      sent: number
      failed: number
      successRate: number
    }
  >
  severityBreakdown: Record<AlertPriority, number>
}

// 알림 억제 규칙
interface SuppressionRule {
  ruleId: string
  pattern: string // 정규식 또는 패턴
  duration: number // 분 단위
  reason: string
  enabled: boolean
}

export class AlertSystem {
  private static instance: AlertSystem
  private alertConfigs: Map<string, AlertConfig> = new Map()
  private activeAlerts: Map<string, Alert> = new Map()
  private alertRules: Map<string, AlertRule> = new Map()
  private suppressionRules: Map<string, SuppressionRule> = new Map()
  private alertStats: AlertStats
  private subscribers: Map<string, ((...args: any[]) => void)[]> = new Map()
  private processingQueue: Alert[] = []
  private isProcessing: boolean = false
  private debugMode: boolean

  private constructor() {
    this.debugMode = process.env.NODE_ENV !== 'production'
    this.alertStats = this.initializeStats()

    this.initializeDefaultRules()
    this.initializeDefaultSuppressionRules()
    this.startProcessingQueue()

    if (this.debugMode) {
      console.log('[AlertSystem] Initialized with', this.alertRules.size, 'alert rules')
    }
  }

  static getInstance(): AlertSystem {
    if (!AlertSystem.instance) {
      AlertSystem.instance = new AlertSystem()
    }
    return AlertSystem.instance
  }

  private initializeStats(): AlertStats {
    return {
      totalTriggered: 0,
      totalSent: 0,
      totalAcknowledged: 0,
      totalResolved: 0,
      totalSuppressed: 0,
      averageResolutionTime: 0,
      channelStats: {
        email: { sent: 0, failed: 0, successRate: 1 },
        slack: { sent: 0, failed: 0, successRate: 1 },
        webhook: { sent: 0, failed: 0, successRate: 1 },
        dashboard: { sent: 0, failed: 0, successRate: 1 },
        sms: { sent: 0, failed: 0, successRate: 1 },
      },
      severityBreakdown: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
      },
    }
  }

  private initializeDefaultRules(): void {
    // API 에러율 알림
    this.alertRules.set('api_error_rate', {
      ruleId: 'api_error_rate',
      name: 'API 에러율 급증',
      condition: (data: ApiPerformanceMetric) => {
        const errorRate = apiMonitor.getErrorRate(data.endpoint, data.method)
        return errorRate > 0.1 // 10% 이상
      },
      severity: 'high',
      channels: ['slack', 'dashboard'],
      cooldownMinutes: 15,
      maxAlertsPerHour: 4,
      enabled: true,
      template: {
        title: 'API 에러율 임계치 초과',
        description: 'API 엔드포인트에서 높은 에러율이 감지되었습니다.',
        actionItems: ['서버 로그 확인', '데이터베이스 연결 상태 점검', '외부 서비스 의존성 확인'],
      },
    })

    // 응답 시간 알림
    this.alertRules.set('slow_response', {
      ruleId: 'slow_response',
      name: '응답 시간 지연',
      condition: (data: ApiPerformanceMetric) => {
        return data.responseTime > 3000 // 3초 이상
      },
      severity: 'medium',
      channels: ['dashboard'],
      cooldownMinutes: 10,
      maxAlertsPerHour: 6,
      enabled: true,
      template: {
        title: '응답 시간 지연 감지',
        description: 'API 응답 시간이 예상보다 오래 걸리고 있습니다.',
        actionItems: ['서버 리소스 사용률 확인', '데이터베이스 쿼리 성능 점검', '캐시 동작 상태 확인'],
      },
    })

    // 사용자 여정 중단율 알림
    this.alertRules.set('journey_abandonment', {
      ruleId: 'journey_abandonment',
      name: '사용자 여정 높은 중단율',
      condition: (data: { journeyType: string; abandonmentRate: number }) => {
        return data.abandonmentRate > 0.3 // 30% 이상
      },
      severity: 'high',
      channels: ['slack', 'email', 'dashboard'],
      cooldownMinutes: 30,
      maxAlertsPerHour: 2,
      businessSlice: 'user_engagement',
      enabled: true,
      template: {
        title: '사용자 여정 중단율 급증',
        description: '핵심 사용자 여정에서 높은 중단율이 감지되었습니다.',
        actionItems: ['UX/UI 이슈 확인', '서브메뉴 동작 상태 점검', '사용자 피드백 분석', '페이지 로딩 속도 확인'],
      },
    })

    // 서브메뉴 오류 알림
    this.alertRules.set('submenu_errors', {
      ruleId: 'submenu_errors',
      name: '서브메뉴 기능 오류',
      condition: (data: { menuId: string; errorRate: number }) => {
        return data.errorRate > 0.05 // 5% 이상
      },
      severity: 'critical',
      channels: ['slack', 'sms', 'dashboard'],
      cooldownMinutes: 5,
      maxAlertsPerHour: 12,
      businessSlice: 'user_engagement',
      enabled: true,
      template: {
        title: '서브메뉴 기능 오류 발생',
        description: '서브메뉴에서 오류가 빈번하게 발생하고 있습니다.',
        actionItems: ['프론트엔드 콘솔 에러 확인', 'API 연결 상태 점검', '권한 설정 확인', '긴급 패치 준비'],
      },
    })

    // Core Web Vitals 임계치 초과
    this.alertRules.set('poor_web_vitals', {
      ruleId: 'poor_web_vitals',
      name: 'Core Web Vitals 성능 저하',
      condition: (data: { metric: string; value: number; threshold: number }) => {
        return data.value > data.threshold
      },
      severity: 'medium',
      channels: ['dashboard', 'slack'],
      cooldownMinutes: 20,
      maxAlertsPerHour: 3,
      businessSlice: 'user_engagement',
      enabled: true,
      template: {
        title: 'Web 성능 지표 임계치 초과',
        description: 'Core Web Vitals 성능 지표가 권장 수준을 벗어났습니다.',
        actionItems: [
          '리소스 로딩 최적화',
          '레이아웃 시프트 원인 조사',
          '이미지 압축 및 지연 로딩 적용',
          'JavaScript 번들 크기 최적화',
        ],
      },
    })

    // 데이터 품질 이슈
    this.alertRules.set('data_quality_issue', {
      ruleId: 'data_quality_issue',
      name: '데이터 품질 문제',
      condition: (data: { businessImpact: string; completeness: number }) => {
        return data.businessImpact === 'critical' || data.completeness < 0.9
      },
      severity: 'high',
      channels: ['email', 'slack', 'dashboard'],
      cooldownMinutes: 60,
      maxAlertsPerHour: 1,
      enabled: true,
      template: {
        title: '데이터 품질 이슈 감지',
        description: '중요 데이터 소스에서 품질 문제가 발견되었습니다.',
        actionItems: [
          '데이터 파이프라인 상태 확인',
          '소스 시스템 연결 점검',
          '변환 로직 검증',
          '백업 데이터 복구 준비',
        ],
      },
    })
  }

  private initializeDefaultSuppressionRules(): void {
    // 야간 시간 저우선순위 알림 억제
    this.suppressionRules.set('night_low_priority', {
      ruleId: 'night_low_priority',
      pattern: 'severity:(low|medium)',
      duration: 60, // 1시간
      reason: '야간 시간대 저우선순위 알림 억제',
      enabled: true,
    })

    // 유지보수 시간 알림 억제
    this.suppressionRules.set('maintenance_window', {
      ruleId: 'maintenance_window',
      pattern: 'businessSlice:.*',
      duration: 120, // 2시간
      reason: '예정된 유지보수 시간',
      enabled: false, // 기본적으로 비활성화, 필요시 수동 활성화
    })
  }

  /**
   * 알림 규칙 추가/업데이트
   */
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.ruleId, rule)

    if (this.debugMode) {
      console.log(`[AlertSystem] Alert rule ${rule.enabled ? 'enabled' : 'disabled'}:`, rule.name)
    }
  }

  /**
   * 알림 억제 규칙 추가/업데이트
   */
  addSuppressionRule(rule: SuppressionRule): void {
    this.suppressionRules.set(rule.ruleId, rule)

    if (this.debugMode) {
      console.log(`[AlertSystem] Suppression rule ${rule.enabled ? 'enabled' : 'disabled'}:`, rule.pattern)
    }
  }

  /**
   * 이벤트 기반 알림 트리거
   */
  async triggerAlert(eventType: string, data: any, context: Record<string, any> = {}): Promise<string | null> {
    try {
      // 해당 이벤트에 적용되는 규칙 찾기
      const applicableRules = this.findApplicableRules(eventType, data)

      for (const rule of applicableRules) {
        if (!rule.enabled) continue

        // 조건 검사
        if (rule.condition(data)) {
          const alertId = await this.createAlert(rule, data, context)
          if (alertId) {
            return alertId
          }
        }
      }

      return null
    } catch (error) {
      console.error('[AlertSystem] Failed to trigger alert:', error)
      apiMonitor.logError('Alert trigger failed', error as Error, { eventType, data })
      return null
    }
  }

  /**
   * 직접 알림 생성
   */
  async createAlert(rule: AlertRule, data: any, context: Record<string, any> = {}): Promise<string | null> {
    const alertId = this.generateAlertId()

    // 중복 알림 및 억제 규칙 검사
    if (this.isDuplicate(rule, data) || this.isSuppressed(rule, data)) {
      this.alertStats.totalSuppressed++
      return null
    }

    // 알림 생성
    const alert: Alert = {
      alertId,
      configId: rule.ruleId,
      title: this.formatTemplate(rule.template.title, data, context),
      description: this.formatTemplate(rule.template.description, data, context),
      severity: rule.severity,
      status: 'pending',
      triggeredAt: new Date().toISOString(),
      channels: rule.channels,
      metadata: {
        metricName: this.extractMetricName(data),
        currentValue: this.extractCurrentValue(data),
        threshold: this.extractThreshold(data),
        businessSlice: rule.businessSlice || 'general',
        context,
        ...this.extractMetadata(data),
      },
      attempts: [],
    }

    this.activeAlerts.set(alertId, alert)
    this.alertStats.totalTriggered++
    this.alertStats.severityBreakdown[rule.severity]++

    // 처리 큐에 추가
    this.processingQueue.push(alert)

    // 대시보드 구독자들에게 즉시 알림
    this.notifyDashboardSubscribers(alert)

    if (this.debugMode) {
      console.log(`[AlertSystem] Alert created: ${alert.title} (${alertId})`)
    }

    return alertId
  }

  /**
   * 알림 처리 큐 시작
   */
  private startProcessingQueue(): void {
    setInterval(async () => {
      if (!this.isProcessing && this.processingQueue.length > 0) {
        await this.processAlertQueue()
      }
    }, 1000) // 1초마다 처리
  }

  /**
   * 알림 큐 처리
   */
  private async processAlertQueue(): Promise<void> {
    if (this.isProcessing) return

    this.isProcessing = true

    try {
      const alert = this.processingQueue.shift()
      if (alert) {
        await this.sendAlert(alert)
      }
    } catch (error) {
      console.error('[AlertSystem] Failed to process alert queue:', error)
    } finally {
      this.isProcessing = false
    }
  }

  /**
   * 알림 전송
   */
  private async sendAlert(alert: Alert): Promise<void> {
    for (const channel of alert.channels) {
      try {
        const success = await this.sendToChannel(alert, channel)

        alert.attempts.push({
          channel,
          status: success ? 'success' : 'failed',
          timestamp: new Date().toISOString(),
          error: success ? undefined : 'Delivery failed',
        })

        if (success) {
          this.alertStats.channelStats[channel].sent++
          this.alertStats.totalSent++
        } else {
          this.alertStats.channelStats[channel].failed++
        }

        // 성공률 업데이트
        const channelStats = this.alertStats.channelStats[channel]
        channelStats.successRate = channelStats.sent / (channelStats.sent + channelStats.failed)
      } catch (error) {
        console.error(`[AlertSystem] Failed to send alert to ${channel}:`, error)

        alert.attempts.push({
          channel,
          status: 'failed',
          timestamp: new Date().toISOString(),
          error: (error as Error).message,
        })
      }
    }

    alert.status = 'sent'
    this.activeAlerts.set(alert.alertId, alert)
  }

  /**
   * 채널별 전송 로직
   */
  private async sendToChannel(alert: Alert, channel: AlertChannel): Promise<boolean> {
    switch (channel) {
      case 'dashboard':
        return this.sendToDashboard(alert)
      case 'slack':
        return this.sendToSlack(alert)
      case 'email':
        return this.sendToEmail(alert)
      case 'webhook':
        return this.sendToWebhook(alert)
      case 'sms':
        return this.sendToSMS(alert)
      default:
        return false
    }
  }

  private async sendToDashboard(alert: Alert): Promise<boolean> {
    try {
      // 실시간 대시보드 업데이트 (WebSocket 또는 SSE)
      this.notifyDashboardSubscribers(alert)
      return true
    } catch (error) {
      return false
    }
  }

  private async sendToSlack(alert: Alert): Promise<boolean> {
    try {
      const webhookUrl = process.env.SLACK_WEBHOOK_URL
      if (!webhookUrl) return false

      const payload = {
        text: `🚨 ${alert.title}`,
        attachments: [
          {
            color: this.getSeverityColor(alert.severity),
            fields: [
              {
                title: 'Description',
                value: alert.description,
                short: false,
              },
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Business Slice',
                value: alert.metadata.businessSlice,
                short: true,
              },
              {
                title: 'Current Value',
                value: `${alert.metadata.currentValue}`,
                short: true,
              },
              {
                title: 'Threshold',
                value: `${alert.metadata.threshold}`,
                short: true,
              },
            ],
            footer: 'VideoPlanet Monitoring',
            ts: Math.floor(new Date(alert.triggeredAt).getTime() / 1000),
          },
        ],
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  private async sendToEmail(alert: Alert): Promise<boolean> {
    try {
      // 이메일 서비스 API 호출
      const response = await fetch('/api/monitoring/send-email-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alertId: alert.alertId,
          title: alert.title,
          description: alert.description,
          severity: alert.severity,
          metadata: alert.metadata,
        }),
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  private async sendToWebhook(alert: Alert): Promise<boolean> {
    try {
      const webhookUrl = process.env.ALERT_WEBHOOK_URL
      if (!webhookUrl) return false

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alert),
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  private async sendToSMS(alert: Alert): Promise<boolean> {
    try {
      // SMS 서비스 API 호출 (Twilio 등)
      const response = await fetch('/api/monitoring/send-sms-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${alert.title}: ${alert.description}`,
          severity: alert.severity,
        }),
      })

      return response.ok
    } catch (error) {
      return false
    }
  }

  /**
   * 대시보드 구독자 알림
   */
  private notifyDashboardSubscribers(alert: Alert): void {
    const subscribers = this.subscribers.get('dashboard') || []
    subscribers.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        console.error('[AlertSystem] Dashboard subscriber callback failed:', error)
      }
    })
  }

  /**
   * 알림 상태 업데이트
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId)
    if (!alert) return false

    alert.status = 'acknowledged'
    alert.acknowledgedAt = new Date().toISOString()
    this.activeAlerts.set(alertId, alert)
    this.alertStats.totalAcknowledged++

    if (this.debugMode) {
      console.log(`[AlertSystem] Alert acknowledged: ${alertId} by ${acknowledgedBy}`)
    }

    return true
  }

  resolveAlert(alertId: string, resolvedBy: string, resolution?: string): boolean {
    const alert = this.activeAlerts.get(alertId)
    if (!alert) return false

    alert.status = 'resolved'
    alert.resolvedAt = new Date().toISOString()
    this.activeAlerts.set(alertId, alert)
    this.alertStats.totalResolved++

    // 평균 해결 시간 업데이트
    const resolutionTime = new Date(alert.resolvedAt).getTime() - new Date(alert.triggeredAt).getTime()
    this.alertStats.averageResolutionTime = (this.alertStats.averageResolutionTime + resolutionTime) / 2

    if (this.debugMode) {
      console.log(`[AlertSystem] Alert resolved: ${alertId} by ${resolvedBy} in ${resolutionTime}ms`)
    }

    return true
  }

  /**
   * 유틸리티 메서드들
   */
  private findApplicableRules(eventType: string, data: any): AlertRule[] {
    return Array.from(this.alertRules.values()).filter(rule => {
      // 이벤트 타입과 규칙 매칭 로직
      return true // 실제 구현에서는 더 정교한 매칭 로직 필요
    })
  }

  private isDuplicate(rule: AlertRule, data: any): boolean {
    const recentAlerts = Array.from(this.activeAlerts.values()).filter(alert => {
      const timeDiff = Date.now() - new Date(alert.triggeredAt).getTime()
      return alert.configId === rule.ruleId && timeDiff < rule.cooldownMinutes * 60 * 1000
    })

    return recentAlerts.length > 0
  }

  private isSuppressed(rule: AlertRule, data: any): boolean {
    for (const suppressionRule of this.suppressionRules.values()) {
      if (!suppressionRule.enabled) continue

      // 패턴 매칭 로직 (정규식 또는 키워드 매칭)
      const pattern = new RegExp(suppressionRule.pattern, 'i')
      const ruleString = `severity:${rule.severity} businessSlice:${rule.businessSlice || 'general'}`

      if (pattern.test(ruleString)) {
        return true
      }
    }

    return false
  }

  private formatTemplate(template: string, data: any, context: Record<string, any>): string {
    let formatted = template

    // 변수 치환 로직
    formatted = formatted.replace(/\{(\w+)\}/g, (match, key) => {
      return data[key] || context[key] || match
    })

    return formatted
  }

  private extractMetricName(data: any): string {
    return data.metricName || data.endpoint || data.journeyType || data.metric || 'unknown'
  }

  private extractCurrentValue(data: any): number {
    return data.currentValue || data.value || data.responseTime || data.errorRate || 0
  }

  private extractThreshold(data: any): number {
    return data.threshold || data.expectedValue || 0
  }

  private extractMetadata(data: any): Record<string, any> {
    const metadata: Record<string, any> = {}

    if (data.userId) metadata.userId = data.userId
    if (data.sessionId) metadata.sessionId = data.sessionId
    if (data.endpoint) metadata.endpoint = data.endpoint
    if (data.page) metadata.page = data.page

    return metadata
  }

  private getSeverityColor(severity: AlertPriority): string {
    const colors = {
      low: '#36a64f', // 녹색
      medium: '#ff9500', // 주황색
      high: '#e91e63', // 분홍색
      critical: '#ff0000', // 빨간색
    }
    return colors[severity]
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  /**
   * 구독 관리
   */
  subscribe(channel: string, callback: (...args: any[]) => void): () => void {
    const callbacks = this.subscribers.get(channel) || []
    callbacks.push(callback)
    this.subscribers.set(channel, callbacks)

    return () => {
      const updatedCallbacks = this.subscribers.get(channel)?.filter(cb => cb !== callback) || []
      this.subscribers.set(channel, updatedCallbacks)
    }
  }

  /**
   * 상태 조회 메서드들
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.status !== 'resolved')
  }

  getAlertStats(): AlertStats {
    return { ...this.alertStats }
  }

  getAlert(alertId: string): Alert | undefined {
    return this.activeAlerts.get(alertId)
  }

  /**
   * 관리 메서드들
   */
  enableRule(ruleId: string): boolean {
    const rule = this.alertRules.get(ruleId)
    if (rule) {
      rule.enabled = true
      this.alertRules.set(ruleId, rule)
      return true
    }
    return false
  }

  disableRule(ruleId: string): boolean {
    const rule = this.alertRules.get(ruleId)
    if (rule) {
      rule.enabled = false
      this.alertRules.set(ruleId, rule)
      return true
    }
    return false
  }

  /**
   * 정리 및 종료
   */
  destroy(): void {
    this.activeAlerts.clear()
    this.processingQueue.length = 0
    this.subscribers.clear()

    if (this.debugMode) {
      console.log('[AlertSystem] Destroyed')
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const alertSystem = AlertSystem.getInstance()

// 편의 함수들
export const createAlert = alertSystem.createAlert.bind(alertSystem)
export const triggerAlert = alertSystem.triggerAlert.bind(alertSystem)
export const subscribeToAlerts = alertSystem.subscribe.bind(alertSystem)
export const getActiveAlerts = alertSystem.getActiveAlerts.bind(alertSystem)
export const acknowledgeAlert = alertSystem.acknowledgeAlert.bind(alertSystem)
export const resolveAlert = alertSystem.resolveAlert.bind(alertSystem)
