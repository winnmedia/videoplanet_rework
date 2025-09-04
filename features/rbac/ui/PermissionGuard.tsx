/**
 * PermissionGuard - 권한 기반 조건부 렌더링 컴포넌트
 * Phase 2a - UI 레이어 구현
 */

'use client'

import type { ReactNode } from 'react'

import { Permission } from '../../../entities/rbac'
import { useCurrentUserPermissions } from '../model/useUserPermissions'

interface PermissionGuardProps {
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  context?: {
    projectId?: string
    isOwner?: boolean
  }
  fallback?: ReactNode
  loadingFallback?: ReactNode
  errorFallback?: ReactNode
  children: ReactNode
}

export function PermissionGuard({
  permission,
  permissions,
  requireAll = true,
  context,
  fallback = null,
  loadingFallback = <div aria-label="권한 확인 중">로딩 중...</div>,
  errorFallback = <div role="alert">권한 확인 중 오류가 발생했습니다.</div>,
  children
}: PermissionGuardProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission, isLoading, error } = useCurrentUserPermissions()
  
  // 로딩 상태 처리
  if (isLoading) {
    return <>{loadingFallback}</>
  }
  
  // 에러 상태 처리
  if (error) {
    return <>{errorFallback}</>
  }
  
  // 권한 체크 로직
  let hasAccess = false
  
  if (permission) {
    // 단일 권한 체크
    hasAccess = hasPermission(permission, context)
  } else if (permissions && permissions.length > 0) {
    // 다중 권한 체크
    if (requireAll) {
      hasAccess = hasAllPermissions(permissions, context)
    } else {
      hasAccess = hasAnyPermission(permissions, context)
    }
  } else {
    // 권한 조건이 없으면 접근 허용
    hasAccess = true
  }
  
  // 조건부 렌더링
  if (hasAccess) {
    return (
      <div
        role="region"
        aria-label="권한이 확인된 컨텐츠"
        data-testid="permission-granted-content"
      >
        {children}
      </div>
    )
  }
  
  return (
    <div
      role="region"
      aria-label="접근 권한이 없는 컨텐츠"
      data-testid="permission-denied-content"
    >
      {fallback}
    </div>
  )
}