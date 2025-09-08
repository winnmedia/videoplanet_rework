/**
 * @fileoverview Feedback API Schema
 * @description 피드백 API를 위한 통합 Zod 스키마 정의
 * @layer shared/lib/schemas
 *
 * 이 스키마는 다음을 제공합니다:
 * - UUID 기반 ID 검증
 * - 런타임 타입 안전성
 * - API 요청/응답 검증
 * - 500 오류 방지를 위한 엄격한 검증 규칙
 */

import { z } from 'zod'

// ============================================================
// Base Validation Helpers
// ============================================================

/**
 * UUID v4 검증 스키마
 */
export const UUIDSchema = z.string().uuid('유효한 UUID 형식이 아닙니다')

/**
 * 비어있지 않은 문자열 스키마
 */
export const NonEmptyStringSchema = z.string().min(1, '값이 필요합니다')

/**
 * 타임코드 검증 (초 단위, 0 이상)
 */
export const TimecodeSchema = z.number().min(0, '타임코드는 0 이상이어야 합니다')

/**
 * ISO 8601 날짜 문자열 스키마
 */
export const ISODateSchema = z.string().datetime('유효한 ISO 8601 형식이 아닙니다')

// ============================================================
// Enums & Constants
// ============================================================

/**
 * 피드백 타입
 */
export const FeedbackTypeSchema = z.enum(['comment', 'suggestion', 'issue', 'approval'], {
  errorMap: () => ({ message: '유효한 피드백 타입을 선택해주세요 (comment, suggestion, issue, approval)' }),
})

/**
 * 피드백 우선순위
 */
export const FeedbackPrioritySchema = z.enum(['low', 'medium', 'high', 'critical'], {
  errorMap: () => ({ message: '유효한 우선순위를 선택해주세요 (low, medium, high, critical)' }),
})

/**
 * 피드백 상태
 */
export const FeedbackStatusSchema = z.enum(['open', 'in_progress', 'resolved', 'closed'], {
  errorMap: () => ({ message: '유효한 상태를 선택해주세요 (open, in_progress, resolved, closed)' }),
})

/**
 * 감정 반응 타입
 */
export const ReactionTypeSchema = z.enum(['like', 'dislike', 'question'], {
  errorMap: () => ({ message: '유효한 반응 타입을 선택해주세요 (like, dislike, question)' }),
})

// ============================================================
// Core Domain Schemas
// ============================================================

/**
 * 피드백 작성자 스키마
 */
export const FeedbackAuthorSchema = z.object({
  id: UUIDSchema,
  name: NonEmptyStringSchema.max(100, '이름은 100자를 초과할 수 없습니다'),
  email: z.string().email('유효한 이메일 형식이 아닙니다').optional(),
  avatarUrl: z.string().url('유효한 URL 형식이 아닙니다').optional(),
  role: z.enum(['owner', 'admin', 'reviewer', 'viewer']).optional(),
})

/**
 * 피드백 반응 스키마
 */
export const FeedbackReactionSchema = z.object({
  id: UUIDSchema,
  type: ReactionTypeSchema,
  userId: UUIDSchema,
  userName: NonEmptyStringSchema.max(100),
  createdAt: ISODateSchema,
})

/**
 * 피드백 답글 스키마
 */
export const FeedbackReplySchema = z.object({
  id: UUIDSchema,
  content: z.string().min(1, '답글 내용을 입력해주세요').max(500, '답글은 500자를 초과할 수 없습니다'),
  author: FeedbackAuthorSchema,
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema.optional(),
})

/**
 * 피드백 첨부파일 스키마
 */
export const FeedbackAttachmentSchema = z.object({
  id: UUIDSchema,
  fileName: NonEmptyStringSchema.max(255, '파일명은 255자를 초과할 수 없습니다'),
  fileSize: z
    .number()
    .positive('파일 크기는 양수여야 합니다')
    .max(10 * 1024 * 1024, '파일은 10MB를 초과할 수 없습니다'),
  mimeType: z.string().regex(/^[a-z-]+\/[a-z0-9\-\+]+$/i, '유효한 MIME 타입이 아닙니다'),
  url: z.string().url('유효한 URL 형식이 아닙니다'),
  uploadedAt: ISODateSchema,
  uploadedBy: UUIDSchema,
})

/**
 * 메인 피드백 스키마
 */
export const FeedbackSchema = z.object({
  id: UUIDSchema,
  projectId: UUIDSchema,
  videoId: UUIDSchema.optional(),
  timecode: TimecodeSchema.optional(),
  content: z.string().min(1, '피드백 내용을 입력해주세요').max(2000, '피드백은 2000자를 초과할 수 없습니다'),
  type: FeedbackTypeSchema,
  priority: FeedbackPrioritySchema,
  status: FeedbackStatusSchema,
  tags: z
    .array(z.string().max(50, '태그는 50자를 초과할 수 없습니다'))
    .max(10, '태그는 최대 10개까지 가능합니다')
    .optional(),
  author: FeedbackAuthorSchema,
  assignee: FeedbackAuthorSchema.optional(),
  reactions: z.array(FeedbackReactionSchema).default([]),
  replies: z.array(FeedbackReplySchema).default([]),
  attachments: z.array(FeedbackAttachmentSchema).max(5, '첨부파일은 최대 5개까지 가능합니다').optional(),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  resolvedAt: ISODateSchema.optional(),
  resolvedBy: UUIDSchema.optional(),
})

// ============================================================
// API Request/Response Schemas
// ============================================================

/**
 * 피드백 생성 요청 스키마
 */
export const CreateFeedbackRequestSchema = z.object({
  projectId: UUIDSchema,
  videoId: UUIDSchema.optional(),
  timecode: TimecodeSchema.optional(),
  content: z.string().min(1, '피드백 내용을 입력해주세요').max(2000, '피드백은 2000자를 초과할 수 없습니다'),
  type: FeedbackTypeSchema.default('comment'),
  priority: FeedbackPrioritySchema.default('medium'),
  tags: z.array(z.string().max(50)).max(10).optional(),
  assigneeId: UUIDSchema.optional(),
})

/**
 * 피드백 수정 요청 스키마
 */
export const UpdateFeedbackRequestSchema = z.object({
  content: z.string().min(1).max(2000).optional(),
  type: FeedbackTypeSchema.optional(),
  priority: FeedbackPrioritySchema.optional(),
  status: FeedbackStatusSchema.optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  assigneeId: UUIDSchema.nullable().optional(),
})

/**
 * 피드백 조회 쿼리 스키마
 */
export const FeedbackQuerySchema = z.object({
  projectId: UUIDSchema.optional(),
  videoId: UUIDSchema.optional(),
  authorId: UUIDSchema.optional(),
  assigneeId: UUIDSchema.optional(),
  type: FeedbackTypeSchema.optional(),
  priority: FeedbackPrioritySchema.optional(),
  status: FeedbackStatusSchema.optional(),
  tag: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'timecode']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
})

/**
 * 피드백 답글 생성 요청 스키마
 */
export const CreateReplyRequestSchema = z.object({
  feedbackId: UUIDSchema,
  content: z.string().min(1, '답글 내용을 입력해주세요').max(500, '답글은 500자를 초과할 수 없습니다'),
})

/**
 * 피드백 반응 요청 스키마
 */
export const AddReactionRequestSchema = z.object({
  feedbackId: UUIDSchema,
  type: ReactionTypeSchema,
})

// ============================================================
// API Response Schemas
// ============================================================

/**
 * 단일 피드백 응답 스키마
 */
export const FeedbackResponseSchema = z.object({
  success: z.boolean(),
  feedback: FeedbackSchema,
  message: z.string().optional(),
})

/**
 * 피드백 목록 응답 스키마
 */
export const FeedbackListResponseSchema = z.object({
  success: z.boolean(),
  feedbacks: z.array(FeedbackSchema),
  pagination: z.object({
    total: z.number().int().min(0),
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    totalPages: z.number().int().min(0),
  }),
  message: z.string().optional(),
})

/**
 * API 에러 응답 스키마
 */
export const FeedbackErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string(),
  details: z
    .array(
      z.object({
        code: z.string(),
        message: z.string(),
        path: z.array(z.union([z.string(), z.number()])).optional(),
      })
    )
    .optional(),
})

// ============================================================
// Utility Functions
// ============================================================

/**
 * 피드백 데이터 검증 함수
 * @param data - 검증할 데이터
 * @returns 검증된 데이터 또는 검증 오류
 */
export function validateFeedbackData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
):
  | {
      success: true
      data: T
    }
  | {
      success: false
      errors: z.ZodError<T>['errors']
    } {
  try {
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error.errors }
    }
    throw error
  }
}

/**
 * 피드백 필터링을 위한 타입 가드 함수
 */
export function isValidFeedback(data: unknown): data is z.infer<typeof FeedbackSchema> {
  return FeedbackSchema.safeParse(data).success
}

/**
 * UUID 검증 유틸리티 함수
 */
export function isValidUUID(value: string): boolean {
  return UUIDSchema.safeParse(value).success
}

// ============================================================
// Type Exports
// ============================================================

export type FeedbackType = z.infer<typeof FeedbackTypeSchema>
export type FeedbackPriority = z.infer<typeof FeedbackPrioritySchema>
export type FeedbackStatus = z.infer<typeof FeedbackStatusSchema>
export type ReactionType = z.infer<typeof ReactionTypeSchema>
export type FeedbackAuthor = z.infer<typeof FeedbackAuthorSchema>
export type FeedbackReaction = z.infer<typeof FeedbackReactionSchema>
export type FeedbackReply = z.infer<typeof FeedbackReplySchema>
export type FeedbackAttachment = z.infer<typeof FeedbackAttachmentSchema>
export type Feedback = z.infer<typeof FeedbackSchema>
export type CreateFeedbackRequest = z.infer<typeof CreateFeedbackRequestSchema>
export type UpdateFeedbackRequest = z.infer<typeof UpdateFeedbackRequestSchema>
export type FeedbackQuery = z.infer<typeof FeedbackQuerySchema>
export type CreateReplyRequest = z.infer<typeof CreateReplyRequestSchema>
export type AddReactionRequest = z.infer<typeof AddReactionRequestSchema>
export type FeedbackResponse = z.infer<typeof FeedbackResponseSchema>
export type FeedbackListResponse = z.infer<typeof FeedbackListResponseSchema>
export type FeedbackErrorResponse = z.infer<typeof FeedbackErrorResponseSchema>
