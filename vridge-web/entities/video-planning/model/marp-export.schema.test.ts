/**
 * @fileoverview Marp PDF Export Schema 테스트
 * @description Zod 스키마 검증 테스트 (TDD)
 * @layer entities
 */

import { describe, it, expect } from 'vitest'
import { 
  MarpExportRequestSchema, 
  MarpExportOptionsSchema,
  MarpPdfConfigSchema 
} from './marp-export.schema'

describe('Marp Export Schema Validation', () => {
  describe('MarpExportOptionsSchema', () => {
    it('유효한 옵션을 검증한다', () => {
      const validOptions = {
        format: 'A4' as const,
        orientation: 'landscape' as const,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        theme: 'vridge-professional',
        includePageNumbers: true,
        includeMetadata: true,
        dpi: 300,
        quality: 'high' as const
      }

      expect(() => MarpExportOptionsSchema.parse(validOptions)).not.toThrow()
    })

    it('잘못된 format을 거부한다', () => {
      const invalidOptions = {
        format: 'INVALID',
        orientation: 'landscape',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      }

      expect(() => MarpExportOptionsSchema.parse(invalidOptions)).toThrow()
    })

    it('잘못된 orientation을 거부한다', () => {
      const invalidOptions = {
        format: 'A4',
        orientation: 'INVALID',
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      }

      expect(() => MarpExportOptionsSchema.parse(invalidOptions)).toThrow()
    })

    it('음수 DPI를 거부한다', () => {
      const invalidOptions = {
        format: 'A4' as const,
        orientation: 'landscape' as const,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        dpi: -100
      }

      expect(() => MarpExportOptionsSchema.parse(invalidOptions)).toThrow()
    })

    it('기본값을 적용한다', () => {
      const minimalOptions = {
        format: 'A4' as const,
        orientation: 'landscape' as const,
        margins: { top: 0, bottom: 0, left: 0, right: 0 }
      }

      const result = MarpExportOptionsSchema.parse(minimalOptions)
      
      expect(result.theme).toBe('vridge-professional')
      expect(result.includePageNumbers).toBe(true)
      expect(result.includeMetadata).toBe(true)
      expect(result.dpi).toBe(300)
      expect(result.quality).toBe('high')
    })
  })

  describe('MarpExportRequestSchema', () => {
    it('완전한 영상 기획 데이터를 검증한다', () => {
      const validRequest = {
        projectTitle: '브랜드 비디오 기획서',
        fourStagesPlan: {
          id: 'stages-1',
          projectTitle: '브랜드 비디오 기획서',
          stages: [
            {
              id: 'stage-1',
              title: '기',
              content: '상황 설정 및 배경 소개',
              goal: '시청자의 관심 유도',
              duration: '15초',
              order: 1
            },
            {
              id: 'stage-2', 
              title: '승',
              content: '문제 상황 발생 및 갈등 전개',
              goal: '몰입도 증가',
              duration: '20초',
              order: 2
            },
            {
              id: 'stage-3',
              title: '전',
              content: '해결 방안 제시 및 클라이맥스',
              goal: '핵심 메시지 전달',
              duration: '15초',
              order: 3
            },
            {
              id: 'stage-4',
              title: '결',
              content: '마무리 및 행동 유도',
              goal: 'CTA 제시',
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
          projectTitle: '브랜드 비디오 기획서',
          shots: [
            {
              id: 'shot-1',
              order: 1,
              title: '오프닝 샷',
              description: '브랜드 로고 등장',
              shotType: '클로즈업' as const,
              cameraMove: '줌인' as const,
              composition: '정면' as const,
              duration: 3,
              dialogue: '',
              subtitle: '브랜드명 표시',
              audio: 'BGM 시작',
              transition: '페이드인' as const
            }
          ],
          insertShots: [],
          totalDuration: 60,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        options: {
          format: 'A4' as const,
          orientation: 'landscape' as const,
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
          includeInserts: true,
          includeStoryboard: false
        }
      }

      expect(() => MarpExportRequestSchema.parse(validRequest)).not.toThrow()
    })

    it('필수 필드 누락을 감지한다', () => {
      const incompleteRequest = {
        projectTitle: '브랜드 비디오 기획서'
        // fourStagesPlan과 twelveShotsPlan 누락
      }

      expect(() => MarpExportRequestSchema.parse(incompleteRequest)).toThrow()
    })

    it('잘못된 stages 데이터를 거부한다', () => {
      const invalidRequest = {
        projectTitle: '브랜드 비디오 기획서',
        fourStagesPlan: {
          id: 'stages-1',
          projectTitle: '브랜드 비디오 기획서',
          stages: [
            {
              // id 필드 누락
              title: '기',
              content: '상황 설정',
              goal: '관심 유도',
              duration: '15초',
              order: 1
            }
          ],
          totalDuration: '60초',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        twelveShotsPlan: {
          id: 'shots-1',
          projectTitle: '브랜드 비디오 기획서',
          shots: [],
          insertShots: [],
          totalDuration: 60,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        options: {
          format: 'A4' as const,
          orientation: 'landscape' as const,
          margins: { top: 0, bottom: 0, left: 0, right: 0 }
        }
      }

      expect(() => MarpExportRequestSchema.parse(invalidRequest)).toThrow()
    })
  })

  describe('MarpPdfConfigSchema', () => {
    it('Puppeteer PDF 설정을 검증한다', () => {
      const validConfig = {
        format: 'A4' as const,
        landscape: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        printBackground: true,
        preferCSSPageSize: false,
        displayHeaderFooter: false,
        scale: 1.0,
        timeout: 30000
      }

      expect(() => MarpPdfConfigSchema.parse(validConfig)).not.toThrow()
    })

    it('잘못된 스케일 값을 거부한다', () => {
      const invalidConfig = {
        format: 'A4' as const,
        landscape: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        scale: 3.0 // 최대 2.0 초과
      }

      expect(() => MarpPdfConfigSchema.parse(invalidConfig)).toThrow()
    })

    it('음수 타임아웃을 거부한다', () => {
      const invalidConfig = {
        format: 'A4' as const,
        landscape: true,
        margin: { top: '0mm', bottom: '0mm', left: '0mm', right: '0mm' },
        timeout: -1000
      }

      expect(() => MarpPdfConfigSchema.parse(invalidConfig)).toThrow()
    })
  })
})