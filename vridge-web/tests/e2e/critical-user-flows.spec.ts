import { test, expect } from '@playwright/test'

test.describe('VRidge 핵심 사용자 플로우 - 실패 테스트 (TDD Red)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
  })

  test('서브메뉴 네비게이션 정상 작동 실패', async ({ page }) => {
    // Red: 현재 서브메뉴가 깨져있어 실패해야 함
    const sidebarMenu = page.locator('[data-testid="sidebar-menu-item"]').first()
    await sidebarMenu.click()
    
    // 서브메뉴가 표시되어야 하지만 현재는 실패
    const submenu = page.locator('[data-testid="submenu-container"]')
    await expect(submenu).toBeVisible({ timeout: 5000 })
    
    // 서브메뉴 아이템 클릭 가능해야 하지만 현재는 실패
    const submenuItem = submenu.locator('[data-testid="submenu-item"]').first()
    await expect(submenuItem).toBeVisible()
    await submenuItem.click()
    
    // 네비게이션이 성공해야 하지만 현재는 실패
    await expect(page).toHaveURL(/\/projects|\/planning|\/feedback/)
  })

  test('프로젝트 생성 기본 CRUD 기능 실패', async ({ page }) => {
    // Red: 프로젝트 생성 버튼이 작동하지 않아 실패해야 함
    await page.goto('/projects')
    
    const createButton = page.locator('[data-testid="create-project-button"]')
    await expect(createButton).toBeVisible()
    await createButton.click()
    
    // 프로젝트 생성 페이지로 이동해야 하지만 현재는 실패
    await expect(page).toHaveURL('/projects/create')
    
    // 프로젝트 폼이 표시되어야 하지만 현재는 실패
    const projectForm = page.locator('[data-testid="create-project-form"]')
    await expect(projectForm).toBeVisible()
    
    // 폼 입력이 가능해야 하지만 현재는 실패
    await page.fill('[data-testid="project-title-input"]', '테스트 프로젝트')
    await page.fill('[data-testid="project-description-input"]', '테스트 설명')
    
    // 제출 버튼이 작동해야 하지만 현재는 실패
    await page.click('[data-testid="submit-button"]')
    await expect(page).toHaveURL('/projects')
  })

  test('API 통신 오류 시 적절한 에러 처리 실패', async ({ page }) => {
    // Red: API 오류 시 에러 처리가 없어 실패해야 함
    await page.route('/api/projects', (route) => {
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server Error' }) })
    })
    
    await page.goto('/projects')
    
    // 에러 메시지가 표시되어야 하지만 현재는 실패
    const errorMessage = page.locator('[data-testid="error-message"]')
    await expect(errorMessage).toBeVisible({ timeout: 10000 })
    await expect(errorMessage).toContainText('프로젝트를 불러올 수 없습니다')
    
    // 재시도 버튼이 있어야 하지만 현재는 실패
    const retryButton = page.locator('[data-testid="retry-button"]')
    await expect(retryButton).toBeVisible()
  })

  test('키보드 네비게이션 접근성 실패', async ({ page }) => {
    // Red: 키보드 네비게이션이 작동하지 않아 실패해야 함
    await page.keyboard.press('Tab')
    
    // 첫 번째 포커스 가능한 요소에 포커스가 있어야 하지만 실패
    const firstFocusable = page.locator('[tabindex="0"], button, a, input').first()
    await expect(firstFocusable).toBeFocused()
    
    // Tab으로 네비게이션이 가능해야 하지만 실패
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    
    // Enter로 버튼 클릭이 가능해야 하지만 실패
    await page.keyboard.press('Enter')
    
    // ARIA 레이블이 올바르게 설정되어야 하지만 실패
    const createProjectButton = page.locator('[data-testid="create-project-button"]')
    await expect(createProjectButton).toHaveAttribute('aria-label')
  })

  test('모바일 반응형 레이아웃 실패', async ({ page }) => {
    // Red: 모바일 레이아웃이 깨져 실패해야 함
    await page.setViewportSize({ width: 375, height: 667 })
    
    // 사이드바가 모바일에서 적절히 처리되어야 하지만 실패
    const sidebar = page.locator('[data-testid="sidebar"]')
    await expect(sidebar).toHaveCSS('transform', 'translateX(-100%)')
    
    // 햄버거 메뉴가 표시되어야 하지만 실패
    const hamburgerButton = page.locator('[data-testid="hamburger-button"]')
    await expect(hamburgerButton).toBeVisible()
    
    // 메뉴 토글이 작동해야 하지만 실패
    await hamburgerButton.click()
    await expect(sidebar).toHaveCSS('transform', 'translateX(0px)')
  })

  test('로딩 상태 및 성능 요구사항 실패', async ({ page }) => {
    // Red: 로딩 상태가 표시되지 않아 실패해야 함
    const response = page.waitForResponse('/api/projects')
    await page.goto('/projects')
    
    // 로딩 스피너가 표시되어야 하지만 실패
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]')
    await expect(loadingSpinner).toBeVisible()
    
    await response
    
    // 로딩 완료 후 스피너가 사라져야 하지만 실패
    await expect(loadingSpinner).not.toBeVisible()
    
    // LCP가 2.5초 이내여야 하지만 실패
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('navigation')
    })
    
    // 성능 메트릭 검증 (실패 예상)
    expect(performanceEntries[0].loadEventEnd - performanceEntries[0].fetchStart).toBeLessThan(2500)
  })

  test('버튼 및 인터페이스 요소 가시성 실패', async ({ page }) => {
    // Red: 페이지에 기능 버튼들이 없어 실패해야 함
    await page.goto('/dashboard')
    
    // QuickActions 버튼들이 표시되어야 하지만 실패
    const quickActions = page.locator('[data-testid="quick-actions"]')
    await expect(quickActions).toBeVisible()
    
    const actionButtons = quickActions.locator('button')
    await expect(actionButtons).toHaveCount(4) // 프로젝트, 기획, 캘린더, 피드백
    
    // 각 버튼이 클릭 가능해야 하지만 실패
    for (let i = 0; i < 4; i++) {
      await expect(actionButtons.nth(i)).toBeVisible()
      await expect(actionButtons.nth(i)).toBeEnabled()
    }
    
    // Dashboard 위젯들이 표시되어야 하지만 실패
    const dashboardWidgets = page.locator('[data-testid*="dashboard-widget"]')
    await expect(dashboardWidgets).toHaveCount(3, { timeout: 10000 })
  })
})