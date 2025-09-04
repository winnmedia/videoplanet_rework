/**
 * API 응답/요청 스키마 정의 (Zod)
 * 모든 API 엔드포인트에서 사용하는 런타임 검증 스키마
 */

import { z } from 'zod'

// 기본 API 응답 스키마
export const BaseApiResponseSchema = z.object({
  success: z.boolean(),
  timestamp: z.string().datetime(),
  message: z.string().optional()
})

// 에러 응답 스키마
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  timestamp: z.string().datetime(),
  path: z.string().optional(),
  details: z.any().optional()
})

// 페이지네이션 스키마
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean()
})

// 메뉴 관련 스키마
export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '메뉴명은 필수입니다'),
  path: z.string().startsWith('/', '경로는 /로 시작해야 합니다'),
  icon: z.string().optional(),
  hasSubMenu: z.boolean().default(false),
  order: z.number().int().nonnegative().optional(),
  isActive: z.boolean().default(true)
})

export const MenuItemsResponseSchema = BaseApiResponseSchema.extend({
  data: z.object({
    items: z.array(MenuItemSchema)
  })
})

// 서브메뉴 관련 스키마
export const SubMenuItemStatusSchema = z.enum(['active', 'pending', 'completed', 'draft', 'in-progress'])

export const SubMenuItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '항목명은 필수입니다'),
  path: z.string().startsWith('/', '경로는 /로 시작해야 합니다'),
  status: SubMenuItemStatusSchema,
  badge: z.number().int().nonnegative().optional(),
  lastModified: z.string().datetime(),
  description: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium').optional()
})

export const SubMenuRequestSchema = z.object({
  type: z.enum(['projects', 'feedback', 'planning'], {
    errorMap: () => ({ message: '유효하지 않은 메뉴 타입입니다. projects, feedback, planning 중 하나를 선택해주세요.' })
  }),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(10).optional(),
  search: z.string().optional(),
  status: SubMenuItemStatusSchema.optional(),
  sortBy: z.enum(['name', 'lastModified', 'status']).default('lastModified').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional()
})

export const SubMenuResponseSchema = BaseApiResponseSchema.extend({
  data: z.object({
    items: z.array(SubMenuItemSchema),
    pagination: PaginationSchema
  })
})

// 프로젝트 관련 스키마
export const ProjectStatusSchema = z.enum(['draft', 'planning', 'in-progress', 'review', 'completed', 'cancelled'])

export const ProjectSchema = z.object({
  id: z.string().uuid('유효하지 않은 프로젝트 ID 형식입니다'),
  name: z.string().min(1, '프로젝트명은 필수입니다').max(200, '프로젝트명은 200자 이하여야 합니다'),
  description: z.string().optional(),
  status: ProjectStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  ownerId: z.string().uuid().optional(),
  tags: z.array(z.string()).default([]),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  progress: z.number().min(0).max(100).default(0)
})

export const ProjectsResponseSchema = BaseApiResponseSchema.extend({
  data: z.object({
    items: z.array(ProjectSchema),
    pagination: PaginationSchema
  })
})

export const ProjectRequestSchema = z.object({
  id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(10).optional(),
  search: z.string().optional(),
  status: ProjectStatusSchema.optional(),
  ownerId: z.string().uuid().optional(),
  sortBy: z.enum(['name', 'updatedAt', 'status', 'priority']).default('updatedAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional()
})

// 피드백 관련 스키마
export const FeedbackStatusSchema = z.enum(['open', 'in-review', 'resolved', 'closed'])
export const FeedbackTypeSchema = z.enum(['bug', 'feature', 'improvement', 'question'])

export const FeedbackSchema = z.object({
  id: z.string().uuid('유효하지 않은 피드백 ID 형식입니다'),
  title: z.string().min(1, '피드백 제목은 필수입니다').max(200, '제목은 200자 이하여야 합니다'),
  content: z.string().min(1, '피드백 내용은 필수입니다'),
  type: FeedbackTypeSchema,
  status: FeedbackStatusSchema,
  projectId: z.string().uuid().optional(),
  authorId: z.string().uuid(),
  assigneeId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
  tags: z.array(z.string()).default([]),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  attachments: z.array(z.string().url()).default([])
})

export const FeedbacksResponseSchema = BaseApiResponseSchema.extend({
  data: z.object({
    items: z.array(FeedbackSchema),
    pagination: PaginationSchema
  })
})

export const FeedbackRequestSchema = z.object({
  id: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(10).optional(),
  search: z.string().optional(),
  type: FeedbackTypeSchema.optional(),
  status: FeedbackStatusSchema.optional(),
  projectId: z.string().uuid().optional(),
  authorId: z.string().uuid().optional(),
  assigneeId: z.string().uuid().optional(),
  sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'status', 'priority']).default('updatedAt').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional()
})

// 타입 추출
export type MenuItemType = z.infer<typeof MenuItemSchema>
export type SubMenuItemType = z.infer<typeof SubMenuItemSchema>
export type SubMenuRequestType = z.infer<typeof SubMenuRequestSchema>
export type ProjectType = z.infer<typeof ProjectSchema>
export type ProjectRequestType = z.infer<typeof ProjectRequestSchema>
export type FeedbackType = z.infer<typeof FeedbackSchema>
export type FeedbackRequestType = z.infer<typeof FeedbackRequestSchema>
export type ApiErrorType = z.infer<typeof ApiErrorSchema>

// 스키마 검증 유틸리티 함수
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ')
      throw new Error(`입력 데이터 검증 실패: ${messages}`)
    }
    throw error
  }
}

// URL 쿼리 파라미터를 객체로 변환하는 헬퍼 함수
export function parseUrlSearchParams(url: string): Record<string, string> {
  const searchParams = new URL(url).searchParams
  const params: Record<string, string> = {}
  
  searchParams.forEach((value, key) => {
    params[key] = value
  })
  
  return params
}