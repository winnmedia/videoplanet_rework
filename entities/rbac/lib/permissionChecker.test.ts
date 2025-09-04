/**
 * PermissionChecker - TDD 테스트
 * Phase 2a - Red → Green → Refactor
 */

import { describe, it, expect } from 'vitest'

import { PermissionChecker } from './permissionChecker'
import type { RBACUser } from '../model/types'
import { UserRole, Permission } from '../model/types'

describe('PermissionChecker', () => {
  const mockOwner: RBACUser = {
    id: 'owner-1',
    name: 'Owner User',
    email: 'owner@example.com',
    role: UserRole.OWNER,
    permissions: [],
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }

  const mockViewer: RBACUser = {
    id: 'viewer-1', 
    name: 'Viewer User',
    email: 'viewer@example.com',
    role: UserRole.VIEWER,
    permissions: [],
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }

  const mockEditor: RBACUser = {
    id: 'editor-1',
    name: 'Editor User', 
    email: 'editor@example.com',
    role: UserRole.EDITOR,
    permissions: [],
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z'
  }

  describe('hasPermission', () => {
    it('OWNER 역할이 모든 프로젝트 권한을 가져야 한다', () => {
      const result = PermissionChecker.hasPermission(mockOwner, Permission.PROJECT_DELETE)
      expect(result.allowed).toBe(true)
    })

    it('VIEWER 역할이 프로젝트 삭제 권한을 가지지 않아야 한다', () => {
      const result = PermissionChecker.hasPermission(mockViewer, Permission.PROJECT_DELETE)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('권한이 없습니다')
    })

    it('EDITOR 역할이 비디오 업로드 권한을 가져야 한다', () => {
      const result = PermissionChecker.hasPermission(mockEditor, Permission.VIDEO_UPLOAD)
      expect(result.allowed).toBe(true)
    })

    it('비활성 사용자는 모든 권한이 거부되어야 한다', () => {
      const inactiveUser: RBACUser = {
        ...mockOwner,
        isActive: false
      }
      
      const result = PermissionChecker.hasPermission(inactiveUser, Permission.PROJECT_CREATE)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('비활성 사용자')
    })

    it('명시적 권한이 역할 권한보다 우선해야 한다', () => {
      const userWithCustomPermission: RBACUser = {
        ...mockViewer,
        permissions: [Permission.PROJECT_CREATE]
      }
      
      const result = PermissionChecker.hasPermission(userWithCustomPermission, Permission.PROJECT_CREATE)
      expect(result.allowed).toBe(true)
    })

    it('프로젝트별 권한이 작동해야 한다', () => {
      const userWithProjectPermission: RBACUser = {
        ...mockViewer,
        projectPermissions: {
          'project-123': [Permission.COMMENT_CREATE]
        }
      }
      
      const result = PermissionChecker.hasPermission(
        userWithProjectPermission, 
        Permission.COMMENT_CREATE,
        { projectId: 'project-123' }
      )
      expect(result.allowed).toBe(true)
    })

    it('컨텍스트 기반 소유자 권한이 작동해야 한다', () => {
      const result = PermissionChecker.hasPermission(
        mockViewer,
        Permission.PROJECT_DELETE,
        { isOwner: true }
      )
      expect(result.allowed).toBe(true)
    })
  })

  describe('hasAllPermissions', () => {
    it('모든 권한을 가진 경우 통과해야 한다', () => {
      const permissions = [Permission.PROJECT_CREATE, Permission.VIDEO_UPLOAD]
      const result = PermissionChecker.hasAllPermissions(mockOwner, permissions)
      expect(result.allowed).toBe(true)
    })

    it('일부 권한이 없는 경우 실패하고 누락된 권한을 반환해야 한다', () => {
      const permissions = [Permission.PROJECT_CREATE, Permission.PROJECT_DELETE]
      const result = PermissionChecker.hasAllPermissions(mockViewer, permissions)
      expect(result.allowed).toBe(false)
      expect(result.missingPermissions).toEqual(permissions)
    })
  })

  describe('hasAnyPermission', () => {
    it('권한 중 하나라도 가진 경우 통과해야 한다', () => {
      const permissions = [Permission.PROJECT_DELETE, Permission.COMMENT_CREATE]
      const result = PermissionChecker.hasAnyPermission(mockEditor, permissions)
      expect(result.allowed).toBe(true)
    })

    it('어떤 권한도 없는 경우 실패해야 한다', () => {
      const permissions = [Permission.PROJECT_DELETE, Permission.SETTINGS_MANAGE]
      const result = PermissionChecker.hasAnyPermission(mockViewer, permissions)
      expect(result.allowed).toBe(false)
    })
  })

  describe('isHigherRole', () => {
    it('OWNER가 ADMIN보다 높은 역할이어야 한다', () => {
      const result = PermissionChecker.isHigherRole(UserRole.OWNER, UserRole.ADMIN)
      expect(result).toBe(true)
    })

    it('VIEWER가 EDITOR보다 높지 않아야 한다', () => {
      const result = PermissionChecker.isHigherRole(UserRole.VIEWER, UserRole.EDITOR)  
      expect(result).toBe(false)
    })
  })

  describe('getValidPermissions', () => {
    it('사용자의 모든 유효한 권한을 반환해야 한다', () => {
      const userWithMixedPermissions: RBACUser = {
        ...mockEditor,
        permissions: [Permission.ANALYTICS_VIEW],
        customPermissions: {
          [Permission.TEAM_INVITE]: true
        }
      }
      
      const permissions = PermissionChecker.getValidPermissions(userWithMixedPermissions)
      
      expect(permissions).toContain(Permission.VIDEO_UPLOAD) // 역할 기반
      expect(permissions).toContain(Permission.ANALYTICS_VIEW) // 명시적
      expect(permissions).toContain(Permission.TEAM_INVITE) // 커스텀
    })

    it('비활성 사용자는 빈 권한 배열을 반환해야 한다', () => {
      const inactiveUser: RBACUser = {
        ...mockOwner,
        isActive: false
      }
      
      const permissions = PermissionChecker.getValidPermissions(inactiveUser)
      expect(permissions).toEqual([])
    })
  })
})