/**
 * RBAC Permission System - 권한 관리 시스템 타입 정의
 * Phase 2a - 엔티티 레이어 구현
 */

export enum UserRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor', 
  REVIEWER = 'reviewer',
  VIEWER = 'viewer'
}

export enum Permission {
  PROJECT_CREATE = 'project:create',
  PROJECT_DELETE = 'project:delete',
  PROJECT_EDIT = 'project:edit',
  VIDEO_UPLOAD = 'video:upload',
  VIDEO_DELETE = 'video:delete',
  COMMENT_CREATE = 'comment:create',
  COMMENT_MODERATE = 'comment:moderate',
  COMMENT_DELETE = 'comment:delete',
  TEAM_INVITE = 'team:invite',
  TEAM_REMOVE = 'team:remove',
  SETTINGS_MANAGE = 'settings:manage',
  ANALYTICS_VIEW = 'analytics:view'
}

export interface RBACUser {
  id: string
  name: string
  email: string
  role: UserRole
  permissions: Permission[]
  customPermissions?: Record<string, boolean>
  projectPermissions?: Record<string, Permission[]> // 프로젝트별 세부 권한
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PermissionCheck {
  userId: string
  permission: Permission
  resourceId?: string
  context?: {
    projectId?: string
    isOwner?: boolean
    teamRole?: string
  }
}

export interface PermissionResult {
  allowed: boolean
  reason?: string
  requiredRole?: UserRole
  missingPermissions?: Permission[]
}

/**
 * 역할 계층 구조 (상위 역할은 하위 역할의 모든 권한 포함)
 */
export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.OWNER]: [UserRole.ADMIN, UserRole.EDITOR, UserRole.REVIEWER, UserRole.VIEWER],
  [UserRole.ADMIN]: [UserRole.EDITOR, UserRole.REVIEWER, UserRole.VIEWER],
  [UserRole.EDITOR]: [UserRole.REVIEWER, UserRole.VIEWER],
  [UserRole.REVIEWER]: [UserRole.VIEWER],
  [UserRole.VIEWER]: []
}

/**
 * 역할별 기본 권한 매핑
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.OWNER]: [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_EDIT,
    Permission.VIDEO_UPLOAD,
    Permission.VIDEO_DELETE,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_MODERATE,
    Permission.COMMENT_DELETE,
    Permission.TEAM_INVITE,
    Permission.TEAM_REMOVE,
    Permission.SETTINGS_MANAGE,
    Permission.ANALYTICS_VIEW
  ],
  [UserRole.ADMIN]: [
    Permission.PROJECT_CREATE,
    Permission.PROJECT_EDIT,
    Permission.VIDEO_UPLOAD,
    Permission.VIDEO_DELETE,
    Permission.COMMENT_CREATE,
    Permission.COMMENT_MODERATE,
    Permission.TEAM_INVITE,
    Permission.ANALYTICS_VIEW
  ],
  [UserRole.EDITOR]: [
    Permission.VIDEO_UPLOAD,
    Permission.COMMENT_CREATE,
    Permission.PROJECT_EDIT
  ],
  [UserRole.REVIEWER]: [
    Permission.COMMENT_CREATE
  ],
  [UserRole.VIEWER]: []
}