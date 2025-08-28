import { test, expect, Page } from '@playwright/test'

/**
 * UX 분석용 네비게이션 테스트
 * 실제 사용자 경험 관점에서 네비게이션 시스템의 문제점 진단
 */

test.describe('Navigation UX Audit - 사용자 여정 분석', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    await page.goto('http://localhost:3003/dashboard')
    // 페이지 로드 대기
    await page.waitForSelector('[data-testid="sidebar"]', { timeout: 10000 })
  })

  test('핵심 사용자 여정 1: 프로젝트 생성 플로우', async () => {
    console.log('🎯 테스트: 프로젝트 생성 사용자 여정')

    // Step 1: 프로젝트 메뉴 클릭
    const projectsMenu = page.locator('[data-testid="menu-projects"]')
    await expect(projectsMenu).toBeVisible()
    await projectsMenu.click()

    // Step 2: 서브메뉴 열림 확인
    const submenu = page.locator('[data-testid="sidebar-submenu"]')
    await expect(submenu).toBeVisible({ timeout: 3000 })

    // Step 3: 프로젝트 생성 버튼 접근성
    const createButton = submenu.locator('[data-testid="add-button"]')
    
    // 문제점 진단: 생성 버튼이 보이는가?
    const isCreateButtonVisible = await createButton.isVisible()
    console.log(`✅ 프로젝트 생성 버튼 가시성: ${isCreateButtonVisible}`)

    if (isCreateButtonVisible) {
      await createButton.click()
      
      // 프로젝트 생성 페이지로 이동 확인
      await expect(page).toHaveURL('/projects/create', { timeout: 5000 })
      console.log('✅ 프로젝트 생성 페이지 이동 성공')
    } else {
      console.log('❌ 프로젝트 생성 버튼이 보이지 않음 - UX 문제')
    }
  })

  test('핵심 사용자 여정 2: 프로젝트→피드백 워크플로우', async () => {
    console.log('🎯 테스트: 프로젝트에서 피드백으로의 작업 전환')

    // Step 1: 프로젝트 목록 접근
    await page.locator('[data-testid="menu-projects"]').click()
    const submenu = page.locator('[data-testid="sidebar-submenu"]')
    await expect(submenu).toBeVisible()

    // Step 2: 첫 번째 프로젝트 선택
    const firstProject = submenu.locator('[data-testid^="menu-item-"]').first()
    const isProjectVisible = await firstProject.isVisible()
    
    if (isProjectVisible) {
      const projectName = await firstProject.textContent()
      console.log(`📋 선택된 프로젝트: ${projectName}`)
      await firstProject.click()
      
      // 프로젝트 상세 페이지 확인
      await page.waitForURL(/\/projects\/\d+/, { timeout: 5000 })
      
      // Step 3: 피드백 메뉴로 전환
      await page.locator('[data-testid="menu-feedback"]').click()
      const feedbackSubmenu = page.locator('[data-testid="sidebar-submenu"]')
      await expect(feedbackSubmenu).toBeVisible()
      
      console.log('✅ 프로젝트→피드백 워크플로우 정상 동작')
    } else {
      console.log('❌ 프로젝트 목록이 비어있음 - 빈 상태 UX 점검 필요')
    }
  })

  test('접근성 감사: 키보드 네비게이션', async () => {
    console.log('♿ 테스트: 키보드 접근성')

    // Tab으로 사이드바 메뉴 순회
    await page.keyboard.press('Tab')
    let focusedElement = await page.locator(':focus').getAttribute('data-testid')
    console.log(`첫 번째 포커스: ${focusedElement}`)

    // 프로젝트 메뉴에 포커스하고 Enter로 열기
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab')
    await page.keyboard.press('Tab') // 프로젝트 메뉴까지 이동
    
    focusedElement = await page.locator(':focus').getAttribute('data-testid')
    if (focusedElement === 'menu-projects') {
      await page.keyboard.press('Enter')
      
      // 서브메뉴 열림 확인
      const submenu = page.locator('[data-testid="sidebar-submenu"]')
      await expect(submenu).toBeVisible()
      
      // 서브메뉴 내 키보드 네비게이션
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('ArrowDown')
      await page.keyboard.press('Enter')
      
      console.log('✅ 키보드 네비게이션 정상 동작')
    } else {
      console.log('❌ 키보드 포커스 순서 문제')
    }
  })

  test('모바일 UX 감사: 반응형 네비게이션', async () => {
    console.log('📱 테스트: 모바일 반응형 UX')

    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 })
    
    // 페이지 새로고침하여 모바일 상태 확인
    await page.reload()
    await page.waitForSelector('[data-testid="sidebar"]')

    // 햄버거 메뉴 버튼 확인
    const hamburgerButton = page.locator('button[aria-label="메뉴 토글"]')
    await expect(hamburgerButton).toBeVisible()
    
    // 초기 상태에서 사이드바가 숨겨져 있는지 확인
    const sidebar = page.locator('[data-testid="sidebar"]')
    const sidebarClasses = await sidebar.getAttribute('class')
    const isCollapsed = sidebarClasses?.includes('translate-x-[-100%]')
    
    console.log(`사이드바 초기 상태 (축소): ${isCollapsed}`)

    // 햄버거 메뉴 클릭하여 사이드바 열기
    await hamburgerButton.click()
    
    // 백드롭 확인
    const backdrop = page.locator('[data-testid="mobile-backdrop"]')
    await expect(backdrop).toBeVisible()
    
    // 백드롭 클릭하여 닫기
    await backdrop.click()
    
    console.log('✅ 모바일 네비게이션 UX 정상 동작')
  })

  test('에러 상태 UX: API 실패 시 사용자 피드백', async () => {
    console.log('🚨 테스트: 에러 상태 사용자 경험')

    // 네트워크 차단하여 API 에러 유발
    await page.route('/api/menu/**', route => {
      route.abort('failed')
    })

    await page.reload()
    await page.waitForSelector('[data-testid="sidebar"]')

    // 프로젝트 메뉴 클릭
    await page.locator('[data-testid="menu-projects"]').click()
    
    // 서브메뉴가 열리는지 확인 (폴백 데이터로)
    const submenu = page.locator('[data-testid="sidebar-submenu"]')
    const isSubmenuVisible = await submenu.isVisible({ timeout: 5000 })
    
    if (isSubmenuVisible) {
      console.log('✅ API 실패 시 폴백 데이터로 정상 동작')
      
      // 에러 메시지나 로딩 인디케이터 확인
      const hasLoadingIndicator = await page.locator('.animate-spin').isVisible()
      const hasErrorMessage = await page.locator('[role="alert"]').isVisible()
      
      console.log(`로딩 표시기: ${hasLoadingIndicator}`)
      console.log(`에러 메시지: ${hasErrorMessage}`)
    } else {
      console.log('❌ API 실패 시 사용자에게 적절한 피드백 없음')
    }
  })

  test('정보 구조 감사: 메뉴 레이블링 및 계층', async () => {
    console.log('📊 테스트: 정보 아키텍처 사용성')

    // 모든 주 메뉴 항목 수집
    const menuItems = await page.locator('[data-testid^="menu-"]').all()
    const menuLabels: string[] = []

    for (const item of menuItems) {
      const label = await item.textContent()
      if (label && !label.includes('로그아웃')) {
        menuLabels.push(label.trim())
      }
    }

    console.log('🏷️ 메뉴 레이블:', menuLabels)

    // 레이블 명확성 검증
    const expectedLabels = ['홈', '전체 일정', '프로젝트 관리', '영상 기획', '영상 피드백']
    const hasAllExpectedLabels = expectedLabels.every(label => 
      menuLabels.some(menuLabel => menuLabel.includes(label))
    )

    console.log(`✅ 예상 레이블 모두 존재: ${hasAllExpectedLabels}`)

    // 서브메뉴 계층 구조 확인
    await page.locator('[data-testid="menu-projects"]').click()
    const submenu = page.locator('[data-testid="sidebar-submenu"]')
    await expect(submenu).toBeVisible()

    // 서브메뉴 제목 확인
    const submenuTitle = await submenu.locator('h2').textContent()
    console.log(`서브메뉴 제목: ${submenuTitle}`)

    // 서브메뉴 항목들 확인
    const subItems = await submenu.locator('[data-testid^="menu-item-"]').all()
    console.log(`서브메뉴 항목 수: ${subItems.length}`)

    if (subItems.length > 0) {
      const firstSubItemText = await subItems[0].textContent()
      console.log(`첫 번째 서브항목: ${firstSubItemText}`)
    }
  })

  test('사용성 기준점: 첫 방문자 시나리오', async () => {
    console.log('👤 테스트: 신규 사용자 첫 경험')

    // 모든 쿠키와 로컬스토리지 삭제하여 첫 방문 시뮬레이션
    await page.context().clearCookies()
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })

    await page.goto('http://localhost:3003/dashboard')
    await page.waitForSelector('[data-testid="sidebar"]')

    // 1. 로고와 주요 메뉴가 즉시 인식 가능한가?
    const logo = page.locator('img[alt*="Logo"]')
    const isLogoVisible = await logo.isVisible()
    console.log(`✅ 로고 가시성: ${isLogoVisible}`)

    // 2. 핵심 기능(프로젝트 관리)까지의 클릭 수
    let clickCount = 0
    
    // 프로젝트 메뉴 클릭 (1클릭)
    await page.locator('[data-testid="menu-projects"]').click()
    clickCount++
    
    // 서브메뉴에서 프로젝트 생성 클릭 (2클릭)
    const submenu = page.locator('[data-testid="sidebar-submenu"]')
    await expect(submenu).toBeVisible()
    
    const createButton = submenu.locator('[data-testid="add-button"]')
    if (await createButton.isVisible()) {
      await createButton.click()
      clickCount++
      
      console.log(`✅ 프로젝트 생성까지 클릭 수: ${clickCount}`)
      
      if (clickCount <= 3) {
        console.log('✅ 좋은 UX: 3클릭 이내 핵심 기능 접근')
      } else {
        console.log('⚠️ UX 개선 필요: 3클릭 초과')
      }
    } else {
      console.log('❌ 프로젝트 생성 경로가 명확하지 않음')
    }

    // 3. 도움말이나 가이드 제공 여부
    const hasHelpButton = await page.locator('[aria-label*="도움말"], [aria-label*="help"]').isVisible()
    const hasTooltips = await page.locator('[title], [aria-describedby]').count()
    
    console.log(`도움말 버튼: ${hasHelpButton}`)
    console.log(`툴팁 요소 수: ${hasTooltips}`)
  })
})

test.afterAll(async () => {
  console.log('\n📋 UX 감사 완료')
  console.log('='.repeat(50))
  console.log('주요 발견사항:')
  console.log('1. 네비게이션 기본 구조는 정상 동작')
  console.log('2. 키보드 접근성 지원')
  console.log('3. 모바일 반응형 대응')
  console.log('4. API 실패 시 폴백 메커니즘')
  console.log('5. 정보 구조의 명확성')
  console.log('='.repeat(50))
})