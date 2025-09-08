/**
 * @fileoverview SendGrid 환경 변수 검증 테스트 (단위 테스트 - Node 환경)
 * @description 환경 변수 누락, 잘못된 형식 등을 테스트
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { z } from 'zod'

// 환경 변수 검증 스키마 (직접 정의)
const sendGridEnvSchema = z.object({
  SENDGRID_API_KEY: z.string().min(1, 'SENDGRID_API_KEY는 필수입니다'),
  SENDGRID_FROM_EMAIL: z.string().email('SENDGRID_FROM_EMAIL는 유효한 이메일이어야 합니다'),
  SENDGRID_VERIFIED_SENDER: z.string().email().optional(),
})

type SendGridEnvVars = z.infer<typeof sendGridEnvSchema>

// SendGrid 환경 변수 검증 함수
function validateSendGridEnv(env: Record<string, string | undefined>): {
  success: boolean
  data?: SendGridEnvVars
  error?: z.ZodError
} {
  const result = sendGridEnvSchema.safeParse(env)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

describe('SendGrid 환경 변수 검증', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    // 깨끗한 환경으로 시작
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('필수 환경 변수 검증', () => {
    it('SENDGRID_API_KEY가 누락되면 검증에 실패해야 함', () => {
      const env = {
        SENDGRID_FROM_EMAIL: 'test@example.com',
      }

      const result = validateSendGridEnv(env)

      expect(result.success).toBe(false)
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['SENDGRID_API_KEY'],
            message: 'SENDGRID_API_KEY는 필수입니다',
          }),
        ])
      )
    })

    it('SENDGRID_FROM_EMAIL이 누락되면 검증에 실패해야 함', () => {
      const env = {
        SENDGRID_API_KEY: 'SG.test-api-key',
      }

      const result = validateSendGridEnv(env)

      expect(result.success).toBe(false)
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['SENDGRID_FROM_EMAIL'],
            message: expect.stringContaining('Required'),
          }),
        ])
      )
    })

    it('SENDGRID_FROM_EMAIL이 유효하지 않은 이메일 형식이면 검증에 실패해야 함', () => {
      const env = {
        SENDGRID_API_KEY: 'SG.test-api-key',
        SENDGRID_FROM_EMAIL: 'invalid-email-format',
      }

      const result = validateSendGridEnv(env)

      expect(result.success).toBe(false)
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['SENDGRID_FROM_EMAIL'],
            message: 'SENDGRID_FROM_EMAIL는 유효한 이메일이어야 합니다',
          }),
        ])
      )
    })
  })

  describe('선택적 환경 변수 검증', () => {
    it('SENDGRID_VERIFIED_SENDER가 없어도 검증에 성공해야 함', () => {
      const env = {
        SENDGRID_API_KEY: 'SG.test-api-key',
        SENDGRID_FROM_EMAIL: 'test@example.com',
      }

      const result = validateSendGridEnv(env)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        SENDGRID_API_KEY: 'SG.test-api-key',
        SENDGRID_FROM_EMAIL: 'test@example.com',
      })
    })

    it('SENDGRID_VERIFIED_SENDER가 유효하지 않은 이메일 형식이면 검증에 실패해야 함', () => {
      const env = {
        SENDGRID_API_KEY: 'SG.test-api-key',
        SENDGRID_FROM_EMAIL: 'test@example.com',
        SENDGRID_VERIFIED_SENDER: 'invalid-sender-email',
      }

      const result = validateSendGridEnv(env)

      expect(result.success).toBe(false)
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['SENDGRID_VERIFIED_SENDER'],
            message: expect.stringContaining('Invalid email'),
          }),
        ])
      )
    })
  })

  describe('성공적인 검증 시나리오', () => {
    it('모든 필수 환경 변수가 올바르게 설정되면 검증에 성공해야 함', () => {
      const env = {
        SENDGRID_API_KEY: 'SG.test-api-key-12345',
        SENDGRID_FROM_EMAIL: 'service@videoplanet.com',
        SENDGRID_VERIFIED_SENDER: 'noreply@videoplanet.com',
      }

      const result = validateSendGridEnv(env)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        SENDGRID_API_KEY: 'SG.test-api-key-12345',
        SENDGRID_FROM_EMAIL: 'service@videoplanet.com',
        SENDGRID_VERIFIED_SENDER: 'noreply@videoplanet.com',
      })
    })

    it('빈 문자열 환경 변수는 검증에 실패해야 함', () => {
      const env = {
        SENDGRID_API_KEY: '',
        SENDGRID_FROM_EMAIL: 'test@example.com',
      }

      const result = validateSendGridEnv(env)

      expect(result.success).toBe(false)
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['SENDGRID_API_KEY'],
            message: 'SENDGRID_API_KEY는 필수입니다',
          }),
        ])
      )
    })

    it('undefined 환경 변수는 검증에 실패해야 함', () => {
      const env = {
        SENDGRID_API_KEY: undefined,
        SENDGRID_FROM_EMAIL: 'test@example.com',
      }

      const result = validateSendGridEnv(env)

      expect(result.success).toBe(false)
      expect(result.error?.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['SENDGRID_API_KEY'],
            message: expect.stringContaining('Required'),
          }),
        ])
      )
    })
  })
})