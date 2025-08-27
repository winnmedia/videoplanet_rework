/**
 * Email Verification API Handlers
 * Mock handlers for email verification functionality
 */

import { http, HttpResponse, delay } from 'msw'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'

export const emailVerificationHandlers = [
  // Send verification code
  http.post(`${API_BASE_URL}/auth/send-verification`, async ({ request }) => {
    await delay(1000) // Simulate network delay
    
    const body = await request.json() as { email: string }
    
    // Simulate validation
    if (!body.email || !body.email.includes('@')) {
      return HttpResponse.json(
        { message: '유효한 이메일 주소를 입력해주세요.' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      message: '인증번호가 발송되었습니다.',
      verificationId: 'mock-verification-id-12345'
    })
  }),

  // Verify email code
  http.post(`${API_BASE_URL}/auth/verify-email`, async ({ request }) => {
    await delay(800) // Simulate network delay
    
    const body = await request.json() as { email: string; code: string }
    
    // Simulate validation
    if (!body.email || !body.code) {
      return HttpResponse.json(
        { message: '이메일과 인증번호를 입력해주세요.' },
        { status: 400 }
      )
    }
    
    // Mock verification logic - accept "123456" as valid code
    if (body.code === '123456') {
      return HttpResponse.json({
        message: '이메일 인증이 완료되었습니다.',
        verified: true
      })
    }
    
    return HttpResponse.json(
      { message: '인증번호가 일치하지 않습니다.' },
      { status: 400 }
    )
  }),

  // Backend email verification endpoints
  http.post('*/users/send_authnumber/signup', async ({ request }) => {
    await delay(500)
    
    const body = await request.json() as { email: string }
    
    if (!body.email || !body.email.includes('@')) {
      return HttpResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      message: 'success',
      auth_number_sent: true
    })
  }),

  http.post('*/users/send_authnumber/reset', async ({ request }) => {
    await delay(500)
    
    const body = await request.json() as { email: string }
    
    if (!body.email || !body.email.includes('@')) {
      return HttpResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      message: 'success',
      auth_number_sent: true
    })
  }),

  http.post('*/users/signup_emailauth/signup', async ({ request }) => {
    await delay(500)
    
    const body = await request.json() as { email: string; auth_number: number }
    
    // Mock verification - accept 123456 as valid
    if (body.auth_number === 123456) {
      return HttpResponse.json({
        message: 'Email verification successful',
        verified: true
      })
    }
    
    return HttpResponse.json(
      { message: 'Invalid verification code' },
      { status: 400 }
    )
  }),

  http.post('*/users/signup_emailauth/reset', async ({ request }) => {
    await delay(500)
    
    const body = await request.json() as { email: string; auth_number: number }
    
    // Mock verification - accept 123456 as valid
    if (body.auth_number === 123456) {
      return HttpResponse.json({
        message: 'Email verification successful',
        verified: true
      })
    }
    
    return HttpResponse.json(
      { message: 'Invalid verification code' },
      { status: 400 }
    )
  })
]