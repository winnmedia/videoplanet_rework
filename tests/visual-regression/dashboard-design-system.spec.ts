/**
 * 대시보드 디자인 시스템 시각적 회귀 테스트
 * 
 * VRidge 디자인 시스템 일관성과 Tailwind CSS 기반 스타일링을
 * 시각적으로 검증하는 자동화 테스트
 */

import { test, expect } from '@playwright/test'

test.describe('대시보드 디자인 시스템 일관성', () => {
  test.beforeEach(async ({ page }) => {
    // 일관된 테스트 환경을 위한 뷰포트 설정
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('http://localhost:3002/dashboard')
    
    // 애니메이션 비활성화로 일관된 스크린샷 보장
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-delay: -0.01ms !important;
          animation-iteration-count: 1 !important;
          background-attachment: initial !important;
          scroll-behavior: auto !important;
        }
      `
    })
    
    // 데이터 로드 완료 대기
    await page.waitForSelector('[data-testid="dashboard-content"]', { timeout: 10000 })
  })

  test('VRidge 브랜드 색상 시스템 준수', async ({ page }) => {
    // 1. Primary 색상 (#0031ff) 사용 검증
    const primaryElements = await page.locator('.text-primary, .bg-primary, .border-primary').count()
    expect(primaryElements).toBeGreaterThan(0)
    
    // 2. 브랜드 색상 스크린샷 비교
    const colorPalette = page.locator('[data-testid="color-palette"]')
    if (await colorPalette.isVisible()) {
      await expect(colorPalette).toHaveScreenshot('vridge-color-palette.png')
    }
    
    // 3. 컴포넌트별 색상 일관성
    await expect(page.locator('[data-testid="project-status-card"]')).toHaveScreenshot('project-status-card-colors.png')
  })

  test('타이포그래피 시스템 일관성', async ({ page }) => {
    // 1. Inter 폰트 패밀리 적용 확인
    const bodyFont = await page.evaluate(() => {
      return window.getComputedStyle(document.body).fontFamily
    })
    expect(bodyFont).toContain('Inter')
    
    // 2. 텍스트 크기 계층 구조
    const headings = {
      h1: page.locator('h1').first(),
      h2: page.locator('h2').first(),
      h3: page.locator('h3').first()
    }
    
    for (const [tag, element] of Object.entries(headings)) {
      if (await element.isVisible()) {
        await expect(element).toHaveScreenshot(`typography-${tag}.png`)
      }
    }
  })

  test('spacing 시스템 (8px 그리드) 준수', async ({ page }) => {
    // 1. 컴포넌트 간 일관된 간격
    const cards = page.locator('[data-testid^="card"]')
    const cardCount = await cards.count()
    
    if (cardCount > 1) {
      // 카드 간 간격이 8px의 배수인지 확인
      const spacing = await page.evaluate(() => {
        const cards = document.querySelectorAll('[data-testid^="card"]')
        if (cards.length < 2) return []
        
        const spacings = []
        for (let i = 1; i < cards.length; i++) {
          const prev = cards[i - 1].getBoundingClientRect()
          const curr = cards[i].getBoundingClientRect()
          spacings.push(curr.top - prev.bottom)
        }
        return spacings
      })
      
      // 모든 간격이 8px의 배수여야 함
      spacing.forEach(gap => {
        expect(gap % 8).toBe(0)
      })
    }
  })

  test('그림자 시스템 일관성', async ({ page }) => {
    // 1. 카드 그림자 시스템
    const cards = page.locator('.shadow-sm, .shadow, .shadow-md, .shadow-lg')
    const cardCount = await cards.count()
    
    if (cardCount > 0) {
      // 그림자 적용된 첫 번째 카드 스크린샷
      await expect(cards.first()).toHaveScreenshot('card-shadow-system.png')
    }
    
    // 2. 호버 상태 그림자
    const hoverableCard = page.locator('[data-testid="project-status-card"]').first()
    if (await hoverableCard.isVisible()) {
      await hoverableCard.hover()
      await page.waitForTimeout(200) // 호버 애니메이션 완료 대기
      await expect(hoverableCard).toHaveScreenshot('card-hover-shadow.png')
    }
  })

  test('반응형 디자인 브레이크포인트', async ({ page }) => {
    const breakpoints = [
      { name: 'mobile', width: 375, height: 667 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'large-desktop', width: 1920, height: 1080 }
    ]
    
    for (const breakpoint of breakpoints) {
      await page.setViewportSize({ 
        width: breakpoint.width, 
        height: breakpoint.height 
      })
      
      // 데이터 재로드 대기
      await page.waitForLoadState('networkidle')
      
      // 각 브레이크포인트에서 레이아웃 일관성 검증
      await expect(page).toHaveScreenshot(`dashboard-${breakpoint.name}.png`, {
        fullPage: true,
        animations: 'disabled'
      })
    }
  })

  test('접근성 색상 대비 검증', async ({ page }) => {
    // 1. axe-core를 통한 자동 접근성 검사
    await expect(page).toPassAccessibilityAudit({
      rules: {
        'color-contrast': { enabled: true }
      }
    })
    
    // 2. 수동 색상 대비 계산 (WCAG AA 4.5:1 기준)
    const contrastRatios = await page.evaluate(() => {
      const getContrastRatio = (fg: string, bg: string): number => {
        // 간소화된 대비 계산 (실제로는 더 복잡한 알고리즘 필요)
        const getLuminance = (color: string): number => {
          const rgb = color.match(/\d+/g)
          if (!rgb) return 0
          const [r, g, b] = rgb.map(c => {
            const sRGB = parseInt(c) / 255
            return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4)
          })
          return 0.2126 * r + 0.7152 * g + 0.0722 * b
        }
        
        const l1 = getLuminance(fg)
        const l2 = getLuminance(bg)
        const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)
        return ratio
      }
      
      // 텍스트 요소들의 색상 대비 검사
      const textElements = document.querySelectorAll('p, span, h1, h2, h3, h4, h5, h6, button, a')
      const ratios = []
      
      for (const element of textElements) {
        const style = window.getComputedStyle(element)
        const color = style.color
        const backgroundColor = style.backgroundColor
        
        if (color && backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)') {
          const ratio = getContrastRatio(color, backgroundColor)
          ratios.push({
            element: element.tagName.toLowerCase(),
            ratio,
            passes: ratio >= 4.5
          })
        }
      }
      
      return ratios
    })
    
    // 대부분의 텍스트가 WCAG AA 기준을 통과해야 함
    const passingElements = contrastRatios.filter(r => r.passes).length
    const totalElements = contrastRatios.length
    
    if (totalElements > 0) {
      const passRate = passingElements / totalElements
      expect(passRate).toBeGreaterThanOrEqual(0.9) // 90% 이상 통과
    }
  })

  test('이모지 사용 금지 규칙 준수', async ({ page }) => {
    // 1. HTML 텍스트 컨텐츠에서 이모지 검색
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu
    
    const textContent = await page.textContent('body')
    const emojiMatches = textContent?.match(emojiRegex) || []
    
    // 이모지가 발견되면 테스트 실패
    expect(emojiMatches).toHaveLength(0)
    
    // 2. 대신 의미론적 아이콘 사용 확인
    const iconElements = await page.locator('svg[role="img"]').count()
    expect(iconElements).toBeGreaterThan(0) // SVG 아이콘이 사용되어야 함
  })

  test('컴포넌트 상태 시각적 일관성', async ({ page }) => {
    // 1. 기본 상태
    await expect(page.locator('[data-testid="quick-actions"]')).toHaveScreenshot('quick-actions-default.png')
    
    // 2. 호버 상태
    const firstButton = page.locator('[data-testid="quick-action-new-project"]')
    await firstButton.hover()
    await page.waitForTimeout(200)
    await expect(firstButton).toHaveScreenshot('button-hover-state.png')
    
    // 3. 포커스 상태
    await firstButton.focus()
    await expect(firstButton).toHaveScreenshot('button-focus-state.png')
    
    // 4. 로딩 상태 (해당하는 경우)
    const loadingElements = page.locator('[data-testid*="loading"]')
    const loadingCount = await loadingElements.count()
    
    if (loadingCount > 0) {
      await expect(loadingElements.first()).toHaveScreenshot('loading-state.png')
    }
  })

  test('다크모드 디자인 일관성 (있는 경우)', async ({ page }) => {
    // 다크모드 토글이 있는지 확인
    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]')
    
    if (await darkModeToggle.isVisible()) {
      // 다크모드 활성화
      await darkModeToggle.click()
      await page.waitForTimeout(500) // 테마 전환 완료 대기
      
      // 다크모드 상태에서 스크린샷 비교
      await expect(page).toHaveScreenshot('dashboard-dark-mode.png', {
        fullPage: true,
        animations: 'disabled'
      })
      
      // 라이트모드로 되돌리기
      await darkModeToggle.click()
      await page.waitForTimeout(500)
    }
  })
})

test.describe('성능 및 렌더링 품질', () => {
  test('레이아웃 이동 (CLS) 최소화', async ({ page }) => {
    await page.goto('http://localhost:3002/dashboard')
    
    // 페이지 로드 중 레이아웃 시프트 측정
    const cls = await page.evaluate(() => {
      return new Promise((resolve) => {
        let clsValue = 0
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
              clsValue += (entry as any).value
            }
          }
        })
        
        observer.observe({ type: 'layout-shift', buffered: true })
        
        // 3초 후 결과 반환
        setTimeout(() => {
          observer.disconnect()
          resolve(clsValue)
        }, 3000)
      })
    })
    
    // CLS 임계값: 0.1 미만이어야 함
    expect(cls).toBeLessThan(0.1)
  })

  test('폰트 로딩 최적화', async ({ page }) => {
    await page.goto('http://localhost:3002/dashboard')
    
    // Inter 폰트 로딩 상태 확인
    const fontLoadStatus = await page.evaluate(() => {
      return document.fonts.check('16px Inter')
    })
    
    expect(fontLoadStatus).toBe(true) // 폰트가 로드되어야 함
  })
})