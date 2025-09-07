/**
 * 권한별 라우트 보호 시스템
 * Next.js App Router와 통합된 권한 기반 라우팅 가드
 */

'use client'

import { useRouter, usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useEffect, useState } from 'react'

import { Permission, UserRole } from '@/entities/rbac/model/types'
import { useCurrentUserPermissions } from '@/features/rbac/model/useUserPermissions'

/**
 * 라우트 보호 설정
 */
export interface RouteGuardConfig {
  /** 필요한 권한들 */
  permissions?: Permission[]
  /** 필요한 역할들 */
  roles?: UserRole[]
  /** 모든 권한이 필요한지 (기본: true) */
  requireAllPermissions?: boolean
  /** 프로젝트 컨텍스트 추출 함수 */
  extractProjectContext?: (pathname: string) => {
    projectId?: string
    isOwner?: boolean
  }
  /** 권한이 없을 때 리다이렉트할 경로 */
  redirectTo?: string
  /** 로딩 중 표시할 컴포넌트 */
  loadingComponent?: React.ComponentType
  /** 권한 없음 표시할 컴포넌트 */
  unauthorizedComponent?: React.ComponentType
}

/**
 * 라우트별 권한 설정 매핑
 */
export const ROUTE_PERMISSIONS: Record<string, RouteGuardConfig> = {
  // 관리자 전용 라우트
  '/admin': {
    roles: [UserRole.ADMIN],
    redirectTo: '/dashboard'
  },
  '/admin/*': {
    roles: [UserRole.ADMIN],
    redirectTo: '/dashboard'
  },

  // 프로젝트 관리 라우트
  '/projects': {
    permissions: [Permission.PROJECT_READ]
  },
  '/projects/create': {
    permissions: [Permission.PROJECT_CREATE],
    redirectTo: '/projects'
  },
  '/projects/[id]': {
    permissions: [Permission.PROJECT_READ],
    extractProjectContext: (pathname) => {
      const projectId = pathname.split('/')[2]
      return { projectId }
    }
  },
  '/projects/[id]/edit': {
    permissions: [Permission.PROJECT_UPDATE],
    extractProjectContext: (pathname) => {
      const projectId = pathname.split('/')[2]
      return { projectId }
    },
    redirectTo: '/projects'
  },
  '/projects/[id]/delete': {
    permissions: [Permission.PROJECT_DELETE],
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    extractProjectContext: (pathname) => {
      const projectId = pathname.split('/')[2]
      return { projectId }
    },
    redirectTo: '/projects'
  },

  // 팀 관리 라우트
  '/teams': {
    permissions: [Permission.TEAM_READ]
  },
  '/teams/invite': {
    permissions: [Permission.TEAM_INVITE],
    roles: [UserRole.ADMIN, UserRole.MANAGER],
    redirectTo: '/teams'
  },

  // 설정 라우트
  '/settings': {
    permissions: [Permission.SETTINGS_READ]
  },
  '/settings/system': {
    permissions: [Permission.SETTINGS_UPDATE],
    roles: [UserRole.ADMIN],
    redirectTo: '/settings'
  },

  // 분석 라우트
  '/analytics': {
    permissions: [Permission.ANALYTICS_READ],
    roles: [UserRole.ADMIN, UserRole.MANAGER]
  }
} as const

/**
 * 라우트 가드 훅
 */
export function useRouteGuard(config?: RouteGuardConfig) {
  const { data: session, status: sessionStatus } = useSession()
  const { user, hasPermission, hasAllPermissions, hasAnyPermission, isLoading } = useCurrentUserPermissions()
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    // 세션 로딩 중이거나 권한 확인 중
    if (sessionStatus === 'loading' || isLoading) {
      return
    }

    // 인증되지 않은 사용자
    if (!session || !user) {
      setIsAuthorized(false)
      return
    }

    // 설정이 없으면 접근 허용
    if (!config) {
      setIsAuthorized(true)
      return
    }

    const { permissions, roles, requireAllPermissions = true, extractProjectContext } = config

    // 프로젝트 컨텍스트 추출
    const projectContext = extractProjectContext ? extractProjectContext(pathname) : undefined

    // 역할 확인
    if (roles && roles.length > 0) {
      const hasRole = roles.includes(user.role)
      if (!hasRole) {
        setIsAuthorized(false)
        return
      }
    }

    // 권한 확인
    if (permissions && permissions.length > 0) {
      let hasRequiredPermissions = false

      if (requireAllPermissions) {
        hasRequiredPermissions = hasAllPermissions(permissions, projectContext)
      } else {
        hasRequiredPermissions = hasAnyPermission(permissions, projectContext)
      }

      setIsAuthorized(hasRequiredPermissions)
    } else {
      setIsAuthorized(true)
    }
  }, [
    session, 
    sessionStatus, 
    user, 
    isLoading, 
    pathname, 
    config,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission
  ])

  // 권한이 없을 때 리다이렉트
  useEffect(() => {
    if (isAuthorized === false && config?.redirectTo) {
      router.push(config.redirectTo)
    }
  }, [isAuthorized, config?.redirectTo, router])

  return {
    isAuthorized,
    isLoading: sessionStatus === 'loading' || isLoading,
    user
  }
}

/**
 * 라우트 가드 컴포넌트
 */
interface RouteGuardProps {
  config?: RouteGuardConfig
  children: React.ReactNode
}

export function RouteGuard({ config, children }: RouteGuardProps) {
  const { isAuthorized, isLoading } = useRouteGuard(config)

  // 로딩 상태
  if (isLoading) {
    if (config?.loadingComponent) {
      const LoadingComponent = config.loadingComponent
      return <LoadingComponent />
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">권한 확인 중...</span>
      </div>
    )
  }

  // 권한 없음
  if (isAuthorized === false) {
    if (config?.unauthorizedComponent) {
      const UnauthorizedComponent = config.unauthorizedComponent
      return <UnauthorizedComponent />
    }
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl text-red-500 mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">접근 권한이 없습니다</h1>
          <p className="text-gray-600 mb-4">이 페이지를 보려면 추가 권한이 필요합니다.</p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            이전 페이지로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}

/**
 * 자동 라우트 가드 - pathname 기반 자동 설정
 */
export function AutoRouteGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  // 현재 경로에 해당하는 권한 설정 찾기
  const config = findMatchingRouteConfig(pathname)
  
  return <RouteGuard config={config}>{children}</RouteGuard>
}

/**
 * 경로 패턴 매칭 함수
 */
function findMatchingRouteConfig(pathname: string): RouteGuardConfig | undefined {
  // 정확한 매치 우선 확인
  if (ROUTE_PERMISSIONS[pathname]) {
    return ROUTE_PERMISSIONS[pathname]
  }

  // 와일드카드 패턴 매칭
  for (const [pattern, config] of Object.entries(ROUTE_PERMISSIONS)) {
    if (matchWildcardPattern(pathname, pattern)) {
      return config
    }
  }

  return undefined
}

/**
 * 와일드카드 패턴 매칭
 */
function matchWildcardPattern(pathname: string, pattern: string): boolean {
  // [id] 형태의 동적 세그먼트를 정규식으로 변환
  const regexPattern = pattern
    .replace(/\[([^\]]+)\]/g, '([^/]+)') // [id] -> ([^/]+)
    .replace(/\*/g, '.*') // * -> .*

  const regex = new RegExp(`^${regexPattern}$`)
  return regex.test(pathname)
}

/**
 * 특정 권한이 필요한 HOC
 */
export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permissions: Permission[],
  options?: Omit<RouteGuardConfig, 'permissions'>
) {
  return function PermissionProtectedComponent(props: P) {
    const config: RouteGuardConfig = {
      permissions,
      ...options
    }

    return (
      <RouteGuard config={config}>
        <Component {...props} />
      </RouteGuard>
    )
  }
}

/**
 * 특정 역할이 필요한 HOC
 */
export function withRole<P extends object>(
  Component: React.ComponentType<P>,
  roles: UserRole[],
  options?: Omit<RouteGuardConfig, 'roles'>
) {
  return function RoleProtectedComponent(props: P) {
    const config: RouteGuardConfig = {
      roles,
      ...options
    }

    return (
      <RouteGuard config={config}>
        <Component {...props} />
      </RouteGuard>
    )
  }
}