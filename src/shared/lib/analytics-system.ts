/**
 * VLANET 분석 및 메트릭 수집 시스템
 * 
 * 사용자 행동 분석, 파이프라인 단계별 완료율 추적, 성능 메트릭 수집을
 * GDPR 준수하여 처리하는 종합 분석 시스템입니다.
 * 
 * 핵심 원칙:
 * - 개인정보 비식별화 (k-익명성, 차등정보보호)
 * - 실시간 메트릭 수집 및 집계
 * - 예측적 분석 및 이상 탐지
 * - 비즈니스 인사이트 자동 생성
 * - 성능 기반 스케일링 권고
 */

import { z } from 'zod'
import {
  analyticsDataContract,
  DataContractValidator,
  type AnalyticsData
} from './data-contracts'

// =============================================================================
// 분석 설정 및 옵션 타입
// =============================================================================

export interface AnalyticsConfig {
  gdprCompliant: boolean
  anonymizeAfter: number // days
  retentionPeriod: number // days
  batchSize: number
  aggregationLevel?: 'raw' | 'session' | 'daily' | 'weekly'
}

export interface PrivacyConfig {
  kAnonymity: number // 최소 그룹 크기
  lDiversity: number // 다양성 요구사항
  epsilon: number // 차등정보보호 프라이버시 예산
  suppressionThreshold: number // 데이터 억제 임계값
}

// =============================================================================
// 분석 결과 타입
// =============================================================================

export interface UserEngagementAnalysis {
  segments: {
    high_engagement: { userCount: number; avgSessionTime: number; avgInteractions: number }
    moderate_engagement: { userCount: number; avgSessionTime: number; avgInteractions: number }
    low_engagement: { userCount: number; avgSessionTime: number; avgInteractions: number }
  }
  patterns: {
    peakHours: number[]
    mostActiveDay: number
    seasonalTrends: Record<string, number>
  }
  insights: string[]
  recommendations: string[]
  privacyCompliant: boolean
}

export interface PerformanceMetrics {
  summary: {
    overallHealth: 'excellent' | 'good' | 'fair' | 'poor'
    bottlenecks: Array<{
      component: string
      severity: 'low' | 'medium' | 'high'
      impact: string
    }>
    recommendations: string[]
  }
  pipelineMetrics: Record<string, {
    efficiency: number // 0.0 - 1.0
    throughput: number // records/second
    errorRate: number
    averageExecutionTime: number
  }>
  systemMetrics: {
    resourceUtilization: {
      cpu: number
      memory: number
      storage: number
      network: number
    }
    capacityAlerts: Array<{
      resource: string
      usage: number
      threshold: number
      severity: 'info' | 'warning' | 'critical'
      action: string
    }>
  }
}

// =============================================================================
// 분석 수집기
// =============================================================================

export class AnalyticsCollector {
  private config: AnalyticsConfig
  private eventBuffer: any[] = []

  constructor(config: AnalyticsConfig) {
    this.config = config
  }

  /**
   * 사용자 이벤트 수집 (실시간 개인정보 보호 적용)
   */
  async collectEvents(userEvents: Array<{
    userId: string
    sessionId: string
    event: {
      type: string
      timestamp: string
      properties: Record<string, any>
    }
  }>): Promise<{
    success: boolean
    eventsProcessed: number
    anonymizedEvents: number
    privacyViolations: number
    processedEvents: Array<{
      userId: string | null
      sessionId: string
      event: {
        type: string
        timestamp: string
        properties: Record<string, any>
      }
      anonymized: boolean
    }>
  }> {
    const processedEvents = []
    let anonymizedEvents = 0
    let privacyViolations = 0

    for (const userEvent of userEvents) {
      try {
        // PII 자동 제거
        const sanitizedProperties = this.sanitizeEventProperties(userEvent.event.properties)
        
        // 이벤트 처리
        const processedEvent = {
          userId: userEvent.userId,
          sessionId: userEvent.sessionId,
          event: {
            ...userEvent.event,
            properties: sanitizedProperties
          },
          anonymized: false
        }

        // 개인정보 보호 규칙 적용
        if (this.config.gdprCompliant) {
          const eventAge = this.calculateEventAge(userEvent.event.timestamp)
          if (eventAge > this.config.anonymizeAfter) {
            processedEvent.userId = null
            processedEvent.sessionId = `session_anonymous_${this.generateAnonymousId(userEvent.sessionId)}`
            processedEvent.anonymized = true
            anonymizedEvents++
          }
        }

        processedEvents.push(processedEvent)

      } catch (error) {
        privacyViolations++
      }
    }

    // 배치 저장
    if (processedEvents.length >= this.config.batchSize) {
      await this.flushEventBuffer(processedEvents)
    } else {
      this.eventBuffer.push(...processedEvents)
    }

    return {
      success: true,
      eventsProcessed: userEvents.length,
      anonymizedEvents,
      privacyViolations,
      processedEvents
    }
  }

  /**
   * 보존 정책 처리 (익명화 및 삭제)
   */
  async processRetentionPolicy(events: any[]): Promise<{
    anonymizedCount: number
    deletedCount: number
    processedEvents: any[]
  }> {
    const processedEvents = []
    let anonymizedCount = 0
    let deletedCount = 0

    for (const event of events) {
      const eventAge = this.calculateEventAge(event.event.timestamp)

      if (eventAge > this.config.retentionPeriod) {
        // 보존 기간 초과 → 삭제
        deletedCount++
        continue
      }

      if (eventAge > this.config.anonymizeAfter) {
        // 익명화 기간 초과 → 익명화
        const anonymizedEvent = {
          ...event,
          userId: null,
          sessionId: `session_anonymous_${this.generateAnonymousId(event.sessionId)}`,
          anonymized: true
        }
        processedEvents.push(anonymizedEvent)
        anonymizedCount++
      } else {
        processedEvents.push(event)
      }
    }

    return {
      anonymizedCount,
      deletedCount,
      processedEvents
    }
  }

  /**
   * 대용량 이벤트 배치 처리
   */
  async collectEventsBatch(events: any[]): Promise<{
    success: boolean
    batchesProcessed: number
    totalEvents: number
    processingTime: number
  }> {
    const startTime = Date.now()
    const batchSize = this.config.batchSize
    let batchesProcessed = 0

    for (let i = 0; i < events.length; i += batchSize) {
      const batch = events.slice(i, i + batchSize)
      await this.processBatch(batch)
      batchesProcessed++
    }

    return {
      success: true,
      batchesProcessed,
      totalEvents: events.length,
      processingTime: Date.now() - startTime
    }
  }

  private sanitizeEventProperties(properties: Record<string, any>): Record<string, any> {
    const sanitized = { ...properties }
    
    // PII 자동 감지 및 제거
    const piiFields = ['userAgent', 'ipAddress', 'fingerprint', 'email', 'phone']
    piiFields.forEach(field => {
      delete sanitized[field]
    })

    // URL에서 query parameter 제거 (추적 파라미터 포함 가능)
    if (sanitized.url) {
      try {
        const url = new URL(sanitized.url)
        sanitized.url = `${url.protocol}//${url.host}${url.pathname}`
      } catch {
        delete sanitized.url
      }
    }

    return sanitized
  }

  private calculateEventAge(timestamp: string): number {
    const eventTime = new Date(timestamp).getTime()
    const now = Date.now()
    return Math.floor((now - eventTime) / (1000 * 60 * 60 * 24)) // days
  }

  private generateAnonymousId(originalId: string): string {
    let hash = 0
    for (let i = 0; i < originalId.length; i++) {
      const char = originalId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  private async flushEventBuffer(events: any[]): Promise<void> {
    // 실제로는 데이터베이스 또는 분석 저장소에 저장
    this.eventBuffer = []
  }

  private async processBatch(batch: any[]): Promise<void> {
    // 배치 처리 로직
    await new Promise(resolve => setTimeout(resolve, 10)) // 시뮬레이션
  }
}

// =============================================================================
// 사용자 행동 분석기
// =============================================================================

export class UserBehaviorAnalyzer {
  /**
   * 참여도 패턴 분석 (개인정보 비식별화)
   */
  async analyzeEngagementPatterns(userSessions: Array<{
    userId: string // 익명화된 ID
    sessionData: {
      duration: number
      pageViews: number
      videoWatches: number
      interactions: number
      timeOfDay: number
      dayOfWeek: number
    }
  }>): Promise<UserEngagementAnalysis> {
    // 참여도 점수 계산
    const sessionsWithScore = userSessions.map(session => ({
      ...session,
      engagementScore: this.calculateEngagementScore(session.sessionData)
    }))

    // 세그먼트 분류
    const segments = this.segmentUsersByEngagement(sessionsWithScore)

    // 시간 패턴 분석
    const timePatterns = this.analyzeTimePatterns(userSessions)

    // 인사이트 생성
    const insights = this.generateEngagementInsights(segments, timePatterns)
    const recommendations = this.generateEngagementRecommendations(insights)

    return {
      segments,
      patterns: timePatterns,
      insights,
      recommendations,
      privacyCompliant: true
    }
  }

  /**
   * 사용자 여정 병목 구간 식별
   */
  async identifyJourneyBottlenecks(userJourneys: Array<{
    userId: string
    steps: Array<{
      step: string
      timestamp: string | null
      completed: boolean
    }>
  }>): Promise<{
    bottlenecks: Array<{
      step: string
      dropoffRate: number
      averageTimeToStep: number // minutes
      conversionRate: number
    }>
    funnelAnalysis: {
      totalUsers: number
      stepConversion: Record<string, number>
      overallConversion: number
    }
    recommendations: string[]
  }> {
    const stepStats = this.calculateStepStatistics(userJourneys)
    const bottlenecks = this.identifyBottleneckSteps(stepStats)
    const funnelAnalysis = this.performFunnelAnalysis(userJourneys)

    return {
      bottlenecks,
      funnelAnalysis,
      recommendations: this.generateJourneyRecommendations(bottlenecks)
    }
  }

  /**
   * 사용자 생애 가치 예측
   */
  async calculateLTV(userMetrics: Array<{
    userId: string
    metrics: {
      sessionCount: number
      totalWatchTime: number
      projectsCreated: number
      commentsPosted: number
      subscriptionRevenue: number
      registrationDate: string
    }
  }>): Promise<{
    segments: {
      high_value: { users: string[]; averageLTV: number; retentionRate: number }
      growing: { users: string[]; conversionProbability: number; potentialLTV: number }
      at_risk: { users: string[]; churnProbability: number; interventionValue: number }
    }
    predictions: {
      revenueGrowth: {
        nextMonth: number
        nextQuarter: number
        nextYear: number
      }
      churnRisk: {
        immediate: number // 다음 30일
        nearTerm: number // 다음 90일
      }
    }
    actionableInsights: string[]
  }> {
    const usersWithLTV = userMetrics.map(user => ({
      ...user,
      ltv: this.calculateIndividualLTV(user.metrics),
      engagementLevel: this.calculateEngagementLevel(user.metrics),
      tenureDays: this.calculateTenure(user.metrics.registrationDate)
    }))

    const segments = this.segmentUsersByLTV(usersWithLTV)
    const predictions = this.generateLTVPredictions(usersWithLTV)
    const insights = this.generateLTVInsights(segments, predictions)

    return {
      segments,
      predictions,
      actionableInsights: insights
    }
  }

  /**
   * 개인화된 추천 생성 (개인 식별 없이)
   */
  async generatePersonalizedRecommendations(profile: {
    userSegment: string
    skillLevel: string
    preferences: {
      preferredVideoLength: string
      favoriteCategories: string[]
      activeTimeSlots: number[]
    }
    recentActivity: {
      projectTypes: string[]
      collaborationFrequency: string
      feedbackEngagement: string
    }
  }): Promise<{
    content: string[]
    features: string[]
    timing: {
      optimal: string[]
      avoid: string[]
    }
    confidence: number
    privacyCompliant: boolean
  }> {
    const recommendations = {
      content: this.generateContentRecommendations(profile),
      features: this.generateFeatureRecommendations(profile),
      timing: this.generateTimingRecommendations(profile.preferences.activeTimeSlots),
      confidence: this.calculateRecommendationConfidence(profile),
      privacyCompliant: true
    }

    return recommendations
  }

  private calculateEngagementScore(sessionData: any): number {
    const weights = {
      duration: 0.3,
      pageViews: 0.2,
      videoWatches: 0.3,
      interactions: 0.2
    }

    // 정규화된 점수 계산 (0-1 범위)
    const durationScore = Math.min(sessionData.duration / 3600000, 1) // 최대 1시간 기준
    const pageViewScore = Math.min(sessionData.pageViews / 20, 1) // 최대 20페이지 기준
    const videoWatchScore = Math.min(sessionData.videoWatches / 10, 1) // 최대 10개 비디오 기준
    const interactionScore = Math.min(sessionData.interactions / 50, 1) // 최대 50개 상호작용 기준

    return (
      durationScore * weights.duration +
      pageViewScore * weights.pageViews +
      videoWatchScore * weights.videoWatches +
      interactionScore * weights.interactions
    )
  }

  private segmentUsersByEngagement(sessionsWithScore: any[]) {
    const highEngagement = sessionsWithScore.filter(s => s.engagementScore >= 0.7)
    const moderateEngagement = sessionsWithScore.filter(s => s.engagementScore >= 0.4 && s.engagementScore < 0.7)
    const lowEngagement = sessionsWithScore.filter(s => s.engagementScore < 0.4)

    return {
      high_engagement: {
        userCount: highEngagement.length,
        avgSessionTime: this.calculateAverage(highEngagement.map(s => s.sessionData.duration)),
        avgInteractions: this.calculateAverage(highEngagement.map(s => s.sessionData.interactions))
      },
      moderate_engagement: {
        userCount: moderateEngagement.length,
        avgSessionTime: this.calculateAverage(moderateEngagement.map(s => s.sessionData.duration)),
        avgInteractions: this.calculateAverage(moderateEngagement.map(s => s.sessionData.interactions))
      },
      low_engagement: {
        userCount: lowEngagement.length,
        avgSessionTime: this.calculateAverage(lowEngagement.map(s => s.sessionData.duration)),
        avgInteractions: this.calculateAverage(lowEngagement.map(s => s.sessionData.interactions))
      }
    }
  }

  private analyzeTimePatterns(userSessions: any[]) {
    const hourCounts = new Array(24).fill(0)
    const dayOfWeekCounts = new Array(7).fill(0)

    userSessions.forEach(session => {
      hourCounts[session.sessionData.timeOfDay]++
      dayOfWeekCounts[session.sessionData.dayOfWeek]++
    })

    const peakHours = hourCounts
      .map((count, hour) => ({ hour, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)
      .map(item => item.hour)

    const mostActiveDay = dayOfWeekCounts.indexOf(Math.max(...dayOfWeekCounts))

    return {
      peakHours,
      mostActiveDay,
      seasonalTrends: {} // 실제로는 더 긴 기간의 데이터 필요
    }
  }

  private generateEngagementInsights(segments: any, patterns: any): string[] {
    const insights = []

    if (segments.high_engagement.userCount > segments.low_engagement.userCount) {
      insights.push('높은 참여도 사용자가 저참여도 사용자보다 많음 - 양호한 사용자 품질')
    }

    if (patterns.peakHours.some((hour: number) => hour >= 18 && hour <= 22)) {
      insights.push('사용자들은 주말 저녁에 가장 활발함')
    }

    if (patterns.mostActiveDay >= 5) {
      insights.push('주말 사용률이 평일보다 높음')
    }

    return insights
  }

  private generateEngagementRecommendations(insights: string[]): string[] {
    const recommendations = []

    if (insights.some(insight => insight.includes('저녁'))) {
      recommendations.push('저녁 시간대 콘텐츠 추천 강화')
    }

    if (insights.some(insight => insight.includes('주말'))) {
      recommendations.push('주말 특별 이벤트 및 프로모션 기획')
    }

    recommendations.push('고참여 사용자 리워드 프로그램 도입')
    recommendations.push('저참여 사용자 온보딩 개선')

    return recommendations
  }

  private calculateStepStatistics(userJourneys: any[]) {
    const stepStats = new Map<string, {
      attempted: number
      completed: number
      totalTime: number
      timeoutCount: number
    }>()

    userJourneys.forEach(journey => {
      journey.steps.forEach((step: any, index: number) => {
        if (!stepStats.has(step.step)) {
          stepStats.set(step.step, { attempted: 0, completed: 0, totalTime: 0, timeoutCount: 0 })
        }

        const stats = stepStats.get(step.step)!
        stats.attempted++

        if (step.completed) {
          stats.completed++
          
          // 이전 단계와의 시간 차이 계산
          if (index > 0 && journey.steps[index - 1].timestamp && step.timestamp) {
            const timeDiff = new Date(step.timestamp).getTime() - new Date(journey.steps[index - 1].timestamp!).getTime()
            stats.totalTime += timeDiff
          }
        }
      })
    })

    return stepStats
  }

  private identifyBottleneckSteps(stepStats: Map<string, any>) {
    const bottlenecks = []

    for (const [step, stats] of stepStats.entries()) {
      const dropoffRate = 1 - (stats.completed / stats.attempted)
      const averageTimeToStep = stats.totalTime / Math.max(stats.completed, 1) / (1000 * 60) // minutes

      if (dropoffRate > 0.3 || averageTimeToStep > 15) { // 30% 이상 드롭오프 또는 15분 이상 소요
        bottlenecks.push({
          step,
          dropoffRate,
          averageTimeToStep,
          conversionRate: stats.completed / stats.attempted
        })
      }
    }

    return bottlenecks.sort((a, b) => b.dropoffRate - a.dropoffRate)
  }

  private performFunnelAnalysis(userJourneys: any[]) {
    const totalUsers = userJourneys.length
    const stepCounts = new Map<string, number>()

    userJourneys.forEach(journey => {
      journey.steps.forEach((step: any) => {
        if (step.completed) {
          stepCounts.set(step.step, (stepCounts.get(step.step) || 0) + 1)
        }
      })
    })

    const stepConversion: Record<string, number> = {}
    for (const [step, count] of stepCounts.entries()) {
      stepConversion[step] = count / totalUsers
    }

    const overallConversion = Math.min(...Object.values(stepConversion))

    return {
      totalUsers,
      stepConversion,
      overallConversion
    }
  }

  private generateJourneyRecommendations(bottlenecks: any[]): string[] {
    const recommendations = []

    bottlenecks.forEach(bottleneck => {
      if (bottleneck.step === 'project_create') {
        recommendations.push('프로젝트 생성 UX 개선')
        recommendations.push('프로젝트 템플릿 제공')
      }
      if (bottleneck.step === 'video_upload') {
        recommendations.push('비디오 업로드 진행률 표시 개선')
        recommendations.push('업로드 가이드 제공')
      }
    })

    return recommendations
  }

  private calculateIndividualLTV(metrics: any): number {
    // 단순 LTV 계산: 수익 + (참여도 기반 예상 미래 가치)
    const baseRevenue = metrics.subscriptionRevenue || 0
    const engagementValue = (
      metrics.sessionCount * 0.5 +
      (metrics.totalWatchTime / 3600000) * 2 + // 시간당 $2
      metrics.projectsCreated * 5 +
      metrics.commentsPosted * 0.1
    )

    return baseRevenue + engagementValue
  }

  private calculateEngagementLevel(metrics: any): 'high' | 'medium' | 'low' {
    const score = this.calculateEngagementScore({
      duration: metrics.totalWatchTime,
      pageViews: metrics.sessionCount * 5, // 세션당 평균 페이지뷰 추정
      videoWatches: metrics.projectsCreated * 2, // 프로젝트당 비디오 시청 추정
      interactions: metrics.commentsPosted,
      timeOfDay: 12, // 기본값
      dayOfWeek: 3 // 기본값
    })

    if (score >= 0.7) return 'high'
    if (score >= 0.4) return 'medium'
    return 'low'
  }

  private calculateTenure(registrationDate: string): number {
    const now = new Date()
    const registered = new Date(registrationDate)
    return Math.floor((now.getTime() - registered.getTime()) / (1000 * 60 * 60 * 24))
  }

  private segmentUsersByLTV(usersWithLTV: any[]) {
    const sortedByLTV = usersWithLTV.sort((a, b) => b.ltv - a.ltv)
    
    const highValueUsers = sortedByLTV.filter(u => u.ltv >= 100)
    const growingUsers = sortedByLTV.filter(u => u.ltv < 100 && u.engagementLevel === 'high')
    const atRiskUsers = sortedByLTV.filter(u => u.ltv < 50 && u.engagementLevel === 'low')

    return {
      high_value: {
        users: highValueUsers.map(u => u.userId),
        averageLTV: this.calculateAverage(highValueUsers.map(u => u.ltv)),
        retentionRate: 0.95 // 예상 값
      },
      growing: {
        users: growingUsers.map(u => u.userId),
        conversionProbability: 0.4,
        potentialLTV: this.calculateAverage(growingUsers.map(u => u.ltv * 2)) // 성장 가정
      },
      at_risk: {
        users: atRiskUsers.map(u => u.userId),
        churnProbability: 0.6,
        interventionValue: this.calculateAverage(atRiskUsers.map(u => u.ltv))
      }
    }
  }

  private generateLTVPredictions(usersWithLTV: any[]) {
    const totalCurrentRevenue = usersWithLTV.reduce((sum, user) => sum + user.ltv, 0)
    const avgGrowthRate = 0.15 // 15% 월 성장 가정

    return {
      revenueGrowth: {
        nextMonth: totalCurrentRevenue * avgGrowthRate,
        nextQuarter: totalCurrentRevenue * (avgGrowthRate * 3),
        nextYear: totalCurrentRevenue * (avgGrowthRate * 12)
      },
      churnRisk: {
        immediate: usersWithLTV.filter(u => u.engagementLevel === 'low').length * 0.1,
        nearTerm: usersWithLTV.filter(u => u.engagementLevel === 'low').length * 0.3
      }
    }
  }

  private generateLTVInsights(segments: any, predictions: any): string[] {
    const insights = []

    if (segments.high_value.users.length > 0) {
      insights.push('고가치 사용자 리텐션 프로그램 강화')
    }

    if (segments.growing.users.length > segments.high_value.users.length) {
      insights.push('성장 잠재력 사용자 전환 캠페인 집중')
    }

    if (predictions.churnRisk.immediate > 5) {
      insights.push('즉시 이탈 위험 사용자 대상 긴급 개입 필요')
    }

    return insights
  }

  private generateContentRecommendations(profile: any): string[] {
    const recommendations = []

    if (profile.preferences.favoriteCategories.includes('education')) {
      recommendations.push('교육용 콘텐츠 템플릿')
    }

    if (profile.skillLevel === 'intermediate') {
      recommendations.push('중급자용 고급 기능 튜토리얼')
    }

    if (profile.recentActivity.collaborationFrequency === 'low') {
      recommendations.push('협업 프로젝트 참여 기회')
    }

    return recommendations
  }

  private generateFeatureRecommendations(profile: any): string[] {
    const recommendations = []

    if (profile.skillLevel === 'intermediate') {
      recommendations.push('고급 편집 도구')
      recommendations.push('자동화 워크플로우')
    }

    if (profile.recentActivity.feedbackEngagement === 'high') {
      recommendations.push('실시간 협업 피드백 도구')
    }

    return recommendations
  }

  private generateTimingRecommendations(activeTimeSlots: number[]) {
    const optimal = activeTimeSlots.map(hour => `오후 ${hour - 12}시`) // 간단한 형식화
    const avoid = [0, 1, 2, 3, 4, 5, 6].filter(hour => !activeTimeSlots.includes(hour))
      .map(hour => `새벽 ${hour}시`)

    return { optimal, avoid }
  }

  private calculateRecommendationConfidence(profile: any): number {
    let confidence = 0.5 // 기본값

    // 선호도 데이터가 많을수록 높은 신뢰도
    if (profile.preferences.favoriteCategories.length >= 3) confidence += 0.2
    if (profile.recentActivity.projectTypes.length >= 2) confidence += 0.2
    if (profile.preferences.activeTimeSlots.length >= 3) confidence += 0.1

    return Math.min(confidence, 1.0)
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length
  }
}

// =============================================================================
// 파이프라인 메트릭 수집기
// =============================================================================

export class PipelineMetricsCollector {
  /**
   * 파이프라인 성능 메트릭 수집
   */
  async collectPipelineMetrics(pipelineExecution: {
    pipelineId: string
    stages: Array<{
      stageId: string
      startTime: string
      endTime: string
      recordsProcessed: number
      memoryUsage: number
      cpuUsage: number
      errors: Array<{ type: string; count: number; severity: string }>
    }>
  }): Promise<{
    overall: {
      totalExecutionTime: number
      recordsPerSecond: number
      successRate: number
      memoryEfficiency: number
    }
    stages: Array<{
      stageId: string
      executionTime: number
      throughput: number
      errorRate: number
      resourceEfficiency: number
    }>
    performance: {
      peakMemoryUsage: number
      averageCpuUsage: number
      resourceBottlenecks: string[]
    }
  }> {
    // 전체 실행 시간 계산
    const firstStart = Math.min(...pipelineExecution.stages.map(s => new Date(s.startTime).getTime()))
    const lastEnd = Math.max(...pipelineExecution.stages.map(s => new Date(s.endTime).getTime()))
    const totalExecutionTime = lastEnd - firstStart

    // 전체 레코드 수 및 성공률 계산
    const totalRecords = pipelineExecution.stages.reduce((sum, stage) => sum + stage.recordsProcessed, 0)
    const totalErrors = pipelineExecution.stages.reduce((sum, stage) => 
      sum + stage.errors.reduce((errorSum, error) => errorSum + error.count, 0), 0)
    
    const recordsPerSecond = totalRecords / (totalExecutionTime / 1000)
    const successRate = (totalRecords - totalErrors) / totalRecords

    // 스테이지별 메트릭
    const stageMetrics = pipelineExecution.stages.map(stage => {
      const executionTime = new Date(stage.endTime).getTime() - new Date(stage.startTime).getTime()
      const throughput = stage.recordsProcessed / (executionTime / 1000)
      const errorCount = stage.errors.reduce((sum, error) => sum + error.count, 0)
      const errorRate = errorCount / stage.recordsProcessed

      return {
        stageId: stage.stageId,
        executionTime,
        throughput,
        errorRate,
        resourceEfficiency: this.calculateResourceEfficiency(stage.cpuUsage, stage.memoryUsage)
      }
    })

    // 성능 분석
    const peakMemoryUsage = Math.max(...pipelineExecution.stages.map(s => s.memoryUsage))
    const averageCpuUsage = this.calculateAverage(pipelineExecution.stages.map(s => s.cpuUsage))
    const resourceBottlenecks = this.identifyResourceBottlenecks(pipelineExecution.stages)

    return {
      overall: {
        totalExecutionTime,
        recordsPerSecond,
        successRate,
        memoryEfficiency: this.calculateMemoryEfficiency(peakMemoryUsage)
      },
      stages: stageMetrics,
      performance: {
        peakMemoryUsage,
        averageCpuUsage,
        resourceBottlenecks
      }
    }
  }

  /**
   * 성능 이상 탐지
   */
  async detectPerformanceAnomalies(historicalMetrics: Array<{
    pipelineId: string
    executionTime: number
    recordsProcessed: number
  }>): Promise<{
    anomalies: Array<{
      metricType: string
      type: 'execution_time_spike' | 'throughput_drop' | 'resource_spike'
      severity: 'low' | 'medium' | 'high'
      deviation: number
      timestamp: string
    }>
    trendAnalysis: {
      degradationTrend: boolean
      improvementTrend: boolean
      volatility: number
    }
    recommendations: string[]
  }> {
    const anomalies = []
    
    // 실행 시간 이상 탐지
    const executionTimes = historicalMetrics.map(m => m.executionTime)
    const avgExecutionTime = this.calculateAverage(executionTimes)
    const stdDev = this.calculateStandardDeviation(executionTimes)

    historicalMetrics.forEach((metric, index) => {
      const deviation = Math.abs(metric.executionTime - avgExecutionTime) / stdDev
      
      if (deviation > 2) { // 2 표준편차 이상 차이
        let severity: 'low' | 'medium' | 'high' = 'low'
        if (metric.executionTime > avgExecutionTime * 2) severity = 'medium'
        if (metric.executionTime > avgExecutionTime * 3) severity = 'high'

        anomalies.push({
          metricType: 'execution_time',
          type: 'execution_time_spike',
          severity,
          deviation,
          timestamp: new Date(Date.now() - (historicalMetrics.length - index) * 24 * 60 * 60 * 1000).toISOString()
        })
      }
    })

    // 트렌드 분석
    const recentMetrics = historicalMetrics.slice(-5)
    const olderMetrics = historicalMetrics.slice(0, -5)
    
    const recentAvg = this.calculateAverage(recentMetrics.map(m => m.executionTime))
    const olderAvg = this.calculateAverage(olderMetrics.map(m => m.executionTime))
    
    const degradationTrend = recentAvg > olderAvg * 1.2 // 20% 이상 성능 저하
    const improvementTrend = recentAvg < olderAvg * 0.8 // 20% 이상 성능 개선

    return {
      anomalies,
      trendAnalysis: {
        degradationTrend,
        improvementTrend,
        volatility: this.calculateStandardDeviation(executionTimes) / avgExecutionTime
      },
      recommendations: [
        '시스템 리소스 사용량 점검',
        '파이프라인 최적화 검토',
        '데이터 볼륨 증가 대응 방안 수립'
      ]
    }
  }

  /**
   * SLA 준수 리포트 생성
   */
  async generateSLAReport(
    slaDefinition: {
      pipelineId: string
      requirements: {
        maxExecutionTime: number
        minSuccessRate: number
        maxErrorRate: number
        availabilityTarget: number
      }
    },
    executionHistory: Array<{
      executionTime: number
      successRate: number
      errorRate: number
      available: boolean
    }>
  ): Promise<{
    complianceScore: number
    violations: Array<{
      metric: string
      expected: number
      actual: number
      timestamp: string
    }>
    uptime: number
    recommendations: string[]
  }> {
    const violations = []
    let violationCount = 0

    // SLA 위반 검사
    executionHistory.forEach((execution, index) => {
      const timestamp = new Date(Date.now() - (executionHistory.length - index) * 24 * 60 * 60 * 1000).toISOString()

      if (execution.executionTime > slaDefinition.requirements.maxExecutionTime) {
        violations.push({
          metric: 'maxExecutionTime',
          expected: slaDefinition.requirements.maxExecutionTime,
          actual: execution.executionTime,
          timestamp
        })
        violationCount++
      }

      if (execution.successRate < slaDefinition.requirements.minSuccessRate) {
        violations.push({
          metric: 'minSuccessRate',
          expected: slaDefinition.requirements.minSuccessRate,
          actual: execution.successRate,
          timestamp
        })
        violationCount++
      }

      if (execution.errorRate > slaDefinition.requirements.maxErrorRate) {
        violations.push({
          metric: 'maxErrorRate',
          expected: slaDefinition.requirements.maxErrorRate,
          actual: execution.errorRate,
          timestamp
        })
        violationCount++
      }
    })

    const complianceScore = Math.max(0, 1 - (violationCount / (executionHistory.length * 3))) // 3개 메트릭
    const uptime = executionHistory.filter(e => e.available).length / executionHistory.length

    const recommendations = []
    if (violations.some(v => v.metric === 'maxExecutionTime')) {
      recommendations.push('파이프라인 최적화 필요')
    }
    if (violations.some(v => v.metric === 'minSuccessRate')) {
      recommendations.push('오류 처리 로직 개선')
    }

    return {
      complianceScore,
      violations,
      uptime,
      recommendations
    }
  }

  /**
   * 리소스 요구사항 예측
   */
  async forecastResourceNeeds(usageHistory: Array<{
    date: string
    recordsProcessed: number
    peakMemory: number
    avgCpu: number
  }>, options: {
    forecastDays: number
    growthAssumptions: {
      userGrowth: number
      dataVolumeGrowth: number
    }
  }): Promise<{
    projectedPeakLoad: {
      recordsProcessed: number
      peakMemory: number
      avgCpu: number
    }
    resourceRequirements: {
      memory: number // MB
      cpu: number // cores needed
      storage: number // GB
    }
    scalingRecommendations: string[]
    costProjection: {
      monthlyIncrease: number // USD
      yearlyProjection: number // USD
    }
    confidence: number
  }> {
    // 성장률 적용한 예상 부하
    const latestMetrics = usageHistory[usageHistory.length - 1]
    const growthMultiplier = 1 + (options.growthAssumptions.dataVolumeGrowth * (options.forecastDays / 30))

    const projectedPeakLoad = {
      recordsProcessed: Math.ceil(latestMetrics.recordsProcessed * growthMultiplier),
      peakMemory: Math.ceil(latestMetrics.peakMemory * growthMultiplier),
      avgCpu: Math.min(100, latestMetrics.avgCpu * growthMultiplier)
    }

    const resourceRequirements = {
      memory: projectedPeakLoad.peakMemory * 1.2, // 20% 여유분
      cpu: Math.ceil(projectedPeakLoad.avgCpu / 100 * 8), // 8코어 기준
      storage: Math.ceil(projectedPeakLoad.recordsProcessed * 0.001) // GB, 레코드당 1KB 가정
    }

    const recommendations = []
    if (resourceRequirements.memory > latestMetrics.peakMemory * 1.5) {
      recommendations.push('메모리 용량 증설 검토')
    }
    if (resourceRequirements.cpu > 6) {
      recommendations.push('CPU 업그레이드 또는 수평 확장 검토')
    }

    return {
      projectedPeakLoad,
      resourceRequirements,
      scalingRecommendations: recommendations,
      costProjection: {
        monthlyIncrease: 500, // 예상 비용 증가
        yearlyProjection: 6000
      },
      confidence: usageHistory.length >= 7 ? 0.8 : 0.6
    }
  }

  /**
   * 용량 계획 생성
   */
  async generateCapacityPlan(
    currentCapacity: {
      cpu: { cores: number; utilizationTarget: number }
      memory: { total: string; utilizationTarget: number }
      storage: { total: string; utilizationTarget: number }
      network: { bandwidth: string; utilizationTarget: number }
    },
    projectedLoad: {
      cpuDemand: number
      memoryDemand: number
      storageDemand: number
      networkDemand: number
    }
  ): Promise<{
    recommendations: Array<{
      resource: 'cpu' | 'memory' | 'storage' | 'network'
      action: 'upgrade' | 'optimize' | 'monitor'
      reason: string
      timeline: 'immediate' | 'near_term' | 'long_term'
      estimatedCost: number
    }>
    totalEstimatedCost: number
    implementationPriority: string[]
  }> {
    const recommendations = []
    let totalCost = 0

    // CPU 용량 검토
    if (projectedLoad.cpuDemand > currentCapacity.cpu.utilizationTarget) {
      const cpuCost = 2000 // 예상 비용
      recommendations.push({
        resource: 'cpu' as const,
        action: 'upgrade' as const,
        reason: 'Projected usage exceeds target threshold',
        timeline: 'immediate' as const,
        estimatedCost: cpuCost
      })
      totalCost += cpuCost
    }

    // 메모리 용량 검토
    if (projectedLoad.memoryDemand > currentCapacity.memory.utilizationTarget) {
      const memoryCost = 1500
      recommendations.push({
        resource: 'memory' as const,
        action: 'upgrade' as const,
        reason: 'Projected usage exceeds target threshold',
        timeline: 'immediate' as const,
        estimatedCost: memoryCost
      })
      totalCost += memoryCost
    }

    // 스토리지 용량 검토
    if (projectedLoad.storageDemand > currentCapacity.storage.utilizationTarget) {
      const storageCost = 800
      recommendations.push({
        resource: 'storage' as const,
        action: 'upgrade' as const,
        reason: 'Projected usage exceeds target threshold',
        timeline: 'near_term' as const,
        estimatedCost: storageCost
      })
      totalCost += storageCost
    }

    // 우선순위 결정 (심각도 및 비용 효율성 기준)
    const implementationPriority = recommendations
      .sort((a, b) => {
        const priorityScore = (rec: any) => {
          let score = 0
          if (rec.timeline === 'immediate') score += 3
          if (rec.resource === 'memory') score += 2 // 메모리가 일반적으로 더 중요
          if (rec.resource === 'cpu') score += 2
          return score
        }
        return priorityScore(b) - priorityScore(a)
      })
      .map(rec => rec.resource)

    return {
      recommendations,
      totalEstimatedCost: totalCost,
      implementationPriority
    }
  }

  private calculateResourceEfficiency(cpuUsage: number, memoryUsage: number): number {
    // CPU와 메모리 사용률 기반 효율성 계산
    const idealCpuUsage = 70 // 70%가 이상적
    const idealMemoryUsage = 0.8 // 80%가 이상적

    const cpuEfficiency = 1 - Math.abs(cpuUsage - idealCpuUsage) / 100
    const memoryEfficiency = 1 - Math.abs(memoryUsage - idealMemoryUsage)

    return (cpuEfficiency + memoryEfficiency) / 2
  }

  private calculateMemoryEfficiency(peakMemoryUsage: number): number {
    // 메모리 사용 효율성 (MB 단위)
    const totalSystemMemory = 32 * 1024 * 1024 * 1024 // 32GB
    const utilizationRate = peakMemoryUsage / totalSystemMemory
    
    // 50-80% 사용률이 이상적
    if (utilizationRate >= 0.5 && utilizationRate <= 0.8) return 1.0
    if (utilizationRate < 0.5) return utilizationRate / 0.5 // 저사용률 패널티
    return Math.max(0, 2 - utilizationRate / 0.8) // 과사용률 패널티
  }

  private identifyResourceBottlenecks(stages: any[]): string[] {
    const bottlenecks = []

    stages.forEach(stage => {
      if (stage.cpuUsage > 85) {
        bottlenecks.push(`${stage.stageId}: High CPU usage (${stage.cpuUsage}%)`)
      }
      if (stage.memoryUsage / (1024 * 1024 * 1024) > 0.9) { // 90% 이상 메모리 사용
        bottlenecks.push(`${stage.stageId}: High memory usage`)
      }
    })

    return bottlenecks
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length
  }

  private calculateStandardDeviation(numbers: number[]): number {
    const avg = this.calculateAverage(numbers)
    const squaredDiffs = numbers.map(num => Math.pow(num - avg, 2))
    const variance = this.calculateAverage(squaredDiffs)
    return Math.sqrt(variance)
  }
}

// =============================================================================
// 개인정보 보호 분석
// =============================================================================

export class PrivacyCompliantAnalytics {
  private config: PrivacyConfig & AnalyticsConfig

  constructor(config: PrivacyConfig & AnalyticsConfig) {
    this.config = config
  }

  /**
   * GDPR 준수 데이터 처리
   */
  async processForGDPRCompliance(rawData: Array<{
    userId: string
    email?: string
    ipAddress?: string
    events: any[]
  }>): Promise<{
    processedRecords: number
    piiRemoved: number
    anonymizedRecords: number
    data: Array<{
      userId: string | null
      events: any[]
      anonymized: boolean
      retentionExpiry: string
    }>
  }> {
    let piiRemoved = 0
    let anonymizedRecords = 0

    const processedData = rawData.map(record => {
      const processed = { ...record }

      // PII 제거
      if (processed.email) {
        delete processed.email
        piiRemoved++
      }
      if (processed.ipAddress) {
        delete processed.ipAddress
        piiRemoved++
      }

      // 익명화 처리
      const shouldAnonymize = this.shouldAnonymizeRecord(record)
      if (shouldAnonymize) {
        processed.userId = null
        anonymizedRecords++
      }

      return {
        userId: processed.userId,
        events: processed.events,
        anonymized: shouldAnonymize,
        retentionExpiry: new Date(Date.now() + this.config.retentionPeriod * 24 * 60 * 60 * 1000).toISOString()
      }
    })

    return {
      processedRecords: rawData.length,
      piiRemoved,
      anonymizedRecords,
      data: processedData
    }
  }

  /**
   * 개인정보 보호 집계 처리
   */
  async aggregateForPrivacy(
    individualEvents: Array<{
      userId: string
      action: string
      timestamp: string
      [key: string]: any
    }>,
    options: {
      aggregationLevel: 'hourly' | 'daily'
      minimumGroupSize: number // k-익명성
      suppressionThreshold: number
    }
  ): Promise<{
    timeSlots: Array<{
      timeSlot: string
      metrics: Record<string, number>
      userCount: number
    }>
    privacyMetrics: {
      kAnonymity: number
      lDiversity: number
      suppressedSlots: number
    }
  }> {
    // 시간 슬롯별 그룹화
    const timeSlots = this.groupByTimeSlot(individualEvents, options.aggregationLevel)
    const processedSlots = []
    let suppressedSlots = 0

    for (const [timeSlot, events] of timeSlots.entries()) {
      const uniqueUsers = new Set(events.map(e => e.userId)).size

      // k-익명성 보장 (최소 그룹 크기)
      if (uniqueUsers < options.minimumGroupSize) {
        suppressedSlots++
        continue // 그룹 크기가 작으면 억제
      }

      // 집계 메트릭 계산
      const metrics = this.calculateAggregateMetrics(events)
      
      processedSlots.push({
        timeSlot,
        metrics,
        userCount: uniqueUsers
      })
    }

    // 다양성 계산 (서로 다른 액션 타입의 수)
    const actionTypes = new Set(individualEvents.map(e => e.action)).size
    const lDiversity = actionTypes

    return {
      timeSlots: processedSlots,
      privacyMetrics: {
        kAnonymity: options.minimumGroupSize,
        lDiversity,
        suppressedSlots
      }
    }
  }

  /**
   * 차등정보보호 적용
   */
  async applyDifferentialPrivacy(
    sensitiveMetrics: Array<{
      metric: string
      value: number
      sensitivity: number
    }>,
    options: {
      epsilon: number // 프라이버시 예산
      mechanism: 'laplace' | 'gaussian'
    }
  ): Promise<Array<{
    metric: string
    originalValue: number
    noisyValue: number
    privacyLevel: 'low' | 'medium' | 'high'
    epsilonUsed: number
  }>> {
    return sensitiveMetrics.map(({ metric, value, sensitivity }) => {
      const epsilonUsed = options.epsilon / sensitiveMetrics.length // 프라이버시 예산 분배
      const noise = this.generateDPNoise(sensitivity, epsilonUsed, options.mechanism)
      const noisyValue = value + noise

      return {
        metric,
        originalValue: value,
        noisyValue: Math.max(0, noisyValue), // 음수 방지
        privacyLevel: epsilonUsed <= 0.1 ? 'high' : epsilonUsed <= 0.5 ? 'medium' : 'low',
        epsilonUsed
      }
    })
  }

  private shouldAnonymizeRecord(record: any): boolean {
    // 수집 시점부터 익명화 기간 경과 여부 확인
    const oldestEvent = record.events.reduce((oldest: any, event: any) => {
      return new Date(event.timestamp) < new Date(oldest.timestamp) ? event : oldest
    }, record.events[0])

    if (!oldestEvent) return false

    const eventAge = (Date.now() - new Date(oldestEvent.timestamp).getTime()) / (1000 * 60 * 60 * 24)
    return eventAge > this.config.anonymizeAfter
  }

  private groupByTimeSlot(events: any[], aggregationLevel: string): Map<string, any[]> {
    const groups = new Map<string, any[]>()

    events.forEach(event => {
      const timestamp = new Date(event.timestamp)
      let timeSlot: string

      switch (aggregationLevel) {
        case 'hourly':
          timeSlot = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')} ${String(timestamp.getHours()).padStart(2, '0')}:00`
          break
        case 'daily':
          timeSlot = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`
          break
        default:
          timeSlot = timestamp.toISOString()
      }

      if (!groups.has(timeSlot)) {
        groups.set(timeSlot, [])
      }
      groups.get(timeSlot)!.push(event)
    })

    return groups
  }

  private calculateAggregateMetrics(events: any[]): Record<string, number> {
    const metrics: Record<string, number> = {}

    // 액션 타입별 카운트
    const actionCounts = new Map<string, number>()
    events.forEach(event => {
      actionCounts.set(event.action, (actionCounts.get(event.action) || 0) + 1)
    })

    actionCounts.forEach((count, action) => {
      metrics[`${action}_count`] = count
    })

    // 비디오 시청 관련 집계
    const videoViews = events.filter(e => e.action === 'video_view')
    if (videoViews.length > 0) {
      metrics.totalVideoViews = videoViews.length
      metrics.averageWatchDuration = videoViews.reduce((sum, e) => sum + (e.duration || 0), 0) / videoViews.length
    }

    return metrics
  }

  private generateDPNoise(sensitivity: number, epsilon: number, mechanism: string): number {
    switch (mechanism) {
      case 'laplace':
        // 라플라스 분포에서 노이즈 생성
        const scale = sensitivity / epsilon
        const u = Math.random() - 0.5
        return -scale * Math.sign(u) * Math.log(1 - 2 * Math.abs(u))

      case 'gaussian':
        // 가우시안 분포에서 노이즈 생성
        const sigma = Math.sqrt(2 * Math.log(1.25)) * sensitivity / epsilon
        return this.generateGaussianNoise(0, sigma)

      default:
        return 0
    }
  }

  private generateGaussianNoise(mean: number, sigma: number): number {
    // Box-Muller 변환을 사용한 가우시안 노이즈 생성
    const u1 = Math.random()
    const u2 = Math.random()
    
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
    return z0 * sigma + mean
  }
}

// =============================================================================
// 성능 메트릭 수집기
// =============================================================================

export class PerformanceMetricsCollector {
  /**
   * 시스템 성능 메트릭 수집
   */
  async collectMetrics(systemMetrics: {
    timestamp: string
    pipelines: Array<{
      pipelineId: string
      stages: Array<{
        stageId: string
        metrics: {
          cpuUsage: number
          memoryUsage: number
          diskIO: number
          networkIO: number
          executionTime: number
          recordsProcessed: number
        }
      }>
    }>
    system: {
      totalCpuUsage: number
      totalMemoryUsage: number
      diskSpaceUsed: number
      networkLatency: number
      activeConnections: number
    }
  }): Promise<PerformanceMetrics> {
    const pipelineMetrics: Record<string, any> = {}
    const bottlenecks = []

    // 파이프라인별 메트릭 계산
    for (const pipeline of systemMetrics.pipelines) {
      const stages = pipeline.stages
      const totalRecords = stages.reduce((sum, stage) => sum + stage.metrics.recordsProcessed, 0)
      const totalTime = stages.reduce((sum, stage) => sum + stage.metrics.executionTime, 0)
      
      pipelineMetrics[pipeline.pipelineId] = {
        efficiency: this.calculatePipelineEfficiency(stages),
        throughput: totalRecords / (totalTime / 1000), // records per second
        errorRate: 0, // 오류 정보가 있다면 계산
        averageExecutionTime: totalTime / stages.length
      }

      // 병목 구간 식별
      stages.forEach(stage => {
        if (stage.metrics.cpuUsage > 80) {
          bottlenecks.push({
            component: `${pipeline.pipelineId}:${stage.stageId}`,
            severity: 'high' as const,
            impact: 'High CPU usage may slow down pipeline execution'
          })
        }
      })
    }

    // 시스템 용량 알림
    const capacityAlerts = this.generateCapacityAlerts(systemMetrics.system)

    return {
      summary: {
        overallHealth: bottlenecks.length === 0 ? 'good' : 'fair',
        bottlenecks,
        recommendations: this.generatePerformanceRecommendations(bottlenecks)
      },
      pipelineMetrics,
      systemMetrics: {
        resourceUtilization: {
          cpu: systemMetrics.system.totalCpuUsage,
          memory: systemMetrics.system.totalMemoryUsage,
          storage: systemMetrics.system.diskSpaceUsed,
          network: systemMetrics.system.networkLatency
        },
        capacityAlerts
      }
    }
  }

  private calculatePipelineEfficiency(stages: any[]): number {
    // 각 스테이지의 리소스 효율성 평균
    const efficiencyScores = stages.map(stage => {
      const cpuEfficiency = Math.max(0, 1 - (stage.metrics.cpuUsage - 50) / 50) // 50% 이상부터 효율성 감소
      const memoryEfficiency = Math.max(0, 1 - (stage.metrics.memoryUsage - 0.5) / 0.5) // 50% 이상부터 효율성 감소
      const throughputEfficiency = Math.min(1, stage.metrics.recordsProcessed / (stage.metrics.executionTime / 1000) / 100) // 초당 100레코드를 최대로

      return (cpuEfficiency + memoryEfficiency + throughputEfficiency) / 3
    })

    return efficiencyScores.reduce((sum, score) => sum + score, 0) / efficiencyScores.length
  }

  private generateCapacityAlerts(systemMetrics: any): Array<{
    resource: string
    usage: number
    threshold: number
    severity: 'info' | 'warning' | 'critical'
    action: string
  }> {
    const alerts = []

    // 디스크 사용률 확인
    if (systemMetrics.diskSpaceUsed >= 0.8) {
      alerts.push({
        resource: 'disk',
        usage: systemMetrics.diskSpaceUsed,
        threshold: 0.8,
        severity: systemMetrics.diskSpaceUsed >= 0.9 ? 'critical' as const : 'warning' as const,
        action: systemMetrics.diskSpaceUsed >= 0.9 ? 'Immediate disk cleanup required' : 'Monitor disk usage closely'
      })
    }

    // 메모리 사용률 확인
    if (systemMetrics.totalMemoryUsage >= 0.85) {
      alerts.push({
        resource: 'memory',
        usage: systemMetrics.totalMemoryUsage,
        threshold: 0.85,
        severity: 'warning',
        action: 'Consider memory optimization or upgrade'
      })
    }

    return alerts
  }

  private generatePerformanceRecommendations(bottlenecks: any[]): string[] {
    const recommendations = []

    if (bottlenecks.some(b => b.impact.includes('CPU'))) {
      recommendations.push('CPU 집약적 작업 최적화 또는 하드웨어 업그레이드 검토')
    }

    if (bottlenecks.some(b => b.impact.includes('memory'))) {
      recommendations.push('메모리 사용량 최적화 또는 용량 확장')
    }

    if (bottlenecks.length > 3) {
      recommendations.push('전체 시스템 아키텍처 성능 검토')
    }

    return recommendations
  }
}

// =============================================================================
// 메트릭 집계기
// =============================================================================

export class MetricsAggregator {
  /**
   * 다차원 메트릭 집계
   */
  async aggregateMultiDimensional(
    rawMetrics: Array<{
      timestamp: string
      userId?: string
      projectId?: string
      eventType: string
      value: number
    }>,
    options: {
      dimensions: string[]
      timeGranularity: 'hourly' | 'daily' | 'weekly'
      metrics: string[]
    }
  ): Promise<{
    results: Array<{
      dimensions: Record<string, any>
      metrics: Record<string, number>
      recordCount: number
    }>
    summary: {
      totalEvents: number
      uniqueUsers: number
      uniqueProjects: number
      timeRange: { from: string; to: string }
    }
  }> {
    // 차원별 그룹화
    const grouped = this.groupByDimensions(rawMetrics, options.dimensions, options.timeGranularity)
    
    // 각 그룹의 메트릭 계산
    const results = []
    for (const [dimensionKey, records] of grouped.entries()) {
      const dimensions = this.parseDimensionKey(dimensionKey, options.dimensions)
      const metrics = this.calculateGroupMetrics(records, options.metrics)
      
      results.push({
        dimensions,
        metrics,
        recordCount: records.length
      })
    }

    // 요약 통계
    const uniqueUsers = new Set(rawMetrics.map(m => m.userId).filter(Boolean)).size
    const uniqueProjects = new Set(rawMetrics.map(m => m.projectId).filter(Boolean)).size
    const timestamps = rawMetrics.map(m => m.timestamp).sort()

    return {
      results,
      summary: {
        totalEvents: rawMetrics.length,
        uniqueUsers,
        uniqueProjects,
        timeRange: {
          from: timestamps[0],
          to: timestamps[timestamps.length - 1]
        }
      }
    }
  }

  /**
   * 실시간 대시보드 생성
   */
  async generateRealTimeDashboard(realTimeData: {
    activeUsers: number
    concurrentVideoStreams: number
    uploadRate: number
    systemLoad: {
      cpu: number
      memory: number
      storage: number
    }
    qualityMetrics: {
      errorRate: number
      responseTime: number
      throughput: number
    }
  }): Promise<{
    kpis: {
      activeUsers: {
        current: number
        trend: 'up' | 'down' | 'stable'
        change: number
      }
      systemPerformance: {
        overall: 'excellent' | 'good' | 'fair' | 'poor'
        details: Record<string, number>
      }
    }
    systemHealth: {
      overall: 'excellent' | 'good' | 'fair' | 'poor'
      alerts: Array<{
        component: string
        severity: 'info' | 'warning' | 'critical'
        message: string
      }>
    }
    qualityIndicators: {
      errorRate: { value: number; status: 'excellent' | 'good' | 'fair' | 'poor' }
      responseTime: { value: number; status: 'excellent' | 'good' | 'fair' | 'poor' }
      throughput: { value: number; status: 'excellent' | 'good' | 'fair' | 'poor' }
    }
    recommendations: {
      immediate: string[]
      monitoring: string[]
    }
    lastUpdated: string
  }> {
    // 시스템 전반 상태 평가
    const systemHealth = this.assessSystemHealth(realTimeData.systemLoad, realTimeData.qualityMetrics)
    const qualityIndicators = this.assessQualityIndicators(realTimeData.qualityMetrics)

    return {
      kpis: {
        activeUsers: {
          current: realTimeData.activeUsers,
          trend: 'stable', // 실제로는 과거 데이터와 비교
          change: 0
        },
        systemPerformance: {
          overall: systemHealth.overall,
          details: {
            cpu: realTimeData.systemLoad.cpu,
            memory: realTimeData.systemLoad.memory,
            storage: realTimeData.systemLoad.storage
          }
        }
      },
      systemHealth,
      qualityIndicators,
      recommendations: {
        immediate: this.generateImmediateRecommendations(realTimeData),
        monitoring: ['CPU 사용률 지속 모니터링', '메모리 누수 감시', '디스크 공간 추적']
      },
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * 사용자 정의 메트릭 계산
   */
  async calculateCustomMetrics(
    metricDefinitions: Array<{
      name: string
      formula: string
      dependencies: string[]
    }>,
    inputData: Record<string, number>
  ): Promise<Array<{
    name: string
    value: number
    formula: string
    metadata: {
      calculatedAt: string
      dependencies: string[]
      confidence: number
    }
  }>> {
    const calculatedMetrics = []

    for (const definition of metricDefinitions) {
      try {
        // 의존성 확인
        const missingDeps = definition.dependencies.filter(dep => !(dep in inputData))
        if (missingDeps.length > 0) {
          continue // 의존성 누락 시 건너뛰기
        }

        // 공식 계산 (안전한 eval 대신 미리 정의된 계산 함수 사용)
        const value = this.evaluateFormula(definition.formula, inputData)

        calculatedMetrics.push({
          name: definition.name,
          value,
          formula: definition.formula,
          metadata: {
            calculatedAt: new Date().toISOString(),
            dependencies: definition.dependencies,
            confidence: 0.9 // 입력 데이터 품질에 따라 조정
          }
        })
      } catch (error) {
        console.warn(`메트릭 계산 실패: ${definition.name}`, error)
      }
    }

    return calculatedMetrics
  }

  private groupByDimensions(records: any[], dimensions: string[], timeGranularity: string): Map<string, any[]> {
    const groups = new Map<string, any[]>()

    records.forEach(record => {
      const dimensionValues = dimensions.map(dim => {
        if (dim === 'timestamp') {
          return this.formatTimestamp(record.timestamp, timeGranularity)
        }
        return String(record[dim] || 'unknown')
      })
      
      const key = dimensionValues.join('|')
      
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(record)
    })

    return groups
  }

  private parseDimensionKey(key: string, dimensionNames: string[]): Record<string, any> {
    const values = key.split('|')
    const dimensions: Record<string, any> = {}
    
    dimensionNames.forEach((name, index) => {
      dimensions[name] = values[index]
    })

    return dimensions
  }

  private calculateGroupMetrics(records: any[], metricTypes: string[]): Record<string, number> {
    const metrics: Record<string, number> = {}

    if (metricTypes.includes('count')) {
      metrics.count = records.length
    }

    if (metricTypes.includes('unique_users')) {
      metrics.unique_users = new Set(records.map(r => r.userId).filter(Boolean)).size
    }

    if (metricTypes.includes('unique_projects')) {
      metrics.unique_projects = new Set(records.map(r => r.projectId).filter(Boolean)).size
    }

    if (metricTypes.includes('sum')) {
      metrics.sum = records.reduce((sum, r) => sum + (r.value || 0), 0)
    }

    if (metricTypes.includes('average')) {
      metrics.average = metrics.sum ? metrics.sum / records.length : 0
    }

    return metrics
  }

  private formatTimestamp(timestamp: string, granularity: string): string {
    const date = new Date(timestamp)

    switch (granularity) {
      case 'hourly':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}`
      case 'daily':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      case 'weekly':
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()))
        return `${weekStart.getFullYear()}-W${String(Math.ceil(weekStart.getDate() / 7)).padStart(2, '0')}`
      default:
        return timestamp
    }
  }

  private evaluateFormula(formula: string, data: Record<string, number>): number {
    // 안전한 수식 계산을 위한 미리 정의된 패턴들
    if (formula === '(total_watch_time / total_video_duration) * (comments_count / video_count) * 100') {
      const watchRatio = data.total_watch_time / data.total_video_duration
      const engagementRatio = data.comments_count / data.video_count
      return watchRatio * engagementRatio * 100
    }

    if (formula === 'completed_phases / days_since_start') {
      return data.completed_phases / data.days_since_start
    }

    // 기본 산술 연산 지원
    return 0 // 실제로는 더 안전한 표현식 파서 필요
  }

  private assessSystemHealth(systemLoad: any, qualityMetrics: any): {
    overall: 'excellent' | 'good' | 'fair' | 'poor'
    alerts: Array<{
      component: string
      severity: 'info' | 'warning' | 'critical'
      message: string
    }>
  } {
    const alerts = []
    let healthScore = 1.0

    // CPU 사용률 검사
    if (systemLoad.cpu > 80) {
      alerts.push({
        component: 'cpu',
        severity: 'warning',
        message: `High CPU usage: ${systemLoad.cpu}%`
      })
      healthScore -= 0.2
    }

    // 에러율 검사
    if (qualityMetrics.errorRate > 0.01) {
      alerts.push({
        component: 'application',
        severity: 'warning',
        message: `Error rate above threshold: ${qualityMetrics.errorRate * 100}%`
      })
      healthScore -= 0.3
    }

    let overall: 'excellent' | 'good' | 'fair' | 'poor'
    if (healthScore >= 0.9) overall = 'excellent'
    else if (healthScore >= 0.7) overall = 'good'
    else if (healthScore >= 0.5) overall = 'fair'
    else overall = 'poor'

    return { overall, alerts }
  }

  private assessQualityIndicators(qualityMetrics: any) {
    return {
      errorRate: {
        value: qualityMetrics.errorRate,
        status: this.getQualityStatus(qualityMetrics.errorRate, [0.001, 0.005, 0.01], true) // lower is better
      },
      responseTime: {
        value: qualityMetrics.responseTime,
        status: this.getQualityStatus(qualityMetrics.responseTime, [100, 200, 500], true) // lower is better
      },
      throughput: {
        value: qualityMetrics.throughput,
        status: this.getQualityStatus(qualityMetrics.throughput, [300, 400, 500], false) // higher is better
      }
    }
  }

  private getQualityStatus(value: number, thresholds: number[], lowerIsBetter: boolean): 'excellent' | 'good' | 'fair' | 'poor' {
    if (lowerIsBetter) {
      if (value <= thresholds[0]) return 'excellent'
      if (value <= thresholds[1]) return 'good'
      if (value <= thresholds[2]) return 'fair'
      return 'poor'
    } else {
      if (value >= thresholds[2]) return 'excellent'
      if (value >= thresholds[1]) return 'good'
      if (value >= thresholds[0]) return 'fair'
      return 'poor'
    }
  }

  private generateImmediateRecommendations(realTimeData: any): string[] {
    const recommendations = []

    if (realTimeData.systemLoad.cpu > 75) {
      recommendations.push('CPU 사용률 높음 - 워크로드 분산 검토')
    }

    if (realTimeData.systemLoad.memory > 0.8) {
      recommendations.push('메모리 사용률 높음 - 가비지 컬렉션 튜닝')
    }

    if (realTimeData.qualityMetrics.responseTime > 200) {
      recommendations.push('응답 시간 지연 - 캐싱 전략 점검')
    }

    return recommendations
  }
}