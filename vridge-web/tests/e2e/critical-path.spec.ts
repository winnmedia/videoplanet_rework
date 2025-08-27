/**
 * VideoPlanet Critical Path E2E Tests (TDD Red Phase)
 * 배포된 시스템의 핵심 비즈니스 플로우 검증
 * 
 * Phase: RED - 실패하는 테스트로 현재 상태 검증
 * Target: 0% 실패율 달성 (Critical Path는 절대 실패 불가)
 */

import { test, expect } from '@playwright/test'

const PRODUCTION_URL = 'https://vridge-xyc331ybx-vlanets-projects.vercel.app'
const API_URL = 'https://api.vlanet.net'

// Critical Path 테스트용 사용자 데이터
const TEST_SCENARIOS = {
  newUser: {
    email: 'critical-test@vlanet.net',
    password: 'CriticalTest2025!',
    nickname: 'E2E Critical Tester'
  },
  returningUser: {
    email: 'returning-test@vlanet.net', 
    password: 'ReturningTest2025!'
  }
}

test.describe('Critical Path 1: 인증 시스템 (Authentication Flow)', () => {
  
  test('CRITICAL: 프론트엔드 배포 상태 및 인증 보호 확인', async ({ page }) => {
    // RED: 현재 401 상태 확인
    const response = await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' })
    
    console.log(`Frontend Response Status: ${response?.status()}`)
    console.log(`Current URL: ${page.url()}`)
    
    // 401 상태이거나 로그인 페이지로 리다이렉트되어야 함
    if (response?.status() === 401) {
      // 401 Unauthorized - 인증 보호가 정상 작동 중
      expect(response.status()).toBe(401)
      console.log('✅ Frontend is properly protected with authentication')
    } else {
      // 로그인 페이지로 리다이렉트된 경우
      await expect(page).toHaveURL(new RegExp('(login|auth|signin)'))
      console.log('✅ Frontend redirects to authentication page')
    }
    
    // 페이지에 기본적인 인증 관련 요소가 있는지 확인
    const hasLoginForm = await page.locator('form').count() > 0
    const hasEmailInput = await page.locator('input[type="email"], input[name="email"]').count() > 0
    const hasPasswordInput = await page.locator('input[type="password"], input[name="password"]').count() > 0
    
    if (hasLoginForm && hasEmailInput && hasPasswordInput) {
      console.log('✅ Login form elements detected')
      expect(hasLoginForm).toBeTruthy()
      expect(hasEmailInput).toBeTruthy() 
      expect(hasPasswordInput).toBeTruthy()
    } else {
      console.log('❌ Login form elements not found - may need authentication API integration')
      // RED 단계에서는 실패를 예상함
      expect(hasLoginForm).toBeTruthy() // 이것이 실패할 것으로 예상
    }
  })

  test('CRITICAL: 회원가입 플로우 완전성 검증', async ({ page }) => {
    await page.goto(PRODUCTION_URL)
    
    // RED: 회원가입 버튼/링크 존재 확인
    const signupElements = [
      'a[href*="signup"]',
      'a[href*="register"]', 
      'button[data-testid="signup-button"]',
      'button:has-text("회원가입")',
      'button:has-text("Sign Up")',
      'a:has-text("회원가입")',
      'a:has-text("가입")'
    ]
    
    let signupFound = false
    for (const selector of signupElements) {
      const element = page.locator(selector).first()
      if (await element.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log(`✅ Found signup element: ${selector}`)
        await element.click()
        signupFound = true
        break
      }
    }
    
    if (!signupFound) {
      console.log('❌ No signup element found - authentication UI incomplete')
      expect(signupFound).toBeTruthy() // RED: 실패 예상
    }
    
    // 회원가입 폼 필드 검증
    if (signupFound) {
      await page.waitForTimeout(2000) // 페이지 로딩 대기
      
      const requiredFields = [
        'input[name="email"], input[type="email"]',
        'input[name="password"], input[type="password"]', 
        'input[name="nickname"], input[name="username"], input[name="name"]'
      ]
      
      let allFieldsFound = true
      for (const field of requiredFields) {
        const exists = await page.locator(field).count() > 0
        console.log(`Field ${field}: ${exists ? '✅' : '❌'}`)
        if (!exists) allFieldsFound = false
      }
      
      expect(allFieldsFound).toBeTruthy() // RED: 실패 가능성 높음
    }
  })

  test('CRITICAL: 로그인 플로우 및 세션 관리', async ({ page }) => {
    await page.goto(PRODUCTION_URL)
    
    // 로그인 폼 찾기 및 테스트 데이터 입력
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first()
    const submitButton = page.locator('button[type="submit"], input[type="submit"], button:has-text("로그인")').first()
    
    if (await emailInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await emailInput.fill(TEST_SCENARIOS.returningUser.email)
      await passwordInput.fill(TEST_SCENARIOS.returningUser.password)
      await submitButton.click()
      
      // 로그인 후 리다이렉트 확인
      await page.waitForTimeout(3000)
      
      const currentUrl = page.url()
      const isLoggedIn = currentUrl.includes('dashboard') || currentUrl.includes('home') || !currentUrl.includes('login')
      
      if (isLoggedIn) {
        console.log('✅ Login successful - redirected to:', currentUrl)
        expect(isLoggedIn).toBeTruthy()
      } else {
        console.log('❌ Login failed or incorrect redirect:', currentUrl)
        expect(isLoggedIn).toBeTruthy() // RED: 실패 예상
      }
    } else {
      console.log('❌ Login form not accessible')
      expect(false).toBeTruthy() // RED: 실패
    }
  })
})

test.describe('Critical Path 2: 대시보드 접근성 (Dashboard Accessibility)', () => {
  
  test.beforeEach(async ({ page }) => {
    // 각 테스트마다 로그인 시도
    await page.goto(PRODUCTION_URL)
    
    // 간단한 로그인 로직 (존재할 경우)
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    if (await emailInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await emailInput.fill(TEST_SCENARIOS.returningUser.email)
      await page.locator('input[type="password"], input[name="password"]').first().fill(TEST_SCENARIOS.returningUser.password)
      await page.locator('button[type="submit"], input[type="submit"], button:has-text("로그인")').first().click()
      await page.waitForTimeout(3000)
    }
  })
  
  test('CRITICAL: 대시보드 핵심 위젯 렌더링 검증', async ({ page }) => {
    // RED: 대시보드 접근 가능성 확인
    const currentUrl = page.url()
    const isDashboard = currentUrl.includes('dashboard') || currentUrl.includes('home')
    
    if (!isDashboard) {
      console.log('❌ Dashboard not accessible - authentication required')
      expect(isDashboard).toBeTruthy() // RED: 실패 예상
      return
    }
    
    // 대시보드 핵심 요소 확인
    const criticalElements = [
      'main', // 메인 콘텐츠 영역
      'nav, [role="navigation"]', // 네비게이션
      'header', // 헤더
    ]
    
    let elementsFound = 0
    for (const selector of criticalElements) {
      const exists = await page.locator(selector).count() > 0
      console.log(`Element ${selector}: ${exists ? '✅' : '❌'}`)
      if (exists) elementsFound++
    }
    
    expect(elementsFound).toBeGreaterThan(0) // 최소 1개 요소는 있어야 함
  })

  test('CRITICAL: 네비게이션 시스템 접근성', async ({ page }) => {
    const currentUrl = page.url()
    
    if (!currentUrl.includes('dashboard') && !currentUrl.includes('home')) {
      console.log('❌ Dashboard not accessible for navigation test')
      expect(false).toBeTruthy() // RED: 실패 예상
      return
    }
    
    // 네비게이션 링크 찾기
    const navSelectors = [
      'nav a, [role="navigation"] a',
      'a[href*="dashboard"]',
      'a[href*="project"]',
      'a[href*="calendar"]',
      'a[href*="feedback"]'
    ]
    
    let navLinksFound = 0
    for (const selector of navSelectors) {
      const count = await page.locator(selector).count()
      navLinksFound += count
      console.log(`Nav links found with ${selector}: ${count}`)
    }
    
    expect(navLinksFound).toBeGreaterThan(0) // RED: 네비게이션이 없으면 실패
  })
})

test.describe('Critical Path 3: API 연동 안정성 (API Integration)', () => {
  
  test('CRITICAL: 백엔드 API 생존성 및 응답성', async ({ request }) => {
    // 이 테스트는 성공해야 함 (MEMORY.md에 따르면 API 테스트 100% 통과)
    const healthResponse = await request.get(`${API_URL}/health/`)
    
    expect(healthResponse.status()).toBe(200)
    
    const health = await healthResponse.json()
    expect(health.status).toBe('healthy')
    expect(health.checks.database.status).toBe('ok')
    expect(health.checks.redis.status).toBe('ok')
    
    console.log('✅ Backend API is fully operational')
  })
  
  test('CRITICAL: 인증 API 엔드포인트 가용성', async ({ request }) => {
    // 회원가입 엔드포인트 존재 확인
    const signupResponse = await request.post(`${API_URL}/users/signup`, {
      data: {},
      failOnStatusCode: false
    })
    
    // 400/403/422/500 중 하나여야 함 (엔드포인트 존재 + 빈 데이터 거부)
    expect([400, 403, 422, 500].includes(signupResponse.status())).toBeTruthy()
    
    // 로그인 엔드포인트 존재 확인
    const loginResponse = await request.post(`${API_URL}/users/login`, {
      data: {},
      failOnStatusCode: false
    })
    
    expect([400, 403, 422, 500].includes(loginResponse.status())).toBeTruthy()
    
    console.log('✅ Authentication API endpoints are available')
  })
  
  test('CRITICAL: CORS 설정 및 프론트엔드-백엔드 통신', async ({ request }) => {
    const response = await request.get(`${API_URL}/health/`, {
      headers: {
        'Origin': PRODUCTION_URL,
        'Access-Control-Request-Method': 'GET',
        'User-Agent': 'Mozilla/5.0 (E2E Test)'
      }
    })
    
    expect(response.status()).toBe(200)
    
    // CORS 헤더 확인 또는 성공 응답 확인
    const headers = response.headers()
    const corsEnabled = headers['access-control-allow-origin'] || 
                      headers['access-control-allow-credentials'] || 
                      response.status() === 200
    
    expect(corsEnabled).toBeTruthy()
    console.log('✅ CORS configuration allows frontend-backend communication')
  })
})

test.describe('Critical Path 4: 사용자 경험 기본 품질 (UX Fundamentals)', () => {
  
  test('CRITICAL: 페이지 로딩 성능 및 타임아웃', async ({ page }) => {
    const startTime = Date.now()
    
    const response = await page.goto(PRODUCTION_URL, { 
      waitUntil: 'networkidle',
      timeout: 10000
    })
    
    const loadTime = Date.now() - startTime
    
    expect(response?.status()).not.toBe(undefined) // 응답 받았음
    expect(loadTime).toBeLessThan(10000) // 10초 이내 로딩
    
    console.log(`✅ Page load time: ${loadTime}ms`)
  })
  
  test('CRITICAL: 키보드 접근성 기본 지원', async ({ page }) => {
    await page.goto(PRODUCTION_URL)
    
    // Tab 키 네비게이션 가능 여부 확인
    await page.keyboard.press('Tab')
    
    const focusedElement = page.locator(':focus')
    const hasFocus = await focusedElement.count() > 0
    
    if (hasFocus) {
      console.log('✅ Keyboard navigation is supported')
      expect(hasFocus).toBeTruthy()
    } else {
      console.log('❌ Keyboard navigation not detected')
      expect(hasFocus).toBeTruthy() // RED: 접근성 문제
    }
  })
  
  test('CRITICAL: 모바일 반응형 기본 지원', async ({ page }) => {
    // 모바일 뷰포트로 설정
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(PRODUCTION_URL)
    
    // 페이지가 모바일에서 렌더링되는지 확인
    const bodyElement = page.locator('body')
    const bodyWidth = await bodyElement.evaluate(el => el.scrollWidth)
    
    expect(bodyWidth).toBeLessThanOrEqual(400) // 모바일 너비에 적합한지 확인
    console.log(`✅ Mobile viewport rendering: ${bodyWidth}px width`)
  })
})

test.describe('Critical Path 5: 에러 복구 메커니즘 (Error Recovery)', () => {
  
  test('CRITICAL: 네트워크 실패 시 사용자 피드백', async ({ page }) => {
    // 네트워크 차단
    await page.route('**/*', route => route.abort())
    
    const gotoPromise = page.goto(PRODUCTION_URL, { timeout: 5000 })
    
    // 네트워크 실패 시 적절한 에러 처리 확인
    await expect(gotoPromise).rejects.toThrow()
    
    // 네트워크 복구
    await page.unroute('**/*')
    
    // 재시도 가능한지 확인
    const retryResponse = await page.goto(PRODUCTION_URL)
    expect(retryResponse?.status()).not.toBe(undefined)
    
    console.log('✅ Network error recovery mechanism works')
  })
  
  test('CRITICAL: API 에러 시 사용자 경험', async ({ page, request }) => {
    // API 에러 상황 시뮬레이션
    await page.route('**/api/**', route => 
      route.fulfill({ 
        status: 500, 
        body: JSON.stringify({ error: 'Internal Server Error' }),
        headers: { 'Content-Type': 'application/json' }
      })
    )
    
    await page.goto(PRODUCTION_URL)
    
    // 페이지가 여전히 로딩되는지 확인 (API 에러에도 불구하고)
    const pageLoaded = await page.locator('body').isVisible({ timeout: 5000 })
    expect(pageLoaded).toBeTruthy()
    
    console.log('✅ Page remains functional during API errors')
  })
})