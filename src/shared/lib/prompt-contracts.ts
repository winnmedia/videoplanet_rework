/**
 * VideoPlanet 프롬프트 데이터 계약
 * 
 * JSON 프롬프트 생성, 가져오기/내보내기, 외부 도구 연동을 위한
 * 표준 스키마 및 검증 시스템입니다.
 * 
 * 모든 프롬프트는 Zod 스키마로 검증되며, GDPR 준수와
 * 데이터 품질 관리가 CI에서 자동 검증됩니다.
 */

import { z } from 'zod'

// =============================================================================
// 기본 공통 스키마
// =============================================================================

const timestampSchema = z.string().datetime()
const idSchema = z.string().min(3).regex(/^[a-z]+_[a-zA-Z0-9]+$/)
const versionSchema = z.string().regex(/^\d+\.\d+\.\d+$/)

// =============================================================================
// 프롬프트 메타데이터 스키마
// =============================================================================

const promptMetadataSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  category: z.enum([
    'storyboard', 'character', 'background', 'prop', 
    'lighting', 'composition', 'style_reference'
  ]),
  tags: z.array(z.string().max(50)).max(20),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']),
  estimatedTokens: z.number().min(1).max(2000),
  language: z.string().length(2).default('en'), // ISO 639-1
  targetAudience: z.enum(['general', 'professional', 'educational']).optional()
})

// =============================================================================
// 스토리 구조 스키마
// =============================================================================

const storyActSchema = z.object({
  actNumber: z.number().int().min(1).max(4),
  title: z.string().min(1).max(100),
  description: z.string().max(500),
  duration: z.number().positive(), // seconds
  keyMoments: z.array(z.string().max(100)).max(10),
  emotionalTone: z.enum(['happy', 'sad', 'dramatic', 'mysterious', 'action']).optional(),
  pacing: z.enum(['slow', 'medium', 'fast']).optional()
})

const shotBreakdownSchema = z.object({
  shotNumber: z.number().int().positive(),
  description: z.string().min(1).max(500),
  cameraAngle: z.enum([
    'wide', 'medium', 'close', 'extreme_close', 'overhead', 
    'low_angle', 'high_angle', 'dutch_angle'
  ]),
  duration: z.number().positive(),
  visualElements: z.array(z.string().max(100)).max(15),
  generationPrompt: z.string().min(10).max(1000),
  technicalSpecs: z.object({
    aspectRatio: z.enum(['16:9', '4:3', '1:1', '9:16']).default('16:9'),
    resolution: z.enum(['sd', 'hd', '4k', '8k']).default('hd'),
    frameRate: z.number().positive().default(24)
  }).optional(),
  lighting: z.object({
    type: z.enum(['natural', 'artificial', 'mixed']),
    mood: z.enum(['bright', 'dim', 'dramatic', 'soft']),
    direction: z.enum(['front', 'back', 'side', 'top', 'bottom']).optional()
  }).optional()
})

const characterConsistencySchema = z.object({
  enabled: z.boolean(),
  referenceCharacters: z.array(z.string()).max(10).optional(),
  consistencyStrength: z.number().min(0).max(1).default(0.8),
  faceSwapEnabled: z.boolean().default(false)
})

const styleGuideSchema = z.object({
  artStyle: z.enum([
    'photorealistic', 'cinematic', 'anime', 'cartoon', 'sketch',
    'oil_painting', 'watercolor', 'digital_art', 'concept_art'
  ]),
  colorPalette: z.enum([
    'warm_tones', 'cool_tones', 'monochrome', 'vibrant', 
    'muted', 'high_contrast', 'pastel', 'natural'
  ]),
  visualMood: z.enum([
    'happy', 'sad', 'dramatic', 'mysterious', 'romantic',
    'action', 'horror', 'comedy', 'documentary', 'fantasy'
  ]),
  characterConsistency: characterConsistencySchema.optional(),
  environmentStyle: z.object({
    setting: z.enum(['indoor', 'outdoor', 'studio', 'mixed']),
    timeOfDay: z.enum(['dawn', 'morning', 'midday', 'afternoon', 'evening', 'night']).optional(),
    weather: z.enum(['clear', 'cloudy', 'rainy', 'snowy', 'foggy']).optional(),
    season: z.enum(['spring', 'summer', 'autumn', 'winter']).optional()
  }).optional()
})

const promptStructureSchema = z.object({
  storyActs: z.array(storyActSchema).max(4).optional(),
  shotBreakdown: z.array(shotBreakdownSchema).min(1).max(12),
  styleGuide: styleGuideSchema,
  narrativeFlow: z.object({
    pacing: z.enum(['slow', 'medium', 'fast']),
    transitionStyle: z.enum(['cut', 'fade', 'dissolve', 'wipe']).optional(),
    continuityRules: z.array(z.string()).max(10).optional()
  }).optional()
})

// =============================================================================
// 생성 설정 스키마
// =============================================================================

const generationParametersSchema = z.object({
  aspectRatio: z.enum(['16:9', '4:3', '1:1', '9:16']).default('16:9'),
  quality: z.enum(['draft', 'standard', 'high', 'ultra']).default('standard'),
  stylization: z.number().min(0).max(1).default(0.7),
  coherence: z.number().min(0).max(1).default(0.8),
  creativity: z.number().min(0).max(1).default(0.6),
  seed: z.number().int().optional(),
  negativePrompt: z.string().max(500).optional()
})

const batchSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  batchSize: z.number().int().min(1).max(20).default(4),
  maxRetries: z.number().int().min(0).max(10).default(3),
  timeoutMs: z.number().int().min(5000).max(300000).default(30000), // 5초-5분
  parallelProcessing: z.boolean().default(true),
  failureHandling: z.enum(['stop', 'continue', 'retry_with_fallback']).default('retry_with_fallback')
})

const generationSettingsSchema = z.object({
  provider: z.enum(['google', 'openai', 'huggingface', 'midjourney']).default('google'),
  model: z.string().min(1).max(100),
  parameters: generationParametersSchema,
  batchSettings: batchSettingsSchema,
  fallbackProvider: z.enum(['google', 'openai', 'huggingface']).optional(),
  costOptimization: z.object({
    enabled: z.boolean().default(true),
    maxCostPerImage: z.number().positive().default(0.05), // USD
    budgetAlert: z.number().positive().default(10.0) // USD
  }).optional()
})

// =============================================================================
// 품질 보증 스키마
// =============================================================================

const validationRulesSchema = z.object({
  minConsistencyScore: z.number().min(0).max(1).default(0.7),
  maxRegenerationCount: z.number().int().min(0).max(10).default(5),
  requiredElements: z.array(z.string()).max(20),
  forbiddenElements: z.array(z.string()).max(20).optional(),
  qualityThresholds: z.object({
    resolution: z.number().positive().default(1024),
    aspectRatioTolerance: z.number().min(0).max(0.1).default(0.05),
    colorAccuracy: z.number().min(0).max(1).default(0.8)
  }).optional()
})

const approvalWorkflowSchema = z.object({
  requiresManualReview: z.boolean().default(false),
  autoApproveThreshold: z.number().min(0).max(1).default(0.85),
  reviewers: z.array(idSchema).max(10),
  approvalTimeout: z.number().int().positive().default(86400000), // 24시간 (ms)
  escalationRules: z.array(z.object({
    condition: z.string(),
    action: z.enum(['notify', 'auto_approve', 'reject', 'escalate'])
  })).max(5).optional()
})

const qualityAssuranceSchema = z.object({
  validationRules: validationRulesSchema,
  approvalWorkflow: approvalWorkflowSchema,
  monitoring: z.object({
    enableMetrics: z.boolean().default(true),
    alertOnFailure: z.boolean().default(true),
    performanceTracking: z.boolean().default(true)
  }).optional()
})

// =============================================================================
// 외부 도구 호환성 스키마
// =============================================================================

const openAiCompatibilitySchema = z.object({
  model: z.enum(['dall-e-3', 'dall-e-2']).default('dall-e-3'),
  adaptedPrompt: z.string().min(1).max(4000),
  size: z.enum(['1024x1024', '1024x1792', '1792x1024']).default('1024x1024'),
  quality: z.enum(['standard', 'hd']).default('standard'),
  style: z.enum(['vivid', 'natural']).default('vivid'),
  user: z.string().optional()
})

const anthropicCompatibilitySchema = z.object({
  model: z.string().default('claude-3-sonnet-20240229'),
  adaptedPrompt: z.string().min(1).max(8000),
  max_tokens: z.number().int().min(1).max(8192).default(1000),
  temperature: z.number().min(0).max(2).default(0.7),
  system: z.string().optional()
})

const compatibilitySchema = z.object({
  openai: openAiCompatibilitySchema.optional(),
  anthropic: anthropicCompatibilitySchema.optional(),
  midjourney: z.object({
    adaptedPrompt: z.string().min(1).max(2000),
    parameters: z.string().max(500).optional(),
    version: z.string().default('6.0')
  }).optional(),
  huggingface: z.object({
    model: z.string().default('stabilityai/stable-diffusion-xl-base-1.0'),
    adaptedPrompt: z.string().min(1).max(2000),
    parameters: z.record(z.unknown()).optional()
  }).optional()
})

// =============================================================================
// 사용 통계 및 분석 스키마
// =============================================================================

const usageStatsSchema = z.object({
  createdBy: idSchema,
  createdAt: timestampSchema,
  lastUsedAt: timestampSchema.optional(),
  usageCount: z.number().nonnegative().default(0),
  averageGenerationTime: z.number().nonnegative().optional(), // milliseconds
  successRate: z.number().min(0).max(1).optional(),
  costAccumulated: z.number().nonnegative().default(0), // USD
  performanceMetrics: z.object({
    averageQualityScore: z.number().min(0).max(1).optional(),
    regenerationRate: z.number().min(0).max(1).optional(),
    userSatisfactionScore: z.number().min(0).max(5).optional()
  }).optional()
})

// =============================================================================
// 메인 VideoPlanet 프롬프트 스키마
// =============================================================================

export const videoPlanetPromptSchema = z.object({
  id: idSchema,
  projectId: idSchema,
  version: versionSchema,
  metadata: promptMetadataSchema,
  promptStructure: promptStructureSchema.optional(),
  generationSettings: generationSettingsSchema.optional(),
  qualityAssurance: qualityAssuranceSchema.optional(),
  compatibility: compatibilitySchema.optional(),
  usage: usageStatsSchema.optional(),
  status: z.enum(['draft', 'active', 'deprecated', 'archived']).default('draft'),
  parentPromptId: idSchema.optional(), // 버전 관리용
  childPromptIds: z.array(idSchema).optional(),
  collaborators: z.array(z.object({
    userId: idSchema,
    role: z.enum(['owner', 'editor', 'viewer']),
    permissions: z.array(z.string())
  })).optional()
})

// =============================================================================
// 외부 도구 호환 스키마들
// =============================================================================

export const openAiPromptSchema = z.object({
  model: z.enum(['dall-e-3', 'dall-e-2']),
  prompt: z.string().min(1).max(4000),
  size: z.enum(['256x256', '512x512', '1024x1024', '1024x1792', '1792x1024']).optional(),
  quality: z.enum(['standard', 'hd']).optional(),
  style: z.enum(['vivid', 'natural']).optional(),
  response_format: z.enum(['url', 'b64_json']).optional(),
  user: z.string().optional()
})

export const anthropicPromptSchema = z.object({
  model: z.string(),
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string()
  })),
  max_tokens: z.number().int().min(1).max(8192),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  system: z.string().optional()
})

export const huggingFacePromptSchema = z.object({
  inputs: z.string().min(1).max(2000),
  parameters: z.object({
    width: z.number().int().min(64).max(2048).optional(),
    height: z.number().int().min(64).max(2048).optional(),
    num_inference_steps: z.number().int().min(1).max(100).optional(),
    guidance_scale: z.number().min(1).max(20).optional(),
    negative_prompt: z.string().max(1000).optional(),
    seed: z.number().int().optional()
  }).optional(),
  options: z.object({
    wait_for_model: z.boolean().optional(),
    use_cache: z.boolean().optional()
  }).optional()
})

// =============================================================================
// 내보내기/가져오기 패키지 스키마
// =============================================================================

export const promptExportPackageSchema = z.object({
  exportId: idSchema,
  version: versionSchema,
  metadata: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(1000).optional(),
    exportedBy: idSchema,
    exportedAt: timestampSchema,
    totalPrompts: z.number().int().min(1).max(1000), // 대용량 제한
    categories: z.array(z.string()),
    fileFormat: z.enum(['json', 'csv', 'xml']).default('json'),
    compression: z.enum(['none', 'gzip', 'zip']).default('none'),
    encryption: z.object({
      enabled: z.boolean().default(false),
      algorithm: z.enum(['AES-256', 'ChaCha20']).optional(),
      keyDerivation: z.string().optional()
    }).optional()
  }),
  prompts: z.array(videoPlanetPromptSchema.partial()).min(1).max(1000),
  compatibility: z.object({
    formatVersion: versionSchema,
    requiredFeatures: z.array(z.string()),
    supportedProviders: z.array(z.string()),
    migrationRules: z.array(z.object({
      fromVersion: versionSchema,
      toVersion: versionSchema,
      transformRules: z.array(z.string())
    })).optional()
  }),
  integrity: z.object({
    checksum: z.string(),
    signedBy: idSchema.optional(),
    verificationPublicKey: z.string().optional()
  }).optional()
})

export const promptImportPackageSchema = z.object({
  importId: idSchema,
  sourceFormat: z.enum(['videoplanet', 'openai', 'anthropic', 'huggingface', 'csv']),
  importSettings: z.object({
    overwriteExisting: z.boolean().default(false),
    preserveIds: z.boolean().default(false),
    validateIntegrity: z.boolean().default(true),
    batchSize: z.number().int().min(1).max(100).default(50)
  }),
  mapping: z.object({
    fieldMappings: z.record(z.string()).optional(),
    valueTransformations: z.record(z.string()).optional(),
    defaultValues: z.record(z.unknown()).optional()
  }).optional(),
  conflictResolution: z.object({
    strategy: z.enum(['skip', 'overwrite', 'merge', 'rename']).default('skip'),
    customRules: z.array(z.object({
      condition: z.string(),
      action: z.string()
    })).optional()
  }),
  validation: z.object({
    strictMode: z.boolean().default(true),
    allowPartialImport: z.boolean().default(true),
    maxErrors: z.number().int().min(0).default(10)
  })
})

// =============================================================================
// 성능 및 분석 스키마
// =============================================================================

export const promptPerformanceMetricsSchema = z.object({
  promptId: idSchema,
  generationMetrics: z.object({
    averageGenerationTime: z.number().nonnegative(),
    successRate: z.number().min(0).max(1),
    errorRate: z.number().min(0).max(1),
    retryRate: z.number().min(0).max(1),
    costPerGeneration: z.number().nonnegative()
  }),
  qualityMetrics: z.object({
    consistencyScore: z.number().min(0).max(1),
    userRating: z.number().min(1).max(5).optional(),
    regenerationRate: z.number().min(0).max(1),
    approvalRate: z.number().min(0).max(1)
  }),
  usagePatterns: z.object({
    peakUsageHours: z.array(z.number().int().min(0).max(23)),
    mostActiveUsers: z.array(idSchema),
    commonModifications: z.array(z.string()),
    failurePatterns: z.array(z.string())
  }),
  optimization: z.object({
    suggestedImprovements: z.array(z.string()),
    costOptimizationScore: z.number().min(0).max(1),
    performanceRank: z.number().int().positive().optional()
  })
})

// =============================================================================
// 데이터 검증 및 품질 관리 클래스
// =============================================================================

export class PromptDataValidator {
  /**
   * 프롬프트 데이터 계약 검증 및 오류 리포트 생성
   */
  static validateWithReport<T>(schema: z.ZodSchema<T>, data: unknown): {
    isValid: boolean
    data?: T
    errors: Array<{
      path: string
      message: string
      severity: 'error' | 'warning'
    }>
  } {
    const result = schema.safeParse(data)
    
    if (result.success) {
      return {
        isValid: true,
        data: result.data,
        errors: []
      }
    }

    const errors = result.error.issues.map(issue => ({
      path: issue.path.join('.'),
      message: issue.message,
      severity: 'error' as const
    }))

    return {
      isValid: false,
      errors
    }
  }

  /**
   * GDPR 준수 검증
   */
  static validateGDPRCompliance(promptData: unknown): {
    compliant: boolean
    violations: Array<{
      field: string
      reason: string
      severity: 'low' | 'medium' | 'high'
    }>
  } {
    const violations: Array<{ field: string; reason: string; severity: 'low' | 'medium' | 'high' }> = []
    
    if (typeof promptData !== 'object' || promptData === null) {
      return { compliant: true, violations: [] }
    }

    const prompt = promptData as Record<string, unknown>

    // PII 감지 패턴
    const piiPatterns = [
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/, field: 'SSN', severity: 'high' as const },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, field: 'email', severity: 'medium' as const },
      { pattern: /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/, field: 'credit_card', severity: 'high' as const },
      { pattern: /\b\d{1,5}\s\w+\s\w+/, field: 'address', severity: 'medium' as const },
      { pattern: /\b[A-Z][a-z]+\s[A-Z][a-z]+\b/, field: 'full_name', severity: 'medium' as const }
    ]

    // 프롬프트 텍스트에서 PII 검사
    const checkForPII = (text: string, fieldPath: string) => {
      piiPatterns.forEach(({ pattern, field, severity }) => {
        if (pattern.test(text)) {
          violations.push({
            field: fieldPath,
            reason: `Potential ${field} detected in prompt text`,
            severity
          })
        }
      })
    }

    // 재귀적으로 객체의 모든 문자열 필드 검사
    const scanObject = (obj: Record<string, unknown>, path = '') => {
      Object.entries(obj).forEach(([key, value]) => {
        const fieldPath = path ? `${path}.${key}` : key
        
        if (typeof value === 'string') {
          checkForPII(value, fieldPath)
        } else if (Array.isArray(value)) {
          value.forEach((item, index) => {
            if (typeof item === 'string') {
              checkForPII(item, `${fieldPath}[${index}]`)
            } else if (typeof item === 'object' && item !== null) {
              scanObject(item as Record<string, unknown>, `${fieldPath}[${index}]`)
            }
          })
        } else if (typeof value === 'object' && value !== null) {
          scanObject(value as Record<string, unknown>, fieldPath)
        }
      })
    }

    scanObject(prompt)

    return {
      compliant: violations.length === 0,
      violations
    }
  }

  /**
   * 토큰 수 추정 정확성 검증
   */
  static validateTokenEstimation(prompt: VideoPlanetPrompt): {
    isAccurate: boolean
    estimatedTokens: number
    actualTokens: number
    accuracy: number
  } {
    // 간단한 토큰 계산 (실제로는 더 정교한 토크나이저 사용)
    const calculateTokens = (text: string): number => {
      return Math.ceil(text.split(/\s+/).length * 1.3) // 단어 수 * 1.3 (대략적 추정)
    }

    let totalTokens = 0

    // 메타데이터 토큰
    totalTokens += calculateTokens(prompt.metadata.title)
    if (prompt.metadata.description) {
      totalTokens += calculateTokens(prompt.metadata.description)
    }

    // 프롬프트 구조 토큰
    if (prompt.promptStructure) {
      if (prompt.promptStructure.shotBreakdown) {
        prompt.promptStructure.shotBreakdown.forEach(shot => {
          totalTokens += calculateTokens(shot.description)
          totalTokens += calculateTokens(shot.generationPrompt)
        })
      }

      if (prompt.promptStructure.storyActs) {
        prompt.promptStructure.storyActs.forEach(act => {
          totalTokens += calculateTokens(act.description)
        })
      }
    }

    const estimatedTokens = prompt.metadata.estimatedTokens
    const accuracy = Math.min(1, 1 - Math.abs(totalTokens - estimatedTokens) / Math.max(totalTokens, estimatedTokens))

    return {
      isAccurate: accuracy >= 0.8, // 80% 정확도 이상
      estimatedTokens,
      actualTokens: totalTokens,
      accuracy
    }
  }

  /**
   * 성능 예산 검증
   */
  static validatePerformanceBudget(
    prompt: VideoPlanetPrompt,
    budget: {
      maxPrompts: number
      maxTokensPerPrompt: number
      maxGenerationTime: number
      maxBatchSize: number
    }
  ): {
    withinBudget: boolean
    violations: Array<{
      metric: string
      limit: number
      actual: number
      severity: 'warning' | 'error'
    }>
  } {
    const violations: Array<{
      metric: string
      limit: number
      actual: number
      severity: 'warning' | 'error'
    }> = []

    // 토큰 수 검증
    if (prompt.metadata.estimatedTokens > budget.maxTokensPerPrompt) {
      violations.push({
        metric: 'tokens',
        limit: budget.maxTokensPerPrompt,
        actual: prompt.metadata.estimatedTokens,
        severity: 'error'
      })
    }

    // 배치 크기 검증
    if (prompt.generationSettings?.batchSettings?.batchSize && 
        prompt.generationSettings.batchSettings.batchSize > budget.maxBatchSize) {
      violations.push({
        metric: 'batchSize',
        limit: budget.maxBatchSize,
        actual: prompt.generationSettings.batchSettings.batchSize,
        severity: 'warning'
      })
    }

    // 생성 시간 검증
    if (prompt.generationSettings?.batchSettings?.timeoutMs && 
        prompt.generationSettings.batchSettings.timeoutMs > budget.maxGenerationTime) {
      violations.push({
        metric: 'generationTime',
        limit: budget.maxGenerationTime,
        actual: prompt.generationSettings.batchSettings.timeoutMs,
        severity: 'error'
      })
    }

    return {
      withinBudget: violations.filter(v => v.severity === 'error').length === 0,
      violations
    }
  }

  /**
   * 프롬프트 복잡성 분석
   */
  static analyzeComplexity(prompt: VideoPlanetPrompt): {
    score: number // 0-1 (1이 가장 복잡)
    factors: Array<{
      factor: string
      impact: number
      description: string
    }>
  } {
    const factors: Array<{ factor: string; impact: number; description: string }> = []
    let totalScore = 0

    // 샷 수량 복잡성
    const shotCount = prompt.promptStructure?.shotBreakdown?.length || 0
    const shotComplexity = Math.min(shotCount / 12, 1) * 0.3
    factors.push({
      factor: 'shot_count',
      impact: shotComplexity,
      description: `${shotCount} shots contribute to complexity`
    })
    totalScore += shotComplexity

    // 스타일 가이드 복잡성
    if (prompt.promptStructure?.styleGuide) {
      const styleComplexity = 0.2
      factors.push({
        factor: 'style_guide',
        impact: styleComplexity,
        description: 'Detailed style guide increases complexity'
      })
      totalScore += styleComplexity
    }

    // 캐릭터 일관성 복잡성
    if (prompt.promptStructure?.styleGuide?.characterConsistency?.enabled) {
      const charComplexity = 0.25
      factors.push({
        factor: 'character_consistency',
        impact: charComplexity,
        description: 'Character consistency enforcement increases complexity'
      })
      totalScore += charComplexity
    }

    // 품질 보증 복잡성
    if (prompt.qualityAssurance) {
      const qaComplexity = 0.15
      factors.push({
        factor: 'quality_assurance',
        impact: qaComplexity,
        description: 'Quality assurance rules add complexity'
      })
      totalScore += qaComplexity
    }

    // 다중 제공자 복잡성
    if (prompt.generationSettings?.fallbackProvider) {
      const fallbackComplexity = 0.1
      factors.push({
        factor: 'multi_provider',
        impact: fallbackComplexity,
        description: 'Multiple provider support adds complexity'
      })
      totalScore += fallbackComplexity
    }

    return {
      score: Math.min(totalScore, 1),
      factors
    }
  }
}

// =============================================================================
// 타입 추출
// =============================================================================

export type VideoPlanetPrompt = z.infer<typeof videoPlanetPromptSchema>
export type PromptMetadata = z.infer<typeof promptMetadataSchema>
export type PromptStructure = z.infer<typeof promptStructureSchema>
export type GenerationSettings = z.infer<typeof generationSettingsSchema>
export type QualityAssurance = z.infer<typeof qualityAssuranceSchema>
export type PromptExportPackage = z.infer<typeof promptExportPackageSchema>
export type PromptImportPackage = z.infer<typeof promptImportPackageSchema>
export type PromptPerformanceMetrics = z.infer<typeof promptPerformanceMetricsSchema>

// OpenAI 호환 타입
export type OpenAiPrompt = z.infer<typeof openAiPromptSchema>
export type AnthropicPrompt = z.infer<typeof anthropicPromptSchema>
export type HuggingFacePrompt = z.infer<typeof huggingFacePromptSchema>

// =============================================================================
// 스키마 레지스트리
// =============================================================================

export const PROMPT_SCHEMA_REGISTRY = {
  videoPlanetPrompt: { schema: videoPlanetPromptSchema, version: '1.0.0' },
  openAiPrompt: { schema: openAiPromptSchema, version: '1.0.0' },
  anthropicPrompt: { schema: anthropicPromptSchema, version: '1.0.0' },
  huggingFacePrompt: { schema: huggingFacePromptSchema, version: '1.0.0' },
  exportPackage: { schema: promptExportPackageSchema, version: '1.0.0' },
  importPackage: { schema: promptImportPackageSchema, version: '1.0.0' },
  performanceMetrics: { schema: promptPerformanceMetricsSchema, version: '1.0.0' }
} as const

export type PromptSchemaName = keyof typeof PROMPT_SCHEMA_REGISTRY