import { z } from 'zod';

// 환경 변수 스키마 (Zod 검증)
export const envSchema = z.object({
  GEMINI_API_KEY: z.string().min(1, 'Gemini API key is required'),
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
});

// Gemini API 요청/응답 타입
export const geminiRequestSchema = z.object({
  prompt: z.string().min(1),
  maxTokens: z.number().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export const geminiResponseSchema = z.object({
  text: z.string(),
  usage: z.object({
    promptTokens: z.number(),
    completionTokens: z.number(),
    totalTokens: z.number(),
  }),
});

export type GeminiRequest = z.infer<typeof geminiRequestSchema>;
export type GeminiResponse = z.infer<typeof geminiResponseSchema>;

// 스토리 생성 관련 스키마
export const storyBriefingSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1),
  briefing: z.string().min(10),
  genre: z.string().optional(),
  targetDuration: z.number().positive().optional(),
  targetAudience: z.string().optional(),
});

export const actSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  duration: z.number().positive(),
  order: z.number().int().min(1).max(4),
});

export const fourActStructureSchema = z.object({
  projectId: z.string(),
  acts: z.array(actSchema).length(4),
  totalDuration: z.number().positive(),
  createdAt: z.date(),
});

export const shotSchema = z.object({
  id: z.string(),
  actId: z.string(),
  title: z.string(),
  description: z.string(),
  duration: z.number().positive(),
  cameraAngle: z.string().optional(),
  dialogue: z.string().optional(),
  action: z.string().optional(),
  order: z.number().int().positive(),
});

export const twelveShotPlanSchema = z.object({
  projectId: z.string(),
  actId: z.string(),
  shots: z.array(shotSchema).max(12),
  totalDuration: z.number().positive(),
  createdAt: z.date(),
});

export const qualityMetricsSchema = z.object({
  consistency: z.number().min(0).max(100),
  characterDevelopment: z.number().min(0).max(100),
  narrativeFlow: z.number().min(0).max(100),
  overallScore: z.number().min(0).max(100),
});

export type StoryBriefing = z.infer<typeof storyBriefingSchema>;
export type Act = z.infer<typeof actSchema>;
export type FourActStructure = z.infer<typeof fourActStructureSchema>;
export type Shot = z.infer<typeof shotSchema>;
export type TwelveShotPlan = z.infer<typeof twelveShotPlanSchema>;
export type QualityMetrics = z.infer<typeof qualityMetricsSchema>;

// =============================================================================
// 이미지 생성 관련 스키마 (Imagen API 통합)
// =============================================================================

export const styleSettingsSchema = z.object({
  artStyle: z.enum(['cinematic', 'animated', 'realistic', 'anime', 'sketch', 'watercolor']),
  colorPalette: z.enum(['warm', 'cool', 'vibrant', 'pastel', 'monochrome', 'natural']),
  aspectRatio: z.enum(['16:9', '4:3', '1:1', '9:16']).default('16:9'),
  quality: z.enum(['low', 'medium', 'high', 'ultra']).default('high'),
  characterConsistency: z.object({
    enabled: z.boolean().default(false),
    referenceImages: z.array(z.string()).optional(),
    consistencyStrength: z.number().min(0).max(1).default(0.8)
  }).optional()
});

export const generationSettingsSchema = z.object({
  model: z.string().default('imagen-4.0-fast-generate-preview-06-06'),
  provider: z.enum(['google', 'huggingface']).default('google'),
  batchSize: z.number().int().min(1).max(6).default(4),
  maxRetries: z.number().int().min(0).max(5).default(3),
  fallbackProvider: z.enum(['huggingface']).optional(),
  onProgress: z.function().args(z.object({
    completed: z.number(),
    total: z.number(),
    percentage: z.number(),
    currentBatch: z.number().optional()
  })).returns(z.void()).optional()
});

export const shotImageSchema = z.object({
  shotNumber: z.number().int().positive(),
  description: z.string().min(1),
  type: z.enum(['Wide Shot', 'Medium Shot', 'Close Up', 'Extreme Close Up', 'Over Shoulder']),
  duration: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional()
});

export const imageGenerationRequestSchema = z.object({
  projectId: z.string(),
  shots: z.array(shotImageSchema).min(1).max(12),
  styleSettings: styleSettingsSchema,
  generationSettings: generationSettingsSchema.optional()
});

export const generatedImageSchema = z.object({
  shotNumber: z.number().int().positive(),
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  prompt: z.string(),
  generationTime: z.number().positive(), // milliseconds
  status: z.enum(['pending', 'generating', 'completed', 'failed']),
  provider: z.enum(['google', 'huggingface']).optional(),
  version: z.number().int().positive().default(1),
  styleMetrics: z.object({
    consistency: z.number().min(0).max(1),
    colorHarmony: z.number().min(0).max(1),
    characterSimilarity: z.number().min(0).max(1).optional()
  }).optional(),
  errorMessage: z.string().optional()
});

export const storyboardGridSchema = z.object({
  projectId: z.string(),
  images: z.array(generatedImageSchema).max(12),
  gridLayout: z.enum(['3x4', '4x3', '2x6', '6x2']).default('3x4'),
  totalGenerationTime: z.number().positive(),
  overallConsistency: z.number().min(0).max(1).optional(),
  failedShots: z.array(z.number()).optional(),
  metadata: z.object({
    createdAt: z.date(),
    styleSettings: styleSettingsSchema,
    fallbackUsed: z.boolean().default(false),
    totalRetries: z.number().nonnegative().default(0)
  }),
  exportUrls: z.object({
    gridImage: z.string().url().optional(),
    individualShots: z.array(z.string().url()).optional(),
    pdf: z.string().url().optional()
  }).optional()
});

export const shotRegenerationRequestSchema = z.object({
  projectId: z.string(),
  shotNumber: z.number().int().positive(),
  newPrompt: z.string().min(1),
  styleSettings: styleSettingsSchema,
  version: z.number().int().positive().optional()
});

export const imageGenerationStatusSchema = z.object({
  projectId: z.string(),
  status: z.enum(['idle', 'generating', 'completed', 'failed', 'cancelled']),
  progress: z.object({
    completed: z.number().nonnegative(),
    total: z.number().positive(),
    percentage: z.number().min(0).max(100),
    currentBatch: z.number().int().positive().optional(),
    estimatedTimeRemaining: z.number().positive().optional() // seconds
  }),
  errors: z.array(z.object({
    shotNumber: z.number().int().positive(),
    errorMessage: z.string(),
    timestamp: z.date()
  })).optional()
});

// 타입 추출
export type StyleSettings = z.infer<typeof styleSettingsSchema>;
export type GenerationSettings = z.infer<typeof generationSettingsSchema>;
export type ShotImage = z.infer<typeof shotImageSchema>;
export type ImageGenerationRequest = z.infer<typeof imageGenerationRequestSchema>;
export type GeneratedImage = z.infer<typeof generatedImageSchema>;
export type StoryboardGrid = z.infer<typeof storyboardGridSchema>;
export type ShotRegenerationRequest = z.infer<typeof shotRegenerationRequestSchema>;
export type ImageGenerationStatus = z.infer<typeof imageGenerationStatusSchema>;