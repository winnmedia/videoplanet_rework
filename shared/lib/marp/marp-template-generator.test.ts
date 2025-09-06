/**
 * @fileoverview Marp 템플릿 생성기 테스트
 * @description TDD를 따른 Marp 마크다운 템플릿 생성 테스트
 * @layer shared
 */

import { describe, it, expect } from 'vitest'
import { 
  MarpTemplateGenerator,
  generateMarpTemplate,
  generateMarpSlides,
  createMarpTheme 
} from './marp-template-generator'
import type { 
  MarpExportRequest,
  FourStagesPlan,
  TwelveShotsPlan 
} from '@/entities/video-planning/model/marp-export.schema'

describe('MarpTemplateGenerator', () => {
  const mockFourStages: FourStagesPlan = {
    id: 'stages-1',
    projectTitle: '브랜드 비디오 기획서',
    stages: [
      {
        id: 'stage-1',
        title: '기',
        content: '상황 설정 및 배경 소개\n관심을 끄는 오프닝',
        goal: '시청자의 관심 유도',
        duration: '15초',
        order: 1
      },
      {
        id: 'stage-2',
        title: '승',
        content: '문제 상황 발생\n갈등과 긴장감 조성',
        goal: '몰입도 증가',
        duration: '20초',
        order: 2
      },
      {
        id: 'stage-3',
        title: '전',
        content: '해결 방안 제시\n클라이맥스 구성',
        goal: '핵심 메시지 전달',
        duration: '15초',
        order: 3
      },
      {
        id: 'stage-4',
        title: '결',
        content: '마무리와 정리\n행동 유도',
        goal: 'CTA 제시',
        duration: '10초',
        order: 4
      }
    ],
    totalDuration: '60초',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  const mockTwelveShots: TwelveShotsPlan = {
    id: 'shots-1',
    projectTitle: '브랜드 비디오 기획서',
    shots: [
      {
        id: 'shot-1',
        order: 1,
        title: '오프닝 로고',
        description: '브랜드 로고 등장과 타이틀',
        shotType: '클로즈업',
        cameraMove: '줌인',
        composition: '정면',
        duration: 3,
        dialogue: '',
        subtitle: '브랜드명 표시',
        audio: 'BGM 시작',
        transition: '페이드인'
      },
      {
        id: 'shot-2',
        order: 2,
        title: '상황 소개',
        description: '일상적인 상황 설정',
        shotType: '와이드샷',
        cameraMove: '팬',
        composition: '3분의 1 법칙',
        duration: 5,
        dialogue: '평범한 하루가 시작되었습니다',
        subtitle: '',
        audio: '자연스러운 환경음',
        transition: '컷'
      }
    ],
    insertShots: [
      {
        id: 'insert-1',
        purpose: '감정 강화',
        description: '주인공의 표정 클로즈업',
        framing: '익스트림 클로즈업',
        notes: '감정 전달에 집중'
      }
    ],
    totalDuration: 60,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z'
  }

  describe('generateMarpTemplate', () => {
    it('완전한 Marp 마크다운을 생성한다', () => {
      const request: MarpExportRequest = {
        projectTitle: '브랜드 비디오 기획서',
        fourStagesPlan: mockFourStages,
        twelveShotsPlan: mockTwelveShots,
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

      const result = generateMarpTemplate(request)

      // Marp 메타데이터 확인
      expect(result).toContain('---')
      expect(result).toContain('marp: true')
      expect(result).toContain('theme: vridge-professional')
      expect(result).toContain('size: A4')
      expect(result).toContain('paginate: true')

      // 프로젝트 제목 확인
      expect(result).toContain('브랜드 비디오 기획서')
      
      // 4단계 구성 확인
      expect(result).toContain('## 🎯 4단계 구성')
      expect(result).toContain('기 단계')
      expect(result).toContain('승 단계')
      expect(result).toContain('전 단계') 
      expect(result).toContain('결 단계')

      // 12개 샷 구성 확인
      expect(result).toContain('## 🎬 12개 샷 구성')
      expect(result).toContain('오프닝 로고')
      expect(result).toContain('상황 소개')

      // 인서트 샷 확인 (includeInserts: true)
      expect(result).toContain('## 🎨 인서트 컷 추천')
      expect(result).toContain('감정 강화')
    })

    it('인서트 샷을 제외할 수 있다', () => {
      const request: MarpExportRequest = {
        projectTitle: '브랜드 비디오 기획서',
        fourStagesPlan: mockFourStages,
        twelveShotsPlan: mockTwelveShots,
        options: {
          format: 'A4',
          orientation: 'landscape',
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          includeInserts: false,
          theme: 'vridge-professional',
          includePageNumbers: true,
          includeMetadata: true,
          includeStoryboard: false,
          dpi: 300,
          quality: 'high',
          brandingOptions: {}
        }
      }

      const result = generateMarpTemplate(request)
      
      expect(result).not.toContain('## 🎨 인서트 컷 추천')
      expect(result).not.toContain('감정 강화')
    })

    it('브랜딩 옵션을 적용한다', () => {
      const request: MarpExportRequest = {
        projectTitle: '브랜드 비디오 기획서',
        fourStagesPlan: mockFourStages,
        twelveShotsPlan: mockTwelveShots,
        options: {
          format: 'A4',
          orientation: 'landscape',
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          theme: 'custom-theme',
          includePageNumbers: true,
          includeMetadata: true,
          includeInserts: true,
          includeStoryboard: false,
          dpi: 300,
          quality: 'high',
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

      const result = generateMarpTemplate(request)
      
      expect(result).toContain('theme: custom-theme')
      expect(result).toContain('--primary-color: #ff6b6b')
      expect(result).toContain('--secondary-color: #4ecdc4')
      expect(result).toContain('--accent-color: #45b7d1')
      expect(result).toContain('--heading-font: Roboto')
      expect(result).toContain('--body-font: Open Sans')
    })
  })

  describe('generateMarpSlides', () => {
    it('4단계 기획을 슬라이드로 변환한다', () => {
      const slides = generateMarpSlides(mockFourStages, mockTwelveShots, {
        includeInserts: true,
        includeStoryboard: false
      })

      expect(slides.length).toBeGreaterThan(0)
      
      // 4단계 슬라이드 확인
      const stageSlide = slides.find(slide => slide.includes('4단계 구성'))
      expect(stageSlide).toBeDefined()
      expect(stageSlide).toContain('기 단계')
      expect(stageSlide).toContain('15초')

      // 12샷 슬라이드 확인
      const shotSlide = slides.find(slide => slide.includes('12개 샷 구성'))
      expect(shotSlide).toBeDefined()
      expect(shotSlide).toContain('오프닝 로고')

      // 인서트 슬라이드 확인
      const insertSlide = slides.find(slide => slide.includes('인서트 컷 추천'))
      expect(insertSlide).toBeDefined()
      expect(insertSlide).toContain('감정 강화')
    })

    it('샷 그리드 레이아웃을 생성한다', () => {
      const slides = generateMarpSlides(mockFourStages, mockTwelveShots, {
        includeInserts: false,
        includeStoryboard: false
      })

      const shotSlide = slides.find(slide => slide.includes('shot-grid'))
      expect(shotSlide).toBeDefined()
      expect(shotSlide).toContain('<div class="shot-grid">')
      expect(shotSlide).toContain('shot-card')
    })
  })

  describe('createMarpTheme', () => {
    it('VRidge 전문가 테마를 생성한다', () => {
      const theme = createMarpTheme({
        colors: {
          primary: '#2563eb',
          secondary: '#64748b', 
          accent: '#f59e0b'
        },
        fonts: {
          heading: 'Noto Sans KR',
          body: 'Noto Sans KR'
        }
      })

      expect(theme).toContain('--primary-color: #2563eb')
      expect(theme).toContain('--secondary-color: #64748b')
      expect(theme).toContain('--accent-color: #f59e0b')
      expect(theme).toContain('--heading-font: Noto Sans KR')
      expect(theme).toContain('--body-font: Noto Sans KR')
      
      // 레이아웃 스타일 확인
      expect(theme).toContain('.shot-grid')
      expect(theme).toContain('display: grid')
      expect(theme).toContain('grid-template-columns')
    })

    it('A4 landscape 설정을 포함한다', () => {
      const theme = createMarpTheme({})

      expect(theme).toContain('section')
      expect(theme).toContain('padding: 2rem')
      expect(theme).toContain('margin: 0')
    })

    it('프린트 최적화 스타일을 포함한다', () => {
      const theme = createMarpTheme({})

      expect(theme).toContain('@media print')
      expect(theme).toContain('break-inside: avoid')
    })
  })

  describe('MarpTemplateGenerator 클래스', () => {
    it('인스턴스를 생성하고 템플릿을 반환한다', () => {
      const generator = new MarpTemplateGenerator()
      const request: MarpExportRequest = {
        projectTitle: '브랜드 비디오 기획서',
        fourStagesPlan: mockFourStages,
        twelveShotsPlan: mockTwelveShots,
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

      const result = generator.generate(request)
      
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
      expect(result).toContain('marp: true')
    })
  })
})