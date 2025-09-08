/**
 * Enhanced Permission Checker Tests
 * TDD 기반 권한 시스템 테스트
 * 
 * 테스트 시나리오:
 * 1. DEVPLAN 요구사항에 따른 역할별 권한 검증
 * 2. 프로젝트별 세부 권한 제어
 * 3. 계층적 권한 구조 확인
 * 4. 에러 시나리오 처리
 */

import { 
  UserRole, 
  Permission, 
  RBACUser, 
  DEFAULT_ROLE_PERMISSIONS,
  ROLE_HIERARCHY 
} from '../../model/types'
import { PermissionChecker } from '../permissionChecker'

describe('Enhanced Permission Checker (DEVPLAN Requirements)', () => {
  // 테스트 사용자 데이터
  const createTestUser = (role: UserRole, overrides: Partial<RBACUser> = {}): RBACUser => ({
    id: `user-${role}`,
    name: `Test ${role}`,
    email: `${role}@test.com`,
    role,
    permissions: [],
    isActive: true,
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    ...overrides
  })

  describe('DEVPLAN 역할별 권한 검증', () => {
    describe('Admin 권한 (모든 권한)', () => {
      const adminUser = createTestUser(UserRole.ADMIN)

      test('Admin은 모든 프로젝트 관리 권한을 가져야 함', () => {
        const projectPermissions = [
          Permission.PROJECT_CREATE,
          Permission.PROJECT_READ,
          Permission.PROJECT_UPDATE,
          Permission.PROJECT_DELETE,
          Permission.PROJECT_EXPORT
        ]

        projectPermissions.forEach(permission => {
          const result = PermissionChecker.hasPermission(adminUser, permission)
          expect(result.allowed).toBe(true)
          expect(result.reason).toBeUndefined()
        })
      })

      test('Admin은 모든 시스템 관리 권한을 가져야 함', () => {
        const systemPermissions = [
          Permission.SYSTEM_ADMIN,
          Permission.USER_MANAGE,
          Permission.AUDIT_LOG_READ
        ]

        systemPermissions.forEach(permission => {
          const result = PermissionChecker.hasPermission(adminUser, permission)
          expect(result.allowed).toBe(true)
          expect(result.reason).toBeUndefined()
        })
      })

      test('Admin은 팀 관리 권한을 모두 가져야 함', () => {
        const teamPermissions = [
          Permission.TEAM_INVITE,
          Permission.TEAM_REMOVE,
          Permission.TEAM_READ,
          Permission.TEAM_UPDATE
        ]

        const result = PermissionChecker.hasAllPermissions(adminUser, teamPermissions)
        expect(result.allowed).toBe(true)
      })
    })

    describe('Manager 권한 (프로젝트 관리, 팀원 초대)', () => {
      const managerUser = createTestUser(UserRole.MANAGER)

      test('Manager는 프로젝트 생성 및 관리 권한을 가져야 함', () => {
        const allowedPermissions = [
          Permission.PROJECT_CREATE,
          Permission.PROJECT_READ,
          Permission.PROJECT_UPDATE,
          Permission.PROJECT_EXPORT
        ]

        allowedPermissions.forEach(permission => {
          const result = PermissionChecker.hasPermission(managerUser, permission)
          expect(result.allowed).toBe(true)
        })
      })

      test('Manager는 프로젝트 삭제 권한이 없어야 함', () => {
        const result = PermissionChecker.hasPermission(managerUser, Permission.PROJECT_DELETE)
        expect(result.allowed).toBe(false)
        expect(result.reason).toContain('권한이 없습니다')
        expect(result.missingPermissions).toContain(Permission.PROJECT_DELETE)
      })

      test('Manager는 팀원 초대 권한을 가져야 함', () => {
        const result = PermissionChecker.hasPermission(managerUser, Permission.TEAM_INVITE)
        expect(result.allowed).toBe(true)
      })

      test('Manager는 시스템 관리 권한이 없어야 함', () => {
        const systemPermissions = [
          Permission.SYSTEM_ADMIN,
          Permission.USER_MANAGE
        ]

        systemPermissions.forEach(permission => {
          const result = PermissionChecker.hasPermission(managerUser, permission)
          expect(result.allowed).toBe(false)
        })
      })
    })

    describe('Editor 권한 (콘텐츠 편집, 피드백 작성)', () => {
      const editorUser = createTestUser(UserRole.EDITOR)

      test('Editor는 콘텐츠 편집 권한을 가져야 함', () => {
        const editPermissions = [
          Permission.PROJECT_UPDATE,
          Permission.VIDEO_UPLOAD,
          Permission.VIDEO_UPDATE,
          Permission.FEEDBACK_CREATE,
          Permission.FEEDBACK_UPDATE
        ]

        editPermissions.forEach(permission => {
          const result = PermissionChecker.hasPermission(editorUser, permission)
          expect(result.allowed).toBe(true)
        })
      })

      test('Editor는 프로젝트 생성 권한이 없어야 함', () => {
        const result = PermissionChecker.hasPermission(editorUser, Permission.PROJECT_CREATE)
        expect(result.allowed).toBe(false)
      })

      test('Editor는 팀 관리 권한이 없어야 함', () => {
        const teamPermissions = [
          Permission.TEAM_INVITE,
          Permission.TEAM_REMOVE
        ]

        const result = PermissionChecker.hasAnyPermission(editorUser, teamPermissions)
        expect(result.allowed).toBe(false)
      })
    })

    describe('Viewer 권한 (조회만 가능)', () => {
      const viewerUser = createTestUser(UserRole.VIEWER)

      test('Viewer는 조회 권한만 가져야 함', () => {
        const readPermissions = [
          Permission.PROJECT_READ,
          Permission.VIDEO_READ,
          Permission.TEAM_READ,
          Permission.FEEDBACK_READ,
          Permission.SETTINGS_READ
        ]

        readPermissions.forEach(permission => {
          const result = PermissionChecker.hasPermission(viewerUser, permission)
          expect(result.allowed).toBe(true)
        })
      })

      test('Viewer는 모든 쓰기 권한이 없어야 함', () => {
        const writePermissions = [
          Permission.PROJECT_CREATE,
          Permission.PROJECT_UPDATE,
          Permission.PROJECT_DELETE,
          Permission.VIDEO_UPLOAD,
          Permission.VIDEO_UPDATE,
          Permission.FEEDBACK_CREATE
        ]

        writePermissions.forEach(permission => {
          const result = PermissionChecker.hasPermission(viewerUser, permission)
          expect(result.allowed).toBe(false)
        })
      })
    })
  })

  describe('계층적 권한 구조 테스트', () => {
    test('상위 역할은 하위 역할의 권한을 포함해야 함', () => {
      const roles = [UserRole.ADMIN, UserRole.MANAGER, UserRole.EDITOR, UserRole.VIEWER]
      
      roles.forEach((role, index) => {
        const lowerRoles = roles.slice(index + 1)
        lowerRoles.forEach(lowerRole => {
          const hasAccess = PermissionChecker.isHigherRole(role, lowerRole)
          expect(hasAccess).toBe(true)
        })
      })
    })

    test('하위 역할은 상위 역할의 권한을 가져서는 안 됨', () => {
      expect(PermissionChecker.isHigherRole(UserRole.VIEWER, UserRole.EDITOR)).toBe(false)
      expect(PermissionChecker.isHigherRole(UserRole.EDITOR, UserRole.MANAGER)).toBe(false)
      expect(PermissionChecker.isHigherRole(UserRole.MANAGER, UserRole.ADMIN)).toBe(false)
    })
  })

  describe('프로젝트별 세부 권한 제어', () => {
    const projectId = 'project-123'
    
    test('프로젝트별 권한이 전역 권한을 오버라이드해야 함', () => {
      const user = createTestUser(UserRole.VIEWER, {
        projectPermissions: {
          [projectId]: [Permission.PROJECT_UPDATE, Permission.VIDEO_UPLOAD]
        }
      })

      // 전역적으로는 권한이 없지만
      const globalResult = PermissionChecker.hasPermission(user, Permission.PROJECT_UPDATE)
      expect(globalResult.allowed).toBe(false)

      // 프로젝트별로는 권한이 있어야 함
      const projectResult = PermissionChecker.hasPermission(user, Permission.PROJECT_UPDATE, {
        projectId
      })
      expect(projectResult.allowed).toBe(true)
    })

    test('프로젝트 소유자는 해당 프로젝트의 모든 권한을 가져야 함', () => {
      const user = createTestUser(UserRole.EDITOR)
      
      const dangerousPermissions = [
        Permission.PROJECT_DELETE,
        Permission.SETTINGS_UPDATE
      ]

      dangerousPermissions.forEach(permission => {
        const result = PermissionChecker.hasPermission(user, permission, {
          projectId,
          isOwner: true
        })
        expect(result.allowed).toBe(true)
      })
    })
  })

  describe('커스텀 권한 처리', () => {
    test('커스텀 권한이 역할 기반 권한을 오버라이드해야 함', () => {
      const user = createTestUser(UserRole.VIEWER, {
        customPermissions: {
          [Permission.PROJECT_CREATE]: true,
          [Permission.TEAM_INVITE]: false
        }
      })

      // 역할상 없는 권한이지만 커스텀으로 부여됨
      const createResult = PermissionChecker.hasPermission(user, Permission.PROJECT_CREATE)
      expect(createResult.allowed).toBe(true)

      // 커스텀으로 명시적 거부
      const inviteResult = PermissionChecker.hasPermission(user, Permission.TEAM_INVITE)
      expect(inviteResult.allowed).toBe(false)
    })
  })

  describe('에러 시나리오 처리', () => {
    test('비활성 사용자는 모든 권한이 거부되어야 함', () => {
      const inactiveUser = createTestUser(UserRole.ADMIN, { isActive: false })
      
      const result = PermissionChecker.hasPermission(inactiveUser, Permission.PROJECT_READ)
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('비활성 사용자')
    })

    test('존재하지 않는 권한 요청 시 적절한 에러 처리', () => {
      const user = createTestUser(UserRole.ADMIN)
      const invalidPermission = 'invalid:permission' as Permission
      
      const result = PermissionChecker.hasPermission(user, invalidPermission)
      expect(result.allowed).toBe(false)
      expect(result.reason).toBeDefined()
    })

    test('다중 권한 검사에서 부분적 실패 처리', () => {
      const user = createTestUser(UserRole.EDITOR)
      const mixedPermissions = [
        Permission.PROJECT_READ,    // 가능
        Permission.PROJECT_DELETE,  // 불가능
        Permission.VIDEO_UPDATE     // 가능
      ]

      const result = PermissionChecker.hasAllPermissions(user, mixedPermissions)
      expect(result.allowed).toBe(false)
      expect(result.missingPermissions).toContain(Permission.PROJECT_DELETE)
      expect(result.missingPermissions).toHaveLength(1)
    })
  })

  describe('성능 및 안정성', () => {
    test('대량 권한 검사 성능', () => {
      const user = createTestUser(UserRole.ADMIN)
      const allPermissions = Object.values(Permission)
      
      const startTime = Date.now()
      const result = PermissionChecker.hasAllPermissions(user, allPermissions)
      const endTime = Date.now()
      
      expect(result.allowed).toBe(true)
      expect(endTime - startTime).toBeLessThan(100) // 100ms 이내
    })

    test('동일한 권한 검사 결과의 일관성', () => {
      const user = createTestUser(UserRole.MANAGER)
      const permission = Permission.PROJECT_CREATE
      
      const results = Array.from({ length: 10 }, () => 
        PermissionChecker.hasPermission(user, permission)
      )
      
      const firstResult = results[0]
      results.forEach(result => {
        expect(result.allowed).toBe(firstResult.allowed)
        expect(result.reason).toBe(firstResult.reason)
      })
    })
  })

  describe('유효한 권한 목록 반환', () => {
    test('각 역할별로 올바른 권한 목록을 반환해야 함', () => {
      Object.values(UserRole).forEach(role => {
        const user = createTestUser(role)
        const permissions = PermissionChecker.getValidPermissions(user)
        const expectedPermissions = DEFAULT_ROLE_PERMISSIONS[role]
        
        expectedPermissions.forEach(permission => {
          expect(permissions).toContain(permission)
        })
      })
    })

    test('커스텀 권한이 결과에 포함되어야 함', () => {
      const user = createTestUser(UserRole.VIEWER, {
        customPermissions: {
          [Permission.PROJECT_CREATE]: true
        }
      })
      
      const permissions = PermissionChecker.getValidPermissions(user)
      expect(permissions).toContain(Permission.PROJECT_CREATE)
    })

    test('비활성 사용자는 빈 권한 목록을 반환해야 함', () => {
      const user = createTestUser(UserRole.ADMIN, { isActive: false })
      const permissions = PermissionChecker.getValidPermissions(user)
      expect(permissions).toEqual([])
    })
  })
})