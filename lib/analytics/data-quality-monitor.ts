/**
 * 데이터 품질 보증 및 SLO 모니터링 시스템
 * 데이터 파이프라인의 신뢰성을 보장하고 서비스 수준 목표를 추적
 */

import { apiMonitor } from '@/lib/api/monitoring'
import { 
  DataQualityMetric, 
  SLOMetric, 
  MonitoringSchemaValidator 
} from '@/shared/api/monitoring-schemas'

import { alertSystem } from './alert-system'
import { realTimeDataCollector } from './real-time-data-collector'

// 데이터 품질 규칙
export interface DataQualityRule {
  ruleId: string
  name: string
  dataSource: string
  checks: {
    completeness: { threshold: number; weight: number }
    accuracy: { threshold: number; weight: number }
    consistency: { threshold: number; weight: number }
    timeliness: { threshold: number; weight: number }
    validity: { threshold: number; weight: number }
  }
  businessImpactThresholds: {
    critical: number
    high: number
    medium: number
    low: number
  }
  slaRequirements: {
    availabilityTarget: number // 0-1
    dataFreshnessMinutes: number
    errorRateThreshold: number // 0-1
  }
  enabled: boolean
}

// SLO 정의
export interface SLODefinition {
  sloId: string
  serviceName: string
  description: string
  sliType: 'availability' | 'latency' | 'error_rate' | 'throughput' | 'data_freshness'
  target: number // 목표값 (예: 0.99 for 99% availability)
  timeWindow: '1h' | '24h' | '7d' | '30d'
  errorBudgetPercent: number // 1 - target (예: 1% for 99% target)
  businessSlice: string
  alertingEnabled: boolean
  query: string // 메트릭 쿼리 (실제 환경에서는 PromQL, SQL 등)
}

// 데이터 품질 측정 결과
export interface QualityMeasurement {
  dataSource: string
  timestamp: string
  measurements: {
    completeness: number
    accuracy: number
    consistency: number
    timeliness: number
    validity: number
  }
  recordCount: number
  errorCount: number
  warningCount: number
  anomalies: Array<{
    type: string
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    affectedRecords: number
  }>
  overallScore: number // 0-1
}

// SLO 측정 결과
export interface SLOMeasurement {
  sloId: string
  timestamp: string
  actualValue: number
  targetValue: number
  compliance: number // 0-1
  errorBudgetUsed: number // 0-1
  errorBudgetRemaining: number // 0-1
  timeWindow: string
  breached: boolean
  trend: 'improving' | 'degrading' | 'stable'
}

export class DataQualityMonitor {
  private static instance: DataQualityMonitor
  private qualityRules: Map<string, DataQualityRule> = new Map()
  private sloDefinitions: Map<string, SLODefinition> = new Map()
  private qualityHistory: Map<string, QualityMeasurement[]> = new Map()
  private sloHistory: Map<string, SLOMeasurement[]> = new Map()
  private monitoringInterval: NodeJS.Timeout | null = null
  private debugMode: boolean

  private constructor() {
    this.debugMode = process.env.NODE_ENV !== 'production'
    this.initializeDefaultRules()
    this.initializeDefaultSLOs()
    this.startMonitoring()
    
    if (this.debugMode) {
      console.log('[DataQualityMonitor] Initialized with', this.qualityRules.size, 'rules and', this.sloDefinitions.size, 'SLOs')
    }
  }

  static getInstance(): DataQualityMonitor {
    if (!DataQualityMonitor.instance) {
      DataQualityMonitor.instance = new DataQualityMonitor()
    }
    return DataQualityMonitor.instance
  }

  private initializeDefaultRules(): void {
    // 사용자 여정 데이터 품질 규칙
    this.qualityRules.set('user_journey_data', {
      ruleId: 'user_journey_data',
      name: '사용자 여정 데이터 품질',
      dataSource: 'user_journey_events',
      checks: {
        completeness: { threshold: 0.95, weight: 0.3 }, // 95% 완전성
        accuracy: { threshold: 0.98, weight: 0.25 },    // 98% 정확성
        consistency: { threshold: 0.90, weight: 0.2 },  // 90% 일관성
        timeliness: { threshold: 0.99, weight: 0.15 },  // 99% 적시성
        validity: { threshold: 0.97, weight: 0.1 }      // 97% 유효성
      },
      businessImpactThresholds: {
        critical: 0.85,
        high: 0.90,
        medium: 0.95,
        low: 0.98
      },
      slaRequirements: {
        availabilityTarget: 0.999, // 99.9%
        dataFreshnessMinutes: 5,   // 5분 이내
        errorRateThreshold: 0.01   // 1% 이하
      },
      enabled: true
    })

    // API 성능 데이터 품질 규칙
    this.qualityRules.set('api_performance_data', {
      ruleId: 'api_performance_data',
      name: 'API 성능 데이터 품질',
      dataSource: 'api_metrics',
      checks: {
        completeness: { threshold: 0.99, weight: 0.4 },
        accuracy: { threshold: 0.95, weight: 0.3 },
        consistency: { threshold: 0.88, weight: 0.15 },
        timeliness: { threshold: 0.98, weight: 0.1 },
        validity: { threshold: 0.96, weight: 0.05 }
      },
      businessImpactThresholds: {
        critical: 0.80,
        high: 0.85,
        medium: 0.90,
        low: 0.95
      },
      slaRequirements: {
        availabilityTarget: 0.99,
        dataFreshnessMinutes: 2,
        errorRateThreshold: 0.02
      },
      enabled: true
    })

    // Web Vitals 데이터 품질 규칙
    this.qualityRules.set('web_vitals_data', {
      ruleId: 'web_vitals_data',
      name: 'Web Vitals 데이터 품질',
      dataSource: 'web_vitals',
      checks: {
        completeness: { threshold: 0.85, weight: 0.25 }, // 샘플링으로 인한 낮은 완전성 허용
        accuracy: { threshold: 0.92, weight: 0.35 },
        consistency: { threshold: 0.80, weight: 0.2 },
        timeliness: { threshold: 0.95, weight: 0.15 },
        validity: { threshold: 0.90, weight: 0.05 }
      },
      businessImpactThresholds: {
        critical: 0.70,
        high: 0.75,
        medium: 0.80,
        low: 0.85
      },
      slaRequirements: {
        availabilityTarget: 0.95,
        dataFreshnessMinutes: 10,
        errorRateThreshold: 0.05
      },
      enabled: true
    })
  }

  private initializeDefaultSLOs(): void {
    // 서브메뉴 가용성 SLO
    this.sloDefinitions.set('submenu_availability', {
      sloId: 'submenu_availability',
      serviceName: 'SubMenu Navigation',
      description: '서브메뉴 네비게이션 성공률',
      sliType: 'availability',
      target: 0.99, // 99%
      timeWindow: '24h',
      errorBudgetPercent: 0.01, // 1%
      businessSlice: 'user_engagement',
      alertingEnabled: true,
      query: 'submenu_success_rate_24h'
    })

    // API 응답 시간 SLO
    this.sloDefinitions.set('api_latency', {
      sloId: 'api_latency',
      serviceName: 'API Response Time',
      description: 'API 응답 시간 (95 퍼센타일)',
      sliType: 'latency',
      target: 2000, // 2초
      timeWindow: '1h',
      errorBudgetPercent: 0.05, // 5%
      businessSlice: 'api_performance',
      alertingEnabled: true,
      query: 'api_response_time_p95_1h'
    })

    // 사용자 여정 완료율 SLO
    this.sloDefinitions.set('journey_completion', {
      sloId: 'journey_completion',
      serviceName: 'User Journey Completion',
      description: '핵심 사용자 여정 완료율',
      sliType: 'availability',
      target: 0.85, // 85%
      timeWindow: '24h',
      errorBudgetPercent: 0.15, // 15%
      businessSlice: 'user_engagement',
      alertingEnabled: true,
      query: 'journey_completion_rate_24h'
    })

    // 데이터 파이프라인 처리량 SLO
    this.sloDefinitions.set('data_throughput', {
      sloId: 'data_throughput',
      serviceName: 'Data Pipeline Throughput',
      description: '데이터 파이프라인 처리량',
      sliType: 'throughput',
      target: 1000, // 시간당 1000개 이벤트
      timeWindow: '1h',
      errorBudgetPercent: 0.1, // 10%
      businessSlice: 'data_processing',
      alertingEnabled: true,
      query: 'data_events_processed_per_hour'
    })

    // Core Web Vitals SLO
    this.sloDefinitions.set('web_vitals_performance', {
      sloId: 'web_vitals_performance',
      serviceName: 'Web Performance',
      description: 'Core Web Vitals 성능 기준 달성률',
      sliType: 'availability',
      target: 0.75, // 75%의 사용자가 Good 등급
      timeWindow: '24h',
      errorBudgetPercent: 0.25, // 25%
      businessSlice: 'user_experience',
      alertingEnabled: true,
      query: 'web_vitals_good_rate_24h'
    })
  }

  private startMonitoring(): void {
    // 5분마다 데이터 품질 검사 실행
    this.monitoringInterval = setInterval(async () => {
      await this.runQualityChecks()
      await this.runSLOChecks()
    }, 5 * 60 * 1000) // 5분
  }

  /**
   * 데이터 품질 검사 실행
   */
  private async runQualityChecks(): Promise<void> {
    for (const rule of this.qualityRules.values()) {
      if (!rule.enabled) continue

      try {
        const measurement = await this.performQualityMeasurement(rule)
        await this.processQualityMeasurement(rule, measurement)
      } catch (error) {
        console.error(`[DataQualityMonitor] Quality check failed for ${rule.dataSource}:`, error)
        apiMonitor.logError('Data quality check failed', error as Error, { ruleId: rule.ruleId })
      }
    }
  }

  /**
   * 데이터 품질 측정 수행
   */
  private async performQualityMeasurement(rule: DataQualityRule): Promise<QualityMeasurement> {
    // 실제 구현에서는 데이터 소스에 따른 구체적인 검사 로직 필요
    const measurement: QualityMeasurement = {
      dataSource: rule.dataSource,
      timestamp: new Date().toISOString(),
      measurements: await this.calculateQualityMetrics(rule),
      recordCount: await this.getRecordCount(rule.dataSource),
      errorCount: await this.getErrorCount(rule.dataSource),
      warningCount: await this.getWarningCount(rule.dataSource),
      anomalies: await this.detectAnomalies(rule),
      overallScore: 0
    }

    // 전체 점수 계산 (가중 평균)
    measurement.overallScore = this.calculateOverallScore(measurement.measurements, rule.checks)

    return measurement
  }

  private async calculateQualityMetrics(rule: DataQualityRule): Promise<QualityMeasurement['measurements']> {
    // 시뮬레이션된 품질 메트릭 (실제 환경에서는 데이터 소스별 구현 필요)
    const baseQuality = 0.85 + Math.random() * 0.15 // 85-100%

    return {
      completeness: Math.min(1, baseQuality + 0.05 + Math.random() * 0.1),
      accuracy: Math.min(1, baseQuality + 0.08 + Math.random() * 0.07),
      consistency: Math.min(1, baseQuality + 0.02 + Math.random() * 0.13),
      timeliness: Math.min(1, baseQuality + 0.1 + Math.random() * 0.05),
      validity: Math.min(1, baseQuality + 0.07 + Math.random() * 0.08)
    }
  }

  private async getRecordCount(dataSource: string): Promise<number> {
    // 실제 구현에서는 데이터 소스 쿼리
    return Math.floor(1000 + Math.random() * 9000)
  }

  private async getErrorCount(dataSource: string): Promise<number> {
    // 실제 구현에서는 에러 로그 쿼리
    return Math.floor(Math.random() * 50)
  }

  private async getWarningCount(dataSource: string): Promise<number> {
    // 실제 구현에서는 경고 로그 쿼리
    return Math.floor(Math.random() * 100)
  }

  private async detectAnomalies(rule: DataQualityRule): Promise<QualityMeasurement['anomalies']> {
    const anomalies: QualityMeasurement['anomalies'] = []

    // 시뮬레이션된 이상 징후 감지
    if (Math.random() < 0.1) { // 10% 확률로 이상 징후 발생
      anomalies.push({
        type: 'data_spike',
        description: '예상보다 높은 데이터 볼륨 감지',
        severity: 'medium',
        affectedRecords: Math.floor(Math.random() * 1000)
      })
    }

    if (Math.random() < 0.05) { // 5% 확률로 심각한 이상 징후
      anomalies.push({
        type: 'schema_violation',
        description: '스키마 규칙 위반 데이터 감지',
        severity: 'high',
        affectedRecords: Math.floor(Math.random() * 100)
      })
    }

    return anomalies
  }

  private calculateOverallScore(
    measurements: QualityMeasurement['measurements'],
    checks: DataQualityRule['checks']
  ): number {
    let weightedScore = 0
    let totalWeight = 0

    Object.entries(checks).forEach(([key, config]) => {
      const measurement = measurements[key as keyof typeof measurements]
      weightedScore += measurement * config.weight
      totalWeight += config.weight
    })

    return totalWeight > 0 ? weightedScore / totalWeight : 0
  }

  /**
   * 품질 측정 결과 처리
   */
  private async processQualityMeasurement(
    rule: DataQualityRule,
    measurement: QualityMeasurement
  ): Promise<void> {
    // 히스토리 저장
    const history = this.qualityHistory.get(rule.dataSource) || []
    history.push(measurement)
    
    // 최대 100개 측정 결과 보관
    if (history.length > 100) {
      history.shift()
    }
    this.qualityHistory.set(rule.dataSource, history)

    // 비즈니스 임팩트 결정
    const businessImpact = this.determineBusinessImpact(measurement.overallScore, rule)

    // 데이터 품질 메트릭 생성 및 수집
    const qualityMetric: DataQualityMetric = {
      dataSource: rule.dataSource,
      timestamp: measurement.timestamp,
      qualityChecks: {
        completeness: measurement.measurements.completeness,
        accuracy: measurement.measurements.accuracy,
        consistency: measurement.measurements.consistency,
        timeliness: measurement.measurements.timeliness,
        validity: measurement.measurements.validity
      },
      recordCount: measurement.recordCount,
      errorCount: measurement.errorCount,
      warningCount: measurement.warningCount,
      businessImpact,
      slaCompliance: measurement.overallScore >= (rule.slaRequirements.availabilityTarget || 0.95),
      anomaliesDetected: measurement.anomalies
    }

    // 스키마 검증 및 수집
    const validated = MonitoringSchemaValidator.validateDataQuality(qualityMetric)
    realTimeDataCollector.collectDataQuality(validated)

    // 임계값 위반 시 알림 생성
    if (businessImpact === 'critical' || businessImpact === 'high') {
      await alertSystem.triggerAlert('data_quality_issue', {
        dataSource: rule.dataSource,
        businessImpact,
        overallScore: measurement.overallScore,
        anomalies: measurement.anomalies,
        completeness: measurement.measurements.completeness
      })
    }

    if (this.debugMode) {
      console.log(`[DataQualityMonitor] ${rule.dataSource}: ${(measurement.overallScore * 100).toFixed(1)}% (${businessImpact})`)
    }
  }

  private determineBusinessImpact(
    score: number,
    rule: DataQualityRule
  ): 'none' | 'low' | 'medium' | 'high' | 'critical' {
    if (score < rule.businessImpactThresholds.critical) return 'critical'
    if (score < rule.businessImpactThresholds.high) return 'high'
    if (score < rule.businessImpactThresholds.medium) return 'medium'
    if (score < rule.businessImpactThresholds.low) return 'low'
    return 'none'
  }

  /**
   * SLO 검사 실행
   */
  private async runSLOChecks(): Promise<void> {
    for (const slo of this.sloDefinitions.values()) {
      if (!slo.alertingEnabled) continue

      try {
        const measurement = await this.performSLOMeasurement(slo)
        await this.processSLOMeasurement(slo, measurement)
      } catch (error) {
        console.error(`[DataQualityMonitor] SLO check failed for ${slo.sloId}:`, error)
        apiMonitor.logError('SLO check failed', error as Error, { sloId: slo.sloId })
      }
    }
  }

  /**
   * SLO 측정 수행
   */
  private async performSLOMeasurement(slo: SLODefinition): Promise<SLOMeasurement> {
    // 실제 구현에서는 메트릭 쿼리 실행
    const actualValue = await this.querySLIValue(slo)
    const compliance = this.calculateCompliance(actualValue, slo)
    const errorBudgetUsed = 1 - compliance
    const errorBudgetRemaining = Math.max(0, slo.errorBudgetPercent - errorBudgetUsed)

    return {
      sloId: slo.sloId,
      timestamp: new Date().toISOString(),
      actualValue,
      targetValue: slo.target,
      compliance,
      errorBudgetUsed,
      errorBudgetRemaining,
      timeWindow: slo.timeWindow,
      breached: compliance < (slo.target - slo.errorBudgetPercent),
      trend: this.calculateTrend(slo.sloId)
    }
  }

  private async querySLIValue(slo: SLODefinition): Promise<number> {
    // 시뮬레이션된 SLI 값 (실제 환경에서는 메트릭 쿼리)
    switch (slo.sliType) {
      case 'availability':
        return 0.85 + Math.random() * 0.14 // 85-99%
      case 'latency':
        return 800 + Math.random() * 2200 // 800-3000ms
      case 'error_rate':
        return Math.random() * 0.1 // 0-10%
      case 'throughput':
        return 800 + Math.random() * 400 // 800-1200
      case 'data_freshness':
        return 2 + Math.random() * 8 // 2-10 minutes
      default:
        return 0
    }
  }

  private calculateCompliance(actualValue: number, slo: SLODefinition): number {
    switch (slo.sliType) {
      case 'availability':
        return Math.min(1, actualValue / slo.target)
      case 'latency':
        return actualValue <= slo.target ? 1 : slo.target / actualValue
      case 'error_rate':
        return actualValue <= slo.target ? 1 : slo.target / actualValue
      case 'throughput':
        return Math.min(1, actualValue / slo.target)
      case 'data_freshness':
        return actualValue <= slo.target ? 1 : slo.target / actualValue
      default:
        return 0
    }
  }

  private calculateTrend(sloId: string): 'improving' | 'degrading' | 'stable' {
    const history = this.sloHistory.get(sloId) || []
    if (history.length < 3) return 'stable'

    const recent = history.slice(-3)
    const avgRecent = recent.reduce((sum, m) => sum + m.compliance, 0) / recent.length
    const older = history.slice(-6, -3)
    const avgOlder = older.length > 0 ? older.reduce((sum, m) => sum + m.compliance, 0) / older.length : avgRecent

    const change = avgRecent - avgOlder
    if (Math.abs(change) < 0.02) return 'stable'
    return change > 0 ? 'improving' : 'degrading'
  }

  /**
   * SLO 측정 결과 처리
   */
  private async processSLOMeasurement(
    slo: SLODefinition,
    measurement: SLOMeasurement
  ): Promise<void> {
    // 히스토리 저장
    const history = this.sloHistory.get(slo.sloId) || []
    history.push(measurement)
    
    // 최대 100개 측정 결과 보관
    if (history.length > 100) {
      history.shift()
    }
    this.sloHistory.set(slo.sloId, history)

    // SLO 메트릭 생성 및 수집
    const sloMetric: SLOMetric = {
      sloId: slo.sloId,
      serviceName: slo.serviceName,
      timestamp: measurement.timestamp,
      sliValue: measurement.actualValue,
      sloTarget: measurement.targetValue,
      timeWindow: slo.timeWindow,
      businessSlice: slo.businessSlice,
      compliance: measurement.compliance,
      errorBudgetRemaining: measurement.errorBudgetRemaining,
      alertsTriggered: measurement.breached,
      metadata: {
        sliType: slo.sliType,
        trend: measurement.trend,
        description: slo.description
      }
    }

    // 스키마 검증 및 수집
    const validated = MonitoringSchemaValidator.validateSLOMetric(sloMetric)
    realTimeDataCollector.collectBusinessMetric({
      metricName: 'slo_compliance',
      value: measurement.compliance,
      unit: 'ratio',
      source: 'data_quality_monitor',
      businessSlice: slo.businessSlice,
      dimensions: {
        sloId: slo.sloId,
        serviceName: slo.serviceName,
        sliType: slo.sliType,
        timeWindow: slo.timeWindow
      }
    })

    // SLO 위반 시 알림 생성
    if (measurement.breached) {
      await alertSystem.triggerAlert('slo_breach', {
        sloId: slo.sloId,
        serviceName: slo.serviceName,
        actualValue: measurement.actualValue,
        targetValue: measurement.targetValue,
        compliance: measurement.compliance,
        errorBudgetRemaining: measurement.errorBudgetRemaining,
        timeWindow: slo.timeWindow
      })
    }

    // 에러 버짓 소진 경고 (90% 이상 사용 시)
    if (measurement.errorBudgetUsed > 0.9 && !measurement.breached) {
      await alertSystem.triggerAlert('error_budget_warning', {
        sloId: slo.sloId,
        serviceName: slo.serviceName,
        errorBudgetUsed: measurement.errorBudgetUsed,
        errorBudgetRemaining: measurement.errorBudgetRemaining
      })
    }

    if (this.debugMode) {
      console.log(`[DataQualityMonitor] SLO ${slo.sloId}: ${(measurement.compliance * 100).toFixed(1)}% (${measurement.breached ? 'BREACHED' : 'OK'})`)
    }
  }

  /**
   * 품질 규칙 관리
   */
  addQualityRule(rule: DataQualityRule): void {
    this.qualityRules.set(rule.ruleId, rule)
    if (this.debugMode) {
      console.log(`[DataQualityMonitor] Added quality rule: ${rule.name}`)
    }
  }

  /**
   * SLO 정의 관리
   */
  addSLODefinition(slo: SLODefinition): void {
    this.sloDefinitions.set(slo.sloId, slo)
    if (this.debugMode) {
      console.log(`[DataQualityMonitor] Added SLO definition: ${slo.serviceName}`)
    }
  }

  /**
   * 상태 조회 메서드들
   */
  getQualityStatus(): Map<string, QualityMeasurement | undefined> {
    const status = new Map<string, QualityMeasurement | undefined>()
    
    for (const [dataSource, history] of this.qualityHistory.entries()) {
      status.set(dataSource, history[history.length - 1])
    }
    
    return status
  }

  getSLOStatus(): Map<string, SLOMeasurement | undefined> {
    const status = new Map<string, SLOMeasurement | undefined>()
    
    for (const [sloId, history] of this.sloHistory.entries()) {
      status.set(sloId, history[history.length - 1])
    }
    
    return status
  }

  getOverallHealthScore(): number {
    const qualityScores = Array.from(this.qualityHistory.values())
      .map(history => history[history.length - 1]?.overallScore || 0)
    
    const sloScores = Array.from(this.sloHistory.values())
      .map(history => history[history.length - 1]?.compliance || 0)
    
    const allScores = [...qualityScores, ...sloScores]
    if (allScores.length === 0) return 0
    
    return allScores.reduce((sum, score) => sum + score, 0) / allScores.length
  }

  /**
   * 수동 품질 검사 트리거
   */
  async triggerQualityCheck(ruleId?: string): Promise<void> {
    if (ruleId) {
      const rule = this.qualityRules.get(ruleId)
      if (rule && rule.enabled) {
        const measurement = await this.performQualityMeasurement(rule)
        await this.processQualityMeasurement(rule, measurement)
      }
    } else {
      await this.runQualityChecks()
    }
  }

  /**
   * 수동 SLO 검사 트리거
   */
  async triggerSLOCheck(sloId?: string): Promise<void> {
    if (sloId) {
      const slo = this.sloDefinitions.get(sloId)
      if (slo) {
        const measurement = await this.performSLOMeasurement(slo)
        await this.processSLOMeasurement(slo, measurement)
      }
    } else {
      await this.runSLOChecks()
    }
  }

  /**
   * 정리 및 종료
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
      this.monitoringInterval = null
    }
    
    this.qualityHistory.clear()
    this.sloHistory.clear()
    
    if (this.debugMode) {
      console.log('[DataQualityMonitor] Destroyed')
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const dataQualityMonitor = DataQualityMonitor.getInstance()

// 편의 함수들
export const getQualityStatus = dataQualityMonitor.getQualityStatus.bind(dataQualityMonitor)
export const getSLOStatus = dataQualityMonitor.getSLOStatus.bind(dataQualityMonitor)
export const getOverallHealthScore = dataQualityMonitor.getOverallHealthScore.bind(dataQualityMonitor)
export const triggerQualityCheck = dataQualityMonitor.triggerQualityCheck.bind(dataQualityMonitor)
export const triggerSLOCheck = dataQualityMonitor.triggerSLOCheck.bind(dataQualityMonitor)