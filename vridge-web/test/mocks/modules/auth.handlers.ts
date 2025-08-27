/**
 * 인증 모듈 MSW 핸들러 (간소화)
 */

import { http, HttpResponse, delay } from 'msw'

import { API_BASE_URL } from '../handlers'

export const authHandlers = [
  http.post(`${API_BASE_URL}/auth/login`, async () => {
    await delay(200)
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: { id: '1', name: '관리자' }
    })
  })
]

export const authTestUtils = {
  clearTokens: () => {}
}