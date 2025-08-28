/**
 * Navigation E2E Test Suite
 * End-to-End 네비게이션 플로우 검증
 * 
 * 테스트 범위:
 * - SideBar 메뉴 클릭 및 페이지 이동
 * - 동적 라우트 처리
 * - 에러 페이지 처리
 * - 반응형 네비게이션
 */

import { test, expect, Page } from '@playwright/test'

// 테스트 헬퍼 함수들
async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('networkidle')
  await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 })
}

async function clickSidebarMenu(page: Page, menuId: string) {
  const menuSelector = `[data-testid="menu-${menuId}"]`
  await page.waitForSelector(menuSelector)
  await page.click(menuSelector)
}

async function verifyPageContent(page: Page, expectedTexts: string[]) {
  for (const text of expectedTexts) {
    await expect(page.locator('body')).toContainText(text)
  }
}

// 테스트 설정
test.describe('Navigation Flow E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // 로그인 상태 설정 (실제 구현에 맞게 조정)
    await page.goto('/')
    await waitForPageLoad(page)
  })

  test.describe('Direct Navigation Tests', () => {
    test('should navigate to planning page from sidebar', async ({ page }) => {
      await clickSidebarMenu(page, 'planning')
      
      // URL 확인
      await expect(page).toHaveURL('/planning')
      
      // 페이지 콘텐츠 검증
      await verifyPageContent(page, ['영상 기획', '컨셉 기획', '대본 작성'])
    })

    test('should navigate to feedback page from sidebar', async ({ page }) => {
      await clickSidebarMenu(page, 'feedback')
      
      await expect(page).toHaveURL('/feedback')
      await verifyPageContent(page, ['영상 피드백', '피드백 목록'])
    })

    test('should navigate to calendar page from sidebar', async ({ page }) => {
      await clickSidebarMenu(page, 'calendar')
      
      await expect(page).toHaveURL('/calendar')
      await verifyPageContent(page, ['전체 일정', '캘린더'])
    })

    test('should navigate to home from sidebar', async ({ page }) => {
      await clickSidebarMenu(page, 'home')
      
      await expect(page).toHaveURL('/dashboard')
      await verifyPageContent(page, ['대시보드', '프로젝트 현황'])
    })
  })

  test.describe('Project SubMenu Navigation Tests', () => {
    test('should open project submenu and navigate to project detail', async ({ page }) => {
      // 프로젝트 메뉴 클릭
      await clickSidebarMenu(page, 'projects')
      
      // 서브메뉴가 열리는지 확인
      await page.waitForSelector('[data-testid="sidebar-submenu"]', { timeout: 5000 })
      
      // 서브메뉴 내용 확인 (API 응답에 따라)
      await expect(page.locator('[data-testid="sidebar-submenu"]')).toBeVisible()
      
      // 첫 번째 프로젝트 클릭 (실제 구현에 따라 조정)
      const firstProject = page.locator('[data-testid="sidebar-submenu"] [role="menuitem"]').first()
      if (await firstProject.count() > 0) {
        await firstProject.click()
        
        // 프로젝트 상세 페이지로 이동 확인
        await expect(page.url()).toMatch(/\/projects\/\d+/)
        await verifyPageContent(page, ['프로젝트 상세 정보', '진행률'])
      }
    })

    test('should toggle project submenu on repeated clicks', async ({ page }) => {
      const projectMenu = page.locator('[data-testid="menu-projects"]')
      
      // 첫 번째 클릭: 서브메뉴 열기
      await projectMenu.click()
      await page.waitForSelector('[data-testid="sidebar-submenu"]')
      await expect(page.locator('[data-testid="sidebar-submenu"]')).toBeVisible()
      
      // 두 번째 클릭: 서브메뉴 닫기
      await projectMenu.click()
      await page.waitForTimeout(500) // 애니메이션 대기
      
      // 서브메뉴가 닫혔는지 확인 (구현에 따라 조정)
      const submenu = page.locator('[data-testid="sidebar-submenu"]')
      if (await submenu.count() > 0) {
        await expect(submenu).not.toBeVisible()
      }
    })
  })

  test.describe('Dynamic Route Tests', () => {
    test('should handle valid project ID routes', async ({ page }) => {
      // 직접 URL 접근
      await page.goto('/projects/1')
      await waitForPageLoad(page)
      
      // 페이지가 올바르게 로드되는지 확인
      await verifyPageContent(page, ['웹사이트 리뉴얼 프로젝트', '진행률', '65%'])
      
      // 사이드바도 정상적으로 표시되는지 확인
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    })

    test('should handle valid feedback ID routes', async ({ page }) => {
      await page.goto('/feedback/1')
      await waitForPageLoad(page)
      
      await verifyPageContent(page, ['피드백', '타임코드', '00:01:23'])
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
    })

    test('should handle different project IDs correctly', async ({ page }) => {
      // 프로젝트 2 테스트
      await page.goto('/projects/2')
      await waitForPageLoad(page)
      await verifyPageContent(page, ['모바일 앱 개발', '30%'])
      
      // 프로젝트 3 테스트
      await page.goto('/projects/3')
      await waitForPageLoad(page)
      await verifyPageContent(page, ['브랜딩 영상 제작', '100%', '완료'])
    })

    test('should handle different feedback IDs correctly', async ({ page }) => {
      // 피드백 2 테스트
      await page.goto('/feedback/2')
      await waitForPageLoad(page)
      await verifyPageContent(page, ['배경 음악 볼륨', '이영희', '해결됨'])
      
      // 피드백 4 테스트
      await page.goto('/feedback/4')
      await waitForPageLoad(page)
      await verifyPageContent(page, ['전환 효과', '진행중'])
    })
  })

  test.describe('Error Handling Tests', () => {
    test('should handle invalid project ID gracefully', async ({ page }) => {
      await page.goto('/projects/999')
      await waitForPageLoad(page)
      
      // 에러 메시지 표시 확인
      await verifyPageContent(page, ['프로젝트를 찾을 수 없습니다', '요청하신 프로젝트가 존재하지 않습니다'])
      
      // 사이드바는 여전히 작동해야 함
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
      
      // 다른 페이지로 네비게이션 가능한지 확인
      await clickSidebarMenu(page, 'home')
      await expect(page).toHaveURL('/dashboard')
    })

    test('should handle invalid feedback ID gracefully', async ({ page }) => {
      await page.goto('/feedback/999')
      await waitForPageLoad(page)
      
      await verifyPageContent(page, ['피드백을 찾을 수 없습니다', '요청하신 피드백이 존재하지 않습니다'])
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
      
      // 네비게이션 복구 테스트
      await clickSidebarMenu(page, 'planning')
      await expect(page).toHaveURL('/planning')
    })

    test('should handle malformed routes', async ({ page }) => {
      await page.goto('/projects/invalid-id')
      await waitForPageLoad(page)
      
      // 404나 에러 페이지가 표시되어야 함
      await verifyPageContent(page, ['프로젝트를 찾을 수 없습니다'])
      
      // 사이드바 네비게이션으로 복구 가능
      await clickSidebarMenu(page, 'feedback')
      await expect(page).toHaveURL('/feedback')
    })

    test('should handle network errors gracefully', async ({ page }) => {
      // 네트워크를 오프라인으로 설정
      await page.context().setOffline(true)
      
      await clickSidebarMenu(page, 'projects')
      
      // 서브메뉴 로딩 실패 시에도 앱이 크래시하지 않는지 확인
      await page.waitForTimeout(2000)
      await expect(page.locator('[data-testid="sidebar"]')).toBeVisible()
      
      // 네트워크 복구
      await page.context().setOffline(false)
      
      // 직접 네비게이션은 여전히 작동해야 함
      await clickSidebarMenu(page, 'planning')
      await expect(page).toHaveURL('/planning')
    })
  })

  test.describe('State Management Tests', () => {
    test('should maintain active menu state across navigation', async ({ page }) => {
      // 홈에서 시작
      await clickSidebarMenu(page, 'home')
      await expect(page).toHaveURL('/dashboard')
      
      // 영상 기획으로 이동
      await clickSidebarMenu(page, 'planning')
      await expect(page).toHaveURL('/planning')
      
      // 영상 피드백으로 이동
      await clickSidebarMenu(page, 'feedback')
      await expect(page).toHaveURL('/feedback')
      
      // 각 네비게이션이 독립적으로 작동하는지 확인
      await verifyPageContent(page, ['영상 피드백'])
    })

    test('should close submenu when navigating to direct menu items', async ({ page }) => {
      // 프로젝트 서브메뉴 열기
      await clickSidebarMenu(page, 'projects')
      await page.waitForSelector('[data-testid="sidebar-submenu"]')
      
      // 다른 메뉴로 네비게이션
      await clickSidebarMenu(page, 'planning')
      await expect(page).toHaveURL('/planning')
      
      // 서브메뉴가 닫혔는지 확인
      const submenu = page.locator('[data-testid="sidebar-submenu"]')
      if (await submenu.count() > 0) {
        await expect(submenu).not.toBeVisible()
      }
    })
  })

  test.describe('Responsive Navigation Tests', () => {
    test('should handle mobile navigation', async ({ page }) => {
      // 모바일 뷰포트 설정
      await page.setViewportSize({ width: 375, height: 667 })
      
      await waitForPageLoad(page)
      
      // 햄버거 메뉴가 표시되는지 확인
      const hamburgerButton = page.locator('[aria-label="메뉴 토글"]')
      await expect(hamburgerButton).toBeVisible()
      
      // 햄버거 메뉴 클릭
      await hamburgerButton.click()
      await page.waitForTimeout(500) // 애니메이션 대기
      
      // 메뉴가 열린 후 네비게이션 테스트
      await clickSidebarMenu(page, 'planning')
      await expect(page).toHaveURL('/planning')
    })

    test('should handle desktop navigation', async ({ page }) => {
      // 데스크톱 뷰포트 설정
      await page.setViewportSize({ width: 1920, height: 1080 })
      
      await waitForPageLoad(page)
      
      // 햄버거 메뉴가 숨겨져 있는지 확인
      const hamburgerButton = page.locator('[aria-label="메뉴 토글"]')
      if (await hamburgerButton.count() > 0) {
        await expect(hamburgerButton).not.toBeVisible()
      }
      
      // 직접 네비게이션 테스트
      await clickSidebarMenu(page, 'feedback')
      await expect(page).toHaveURL('/feedback')
    })
  })

  test.describe('Accessibility Tests', () => {
    test('should support keyboard navigation', async ({ page }) => {
      await waitForPageLoad(page)
      
      // Tab으로 포커스 이동
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      
      // Enter로 메뉴 활성화 (첫 번째 메뉴 항목에 포커스되었다고 가정)
      const focusedElement = await page.locator(':focus')
      if (await focusedElement.count() > 0) {
        await page.keyboard.press('Enter')
        
        // 네비게이션이 발생했는지 확인
        await page.waitForTimeout(1000)
        expect(page.url()).not.toBe('/') // URL이 변경되었는지 확인
      }
    })

    test('should have proper ARIA labels', async ({ page }) => {
      await waitForPageLoad(page)
      
      // 주요 네비게이션 요소들의 접근성 속성 확인
      const sidebar = page.locator('[data-testid="sidebar"]')
      await expect(sidebar).toHaveAttribute('role', 'complementary')
      await expect(sidebar).toHaveAttribute('aria-label', '네비게이션 사이드바')
      
      const nav = page.locator('[role="navigation"][aria-label="주 메뉴"]')
      await expect(nav).toBeVisible()
      
      // 로그아웃 버튼 접근성 확인
      const logoutButton = page.locator('[data-testid="logout-button"]')
      await expect(logoutButton).toHaveAttribute('aria-label', '로그아웃')
    })
  })

  test.describe('Performance Tests', () => {
    test('should load navigation quickly', async ({ page }) => {
      const startTime = Date.now()
      
      await page.goto('/')
      await waitForPageLoad(page)
      
      const loadTime = Date.now() - startTime
      
      // 5초 내에 로딩되어야 함 (실제 환경에 맞게 조정)
      expect(loadTime).toBeLessThan(5000)
      
      // 모든 메뉴 항목이 렌더링되었는지 확인
      await expect(page.locator('[data-testid="menu-home"]')).toBeVisible()
      await expect(page.locator('[data-testid="menu-calendar"]')).toBeVisible()
      await expect(page.locator('[data-testid="menu-projects"]')).toBeVisible()
      await expect(page.locator('[data-testid="menu-planning"]')).toBeVisible()
      await expect(page.locator('[data-testid="menu-feedback"]')).toBeVisible()
    })

    test('should navigate between pages quickly', async ({ page }) => {
      await waitForPageLoad(page)
      
      const navigationTests = [
        { menu: 'planning', url: '/planning' },
        { menu: 'feedback', url: '/feedback' },
        { menu: 'calendar', url: '/calendar' },
        { menu: 'home', url: '/dashboard' }
      ]
      
      for (const test of navigationTests) {
        const startTime = Date.now()
        
        await clickSidebarMenu(page, test.menu)
        await expect(page).toHaveURL(test.url)
        await waitForPageLoad(page)
        
        const navigationTime = Date.now() - startTime
        
        // 3초 내에 네비게이션이 완료되어야 함
        expect(navigationTime).toBeLessThan(3000)
      }
    })
  })
})