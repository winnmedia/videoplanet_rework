/**
 * useUserPermissions - RBAC 권한 관리 훅
 * Phase 2a - features 레이어 구현
 */

'use client'

import { useMemo } from 'react'
import { useSelector } from 'react-redux'

import type { RootState } from '../../../app/store/store'
import { PermissionChecker, type RBACUser, type Permission } from '../../../entities/rbac'

export interface UseUserPermissionsResult {
  user: RBACUser | null
  hasPermission: (permission: Permission, context?: { projectId?: string; isOwner?: boolean }) => boolean
  hasAllPermissions: (permissions: Permission[], context?: { projectId?: string; isOwner?: boolean }) => boolean
  hasAnyPermission: (permissions: Permission[], context?: { projectId?: string; isOwner?: boolean }) => boolean
  isHigherRole: (targetRole: string) => boolean
  validPermissions: Permission[]
  isLoading: boolean
  error: string | null
}

/**
 * 사용자 권한 관리를 위한 React 훅
 */
export function useUserPermissions(userId?: string): UseUserPermissionsResult {
  // Redux에서 현재 사용자 정보 가져오기
  const currentUser = useSelector((state: RootState) => state.auth.user)
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)
  
  // 로딩과 에러 상태는 기본값 사용 (추후 API 통합 시 확장)
  const isLoading = false
  const error = null
  
  // 특정 userId가 제공된 경우 해당 사용자, 그렇지 않으면 현재 사용자
  const targetUserId = userId || currentUser?.id
  const user = useMemo(() => {
    if (!currentUser) return null
    
    // 현재는 현재 사용자만 지원, 추후 다른 사용자 조회 기능 확장 가능
    if (!userId || userId === currentUser.id) {
      return currentUser as RBACUser
    }
    
    return null
  }, [currentUser, userId])

  // 권한 검사 함수들 메모이제이션
  const permissionCheckers = useMemo(() => {
    if (!user) {
      return {
        hasPermission: () => false,
        hasAllPermissions: () => false,
        hasAnyPermission: () => false,
        isHigherRole: () => false,
        validPermissions: []
      }
    }

    return {
      hasPermission: (permission: Permission, context?: { projectId?: string; isOwner?: boolean }) => {
        const result = PermissionChecker.hasPermission(user, permission, context)
        return result.allowed
      },
      
      hasAllPermissions: (permissions: Permission[], context?: { projectId?: string; isOwner?: boolean }) => {
        const result = PermissionChecker.hasAllPermissions(user, permissions, context)
        return result.allowed
      },
      
      hasAnyPermission: (permissions: Permission[], context?: { projectId?: string; isOwner?: boolean }) => {
        const result = PermissionChecker.hasAnyPermission(user, permissions, context)
        return result.allowed
      },
      
      isHigherRole: (targetRole: string) => {
        return PermissionChecker.isHigherRole(user.role, targetRole as any)
      },
      
      validPermissions: PermissionChecker.getValidPermissions(user)
    }
  }, [user])

  return {
    user,
    ...permissionCheckers,
    isLoading,
    error
  }
}

/**
 * 현재 사용자의 권한을 가져오는 간편 훅
 */
export function useCurrentUserPermissions(): UseUserPermissionsResult {
  return useUserPermissions()
}