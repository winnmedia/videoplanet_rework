import React, { ReactNode } from 'react'
import { usePermission, hasMinimumRole, RBACRole, logSecurityEvent } from '@/shared/lib/rbac-system'
import { useContext } from 'react'
import { RBACContext } from '@/shared/lib/rbac-system'

interface RoleGuardProps {
  children: ReactNode
  requiredRole: RBACRole
  fallback?: ReactNode
  showLoading?: boolean
}

interface PermissionGuardProps {
  children: ReactNode
  requiredPermission: string
  fallback?: ReactNode
  showLoading?: boolean
}

// Role-based access control component
export function RoleGuard({ 
  children, 
  requiredRole, 
  fallback = null,
  showLoading = true 
}: RoleGuardProps) {
  const context = useContext(RBACContext)
  
  if (context.loading && showLoading) {
    return (
      <div 
        role="status" 
        aria-live="polite"
        className="flex items-center justify-center p-4"
      >
        <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
        <span className="text-sm text-gray-600">권한 확인 중...</span>
      </div>
    )
  }
  
  const hasRole = hasMinimumRole(context.user, requiredRole)
  
  if (!hasRole) {
    // Log security event for access attempt
    if (context.user) {
      logSecurityEvent({
        type: 'PERMISSION_DENIED',
        userId: context.user.id,
        resource: 'UI_COMPONENT',
        permission: `role:${requiredRole}`,
        metadata: { component: 'RoleGuard', userRole: context.user.role }
      })
    }
    
    return fallback ? (
      <div role="alert" aria-live="polite">
        {fallback}
      </div>
    ) : null
  }
  
  return <>{children}</>
}

// Permission-based access control component  
export function PermissionGuard({ 
  children, 
  requiredPermission, 
  fallback = null,
  showLoading = true 
}: PermissionGuardProps) {
  const { hasPermission, loading, error } = usePermission(requiredPermission)
  const context = useContext(RBACContext)
  
  if (loading && showLoading) {
    return (
      <div 
        role="status" 
        aria-live="polite"
        className="flex items-center justify-center p-2"
      >
        <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
        <span className="text-xs text-gray-600">확인 중...</span>
      </div>
    )
  }
  
  if (error) {
    return fallback ? (
      <div role="alert" aria-live="assertive" className="text-red-600 text-sm p-2">
        {fallback}
      </div>
    ) : null
  }
  
  if (!hasPermission) {
    // Log security event for permission denial
    if (context.user) {
      logSecurityEvent({
        type: 'PERMISSION_DENIED',
        userId: context.user.id,
        resource: 'UI_COMPONENT',
        permission: requiredPermission,
        metadata: { component: 'PermissionGuard' }
      })
    }
    
    return fallback ? (
      <div role="alert" aria-live="polite" className="text-gray-500 text-sm">
        {fallback}
      </div>
    ) : null
  }
  
  return <>{children}</>
}

// Compound component for complex permission scenarios
interface ConditionalRenderProps {
  children: ReactNode
  when: {
    role?: RBACRole
    permission?: string
    condition?: boolean
  }
  otherwise?: ReactNode
}

export function ConditionalRender({ children, when, otherwise = null }: ConditionalRenderProps) {
  const context = useContext(RBACContext)
  const { hasPermission } = usePermission(when.permission || '')
  
  let shouldRender = true
  
  // Check role requirement
  if (when.role) {
    shouldRender = shouldRender && hasMinimumRole(context.user, when.role)
  }
  
  // Check permission requirement
  if (when.permission) {
    shouldRender = shouldRender && hasPermission
  }
  
  // Check custom condition
  if (when.condition !== undefined) {
    shouldRender = shouldRender && when.condition
  }
  
  return shouldRender ? <>{children}</> : <>{otherwise}</>
}

// Utility component for displaying user role badge
interface RoleBadgeProps {
  role: RBACRole
  className?: string
}

export function RoleBadge({ role, className = '' }: RoleBadgeProps) {
  const roleConfig = {
    owner: { color: 'bg-purple-100 text-purple-800', label: '소유자' },
    admin: { color: 'bg-red-100 text-red-800', label: '관리자' },
    editor: { color: 'bg-blue-100 text-blue-800', label: '편집자' },
    reviewer: { color: 'bg-yellow-100 text-yellow-800', label: '검토자' },
    viewer: { color: 'bg-gray-100 text-gray-800', label: '뷰어' }
  }
  
  const config = roleConfig[role] || roleConfig.viewer
  
  return (
    <span 
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${config.color} ${className}`}
      role="img"
      aria-label={`사용자 권한: ${config.label}`}
    >
      {config.label}
    </span>
  )
}