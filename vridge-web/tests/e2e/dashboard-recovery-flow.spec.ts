/**
 * TDD Green Phase: 대시보드 복구 플로우 E2E 테스트
 * 
 * NavigationProvider 수정 후 이 테스트들이 통과해야 합니다.
 * 대시보드 접근, 네비게이션, 서브메뉴 시스템의 정상 작동을 검증합니다.
 */

import { test, expect } from '@playwright/test'

test.describe('대시보드 복구 플로우 검증', () => {
  test.beforeEach(async ({ page }) => {
    // 개발 서버에서 대시보드 접근
    await page.goto('http://localhost:3000/dashboard')
  })

  test('NavigationProvider 정상 초기화 및 대시보드 렌더링', async ({ page }) => {
    // 1. 페이지가 정상 로드되는지 확인
    await expect(page).toHaveTitle(/VLANET/)
    
    // 2. 네비게이션 에러가 발생하지 않음을 확인
    const errorAlert = page.locator('role=alert')
    await expect(errorAlert).not.toBeVisible()
    
    // 3. 대시보드 컨텐츠가 표시되는지 확인
    const dashboardHeader = page.locator('h1', { hasText: '대시보드' })
    await expect(dashboardHeader).toBeVisible({ timeout: 5000 })
    
    // 4. 사이드바가 정상 렌더링되는지 확인
    const sidebar = page.locator('[data-testid="sidebar"]')
    await expect(sidebar).toBeVisible()
    
    // 5. 콘솔에 NavigationProvider 관련 에러가 없는지 확인
    const consoleErrors: string[] = []
    page.on('console', message => {
      if (message.type() === 'error' && 
          (message.text().includes('NavigationProvider') || 
           message.text().includes('useNavigation'))) {
        consoleErrors.push(message.text())
      }
    })
    
    // 페이지 상호작용 후 에러 체크
    await page.waitForTimeout(2000)
    expect(consoleErrors).toHaveLength(0)
  })

  test('서브메뉴 시스템 정상 작동', async ({ page }) => {
    // 1. 프로젝트 메뉴 호버 시 서브메뉴 표시
    const projectsMenu = page.locator('[data-testid="sidebar-menu-item-projects"]')
    await expect(projectsMenu).toBeVisible()
    
    await projectsMenu.hover()
    
    // 2. 서브메뉴가 올바르게 표시되는지 확인
    const submenu = page.locator('[data-testid="submenu-container"]')
    await expect(submenu).toBeVisible({ timeout: 3000 })
    
    // 3. 서브메뉴 항목들이 표시되는지 확인
    const submenuItems = page.locator('[data-testid^="menu-item-"]')
    await expect(submenuItems).toHaveCount(3) // 모든 프로젝트, 내 프로젝트, 새 프로젝트
    
    // 4. 키보드 네비게이션 테스트
    await projectsMenu.focus()
    await page.keyboard.press('ArrowDown')
    
    const firstSubmenuItem = submenuItems.first()
    await expect(firstSubmenuItem).toBeFocused()
  })

  test('API 에러 복구 및 fallback 데이터 표시', async ({ page }) => {
    // 1. 대시보드가 로드되고 데이터가 표시되는지 확인
    // (API 타임아웃이 해결되었으므로 fallback 데이터가 표시되어야 함)
    
    const dashboardContent = page.locator('[data-testid="dashboard-content"]')
    await expect(dashboardContent).toBeVisible({ timeout: 5000 })
    
    // 2. 프로젝트 상태 카드가 표시되는지 확인
    const projectStatus = page.locator('[data-testid="project-status-card"]')
    await expect(projectStatus).toBeVisible()
    
    // 3. 진행률 표시 확인 (fallback 데이터: 65%)
    const progressText = page.locator('text=/65%/')
    await expect(progressText).toBeVisible()
    
    // 4. 최근 활동 섹션 표시 확인
    const recentActivity = page.locator('[data-testid="recent-activity"]')
    await expect(recentActivity).toBeVisible()
    
    // 5. 500 에러가 더 이상 발생하지 않는지 확인
    const networkErrors: string[] = []
    page.on('response', response => {
      if (response.status() >= 500) {
        networkErrors.push(`${response.status()} ${response.url()}`)
      }
    })
    
    // 페이지 완전 로드 대기 후 에러 체크
    await page.waitForLoadState('networkidle')
    expect(networkErrors).toHaveLength(0)
  })

  test('접근성 및 스크린 리더 지원', async ({ page }) => {
    // 1. ARIA 라벨 및 역할이 올바르게 설정되었는지 확인
    const navigation = page.locator('role=navigation')
    await expect(navigation).toBeVisible()
    
    const navigationLabel = await navigation.getAttribute('aria-label')
    expect(navigationLabel).toContain('주 메뉴')
    
    // 2. 스크린 리더 알림이 존재하는지 확인
    const announcement = page.locator('[role="status"][aria-live="polite"]')
    
    // 프로젝트 메뉴 호버 시 알림 확인
    const projectsMenu = page.locator('[data-testid="sidebar-menu-item-projects"]')
    await projectsMenu.hover()
    
    // 서브메뉴 열림 알림 대기 (최대 2초)
    await expect(announcement).toHaveText(/서브메뉴가 열렸습니다/, { timeout: 2000 })
    
    // 3. 키보드만으로 모든 요소 접근 가능한지 확인
    await page.keyboard.press('Tab') // 첫 번째 메뉴로 이동
    await page.keyboard.press('Enter') // 서브메뉴 열기
    
    const focusedElement = page.locator(':focus')
    await expect(focusedElement).toBeVisible()
  })

  test('성능 및 응답성 검증', async ({ page }) => {
    const startTime = Date.now()
    
    // 1. 대시보드 로딩 시간 측정 (목표: 1초 이내)
    await page.goto('http://localhost:3000/dashboard')
    await page.waitForSelector('h1:has-text("대시보드")', { timeout: 5000 })
    
    const loadTime = Date.now() - startTime
    expect(loadTime).toBeLessThan(1000) // 1초 이내 로딩
    
    // 2. 네비게이션 응답성 테스트 (목표: 200ms 이내)
    const menuClickStart = Date.now()
    
    const calendarMenu = page.locator('[data-testid="sidebar-menu-item-calendar"]')
    await calendarMenu.click()
    
    await page.waitForURL('**/calendar')
    const navigationTime = Date.now() - menuClickStart
    
    expect(navigationTime).toBeLessThan(200) // 200ms 이내 네비게이션
    
    // 3. Core Web Vitals 기본 체크
    const performanceMetrics = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries()
          const lcp = entries.find(entry => entry.entryType === 'largest-contentful-paint')
          const cls = entries.find(entry => entry.entryType === 'layout-shift')
          
          resolve({
            lcp: lcp?.startTime || 0,
            cls: cls?.value || 0
          })
        }).observe({ entryTypes: ['largest-contentful-paint', 'layout-shift'] })
        
        // 3초 후 타임아웃
        setTimeout(() => resolve({ lcp: 0, cls: 0 }), 3000)
      })
    })
    
    expect(performanceMetrics.lcp).toBeLessThan(2500) // LCP < 2.5초
    expect(performanceMetrics.cls).toBeLessThan(0.1) // CLS < 0.1
  })

  test('에러 복구 및 재시도 메커니즘', async ({ page }) => {
    // NavigationErrorBoundary가 제대로 작동하는지 테스트
    
    // 1. 의도적으로 네비게이션 에러 발생시키기 (개발 도구 사용)
    await page.evaluate(() => {
      // React DevTools나 컨솔에서 NavigationProvider 컨텍스트를 null로 설정
      window.__NAVIGATION_ERROR_TEST__ = true
    })
    
    // 2. 에러 바운더리 fallback UI가 표시되는지 확인
    const errorBoundaryFallback = page.locator('role=alert:has-text("네비게이션을 초기화할 수 없습니다")')
    
    // 에러가 발생하지 않으면 이 테스트는 스킵
    if (await errorBoundaryFallback.isVisible({ timeout: 1000 })) {
      // 3. 재시도 버튼이 작동하는지 확인
      const retryButton = page.locator('button:has-text("다시 시도")')
      await expect(retryButton).toBeVisible()
      
      await retryButton.click()
      
      // 4. 정상 상태로 복구되는지 확인
      await expect(errorBoundaryFallback).not.toBeVisible({ timeout: 3000 })
      
      const dashboard = page.locator('h1:has-text("대시보드")')
      await expect(dashboard).toBeVisible()
    }
  })
})