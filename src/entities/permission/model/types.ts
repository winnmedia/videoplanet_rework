import { z } from 'zod'

/**
 * 5-tier RBAC 권한 시스템 - Core Domain
 * Owner → Admin → Editor → Reviewer → Viewer
 */

// Project-level Role Definitions
export enum ProjectRole {
  OWNER = 'owner',        // 프로젝트 소유자 - 모든 권한 + 삭제
  ADMIN = 'admin',        // 관리자 - 프로젝트 삭제 제외한 모든 권한  
  EDITOR = 'editor',      // 편집자 - 콘텐츠 편집, 파일 관리
  REVIEWER = 'reviewer',  // 검토자 - 콘텐츠 조회, 피드백 작성
  VIEWER = 'viewer'       // 조회자 - 읽기 전용
}

// Granular Permission System
export enum Permission {
  // 프로젝트 생명주기 관리
  PROJECT_CREATE = 'project.create',
  PROJECT_DELETE = 'project.delete',
  PROJECT_ARCHIVE = 'project.archive',
  PROJECT_SETTINGS_EDIT = 'project.settings.edit',
  PROJECT_ANALYTICS_VIEW = 'project.analytics.view',
  
  // 멤버 관리
  MEMBER_INVITE = 'member.invite',
  MEMBER_REMOVE = 'member.remove',
  MEMBER_ROLE_CHANGE = 'member.role.change',
  MEMBER_LIST_VIEW = 'member.list.view',
  
  // 콘텐츠 관리
  CONTENT_CREATE = 'content.create',
  CONTENT_EDIT = 'content.edit',
  CONTENT_DELETE = 'content.delete',
  CONTENT_PUBLISH = 'content.publish',
  CONTENT_VIEW = 'content.view',
  
  // 파일 관리
  FILE_UPLOAD = 'file.upload',
  FILE_DELETE = 'file.delete',
  FILE_DOWNLOAD = 'file.download',
  FILE_VERSION_MANAGE = 'file.version.manage',
  
  // 리뷰 및 피드백
  FEEDBACK_CREATE = 'feedback.create',
  FEEDBACK_EDIT = 'feedback.edit',
  FEEDBACK_DELETE = 'feedback.delete',
  FEEDBACK_RESOLVE = 'feedback.resolve',
  
  // 워크플로우 관리
  WORKFLOW_CREATE = 'workflow.create',
  WORKFLOW_EDIT = 'workflow.edit',
  WORKFLOW_EXECUTE = 'workflow.execute',
  WORKFLOW_APPROVE = 'workflow.approve',
  
  // 댓글 시스템
  COMMENT_CREATE = 'comment.create',
  COMMENT_EDIT = 'comment.edit',
  COMMENT_DELETE = 'comment.delete',
  COMMENT_MODERATE = 'comment.moderate'
}

// 역할별 권한 매핑 - 완전한 RBAC 매트릭스
export const ROLE_PERMISSIONS: Record<ProjectRole, Permission[]> = {
  [ProjectRole.OWNER]: [
    // 모든 권한 보유
    Permission.PROJECT_CREATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_ARCHIVE,
    Permission.PROJECT_SETTINGS_EDIT,
    Permission.PROJECT_ANALYTICS_VIEW,
    
    Permission.MEMBER_INVITE,
    Permission.MEMBER_REMOVE,
    Permission.MEMBER_ROLE_CHANGE,
    Permission.MEMBER_LIST_VIEW,
    
    Permission.CONTENT_CREATE,
    Permission.CONTENT_EDIT,
    Permission.CONTENT_DELETE,
    Permission.CONTENT_PUBLISH,
    Permission.CONTENT_VIEW,
    
    Permission.FILE_UPLOAD,
    Permission.FILE_DELETE,
    Permission.FILE_DOWNLOAD,
    Permission.FILE_VERSION_MANAGE,
    
    Permission.FEEDBACK_CREATE,
    Permission.FEEDBACK_EDIT,
    Permission.FEEDBACK_DELETE,
    Permission.FEEDBACK_RESOLVE,
    
    Permission.WORKFLOW_CREATE,
    Permission.WORKFLOW_EDIT,
    Permission.WORKFLOW_EXECUTE,
    Permission.WORKFLOW_APPROVE,
    
    Permission.COMMENT_CREATE,
    Permission.COMMENT_EDIT,
    Permission.COMMENT_DELETE,
    Permission.COMMENT_MODERATE
  ],
  
  [ProjectRole.ADMIN]: [
    // 프로젝트 삭제 제외한 모든 권한
    Permission.PROJECT_ARCHIVE,
    Permission.PROJECT_SETTINGS_EDIT,
    Permission.PROJECT_ANALYTICS_VIEW,
    
    Permission.MEMBER_INVITE,
    Permission.MEMBER_REMOVE,
    Permission.MEMBER_ROLE_CHANGE,
    Permission.MEMBER_LIST_VIEW,
    
    Permission.CONTENT_CREATE,
    Permission.CONTENT_EDIT,
    Permission.CONTENT_DELETE,
    Permission.CONTENT_PUBLISH,
    Permission.CONTENT_VIEW,
    
    Permission.FILE_UPLOAD,
    Permission.FILE_DELETE,
    Permission.FILE_DOWNLOAD,
    Permission.FILE_VERSION_MANAGE,
    
    Permission.FEEDBACK_CREATE,
    Permission.FEEDBACK_EDIT,
    Permission.FEEDBACK_DELETE,
    Permission.FEEDBACK_RESOLVE,
    
    Permission.WORKFLOW_CREATE,
    Permission.WORKFLOW_EDIT,
    Permission.WORKFLOW_EXECUTE,
    Permission.WORKFLOW_APPROVE,
    
    Permission.COMMENT_CREATE,
    Permission.COMMENT_EDIT,
    Permission.COMMENT_DELETE,
    Permission.COMMENT_MODERATE
  ],
  
  [ProjectRole.EDITOR]: [
    // 콘텐츠 편집 및 파일 관리 중심
    Permission.CONTENT_CREATE,
    Permission.CONTENT_EDIT,
    Permission.CONTENT_VIEW,
    
    Permission.FILE_UPLOAD,
    Permission.FILE_DELETE,
    Permission.FILE_DOWNLOAD,
    Permission.FILE_VERSION_MANAGE,
    
    Permission.FEEDBACK_CREATE,
    Permission.FEEDBACK_EDIT,
    
    Permission.WORKFLOW_EXECUTE,
    
    Permission.COMMENT_CREATE,
    Permission.COMMENT_EDIT
  ],
  
  [ProjectRole.REVIEWER]: [
    // 리뷰 및 피드백 중심
    Permission.CONTENT_VIEW,
    
    Permission.FILE_DOWNLOAD,
    
    Permission.FEEDBACK_CREATE,
    Permission.FEEDBACK_EDIT,
    Permission.FEEDBACK_RESOLVE,
    
    Permission.WORKFLOW_APPROVE,
    
    Permission.COMMENT_CREATE,
    Permission.COMMENT_EDIT
  ],
  
  [ProjectRole.VIEWER]: [
    // 읽기 전용
    Permission.CONTENT_VIEW,
    Permission.FILE_DOWNLOAD,
    Permission.COMMENT_CREATE
  ]
}

// 역할 계층 구조 (숫자가 높을수록 상위 권한)
export const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  [ProjectRole.OWNER]: 5,
  [ProjectRole.ADMIN]: 4,
  [ProjectRole.EDITOR]: 3,
  [ProjectRole.REVIEWER]: 2,
  [ProjectRole.VIEWER]: 1
}

// 리소스별 권한 그룹 정의
export interface ResourcePermissions {
  project: Permission[]
  member: Permission[]
  content: Permission[]
  file: Permission[]
  feedback: Permission[]
  workflow: Permission[]
  comment: Permission[]
}

export const RESOURCE_PERMISSIONS: ResourcePermissions = {
  project: [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_ARCHIVE,
    Permission.PROJECT_SETTINGS_EDIT,
    Permission.PROJECT_ANALYTICS_VIEW
  ],
  member: [
    Permission.MEMBER_INVITE,
    Permission.MEMBER_REMOVE,
    Permission.MEMBER_ROLE_CHANGE,
    Permission.MEMBER_LIST_VIEW
  ],
  content: [
    Permission.CONTENT_CREATE,
    Permission.CONTENT_EDIT,
    Permission.CONTENT_DELETE,
    Permission.CONTENT_PUBLISH,
    Permission.CONTENT_VIEW
  ],
  file: [
    Permission.FILE_UPLOAD,
    Permission.FILE_DELETE,
    Permission.FILE_DOWNLOAD,
    Permission.FILE_VERSION_MANAGE
  ],
  feedback: [
    Permission.FEEDBACK_CREATE,
    Permission.FEEDBACK_EDIT,
    Permission.FEEDBACK_DELETE,
    Permission.FEEDBACK_RESOLVE
  ],
  workflow: [
    Permission.WORKFLOW_CREATE,
    Permission.WORKFLOW_EDIT,
    Permission.WORKFLOW_EXECUTE,
    Permission.WORKFLOW_APPROVE
  ],
  comment: [
    Permission.COMMENT_CREATE,
    Permission.COMMENT_EDIT,
    Permission.COMMENT_DELETE,
    Permission.COMMENT_MODERATE
  ]
}

// 사용자별 권한 컨텍스트
export interface UserPermissionContext {
  userId: string
  projectId: string
  role: ProjectRole
  permissions: Permission[]
  restrictions: PermissionRestrictions
  metadata: PermissionMetadata
}

export interface PermissionRestrictions {
  ipWhitelist?: string[]
  timeRestrictions?: TimeRestriction[]
  resourceLimits: ResourceLimits
  requireMfa: boolean
}

export interface TimeRestriction {
  startHour: number  // 0-23
  endHour: number    // 0-23
  daysOfWeek: number[]  // 0=Sunday, 6=Saturday
  timezone: string
}

export interface ResourceLimits {
  maxFileSize?: number      // bytes
  maxUploadPerDay?: number  // count
  allowedFileTypes?: string[]
  maxCommentLength?: number // characters
}

export interface PermissionMetadata {
  grantedAt: Date
  grantedBy: string
  lastUsedAt?: Date
  expiresAt?: Date
  source: 'role' | 'explicit' | 'inherited'
}

// Permission Check Result
export interface PermissionCheckResult {
  granted: boolean
  reason?: string
  requiredRole?: ProjectRole
  restrictions?: string[]
  metadata?: Record<string, unknown>
}

// Zod Schemas for Runtime Validation
export const ProjectRoleSchema = z.nativeEnum(ProjectRole)
export const PermissionSchema = z.nativeEnum(Permission)

export const UserPermissionContextSchema = z.object({
  userId: z.string().min(1),
  projectId: z.string().min(1),
  role: ProjectRoleSchema,
  permissions: z.array(PermissionSchema),
  restrictions: z.object({
    ipWhitelist: z.array(z.string().ip()).optional(),
    timeRestrictions: z.array(z.object({
      startHour: z.number().min(0).max(23),
      endHour: z.number().min(0).max(23),
      daysOfWeek: z.array(z.number().min(0).max(6)),
      timezone: z.string()
    })).optional(),
    resourceLimits: z.object({
      maxFileSize: z.number().positive().optional(),
      maxUploadPerDay: z.number().positive().optional(),
      allowedFileTypes: z.array(z.string()).optional(),
      maxCommentLength: z.number().positive().optional()
    }),
    requireMfa: z.boolean()
  }),
  metadata: z.object({
    grantedAt: z.date(),
    grantedBy: z.string(),
    lastUsedAt: z.date().optional(),
    expiresAt: z.date().optional(),
    source: z.enum(['role', 'explicit', 'inherited'])
  })
})

export const PermissionCheckResultSchema = z.object({
  granted: z.boolean(),
  reason: z.string().optional(),
  requiredRole: ProjectRoleSchema.optional(),
  restrictions: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional()
})

// 검증 함수
export const validateUserPermissionContext = (context: unknown): UserPermissionContext => {
  return UserPermissionContextSchema.parse(context)
}

export const validatePermissionCheckResult = (result: unknown): PermissionCheckResult => {
  return PermissionCheckResultSchema.parse(result)
}