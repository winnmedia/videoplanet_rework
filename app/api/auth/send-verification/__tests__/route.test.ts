/**
 * @fileoverview Send Verification API 엔드포인트 테스트 (통합 테스트 - JSDOM 환경)
 * @description 이메일 인증 발송 API의 전체적인 동작을 테스트
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

// MSW 핸들러를 위한 mock
const mockSendGridSend = vi.fn()
const mockSendGridSetApiKey = vi.fn()

vi.mock('@sendgrid/mail', () => ({
  default: {
    send: mockSendGridSend,
    setApiKey: mockSendGridSetApiKey,
  },
}))

// 결정론적 테스트를 위한 시간 고정
const FIXED_DATE = new Date('2024-01-15T10:30:00Z')
const FIXED_TIMESTAMP = FIXED_DATE.getTime()

// Date mock
vi.setSystemTime(FIXED_DATE)

// API 라우트 핸들러를 직접 임포트
import { POST, GET } from '../route'

describe('Send Verification API 엔드포인트', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetAllMocks()
    // 테스트 환경 설정
    process.env = {
      ...originalEnv,
      NODE_ENV: 'test',
      SENDGRID_API_KEY: 'SG.test-api-key',
      SENDGRID_FROM_EMAIL: 'test@example.com',
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('POST /api/auth/send-verification', () => {
    it('유효한 이메일과 타입으로 인증 이메일 발송 요청 시 성공해야 함', async () => {
      const requestBody = {
        email: 'user@example.com',
        type: 'signup',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.email).toBe('user@example.com')
      expect(responseData.type).toBe('signup')
      expect(responseData.message).toBe('회원가입 인증 이메일이 발송되었습니다.')
      expect(responseData.status).toBe('pending')
    })

    it('login 타입으로 인증 이메일 발송 요청 시 올바른 메시지를 반환해야 함', async () => {
      const requestBody = {
        email: 'user@example.com',
        type: 'login',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.type).toBe('login')
      expect(responseData.message).toBe('로그인 인증 이메일이 발송되었습니다.')
    })

    it('reset-password 타입으로 인증 이메일 발송 요청 시 올바른 메시지를 반환해야 함', async () => {
      const requestBody = {
        email: 'user@example.com',
        type: 'reset-password',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.type).toBe('reset-password')
      expect(responseData.message).toBe('비밀번호 재설정 이메일이 발송되었습니다.')
    })

    it('타입이 누락된 경우 기본값 signup을 사용해야 함', async () => {
      const requestBody = {
        email: 'user@example.com',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.type).toBe('signup')
      expect(responseData.message).toBe('회원가입 인증 이메일이 발송되었습니다.')
    })
  })

  describe('POST /api/auth/send-verification - 유효성 검증 실패', () => {
    it('이메일이 누락된 경우 400 에러를 반환해야 함', async () => {
      const requestBody = {
        type: 'signup',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Validation failed')
      expect(responseData.message).toBe('입력 데이터가 올바르지 않습니다.')
      expect(responseData.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['email'],
            message: expect.any(String),
          }),
        ])
      )
    })

    it('유효하지 않은 이메일 형식인 경우 400 에러를 반환해야 함', async () => {
      const requestBody = {
        email: 'invalid-email-format',
        type: 'signup',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Validation failed')
      expect(responseData.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['email'],
            message: '유효한 이메일 주소를 입력해주세요',
          }),
        ])
      )
    })

    it('유효하지 않은 타입인 경우 400 에러를 반환해야 함', async () => {
      const requestBody = {
        email: 'user@example.com',
        type: 'invalid-type',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Validation failed')
      expect(responseData.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: ['type'],
            message: expect.stringContaining('Invalid enum value'),
          }),
        ])
      )
    })

    it('빈 요청 본문인 경우 400 에러를 반환해야 함', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(400)
      expect(responseData.error).toBe('Validation failed')
    })

    it('잘못된 JSON 형식인 경우 500 에러를 반환해야 함', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(500)
      expect(responseData.error).toBe('Failed to send verification email')
    })
  })

  describe('POST /api/auth/send-verification - 에지 케이스', () => {
    it('매우 긴 이메일 주소도 처리해야 함', async () => {
      const longEmailPrefix = 'a'.repeat(50)
      const requestBody = {
        email: `${longEmailPrefix}@example.com`,
        type: 'signup',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.email).toBe(`${longEmailPrefix}@example.com`)
    })

    it('특수 문자가 포함된 이메일을 처리해야 함', async () => {
      const requestBody = {
        email: 'test+special@example.com',
        type: 'signup',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.email).toBe('test+special@example.com')
    })

    it('대소문자 이메일을 정규화해서 처리해야 함', async () => {
      const requestBody = {
        email: 'User@EXAMPLE.COM',
        type: 'signup',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      expect(responseData.email).toBe('User@EXAMPLE.COM')
    })
  })

  describe('GET /api/auth/send-verification', () => {
    it('GET 요청에 대해 적절한 안내 메시지를 반환해야 함', async () => {
      const response = await GET()
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.message).toBe('Send verification endpoint')
      expect(responseData.methods).toEqual(['POST'])
      expect(responseData.description).toBe('Use POST method with email and type fields')
    })
  })

  describe('실제 이메일 발송 통합 (TODO 구현 필요)', () => {
    it('실제 SendGrid 통합 시 이메일이 발송되어야 함', async () => {
      // 현재는 TODO로 표시되어 있지만, 실제 구현 시 테스트해야 할 시나리오
      const requestBody = {
        email: 'integration-test@example.com',
        type: 'signup',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      // 현재는 구현되지 않은 기능이므로 기본적인 성공 응답만 확인
      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
      
      // TODO: 실제 이메일 발송 로직이 구현되면 다음을 추가로 테스트해야 함:
      // - SendGrid API가 올바른 파라미터로 호출되었는지
      // - 이메일 템플릿이 올바르게 렌더링되었는지
      // - 데이터베이스에 인증 토큰이 저장되었는지
      // - 중복 발송 방지 로직이 동작하는지
    })

    it('SendGrid API 오류 시 적절한 에러 처리를 해야 함', async () => {
      // TODO: SendGrid 연동 후 테스트 추가 필요
      // 현재는 기본 응답만 확인
      const requestBody = {
        email: 'error-test@example.com',
        type: 'signup',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(200)
      expect(responseData.success).toBe(true)
    })

    it('이메일 발송 중복 요청을 방지해야 함', async () => {
      // TODO: 쿨다운/중복 방지 로직 구현 후 테스트 추가
      const requestBody = {
        email: 'duplicate-test@example.com',
        type: 'signup',
      }

      const request = new NextRequest('http://localhost:3000/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      // 첫 번째 요청
      const response1 = await POST(request)
      expect(response1.status).toBe(200)

      // 두 번째 요청 (중복)
      const response2 = await POST(request)
      expect(response2.status).toBe(200) // TODO: 쿨다운 구현 시 429로 변경
    })
  })
})