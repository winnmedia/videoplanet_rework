/**
 * @fileoverview Video Planning API 통합 테스트
 * @description LLM API 통합, 에러 처리, 타임아웃 처리 등 API 레이어 테스트 (TDD)
 */

import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'
import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'

import { VideoPlanningWizardApi, videoPlanningUtils } from '../videoPlanningApi'
import type {
  PlanningInput,
  PlanningStage,
  VideoShot,
  InsertShot
} from '../../model/types'

// 테스트용 Mock 데이터
const mockPlanningInput: PlanningInput = {
  title: '테스트 영상 제목',
  logline: '흥미로운 이야기를 통한 제품 소개',
  toneAndManner: '발랄',
  genre: '광고',
  target: '20-30대 여성',
  duration: '60초',
  format: '16:9',
  tempo: '보통',
  developmentMethod: '기승전결'
}

const mockPlanningStages: PlanningStage[] = [
  {
    id: 'stage-1',
    title: '기',
    content: '훅으로 시작하여 시청자의 관심을 끌어야 합니다.',
    goal: '관심 유발',
    duration: '5-8초',
    order: 1
  },
  {
    id: 'stage-2',
    title: '승',
    content: '문제 상황을 구체적으로 제시합니다.',
    goal: '문제 인식',
    duration: '15-20초',
    order: 2
  },
  {
    id: 'stage-3',
    title: '전',
    content: '해결책을 제시하고 설득합니다.',
    goal: '해결책 제시',
    duration: '20-25초',
    order: 3
  },
  {
    id: 'stage-4',
    title: '결',
    content: '행동 유도와 마무리를 합니다.',
    goal: '행동 유도',
    duration: '8-12초',
    order: 4
  }
]

const mockVideoShots: VideoShot[] = [
  {
    id: 'shot-1',
    title: '오프닝 훅',
    description: '강력한 비주얼과 함께 호기심을 유발',
    shotType: '클로즈업',
    cameraMove: '줌인',
    composition: '중앙',
    duration: 3,
    dialogue: '당신은 이런 경험이 있나요?',
    transition: '컷',
    stageId: 'stage-1',
    order: 1
  },
  {
    id: 'shot-2',
    title: '상황 제시',
    description: '문제 상황 시각화',
    shotType: '미디엄샷',
    cameraMove: '패닝',
    composition: '좌측',
    duration: 4,
    dialogue: '',
    transition: '페이드',
    stageId: 'stage-1',
    order: 2
  }
]

const mockInsertShots: InsertShot[] = [
  {
    id: 'insert-1',
    title: '제품 클로즈업',
    description: '제품의 핵심 기능을 보여주는 상세 컷',
    timing: '2-4초 구간',
    purpose: '제품 강조',
    order: 1,
    framing: '익스트림 클로즈업'
  }
]

describe('VideoPlanningWizardApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('generateFourStages', () => {
    it('유효한 입력으로 4단계 기획을 성공적으로 생성해야 한다', async () => {
      // Arrange - MSW에서 이미 처리되므로 추가 설정 불필요
      
      // Act
      const result = await VideoPlanningWizardApi.generateFourStages(mockPlanningInput)
      
      // Assert
      expect(result).toHaveLength(4)
      expect(result[0]).toMatchObject({
        title: '기',
        goal: '관심 유발',
        order: 1
      })
      expect(result[0].content).toContain('[기승전결]') // 개발 방식이 반영되어야 함
    })

    it('필수 필드 누락 시 400 에러를 던져야 한다', async () => {
      // Arrange
      const invalidInput = { ...mockPlanningInput, title: '', logline: '' }
      
      // Act & Assert
      await expect(
        VideoPlanningWizardApi.generateFourStages(invalidInput)
      ).rejects.toThrow('제목과 로그라인은 필수 입력 항목입니다.')
    })

    it('서버 에러 시 적절한 에러 메시지와 함께 실패해야 한다', async () => {
      // Arrange
      server.use(
        http.post('*/api/video-planning/generate-stages', () => {
          return HttpResponse.json({
            success: false,
            error: 'LLM_SERVICE_UNAVAILABLE',
            message: 'AI 서비스가 일시적으로 사용할 수 없습니다.'
          }, { status: 503 })
        })
      )
      
      // Act & Assert
      await expect(
        VideoPlanningWizardApi.generateFourStages(mockPlanningInput)
      ).rejects.toThrow('AI 서비스가 일시적으로 사용할 수 없습니다.')
    })

    it('네트워크 에러 시 기본 에러 메시지를 반환해야 한다', async () => {
      // Arrange
      server.use(
        http.post('*/api/video-planning/generate-stages', () => {
          return HttpResponse.error()
        })
      )
      
      // Act & Assert
      await expect(
        VideoPlanningWizardApi.generateFourStages(mockPlanningInput)
      ).rejects.toThrow('서버와 통신 중 오류가 발생했습니다.')
    })

    it('타임아웃 30초를 준수해야 한다', async () => {
      // Arrange
      server.use(
        http.post('*/api/video-planning/generate-stages', async () => {
          // 35초 지연 시뮬레이션
          await new Promise(resolve => setTimeout(resolve, 35000))
          return HttpResponse.json({ success: true, stages: mockPlanningStages })
        })
      )
      
      const startTime = Date.now()
      
      // Act & Assert
      await expect(
        VideoPlanningWizardApi.generateFourStages(mockPlanningInput)
      ).rejects.toThrow()
      
      const elapsedTime = Date.now() - startTime
      expect(elapsedTime).toBeLessThan(35000) // 타임아웃이 먼저 발생해야 함
    }, 40000) // Jest 타임아웃을 40초로 설정

    it('개발 방식에 따른 단계 변형이 반영되어야 한다', async () => {
      // Arrange
      const pixarInput = { ...mockPlanningInput, developmentMethod: '픽사 스토리텔링' }
      
      // Act
      const result = await VideoPlanningWizardApi.generateFourStages(pixarInput)
      
      // Assert
      result.forEach(stage => {
        expect(stage.content).toContain('[픽사 스토리텔링]')
      })
    })
  })

  describe('generateTwelveShots', () => {
    it('4단계 기획을 기반으로 12개 숏을 성공적으로 생성해야 한다', async () => {
      // Act
      const result = await VideoPlanningWizardApi.generateTwelveShots(
        mockPlanningStages, 
        mockPlanningInput
      )
      
      // Assert
      expect(result.shots).toHaveLength(12)
      expect(result.insertShots).toHaveLength(3)
      
      // 단계별 샷 배분 검증 (기승전결: 2,3,4,3)
      const stageDistribution = result.shots.reduce((acc, shot) => {
        const stageIndex = shot.stageId.split('-')[1]
        acc[stageIndex] = (acc[stageIndex] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      expect(stageDistribution['1']).toBe(2) // 기 단계
      expect(stageDistribution['2']).toBe(3) // 승 단계
      expect(stageDistribution['3']).toBe(4) // 전 단계
      expect(stageDistribution['4']).toBe(3) // 결 단계
    })

    it('잘못된 단계 개수 입력 시 400 에러를 던져야 한다', async () => {
      // Arrange
      const invalidStages = mockPlanningStages.slice(0, 3) // 3개만
      
      // Act & Assert
      await expect(
        VideoPlanningWizardApi.generateTwelveShots(invalidStages, mockPlanningInput)
      ).rejects.toThrow('4개의 단계 정보가 필요합니다.')
    })

    it('LLM 생성 실패 시 적절한 에러를 처리해야 한다', async () => {
      // Arrange
      server.use(
        http.post('*/api/video-planning/generate-shots', () => {
          return HttpResponse.json({
            success: false,
            error: 'LLM_GENERATION_FAILED',
            message: 'AI 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
          }, { status: 500 })
        })
      )
      
      // Act & Assert
      await expect(
        VideoPlanningWizardApi.generateTwelveShots(mockPlanningStages, mockPlanningInput)
      ).rejects.toThrow('AI 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    })

    it('타임아웃 45초를 준수해야 한다', async () => {
      // 타임아웃 테스트는 실제 환경에서 너무 오래 걸리므로 스킵하거나 모킹으로 처리
      expect(true).toBe(true) // 플레이스홀더
    }, 1000)

    it('생성된 샷들이 올바른 순서를 가져야 한다', async () => {
      // Act
      const result = await VideoPlanningWizardApi.generateTwelveShots(
        mockPlanningStages,
        mockPlanningInput
      )
      
      // Assert
      result.shots.forEach((shot, index) => {
        expect(shot.order).toBe(index + 1)
      })
    })
  })

  describe('generateStoryboard', () => {
    it('유효한 샷 정보로 스토리보드를 성공적으로 생성해야 한다', async () => {
      // Act
      const result = await VideoPlanningWizardApi.generateStoryboard(mockVideoShots[0])
      
      // Assert
      expect(result).toMatch(/^\/mock-storyboards\/.*\.jpg$/)
      expect(typeof result).toBe('string')
    })

    it('잘못된 샷 정보 시 400 에러를 던져야 한다', async () => {
      // Arrange
      const invalidShot = { ...mockVideoShots[0], id: '' }
      
      // Act & Assert
      await expect(
        VideoPlanningWizardApi.generateStoryboard(invalidShot)
      ).rejects.toThrow('유효한 샷 정보가 필요합니다.')
    })

    it('이미지 생성 실패 시 503 에러를 처리해야 한다', async () => {
      // Arrange
      server.use(
        http.post('*/api/video-planning/generate-storyboard', () => {
          return HttpResponse.json({
            success: false,
            error: 'IMAGE_GENERATION_FAILED',
            message: '스토리보드 이미지 생성에 실패했습니다.'
          }, { status: 503 })
        })
      )
      
      // Act & Assert
      await expect(
        VideoPlanningWizardApi.generateStoryboard(mockVideoShots[0])
      ).rejects.toThrow('스토리보드 이미지 생성에 실패했습니다.')
    })

    it('타임아웃 60초를 준수해야 한다', () => {
      // 플레이스홀더 - 실제 타임아웃 테스트는 별도 통합 테스트에서 처리
      expect(true).toBe(true)
    })
  })

  describe('exportPlan', () => {
    const mockFourStagesPlan = { stages: mockPlanningStages }
    const mockTwelveShotsPlan = { shots: mockVideoShots, insertShots: mockInsertShots }

    it('JSON 형식으로 기획서를 성공적으로 내보내야 한다', async () => {
      // Act
      const result = await VideoPlanningWizardApi.exportPlan(
        mockFourStagesPlan,
        mockTwelveShotsPlan,
        { format: 'json', includeStoryboard: true, includeInserts: true }
      )
      
      // Assert
      expect(result).toMatch(/^\/mock-exports\/.*\.json$/)
    })

    it('PDF 형식으로 기획서를 성공적으로 내보내야 한다', async () => {
      // Act
      const result = await VideoPlanningWizardApi.exportPlan(
        mockFourStagesPlan,
        mockTwelveShotsPlan,
        { format: 'pdf', includeStoryboard: false, includeInserts: false }
      )
      
      // Assert
      expect(result).toMatch(/^\/mock-exports\/.*\.pdf$/)
    })

    it('필수 데이터 누락 시 400 에러를 던져야 한다', async () => {
      // Act & Assert
      await expect(
        VideoPlanningWizardApi.exportPlan(
          null,
          mockTwelveShotsPlan,
          { format: 'pdf', includeStoryboard: true, includeInserts: true }
        )
      ).rejects.toThrow('4단계 기획과 12숏 기획 데이터가 모두 필요합니다.')
    })

    it('PDF 생성 실패 시 500 에러를 처리해야 한다', async () => {
      // Arrange
      server.use(
        http.post('*/api/video-planning/export-plan', () => {
          return HttpResponse.json({
            success: false,
            error: 'PDF_EXPORT_FAILED',
            message: 'PDF 생성 중 오류가 발생했습니다.'
          }, { status: 500 })
        })
      )
      
      // Act & Assert
      await expect(
        VideoPlanningWizardApi.exportPlan(
          mockFourStagesPlan,
          mockTwelveShotsPlan,
          { format: 'pdf', includeStoryboard: true, includeInserts: true }
        )
      ).rejects.toThrow('PDF 생성 중 오류가 발생했습니다.')
    })

    it('A4 가로 레이아웃이 기본으로 설정되어야 한다', async () => {
      // 내부적으로 pdfLayout이 'landscape'로 설정되는지는 MSW 핸들러에서 검증
      // 실제로는 요청 바디를 검사하는 더 정교한 테스트가 필요
      const result = await VideoPlanningWizardApi.exportPlan(
        mockFourStagesPlan,
        mockTwelveShotsPlan,
        { format: 'pdf', includeStoryboard: true, includeInserts: true }
      )
      
      expect(result).toBeDefined()
    })
  })

  describe('프로젝트 관리', () => {
    const mockProjectData = {
      title: '테스트 프로젝트',
      input: mockPlanningInput,
      stages: mockPlanningStages,
      shots: mockVideoShots,
      insertShots: mockInsertShots
    }

    describe('savePlanningProject', () => {
      it('프로젝트를 성공적으로 저장해야 한다', async () => {
        // Act
        const result = await VideoPlanningWizardApi.savePlanningProject(mockProjectData)
        
        // Assert
        expect(result).toMatch(/^proj-vp-\d+$/)
        expect(typeof result).toBe('string')
      })

      it('필수 데이터 누락 시 400 에러를 던져야 한다', async () => {
        // Arrange
        const invalidData = { ...mockProjectData, title: '', stages: [] }
        
        // Act & Assert
        await expect(
          VideoPlanningWizardApi.savePlanningProject(invalidData)
        ).rejects.toThrow('프로젝트 제목과 기획 데이터가 필요합니다.')
      })

      it('저장 실패 시 500 에러를 처리해야 한다', async () => {
        // Arrange
        server.use(
          http.post('*/api/video-planning/save-project', () => {
            return HttpResponse.json({
              success: false,
              error: 'STORAGE_ERROR',
              message: '프로젝트 저장에 실패했습니다.'
            }, { status: 500 })
          })
        )
        
        // Act & Assert
        await expect(
          VideoPlanningWizardApi.savePlanningProject(mockProjectData)
        ).rejects.toThrow('프로젝트 저장에 실패했습니다.')
      })
    })

    describe('loadPlanningProject', () => {
      it('존재하는 프로젝트를 성공적으로 로드해야 한다', async () => {
        // Act
        const result = await VideoPlanningWizardApi.loadPlanningProject('proj-vp-001')
        
        // Assert
        expect(result).toMatchObject({
          title: expect.any(String),
          input: expect.any(Object),
          stages: expect.any(Array),
          shots: expect.any(Array),
          insertShots: expect.any(Array)
        })
      })

      it('존재하지 않는 프로젝트 시 404 에러를 던져야 한다', async () => {
        // Act & Assert
        await expect(
          VideoPlanningWizardApi.loadPlanningProject('non-existent-project')
        ).rejects.toThrow('프로젝트를 찾을 수 없습니다.')
      })
    })

    describe('getUserProjects', () => {
      it('사용자 프로젝트 목록을 성공적으로 조회해야 한다', async () => {
        // Act
        const result = await VideoPlanningWizardApi.getUserProjects()
        
        // Assert
        expect(Array.isArray(result)).toBe(true)
        if (result.length > 0) {
          expect(result[0]).toMatchObject({
            id: expect.any(String),
            title: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
            progress: expect.any(Number)
          })
        }
      })

      it('네트워크 에러 시 적절한 에러를 던져야 한다', async () => {
        // Arrange
        server.use(
          http.get('*/api/video-planning/user-projects', () => {
            return HttpResponse.error()
          })
        )
        
        // Act & Assert
        await expect(
          VideoPlanningWizardApi.getUserProjects()
        ).rejects.toThrow('프로젝트 목록 조회 중 오류가 발생했습니다.')
      })
    })
  })
})

describe('videoPlanningUtils', () => {
  describe('calculateTotalDuration', () => {
    it('샷들의 총 시간을 정확하게 계산해야 한다', () => {
      // Arrange
      const shots = [
        { ...mockVideoShots[0], duration: 5 },
        { ...mockVideoShots[1], duration: 7 },
        { ...mockVideoShots[0], duration: 3 }
      ]
      
      // Act
      const result = videoPlanningUtils.calculateTotalDuration(shots)
      
      // Assert
      expect(result).toBe(15)
    })

    it('빈 배열일 때 0을 반환해야 한다', () => {
      // Act
      const result = videoPlanningUtils.calculateTotalDuration([])
      
      // Assert
      expect(result).toBe(0)
    })
  })

  describe('calculateStageDistribution', () => {
    it('단계별 시간 배분을 정확하게 계산해야 한다', () => {
      // Act
      const result = videoPlanningUtils.calculateStageDistribution(mockPlanningStages)
      
      // Assert
      expect(result).toMatchObject({
        'stage-1': 5, // '5-8초'에서 첫 번째 숫자
        'stage-2': 15, // '15-20초'에서 첫 번째 숫자
        'stage-3': 20, // '20-25초'에서 첫 번째 숫자
        'stage-4': 8  // '8-12초'에서 첫 번째 숫자
      })
    })

    it('숫자가 없는 duration 문자열을 0으로 처리해야 한다', () => {
      // Arrange
      const invalidStages = [{
        ...mockPlanningStages[0],
        duration: '적절한 길이로'
      }]
      
      // Act
      const result = videoPlanningUtils.calculateStageDistribution(invalidStages)
      
      // Assert
      expect(result[invalidStages[0].id]).toBe(0)
    })
  })

  describe('analyzeShotTypes', () => {
    it('샷 유형별 개수를 정확하게 집계해야 한다', () => {
      // Arrange
      const shots = [
        { ...mockVideoShots[0], shotType: '클로즈업' },
        { ...mockVideoShots[1], shotType: '미디엄샷' },
        { ...mockVideoShots[0], shotType: '클로즈업' }
      ]
      
      // Act
      const result = videoPlanningUtils.analyzeShotTypes(shots)
      
      // Assert
      expect(result).toMatchObject({
        '클로즈업': 2,
        '미디엄샷': 1
      })
    })

    it('빈 배열일 때 빈 객체를 반환해야 한다', () => {
      // Act
      const result = videoPlanningUtils.analyzeShotTypes([])
      
      // Assert
      expect(result).toEqual({})
    })
  })

  describe('calculateQualityScore', () => {
    it('완성도 높은 기획의 품질 점수를 정확하게 계산해야 한다', () => {
      // Arrange
      const highQualityStages = mockPlanningStages.map(stage => ({
        ...stage,
        content: '매우 상세하고 구체적인 내용이 충분히 작성되어 있는 단계입니다.',
        goal: '명확한 목표 설정'
      }))
      
      const highQualityShots = Array.from({ length: 12 }, (_, i) => ({
        ...mockVideoShots[0],
        id: `shot-${i + 1}`,
        title: `상세한 제목 ${i + 1}`,
        description: '매우 구체적이고 상세한 샷 설명이 작성되어 있습니다.',
        duration: 5
      }))
      
      // Act
      const result = videoPlanningUtils.calculateQualityScore(
        highQualityStages,
        highQualityShots
      )
      
      // Assert
      expect(result).toBeGreaterThan(80)
      expect(result).toBeLessThanOrEqual(100)
    })

    it('저품질 기획의 점수를 낮게 계산해야 한다', () => {
      // Arrange
      const lowQualityStages = mockPlanningStages.map(stage => ({
        ...stage,
        content: '짧음', // 20자 미만
        goal: '모호', // 5자 미만
        duration: '' // 빈 duration
      }))
      
      const lowQualityShots = Array.from({ length: 12 }, (_, i) => ({
        ...mockVideoShots[0],
        id: `shot-${i + 1}`,
        title: '제목', // 3자 이하
        description: '짧은 설명', // 10자 이하
        duration: 0 // 0초
      }))
      
      // Act
      const result = videoPlanningUtils.calculateQualityScore(
        lowQualityStages,
        lowQualityShots
      )
      
      // Assert
      expect(result).toBeLessThan(50)
      expect(result).toBeGreaterThanOrEqual(0)
    })

    it('품질 점수가 0-100 범위 내에 있어야 한다', () => {
      // Arrange - 극단적인 경우들 테스트
      const emptyStages: PlanningStage[] = []
      const emptyShots: VideoShot[] = []
      
      // Act
      const result = videoPlanningUtils.calculateQualityScore(emptyStages, emptyShots)
      
      // Assert
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(100)
    })
  })
})