/**
 * 프롬프트 엔티티 스키마 정의
 * 
 * 데이터 계약과 런타임 검증을 위한 Zod 스키마를 정의합니다.
 * 모든 프롬프트 데이터는 이 스키마를 통해 검증되어야 합니다.
 */

import { z } from 'zod'

// =============================================================================
// 기본 타입 스키마
// =============================================================================

export const PromptMetadataSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().default(''),
  category: z.enum(['storyboard', 'character', 'environment', 'effect', 'custom']).default('storyboard'),
  tags: z.array(z.string()).default([]),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).default('medium'),
  estimatedTokens: z.number().int().min(0).default(100),
  language: z.string().default('ko'),
  targetAudience: z.enum(['general', 'professional', 'expert']).default('professional')
})

export const TechnicalSpecsSchema = z.object({
  aspectRatio: z.enum(['16:9', '4:3', '1:1', '9:16']).default('16:9'),
  resolution: z.enum(['sd', 'hd', '4k', '8k']).default('hd'),
  frameRate: z.number().int().min(1).max(120).default(24)
})

export const LightingSchema = z.object({
  type: z.enum(['natural', 'artificial', 'mixed']).default('natural'),
  mood: z.enum(['bright', 'dim', 'dramatic', 'soft']).default('soft'),
  direction: z.enum(['front', 'back', 'side', 'top', 'bottom']).default('front')
})

export const ShotBreakdownSchema = z.object({
  shotNumber: z.number().int().min(1),
  actId: z.string().optional(),
  description: z.string().min(1, 'Shot description is required'),
  cameraAngle: z.enum(['wide', 'medium', 'close', 'extreme_close', 'overhead', 'low_angle', 'high_angle', 'dutch_angle']),
  duration: z.number().min(0),
  visualElements: z.array(z.string()).default([]),
  generationPrompt: z.string().min(1, 'Generation prompt is required'),
  technicalSpecs: TechnicalSpecsSchema.optional(),
  lighting: LightingSchema.optional()
})

export const StyleGuideSchema = z.object({
  artStyle: z.enum(['photorealistic', 'cinematic', 'anime', 'cartoon', 'sketch']).default('photorealistic'),
  colorPalette: z.enum(['warm_tones', 'cool_tones', 'monochrome', 'vibrant', 'muted', 'natural']).default('natural'),
  visualMood: z.enum(['happy', 'sad', 'dramatic', 'mysterious', 'romantic', 'action']).default('happy'),
  characterConsistency: z.object({
    enabled: z.boolean().default(false),
    referenceCharacters: z.array(z.string()).default([]),
    consistencyStrength: z.number().min(0).max(1).default(0.8)
  }).optional(),
  environmentStyle: z.object({
    setting: z.enum(['indoor', 'outdoor', 'mixed']).default('outdoor'),
    timeOfDay: z.enum(['morning', 'afternoon', 'evening', 'night']).default('afternoon'),
    weather: z.enum(['sunny', 'cloudy', 'rainy', 'snowy', 'stormy']).default('sunny')
  }).optional()
})

export const PromptStructureSchema = z.object({
  shotBreakdown: z.array(ShotBreakdownSchema).min(1, 'At least one shot is required'),
  styleGuide: StyleGuideSchema,
  narrativeFlow: z.object({
    pacing: z.enum(['slow', 'medium', 'fast']).default('medium'),
    transitionStyle: z.enum(['cut', 'fade', 'dissolve', 'wipe']).default('cut')
  }).optional()
})

export const BatchSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  batchSize: z.number().int().min(1).max(20).default(4),
  maxRetries: z.number().int().min(0).max(10).default(3),
  timeoutMs: z.number().int().min(1000).max(300000).default(30000),
  parallelProcessing: z.boolean().default(true),
  failureHandling: z.enum(['stop_on_error', 'continue_on_error', 'retry_with_fallback']).default('retry_with_fallback')
})

export const GenerationSettingsSchema = z.object({
  provider: z.enum(['google', 'openai', 'anthropic', 'huggingface', 'midjourney']).default('google'),
  model: z.string().default('imagen-4.0-fast-generate-preview-06-06'),
  parameters: z.object({
    aspectRatio: z.enum(['16:9', '4:3', '1:1', '9:16']).default('16:9'),
    quality: z.enum(['low', 'medium', 'high', 'ultra']).default('high'),
    stylization: z.number().min(0).max(1).default(0.8),
    coherence: z.number().min(0).max(1).default(0.9)
  }),
  batchSettings: BatchSettingsSchema.optional(),
  fallbackProvider: z.enum(['google', 'openai', 'anthropic', 'huggingface']).optional()
})

export const QualityAssuranceSchema = z.object({
  validationRules: z.object({
    minConsistencyScore: z.number().min(0).max(1).default(0.7),
    maxRegenerationCount: z.number().int().min(0).max(10).default(3),
    requiredElements: z.array(z.string()).default([]),
    forbiddenElements: z.array(z.string()).default([])
  }),
  approvalWorkflow: z.object({
    requiresManualReview: z.boolean().default(false),
    autoApproveThreshold: z.number().min(0).max(1).default(0.85),
    reviewers: z.array(z.string()).default([])
  }).optional()
})

export const UsageSchema = z.object({
  createdBy: z.string().min(1, 'Created by is required'),
  createdAt: z.string().datetime(),
  usageCount: z.number().int().min(0).default(0),
  lastUsed: z.string().datetime().optional(),
  totalGenerations: z.number().int().min(0).default(0)
})

// =============================================================================
// 메인 VideoPlanetPrompt 스키마
// =============================================================================

export const VideoPlanetPromptSchema = z.object({
  id: z.string().min(1, 'ID is required'),
  projectId: z.string().min(1, 'Project ID is required'),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, 'Version must be in semver format').default('1.0.0'),
  metadata: PromptMetadataSchema,
  promptStructure: PromptStructureSchema,
  generationSettings: GenerationSettingsSchema,
  qualityAssurance: QualityAssuranceSchema,
  usage: UsageSchema,
  status: z.enum(['draft', 'active', 'inactive', 'archived']).default('draft')
})

// =============================================================================
// 타입 추론
// =============================================================================

export type VideoPlanetPrompt = z.infer<typeof VideoPlanetPromptSchema>
export type PromptMetadata = z.infer<typeof PromptMetadataSchema>
export type PromptStructure = z.infer<typeof PromptStructureSchema>
export type ShotBreakdown = z.infer<typeof ShotBreakdownSchema>
export type StyleGuide = z.infer<typeof StyleGuideSchema>
export type GenerationSettings = z.infer<typeof GenerationSettingsSchema>
export type QualityAssurance = z.infer<typeof QualityAssuranceSchema>
export type Usage = z.infer<typeof UsageSchema>
export type TechnicalSpecs = z.infer<typeof TechnicalSpecsSchema>
export type Lighting = z.infer<typeof LightingSchema>

// =============================================================================
// 유틸리티 함수
// =============================================================================

/**
 * 프롬프트 데이터를 안전하게 파싱합니다
 */
export function parsePrompt(data: unknown): VideoPlanetPrompt {
  return VideoPlanetPromptSchema.parse(data)
}

/**
 * 프롬프트 데이터를 안전하게 파싱하고 결과를 반환합니다
 */
export function safeParsePrompt(data: unknown) {
  return VideoPlanetPromptSchema.safeParse(data)
}

/**
 * 부분 프롬프트 데이터를 파싱합니다 (업데이트용)
 */
export function parsePartialPrompt(data: unknown) {
  return VideoPlanetPromptSchema.partial().parse(data)
}

/**
 * 프롬프트 유효성 검증
 */
export function validatePrompt(data: unknown): {
  isValid: boolean
  errors: string[]
  data?: VideoPlanetPrompt
} {
  const result = VideoPlanetPromptSchema.safeParse(data)
  
  if (result.success) {
    return {
      isValid: true,
      errors: [],
      data: result.data
    }
  }
  
  return {
    isValid: false,
    errors: result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
  }
}

/**
 * 기본 프롬프트 생성
 */
export function createDefaultPrompt(overrides: Partial<VideoPlanetPrompt> = {}): VideoPlanetPrompt {
  const now = new Date().toISOString()
  
  const defaultPrompt: VideoPlanetPrompt = {
    id: `prompt_${Date.now()}`,
    projectId: `project_${Date.now()}`,
    version: '1.0.0',
    metadata: {
      title: 'New Prompt',
      description: '',
      category: 'storyboard',
      tags: [],
      difficulty: 'medium',
      estimatedTokens: 100,
      language: 'ko',
      targetAudience: 'professional'
    },
    promptStructure: {
      shotBreakdown: [{
        shotNumber: 1,
        description: 'Default shot',
        cameraAngle: 'medium',
        duration: 5,
        visualElements: [],
        generationPrompt: 'Default generation prompt'
      }],
      styleGuide: {
        artStyle: 'photorealistic',
        colorPalette: 'natural',
        visualMood: 'happy'
      }
    },
    generationSettings: {
      provider: 'google',
      model: 'imagen-4.0-fast-generate-preview-06-06',
      parameters: {
        aspectRatio: '16:9',
        quality: 'high',
        stylization: 0.8,
        coherence: 0.9
      }
    },
    qualityAssurance: {
      validationRules: {
        minConsistencyScore: 0.7,
        maxRegenerationCount: 3,
        requiredElements: [],
        forbiddenElements: []
      }
    },
    usage: {
      createdBy: 'system',
      createdAt: now,
      usageCount: 0,
      totalGenerations: 0
    },
    status: 'draft'
  }
  
  return { ...defaultPrompt, ...overrides }
}