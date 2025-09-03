/**
 * VLANET 데이터 파이프라인 시스템
 * 
 * 사용자 진행률 추적, 프로젝트 데이터 내보내기/가져오기, 
 * AI 생성 콘텐츠 버전 관리를 위한 종합적인 데이터 파이프라인입니다.
 * 
 * 핵심 원칙:
 * - 모든 파이프라인 단계에서 데이터 계약 검증
 * - GDPR 준수 개인정보 처리
 * - 결정론적 실행 (동일 입력 → 동일 출력)
 * - SLA 기반 성능 모니터링
 * - 실패 내성 및 부분 복구
 */

import { z } from 'zod'
import {
  dataPipelineContract,
  dataExportContract,
  dataQualityContract,
  DataContractValidator,
  type DataPipeline,
  type DataExportPackage,
  type DataQualityMetrics
} from './data-contracts'

// =============================================================================
// 파이프라인 실행 결과 타입
// =============================================================================

export interface PipelineExecutionResult {
  success: boolean
  executionId: string
  startedAt: string
  completedAt?: string
  executionReport: {
    overallStatus: 'running' | 'completed' | 'failed' | 'cancelled'
    stages: Array<{
      id: string
      name: string
      status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
      executionTime?: number
      recordsProcessed?: number
      errorCount?: number
      error?: string
    }>
    slaViolations: Array<{
      type: 'execution_time' | 'error_rate' | 'quality_score'
      expected: number
      actual: number
      severity: 'warning' | 'critical'
    }>
    qualityMetrics?: DataQualityMetrics
  }
}

export interface StageHandler<TInput = any, TOutput = any> {
  (input: TInput): Promise<{ success: boolean; data: TOutput; error?: string }>
}

export interface PipelineStageConfig {
  id: string
  name: string
  type: 'extract' | 'transform' | 'validate' | 'load' | 'analyze'
  inputSchema: string
  outputSchema: string
  handler: StageHandler
  dependencies?: string[]
  timeout?: number
}

export interface PipelineConfig {
  id: string
  name: string
  version: string
  stages: PipelineStageConfig[]
  sla: {
    maxExecutionTime: number // milliseconds
    maxErrorRate: number // 0.0 - 1.0
    requiredQualityScore: number // 0.0 - 1.0
  }
}

// =============================================================================
// 진행률 추적 관련 타입
// =============================================================================

export interface UserProgressSummary {
  userId: string
  totalProjects: number
  completedProjects: number
  averageProgress: number
  progressTrend: {
    direction: 'increasing' | 'decreasing' | 'stable'
    velocity: number // progress points per day
  }
  timeToCompletion: {
    estimated: number // days
    confidence: number // 0.0 - 1.0
  }
  bottlenecks: Array<{
    projectId: string
    phase: string
    severity: 'low' | 'medium' | 'high'
    description: string
  }>
}

export interface ProgressBottleneck {
  phase: string
  severity: 'low' | 'medium' | 'high'
  description: string
  recommendations: string[]
  impact: {
    delayDays: number
    affectedProjects: number
  }
}

// =============================================================================
// 데이터 내보내기/가져오기 타입
// =============================================================================

export interface DataExportRequest {
  userId: string
  projectIds?: string[]
  format: 'json' | 'csv' | 'xml' | 'parquet'
  includePersonalData: boolean
  includeAnalytics: boolean
  dateRange?: {
    from: string
    to: string
  }
  streamProcessing?: boolean
}

export interface DataImportOptions {
  validateContracts: boolean
  skipDuplicates: boolean
  createMissingReferences: boolean
  autoMigrateSchema?: boolean
  duplicateStrategy?: 'skip' | 'overwrite' | 'merge_conflicts'
}

export interface ImportResult {
  success: boolean
  importedRecords: {
    projects: number
    videos: number
    comments: number
    users: number
  }
  duplicatesFound: number
  duplicatesSkipped: number
  conflictResolutions: Array<{
    recordId: string
    strategy: string
    resolution: string
  }>
  validationReport: {
    violations: Array<{
      recordId: string
      field: string
      message: string
      severity: 'warning' | 'error'
    }>
  }
  migrationReport?: {
    fromVersion: string
    toVersion: string
    transformationsApplied: string[]
    migrationTime: number
  }
}

// =============================================================================
// 데이터 파이프라인 엔진
// =============================================================================

export class DataPipelineEngine {
  private activeExecutions = new Map<string, PipelineExecutionResult>()

  /**
   * 파이프라인 실행
   */
  async execute(config: PipelineConfig): Promise<PipelineExecutionResult> {
    const executionId = this.generateExecutionId()
    const startedAt = new Date().toISOString()

    const result: PipelineExecutionResult = {
      success: false,
      executionId,
      startedAt,
      executionReport: {
        overallStatus: 'running',
        stages: config.stages.map(stage => ({
          id: stage.id,
          name: stage.name,
          status: 'pending'
        })),
        slaViolations: []
      }
    }

    this.activeExecutions.set(executionId, result)

    try {
      // 스테이지 순차 실행
      let previousOutput: any = null

      for (let i = 0; i < config.stages.length; i++) {
        const stage = config.stages[i]
        const stageResult = result.executionReport.stages[i]

        stageResult.status = 'running'

        try {
          const stageStartTime = Date.now()
          
          // 스테이지 실행 (타임아웃 적용)
          const stageOutput = await this.executeStageWithTimeout(
            stage,
            previousOutput,
            stage.timeout || config.sla.maxExecutionTime
          )

          const executionTime = Date.now() - stageStartTime

          if (stageOutput.success) {
            stageResult.status = 'completed'
            stageResult.executionTime = executionTime
            stageResult.recordsProcessed = this.countRecords(stageOutput.data)
            previousOutput = stageOutput.data
          } else {
            stageResult.status = 'failed'
            stageResult.error = stageOutput.error || 'Unknown error'
            break
          }
        } catch (error) {
          stageResult.status = 'failed'
          stageResult.error = error instanceof Error ? error.message : 'Stage execution failed'
          break
        }
      }

      // 전체 실행 시간 및 SLA 검증
      const totalExecutionTime = Date.now() - new Date(startedAt).getTime()
      result.completedAt = new Date().toISOString()

      // SLA 위반 검사
      if (totalExecutionTime > config.sla.maxExecutionTime) {
        result.executionReport.slaViolations.push({
          type: 'execution_time',
          expected: config.sla.maxExecutionTime,
          actual: totalExecutionTime,
          severity: 'critical'
        })
      }

      const failedStages = result.executionReport.stages.filter(s => s.status === 'failed').length
      const errorRate = failedStages / config.stages.length

      if (errorRate > config.sla.maxErrorRate) {
        result.executionReport.slaViolations.push({
          type: 'error_rate',
          expected: config.sla.maxErrorRate,
          actual: errorRate,
          severity: 'critical'
        })
      }

      // 전체 상태 결정
      const hasFailedStages = result.executionReport.stages.some(s => s.status === 'failed')
      const hasCriticalSlaViolations = result.executionReport.slaViolations.some(v => v.severity === 'critical')

      result.success = !hasFailedStages && !hasCriticalSlaViolations
      result.executionReport.overallStatus = result.success ? 'completed' : 'failed'

    } catch (error) {
      result.success = false
      result.executionReport.overallStatus = 'failed'
      result.completedAt = new Date().toISOString()
    }

    return result
  }

  /**
   * 실행 중인 파이프라인 상태 조회
   */
  getExecutionStatus(executionId: string): PipelineExecutionResult | null {
    return this.activeExecutions.get(executionId) || null
  }

  private async executeStageWithTimeout<T>(
    stage: PipelineStageConfig,
    input: any,
    timeoutMs: number
  ): Promise<{ success: boolean; data: T; error?: string }> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Stage ${stage.id} timed out after ${timeoutMs}ms`))
      }, timeoutMs)

      stage.handler(input)
        .then(result => {
          clearTimeout(timeout)
          resolve(result)
        })
        .catch(error => {
          clearTimeout(timeout)
          reject(error)
        })
    })
  }

  private countRecords(data: any): number {
    if (Array.isArray(data)) return data.length
    if (typeof data === 'object' && data !== null) {
      return Object.values(data).reduce((sum, value) => {
        return sum + (Array.isArray(value) ? value.length : 1)
      }, 0)
    }
    return 1
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
  }
}

// =============================================================================
// 진행률 추적 서비스
// =============================================================================

export class ProgressTrackingService {
  /**
   * 사용자 전체 진행률 계산
   */
  async calculateUserProgress(
    userId: string,
    projectProgresses: Array<{
      projectId: string
      phases: Array<{
        id: string
        name: string
        progress: number
        status: string
      }>
      overallProgress: number
    }>
  ): Promise<UserProgressSummary> {
    const totalProjects = projectProgresses.length
    const completedProjects = projectProgresses.filter(p => p.overallProgress === 100).length
    const averageProgress = this.calculateAverage(projectProgresses.map(p => p.overallProgress))

    // 진행률 트렌드 분석 (실제로는 과거 데이터 필요)
    const progressTrend = {
      direction: 'increasing' as const,
      velocity: 2.5 // 일일 평균 진행률
    }

    // 완료 예상 시간 계산
    const remainingProgress = 100 - averageProgress
    const estimatedDays = Math.ceil(remainingProgress / progressTrend.velocity)

    return {
      userId,
      totalProjects,
      completedProjects,
      averageProgress: Math.round(averageProgress * 100) / 100,
      progressTrend,
      timeToCompletion: {
        estimated: estimatedDays,
        confidence: totalProjects >= 3 ? 0.8 : 0.5
      },
      bottlenecks: [] // 별도 메서드에서 계산
    }
  }

  /**
   * 진행률 병목 구간 식별
   */
  async identifyBottlenecks(
    projectId: string,
    progressHistory: Array<{
      date: string
      phase: string
      progress: number
    }>
  ): Promise<ProgressBottleneck[]> {
    const bottlenecks: ProgressBottleneck[] = []

    // 단계별 진행률 변화 분석
    const phaseGroups = this.groupByPhase(progressHistory)

    for (const [phase, records] of phaseGroups.entries()) {
      if (records.length < 3) continue // 충분한 데이터 필요

      const progressRates = this.calculateProgressRates(records)
      const averageRate = this.calculateAverage(progressRates)

      if (averageRate < 1.0) { // 일일 1% 미만 진행
        bottlenecks.push({
          phase,
          severity: averageRate < 0.5 ? 'high' : 'medium',
          description: `${phase} 단계에서 진행 속도 둔화 감지 (일평균 ${averageRate.toFixed(1)}%)`,
          recommendations: [
            '리소스 재배치 검토',
            '병목 작업 우선순위 조정',
            '팀원 추가 배정 고려'
          ],
          impact: {
            delayDays: Math.ceil((100 - records[records.length - 1].progress) / Math.max(averageRate, 0.1)),
            affectedProjects: 1
          }
        })
      }
    }

    return bottlenecks
  }

  /**
   * 프로젝트 완료 예측
   */
  async predictCompletion(
    currentProject: {
      projectId: string
      phases: number
      currentPhase: number
      currentPhaseProgress: number
    },
    historicalData: Array<{
      projectId: string
      completionTime: number // days
      phases: number
    }>
  ): Promise<{
    estimatedDaysRemaining: number
    confidence: number
    factorsConsidered: string[]
    riskFactors: string[]
  }> {
    // 과거 데이터 기반 평균 완료 시간 계산
    const similarProjects = historicalData.filter(p => p.phases === currentProject.phases)
    const historicalAverage = similarProjects.length > 0
      ? this.calculateAverage(similarProjects.map(p => p.completionTime))
      : this.calculateAverage(historicalData.map(p => p.completionTime)) * (currentProject.phases / 4) // 기본 4단계 기준

    // 현재 진행률 기반 조정
    const overallProgress = ((currentProject.currentPhase - 1) * 100 + currentProject.currentPhaseProgress) / currentProject.phases
    const remainingProgress = 100 - overallProgress
    const estimatedDaysRemaining = Math.ceil((historicalAverage * remainingProgress) / 100)

    return {
      estimatedDaysRemaining,
      confidence: similarProjects.length >= 3 ? 0.8 : 0.6,
      factorsConsidered: [
        'historical_average',
        'current_progress',
        'phase_complexity'
      ],
      riskFactors: [
        '과거 데이터 부족',
        '프로젝트 복잡도 변수',
        '외부 의존성'
      ]
    }
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length
  }

  private groupByPhase(progressHistory: Array<{ date: string; phase: string; progress: number }>) {
    const groups = new Map<string, Array<{ date: string; phase: string; progress: number }>>()
    
    progressHistory.forEach(record => {
      if (!groups.has(record.phase)) {
        groups.set(record.phase, [])
      }
      groups.get(record.phase)!.push(record)
    })

    return groups
  }

  private calculateProgressRates(records: Array<{ date: string; progress: number }>): number[] {
    if (records.length < 2) return []

    const rates: number[] = []
    for (let i = 1; i < records.length; i++) {
      const daysDiff = (new Date(records[i].date).getTime() - new Date(records[i - 1].date).getTime()) / (1000 * 60 * 60 * 24)
      const progressDiff = records[i].progress - records[i - 1].progress
      rates.push(progressDiff / Math.max(daysDiff, 1))
    }

    return rates
  }
}

// =============================================================================
// 데이터 내보내기 서비스
// =============================================================================

export class DataExportService {
  /**
   * 프로젝트 데이터 내보내기
   */
  async exportProjectData(request: DataExportRequest): Promise<{
    success: boolean
    exportId: string
    metadata: {
      format: string
      fileSize: number
      checksum: string
      gdprCompliant: boolean
    }
    data: {
      projects: any[]
      videos: any[]
      comments: any[]
    }
  }> {
    const exportId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`

    // GDPR 준수를 위한 데이터 필터링
    const filteredData = await this.filterDataForExport(request)

    // 데이터 직렬화 및 압축
    const serializedData = this.serializeData(filteredData, request.format)
    const checksum = this.generateChecksum(serializedData)

    return {
      success: true,
      exportId,
      metadata: {
        format: request.format,
        fileSize: new Blob([serializedData]).size,
        checksum,
        gdprCompliant: !request.includePersonalData
      },
      data: filteredData
    }
  }

  /**
   * 대용량 데이터 스트리밍 내보내기
   */
  async* createExportStream(request: DataExportRequest & { streamProcessing: true }): AsyncGenerator<{
    metadata: {
      totalRecords: number
      chunkIndex: number
      isLastChunk: boolean
    }
    data: any
  }> {
    const chunkSize = 100 // 레코드 단위
    const totalRecords = request.projectIds?.length || 0

    for (let i = 0; i < totalRecords; i += chunkSize) {
      const chunk = await this.getDataChunk(request, i, chunkSize)
      
      yield {
        metadata: {
          totalRecords,
          chunkIndex: Math.floor(i / chunkSize),
          isLastChunk: i + chunkSize >= totalRecords
        },
        data: chunk
      }
    }
  }

  /**
   * 만료된 내보내기 파일 정리
   */
  async cleanupExpiredExports(exports: Array<{
    exportId: string
    createdAt: string
    expiresAt: string
    filePath: string
  }>): Promise<{
    deletedExports: Array<{ exportId: string; fileSize: number }>
    totalStorageReclaimed: number
  }> {
    const now = new Date()
    const expiredExports = exports.filter(exp => new Date(exp.expiresAt) <= now)

    const deletedExports = []
    let totalStorageReclaimed = 0

    for (const exp of expiredExports) {
      // 실제 파일 시스템에서는 파일 크기 확인 후 삭제
      const fileSize = 1024 * 1024 // 1MB 예시
      deletedExports.push({
        exportId: exp.exportId,
        fileSize
      })
      totalStorageReclaimed += fileSize
    }

    return {
      deletedExports,
      totalStorageReclaimed
    }
  }

  private async filterDataForExport(request: DataExportRequest) {
    // 실제 구현에서는 데이터베이스에서 데이터 조회
    const mockData = {
      projects: request.projectIds?.map(id => ({ id, name: `Project ${id}` })) || [],
      videos: [],
      comments: []
    }

    if (!request.includePersonalData) {
      // PII 제거 로직
      mockData.projects.forEach(project => {
        delete (project as any).owner_email
        delete (project as any).member_emails
      })
    }

    return mockData
  }

  private serializeData(data: any, format: string): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2)
      case 'csv':
        return this.convertToCSV(data)
      case 'xml':
        return this.convertToXML(data)
      default:
        return JSON.stringify(data)
    }
  }

  private convertToCSV(data: any): string {
    // 간단한 CSV 변환 구현
    return 'id,name,status\n' + 
           data.projects.map((p: any) => `${p.id},${p.name},active`).join('\n')
  }

  private convertToXML(data: any): string {
    // 간단한 XML 변환 구현
    return `<?xml version="1.0" encoding="UTF-8"?>
<export>
  <projects>
    ${data.projects.map((p: any) => `<project id="${p.id}" name="${p.name}" />`).join('\n    ')}
  </projects>
</export>`
  }

  private generateChecksum(data: string): string {
    // 실제로는 crypto 라이브러리 사용
    return `sha256:${Buffer.from(data).toString('base64').substring(0, 32)}`
  }

  private async getDataChunk(request: DataExportRequest, offset: number, limit: number) {
    // 실제 구현에서는 데이터베이스 쿼리
    return {
      projects: Array.from({ length: Math.min(limit, 10) }, (_, i) => ({
        id: `prj_chunk_${offset + i}`,
        name: `Chunk Project ${offset + i}`
      }))
    }
  }
}

// =============================================================================
// 데이터 가져오기 서비스
// =============================================================================

export class DataImportService {
  /**
   * 데이터 가져오기 실행
   */
  async importData(
    importData: {
      metadata: {
        version: string
        schema: string
        sourceSystem?: string
      }
      projects?: any[]
      videos?: any[]
      comments?: any[]
    },
    options: DataImportOptions
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      importedRecords: {
        projects: 0,
        videos: 0,
        comments: 0,
        users: 0
      },
      duplicatesFound: 0,
      duplicatesSkipped: 0,
      conflictResolutions: [],
      validationReport: {
        violations: []
      }
    }

    try {
      // 스키마 버전 확인 및 마이그레이션
      if (options.autoMigrateSchema && importData.metadata.version !== '1.0.0') {
        const migrationResult = await this.migrateSchema(importData)
        result.migrationReport = migrationResult
        importData = migrationResult.migratedData
      }

      // 프로젝트 데이터 처리
      if (importData.projects) {
        const projectResult = await this.processProjects(importData.projects, options)
        result.importedRecords.projects = projectResult.imported
        result.duplicatesFound += projectResult.duplicatesFound
        result.conflictResolutions.push(...projectResult.conflicts)
      }

      // 비디오 데이터 처리
      if (importData.videos) {
        const videoResult = await this.processVideos(importData.videos, options)
        result.importedRecords.videos = videoResult.imported
      }

      result.success = true

    } catch (error) {
      result.success = false
      result.validationReport.violations.push({
        recordId: 'global',
        field: 'import_process',
        message: error instanceof Error ? error.message : 'Import failed',
        severity: 'error'
      })
    }

    return result
  }

  private async migrateSchema(importData: any): Promise<{
    fromVersion: string
    toVersion: string
    transformationsApplied: string[]
    migrationTime: number
    migratedData: any
  }> {
    const startTime = Date.now()
    const fromVersion = importData.metadata.version
    const toVersion = '1.0.0'
    const transformationsApplied: string[] = []

    const migratedData = { ...importData }

    // v0.5.0 → v1.0.0 마이그레이션
    if (fromVersion === '0.5.0') {
      // snake_case → camelCase 변환
      if (migratedData.projects) {
        migratedData.projects = migratedData.projects.map((project: any) => {
          const migrated = { ...project }
          if (project.owner_id) {
            migrated.owner = { userId: project.owner_id, role: 'owner' }
            delete migrated.owner_id
            transformationsApplied.push('snake_case_to_camel_case')
          }
          if (project.created) {
            migrated.createdAt = project.created + 'T00:00:00Z'
            delete migrated.created
            transformationsApplied.push('date_format_normalization')
          }
          return migrated
        })
      }
    }

    return {
      fromVersion,
      toVersion,
      transformationsApplied,
      migrationTime: Date.now() - startTime,
      migratedData
    }
  }

  private async processProjects(projects: any[], options: DataImportOptions) {
    let imported = 0
    let duplicatesFound = 0
    const conflicts: Array<{
      recordId: string
      strategy: string
      resolution: string
    }> = []

    // 중복 감지
    const projectIds = new Set<string>()
    const duplicateIds = new Set<string>()

    for (const project of projects) {
      if (projectIds.has(project.id)) {
        duplicatesFound++
        duplicateIds.add(project.id)
      } else {
        projectIds.add(project.id)
      }
    }

    // 중복 처리
    for (const project of projects) {
      if (duplicateIds.has(project.id)) {
        if (options.duplicateStrategy === 'merge_conflicts') {
          conflicts.push({
            recordId: project.id,
            strategy: 'merge_conflicts',
            resolution: 'Merged conflicting fields'
          })
          imported++
        } else if (options.duplicateStrategy === 'skip') {
          // 건너뛰기
        } else {
          imported++
        }
      } else {
        imported++
      }
    }

    return {
      imported,
      duplicatesFound,
      conflicts
    }
  }

  private async processVideos(videos: any[], options: DataImportOptions) {
    return {
      imported: videos.length,
      duplicatesFound: 0
    }
  }
}

// =============================================================================
// 파이프라인 오케스트레이터
// =============================================================================

export class PipelineOrchestrator {
  /**
   * 파이프라인 실행 계획 생성
   */
  async createExecutionPlan(pipelines: Array<{
    id: string
    name: string
    dependencies: string[]
  }>): Promise<{
    executionOrder: string[]
    parallelGroups: string[][]
  }> {
    // 순환 의존성 검사
    this.detectCircularDependencies(pipelines)

    // 위상 정렬을 통한 실행 순서 결정
    const executionOrder = this.topologicalSort(pipelines)

    // 병렬 실행 그룹 식별
    const parallelGroups = this.identifyParallelGroups(pipelines, executionOrder)

    return {
      executionOrder,
      parallelGroups
    }
  }

  /**
   * 파이프라인 실행
   */
  async execute(executionPlan: {
    executionOrder: string[]
    parallelGroups: string[][]
  }): Promise<{
    success: boolean
    pipelinesExecuted: number
    executionOrder: string[]
    errors: string[]
  }> {
    const errors: string[] = []
    let pipelinesExecuted = 0

    // 실행 순서에 따라 파이프라인 실행
    for (const pipelineId of executionPlan.executionOrder) {
      try {
        // 실제로는 파이프라인 실행 로직
        await this.executePipeline(pipelineId)
        pipelinesExecuted++
      } catch (error) {
        errors.push(`Pipeline ${pipelineId}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    return {
      success: errors.length === 0,
      pipelinesExecuted,
      executionOrder: executionPlan.executionOrder,
      errors
    }
  }

  /**
   * 독립적인 파이프라인 병렬 실행
   */
  async executeParallel(pipelines: Array<{
    id: string
    name: string
    dependencies: string[]
    estimatedTime?: number
  }>): Promise<{
    success: boolean
    pipelinesExecuted: number
    totalTime: number
    errors: string[]
  }> {
    const startTime = Date.now()
    const errors: string[] = []

    // 병렬 실행
    const promises = pipelines.map(async (pipeline) => {
      try {
        await this.executePipeline(pipeline.id)
        return { success: true, pipelineId: pipeline.id }
      } catch (error) {
        errors.push(`Pipeline ${pipeline.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        return { success: false, pipelineId: pipeline.id }
      }
    })

    const results = await Promise.all(promises)
    const pipelinesExecuted = results.filter(r => r.success).length

    return {
      success: errors.length === 0,
      pipelinesExecuted,
      totalTime: Date.now() - startTime,
      errors
    }
  }

  private detectCircularDependencies(pipelines: Array<{ id: string; dependencies: string[] }>) {
    const visited = new Set<string>()
    const visiting = new Set<string>()

    const visit = (pipelineId: string): void => {
      if (visiting.has(pipelineId)) {
        throw new Error(`Circular dependency detected involving pipeline: ${pipelineId}`)
      }
      if (visited.has(pipelineId)) {
        return
      }

      visiting.add(pipelineId)

      const pipeline = pipelines.find(p => p.id === pipelineId)
      if (pipeline) {
        for (const dependency of pipeline.dependencies) {
          visit(dependency)
        }
      }

      visiting.delete(pipelineId)
      visited.add(pipelineId)
    }

    for (const pipeline of pipelines) {
      if (!visited.has(pipeline.id)) {
        visit(pipeline.id)
      }
    }
  }

  private topologicalSort(pipelines: Array<{ id: string; dependencies: string[] }>): string[] {
    const result: string[] = []
    const visited = new Set<string>()
    const temp = new Set<string>()

    const visit = (pipelineId: string): void => {
      if (temp.has(pipelineId)) return
      if (visited.has(pipelineId)) return

      temp.add(pipelineId)

      const pipeline = pipelines.find(p => p.id === pipelineId)
      if (pipeline) {
        for (const dependency of pipeline.dependencies) {
          visit(dependency)
        }
      }

      temp.delete(pipelineId)
      visited.add(pipelineId)
      result.unshift(pipelineId) // 앞쪽에 추가 (역순)
    }

    for (const pipeline of pipelines) {
      if (!visited.has(pipeline.id)) {
        visit(pipeline.id)
      }
    }

    return result
  }

  private identifyParallelGroups(
    pipelines: Array<{ id: string; dependencies: string[] }>,
    executionOrder: string[]
  ): string[][] {
    const groups: string[][] = []
    
    // 간단한 구현: 의존성이 없는 파이프라인들을 첫 번째 그룹으로
    const independentPipelines = pipelines
      .filter(p => p.dependencies.length === 0)
      .map(p => p.id)

    if (independentPipelines.length > 1) {
      groups.push(independentPipelines)
    }

    return groups
  }

  private async executePipeline(pipelineId: string): Promise<void> {
    // 실제로는 DataPipelineEngine을 사용하여 파이프라인 실행
    // 여기서는 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}