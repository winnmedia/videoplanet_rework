/**
 * RBAC Features - Public API
 * FSD 아키텍처 준수: features 레이어 외부 접근 제한
 */

// 권한 관리 훅
export { useUserPermissions, useCurrentUserPermissions } from './model/useUserPermissions'
export type { UseUserPermissionsResult } from './model/useUserPermissions'

// UI 컴포넌트 
export { PermissionGuard } from './ui/PermissionGuard'

// 재export - entities 레이어 접근
export type {
  RBACUser,
  PermissionCheck,
  PermissionResult
} from '../../entities/rbac'

export {
  UserRole,
  Permission,
  ROLE_HIERARCHY,
  DEFAULT_ROLE_PERMISSIONS,
  PermissionChecker
} from '../../entities/rbac'