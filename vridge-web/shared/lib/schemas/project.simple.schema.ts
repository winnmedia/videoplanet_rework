/**
 * 단순한 프로젝트 API용 Zod 스키마
 * 복잡성 제거, 필수 필드만 포함
 */

import { z } from 'zod'

// 호환성을 위한 ID 스키마 (UUID 또는 일반 문자열 모두 허용)
export const ProjectIdSchema = z
  .string()
  .min(1, 'ID는 필수입니다')
  .refine(val => {
    // UUID 형식이거나 일반 문자열 허용 (긴급 패치)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(val) || /^[a-zA-Z0-9\-_]+$/.test(val)
  }, '유효하지 않은 ID 형식입니다')

export type ProjectId = z.infer<typeof ProjectIdSchema>

// 기본 프로젝트 스키마 (단순화)
export const SimpleProjectSchema = z.object({
  id: ProjectIdSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  status: z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED']).default('ACTIVE'),
  clientName: z.string().min(1).max(100),
  budget: z.number().min(0),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export type SimpleProject = z.infer<typeof SimpleProjectSchema>

// 프로젝트 생성 요청 스키마
export const CreateProjectSchema = z.object({
  name: z.string().min(1, '프로젝트명을 입력해주세요').max(100),
  description: z.string().max(500).optional(),
  clientName: z.string().min(1, '클라이언트명을 입력해주세요').max(100),
  budget: z.number().min(0, '예산은 0 이상이어야 합니다'),
  startDate: z.string().datetime('시작일을 선택해주세요'),
  endDate: z.string().datetime('종료일을 선택해주세요'),
})

export type CreateProject = z.infer<typeof CreateProjectSchema>

// 프로젝트 업데이트 스키마
export const UpdateProjectSchema = CreateProjectSchema.partial()

export type UpdateProject = z.infer<typeof UpdateProjectSchema>

// API 응답 스키마
export const ProjectListResponseSchema = z.object({
  projects: z.array(SimpleProjectSchema),
  total: z.number(),
})

export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>
