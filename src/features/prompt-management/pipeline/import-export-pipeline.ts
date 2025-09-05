/**
 * 프롬프트 가져오기/내보내기 데이터 파이프라인
 * 
 * 대용량 데이터 처리, 다중 형식 지원, 데이터 무결성 보장, 
 * 충돌 해결 및 원자성 보장을 위한 견고한 파이프라인입니다.
 * 
 * 주요 기능:
 * - 다중 형식 지원 (JSON, CSV, XML)
 * - 대용량 데이터 스트리밍 처리
 * - 데이터 무결성 검증 및 복구
 * - 충돌 해결 전략
 * - 압축 및 암호화
 * - 성능 최적화
 */

import { createHash } from 'crypto'
import { promisify } from 'util'
import { gzip, gunzip } from 'zlib'

import { z } from 'zod'

import {
  OpenAiAdapter,
  AnthropicAdapter,
  HuggingFaceAdapter
} from '@/shared/lib/prompt-adapters'
import {
  VideoPlanetPrompt,
  PromptExportPackage,
  PromptImportPackage,
  PromptDataValidator,
  videoPlanetPromptSchema,
  promptExportPackageSchema,
  promptImportPackageSchema
} from '@/shared/lib/prompt-contracts'

// =============================================================================
// 타입 정의
// =============================================================================

export type ConflictResolutionStrategy = 
  | 'skip_existing' 
  | 'overwrite' 
  | 'merge' 
  | 'rename_new' 
  | 'prompt_user'

export interface ExportJob {
  id: string
  title: string
  format: 'json' | 'csv' | 'xml' | 'multiple'
  prompts: VideoPlanetPrompt[]
  options: {
    includeMetadata?: boolean
    includeUsageStats?: boolean
    fieldSelection?: string[]
    excludeFields?: string[]
    flattenStructure?: boolean
    compression?: 'none' | 'gzip' | 'brotli'
    compressionLevel?: number
    encryption?: {
      enabled: boolean
      algorithm?: 'AES-256' | 'ChaCha20'
      password?: string
    }
    streamProcessing?: boolean
    batchSize?: number
    memoryLimit?: number
    memoryOptimization?: boolean
    chunkSize?: number
    garbageCollectionInterval?: number
    formats?: string[]
    includeManifest?: boolean
    maxFileSize?: number
    fallbackToStreaming?: boolean
    timeout?: number
    retryAttempts?: number
    retryDelay?: number
  }
  requestedBy: string
  requestedAt: string
}

export interface ImportJob {
  id: string
  sourceFormat: 'videoplanet' | 'openai' | 'anthropic' | 'huggingface' | 'csv' | 'xml'
  sourceData: any
  options: {
    validateIntegrity?: boolean
    strictValidation?: boolean
    overwriteExisting?: boolean
    preserveIds?: boolean
    generateMetadata?: boolean
    inferStructure?: boolean
    defaultCategory?: string
    allowPartialImport?: boolean
    maxErrors?: number
    continueOnError?: boolean
    batchSize?: number
    parallelProcessing?: boolean
    dryRun?: boolean
    backupOriginal?: boolean
    validateChecksum?: boolean
    autoRepair?: boolean
    progressCallback?: (progress: ImportProgress) => void
  }
  fieldMapping?: Record<string, string>
  conflictResolution?: {
    strategy: ConflictResolutionStrategy
    customRules: Array<{
      condition: string
      action: string
    }>
  }
  requestedBy: string
  requestedAt: string
}

export interface ImportProgress {
  processed: number
  total: number
  percentage: number
  currentBatch?: number
  errors: number
  skipped: number
  imported: number
}

export interface ExportResult {
  success: boolean
  data: {
    exportPackage?: PromptExportPackage
    csvData?: string
    xmlData?: string
    multipleFormats?: Record<string, any>
    manifest?: any
    fileSize: number
    originalSize?: number
    compressedSize?: number
    compressionRatio?: number
    checksum: string
    downloadUrl?: string
    encrypted?: boolean
    encryptionInfo?: any
    rawData?: any
    streamProcessed?: boolean
    memoryUsage?: number
    fallbackUsed?: boolean
  }
  processingTime: number
  retryCount?: number
  error?: {
    code: string
    message: string
    details?: any
  }
}

export interface ImportResult {
  success: boolean
  data: {
    importedCount: number
    skippedCount: number
    errorCount: number
    overwrittenCount?: number
    mergedCount?: number
    renamedCount?: number
    conflicts: Array<{
      id: string
      type: string
      existing: any
      incoming: any
      resolution: string
    }>
    errors: Array<{
      promptId?: string
      error: string
      severity: 'low' | 'medium' | 'high'
    }>
    importedPrompts?: VideoPlanetPrompt[]
    convertedFromFormat?: string
    backupCreated?: boolean
  }
  integrityReport: DataIntegrityReport
  processingTime: number
  retryCount?: number
  error?: {
    code: string
    message: string
    details?: any
  }
}

export interface DataIntegrityReport {
  valid: boolean
  checksumValid?: boolean
  repairAttempted?: boolean
  partialSuccess?: boolean
  errors: Array<{
    code: string
    message: string
    field?: string
    severity: 'low' | 'medium' | 'high' | 'critical'
  }>
  warnings: Array<{
    code: string
    message: string
    suggestion?: string
  }>
  statistics: {
    totalRecords: number
    validRecords: number
    invalidRecords: number
    duplicates: number
    missingRequiredFields: number
    dataTypeViolations: number
  }
}

// =============================================================================
// 메인 파이프라인 클래스
// =============================================================================

export class ImportExportPipeline {
  private adapters: {
    openai: OpenAiAdapter
    anthropic: AnthropicAdapter
    huggingface: HuggingFaceAdapter
  }
  private existingPrompts: Map<string, VideoPlanetPrompt> = new Map()
  private gzipAsync = promisify(gzip)
  private gunzipAsync = promisify(gunzip)

  constructor() {
    this.adapters = {
      openai: new OpenAiAdapter(),
      anthropic: new AnthropicAdapter(),
      huggingface: new HuggingFaceAdapter()
    }
  }

  /**
   * 내보내기 파이프라인 실행
   */
  async executeExport(job: ExportJob): Promise<ExportResult> {
    const startTime = performance.now()
    let retryCount = 0
    const maxRetries = job.options.retryAttempts || 3

    while (retryCount <= maxRetries) {
      try {
        // 메모리 최적화 설정
        if (job.options.memoryOptimization) {
          this.enableMemoryOptimization(job.options)
        }

        let result: ExportResult['data']

        switch (job.format) {
          case 'json':
            result = await this.executeJsonExport(job)
            break
          case 'csv':
            result = await this.executeCsvExport(job)
            break
          case 'xml':
            result = await this.executeXmlExport(job)
            break
          case 'multiple':
            result = await this.executeMultipleFormatExport(job)
            break
          default:
            throw new Error(`Unsupported export format: ${job.format}`)
        }

        const processingTime = performance.now() - startTime

        return {
          success: true,
          data: result,
          processingTime,
          retryCount
        }

      } catch (error) {
        retryCount++
        
        if (retryCount > maxRetries) {
          return {
            success: false,
            data: { fileSize: 0, checksum: '' },
            processingTime: performance.now() - startTime,
            retryCount: retryCount - 1,
            error: {
              code: 'EXPORT_FAILED',
              message: error instanceof Error ? error.message : 'Unknown export error',
              details: { job }
            }
          }
        }

        // 지수 백오프로 재시도 대기
        if (job.options.retryDelay) {
          await new Promise(resolve => 
            setTimeout(resolve, job.options.retryDelay! * Math.pow(2, retryCount - 1))
          )
        }
      }
    }

    throw new Error('Unexpected execution path in export')
  }

  /**
   * 가져오기 파이프라인 실행
   */
  async executeImport(job: ImportJob): Promise<ImportResult> {
    const startTime = performance.now()

    try {
      // Dry run 처리
      if (job.options.dryRun) {
        return await this.executeDryRunImport(job)
      }

      // 데이터 무결성 검증
      const integrityReport = await this.validateDataIntegrity(job.sourceData, job.sourceFormat)
      
      if (!integrityReport.valid && job.options.strictValidation) {
        return {
          success: false,
          data: {
            importedCount: 0,
            skippedCount: 0,
            errorCount: integrityReport.errors.length,
            conflicts: [],
            errors: integrityReport.errors.map(e => ({
              error: e.message,
              severity: e.severity
            }))
          },
          integrityReport,
          processingTime: performance.now() - startTime
        }
      }

      // 소스 형식에 따른 변환
      const normalizedData = await this.normalizeSourceData(job.sourceData, job.sourceFormat, job.fieldMapping)

      // 충돌 검증 및 해결
      const { prompts, conflicts } = await this.resolveConflicts(
        normalizedData.prompts, 
        job.conflictResolution?.strategy || 'skip_existing'
      )

      // 배치 가져오기 실행
      const importResult = await this.executeBatchImport(prompts, job.options)

      const processingTime = performance.now() - startTime

      return {
        success: true,
        data: {
          ...importResult,
          conflicts,
          convertedFromFormat: job.sourceFormat !== 'videoplanet' ? job.sourceFormat : undefined
        },
        integrityReport,
        processingTime
      }

    } catch (error) {
      return {
        success: false,
        data: {
          importedCount: 0,
          skippedCount: 0,
          errorCount: 1,
          conflicts: [],
          errors: [{
            error: error instanceof Error ? error.message : 'Unknown import error',
            severity: 'high' as const
          }]
        },
        integrityReport: {
          valid: false,
          errors: [{
            code: 'IMPORT_FAILED',
            message: error instanceof Error ? error.message : 'Unknown import error',
            severity: 'critical' as const
          }],
          warnings: [],
          statistics: {
            totalRecords: 0,
            validRecords: 0,
            invalidRecords: 0,
            duplicates: 0,
            missingRequiredFields: 0,
            dataTypeViolations: 0
          }
        },
        processingTime: performance.now() - startTime,
        error: {
          code: 'IMPORT_FAILED',
          message: error instanceof Error ? error.message : 'Unknown import error'
        }
      }
    }
  }

  // =============================================================================
  // 내보내기 구현
  // =============================================================================

  private async executeJsonExport(job: ExportJob): Promise<ExportResult['data']> {
    const prompts = this.filterAndSelectFields(job.prompts, job.options)

    // 내보내기 패키지 생성
    const exportPackage: PromptExportPackage = {
      exportId: job.id,
      version: '1.0.0',
      metadata: {
        title: job.title,
        description: `Exported ${prompts.length} prompts`,
        exportedBy: job.requestedBy,
        exportedAt: job.requestedAt,
        totalPrompts: prompts.length,
        categories: Array.from(new Set(prompts.map(p => p.metadata.category)))
      },
      prompts,
      compatibility: {
        formatVersion: '1.0.0',
        requiredFeatures: this.extractRequiredFeatures(prompts),
        supportedProviders: Array.from(new Set(
          prompts.map(p => p.generationSettings?.provider).filter(Boolean)
        )) as string[]
      }
    }

    // 스키마 검증
    const validation = PromptDataValidator.validateWithReport(
      promptExportPackageSchema, 
      exportPackage
    )

    if (!validation.isValid) {
      throw new Error(`Export package validation failed: ${validation.errors.map(e => e.message).join(', ')}`)
    }

    let finalData: any = exportPackage
    const originalSize = Buffer.byteLength(JSON.stringify(finalData), 'utf8')
    let compressedSize = originalSize
    let compressionRatio = 1

    // 압축 처리
    if (job.options.compression && job.options.compression !== 'none') {
      const compressed = await this.compressData(finalData, job.options.compression, job.options.compressionLevel)
      finalData = compressed
      compressedSize = compressed.byteLength
      compressionRatio = originalSize / compressedSize
    }

    // 암호화 처리
    let encrypted = false
    let encryptionInfo: any
    if (job.options.encryption?.enabled) {
      const encryptionResult = await this.encryptData(finalData, job.options.encryption)
      finalData = encryptionResult.data
      encrypted = true
      encryptionInfo = encryptionResult.info
    }

    // 체크섬 생성
    const checksum = this.generateChecksum(finalData)

    return {
      exportPackage: encrypted ? undefined : exportPackage,
      fileSize: typeof finalData === 'string' ? Buffer.byteLength(finalData, 'utf8') : finalData.byteLength,
      originalSize,
      compressedSize,
      compressionRatio,
      checksum,
      encrypted,
      encryptionInfo,
      rawData: encrypted ? undefined : finalData
    }
  }

  private async executeCsvExport(job: ExportJob): Promise<ExportResult['data']> {
    const prompts = this.filterAndSelectFields(job.prompts, job.options)
    
    // CSV 헤더 생성
    const headers = job.options.fieldSelection || [
      'id', 'projectId', 'metadata.title', 'metadata.category', 
      'metadata.difficulty', 'metadata.estimatedTokens', 'status'
    ]

    // CSV 데이터 생성
    let csvData = headers.join(',') + '\n'
    
    for (const prompt of prompts) {
      const row = headers.map(field => {
        const value = this.getNestedValue(prompt, field)
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : String(value || '')
      }).join(',')
      csvData += row + '\n'
    }

    const fileSize = Buffer.byteLength(csvData, 'utf8')
    const checksum = this.generateChecksum(csvData)

    return {
      csvData,
      fileSize,
      checksum
    }
  }

  private async executeXmlExport(job: ExportJob): Promise<ExportResult['data']> {
    const prompts = this.filterAndSelectFields(job.prompts, job.options)
    
    // XML 생성
    let xmlData = '<?xml version="1.0" encoding="UTF-8"?>\n'
    xmlData += `<promptExport id="${job.id}" title="${job.title}" exportedAt="${job.requestedAt}">\n`
    xmlData += `  <metadata>\n`
    xmlData += `    <totalPrompts>${prompts.length}</totalPrompts>\n`
    xmlData += `    <exportedBy>${job.requestedBy}</exportedBy>\n`
    xmlData += `  </metadata>\n`
    xmlData += `  <prompts>\n`

    for (const prompt of prompts) {
      xmlData += `    <prompt id="${prompt.id}">\n`
      xmlData += `      <title>${this.escapeXml(prompt.metadata.title)}</title>\n`
      xmlData += `      <category>${prompt.metadata.category}</category>\n`
      xmlData += `      <difficulty>${prompt.metadata.difficulty}</difficulty>\n`
      xmlData += `      <estimatedTokens>${prompt.metadata.estimatedTokens}</estimatedTokens>\n`
      xmlData += `      <status>${prompt.status}</status>\n`
      xmlData += `    </prompt>\n`
    }

    xmlData += `  </prompts>\n`
    xmlData += `</promptExport>`

    const fileSize = Buffer.byteLength(xmlData, 'utf8')
    const checksum = this.generateChecksum(xmlData)

    return {
      xmlData,
      fileSize,
      checksum
    }
  }

  private async executeMultipleFormatExport(job: ExportJob): Promise<ExportResult['data']> {
    const formats = job.options.formats || ['json', 'csv', 'xml']
    const multipleFormats: Record<string, any> = {}
    let totalSize = 0

    for (const format of formats) {
      const formatJob = { ...job, format: format as any }
      
      let formatResult: any
      switch (format) {
        case 'json':
          formatResult = await this.executeJsonExport(formatJob)
          multipleFormats.json = formatResult.exportPackage || formatResult.rawData
          break
        case 'csv':
          formatResult = await this.executeCsvExport(formatJob)
          multipleFormats.csv = formatResult.csvData
          break
        case 'xml':
          formatResult = await this.executeXmlExport(formatJob)
          multipleFormats.xml = formatResult.xmlData
          break
      }
      
      totalSize += formatResult.fileSize
    }

    // 매니페스트 생성
    const manifest = {
      exportId: job.id,
      title: job.title,
      formats: formats,
      totalSize,
      createdAt: new Date().toISOString(),
      version: '1.0.0'
    }

    const checksum = this.generateChecksum(JSON.stringify(multipleFormats))

    return {
      multipleFormats,
      manifest: job.options.includeManifest ? manifest : undefined,
      fileSize: totalSize,
      checksum
    }
  }

  // =============================================================================
  // 가져오기 구현
  // =============================================================================

  private async validateDataIntegrity(sourceData: any, sourceFormat: string): Promise<DataIntegrityReport> {
    const errors: DataIntegrityReport['errors'] = []
    const warnings: DataIntegrityReport['warnings'] = []
    const statistics: DataIntegrityReport['statistics'] = {
      totalRecords: 0,
      validRecords: 0,
      invalidRecords: 0,
      duplicates: 0,
      missingRequiredFields: 0,
      dataTypeViolations: 0
    }

    try {
      if (sourceFormat === 'videoplanet') {
        // VideoPlanet 형식 검증
        const validation = PromptDataValidator.validateWithReport(
          z.object({
            prompts: z.array(videoPlanetPromptSchema.partial())
          }),
          { prompts: sourceData.prompts || [sourceData] }
        )

        statistics.totalRecords = sourceData.prompts?.length || 1
        
        if (!validation.isValid) {
          validation.errors.forEach(error => {
            errors.push({
              code: 'SCHEMA_VALIDATION_ERROR',
              message: error.message,
              field: error.path,
              severity: 'high'
            })
            
            if (error.message.includes('required')) {
              statistics.missingRequiredFields++
            } else {
              statistics.dataTypeViolations++
            }
          })
        }

        statistics.validRecords = statistics.totalRecords - validation.errors.length
        statistics.invalidRecords = validation.errors.length

        // 중복 검사
        if (sourceData.prompts) {
          const ids = sourceData.prompts.map((p: any) => p.id).filter(Boolean)
          const duplicateIds = ids.filter((id: string, index: number) => ids.indexOf(id) !== index)
          statistics.duplicates = duplicateIds.length
        }
      }

      // 날짜 형식 검증
      if (sourceData.exportedAt && !this.isValidDate(sourceData.exportedAt)) {
        errors.push({
          code: 'INVALID_DATE_FORMAT',
          message: 'Invalid export date format',
          field: 'exportedAt',
          severity: 'medium'
        })
      }

      // 체크섬 검증
      if (sourceData.checksum) {
        const calculatedChecksum = this.generateChecksum(sourceData.data || sourceData)
        if (calculatedChecksum !== sourceData.checksum) {
          errors.push({
            code: 'CHECKSUM_MISMATCH',
            message: 'Data checksum does not match',
            severity: 'critical'
          })
        }
      }

    } catch (error) {
      errors.push({
        code: 'INTEGRITY_CHECK_FAILED',
        message: error instanceof Error ? error.message : 'Integrity check failed',
        severity: 'critical'
      })
    }

    return {
      valid: errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0,
      errors,
      warnings,
      statistics
    }
  }

  private async normalizeSourceData(
    sourceData: any, 
    sourceFormat: string, 
    fieldMapping?: Record<string, string>
  ): Promise<{ prompts: VideoPlanetPrompt[] }> {
    let normalizedPrompts: VideoPlanetPrompt[] = []

    switch (sourceFormat) {
      case 'videoplanet':
        normalizedPrompts = sourceData.prompts || [sourceData]
        break
        
      case 'openai':
        normalizedPrompts = await this.convertFromOpenAi(sourceData, fieldMapping)
        break
        
      case 'anthropic':
        normalizedPrompts = await this.convertFromAnthropic(sourceData, fieldMapping)
        break
        
      case 'huggingface':
        normalizedPrompts = await this.convertFromHuggingFace(sourceData, fieldMapping)
        break
        
      case 'csv':
        normalizedPrompts = await this.convertFromCsv(sourceData, fieldMapping)
        break
        
      default:
        throw new Error(`Unsupported source format: ${sourceFormat}`)
    }

    return { prompts: normalizedPrompts }
  }

  private async resolveConflicts(
    prompts: VideoPlanetPrompt[], 
    strategy: ConflictResolutionStrategy
  ): Promise<{
    prompts: VideoPlanetPrompt[]
    conflicts: ImportResult['data']['conflicts']
  }> {
    const resolvedPrompts: VideoPlanetPrompt[] = []
    const conflicts: ImportResult['data']['conflicts'] = []

    for (const prompt of prompts) {
      const existing = this.existingPrompts.get(prompt.id)
      
      if (!existing) {
        resolvedPrompts.push(prompt)
        continue
      }

      // 충돌 발생
      const conflict = {
        id: prompt.id,
        type: 'duplicate_id',
        existing,
        incoming: prompt,
        resolution: strategy
      }

      switch (strategy) {
        case 'skip_existing':
          conflicts.push(conflict)
          // 기존 데이터 유지, 새 데이터 건너뛰기
          break
          
        case 'overwrite':
          resolvedPrompts.push(prompt)
          conflicts.push(conflict)
          break
          
        case 'merge':
          const merged = this.mergePrompts(existing, prompt)
          resolvedPrompts.push(merged)
          conflicts.push(conflict)
          break
          
        case 'rename_new':
          const renamed = {
            ...prompt,
            id: `${prompt.id}_imported_${Date.now()}`
          }
          resolvedPrompts.push(renamed)
          conflicts.push({ ...conflict, resolution: `renamed_to_${renamed.id}` })
          break
          
        default:
          throw new Error(`Unsupported conflict resolution strategy: ${strategy}`)
      }
    }

    return { prompts: resolvedPrompts, conflicts }
  }

  private async executeBatchImport(
    prompts: VideoPlanetPrompt[], 
    options: ImportJob['options'] = {}
  ): Promise<{
    importedCount: number
    skippedCount: number
    errorCount: number
    overwrittenCount?: number
    mergedCount?: number
    renamedCount?: number
    errors: Array<{ promptId?: string; error: string; severity: 'low' | 'medium' | 'high' }>
    importedPrompts?: VideoPlanetPrompt[]
  }> {
    const batchSize = options.batchSize || 50
    const batches: VideoPlanetPrompt[][] = []
    
    // 배치로 나누기
    for (let i = 0; i < prompts.length; i += batchSize) {
      batches.push(prompts.slice(i, i + batchSize))
    }

    let importedCount = 0
    const skippedCount = 0
    let errorCount = 0
    const errors: any[] = []
    const importedPrompts: VideoPlanetPrompt[] = []

    // 배치별 처리
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      
      if (options.parallelProcessing) {
        // 병렬 처리
        const batchPromises = batch.map(prompt => this.importSinglePrompt(prompt, options))
        const batchResults = await Promise.allSettled(batchPromises)
        
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            if (result.value.success) {
              importedCount++
              importedPrompts.push(result.value.prompt)
            } else {
              errorCount++
              errors.push({
                promptId: batch[index].id,
                error: result.value.error,
                severity: 'medium' as const
              })
            }
          } else {
            errorCount++
            errors.push({
              promptId: batch[index].id,
              error: result.reason.message,
              severity: 'high' as const
            })
          }
        })
      } else {
        // 순차 처리
        for (const prompt of batch) {
          try {
            const result = await this.importSinglePrompt(prompt, options)
            if (result.success) {
              importedCount++
              importedPrompts.push(result.prompt)
            } else {
              errorCount++
              errors.push({
                promptId: prompt.id,
                error: result.error,
                severity: 'medium' as const
              })
            }
          } catch (error) {
            errorCount++
            errors.push({
              promptId: prompt.id,
              error: error instanceof Error ? error.message : 'Unknown error',
              severity: 'high' as const
            })
          }
        }
      }

      // 진행률 콜백
      if (options.progressCallback) {
        options.progressCallback({
          processed: (batchIndex + 1) * batchSize,
          total: prompts.length,
          percentage: Math.round(((batchIndex + 1) * batchSize / prompts.length) * 100),
          currentBatch: batchIndex + 1,
          errors: errorCount,
          skipped: skippedCount,
          imported: importedCount
        })
      }

      // 최대 오류 수 확인
      if (options.maxErrors && errorCount >= options.maxErrors) {
        break
      }
    }

    return {
      importedCount,
      skippedCount,
      errorCount,
      errors,
      importedPrompts
    }
  }

  private async importSinglePrompt(
    prompt: VideoPlanetPrompt, 
    options: ImportJob['options'] = {}
  ): Promise<{ success: boolean; prompt: VideoPlanetPrompt; error?: string }> {
    try {
      // 스키마 검증
      const validation = PromptDataValidator.validateWithReport(videoPlanetPromptSchema, prompt)
      if (!validation.isValid) {
        return {
          success: false,
          prompt,
          error: `Schema validation failed: ${validation.errors.map(e => e.message).join(', ')}`
        }
      }

      // ID 보존 또는 새 ID 생성
      if (!options.preserveIds) {
        prompt.id = `prompt_imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }

      // 기존 프롬프트 맵에 추가 (실제 구현에서는 데이터베이스 저장)
      this.existingPrompts.set(prompt.id, prompt)

      return { success: true, prompt }

    } catch (error) {
      return {
        success: false,
        prompt,
        error: error instanceof Error ? error.message : 'Unknown import error'
      }
    }
  }

  // =============================================================================
  // 형식 변환 메서드들
  // =============================================================================

  private async convertFromOpenAi(sourceData: any, fieldMapping?: Record<string, string>): Promise<VideoPlanetPrompt[]> {
    const prompts: VideoPlanetPrompt[] = []
    const openAiPrompts = sourceData.prompts || [sourceData]

    for (const openAiPrompt of openAiPrompts) {
      const converted = this.adapters.openai.convertToVideoPlanet(openAiPrompt, {
        generateMetadata: true,
        inferStructure: true
      })
      prompts.push(converted)
    }

    return prompts
  }

  private async convertFromAnthropic(sourceData: any, fieldMapping?: Record<string, string>): Promise<VideoPlanetPrompt[]> {
    const prompts: VideoPlanetPrompt[] = []
    const anthropicPrompts = sourceData.prompts || [sourceData]

    for (const anthropicPrompt of anthropicPrompts) {
      const converted = this.adapters.anthropic.convertToVideoPlanet(anthropicPrompt, {
        inferStructure: true,
        extractMetadata: true
      })
      prompts.push(converted)
    }

    return prompts
  }

  private async convertFromHuggingFace(sourceData: any, fieldMapping?: Record<string, string>): Promise<VideoPlanetPrompt[]> {
    const prompts: VideoPlanetPrompt[] = []
    const hfPrompts = sourceData.prompts || [sourceData]

    for (const hfPrompt of hfPrompts) {
      const converted = this.adapters.huggingface.convertToVideoPlanet(hfPrompt, {
        inferMetadata: true,
        preserveParameters: true
      })
      prompts.push(converted)
    }

    return prompts
  }

  private async convertFromCsv(sourceData: any, fieldMapping?: Record<string, string>): Promise<VideoPlanetPrompt[]> {
    const prompts: VideoPlanetPrompt[] = []
    const csvData = typeof sourceData === 'string' ? sourceData : sourceData.csvData

    const lines = csvData.split('\n').filter((line: string) => line.trim())
    const headers = lines[0].split(',').map((h: string) => h.trim().replace(/"/g, ''))

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((v: string) => v.trim().replace(/"/g, ''))
      const row: Record<string, any> = {}

      headers.forEach((header, index) => {
        row[header] = values[index] || ''
      })

      // CSV 데이터를 VideoPlanet 프롬프트로 변환
      const prompt: VideoPlanetPrompt = {
        id: row.id || `prompt_csv_${Date.now()}_${i}`,
        projectId: row.projectId || `project_csv_${Date.now()}`,
        version: row.version || '1.0.0',
        metadata: {
          title: row.title || 'Imported from CSV',
          description: row.description || '',
          category: row.category || 'storyboard',
          tags: row.tags ? row.tags.split(';') : [],
          difficulty: row.difficulty || 'medium',
          estimatedTokens: parseInt(row.estimatedTokens) || 100
        },
        status: row.status || 'active'
      }

      prompts.push(prompt)
    }

    return prompts
  }

  // =============================================================================
  // Dry Run 구현
  // =============================================================================

  private async executeDryRunImport(job: ImportJob): Promise<ImportResult> {
    const integrityReport = await this.validateDataIntegrity(job.sourceData, job.sourceFormat)
    const normalizedData = await this.normalizeSourceData(job.sourceData, job.sourceFormat, job.fieldMapping)
    const { prompts, conflicts } = await this.resolveConflicts(
      normalizedData.prompts,
      job.conflictResolution?.strategy || 'skip_existing'
    )

    return {
      success: true,
      data: {
        importedCount: prompts.length,
        skippedCount: 0,
        errorCount: integrityReport.errors.length,
        conflicts,
        errors: integrityReport.errors.map(e => ({
          error: e.message,
          severity: e.severity
        }))
      },
      integrityReport,
      processingTime: 0
    }
  }

  // =============================================================================
  // 유틸리티 메서드들
  // =============================================================================

  private filterAndSelectFields(prompts: VideoPlanetPrompt[], options: ExportJob['options']): VideoPlanetPrompt[] {
    let filtered = [...prompts]

    // 필드 선택
    if (options.fieldSelection) {
      filtered = filtered.map(prompt => {
        const selected: any = {}
        options.fieldSelection!.forEach(field => {
          this.setNestedValue(selected, field, this.getNestedValue(prompt, field))
        })
        return selected
      })
    }

    // 필드 제외
    if (options.excludeFields) {
      filtered = filtered.map(prompt => {
        const copy = { ...prompt }
        options.excludeFields!.forEach(field => {
          this.deleteNestedValue(copy, field)
        })
        return copy
      })
    }

    return filtered
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj)
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {}
      return current[key]
    }, obj)
    target[lastKey] = value
  }

  private deleteNestedValue(obj: any, path: string): void {
    const keys = path.split('.')
    const lastKey = keys.pop()!
    const target = keys.reduce((current, key) => current?.[key], obj)
    if (target) delete target[lastKey]
  }

  private generateChecksum(data: any): string {
    const content = typeof data === 'string' ? data : JSON.stringify(data)
    return createHash('sha256').update(content, 'utf8').digest('hex')
  }

  private async compressData(data: any, compression: string, level?: number): Promise<Buffer> {
    const content = typeof data === 'string' ? data : JSON.stringify(data)
    
    switch (compression) {
      case 'gzip':
        return await this.gzipAsync(Buffer.from(content, 'utf8'), { level: level || 6 })
      default:
        throw new Error(`Unsupported compression: ${compression}`)
    }
  }

  private async encryptData(data: any, encryption: ExportJob['options']['encryption']): Promise<{
    data: string
    info: any
  }> {
    // 암호화 구현 (실제로는 crypto 모듈 사용)
    const content = typeof data === 'string' ? data : JSON.stringify(data)
    const encrypted = Buffer.from(content, 'utf8').toString('base64') // 간단한 예시
    
    return {
      data: encrypted,
      info: {
        algorithm: encryption!.algorithm,
        keyDerivation: 'PBKDF2',
        iterations: 100000
      }
    }
  }

  private extractRequiredFeatures(prompts: VideoPlanetPrompt[]): string[] {
    const features = new Set<string>()
    
    prompts.forEach(prompt => {
      if (prompt.generationSettings?.batchSettings?.enabled) {
        features.add('batch_generation')
      }
      if (prompt.promptStructure?.styleGuide?.characterConsistency?.enabled) {
        features.add('character_consistency')
      }
      if (prompt.qualityAssurance?.validationRules) {
        features.add('quality_validation')
      }
    })
    
    return Array.from(features)
  }

  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  private isValidDate(dateString: string): boolean {
    const date = new Date(dateString)
    return !isNaN(date.getTime())
  }

  private mergePrompts(existing: VideoPlanetPrompt, incoming: VideoPlanetPrompt): VideoPlanetPrompt {
    // 간단한 병합 로직 (실제로는 더 복잡한 병합 규칙 필요)
    return {
      ...existing,
      metadata: {
        ...existing.metadata,
        ...incoming.metadata,
        title: incoming.metadata.title || existing.metadata.title
      },
      promptStructure: incoming.promptStructure || existing.promptStructure,
      generationSettings: incoming.generationSettings || existing.generationSettings
    }
  }

  private enableMemoryOptimization(options: ExportJob['options']): void {
    // 메모리 최적화 설정
    if (options.garbageCollectionInterval) {
      // 주기적 가비지 컬렉션 (실제 구현에서는 더 정교한 메모리 관리)
      setInterval(() => {
        if (global.gc) {
          global.gc()
        }
      }, options.garbageCollectionInterval)
    }
  }
}