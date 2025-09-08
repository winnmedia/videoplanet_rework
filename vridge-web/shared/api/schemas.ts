/**
 * API 응답/요청 스키마 정의 (Zod)
 * 모든 API 엔드포인트에서 사용하는 런타임 검증 스키마
 */

import { z } from 'zod'

// 기본 API 응답 스키마
export const BaseApiResponseSchema = z.object({
  success: z.boolean(),
  timestamp: z.string().datetime(),
  message: z.string().optional(),
})

// 에러 응답 스키마
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
  statusCode: z.number(),
  timestamp: z.string().datetime(),
  path: z.string().optional(),
  details: z.any().optional(),
})

// 페이지네이션 스키마
export const PaginationSchema = z.object({
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),
  total: z.number().int().nonnegative(),
  hasMore: z.boolean(),
})

// 메뉴 관련 스키마
export const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '메뉴명은 필수입니다'),
  path: z.string().startsWith('/', '경로는 /로 시작해야 합니다'),
  icon: z.string().optional(),
  hasSubMenu: z.boolean().default(false),
  order: z.number().int().nonnegative().optional(),
  isActive: z.boolean().default(true),
})

export const MenuItemsResponseSchema = BaseApiResponseSchema.extend({
  data: z.object({
    items: z.array(MenuItemSchema),
  }),
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
  priority: z.enum(['low', 'medium', 'high']).default('medium').optional(),
})

export const SubMenuRequestSchema = z.object({
  type: z.enum(['projects', 'feedback', 'planning'], {
    errorMap: () => ({
      message: '유효하지 않은 메뉴 타입입니다. projects, feedback, planning 중 하나를 선택해주세요.',
    }),
  }),
  page: z.coerce.number().int().positive().default(1).optional(),
  limit: z.coerce.number().int().positive().max(50).default(10).optional(),
  search: z.string().optional(),
  status: SubMenuItemStatusSchema.optional(),
  sortBy: z.enum(['name', 'lastModified', 'status']).default('lastModified').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
})

export const SubMenuResponseSchema = BaseApiResponseSchema.extend({
  data: z.object({
    items: z.array(SubMenuItemSchema),
    pagination: PaginationSchema,
  }),
})

// 프로젝트 관련 스키마
export const ProjectStatusSchema = z.enum(['ACTIVE', 'COMPLETED', 'CANCELLED'])

export const ProjectSchema = z.object({
  id: z.string().min(1, 'ID는 필수입니다'),
  name: z.string().min(1, '프로젝트명은 필수입니다').max(100),
  description: z.string().max(500).optional(),
  status: ProjectStatusSchema.default('ACTIVE'),
  clientName: z.string().min(1, '클라이언트명은 필수입니다').max(100),
  budget: z.number().min(0, '예산은 0 이상이어야 합니다'),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export const ProjectListResponseSchema = z.object({
  projects: z.array(ProjectSchema),
  total: z.number().int().min(0),
})

export const CreateProjectSchema = z.object({
  name: z.string().min(1, '프로젝트명을 입력해주세요').max(100),
  description: z.string().max(500).optional(),
  clientName: z.string().min(1, '클라이언트명을 입력해주세요').max(100),
  budget: z.number().min(0, '예산은 0 이상이어야 합니다'),
  startDate: z.string().datetime('시작일을 선택해주세요'),
  endDate: z.string().datetime('종료일을 선택해주세요'),
})

export const UpdateProjectSchema = CreateProjectSchema.partial()

// 피드백 관련 스키마 (단순화)
export const FeedbackStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed'])
export const FeedbackTypeSchema = z.enum(['comment', 'suggestion', 'issue', 'approval'])
export const FeedbackPrioritySchema = z.enum(['low', 'medium', 'high', 'critical'])

export const FeedbackSchema = z.object({
  id: z.string().min(1, 'ID는 필수입니다'),
  title: z.string().min(1, '피드백 제목은 필수입니다').max(200, '제목은 200자 이하여야 합니다'),
  content: z.string().min(1, '피드백 내용은 필수입니다').max(2000, '피드백은 2000자를 초과할 수 없습니다'),
  type: FeedbackTypeSchema.default('comment'),
  status: FeedbackStatusSchema.default('open'),
  priority: FeedbackPrioritySchema.default('medium'),
  projectId: z.string().optional(),
  authorId: z.string().optional(),
  assigneeId: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
  tags: z.array(z.string().max(50)).max(10).default([]),
})

export const FeedbackListResponseSchema = z.object({
  feedbacks: z.array(FeedbackSchema),
  total: z.number().int().min(0),
})

export const CreateFeedbackSchema = z.object({
  title: z.string().min(1, '피드백 제목을 입력해주세요').max(200),
  content: z.string().min(1, '피드백 내용을 입력해주세요').max(2000),
  type: FeedbackTypeSchema.default('comment'),
  priority: FeedbackPrioritySchema.default('medium'),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
})

export const UpdateFeedbackSchema = CreateFeedbackSchema.partial().extend({
  status: FeedbackStatusSchema.optional(),
})

// 타입 추출
export type MenuItemType = z.infer<typeof MenuItemSchema>
export type SubMenuItemType = z.infer<typeof SubMenuItemSchema>
export type SubMenuRequestType = z.infer<typeof SubMenuRequestSchema>
export type ProjectType = z.infer<typeof ProjectSchema>
export type CreateProjectType = z.infer<typeof CreateProjectSchema>
export type UpdateProjectType = z.infer<typeof UpdateProjectSchema>
export type ProjectListResponseType = z.infer<typeof ProjectListResponseSchema>
export type FeedbackType = z.infer<typeof FeedbackSchema>
export type CreateFeedbackType = z.infer<typeof CreateFeedbackSchema>
export type UpdateFeedbackType = z.infer<typeof UpdateFeedbackSchema>
export type FeedbackListResponseType = z.infer<typeof FeedbackListResponseSchema>
export type ApiErrorType = z.infer<typeof ApiErrorSchema>

// 간단한 이벤트 트래킹 스키마
export const SimpleEventSchema = z.object({
  eventId: z.string().min(1),
  sessionId: z.string().min(1),
  userId: z.string().optional(),
  timestamp: z.string().datetime(),
  category: z.string(),
  action: z.string(),
  label: z.string().optional(),
  value: z.number().optional(),
  page: z.string(),
})

export type SimpleEventType = z.infer<typeof SimpleEventSchema>

// 인증 관련 스키마 (통합)
export const LoginRequestSchema = z.object({
  email: z.string().min(1, '이메일을 입력해주세요.').email('올바른 이메일 형식을 입력해주세요.').max(254),
  password: z.string().min(1, '비밀번호를 입력해주세요.').min(8, '비밀번호는 최소 8자 이상이어야 합니다.').max(128),
})

export const SignupRequestSchema = z
  .object({
    email: z.string().min(1, '이메일을 입력해주세요.').email('올바른 이메일 형식을 입력해주세요.').max(254),
    password: z
      .string()
      .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
      .max(128)
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다.'),
    confirmPassword: z.string().min(1, '비밀번호 확인을 입력해주세요.'),
    name: z
      .string()
      .min(1, '이름을 입력해주세요.')
      .max(50)
      .regex(/^[가-힣a-zA-Z\s]+$/, '이름은 한글, 영문만 입력 가능합니다.'),
  })
  .refine(data => data.password === data.confirmPassword, {
    message: '비밀번호가 일치하지 않습니다.',
    path: ['confirmPassword'],
  })

export const UserSchema = z.object({
  id: z.string().min(1, 'ID는 필수입니다'),
  email: z.string().email('올바른 이메일 형식이 아닙니다.'),
  name: z.string().min(1, '이름이 필요합니다.'),
  role: z.enum(['user', 'admin', 'moderator']).default('user'),
  isEmailVerified: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
})

// 비밀번호 재설정 관련 스키마
export const PasswordResetRequestSchema = z.object({
  email: z
    .string({ required_error: '이메일을 입력해주세요.' })
    .min(1, '이메일을 입력해주세요.')
    .email('올바른 이메일 형식을 입력해주세요.')
    .max(254),
})

export const PasswordResetVerifySchema = z.object({
  token: z.string({ required_error: '토큰이 필요합니다.' }).min(1, '토큰이 필요합니다.'),
  newPassword: z
    .string({ required_error: '새 비밀번호를 입력해주세요.' })
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
    .max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다.'),
})

// 인증 관련 타입 추출
export type LoginRequestType = z.infer<typeof LoginRequestSchema>
export type SignupRequestType = z.infer<typeof SignupRequestSchema>
export type PasswordResetRequestType = z.infer<typeof PasswordResetRequestSchema>
export type PasswordResetVerifyType = z.infer<typeof PasswordResetVerifySchema>
export type UserType = z.infer<typeof UserSchema>

// 단순화된 스키마 검증 유틸리티 함수
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  try {
    const result = schema.parse(data)
    return { success: true, data: result }
  } catch (error) {
    if (error instanceof z.ZodError) {
      const messages = error.errors.map(err => err.message).join(', ')
      return { success: false, error: messages }
    }
    return { success: false, error: '알 수 없는 검증 오류가 발생했습니다.' }
  }
}

// 안전한 파싱 유틸리티
export function safeParseData<T>(schema: z.ZodSchema<T>, data: unknown): T | null {
  const result = schema.safeParse(data)
  return result.success ? result.data : null
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
