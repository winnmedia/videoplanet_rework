// Public API for Permission Guard Feature
export { 
  PermissionGuard,
  type PermissionGuardConfig,
  type PermissionGuardContext
} from './model/permissionGuard'

export {
  PermissionGuardComponent,
  withPermissionGuard,
  usePermissionGuard
} from './ui/PermissionGuardComponent'