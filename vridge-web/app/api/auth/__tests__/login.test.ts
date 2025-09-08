/**
 * @fileoverview 로그인 API 엔드포인트 테스트
 * @description TDD Red 단계 - 실패하는 테스트 먼저 작성
 * @layer app/api/auth/__tests__
 * @author Claude (AI Assistant)
 */

import { NextRequest } from 'next/server'
import { vi, describe, it, expect, beforeEach } from 'vitest'

import { API_ERROR_CODES } from '@/shared/lib/api-response'

import { POST } from '../login/route'

// Mock 설정
vi.mock('@/shared/lib/db/mock-db', () => ({
  findUserByEmail: vi.fn(),
  verifyPassword: vi.fn(),
}))

describe('/api/auth/login - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('성공 케이스', () => {
    it('올바른 자격 증명으로 로그인에 성공해야 한다', async () => {
      // Mock 함수들을 import하고 설정
      const { findUserByEmail, verifyPassword } = await import('@/shared/lib/db/mock-db')

      vi.mocked(findUserByEmail).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        isEmailVerified: true,
        password: 'hashedPassword123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })
      vi.mocked(verifyPassword).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Password123!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('user')
      expect(data.data).toHaveProperty('token')
      expect(data.data).toHaveProperty('refreshToken')
      expect(data.data.user.email).toBe('test@example.com')
      expect(data.data.user).not.toHaveProperty('password')
    })
  })

  describe('입력 검증 실패 케이스', () => {
    it('이메일이 없으면 400 에러를 반환해야 한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          password: 'Password123!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(API_ERROR_CODES.VALIDATION_FAILED)
    })

    it('비밀번호가 없으면 400 에러를 반환해야 한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(API_ERROR_CODES.VALIDATION_FAILED)
    })
  })

  describe('인증 실패 케이스', () => {
    it('존재하지 않는 사용자면 401 에러를 반환해야 한다', async () => {
      const { findUserByEmail } = await import('@/shared/lib/db/mock-db')
      vi.mocked(findUserByEmail).mockResolvedValue(null)

      const request = new NextRequest('http://localhost:3000/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(API_ERROR_CODES.AUTH_INVALID_CREDENTIALS)
    })
  })
})
