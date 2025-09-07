/**
 * Role-Based Access Control (RBAC) System
 * DEVPLAN.md 요구사항: RBAC 시스템(Owner/Admin/Editor/Reviewer/Viewer)
 * @layer shared/lib
 */

import { z } from 'zod'

// ===========================
// Role Definitions
// ===========================

/**
 * 프로젝트 역할 계층구조 (권한 순서)
 * Owner > Admin > Editor > Reviewer > Viewer
 */
export type ProjectRole = 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer'

export const PROJECT_ROLES: readonly ProjectRole[] = ['owner', 'admin', 'editor', 'reviewer', 'viewer'] as const

export const ProjectRoleSchema = z.enum(['owner', 'admin', 'editor', 'reviewer', 'viewer'])

// ===========================
// Permission Definitions
// ===========================

export type Permission = 
  // Project management
  | 'project:read'
  | 'project:update'
  | 'project:delete'
  | 'project:archive'
  | 'project:settings'
  
  // Team management  
  | 'team:invite'
  | 'team:remove'
  | 'team:role_change'
  | 'team:view_members'
  
  // Content management
  | 'content:create'
  | 'content:update'
  | 'content:delete'
  | 'content:publish'
  | 'content:review'
  | 'content:comment'
  
  // Calendar & Scheduling
  | 'schedule:read'
  | 'schedule:create'
  | 'schedule:update'
  | 'schedule:delete'
  
  // File management
  | 'file:upload'
  | 'file:download'
  | 'file:delete'
  | 'file:share'

// ===========================
// Role-Permission Matrix
// ===========================

/**
 * 각 역할별 기본 권한 매트릭스
 * DEVPLAN.md 요구사항에 따른 세분화된 권한 체계
 */
export const ROLE_PERMISSIONS: Record<ProjectRole, Permission[]> = {
  owner: [
    // Full access to everything
    'project:read', 'project:update', 'project:delete', 'project:archive', 'project:settings',
    'team:invite', 'team:remove', 'team:role_change', 'team:view_members',
    'content:create', 'content:update', 'content:delete', 'content:publish', 'content:review', 'content:comment',
    'schedule:read', 'schedule:create', 'schedule:update', 'schedule:delete',
    'file:upload', 'file:download', 'file:delete', 'file:share'
  ],
  
  admin: [
    // Almost full access except deletion
    'project:read', 'project:update', 'project:archive', 'project:settings',
    'team:invite', 'team:remove', 'team:role_change', 'team:view_members',
    'content:create', 'content:update', 'content:delete', 'content:publish', 'content:review', 'content:comment',
    'schedule:read', 'schedule:create', 'schedule:update', 'schedule:delete',
    'file:upload', 'file:download', 'file:delete', 'file:share'
  ],
  
  editor: [
    // Content creation and editing
    'project:read',
    'team:view_members',
    'content:create', 'content:update', 'content:publish', 'content:comment',
    'schedule:read', 'schedule:create', 'schedule:update',
    'file:upload', 'file:download', 'file:share'
  ],
  
  reviewer: [
    // Review and comment only
    'project:read',
    'team:view_members', 
    'content:review', 'content:comment',
    'schedule:read',
    'file:download'
  ],
  
  viewer: [
    // Read-only access
    'project:read',
    'schedule:read',
    'file:download'
  ]
}

// ===========================
// RBAC Core Functions
// ===========================

/**
 * 사용자 역할이 특정 권한을 가지고 있는지 확인
 */
export function hasPermission(role: ProjectRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

/**
 * 사용자 역할이 여러 권한을 모두 가지고 있는지 확인
 */
export function hasAllPermissions(role: ProjectRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role]
  return permissions.every(permission => rolePermissions.includes(permission))
}

/**
 * 사용자 역할이 여러 권한 중 하나라도 가지고 있는지 확인
 */
export function hasAnyPermission(role: ProjectRole, permissions: Permission[]): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role]
  return permissions.some(permission => rolePermissions.includes(permission))
}

/**
 * 역할 간 계층 구조를 확인 (더 높은 권한인지)
 */
export function isHigherRole(role1: ProjectRole, role2: ProjectRole): boolean {
  const role1Index = PROJECT_ROLES.indexOf(role1)
  const role2Index = PROJECT_ROLES.indexOf(role2)
  
  return role1Index < role2Index // 배열 앞쪽이 더 높은 권한
}

/**
 * 역할을 다른 역할로 변경할 수 있는지 확인
 */
export function canChangeRole(currentUserRole: ProjectRole, targetRole: ProjectRole, newRole: ProjectRole): boolean {
  // Owner만이 다른 사용자의 역할을 변경할 수 있음
  if (currentUserRole !== 'owner') {
    return false
  }
  
  // Owner 역할을 다른 사람에게 줄 수는 없음 (프로젝트 이관은 별도 프로세스)
  if (newRole === 'owner') {
    return false
  }
  
  return true
}

// ===========================
// Permission Helpers
// ===========================

/**
 * 프로젝트 관리 권한 번들
 */
export function canManageProject(role: ProjectRole): boolean {
  return hasAnyPermission(role, ['project:update', 'project:delete', 'project:archive'])
}

/**
 * 팀 관리 권한 번들
 */
export function canManageTeam(role: ProjectRole): boolean {
  return hasAnyPermission(role, ['team:invite', 'team:remove', 'team:role_change'])
}

/**
 * 콘텐츠 편집 권한 번들
 */
export function canEditContent(role: ProjectRole): boolean {
  return hasAnyPermission(role, ['content:create', 'content:update', 'content:delete'])
}

/**
 * 스케줄 관리 권한 번들
 */
export function canManageSchedule(role: ProjectRole): boolean {
  return hasAnyPermission(role, ['schedule:create', 'schedule:update', 'schedule:delete'])
}

// ===========================
// Role Display Helpers
// ===========================

/**
 * 역할을 한국어로 표시
 */
export function getRoleDisplayName(role: ProjectRole): string {
  const roleNames: Record<ProjectRole, string> = {
    owner: '소유자',
    admin: '관리자', 
    editor: '편집자',
    reviewer: '리뷰어',
    viewer: '뷰어'
  }
  
  return roleNames[role]
}

/**
 * 역할 설명 텍스트
 */
export function getRoleDescription(role: ProjectRole): string {
  const roleDescriptions: Record<ProjectRole, string> = {
    owner: '프로젝트의 모든 권한을 가지며, 프로젝트 삭제 및 소유권 이전이 가능합니다.',
    admin: '프로젝트 관리 및 팀 관리 권한을 가지며, 프로젝트 삭제를 제외한 모든 작업이 가능합니다.',
    editor: '프로젝트 콘텐츠 생성, 편집, 게시 권한을 가집니다.',
    reviewer: '프로젝트 내용을 검토하고 피드백을 제공할 수 있습니다.',
    viewer: '프로젝트 내용을 조회만 할 수 있습니다.'
  }
  
  return roleDescriptions[role]
}

// ===========================
// Permission Validation
// ===========================

/**
 * 권한 기반 액션 검증 스키마
 */
export const PermissionActionSchema = z.object({
  action: z.enum([
    'create_project', 'update_project', 'delete_project', 'archive_project',
    'invite_member', 'remove_member', 'change_role',
    'create_content', 'update_content', 'delete_content', 'publish_content',
    'create_schedule', 'update_schedule', 'delete_schedule'
  ]),
  resourceId: z.string(),
  userId: z.string(),
  role: ProjectRoleSchema
})

export type PermissionAction = z.infer<typeof PermissionActionSchema>

/**
 * 액션에 따른 필요 권한 매핑
 */
const ACTION_PERMISSION_MAP: Record<PermissionAction['action'], Permission> = {
  create_project: 'project:update',
  update_project: 'project:update', 
  delete_project: 'project:delete',
  archive_project: 'project:archive',
  invite_member: 'team:invite',
  remove_member: 'team:remove',
  change_role: 'team:role_change',
  create_content: 'content:create',
  update_content: 'content:update',
  delete_content: 'content:delete',
  publish_content: 'content:publish',
  create_schedule: 'schedule:create',
  update_schedule: 'schedule:update',
  delete_schedule: 'schedule:delete'
}

/**
 * 액션 실행 권한 검증
 */
export function validatePermissionAction(action: PermissionAction): boolean {
  const requiredPermission = ACTION_PERMISSION_MAP[action.action]
  return hasPermission(action.role, requiredPermission)
}

// ===========================
// Context-Aware Permissions
// ===========================

/**
 * 프로젝트 컨텍스트 내에서의 권한 체크
 */
export interface ProjectPermissionContext {
  projectId: string
  currentUserId: string
  userRole: ProjectRole
  projectOwnerId: string
  isPublicProject: boolean
}

/**
 * 컨텍스트를 고려한 권한 계산
 */
export function calculateContextualPermissions(
  context: ProjectPermissionContext
): Record<string, boolean> {
  const { userRole, currentUserId, projectOwnerId, isPublicProject } = context
  
  const isOwner = currentUserId === projectOwnerId
  const basePermissions = ROLE_PERMISSIONS[userRole]
  
  return {
    // 기본 권한들
    canView: hasPermission(userRole, 'project:read') || isPublicProject,
    canEdit: hasPermission(userRole, 'project:update'),
    canDelete: hasPermission(userRole, 'project:delete') && isOwner,
    canArchive: hasPermission(userRole, 'project:archive'),
    canManageSettings: hasPermission(userRole, 'project:settings') && isOwner,
    
    // 팀 관리
    canInviteMembers: hasPermission(userRole, 'team:invite'),
    canRemoveMembers: hasPermission(userRole, 'team:remove'),
    canChangeRoles: hasPermission(userRole, 'team:role_change') && isOwner,
    
    // 콘텐츠 관리
    canCreateContent: hasPermission(userRole, 'content:create'),
    canEditContent: hasPermission(userRole, 'content:update'), 
    canDeleteContent: hasPermission(userRole, 'content:delete'),
    canPublishContent: hasPermission(userRole, 'content:publish'),
    canReviewContent: hasPermission(userRole, 'content:review'),
    canCommentContent: hasPermission(userRole, 'content:comment'),
    
    // 스케줄링
    canViewSchedule: hasPermission(userRole, 'schedule:read'),
    canCreateSchedule: hasPermission(userRole, 'schedule:create'),
    canEditSchedule: hasPermission(userRole, 'schedule:update'),
    canDeleteSchedule: hasPermission(userRole, 'schedule:delete'),
    
    // 파일 관리
    canUploadFiles: hasPermission(userRole, 'file:upload'),
    canDownloadFiles: hasPermission(userRole, 'file:download'),
    canDeleteFiles: hasPermission(userRole, 'file:delete'),
    canShareFiles: hasPermission(userRole, 'file:share')
  }
}

// ===========================
// Exports for Components
// ===========================

// Export types removed to avoid duplication - types already exported above