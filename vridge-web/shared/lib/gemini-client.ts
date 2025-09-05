/**
 * Google Gemini API Client
 * @description Google Gemini AI API 연동을 위한 클라이언트
 * @layer shared/lib
 */

import { z } from 'zod'

// ===========================
// Environment Validation
// ===========================

const envSchema = z.object({
  GOOGLE_GEMINI_API_KEY: z.string().optional().default('dummy-key-for-build'),
})

const env = envSchema.parse({
  GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY || 'dummy-key-for-build',
})

// ===========================
// API Response Types
// ===========================

export interface GeminiTextRequest {
  prompt: string
  maxTokens?: number
  temperature?: number
  topP?: number
  topK?: number
  stopSequences?: string[]
}

export interface GeminiTextResponse {
  success: boolean
  text: string
  tokenCount?: number
  finishReason?: string
  error?: string
}

export interface GeminiImageRequest {
  prompt: string
  aspectRatio?: '1:1' | '9:16' | '16:9' | '4:3' | '3:4'
  seed?: number
  outputFormat?: 'JPEG' | 'PNG'
}

export interface GeminiImageResponse {
  success: boolean
  imageBase64?: string
  imageUrl?: string
  error?: string
}

// ===========================
// Core Client Class
// ===========================

class GeminiAPIClient {
  private readonly apiKey: string
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta'
  private readonly imageUrl = 'https://aiplatform.googleapis.com/v1/projects'

  constructor() {
    this.apiKey = env.GOOGLE_GEMINI_API_KEY
  }

  /**
   * 텍스트 생성 (Gemini Pro)
   */
  async generateText(request: GeminiTextRequest): Promise<GeminiTextResponse> {
    // API 키가 더미키인 경우 즉시 실패 반환 (빌드는 통과)
    if (this.apiKey === 'dummy-key-for-build') {
      console.warn('Gemini API: Using dummy key, returning mock response');
      return {
        success: false,
        text: '',
        error: 'Gemini API key not configured'
      }
    }
    
    try {
      const url = `${this.baseUrl}/models/gemini-1.5-pro-latest:generateContent?key=${this.apiKey}`
      
      const body = {
        contents: [{
          parts: [{
            text: request.prompt
          }]
        }],
        generationConfig: {
          maxOutputTokens: request.maxTokens || 2048,
          temperature: request.temperature || 0.7,
          topP: request.topP || 0.95,
          topK: request.topK || 64,
          stopSequences: request.stopSequences || []
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error?.message || `API Error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        throw new Error('Invalid response format from Gemini API')
      }

      return {
        success: true,
        text: data.candidates[0].content.parts[0].text,
        tokenCount: data.usageMetadata?.totalTokenCount,
        finishReason: data.candidates[0].finishReason
      }

    } catch (error) {
      console.error('Gemini text generation error:', error)
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 이미지 생성 (Imagen 3)
   */
  async generateImage(request: GeminiImageRequest): Promise<GeminiImageResponse> {
    try {
      // Google Cloud Project ID 필요 (환경변수에서 가져오기)
      const projectId = 'your-project-id' // 실제 프로젝트 ID로 변경 필요
      const location = 'us-central1'
      
      const url = `${this.imageUrl}/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`
      
      const body = {
        instances: [{
          prompt: request.prompt,
          image: {
            bytesBase64Encoded: ""
          }
        }],
        parameters: {
          aspectRatio: request.aspectRatio || "1:1",
          seed: request.seed,
          outputOptions: {
            outputMimeType: request.outputFormat === 'PNG' ? 'image/png' : 'image/jpeg'
          }
        }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        throw new Error(errorData?.error?.message || `Image API Error: ${response.status}`)
      }

      const data = await response.json()
      
      if (!data.predictions?.[0]?.bytesBase64Encoded) {
        throw new Error('Invalid response format from Imagen API')
      }

      return {
        success: true,
        imageBase64: data.predictions[0].bytesBase64Encoded,
        imageUrl: `data:image/${request.outputFormat?.toLowerCase() || 'jpeg'};base64,${data.predictions[0].bytesBase64Encoded}`
      }

    } catch (error) {
      console.error('Gemini image generation error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * 건강 상태 확인
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.generateText({
        prompt: 'Hello',
        maxTokens: 10
      })
      return result.success
    } catch {
      return false
    }
  }
}

// ===========================
// Export
// ===========================

export const geminiClient = new GeminiAPIClient()

// ===========================
// Utility Functions
// ===========================

/**
 * 프롬프트 최적화 헬퍼
 */
export function optimizePrompt(basePrompt: string, options: {
  style?: string
  tone?: string
  language?: string
  constraints?: string[]
}): string {
  const parts = [basePrompt]
  
  if (options.style) {
    parts.push(`Style: ${options.style}`)
  }
  
  if (options.tone) {
    parts.push(`Tone: ${options.tone}`)
  }
  
  if (options.language) {
    parts.push(`Language: ${options.language}`)
  }
  
  if (options.constraints?.length) {
    parts.push(`Constraints: ${options.constraints.join(', ')}`)
  }
  
  return parts.join('\n\n')
}

/**
 * 이미지 프롬프트 최적화 헬퍼
 */
export function optimizeImagePrompt(basePrompt: string, options: {
  style?: string
  mood?: string
  quality?: 'photorealistic' | 'artistic' | 'sketch'
  lighting?: string
  composition?: string
}): string {
  const parts = [basePrompt]
  
  if (options.style) {
    parts.push(`in ${options.style} style`)
  }
  
  if (options.mood) {
    parts.push(`with ${options.mood} mood`)
  }
  
  if (options.quality) {
    const qualityMap = {
      photorealistic: 'photorealistic, high quality, detailed',
      artistic: 'artistic, creative, stylized',
      sketch: 'sketch style, hand-drawn, artistic lines'
    }
    parts.push(qualityMap[options.quality])
  }
  
  if (options.lighting) {
    parts.push(`${options.lighting} lighting`)
  }
  
  if (options.composition) {
    parts.push(`${options.composition} composition`)
  }
  
  return parts.join(', ')
}

/**
 * 에러 재시도 헬퍼
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxRetries) throw error
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms...`, error)
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2 // 지수 백오프
    }
  }
  
  throw new Error('Max retries exceeded')
}