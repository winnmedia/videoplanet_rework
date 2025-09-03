/**
 * @file Store Type System
 * @description Redux Toolkit 2.0 통합 스토어 타입 정의 및 Zod 스키마
 */

import { z } from 'zod'

// ============================================================================
// 도메인 엔티티 스키마
// ============================================================================

/**
 * 사용자 엔티티 스키마
 */
export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  avatar: z.string().url().optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional()
})

/**
 * 프로젝트 엔티티 스키마  
 */
export const ProjectSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['draft', 'active', 'completed', 'archived']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime().optional(),
  ownerId: z.string().optional(),
  collaborators: z.array(z.string()).optional()
})

/**
 * 비디오 피드백 엔티티 스키마
 */
export const VideoFeedbackSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  videoUrl: z.string().url(),
  feedback: z.string().min(1),
  rating: z.number().min(1).max(5),
  createdAt: z.string().datetime(),
  createdBy: z.string().min(1),
  status: z.enum(['pending', 'reviewed', 'resolved'])
})

/**
 * 캘린더 이벤트 엔티티 스키마
 */
export const CalendarEventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  projectId: z.string().optional(),
  attendees: z.array(z.string()).optional(),
  type: z.enum(['meeting', 'deadline', 'review', 'planning'])
})

// ============================================================================
// 파이프라인 관련 스키마
// ============================================================================

/**
 * 파이프라인 단계 스키마
 */
export const PipelineStepSchema = z.enum([
  'signup', 
  'login', 
  'project', 
  'invite', 
  'planning', 
  'prompt', 
  'feedback'
])

/**
 * 사용자 진행 상황 스키마
 */
export const UserProgressSchema = z.object({
  profile: UserSchema.nullable(),
  projects: z.array(ProjectSchema),
  currentProject: z.string().nullable(),
  planningDrafts: z.array(z.any()) // TODO: 구체적 스키마 정의 필요
})

/**
 * 세션 데이터 스키마
 */
export const SessionDataSchema = z.object({
  startedAt: z.string().datetime().nullable(),
  lastActivity: z.string().datetime().nullable(),
  timeSpent: z.number().min(0)
})

// ============================================================================
// 상태 슬라이스 스키마  
// ============================================================================

/**
 * 인증 상태 스키마
 */
export const AuthStateSchema = z.object({
  isAuthenticated: z.boolean(),
  user: UserSchema.nullable(),
  loading: z.boolean(),
  error: z.string().nullable(),
  token: z.string().nullable(),
  refreshToken: z.string().nullable()
})

/**
 * 파이프라인 상태 스키마
 */
export const PipelineStateSchema = z.object({
  currentStep: PipelineStepSchema,
  completedSteps: z.array(PipelineStepSchema), // Set은 배열로 직렬화
  userProgress: UserProgressSchema,
  sessionData: SessionDataSchema,
  isLoading: z.boolean(),
  error: z.string().nullable()
})

/**
 * 페이지네이션 스키마
 */
export const PaginationSchema = z.object({
  page: z.number().min(1),
  pageSize: z.number().min(1).max(100),
  total: z.number().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean()
})

/**
 * 프로젝트 관리 상태 스키마
 */
export const ProjectManagementStateSchema = z.object({
  projects: z.array(ProjectSchema),
  currentProject: ProjectSchema.nullable(),
  loading: z.boolean(),
  error: z.string().nullable(),
  pagination: PaginationSchema,
  filters: z.object({
    status: z.array(ProjectSchema.shape.status),
    search: z.string(),
    sortBy: z.enum(['name', 'createdAt', 'status']),
    sortOrder: z.enum(['asc', 'desc'])
  }).optional()
})

/**
 * 비디오 피드백 상태 스키마
 */
export const VideoFeedbackStateSchema = z.object({
  feedbacks: z.array(VideoFeedbackSchema),
  currentFeedback: VideoFeedbackSchema.nullable(),
  loading: z.boolean(),
  error: z.string().nullable(),
  pagination: PaginationSchema.optional()
})

/**
 * 캘린더 상태 스키마
 */
export const CalendarStateSchema = z.object({
  events: z.array(CalendarEventSchema),
  selectedDate: z.string().datetime(),
  view: z.enum(['day', 'week', 'month']),
  loading: z.boolean(),
  error: z.string().nullable(),
  filters: z.object({
    projectId: z.string().optional(),
    type: z.array(CalendarEventSchema.shape.type).optional()
  }).optional()
})

// ============================================================================
// 통합 스토어 스키마
// ============================================================================

/**
 * 루트 상태 스키마 - 모든 슬라이스 상태를 포함
 */
export const RootStateSchema = z.object({
  auth: AuthStateSchema,
  pipeline: PipelineStateSchema,
  projectManagement: ProjectManagementStateSchema,
  videoFeedback: VideoFeedbackStateSchema,
  calendar: CalendarStateSchema
})

// ============================================================================
// TypeScript 타입 추출
// ============================================================================

// 도메인 엔티티 타입
export type User = z.infer<typeof UserSchema>
export type Project = z.infer<typeof ProjectSchema>
export type VideoFeedback = z.infer<typeof VideoFeedbackSchema>
export type CalendarEvent = z.infer<typeof CalendarEventSchema>

// 파이프라인 타입
export type PipelineStep = z.infer<typeof PipelineStepSchema>
export type UserProgress = z.infer<typeof UserProgressSchema>
export type SessionData = z.infer<typeof SessionDataSchema>

// 상태 타입
export type AuthState = z.infer<typeof AuthStateSchema>
export type PipelineState = z.infer<typeof PipelineStateSchema>
export type ProjectManagementState = z.infer<typeof ProjectManagementStateSchema>
export type VideoFeedbackState = z.infer<typeof VideoFeedbackStateSchema>
export type CalendarState = z.infer<typeof CalendarStateSchema>
export type Pagination = z.infer<typeof PaginationSchema>

// 루트 상태 타입
export type RootState = z.infer<typeof RootStateSchema>

// ============================================================================
// 유틸리티 타입
// ============================================================================

/**
 * API 응답 래퍼 스키마
 */
export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: dataSchema,
    success: z.boolean(),
    message: z.string().optional(),
    error: z.string().nullable()
  })

/**
 * API 에러 스키마
 */
export const ApiErrorSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
  details: z.record(z.any()).optional(),
  timestamp: z.string().datetime()
})

export type ApiError = z.infer<typeof ApiErrorSchema>

/**
 * 낙관적 업데이트 메타데이터 스키마
 */
export const OptimisticUpdateMetaSchema = z.object({
  id: z.string(),
  type: z.enum(['create', 'update', 'delete']),
  timestamp: z.string().datetime(),
  rollbackData: z.any().optional()
})

export type OptimisticUpdateMeta = z.infer<typeof OptimisticUpdateMetaSchema>

// ============================================================================
// 스토어 설정 스키마
// ============================================================================

/**
 * 영속성 설정 스키마
 */
export const PersistConfigSchema = z.object({
  version: z.number(),
  whitelist: z.array(z.string()),
  blacklist: z.array(z.string()),
  transforms: z.array(z.any()).optional()
})

/**
 * 개발 도구 설정 스키마
 */
export const DevToolsConfigSchema = z.object({
  enabled: z.boolean(),
  maxAge: z.number().positive(),
  actionSanitizer: z.function().optional(),
  stateSanitizer: z.function().optional()
})

// ============================================================================
// 런타임 검증 유틸리티
// ============================================================================

/**
 * 상태 검증 함수
 */
export const validateRootState = (state: unknown): state is RootState => {
  try {
    RootStateSchema.parse(state)
    return true
  } catch {
    return false
  }
}

/**
 * API 응답 검증 함수
 */
export const validateApiResponse = <T>(
  response: unknown,
  dataSchema: z.ZodSchema<T>
): response is { data: T; success: boolean; message?: string; error: string | null } => {
  try {
    ApiResponseSchema(dataSchema).parse(response)
    return true
  } catch {
    return false
  }
}