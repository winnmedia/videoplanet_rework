/**
 * @fileoverview Gemini API 클라이언트 테스트 (TDD Red Phase)
 * @description 실패하는 테스트부터 시작하여 API 클라이언트 인터페이스 정의
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { GeminiClient } from '../api/geminiClient'
import type { StoryGenerationRequest, StoryGenerationResponse } from '../model/types'

// 환경 변수 모킹
const mockEnv = {
  GOOGLE_GEMINI_API_KEY: 'test-api-key-12345'
}

describe('GeminiClient', () => {
  beforeEach(() => {
    // 환경 변수 모킹
    Object.assign(process.env, mockEnv)
    
    // Fetch 모킹 (전역)
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.resetAllMocks()
    // 환경 변수 정리
    delete process.env.GOOGLE_GEMINI_API_KEY
  })

  describe('인스턴스 생성', () => {
    it('올바른 API 키로 클라이언트를 생성해야 한다', () => {
      expect(() => new GeminiClient()).not.toThrow()
    })

    it('API 키가 없으면 에러를 던져야 한다', () => {
      delete process.env.GOOGLE_GEMINI_API_KEY
      
      expect(() => new GeminiClient()).toThrow(
        'GOOGLE_GEMINI_API_KEY 환경 변수가 필요합니다'
      )
    })

    it('API 키가 너무 짧으면 에러를 던져야 한다', () => {
      process.env.GOOGLE_GEMINI_API_KEY = 'short'
      
      expect(() => new GeminiClient()).toThrow(
        'GOOGLE_GEMINI_API_KEY는 최소 10자 이상이어야 합니다'
      )
    })
  })

  describe('generateStory', () => {
    let client: GeminiClient
    const mockRequest: StoryGenerationRequest = {
      genre: '광고',
      target: '20-30대 여성',
      duration: 60,
      concept: '신제품 런칭 캠페인',
      mood: '활기차고 젊은 느낌'
    }

    beforeEach(() => {
      client = new GeminiClient()
    })

    it('정상적인 요청으로 4단계 스토리를 생성해야 한다', async () => {
      // Mock 성공 응답
      const mockApiResponse = {
        ok: true,
        json: async () => ({
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  stages: [
                    {
                      id: '1',
                      title: '도입부',
                      content: '주인공 등장',
                      goal: '관심 유발',
                      duration: '15초'
                    },
                    {
                      id: '2', 
                      title: '전개부',
                      content: '문제 제기',
                      goal: '공감대 형성',
                      duration: '20초'
                    },
                    {
                      id: '3',
                      title: '클라이맥스',
                      content: '해결책 제시',
                      goal: '제품 소개', 
                      duration: '15초'
                    },
                    {
                      id: '4',
                      title: '마무리',
                      content: '행동 유도',
                      goal: '구매 전환',
                      duration: '10초'
                    }
                  ]
                })
              }]
            }
          }]
        })
      }

      ;(global.fetch as any).mockResolvedValueOnce(mockApiResponse)

      const result = await client.generateStory(mockRequest)

      expect(result).toHaveProperty('stages')
      expect(result.stages).toHaveLength(4)
      expect(result.stages[0]).toHaveProperty('title', '도입부')
      expect(result.usage).toHaveProperty('promptTokens')
      expect(result.usage).toHaveProperty('completionTokens')
    })

    it('30초 타임아웃을 적용해야 한다', async () => {
      // 타임아웃 시뮬레이션 - AbortController를 사용하여 실제 타임아웃 발생
      ;(global.fetch as any).mockImplementationOnce(
        () => new Promise((resolve, reject) => {
          const error = new Error('The operation was aborted.')
          error.name = 'AbortError'
          setTimeout(() => reject(error), 100)
        })
      )

      await expect(client.generateStory(mockRequest)).rejects.toThrow(
        'Gemini API 요청이 타임아웃되었습니다 (30초)'
      )
    }, 5000)

    it('API 에러 시 적절한 에러를 던져야 한다', async () => {
      const mockErrorResponse = {
        ok: false,
        status: 400,
        json: async () => ({
          error: {
            message: 'Invalid API key'
          }
        })
      }

      ;(global.fetch as any).mockResolvedValueOnce(mockErrorResponse)

      await expect(client.generateStory(mockRequest)).rejects.toThrow(
        'Gemini API 오류: Invalid API key'
      )
    })

    it('네트워크 에러 시 적절한 에러를 던져야 한다', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(
        new Error('Network error')
      )

      await expect(client.generateStory(mockRequest)).rejects.toThrow(
        'Gemini API 연결 실패: Network error'
      )
    })

    it('잘못된 JSON 응답 시 에러를 던져야 한다', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({ invalid: 'response' })
      }

      ;(global.fetch as any).mockResolvedValueOnce(mockResponse)

      await expect(client.generateStory(mockRequest)).rejects.toThrow(
        'Gemini API 응답 형식이 올바르지 않습니다'
      )
    })
  })

  describe('사용량 추적', () => {
    let client: GeminiClient

    beforeEach(() => {
      client = new GeminiClient()
    })

    it('API 호출 시 사용량을 기록해야 한다', async () => {
      const mockResponse = {
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"stages":[]}' }] } }],
          usageMetadata: {
            promptTokenCount: 50,
            candidatesTokenCount: 100,
            totalTokenCount: 150
          }
        })
      }

      ;(global.fetch as any).mockResolvedValueOnce(mockResponse)

      const result = await client.generateStory({
        genre: '광고',
        target: '일반',
        duration: 30,
        concept: '테스트',
        mood: '밝은'
      })

      expect(result.usage).toEqual({
        promptTokens: 50,
        completionTokens: 100,
        totalTokens: 150
      })
    })
  })
})