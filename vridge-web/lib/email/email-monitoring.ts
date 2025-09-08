/**
 * 이메일 발송 로깅 및 모니터링 시스템
 * - PII 로깅 방지
 * - 메모리 기반 로깅 (확장 가능한 구조)
 * - 발송량 모니터링 및 제한
 * - 에러 분석 및 알림
 */

import { randomUUID } from 'crypto'

export type EmailType = 'verification' | 'reset' | 'invite' | 'notification'
export type EmailStatus = 'success' | 'failed' | 'pending'
export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface EmailLogEntry {
  id: string
  timestamp: Date
  type: EmailType
  status: EmailStatus
  userHash: string // 익명화된 사용자 식별자
  errorMessage?: string
  metadata?: EmailMetadata
}

export interface EmailMetadata {
  provider?: string
  messageId?: string
  attemptCount?: number
  templateId?: string
  deliveryTime?: number
  // PII 데이터는 저장하지 않음 (email, name, etc.)
  [key: string]: any
}

export interface EmailAlert {
  type: 'high_error_rate' | 'volume_spike' | 'quota_exceeded' | 'system_error'
  severity: AlertSeverity
  message: string
  threshold?: number
  current?: number
  timestamp: Date
}

export interface EmailStats {
  totalSent: number
  successCount: number
  failureCount: number
  successRate: number
  lastHourVolume: number
  avgResponseTime?: number
}

export interface HourlyStats extends EmailStats {
  hour: Date
  byType: Record<EmailType, number>
}

export interface ErrorStats {
  totalErrors: number
  errorsByType: Record<string, number>
  errorsByMessage: Record<string, number>
  errorRate: number
}

/**
 * 이메일 모니터링 및 로깅 클래스
 */
export class EmailMonitor {
  private logs = new Map<string, EmailLogEntry>()
  private alertCallbacks = new Set<(alert: EmailAlert) => void>()
  
  // 설정 가능한 제한값들
  private readonly limits = {
    maxEntriesInMemory: 10000, // 메모리 내 최대 로그 개수
    retentionHours: 24, // 로그 보관 시간 (시간)
    maxEmailsPerUserPerHour: 5, // 사용자당 시간당 최대 이메일
    maxEmailsPerTypePerHour: 1000, // 타입별 시간당 최대 이메일
    errorRateThreshold: 0.5, // 에러율 임계치 (50%)
    volumeSpikeThreshold: 3, // 볼륨 급증 임계치 (평균의 3배)
  }

  /**
   * 이메일 발송 로깅
   * PII 데이터 자동 제거
   */
  logEmail(entry: Omit<EmailLogEntry, 'timestamp' | 'id'>): EmailLogEntry {
    const logEntry: EmailLogEntry = {
      id: randomUUID(),
      timestamp: new Date(),
      ...entry,
      metadata: this.sanitizeMetadata(entry.metadata)
    }

    // 메모리 제한 확인
    this.enforceMemoryLimits()

    // 로그 저장
    this.logs.set(logEntry.id, logEntry)

    // 실시간 알림 확인
    this.checkRealtimeAlerts(logEntry)

    return logEntry
  }

  /**
   * PII 데이터 제거
   */
  private sanitizeMetadata(metadata?: EmailMetadata): EmailMetadata | undefined {
    if (!metadata) return undefined

    const sanitized = { ...metadata }
    
    // PII 필드 제거
    const piiFields = ['email', 'recipient', 'name', 'phone', 'address', 'ip', 'userAgent']
    piiFields.forEach(field => {
      delete sanitized[field]
    })

    return sanitized
  }

  /**
   * 메모리 제한 적용
   */
  private enforceMemoryLimits(): void {
    const entries = Array.from(this.logs.values())
    
    if (entries.length >= this.limits.maxEntriesInMemory) {
      // 가장 오래된 항목들 제거
      const sortedEntries = entries.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
      const toRemove = sortedEntries.slice(0, Math.floor(this.limits.maxEntriesInMemory * 0.1)) // 10% 제거
      
      toRemove.forEach(entry => this.logs.delete(entry.id))
    }
  }

  /**
   * 사용자별 발송 가능 여부 확인
   */
  canSendToUser(userHash: string, type: EmailType): boolean {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const userEmails = Array.from(this.logs.values()).filter(
      entry => entry.userHash === userHash && 
               entry.type === type && 
               entry.timestamp > oneHourAgo
    )

    return userEmails.length < this.limits.maxEmailsPerUserPerHour
  }

  /**
   * 타입별 발송 가능 여부 확인
   */
  canSendType(type: EmailType): boolean {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    
    const typeEmails = Array.from(this.logs.values()).filter(
      entry => entry.type === type && entry.timestamp > oneHourAgo
    )

    return typeEmails.length < this.limits.maxEmailsPerTypePerHour
  }

  /**
   * 시간별 통계 조회
   */
  getHourlyStats(hour?: Date): HourlyStats {
    const targetHour = hour || new Date()
    const hourStart = new Date(targetHour)
    hourStart.setMinutes(0, 0, 0)
    const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)

    const hourlyLogs = Array.from(this.logs.values()).filter(
      entry => entry.timestamp >= hourStart && entry.timestamp < hourEnd
    )

    const successCount = hourlyLogs.filter(entry => entry.status === 'success').length
    const failureCount = hourlyLogs.filter(entry => entry.status === 'failed').length
    const totalSent = hourlyLogs.length

    const byType = {} as Record<EmailType, number>
    hourlyLogs.forEach(entry => {
      byType[entry.type] = (byType[entry.type] || 0) + 1
    })

    return {
      hour: hourStart,
      totalSent,
      successCount,
      failureCount,
      successRate: totalSent > 0 ? successCount / totalSent : 0,
      lastHourVolume: totalSent,
      byType,
      avgResponseTime: this.calculateAverageResponseTime(hourlyLogs)
    }
  }

  /**
   * 전체 통계 조회
   */
  getOverallStats(): EmailStats {
    const allLogs = Array.from(this.logs.values())
    const successCount = allLogs.filter(entry => entry.status === 'success').length
    const failureCount = allLogs.filter(entry => entry.status === 'failed').length
    const totalSent = allLogs.length

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const lastHourLogs = allLogs.filter(entry => entry.timestamp > oneHourAgo)

    return {
      totalSent,
      successCount,
      failureCount,
      successRate: totalSent > 0 ? successCount / totalSent : 0,
      lastHourVolume: lastHourLogs.length,
      avgResponseTime: this.calculateAverageResponseTime(allLogs)
    }
  }

  /**
   * 에러 통계 조회
   */
  getErrorStats(): ErrorStats {
    const errorLogs = Array.from(this.logs.values()).filter(entry => entry.status === 'failed')
    const totalLogs = this.logs.size

    const errorsByType = {} as Record<string, number>
    const errorsByMessage = {} as Record<string, number>

    errorLogs.forEach(entry => {
      errorsByType[entry.type] = (errorsByType[entry.type] || 0) + 1
      
      if (entry.errorMessage) {
        errorsByMessage[entry.errorMessage] = (errorsByMessage[entry.errorMessage] || 0) + 1
      }
    })

    return {
      totalErrors: errorLogs.length,
      errorsByType,
      errorsByMessage,
      errorRate: totalLogs > 0 ? errorLogs.length / totalLogs : 0
    }
  }

  /**
   * 평균 응답 시간 계산
   */
  private calculateAverageResponseTime(logs: EmailLogEntry[]): number | undefined {
    const logsWithTime = logs.filter(entry => entry.metadata?.deliveryTime)
    
    if (logsWithTime.length === 0) return undefined

    const totalTime = logsWithTime.reduce((sum, entry) => sum + (entry.metadata?.deliveryTime || 0), 0)
    return totalTime / logsWithTime.length
  }

  /**
   * 실시간 알림 확인
   */
  private checkRealtimeAlerts(newEntry: EmailLogEntry): void {
    // 에러 발생 시 즉시 확인
    if (newEntry.status === 'failed') {
      const recentStats = this.getHourlyStats()
      
      if (recentStats.successRate < (1 - this.limits.errorRateThreshold) && recentStats.totalSent >= 10) {
        this.triggerAlert({
          type: 'high_error_rate',
          severity: 'critical',
          message: `이메일 에러율이 ${(recentStats.successRate * 100).toFixed(1)}%로 임계치를 초과했습니다.`,
          threshold: this.limits.errorRateThreshold,
          current: 1 - recentStats.successRate,
          timestamp: new Date()
        })
      }
    }
  }

  /**
   * 정기 알림 확인
   */
  checkAlerts(): void {
    this.checkErrorRateAlert()
    this.checkVolumeSpikeAlert()
  }

  /**
   * 에러율 알림 확인
   */
  private checkErrorRateAlert(): void {
    const stats = this.getOverallStats()
    
    if (stats.totalSent >= 10 && (1 - stats.successRate) > this.limits.errorRateThreshold) {
      this.triggerAlert({
        type: 'high_error_rate',
        severity: 'critical',
        message: `전체 이메일 에러율이 ${((1 - stats.successRate) * 100).toFixed(1)}%로 임계치를 초과했습니다.`,
        threshold: this.limits.errorRateThreshold,
        current: 1 - stats.successRate,
        timestamp: new Date()
      })
    }
  }

  /**
   * 볼륨 급증 알림 확인
   */
  private checkVolumeSpikeAlert(): void {
    const currentHour = this.getHourlyStats()
    
    // 지난 24시간 평균 계산
    const last24Hours = []
    const now = new Date()
    
    for (let i = 1; i <= 24; i++) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
      last24Hours.push(this.getHourlyStats(hour))
    }
    
    const avgVolume = last24Hours.reduce((sum, stats) => sum + stats.totalSent, 0) / 24
    
    if (avgVolume > 0 && currentHour.totalSent > avgVolume * this.limits.volumeSpikeThreshold) {
      this.triggerAlert({
        type: 'volume_spike',
        severity: 'warning',
        message: `현재 시간 이메일 발송량(${currentHour.totalSent})이 평균(${avgVolume.toFixed(1)})의 ${this.limits.volumeSpikeThreshold}배를 초과했습니다.`,
        threshold: avgVolume * this.limits.volumeSpikeThreshold,
        current: currentHour.totalSent,
        timestamp: new Date()
      })
    }
  }

  /**
   * 알림 발생
   */
  private triggerAlert(alert: EmailAlert): void {
    this.alertCallbacks.forEach(callback => {
      try {
        callback(alert)
      } catch (error) {
        console.error('Alert callback error:', error)
      }
    })
  }

  /**
   * 알림 콜백 등록
   */
  onAlert(callback: (alert: EmailAlert) => void): () => void {
    this.alertCallbacks.add(callback)
    return () => this.alertCallbacks.delete(callback)
  }

  /**
   * 오래된 로그 정리
   */
  cleanup(): void {
    const cutoffTime = new Date(Date.now() - this.limits.retentionHours * 60 * 60 * 1000)
    
    for (const [id, entry] of this.logs.entries()) {
      if (entry.timestamp < cutoffTime) {
        this.logs.delete(id)
      }
    }
  }

  /**
   * 전체 로그 조회 (디버깅용)
   */
  getAllLogs(): EmailLogEntry[] {
    return Array.from(this.logs.values()).sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    )
  }

  /**
   * 특정 사용자 로그 조회
   */
  getUserLogs(userHash: string): EmailLogEntry[] {
    return Array.from(this.logs.values())
      .filter(entry => entry.userHash === userHash)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  /**
   * 설정 업데이트
   */
  updateLimits(newLimits: Partial<typeof this.limits>): void {
    Object.assign(this.limits, newLimits)
  }

  /**
   * 현재 설정 조회
   */
  getLimits(): Readonly<typeof this.limits> {
    return { ...this.limits }
  }
}

// 싱글톤 인스턴스
export const emailMonitor = new EmailMonitor()

// 정기적 정리 작업 (5분마다)
setInterval(() => {
  emailMonitor.cleanup()
  emailMonitor.checkAlerts()
}, 5 * 60 * 1000)