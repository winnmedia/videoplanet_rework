/**
 * 이메일 모니터링 시스템 테스트
 * TDD: Red → Green → Refactor
 */

import { EmailMonitor, EmailLogEntry, EmailType, EmailStatus } from '../email-monitoring'
import { MockDate } from '../../__test__/test-utils'
import { vi } from 'vitest'

describe('EmailMonitor', () => {
  let emailMonitor: EmailMonitor
  let mockDate: MockDate

  beforeEach(() => {
    emailMonitor = new EmailMonitor()
    mockDate = new MockDate('2024-01-01T00:00:00Z')
  })

  afterEach(() => {
    mockDate.restore()
  })

  describe('이메일 발송 로깅', () => {
    it('성공적인 이메일 발송을 로깅해야 한다', () => {
      // Given
      const logEntry: Omit<EmailLogEntry, 'timestamp' | 'id'> = {
        type: 'verification',
        status: 'success',
        userHash: 'user123hash',
        metadata: {
          provider: 'sendgrid',
          messageId: 'msg123'
        }
      }

      // When
      const result = emailMonitor.logEmail(logEntry)

      // Then
      expect(result.id).toBeDefined()
      expect(result.timestamp).toEqual(new Date('2024-01-01T00:00:00Z'))
      expect(result.type).toBe('verification')
      expect(result.status).toBe('success')
      expect(result.userHash).toBe('user123hash')
      expect(result.errorMessage).toBeUndefined()
    })

    it('실패한 이메일 발송을 로깅해야 한다', () => {
      // Given
      const logEntry: Omit<EmailLogEntry, 'timestamp' | 'id'> = {
        type: 'reset',
        status: 'failed',
        userHash: 'user456hash',
        errorMessage: 'Invalid email address',
        metadata: {
          provider: 'sendgrid',
          attemptCount: 1
        }
      }

      // When
      const result = emailMonitor.logEmail(logEntry)

      // Then
      expect(result.status).toBe('failed')
      expect(result.errorMessage).toBe('Invalid email address')
      expect(result.metadata?.attemptCount).toBe(1)
    })

    it('PII 데이터가 로깅되지 않아야 한다', () => {
      // Given
      const logEntry: Omit<EmailLogEntry, 'timestamp' | 'id'> = {
        type: 'invite',
        status: 'success',
        userHash: 'user789hash',
        metadata: {
          provider: 'sendgrid',
          // PII가 포함되어서는 안됨
          recipient: 'user@example.com' // 이것은 제외되어야 함
        }
      }

      // When
      const result = emailMonitor.logEmail(logEntry)

      // Then
      expect(result.metadata?.recipient).toBeUndefined()
    })
  })

  describe('발송량 모니터링', () => {
    it('시간별 발송량을 추적해야 한다', () => {
      // Given
      emailMonitor.logEmail({
        type: 'verification',
        status: 'success',
        userHash: 'user1'
      })
      
      mockDate.advance(30 * 60 * 1000) // 30분 후
      
      emailMonitor.logEmail({
        type: 'verification',
        status: 'success',
        userHash: 'user2'
      })

      // When
      const hourlyStats = emailMonitor.getHourlyStats()

      // Then
      expect(hourlyStats.totalSent).toBe(2)
      expect(hourlyStats.successRate).toBe(1.0)
    })

    it('사용자별 발송 제한을 확인해야 한다', () => {
      // Given
      const userHash = 'user123hash'
      
      // 제한까지 이메일 발송 (maxEmailsPerUserPerHour = 5)
      for (let i = 0; i < 5; i++) {
        emailMonitor.logEmail({
          type: 'verification',
          status: 'success',
          userHash
        })
      }

      // When & Then
      expect(emailMonitor.canSendToUser(userHash, 'verification')).toBe(false) // 제한 초과
      
      // 1시간 후
      mockDate.advance(61 * 60 * 1000)
      expect(emailMonitor.canSendToUser(userHash, 'verification')).toBe(true) // 발송 가능
    })

    it('타입별 발송량 제한을 확인해야 한다', () => {
      // Given
      const maxPerHour = 1000 // limits.maxEmailsPerTypePerHour
      
      // 최대량만큼 발송
      for (let i = 0; i < maxPerHour; i++) {
        emailMonitor.logEmail({
          type: 'verification',
          status: 'success',
          userHash: `user${i}`
        })
      }

      // When & Then
      expect(emailMonitor.canSendType('verification')).toBe(false) // 시간당 제한 초과
      
      // 1시간 후
      mockDate.advance(61 * 60 * 1000)
      expect(emailMonitor.canSendType('verification')).toBe(true) // 발송 가능
    })
  })

  describe('에러 분석', () => {
    beforeEach(() => {
      // 다양한 에러 로그 생성
      emailMonitor.logEmail({
        type: 'verification',
        status: 'failed',
        userHash: 'user1',
        errorMessage: 'Invalid email address'
      })
      
      emailMonitor.logEmail({
        type: 'verification',
        status: 'failed',
        userHash: 'user2',
        errorMessage: 'Rate limit exceeded'
      })
      
      emailMonitor.logEmail({
        type: 'reset',
        status: 'failed',
        userHash: 'user3',
        errorMessage: 'Invalid email address'
      })
      
      emailMonitor.logEmail({
        type: 'verification',
        status: 'success',
        userHash: 'user4'
      })
    })

    it('에러 통계를 생성해야 한다', () => {
      // When
      const errorStats = emailMonitor.getErrorStats()

      // Then
      expect(errorStats.totalErrors).toBe(3)
      expect(errorStats.errorsByType).toEqual({
        'verification': 2,
        'reset': 1
      })
      expect(errorStats.errorsByMessage).toEqual({
        'Invalid email address': 2,
        'Rate limit exceeded': 1
      })
    })

    it('성공률을 계산해야 한다', () => {
      // When
      const stats = emailMonitor.getOverallStats()

      // Then
      expect(stats.totalSent).toBe(4)
      expect(stats.successCount).toBe(1)
      expect(stats.failureCount).toBe(3)
      expect(stats.successRate).toBe(0.25) // 25%
    })
  })

  describe('메모리 관리', () => {
    it('오래된 로그를 정리해야 한다', () => {
      // Given
      emailMonitor.logEmail({
        type: 'verification',
        status: 'success',
        userHash: 'user1'
      })

      // 25시간 후 (기본 보관 기간: 24시간)
      mockDate.advance(25 * 60 * 60 * 1000)

      // When
      emailMonitor.cleanup()

      // Then
      const stats = emailMonitor.getOverallStats()
      expect(stats.totalSent).toBe(0) // 로그가 정리되었어야 함
    })

    it('최대 메모리 제한을 준수해야 한다', () => {
      // Given
      const maxEntries = 10000
      
      // 최대량보다 많이 로깅
      for (let i = 0; i < maxEntries + 100; i++) {
        emailMonitor.logEmail({
          type: 'verification',
          status: 'success',
          userHash: `user${i}`
        })
      }

      // When
      const stats = emailMonitor.getOverallStats()

      // Then
      expect(stats.totalSent).toBeLessThanOrEqual(maxEntries)
    })
  })

  describe('알림 시스템', () => {
    it('에러율 임계치 초과 시 알림을 발생시켜야 한다', () => {
      // Given
      const alertCallback = vi.fn()
      emailMonitor.onAlert(alertCallback)

      // 에러율 80% 이상으로 만들기
      for (let i = 0; i < 10; i++) {
        emailMonitor.logEmail({
          type: 'verification',
          status: 'failed',
          userHash: `user${i}`,
          errorMessage: 'Test error'
        })
      }

      for (let i = 0; i < 2; i++) {
        emailMonitor.logEmail({
          type: 'verification',
          status: 'success',
          userHash: `success${i}`
        })
      }

      // When
      emailMonitor.checkAlerts()

      // Then
      expect(alertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'high_error_rate',
          severity: 'critical',
          threshold: 0.5,
          current: expect.any(Number)
        })
      )
    })

    it('발송량 급증 시 알림을 발생시켜야 한다', () => {
      // Given
      const alertCallback = vi.fn()
      emailMonitor.onAlert(alertCallback)

      // 평상시 발송량 설정
      for (let hour = 0; hour < 24; hour++) {
        mockDate.setTime(new Date(2024, 0, 1, hour).getTime())
        for (let i = 0; i < 10; i++) {
          emailMonitor.logEmail({
            type: 'verification',
            status: 'success',
            userHash: `user${hour}_${i}`
          })
        }
      }

      // 급증 상황 시뮬레이션
      mockDate.setTime(new Date(2024, 0, 2, 0).getTime())
      for (let i = 0; i < 100; i++) { // 평상시의 10배
        emailMonitor.logEmail({
          type: 'verification',
          status: 'success',
          userHash: `spike_user${i}`
        })
      }

      // When
      emailMonitor.checkAlerts()

      // Then
      expect(alertCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'volume_spike',
          severity: 'warning'
        })
      )
    })
  })
})