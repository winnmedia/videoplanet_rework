/**
 * Mock PDF 어댑터
 * @description 테스트용 가벼운 PDF 생성기
 * @layer shared/lib/marp/adapters
 */

import type {
  IPdfGenerator,
  MarpPdfConfig,
  MarpExportRequest,
  PdfGenerationResult,
  MemoryUsageInfo
} from '../types'

export class MockPdfAdapter implements IPdfGenerator {
  private requestCount = 0
  private readonly mockDelay: number
  private readonly shouldSimulateError: boolean
  private readonly mockMemoryUsage: number

  constructor(options: {
    delay?: number
    simulateError?: boolean
    memoryUsage?: number
  } = {}) {
    this.mockDelay = options.delay ?? 1000 // 1초 지연
    this.shouldSimulateError = options.simulateError ?? false
    this.mockMemoryUsage = options.memoryUsage ?? 50 * 1024 * 1024 // 50MB
  }

  async generatePdf(markdown: string, config: MarpPdfConfig = {}): Promise<PdfGenerationResult> {
    this.requestCount++

    // 지연 시뮬레이션
    await new Promise(resolve => setTimeout(resolve, this.mockDelay))

    // 에러 시뮬레이션
    if (this.shouldSimulateError && this.requestCount % 3 === 0) {
      return {
        success: false,
        error: 'Mock PDF 생성 실패 (시뮬레이션)',
        generatedAt: new Date()
      }
    }

    // Mock PDF 데이터 생성
    const mockPdfBuffer = Buffer.from(`Mock PDF Content for: ${markdown.substring(0, 50)}...`)
    const mockFilename = `mock-export-${Date.now()}.pdf`

    return {
      success: true,
      data: mockPdfBuffer,
      filename: mockFilename,
      size: mockPdfBuffer.length,
      pages: this.calculateMockPages(markdown),
      generatedAt: new Date(),
      cacheHit: false,
      metadata: {
        title: this.extractMockTitle(markdown),
        author: 'Mock Generator',
        subject: 'Test PDF Generation'
      }
    }
  }

  async generateFromExportRequest(request: MarpExportRequest): Promise<PdfGenerationResult> {
    return this.generatePdf(request.markdown, request.config)
  }

  getMemoryUsage(): MemoryUsageInfo {
    return {
      heapUsed: this.mockMemoryUsage,
      heapTotal: this.mockMemoryUsage * 1.5,
      external: this.mockMemoryUsage * 0.1,
      rss: this.mockMemoryUsage * 2,
      timestamp: new Date()
    }
  }

  async clearCache(): Promise<void> {
    // Mock 캐시 정리 - 실제 동작 없음
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  async cleanup(): Promise<void> {
    // Mock 정리 - 실제 동작 없음
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  async healthCheck(): Promise<{ healthy: boolean; message?: string }> {
    return {
      healthy: true,
      message: 'Mock PDF Adapter is running'
    }
  }

  // Private helpers
  private calculateMockPages(markdown: string): number {
    // 마크다운 길이를 기반으로 페이지 수 추정
    const wordsPerPage = 500
    const wordCount = markdown.split(/\s+/).length
    return Math.max(1, Math.ceil(wordCount / wordsPerPage))
  }

  private extractMockTitle(markdown: string): string {
    // 첫 번째 # 헤딩을 제목으로 추출
    const titleMatch = markdown.match(/^#\s+(.+)$/m)
    return titleMatch ? titleMatch[1] : 'Untitled Document'
  }

  // 통계용 메서드
  getRequestCount(): number {
    return this.requestCount
  }

  resetRequestCount(): void {
    this.requestCount = 0
  }
}