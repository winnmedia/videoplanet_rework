/**
 * @fileoverview Marp PDF 생성 서비스 테스트
 * @description Puppeteer를 사용한 서버사이드 PDF 생성 테스트 (TDD)
 * @layer shared
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import type { 
  MarpPdfConfig,
  MarpExportRequest 
} from '@/entities/video-planning/model/marp-export.schema'

import { 
  MarpPdfService,
  generatePdfFromMarkdown,
  createPdfBuffer,
  validatePdfOutput 
} from './marp-pdf-service'

// Puppeteer 모킹
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(() => Promise.resolve({
      newPage: vi.fn(() => Promise.resolve({
        setContent: vi.fn(),
        pdf: vi.fn(() => Promise.resolve(Buffer.from('fake-pdf-content'))),
        close: vi.fn()
      })),
      close: vi.fn()
    }))
  }
}))

// Marp 모킹
vi.mock('@marp-team/marp-core', () => ({
  Marp: vi.fn(() => ({
    render: vi.fn(() => Promise.resolve({
      html: '<html><body>Test HTML</body></html>',
      css: 'body { margin: 0; }'
    }))
  }))
}))

describe('MarpPdfService', () => {
  let service: MarpPdfService

  beforeEach(() => {
    service = new MarpPdfService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('generatePdf', () => {
    it('마크다운에서 PDF를 생성한다', async () => {
      const markdown = `---
marp: true
theme: default
---

# Test Slide
Content here`

      const config: MarpPdfConfig = {
        format: 'A4',
        landscape: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        scale: 1.0,
        timeout: 30000
      }

      const result = await service.generatePdf(markdown, config)

      expect(result.success).toBe(true)
      expect(result.pdfBuffer).toBeInstanceOf(Buffer)
      expect(result.metadata).toMatchObject({
        pageCount: expect.any(Number),
        fileSize: expect.any(Number),
        processingTimeMs: expect.any(Number)
      })
    })

    it('잘못된 마크다운에 대해 에러를 반환한다', async () => {
      const invalidMarkdown = '' // 빈 마크다운

      const config: MarpPdfConfig = {
        format: 'A4',
        landscape: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        scale: 1.0,
        timeout: 30000
      }

      const result = await service.generatePdf(invalidMarkdown, config)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.pdfBuffer).toBeUndefined()
    })

    it('타임아웃 설정을 적용한다', async () => {
      const markdown = `---
marp: true
---
# Test`

      const config: MarpPdfConfig = {
        format: 'A4',
        landscape: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        timeout: 5000 // 5초 타임아웃
      }

      const startTime = Date.now()
      await service.generatePdf(markdown, config)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(6000) // 6초 미만
    })

    it('고품질(300 DPI) 설정을 적용한다', async () => {
      const markdown = `---
marp: true
---
# Test`

      const highQualityConfig: MarpPdfConfig = {
        format: 'A4',
        landscape: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        scale: 2.0, // 300 DPI 위한 스케일 업
        timeout: 30000
      }

      const result = await service.generatePdf(markdown, highQualityConfig)

      expect(result.success).toBe(true)
      expect(result.metadata?.fileSize).toBeGreaterThan(0)
    })
  })

  describe('generateFromExportRequest', () => {
    const mockExportRequest: MarpExportRequest = {
      projectTitle: '테스트 프로젝트',
      fourStagesPlan: {
        id: 'stages-1',
        projectTitle: '테스트 프로젝트',
        stages: [
          {
            id: 'stage-1',
            title: '기',
            content: '시작',
            goal: '관심 유도',
            duration: '10초',
            order: 1
          },
          {
            id: 'stage-2',
            title: '승',
            content: '전개',
            goal: '몰입',
            duration: '20초',
            order: 2
          },
          {
            id: 'stage-3',
            title: '전',
            content: '절정',
            goal: '클라이맥스',
            duration: '20초',
            order: 3
          },
          {
            id: 'stage-4',
            title: '결',
            content: '마무리',
            goal: 'CTA',
            duration: '10초',
            order: 4
          }
        ],
        totalDuration: '60초',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      twelveShotsPlan: {
        id: 'shots-1',
        projectTitle: '테스트 프로젝트',
        shots: [
          {
            id: 'shot-1',
            order: 1,
            title: '오프닝',
            description: '시작 장면',
            shotType: '와이드샷',
            cameraMove: '고정',
            composition: '정면',
            duration: 5,
            dialogue: '',
            subtitle: '',
            audio: 'BGM',
            transition: '페이드인'
          }
        ],
        insertShots: [],
        totalDuration: 60,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      options: {
        format: 'A4',
        orientation: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        theme: 'vridge-professional',
        includePageNumbers: true,
        includeMetadata: true,
        includeInserts: false,
        includeStoryboard: false,
        dpi: 300,
        quality: 'high',
        brandingOptions: {}
      }
    }

    it('영상 기획 요청에서 PDF를 생성한다', async () => {
      const result = await service.generateFromExportRequest(mockExportRequest)

      expect(result.success).toBe(true)
      expect(result.pdfBuffer).toBeInstanceOf(Buffer)
      expect(result.filename).toContain('테스트 프로젝트')
      expect(result.filename).toContain('.pdf')
    })

    it('파일명을 안전하게 생성한다', async () => {
      const requestWithSpecialChars: MarpExportRequest = {
        ...mockExportRequest,
        projectTitle: '특수문자/포함\\제목:테스트*프로젝트?'
      }

      const result = await service.generateFromExportRequest(requestWithSpecialChars)

      expect(result.success).toBe(true)
      expect(result.filename).toMatch(/^[\w\s\-가-힣]+\.pdf$/) // 안전한 파일명
      expect(result.filename).not.toContain('/')
      expect(result.filename).not.toContain('\\')
      expect(result.filename).not.toContain(':')
      expect(result.filename).not.toContain('*')
      expect(result.filename).not.toContain('?')
    })
  })
})

describe('generatePdfFromMarkdown', () => {
  it('독립 함수로 PDF를 생성한다', async () => {
    const markdown = `---
marp: true
---
# Test Slide`

    const config: MarpPdfConfig = {
      format: 'A4',
      landscape: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
    }

    const result = await generatePdfFromMarkdown(markdown, config)

    expect(result.success).toBe(true)
    expect(result.pdfBuffer).toBeInstanceOf(Buffer)
  })
})

describe('createPdfBuffer', () => {
  it('HTML에서 PDF 버퍼를 생성한다', async () => {
    const html = '<html><body><h1>Test</h1></body></html>'
    const config: MarpPdfConfig = {
      format: 'A4',
      landscape: true,
      margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' }
    }

    const buffer = await createPdfBuffer(html, config)

    expect(buffer).toBeInstanceOf(Buffer)
    expect(buffer.length).toBeGreaterThan(0)
  })
})

describe('validatePdfOutput', () => {
  it('유효한 PDF 버퍼를 검증한다', () => {
    // PDF 헤더로 시작하는 가짜 버퍼
    const validPdfBuffer = Buffer.concat([
      Buffer.from('%PDF-1.4'),
      Buffer.from('fake content')
    ])

    const result = validatePdfOutput(validPdfBuffer)

    expect(result.isValid).toBe(true)
    expect(result.fileSize).toBe(validPdfBuffer.length)
  })

  it('잘못된 PDF 버퍼를 거부한다', () => {
    const invalidBuffer = Buffer.from('not a pdf')

    const result = validatePdfOutput(invalidBuffer)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('유효하지 않은 PDF')
  })

  it('빈 버퍼를 거부한다', () => {
    const emptyBuffer = Buffer.alloc(0)

    const result = validatePdfOutput(emptyBuffer)

    expect(result.isValid).toBe(false)
    expect(result.error).toContain('빈 PDF')
  })
})