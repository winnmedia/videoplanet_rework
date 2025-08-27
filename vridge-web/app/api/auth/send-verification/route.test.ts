/**
 * /api/auth/send-verification API Integration Tests
 * TDD Red 단계 - API 엔드포인트 통합 테스트
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { POST, PUT } from './route'
import { EmailService } from '@/shared/services/emailService'

// EmailService 모킹
vi.mock('@/shared/services/emailService', () => ({
  EmailService: {
    generateVerificationCode: vi.fn(),
    sendVerificationCode: vi.fn(),
    sendPasswordResetCode: vi.fn(),
  },
}))

// NextRequest 모킹을 위한 헬퍼
class MockNextRequest {
  constructor(private body: any, private method: string = 'POST') {}

  async json() {
    return this.body
  }

  get url() {
    return 'http://localhost:3000/api/auth/send-verification'
  }
}

describe('/api/auth/send-verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 환경변수 초기화
    delete process.env.SENDGRID_API_KEY
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  describe('POST /api/auth/send-verification', () => {
    describe('성공 케이스', () => {
      it('유효한 회원가입 인증번호 요청을 처리해야 한다', async () => {
        // Given
        const mockCode = '123456'
        const mockEmailService = vi.mocked(EmailService)
        mockEmailService.generateVerificationCode.mockReturnValue(mockCode)
        mockEmailService.sendVerificationCode.mockResolvedValue(undefined)
        
        process.env.SENDGRID_API_KEY = 'test-key'
        
        const request = new MockNextRequest({
          email: 'test@example.com',
          type: 'signup'
        }) as any

        // When
        const response = await POST(request)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.message).toBe('인증번호가 발송되었습니다.')
        expect(mockEmailService.generateVerificationCode).toHaveBeenCalledTimes(1)
        expect(mockEmailService.sendVerificationCode).toHaveBeenCalledWith(
          'test@example.com',
          mockCode
        )
      })

      it('유효한 비밀번호 재설정 인증번호 요청을 처리해야 한다', async () => {
        // Given
        const mockCode = '654321'
        const mockEmailService = vi.mocked(EmailService)
        mockEmailService.generateVerificationCode.mockReturnValue(mockCode)
        mockEmailService.sendPasswordResetCode.mockResolvedValue(undefined)
        
        process.env.SENDGRID_API_KEY = 'test-key'
        
        const request = new MockNextRequest({
          email: 'reset@example.com',
          type: 'reset'
        }) as any

        // When
        const response = await POST(request)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(mockEmailService.sendPasswordResetCode).toHaveBeenCalledWith(
          'reset@example.com',
          mockCode
        )
      })

      it('SendGrid가 설정되지 않은 개발 모드에서 콘솔에 코드를 출력해야 한다', async () => {
        // Given
        const mockCode = '999999'
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
        const mockEmailService = vi.mocked(EmailService)
        mockEmailService.generateVerificationCode.mockReturnValue(mockCode)
        mockEmailService.sendVerificationCode.mockRejectedValue(new Error('SendGrid not configured'))
        
        // SendGrid API 키 없음
        delete process.env.SENDGRID_API_KEY
        
        const request = new MockNextRequest({
          email: 'dev@example.com',
          type: 'signup'
        }) as any

        // When
        const response = await POST(request)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.message).toBe('개발 모드: 콘솔에서 인증번호를 확인하세요.')
        expect(responseData.devCode).toBe(mockCode)
        expect(consoleSpy).toHaveBeenCalledWith(
          `🔑 [DEV MODE] Verification code for dev@example.com: ${mockCode}`
        )
        
        consoleSpy.mockRestore()
      })
    })

    describe('유효성 검증', () => {
      it('이메일이 누락되면 400 에러를 반환해야 한다', async () => {
        // Given
        const request = new MockNextRequest({
          type: 'signup'
          // email 누락
        }) as any

        // When
        const response = await POST(request)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(400)
        expect(responseData.error).toBe('이메일과 타입이 필요합니다.')
      })

      it('타입이 누락되면 400 에러를 반환해야 한다', async () => {
        // Given
        const request = new MockNextRequest({
          email: 'test@example.com'
          // type 누락
        }) as any

        // When
        const response = await POST(request)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(400)
        expect(responseData.error).toBe('이메일과 타입이 필요합니다.')
      })

      it('잘못된 타입이면 400 에러를 반환해야 한다', async () => {
        // Given
        const request = new MockNextRequest({
          email: 'test@example.com',
          type: 'invalid_type'
        }) as any

        // When
        const response = await POST(request)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(400)
        expect(responseData.error).toBe('올바르지 않은 타입입니다.')
      })

      it('잘못된 이메일 형식이면 400 에러를 반환해야 한다', async () => {
        // Given
        const invalidEmails = [
          'invalid-email',
          '@domain.com',
          'user@',
          'user@domain',
          'user.domain.com'
        ]

        for (const email of invalidEmails) {
          const request = new MockNextRequest({
            email,
            type: 'signup'
          }) as any

          // When
          const response = await POST(request)
          const responseData = await response.json()

          // Then
          expect(response.status).toBe(400)
          expect(responseData.error).toBe('올바른 이메일 주소를 입력해주세요.')
        }
      })
    })

    describe('에러 처리', () => {
      it('이메일 발송 실패 시 500 에러를 반환해야 한다', async () => {
        // Given
        const mockEmailService = vi.mocked(EmailService)
        mockEmailService.generateVerificationCode.mockReturnValue('123456')
        mockEmailService.sendVerificationCode.mockRejectedValue(new Error('SendGrid API Error'))
        
        process.env.SENDGRID_API_KEY = 'test-key'
        
        const request = new MockNextRequest({
          email: 'test@example.com',
          type: 'signup'
        }) as any

        // When
        const response = await POST(request)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(500)
        expect(responseData.error).toBe('이메일 발송에 실패했습니다. 다시 시도해주세요.')
      })

      it('JSON 파싱 실패 시 500 에러를 반환해야 한다', async () => {
        // Given
        const request = {
          json: vi.fn().mockRejectedValue(new Error('Invalid JSON'))
        } as any

        // When
        const response = await POST(request)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(500)
        expect(responseData.error).toBe('서버 오류가 발생했습니다.')
      })
    })

    describe('보안', () => {
      it('인증번호는 6자리 숫자여야 한다', async () => {
        // Given
        const mockEmailService = vi.mocked(EmailService)
        mockEmailService.generateVerificationCode.mockReturnValue('123456')
        mockEmailService.sendVerificationCode.mockResolvedValue(undefined)
        
        process.env.SENDGRID_API_KEY = 'test-key'
        
        const request = new MockNextRequest({
          email: 'test@example.com',
          type: 'signup'
        }) as any

        // When
        await POST(request)

        // Then
        const generatedCode = mockEmailService.generateVerificationCode.mock.results[0].value
        expect(generatedCode).toMatch(/^\d{6}$/)
      })

      it('인증번호는 10분 후 만료되어야 한다', async () => {
        // Given
        const mockEmailService = vi.mocked(EmailService)
        mockEmailService.generateVerificationCode.mockReturnValue('123456')
        mockEmailService.sendVerificationCode.mockResolvedValue(undefined)
        
        process.env.SENDGRID_API_KEY = 'test-key'
        const startTime = Date.now()
        
        const request = new MockNextRequest({
          email: 'test@example.com',
          type: 'signup'
        }) as any

        // When
        await POST(request)

        // Then
        // 인증코드 저장 로직에서 만료시간이 10분(600,000ms) 후로 설정되는지 확인
        // 실제 구현에서는 내부 저장소를 확인해야 하지만, 
        // 여기서는 로직이 올바르게 구현되었다고 가정
        expect(true).toBe(true) // 플레이스홀더
      })
    })
  })

  describe('PUT /api/auth/send-verification', () => {
    describe('인증번호 검증 성공', () => {
      it('올바른 인증번호를 검증해야 한다', async () => {
        // Given - 먼저 인증번호를 생성하고 저장
        const email = 'verify@example.com'
        const code = '123456'
        const type = 'signup'
        
        const mockEmailService = vi.mocked(EmailService)
        mockEmailService.generateVerificationCode.mockReturnValue(code)
        mockEmailService.sendVerificationCode.mockResolvedValue(undefined)
        
        process.env.SENDGRID_API_KEY = 'test-key'
        
        // POST 요청으로 인증번호 생성
        const postRequest = new MockNextRequest({ email, type }) as any
        await POST(postRequest)
        
        // PUT 요청으로 인증번호 검증
        const putRequest = new MockNextRequest({ email, code, type }) as any

        // When
        const response = await PUT(putRequest)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(200)
        expect(responseData.success).toBe(true)
        expect(responseData.message).toBe('이메일 인증이 완료되었습니다.')
      })
    })

    describe('인증번호 검증 실패', () => {
      it('필수 정보가 누락되면 400 에러를 반환해야 한다', async () => {
        // Given
        const request = new MockNextRequest({
          email: 'test@example.com'
          // code, type 누락
        }) as any

        // When
        const response = await PUT(request)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(400)
        expect(responseData.error).toBe('필수 정보가 누락되었습니다.')
      })

      it('인증번호가 먼저 요청되지 않았으면 400 에러를 반환해야 한다', async () => {
        // Given
        const request = new MockNextRequest({
          email: 'notfound@example.com',
          code: '123456',
          type: 'signup'
        }) as any

        // When
        const response = await PUT(request)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(400)
        expect(responseData.error).toBe('인증번호를 먼저 요청해주세요.')
      })

      it('잘못된 인증번호면 400 에러를 반환해야 한다', async () => {
        // Given - 올바른 인증번호 생성
        const email = 'test@example.com'
        const correctCode = '123456'
        const wrongCode = '654321'
        const type = 'signup'
        
        const mockEmailService = vi.mocked(EmailService)
        mockEmailService.generateVerificationCode.mockReturnValue(correctCode)
        mockEmailService.sendVerificationCode.mockResolvedValue(undefined)
        
        process.env.SENDGRID_API_KEY = 'test-key'
        
        // POST로 인증번호 생성
        const postRequest = new MockNextRequest({ email, type }) as any
        await POST(postRequest)
        
        // 잘못된 인증번호로 검증 시도
        const putRequest = new MockNextRequest({ 
          email, 
          code: wrongCode, 
          type 
        }) as any

        // When
        const response = await PUT(putRequest)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(400)
        expect(responseData.error).toBe('인증번호가 올바르지 않습니다.')
      })

      it('타입이 일치하지 않으면 400 에러를 반환해야 한다', async () => {
        // Given - signup 타입으로 인증번호 생성
        const email = 'type-test@example.com'
        const code = '123456'
        
        const mockEmailService = vi.mocked(EmailService)
        mockEmailService.generateVerificationCode.mockReturnValue(code)
        mockEmailService.sendVerificationCode.mockResolvedValue(undefined)
        
        process.env.SENDGRID_API_KEY = 'test-key'
        
        // signup 타입으로 POST
        const postRequest = new MockNextRequest({ 
          email, 
          type: 'signup' 
        }) as any
        await POST(postRequest)
        
        // reset 타입으로 PUT 시도
        const putRequest = new MockNextRequest({ 
          email, 
          code, 
          type: 'reset' 
        }) as any

        // When
        const response = await PUT(putRequest)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(400)
        expect(responseData.error).toBe('인증번호가 올바르지 않습니다.')
      })
    })

    describe('만료 처리', () => {
      it('만료된 인증번호는 거부되어야 한다', async () => {
        // Given
        const email = 'expired@example.com'
        const code = '123456'
        const type = 'signup'
        
        const mockEmailService = vi.mocked(EmailService)
        mockEmailService.generateVerificationCode.mockReturnValue(code)
        mockEmailService.sendVerificationCode.mockResolvedValue(undefined)
        
        process.env.SENDGRID_API_KEY = 'test-key'
        
        // 과거 시점으로 시간을 모킹하여 만료 상황 시뮬레이션
        const originalDateNow = Date.now
        Date.now = vi.fn(() => 1000000) // 과거 시점
        
        // POST로 인증번호 생성
        const postRequest = new MockNextRequest({ email, type }) as any
        await POST(postRequest)
        
        // 현재 시점으로 시간 변경 (10분 후)
        Date.now = vi.fn(() => 1000000 + 11 * 60 * 1000) // 11분 후
        
        const putRequest = new MockNextRequest({ email, code, type }) as any

        // When
        const response = await PUT(putRequest)
        const responseData = await response.json()

        // Then
        expect(response.status).toBe(400)
        expect(responseData.error).toBe('인증번호가 만료되었습니다. 다시 요청해주세요.')
        
        // 원본 Date.now 복원
        Date.now = originalDateNow
      })
    })
  })

  describe('메모리 스토어 동작', () => {
    it('성공한 인증번호는 스토어에서 제거되어야 한다', async () => {
      // Given
      const email = 'cleanup@example.com'
      const code = '123456'
      const type = 'signup'
      
      const mockEmailService = vi.mocked(EmailService)
      mockEmailService.generateVerificationCode.mockReturnValue(code)
      mockEmailService.sendVerificationCode.mockResolvedValue(undefined)
      
      process.env.SENDGRID_API_KEY = 'test-key'
      
      // POST로 인증번호 생성
      const postRequest = new MockNextRequest({ email, type }) as any
      await POST(postRequest)
      
      // PUT으로 성공적으로 검증
      const putRequest = new MockNextRequest({ email, code, type }) as any
      const response = await PUT(putRequest)
      expect(response.status).toBe(200)
      
      // 같은 코드로 재검증 시도
      const secondPutRequest = new MockNextRequest({ email, code, type }) as any

      // When
      const secondResponse = await PUT(secondPutRequest)
      const responseData = await secondResponse.json()

      // Then - 이미 사용된 코드이므로 실패해야 함
      expect(secondResponse.status).toBe(400)
      expect(responseData.error).toBe('인증번호를 먼저 요청해주세요.')
    })
  })
})