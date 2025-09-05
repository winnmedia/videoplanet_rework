/**
 * @fileoverview AI 서비스 타입 정의
 * @description Gemini API 및 스토리 생성 관련 타입들
 */

/**
 * 스토리 생성 요청 타입
 */
export interface StoryGenerationRequest {
  /** 영상 장르 (광고/드라마/다큐멘터리) */
  genre: '광고' | '드라마' | '다큐멘터리'
  
  /** 타겟 오디언스 */
  target: string
  
  /** 영상 길이 (초) */
  duration: number
  
  /** 컨셉/주제 */
  concept: string
  
  /** 무드/톤 */
  mood: string
}

/**
 * 개별 스토리 단계
 */
export interface PlanningStage {
  /** 단계 ID */
  id: string
  
  /** 단계 제목 */
  title: string
  
  /** 단계 내용/설명 */
  content: string
  
  /** 단계 목표 */
  goal: string
  
  /** 예상 시간 */
  duration: string
}

/**
 * 스토리 생성 응답 타입
 */
export interface StoryGenerationResponse {
  /** 생성된 4단계 스토리 */
  stages: PlanningStage[]
  
  /** API 사용량 정보 */
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  
  /** 생성 시간 */
  generatedAt: Date
}

/**
 * Gemini API 응답 타입 (원본)
 */
export interface GeminiApiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
  }>
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number 
    totalTokenCount: number
  }
}

/**
 * Gemini API 에러 응답
 */
export interface GeminiApiError {
  error: {
    code: number
    message: string
    status: string
  }
}

/**
 * 프롬프트 템플릿 타입
 */
export interface PromptTemplate {
  /** 장르 */
  genre: StoryGenerationRequest['genre']
  
  /** 프롬프트 템플릿 텍스트 */
  template: string
  
  /** 예상 토큰 수 */
  estimatedTokens: number
  
  /** 템플릿 설명 */
  description: string
}

/**
 * AI 생성 옵션
 */
export interface GenerationOptions {
  /** 생성 모델 */
  model?: string
  
  /** 온도 (창의성) 0.0 - 1.0 */
  temperature?: number
  
  /** 최대 토큰 수 */
  maxTokens?: number
  
  /** 타임아웃 (ms) */
  timeout?: number
}

/**
 * API 사용량 추적
 */
export interface UsageMetrics {
  /** 요청 수 */
  requestCount: number
  
  /** 총 토큰 사용량 */
  totalTokens: number
  
  /** 비용 (USD) */
  estimatedCost: number
  
  /** 마지막 요청 시간 */
  lastRequestAt: Date
}