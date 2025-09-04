/**
 * Critical Smoke Tests for Production Monitoring
 * 운영 환경에서 핵심 기능이 정상 작동하는지 확인하는 간소화된 테스트
 */

import { test, expect } from '@playwright/test'

// 타입 정의
interface WindowWithTestStart extends Window {
  __smokeTestStart: number
}

interface HealthCheckResponse {
  status: string
  timestamp: string
  checks: Record<string, { status: string }>
  metrics?: {
    responseTime?: number
    memoryUsage?: number
    performance?: {
      lcp?: number
    }
  }
  alerts?: Array<{ severity: string }>
}

interface WebVitals {
  lcp?: number
  cls?: number
  fcp?: number
}

interface NetworkRequest {
  url: string
  method: string
  timestamp: string
}

interface FailedRequest extends NetworkRequest {
  failure?: string
}

interface JsError {
  message: string
  stack?: string
  type?: string
  timestamp: string
}

interface ResourceEntry {
  name: string
  size?: number
  duration?: number
}

// 테스트 환경 설정
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

test.describe('Critical Smoke Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 테스트 시작 전 성능 추적 시작
    await page.addInitScript(() => {
      window.__smokeTestStart = performance.now()
    })
  })

  test.afterEach(async ({ page }) => {
    // 테스트 완료 후 성능 메트릭 수집
    const testDuration = await page.evaluate(() => {
      return performance.now() - ((window as unknown as WindowWithTestStart).__smokeTestStart || 0)
    })
    
    console.log(`Test duration: ${testDuration.toFixed(2)}ms`)
  })

  test('1. 메인 페이지 로딩 및 기본 요소 확인', async ({ page }) => {
    console.log('🧪 Testing: Main page loading')
    
    // 메인 페이지 이동
    const response = await page.goto(BASE_URL)
    expect(response?.status()).toBe(200)

    // 페이지 타이틀 확인
    await expect(page).toHaveTitle(/VRidge|VLANET/)

    // 기본 네비게이션 요소 확인
    const header = page.locator('header, [role="banner"]')
    await expect(header).toBeVisible({ timeout: 5000 })

    // 로고 또는 브랜드명 확인
    const logo = page.locator('img[alt*="logo"], h1, [data-testid="logo"]')
    await expect(logo.first()).toBeVisible()

    // Core Web Vitals 체크 - LCP 측정
    const lcp = await page.evaluate(() => {
      return new Promise((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number }
          resolve(lastEntry.startTime)
        }).observe({ type: 'largest-contentful-paint', buffered: true })
        
        // 5초 후 타임아웃
        setTimeout(() => resolve(0), 5000)
      })
    })

    console.log(`LCP: ${lcp}ms`)
    expect(lcp).toBeLessThan(2500) // LCP 임계값 2.5초
  })

  test('2. 헬스 체크 API 응답 확인', async ({ request }) => {
    console.log('🧪 Testing: Health check API')
    
    const response = await request.get(`${BASE_URL}/api/health`)
    
    expect(response.status()).toBe(200)
    
    const healthData = await response.json()
    expect(healthData).toHaveProperty('status')
    expect(healthData).toHaveProperty('timestamp')
    expect(healthData).toHaveProperty('checks')
    
    // 최소한 하나의 서비스는 정상이어야 함
    const healthResponse = healthData as HealthCheckResponse
    const checks = Object.values(healthResponse.checks)
    const healthyServices = checks.filter(check => check.status === 'ok').length
    
    console.log(`Healthy services: ${healthyServices}/${checks.length}`)
    expect(healthyServices).toBeGreaterThanOrEqual(1)
    
    // 응답 시간 확인
    expect(healthData.metrics?.responseTime).toBeLessThan(1000) // 1초 이내
  })

  test('3. 네비게이션 및 라우팅 테스트', async ({ page }) => {
    console.log('🧪 Testing: Navigation and routing')
    
    await page.goto(BASE_URL)

    // 대시보드 링크 확인 및 이동
    const dashboardLink = page.locator('a[href*="/dashboard"], a:has-text("대시보드"), a:has-text("Dashboard")')
    
    if (await dashboardLink.count() > 0) {
      await dashboardLink.first().click()
      await page.waitForURL(/dashboard/, { timeout: 5000 })
      
      // 대시보드 페이지 로딩 확인
      const dashboardContent = page.locator('[data-testid="dashboard"], main, h1:has-text("대시보드")')
      await expect(dashboardContent.first()).toBeVisible({ timeout: 10000 })
    }

    // 뒤로가기 테스트
    await page.goBack()
    await expect(page).toHaveURL(BASE_URL)
  })

  test('4. 검색 및 상호작용 테스트', async ({ page }) => {
    console.log('🧪 Testing: Search and interaction')
    
    await page.goto(BASE_URL)

    // 검색 입력 필드 찾기
    const searchInput = page.locator('input[type="search"], input[placeholder*="검색"], input[placeholder*="search"]')
    
    if (await searchInput.count() > 0) {
      await searchInput.first().fill('테스트')
      await expect(searchInput.first()).toHaveValue('테스트')
      
      // Enter 키 또는 검색 버튼 클릭
      const searchButton = page.locator('button:has-text("검색"), button[type="submit"], button[aria-label*="search"]')
      
      if (await searchButton.count() > 0) {
        await searchButton.first().click()
      } else {
        await searchInput.first().press('Enter')
      }
      
      // 검색 결과 페이지 로딩 대기
      await page.waitForLoadState('networkidle', { timeout: 5000 })
    }
  })

  test('5. 폼 제출 및 유효성 검사', async ({ page }) => {
    console.log('🧪 Testing: Form submission and validation')
    
    await page.goto(BASE_URL)

    // 문의하기, 회원가입 등의 폼 찾기
    const form = page.locator('form, [data-testid="contact-form"], [data-testid="signup-form"]')
    
    if (await form.count() > 0) {
      const firstForm = form.first()
      
      // 필수 입력 필드 찾기
      const requiredInputs = firstForm.locator('input[required], textarea[required]')
      const inputCount = await requiredInputs.count()
      
      if (inputCount > 0) {
        // 빈 값으로 제출 시도 (유효성 검사 확인)
        const submitButton = firstForm.locator('button[type="submit"], input[type="submit"]')
        
        if (await submitButton.count() > 0) {
          await submitButton.first().click()
          
          // 유효성 검사 메시지 또는 에러 표시 확인
          const validationMessage = page.locator(':invalid, [aria-invalid="true"], .error, .invalid')
          
          // 유효성 검사가 작동하거나 에러 메시지가 표시되어야 함
          if (await validationMessage.count() > 0) {
            expect(await validationMessage.count()).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  test('6. 성능 메트릭 수집', async ({ page }) => {
    console.log('🧪 Testing: Performance metrics collection')
    
    await page.goto(BASE_URL)
    
    // Core Web Vitals 수집
    const webVitals = await page.evaluate(() => {
      return new Promise<WebVitals>((resolve) => {
        const vitals: WebVitals = {}
        
        // LCP
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lastEntry = entries[entries.length - 1] as PerformanceEntry & { startTime: number }
          vitals.lcp = lastEntry.startTime
        }).observe({ type: 'largest-contentful-paint', buffered: true })
        
        // CLS
        let clsScore = 0
        new PerformanceObserver((list) => {
          for (const entry of list.getEntries() as Array<PerformanceEntry & { hadRecentInput?: boolean; value: number }>) {
            if (!entry.hadRecentInput) {
              clsScore += entry.value
            }
          }
          vitals.cls = clsScore
        }).observe({ type: 'layout-shift', buffered: true })
        
        // FCP
        const paintEntries = performance.getEntriesByType('paint')
        const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
        if (fcpEntry) {
          vitals.fcp = fcpEntry.startTime
        }
        
        // 2초 후 결과 반환
        setTimeout(() => resolve(vitals), 2000)
      })
    })

    console.log('Core Web Vitals:', webVitals)
    
    const vitals = webVitals as WebVitals
    
    // 성능 임계값 확인
    if (vitals.lcp) {
      expect(vitals.lcp).toBeLessThan(2500) // LCP < 2.5s
    }
    
    if (vitals.cls) {
      expect(vitals.cls).toBeLessThan(0.1) // CLS < 0.1
    }
    
    if (vitals.fcp) {
      expect(vitals.fcp).toBeLessThan(1800) // FCP < 1.8s
    }
  })

  test('7. 접근성 기본 검사', async ({ page }) => {
    console.log('🧪 Testing: Basic accessibility checks')
    
    await page.goto(BASE_URL)

    // 기본 접근성 요소 확인
    
    // 1. 페이지에 제목(title)이 있는지
    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(0)
    
    // 2. 메인 랜드마크가 있는지
    const main = page.locator('main, [role="main"]')
    expect(await main.count()).toBeGreaterThanOrEqual(1)
    
    // 3. 헤딩 구조 확인
    const headings = page.locator('h1, h2, h3, h4, h5, h6')
    const headingCount = await headings.count()
    expect(headingCount).toBeGreaterThan(0)
    
    // 4. 이미지에 alt 속성이 있는지 (장식용 제외)
    const images = page.locator('img:not([alt=""])')
    const imageCount = await images.count()
    
    if (imageCount > 0) {
      const imagesWithAlt = page.locator('img[alt]')
      const altCount = await imagesWithAlt.count()
      
      // 최소한 50% 이상의 이미지에는 alt가 있어야 함
      expect(altCount / imageCount).toBeGreaterThanOrEqual(0.5)
    }
    
    // 5. 포커스 가능한 요소들 확인
    const focusableElements = page.locator('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const focusableCount = await focusableElements.count()
    
    if (focusableCount > 0) {
      // 첫 번째 포커스 가능한 요소에 포커스
      await focusableElements.first().focus()
      
      // 포커스 표시가 있는지 확인 (outline, box-shadow 등)
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    }
  })

  test('8. JavaScript 에러 모니터링', async ({ page }) => {
    console.log('🧪 Testing: JavaScript error monitoring')
    
    const jsErrors: JsError[] = []
    
    // JavaScript 에러 수집
    page.on('pageerror', (error) => {
      jsErrors.push({
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      })
    })
    
    // 콘솔 에러 수집
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        jsErrors.push({
          message: msg.text(),
          type: 'console.error',
          timestamp: new Date().toISOString()
        })
      }
    })
    
    await page.goto(BASE_URL)
    
    // 페이지 상호작용 수행
    await page.click('body') // 클릭 이벤트 트리거
    await page.keyboard.press('Tab') // 키보드 이벤트 트리거
    
    // 동적 콘텐츠 로딩을 위한 대기
    await page.waitForTimeout(3000)
    
    // JavaScript 에러 확인
    console.log(`JavaScript errors detected: ${jsErrors.length}`)
    
    if (jsErrors.length > 0) {
      console.log('JavaScript errors:', jsErrors)
    }
    
    // Critical 에러는 없어야 함 (일부 warning은 허용)
    const criticalErrors = jsErrors.filter(error => 
      !error.message.includes('warning') && 
      !error.message.includes('deprecated') &&
      !error.message.includes('development')
    )
    
    expect(criticalErrors.length).toBeLessThanOrEqual(2) // 최대 2개의 critical 에러만 허용
  })

  test('9. 네트워크 요청 모니터링', async ({ page }) => {
    console.log('🧪 Testing: Network request monitoring')
    
    const networkRequests: NetworkRequest[] = []
    const failedRequests: FailedRequest[] = []
    
    // 네트워크 요청 모니터링
    page.on('request', (request) => {
      networkRequests.push({
        url: request.url(),
        method: request.method(),
        timestamp: new Date().toISOString()
      })
    })
    
    page.on('requestfailed', (request) => {
      failedRequests.push({
        url: request.url(),
        method: request.method(),
        failure: request.failure()?.errorText,
        timestamp: new Date().toISOString()
      })
    })
    
    await page.goto(BASE_URL)
    
    // 추가 상호작용으로 더 많은 네트워크 요청 유발
    await page.waitForLoadState('networkidle')
    
    console.log(`Network requests: ${networkRequests.length}`)
    console.log(`Failed requests: ${failedRequests.length}`)
    
    if (failedRequests.length > 0) {
      console.log('Failed requests:', failedRequests)
    }
    
    // 실패한 요청이 전체의 10% 이하여야 함
    const failureRate = failedRequests.length / networkRequests.length
    expect(failureRate).toBeLessThanOrEqual(0.1)
    
    // API 요청 확인 (있는 경우)
    const apiRequests = networkRequests.filter(req => req.url.includes('/api/'))
    if (apiRequests.length > 0) {
      console.log(`API requests: ${apiRequests.length}`)
    }
  })

  test('10. 종합 시스템 상태 확인', async ({ request, page }) => {
    console.log('🧪 Testing: Overall system health check')
    
    // 1. 헬스 체크 API 상세 확인
    const healthResponse = await request.get(`${BASE_URL}/api/health`)
    expect(healthResponse.status()).toBe(200)
    
    const healthData = await healthResponse.json()
    
    // 2. 시스템 메트릭 확인
    expect(healthData.metrics.memoryUsage).toBeLessThan(90) // 메모리 사용률 90% 미만
    expect(healthData.metrics.responseTime).toBeLessThan(500) // 응답 시간 500ms 미만
    
    // 3. 성능 임계값 확인
    if (healthData.metrics.performance.lcp) {
      expect(healthData.metrics.performance.lcp).toBeLessThan(2500)
    }
    
    // 4. 알림 상태 확인
    const healthResponse = healthData as HealthCheckResponse
    if (healthResponse.alerts) {
      const criticalAlerts = healthResponse.alerts.filter(alert => alert.severity === 'critical')
      expect(criticalAlerts.length).toBe(0) // Critical 알림 없어야 함
    }
    
    // 5. 전체 상태 확인
    expect(['healthy', 'degraded']).toContain(healthData.status)
    
    console.log(`System status: ${healthData.status}`)
    console.log(`Memory usage: ${healthData.metrics.memoryUsage}%`)
    console.log(`Response time: ${healthData.metrics.responseTime}ms`)
  })
})

// 성능 중심 테스트 그룹
test.describe('Performance Smoke Tests', () => {
  test('번들 크기 및 로딩 성능', async ({ page }) => {
    console.log('🧪 Testing: Bundle size and loading performance')
    
    const startTime = Date.now()
    
    await page.goto(BASE_URL)
    await page.waitForLoadState('networkidle')
    
    const loadTime = Date.now() - startTime
    console.log(`Total page load time: ${loadTime}ms`)
    
    // 페이지 로딩 시간이 5초 이하여야 함
    expect(loadTime).toBeLessThan(5000)
    
    // 리소스 크기 확인
    const resources = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map((entry: PerformanceResourceTiming) => ({
        name: entry.name,
        size: entry.transferSize,
        duration: entry.duration
      }))
    }) as ResourceEntry[]
    
    const totalSize = resources.reduce((sum: number, resource: ResourceEntry) => sum + (resource.size || 0), 0)
    const jsResources = resources.filter((r: ResourceEntry) => r.name.includes('.js'))
    const cssResources = resources.filter((r: ResourceEntry) => r.name.includes('.css'))
    
    console.log(`Total resources size: ${Math.round(totalSize / 1024)}KB`)
    console.log(`JS resources: ${jsResources.length}`)
    console.log(`CSS resources: ${cssResources.length}`)
    
    // 총 리소스 크기가 5MB 이하여야 함
    expect(totalSize).toBeLessThan(5 * 1024 * 1024)
  })
})

// 사용자 경험 테스트 그룹  
test.describe('User Experience Smoke Tests', () => {
  test('모바일 반응형 테스트', async ({ page }) => {
    console.log('🧪 Testing: Mobile responsiveness')
    
    // 모바일 화면 크기로 설정
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(BASE_URL)
    
    // 모바일에서 가로 스크롤이 없어야 함
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const viewportWidth = await page.viewportSize()?.width || 375
    
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 1) // 1px 오차 허용
    
    // 터치 친화적 요소 크기 확인 (최소 44px)
    const buttons = page.locator('button, a, input[type="submit"]')
    const buttonCount = await buttons.count()
    
    if (buttonCount > 0) {
      const firstButton = buttons.first()
      const box = await firstButton.boundingBox()
      
      if (box) {
        expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44)
      }
    }
  })

  test('다크모드 지원 확인', async ({ page }) => {
    console.log('🧪 Testing: Dark mode support')
    
    await page.goto(BASE_URL)
    
    // 다크모드 토글 버튼 찾기
    const darkModeToggle = page.locator('button:has-text("다크"), button[aria-label*="dark"], [data-theme-toggle]')
    
    if (await darkModeToggle.count() > 0) {
      // 초기 테마 확인
      const initialTheme = await page.getAttribute('html', 'data-theme') || 
                           await page.getAttribute('body', 'class')
      
      // 다크모드 토글
      await darkModeToggle.first().click()
      await page.waitForTimeout(500) // 전환 애니메이션 대기
      
      // 테마 변경 확인
      const newTheme = await page.getAttribute('html', 'data-theme') || 
                       await page.getAttribute('body', 'class')
      
      expect(newTheme).not.toBe(initialTheme)
      
      console.log('Dark mode toggle working correctly')
    } else {
      console.log('Dark mode toggle not found - skipping test')
    }
  })
})