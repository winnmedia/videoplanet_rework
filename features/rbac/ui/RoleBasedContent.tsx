/**
 * RoleBasedContent - 역할 기반 조건부 렌더링 컴포넌트
 * 특정 역할에 따라 다른 컨텐츠를 표시합니다.
 */

'use client'

import type { ReactNode } from 'react'

import { UserRole } from '@/entities/rbac/model/types'

import { useCurrentUserPermissions } from '../model/useUserPermissions'

interface RoleBasedContentProps {
  /** 표시할 역할 (단일) */
  role?: UserRole
  /** 표시할 역할들 (다중) */
  roles?: UserRole[]
  /** 하위 역할도 포함할지 여부 (기본: true) */
  includeSubRoles?: boolean
  /** 로딩 상태 UI */
  loadingFallback?: ReactNode
  /** 에러 상태 UI */
  errorFallback?: ReactNode
  /** 역할이 맞지 않을 때 표시할 UI */
  fallback?: ReactNode
  /** 메인 컨텐츠 */
  children: ReactNode
}

export function RoleBasedContent({
  role,
  roles,
  includeSubRoles = true,
  loadingFallback = <div className="animate-pulse text-gray-500">역할 확인 중...</div>,
  errorFallback = <div className="text-red-500">역할 확인 중 오류가 발생했습니다.</div>,
  fallback = null,
  children
}: RoleBasedContentProps) {
  const { user, isLoading, error } = useCurrentUserPermissions()

  // 로딩 상태
  if (isLoading) {
    return <>{loadingFallback}</>
  }

  // 에러 상태
  if (error || !user) {
    return <>{errorFallback}</>
  }

  // 역할 확인 로직
  let hasAccess = false
  const targetRoles = role ? [role] : (roles || [])

  if (targetRoles.length === 0) {
    // 역할 조건이 없으면 접근 허용
    hasAccess = true
  } else {
    // 역할 매칭 확인
    for (const targetRole of targetRoles) {
      if (user.role === targetRole) {
        hasAccess = true
        break
      }

      // 하위 역할 포함 확인 (역할 계층 구조)
      if (includeSubRoles) {
        // Admin은 모든 역할 포함
        if (user.role === UserRole.ADMIN) {
          hasAccess = true
          break
        }
        // Manager는 Editor, Viewer 포함
        if (user.role === UserRole.MANAGER && 
            (targetRole === UserRole.EDITOR || targetRole === UserRole.VIEWER)) {
          hasAccess = true
          break
        }
        // Editor는 Viewer 포함
        if (user.role === UserRole.EDITOR && targetRole === UserRole.VIEWER) {
          hasAccess = true
          break
        }
      }
    }
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>
}

/**
 * 특정 역할 전용 컴포넌트들
 */

export function AdminOnlyContent({ 
  children, 
  fallback = null,
  ...props 
}: Omit<RoleBasedContentProps, 'role'>) {
  return (
    <RoleBasedContent role={UserRole.ADMIN} fallback={fallback} {...props}>
      {children}
    </RoleBasedContent>
  )
}

export function ManagerOnlyContent({ 
  children, 
  fallback = null,
  ...props 
}: Omit<RoleBasedContentProps, 'role'>) {
  return (
    <RoleBasedContent role={UserRole.MANAGER} fallback={fallback} {...props}>
      {children}
    </RoleBasedContent>
  )
}

export function EditorOnlyContent({ 
  children, 
  fallback = null,
  ...props 
}: Omit<RoleBasedContentProps, 'role'>) {
  return (
    <RoleBasedContent role={UserRole.EDITOR} fallback={fallback} {...props}>
      {children}
    </RoleBasedContent>
  )
}

export function ViewerOnlyContent({ 
  children, 
  fallback = null,
  ...props 
}: Omit<RoleBasedContentProps, 'role'>) {
  return (
    <RoleBasedContent role={UserRole.VIEWER} fallback={fallback} {...props}>
      {children}
    </RoleBasedContent>
  )
}

/**
 * 역할별 다른 컨텐츠 표시 컴포넌트
 */
interface RoleSwitchProps {
  adminContent?: ReactNode
  managerContent?: ReactNode
  editorContent?: ReactNode
  viewerContent?: ReactNode
  defaultContent?: ReactNode
  loadingFallback?: ReactNode
  errorFallback?: ReactNode
}

export function RoleSwitch({
  adminContent,
  managerContent,
  editorContent,
  viewerContent,
  defaultContent = null,
  loadingFallback = <div className="animate-pulse text-gray-500">컨텐츠 로딩 중...</div>,
  errorFallback = <div className="text-red-500">컨텐츠를 불러올 수 없습니다.</div>
}: RoleSwitchProps) {
  const { user, isLoading, error } = useCurrentUserPermissions()

  if (isLoading) return <>{loadingFallback}</>
  if (error || !user) return <>{errorFallback}</>

  switch (user.role) {
    case UserRole.ADMIN:
      return <>{adminContent || defaultContent}</>
    case UserRole.MANAGER:
      return <>{managerContent || defaultContent}</>
    case UserRole.EDITOR:
      return <>{editorContent || defaultContent}</>
    case UserRole.VIEWER:
      return <>{viewerContent || defaultContent}</>
    default:
      return <>{defaultContent}</>
  }
}