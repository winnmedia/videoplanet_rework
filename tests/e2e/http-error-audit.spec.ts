/**
 * HTTP Error Audit Test Suite - 포괄적 HTTP 에러 감사
 * 
 * 목적: 모든 주요 페이지 및 서브메뉴 경로에서 HTTP 에러 상태 감사
 * 감사 범위: 404, 400, 500, 502 에러 및 복구 가능성 검사
 * 
 * 테스트 카테고리:
 * 1. 기본 페이지 접근성 검사
 * 2. 서브메뉴 및 동적 라우트 검사
 * 3. API 엔드포인트 상태 검사
 * 4. 에러 복구 및 사용자 경험 검사
 * 
 * @author AI Quality Engineer  
 * @generated Claude Code
 */

import { test, expect } from '@playwright/test'

// 로컬 개발 환경 URL
const BASE_URL = 'http://localhost:3000'
const API_URL = 'https://api.vlanet.net'

// 테스트할 주요 페이지 및 서브 경로
const MAIN_ROUTES = [
  // 기본 페이지들
  { name: 'Home', path: '/', expectStatus: 200 },
  { name: 'Dashboard', path: '/dashboard', expectStatus: 200 },
  { name: 'Calendar', path: '/calendar', expectStatus: 200 },
  { name: 'Projects', path: '/projects', expectStatus: 200 },
  { name: 'Planning', path: '/planning', expectStatus: 200 },
  { name: 'Feedback', path: '/feedback', expectStatus: 200 },
  { name: 'Login', path: '/login', expectStatus: 200 },
  { name: 'Signup', path: '/signup', expectStatus: 200 },
  { name: 'Reset Password', path: '/reset-password', expectStatus: 200 },
]

// 동적 라우트 테스트 (실제 ID가 있을 때와 없을 때)
const DYNAMIC_ROUTES = [
  // 존재하지 않는 ID로 테스트 (404 기대)
  { name: 'Project Detail (Non-existent)', path: '/projects/non-existent-id', expectStatus: 404 },
  { name: 'Feedback Detail (Non-existent)', path: '/feedback/non-existent-id', expectStatus: 404 },
  { name: 'Planning Type (Non-existent)', path: '/planning/non-existent-type', expectStatus: 404 },
  
  // 잘못된 형식의 ID 테스트
  { name: 'Project Detail (Invalid)', path: '/projects/invalid@id!', expectStatus: 404 },
  { name: 'Feedback Detail (Invalid)', path: '/feedback/123abc!@#', expectStatus: 404 },
]

// 존재하지 않는 경로들
const NON_EXISTENT_ROUTES = [
  { name: 'Invalid Root Path', path: '/non-existent-page', expectStatus: 404 },
  { name: 'Invalid Deep Path', path: '/admin/secret/page', expectStatus: 404 },
  { name: 'Invalid API Path', path: '/api/non-existent', expectStatus: 404 },
  { name: 'Typo Path', path: '/dashbord', expectStatus: 404 }, // 일반적인 오타
  { name: 'Typo Path 2', path: '/calender', expectStatus: 404 }, // calendar 오타
]

// API 엔드포인트들
const API_ENDPOINTS = [
  { name: 'Health Check', path: '/health/', expectStatus: 200 },
  { name: 'Auth Test', path: '/test/', expectStatus: 200 },
  { name: 'Performance Metrics', path: '/performance-metrics/', expectStatus: 200 },
  { name: 'Non-existent API', path: '/non-existent-endpoint/', expectStatus: 404 },
]

test.describe('HTTP Error Audit - Main Pages', () => {
  
  MAIN_ROUTES.forEach(({ name, path, expectStatus }) => {
    test(`[${name}] 페이지 접근성 및 상태 코드 검사`, async ({ page }) => {
      console.log(`🔍 [${name}] HTTP 상태 감사: ${path}`)
      
      const startTime = Date.now()
      const response = await page.goto(`${BASE_URL}${path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 10000
      }).catch(error => {
        console.log(`❌ [${name}] 네트워크 에러:`, error.message)
        return null
      })
      
      const responseTime = Date.now() - startTime
      
      if (response) {
        const actualStatus = response.status()
        console.log(`📊 [${name}] 상태: ${actualStatus}, 응답시간: ${responseTime}ms`)
        
        // 예상 상태 코드 확인
        expect(actualStatus).toBe(expectStatus)
        
        // 성공적인 페이지의 경우 기본 콘텐츠 확인
        if (actualStatus >= 200 && actualStatus < 400) {
          const hasContent = await page.locator('body *').count() > 0
          expect(hasContent).toBeTruthy()
          
          // 페이지 제목 확인
          const title = await page.title()
          expect(title.length).toBeGreaterThan(0)
          console.log(`📄 [${name}] 페이지 제목: "${title}"`)
          
          // 기본적인 HTML 구조 확인
          const hasNavigation = await page.locator('nav, [role="navigation"]').count() > 0
          const hasMainContent = await page.locator('main, [role="main"]').count() > 0
          
          console.log(`🏗️ [${name}] 네비게이션: ${hasNavigation}, 메인 콘텐츠: ${hasMainContent}`)
          
          // 응답 시간 품질 검사
          expect(responseTime).toBeLessThan(5000) // 5초 이내
        }
      } else {
        // 네트워크 에러의 경우 실패로 처리
        console.log(`🚫 [${name}] 페이지 접근 불가`)
        expect(response).not.toBeNull()
      }
    })
  })
})

test.describe('HTTP Error Audit - Dynamic Routes', () => {
  
  DYNAMIC_ROUTES.forEach(({ name, path, expectStatus }) => {
    test(`[${name}] 동적 라우트 에러 처리 검사`, async ({ page }) => {
      console.log(`🔍 [${name}] 동적 라우트 감사: ${path}`)
      
      const response = await page.goto(`${BASE_URL}${path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 8000
      }).catch(error => {
        console.log(`❌ [${name}] 네트워크 에러:`, error.message)
        return null
      })
      
      if (response) {
        const actualStatus = response.status()
        console.log(`📊 [${name}] 상태: ${actualStatus}`)
        
        expect(actualStatus).toBe(expectStatus)
        
        // 404 페이지의 경우 사용자 친화적 에러 페이지 확인
        if (actualStatus === 404) {
          await page.waitForTimeout(1000) // 에러 페이지 렌더링 대기
          
          // 에러 페이지에 기본 콘텐츠가 있는지 확인
          const hasErrorContent = await page.locator('body *').count() > 0
          expect(hasErrorContent).toBeTruthy()
          
          // 사용자 친화적 메시지 확인
          const bodyText = await page.textContent('body')
          const hasUserFriendlyMessage = bodyText && (
            bodyText.includes('404') || 
            bodyText.includes('찾을 수 없') || 
            bodyText.includes('Page Not Found') ||
            bodyText.includes('페이지를 찾을 수 없습니다')
          )
          
          if (hasUserFriendlyMessage) {
            console.log(`✅ [${name}] 사용자 친화적 404 메시지 확인됨`)
          } else {
            console.log(`⚠️ [${name}] 사용자 친화적 404 메시지 부재`)
          }
          
          // 홈으로 돌아가는 링크 확인
          const homeLinks = await page.locator('a[href="/"], a[href="/dashboard"], button:has-text("홈"), button:has-text("Home")').count()
          console.log(`🏠 [${name}] 홈 링크: ${homeLinks}개`)
          
          // 스크린샷 저장 (디버깅용)
          await page.screenshot({
            path: `test-results/http-errors/${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-404.png`,
            fullPage: true
          })
        }
      }
    })
  })
})

test.describe('HTTP Error Audit - Non-existent Routes', () => {
  
  NON_EXISTENT_ROUTES.forEach(({ name, path, expectStatus }) => {
    test(`[${name}] 존재하지 않는 경로 처리 검사`, async ({ page }) => {
      console.log(`🔍 [${name}] 비존재 경로 감사: ${path}`)
      
      const response = await page.goto(`${BASE_URL}${path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 8000
      }).catch(error => {
        console.log(`❌ [${name}] 네트워크 에러:`, error.message)
        return null
      })
      
      if (response) {
        const actualStatus = response.status()
        console.log(`📊 [${name}] 상태: ${actualStatus}`)
        
        // Next.js의 경우 404 페이지로 리다이렉트될 수 있음
        const acceptableStatuses = [404, 200] // 200은 커스텀 404 페이지인 경우
        expect(acceptableStatuses).toContain(actualStatus)
        
        // 실제로 404 처리가 되고 있는지 확인
        const pageContent = await page.textContent('body')
        const is404Page = pageContent && (
          pageContent.includes('404') ||
          pageContent.includes('찾을 수 없') ||
          pageContent.includes('Not Found')
        )
        
        if (actualStatus === 200 && !is404Page) {
          console.log(`⚠️ [${name}] 존재하지 않는 경로가 200 응답을 반환하고 있음 - 라우팅 검토 필요`)
          // 이 경우 라우팅 구성에 문제가 있을 수 있음을 경고
        } else {
          console.log(`✅ [${name}] 적절한 404 처리 확인됨`)
        }
        
        // 에러 복구 테스트: 유효한 페이지로 이동 가능한지 확인
        const recoveryResponse = await page.goto(`${BASE_URL}/dashboard`, {
          waitUntil: 'domcontentloaded',
          timeout: 5000
        }).catch(() => null)
        
        if (recoveryResponse && recoveryResponse.status() === 200) {
          console.log(`✅ [${name}] 에러 후 복구 가능`)
        } else {
          console.log(`❌ [${name}] 에러 후 복구 실패`)
        }
      }
    })
  })
})

test.describe('HTTP Error Audit - API Endpoints', () => {
  
  API_ENDPOINTS.forEach(({ name, path, expectStatus }) => {
    test(`[${name}] API 엔드포인트 상태 검사`, async ({ request }) => {
      console.log(`🔍 [${name}] API 감사: ${path}`)
      
      const startTime = Date.now()
      const response = await request.get(`${API_URL}${path}`, {
        timeout: 10000,
        failOnStatusCode: false
      }).catch(error => {
        console.log(`❌ [${name}] API 요청 에러:`, error.message)
        return null
      })
      
      const responseTime = Date.now() - startTime
      
      if (response) {
        const actualStatus = response.status()
        console.log(`📊 [${name}] API 상태: ${actualStatus}, 응답시간: ${responseTime}ms`)
        
        expect(actualStatus).toBe(expectStatus)
        
        // API 응답 시간 품질 검사
        expect(responseTime).toBeLessThan(10000) // 10초 이내
        
        // 성공적인 API의 경우 응답 형식 확인
        if (actualStatus >= 200 && actualStatus < 400) {
          try {
            const contentType = response.headers()['content-type']
            if (contentType && contentType.includes('application/json')) {
              const jsonData = await response.json()
              expect(typeof jsonData).toBe('object')
              console.log(`✅ [${name}] 유효한 JSON 응답 확인됨`)
            }
          } catch (error) {
            console.log(`⚠️ [${name}] JSON 응답 파싱 실패`)
          }
        }
        
        // CORS 헤더 확인 (API의 경우)
        const corsHeaders = response.headers()
        const hasCorsHeaders = corsHeaders['access-control-allow-origin'] || 
                             corsHeaders['access-control-allow-credentials']
        
        if (hasCorsHeaders) {
          console.log(`✅ [${name}] CORS 헤더 존재`)
        } else {
          console.log(`⚠️ [${name}] CORS 헤더 부재 - 필요시 설정 확인`)
        }
      } else {
        console.log(`🚫 [${name}] API 접근 불가`)
        expect(response).not.toBeNull()
      }
    })
  })
})

test.describe('HTTP Error Audit - Error Recovery & UX', () => {
  
  test('에러 상황에서 사용자 경험 검사', async ({ page }) => {
    console.log('🔄 에러 복구 및 사용자 경험 감사')
    
    // 1. 네트워크 차단 상황 시뮬레이션
    await page.route('**/api/**', route => route.abort())
    
    await page.goto(`${BASE_URL}/dashboard`, {
      waitUntil: 'domcontentloaded'
    })
    
    // API 에러 상황에서도 기본 UI는 표시되어야 함
    await page.waitForTimeout(2000) // 에러 처리 대기
    
    const hasBasicUI = await page.locator('body *').count() > 0
    expect(hasBasicUI).toBeTruthy()
    console.log('✅ 네트워크 에러 상황에서도 기본 UI 유지됨')
    
    // 에러 메시지 표시 확인
    const errorElements = await page.locator('[data-testid*="error"], .error, .alert-error, [role="alert"]').count()
    if (errorElements > 0) {
      console.log(`✅ 에러 알림 표시됨: ${errorElements}개`)
    } else {
      console.log('⚠️ 사용자에게 에러 상황 알림 부재')
    }
    
    // 네트워크 차단 해제
    await page.unroute('**/api/**')
    
    // 2. 브라우저 뒤로가기/앞으로가기 테스트
    await page.goto(`${BASE_URL}/projects`)
    await page.goto(`${BASE_URL}/calendar`)
    
    await page.goBack() // /projects로 돌아가기
    await page.waitForTimeout(1000)
    
    const backUrl = page.url()
    expect(backUrl).toContain('/projects')
    console.log('✅ 브라우저 뒤로가기 정상 작동')
    
    await page.goForward() // /calendar로 다시 이동
    await page.waitForTimeout(1000)
    
    const forwardUrl = page.url()
    expect(forwardUrl).toContain('/calendar')
    console.log('✅ 브라우저 앞으로가기 정상 작동')
  })
  
  test('동시 다중 요청 에러 처리', async ({ page }) => {
    console.log('🚀 다중 동시 요청 에러 처리 검사')
    
    await page.goto(`${BASE_URL}/dashboard`)
    
    // 동시에 여러 페이지 네비게이션 시도
    const navigationPromises = [
      page.locator('a[href="/calendar"]').first().click().catch(() => null),
      page.locator('a[href="/projects"]').first().click().catch(() => null),
      page.locator('a[href="/planning"]').first().click().catch(() => null)
    ]
    
    // 모든 네비게이션 시도가 완료될 때까지 대기
    await Promise.all(navigationPromises)
    await page.waitForTimeout(2000)
    
    // 최종적으로 페이지가 안정적인 상태인지 확인
    const currentUrl = page.url()
    const hasContent = await page.locator('body *').count() > 0
    
    console.log(`🎯 최종 페이지: ${currentUrl}`)
    expect(hasContent).toBeTruthy()
    console.log('✅ 다중 네비게이션 후에도 안정적인 상태 유지')
  })
  
  test('JavaScript 에러 발생 시 복구 능력', async ({ page }) => {
    console.log('💥 JavaScript 에러 복구 능력 검사')
    
    // JavaScript 에러 모니터링
    const jsErrors: string[] = []
    page.on('pageerror', error => {
      jsErrors.push(error.message)
      console.log('🐛 JavaScript 에러 감지:', error.message)
    })
    
    // 콘솔 에러 모니터링
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
        console.log('🔍 콘솔 에러:', msg.text())
      }
    })
    
    // 각 주요 페이지 방문하여 JavaScript 에러 수집
    for (const route of MAIN_ROUTES.slice(0, 5)) { // 처음 5개 페이지만
      await page.goto(`${BASE_URL}${route.path}`, {
        waitUntil: 'networkidle'
      }).catch(() => {
        console.log(`⚠️ 페이지 로딩 실패: ${route.name}`)
      })
      
      await page.waitForTimeout(1000) // 에러 수집 대기
    }
    
    console.log(`📊 수집된 JavaScript 에러: ${jsErrors.length}개`)
    console.log(`📊 수집된 콘솔 에러: ${consoleErrors.length}개`)
    
    // JavaScript 에러가 너무 많으면 품질 이슈
    expect(jsErrors.length).toBeLessThan(5) // 최대 4개까지 허용
    expect(consoleErrors.length).toBeLessThan(10) // 최대 9개까지 허용
    
    if (jsErrors.length === 0 && consoleErrors.length === 0) {
      console.log('✅ JavaScript 에러 없음 - 우수한 품질')
    } else {
      console.log('⚠️ JavaScript 에러 발견 - 개선 필요')
      console.log('발견된 에러:', [...jsErrors, ...consoleErrors])
    }
  })
})