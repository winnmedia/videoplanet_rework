'use client'

import { ReactNode, useEffect, useState } from 'react'
import { Permission, ProjectRole } from '@/entities/permission'
import { PermissionGuard, PermissionGuardContext } from '../model/permissionGuard'

interface PermissionGuardProps {
  children: ReactNode
  permission?: Permission
  permissions?: Permission[]
  role?: ProjectRole
  requireAll?: boolean
  fallback?: ReactNode
  onAccessDenied?: (reason: string) => void
  context: PermissionGuardContext
}

/**
 * React 컴포넌트 레벨 권한 가드
 * Features 레이어의 UI 컴포넌트
 */
export function PermissionGuardComponent({
  children,
  permission,
  permissions,
  role,
  requireAll = true,
  fallback = null,
  onAccessDenied,
  context
}: PermissionGuardProps) {
  const [hasAccess, setHasAccess] = useState<boolean>(false)
  const [isChecking, setIsChecking] = useState<boolean>(true)
  const [deniedReason, setDeniedReason] = useState<string>('')
  
  const guard = new PermissionGuard({
    strictMode: true,
    enableLogging: process.env.NODE_ENV === 'development',
    cachePermissions: true
  })
  
  useEffect(() => {
    const checkPermissions = async () => {
      setIsChecking(true)
      
      try {
        let result
        
        if (permission) {
          // 단일 권한 확인
          result = await guard.checkPermission(context, permission)
        } else if (permissions && permissions.length > 0) {
          // 다중 권한 확인
          if (requireAll) {
            result = await guard.checkAllPermissions(context, permissions)
          } else {
            result = await guard.checkAnyPermission(context, permissions)
          }
        } else if (role) {
          // 역할 기반 확인
          result = guard.canPerformAction(context.role, role)
        } else {
          // 권한 조건이 없으면 기본적으로 허용
          result = { granted: true }
        }
        
        setHasAccess(result.granted)
        
        if (!result.granted) {
          const reason = result.reason || '접근 권한이 없습니다.'
          setDeniedReason(reason)
          onAccessDenied?.(reason)
        }
      } catch (error) {
        console.error('권한 확인 중 오류:', error)
        setHasAccess(false)
        setDeniedReason('권한 확인 중 시스템 오류가 발생했습니다.')
      } finally {
        setIsChecking(false)
      }
    }
    
    checkPermissions()
  }, [permission, permissions, role, requireAll, context])
  
  // 권한 확인 중
  if (isChecking) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-sm text-gray-600">권한 확인 중...</span>
      </div>
    )
  }
  
  // 접근 거부
  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>
    }
    
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg 
            className="w-8 h-8 text-red-600" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" 
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          접근 권한이 없습니다
        </h3>
        <p className="text-sm text-gray-600 max-w-md">
          {deniedReason}
        </p>
      </div>
    )
  }
  
  // 접근 허용
  return <>{children}</>
}

/**
 * HOC 버전의 권한 가드
 */
export function withPermissionGuard<P extends object>(
  Component: React.ComponentType<P>,
  guardProps: Omit<PermissionGuardProps, 'children'>
) {
  const GuardedComponent = (props: P) => (
    <PermissionGuardComponent {...guardProps}>
      <Component {...props} />
    </PermissionGuardComponent>
  )
  
  GuardedComponent.displayName = `withPermissionGuard(${Component.displayName || Component.name})`
  
  return GuardedComponent
}

/**
 * 권한 기반 조건부 렌더링 훅
 */
export function usePermissionGuard(context: PermissionGuardContext) {
  const guard = new PermissionGuard()
  
  const checkPermission = async (permission: Permission) => {
    return await guard.checkPermission(context, permission)
  }
  
  const checkPermissions = async (permissions: Permission[], requireAll = true) => {
    if (requireAll) {
      return await guard.checkAllPermissions(context, permissions)
    } else {
      return await guard.checkAnyPermission(context, permissions)
    }
  }
  
  const checkRole = (requiredRole: ProjectRole, permission?: Permission) => {
    return guard.canPerformAction(context.role, requiredRole, permission)
  }
  
  return {
    checkPermission,
    checkPermissions, 
    checkRole
  }
}