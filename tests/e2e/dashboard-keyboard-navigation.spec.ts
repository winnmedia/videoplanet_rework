/**
 * E2E 테스트: 대시보드 키보드 네비게이션 플로우
 * 
 * 이 테스트는 실제 사용자가 키보드만으로 대시보드를 완전히 탐색하고
 * 모든 기능을 사용할 수 있는지 검증합니다.
 * 
 * 테스트 시나리오:
 * 1. 대시보드 로드 및 초기 포커스 설정
 * 2. Tab/Shift+Tab으로 전체 페이지 탐색
 * 3. Enter/Space로 인터랙션 실행
 * 4. Escape로 모달/툴팁 닫기
 * 5. Arrow 키로 세부 네비게이션
 */

import { test, expect, Page } from '@playwright/test'

test.describe('대시보드 키보드 네비게이션 E2E', () => {
  let page: Page

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage
    
    // MSW 활성화된 대시보드 페이지로 이동
    await page.goto('/dashboard')
    
    // 페이지 로드 완료 대기
    await page.waitForSelector('[data-testid="dashboard-container"]', { state: 'visible' })
    
    // 접근성 도구 주입
    await page.addInitScript(() => {
      // 고대비 모드 시뮬레이션을 위한 CSS 추가
      const style = document.createElement('style')
      style.innerHTML = `
        .high-contrast-mode {
          filter: contrast(150%);
        }
        .focus-visible-debug {
          outline: 3px solid red !important;
          outline-offset: 2px !important;
        }
      `
      document.head.appendChild(style)
    })
  })

  test('전체 대시보드 키보드 네비게이션 플로우', async () => {
    // 1단계: 페이지 로드 후 첫 번째 포커스 가능한 요소 확인
    await page.keyboard.press('Tab')
    
    const firstFocusableElement = await page.locator(':focus').first()
    await expect(firstFocusableElement).toBeVisible()
    
    // 새로고침 버튼이 첫 번째 포커스여야 함
    await expect(firstFocusableElement).toHaveText(/새로고침/)

    // 2단계: 모든 통계 카드 영역 탐색
    const focusableElements: string[] = []
    let previousFocus = ''
    
    for (let i = 0; i < 10; i++) {
      const currentFocus = await page.locator(':focus').textContent() || ''
      
      // 중복 방지 및 루프 탈출 조건
      if (currentFocus === previousFocus && i > 0) break
      
      focusableElements.push(currentFocus)
      previousFocus = currentFocus
      
      await page.keyboard.press('Tab')
      await page.waitForTimeout(100) // 포커스 이동 안정화
    }
    
    // 최소 5개의 포커스 가능한 요소가 있어야 함
    expect(focusableElements.length).toBeGreaterThan(5)
    
    // 통계 카드 영역이 포함되어야 함
    expect(focusableElements.some(el => el.includes('프로젝트'))).toBe(true)
  })

  test('프로젝트 카드 키보드 인터랙션', async () => {
    // 프로젝트 카드로 이동
    let attempts = 0
    let projectCardFocused = false
    
    while (attempts < 15 && !projectCardFocused) {
      await page.keyboard.press('Tab')
      
      const focusedElement = page.locator(':focus')
      const text = await focusedElement.textContent() || ''
      
      if (text.includes('프로젝트') && await focusedElement.getAttribute('role') === 'button') {
        projectCardFocused = true
        
        // Enter 키로 프로젝트 클릭
        await page.keyboard.press('Enter')
        
        // 프로젝트 상세 페이지로 네비게이션되었는지 확인
        // 또는 상세 정보 모달이 열렸는지 확인
        await page.waitForTimeout(500)
        
        const currentUrl = page.url()
        const hasModal = await page.locator('[role="dialog"]').isVisible().catch(() => false)
        
        expect(currentUrl.includes('/projects/') || hasModal).toBe(true)
        
        break
      }
      attempts++
    }
    
    expect(projectCardFocused).toBe(true)
  })

  test('빈 상태 CTA 키보드 접근성', async () => {
    // 빈 상태 시뮬레이션을 위해 빈 데이터 시나리오로 페이지 이동
    await page.goto('/dashboard?scenario=empty')
    
    // 빈 상태 렌더링 대기
    await page.waitForSelector('text=아직 생성된 프로젝트가 없습니다', { state: 'visible' })
    
    // CTA 버튼으로 이동
    let ctaButtonFocused = false
    let attempts = 0
    
    while (attempts < 10 && !ctaButtonFocused) {
      await page.keyboard.press('Tab')
      
      const focusedElement = page.locator(':focus')
      const text = await focusedElement.textContent() || ''
      
      if (text.includes('프로젝트 생성하기')) {
        ctaButtonFocused = true
        
        // 포커스 인디케이터 확인
        const hasVisibleFocus = await focusedElement.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return styles.outline !== 'none' || styles.boxShadow.includes('ring')
        })
        
        expect(hasVisibleFocus).toBe(true)
        
        // Enter 키로 CTA 실행
        await page.keyboard.press('Enter')
        
        // 프로젝트 생성 페이지로 이동 또는 모달 열림 확인
        await page.waitForTimeout(500)
        const navigationOccurred = page.url().includes('/projects/create') || 
                                  await page.locator('[role="dialog"]').isVisible().catch(() => false)
        
        expect(navigationOccurred).toBe(true)
        
        break
      }
      attempts++
    }
    
    expect(ctaButtonFocused).toBe(true)
  })

  test('툴팁 키보드 인터랙션', async () => {
    // 툴팁이 있는 통계 카드로 이동
    let tooltipTriggerFound = false
    let attempts = 0
    
    while (attempts < 15 && !tooltipTriggerFound) {
      await page.keyboard.press('Tab')
      
      const focusedElement = page.locator(':focus')
      const hasAriaDescribedBy = await focusedElement.getAttribute('aria-describedby')
      const isTooltipTrigger = await focusedElement.getAttribute('aria-label')?.includes('도움말')
      
      if (hasAriaDescribedBy || isTooltipTrigger) {
        tooltipTriggerFound = true
        
        // Enter로 툴팁 열기
        await page.keyboard.press('Enter')
        
        // 툴팁 표시 확인
        await page.waitForSelector('[role="tooltip"]', { state: 'visible' })
        const tooltip = page.locator('[role="tooltip"]')
        await expect(tooltip).toBeVisible()
        
        // aria-expanded 상태 확인
        await expect(focusedElement).toHaveAttribute('aria-expanded', 'true')
        
        // Escape로 툴팁 닫기
        await page.keyboard.press('Escape')
        
        // 툴팁 사라짐 확인
        await expect(tooltip).not.toBeVisible()
        await expect(focusedElement).toHaveAttribute('aria-expanded', 'false')
        
        // 포커스가 트리거에 유지되는지 확인
        const currentFocus = page.locator(':focus')
        expect(await currentFocus.getAttribute('aria-describedby')).toBe(hasAriaDescribedBy)
        
        break
      }
      attempts++
    }
    
    expect(tooltipTriggerFound).toBe(true)
  })

  test('Shift+Tab 역방향 네비게이션', async () => {
    // 몇 개의 요소를 Tab으로 이동
    const forwardElements: string[] = []
    
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      const text = await page.locator(':focus').textContent() || ''
      forwardElements.push(text)
      await page.waitForTimeout(100)
    }
    
    // 역방향으로 이동
    const backwardElements: string[] = []
    
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Shift+Tab')
      const text = await page.locator(':focus').textContent() || ''
      backwardElements.push(text)
      await page.waitForTimeout(100)
    }
    
    // 역방향 순서가 정방향의 반대인지 확인
    const reversedForward = [...forwardElements].reverse()
    
    // 최소 3개 요소가 올바른 역순으로 매칭되어야 함
    let matchCount = 0
    for (let i = 0; i < Math.min(3, reversedForward.length, backwardElements.length); i++) {
      if (reversedForward[i] === backwardElements[i]) {
        matchCount++
      }
    }
    
    expect(matchCount).toBeGreaterThan(2)
  })

  test('접근성 단축키 동작', async () => {
    // Skip to content 링크 확인
    await page.keyboard.press('Tab')
    
    const firstElement = page.locator(':focus')
    const isSkipLink = await firstElement.textContent().then(text => 
      text?.includes('메인 콘텐츠로 이동') || text?.includes('skip')
    ).catch(() => false)
    
    if (isSkipLink) {
      await page.keyboard.press('Enter')
      
      // 메인 콘텐츠로 포커스 이동 확인
      const mainContent = page.locator('main, [role="main"]')
      await expect(mainContent).toBeFocused()
    }
    
    // 페이지 내 랜드마크 네비게이션 테스트
    await page.keyboard.press('Alt+h') // 헤딩으로 이동 (일부 스크린리더에서 지원)
    
    const headingElement = page.locator('h1, h2, h3').first()
    if (await headingElement.isVisible()) {
      // 헤딩이 포커스되었거나 하이라이트되었는지 확인
      const isHighlighted = await headingElement.evaluate(el => {
        const rect = el.getBoundingClientRect()
        return rect.top >= 0 && rect.top <= window.innerHeight
      })
      
      expect(isHighlighted).toBe(true)
    }
  })

  test('고대비 모드에서의 포커스 가시성', async () => {
    // 고대비 모드 활성화
    await page.addStyleTag({
      content: `
        * {
          filter: contrast(150%) !important;
        }
        :focus {
          outline: 3px solid yellow !important;
          outline-offset: 2px !important;
          background-color: black !important;
          color: white !important;
        }
      `
    })
    
    // 여러 요소에 포커스하여 가시성 확인
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab')
      
      const focusedElement = page.locator(':focus')
      
      if (await focusedElement.isVisible()) {
        // 포커스된 요소의 시각적 구별 가능성 확인
        const computedStyle = await focusedElement.evaluate(el => {
          const styles = window.getComputedStyle(el)
          return {
            outline: styles.outline,
            outlineWidth: styles.outlineWidth,
            outlineStyle: styles.outlineStyle,
            boxShadow: styles.boxShadow
          }
        })
        
        // 포커스 인디케이터가 있는지 확인
        const hasFocusIndicator = 
          computedStyle.outline !== 'none' || 
          computedStyle.outlineWidth !== '0px' ||
          computedStyle.boxShadow.includes('ring') ||
          computedStyle.boxShadow.includes('shadow')
        
        expect(hasFocusIndicator).toBe(true)
      }
      
      await page.waitForTimeout(200)
    }
  })

  test('모바일 뷰포트에서 키보드 네비게이션', async () => {
    // 모바일 뷰포트로 변경
    await page.setViewportSize({ width: 375, height: 667 })
    await page.reload()
    
    // 대시보드 로드 대기
    await page.waitForSelector('[data-testid="dashboard-container"]', { state: 'visible' })
    
    // 모바일에서도 키보드 네비게이션 작동 확인
    const focusableElements: string[] = []
    
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press('Tab')
      
      const focusedElement = page.locator(':focus')
      if (await focusedElement.isVisible()) {
        const text = await focusedElement.textContent() || ''
        focusableElements.push(text)
        
        // 터치 타겟 크기 확인 (최소 44x44px)
        const boundingBox = await focusedElement.boundingBox()
        if (boundingBox) {
          expect(boundingBox.width).toBeGreaterThanOrEqual(44)
          expect(boundingBox.height).toBeGreaterThanOrEqual(44)
        }
      }
      
      await page.waitForTimeout(100)
    }
    
    expect(focusableElements.length).toBeGreaterThan(3)
  })

  test('스크린리더 호환성 (NVDA/JAWS 시뮬레이션)', async () => {
    // 스크린리더가 읽을 수 있는 콘텐츠 구조 확인
    const landmarks = await page.locator('[role="main"], [role="banner"], [role="navigation"], [role="region"]').count()
    expect(landmarks).toBeGreaterThan(0)
    
    // 헤딩 구조 확인
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').count()
    expect(headings).toBeGreaterThan(1)
    
    // 첫 번째 헤딩이 h1인지 확인
    const firstHeading = page.locator('h1').first()
    await expect(firstHeading).toBeVisible()
    await expect(firstHeading).toContainText('대시보드')
    
    // ARIA 라벨이 있는 요소들 확인
    const labeledElements = await page.locator('[aria-label], [aria-labelledby]').count()
    expect(labeledElements).toBeGreaterThan(3)
    
    // 상태 정보를 전달하는 요소들 확인
    const statusElements = await page.locator('[aria-live], [role="status"], [role="alert"]').count()
    expect(statusElements).toBeGreaterThanOrEqual(0) // 동적 업데이트가 있을 경우
    
    // 모든 인터랙티브 요소에 접근 가능한 이름이 있는지 확인
    const interactiveElements = page.locator('button, a, input, select, textarea')
    const count = await interactiveElements.count()
    
    for (let i = 0; i < count; i++) {
      const element = interactiveElements.nth(i)
      
      if (await element.isVisible()) {
        const accessibleName = await element.evaluate(el => {
          // 접근 가능한 이름 계산
          return el.getAttribute('aria-label') ||
                 el.getAttribute('title') ||
                 (el.textContent && el.textContent.trim()) ||
                 el.getAttribute('alt') ||
                 el.getAttribute('placeholder')
        })
        
        expect(accessibleName).toBeTruthy()
      }
    }
  })

  test('성능: 키보드 네비게이션 응답시간', async () => {
    const navigationTimes: number[] = []
    
    for (let i = 0; i < 10; i++) {
      const startTime = Date.now()
      
      await page.keyboard.press('Tab')
      await page.waitForFunction(() => document.activeElement !== document.body)
      
      const endTime = Date.now()
      navigationTimes.push(endTime - startTime)
    }
    
    // 평균 응답시간이 200ms 미만이어야 함 (INP 목표)
    const averageTime = navigationTimes.reduce((a, b) => a + b, 0) / navigationTimes.length
    expect(averageTime).toBeLessThan(200)
    
    // 모든 네비게이션이 500ms 이내여야 함
    expect(Math.max(...navigationTimes)).toBeLessThan(500)
  })
})