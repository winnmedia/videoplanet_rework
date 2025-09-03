import { 
  ProjectRole, 
  Permission, 
  UserPermissionContext, 
  PermissionCheckResult,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  RESOURCE_PERMISSIONS,
  ResourcePermissions,
  PermissionRestrictions,
  TimeRestriction
} from './types'

/**
 * 권한 도메인 비즈니스 로직
 * FSD entities 레이어에 위치한 순수 도메인 로직
 */

export class PermissionService {
  /**
   * 특정 권한이 역할에 포함되는지 확인
   */
  static hasPermission(role: ProjectRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role].includes(permission)
  }
  
  /**
   * 역할 계층 확인 - role1이 role2보다 상위 권한인지
   */
  static hasHigherRole(role1: ProjectRole, role2: ProjectRole): boolean {
    return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2]
  }
  
  /**
   * 역할 계층 확인 - role1이 role2와 같거나 상위 권한인지
   */
  static hasEqualOrHigherRole(role1: ProjectRole, role2: ProjectRole): boolean {
    return ROLE_HIERARCHY[role1] >= ROLE_HIERARCHY[role2]
  }
  
  /**
   * 특정 리소스에 대한 모든 권한 가져오기
   */
  static getResourcePermissions(resource: keyof ResourcePermissions): Permission[] {
    return RESOURCE_PERMISSIONS[resource]
  }
  
  /**
   * 역할의 모든 권한 가져오기
   */
  static getRolePermissions(role: ProjectRole): Permission[] {
    return ROLE_PERMISSIONS[role]
  }
  
  /**
   * 역할별 리소스 권한 확인
   */
  static hasResourceAccess(
    role: ProjectRole, 
    resource: keyof ResourcePermissions,
    requiredPermission: Permission
  ): boolean {
    const resourcePermissions = RESOURCE_PERMISSIONS[resource]
    const rolePermissions = ROLE_PERMISSIONS[role]
    
    return resourcePermissions.includes(requiredPermission) &&
           rolePermissions.includes(requiredPermission)
  }
  
  /**
   * 최소 권한 역할 찾기
   */
  static getMinimumRoleForPermission(permission: Permission): ProjectRole | null {
    const roles = Object.entries(ROLE_PERMISSIONS)
      .filter(([, permissions]) => permissions.includes(permission))
      .map(([role]) => role as ProjectRole)
      .sort((a, b) => ROLE_HIERARCHY[a] - ROLE_HIERARCHY[b])
    
    return roles[0] || null
  }
  
  /**
   * 권한 승계 확인 - 상위 역할이 하위 역할의 권한을 모두 포함하는지
   */
  static validateRoleHierarchy(): boolean {
    const roles = Object.values(ProjectRole)
    
    for (let i = 0; i < roles.length; i++) {
      for (let j = i + 1; j < roles.length; j++) {
        const lowerRole = roles[i]
        const higherRole = roles[j]
        
        if (ROLE_HIERARCHY[higherRole] > ROLE_HIERARCHY[lowerRole]) {
          const lowerPermissions = ROLE_PERMISSIONS[lowerRole]
          const higherPermissions = ROLE_PERMISSIONS[higherRole]
          
          // 상위 역할이 하위 역할의 모든 권한을 포함해야 함
          const hasAllPermissions = lowerPermissions.every(permission => 
            higherPermissions.includes(permission)
          )
          
          if (!hasAllPermissions) {
            return false
          }
        }
      }
    }
    
    return true
  }
}

/**
 * 권한 확인을 위한 컨텍스트 기반 서비스
 */
export class PermissionChecker {
  private context: UserPermissionContext
  
  constructor(context: UserPermissionContext) {
    this.context = context
  }
  
  /**
   * 특정 권한 확인
   */
  checkPermission(permission: Permission): PermissionCheckResult {
    const hasRolePermission = this.context.permissions.includes(permission)
    
    if (!hasRolePermission) {
      const requiredRole = PermissionService.getMinimumRoleForPermission(permission)
      return {
        granted: false,
        reason: `권한이 부족합니다. ${permission} 권한이 필요합니다.`,
        requiredRole: requiredRole || undefined
      }
    }
    
    // 시간 제약 확인
    const timeRestriction = this.checkTimeRestrictions()
    if (!timeRestriction.granted) {
      return timeRestriction
    }
    
    // IP 제약 확인 (실제 구현에서는 request context에서 IP 가져와야 함)
    const ipRestriction = this.checkIpRestrictions()
    if (!ipRestriction.granted) {
      return ipRestriction
    }
    
    return {
      granted: true,
      metadata: {
        role: this.context.role,
        grantedAt: this.context.metadata.grantedAt.toISOString(),
        source: this.context.metadata.source
      }
    }
  }
  
  /**
   * 다중 권한 확인 (모두 필요)
   */
  checkAllPermissions(permissions: Permission[]): PermissionCheckResult {
    for (const permission of permissions) {
      const result = this.checkPermission(permission)
      if (!result.granted) {
        return result
      }
    }
    
    return { granted: true }
  }
  
  /**
   * 다중 권한 확인 (하나라도 있으면 됨)
   */
  checkAnyPermission(permissions: Permission[]): PermissionCheckResult {
    const results = permissions.map(permission => this.checkPermission(permission))
    const grantedResults = results.filter(result => result.granted)
    
    if (grantedResults.length > 0) {
      return { granted: true }
    }
    
    return {
      granted: false,
      reason: `다음 권한 중 하나라도 필요합니다: ${permissions.join(', ')}`,
      restrictions: results
        .filter(result => !result.granted)
        .map(result => result.reason || '알 수 없는 오류')
    }
  }
  
  /**
   * 리소스별 권한 확인
   */
  checkResourcePermission(
    resource: keyof ResourcePermissions, 
    permission: Permission
  ): PermissionCheckResult {
    const hasResourcePermission = PermissionService.hasResourceAccess(
      this.context.role,
      resource,
      permission
    )
    
    if (!hasResourcePermission) {
      return {
        granted: false,
        reason: `${resource} 리소스에 대한 ${permission} 권한이 없습니다.`
      }
    }
    
    return this.checkPermission(permission)
  }
  
  /**
   * 시간 제약 확인
   */
  private checkTimeRestrictions(): PermissionCheckResult {
    const restrictions = this.context.restrictions.timeRestrictions
    if (!restrictions || restrictions.length === 0) {
      return { granted: true }
    }
    
    const now = new Date()
    const currentHour = now.getHours()
    const currentDay = now.getDay() // 0=Sunday
    
    const hasValidTimeSlot = restrictions.some(restriction => 
      this.isTimeAllowed(restriction, currentHour, currentDay)
    )
    
    if (!hasValidTimeSlot) {
      return {
        granted: false,
        reason: '현재 시간대에는 접근이 제한됩니다.',
        restrictions: restrictions.map(r => 
          `${r.startHour}:00-${r.endHour}:00 (${r.timezone})`
        )
      }
    }
    
    return { granted: true }
  }
  
  /**
   * IP 제약 확인
   */
  private checkIpRestrictions(clientIp?: string): PermissionCheckResult {
    const whitelist = this.context.restrictions.ipWhitelist
    if (!whitelist || whitelist.length === 0) {
      return { granted: true }
    }
    
    if (!clientIp) {
      // 실제 구현에서는 request context에서 IP를 가져와야 함
      return { granted: true } // 개발 환경에서는 통과
    }
    
    const isAllowed = whitelist.some(allowedIp => 
      this.matchesIpPattern(clientIp, allowedIp)
    )
    
    if (!isAllowed) {
      return {
        granted: false,
        reason: '허용되지 않은 IP 주소에서의 접근입니다.',
        restrictions: [`허용된 IP: ${whitelist.join(', ')}`]
      }
    }
    
    return { granted: true }
  }
  
  private isTimeAllowed(
    restriction: TimeRestriction,
    currentHour: number,
    currentDay: number
  ): boolean {
    const isDayAllowed = restriction.daysOfWeek.includes(currentDay)
    if (!isDayAllowed) return false
    
    // 시간 범위 확인 (시작시간과 종료시간이 같은 날인 경우)
    if (restriction.startHour <= restriction.endHour) {
      return currentHour >= restriction.startHour && currentHour < restriction.endHour
    }
    
    // 자정을 넘나드는 경우 (예: 22:00 - 06:00)
    return currentHour >= restriction.startHour || currentHour < restriction.endHour
  }
  
  private matchesIpPattern(ip: string, pattern: string): boolean {
    // 간단한 IP 매칭 (실제로는 더 정교한 CIDR 매칭 필요)
    if (pattern === '*') return true
    if (pattern === ip) return true
    
    // CIDR 표기법 간단 지원 (예: 192.168.1.0/24)
    if (pattern.includes('/')) {
      const [baseIp, prefix] = pattern.split('/')
      const prefixLength = parseInt(prefix, 10)
      
      // 실제로는 비트 연산으로 정확한 CIDR 매칭 필요
      const basePrefix = baseIp.split('.').slice(0, Math.ceil(prefixLength / 8)).join('.')
      const ipPrefix = ip.split('.').slice(0, Math.ceil(prefixLength / 8)).join('.')
      
      return basePrefix === ipPrefix
    }
    
    // 와일드카드 패턴 지원 (예: 192.168.1.*)
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '\\d+'))
      return regex.test(ip)
    }
    
    return false
  }
  
  /**
   * 권한 만료 확인
   */
  isExpired(): boolean {
    const expiresAt = this.context.metadata.expiresAt
    if (!expiresAt) return false
    
    return new Date() > expiresAt
  }
  
  /**
   * MFA 필요 여부 확인
   */
  requiresMfa(): boolean {
    return this.context.restrictions.requireMfa
  }
  
  /**
   * 권한 컨텍스트 업데이트
   */
  updateLastUsed(): void {
    this.context.metadata.lastUsedAt = new Date()
  }
}