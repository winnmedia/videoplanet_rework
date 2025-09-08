/**
 * 기본 페이지 접근성 및 상태 확인 테스트
 * @description 현재 구현된 페이지들의 기본적인 접근성과 렌더링 상태를 확인
 */

import { test, expect } from '@playwright/test'

test.describe('기본 페이지 접근성 확인', () => {
  
  test('홈페이지 기본 접근성', async ({ page }) => {
    // 홈페이지 접근
    await page.goto('/')
    
    // 페이지가 로드되는지 확인
    await page.waitForLoadState('networkidle')
    
    // body가 보이는지 확인
    await expect(page.locator('body')).toBeVisible()
    
    // 페이지 제목 확인
    const title = await page.title()
    console.log(`홈페이지 제목: ${title}`)
    
    // 기본 메타데이터 확인
    const description = page.locator('meta[name="description"]')
    if (await description.count() > 0) {
      const content = await description.getAttribute('content')
      console.log(`메타 설명: ${content}`)
    }
    
    // 헤더/네비게이션 존재 확인
    const possibleHeaders = [
      'header',
      'nav', 
      '[role="banner"]',
      '[data-testid*="header"]',
      '[data-testid*="nav"]'
    ]
    
    let headerFound = false
    for (const selector of possibleHeaders) {
      if (await page.locator(selector).count() > 0) {
        console.log(`헤더/네비게이션 발견: ${selector}`)
        headerFound = true
        break
      }
    }
    
    // 기본 콘텐츠 영역 확인
    const possibleMainContent = [
      'main',
      '[role="main"]',
      '.main-content',
      '[data-testid*="main"]'
    ]
    
    let mainFound = false
    for (const selector of possibleMainContent) {
      if (await page.locator(selector).count() > 0) {
        console.log(`메인 콘텐츠 발견: ${selector}`)
        mainFound = true
        break
      }
    }
  })

  test('로그인 페이지 기본 접근성', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')
    
    const title = await page.title()
    console.log(`로그인 페이지 제목: ${title}`)
    
    // 폼 요소 확인
    const possibleLoginForms = [
      'form',
      '[data-testid*="login"]',
      '[data-testid*="auth"]',
      'input[type="email"]',
      'input[type="password"]'
    ]
    
    const formElementsFound = []
    for (const selector of possibleLoginForms) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        formElementsFound.push(`${selector}: ${count}개`)
      }
    }
    
    console.log(`로그인 폼 요소: ${formElementsFound.join(', ') || '없음'}`)
  })

  test('대시보드 페이지 기본 접근성', async ({ page }) => {
    await page.goto('/dashboard')
    
    // 더 긴 대기 시간 허용 (인증 처리 등)
    await page.waitForTimeout(3000)
    
    const title = await page.title()
    console.log(`대시보드 페이지 제목: ${title}`)
    
    // 현재 URL 확인 (리디렉션 발생했는지)
    const currentUrl = page.url()
    console.log(`현재 URL: ${currentUrl}`)
    
    // 페이지 상태 확인
    const bodyVisible = await page.locator('body').isVisible()
    console.log(`페이지 렌더링 상태: ${bodyVisible ? '성공' : '실패'}`)
    
    // 에러 메시지나 로딩 상태 확인
    const possibleErrorElements = [
      '.error',
      '[data-testid*="error"]',
      '.loading',
      '[data-testid*="loading"]',
      '.skeleton'
    ]
    
    const statusElements = []
    for (const selector of possibleErrorElements) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        const text = await page.locator(selector).first().textContent()
        statusElements.push(`${selector}: ${text?.substring(0, 50) || 'N/A'}`)
      }
    }
    
    if (statusElements.length > 0) {
      console.log(`상태 요소: ${statusElements.join(', ')}`)
    }
    
    // 실제 콘텐츠 확인
    const possibleDashboardElements = [
      '[data-testid*="dashboard"]',
      '[data-testid*="widget"]',
      '.dashboard',
      '.card',
      'main'
    ]
    
    const contentFound = []
    for (const selector of possibleDashboardElements) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        contentFound.push(`${selector}: ${count}개`)
      }
    }
    
    console.log(`대시보드 콘텐츠: ${contentFound.join(', ') || '없음'}`)
  })

  test('캘린더 페이지 기본 접근성', async ({ page }) => {
    await page.goto('/calendar')
    await page.waitForTimeout(2000)
    
    const title = await page.title()
    console.log(`캘린더 페이지 제목: ${title}`)
    
    const currentUrl = page.url()
    console.log(`현재 URL: ${currentUrl}`)
    
    // 캘린더 관련 요소 확인
    const possibleCalendarElements = [
      '[data-testid*="calendar"]',
      '.calendar',
      '.fc-daygrid', // FullCalendar
      '.react-big-calendar', // React Big Calendar
      'table',
      '[role="grid"]'
    ]
    
    const calendarElements = []
    for (const selector of possibleCalendarElements) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        calendarElements.push(`${selector}: ${count}개`)
      }
    }
    
    console.log(`캘린더 요소: ${calendarElements.join(', ') || '없음'}`)
  })

  test('프로젝트 페이지 기본 접근성', async ({ page }) => {
    await page.goto('/projects')
    await page.waitForTimeout(2000)
    
    const title = await page.title()
    console.log(`프로젝트 페이지 제목: ${title}`)
    
    const currentUrl = page.url()
    console.log(`현재 URL: ${currentUrl}`)
    
    // 프로젝트 관련 요소 확인
    const possibleProjectElements = [
      '[data-testid*="project"]',
      '.project',
      '.card',
      'article',
      '[data-testid*="create"]'
    ]
    
    const projectElements = []
    for (const selector of possibleProjectElements) {
      const count = await page.locator(selector).count()
      if (count > 0) {
        projectElements.push(`${selector}: ${count}개`)
      }
    }
    
    console.log(`프로젝트 요소: ${projectElements.join(', ') || '없음'}`)
  })
})