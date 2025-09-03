import { z } from 'zod'

// Base schemas
export const StoryDataSchema = z.object({
  story: z.string().min(1, "스토리는 필수입니다"),
  themes: z.array(z.string()).min(1, "최소 1개의 테마가 필요합니다"),
  characters: z.array(z.string()).min(1, "최소 1개의 캐릭터가 필요합니다")
})

export const ActDataSchema = z.object({
  title: z.string().min(1, "제목은 필수입니다"),
  description: z.string().min(1, "설명은 필수입니다"),
  duration: z.string().min(1, "길이는 필수입니다")
})

export const Act4DataSchema = z.object({
  act1: ActDataSchema,
  act2: ActDataSchema,
  act3: ActDataSchema,
  act4: ActDataSchema
})

export const ShotDataSchema = z.object({
  shotNumber: z.number().int().positive(),
  type: z.string().min(1, "샷 타입은 필수입니다"),
  description: z.string().min(1, "설명은 필수입니다"),
  duration: z.string().min(1, "길이는 필수입니다"),
  location: z.string().min(1, "장소는 필수입니다"),
  notes: z.string().optional()
})

export const Shot12DataSchema = z.object({
  shots: z.array(ShotDataSchema).length(12, "12개의 샷이 필요합니다")
})

// Request schemas - Updated to match Django integer IDs
export const GenerateStoryRequestSchema = z.object({
  projectId: z.union([
    z.string().regex(/^\d+$/, "유효한 프로젝트 ID가 필요합니다 (정수형)").transform(Number),
    z.number().int().positive("유효한 프로젝트 ID가 필요합니다 (양의 정수)")
  ]),
  outline: z.string().min(10, "스토리 개요는 최소 10자 이상이어야 합니다"),
  genre: z.enum(['adventure', 'drama', 'comedy', 'thriller', 'romance', 'documentary']),
  targetLength: z.enum(['1-3분', '3-5분', '5-10분', '10-15분', '15분 이상'])
})

export const Generate4ActRequestSchema = z.object({
  projectId: z.union([
    z.string().regex(/^\d+$/, "유효한 프로젝트 ID가 필요합니다 (정수형)").transform(Number),
    z.number().int().positive("유효한 프로젝트 ID가 필요합니다 (양의 정수)")
  ]),
  story: z.string().min(1, "스토리는 필수입니다"),
  themes: z.array(z.string()).min(1, "테마는 필수입니다"),
  characters: z.array(z.string()).min(1, "캐릭터는 필수입니다")
})

export const Generate12ShotRequestSchema = z.object({
  projectId: z.union([
    z.string().regex(/^\d+$/, "유효한 프로젝트 ID가 필요합니다 (정수형)").transform(Number),
    z.number().int().positive("유효한 프로젝트 ID가 필요합니다 (양의 정수)")
  ]),
  story: z.string().min(1, "스토리는 필수입니다"),
  acts: Act4DataSchema
})

export const ExportPlanRequestSchema = z.object({
  projectId: z.union([
    z.string().regex(/^\d+$/, "유효한 프로젝트 ID가 필요합니다 (정수형)").transform(Number),
    z.number().int().positive("유효한 프로젝트 ID가 필요합니다 (양의 정수)")
  ]),
  story: z.string().min(1, "스토리는 필수입니다"),
  acts: Act4DataSchema,
  shots: Shot12DataSchema
})

// Response schemas
export const StoryResponseSchema = StoryDataSchema

export const Act4ResponseSchema = Act4DataSchema

export const Shot12ResponseSchema = Shot12DataSchema

export const ExportPlanResponseSchema = z.object({
  url: z.string().url("유효한 URL이어야 합니다"),
  fileName: z.string().min(1, "파일명은 필수입니다")
})

// Derived types
export type StoryData = z.infer<typeof StoryDataSchema>
export type ActData = z.infer<typeof ActDataSchema>
export type Act4Data = z.infer<typeof Act4DataSchema>
export type ShotData = z.infer<typeof ShotDataSchema>
export type Shot12Data = z.infer<typeof Shot12DataSchema>

export type GenerateStoryRequest = z.infer<typeof GenerateStoryRequestSchema>
export type Generate4ActRequest = z.infer<typeof Generate4ActRequestSchema>
export type Generate12ShotRequest = z.infer<typeof Generate12ShotRequestSchema>
export type ExportPlanRequest = z.infer<typeof ExportPlanRequestSchema>

export type StoryResponse = z.infer<typeof StoryResponseSchema>
export type Act4Response = z.infer<typeof Act4ResponseSchema>
export type Shot12Response = z.infer<typeof Shot12ResponseSchema>
export type ExportPlanResponse = z.infer<typeof ExportPlanResponseSchema>