/**
 * @fileoverview 프롬프트 템플릿 관리자 테스트
 * @description TDD 방식으로 프롬프트 템플릿 시스템 검증
 */

import { describe, it, expect } from 'vitest'
import { PromptTemplateManager } from '../api/promptTemplates'
import type { StoryGenerationRequest } from '../model/types'

describe('PromptTemplateManager', () => {
  const mockRequest: StoryGenerationRequest = {
    genre: '광고',
    target: '20-30대 여성',
    duration: 60,
    concept: '신제품 런칭 캠페인',
    mood: '활기차고 젊은 느낌'
  }

  describe('buildPrompt', () => {
    it('광고 장르에 대해 올바른 프롬프트를 생성해야 한다', () => {
      const prompt = PromptTemplateManager.buildPrompt(mockRequest)
      
      expect(prompt).toContain('광고 영상 4단계 스토리 구조')
      expect(prompt).toContain('20-30대 여성')
      expect(prompt).toContain('60초')
      expect(prompt).toContain('신제품 런칭 캠페인')
      expect(prompt).toContain('활기차고 젊은 느낌')
      expect(prompt).toContain('어텐션')
      expect(prompt).toContain('인터레스트')
      expect(prompt).toContain('디자이어')
      expect(prompt).toContain('액션')
    })

    it('드라마 장르에 대해 올바른 프롬프트를 생성해야 한다', () => {
      const dramaRequest = { ...mockRequest, genre: '드라마' as const }
      const prompt = PromptTemplateManager.buildPrompt(dramaRequest)
      
      expect(prompt).toContain('드라마 영상 4단계 스토리 구조')
      expect(prompt).toContain('발단')
      expect(prompt).toContain('전개')
      expect(prompt).toContain('절정')
      expect(prompt).toContain('결말')
    })

    it('다큐멘터리 장르에 대해 올바른 프롬프트를 생성해야 한다', () => {
      const docuRequest = { ...mockRequest, genre: '다큐멘터리' as const }
      const prompt = PromptTemplateManager.buildPrompt(docuRequest)
      
      expect(prompt).toContain('다큐멘터리 영상 4단계 스토리 구조')
      expect(prompt).toContain('문제 제기')
      expect(prompt).toContain('현황 분석')
      expect(prompt).toContain('핵심 내용')
      expect(prompt).toContain('결론')
    })

    it('지원하지 않는 장르에 대해 에러를 던져야 한다', () => {
      const invalidRequest = { ...mockRequest, genre: '무협' as any }
      
      expect(() => PromptTemplateManager.buildPrompt(invalidRequest)).toThrow(
        '지원하지 않는 장르입니다: 무협'
      )
    })

    it('시간 배분이 총 시간과 일치해야 한다', () => {
      const prompt = PromptTemplateManager.buildPrompt(mockRequest)
      
      // 프롬프트에서 duration_N 값들을 추출
      const durationMatches = prompt.match(/"duration": "(\d+)초"/g)
      expect(durationMatches).toHaveLength(4)
      
      const durations = durationMatches!.map(match => 
        parseInt(match.match(/(\d+)/)?.[1] || '0')
      )
      
      const totalCalculated = durations.reduce((sum, dur) => sum + dur, 0)
      expect(totalCalculated).toBe(mockRequest.duration)
    })
  })

  describe('calculateTimeDistribution', () => {
    it('광고 장르는 디자이어 단계에 더 많은 시간을 할당해야 한다', () => {
      const prompt = PromptTemplateManager.buildPrompt(mockRequest)
      
      // 광고는 3번째 단계(디자이어)가 가장 길어야 함
      const durations = extractDurations(prompt)
      expect(durations[2]).toBeGreaterThanOrEqual(durations[0])
      expect(durations[2]).toBeGreaterThanOrEqual(durations[3])
    })

    it('드라마 장르는 전개 단계에 더 많은 시간을 할당해야 한다', () => {
      const dramaRequest = { ...mockRequest, genre: '드라마' as const }
      const prompt = PromptTemplateManager.buildPrompt(dramaRequest)
      
      // 드라마는 2번째 단계(전개)가 가장 길어야 함  
      const durations = extractDurations(prompt)
      expect(durations[1]).toBeGreaterThanOrEqual(durations[0])
      expect(durations[1]).toBeGreaterThanOrEqual(durations[3])
    })

    it('다큐멘터리 장르는 현황 분석 단계에 더 많은 시간을 할당해야 한다', () => {
      const docuRequest = { ...mockRequest, genre: '다큐멘터리' as const }
      const prompt = PromptTemplateManager.buildPrompt(docuRequest)
      
      // 다큐는 2번째 단계(현황 분석)가 가장 길어야 함
      const durations = extractDurations(prompt)
      expect(durations[1]).toBeGreaterThanOrEqual(durations[0])
      expect(durations[1]).toBeGreaterThanOrEqual(durations[3])
    })
  })

  describe('getSupportedGenres', () => {
    it('지원되는 모든 장르를 반환해야 한다', () => {
      const genres = PromptTemplateManager.getSupportedGenres()
      
      expect(genres).toContain('광고')
      expect(genres).toContain('드라마') 
      expect(genres).toContain('다큐멘터리')
      expect(genres).toHaveLength(3)
    })
  })

  describe('getTemplateInfo', () => {
    it('유효한 장르에 대해 템플릿 정보를 반환해야 한다', () => {
      const info = PromptTemplateManager.getTemplateInfo('광고')
      
      expect(info).toBeDefined()
      expect(info?.genre).toBe('광고')
      expect(info?.estimatedTokens).toBeGreaterThan(0)
      expect(info?.description).toBeDefined()
    })

    it('무효한 장르에 대해 null을 반환해야 한다', () => {
      const info = PromptTemplateManager.getTemplateInfo('무협' as any)
      
      expect(info).toBeNull()
    })
  })

  describe('estimateTokenCount', () => {
    it('입력 내용에 따라 토큰 수를 추정해야 한다', () => {
      const tokenCount = PromptTemplateManager.estimateTokenCount(mockRequest)
      
      expect(tokenCount).toBeGreaterThan(300) // 기본 토큰
      expect(tokenCount).toBeLessThan(500)    // 합리적인 상한
    })

    it('더 긴 입력에 대해 더 많은 토큰을 추정해야 한다', () => {
      const shortRequest = {
        ...mockRequest,
        concept: '짧은 컨셉',
        target: '일반',
        mood: '밝은'
      }
      
      const longRequest = {
        ...mockRequest,
        concept: '매우 길고 복잡한 컨셉으로 다양한 요소들을 포함하는 상세한 설명',
        target: '20-30대 직장인 여성 중 패션과 뷰티에 관심이 많고 온라인 쇼핑을 자주하는 타겟',
        mood: '활기차고 젊은 느낌이면서도 신뢰감을 주는 따뜻한 톤앤매너'
      }
      
      const shortTokens = PromptTemplateManager.estimateTokenCount(shortRequest)
      const longTokens = PromptTemplateManager.estimateTokenCount(longRequest)
      
      expect(longTokens).toBeGreaterThan(shortTokens)
    })
  })
})

/**
 * 프롬프트에서 duration 값들을 추출하는 헬퍼 함수
 */
function extractDurations(prompt: string): number[] {
  const matches = prompt.match(/"duration": "(\d+)초"/g)
  if (!matches) return []
  
  return matches.map(match => 
    parseInt(match.match(/(\d+)/)?.[1] || '0')
  )
}