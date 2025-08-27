/**
 * RBAC Entity - Public API
 * FSD 아키텍처 준수: 외부 접근은 이 배럴 파일을 통해서만
 */

// 타입 정의
export type {
  RBACUser,
  PermissionCheck,
  PermissionResult
} from './model/types'

export {
  UserRole,
  Permission,
  ROLE_HIERARCHY,
  DEFAULT_ROLE_PERMISSIONS
} from './model/types'

// 비즈니스 로직
export { PermissionChecker } from './lib/permissionChecker'