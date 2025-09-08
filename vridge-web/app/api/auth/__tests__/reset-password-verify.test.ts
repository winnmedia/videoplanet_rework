/**
 * @fileoverview 비밀번호 재설정 검증 API 엔드포인트 테스트
 * @description TDD Red 단계 - 실패하는 테스트 먼저 작성
 * @layer app/api/auth/__tests__
 * @author Claude (AI Assistant)
 */

import { NextRequest } from 'next/server'
import { vi, describe, it, expect, beforeEach } from 'vitest'

import { POST } from '../reset-password/verify/route'

// Mock 설정
vi.mock('@/shared/lib/db/mock-db', () => ({
  verifyPasswordResetToken: vi.fn(),
  markPasswordResetTokenAsUsed: vi.fn(),
  updateUserPassword: vi.fn(),
  hashPassword: vi.fn(),
  resetDatabase: vi.fn(),
}))

describe('/api/auth/reset-password/verify - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('성공 케이스', () => {
    it('유효한 토큰과 새 비밀번호로 재설정에 성공해야 한다', async () => {
      // Mock 함수들을 import하고 설정
      const { verifyPasswordResetToken, markPasswordResetTokenAsUsed, updateUserPassword, hashPassword } = await import(
        '@/shared/lib/db/mock-db'
      )

      vi.mocked(verifyPasswordResetToken).mockReturnValue({
        valid: true,
        email: 'test@example.com',
      })
      vi.mocked(hashPassword).mockResolvedValue('newHashedPassword123')
      vi.mocked(updateUserPassword).mockResolvedValue(true)
      vi.mocked(markPasswordResetTokenAsUsed).mockReturnValue(true)

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_reset_token_123',
          newPassword: 'NewPassword123!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('비밀번호가 성공적으로 변경되었습니다.')
      expect(verifyPasswordResetToken).toHaveBeenCalledWith('valid_reset_token_123')
      expect(hashPassword).toHaveBeenCalledWith('NewPassword123!')
      expect(updateUserPassword).toHaveBeenCalledWith('test@example.com', 'newHashedPassword123')
      expect(markPasswordResetTokenAsUsed).toHaveBeenCalledWith('valid_reset_token_123')
    })
  })

  describe('입력 검증 실패 케이스', () => {
    it('토큰이 없으면 400 에러를 반환해야 한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/verify', {
        method: 'POST',
        body: JSON.stringify({
          newPassword: 'NewPassword123!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('토큰이 필요합니다')
    })

    it('새 비밀번호가 없으면 400 에러를 반환해야 한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_reset_token_123',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('새 비밀번호를 입력해주세요')
    })

    it('약한 비밀번호면 400 에러를 반환해야 한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_reset_token_123',
          newPassword: 'weakpass',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다')
    })
  })

  describe('토큰 검증 실패 케이스', () => {
    it('유효하지 않은 토큰이면 400 에러를 반환해야 한다', async () => {
      const { verifyPasswordResetToken } = await import('@/shared/lib/db/mock-db')

      vi.mocked(verifyPasswordResetToken).mockReturnValue({
        valid: false,
      })

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: 'invalid_token',
          newPassword: 'NewPassword123!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('유효하지 않거나 만료된 토큰입니다.')
    })

    it('만료된 토큰이면 400 에러를 반환해야 한다', async () => {
      const { verifyPasswordResetToken } = await import('@/shared/lib/db/mock-db')

      vi.mocked(verifyPasswordResetToken).mockReturnValue({
        valid: false,
      })

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: 'expired_token',
          newPassword: 'NewPassword123!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('유효하지 않거나 만료된 토큰입니다.')
    })
  })

  describe('비밀번호 업데이트 실패 케이스', () => {
    it('비밀번호 업데이트에 실패하면 500 에러를 반환해야 한다', async () => {
      const { verifyPasswordResetToken, hashPassword, updateUserPassword } = await import('@/shared/lib/db/mock-db')

      vi.mocked(verifyPasswordResetToken).mockReturnValue({
        valid: true,
        email: 'test@example.com',
      })
      vi.mocked(hashPassword).mockResolvedValue('newHashedPassword123')
      vi.mocked(updateUserPassword).mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/verify', {
        method: 'POST',
        body: JSON.stringify({
          token: 'valid_reset_token_123',
          newPassword: 'NewPassword123!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('비밀번호 변경 중 오류가 발생했습니다.')
    })
  })
})
