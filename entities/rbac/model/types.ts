/**
 * RBAC Permission System - 권한 관리 시스템 타입 정의
 * Phase 2a - 엔티티 레이어 구현
 */

export enum UserRole {
  ADMIN = 'admin',        // 모든 권한
  MANAGER = 'manager',    // 프로젝트 관리, 팀원 초대
  EDITOR = 'editor',      // 콘텐츠 편집, 피드백 작성
  VIEWER = 'viewer'       // 조회만 가능
}

export enum Permission {
  // 프로젝트 관리
  PROJECT_CREATE = 'project:create',
  PROJECT_READ = 'project:read',
  PROJECT_UPDATE = 'project:update',
  PROJECT_DELETE = 'project:delete',
  PROJECT_EXPORT = 'project:export',
  
  // 비디오 관리
  VIDEO_UPLOAD = 'video:upload',
  VIDEO_READ = 'video:read',
  VIDEO_UPDATE = 'video:update',
  VIDEO_DELETE = 'video:delete',
  VIDEO_PROCESS = 'video:process',
  
  // 팀 관리
  TEAM_INVITE = 'team:invite',
  TEAM_REMOVE = 'team:remove',
  TEAM_READ = 'team:read',
  TEAM_UPDATE = 'team:update',
  
  // 피드백/댓글 관리
  FEEDBACK_CREATE = 'feedback:create',
  FEEDBACK_READ = 'feedback:read',
  FEEDBACK_UPDATE = 'feedback:update',
  FEEDBACK_DELETE = 'feedback:delete',
  FEEDBACK_MODERATE = 'feedback:moderate',
  
  // 설정 관리
  SETTINGS_READ = 'settings:read',
  SETTINGS_UPDATE = 'settings:update',
  
  // 분석 및 보고서
  ANALYTICS_READ = 'analytics:read',
  
  // 시스템 관리 (Admin 전용)
  SYSTEM_ADMIN = 'system:admin',
  USER_MANAGE = 'user:manage',
  AUDIT_LOG_READ = 'audit:read'
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
 * 감사 로그 인터페이스
 */
export interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  resource: string
  resourceId?: string
  permission: Permission
  result: 'allowed' | 'denied'
  reason?: string
  context?: {
    projectId?: string
    userAgent?: string
    ipAddress?: string
    timestamp: string
  }
  createdAt: string
}

/**
 * 권한 캐시 인터페이스
 */
export interface PermissionCache {
  userId: string
  permissions: Permission[]
  projectPermissions: Record<string, Permission[]>
  expiresAt: number
  lastUpdated: string
}

/**
 * 역할 계층 구조 (상위 역할은 하위 역할의 모든 권한 포함)
 */
export const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  [UserRole.ADMIN]: [UserRole.MANAGER, UserRole.EDITOR, UserRole.VIEWER],
  [UserRole.MANAGER]: [UserRole.EDITOR, UserRole.VIEWER],
  [UserRole.EDITOR]: [UserRole.VIEWER],
  [UserRole.VIEWER]: []
}

/**
 * 역할별 기본 권한 매핑 (DEVPLAN 요구사항 반영)
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: [
    // 모든 권한
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_DELETE,
    Permission.PROJECT_EXPORT,
    Permission.VIDEO_UPLOAD,
    Permission.VIDEO_READ,
    Permission.VIDEO_UPDATE,
    Permission.VIDEO_DELETE,
    Permission.VIDEO_PROCESS,
    Permission.TEAM_INVITE,
    Permission.TEAM_REMOVE,
    Permission.TEAM_READ,
    Permission.TEAM_UPDATE,
    Permission.FEEDBACK_CREATE,
    Permission.FEEDBACK_READ,
    Permission.FEEDBACK_UPDATE,
    Permission.FEEDBACK_DELETE,
    Permission.FEEDBACK_MODERATE,
    Permission.SETTINGS_READ,
    Permission.SETTINGS_UPDATE,
    Permission.ANALYTICS_READ,
    Permission.SYSTEM_ADMIN,
    Permission.USER_MANAGE,
    Permission.AUDIT_LOG_READ
  ],
  [UserRole.MANAGER]: [
    // 프로젝트 관리, 팀원 초대
    Permission.PROJECT_CREATE,
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.PROJECT_EXPORT,
    Permission.VIDEO_READ,
    Permission.VIDEO_UPDATE,
    Permission.VIDEO_PROCESS,
    Permission.TEAM_INVITE,
    Permission.TEAM_READ,
    Permission.TEAM_UPDATE,
    Permission.FEEDBACK_CREATE,
    Permission.FEEDBACK_READ,
    Permission.FEEDBACK_UPDATE,
    Permission.FEEDBACK_MODERATE,
    Permission.SETTINGS_READ,
    Permission.ANALYTICS_READ
  ],
  [UserRole.EDITOR]: [
    // 콘텐츠 편집, 피드백 작성
    Permission.PROJECT_READ,
    Permission.PROJECT_UPDATE,
    Permission.VIDEO_UPLOAD,
    Permission.VIDEO_READ,
    Permission.VIDEO_UPDATE,
    Permission.TEAM_READ,
    Permission.FEEDBACK_CREATE,
    Permission.FEEDBACK_READ,
    Permission.FEEDBACK_UPDATE,
    Permission.SETTINGS_READ
  ],
  [UserRole.VIEWER]: [
    // 조회만 가능
    Permission.PROJECT_READ,
    Permission.VIDEO_READ,
    Permission.TEAM_READ,
    Permission.FEEDBACK_READ,
    Permission.SETTINGS_READ
  ]
}