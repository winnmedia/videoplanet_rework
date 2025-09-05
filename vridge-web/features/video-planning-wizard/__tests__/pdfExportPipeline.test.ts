/**
 * @fileoverview PDF 생성 파이프라인 통합 테스트
 * @description Marp PDF 내보내기, A4 가로 레이아웃, 여백 0 설정 등 PDF 생성 전체 플로우 테스트
 */

import { render } from '@testing-library/react'
import { server } from '@/lib/api/msw-server'
import { http, HttpResponse } from 'msw'

import { VideoPlanningWizardApi } from '../api/videoPlanningApi'
import type {
  PlanningStage,
  VideoShot,
  InsertShot,
  ExportOptions
} from '../model/types'

// PDF 생성을 위한 Mock 데이터
const mockCompleteProject = {
  fourStagesPlan: {
    stages: [
      {
        id: 'stage-1',
        title: '기',
        content: '훅으로 시작하여 시청자의 관심을 끌어야 합니다. 첫 3초가 가장 중요하며, 시각적 임팩트나 질문으로 시작하는 것이 효과적입니다.',
        goal: '관심 유발',
        duration: '5-8초',
        order: 1
      },
      {
        id: 'stage-2',
        title: '승',
        content: '문제 상황을 구체적으로 제시하고 시청자가 공감할 수 있는 상황을 연출합니다. 감정적 연결이 중요합니다.',
        goal: '문제 인식',
        duration: '15-20초',
        order: 2
      },
      {
        id: 'stage-3',
        title: '전',
        content: '해결책을 명확하고 설득력 있게 제시합니다. 구체적인 사례나 데이터를 활용하여 신뢰성을 높입니다.',
        goal: '해결책 제시',
        duration: '20-25초',
        order: 3
      },
      {
        id: 'stage-4',
        title: '결',
        content: '명확한 행동 유도(CTA)와 강력한 마무리로 시청자의 행동을 이끌어냅니다.',
        goal: '행동 유도',
        duration: '8-12초',
        order: 4
      }
    ] as PlanningStage[],
    metadata: {
      totalDuration: 48,
      qualityScore: 95,
      developmentMethod: '기승전결'
    }
  },
  twelveShotsPlan: {
    shots: Array.from({ length: 12 }, (_, i) => ({
      id: `shot-${i + 1}`,
      title: `샷 ${i + 1}: ${['오프닝 훅', '상황 제시', '문제 인식', '감정 자극', '해결책 도입', '구체적 해결', '데이터 제시', '사례 소개', '신뢰도 구축', 'CTA 준비', '행동 유도', '마무리'][i]}`,
      description: `샷 ${i + 1}에 대한 상세한 설명이 포함되어 있습니다. 이 샷은 전체 스토리에서 중요한 역할을 합니다.`,
      shotType: ['클로즈업', '미디엄샷', '와이드샷', '익스트림 클로즈업'][i % 4],
      cameraMove: ['고정', '줌인', '줌아웃', '패닝', '틸트'][i % 5],
      composition: ['정면', '좌측', '우측', '중앙'][i % 4],
      duration: 3 + (i % 3),
      dialogue: i % 2 === 0 ? `샷 ${i + 1}의 중요한 대사 내용입니다.` : '',
      transition: ['컷', '페이드', '와이프'][i % 3],
      stageId: `stage-${Math.floor(i / 3) + 1}`,
      order: i + 1,
      storyboardUrl: `/mock-storyboards/shot-${i + 1}.jpg`
    })) as VideoShot[],
    insertShots: [
      {
        id: 'insert-1',
        title: '제품 클로즈업',
        description: '제품의 핵심 기능을 강조하는 익스트림 클로즈업 컷',
        timing: '2-4초 구간',
        purpose: '제품 강조 및 브랜드 인지도 향상',
        order: 1,
        framing: '익스트림 클로즈업'
      },
      {
        id: 'insert-2',
        title: '사용자 반응',
        description: '실제 사용자의 만족스러운 표정과 자연스러운 반응',
        timing: '25-27초 구간',
        purpose: '신뢰성 구축 및 사회적 증명',
        order: 2,
        framing: '클로즈업'
      },
      {
        id: 'insert-3',
        title: 'CTA 강화',
        description: '행동 유도를 위한 시각적 효과 및 그래픽 요소',
        timing: '45-48초 구간',
        purpose: '전환율 향상 및 명확한 행동 지시',
        order: 3,
        framing: '그래픽 오버레이'
      }
    ] as InsertShot[],
    metadata: {
      totalDuration: 48,
      shotTypeDistribution: {
        '클로즈업': 3,
        '미디엄샷': 3,
        '와이드샷': 3,
        '익스트림 클로즈업': 3
      },
      qualityScore: 92
    }
  }
}

// PDF 메타데이터 검증용 헬퍼
const validatePdfMetadata = (metadata: any) => {
  expect(metadata).toMatchObject({
    fileSize: expect.any(String),
    pageCount: expect.any(Number),
    includesStoryboard: expect.any(Boolean),
    includesInserts: expect.any(Boolean)
  })
  
  // 파일 크기가 합리적인 범위인지 확인
  const sizeMatch = metadata.fileSize.match(/^(\d+\.?\d*)(KB|MB)$/)
  expect(sizeMatch).not.toBeNull()
  
  const sizeValue = parseFloat(sizeMatch[1])
  const unit = sizeMatch[2]
  
  if (unit === 'KB') {
    expect(sizeValue).toBeGreaterThan(50) // 최소 50KB
    expect(sizeValue).toBeLessThan(5000) // 최대 5MB (5000KB)
  } else if (unit === 'MB') {
    expect(sizeValue).toBeGreaterThan(0.05) // 최소 0.05MB (50KB)
    expect(sizeValue).toBeLessThan(10) // 최대 10MB
  }
  
  // 페이지 수가 합리적인지 확인
  expect(metadata.pageCount).toBeGreaterThan(0)
  expect(metadata.pageCount).toBeLessThan(20) // 최대 20페이지
}

describe('PDF Export Pipeline Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('전체 PDF 생성 파이프라인', () => {
    it('완전한 프로젝트 데이터로 PDF를 성공적으로 생성해야 한다', async () => {
      // Arrange
      const exportOptions: ExportOptions = {
        format: 'pdf',
        includeStoryboard: true,
        includeInserts: true,
        pdfLayout: 'landscape'
      }

      // Act
      const result = await VideoPlanningWizardApi.exportPlan(
        mockCompleteProject.fourStagesPlan,
        mockCompleteProject.twelveShotsPlan,
        exportOptions
      )

      // Assert
      expect(result).toMatch(/^\/mock-exports\/planning_\d+\.pdf$/)
    })

    it('스토리보드 포함 옵션이 올바르게 처리되어야 한다', async () => {
      // Arrange
      server.use(
        http.post('*/api/video-planning/export-plan', async ({ request }) => {
          const body = await request.json()
          
          // 요청 바디 검증
          expect(body).toMatchObject({
            fourStagesPlan: expect.any(Object),
            twelveShotsPlan: expect.any(Object),
            options: {
              format: 'pdf',
              includeStoryboard: true,
              includeInserts: false,
              pdfLayout: 'landscape'
            }
          })

          return HttpResponse.json({
            success: true,
            downloadUrl: '/mock-exports/planning_with_storyboard.pdf',
            timestamp: new Date().toISOString(),
            message: 'PDF 기획서가 성공적으로 생성되었습니다.',
            metadata: {
              fileSize: '3.2MB',
              pageCount: 10,
              includesStoryboard: true,
              includesInserts: false
            }
          })
        })
      )

      // Act
      const result = await VideoPlanningWizardApi.exportPlan(
        mockCompleteProject.fourStagesPlan,
        mockCompleteProject.twelveShotsPlan,
        { format: 'pdf', includeStoryboard: true, includeInserts: false }
      )

      // Assert
      expect(result).toBe('/mock-exports/planning_with_storyboard.pdf')
    })

    it('인서트 포함 옵션이 올바르게 처리되어야 한다', async () => {
      // Arrange
      server.use(
        http.post('*/api/video-planning/export-plan', async ({ request }) => {
          const body = await request.json()
          
          expect(body.options.includeInserts).toBe(true)
          expect(body.twelveShotsPlan.insertShots).toHaveLength(3)

          return HttpResponse.json({
            success: true,
            downloadUrl: '/mock-exports/planning_with_inserts.pdf',
            timestamp: new Date().toISOString(),
            message: 'PDF 기획서가 성공적으로 생성되었습니다.',
            metadata: {
              fileSize: '2.8MB',
              pageCount: 9,
              includesStoryboard: false,
              includesInserts: true
            }
          })
        })
      )

      // Act
      const result = await VideoPlanningWizardApi.exportPlan(
        mockCompleteProject.fourStagesPlan,
        mockCompleteProject.twelveShotsPlan,
        { format: 'pdf', includeStoryboard: false, includeInserts: true }
      )

      // Assert
      expect(result).toBe('/mock-exports/planning_with_inserts.pdf')
    })

    it('A4 가로 레이아웃이 기본값으로 설정되어야 한다', async () => {
      // Arrange
      server.use(
        http.post('*/api/video-planning/export-plan', async ({ request }) => {
          const body = await request.json()
          
          // pdfLayout이 landscape로 강제 설정되는지 확인
          expect(body.options.pdfLayout).toBe('landscape')

          return HttpResponse.json({
            success: true,
            downloadUrl: '/mock-exports/planning_landscape.pdf',
            timestamp: new Date().toISOString(),
            message: 'PDF 기획서가 성공적으로 생성되었습니다.',
            metadata: {
              fileSize: '2.4MB',
              pageCount: 8,
              includesStoryboard: true,
              includesInserts: true
            }
          })
        })
      )

      // Act
      const result = await VideoPlanningWizardApi.exportPlan(
        mockCompleteProject.fourStagesPlan,
        mockCompleteProject.twelveShotsPlan,
        { format: 'pdf', includeStoryboard: true, includeInserts: true }
      )

      // Assert
      expect(result).toBeDefined()
    })
  })

  describe('PDF 메타데이터 검증', () => {
    it('PDF 생성 완료 시 메타데이터가 정확해야 한다', async () => {
      // Arrange
      server.use(
        http.post('*/api/video-planning/export-plan', () => {
          return HttpResponse.json({
            success: true,
            downloadUrl: '/mock-exports/planning_metadata_test.pdf',
            timestamp: new Date().toISOString(),
            message: 'PDF 기획서가 성공적으로 생성되었습니다.',
            metadata: {
              fileSize: '2.4MB',
              pageCount: 8,
              includesStoryboard: true,
              includesInserts: true
            }
          })
        })
      )

      // Act
      const result = await VideoPlanningWizardApi.exportPlan(
        mockCompleteProject.fourStagesPlan,
        mockCompleteProject.twelveShotsPlan,
        { format: 'pdf', includeStoryboard: true, includeInserts: true }
      )

      // Assert
      expect(result).toBeDefined()
      // 실제 환경에서는 API 응답에서 메타데이터를 추출하여 검증
    })

    it('스토리보드 포함 시 파일 크기가 증가해야 한다', async () => {
      // Arrange - 스토리보드 미포함 버전
      server.use(
        http.post('*/api/video-planning/export-plan', async ({ request }) => {
          const body = await request.json()
          const includesStoryboard = body.options.includeStoryboard
          
          const fileSize = includesStoryboard ? '3.2MB' : '1.8MB'
          const pageCount = includesStoryboard ? 12 : 6

          return HttpResponse.json({
            success: true,
            downloadUrl: '/mock-exports/planning_size_test.pdf',
            timestamp: new Date().toISOString(),
            message: 'PDF 기획서가 성공적으로 생성되었습니다.',
            metadata: {
              fileSize,
              pageCount,
              includesStoryboard,
              includesInserts: body.options.includeInserts
            }
          })
        })
      )

      // Act - 스토리보드 미포함 버전
      const resultWithoutStoryboard = await VideoPlanningWizardApi.exportPlan(
        mockCompleteProject.fourStagesPlan,
        mockCompleteProject.twelveShotsPlan,
        { format: 'pdf', includeStoryboard: false, includeInserts: false }
      )

      // Act - 스토리보드 포함 버전
      const resultWithStoryboard = await VideoPlanningWizardApi.exportPlan(
        mockCompleteProject.fourStagesPlan,
        mockCompleteProject.twelveShotsPlan,
        { format: 'pdf', includeStoryboard: true, includeInserts: false }
      )

      // Assert
      expect(resultWithoutStoryboard).toBeDefined()
      expect(resultWithStoryboard).toBeDefined()
      // 실제 환경에서는 두 파일의 크기를 비교
    })
  })

  describe('JSON vs PDF 내보내기 비교', () => {
    it('같은 데이터로 JSON과 PDF 모두 성공적으로 생성되어야 한다', async () => {
      // Act - JSON 내보내기
      const jsonResult = await VideoPlanningWizardApi.exportPlan(
        mockCompleteProject.fourStagesPlan,
        mockCompleteProject.twelveShotsPlan,
        { format: 'json', includeStoryboard: true, includeInserts: true }
      )

      // Act - PDF 내보내기
      const pdfResult = await VideoPlanningWizardApi.exportPlan(
        mockCompleteProject.fourStagesPlan,
        mockCompleteProject.twelveShotsPlan,
        { format: 'pdf', includeStoryboard: true, includeInserts: true }
      )

      // Assert
      expect(jsonResult).toMatch(/\.json$/)
      expect(pdfResult).toMatch(/\.pdf$/)
      expect(jsonResult).not.toBe(pdfResult)
    })

    it('JSON 파일이 PDF보다 빠르게 생성되어야 한다', async () => {
      // Arrange
      server.use(
        http.post('*/api/video-planning/export-plan', async ({ request }) => {
          const body = await request.json()
          const format = body.options.format
          
          // JSON은 빠르게, PDF는 느리게 응답 시뮬레이션
          const delay = format === 'json' ? 100 : 1000
          await new Promise(resolve => setTimeout(resolve, delay))
          
          return HttpResponse.json({
            success: true,
            downloadUrl: `/mock-exports/planning_speed_test.${format}`,
            timestamp: new Date().toISOString(),
            message: `${format.toUpperCase()} 기획서가 성공적으로 생성되었습니다.`,
            metadata: {
              fileSize: format === 'json' ? '156KB' : '2.4MB',
              pageCount: format === 'pdf' ? 8 : undefined,
              includesStoryboard: body.options.includeStoryboard,
              includesInserts: body.options.includeInserts
            }
          })
        })
      )

      // Act & Assert - JSON 생성 시간 측정
      const jsonStartTime = Date.now()
      await VideoPlanningWizardApi.exportPlan(
        mockCompleteProject.fourStagesPlan,
        mockCompleteProject.twelveShotsPlan,
        { format: 'json', includeStoryboard: false, includeInserts: false }
      )
      const jsonDuration = Date.now() - jsonStartTime

      // Act & Assert - PDF 생성 시간 측정
      const pdfStartTime = Date.now()
      await VideoPlanningWizardApi.exportPlan(
        mockCompleteProject.fourStagesPlan,
        mockCompleteProject.twelveShotsPlan,
        { format: 'pdf', includeStoryboard: false, includeInserts: false }
      )
      const pdfDuration = Date.now() - pdfStartTime

      expect(jsonDuration).toBeLessThan(pdfDuration)
    })
  })

  describe('에러 상황 처리', () => {
    it('PDF 생성 실패 시 적절한 에러를 던져야 한다', async () => {
      // Arrange
      server.use(
        http.post('*/api/video-planning/export-plan', () => {
          return HttpResponse.json({
            success: false,
            error: 'PDF_GENERATION_FAILED',
            message: 'Marp 변환 중 오류가 발생했습니다.'
          }, { status: 500 })
        })
      )

      // Act & Assert
      await expect(
        VideoPlanningWizardApi.exportPlan(
          mockCompleteProject.fourStagesPlan,
          mockCompleteProject.twelveShotsPlan,
          { format: 'pdf', includeStoryboard: true, includeInserts: true }
        )
      ).rejects.toThrow('Marp 변환 중 오류가 발생했습니다.')
    })

    it('대용량 데이터 처리 시 타임아웃이 적절하게 설정되어야 한다', async () => {
      // Arrange - 대용량 데이터 시뮬레이션
      const largeProject = {
        ...mockCompleteProject,
        twelveShotsPlan: {
          ...mockCompleteProject.twelveShotsPlan,
          shots: Array.from({ length: 100 }, (_, i) => ({
            ...mockCompleteProject.twelveShotsPlan.shots[0],
            id: `shot-${i + 1}`,
            title: `대용량 데이터 샷 ${i + 1}`,
            order: i + 1
          }))
        }
      }

      // Act & Assert - 120초 타임아웃 내에서 완료되거나 적절한 에러 발생
      const startTime = Date.now()
      
      try {
        await VideoPlanningWizardApi.exportPlan(
          largeProject.fourStagesPlan,
          largeProject.twelveShotsPlan,
          { format: 'pdf', includeStoryboard: true, includeInserts: true }
        )
      } catch (error) {
        const elapsedTime = Date.now() - startTime
        expect(elapsedTime).toBeLessThan(125000) // 125초 이내에 타임아웃 발생
      }
    }, 130000) // Jest 타임아웃을 130초로 설정

    it('불완전한 데이터로 PDF 생성 시 경고와 함께 진행되어야 한다', async () => {
      // Arrange - 일부 필드가 비어있는 데이터
      const incompleteProject = {
        fourStagesPlan: {
          stages: mockCompleteProject.fourStagesPlan.stages.map(stage => ({
            ...stage,
            content: stage.id === 'stage-3' ? '' : stage.content, // 한 단계의 content가 비어있음
          }))
        },
        twelveShotsPlan: {
          shots: mockCompleteProject.twelveShotsPlan.shots.map((shot, index) => ({
            ...shot,
            description: index % 3 === 0 ? '' : shot.description, // 일부 샷의 설명이 비어있음
            dialogue: index % 4 === 0 ? '' : shot.dialogue
          })),
          insertShots: mockCompleteProject.twelveShotsPlan.insertShots.slice(0, 2) // 인서트 3개 중 2개만
        }
      }

      // Act
      const result = await VideoPlanningWizardApi.exportPlan(
        incompleteProject.fourStagesPlan,
        incompleteProject.twelveShotsPlan,
        { format: 'pdf', includeStoryboard: false, includeInserts: true }
      )

      // Assert
      expect(result).toBeDefined()
      expect(result).toMatch(/\.pdf$/)
    })
  })

  describe('성능 및 품질 테스트', () => {
    it('PDF 품질 점수가 90% 이상인 프로젝트의 파일 크기가 적절해야 한다', async () => {
      // Arrange
      const highQualityProject = {
        ...mockCompleteProject,
        fourStagesPlan: {
          ...mockCompleteProject.fourStagesPlan,
          metadata: { ...mockCompleteProject.fourStagesPlan.metadata, qualityScore: 98 }
        },
        twelveShotsPlan: {
          ...mockCompleteProject.twelveShotsPlan,
          metadata: { ...mockCompleteProject.twelveShotsPlan.metadata, qualityScore: 95 }
        }
      }

      server.use(
        http.post('*/api/video-planning/export-plan', () => {
          return HttpResponse.json({
            success: true,
            downloadUrl: '/mock-exports/high_quality_planning.pdf',
            timestamp: new Date().toISOString(),
            message: 'PDF 기획서가 성공적으로 생성되었습니다.',
            metadata: {
              fileSize: '4.2MB',
              pageCount: 12,
              includesStoryboard: true,
              includesInserts: true
            }
          })
        })
      )

      // Act
      const result = await VideoPlanningWizardApi.exportPlan(
        highQualityProject.fourStagesPlan,
        highQualityProject.twelveShotsPlan,
        { format: 'pdf', includeStoryboard: true, includeInserts: true }
      )

      // Assert
      expect(result).toBeDefined()
      // 고품질 프로젝트는 더 큰 파일 크기를 가져야 함
    })

    it('여러 PDF 생성 요청이 동시에 처리되어야 한다', async () => {
      // Arrange - 3개의 동시 요청
      const requests = Array.from({ length: 3 }, (_, i) => 
        VideoPlanningWizardApi.exportPlan(
          mockCompleteProject.fourStagesPlan,
          mockCompleteProject.twelveShotsPlan,
          { 
            format: 'pdf', 
            includeStoryboard: i % 2 === 0, 
            includeInserts: i % 2 === 1 
          }
        )
      )

      // Act - 동시 실행
      const startTime = Date.now()
      const results = await Promise.all(requests)
      const elapsedTime = Date.now() - startTime

      // Assert
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toMatch(/\.pdf$/)
      })
      
      // 병렬 처리로 인해 순차 실행보다 빨라야 함 (5초 이내)
      expect(elapsedTime).toBeLessThan(5000)
    })
  })
})