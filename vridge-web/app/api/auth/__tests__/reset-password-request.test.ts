/**
 * @fileoverview 비밀번호 재설정 요청 API 엔드포인트 테스트
 * @description TDD Red 단계 - 실패하는 테스트 먼저 작성
 * @layer app/api/auth/__tests__
 * @author Claude (AI Assistant)
 */

import { NextRequest } from 'next/server'
import { vi, describe, it, expect, beforeEach } from 'vitest'

import { POST } from '../reset-password/request/route'

// Mock 설정
vi.mock('@/shared/lib/db/mock-db', () => ({
  findUserByEmail: vi.fn(),
  createPasswordResetToken: vi.fn(),
  resetDatabase: vi.fn(),
}))

vi.mock('@/lib/email/simple-sendgrid', () => ({
  sendPasswordResetEmail: vi.fn(),
}))

describe('/api/auth/reset-password/request - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('성공 케이스', () => {
    it('유효한 이메일로 비밀번호 재설정 요청에 성공해야 한다', async () => {
      // Mock 함수들을 import하고 설정
      const { findUserByEmail, createPasswordResetToken } = await import('@/shared/lib/db/mock-db')
      const { sendPasswordResetEmail } = await import('@/lib/email/simple-sendgrid')

      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        isEmailVerified: true,
        password: 'hashedPassword123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })
      vi.mocked(createPasswordResetToken).mockReturnValue('reset_token_123')
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/request', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('비밀번호 재설정 링크를 이메일로 전송했습니다.')
      expect(findUserByEmail).toHaveBeenCalledWith('test@example.com')
      expect(createPasswordResetToken).toHaveBeenCalledWith('test@example.com')
      expect(sendPasswordResetEmail).toHaveBeenCalledWith('test@example.com', 'reset_token_123')
    })

    it('존재하지 않는 이메일이라도 보안상 성공 응답을 반환해야 한다', async () => {
      const { findUserByEmail } = await import('@/shared/lib/db/mock-db')
      vi.mocked(findUserByEmail).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/request', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('비밀번호 재설정 링크를 이메일로 전송했습니다.')
    })
  })

  describe('입력 검증 실패 케이스', () => {
    it('이메일이 없으면 400 에러를 반환해야 한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/request', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('이메일을 입력해주세요')
    })

    it('잘못된 이메일 형식이면 400 에러를 반환해야 한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/request', {
        method: 'POST',
        body: JSON.stringify({
          email: 'invalid-email',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toContain('올바른 이메일 형식을 입력해주세요')
    })
  })

  describe('이메일 전송 실패 케이스', () => {
    it('이메일 전송에 실패해도 보안상 성공 응답을 반환해야 한다', async () => {
      const { findUserByEmail, createPasswordResetToken } = await import('@/shared/lib/db/mock-db')
      const { sendPasswordResetEmail } = await import('@/lib/email/simple-sendgrid')

      vi.mocked(findUserByEmail).mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        isEmailVerified: true,
        password: 'hashedPassword123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })
      vi.mocked(createPasswordResetToken).mockReturnValue('reset_token_123')
      vi.mocked(sendPasswordResetEmail).mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/auth/reset-password/request', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('비밀번호 재설정 링크를 이메일로 전송했습니다.')
    })
  })
})
