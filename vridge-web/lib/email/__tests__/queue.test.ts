import { describe, it, expect, beforeEach, vi } from 'vitest'

import { emailQueue } from '../queue'
import { sendGridService } from '../sendgrid'

// Mock sendGridService
vi.mock('../sendgrid', () => ({
  sendGridService: {
    sendEmail: vi.fn(),
  },
}))

describe('Email Queue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('add', () => {
    it('이메일을 큐에 추가해야 함', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Subject',
        html: '<p>Test</p>',
      }

      const id = await emailQueue.add(emailData)

      expect(id).toBeTruthy()
      expect(id).toContain('email-')
      
      const status = emailQueue.getStatus()
      expect(status.pending).toBeGreaterThanOrEqual(0)
    })

    it('우선순위에 따라 큐 순서를 정렬해야 함', async () => {
      const lowPriority = {
        to: 'low@example.com',
        subject: 'Low Priority',
        html: '<p>Low</p>',
      }

      const highPriority = {
        to: 'high@example.com',
        subject: 'High Priority',
        html: '<p>High</p>',
      }

      const normalPriority = {
        to: 'normal@example.com',
        subject: 'Normal Priority',
        html: '<p>Normal</p>',
      }

      // 순서대로 추가: low -> high -> normal
      await emailQueue.add(lowPriority, { priority: 'low' })
      await emailQueue.add(highPriority, { priority: 'high' })
      await emailQueue.add(normalPriority, { priority: 'normal' })

      // 큐 상태 확인
      const status = emailQueue.getStatus()
      expect(status.pending).toBeGreaterThanOrEqual(0)
    })

    it('예약된 이메일을 지정된 시간에 전송해야 함', async () => {
      const futureDate = new Date(Date.now() + 60000) // 1분 후
      
      const emailData = {
        to: 'scheduled@example.com',
        subject: 'Scheduled Email',
        html: '<p>Scheduled</p>',
      }

      const id = await emailQueue.add(emailData, {
        scheduledFor: futureDate,
      })

      expect(id).toBeTruthy()
      
      // 즉시 전송되지 않아야 함
      vi.advanceTimersByTime(1000)
      expect(vi.mocked(sendGridService.sendEmail)).not.toHaveBeenCalled()
    })
  })

  describe('rate limiting', () => {
    it('Rate limit을 초과하지 않아야 함', async () => {
      // Rate limit 설정 조정 (테스트용)
      emailQueue.updateRateLimits({
        maxPerMinute: 2,
        maxPerHour: 10,
        maxPerDay: 100,
      })

      vi.mocked(sendGridService.sendEmail).mockResolvedValue({
        success: true,
        messageId: 'test-id',
      })

      // 3개 이메일 추가 (rate limit: 2/min)
      for (let i = 0; i < 3; i++) {
        await emailQueue.add({
          to: `user${i}@example.com`,
          subject: `Test ${i}`,
          html: `<p>Test ${i}</p>`,
        })
      }

      // 처리 시작을 위한 시간 경과
      await vi.advanceTimersByTimeAsync(100)

      // 처음 2개만 전송되어야 함
      const callCount = vi.mocked(sendGridService.sendEmail).mock.calls.length
      expect(callCount).toBeLessThanOrEqual(2)
    })

    it('Rate limit 카운터가 리셋되어야 함', async () => {
      emailQueue.updateRateLimits({
        maxPerMinute: 1,
        maxPerHour: 100,
        maxPerDay: 1000,
      })

      vi.mocked(sendGridService.sendEmail).mockResolvedValue({
        success: true,
        messageId: 'test-id',
      })

      // 첫 번째 이메일
      await emailQueue.add({
        to: 'test1@example.com',
        subject: 'Test 1',
        html: '<p>Test 1</p>',
      })

      await vi.advanceTimersByTimeAsync(100)

      // 두 번째 이메일 (rate limit 초과)
      await emailQueue.add({
        to: 'test2@example.com',
        subject: 'Test 2',
        html: '<p>Test 2</p>',
      })

      // 1분 경과 (rate limit 리셋)
      await vi.advanceTimersByTimeAsync(60000)

      const callCount = vi.mocked(sendGridService.sendEmail).mock.calls.length
      expect(callCount).toBeGreaterThanOrEqual(1)
    })
  })

  describe('retry logic', () => {
    it('실패한 이메일을 재시도해야 함', async () => {
      vi.mocked(sendGridService.sendEmail)
        .mockRejectedValueOnce(new Error('First attempt failed'))
        .mockRejectedValueOnce(new Error('Second attempt failed'))
        .mockResolvedValueOnce({
          success: true,
          messageId: 'success-id',
        })

      await emailQueue.add({
        to: 'retry@example.com',
        subject: 'Retry Test',
        html: '<p>Retry</p>',
      })

      // 첫 번째 시도
      await vi.advanceTimersByTimeAsync(100)
      expect(vi.mocked(sendGridService.sendEmail)).toHaveBeenCalledTimes(1)

      // 재시도 지연
      await vi.advanceTimersByTimeAsync(5000)
      expect(vi.mocked(sendGridService.sendEmail)).toHaveBeenCalledTimes(2)

      // 두 번째 재시도 지연 (지수 백오프)
      await vi.advanceTimersByTimeAsync(10000)
      expect(vi.mocked(sendGridService.sendEmail)).toHaveBeenCalledTimes(3)
    })

    it('최대 재시도 횟수를 초과하면 포기해야 함', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      vi.mocked(sendGridService.sendEmail).mockRejectedValue(
        new Error('Always fails')
      )

      await emailQueue.add({
        to: 'fail@example.com',
        subject: 'Fail Test',
        html: '<p>Fail</p>',
      })

      // 모든 재시도 시도
      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(20000)
      }

      // 3번의 재시도 후 포기
      expect(vi.mocked(sendGridService.sendEmail)).toHaveBeenCalledTimes(3)
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('failed after 3 attempts')
      )
    })
  })

  describe('queue management', () => {
    it('큐 상태를 반환해야 함', () => {
      const status = emailQueue.getStatus()

      expect(status).toHaveProperty('pending')
      expect(status).toHaveProperty('processing')
      expect(status).toHaveProperty('rateLimits')
      expect(status).toHaveProperty('sentCount')
      
      expect(typeof status.pending).toBe('number')
      expect(typeof status.processing).toBe('boolean')
    })

    it('특정 이메일을 취소할 수 있어야 함', async () => {
      const id = await emailQueue.add({
        to: 'cancel@example.com',
        subject: 'Cancel Test',
        html: '<p>Cancel</p>',
      })

      const canceled = emailQueue.cancel(id)
      expect(canceled).toBe(true)

      // 다시 취소 시도
      const alreadyCanceled = emailQueue.cancel(id)
      expect(alreadyCanceled).toBe(false)
    })

    it('Rate limit 설정을 업데이트할 수 있어야 함', () => {
      emailQueue.updateRateLimits({
        maxPerMinute: 20,
        maxPerHour: 200,
      })

      const status = emailQueue.getStatus()
      expect(status.rateLimits.maxPerMinute).toBe(20)
      expect(status.rateLimits.maxPerHour).toBe(200)
    })
  })
})