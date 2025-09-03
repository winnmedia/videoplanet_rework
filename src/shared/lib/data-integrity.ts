/**
 * 데이터 무결성 검증 및 충돌 해결 시스템
 * 
 * 고품질 데이터 보장을 위한 포괄적인 검증 시스템과
 * 지능적 충돌 해결 메커니즘을 제공합니다.
 * 
 * 주요 기능:
 * - 다계층 데이터 검증 (스키마, 비즈니스 로직, 참조 무결성)
 * - 자동 데이터 복구 및 정규화
 * - 다양한 충돌 해결 전략
 * - 성능 최적화된 배치 처리
 * - 사용자 정의 규칙 및 해결 로직
 */

import { z } from 'zod'
import {
  VideoPlanetPrompt,
  PromptDataValidator,
  videoPlanetPromptSchema
} from './prompt-contracts'

// =============================================================================
// 타입 정의
// =============================================================================

export interface IntegrityRule {
  id: string
  name: string
  description: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  category?: string
  condition?: (data: any, context?: ValidationContext) => boolean
  validator: (data: any, context?: ValidationContext) => {
    valid: boolean
    message?: string
    suggestedFix?: string
    repairAction?: () => any
  }
}

export interface ValidationContext {
  checkReferences?: boolean
  existingPrompts?: VideoPlanetPrompt[]
  strictMode?: boolean
  customRules?: IntegrityRule[]
  autoRepair?: boolean
  repairStrategies?: Record<string, (data: any) => any>
}

export interface IntegrityViolation {
  rule: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  field?: string
  message: string
  currentValue?: any
  expectedValue?: any
  suggestedFix?: string
  autoRepairable: boolean
}

export interface IntegrityCheckResult {
  isValid: boolean
  score: number // 0-1, 전체 품질 점수
  violations: IntegrityViolation[]
  warnings: IntegrityViolation[]
  repairAttempted?: boolean
  repairedData?: any
  repairLog?: {
    successfulRepairs: string[]
    failedRepairs: string[]
    repairActions: Array<{
      rule: string
      action: string
      before: any
      after: any
    }>
  }
}

export interface BatchIntegrityResult {
  summary: {
    totalItems: number
    validItems: number
    invalidItems: number
    warningsCount: number
    errorsCount: number
    repairsAttempted: number
    repairsSuccessful: number
  }
  itemResults: IntegrityCheckResult[]
  globalViolations: IntegrityViolation[]
  duplicates: Array<{
    ids: string[]
    count: number
    field: string
  }>
  processingTime: number
}

export interface DataConflict {
  id: string
  type: 'ID_CONFLICT' | 'VERSION_CONFLICT' | 'DATA_CONFLICT' | 'TIMESTAMP_CONFLICT' | 'REFERENCE_CONFLICT'
  conflictingField?: string
  existingItem: any
  incomingItem: any
  existingValue: any
  incomingValue: any
  severity: 'minor' | 'major' | 'critical'
  metadata?: Record<string, any>
}

export interface ConflictResolutionResult {
  conflictId: string
  strategy: string
  success: boolean
  resolvedItem: any
  action: string
  metadata?: Record<string, any>
  error?: string
}

export interface BatchConflictResolutionOptions {
  defaultStrategy?: ConflictResolutionStrategy
  strategyByType?: Record<string, ConflictResolutionStrategy>
  priorityRules?: Array<{
    condition: (conflict: DataConflict) => boolean
    strategy: ConflictResolutionStrategy
  }>
  parallelProcessing?: boolean
  batchSize?: number
  memoryOptimization?: boolean
  streamProcessing?: boolean
}

export type ConflictResolutionStrategy = 
  | 'skip'
  | 'overwrite' 
  | 'merge'
  | 'rename'
  | 'use_latest_version'
  | 'use_latest_timestamp'
  | 'prompt_user'
  | string // 사용자 정의 전략

// =============================================================================
// 데이터 무결성 검증자
// =============================================================================

export class DataIntegrityValidator {
  private customRules: Map<string, IntegrityRule> = new Map()
  private repairStrategies: Map<string, (data: any) => any> = new Map()

  constructor() {
    this.initializeDefaultRules()
    this.initializeDefaultRepairStrategies()
  }

  /**
   * 단일 항목 무결성 검증
   */
  async validateDataIntegrity(
    data: any,
    context: ValidationContext = {}
  ): Promise<IntegrityCheckResult> {
    const violations: IntegrityViolation[] = []
    const warnings: IntegrityViolation[] = []
    let repairedData = data
    let repairAttempted = false
    const repairLog = {
      successfulRepairs: [] as string[],
      failedRepairs: [] as string[],
      repairActions: [] as any[]
    }

    // 기본 스키마 검증
    const schemaValidation = this.validateSchema(data)
    if (!schemaValidation.valid) {
      violations.push(...schemaValidation.violations)
    }

    // 비즈니스 로직 검증
    const businessValidation = this.validateBusinessLogic(data, context)
    violations.push(...businessValidation.violations)
    warnings.push(...businessValidation.warnings)

    // 참조 무결성 검증
    if (context.checkReferences && context.existingPrompts) {
      const referenceValidation = this.validateReferences(data, context.existingPrompts)
      violations.push(...referenceValidation.violations)
    }

    // 사용자 정의 규칙 적용
    const customValidation = await this.applyCustomRules(data, context)
    violations.push(...customValidation.violations)
    warnings.push(...customValidation.warnings)

    // 자동 복구 시도
    if (context.autoRepair && violations.some(v => v.autoRepairable)) {
      const repairResult = await this.attemptAutoRepair(repairedData, violations, context)
      repairedData = repairResult.repairedData
      repairAttempted = repairResult.attempted
      Object.assign(repairLog, repairResult.log)
      
      // 복구 후 재검증
      if (repairResult.attempted) {
        const revalidation = await this.validateDataIntegrity(repairedData, {
          ...context,
          autoRepair: false // 무한 루프 방지
        })
        // 복구로 해결된 위반 사항 제거
        const remainingViolations = violations.filter(v => 
          !repairLog.successfulRepairs.includes(v.rule)
        )
        violations.splice(0, violations.length, ...remainingViolations)
      }
    }

    // 전체 품질 점수 계산
    const score = this.calculateQualityScore(violations, warnings)

    return {
      isValid: violations.filter(v => v.severity === 'error' || v.severity === 'critical').length === 0,
      score,
      violations,
      warnings,
      repairAttempted,
      repairedData: repairAttempted ? repairedData : undefined,
      repairLog: repairAttempted ? repairLog : undefined
    }
  }

  /**
   * 배치 무결성 검증
   */
  async validateDataIntegrityBatch(
    items: any[],
    options: {
      parallelProcessing?: boolean
      batchSize?: number
      allowPartialSuccess?: boolean
      stopOnFirstError?: boolean
    } = {}
  ): Promise<BatchIntegrityResult> {
    const startTime = performance.now()
    const itemResults: IntegrityCheckResult[] = []
    const globalViolations: IntegrityViolation[] = []
    const batchSize = options.batchSize || 50

    // ID 중복 검사
    const duplicates = this.findDuplicates(items, 'id')
    if (duplicates.length > 0) {
      globalViolations.push({
        rule: 'DUPLICATE_IDS',
        severity: 'critical',
        message: `Found ${duplicates.length} duplicate IDs`,
        autoRepairable: true
      })
    }

    // 배치 처리
    if (options.parallelProcessing) {
      // 병렬 처리
      const batches: any[][] = []
      for (let i = 0; i < items.length; i += batchSize) {
        batches.push(items.slice(i, i + batchSize))
      }

      for (const batch of batches) {
        const batchPromises = batch.map(item => this.validateDataIntegrity(item))
        const batchResults = await Promise.allSettled(batchPromises)
        
        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            itemResults.push(result.value)
          } else {
            itemResults.push({
              isValid: false,
              score: 0,
              violations: [{
                rule: 'VALIDATION_ERROR',
                severity: 'critical',
                message: result.reason.message,
                autoRepairable: false
              }],
              warnings: []
            })
          }

          if (options.stopOnFirstError && !itemResults[itemResults.length - 1].isValid) {
            break
          }
        }
      }
    } else {
      // 순차 처리
      for (const item of items) {
        try {
          const result = await this.validateDataIntegrity(item)
          itemResults.push(result)

          if (options.stopOnFirstError && !result.isValid) {
            break
          }
        } catch (error) {
          itemResults.push({
            isValid: false,
            score: 0,
            violations: [{
              rule: 'VALIDATION_ERROR',
              severity: 'critical',
              message: error instanceof Error ? error.message : 'Unknown validation error',
              autoRepairable: false
            }],
            warnings: []
          })
        }
      }
    }

    // 요약 통계 계산
    const summary = {
      totalItems: items.length,
      validItems: itemResults.filter(r => r.isValid).length,
      invalidItems: itemResults.filter(r => !r.isValid).length,
      warningsCount: itemResults.reduce((sum, r) => sum + r.warnings.length, 0),
      errorsCount: itemResults.reduce((sum, r) => sum + r.violations.length, 0),
      repairsAttempted: itemResults.filter(r => r.repairAttempted).length,
      repairsSuccessful: itemResults.filter(r => r.repairAttempted && r.isValid).length
    }

    return {
      summary,
      itemResults,
      globalViolations,
      duplicates,
      processingTime: performance.now() - startTime
    }
  }

  /**
   * 사용자 정의 규칙 추가
   */
  addCustomRule(rule: IntegrityRule): void {
    this.customRules.set(rule.id, rule)
  }

  /**
   * 사용자 정의 복구 전략 추가
   */
  addRepairStrategy(ruleId: string, strategy: (data: any) => any): void {
    this.repairStrategies.set(ruleId, strategy)
  }

  // =============================================================================
  // Private 메서드들
  // =============================================================================

  private initializeDefaultRules(): void {
    // 기본 내장 규칙들
    const defaultRules: IntegrityRule[] = [
      {
        id: 'REQUIRED_FIELD_MISSING',
        name: 'Required Field Check',
        description: 'Validates that all required fields are present',
        severity: 'error',
        validator: (data: VideoPlanetPrompt) => {
          const missing = []
          if (!data.id || data.id.trim() === '') missing.push('id')
          if (!data.projectId || data.projectId.trim() === '') missing.push('projectId')
          if (!data.metadata?.title || data.metadata.title.trim() === '') missing.push('metadata.title')
          
          return {
            valid: missing.length === 0,
            message: missing.length > 0 ? `Missing required fields: ${missing.join(', ')}` : undefined,
            repairAction: missing.length > 0 ? () => ({
              ...data,
              id: data.id || `prompt_auto_${Date.now()}`,
              projectId: data.projectId || `project_auto_${Date.now()}`,
              metadata: {
                ...data.metadata,
                title: data.metadata?.title || 'Untitled Prompt'
              }
            }) : undefined
          }
        }
      },
      {
        id: 'INVALID_VALUE_RANGE',
        name: 'Value Range Check',
        description: 'Validates that numeric values are within acceptable ranges',
        severity: 'error',
        validator: (data: VideoPlanetPrompt) => {
          const issues = []
          
          if (data.metadata?.estimatedTokens !== undefined) {
            if (data.metadata.estimatedTokens < 0) {
              issues.push('estimatedTokens cannot be negative')
            }
            if (data.metadata.estimatedTokens > 10000) {
              issues.push('estimatedTokens exceeds maximum (10000)')
            }
          }

          if (data.promptStructure?.shotBreakdown) {
            data.promptStructure.shotBreakdown.forEach((shot, index) => {
              if (shot.duration <= 0) {
                issues.push(`Shot ${index + 1} has invalid duration (${shot.duration})`)
              }
            })
          }

          return {
            valid: issues.length === 0,
            message: issues.length > 0 ? issues.join('; ') : undefined,
            repairAction: issues.length > 0 ? () => {
              const repaired = { ...data }
              if (repaired.metadata && repaired.metadata.estimatedTokens < 0) {
                repaired.metadata.estimatedTokens = Math.abs(repaired.metadata.estimatedTokens)
              }
              if (repaired.metadata && repaired.metadata.estimatedTokens > 10000) {
                repaired.metadata.estimatedTokens = 10000
              }
              if (repaired.promptStructure?.shotBreakdown) {
                repaired.promptStructure.shotBreakdown = repaired.promptStructure.shotBreakdown.map(shot => ({
                  ...shot,
                  duration: shot.duration <= 0 ? 5 : shot.duration
                }))
              }
              return repaired
            } : undefined
          }
        }
      },
      {
        id: 'INVALID_SHOT_SEQUENCE',
        name: 'Shot Sequence Check',
        description: 'Validates that shot numbers are sequential starting from 1',
        severity: 'warning',
        validator: (data: VideoPlanetPrompt) => {
          if (!data.promptStructure?.shotBreakdown) {
            return { valid: true }
          }

          const shots = data.promptStructure.shotBreakdown
          const expectedSequence = Array.from({ length: shots.length }, (_, i) => i + 1)
          const actualSequence = shots.map(shot => shot.shotNumber).sort((a, b) => a - b)
          
          const isSequential = JSON.stringify(expectedSequence) === JSON.stringify(actualSequence)

          return {
            valid: isSequential,
            message: !isSequential ? 'Shot numbers are not sequential or do not start from 1' : undefined,
            suggestedFix: 'Renumber shots to be sequential starting from 1',
            repairAction: !isSequential ? () => ({
              ...data,
              promptStructure: {
                ...data.promptStructure!,
                shotBreakdown: data.promptStructure!.shotBreakdown!.map((shot, index) => ({
                  ...shot,
                  shotNumber: index + 1
                }))
              }
            }) : undefined
          }
        }
      }
    ]

    defaultRules.forEach(rule => this.customRules.set(rule.id, rule))
  }

  private initializeDefaultRepairStrategies(): void {
    this.repairStrategies.set('INVALID_DATA_TYPE', (data: any) => {
      // 기본 데이터 타입 복구
      if (typeof data.metadata?.estimatedTokens === 'string') {
        const parsed = parseInt(data.metadata.estimatedTokens)
        if (!isNaN(parsed)) {
          data.metadata.estimatedTokens = Math.max(0, parsed)
        }
      }
      return data
    })

    this.repairStrategies.set('INVALID_ENUM_VALUE', (data: any) => {
      // 잘못된 enum 값 복구
      const validDifficulties = ['easy', 'medium', 'hard', 'expert']
      if (data.metadata?.difficulty && !validDifficulties.includes(data.metadata.difficulty)) {
        data.metadata.difficulty = 'medium' // 기본값으로 복구
      }
      return data
    })
  }

  private validateSchema(data: any): { valid: boolean; violations: IntegrityViolation[] } {
    const violations: IntegrityViolation[] = []

    try {
      const validation = PromptDataValidator.validateWithReport(videoPlanetPromptSchema, data)
      
      if (!validation.isValid) {
        validation.errors.forEach(error => {
          violations.push({
            rule: this.categorizeSchemaError(error.message),
            severity: 'error',
            field: error.path,
            message: error.message,
            autoRepairable: this.isAutoRepairable(error.message)
          })
        })
      }
    } catch (error) {
      violations.push({
        rule: 'SCHEMA_VALIDATION_ERROR',
        severity: 'critical',
        message: error instanceof Error ? error.message : 'Schema validation failed',
        autoRepairable: false
      })
    }

    return {
      valid: violations.length === 0,
      violations
    }
  }

  private validateBusinessLogic(
    data: VideoPlanetPrompt, 
    context: ValidationContext
  ): { violations: IntegrityViolation[]; warnings: IntegrityViolation[] } {
    const violations: IntegrityViolation[] = []
    const warnings: IntegrityViolation[] = []

    // 토큰 수와 실제 프롬프트 길이 일치성 검사
    if (data.promptStructure?.shotBreakdown && data.metadata?.estimatedTokens) {
      const actualTokens = this.estimateActualTokens(data.promptStructure.shotBreakdown)
      const estimatedTokens = data.metadata.estimatedTokens
      const deviation = Math.abs(actualTokens - estimatedTokens) / estimatedTokens

      if (deviation > 0.3) { // 30% 이상 차이
        warnings.push({
          rule: 'TOKEN_ESTIMATION_MISMATCH',
          severity: 'warning',
          field: 'metadata.estimatedTokens',
          message: `Token estimation (${estimatedTokens}) differs significantly from actual (${actualTokens})`,
          currentValue: estimatedTokens,
          expectedValue: actualTokens,
          autoRepairable: true
        })
      }
    }

    // 프롬프트 복잡성과 난이도 일치성 검사
    if (data.metadata?.difficulty && data.promptStructure) {
      const complexity = this.calculateComplexity(data.promptStructure)
      const expectedDifficulty = this.complexityToDifficulty(complexity)
      
      if (expectedDifficulty !== data.metadata.difficulty) {
        warnings.push({
          rule: 'DIFFICULTY_COMPLEXITY_MISMATCH',
          severity: 'warning',
          field: 'metadata.difficulty',
          message: `Difficulty (${data.metadata.difficulty}) doesn't match complexity (expected: ${expectedDifficulty})`,
          currentValue: data.metadata.difficulty,
          expectedValue: expectedDifficulty,
          autoRepairable: true
        })
      }
    }

    return { violations, warnings }
  }

  private validateReferences(
    data: VideoPlanetPrompt, 
    existingPrompts: VideoPlanetPrompt[]
  ): { violations: IntegrityViolation[] } {
    const violations: IntegrityViolation[] = []

    // 부모 프롬프트 참조 검증
    if (data.parentPromptId) {
      const parentExists = existingPrompts.some(p => p.id === data.parentPromptId)
      if (!parentExists) {
        violations.push({
          rule: 'INVALID_REFERENCE',
          severity: 'error',
          field: 'parentPromptId',
          message: `Referenced parent prompt '${data.parentPromptId}' does not exist`,
          currentValue: data.parentPromptId,
          autoRepairable: false
        })
      }
    }

    // 프로젝트 참조 검증 (단순 형식 검사)
    if (data.projectId && !data.projectId.match(/^project_[a-zA-Z0-9]+$/)) {
      violations.push({
        rule: 'INVALID_PROJECT_ID_FORMAT',
        severity: 'warning',
        field: 'projectId',
        message: `Project ID '${data.projectId}' doesn't follow expected format`,
        currentValue: data.projectId,
        autoRepairable: false
      })
    }

    return { violations }
  }

  private async applyCustomRules(
    data: any, 
    context: ValidationContext
  ): Promise<{ violations: IntegrityViolation[]; warnings: IntegrityViolation[] }> {
    const violations: IntegrityViolation[] = []
    const warnings: IntegrityViolation[] = []

    for (const [ruleId, rule] of this.customRules) {
      try {
        // 조건부 규칙 확인
        if (rule.condition && !rule.condition(data, context)) {
          continue
        }

        const result = rule.validator(data, context)
        if (!result.valid) {
          const violation: IntegrityViolation = {
            rule: ruleId,
            severity: rule.severity,
            message: result.message || `Validation failed for rule: ${rule.name}`,
            suggestedFix: result.suggestedFix,
            autoRepairable: !!result.repairAction
          }

          if (rule.severity === 'info' || rule.severity === 'warning') {
            warnings.push(violation)
          } else {
            violations.push(violation)
          }
        }
      } catch (error) {
        violations.push({
          rule: `${ruleId}_ERROR`,
          severity: 'error',
          message: `Custom rule '${rule.name}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          autoRepairable: false
        })
      }
    }

    return { violations, warnings }
  }

  private async attemptAutoRepair(
    data: any, 
    violations: IntegrityViolation[], 
    context: ValidationContext
  ): Promise<{
    attempted: boolean
    repairedData: any
    log: {
      successfulRepairs: string[]
      failedRepairs: string[]
      repairActions: Array<{
        rule: string
        action: string
        before: any
        after: any
      }>
    }
  }> {
    let repairedData = { ...data }
    const log = {
      successfulRepairs: [] as string[],
      failedRepairs: [] as string[],
      repairActions: [] as any[]
    }
    let attempted = false

    for (const violation of violations.filter(v => v.autoRepairable)) {
      try {
        attempted = true
        const rule = this.customRules.get(violation.rule)
        
        if (rule) {
          const validationResult = rule.validator(repairedData, context)
          if (validationResult.repairAction) {
            const before = { ...repairedData }
            repairedData = validationResult.repairAction()
            const after = { ...repairedData }

            log.successfulRepairs.push(violation.rule)
            log.repairActions.push({
              rule: violation.rule,
              action: 'custom_repair',
              before: this.extractRelevantFields(before, violation.field),
              after: this.extractRelevantFields(after, violation.field)
            })
          }
        } else {
          // 기본 복구 전략 시도
          const repairStrategy = this.repairStrategies.get(violation.rule)
          if (repairStrategy) {
            const before = { ...repairedData }
            repairedData = repairStrategy(repairedData)
            const after = { ...repairedData }

            log.successfulRepairs.push(violation.rule)
            log.repairActions.push({
              rule: violation.rule,
              action: 'default_strategy',
              before: this.extractRelevantFields(before, violation.field),
              after: this.extractRelevantFields(after, violation.field)
            })
          } else {
            log.failedRepairs.push(violation.rule)
          }
        }
      } catch (error) {
        log.failedRepairs.push(violation.rule)
      }
    }

    return {
      attempted,
      repairedData,
      log
    }
  }

  private categorizeSchemaError(errorMessage: string): string {
    if (errorMessage.includes('required')) return 'REQUIRED_FIELD_MISSING'
    if (errorMessage.includes('type')) return 'INVALID_DATA_TYPE'
    if (errorMessage.includes('enum')) return 'INVALID_ENUM_VALUE'
    if (errorMessage.includes('format') || errorMessage.includes('regex')) return 'INVALID_FORMAT'
    return 'SCHEMA_VALIDATION_ERROR'
  }

  private isAutoRepairable(errorMessage: string): boolean {
    const repairablePatterns = [
      'required',
      'type',
      'enum',
      'minimum',
      'maximum',
      'range'
    ]
    return repairablePatterns.some(pattern => errorMessage.toLowerCase().includes(pattern))
  }

  private calculateQualityScore(
    violations: IntegrityViolation[], 
    warnings: IntegrityViolation[]
  ): number {
    let score = 1.0

    // 위반사항에 따른 점수 차감
    violations.forEach(violation => {
      switch (violation.severity) {
        case 'critical':
          score -= 0.3
          break
        case 'error':
          score -= 0.2
          break
        case 'warning':
          score -= 0.1
          break
        case 'info':
          score -= 0.05
          break
      }
    })

    warnings.forEach(warning => {
      score -= 0.02 // 경고는 미미한 점수 차감
    })

    return Math.max(0, score)
  }

  private findDuplicates(items: any[], field: string): Array<{ ids: string[]; count: number; field: string }> {
    const valueMap = new Map<any, string[]>()
    
    items.forEach(item => {
      const value = this.getNestedValue(item, field)
      if (value) {
        if (!valueMap.has(value)) {
          valueMap.set(value, [])
        }
        valueMap.get(value)!.push(item.id || 'unknown')
      }
    })

    const duplicates: Array<{ ids: string[]; count: number; field: string }> = []
    valueMap.forEach((ids, value) => {
      if (ids.length > 1) {
        duplicates.push({
          ids,
          count: ids.length,
          field
        })
      }
    })

    return duplicates
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private extractRelevantFields(data: any, field?: string): any {
    if (!field) return data
    
    const keys = field.split('.')
    if (keys.length === 1) {
      return { [keys[0]]: data[keys[0]] }
    }
    
    // 중첩된 필드의 경우 전체 부모 객체 반환
    const parentKey = keys[0]
    return { [parentKey]: data[parentKey] }
  }

  private estimateActualTokens(shotBreakdown: any[]): number {
    return shotBreakdown.reduce((total, shot) => {
      const promptLength = shot.generationPrompt?.length || 0
      const descriptionLength = shot.description?.length || 0
      return total + Math.ceil((promptLength + descriptionLength) * 0.75) // 대략적 토큰 계산
    }, 0)
  }

  private calculateComplexity(promptStructure: any): number {
    let complexity = 0
    
    // 샷 수량
    const shotCount = promptStructure.shotBreakdown?.length || 0
    complexity += shotCount * 0.1
    
    // 스타일 가이드 복잡성
    if (promptStructure.styleGuide?.characterConsistency?.enabled) {
      complexity += 0.3
    }
    
    // 기술적 사양
    const hasTechnicalSpecs = promptStructure.shotBreakdown?.some((shot: any) => shot.technicalSpecs)
    if (hasTechnicalSpecs) {
      complexity += 0.2
    }

    return Math.min(complexity, 1.0)
  }

  private complexityToDifficulty(complexity: number): 'easy' | 'medium' | 'hard' | 'expert' {
    if (complexity < 0.3) return 'easy'
    if (complexity < 0.6) return 'medium'
    if (complexity < 0.8) return 'hard'
    return 'expert'
  }
}

// =============================================================================
// 충돌 해결자
// =============================================================================

export class ConflictResolver {
  private customResolvers: Map<string, (conflict: DataConflict) => Promise<ConflictResolutionResult>> = new Map()
  private conditionalStrategies: Array<{
    name: string
    condition: (conflict: DataConflict) => boolean
    resolver: (conflict: DataConflict) => Promise<ConflictResolutionResult>
  }> = []

  /**
   * 충돌 감지
   */
  async detectConflicts(
    incomingItems: any[], 
    existingItems: any[]
  ): Promise<DataConflict[]> {
    const conflicts: DataConflict[] = []
    const existingMap = new Map(existingItems.map(item => [item.id, item]))

    for (const incoming of incomingItems) {
      const existing = existingMap.get(incoming.id)
      
      if (existing) {
        // ID 충돌
        conflicts.push({
          id: `conflict_${incoming.id}_id`,
          type: 'ID_CONFLICT',
          conflictingField: 'id',
          existingItem: existing,
          incomingItem: incoming,
          existingValue: existing.id,
          incomingValue: incoming.id,
          severity: 'critical'
        })

        // 버전 충돌
        if (existing.version !== incoming.version) {
          conflicts.push({
            id: `conflict_${incoming.id}_version`,
            type: 'VERSION_CONFLICT',
            conflictingField: 'version',
            existingItem: existing,
            incomingItem: incoming,
            existingValue: existing.version,
            incomingValue: incoming.version,
            severity: 'major'
          })
        }

        // 데이터 불일치 감지
        const dataConflicts = this.detectDataDifferences(existing, incoming)
        conflicts.push(...dataConflicts)
      }
    }

    return conflicts
  }

  /**
   * 단일 충돌 해결
   */
  async resolveConflict(
    conflict: DataConflict, 
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolutionResult> {
    try {
      // 사용자 정의 해결자 확인
      if (this.customResolvers.has(strategy)) {
        return await this.customResolvers.get(strategy)!(conflict)
      }

      // 조건부 전략 확인
      const conditionalStrategy = this.conditionalStrategies.find(s => 
        s.name === strategy && s.condition(conflict)
      )
      if (conditionalStrategy) {
        return await conditionalStrategy.resolver(conflict)
      }

      // 기본 전략 적용
      return await this.applyBuiltInStrategy(conflict, strategy)

    } catch (error) {
      return {
        conflictId: conflict.id,
        strategy,
        success: false,
        resolvedItem: conflict.existingItem,
        action: 'error_occurred',
        error: error instanceof Error ? error.message : 'Unknown resolution error'
      }
    }
  }

  /**
   * 배치 충돌 해결
   */
  async resolveBatchConflicts(
    incomingItems: any[],
    existingItems: any[],
    options: BatchConflictResolutionOptions = {}
  ): Promise<{
    totalProcessed: number
    conflictsDetected: number
    resolutionsApplied: number
    resolved: any[]
    resolutionLog: Array<{
      conflictId: string
      conflictType: string
      strategyUsed: string
      success: boolean
      action: string
    }>
  }> {
    const conflicts = await this.detectConflicts(incomingItems, existingItems)
    const resolved: any[] = []
    const resolutionLog: any[] = []
    const processedIds = new Set<string>()

    // 우선순위 규칙에 따른 정렬
    const sortedConflicts = this.sortConflictsByPriority(conflicts, options.priorityRules)

    for (const conflict of sortedConflicts) {
      // 이미 처리된 항목은 건너뛰기
      if (processedIds.has(conflict.incomingItem.id)) {
        continue
      }

      // 전략 결정
      let strategy = options.defaultStrategy || 'skip'
      
      if (options.strategyByType && options.strategyByType[conflict.type]) {
        strategy = options.strategyByType[conflict.type]
      }

      if (options.priorityRules) {
        const matchingRule = options.priorityRules.find(rule => rule.condition(conflict))
        if (matchingRule) {
          strategy = matchingRule.strategy
        }
      }

      // 충돌 해결
      const result = await this.resolveConflict(conflict, strategy)
      
      if (result.success) {
        resolved.push(result.resolvedItem)
        processedIds.add(conflict.incomingItem.id)
      }

      resolutionLog.push({
        conflictId: conflict.id,
        conflictType: conflict.type,
        strategyUsed: strategy,
        success: result.success,
        action: result.action
      })
    }

    // 충돌이 없는 항목들 추가
    for (const incoming of incomingItems) {
      if (!processedIds.has(incoming.id)) {
        resolved.push(incoming)
        processedIds.add(incoming.id)
      }
    }

    return {
      totalProcessed: incomingItems.length,
      conflictsDetected: conflicts.length,
      resolutionsApplied: resolutionLog.filter(r => r.success).length,
      resolved,
      resolutionLog
    }
  }

  /**
   * 사용자 정의 해결자 추가
   */
  addCustomResolver(
    name: string, 
    resolver: (conflict: DataConflict) => Promise<ConflictResolutionResult>
  ): void {
    this.customResolvers.set(name, resolver)
  }

  /**
   * 조건부 전략 추가
   */
  addConditionalStrategy(strategy: {
    name: string
    condition: (conflict: DataConflict) => boolean
    resolver: (conflict: DataConflict) => Promise<ConflictResolutionResult>
  }): void {
    this.conditionalStrategies.push(strategy)
  }

  // =============================================================================
  // Private 메서드들
  // =============================================================================

  private detectDataDifferences(existing: any, incoming: any): DataConflict[] {
    const conflicts: DataConflict[] = []
    
    // 메타데이터 비교
    if (existing.metadata && incoming.metadata) {
      if (existing.metadata.title !== incoming.metadata.title) {
        conflicts.push({
          id: `conflict_${incoming.id}_title`,
          type: 'DATA_CONFLICT',
          conflictingField: 'metadata.title',
          existingItem: existing,
          incomingItem: incoming,
          existingValue: existing.metadata.title,
          incomingValue: incoming.metadata.title,
          severity: 'minor'
        })
      }

      if (existing.metadata.difficulty !== incoming.metadata.difficulty) {
        conflicts.push({
          id: `conflict_${incoming.id}_difficulty`,
          type: 'DATA_CONFLICT',
          conflictingField: 'metadata.difficulty',
          existingItem: existing,
          incomingItem: incoming,
          existingValue: existing.metadata.difficulty,
          incomingValue: incoming.metadata.difficulty,
          severity: 'minor'
        })
      }
    }

    // 생성 시간 비교
    const existingTime = new Date(existing.usage?.createdAt || 0).getTime()
    const incomingTime = new Date(incoming.usage?.createdAt || 0).getTime()
    
    if (existingTime !== incomingTime) {
      conflicts.push({
        id: `conflict_${incoming.id}_timestamp`,
        type: 'TIMESTAMP_CONFLICT',
        conflictingField: 'usage.createdAt',
        existingItem: existing,
        incomingItem: incoming,
        existingValue: existing.usage?.createdAt,
        incomingValue: incoming.usage?.createdAt,
        severity: 'minor'
      })
    }

    return conflicts
  }

  private async applyBuiltInStrategy(
    conflict: DataConflict, 
    strategy: ConflictResolutionStrategy
  ): Promise<ConflictResolutionResult> {
    switch (strategy) {
      case 'skip':
        return {
          conflictId: conflict.id,
          strategy,
          success: true,
          resolvedItem: conflict.existingItem,
          action: 'kept_existing'
        }

      case 'overwrite':
        return {
          conflictId: conflict.id,
          strategy,
          success: true,
          resolvedItem: conflict.incomingItem,
          action: 'used_incoming'
        }

      case 'merge':
        const merged = this.mergeItems(conflict.existingItem, conflict.incomingItem)
        return {
          conflictId: conflict.id,
          strategy,
          success: true,
          resolvedItem: merged,
          action: 'merged_data'
        }

      case 'rename':
        const renamed = {
          ...conflict.incomingItem,
          id: `${conflict.incomingItem.id}_conflict_resolved_${Date.now()}`
        }
        return {
          conflictId: conflict.id,
          strategy,
          success: true,
          resolvedItem: renamed,
          action: 'renamed_incoming'
        }

      case 'use_latest_version':
        const existingVersion = this.parseVersion(conflict.existingItem.version)
        const incomingVersion = this.parseVersion(conflict.incomingItem.version)
        const useIncoming = this.compareVersions(incomingVersion, existingVersion) > 0
        
        return {
          conflictId: conflict.id,
          strategy,
          success: true,
          resolvedItem: useIncoming ? conflict.incomingItem : conflict.existingItem,
          action: useIncoming ? 'used_newer_version' : 'kept_older_version'
        }

      case 'use_latest_timestamp':
        const existingTime = new Date(conflict.existingItem.usage?.createdAt || 0).getTime()
        const incomingTime = new Date(conflict.incomingItem.usage?.createdAt || 0).getTime()
        const useIncomingTime = incomingTime > existingTime
        
        return {
          conflictId: conflict.id,
          strategy,
          success: true,
          resolvedItem: useIncomingTime ? conflict.incomingItem : conflict.existingItem,
          action: useIncomingTime ? 'used_newer_item' : 'kept_older_item'
        }

      default:
        throw new Error(`Unknown conflict resolution strategy: ${strategy}`)
    }
  }

  private mergeItems(existing: any, incoming: any): any {
    // 간단한 병합 로직 (실제로는 더 정교한 병합 필요)
    const merged = { ...existing }

    // 메타데이터 병합 (incoming 우선, 하지만 사용 통계는 existing 유지)
    if (incoming.metadata) {
      merged.metadata = {
        ...existing.metadata,
        ...incoming.metadata
      }
    }

    // 프롬프트 구조는 incoming 우선
    if (incoming.promptStructure) {
      merged.promptStructure = incoming.promptStructure
    }

    // 생성 설정은 incoming 우선
    if (incoming.generationSettings) {
      merged.generationSettings = incoming.generationSettings
    }

    // 사용 통계는 existing 유지 (더 정확한 데이터)
    if (existing.usage) {
      merged.usage = existing.usage
    }

    // 버전은 더 높은 것 사용
    const existingVersion = this.parseVersion(existing.version)
    const incomingVersion = this.parseVersion(incoming.version)
    if (this.compareVersions(incomingVersion, existingVersion) > 0) {
      merged.version = incoming.version
    }

    return merged
  }

  private parseVersion(version: string): [number, number, number] {
    const parts = version.split('.').map(Number)
    return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
  }

  private compareVersions(a: [number, number, number], b: [number, number, number]): number {
    for (let i = 0; i < 3; i++) {
      if (a[i] > b[i]) return 1
      if (a[i] < b[i]) return -1
    }
    return 0
  }

  private sortConflictsByPriority(
    conflicts: DataConflict[],
    priorityRules?: Array<{ condition: (conflict: DataConflict) => boolean; strategy: ConflictResolutionStrategy }>
  ): DataConflict[] {
    return conflicts.sort((a, b) => {
      // 심각도 우선
      const severityOrder = { critical: 3, major: 2, minor: 1 }
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff

      // 타입 우선순위
      const typeOrder = { 
        ID_CONFLICT: 4, 
        VERSION_CONFLICT: 3, 
        REFERENCE_CONFLICT: 2, 
        DATA_CONFLICT: 1, 
        TIMESTAMP_CONFLICT: 0 
      }
      const typeDiff = typeOrder[b.type] - typeOrder[a.type]
      if (typeDiff !== 0) return typeDiff

      return 0
    })
  }
}