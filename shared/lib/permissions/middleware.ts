/**
 * RBAC 권한 검증 미들웨어
 * API 레벨에서 권한을 검증하고 감사 로그를 기록합니다.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { z } from 'zod'

import { PermissionChecker } from '@/entities/rbac/lib/permissionChecker'
import type { 
  RBACUser, 
  PermissionCheck, 
  PermissionResult,
  AuditLog 
} from '@/entities/rbac/model/types'
import { Permission } from '@/entities/rbac/model/types'

/**
 * 권한 검증 미들웨어 옵션
 */
export interface PermissionMiddlewareOptions {
  /** 필요한 권한 목록 */
  permissions: Permission[]
  /** 모든 권한이 필요한지 (기본: true) */
  requireAll?: boolean
  /** 프로젝트 ID 추출 함수 */
  extractProjectId?: (request: NextRequest) => Promise<string | undefined>
  /** 감사 로그 활성화 (기본: true) */
  enableAuditLog?: boolean
  /** 에러 커스터마이징 함수 */
  customErrorResponse?: (result: PermissionResult) => NextResponse
}

/**
 * 세션에서 RBAC 사용자 정보 추출
 */
async function getRBACUserFromSession(request: NextRequest): Promise<RBACUser | null> {
  try {
    // NextAuth 세션에서 사용자 정보 가져오기
    // 실제 구현에서는 세션 토큰을 파싱하거나 데이터베이스에서 사용자 정보를 조회
    const session = await getServerSession()
    
    if (!session?.user?.email) {
      return null
    }

    // 임시 구현 - 실제로는 데이터베이스에서 사용자 권한 조회
    const mockUser: RBACUser = {
      id: session.user.email,
      name: session.user.name || 'Unknown',
      email: session.user.email,
      role: 'editor' as any, // 실제로는 데이터베이스에서 조회
      permissions: [],
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }

    return mockUser
  } catch (error) {
    console.error('Failed to get user from session:', error)
    return null
  }
}

/**
 * 감사 로그 기록
 */
async function logAudit(
  user: RBACUser,
  permission: Permission,
  result: PermissionResult,
  request: NextRequest,
  resourceId?: string
): Promise<void> {
  try {
    const auditLog: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      userName: user.name,
      action: request.method || 'UNKNOWN',
      resource: request.nextUrl.pathname,
      resourceId,
      permission,
      result: result.allowed ? 'allowed' : 'denied',
      reason: result.reason,
      context: {
        userAgent: request.headers.get('user-agent') || undefined,
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown',
        timestamp: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    }

    // 실제 구현에서는 데이터베이스나 로그 시스템에 저장
    console.log('RBAC Audit Log:', auditLog)
    
    // 권한 거부인 경우 경고 레벨로 로깅
    if (!result.allowed) {
      console.warn('RBAC Permission Denied:', {
        user: user.email,
        permission,
        resource: request.nextUrl.pathname,
        reason: result.reason
      })
    }
  } catch (error) {
    console.error('Failed to log audit:', error)
  }
}

/**
 * 권한 검증 미들웨어
 */
export function withPermissionCheck(
  options: PermissionMiddlewareOptions
) {
  return function <T extends (...args: any[]) => Promise<NextResponse>>(
    handler: T
  ): T {
    return (async (request: NextRequest, ...args: any[]) => {
      try {
        const {
          permissions,
          requireAll = true,
          extractProjectId,
          enableAuditLog = true,
          customErrorResponse
        } = options

        // 1. 사용자 인증 확인
        const user = await getRBACUserFromSession(request)
        if (!user) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'UNAUTHORIZED',
                message: '인증이 필요합니다.'
              }
            },
            { status: 401 }
          )
        }

        // 2. 프로젝트 ID 추출 (필요한 경우)
        let projectId: string | undefined
        if (extractProjectId) {
          projectId = await extractProjectId(request)
        }

        // 3. 권한 검증 수행
        let permissionResult: PermissionResult

        if (requireAll) {
          // 모든 권한이 필요한 경우
          permissionResult = PermissionChecker.hasAllPermissions(
            user,
            permissions,
            {
              projectId,
              isOwner: user.role === 'admin' // 실제로는 프로젝트 소유권 확인
            }
          )
        } else {
          // 권한 중 하나라도 있으면 허용
          permissionResult = PermissionChecker.hasAnyPermission(
            user,
            permissions,
            {
              projectId,
              isOwner: user.role === 'admin'
            }
          )
        }

        // 4. 감사 로그 기록
        if (enableAuditLog) {
          for (const permission of permissions) {
            await logAudit(user, permission, permissionResult, request, projectId)
          }
        }

        // 5. 권한 검증 실패 처리
        if (!permissionResult.allowed) {
          if (customErrorResponse) {
            return customErrorResponse(permissionResult)
          }

          return NextResponse.json(
            {
              success: false,
              error: {
                code: 'FORBIDDEN',
                message: permissionResult.reason || '권한이 없습니다.',
                details: {
                  requiredPermissions: permissions,
                  missingPermissions: permissionResult.missingPermissions,
                  requiredRole: permissionResult.requiredRole
                }
              }
            },
            { status: 403 }
          )
        }

        // 6. 권한 검증 통과 시 원래 핸들러 실행
        return await handler(request, ...args)

      } catch (error) {
        console.error('Permission middleware error:', error)
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'INTERNAL_ERROR',
              message: '권한 검증 중 오류가 발생했습니다.'
            }
          },
          { status: 500 }
        )
      }
    }) as T
  }
}

/**
 * URL 파라미터에서 프로젝트 ID 추출 헬퍼
 */
export const extractProjectIdFromUrl = (request: NextRequest): Promise<string | undefined> => {
  const url = new URL(request.url)
  const pathSegments = url.pathname.split('/')
  const projectIndex = pathSegments.findIndex(segment => segment === 'projects')
  
  if (projectIndex !== -1 && pathSegments[projectIndex + 1]) {
    return Promise.resolve(pathSegments[projectIndex + 1])
  }
  
  return Promise.resolve(undefined)
}

/**
 * 요청 본문에서 프로젝트 ID 추출 헬퍼
 */
export const extractProjectIdFromBody = async (request: NextRequest): Promise<string | undefined> => {
  try {
    // 본문을 읽기 위해 복제
    const clonedRequest = request.clone()
    const body = await clonedRequest.json()
    
    return body.projectId || body.project_id
  } catch {
    return undefined
  }
}

/**
 * 권한별 미들웨어 프리셋
 */
export const PermissionPresets = {
  /**
   * 프로젝트 조회 권한
   */
  projectRead: () => withPermissionCheck({
    permissions: [Permission.PROJECT_READ],
    extractProjectId: extractProjectIdFromUrl
  }),

  /**
   * 프로젝트 생성 권한
   */
  projectCreate: () => withPermissionCheck({
    permissions: [Permission.PROJECT_CREATE],
    extractProjectId: extractProjectIdFromBody
  }),

  /**
   * 프로젝트 수정 권한
   */
  projectUpdate: () => withPermissionCheck({
    permissions: [Permission.PROJECT_UPDATE],
    extractProjectId: extractProjectIdFromUrl
  }),

  /**
   * 프로젝트 삭제 권한 (관리자 전용)
   */
  projectDelete: () => withPermissionCheck({
    permissions: [Permission.PROJECT_DELETE],
    extractProjectId: extractProjectIdFromUrl
  }),

  /**
   * 팀 관리 권한
   */
  teamManage: () => withPermissionCheck({
    permissions: [Permission.TEAM_INVITE, Permission.TEAM_UPDATE],
    requireAll: false
  }),

  /**
   * 관리자 전용 권한
   */
  adminOnly: () => withPermissionCheck({
    permissions: [Permission.SYSTEM_ADMIN]
  })
} as const

// 타입 안전성을 위한 Permission enum 재-export
export { Permission } from '@/entities/rbac/model/types'