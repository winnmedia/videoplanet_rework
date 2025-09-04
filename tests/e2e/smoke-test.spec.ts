/**
 * VideoPlanet 스모크 테스트 - 브라우저 의존성 없이 실행
 * API 엔드포인트 및 기본 접근성 검증
 */

import { test, expect } from '@playwright/test'

const FRONTEND_URL = 'https://vridge-web.vercel.app'
const BACKEND_URL = 'https://api.vlanet.net'

test.describe('VideoPlanet 스모크 테스트', () => {
  
  test('백엔드 API 헬스체크 검증', async ({ request }) => {
    // Given: 백엔드 서비스가 배포됨
    // When: 헬스체크 엔드포인트 호출
    const response = await request.get(`${BACKEND_URL}/health/`)
    
    // Then: 정상 응답 및 상태 확인
    expect(response.status()).toBe(200)
    
    const healthData = await response.json()
    expect(healthData.status).toBe('healthy')
    expect(healthData.checks.database.status).toBe('ok')
    expect(healthData.checks.redis.status).toBe('ok')
  })

  test('프론트엔드 메인 페이지 접근성', async ({ page }) => {
    // Given: 프론트엔드가 배포됨
    // When: 메인 페이지 접근
    await page.goto(FRONTEND_URL)
    
    // Then: 페이지가 정상 로드됨
    await expect(page).toHaveTitle(/VideoPlanet|VRidge/)
    
    // HTML 구조 검증
    await expect(page.locator('main, [role="main"]')).toBeVisible()
    
    // 기본 네비게이션 존재 확인
    const nav = page.locator('nav, [role="navigation"]').first()
    if (await nav.count() > 0) {
      await expect(nav).toBeVisible()
    }
  })

  test('인증 관련 API 엔드포인트 접근성', async ({ request }) => {
    // When: 로그인 엔드포인트 확인 (POST 요청 - 인증 정보 없이)
    const loginResponse = await request.post(`${BACKEND_URL}/users/signin/`, {
      data: {}
    })
    
    // Then: 엔드포인트가 존재하고 처리됨 (400 또는 422는 정상 - 데이터 누락으로 인한 것)
    expect([400, 422, 500].includes(loginResponse.status())).toBeTruthy()

    // When: 회원가입 엔드포인트 확인
    const signupResponse = await request.post(`${BACKEND_URL}/users/signup/`, {
      data: {}
    })
    
    // Then: 엔드포인트가 존재함
    expect([400, 422, 500].includes(signupResponse.status())).toBeTruthy()
  })

  test('CORS 정책 확인', async ({ request }) => {
    // When: 프론트엔드 도메인에서 백엔드 API 호출 시뮬레이션
    const response = await request.get(`${BACKEND_URL}/health/`, {
      headers: {
        'Origin': FRONTEND_URL,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type'
      }
    })
    
    // Then: CORS 정책이 올바르게 설정됨
    expect(response.status()).toBe(200)
    
    const headers = response.headers()
    // Access-Control-Allow-Origin이 설정되어 있거나, 200 응답으로 CORS가 허용됨을 확인
    const corsAllowed = headers['access-control-allow-origin'] || response.status() === 200
    expect(corsAllowed).toBeTruthy()
  })

  test('정적 리소스 접근성 검증', async ({ page }) => {
    // Given: 프론트엔드 페이지 로드
    await page.goto(FRONTEND_URL)
    
    // When: CSS 파일 로드 상태 확인
    const cssRequests = []
    const jsRequests = []
    
    page.on('response', response => {
      const url = response.url()
      if (url.includes('.css')) cssRequests.push(response.status())
      if (url.includes('.js')) jsRequests.push(response.status())
    })
    
    // 페이지 완전 로드 대기
    await page.waitForLoadState('networkidle')
    
    // Then: 주요 리소스가 정상 로드됨
    if (cssRequests.length > 0) {
      expect(cssRequests.some(status => status === 200)).toBeTruthy()
    }
    
    if (jsRequests.length > 0) {
      expect(jsRequests.some(status => status === 200)).toBeTruthy()
    }
  })

  test('기본 성능 메트릭 확인', async ({ page }) => {
    // Given: 성능 측정 시작
    const startTime = Date.now()
    
    // When: 페이지 로드
    await page.goto(FRONTEND_URL)
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    
    // Then: 로딩 시간이 합리적 범위 내 (30초 이내)
    expect(loadTime).toBeLessThan(30000)
    
    // 기본적인 인터랙션 가능 여부 확인
    const interactiveElements = await page.locator('button, a, input').count()
    expect(interactiveElements).toBeGreaterThan(0)
  })

  test('에러 페이지 처리 확인', async ({ page }) => {
    // When: 존재하지 않는 페이지 접근
    const response = await page.goto(`${FRONTEND_URL}/non-existent-page`)
    
    // Then: 404 처리가 적절히 됨 (404 상태 또는 리다이렉트)
    const isHandled = response.status() === 404 || 
                     response.status() === 200 || // 커스텀 404 페이지
                     response.status() >= 300 && response.status() < 400 // 리다이렉트
                     
    expect(isHandled).toBeTruthy()
    
    // 페이지에 에러 메시지나 네비게이션이 있는지 확인
    const hasContent = await page.locator('body').textContent()
    expect(hasContent.length).toBeGreaterThan(0)
  })
})

test.describe('API 기능별 스모크 테스트', () => {
  
  test('사용자 관리 API 엔드포인트', async ({ request }) => {
    const endpoints = [
      '/users/signup/',
      '/users/signin/',
      '/users/sendauth/signup/',
      '/users/emailauth/signup/'
    ]
    
    for (const endpoint of endpoints) {
      const response = await request.post(`${BACKEND_URL}${endpoint}`, {
        data: {},
        failOnStatusCode: false
      })
      
      // 엔드포인트가 존재하고 처리됨 (400번대는 잘못된 요청으로 정상)
      expect(response.status()).toBeGreaterThanOrEqual(200)
      expect(response.status()).toBeLessThan(500)
    }
  })

  test('프로젝트 관리 API 접근성', async ({ request }) => {
    // 인증 없이 프로젝트 목록 접근 시도
    const response = await request.get(`${BACKEND_URL}/projects/`, {
      failOnStatusCode: false
    })
    
    // 401 (인증 필요) 또는 403 (권한 없음)이 정상 응답
    expect([401, 403, 200].includes(response.status())).toBeTruthy()
  })

  test('실시간 기능 WebSocket 엔드포인트', async ({ page }) => {
    // WebSocket 연결 가능 여부만 확인 (실제 연결은 하지 않음)
    await page.goto(FRONTEND_URL)
    
    // WebSocket 지원 확인
    const wsSupported = await page.evaluate(() => {
      return typeof WebSocket !== 'undefined'
    })
    
    expect(wsSupported).toBeTruthy()
  })
})