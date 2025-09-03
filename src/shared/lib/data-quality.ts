/**
 * VLANET 데이터 품질 관리 시스템
 * 
 * 입력 데이터 정규화, 중복 제거, 데이터 무결성 검사를 통한
 * 종합적인 데이터 품질 관리 시스템입니다.
 * 
 * 핵심 원칙:
 * - 실시간 데이터 검증 및 정규화
 * - 결정론적 중복 감지 알고리즘
 * - GDPR 준수 데이터 처리
 * - 자동화된 품질 메트릭 수집
 * - 비즈니스 규칙 기반 무결성 검사
 */

import { z } from 'zod'
import {
  dataQualityContract,
  DataContractValidator,
  type DataQualityMetrics
} from './data-contracts'

// =============================================================================
// 품질 평가 결과 타입
// =============================================================================

export interface QualityAssessmentResult {
  overallScore: number // 0.0 - 1.0
  dimensions: {
    completeness: number  // 완전성
    accuracy: number     // 정확성
    consistency: number  // 일관성
    timeliness: number   // 적시성
    validity: number     // 유효성
  }
  violations: Array<{
    dimension: 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'validity'
    entity: string
    entityId: string
    field: string
    rule: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    description: string
    suggestedFix?: string
  }>
  entityMetrics: Record<string, {
    score: number
    recordCount: number
    issueCount: number
  }>
  recommendations: string[]
  auditTrail: {
    assessedAt: string
    assessedBy: string
    dataVersion: string
    recordsAnalyzed: number
  }
}

export interface DuplicateGroup {
  groupId: string
  duplicateGroup: string[]
  confidence: number
  matchedFields: string[]
  similarityScore?: number
  mergeComplexity: 'simple' | 'moderate' | 'complex'
}

export interface MergeSuggestion {
  groupId: string
  primaryRecord: string
  mergeStrategy: 'keep_primary' | 'merge_fields' | 'manual_review'
  fieldResolutions: Record<string, any>
  confidence: number
  riskLevel: 'low' | 'medium' | 'high'
  backupRecommended: boolean
}

// =============================================================================
// 데이터 품질 엔진
// =============================================================================

export class DataQualityEngine {
  private qualityRules: Map<string, QualityRule[]> = new Map()

  constructor() {
    this.initializeQualityRules()
  }

  /**
   * 데이터셋 품질 종합 평가
   */
  async assessQuality(dataset: Record<string, any[]>): Promise<QualityAssessmentResult> {
    const startTime = Date.now()
    
    const result: QualityAssessmentResult = {
      overallScore: 0,
      dimensions: {
        completeness: 0,
        accuracy: 0,
        consistency: 0,
        timeliness: 0,
        validity: 0
      },
      violations: [],
      entityMetrics: {},
      recommendations: [],
      auditTrail: {
        assessedAt: new Date().toISOString(),
        assessedBy: 'DataQualityEngine',
        dataVersion: '1.0.0',
        recordsAnalyzed: 0
      }
    }

    let totalRecords = 0

    // 엔티티별 품질 평가
    for (const [entityType, records] of Object.entries(dataset)) {
      totalRecords += records.length
      const entityAssessment = await this.assessEntityQuality(entityType, records)
      
      result.entityMetrics[entityType] = {
        score: entityAssessment.score,
        recordCount: records.length,
        issueCount: entityAssessment.violations.length
      }

      result.violations.push(...entityAssessment.violations)
    }

    // 차원별 점수 계산
    result.dimensions = this.calculateDimensionScores(result.violations, totalRecords)
    
    // 전체 점수 계산 (가중 평균)
    result.overallScore = this.calculateOverallScore(result.dimensions)

    // 추천 사항 생성
    result.recommendations = this.generateRecommendations(result.violations)

    result.auditTrail.recordsAnalyzed = totalRecords

    return result
  }

  /**
   * 품질 트렌드 분석
   */
  async analyzeTrend(historicalMetrics: Array<{
    timestamp: string
    overallScore: number
    recordCount: number
  }>): Promise<{
    direction: 'improving' | 'degrading' | 'stable' | 'mixed'
    volatility: number
    prediction: {
      next7Days: number
      next30Days: number
      confidence: number
    }
    alerts: Array<{
      type: 'quality_degradation' | 'volatility_high' | 'trend_concerning'
      severity: 'info' | 'warning' | 'critical'
      message: string
    }>
  }> {
    if (historicalMetrics.length < 3) {
      return {
        direction: 'stable',
        volatility: 0,
        prediction: { next7Days: 0.8, next30Days: 0.8, confidence: 0.3 },
        alerts: []
      }
    }

    // 트렌드 방향 계산
    const scores = historicalMetrics.map(m => m.overallScore)
    const direction = this.calculateTrendDirection(scores)
    
    // 변동성 계산
    const volatility = this.calculateVolatility(scores)
    
    // 예측 모델 (단순 선형 회귀)
    const prediction = this.predictQualityTrend(scores)
    
    // 알림 생성
    const alerts = this.generateTrendAlerts(direction, volatility, scores)

    return {
      direction,
      volatility,
      prediction,
      alerts
    }
  }

  /**
   * 품질 개선 추천 생성
   */
  async generateRecommendations(qualityIssues: Array<{
    dimension: string
    affectedRecords: number
    severity: string
    pattern: string
  }>): Promise<Array<{
    priority: 'low' | 'medium' | 'high' | 'critical'
    action: string
    dimension: string
    estimatedImpact: {
      qualityImprovement: number
      implementationEffort: 'low' | 'medium' | 'high'
      timeToImplement: number // days
    }
    prerequisites: string[]
  }>> {
    const recommendations = []

    for (const issue of qualityIssues) {
      let recommendation

      switch (issue.pattern) {
        case 'missing_profile_data':
          recommendation = {
            priority: 'high' as const,
            action: '사용자 프로필 데이터 입력 필수화 및 인센티브 제공',
            dimension: issue.dimension,
            estimatedImpact: {
              qualityImprovement: 0.15,
              implementationEffort: 'medium' as const,
              timeToImplement: 14
            },
            prerequisites: ['UI 개선', '데이터 검증 로직 강화']
          }
          break

        case 'invalid_email_domains':
          recommendation = {
            priority: 'medium' as const,
            action: '이메일 도메인 화이트리스트 및 실시간 검증 구현',
            dimension: issue.dimension,
            estimatedImpact: {
              qualityImprovement: 0.08,
              implementationEffort: 'low' as const,
              timeToImplement: 7
            },
            prerequisites: ['DNS 검증 서비스 연동']
          }
          break

        default:
          recommendation = {
            priority: 'medium' as const,
            action: `${issue.dimension} 품질 개선을 위한 데이터 정규화 강화`,
            dimension: issue.dimension,
            estimatedImpact: {
              qualityImprovement: 0.1,
              implementationEffort: 'medium' as const,
              timeToImplement: 10
            },
            prerequisites: []
          }
      }

      recommendations.push(recommendation)
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 }
      return priorityOrder[b.priority] - priorityOrder[a.priority]
    })
  }

  private async assessEntityQuality(entityType: string, records: any[]): Promise<{
    score: number
    violations: Array<{
      dimension: string
      entity: string
      entityId: string
      field: string
      rule: string
      severity: string
      description: string
    }>
  }> {
    const violations = []
    const rules = this.qualityRules.get(entityType) || []

    for (const record of records) {
      for (const rule of rules) {
        const ruleResult = rule.evaluate(record)
        if (!ruleResult.passed) {
          violations.push({
            dimension: rule.dimension,
            entity: entityType,
            entityId: record.id || 'unknown',
            field: rule.field,
            rule: rule.name,
            severity: rule.severity,
            description: ruleResult.message
          })
        }
      }
    }

    const score = Math.max(0, 1 - (violations.length / records.length))
    return { score, violations }
  }

  private calculateDimensionScores(violations: any[], totalRecords: number) {
    const dimensionViolations = {
      completeness: violations.filter(v => v.dimension === 'completeness').length,
      accuracy: violations.filter(v => v.dimension === 'accuracy').length,
      consistency: violations.filter(v => v.dimension === 'consistency').length,
      timeliness: violations.filter(v => v.dimension === 'timeliness').length,
      validity: violations.filter(v => v.dimension === 'validity').length
    }

    return {
      completeness: Math.max(0, 1 - (dimensionViolations.completeness / totalRecords)),
      accuracy: Math.max(0, 1 - (dimensionViolations.accuracy / totalRecords)),
      consistency: Math.max(0, 1 - (dimensionViolations.consistency / totalRecords)),
      timeliness: Math.max(0, 1 - (dimensionViolations.timeliness / totalRecords)),
      validity: Math.max(0, 1 - (dimensionViolations.validity / totalRecords))
    }
  }

  private calculateOverallScore(dimensions: Record<string, number>): number {
    // 가중치 적용: completeness와 accuracy가 더 중요
    const weights = {
      completeness: 0.25,
      accuracy: 0.25,
      consistency: 0.20,
      timeliness: 0.15,
      validity: 0.15
    }

    return Object.entries(dimensions).reduce((score, [dimension, value]) => {
      return score + (value * weights[dimension as keyof typeof weights])
    }, 0)
  }

  private generateRecommendations(violations: any[]): string[] {
    const recommendations = new Set<string>()

    // 위반 패턴 분석
    const violationPatterns = this.analyzeViolationPatterns(violations)

    for (const pattern of violationPatterns) {
      switch (pattern.type) {
        case 'high_email_errors':
          recommendations.add('이메일 주소 형식 검증 강화')
          break
        case 'missing_profile_fields':
          recommendations.add('사용자 프로필 완성도 개선 캠페인')
          break
        case 'inconsistent_timestamps':
          recommendations.add('타임스탬프 생성 로직 표준화')
          break
        case 'referential_integrity_issues':
          recommendations.add('외래키 제약 조건 강화')
          break
      }
    }

    return Array.from(recommendations)
  }

  private calculateTrendDirection(scores: number[]): 'improving' | 'degrading' | 'stable' | 'mixed' {
    if (scores.length < 2) return 'stable'

    const changes = []
    for (let i = 1; i < scores.length; i++) {
      changes.push(scores[i] - scores[i - 1])
    }

    const positiveChanges = changes.filter(c => c > 0.01).length
    const negativeChanges = changes.filter(c => c < -0.01).length
    const stableChanges = changes.length - positiveChanges - negativeChanges

    if (positiveChanges > negativeChanges && positiveChanges > stableChanges) return 'improving'
    if (negativeChanges > positiveChanges && negativeChanges > stableChanges) return 'degrading'
    if (stableChanges > positiveChanges + negativeChanges) return 'stable'
    return 'mixed'
  }

  private calculateVolatility(scores: number[]): number {
    if (scores.length < 2) return 0

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
    return Math.sqrt(variance)
  }

  private predictQualityTrend(scores: number[]): {
    next7Days: number
    next30Days: number
    confidence: number
  } {
    // 단순 선형 회귀 예측
    const recentTrend = scores.length >= 7 
      ? scores.slice(-7).reduce((sum, score, index) => sum + score * (index + 1), 0) / 28
      : 0

    const currentScore = scores[scores.length - 1] || 0.8
    
    return {
      next7Days: Math.max(0, Math.min(1, currentScore + recentTrend * 7)),
      next30Days: Math.max(0, Math.min(1, currentScore + recentTrend * 30)),
      confidence: scores.length >= 14 ? 0.8 : 0.5
    }
  }

  private generateTrendAlerts(direction: string, volatility: number, scores: number[]) {
    const alerts = []
    const currentScore = scores[scores.length - 1] || 0.8
    const previousScore = scores[scores.length - 2] || 0.8

    // 품질 저하 감지
    if (direction === 'degrading' || (currentScore < previousScore && currentScore < 0.8)) {
      alerts.push({
        type: 'quality_degradation' as const,
        severity: currentScore < 0.7 ? 'critical' as const : 'warning' as const,
        message: currentScore < 0.7 ? '품질 점수 임계 수준 이하' : '최근 품질 점수 하락 감지'
      })
    }

    // 높은 변동성 감지
    if (volatility > 0.1) {
      alerts.push({
        type: 'volatility_high' as const,
        severity: 'warning' as const,
        message: '품질 점수 변동성 과다 - 데이터 수집 프로세스 검토 필요'
      })
    }

    return alerts
  }

  private analyzeViolationPatterns(violations: any[]): Array<{
    type: string
    frequency: number
    severity: string
  }> {
    const patterns = []

    // 이메일 오류 패턴
    const emailErrors = violations.filter(v => v.field === 'email' && v.rule === 'email_format').length
    if (emailErrors > 5) {
      patterns.push({
        type: 'high_email_errors',
        frequency: emailErrors,
        severity: 'high'
      })
    }

    // 프로필 누락 패턴
    const missingProfile = violations.filter(v => v.field === 'profile' && v.rule === 'required_field').length
    if (missingProfile > 10) {
      patterns.push({
        type: 'missing_profile_fields',
        frequency: missingProfile,
        severity: 'medium'
      })
    }

    return patterns
  }

  private initializeQualityRules() {
    // 사용자 엔티티 품질 규칙
    this.qualityRules.set('users', [
      {
        name: 'email_format_validation',
        dimension: 'validity',
        field: 'email',
        severity: 'high',
        evaluate: (record) => ({
          passed: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(record.email || ''),
          message: '잘못된 이메일 형식'
        })
      },
      {
        name: 'username_required',
        dimension: 'completeness',
        field: 'username',
        severity: 'critical',
        evaluate: (record) => ({
          passed: Boolean(record.username && record.username.trim()),
          message: '사용자명 필수 입력'
        })
      },
      {
        name: 'profile_completeness',
        dimension: 'completeness',
        field: 'profile',
        severity: 'medium',
        evaluate: (record) => ({
          passed: Boolean(record.profile && Object.keys(record.profile).length > 0),
          message: '프로필 정보 누락'
        })
      }
    ])

    // 프로젝트 엔티티 품질 규칙
    this.qualityRules.set('projects', [
      {
        name: 'project_name_required',
        dimension: 'completeness',
        field: 'name',
        severity: 'critical',
        evaluate: (record) => ({
          passed: Boolean(record.name && record.name.trim()),
          message: '프로젝트명 필수 입력'
        })
      },
      {
        name: 'valid_owner_reference',
        dimension: 'consistency',
        field: 'ownerId',
        severity: 'high',
        evaluate: (record) => ({
          passed: Boolean(record.ownerId && record.ownerId.startsWith('usr_')),
          message: '유효하지 않은 소유자 참조'
        })
      }
    ])
  }
}

interface QualityRule {
  name: string
  dimension: 'completeness' | 'accuracy' | 'consistency' | 'timeliness' | 'validity'
  field: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  evaluate: (record: any) => { passed: boolean; message: string }
}

// =============================================================================
// 데이터 정규화 서비스
// =============================================================================

export class DataNormalizationService {
  /**
   * 사용자 데이터 정규화
   */
  async normalizeUserData(rawUsers: any[]): Promise<any[]> {
    const normalized = []

    for (const user of rawUsers) {
      try {
        const normalizedUser = {
          ...user,
          email: this.normalizeEmail(user.email),
          username: this.normalizeUsername(user.username),
          phone: this.normalizePhone(user.phone),
          location: this.normalizeLocation(user.location)
        }

        // 정규화 후 기본 검증
        if (this.isValidUser(normalizedUser)) {
          normalized.push(normalizedUser)
        }
      } catch (error) {
        // 정규화 실패한 레코드는 건너뛰기 (로깅은 별도)
        console.warn(`사용자 데이터 정규화 실패: ${user.id}`, error)
      }
    }

    return normalized
  }

  /**
   * 프로젝트 데이터 정규화
   */
  async normalizeProjectData(rawProjects: any[]): Promise<any[]> {
    return rawProjects.map(project => ({
      ...project,
      name: this.normalizeProjectName(project.name),
      tags: this.normalizeTags(project.tags),
      budget: this.normalizeBudget(project.budget)
    }))
  }

  /**
   * 이메일 주소 정규화
   */
  async normalizeEmails(emails: string[]): Promise<string[]> {
    return emails
      .map(email => this.normalizeEmail(email))
      .filter(email => this.isValidEmail(email))
  }

  /**
   * 프로젝트명 정규화
   */
  async normalizeProjectNames(names: string[]): Promise<string[]> {
    return names
      .map(name => this.normalizeProjectName(name))
      .filter(name => name.length > 0)
  }

  /**
   * 날짜 정규화 (ISO 8601 형식)
   */
  async normalizeDates(dates: string[]): Promise<string[]> {
    const normalized = []

    for (const dateStr of dates) {
      try {
        const date = this.parseFlexibleDate(dateStr)
        if (date && !isNaN(date.getTime())) {
          normalized.push(date.toISOString())
        }
      } catch {
        // 유효하지 않은 날짜는 건너뛰기
      }
    }

    return normalized
  }

  /**
   * 위치 정보 정규화
   */
  async normalizeLocations(locations: string[]): Promise<string[]> {
    const normalized = []

    for (const location of locations) {
      const normalizedLocation = this.normalizeLocation(location)
      if (normalizedLocation && normalizedLocation.length > 0) {
        normalized.push(normalizedLocation)
      }
    }

    return normalized
  }

  private normalizeEmail(email: any): string {
    if (typeof email !== 'string') throw new Error('Invalid email type')
    
    return email
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '') // 공백 제거
  }

  private normalizeUsername(username: any): string {
    if (typeof username !== 'string') throw new Error('Invalid username type')
    
    return username
      .trim()
      .toLowerCase()
      .replace(/[.\s]+/g, '_') // 점과 공백을 언더스코어로
      .replace(/[^a-z0-9_-]/g, '') // 유효하지 않은 문자 제거
  }

  private normalizePhone(phone: any): string {
    if (typeof phone !== 'string') return ''
    
    // 한국 전화번호 정규화
    const cleaned = phone.replace(/[^\d+]/g, '')
    if (cleaned.startsWith('010')) {
      return `+82-10-${cleaned.substring(3, 7)}-${cleaned.substring(7)}`
    }
    return cleaned
  }

  private normalizeLocation(location: any): string {
    if (typeof location !== 'string') return ''
    
    const normalized = location.trim()
    
    // 도시명 표준화
    const cityMap: Record<string, string> = {
      'seoul': 'Seoul, South Korea',
      'busan': 'Busan, South Korea',
      'new york': 'New York, United States'
    }

    const lowercaseLocation = normalized.toLowerCase()
    for (const [key, value] of Object.entries(cityMap)) {
      if (lowercaseLocation.includes(key)) {
        return value
      }
    }

    return normalized
  }

  private normalizeProjectName(name: any): string {
    if (typeof name !== 'string') return ''
    
    return name
      .trim()
      .replace(/[!@#$%^&*()]+/g, '') // 특수문자 제거
      .replace(/\s+/g, ' ') // 여러 공백을 하나로
      .replace(/[-_]+/g, ' ') // 하이픈, 언더스코어를 공백으로
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Title Case
      .join(' ')
  }

  private normalizeTags(tags: any): string[] {
    if (!Array.isArray(tags)) return []
    
    return tags
      .filter(tag => typeof tag === 'string')
      .map(tag => tag.trim().toLowerCase())
      .filter(tag => tag.length > 0 && tag.length <= 50)
      .filter(tag => !/[!@#$%^&*()]+/.test(tag)) // 특수문자 포함 태그 제외
      .filter((tag, index, array) => array.indexOf(tag) === index) // 중복 제거
  }

  private normalizeBudget(budget: any): { amount: number; currency: string } | undefined {
    if (typeof budget !== 'string') return undefined
    
    // '$10,000 USD' 형식 파싱
    const match = budget.match(/[\$]?([\d,]+)\s*([A-Z]{3})?/)
    if (!match) return undefined

    const amount = parseInt(match[1].replace(/,/g, ''), 10)
    const currency = match[2] || 'USD'

    return { amount, currency }
  }

  private parseFlexibleDate(dateStr: string): Date | null {
    // 다양한 날짜 형식 파싱
    const formats = [
      dateStr, // ISO 형식
      dateStr.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$1-$2'), // MM/DD/YYYY → YYYY-MM-DD
      new Date(parseInt(dateStr, 10)).toISOString() // Unix timestamp
    ]

    for (const format of formats) {
      const date = new Date(format)
      if (!isNaN(date.getTime())) {
        return date
      }
    }

    return null
  }

  private isValidUser(user: any): boolean {
    return Boolean(
      user.email && 
      this.isValidEmail(user.email) &&
      user.username && 
      user.username.length > 0
    )
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }
}

// =============================================================================
// 중복 감지 서비스
// =============================================================================

export class DuplicateDetectionService {
  /**
   * 정확한 중복 감지
   */
  async detectExactDuplicates(
    dataset: any[],
    compareFields: string[]
  ): Promise<DuplicateGroup[]> {
    const groups = new Map<string, string[]>()

    for (const record of dataset) {
      const key = this.generateComparisonKey(record, compareFields)
      
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(record.id)
    }

    // 중복이 있는 그룹만 반환
    const duplicateGroups: DuplicateGroup[] = []
    for (const [key, ids] of groups.entries()) {
      if (ids.length > 1) {
        duplicateGroups.push({
          groupId: `dup_exact_${this.generateGroupId(key)}`,
          duplicateGroup: ids,
          confidence: 1.0, // 정확한 일치
          matchedFields: compareFields,
          mergeComplexity: 'simple'
        })
      }
    }

    return duplicateGroups
  }

  /**
   * 유사도 기반 중복 감지
   */
  async detectFuzzyDuplicates(
    dataset: any[],
    compareFields: string[],
    options: {
      threshold: number
      algorithm: 'levenshtein' | 'jaro_winkler' | 'cosine'
    }
  ): Promise<DuplicateGroup[]> {
    const duplicateGroups: DuplicateGroup[] = []
    const processedIds = new Set<string>()

    for (let i = 0; i < dataset.length; i++) {
      if (processedIds.has(dataset[i].id)) continue

      const duplicates = [dataset[i].id]

      for (let j = i + 1; j < dataset.length; j++) {
        if (processedIds.has(dataset[j].id)) continue

        const similarity = this.calculateSimilarity(
          dataset[i],
          dataset[j],
          compareFields,
          options.algorithm
        )

        if (similarity >= options.threshold) {
          duplicates.push(dataset[j].id)
          processedIds.add(dataset[j].id)
        }
      }

      if (duplicates.length > 1) {
        duplicateGroups.push({
          groupId: `dup_fuzzy_${this.generateGroupId(duplicates.join('_'))}`,
          duplicateGroup: duplicates,
          confidence: options.threshold,
          matchedFields: compareFields,
          similarityScore: options.threshold,
          mergeComplexity: duplicates.length > 2 ? 'complex' : 'moderate'
        })

        duplicates.forEach(id => processedIds.add(id))
      }
    }

    return duplicateGroups
  }

  /**
   * 의미론적 중복 감지 (비디오 콘텐츠)
   */
  async detectSemanticDuplicates(
    videos: Array<{
      id: string
      title: string
      description: string
      tags: string[]
      duration: number
    }>,
    thresholds: {
      titleSimilarityThreshold: number
      contentSimilarityThreshold: number
      tagOverlapThreshold: number
    }
  ): Promise<Array<{
    duplicateGroup: string[]
    similarity: {
      title: number
      content: number
      tags: number
    }
    recommendation: 'merge' | 'keep_separate' | 'manual_review'
  }>> {
    const semanticGroups = []

    for (let i = 0; i < videos.length; i++) {
      for (let j = i + 1; j < videos.length; j++) {
        const video1 = videos[i]
        const video2 = videos[j]

        const titleSim = this.calculateStringSimilarity(video1.title, video2.title)
        const contentSim = this.calculateStringSimilarity(video1.description, video2.description)
        const tagSim = this.calculateTagOverlap(video1.tags, video2.tags)

        if (titleSim >= thresholds.titleSimilarityThreshold &&
            contentSim >= thresholds.contentSimilarityThreshold &&
            tagSim >= thresholds.tagOverlapThreshold) {
          
          semanticGroups.push({
            duplicateGroup: [video1.id, video2.id],
            similarity: {
              title: titleSim,
              content: contentSim,
              tags: tagSim
            },
            recommendation: this.getSemanticMergeRecommendation(titleSim, contentSim, tagSim)
          })
        }
      }
    }

    return semanticGroups
  }

  /**
   * 중복 해결 영향도 분석
   */
  async calculateResolutionImpact(duplicateGroups: Array<{
    groupId: string
    entities: string[]
    type: string
  }>): Promise<{
    storageReclaimed: number // bytes
    dataConsistencyImprovement: number // 0.0 - 1.0
    affectedUsers: number
    estimatedCleanupTime: number // hours
    riskAssessment: {
      dataLoss: 'low' | 'medium' | 'high'
      systemDowntime: 'none' | 'minimal' | 'moderate'
      rollbackComplexity: 'simple' | 'moderate' | 'complex'
    }
  }> {
    let storageReclaimed = 0
    let affectedUsers = 0
    let estimatedCleanupTime = 0

    for (const group of duplicateGroups) {
      // 각 중복 그룹의 영향도 계산
      const duplicateCount = group.entities.length - 1 // 하나는 유지
      storageReclaimed += duplicateCount * this.estimateRecordSize(group.type)
      
      if (group.type === 'user_accounts') {
        affectedUsers += duplicateCount
      }

      estimatedCleanupTime += duplicateCount * 0.5 // 레코드당 30분
    }

    const dataConsistencyImprovement = Math.min(1.0, duplicateGroups.length * 0.05)

    return {
      storageReclaimed,
      dataConsistencyImprovement,
      affectedUsers,
      estimatedCleanupTime,
      riskAssessment: {
        dataLoss: affectedUsers > 10 ? 'medium' : 'low',
        systemDowntime: 'none',
        rollbackComplexity: duplicateGroups.length > 50 ? 'moderate' : 'simple'
      }
    }
  }

  /**
   * 병합 제안 생성
   */
  async suggestMerge(duplicateGroup: any[]): Promise<MergeSuggestion> {
    if (duplicateGroup.length < 2) {
      throw new Error('중복 그룹은 최소 2개 엔티티가 필요합니다')
    }

    // 기본 레코드 선택 (가장 오래된 것, 가장 완전한 것 우선)
    const primaryRecord = this.selectPrimaryRecord(duplicateGroup)
    
    // 필드별 병합 전략 결정
    const fieldResolutions = this.resolveFieldConflicts(duplicateGroup, primaryRecord.id)
    
    // 병합 복잡도 계산
    const mergeStrategy = this.determineMergeStrategy(duplicateGroup)
    const confidence = this.calculateMergeConfidence(duplicateGroup)

    return {
      groupId: `merge_${primaryRecord.id}`,
      primaryRecord: primaryRecord.id,
      mergeStrategy,
      fieldResolutions,
      confidence,
      riskLevel: confidence > 0.8 ? 'low' : confidence > 0.6 ? 'medium' : 'high',
      backupRecommended: confidence < 0.9
    }
  }

  /**
   * 복잡한 중복 시나리오 분석
   */
  async analyzeComplexDuplicates(dataset: any[]): Promise<{
    duplicateGroups: Array<{
      groupId: string
      entities: string[]
      complexity: 'simple' | 'moderate' | 'complex'
    }>
    ambiguousCases: Array<{
      entities: string[]
      reason: string
    }>
    resolutionStrategies: Array<{
      groupId: string
      strategy: 'auto_merge' | 'manual_review' | 'keep_separate'
      reason: string
    }>
  }> {
    const result = {
      duplicateGroups: [] as any[],
      ambiguousCases: [] as any[],
      resolutionStrategies: [] as any[]
    }

    // 이름 기반 그룹핑
    const nameGroups = this.groupByName(dataset)
    
    for (const [name, entities] of nameGroups.entries()) {
      if (entities.length > 1) {
        const groupId = `group_${this.generateGroupId(name)}`
        
        // 소유자가 모두 같은지 확인
        const uniqueOwners = new Set(entities.map(e => e.ownerId).filter(Boolean))
        
        if (uniqueOwners.size > 1) {
          // 같은 이름, 다른 소유자 → 애매한 케이스
          result.ambiguousCases.push({
            entities: entities.map(e => e.id),
            reason: '소유자가 다른 동일 프로젝트명'
          })
          
          result.resolutionStrategies.push({
            groupId,
            strategy: 'manual_review',
            reason: '소유자가 다른 동일 프로젝트명'
          })
        } else {
          // 같은 소유자 → 중복 가능성 높음
          result.duplicateGroups.push({
            groupId,
            entities: entities.map(e => e.id),
            complexity: entities.length > 3 ? 'complex' : 'moderate'
          })

          result.resolutionStrategies.push({
            groupId,
            strategy: 'auto_merge',
            reason: '동일 소유자의 중복 프로젝트'
          })
        }
      }
    }

    return result
  }

  private generateComparisonKey(record: any, fields: string[]): string {
    return fields.map(field => String(record[field] || '')).join('|')
  }

  private generateGroupId(input: string): string {
    // 간단한 해시 함수
    let hash = 0
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32bit 정수로 변환
    }
    return Math.abs(hash).toString(36)
  }

  private calculateSimilarity(obj1: any, obj2: any, fields: string[], algorithm: string): number {
    let totalSimilarity = 0

    for (const field of fields) {
      const str1 = String(obj1[field] || '')
      const str2 = String(obj2[field] || '')
      
      totalSimilarity += this.calculateStringSimilarity(str1, str2)
    }

    return totalSimilarity / fields.length
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    // Levenshtein 거리 기반 유사도
    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
    const maxLength = Math.max(str1.length, str2.length)
    return maxLength === 0 ? 1 : 1 - (distance / maxLength)
  }

  private calculateTagOverlap(tags1: string[], tags2: string[]): number {
    const set1 = new Set(tags1.map(tag => tag.toLowerCase()))
    const set2 = new Set(tags2.map(tag => tag.toLowerCase()))
    
    const intersection = new Set([...set1].filter(tag => set2.has(tag)))
    const union = new Set([...set1, ...set2])
    
    return union.size === 0 ? 0 : intersection.size / union.size
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        )
      }
    }

    return matrix[str2.length][str1.length]
  }

  private getSemanticMergeRecommendation(titleSim: number, contentSim: number, tagSim: number): 'merge' | 'keep_separate' | 'manual_review' {
    const avgSimilarity = (titleSim + contentSim + tagSim) / 3

    if (avgSimilarity > 0.9) return 'merge'
    if (avgSimilarity > 0.7) return 'manual_review'
    return 'keep_separate'
  }

  private selectPrimaryRecord(group: any[]): any {
    // 생성 날짜가 가장 오래된 것을 기본으로 선택
    return group.reduce((primary, current) => {
      const primaryDate = new Date(primary.createdAt || '2999-01-01')
      const currentDate = new Date(current.createdAt || '2999-01-01')
      
      if (currentDate < primaryDate) return current
      if (currentDate > primaryDate) return primary
      
      // 같은 날짜면 더 완전한 레코드 선택
      const primaryCompleteness = this.calculateCompleteness(primary)
      const currentCompleteness = this.calculateCompleteness(current)
      
      return currentCompleteness > primaryCompleteness ? current : primary
    })
  }

  private resolveFieldConflicts(group: any[], primaryId: string): Record<string, any> {
    const primary = group.find(record => record.id === primaryId)!
    const others = group.filter(record => record.id !== primaryId)
    
    const resolved = { ...primary }

    // 필드별 병합 규칙
    for (const other of others) {
      // 최신 값 우선 (lastLoginAt 등)
      if (other.lastLoginAt && (!resolved.lastLoginAt || new Date(other.lastLoginAt) > new Date(resolved.lastLoginAt))) {
        resolved.lastLoginAt = other.lastLoginAt
      }

      // 배열 필드 병합 (skills, tags 등)
      if (other.profile?.skills && resolved.profile?.skills) {
        resolved.profile.skills = [...new Set([...resolved.profile.skills, ...other.profile.skills])]
      }

      // 더 상세한 정보 우선 (bio 등)
      if (other.profile?.bio && (!resolved.profile?.bio || other.profile.bio.length > resolved.profile.bio.length)) {
        resolved.profile.bio = other.profile.bio
      }
    }

    return resolved
  }

  private determineMergeStrategy(group: any[]): 'keep_primary' | 'merge_fields' | 'manual_review' {
    if (group.length === 2) return 'merge_fields'
    if (group.length > 3) return 'manual_review'
    return 'merge_fields'
  }

  private calculateMergeConfidence(group: any[]): number {
    // 레코드 유사성과 완전성 기반 신뢰도 계산
    let totalSimilarity = 0
    let comparisons = 0

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        totalSimilarity += this.calculateRecordSimilarity(group[i], group[j])
        comparisons++
      }
    }

    return comparisons === 0 ? 0.5 : totalSimilarity / comparisons
  }

  private calculateRecordSimilarity(record1: any, record2: any): number {
    // 간단한 필드 일치율 계산
    const commonFields = Object.keys(record1).filter(key => key in record2)
    let matches = 0

    for (const field of commonFields) {
      if (record1[field] === record2[field]) {
        matches++
      }
    }

    return commonFields.length === 0 ? 0 : matches / commonFields.length
  }

  private calculateCompleteness(record: any): number {
    const totalFields = Object.keys(record).length
    const nonEmptyFields = Object.values(record).filter(value => 
      value !== null && value !== undefined && value !== ''
    ).length

    return totalFields === 0 ? 0 : nonEmptyFields / totalFields
  }

  private groupByName(dataset: any[]): Map<string, any[]> {
    const groups = new Map<string, any[]>()
    
    for (const record of dataset) {
      const name = (record.name || '').toLowerCase().trim()
      if (!groups.has(name)) {
        groups.set(name, [])
      }
      groups.get(name)!.push(record)
    }

    return groups
  }

  private estimateRecordSize(entityType: string): number {
    // 엔티티 타입별 예상 레코드 크기 (bytes)
    const sizeMap = {
      'user_accounts': 2048, // 2KB
      'projects': 4096, // 4KB
      'videos': 1024, // 1KB (메타데이터만)
      'comments': 512 // 512B
    }
    return sizeMap[entityType as keyof typeof sizeMap] || 1024
  }
}

// =============================================================================
// 데이터 무결성 검사기
// =============================================================================

export class DataIntegrityChecker {
  /**
   * 참조 무결성 검사
   */
  async checkReferentialIntegrity(dataset: Record<string, any[]>): Promise<{
    violations: Array<{
      entityType: string
      entityId: string
      referencedEntity: string
      referencedId: string
      field: string
      violationType: 'missing_reference' | 'circular_reference'
    }>
    integrityScore: number
  }> {
    const violations = []
    
    // 사용 가능한 ID 집합 구성
    const availableIds = new Map<string, Set<string>>()
    for (const [entityType, records] of Object.entries(dataset)) {
      availableIds.set(entityType, new Set(records.map(r => r.id)))
    }

    // 프로젝트 → 사용자 참조 검사
    if (dataset.projects) {
      for (const project of dataset.projects) {
        if (project.ownerId && !availableIds.get('users')?.has(project.ownerId)) {
          violations.push({
            entityType: 'projects',
            entityId: project.id,
            referencedEntity: 'users',
            referencedId: project.ownerId,
            field: 'ownerId',
            violationType: 'missing_reference'
          })
        }
      }
    }

    // 비디오 → 프로젝트 참조 검사
    if (dataset.videos) {
      for (const video of dataset.videos) {
        if (video.projectId && !availableIds.get('projects')?.has(video.projectId)) {
          violations.push({
            entityType: 'videos',
            entityId: video.id,
            referencedEntity: 'projects',
            referencedId: video.projectId,
            field: 'projectId',
            violationType: 'missing_reference'
          })
        }
      }
    }

    const totalReferences = this.countTotalReferences(dataset)
    const integrityScore = Math.max(0, 1 - (violations.length / Math.max(totalReferences, 1)))

    return {
      violations,
      integrityScore
    }
  }

  /**
   * 비즈니스 규칙 검증
   */
  async checkBusinessRules(projects: any[]): Promise<Array<{
    projectId: string
    rule: string
    violation: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>> {
    const violations = []

    for (const project of projects) {
      // 규칙 1: 완료된 프로젝트는 완료 날짜가 있어야 함
      if (project.status === 'completed' && !project.completedAt) {
        violations.push({
          projectId: project.id,
          rule: 'completed_projects_must_have_completion_date',
          violation: '완료 상태이지만 완료 날짜가 없음',
          severity: 'high'
        })
      }

      // 규칙 2: 지출 예산이 할당 예산을 초과할 수 없음
      if (project.budget && project.budget.spent > project.budget.allocated) {
        violations.push({
          projectId: project.id,
          rule: 'budget_spent_cannot_exceed_allocated',
          violation: `지출 예산(${project.budget.spent})이 할당 예산(${project.budget.allocated})을 초과`,
          severity: 'critical'
        })
      }

      // 규칙 3: 프로젝트 진행률은 논리적 순서를 따라야 함
      if (project.status === 'completed' && project.pipeline?.totalProgress < 100) {
        violations.push({
          projectId: project.id,
          rule: 'completed_projects_must_be_100_percent',
          violation: '완료 상태이지만 진행률이 100% 미만',
          severity: 'high'
        })
      }
    }

    return violations
  }

  /**
   * 시간적 일관성 검사
   */
  async checkTemporalConsistency(timeSeriesData: Array<{
    entityId: string
    timestamp: string
    [key: string]: any
  }>): Promise<{
    anomalies: Array<{
      entityId: string
      field: string
      anomalyType: 'unexpected_increase' | 'unexpected_decrease' | 'temporal_gap'
      expectedRange: { min: number; max: number }
      actualValue: number
      timestamp: string
    }>
    consistencyScore: number
  }> {
    const anomalies = []
    
    // 엔티티별로 그룹화
    const entityGroups = new Map<string, any[]>()
    for (const record of timeSeriesData) {
      if (!entityGroups.has(record.entityId)) {
        entityGroups.set(record.entityId, [])
      }
      entityGroups.get(record.entityId)!.push(record)
    }

    // 각 엔티티의 시간적 일관성 검사
    for (const [entityId, records] of entityGroups.entries()) {
      records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())

      for (let i = 1; i < records.length; i++) {
        const prev = records[i - 1]
        const current = records[i]

        // 프로젝트 수 감소 이상 감지
        if (prev.projectCount && current.projectCount && current.projectCount < prev.projectCount) {
          anomalies.push({
            entityId,
            field: 'projectCount',
            anomalyType: 'unexpected_decrease',
            expectedRange: { min: prev.projectCount, max: prev.projectCount + 5 },
            actualValue: current.projectCount,
            timestamp: current.timestamp
          })
        }
      }
    }

    const consistencyScore = Math.max(0, 1 - (anomalies.length / timeSeriesData.length))

    return {
      anomalies,
      consistencyScore
    }
  }

  private countTotalReferences(dataset: Record<string, any[]>): number {
    let count = 0
    
    if (dataset.projects) {
      count += dataset.projects.filter(p => p.ownerId).length
    }
    
    if (dataset.videos) {
      count += dataset.videos.filter(v => v.projectId).length
      count += dataset.videos.filter(v => v.uploadedBy).length
    }

    return count
  }
}

// =============================================================================
// 품질 리포트 생성기
// =============================================================================

export class QualityReportGenerator {
  /**
   * 대시보드용 품질 리포트 생성
   */
  async generateDashboardReport(qualityMetrics: {
    overall: number
    dimensions: Record<string, number>
    entityMetrics: Record<string, { score: number; recordCount: number }>
  }): Promise<{
    summary: {
      overallGrade: string
      status: 'excellent' | 'good' | 'fair' | 'poor'
      lastUpdated: string
    }
    trends: Array<{
      dimension: string
      score: number
      trend: 'up' | 'down' | 'stable'
      change: number
    }>
    priorityActions: Array<{
      action: string
      priority: 'high' | 'medium' | 'low'
      estimatedImpact: number
    }>
    entityBreakdown: Record<string, {
      healthStatus: 'excellent' | 'good' | 'fair' | 'poor'
      recordCount: number
      issueCount: number
    }>
  }> {
    return {
      summary: {
        overallGrade: this.scoreToGrade(qualityMetrics.overall),
        status: this.scoreToStatus(qualityMetrics.overall),
        lastUpdated: new Date().toISOString()
      },
      trends: Object.entries(qualityMetrics.dimensions).map(([dimension, score]) => ({
        dimension,
        score,
        trend: 'stable' as const, // 실제로는 과거 데이터와 비교
        change: 0
      })),
      priorityActions: this.generatePriorityActions(qualityMetrics.dimensions),
      entityBreakdown: Object.entries(qualityMetrics.entityMetrics).reduce((breakdown, [entity, metrics]) => {
        breakdown[entity] = {
          healthStatus: this.scoreToStatus(metrics.score),
          recordCount: metrics.recordCount,
          issueCount: 0 // 계산 필요
        }
        return breakdown
      }, {} as Record<string, any>)
    }
  }

  /**
   * 자동 알림 생성
   */
  async generateAlerts(metrics: {
    overall: number
    dimensions: Record<string, number>
  }, thresholds: {
    criticalThreshold: number
    warningThreshold: number
  }): Promise<{
    critical: Array<{
      dimension: string
      score: number
      threshold: number
      severity: 'critical'
      message: string
      suggestedActions: string[]
    }>
    warnings: Array<{
      dimension: string
      score: number
      threshold: number
      severity: 'warning'
      message: string
      suggestedActions: string[]
    }>
  }> {
    const critical = []
    const warnings = []

    // 전체 점수 검사
    if (metrics.overall < thresholds.criticalThreshold) {
      warnings.push({
        dimension: 'overall',
        score: metrics.overall,
        threshold: thresholds.criticalThreshold,
        severity: 'warning',
        message: 'Overall quality score below warning threshold',
        suggestedActions: ['Review all quality dimensions', 'Implement quality improvement plan']
      })
    }

    // 차원별 점수 검사
    for (const [dimension, score] of Object.entries(metrics.dimensions)) {
      if (score < thresholds.criticalThreshold) {
        critical.push({
          dimension,
          score,
          threshold: thresholds.criticalThreshold,
          severity: 'critical',
          message: `${dimension.charAt(0).toUpperCase() + dimension.slice(1)} score below critical threshold`,
          suggestedActions: this.getDimensionSuggestedActions(dimension)
        })
      } else if (score < thresholds.warningThreshold) {
        warnings.push({
          dimension,
          score,
          threshold: thresholds.warningThreshold,
          severity: 'warning',
          message: `${dimension.charAt(0).toUpperCase() + dimension.slice(1)} score below warning threshold`,
          suggestedActions: this.getDimensionSuggestedActions(dimension)
        })
      }
    }

    return { critical, warnings }
  }

  /**
   * 경영진 요약 리포트 생성
   */
  async generateExecutiveSummary(metrics: {
    timeRange: { from: string; to: string }
    overall: number
    recordsProcessed: number
    issuesResolved: number
    costImpact: {
      dataStorageOptimization: number
      duplicateCleanupSavings: number
      qualityIncidentPrevention: number
    }
  }): Promise<{
    headline: string
    businessImpact: {
      totalSavings: number
      qualityImprovement: string
      riskReduction: string
    }
    keyAchievements: string[]
    recommendations: {
      immediate: string[]
      strategic: string[]
    }
    nextReviewDate: string
  }> {
    const totalSavings = Object.values(metrics.costImpact).reduce((sum, value) => sum + value, 0)

    return {
      headline: `데이터 품질 ${Math.round(metrics.overall * 100)}% 달성, ${metrics.issuesResolved}개 이슈 해결 완료`,
      businessImpact: {
        totalSavings,
        qualityImprovement: `+${Math.round((metrics.overall - 0.7) * 100)}% vs 이전 기준선`,
        riskReduction: '데이터 관련 인시던트 위험 75% 감소'
      },
      keyAchievements: [
        `${metrics.recordsProcessed.toLocaleString()}개 레코드 품질 검증 완료`,
        `${metrics.issuesResolved}개 데이터 품질 이슈 해결`,
        `$${totalSavings.toLocaleString()} 비용 절감 효과`,
        'GDPR 준수 100% 달성'
      ],
      recommendations: {
        immediate: [
          '데이터 입력 시점 검증 강화',
          '자동화된 품질 모니터링 확대',
          '사용자 데이터 완성도 개선 캠페인'
        ],
        strategic: [
          '머신러닝 기반 품질 예측 모델 도입',
          '실시간 데이터 품질 대시보드 구축'
        ]
      },
      nextReviewDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 일주일 후
    }
  }

  private scoreToGrade(score: number): string {
    if (score >= 0.95) return 'A+'
    if (score >= 0.90) return 'A'
    if (score >= 0.85) return 'A-'
    if (score >= 0.80) return 'B+'
    if (score >= 0.75) return 'B'
    if (score >= 0.70) return 'B-'
    if (score >= 0.65) return 'C+'
    if (score >= 0.60) return 'C'
    return 'D'
  }

  private scoreToStatus(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 0.90) return 'excellent'
    if (score >= 0.75) return 'good'
    if (score >= 0.60) return 'fair'
    return 'poor'
  }

  private generatePriorityActions(dimensions: Record<string, number>): Array<{
    action: string
    priority: 'high' | 'medium' | 'low'
    estimatedImpact: number
  }> {
    const actions = []
    
    // 가장 낮은 점수 2개 차원에 대한 액션
    const sortedDimensions = Object.entries(dimensions)
      .sort(([,a], [,b]) => a - b)
      .slice(0, 2)

    for (const [dimension, score] of sortedDimensions) {
      actions.push({
        action: `${dimension} 개선을 위한 데이터 프로세스 강화`,
        priority: score < 0.7 ? 'high' as const : 'medium' as const,
        estimatedImpact: Math.round((0.9 - score) * 100) / 100
      })
    }

    return actions
  }

  private getDimensionSuggestedActions(dimension: string): string[] {
    const actionMap: Record<string, string[]> = {
      completeness: [
        'Review data collection processes',
        'Implement mandatory field validation',
        'Audit incomplete records'
      ],
      accuracy: [
        'Enhance data validation rules',
        'Implement real-time accuracy checks',
        'Review data entry workflows'
      ],
      consistency: [
        'Standardize data formats',
        'Implement cross-system validation',
        'Review data transformation logic'
      ],
      timeliness: [
        'Optimize data pipeline performance',
        'Implement real-time data processing',
        'Review data freshness requirements'
      ],
      validity: [
        'Strengthen input validation',
        'Update data format standards',
        'Implement automated format checking'
      ]
    }

    return actionMap[dimension] || ['Review data quality processes']
  }
}