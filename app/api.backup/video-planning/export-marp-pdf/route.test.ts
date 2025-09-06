/**
 * @fileoverview Marp PDF Export API 통합 테스트
 * @description API 엔드포인트 전체 흐름 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST, GET } from './route'
import type { MarpExportRequest } from '@/entities/video-planning/model/marp-export.schema'

// Puppeteer와 Marp 모킹
vi.mock('puppeteer', () => ({
  default: {
    launch: vi.fn(() => Promise.resolve({
      newPage: vi.fn(() => Promise.resolve({
        setViewport: vi.fn(),
        setContent: vi.fn(),
        pdf: vi.fn(() => {
          // 충분히 큰 PDF 버퍼 생성 (1KB 이상)
          const pdfHeader = '%PDF-1.4'
          const pdfContent = 'fake pdf content '.repeat(100) // 반복하여 크기 늘림
          const pdfFooter = '\n%%EOF'
          const fullPdf = pdfHeader + pdfContent + pdfFooter
          return Promise.resolve(Buffer.from(fullPdf))
        }),
        close: vi.fn()
      })),
      close: vi.fn()
    }))
  }
}))

vi.mock('@marp-team/marp-core', () => ({
  Marp: vi.fn(() => ({
    render: vi.fn(() => Promise.resolve({
      html: '<html><body><h1>Test Presentation</h1></body></html>',
      css: 'body { margin: 0; }'
    })),
    themeSet: {
      default: 'default-theme-css'
    }
  }))
}))

describe('Marp PDF Export API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('POST /api/video-planning/export-marp-pdf', () => {
    const validRequest: MarpExportRequest = {
      projectTitle: '테스트 프로젝트',
      fourStagesPlan: {
        id: 'stages-1',
        projectTitle: '테스트 프로젝트',
        stages: [
          {
            id: 'stage-1',
            title: '기',
            content: '도입부',
            goal: '관심 유도',
            duration: '15초',
            order: 1
          },
          {
            id: 'stage-2',
            title: '승',
            content: '전개부',
            goal: '몰입도 증가',
            duration: '20초',
            order: 2
          },
          {
            id: 'stage-3',
            title: '전',
            content: '절정부',
            goal: '핵심 메시지',
            duration: '15초',
            order: 3
          },
          {
            id: 'stage-4',
            title: '결',
            content: '마무리부',
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
          },
          {
            id: 'shot-2',
            order: 2,
            title: '메인 샷',
            description: '주요 내용',
            shotType: '미디엄샷',
            cameraMove: '팬',
            composition: '3분의 1 법칙',
            duration: 10,
            dialogue: '안녕하세요',
            subtitle: '인사',
            audio: '목소리',
            transition: '컷'
          }
        ],
        insertShots: [
          {
            id: 'insert-1',
            purpose: '감정 강화',
            description: '클로즈업',
            framing: '익스트림 클로즈업'
          }
        ],
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
        includeInserts: true,
        includeStoryboard: false,
        dpi: 300,
        quality: 'high',
        brandingOptions: {}
      }
    }

    it('유효한 요청에 대해 PDF를 생성하고 다운로드 URL을 반환한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-planning/export-marp-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(validRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.downloadUrl).toBeDefined()
      expect(data.filename).toContain('테스트')
      expect(data.filename).toContain('.pdf')
      expect(data.fileSize).toBeGreaterThan(0)
      expect(data.metadata).toBeDefined()
      expect(data.metadata?.pageCount).toBeGreaterThan(0)
    })

    it('잘못된 요청 데이터에 대해 400 오류를 반환한다', async () => {
      const invalidRequest = {
        projectTitle: '', // 빈 제목
        // fourStagesPlan과 twelveShotsPlan 누락
      }

      const request = new NextRequest('http://localhost:3000/api/video-planning/export-marp-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invalidRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('입력 데이터 검증 실패')
    })

    it('잘못된 JSON 형식에 대해 500 오류를 반환한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/video-planning/export-marp-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toContain('서버 오류')
    })

    it('요청 프로젝트 제목과 계획 제목이 일치해야 한다', async () => {
      const mismatchedRequest = {
        ...validRequest,
        projectTitle: '다른 제목',
        fourStagesPlan: {
          ...validRequest.fourStagesPlan,
          projectTitle: '원래 제목'
        }
      }

      const request = new NextRequest('http://localhost:3000/api/video-planning/export-marp-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(mismatchedRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('일치해야 합니다')
    })

    it('고품질 옵션이 올바르게 적용된다', async () => {
      const highQualityRequest = {
        ...validRequest,
        options: {
          ...validRequest.options,
          dpi: 600,
          quality: 'ultra' as const
        }
      }

      const request = new NextRequest('http://localhost:3000/api/video-planning/export-marp-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(highQualityRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      // 고품질 설정으로 인해 파일 크기가 더 클 수 있음
      expect(data.fileSize).toBeGreaterThan(0)
    })

    it('브랜딩 옵션이 올바르게 적용된다', async () => {
      const brandedRequest = {
        ...validRequest,
        options: {
          ...validRequest.options,
          brandingOptions: {
            colors: {
              primary: '#ff6b6b',
              secondary: '#4ecdc4',
              accent: '#45b7d1'
            },
            fonts: {
              heading: 'Roboto',
              body: 'Open Sans'
            }
          }
        }
      }

      const request = new NextRequest('http://localhost:3000/api/video-planning/export-marp-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(brandedRequest)
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.downloadUrl).toBeDefined()
    })
  })

  describe('GET /api/video-planning/export-marp-pdf', () => {
    it('API 정보를 반환한다', async () => {
      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.name).toBe('Marp PDF Export API')
      expect(data.version).toBeDefined()
      expect(data.features).toBeInstanceOf(Array)
      expect(data.features).toContain('A4 landscape 형식')
      expect(data.features).toContain('300 DPI 고품질')
      expect(data.usage).toBeDefined()
      expect(data.examples).toBeDefined()
    })

    it('API 사용법 예시를 포함한다', async () => {
      const response = await GET()
      const data = await response.json()

      expect(data.usage.method).toBe('POST')
      expect(data.usage.contentType).toBe('application/json')
      expect(data.usage.requiredFields).toContain('projectTitle')
      expect(data.usage.requiredFields).toContain('fourStagesPlan')
      expect(data.usage.requiredFields).toContain('twelveShotsPlan')
      expect(data.examples.request).toBeDefined()
    })
  })
})

describe('PDF 생성 성능 테스트', () => {
  it('PDF 생성이 합리적인 시간 내에 완료된다', async () => {
    const validRequest: MarpExportRequest = {
      projectTitle: '성능 테스트 프로젝트',
      fourStagesPlan: {
        id: 'stages-perf',
        projectTitle: '성능 테스트 프로젝트',
        stages: Array.from({ length: 4 }, (_, i) => ({
          id: `stage-${i + 1}`,
          title: ['기', '승', '전', '결'][i],
          content: `단계 ${i + 1} 내용`.repeat(100), // 긴 내용
          goal: `목표 ${i + 1}`,
          duration: '15초',
          order: i + 1
        })),
        totalDuration: '60초',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      twelveShotsPlan: {
        id: 'shots-perf',
        projectTitle: '성능 테스트 프로젝트',
        shots: Array.from({ length: 12 }, (_, i) => ({
          id: `shot-${i + 1}`,
          order: i + 1,
          title: `샷 ${i + 1}`,
          description: `샷 설명 ${i + 1}`.repeat(50), // 긴 설명
          shotType: '미디엄샷' as const,
          cameraMove: '고정' as const,
          composition: '정면' as const,
          duration: 5,
          dialogue: '',
          subtitle: '',
          audio: 'BGM',
          transition: '컷' as const
        })),
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

    const request = new NextRequest('http://localhost:3000/api/video-planning/export-marp-pdf', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(validRequest)
    })

    const startTime = Date.now()
    const response = await POST(request)
    const endTime = Date.now()
    const processingTime = endTime - startTime

    expect(response.status).toBe(200)
    expect(processingTime).toBeLessThan(10000) // 10초 미만

    const data = await response.json()
    expect(data.success).toBe(true)
    expect(data.metadata?.processingTimeMs).toBeLessThan(10000)
  }, 15000) // 테스트 타임아웃을 15초로 설정
})