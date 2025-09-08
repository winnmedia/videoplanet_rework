/**
 * @fileoverview 회원가입 API 엔드포인트 테스트
 * @description TDD Red 단계 - 실패하는 테스트 먼저 작성
 * @layer app/api/auth/__tests__
 * @author Claude (AI Assistant)
 */

import { NextRequest } from 'next/server'
import { vi, describe, it, expect, beforeEach } from 'vitest'

import { API_ERROR_CODES } from '@/shared/lib/api-response'

import { POST } from '../signup/route'

// Mock 설정
vi.mock('@/shared/lib/db/mock-db', () => ({
  findUserByEmail: vi.fn(),
  createUser: vi.fn(),
  hashPassword: vi.fn(),
}))

vi.mock('@/lib/email/simple-sendgrid', () => ({
  sendVerificationEmail: vi.fn(),
}))

describe('/api/auth/signup - POST', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('성공 케이스', () => {
    it('올바른 정보로 회원가입에 성공해야 한다', async () => {
      const { findUserByEmail, createUser, hashPassword } = await import('@/shared/lib/db/mock-db')
      const { sendVerificationEmail } = await import('@/lib/email/simple-sendgrid')

      vi.mocked(findUserByEmail).mockResolvedValue(null) // 기존 사용자 없음
      vi.mocked(hashPassword).mockResolvedValue('hashedPassword123')
      vi.mocked(createUser).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'newuser@example.com',
        name: 'New User',
        role: 'user',
        isEmailVerified: false,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })
      vi.mocked(sendVerificationEmail).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'newuser@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          name: '새로운 사용자',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('user')
      expect(data.data).toHaveProperty('message')
      expect(data.data.user.email).toBe('newuser@example.com')
      expect(data.data.user).not.toHaveProperty('password')
      expect(data.data.message).toContain('인증 이메일')
    })
  })

  describe('입력 검증 실패 케이스', () => {
    it('이메일이 없으면 400 에러를 반환해야 한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          password: 'Password123!',
          confirmPassword: 'Password123!',
          name: 'Test User',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(API_ERROR_CODES.VALIDATION_FAILED)
    })

    it('비밀번호 확인이 일치하지 않으면 400 에러를 반환해야 한다', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'Password123!',
          confirmPassword: 'DifferentPassword123!',
          name: 'Test User',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(API_ERROR_CODES.VALIDATION_FAILED)
    })
  })

  describe('비즈니스 로직 실패 케이스', () => {
    it('이미 존재하는 이메일이면 409 에러를 반환해야 한다', async () => {
      const { findUserByEmail } = await import('@/shared/lib/db/mock-db')
      vi.mocked(findUserByEmail).mockResolvedValue({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'existing@example.com',
        name: 'Existing User',
        role: 'user',
        isEmailVerified: true,
        password: 'hashedPassword123',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      })

      const request = new NextRequest('http://localhost:3000/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({
          email: 'existing@example.com',
          password: 'Password123!',
          confirmPassword: 'Password123!',
          name: 'Test User',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.success).toBe(false)
      expect(data.error.code).toBe(API_ERROR_CODES.RESOURCE_ALREADY_EXISTS)
    })
  })
})
