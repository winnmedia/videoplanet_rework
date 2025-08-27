/**
 * Email Verification MSW Handlers
 * 이메일 인증 시스템을 위한 모킹 핸들러
 */

import { http, HttpResponse, delay } from 'msw'

// 이메일 인증 상태를 시뮬레이션하는 메모리 스토어
const verificationStore = new Map<string, {
  code: string
  expires: number
  type: 'signup' | 'reset'
  attempts: number
}>()

// 레이트 리미팅을 위한 요청 기록
const rateLimitStore = new Map<string, {
  count: number
  resetTime: number
}>()

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

/**
 * 이메일 인증 관련 MSW 핸들러들
 */
export const emailVerificationHandlers = [
  // POST /api/auth/send-verification - 인증번호 발송
  http.post(`${API_BASE_URL}/auth/send-verification`, async ({ request }) => {
    await delay(300) // 네트워크 지연 시뮬레이션

    try {
      const body = await request.json() as {
        email: string
        type: 'signup' | 'reset'
      }

      const { email, type } = body

      // 필수 필드 검증
      if (!email || !type) {
        return HttpResponse.json(
          { error: '이메일과 타입이 필요합니다.' },
          { status: 400 }
        )
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return HttpResponse.json(
          { error: '올바른 이메일 주소를 입력해주세요.' },
          { status: 400 }
        )
      }

      // 타입 검증
      if (!['signup', 'reset'].includes(type)) {
        return HttpResponse.json(
          { error: '올바르지 않은 타입입니다.' },
          { status: 400 }
        )
      }

      // 레이트 리미팅 체크
      const now = Date.now()
      const rateLimit = rateLimitStore.get(email)
      
      if (rateLimit && now < rateLimit.resetTime) {
        if (rateLimit.count >= 5) { // 1시간에 5회 제한
          return HttpResponse.json(
            { 
              error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
              retryAfter: Math.ceil((rateLimit.resetTime - now) / 1000)
            },
            { status: 429 }
          )
        }
        rateLimit.count += 1
      } else {
        rateLimitStore.set(email, {
          count: 1,
          resetTime: now + 60 * 60 * 1000 // 1시간 후 리셋
        })
      }

      // 에러 시나리오 시뮬레이션 (5% 확률)
      if (Math.random() < 0.05) {
        return HttpResponse.json(
          { error: '이메일 발송에 실패했습니다. 다시 시도해주세요.' },
          { status: 500 }
        )
      }

      // 특정 테스트 이메일에 대한 특별 처리
      if (email === 'blocked@spam.com') {
        return HttpResponse.json(
          { error: '차단된 이메일 주소입니다.' },
          { status: 403 }
        )
      }

      // 인증번호 생성 (6자리 숫자)
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      const expires = now + 10 * 60 * 1000 // 10분 후 만료

      // 인증번호 저장
      verificationStore.set(email, {
        code,
        expires,
        type,
        attempts: 0
      })

      // 개발 모드 처리
      if (!process.env.SENDGRID_API_KEY) {
        console.log(`🔑 [MOCK] Verification code for ${email}: ${code}`)
        return HttpResponse.json({
          message: '개발 모드: 콘솔에서 인증번호를 확인하세요.',
          success: true,
          devCode: code // 테스트에서만 반환
        })
      }

      return HttpResponse.json({
        message: '인증번호가 발송되었습니다.',
        success: true
      })

    } catch (error) {
      return HttpResponse.json(
        { error: '서버 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  }),

  // PUT /api/auth/send-verification - 인증번호 검증
  http.put(`${API_BASE_URL}/auth/send-verification`, async ({ request }) => {
    await delay(200) // 검증은 발송보다 빠름

    try {
      const body = await request.json() as {
        email: string
        code: string
        type: 'signup' | 'reset'
      }

      const { email, code, type } = body

      // 필수 필드 검증
      if (!email || !code || !type) {
        return HttpResponse.json(
          { error: '필수 정보가 누락되었습니다.' },
          { status: 400 }
        )
      }

      // 저장된 인증번호 조회
      const stored = verificationStore.get(email)
      
      if (!stored) {
        return HttpResponse.json(
          { error: '인증번호를 먼저 요청해주세요.' },
          { status: 400 }
        )
      }

      // 만료 검증
      if (stored.expires < Date.now()) {
        verificationStore.delete(email)
        return HttpResponse.json(
          { error: '인증번호가 만료되었습니다. 다시 요청해주세요.' },
          { status: 400 }
        )
      }

      // 시도 횟수 증가
      stored.attempts += 1

      // 최대 시도 횟수 제한 (5회)
      if (stored.attempts > 5) {
        verificationStore.delete(email)
        return HttpResponse.json(
          { error: '인증번호 입력 횟수를 초과했습니다. 다시 요청해주세요.' },
          { status: 400 }
        )
      }

      // 코드 및 타입 검증
      if (stored.code !== code || stored.type !== type) {
        return HttpResponse.json(
          { 
            error: '인증번호가 올바르지 않습니다.',
            remainingAttempts: 5 - stored.attempts
          },
          { status: 400 }
        )
      }

      // 인증 성공 - 코드 삭제
      verificationStore.delete(email)

      return HttpResponse.json({
        message: '이메일 인증이 완료되었습니다.',
        success: true
      })

    } catch (error) {
      return HttpResponse.json(
        { error: '서버 오류가 발생했습니다.' },
        { status: 500 }
      )
    }
  }),

  // GET /api/auth/verification-status - 인증 상태 확인 (테스트용)
  http.get(`${API_BASE_URL}/auth/verification-status/:email`, async ({ params }) => {
    await delay(100)
    
    const { email } = params
    const stored = verificationStore.get(email as string)
    
    if (!stored) {
      return HttpResponse.json({
        hasCode: false,
        expired: false
      })
    }

    const now = Date.now()
    const expired = stored.expires < now
    
    if (expired) {
      verificationStore.delete(email as string)
    }

    return HttpResponse.json({
      hasCode: !expired,
      expired,
      remainingTime: expired ? 0 : Math.max(0, stored.expires - now),
      attempts: stored.attempts,
      type: stored.type
    })
  })
]

/**
 * 에러 시나리오 테스트용 핸들러
 */
export const emailVerificationErrorHandlers = [
  // SendGrid API 실패 시뮬레이션
  http.post(`${API_BASE_URL}/auth/send-verification`, async () => {
    await delay(1000)
    return HttpResponse.json(
      { error: '이메일 발송에 실패했습니다. 다시 시도해주세요.' },
      { status: 500 }
    )
  }),

  // 네트워크 타임아웃 시뮬레이션
  http.post(`${API_BASE_URL}/auth/send-verification-timeout`, async () => {
    await delay(30000) // 30초 지연으로 타임아웃 유발
    return HttpResponse.json({ success: true })
  }),

  // 레이트 리미팅 시뮬레이션
  http.post(`${API_BASE_URL}/auth/send-verification-rate-limited`, async () => {
    await delay(100)
    return HttpResponse.json(
      { 
        error: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
        retryAfter: 3600
      },
      { status: 429 }
    )
  })
]

/**
 * 테스트 헬퍼 함수들
 */
export const emailVerificationTestHelpers = {
  // 스토어 초기화
  clearStore: () => {
    verificationStore.clear()
    rateLimitStore.clear()
  },

  // 인증번호 직접 설정 (테스트용)
  setVerificationCode: (email: string, code: string, type: 'signup' | 'reset' = 'signup') => {
    verificationStore.set(email, {
      code,
      expires: Date.now() + 10 * 60 * 1000,
      type,
      attempts: 0
    })
  },

  // 만료된 인증번호 설정 (테스트용)
  setExpiredCode: (email: string, code: string, type: 'signup' | 'reset' = 'signup') => {
    verificationStore.set(email, {
      code,
      expires: Date.now() - 1000, // 1초 전 만료
      type,
      attempts: 0
    })
  },

  // 최대 시도 횟수 설정 (테스트용)
  setMaxAttempts: (email: string, code: string, type: 'signup' | 'reset' = 'signup') => {
    verificationStore.set(email, {
      code,
      expires: Date.now() + 10 * 60 * 1000,
      type,
      attempts: 5
    })
  },

  // 스토어 상태 확인
  getStoreState: () => {
    return {
      verificationCount: verificationStore.size,
      rateLimitCount: rateLimitStore.size,
      codes: Array.from(verificationStore.entries())
    }
  }
}