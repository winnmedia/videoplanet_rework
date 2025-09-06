/**
 * RBAC Permission Checker - 권한 검사 로직
 * Phase 2a - 비즈니스 규칙 구현
 */

import type { RBACUser, PermissionCheck, PermissionResult, UserRole } from '../model/types'
import { Permission, DEFAULT_ROLE_PERMISSIONS, ROLE_HIERARCHY } from '../model/types'

export class PermissionChecker {
  /**
   * 사용자가 특정 권한을 가지고 있는지 확인
   */
  static hasPermission(user: RBACUser, permission: Permission, context?: PermissionCheck['context']): PermissionResult {
    if (!user.isActive) {
      return {
        allowed: false,
        reason: '비활성 사용자입니다.'
      }
    }

    // 1. 명시적 권한 확인
    if (user.permissions.includes(permission)) {
      return { allowed: true }
    }

    // 2. 역할 기반 권한 확인
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || []
    if (rolePermissions.includes(permission)) {
      return { allowed: true }
    }

    // 3. 프로젝트별 권한 확인
    if (context?.projectId && user.projectPermissions?.[context.projectId]) {
      const projectPermissions = user.projectPermissions[context.projectId]
      if (projectPermissions.includes(permission)) {
        return { allowed: true }
      }
    }

    // 4. 커스텀 권한 확인
    const permissionKey = permission.toString()
    if (user.customPermissions?.[permissionKey] === true) {
      return { allowed: true }
    }

    // 5. 컨텍스트 기반 권한 (예: 프로젝트 소유자)
    if (context?.isOwner && this.isAdminOnlyPermission(permission)) {
      return { allowed: true }
    }

    return {
      allowed: false,
      reason: `'${permission}' 권한이 없습니다.`,
      requiredRole: this.getRequiredRole(permission),
      missingPermissions: [permission]
    }
  }

  /**
   * 사용자가 여러 권한을 모두 가지고 있는지 확인
   */
  static hasAllPermissions(user: RBACUser, permissions: Permission[], context?: PermissionCheck['context']): PermissionResult {
    const missingPermissions: Permission[] = []
    
    for (const permission of permissions) {
      const result = this.hasPermission(user, permission, context)
      if (!result.allowed) {
        missingPermissions.push(permission)
      }
    }

    if (missingPermissions.length === 0) {
      return { allowed: true }
    }

    return {
      allowed: false,
      reason: `다음 권한이 필요합니다: ${missingPermissions.join(', ')}`,
      missingPermissions
    }
  }

  /**
   * 사용자가 권한 중 하나라도 가지고 있는지 확인
   */
  static hasAnyPermission(user: RBACUser, permissions: Permission[], context?: PermissionCheck['context']): PermissionResult {
    for (const permission of permissions) {
      const result = this.hasPermission(user, permission, context)
      if (result.allowed) {
        return { allowed: true }
      }
    }

    return {
      allowed: false,
      reason: `다음 권한 중 하나가 필요합니다: ${permissions.join(', ')}`,
      missingPermissions: permissions
    }
  }

  /**
   * 사용자 역할이 다른 역할보다 높은지 확인
   */
  static isHigherRole(userRole: UserRole, targetRole: UserRole): boolean {
    const hierarchy = ROLE_HIERARCHY[userRole] || []
    return hierarchy.includes(targetRole)
  }

  /**
   * 권한에 필요한 최소 역할 반환
   */
  private static getRequiredRole(permission: Permission): UserRole | undefined {
    for (const [role, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
      if (permissions.includes(permission)) {
        return role as UserRole
      }
    }
    return undefined
  }

  /**
   * 관리자만 가질 수 있는 권한인지 확인
   */
  private static isAdminOnlyPermission(permission: Permission): boolean {
    const adminOnlyPermissions = [
      Permission.PROJECT_DELETE,
      Permission.VIDEO_DELETE,
      Permission.TEAM_REMOVE,
      Permission.SETTINGS_UPDATE,
      Permission.SYSTEM_ADMIN,
      Permission.USER_MANAGE,
      Permission.AUDIT_LOG_READ
    ]
    return adminOnlyPermissions.includes(permission)
  }

  /**
   * 사용자의 유효한 권한 목록 반환
   */
  static getValidPermissions(user: RBACUser): Permission[] {
    if (!user.isActive) return []

    const permissions = new Set<Permission>()

    // 역할 기반 권한 추가
    const rolePermissions = DEFAULT_ROLE_PERMISSIONS[user.role] || []
    rolePermissions.forEach(p => permissions.add(p))

    // 명시적 권한 추가
    user.permissions.forEach(p => permissions.add(p))

    // 커스텀 권한 추가
    if (user.customPermissions) {
      Object.entries(user.customPermissions).forEach(([key, value]) => {
        if (value === true && Object.values(Permission).includes(key as Permission)) {
          permissions.add(key as Permission)
        }
      })
    }

    return Array.from(permissions)
  }
}