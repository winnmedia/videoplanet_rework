import { z } from 'zod';

/**
 * Dashboard API 스키마 정의 - 런타임 검증 및 타입 생성
 * @author Data Lead Daniel
 * @since 2025-09-03
 * 
 * 데이터 계약 준수 원칙:
 * 1. 모든 API 응답은 Zod 스키마로 런타임 검증
 * 2. 스키마 진화 시 하위 호환성 보장
 * 3. PII 데이터 로깅 금지 (마스킹 처리)
 */

// =============================================================================
// 기본 타입 정의 (Base Types)
// =============================================================================

export const ProjectStatusSchema = z.enum([
  'planning',      // 기획
  'in_progress',   // 진행중
  'review',        // 검토
  'completed',     // 완료
  'cancelled'      // 취소
]);

export const PrioritySchema = z.enum(['low', 'medium', 'high', 'urgent']);

export const ActivityTypeSchema = z.enum([
  'project_created',
  'project_updated', 
  'feedback_received',
  'video_uploaded',
  'schedule_created',
  'team_member_added'
]);

// =============================================================================
// 도메인 엔티티 스키마 (Domain Entity Schemas)  
// =============================================================================

/**
 * 프로젝트 요약 정보 스키마
 */
export const ProjectSummarySchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(200),
  status: ProjectStatusSchema,
  progress: z.number().min(0).max(100), // 백분율
  priority: PrioritySchema,
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deadline: z.string().datetime().optional(),
  team_member_count: z.number().min(0),
  video_count: z.number().min(0),
  feedback_count: z.number().min(0)
});

/**
 * 알림 요약 정보 스키마
 */
export const NotificationSummarySchema = z.object({
  total_count: z.number().min(0),
  unread_count: z.number().min(0),
  feedback_count: z.number().min(0),
  schedule_count: z.number().min(0),
  mention_count: z.number().min(0)
});

/**
 * 최근 활동 아이템 스키마
 */
export const ActivityItemSchema = z.object({
  id: z.string().uuid(),
  type: ActivityTypeSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  project_id: z.string().uuid().optional(),
  project_title: z.string().max(200).optional(),
  created_at: z.string().datetime(),
  // PII 데이터는 마스킹 처리됨
  created_by: z.string().max(100) // "홍**" 형태로 마스킹
});

/**
 * 통계 카드 데이터 스키마  
 */
export const StatCardDataSchema = z.object({
  active_projects: z.number().min(0),
  new_feedback: z.number().min(0),
  today_schedule: z.number().min(0), 
  completed_videos: z.number().min(0)
});

/**
 * 빠른 작업 옵션 스키마
 */
export const QuickActionSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  icon: z.string().min(1), // 이모지 대신 icon 키 사용
  route: z.string().min(1),
  enabled: z.boolean().default(true)
});

// =============================================================================
// 메인 Dashboard 데이터 스키마 (Main Dashboard Schema)
// =============================================================================

/**
 * Dashboard 전체 데이터 스키마
 * API 응답 /api/dashboard/summary에 대응
 */
export const DashboardDataSchema = z.object({
  // 통계 카드 데이터
  stats: StatCardDataSchema,
  
  // 알림 요약
  notifications: NotificationSummarySchema,
  
  // 최근 프로젝트 (최대 5개)
  recent_projects: z.array(ProjectSummarySchema)
    .max(5)
    .default([]),
    
  // 최근 활동 (최대 10개)
  recent_activities: z.array(ActivityItemSchema)
    .max(10)
    .default([]),
    
  // 빠른 작업 옵션
  quick_actions: z.array(QuickActionSchema)
    .default([]),
    
  // 메타데이터
  meta: z.object({
    last_updated: z.string().datetime(),
    cache_expires_at: z.string().datetime(),
    user_timezone: z.string().default('Asia/Seoul')
  })
});

// =============================================================================
// 타입 추론 및 Export (Type Inference & Export)
// =============================================================================

export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type Priority = z.infer<typeof PrioritySchema>;
export type ActivityType = z.infer<typeof ActivityTypeSchema>;

export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;
export type NotificationSummary = z.infer<typeof NotificationSummarySchema>;
export type ActivityItem = z.infer<typeof ActivityItemSchema>;
export type StatCardData = z.infer<typeof StatCardDataSchema>;
export type QuickAction = z.infer<typeof QuickActionSchema>;

export type DashboardData = z.infer<typeof DashboardDataSchema>;

// =============================================================================
// 스키마 검증 헬퍼 함수 (Schema Validation Helpers)
// =============================================================================

/**
 * Dashboard 데이터 검증 함수
 * @param data - 검증할 데이터
 * @returns 검증된 DashboardData
 * @throws ZodError - 스키마 위반 시
 */
export function validateDashboardData(data: unknown): DashboardData {
  return DashboardDataSchema.parse(data);
}

/**
 * Dashboard 데이터 안전 검증 함수  
 * @param data - 검증할 데이터
 * @returns 검증 결과 { success: boolean, data?: DashboardData, error?: ZodError }
 */
export function safeParseDashboardData(data: unknown) {
  return DashboardDataSchema.safeParse(data);
}

// =============================================================================
// 스키마 버전 관리 (Schema Version Management)
// =============================================================================

/**
 * 스키마 버전 정보
 * 하위 호환성 보장을 위한 버전 관리
 */
export const DASHBOARD_SCHEMA_VERSION = '1.0.0';

/**
 * 스키마 호환성 검사 함수
 * 향후 스키마 진화 시 마이그레이션 로직 제공
 */
export function checkSchemaCompatibility(version: string): boolean {
  // 현재는 1.0.0만 지원
  return version === DASHBOARD_SCHEMA_VERSION;
}