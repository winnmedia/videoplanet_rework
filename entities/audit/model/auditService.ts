/**
 * 감사 로그 서비스
 * 권한 시스템의 모든 활동을 추적하고 기록합니다.
 */

import type { AuditLog, Permission } from '@/entities/rbac/model/types'

/**
 * 감사 이벤트 타입
 */
export enum AuditEventType {
  PERMISSION_CHECK = 'permission_check',
  LOGIN = 'login',
  LOGOUT = 'logout',
  ROLE_CHANGE = 'role_change',
  PERMISSION_GRANT = 'permission_grant',
  PERMISSION_REVOKE = 'permission_revoke',
  PROJECT_ACCESS = 'project_access',
  DATA_EXPORT = 'data_export',
  SETTINGS_CHANGE = 'settings_change',
  USER_INVITE = 'user_invite',
  USER_REMOVE = 'user_remove'
}

/**
 * 감사 로그 생성을 위한 인터페이스
 */
export interface CreateAuditLogInput {
  userId: string
  userName: string
  eventType: AuditEventType
  action: string
  resource: string
  resourceId?: string
  permission?: Permission
  result: 'success' | 'failure' | 'allowed' | 'denied'
  reason?: string
  metadata?: Record<string, any>
  context?: {
    projectId?: string
    userAgent?: string
    ipAddress?: string
    sessionId?: string
    requestId?: string
  }
}

/**
 * 감사 로그 조회 필터
 */
export interface AuditLogFilter {
  userId?: string
  eventType?: AuditEventType[]
  action?: string
  resource?: string
  result?: ('success' | 'failure' | 'allowed' | 'denied')[]
  dateFrom?: Date
  dateTo?: Date
  limit?: number
  offset?: number
}

/**
 * 감사 로그 서비스 클래스
 */
export class AuditService {
  /**
   * 감사 로그 생성
   */
  static async createAuditLog(input: CreateAuditLogInput): Promise<AuditLog> {
    const auditLog: AuditLog = {
      id: this.generateAuditId(),
      userId: input.userId,
      userName: input.userName,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId,
      permission: input.permission!,
      result: input.result as 'allowed' | 'denied',
      reason: input.reason,
      context: {
        ...input.context,
        timestamp: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    }

    // 실제 환경에서는 데이터베이스에 저장
    await this.persistAuditLog(auditLog)

    // 중요한 이벤트는 별도 로깅
    if (this.isCriticalEvent(input.eventType, input.result)) {
      await this.logCriticalEvent(auditLog)
    }

    return auditLog
  }

  /**
   * 권한 검사 감사 로그
   */
  static async logPermissionCheck(
    userId: string,
    userName: string,
    permission: Permission,
    result: 'allowed' | 'denied',
    resource: string,
    context?: CreateAuditLogInput['context']
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      userName,
      eventType: AuditEventType.PERMISSION_CHECK,
      action: `check_${permission}`,
      resource,
      permission,
      result,
      context
    })
  }

  /**
   * 로그인 감사 로그
   */
  static async logLogin(
    userId: string,
    userName: string,
    success: boolean,
    context?: CreateAuditLogInput['context']
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      userName,
      eventType: AuditEventType.LOGIN,
      action: 'user_login',
      resource: '/auth/login',
      result: success ? 'success' : 'failure',
      context
    })
  }

  /**
   * 역할 변경 감사 로그
   */
  static async logRoleChange(
    adminUserId: string,
    adminUserName: string,
    targetUserId: string,
    targetUserName: string,
    oldRole: string,
    newRole: string,
    context?: CreateAuditLogInput['context']
  ): Promise<void> {
    await this.createAuditLog({
      userId: adminUserId,
      userName: adminUserName,
      eventType: AuditEventType.ROLE_CHANGE,
      action: 'change_user_role',
      resource: '/users/role',
      resourceId: targetUserId,
      result: 'success',
      metadata: {
        targetUser: targetUserName,
        oldRole,
        newRole
      },
      context
    })
  }

  /**
   * 프로젝트 접근 감사 로그
   */
  static async logProjectAccess(
    userId: string,
    userName: string,
    projectId: string,
    action: string,
    success: boolean,
    context?: CreateAuditLogInput['context']
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      userName,
      eventType: AuditEventType.PROJECT_ACCESS,
      action: `project_${action}`,
      resource: `/projects/${projectId}`,
      resourceId: projectId,
      result: success ? 'success' : 'failure',
      context: {
        ...context,
        projectId
      }
    })
  }

  /**
   * 데이터 내보내기 감사 로그
   */
  static async logDataExport(
    userId: string,
    userName: string,
    resourceType: string,
    resourceIds: string[],
    context?: CreateAuditLogInput['context']
  ): Promise<void> {
    await this.createAuditLog({
      userId,
      userName,
      eventType: AuditEventType.DATA_EXPORT,
      action: 'export_data',
      resource: `/export/${resourceType}`,
      result: 'success',
      metadata: {
        resourceType,
        resourceIds,
        count: resourceIds.length
      },
      context
    })
  }

  /**
   * 감사 로그 조회
   */
  static async getAuditLogs(filter: AuditLogFilter = {}): Promise<AuditLog[]> {
    // 실제 환경에서는 데이터베이스에서 조회
    // 여기서는 메모리 저장소에서 조회하는 mock 구현
    return this.queryAuditLogs(filter)
  }

  /**
   * 사용자별 활동 요약
   */
  static async getUserActivitySummary(userId: string, days: number = 30): Promise<{
    totalActions: number
    successfulActions: number
    failedActions: number
    deniedPermissions: number
    mostAccessedResources: Array<{ resource: string; count: number }>
    recentActivity: AuditLog[]
  }> {
    const dateFrom = new Date()
    dateFrom.setDate(dateFrom.getDate() - days)

    const logs = await this.getAuditLogs({
      userId,
      dateFrom,
      limit: 1000
    })

    // 통계 계산
    const totalActions = logs.length
    const successfulActions = logs.filter(log => 
      log.result === 'allowed'
    ).length
    const failedActions = logs.filter(log => 
      log.result === 'denied'
    ).length
    const deniedPermissions = logs.filter(log => 
      log.result === 'denied'
    ).length

    // 자주 접근한 리소스
    const resourceCounts = logs.reduce((acc, log) => {
      acc[log.resource] = (acc[log.resource] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const mostAccessedResources = Object.entries(resourceCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([resource, count]) => ({ resource, count }))

    // 최근 활동 (최근 10개)
    const recentActivity = logs
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)

    return {
      totalActions,
      successfulActions,
      failedActions,
      deniedPermissions,
      mostAccessedResources,
      recentActivity
    }
  }

  /**
   * 보안 위험 감지
   */
  static async detectSecurityRisks(timeWindow: number = 60): Promise<Array<{
    type: 'suspicious_activity' | 'brute_force' | 'privilege_escalation'
    userId: string
    userName: string
    description: string
    severity: 'low' | 'medium' | 'high' | 'critical'
    occurrences: number
    lastOccurrence: string
  }>> {
    const dateFrom = new Date()
    dateFrom.setMinutes(dateFrom.getMinutes() - timeWindow)

    const recentLogs = await this.getAuditLogs({ dateFrom })
    const risks: any[] = []

    // 무차별 대입 공격 감지
    const failedLogins = recentLogs.filter(log => 
      log.action === 'user_login' && log.result === 'denied'
    )

    const bruteForceAttempts = new Map<string, AuditLog[]>()
    failedLogins.forEach(log => {
      const key = `${log.userId}_${log.context?.ipAddress}`
      if (!bruteForceAttempts.has(key)) {
        bruteForceAttempts.set(key, [])
      }
      bruteForceAttempts.get(key)!.push(log)
    })

    bruteForceAttempts.forEach((attempts, key) => {
      if (attempts.length >= 5) { // 5회 이상 실패
        risks.push({
          type: 'brute_force',
          userId: attempts[0].userId,
          userName: attempts[0].userName,
          description: `${attempts.length}회 연속 로그인 실패`,
          severity: attempts.length >= 10 ? 'critical' : 'high',
          occurrences: attempts.length,
          lastOccurrence: attempts[attempts.length - 1].createdAt
        })
      }
    })

    // 권한 거부 급증 감지
    const deniedPermissions = recentLogs.filter(log => log.result === 'denied')
    const userDenials = new Map<string, AuditLog[]>()
    
    deniedPermissions.forEach(log => {
      if (!userDenials.has(log.userId)) {
        userDenials.set(log.userId, [])
      }
      userDenials.get(log.userId)!.push(log)
    })

    userDenials.forEach((denials, userId) => {
      if (denials.length >= 10) { // 10회 이상 권한 거부
        risks.push({
          type: 'suspicious_activity',
          userId,
          userName: denials[0].userName,
          description: `${denials.length}회 권한 거부 발생`,
          severity: 'medium',
          occurrences: denials.length,
          lastOccurrence: denials[denials.length - 1].createdAt
        })
      }
    })

    return risks
  }

  /**
   * 감사 로그 ID 생성
   */
  private static generateAuditId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 중요한 이벤트 판단
   */
  private static isCriticalEvent(eventType: AuditEventType, result: string): boolean {
    const criticalEvents = [
      AuditEventType.ROLE_CHANGE,
      AuditEventType.PERMISSION_GRANT,
      AuditEventType.PERMISSION_REVOKE,
      AuditEventType.DATA_EXPORT,
      AuditEventType.USER_REMOVE
    ]

    const criticalFailures = [
      AuditEventType.LOGIN
    ]

    return criticalEvents.includes(eventType) || 
           (criticalFailures.includes(eventType) && result === 'failure')
  }

  /**
   * 감사 로그 저장 (mock 구현)
   */
  private static async persistAuditLog(auditLog: AuditLog): Promise<void> {
    // 실제 환경에서는 데이터베이스에 저장
    console.log('🔍 Audit Log:', {
      id: auditLog.id,
      user: auditLog.userName,
      action: auditLog.action,
      resource: auditLog.resource,
      result: auditLog.result,
      timestamp: auditLog.createdAt
    })

    // 메모리 저장소에 저장 (개발용)
    if (!global.auditLogs) {
      global.auditLogs = []
    }
    global.auditLogs.push(auditLog)
  }

  /**
   * 중요 이벤트 별도 로깅
   */
  private static async logCriticalEvent(auditLog: AuditLog): Promise<void> {
    console.warn('🚨 Critical Security Event:', {
      id: auditLog.id,
      user: auditLog.userName,
      action: auditLog.action,
      resource: auditLog.resource,
      result: auditLog.result,
      reason: auditLog.reason
    })

    // 실제 환경에서는 보안 모니터링 시스템에 알림 전송
    // await securityNotificationService.sendAlert(auditLog)
  }

  /**
   * 감사 로그 조회 (mock 구현)
   */
  private static async queryAuditLogs(filter: AuditLogFilter): Promise<AuditLog[]> {
    // 실제 환경에서는 데이터베이스 쿼리
    const logs = (global.auditLogs || []) as AuditLog[]
    
    let filtered = logs

    // 필터 적용
    if (filter.userId) {
      filtered = filtered.filter(log => log.userId === filter.userId)
    }

    if (filter.dateFrom) {
      filtered = filtered.filter(log => 
        new Date(log.createdAt) >= filter.dateFrom!
      )
    }

    if (filter.dateTo) {
      filtered = filtered.filter(log => 
        new Date(log.createdAt) <= filter.dateTo!
      )
    }

    // 정렬 (최신순)
    filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    // 페이지네이션
    const offset = filter.offset || 0
    const limit = filter.limit || 100

    return filtered.slice(offset, offset + limit)
  }
}

// 전역 타입 확장
declare global {
  var auditLogs: AuditLog[]
}