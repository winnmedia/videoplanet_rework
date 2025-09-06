/**
 * @fileoverview Google Gemini API 클라이언트
 * @description 단순하고 안정적인 AI 스토리 생성 서비스
 */

import { PromptTemplateManager } from './promptTemplates'
import type {
  StoryGenerationRequest,
  StoryGenerationResponse, 
  GeminiApiResponse,
  GeminiApiError,
  PlanningStage,
  GenerationOptions
} from '../model/types'

/**
 * Google Gemini API 클라이언트
 * 
 * 설계 원칙:
 * - 단순성 우선 (함수당 20줄 이하)
 * - 명확한 에러 처리
 * - 30초 타임아웃
 * - 사용량 추적
 */
export class GeminiClient {
  private readonly apiKey: string
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models'
  private readonly model = 'gemini-1.5-flash'
  private readonly timeout = 30000 // 30초

  constructor() {
    this.apiKey = this.validateApiKey()
  }

  /**
   * API 키 검증
   */
  private validateApiKey(): string {
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY

    if (!apiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY 환경 변수가 필요합니다')
    }

    if (apiKey.length < 10) {
      throw new Error('GOOGLE_GEMINI_API_KEY는 최소 10자 이상이어야 합니다')
    }

    return apiKey
  }

  /**
   * 4단계 스토리 생성
   */
  async generateStory(
    request: StoryGenerationRequest,
    options?: GenerationOptions
  ): Promise<StoryGenerationResponse> {
    const prompt = this.buildPrompt(request)
    
    try {
      const response = await this.callGeminiApi(prompt, options)
      const stages = this.parseStoryResponse(response)
      
      return {
        stages,
        usage: {
          promptTokens: response.usageMetadata?.promptTokenCount || 0,
          completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
          totalTokens: response.usageMetadata?.totalTokenCount || 0
        },
        generatedAt: new Date()
      }
    } catch (error) {
      throw this.handleError(error)
    }
  }

  /**
   * 프롬프트 생성 (장르별 최적화된 템플릿 사용)
   */
  private buildPrompt(request: StoryGenerationRequest): string {
    return PromptTemplateManager.buildPrompt(request)
  }

  /**
   * Gemini API 호출
   */
  private async callGeminiApi(
    prompt: string, 
    options?: GenerationOptions
  ): Promise<GeminiApiResponse> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => {
      controller.abort()
    }, options?.timeout || this.timeout)

    try {
      const response = await fetch(
        `${this.baseUrl}/${options?.model || this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }],
            generationConfig: {
              temperature: options?.temperature || 0.7,
              maxOutputTokens: options?.maxTokens || 1000
            }
          }),
          signal: controller.signal
        }
      )

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json() as GeminiApiError
        throw new Error(`Gemini API 오류: ${errorData.error.message}`)
      }

      return await response.json()
    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Gemini API 요청이 타임아웃되었습니다 (30초)')
      }
      
      if (error instanceof Error) {
        if (error.message.startsWith('Gemini API 오류:')) {
          throw error
        }
        throw new Error(`Gemini API 연결 실패: ${error.message}`)
      }
      
      throw new Error('알 수 없는 오류가 발생했습니다')
    }
  }

  /**
   * Gemini 응답을 파싱하여 스토리 단계로 변환
   */
  private parseStoryResponse(response: GeminiApiResponse): PlanningStage[] {
    try {
      const text = response.candidates?.[0]?.content?.parts?.[0]?.text

      if (!text) {
        throw new Error('응답에서 텍스트를 찾을 수 없습니다')
      }

      const parsed = JSON.parse(text)
      
      if (!parsed.stages || !Array.isArray(parsed.stages)) {
        throw new Error('stages 배열을 찾을 수 없습니다')
      }

      return parsed.stages.map((stage: any, index: number) => ({
        id: stage.id || String(index + 1),
        title: stage.title || `단계 ${index + 1}`,
        content: stage.content || '',
        goal: stage.goal || '',
        duration: stage.duration || '15초'
      }))
    } catch (error) {
      throw new Error('Gemini API 응답 형식이 올바르지 않습니다')
    }
  }

  /**
   * 에러 처리
   */
  private handleError(error: any): Error {
    if (error instanceof Error) {
      return error
    }
    
    return new Error('AI 스토리 생성 중 알 수 없는 오류가 발생했습니다')
  }
}