import { emailMonitor, EmailType } from './email-monitoring'
import { createHash } from 'crypto'

// 단순 메모리 기반 쿨다운 시스템 (모니터링 통합)
export class SimpleCooldown {
  private cooldowns = new Map<string, number>()
  private readonly cooldownMs: number

  constructor(cooldownSeconds = 60) {
    this.cooldownMs = cooldownSeconds * 1000
  }

  /**
   * 쿨다운 확인 및 설정 (모니터링 통합)
   * @param key - 쿨다운 키 (예: 이메일 주소)
   * @param emailType - 이메일 타입 (모니터링용)
   * @returns true if allowed, false if in cooldown
   */
  check(key: string, emailType?: EmailType): boolean {
    const now = Date.now()
    const lastSent = this.cooldowns.get(key)

    // 모니터링 시스템과 연동된 추가 검증
    if (emailType) {
      const userHash = this.hashKey(key)
      
      // 모니터링 시스템의 사용자별 제한 확인
      if (!emailMonitor.canSendToUser(userHash, emailType)) {
        return false
      }
      
      // 타입별 전역 제한 확인
      if (!emailMonitor.canSendType(emailType)) {
        return false
      }
    }

    if (lastSent && (now - lastSent) < this.cooldownMs) {
      return false // 쿨다운 중
    }

    this.cooldowns.set(key, now)
    return true // 전송 허용
  }

  /**
   * 키를 안전한 해시로 변환 (PII 보호)
   */
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex').substring(0, 16)
  }

  /**
   * 남은 쿨다운 시간 (초)
   */
  getRemainingSeconds(key: string): number {
    const now = Date.now()
    const lastSent = this.cooldowns.get(key)

    if (!lastSent) return 0

    const elapsed = now - lastSent
    const remaining = this.cooldownMs - elapsed

    return remaining > 0 ? Math.ceil(remaining / 1000) : 0
  }

  /**
   * 메모리 정리 (1시간 이상 된 엔트리 삭제)
   */
  cleanup(): void {
    const now = Date.now()
    const oneHour = 60 * 60 * 1000

    for (const [key, timestamp] of this.cooldowns.entries()) {
      if (now - timestamp > oneHour) {
        this.cooldowns.delete(key)
      }
    }
  }
}

// 싱글톤 인스턴스 (60초 쿨다운)
export const emailCooldown = new SimpleCooldown(60)

// 정기적으로 메모리 정리 (5분마다)
setInterval(() => {
  emailCooldown.cleanup()
}, 5 * 60 * 1000)