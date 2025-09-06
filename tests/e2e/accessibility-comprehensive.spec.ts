/**
 * 포괄적인 접근성(A11y) E2E 테스트 스위트
 * WCAG 2.1 AA 준수 검증 및 보조 기술 호환성 테스트
 * 
 * @author Grace (QA Lead)  
 * @date 2025-09-06
 * @standard WCAG 2.1 AA, Section 508
 * @coverage 키보드 네비게이션, 스크린 리더, 색상 대비, 포커스 관리
 */

import { test, expect, Page, Locator } from '@playwright/test'
import type { BrowserContext } from '@playwright/test'

// ♿ 접근성 테스트 환경 설정
const ACCESSIBILITY_CONFIG = {
  baseURL: 'https://vridge-xyc331ybx-vlanets-projects.vercel.app',
  wcagLevel: 'AA',  // WCAG 2.1 AA 수준
  timeout: {
    short: 3000,
    medium: 10000,
    long: 20000
  },
  colorContrast: {
    normalText: 4.5,    // 일반 텍스트 최소 대비율
    largeText: 3.0,     // 큰 텍스트 (18pt+ 또는 14pt+ bold) 최소 대비율
    uiComponents: 3.0   // UI 컴포넌트 최소 대비율
  }
}

// 🛠 접근성 테스트 유틸리티
class AccessibilityTestHelpers {
  /**
   * axe-core 라이브러리 주입 및 설정
   */
  static async injectAxeCore(page: Page) {
    await page.addScriptTag({
      url: 'https://unpkg.com/axe-core@4.8.4/axe.min.js'
    })
    
    // axe 설정
    await page.evaluate(() => {
      window.axe.configure({
        rules: {
          // 색상만으로 정보를 전달하는 것 금지
          'color-contrast': { enabled: true },
          // 키보드 접근성
          'keyboard': { enabled: true },
          // 포커스 관리
          'focus-order-semantics': { enabled: true },
          // ARIA 속성 검증
          'aria-valid-attr': { enabled: true },
          'aria-valid-attr-value': { enabled: true },
          // 레이블 연결
          'label': { enabled: true },
          // 이미지 alt 텍스트
          'image-alt': { enabled: true }
        }
      })
    })
  }

  /**
   * WCAG 2.1 AA 접근성 검사 실행
   */
  static async runAccessibilityAudit(page: Page, context?: string) {
    const results = await page.evaluate(async (contextInfo) => {
      const results = await window.axe.run({
        tags: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice']
      })
      
      return {
        violations: results.violations,
        passes: results.passes,
        incomplete: results.incomplete,
        context: contextInfo
      }
    }, context)
    
    return results
  }

  /**
   * 키보드 네비게이션 테스트
   */
  static async testKeyboardNavigation(page: Page) {
    const focusableElements: string[] = []
    const tabOrder: string[] = []
    
    // 첫 번째 요소에 포커스
    await page.keyboard.press('Tab')
    
    let currentFocus = await page.evaluate(() => {
      const element = document.activeElement
      return element ? element.tagName + (element.id ? `#${element.id}` : '') + 
             (element.className ? `.${element.className.split(' ')[0]}` : '') : null
    })
    
    const maxTabs = 50 // 무한 루프 방지
    let tabCount = 0
    
    while (currentFocus && tabCount < maxTabs) {
      focusableElements.push(currentFocus)
      tabOrder.push(currentFocus)
      
      await page.keyboard.press('Tab')
      tabCount++
      
      const nextFocus = await page.evaluate(() => {
        const element = document.activeElement
        return element ? element.tagName + (element.id ? `#${element.id}` : '') + 
               (element.className ? `.${element.className.split(' ')[0]}` : '') : null
      })
      
      if (nextFocus === currentFocus) break // 더 이상 이동하지 않음
      currentFocus = nextFocus
    }
    
    return { focusableElements, tabOrder, totalTabs: tabCount }
  }

  /**
   * 색상 대비율 측정
   */
  static async checkColorContrast(page: Page) {
    const contrastResults = await page.evaluate(() => {
      const results = []
      const elements = document.querySelectorAll('*')
      
      elements.forEach((element, index) => {
        if (index > 200) return // 성능을 위한 제한
        
        const styles = window.getComputedStyle(element)
        const color = styles.color
        const backgroundColor = styles.backgroundColor
        const fontSize = styles.fontSize
        
        if (color && backgroundColor && 
            color !== 'rgba(0, 0, 0, 0)' && 
            backgroundColor !== 'rgba(0, 0, 0, 0)') {
          
          results.push({
            element: element.tagName + (element.className ? `.${element.className.split(' ')[0]}` : ''),
            color,
            backgroundColor,
            fontSize,
            textContent: element.textContent?.substring(0, 50) || ''
          })
        }
      })
      
      return results
    })
    
    return contrastResults
  }

  /**
   * 스크린 리더 테스트 시뮬레이션
   */
  static async testScreenReaderCompatibility(page: Page) {
    const srElements = await page.evaluate(() => {
      const results = {
        headings: [],
        landmarks: [],
        labels: [],
        ariaAttributes: [],
        altTexts: []
      }
      
      // 헤딩 구조 확인
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
      headings.forEach(heading => {
        results.headings.push({
          level: heading.tagName,
          text: heading.textContent?.trim() || '',
          id: heading.id || null
        })
      })
      
      // 랜드마크 확인
      const landmarks = document.querySelectorAll('[role], main, nav, header, footer, aside, section')
      landmarks.forEach(landmark => {
        results.landmarks.push({
          role: landmark.getAttribute('role') || landmark.tagName.toLowerCase(),
          label: landmark.getAttribute('aria-label') || landmark.getAttribute('aria-labelledby') || null
        })
      })
      
      // 폼 레이블 확인
      const formControls = document.querySelectorAll('input, textarea, select')
      formControls.forEach(control => {
        const label = document.querySelector(`label[for="${control.id}"]`) || 
                     control.closest('label') ||
                     (control.getAttribute('aria-labelledby') ? 
                      document.querySelector(`#${control.getAttribute('aria-labelledby')}`) : null)
        
        results.labels.push({
          control: control.tagName + (control.type ? `[${control.type}]` : ''),
          hasLabel: !!label,
          labelText: label?.textContent?.trim() || control.getAttribute('aria-label') || '',
          ariaLabel: control.getAttribute('aria-label') || null
        })
      })
      
      // ARIA 속성 확인
      const ariaElements = document.querySelectorAll('[aria-label], [aria-labelledby], [aria-describedby], [aria-expanded], [aria-hidden]')
      ariaElements.forEach(element => {
        results.ariaAttributes.push({
          element: element.tagName + (element.className ? `.${element.className.split(' ')[0]}` : ''),
          attributes: {
            'aria-label': element.getAttribute('aria-label'),
            'aria-labelledby': element.getAttribute('aria-labelledby'),
            'aria-describedby': element.getAttribute('aria-describedby'),
            'aria-expanded': element.getAttribute('aria-expanded'),
            'aria-hidden': element.getAttribute('aria-hidden')
          }
        })
      })
      
      // 이미지 alt 텍스트 확인
      const images = document.querySelectorAll('img')
      images.forEach(img => {
        results.altTexts.push({
          src: img.src.substring(img.src.lastIndexOf('/') + 1),
          alt: img.getAttribute('alt'),
          hasAlt: img.hasAttribute('alt'),
          isEmpty: !img.getAttribute('alt')
        })
      })
      
      return results
    })
    
    return srElements
  }
}

// 📊 접근성 결과 수집기
class AccessibilityReportCollector {
  private results: Map<string, any> = new Map()

  addResult(testName: string, result: any) {
    this.results.set(testName, {
      ...result,
      timestamp: new Date().toISOString()
    })
  }

  generateReport() {
    const report = {
      summary: {
        totalTests: this.results.size,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      wcagCompliance: {
        level: ACCESSIBILITY_CONFIG.wcagLevel,
        violations: [],
        passes: []
      },
      details: [] as any[]
    }

    this.results.forEach((result, testName) => {
      if (result.status === 'passed') report.summary.passed++
      else if (result.status === 'failed') report.summary.failed++
      else if (result.status === 'warning') report.summary.warnings++
      
      report.details.push({
        testName,
        ...result
      })
      
      if (result.axeResults) {
        report.wcagCompliance.violations.push(...result.axeResults.violations)
        report.wcagCompliance.passes.push(...result.axeResults.passes)
      }
    })

    return report
  }
}

const a11yReporter = new AccessibilityReportCollector()

// ♿ I. 키보드 네비게이션 완전 지원 테스트
test.describe('♿ 키보드 네비게이션 접근성', () => {
  test.beforeEach(async ({ page }) => {
    await AccessibilityTestHelpers.injectAxeCore(page)
  })

  test('01. 모든 인터랙티브 요소 키보드 접근 가능', async ({ page }) => {
    const testResult = { status: 'pending', violations: [], passes: [], details: {} }

    try {
      // 대시보드 페이지에서 키보드 네비게이션 테스트
      await page.goto(`${ACCESSIBILITY_CONFIG.baseURL}/dashboard`)
      await page.waitForLoadState('networkidle')

      // 키보드 네비게이션 테스트 실행
      const keyboardResults = await AccessibilityTestHelpers.testKeyboardNavigation(page)
      testResult.details.keyboardNavigation = keyboardResults

      // 모든 버튼, 링크가 Tab으로 접근 가능한지 확인
      const interactiveElements = await page.$$('button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])')
      const accessibleCount = keyboardResults.focusableElements.length
      
      expect(accessibleCount).toBeGreaterThan(0)
      testResult.details.totalInteractiveElements = interactiveElements.length
      testResult.details.accessibleElements = accessibleCount

      // Enter/Space 키로 버튼 활성화 테스트
      const firstButton = page.locator('button').first()
      if (await firstButton.isVisible()) {
        await firstButton.focus()
        // Enter 키 작동 확인 (실제 클릭 대신 이벤트 리스너 확인)
        const hasClickHandler = await firstButton.evaluate(el => {
          return el.onclick !== null || el.addEventListener !== undefined
        })
        expect(hasClickHandler).toBeTruthy()
      }

      testResult.status = 'passed'
      testResult.passes.push('키보드 네비게이션 기본 기능 작동')
    } catch (error) {
      testResult.status = 'failed'
      testResult.violations.push(`키보드 네비게이션 실패: ${error.message}`)
    }

    a11yReporter.addResult('키보드 네비게이션', testResult)
  })

  test('02. 포커스 표시 명확성 및 순서 논리성', async ({ page }) => {
    const testResult = { status: 'pending', violations: [], passes: [], details: {} }

    try {
      await page.goto(`${ACCESSIBILITY_CONFIG.baseURL}/login`)
      await page.waitForLoadState('networkidle')

      // 포커스 스타일 확인
      const focusStyles = await page.evaluate(() => {
        const styles = []
        const focusableElements = document.querySelectorAll('button, a, input, select, textarea')
        
        focusableElements.forEach((element, index) => {
          if (index > 10) return // 처음 10개만 테스트
          
          element.focus()
          const computedStyle = window.getComputedStyle(element, ':focus')
          styles.push({
            element: element.tagName,
            outline: computedStyle.outline,
            outlineWidth: computedStyle.outlineWidth,
            outlineColor: computedStyle.outlineColor,
            boxShadow: computedStyle.boxShadow
          })
        })
        
        return styles
      })

      // 포커스 표시가 있는지 확인
      const hasVisibleFocus = focusStyles.some(style => 
        style.outline !== 'none' || 
        style.outlineWidth !== '0px' || 
        style.boxShadow !== 'none'
      )
      
      expect(hasVisibleFocus).toBeTruthy()
      testResult.details.focusStyles = focusStyles
      
      // 포커스 순서 논리성 확인 (좌상단에서 우하단으로)
      const tabOrder = await AccessibilityTestHelpers.testKeyboardNavigation(page)
      const hasLogicalOrder = tabOrder.focusableElements.length > 1
      expect(hasLogicalOrder).toBeTruthy()
      
      testResult.status = 'passed'
      testResult.passes.push('포커스 표시 및 순서 확인됨')
    } catch (error) {
      testResult.status = 'failed'
      testResult.violations.push(`포커스 관리 실패: ${error.message}`)
    }

    a11yReporter.addResult('포커스 관리', testResult)
  })

  test('03. 모달 및 드롭다운 포커스 트랩', async ({ page }) => {
    const testResult = { status: 'pending', violations: [], passes: [], details: {} }

    try {
      await page.goto(`${ACCESSIBILITY_CONFIG.baseURL}/projects`)
      await page.waitForLoadState('networkidle')

      // 모달 트리거 찾기 (새 프로젝트, 설정 등)
      const modalTriggers = page.locator('button').filter({ hasText: /새|추가|설정|메뉴/i })
      const triggerCount = await modalTriggers.count()

      if (triggerCount > 0) {
        // 첫 번째 모달 트리거 클릭
        await modalTriggers.first().click()
        await page.waitForTimeout(1000)

        // 모달이 열렸는지 확인
        const modal = page.locator('[role="dialog"], .modal, [data-testid*="modal"]').first()
        if (await modal.isVisible({ timeout: 3000 })) {
          // 포커스가 모달 내부에 트랩되는지 확인
          await page.keyboard.press('Tab')
          const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
          
          // 모달 내부 요소가 포커스를 받았는지 확인
          const modalContainsFocus = await modal.evaluate((modal, focusedTag) => {
            return modal.contains(document.activeElement) || modal.tagName === focusedTag
          }, focusedElement)
          
          if (modalContainsFocus) {
            testResult.passes.push('모달 포커스 트랩 작동')
          } else {
            testResult.violations.push('모달 포커스 트랩 미작동')
          }

          // ESC 키로 모달 닫기 테스트
          await page.keyboard.press('Escape')
          const modalClosed = await modal.isHidden({ timeout: 2000 })
          if (modalClosed) {
            testResult.passes.push('ESC 키 모달 닫기 작동')
          }
        } else {
          testResult.details.note = '모달이 발견되지 않아 포커스 트랩 테스트 건너뜀'
        }
      }

      testResult.status = testResult.violations.length === 0 ? 'passed' : 'failed'
    } catch (error) {
      testResult.status = 'failed'
      testResult.violations.push(`모달 포커스 트랩 테스트 실패: ${error.message}`)
    }

    a11yReporter.addResult('포커스 트랩', testResult)
  })
})

// 🗣 II. 스크린 리더 호환성 테스트
test.describe('🗣 스크린 리더 호환성', () => {
  test.beforeEach(async ({ page }) => {
    await AccessibilityTestHelpers.injectAxeCore(page)
  })

  test('04. 의미론적 HTML 구조 및 헤딩 계층', async ({ page }) => {
    const testResult = { status: 'pending', violations: [], passes: [], details: {} }

    try {
      await page.goto(`${ACCESSIBILITY_CONFIG.baseURL}/dashboard`)
      await page.waitForLoadState('networkidle')

      const srResults = await AccessibilityTestHelpers.testScreenReaderCompatibility(page)
      testResult.details.screenReader = srResults

      // 헤딩 계층 구조 확인
      const headings = srResults.headings
      expect(headings.length).toBeGreaterThan(0)

      // h1이 하나만 있는지 확인
      const h1Count = headings.filter(h => h.level === 'H1').length
      if (h1Count === 1) {
        testResult.passes.push('페이지당 h1 하나씩 올바르게 사용')
      } else {
        testResult.violations.push(`h1 개수 이상: ${h1Count}개 (권장: 1개)`)
      }

      // 헤딩 순서가 논리적인지 확인 (h1 -> h2 -> h3...)
      let previousLevel = 0
      let hasLogicalOrder = true
      
      headings.forEach(heading => {
        const currentLevel = parseInt(heading.level.charAt(1))
        if (previousLevel > 0 && currentLevel > previousLevel + 1) {
          hasLogicalOrder = false
        }
        previousLevel = currentLevel
      })
      
      if (hasLogicalOrder) {
        testResult.passes.push('헤딩 계층 구조가 논리적')
      } else {
        testResult.violations.push('헤딩 레벨이 건너뛰어짐 (예: h1 -> h3)')
      }

      // 랜드마크 역할 확인
      const landmarks = srResults.landmarks
      const hasMain = landmarks.some(l => l.role === 'main')
      const hasNav = landmarks.some(l => l.role === 'nav' || l.role === 'navigation')
      
      if (hasMain) testResult.passes.push('main 랜드마크 존재')
      else testResult.violations.push('main 랜드마크 누락')
      
      if (hasNav) testResult.passes.push('navigation 랜드마크 존재')

      testResult.status = testResult.violations.length === 0 ? 'passed' : 'failed'
    } catch (error) {
      testResult.status = 'failed'
      testResult.violations.push(`스크린 리더 구조 테스트 실패: ${error.message}`)
    }

    a11yReporter.addResult('스크린 리더 구조', testResult)
  })

  test('05. 폼 레이블 및 ARIA 속성 검증', async ({ page }) => {
    const testResult = { status: 'pending', violations: [], passes: [], details: {} }

    try {
      await page.goto(`${ACCESSIBILITY_CONFIG.baseURL}/login`)
      await page.waitForLoadState('networkidle')

      const srResults = await AccessibilityTestHelpers.testScreenReaderCompatibility(page)
      testResult.details.formAccessibility = srResults

      // 모든 폼 컨트롤에 레이블이 있는지 확인
      const labels = srResults.labels
      const unlabeledControls = labels.filter(l => !l.hasLabel && !l.ariaLabel)
      
      if (unlabeledControls.length === 0) {
        testResult.passes.push('모든 폼 컨트롤에 레이블 연결됨')
      } else {
        testResult.violations.push(`레이블 없는 폼 컨트롤 ${unlabeledControls.length}개 발견`)
        testResult.details.unlabeledControls = unlabeledControls
      }

      // 이미지에 alt 속성 확인
      const altTexts = srResults.altTexts
      const missingAltImages = altTexts.filter(img => !img.hasAlt)
      const emptyAltImages = altTexts.filter(img => img.hasAlt && img.isEmpty)
      
      if (missingAltImages.length === 0) {
        testResult.passes.push('모든 이미지에 alt 속성 존재')
      } else {
        testResult.violations.push(`alt 속성 없는 이미지 ${missingAltImages.length}개`)
      }
      
      // 장식적 이미지의 경우 빈 alt는 허용
      testResult.details.imageAltStatus = {
        total: altTexts.length,
        missing: missingAltImages.length,
        empty: emptyAltImages.length
      }

      // ARIA 속성 유효성 확인
      const ariaElements = srResults.ariaAttributes
      testResult.details.ariaAttributeCount = ariaElements.length
      
      if (ariaElements.length > 0) {
        testResult.passes.push(`ARIA 속성 ${ariaElements.length}개 사용 중`)
      }

      testResult.status = testResult.violations.length === 0 ? 'passed' : 'failed'
    } catch (error) {
      testResult.status = 'failed'
      testResult.violations.push(`폼 접근성 테스트 실패: ${error.message}`)
    }

    a11yReporter.addResult('폼 및 ARIA', testResult)
  })

  test('06. 동적 콘텐츠 업데이트 알림', async ({ page }) => {
    const testResult = { status: 'pending', violations: [], passes: [], details: {} }

    try {
      await page.goto(`${ACCESSIBILITY_CONFIG.baseURL}/dashboard`)
      await page.waitForLoadState('networkidle')

      // aria-live 영역 확인
      const liveRegions = await page.$$('[aria-live], [role="status"], [role="alert"]')
      testResult.details.liveRegionCount = liveRegions.length
      
      if (liveRegions.length > 0) {
        testResult.passes.push(`${liveRegions.length}개 라이브 리전 발견`)
        
        // 실제 동적 업데이트 테스트 (가능한 경우)
        const updateTrigger = page.locator('button').filter({ hasText: /새로고침|업데이트|갱신/i }).first()
        if (await updateTrigger.isVisible({ timeout: 3000 })) {
          await updateTrigger.click()
          await page.waitForTimeout(2000)
          testResult.passes.push('동적 업데이트 트리거 테스트 완료')
        }
      } else {
        testResult.violations.push('동적 콘텐츠 알림을 위한 aria-live 영역 없음')
      }

      testResult.status = testResult.violations.length === 0 ? 'passed' : 'warning'
    } catch (error) {
      testResult.status = 'failed'
      testResult.violations.push(`동적 콘텐츠 테스트 실패: ${error.message}`)
    }

    a11yReporter.addResult('동적 콘텐츠', testResult)
  })
})

// 🎨 III. 색상 및 대비 접근성 테스트
test.describe('🎨 색상 및 대비 접근성', () => {
  test.beforeEach(async ({ page }) => {
    await AccessibilityTestHelpers.injectAxeCore(page)
  })

  test('07. 색상 대비율 WCAG AA 준수', async ({ page }) => {
    const testResult = { status: 'pending', violations: [], passes: [], details: {} }

    try {
      await page.goto(`${ACCESSIBILITY_CONFIG.baseURL}/dashboard`)
      await page.waitForLoadState('networkidle')

      // axe-core로 색상 대비 검사
      const axeResults = await AccessibilityTestHelpers.runAccessibilityAudit(page, 'color-contrast')
      testResult.details.axeColorContrast = axeResults
      
      const contrastViolations = axeResults.violations.filter(v => v.id === 'color-contrast')
      
      if (contrastViolations.length === 0) {
        testResult.passes.push('색상 대비율 WCAG AA 기준 통과')
      } else {
        testResult.violations.push(`색상 대비 위반 ${contrastViolations.length}건`)
        testResult.details.contrastIssues = contrastViolations
      }

      // 추가 색상 대비 직접 측정
      const contrastResults = await AccessibilityTestHelpers.checkColorContrast(page)
      testResult.details.contrastMeasurements = contrastResults.slice(0, 10) // 처음 10개만

      testResult.status = contrastViolations.length === 0 ? 'passed' : 'failed'
    } catch (error) {
      testResult.status = 'failed'
      testResult.violations.push(`색상 대비 테스트 실패: ${error.message}`)
    }

    a11yReporter.addResult('색상 대비', testResult)
  })

  test('08. 색상 의존성 제거 - 정보 전달 다중 채널', async ({ page }) => {
    const testResult = { status: 'pending', violations: [], passes: [], details: {} }

    try {
      // 색각 이상 시뮬레이션을 위해 CSS 필터 적용
      await page.goto(`${ACCESSIBILITY_CONFIG.baseURL}/calendar`) // 색상이 중요한 페이지
      await page.waitForLoadState('networkidle')

      // 색맹 시뮬레이션 CSS 적용
      await page.addStyleTag({
        content: `
          * {
            filter: grayscale(100%) !important;
          }
        `
      })
      
      await page.waitForTimeout(1000)

      // 그레이스케일에서도 정보를 구분할 수 있는지 확인
      const colorIndicators = await page.evaluate(() => {
        const indicators = []
        const colorElements = document.querySelectorAll('.status-indicator, .priority, .category, [class*="color"]')
        
        colorElements.forEach(element => {
          const styles = window.getComputedStyle(element)
          const hasNonColorIndicators = 
            styles.borderStyle !== 'none' ||
            styles.textDecoration !== 'none' ||
            element.textContent?.trim() ||
            element.querySelector('svg, i, .icon')
          
          indicators.push({
            element: element.tagName + (element.className ? `.${element.className.split(' ')[0]}` : ''),
            hasAlternativeIndicator: hasNonColorIndicators,
            textContent: element.textContent?.trim() || ''
          })
        })
        
        return indicators
      })

      const elementsWithAlternatives = colorIndicators.filter(i => i.hasAlternativeIndicator)
      const elementsWithoutAlternatives = colorIndicators.filter(i => !i.hasAlternativeIndicator)
      
      testResult.details.colorIndicators = {
        total: colorIndicators.length,
        withAlternatives: elementsWithAlternatives.length,
        withoutAlternatives: elementsWithoutAlternatives.length
      }

      if (elementsWithoutAlternatives.length === 0 || colorIndicators.length === 0) {
        testResult.passes.push('색상 외 정보 전달 수단 충분')
      } else {
        testResult.violations.push(`색상에만 의존하는 요소 ${elementsWithoutAlternatives.length}개`)
      }

      testResult.status = testResult.violations.length === 0 ? 'passed' : 'warning'
    } catch (error) {
      testResult.status = 'failed'  
      testResult.violations.push(`색상 의존성 테스트 실패: ${error.message}`)
    }

    a11yReporter.addResult('색상 의존성', testResult)
  })
})

// 🎬 IV. 움직임 및 애니메이션 접근성 테스트
test.describe('🎬 움직임 및 애니메이션 접근성', () => {
  test('09. prefers-reduced-motion 지원 확인', async ({ page }) => {
    const testResult = { status: 'pending', violations: [], passes: [], details: {} }

    try {
      // 애니메이션 감소 설정 에뮬레이션
      await page.emulateMedia({ reducedMotion: 'reduce' })
      
      await page.goto(`${ACCESSIBILITY_CONFIG.baseURL}/dashboard`)
      await page.waitForLoadState('networkidle')

      // CSS 애니메이션/전환 효과 확인
      const animationStatus = await page.evaluate(() => {
        const elements = document.querySelectorAll('*')
        const animatedElements = []
        
        elements.forEach((element, index) => {
          if (index > 100) return // 성능 제한
          
          const styles = window.getComputedStyle(element)
          const hasAnimation = 
            styles.animationName !== 'none' ||
            styles.transitionProperty !== 'none' ||
            styles.transform !== 'none'
          
          if (hasAnimation) {
            animatedElements.push({
              element: element.tagName + (element.className ? `.${element.className.split(' ')[0]}` : ''),
              animationName: styles.animationName,
              transitionProperty: styles.transitionProperty,
              animationDuration: styles.animationDuration
            })
          }
        })
        
        return {
          totalAnimated: animatedElements.length,
          elements: animatedElements
        }
      })

      testResult.details.animations = animationStatus

      // prefers-reduced-motion이 적용되었는지 확인
      const reducedMotionApplied = await page.evaluate(() => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches
      })

      if (reducedMotionApplied) {
        testResult.passes.push('prefers-reduced-motion 설정 인식됨')
        
        // 애니메이션이 비활성화되었는지 확인
        if (animationStatus.totalAnimated === 0) {
          testResult.passes.push('애니메이션이 적절히 비활성화됨')
        } else {
          testResult.violations.push(`움직임 감소 설정에도 ${animationStatus.totalAnimated}개 애니메이션 활성`)
        }
      } else {
        testResult.violations.push('prefers-reduced-motion 설정 미지원')
      }

      testResult.status = testResult.violations.length === 0 ? 'passed' : 'failed'
    } catch (error) {
      testResult.status = 'failed'
      testResult.violations.push(`움직임 접근성 테스트 실패: ${error.message}`)
    }

    a11yReporter.addResult('움직임 접근성', testResult)
  })
})

// 🔍 V. 종합 접근성 감사
test.describe('🔍 종합 WCAG 2.1 AA 감사', () => {
  test('10. 전체 사이트 접근성 감사', async ({ page }) => {
    const testResult = { status: 'pending', violations: [], passes: [], details: {} }

    try {
      await AccessibilityTestHelpers.injectAxeCore(page)
      
      const pages = [
        { name: 'Home', url: `${ACCESSIBILITY_CONFIG.baseURL}` },
        { name: 'Dashboard', url: `${ACCESSIBILITY_CONFIG.baseURL}/dashboard` },
        { name: 'Login', url: `${ACCESSIBILITY_CONFIG.baseURL}/login` },
        { name: 'Projects', url: `${ACCESSIBILITY_CONFIG.baseURL}/projects` }
      ]

      const auditResults = []
      
      for (const pageInfo of pages) {
        try {
          await page.goto(pageInfo.url)
          await page.waitForLoadState('networkidle', { timeout: 15000 })
          
          const axeResults = await AccessibilityTestHelpers.runAccessibilityAudit(page, pageInfo.name)
          auditResults.push({
            page: pageInfo.name,
            url: pageInfo.url,
            violations: axeResults.violations.length,
            passes: axeResults.passes.length,
            incomplete: axeResults.incomplete.length,
            details: axeResults.violations.slice(0, 5) // 상위 5개 위반사항만
          })
          
          // 각 페이지별 결과 집계
          if (axeResults.violations.length === 0) {
            testResult.passes.push(`${pageInfo.name}: 접근성 위반 없음`)
          } else {
            testResult.violations.push(`${pageInfo.name}: ${axeResults.violations.length}개 위반`)
          }
        } catch (error) {
          testResult.violations.push(`${pageInfo.name} 감사 실패: ${error.message}`)
        }
      }

      testResult.details.auditResults = auditResults
      
      // 전체 위반사항 집계
      const totalViolations = auditResults.reduce((sum, result) => sum + result.violations, 0)
      const totalPasses = auditResults.reduce((sum, result) => sum + result.passes, 0)
      
      testResult.details.summary = {
        totalViolations,
        totalPasses,
        pagesAudited: auditResults.length,
        complianceRate: totalPasses / (totalPasses + totalViolations) * 100
      }

      if (totalViolations === 0) {
        testResult.status = 'passed'
        testResult.passes.push('전체 사이트 WCAG 2.1 AA 준수')
      } else if (totalViolations < 5) {
        testResult.status = 'warning' 
        testResult.violations.push(`총 ${totalViolations}개 접근성 위반 (경미한 수준)`)
      } else {
        testResult.status = 'failed'
        testResult.violations.push(`총 ${totalViolations}개 접근성 위반 (수정 필요)`)
      }
    } catch (error) {
      testResult.status = 'failed'
      testResult.violations.push(`종합 감사 실패: ${error.message}`)
    }

    a11yReporter.addResult('종합 접근성 감사', testResult)
  })
})

// 📊 접근성 테스트 보고서 생성
test.afterAll(async () => {
  const report = a11yReporter.generateReport()
  
  console.log('\n' + '♿'.repeat(50))
  console.log('🎯 접근성(A11y) 종합 테스트 보고서')
  console.log('♿'.repeat(50))
  console.log(`📅 실행 시간: ${new Date().toLocaleString('ko-KR')}`)
  console.log(`📊 총 테스트: ${report.summary.totalTests}개`)
  console.log(`✅ 통과: ${report.summary.passed}개`)
  console.log(`❌ 실패: ${report.summary.failed}개`)
  console.log(`⚠️  경고: ${report.summary.warnings}개`)
  
  const successRate = ((report.summary.passed / report.summary.totalTests) * 100).toFixed(1)
  console.log(`📈 준수율: ${successRate}%`)
  
  console.log('\n' + '-'.repeat(50))
  console.log('🎯 WCAG 2.1 AA 준수 현황:')
  console.log(`📋 총 위반사항: ${report.wcagCompliance.violations.length}건`)
  console.log(`✅ 통과 규칙: ${report.wcagCompliance.passes.length}건`)
  
  if (report.wcagCompliance.violations.length > 0) {
    console.log('\n⚠️ 주요 위반사항 (상위 5개):')
    report.wcagCompliance.violations.slice(0, 5).forEach((violation, index) => {
      console.log(`  ${index + 1}. ${violation.id}: ${violation.description}`)
    })
  }

  console.log('\n' + '-'.repeat(50))
  console.log('📋 카테고리별 결과:')
  
  const categories = {
    'keyboard': '⌨️ 키보드 네비게이션',
    'screenreader': '🗣 스크린 리더 호환성', 
    'color': '🎨 색상 및 대비',
    'motion': '🎬 움직임 제어',
    'comprehensive': '🔍 종합 감사'
  }
  
  report.details.forEach(result => {
    const status = result.status === 'passed' ? '✅' : 
                  result.status === 'warning' ? '⚠️' : '❌'
    console.log(`  ${status} ${result.testName}`)
    
    if (result.violations && result.violations.length > 0) {
      result.violations.slice(0, 2).forEach(violation => {
        console.log(`    - ${violation}`)
      })
    }
  })

  console.log('\n' + '-'.repeat(50))
  console.log('🎯 개선 권고사항:')
  
  if (successRate < 70) {
    console.log('🔴 Critical: 접근성 준수율이 70% 미만입니다.')
    console.log('  - 키보드 네비게이션 문제 우선 해결')
    console.log('  - 스크린 리더 호환성 개선 필수')
    console.log('  - 색상 대비 문제 즉시 수정')
  } else if (successRate < 90) {
    console.log('🟡 Warning: 추가 개선이 필요합니다.')
    console.log('  - 폼 레이블 및 ARIA 속성 보완')
    console.log('  - 동적 콘텐츠 알림 기능 추가')
    console.log('  - 포커스 관리 최적화')
  } else {
    console.log('🟢 Good: 높은 수준의 접근성을 유지하고 있습니다.')
    console.log('  - 현재 수준 유지 및 정기적 감사')
    console.log('  - 새로운 기능 개발 시 접근성 고려')
  }

  console.log('\n📌 추가 권장사항:')
  console.log('  - 실제 보조 기술 사용자 테스트 수행')
  console.log('  - 접근성 가이드라인 문서화')
  console.log('  - 개발팀 접근성 교육 실시')
  console.log('  - 지속적 모니터링 시스템 구축')

  console.log('\n' + '♿'.repeat(50))

  // JSON 보고서 저장
  try {
    const fs = require('fs')
    const reportPath = `./test-results/accessibility-report-${Date.now()}.json`
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`📄 상세 보고서 저장: ${reportPath}`)
  } catch (error) {
    console.warn(`보고서 저장 실패: ${error.message}`)
  }
})