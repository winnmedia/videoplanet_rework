import {
  DataOwnership,
  DataAccessLog,
  DataAction,
  ResourceType,
  DataClassification,
  GdprDataRequest,
  GdprRequestType,
  GdprRequestStatus,
  DataIsolationPolicy,
  IsolationRule,
  AccessRule,
  RetentionRule
} from './types'

/**
 * 데이터 격리 및 소유권 관리 도메인 서비스
 * FSD entities 레이어의 순수 비즈니스 로직
 */

export class DataOwnershipService {
  /**
   * 데이터 소유권 확인
   */
  static checkOwnership(
    ownership: DataOwnership,
    requesterId: string,
    action: DataAction
  ): { allowed: boolean; reason?: string } {
    // 소유자는 모든 액션 허용
    if (ownership.ownerId === requesterId) {
      return { allowed: true }
    }
    
    // 공개 데이터 읽기 허용
    if (ownership.isPublic && action === DataAction.READ) {
      return { allowed: true }
    }
    
    // 공유된 데이터 확인
    const shareInfo = ownership.sharedWith.find(
      share => share.sharedWithUserId === requesterId
    )
    
    if (shareInfo) {
      // 공유 만료 확인
      if (shareInfo.expiresAt && new Date() > shareInfo.expiresAt) {
        return { allowed: false, reason: '공유 권한이 만료되었습니다.' }
      }
      
      // 권한 확인
      if (shareInfo.permissions.includes(action)) {
        return { allowed: true }
      } else {
        return { 
          allowed: false, 
          reason: `${action} 권한이 없습니다. 허용된 권한: ${shareInfo.permissions.join(', ')}` 
        }
      }
    }
    
    // 게스트 접근 허용 확인
    if (ownership.allowGuestAccess && action === DataAction.READ) {
      return { allowed: true }
    }
    
    return { allowed: false, reason: '해당 리소스에 대한 접근 권한이 없습니다.' }
  }
  
  /**
   * 데이터 분류에 따른 접근 제한 확인
   */
  static checkClassificationAccess(
    classification: DataClassification,
    userRole: string,
    organizationId?: string
  ): { allowed: boolean; reason?: string } {
    switch (classification) {
      case DataClassification.PUBLIC:
        return { allowed: true }
        
      case DataClassification.INTERNAL:
        if (!organizationId) {
          return { allowed: false, reason: '조직 소속이 필요한 데이터입니다.' }
        }
        return { allowed: true }
        
      case DataClassification.CONFIDENTIAL:
        const confidentialRoles = ['admin', 'manager', 'owner']
        if (!confidentialRoles.includes(userRole)) {
          return { allowed: false, reason: '기밀 데이터 접근 권한이 없습니다.' }
        }
        return { allowed: true }
        
      case DataClassification.RESTRICTED:
        const restrictedRoles = ['owner']
        if (!restrictedRoles.includes(userRole)) {
          return { allowed: false, reason: '제한된 데이터 접근 권한이 없습니다.' }
        }
        return { allowed: true }
        
      default:
        return { allowed: false, reason: '알 수 없는 데이터 분류입니다.' }
    }
  }
  
  /**
   * GDPR 동의 상태 확인
   */
  static checkGdprConsent(ownership: DataOwnership, action: DataAction): boolean {
    const consent = ownership.gdprConsent
    
    // 동의 철회 확인
    if (consent.withdrawalDate) {
      return false
    }
    
    switch (action) {
      case DataAction.READ:
        return consent.dataProcessing
        
      case DataAction.SHARE:
        return consent.dataProcessing && consent.dataSharing
        
      case DataAction.EXPORT:
        return consent.dataProcessing && consent.dataSharing
        
      default:
        return consent.dataProcessing
    }
  }
  
  /**
   * 데이터 보존 기간 확인
   */
  static checkRetentionPolicy(ownership: DataOwnership): {
    expired: boolean
    shouldAnonymize: boolean
    shouldDelete: boolean
  } {
    const now = new Date()
    
    // 보존 기간 확인
    let expired = false
    if (ownership.retentionPeriod) {
      const expirationDate = new Date(ownership.createdAt)
      expirationDate.setDate(expirationDate.getDate() + ownership.retentionPeriod)
      expired = now > expirationDate
    }
    
    // 익명화 확인
    const shouldAnonymize = ownership.anonymizationDate ? now > ownership.anonymizationDate : false
    
    return {
      expired,
      shouldAnonymize,
      shouldDelete: expired && shouldAnonymize
    }
  }
  
  /**
   * 리소스 암호화 상태 확인
   */
  static requiresEncryption(
    classification: DataClassification,
    resourceType: ResourceType
  ): boolean {
    // 기밀 및 제한된 데이터는 암호화 필수
    if (classification === DataClassification.CONFIDENTIAL || 
        classification === DataClassification.RESTRICTED) {
      return true
    }
    
    // 특정 리소스 타입은 암호화 필수
    const encryptionRequiredTypes = [
      ResourceType.USER_PROFILE,
      ResourceType.ANALYTICS_DATA
    ]
    
    return encryptionRequiredTypes.includes(resourceType)
  }
}

export class DataAccessLogger {
  /**
   * 액세스 로그 생성
   */
  static createAccessLog(
    resourceId: string,
    resourceType: ResourceType,
    userId: string,
    action: DataAction,
    context: {
      success: boolean
      reason?: string
      ip: string
      userAgent: string
      sessionId: string
      requestId: string
    }
  ): Omit<DataAccessLog, 'id'> {
    return {
      resourceId,
      resourceType,
      userId,
      action,
      accessContext: {
        sessionId: context.sessionId,
        requestId: context.requestId,
        authMethod: 'password', // 실제로는 인증 방식에 따라 설정
        mfaVerified: false, // 실제 MFA 상태로 설정
        riskScore: this.calculateRiskScore(context.ip, context.userAgent),
        deviceInfo: {
          deviceType: this.detectDeviceType(context.userAgent),
          os: this.extractOS(context.userAgent),
          browser: this.extractBrowser(context.userAgent),
          isKnownDevice: false, // 실제 디바이스 추적 로직 필요
          deviceFingerprint: this.generateDeviceFingerprint(context.userAgent, context.ip)
        }
      },
      success: context.success,
      reason: context.reason,
      timestamp: new Date(),
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: {
        severity: this.determineSeverity(action, context.success),
        flags: this.generateFlags(action, context),
        complianceChecks: this.performComplianceChecks(resourceType, action)
      }
    }
  }
  
  /**
   * 위험도 점수 계산
   */
  private static calculateRiskScore(ip: string, userAgent: string): number {
    let score = 0
    
    // IP 기반 위험도
    if (this.isKnownMaliciousIp(ip)) {
      score += 50
    }
    
    // User-Agent 기반 위험도
    if (this.isSuspiciousUserAgent(userAgent)) {
      score += 30
    }
    
    // 시간대 기반 위험도 (업무시간 외)
    const hour = new Date().getHours()
    if (hour < 6 || hour > 22) {
      score += 10
    }
    
    return Math.min(score, 100)
  }
  
  /**
   * 디바이스 타입 감지
   */
  private static detectDeviceType(userAgent: string): 'desktop' | 'mobile' | 'tablet' {
    if (/mobile/i.test(userAgent)) return 'mobile'
    if (/tablet|ipad/i.test(userAgent)) return 'tablet'
    return 'desktop'
  }
  
  /**
   * OS 추출
   */
  private static extractOS(userAgent: string): string {
    if (/windows/i.test(userAgent)) return 'Windows'
    if (/macintosh|mac os/i.test(userAgent)) return 'macOS'
    if (/linux/i.test(userAgent)) return 'Linux'
    if (/android/i.test(userAgent)) return 'Android'
    if (/ios|iphone|ipad/i.test(userAgent)) return 'iOS'
    return 'Unknown'
  }
  
  /**
   * 브라우저 추출
   */
  private static extractBrowser(userAgent: string): string {
    if (/chrome/i.test(userAgent)) return 'Chrome'
    if (/firefox/i.test(userAgent)) return 'Firefox'
    if (/safari/i.test(userAgent)) return 'Safari'
    if (/edge/i.test(userAgent)) return 'Edge'
    return 'Unknown'
  }
  
  /**
   * 디바이스 핑거프린트 생성
   */
  private static generateDeviceFingerprint(userAgent: string, ip: string): string {
    // 실제로는 더 정교한 핑거프린팅 필요
    const data = userAgent + ip + new Date().getDate()
    return btoa(data).substring(0, 32)
  }
  
  /**
   * 심각도 결정
   */
  private static determineSeverity(
    action: DataAction, 
    success: boolean
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (!success) {
      if (action === DataAction.DELETE || action === DataAction.EXPORT) {
        return 'high'
      }
      return 'medium'
    }
    
    if (action === DataAction.DELETE || action === DataAction.SHARE) {
      return 'medium'
    }
    
    return 'low'
  }
  
  /**
   * 플래그 생성
   */
  private static generateFlags(
    action: DataAction,
    context: { ip: string; userAgent: string }
  ): string[] {
    const flags: string[] = []
    
    if (this.isKnownMaliciousIp(context.ip)) {
      flags.push('suspicious_ip')
    }
    
    if (this.isSuspiciousUserAgent(context.userAgent)) {
      flags.push('suspicious_user_agent')
    }
    
    if (action === DataAction.EXPORT) {
      flags.push('data_export')
    }
    
    if (action === DataAction.DELETE) {
      flags.push('data_deletion')
    }
    
    return flags
  }
  
  /**
   * 컴플라이언스 검사
   */
  private static performComplianceChecks(
    resourceType: ResourceType,
    action: DataAction
  ): Array<{ regulation: 'GDPR' | 'CCPA' | 'HIPAA' | 'SOX'; status: 'compliant' | 'violation' | 'warning'; details?: string }> {
    const checks = []
    
    // GDPR 검사
    if (resourceType === ResourceType.USER_PROFILE) {
      checks.push({
        regulation: 'GDPR' as const,
        status: 'compliant' as const,
        details: '개인정보 처리 로그 기록됨'
      })
    }
    
    // 데이터 삭제 시 감사 로그 필요
    if (action === DataAction.DELETE) {
      checks.push({
        regulation: 'SOX' as const,
        status: 'compliant' as const,
        details: '데이터 삭제 감사 로그 생성'
      })
    }
    
    return checks
  }
  
  private static isKnownMaliciousIp(ip: string): boolean {
    // 실제로는 위협 인텔리전스 DB와 연동
    const maliciousIps = ['127.0.0.1'] // 예시
    return maliciousIps.includes(ip)
  }
  
  private static isSuspiciousUserAgent(userAgent: string): boolean {
    // 의심스러운 User-Agent 패턴 검사
    const suspiciousPatterns = [
      /bot/i,
      /crawler/i,
      /scraper/i
    ]
    
    return suspiciousPatterns.some(pattern => pattern.test(userAgent))
  }
}

export class GdprComplianceService {
  /**
   * GDPR 데이터 요청 생성
   */
  static createGdprRequest(
    userId: string,
    requestType: GdprRequestType,
    dataTypes: Array<'profile' | 'projects' | 'files' | 'comments' | 'activity_logs'>,
    context: {
      ipAddress: string
      userAgent: string
      reason?: string
    }
  ): Omit<GdprDataRequest, 'id'> {
    return {
      userId,
      requestType,
      status: GdprRequestStatus.PENDING,
      dataTypes: dataTypes as any,
      reason: context.reason,
      requestedAt: new Date(),
      metadata: {
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        verificationMethod: 'email_verification', // 실제로는 검증 방법에 따라 설정
        legalBasis: this.determineLegalBasis(requestType),
        notes: context.reason
      }
    }
  }
  
  /**
   * 법적 근거 결정
   */
  private static determineLegalBasis(requestType: GdprRequestType): string {
    switch (requestType) {
      case GdprRequestType.DATA_EXPORT:
        return 'GDPR Article 20 - Right to data portability'
      case GdprRequestType.DATA_DELETION:
        return 'GDPR Article 17 - Right to erasure'
      case GdprRequestType.DATA_RECTIFICATION:
        return 'GDPR Article 16 - Right to rectification'
      case GdprRequestType.DATA_PORTABILITY:
        return 'GDPR Article 20 - Right to data portability'
      case GdprRequestType.CONSENT_WITHDRAWAL:
        return 'GDPR Article 7 - Conditions for consent'
      default:
        return 'GDPR Article 15 - Right of access'
    }
  }
  
  /**
   * 데이터 삭제 가능 여부 확인
   */
  static canDeleteData(
    ownership: DataOwnership,
    legalHolds: string[] = []
  ): { canDelete: boolean; reason?: string } {
    // 법적 보존 의무 확인
    if (legalHolds.length > 0) {
      return {
        canDelete: false,
        reason: `법적 보존 의무로 삭제 불가: ${legalHolds.join(', ')}`
      }
    }
    
    // 보존 기간 확인
    const retentionCheck = DataOwnershipService.checkRetentionPolicy(ownership)
    if (!retentionCheck.expired) {
      return {
        canDelete: false,
        reason: '보존 기간이 만료되지 않음'
      }
    }
    
    // 공유된 데이터 확인
    if (ownership.sharedWith.length > 0) {
      const activeShares = ownership.sharedWith.filter(
        share => !share.expiresAt || share.expiresAt > new Date()
      )
      
      if (activeShares.length > 0) {
        return {
          canDelete: false,
          reason: '다른 사용자와 공유 중인 데이터'
        }
      }
    }
    
    return { canDelete: true }
  }
}