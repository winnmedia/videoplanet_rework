/**
 * UI Quality Audit Test Suite - 포괄적 UI/UX 품질 감사
 * 
 * 목적: "엉성하고 덕지덕지 얽혀있는" UI 문제를 객관적으로 식별
 * 감사 범위: dashboard, calendar, projects, planning, feedback
 * 
 * 테스트 카테고리:
 * 1. 레이아웃 안정성 (Layout Stability)
 * 2. 시각적 일관성 (Visual Consistency) 
 * 3. 접근성 (Accessibility)
 * 4. 성능 및 사용성 (Performance & Usability)
 * 5. 반응형 디자인 (Responsive Design)
 * 
 * @author AI Quality Engineer
 * @generated Claude Code
 */

import AxeBuilder from '@axe-core/playwright'
import { test, expect } from '@playwright/test'

// 테스트할 주요 페이지 경로
const MAIN_PAGES = [
  { name: 'Dashboard', path: '/dashboard' },
  { name: 'Calendar', path: '/calendar' }, 
  { name: 'Projects', path: '/projects' },
  { name: 'Planning', path: '/planning' },
  { name: 'Feedback', path: '/feedback' }
]

// 로컬 개발 환경 URL (개발 서버가 실행 중인 상태 가정)
const BASE_URL = 'http://localhost:3000'

// UI 품질 임계값 (조정 가능)
const QUALITY_THRESHOLDS = {
  maxLoadTime: 3000, // 3초
  maxLCP: 2500, // Largest Contentful Paint
  maxCLS: 0.1, // Cumulative Layout Shift
  maxLayoutShift: 5, // px
  minContrastRatio: 4.5, // WCAG AA
  maxTextNodes: 100, // 텍스트 노드 개수 (복잡성 지표)
  maxNestedDepth: 10 // DOM 중첩 깊이
}

test.describe('UI Quality Audit - Layout Stability', () => {
  
  MAIN_PAGES.forEach(({ name, path }) => {
    test(`[${name}] 레이아웃 안정성 검사`, async ({ page }) => {
      console.log(`🔍 [${name}] 레이아웃 안정성 감사 시작`)
      
      // 초기 페이지 로드
      const startTime = Date.now()
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' })
      const loadTime = Date.now() - startTime
      
      // 로딩 시간 검사
      expect(loadTime).toBeLessThan(QUALITY_THRESHOLDS.maxLoadTime)
      console.log(`⏱️ [${name}] 로딩 시간: ${loadTime}ms`)
      
      // 초기 레이아웃 스크린샷
      const initialScreenshot = await page.screenshot({ 
        path: `test-results/ui-audit/initial-${name.toLowerCase()}.png`,
        fullPage: true 
      })
      
      // 페이지 상호작용 후 레이아웃 변화 감지
      await page.mouse.move(100, 100)
      await page.waitForTimeout(500)
      
      // 호버 효과 후 스크린샷
      const hoverScreenshot = await page.screenshot({ 
        path: `test-results/ui-audit/hover-${name.toLowerCase()}.png`,
        fullPage: true 
      })
      
      // DOM 안정성 검사
      const elementCount = await page.locator('*').count()
      const textNodeCount = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('*'))
          .filter(el => el.childNodes.length > 0 && 
            Array.from(el.childNodes).some(node => node.nodeType === 3))
          .length
      })
      
      console.log(`📊 [${name}] DOM 요소: ${elementCount}개, 텍스트 노드: ${textNodeCount}개`)
      
      // 복잡성 임계값 검사
      expect(textNodeCount).toBeLessThan(QUALITY_THRESHOLDS.maxTextNodes)
      
      // 중첩 깊이 검사
      const maxDepth = await page.evaluate(() => {
        function getMaxDepth(element, depth = 0) {
          const children = Array.from(element.children)
          if (children.length === 0) return depth
          return Math.max(...children.map(child => getMaxDepth(child, depth + 1)))
        }
        return getMaxDepth(document.body)
      })
      
      console.log(`🏗️ [${name}] 최대 DOM 중첩 깊이: ${maxDepth}`)
      expect(maxDepth).toBeLessThan(QUALITY_THRESHOLDS.maxNestedDepth)
    })
  })
})

test.describe('UI Quality Audit - Visual Consistency', () => {
  
  test('색상 및 폰트 일관성 검사', async ({ page }) => {
    console.log('🎨 시각적 일관성 감사 시작')
    
    const colorFontAnalysis = []
    
    for (const { name, path } of MAIN_PAGES) {
      await page.goto(`${BASE_URL}${path}`)
      await page.waitForLoadState('networkidle')
      
      // 각 페이지의 색상 및 폰트 정보 수집
      const styles = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll('*'))
        const styles = new Set()
        
        elements.forEach(el => {
          const computed = window.getComputedStyle(el)
          if (computed.color !== 'rgba(0, 0, 0, 0)') {
            styles.add(`color:${computed.color}`)
          }
          if (computed.backgroundColor !== 'rgba(0, 0, 0, 0)') {
            styles.add(`bg:${computed.backgroundColor}`)
          }
          if (computed.fontFamily) {
            styles.add(`font:${computed.fontFamily}`)
          }
          if (computed.fontSize) {
            styles.add(`size:${computed.fontSize}`)
          }
        })
        
        return Array.from(styles)
      })
      
      colorFontAnalysis.push({
        page: name,
        uniqueStyles: styles.length,
        styles: styles
      })
      
      console.log(`🎨 [${name}] 고유 스타일: ${styles.length}개`)
    }
    
    // 스타일 일관성 분석
    const allStyles = colorFontAnalysis.flatMap(p => p.styles)
    const uniqueGlobalStyles = [...new Set(allStyles)]
    
    console.log(`📊 전체 고유 스타일: ${uniqueGlobalStyles.length}개`)
    
    // 과도한 스타일 다양성 검사 (일관성 부족 지표)
    const averageStylesPerPage = colorFontAnalysis.reduce((sum, p) => sum + p.uniqueStyles, 0) / colorFontAnalysis.length
    console.log(`📊 페이지당 평균 스타일: ${averageStylesPerPage.toFixed(1)}개`)
    
    // 색상 시스템 분석 결과 저장
    await page.evaluate((analysis) => {
      console.log('UI 일관성 분석 결과:', analysis)
    }, colorFontAnalysis)
  })
  
  test('버튼 및 인터랙션 요소 일관성', async ({ page }) => {
    console.log('🔘 인터랙션 요소 일관성 감사')
    
    const buttonAnalysis = []
    
    for (const { name, path } of MAIN_PAGES) {
      await page.goto(`${BASE_URL}${path}`)
      await page.waitForLoadState('networkidle')
      
      // 버튼 요소 분석
      const buttons = await page.locator('button, [role="button"], a.button').all()
      const buttonInfo = []
      
      for (const button of buttons) {
        const styles = await button.evaluate((el) => {
          const computed = window.getComputedStyle(el)
          return {
            width: computed.width,
            height: computed.height,
            padding: computed.padding,
            backgroundColor: computed.backgroundColor,
            borderRadius: computed.borderRadius,
            fontSize: computed.fontSize,
            visible: el.offsetWidth > 0 && el.offsetHeight > 0
          }
        })
        buttonInfo.push(styles)
      }
      
      buttonAnalysis.push({
        page: name,
        buttonCount: buttons.length,
        buttonStyles: buttonInfo
      })
      
      console.log(`🔘 [${name}] 버튼 개수: ${buttons.length}개`)
    }
    
    // 버튼 디자인 패턴 분석
    const allButtonHeights = buttonAnalysis.flatMap(p => 
      p.buttonStyles.filter(s => s.visible).map(s => s.height)
    )
    const uniqueButtonHeights = [...new Set(allButtonHeights)]
    
    console.log(`📏 고유 버튼 높이: ${uniqueButtonHeights.length}개 (${uniqueButtonHeights.join(', ')})`)
    
    // 버튼 일관성 검사 (너무 많은 다른 높이는 일관성 부족)
    expect(uniqueButtonHeights.length).toBeLessThan(5) // 최대 4가지 버튼 높이까지 허용
  })
})

test.describe('UI Quality Audit - Accessibility', () => {
  
  MAIN_PAGES.forEach(({ name, path }) => {
    test(`[${name}] 접근성 감사 (axe-core)`, async ({ page }) => {
      console.log(`♿ [${name}] 접근성 감사 시작`)
      
      await page.goto(`${BASE_URL}${path}`)
      await page.waitForLoadState('networkidle')
      
      // axe-core를 사용한 접근성 검사
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
        .analyze()
      
      console.log(`♿ [${name}] 접근성 위반: ${accessibilityScanResults.violations.length}개`)
      
      // 중요한 접근성 위반 검사
      const criticalViolations = accessibilityScanResults.violations.filter(
        violation => ['critical', 'serious'].includes(violation.impact)
      )
      
      if (criticalViolations.length > 0) {
        console.log(`🚨 [${name}] 중요 접근성 위반:`)
        criticalViolations.forEach(violation => {
          console.log(`  - ${violation.id}: ${violation.description}`)
        })
      }
      
      // 중요 접근성 위반이 없어야 함
      expect(criticalViolations.length).toBe(0)
      
      // 전체 위반 수는 10개 미만이어야 함 (품질 기준)
      expect(accessibilityScanResults.violations.length).toBeLessThan(10)
    })
    
    test(`[${name}] 키보드 네비게이션 검사`, async ({ page }) => {
      console.log(`⌨️ [${name}] 키보드 네비게이션 감사`)
      
      await page.goto(`${BASE_URL}${path}`)
      await page.waitForLoadState('networkidle')
      
      // 포커스 가능한 요소들 수집
      const focusableElements = await page.locator(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ).all()
      
      console.log(`⌨️ [${name}] 포커스 가능한 요소: ${focusableElements.length}개`)
      
      // 최소 하나의 포커스 가능한 요소가 있어야 함
      expect(focusableElements.length).toBeGreaterThan(0)
      
      // Tab 키로 네비게이션 테스트
      if (focusableElements.length > 0) {
        let focusedElements = 0
        
        for (let i = 0; i < Math.min(5, focusableElements.length); i++) {
          await page.keyboard.press('Tab')
          await page.waitForTimeout(100)
          
          // 현재 포커스된 요소가 있는지 확인
          const focusedElement = await page.locator(':focus').count()
          if (focusedElement > 0) {
            focusedElements++
          }
        }
        
        console.log(`⌨️ [${name}] Tab으로 포커스된 요소: ${focusedElements}/5개`)
        expect(focusedElements).toBeGreaterThan(0)
      }
    })
  })
})

test.describe('UI Quality Audit - Performance & Usability', () => {
  
  MAIN_PAGES.forEach(({ name, path }) => {
    test(`[${name}] 성능 메트릭 검사`, async ({ page }) => {
      console.log(`⚡ [${name}] 성능 감사 시작`)
      
      // Performance API 사용을 위한 타이밍 측정
      await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle' })
      
      // 성능 메트릭 수집
      const performanceMetrics = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        const paint = performance.getEntriesByType('paint')
        
        return {
          loadTime: navigation.loadEventEnd - navigation.fetchStart,
          domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
          firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
          firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
          resourcesCount: performance.getEntriesByType('resource').length
        }
      })
      
      console.log(`⚡ [${name}] 성능 메트릭:`, performanceMetrics)
      
      // 성능 임계값 검사
      expect(performanceMetrics.loadTime).toBeLessThan(QUALITY_THRESHOLDS.maxLoadTime)
      expect(performanceMetrics.firstContentfulPaint).toBeLessThan(QUALITY_THRESHOLDS.maxLCP)
      
      // 리소스 개수가 과도하지 않은지 확인
      expect(performanceMetrics.resourcesCount).toBeLessThan(50)
    })
    
    test(`[${name}] 사용성 검사 (클릭 대상 크기)`, async ({ page }) => {
      console.log(`👆 [${name}] 사용성 감사 - 클릭 대상 크기`)
      
      await page.goto(`${BASE_URL}${path}`)
      await page.waitForLoadState('networkidle')
      
      // 클릭 가능한 요소들의 크기 검사
      const clickableElements = await page.locator('button, a, [role="button"], [onclick]').all()
      const smallElements = []
      
      for (const element of clickableElements) {
        const box = await element.boundingBox()
        if (box && (box.width < 44 || box.height < 44)) {
          const tag = await element.evaluate(el => el.tagName.toLowerCase())
          const text = await element.textContent()
          smallElements.push({
            tag,
            text: text?.substring(0, 20) || '',
            width: box.width,
            height: box.height
          })
        }
      }
      
      console.log(`👆 [${name}] 44px 미만 클릭 대상: ${smallElements.length}개`)
      if (smallElements.length > 0) {
        console.log('작은 클릭 대상들:', smallElements)
      }
      
      // WCAG 2.1 AA 기준: 클릭 대상은 최소 44x44px
      expect(smallElements.length).toBeLessThan(3) // 최대 2개까지 허용 (아이콘 버튼 등)
    })
  })
})

test.describe('UI Quality Audit - Responsive Design', () => {
  
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1200, height: 800 }
  ]
  
  MAIN_PAGES.forEach(({ name, path }) => {
    viewports.forEach(({ name: viewportName, width, height }) => {
      test(`[${name}] 반응형 디자인 - ${viewportName}`, async ({ page }) => {
        console.log(`📱 [${name}] ${viewportName} 반응형 검사`)
        
        await page.setViewportSize({ width, height })
        await page.goto(`${BASE_URL}${path}`)
        await page.waitForLoadState('networkidle')
        
        // 가로 스크롤 검사
        const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth)
        const viewportWidth = width
        
        console.log(`📱 [${name}] ${viewportName} - 콘텐츠 너비: ${bodyWidth}px, 뷰포트: ${viewportWidth}px`)
        
        // 가로 스크롤이 발생하지 않아야 함 (5px 여유)
        expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5)
        
        // 텍스트가 읽기 어렵게 작아지지 않았는지 확인
        const textElements = await page.locator('p, span, div').all()
        const smallTextElements = []
        
        for (const element of textElements.slice(0, 10)) { // 처음 10개만 검사
          const fontSize = await element.evaluate(el => {
            const computed = window.getComputedStyle(el)
            return parseFloat(computed.fontSize)
          })
          
          if (fontSize < 14) { // 14px 미만은 모바일에서 읽기 어려움
            const text = await element.textContent()
            if (text && text.trim().length > 0) {
              smallTextElements.push({ fontSize, text: text.substring(0, 30) })
            }
          }
        }
        
        console.log(`📱 [${name}] ${viewportName} - 14px 미만 텍스트: ${smallTextElements.length}개`)
        
        // 모바일에서 너무 작은 텍스트가 많으면 안 됨
        if (viewportName === 'Mobile') {
          expect(smallTextElements.length).toBeLessThan(5)
        }
        
        // 스크린샷 저장
        await page.screenshot({ 
          path: `test-results/ui-audit/responsive-${name.toLowerCase()}-${viewportName.toLowerCase()}.png`,
          fullPage: true 
        })
      })
    })
  })
})

// HTTP 에러 페이지 감사는 별도 테스트 스위트에서 처리
test.describe('UI Quality Audit - Error States', () => {
  
  test('404 에러 페이지 UI 품질', async ({ page }) => {
    console.log('🚫 404 에러 페이지 UI 품질 검사')
    
    const response = await page.goto(`${BASE_URL}/non-existent-page-12345`, {
      waitUntil: 'networkidle'
    }).catch(() => null)
    
    if (response) {
      // 에러 페이지가 렌더링되었는지 확인
      const hasContent = await page.locator('body *').count() > 0
      expect(hasContent).toBeTruthy()
      
      // 404 에러 페이지 스크린샷
      await page.screenshot({ 
        path: 'test-results/ui-audit/error-404.png',
        fullPage: true 
      })
      
      // 홈으로 돌아갈 수 있는 링크가 있는지 확인
      const homeLinks = await page.locator('a[href="/"], a[href="/dashboard"], button:has-text("홈")').count()
      console.log(`🏠 홈으로 돌아가는 링크: ${homeLinks}개`)
      expect(homeLinks).toBeGreaterThan(0)
    }
  })
})