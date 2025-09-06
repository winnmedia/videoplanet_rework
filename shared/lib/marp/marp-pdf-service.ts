/**
 * @fileoverview Marp PDF 생성 서비스
 * @description Puppeteer와 Marp를 사용한 고품질 PDF 생성 서비스
 * @layer shared
 */

import puppeteer from 'puppeteer'
import { Marp } from '@marp-team/marp-core'
import type {
  MarpPdfConfig,
  MarpExportRequest,
  MarpExportResponse
} from '@/entities/video-planning/model/marp-export.schema'
import { generateMarpTemplate } from './marp-template-generator'

// ============================
// 타입 정의
// ============================

interface PdfGenerationResult {
  success: boolean
  pdfBuffer?: Buffer
  filename?: string
  metadata?: {
    pageCount: number
    fileSize: number
    processingTimeMs: number
    generatedAt: string
  }
  error?: string
}

interface PdfValidationResult {
  isValid: boolean
  fileSize: number
  error?: string
}

// ============================
// Marp PDF 생성 서비스 클래스
// ============================

export class MarpPdfService {
  private marp: Marp
  
  constructor() {
    this.marp = new Marp({
      html: true,
      allowLocalFiles: true,
      markdown: {
        breaks: true,
        typographer: true
      }
    })
    
    // 한글 폰트 지원을 위한 설정
    this.configureFonts()
  }

  /**
   * 마크다운에서 PDF 생성
   */
  async generatePdf(markdown: string, config: MarpPdfConfig): Promise<PdfGenerationResult> {
    const startTime = Date.now()

    try {
      // 입력 검증
      if (!markdown.trim()) {
        return {
          success: false,
          error: '마크다운 내용이 비어있습니다.'
        }
      }

      // Marp로 HTML 렌더링
      const renderResult = await this.marp.render(markdown)
      const html = this.createFullHtml(renderResult.html, renderResult.css)

      // PDF 생성
      const pdfBuffer = await createPdfBuffer(html, config)
      
      // PDF 검증
      const validation = validatePdfOutput(pdfBuffer)
      if (!validation.isValid) {
        return {
          success: false,
          error: validation.error
        }
      }

      const processingTime = Date.now() - startTime

      return {
        success: true,
        pdfBuffer,
        metadata: {
          pageCount: this.estimatePageCount(markdown),
          fileSize: pdfBuffer.length,
          processingTimeMs: processingTime,
          generatedAt: new Date().toISOString()
        }
      }

    } catch (error) {
      return {
        success: false,
        error: `PDF 생성 중 오류가 발생했습니다: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * 영상 기획 요청에서 PDF 생성
   */
  async generateFromExportRequest(request: MarpExportRequest): Promise<PdfGenerationResult> {
    try {
      // Marp 템플릿 생성
      const markdown = generateMarpTemplate(request)
      
      // PDF 설정 생성 (프로젝트명 전달)
      const config = this.createPdfConfig(request, request.projectTitle)
      
      // PDF 생성
      const result = await this.generatePdf(markdown, config)
      
      if (result.success && result.pdfBuffer) {
        // 안전한 파일명 생성
        const filename = this.generateSafeFilename(request.projectTitle)
        
        return {
          ...result,
          filename
        }
      }
      
      return result

    } catch (error) {
      return {
        success: false,
        error: `영상 기획서 PDF 생성 실패: ${error instanceof Error ? error.message : String(error)}`
      }
    }
  }

  /**
   * 한글 폰트 설정
   */
  private configureFonts(): void {
    // Google Fonts에서 한글 폰트 로드
    const fontFaces = `
      @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap');
      
      @font-face {
        font-family: 'Noto Sans KR';
        font-style: normal;
        font-weight: 400;
        src: local('Noto Sans KR'), local('NotoSansKR-Regular');
      }
    `
    
    // themeSet이 존재하고 default 테마가 있는지 확인
    if (this.marp.themeSet && this.marp.themeSet.default) {
      this.marp.themeSet.default = fontFaces + this.marp.themeSet.default
    }
  }

  /**
   * 완전한 HTML 문서 생성
   */
  private createFullHtml(bodyHtml: string, css: string): string {
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>영상 기획서</title>
  <style>
    ${css}
    
    /* 추가 스타일링 */
    body {
      margin: 0;
      padding: 0;
      font-family: 'Noto Sans KR', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: white;
    }
    
    /* 프린트 최적화 */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      
      section {
        page-break-inside: avoid;
        break-inside: avoid;
      }
    }
    
    /* A4 landscape 최적화 */
    @page {
      size: A4 landscape;
      margin: 0;
    }
  </style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`
  }

  /**
   * PDF 설정 생성 (프로젝트명 전달)
   */
  private createPdfConfig(request: MarpExportRequest, projectTitle?: string): MarpPdfConfig {
    const { options } = request
    
    return {
      format: options.format,
      landscape: options.orientation === 'landscape',
      margin: {
        top: `${options.margins.top}mm`,
        bottom: `${options.margins.bottom}mm`,
        left: `${options.margins.left}mm`,
        right: `${options.margins.right}mm`
      },
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: options.includePageNumbers,
      headerTemplate: options.includePageNumbers ? this.getHeaderTemplate() : '',
      footerTemplate: options.includePageNumbers ? this.getFooterTemplate(projectTitle) : '',
      scale: options.dpi >= 300 ? 2.0 : 1.0, // 고해상도를 위한 스케일 조정
      timeout: 60000 // 1분 타임아웃
    }
  }

  /**
   * 페이지 수 추정
   */
  private estimatePageCount(markdown: string): number {
    // 슬라이드 구분자('---') 개수로 페이지 수 추정
    const slideCount = (markdown.match(/^---$/gm) || []).length + 1
    return Math.max(1, slideCount)
  }

  /**
   * 안전한 파일명 생성
   */
  private generateSafeFilename(projectTitle: string): string {
    const timestamp = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const safeName = projectTitle
      .replace(/[\/\\:*?"<>|]/g, '-') // 특수문자 제거
      .replace(/\s+/g, '_') // 공백을 언더스코어로
      .substring(0, 50) // 길이 제한
    
    return `${safeName}_기획서_${timestamp}.pdf`
  }

  /**
   * 헤더 템플릿
   */
  private getHeaderTemplate(): string {
    return `
      <div style="font-size:10px; margin-left:10px; margin-top:5px;">
        <span class="title"></span>
      </div>
    `
  }

  /**
   * 푸터 템플릿 (DoD 규격: "VLANET • {프로젝트명} • {p}/{n}")
   */
  private getFooterTemplate(projectTitle?: string): string {
    const projectName = projectTitle || 'VRidge 프로젝트'
    return `
      <div style="font-size:10px; margin-left:10px; margin-bottom:5px; width:100%; text-align:center; color: #666;">
        VLANET • ${projectName} • <span class="pageNumber"></span> / <span class="totalPages"></span>
      </div>
    `
  }
}

// ============================
// 독립 함수들
// ============================

/**
 * 마크다운에서 PDF 생성 (독립 함수)
 */
export async function generatePdfFromMarkdown(
  markdown: string,
  config: MarpPdfConfig
): Promise<PdfGenerationResult> {
  const service = new MarpPdfService()
  return service.generatePdf(markdown, config)
}

/**
 * HTML에서 PDF 버퍼 생성 (Puppeteer 사용)
 */
export async function createPdfBuffer(html: string, config: MarpPdfConfig): Promise<Buffer> {
  let browser
  
  try {
    // Puppeteer 브라우저 실행
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080'
      ]
    })

    const page = await browser.newPage()
    
    // 뷰포트 설정 (A4 landscape)
    await page.setViewport({
      width: 1190, // A4 landscape width at 72 DPI
      height: 842,  // A4 landscape height at 72 DPI
      deviceScaleFactor: config.scale || 1.0
    })

    // HTML 콘텐츠 설정
    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: config.timeout || 30000
    })

    // PDF 생성
    const pdfBuffer = await page.pdf({
      format: config.format,
      landscape: config.landscape,
      margin: config.margin,
      printBackground: config.printBackground !== false,
      preferCSSPageSize: config.preferCSSPageSize !== false,
      displayHeaderFooter: config.displayHeaderFooter || false,
      headerTemplate: config.headerTemplate || '',
      footerTemplate: config.footerTemplate || '',
      scale: config.scale || 1.0
    })

    return Buffer.from(pdfBuffer)

  } catch (error) {
    throw new Error(`PDF 생성 실패: ${error instanceof Error ? error.message : String(error)}`)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * PDF 출력 검증
 */
export function validatePdfOutput(pdfBuffer: Buffer): PdfValidationResult {
  if (!pdfBuffer || pdfBuffer.length === 0) {
    return {
      isValid: false,
      fileSize: 0,
      error: '빈 PDF 파일입니다.'
    }
  }

  // PDF 헤더 확인 (더 관대하게)
  const pdfHeader = pdfBuffer.subarray(0, 8).toString()
  if (!pdfHeader.includes('%PDF')) {
    return {
      isValid: false,
      fileSize: pdfBuffer.length,
      error: '유효하지 않은 PDF 파일 형식입니다.'
    }
  }

  // 최소 파일 크기 확인 (더 관대하게 - 100바이트 이상)
  if (pdfBuffer.length < 100) {
    return {
      isValid: false,
      fileSize: pdfBuffer.length,
      error: 'PDF 파일이 너무 작습니다.'
    }
  }

  return {
    isValid: true,
    fileSize: pdfBuffer.length
  }
}

/**
 * 영상 기획 요청을 Marp Export Response로 변환
 */
export function createMarpExportResponse(
  result: PdfGenerationResult,
  downloadUrl?: string
): MarpExportResponse {
  if (!result.success) {
    return {
      success: false,
      error: result.error
    }
  }

  return {
    success: true,
    downloadUrl,
    filename: result.filename,
    fileSize: result.metadata?.fileSize,
    metadata: result.metadata ? {
      generatedAt: result.metadata.generatedAt,
      processingTimeMs: result.metadata.processingTimeMs,
      pageCount: result.metadata.pageCount,
      pdfSize: {
        width: 297, // A4 landscape width in mm
        height: 210 // A4 landscape height in mm
      }
    } : undefined
  }
}

// ============================
// 유틸리티 함수들
// ============================

/**
 * 메모리 사용량 모니터링
 */
export function getMemoryUsage(): NodeJS.MemoryUsage {
  return process.memoryUsage()
}

/**
 * PDF 생성 상태 로깅
 */
export function logPdfGeneration(
  projectTitle: string,
  result: PdfGenerationResult
): void {
  const logData = {
    timestamp: new Date().toISOString(),
    project: projectTitle,
    success: result.success,
    fileSize: result.metadata?.fileSize,
    processingTime: result.metadata?.processingTimeMs,
    error: result.error
  }
  
  console.log('PDF Generation:', JSON.stringify(logData, null, 2))
}