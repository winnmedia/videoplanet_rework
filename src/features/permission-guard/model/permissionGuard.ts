import { 
  PermissionChecker, 
  PermissionService, 
  ProjectRole, 
  Permission, 
  UserPermissionContext, 
  PermissionCheckResult,
  ResourcePermissions
} from '@/entities/permission'

/**
 * Features 레이어: 권한 검증 비즈니스 로직
 * entities의 순수 도메인 로직을 활용한 애플리케이션 레벨 서비스
 */

export interface PermissionGuardConfig {
  strictMode: boolean
  enableLogging: boolean
  cachePermissions: boolean
  cacheTtl: number // seconds
}

export interface PermissionGuardContext {
  userId: string
  projectId: string
  role: ProjectRole
  clientIp?: string
  userAgent?: string
  requestId?: string
}

export class PermissionGuard {
  private config: PermissionGuardConfig
  private permissionCache = new Map<string, { result: PermissionCheckResult; expiresAt: number }>()
  
  constructor(config: Partial<PermissionGuardConfig> = {}) {
    this.config = {
      strictMode: config.strictMode ?? true,
      enableLogging: config.enableLogging ?? true,
      cachePermissions: config.cachePermissions ?? true,
      cacheTtl: config.cacheTtl ?? 300 // 5분
    }
  }
  
  /**
   * 단일 권한 검증
   */
  async checkPermission(
    context: PermissionGuardContext,
    permission: Permission
  ): Promise<PermissionCheckResult> {
    try {
      const cacheKey = this.getCacheKey(context, [permission])
      
      // 캐시된 결과 확인
      if (this.config.cachePermissions) {
        const cached = this.getCachedResult(cacheKey)
        if (cached) {
          this.log('권한 확인 (캐시)', { context, permission, result: cached })
          return cached
        }
      }
      
      const permissionContext = await this.buildPermissionContext(context)
      const checker = new PermissionChecker(permissionContext)
      
      // 권한 만료 확인
      if (checker.isExpired()) {
        const result: PermissionCheckResult = {
          granted: false,
          reason: '권한이 만료되었습니다. 다시 로그인해 주세요.'
        }
        this.log('권한 만료', { context, permission, result })
        return result
      }
      
      const result = checker.checkPermission(permission)
      
      // 캐시에 저장
      if (this.config.cachePermissions) {
        this.setCachedResult(cacheKey, result)
      }
      
      this.log('권한 확인', { context, permission, result })
      return result
      
    } catch (error) {
      const result: PermissionCheckResult = {
        granted: false,
        reason: this.config.strictMode 
          ? '권한 확인 중 오류가 발생했습니다.' 
          : '시스템 오류로 인해 접근이 거부되었습니다.',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
      
      this.log('권한 확인 오류', { context, permission, error, result })
      return result
    }
  }
  
  /**
   * 다중 권한 검증 (모두 필요)
   */
  async checkAllPermissions(
    context: PermissionGuardContext,
    permissions: Permission[]
  ): Promise<PermissionCheckResult> {
    const cacheKey = this.getCacheKey(context, permissions)
    
    if (this.config.cachePermissions) {
      const cached = this.getCachedResult(cacheKey)
      if (cached) return cached
    }
    
    try {
      const permissionContext = await this.buildPermissionContext(context)
      const checker = new PermissionChecker(permissionContext)
      
      if (checker.isExpired()) {
        return {
          granted: false,
          reason: '권한이 만료되었습니다.'
        }
      }
      
      const result = checker.checkAllPermissions(permissions)
      
      if (this.config.cachePermissions) {
        this.setCachedResult(cacheKey, result)
      }
      
      return result
    } catch (error) {
      return {
        granted: false,
        reason: '권한 확인 중 오류가 발생했습니다.',
        metadata: { error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
  
  /**
   * 다중 권한 검증 (하나라도 있으면 됨)
   */
  async checkAnyPermission(
    context: PermissionGuardContext,
    permissions: Permission[]
  ): Promise<PermissionCheckResult> {
    try {
      const permissionContext = await this.buildPermissionContext(context)
      const checker = new PermissionChecker(permissionContext)
      
      return checker.checkAnyPermission(permissions)
    } catch (error) {
      return {
        granted: false,
        reason: '권한 확인 중 오류가 발생했습니다.'
      }
    }
  }
  
  /**
   * 리소스별 권한 검증
   */
  async checkResourcePermission(
    context: PermissionGuardContext,
    resource: keyof ResourcePermissions,
    permission: Permission
  ): Promise<PermissionCheckResult> {
    try {
      const permissionContext = await this.buildPermissionContext(context)
      const checker = new PermissionChecker(permissionContext)
      
      return checker.checkResourcePermission(resource, permission)
    } catch (error) {
      return {
        granted: false,
        reason: '리소스 권한 확인 중 오류가 발생했습니다.'
      }
    }
  }
  
  /**
   * 역할 기반 권한 확인
   */
  canPerformAction(
    userRole: ProjectRole,
    requiredRole: ProjectRole,
    permission?: Permission
  ): PermissionCheckResult {
    // 역할 계층 확인
    if (!PermissionService.hasEqualOrHigherRole(userRole, requiredRole)) {
      return {
        granted: false,
        reason: `${requiredRole} 이상의 권한이 필요합니다.`,
        requiredRole: requiredRole
      }
    }
    
    // 특정 권한 확인
    if (permission && !PermissionService.hasPermission(userRole, permission)) {
      return {
        granted: false,
        reason: `${permission} 권한이 필요합니다.`,
        requiredRole: PermissionService.getMinimumRoleForPermission(permission) || undefined
      }
    }
    
    return { granted: true }
  }
  
  /**
   * 권한 컨텍스트 생성 (실제로는 데이터베이스에서 조회)
   */
  private async buildPermissionContext(
    context: PermissionGuardContext
  ): Promise<UserPermissionContext> {
    // 실제 구현에서는 데이터베이스에서 사용자 권한 정보를 조회해야 함
    // 여기서는 예시로 기본 컨텍스트 생성
    const rolePermissions = PermissionService.getRolePermissions(context.role)
    
    return {
      userId: context.userId,
      projectId: context.projectId,
      role: context.role,
      permissions: rolePermissions,
      restrictions: {
        ipWhitelist: undefined, // 실제로는 설정에서 가져와야 함
        timeRestrictions: undefined,
        resourceLimits: {
          maxFileSize: 100 * 1024 * 1024, // 100MB
          maxUploadPerDay: 50,
          allowedFileTypes: ['mp4', 'mov', 'avi', 'jpg', 'png', 'pdf'],
          maxCommentLength: 1000
        },
        requireMfa: context.role === ProjectRole.OWNER || context.role === ProjectRole.ADMIN
      },
      metadata: {
        grantedAt: new Date(),
        grantedBy: 'system',
        lastUsedAt: new Date(),
        expiresAt: this.getTokenExpirationDate(),
        source: 'role'
      }
    }
  }
  
  /**
   * 캐시 키 생성
   */
  private getCacheKey(context: PermissionGuardContext, permissions: Permission[]): string {
    return `${context.userId}:${context.projectId}:${context.role}:${permissions.sort().join(',')}`
  }
  
  /**
   * 캐시된 결과 가져오기
   */
  private getCachedResult(cacheKey: string): PermissionCheckResult | null {
    const cached = this.permissionCache.get(cacheKey)
    if (!cached) return null
    
    if (Date.now() > cached.expiresAt) {
      this.permissionCache.delete(cacheKey)
      return null
    }
    
    return cached.result
  }
  
  /**
   * 캐시에 결과 저장
   */
  private setCachedResult(cacheKey: string, result: PermissionCheckResult): void {
    const expiresAt = Date.now() + (this.config.cacheTtl * 1000)
    this.permissionCache.set(cacheKey, { result, expiresAt })
  }
  
  /**
   * 토큰 만료 시간 계산 (예시)
   */
  private getTokenExpirationDate(): Date {
    const expirationHours = 24 // 24시간
    return new Date(Date.now() + (expirationHours * 60 * 60 * 1000))
  }
  
  /**
   * 로깅
   */
  private log(action: string, data: Record<string, unknown>): void {
    if (!this.config.enableLogging) return
    
    console.log(`[PermissionGuard] ${action}`, {
      timestamp: new Date().toISOString(),
      ...data
    })
  }
  
  /**
   * 캐시 초기화
   */
  clearCache(): void {
    this.permissionCache.clear()
  }
  
  /**
   * 캐시 통계
   */
  getCacheStats(): { size: number; hitRate: number } {
    // 실제 구현에서는 히트율 추적 필요
    return {
      size: this.permissionCache.size,
      hitRate: 0 // 히트율 계산 로직 필요
    }
  }
}