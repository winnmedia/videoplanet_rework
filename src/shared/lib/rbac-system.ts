import { createContext, useContext, useMemo } from 'react'
import { AuthenticatedUser } from '@/features/authentication/model/types'

// 5-tier RBAC Role Definitions
export const RBAC_ROLES = {
  owner: { level: 5, label: '소유자', permissions: ['project:full', 'member:invite', 'project:delete', 'project:transfer'] },
  admin: { level: 4, label: '관리자', permissions: ['project:edit', 'member:manage', 'member:invite', 'project:settings'] },
  editor: { level: 3, label: '편집자', permissions: ['project:edit', 'content:create', 'content:edit', 'feedback:manage'] },
  reviewer: { level: 2, label: '검토자', permissions: ['project:read', 'content:review', 'feedback:create'] },
  viewer: { level: 1, label: '뷰어', permissions: ['project:read'] }
} as const

export type RBACRole = keyof typeof RBAC_ROLES
export type Permission = string

// RBAC Context for permission checking
export interface RBACContextValue {
  user: AuthenticatedUser | null
  projectId?: string
  permissions: Permission[]
  loading?: boolean
  error?: string | null
}

export const RBACContext = createContext<RBACContextValue>({
  user: null,
  permissions: [],
  loading: false,
  error: null
})

// Permission checking utilities
export function checkProjectPermission(user: AuthenticatedUser | null, permission: Permission): boolean {
  if (!user || !user.permissions) {
    return false
  }

  // Check explicit permission
  if (user.permissions.includes(permission)) {
    return true
  }

  // Check role-based permission hierarchy
  const userRole = user.role as RBACRole
  const roleData = RBAC_ROLES[userRole]
  
  if (!roleData) {
    return false
  }

  // Owner has full access
  if (userRole === 'owner' && permission.startsWith('project:')) {
    return true
  }

  // Check if role includes this permission
  return roleData.permissions.includes(permission)
}

export function hasMinimumRole(user: AuthenticatedUser | null, requiredRole: RBACRole): boolean {
  if (!user) return false
  
  const userRole = user.role as RBACRole
  const userLevel = RBAC_ROLES[userRole]?.level || 0
  const requiredLevel = RBAC_ROLES[requiredRole]?.level || 0
  
  return userLevel >= requiredLevel
}

// React Hook for permission checking
export function usePermission(permission: Permission) {
  const context = useContext(RBACContext)
  
  const permissionState = useMemo(() => {
    if (context.loading) {
      return { hasPermission: false, loading: true, error: null }
    }
    
    if (context.error) {
      return { hasPermission: false, loading: false, error: context.error }
    }
    
    const hasPermission = checkProjectPermission(context.user, permission)
    return { hasPermission, loading: false, error: null }
  }, [context, permission])
  
  return permissionState
}

// Role-based access utilities
export function canAccessResource(user: AuthenticatedUser | null, resourceType: string, action: string): boolean {
  const permission = `${resourceType}:${action}`
  return checkProjectPermission(user, permission)
}

export function getUserDisplayRole(role: RBACRole): string {
  return RBAC_ROLES[role]?.label || '알 수 없음'
}

// Data isolation helpers
export function filterUserData<T extends { userId?: string; createdBy?: string }>(
  data: T[], 
  currentUser: AuthenticatedUser | null,
  allowSupervisor = false
): T[] {
  if (!currentUser) return []
  
  // Owner and Admin can see all data
  if (allowSupervisor && hasMinimumRole(currentUser, 'admin')) {
    return data
  }
  
  // Filter to user's own data
  return data.filter(item => 
    item.userId === currentUser.id || 
    item.createdBy === currentUser.id
  )
}

// Security event tracking
export interface SecurityEvent {
  type: 'PERMISSION_DENIED' | 'UNAUTHORIZED_ACCESS' | 'ROLE_CHANGE'
  userId: string
  resource: string
  permission: string
  timestamp: Date
  metadata?: Record<string, unknown>
}

export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  const securityEvent: SecurityEvent = {
    ...event,
    timestamp: new Date()
  }
  
  // In production, this would send to security monitoring system
  console.warn('Security Event:', securityEvent)
}