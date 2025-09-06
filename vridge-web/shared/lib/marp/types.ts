/**
 * PDF 생성 서비스 타입 정의
 * @description PDF 생성 어댑터 인터페이스 및 관련 타입
 * @layer shared/lib/marp
 */

import { z } from 'zod'

// Zod 스키마 정의
export const MarpPdfConfigSchema = z.object({
  format: z.enum(['A4', 'A3', 'Letter']).default('A4'),
  orientation: z.enum(['portrait', 'landscape']).default('landscape'),
  margin: z.object({
    top: z.string().default('20mm'),
    right: z.string().default('20mm'),
    bottom: z.string().default('20mm'),
    left: z.string().default('20mm')
  }).default({}),
  scale: z.number().min(0.1).max(3.0).default(1.0),
  quality: z.number().min(50).max(300).default(150), // DPI
  enableBackground: z.boolean().default(true),
  waitForSelector: z.string().optional(),
  timeout: z.number().min(5000).max(60000).default(30000)
})

export const MarpExportRequestSchema = z.object({
  markdown: z.string().min(1, 'Markdown 내용이 필요합니다'),
  config: MarpPdfConfigSchema.optional(),
  metadata: z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    subject: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    projectId: z.string().optional(),
    version: z.string().optional()
  }).optional(),
  cacheKey: z.string().optional()
})

// 타입 정의
export type MarpPdfConfig = z.infer<typeof MarpPdfConfigSchema>
export type MarpExportRequest = z.infer<typeof MarpExportRequestSchema>

export interface PdfGenerationResult {
  success: boolean
  data?: Buffer
  downloadUrl?: string
  filename?: string
  size?: number
  pages?: number
  generatedAt?: Date
  cacheHit?: boolean
  error?: string
  metadata?: {
    title?: string
    author?: string
    subject?: string
    keywords?: string[]
    projectId?: string
    version?: string
  }
}

export interface MemoryUsageInfo {
  heapUsed: number
  heapTotal: number
  external: number
  rss: number
  timestamp: Date
}

export interface PdfServiceOptions {
  maxMemory?: number // bytes
  timeout?: number // milliseconds
  enableCache?: boolean
  cacheMaxSize?: number
  cacheTTL?: number // milliseconds
  browserPoolSize?: number
}

/**
 * PDF 생성기 인터페이스
 */
export interface IPdfGenerator {
  /**
   * Markdown을 PDF로 생성
   */
  generatePdf(markdown: string, config?: MarpPdfConfig): Promise<PdfGenerationResult>
  
  /**
   * 내보내기 요청으로부터 PDF 생성
   */
  generateFromExportRequest(request: MarpExportRequest): Promise<PdfGenerationResult>
  
  /**
   * 현재 메모리 사용량 조회
   */
  getMemoryUsage(): MemoryUsageInfo
  
  /**
   * 캐시 정리 (선택적)
   */
  clearCache?(): Promise<void>
  
  /**
   * 서비스 정리 (리소스 해제)
   */
  cleanup?(): Promise<void>
  
  /**
   * 헬스 체크
   */
  healthCheck?(): Promise<{ healthy: boolean; message?: string }>
}

/**
 * 캐시 인터페이스
 */
export interface IPdfCache {
  get(key: string): Promise<PdfGenerationResult | null>
  set(key: string, value: PdfGenerationResult, ttl?: number): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
  size(): Promise<number>
}

/**
 * 브라우저 풀 인터페이스
 */
export interface IBrowserPool {
  acquire(): Promise<any> // Puppeteer Browser instance
  release(browser: any): Promise<void>
  destroy(): Promise<void>
  size(): number
  availableCount(): number
  busyCount(): number
}

// 에러 타입
export class PdfGenerationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: any
  ) {
    super(message)
    this.name = 'PdfGenerationError'
  }
}

export class PdfTimeoutError extends PdfGenerationError {
  constructor(timeout: number) {
    super(`PDF 생성이 ${timeout}ms 내에 완료되지 않았습니다`, 'TIMEOUT')
  }
}

export class PdfMemoryError extends PdfGenerationError {
  constructor(memoryUsed: number, memoryLimit: number) {
    super(
      `메모리 사용량(${Math.round(memoryUsed / 1024 / 1024)}MB)이 한계(${Math.round(memoryLimit / 1024 / 1024)}MB)를 초과했습니다`,
      'MEMORY_LIMIT',
      { memoryUsed, memoryLimit }
    )
  }
}

// 성능 메트릭 타입
export interface PdfGenerationMetrics {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  averageGenerationTime: number
  cacheHitRate: number
  memoryUsage: MemoryUsageInfo
  uptime: number
}

// 진행 상황 콜백 타입
export interface PdfGenerationProgress {
  stage: 'initializing' | 'compiling' | 'rendering' | 'generating' | 'finalizing'
  progress: number // 0-100
  message?: string
  estimatedTimeRemaining?: number
}

export type ProgressCallback = (progress: PdfGenerationProgress) => void