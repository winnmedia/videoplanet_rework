import { EmailData, EmailResult, sendGridService } from './sendgrid'

interface QueueItem {
  id: string
  email: EmailData
  attempts: number
  lastAttempt?: Date
  priority: 'high' | 'normal' | 'low'
  createdAt: Date
  scheduledFor?: Date
}

interface RateLimitConfig {
  maxPerMinute: number
  maxPerHour: number
  maxPerDay: number
}

class EmailQueue {
  private queue: QueueItem[] = []
  private processing = false
  private sentCount = {
    minute: 0,
    hour: 0,
    day: 0,
  }
  private lastReset = {
    minute: Date.now(),
    hour: Date.now(),
    day: Date.now(),
  }
  
  private readonly MAX_RETRIES = 3
  private readonly RETRY_DELAY = 5000 // 5초
  
  private readonly rateLimits: RateLimitConfig = {
    maxPerMinute: 10,
    maxPerHour: 100,
    maxPerDay: 1000,
  }

  /**
   * 이메일을 큐에 추가
   */
  async add(
    email: EmailData,
    options: {
      priority?: 'high' | 'normal' | 'low'
      scheduledFor?: Date
    } = {}
  ): Promise<string> {
    const item: QueueItem = {
      id: this.generateId(),
      email,
      attempts: 0,
      priority: options.priority || 'normal',
      createdAt: new Date(),
      scheduledFor: options.scheduledFor,
    }

    // 우선순위에 따라 큐 위치 결정
    if (item.priority === 'high') {
      // 높은 우선순위는 앞쪽에 추가
      const normalIndex = this.queue.findIndex(i => i.priority !== 'high')
      if (normalIndex === -1) {
        this.queue.push(item)
      } else {
        this.queue.splice(normalIndex, 0, item)
      }
    } else if (item.priority === 'low') {
      // 낮은 우선순위는 뒤쪽에 추가
      this.queue.push(item)
    } else {
      // 일반 우선순위는 low 앞에 추가
      const lowIndex = this.queue.findIndex(i => i.priority === 'low')
      if (lowIndex === -1) {
        this.queue.push(item)
      } else {
        this.queue.splice(lowIndex, 0, item)
      }
    }

    // 처리 시작
    if (!this.processing) {
      this.startProcessing()
    }

    return item.id
  }

  /**
   * 큐 처리 시작
   */
  private async startProcessing(): Promise<void> {
    if (this.processing) return
    
    this.processing = true

    while (this.queue.length > 0) {
      this.resetRateLimitCounters()

      // Rate limiting 확인
      if (!this.canSend()) {
        // Rate limit에 도달했으면 잠시 대기
        await this.delay(1000) // 1초 대기
        continue
      }

      // 예약된 이메일 확인
      const now = new Date()
      const item = this.queue.find(
        i => !i.scheduledFor || i.scheduledFor <= now
      )

      if (!item) {
        // 모든 이메일이 미래에 예약됨
        await this.delay(10000) // 10초 대기
        continue
      }

      // 큐에서 제거
      const index = this.queue.indexOf(item)
      this.queue.splice(index, 1)

      // 이메일 전송 시도
      await this.processItem(item)
    }

    this.processing = false
  }

  /**
   * 개별 이메일 처리
   */
  private async processItem(item: QueueItem): Promise<void> {
    try {
      item.attempts++
      item.lastAttempt = new Date()

      const result = await sendGridService.sendEmail(item.email)

      if (result.success) {
        this.incrementSentCount()
        console.log(`✅ Email sent successfully: ${item.id}`)
      } else {
        throw new Error(result.error || 'Failed to send email')
      }
    } catch (error) {
      console.error(`❌ Failed to send email ${item.id}:`, error)

      // 재시도 로직
      if (item.attempts < this.MAX_RETRIES) {
        console.log(`🔄 Retrying email ${item.id} (attempt ${item.attempts}/${this.MAX_RETRIES})`)
        
        // 재시도 지연 (지수 백오프)
        await this.delay(this.RETRY_DELAY * Math.pow(2, item.attempts - 1))
        
        // 큐에 다시 추가
        this.queue.unshift(item)
      } else {
        console.error(`❌ Email ${item.id} failed after ${this.MAX_RETRIES} attempts`)
        // 실패한 이메일 로깅 또는 데드레터 큐로 이동
        this.handleFailedEmail(item)
      }
    }
  }

  /**
   * Rate limiting 확인
   */
  private canSend(): boolean {
    return (
      this.sentCount.minute < this.rateLimits.maxPerMinute &&
      this.sentCount.hour < this.rateLimits.maxPerHour &&
      this.sentCount.day < this.rateLimits.maxPerDay
    )
  }

  /**
   * 전송 카운트 증가
   */
  private incrementSentCount(): void {
    this.sentCount.minute++
    this.sentCount.hour++
    this.sentCount.day++
  }

  /**
   * Rate limit 카운터 리셋
   */
  private resetRateLimitCounters(): void {
    const now = Date.now()

    // 분 카운터 리셋
    if (now - this.lastReset.minute >= 60000) {
      this.sentCount.minute = 0
      this.lastReset.minute = now
    }

    // 시간 카운터 리셋
    if (now - this.lastReset.hour >= 3600000) {
      this.sentCount.hour = 0
      this.lastReset.hour = now
    }

    // 일 카운터 리셋
    if (now - this.lastReset.day >= 86400000) {
      this.sentCount.day = 0
      this.lastReset.day = now
    }
  }

  /**
   * 실패한 이메일 처리
   */
  private handleFailedEmail(item: QueueItem): void {
    // 여기에 실패한 이메일을 데이터베이스에 저장하거나
    // 관리자에게 알림을 보내는 로직 추가
    console.error('Dead letter queue:', {
      id: item.id,
      to: item.email.to,
      subject: item.email.subject,
      attempts: item.attempts,
      lastAttempt: item.lastAttempt,
    })
  }

  /**
   * 지연 유틸리티
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * ID 생성
   */
  private generateId(): string {
    return `email-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  }

  /**
   * 큐 상태 조회
   */
  getStatus(): {
    pending: number
    processing: boolean
    rateLimits: RateLimitConfig
    sentCount: typeof this.sentCount
  } {
    return {
      pending: this.queue.length,
      processing: this.processing,
      rateLimits: this.rateLimits,
      sentCount: { ...this.sentCount },
    }
  }

  /**
   * 특정 이메일 취소
   */
  cancel(id: string): boolean {
    const index = this.queue.findIndex(item => item.id === id)
    if (index !== -1) {
      this.queue.splice(index, 1)
      return true
    }
    return false
  }

  /**
   * Rate limit 설정 업데이트
   */
  updateRateLimits(limits: Partial<RateLimitConfig>): void {
    Object.assign(this.rateLimits, limits)
  }
}

// 싱글톤 인스턴스
export const emailQueue = new EmailQueue()