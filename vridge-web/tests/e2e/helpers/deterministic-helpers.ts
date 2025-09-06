/**
 * 결정론적 테스트 헬퍼 유틸리티
 * 플래키 테스트 방지 및 테스트 안정성 보장
 * 
 * @author Grace (QA Lead)
 * @date 2025-09-06
 * @purpose Zero-Flaky Testing, 100% Deterministic Results
 * @principles 시간 제어, 상태 격리, 확정적 대기, 환경 일관성
 */

import { Page, Locator, expect, BrowserContext } from '@playwright/test'
import { MockDataGenerator } from '../mocks/api-handlers'

// ⏰ 시간 제어 및 결정론적 타이밍
export class DeterministicTimeController {
  private static fixedTime = new Date('2025-09-06T10:00:00.000Z')
  
  /**
   * 페이지에서 시간을 고정된 값으로 설정
   */
  static async freezeTime(page: Page, fixedDate = this.fixedTime) {
    await page.addInitScript((time) => {
      // Date 객체 모킹
      const originalDate = Date
      Date = class extends originalDate {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(time)
          } else {
            super(...args)
          }
        }
        
        static now() {
          return new originalDate(time).getTime()
        }
      } as any
      
      // performance.now() 모킹
      let startTime = performance.now()
      const originalPerformanceNow = performance.now
      performance.now = () => {
        return originalPerformanceNow.call(performance) - startTime
      }
    }, fixedDate.getTime())
  }

  /**
   * 시간 진행 시뮬레이션
   */
  static async advanceTime(page: Page, milliseconds: number) {
    await page.evaluate((ms) => {
      // 타이머 시뮬레이션
      if (window.setTimeout) {
        const callbacks = []
        const originalSetTimeout = window.setTimeout
        window.setTimeout = ((callback, delay) => {
          if (delay <= ms) {
            setTimeout(callback, 0) // 즉시 실행
          }
          return 0
        }) as any
      }
    }, milliseconds)
  }
}

// 🎯 확정적 대기 패턴 (No More Race Conditions)
export class StableWaitPatterns {
  /**
   * 네트워크 유휴 상태까지 안전하게 대기
   */
  static async forNetworkIdle(page: Page, timeout = 30000) {
    await page.waitForLoadState('networkidle', { timeout })
    // 추가 안정화 시간 (네트워크 대기열 정리)
    await page.waitForTimeout(100)
  }

  /**
   * 요소가 DOM에서 완전히 안정화될 때까지 대기
   */
  static async forElementStability(page: Page, selector: string, timeout = 15000) {
    // 1. 요소 존재 확인
    await page.waitForSelector(selector, { state: 'visible', timeout })
    
    // 2. 요소 크기 안정화 대기
    await page.waitForFunction(
      (sel) => {
        const element = document.querySelector(sel)
        if (!element) return false
        
        const rect = element.getBoundingClientRect()
        return rect.width > 0 && rect.height > 0
      },
      selector,
      { timeout: 5000 }
    )
    
    // 3. CSS 애니메이션/전환 완료 대기
    await page.waitForFunction(
      (sel) => {
        const element = document.querySelector(sel)
        if (!element) return false
        
        const styles = window.getComputedStyle(element)
        return styles.animationName === 'none' || styles.animationPlayState === 'paused'
      },
      selector,
      { timeout: 3000 }
    ).catch(() => {
      // 애니메이션이 없는 경우 무시
    })

    // 4. 추가 안정화 시간
    await page.waitForTimeout(50)
  }

  /**
   * 상호작용 가능 상태까지 안전하게 대기
   */
  static async forInteractability(locator: Locator, timeout = 15000) {
    // 요소가 보이고 클릭 가능할 때까지 대기
    await expect(locator).toBeVisible({ timeout })
    await expect(locator).toBeEnabled({ timeout })
    
    // JavaScript로 요소 상태 검증
    await locator.evaluate((element) => {
      // 요소가 다른 요소에 의해 가려지지 않았는지 확인
      const rect = element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      const topElement = document.elementFromPoint(centerX, centerY)
      
      if (topElement !== element && !element.contains(topElement)) {
        throw new Error('Element is obscured by another element')
      }
    })
    
    // 클릭 안전성을 위한 짧은 대기
    await locator.page().waitForTimeout(100)
  }

  /**
   * 텍스트 콘텐츠 안정화 대기 (동적 로딩 콘텐츠)
   */
  static async forTextContent(locator: Locator, expectedPattern?: RegExp, timeout = 10000) {
    let previousText = ''
    let stableCount = 0
    const requiredStableChecks = 3
    
    await locator.page().waitForFunction(
      (element, pattern, previousTextRef, stableCountRef, required) => {
        const currentText = element.textContent?.trim() || ''
        
        if (currentText === previousTextRef.value) {
          stableCountRef.value++
        } else {
          stableCountRef.value = 0
          previousTextRef.value = currentText
        }
        
        const isStable = stableCountRef.value >= required
        const matchesPattern = pattern ? pattern.test(currentText) : true
        
        return isStable && matchesPattern && currentText.length > 0
      },
      await locator.elementHandle(),
      expectedPattern,
      { value: previousText },
      { value: stableCount },
      requiredStableChecks,
      { timeout, polling: 100 }
    )
  }

  /**
   * 폼 필드 안전 입력
   */
  static async safeFormInput(locator: Locator, value: string, options: {
    clear?: boolean,
    verify?: boolean,
    timeout?: number
  } = {}) {
    const { clear = true, verify = true, timeout = 10000 } = options
    
    // 1. 상호작용 가능 상태 대기
    await this.forInteractability(locator, timeout)
    
    // 2. 필드 초기화 (필요한 경우)
    if (clear) {
      await locator.clear()
      await locator.page().waitForTimeout(100)
    }
    
    // 3. 값 입력
    await locator.fill(value)
    
    // 4. 입력 값 검증 (필요한 경우)
    if (verify) {
      await expect(locator).toHaveValue(value)
    }
    
    // 5. 입력 완료 안정화
    await locator.page().waitForTimeout(100)
  }
}

// 🧪 테스트 상태 격리 관리자
export class TestStateManager {
  private static testData: Map<string, any> = new Map()
  
  /**
   * 테스트 시작 시 상태 초기화
   */
  static async initializeTestState(page: Page, context: BrowserContext) {
    // 1. 쿠키 모든 쿠키 제거
    await context.clearCookies()
    
    // 2. 로컬 스토리지 및 세션 스토리지 정리
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
      
      // IndexedDB 정리 (있다면)
      if (window.indexedDB) {
        indexedDB.databases?.().then(databases => {
          databases.forEach(db => {
            if (db.name) indexedDB.deleteDatabase(db.name)
          })
        })
      }
      
      // 캐시 정리
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name)
          })
        })
      }
    })
    
    // 3. 페이지 상태 초기화
    await page.setViewportSize({ width: 1280, height: 720 }) // 고정 뷰포트
    
    // 4. 네트워크 상태 초기화
    await page.setExtraHTTPHeaders({
      'User-Agent': 'Playwright-E2E-Test/1.0'
    })
    
    // 5. 시간 고정
    await DeterministicTimeController.freezeTime(page)
    
    console.log('[TestState] Test state initialized and isolated')
  }

  /**
   * 테스트 데이터 설정 (테스트 간 공유)
   */
  static setTestData(key: string, value: any) {
    this.testData.set(key, value)
  }

  /**
   * 테스트 데이터 조회
   */
  static getTestData(key: string) {
    return this.testData.get(key)
  }

  /**
   * 테스트 데이터 정리
   */
  static clearTestData() {
    this.testData.clear()
  }

  /**
   * 결정론적 테스트 사용자 생성
   */
  static createDeterministicUser(testName: string) {
    const user = MockDataGenerator.createUser({
      email: `${testName.replace(/\s+/g, '-').toLowerCase()}@e2etest.com`,
      name: `Test User for ${testName}`,
      id: `user_${testName.replace(/\s+/g, '_').toLowerCase()}`
    })
    
    this.setTestData(`user_${testName}`, user)
    return user
  }
}

// 🔍 정확한 요소 선택 도구
export class PreciseElementSelector {
  /**
   * 텍스트 내용으로 정확한 요소 찾기
   */
  static byExactText(page: Page, text: string, tag = '*') {
    return page.locator(`${tag}:text("${text}")`)
  }

  /**
   * 부분 텍스트 매칭 (대소문자 무시)
   */
  static byPartialText(page: Page, text: string, tag = '*') {
    return page.locator(`${tag}:text-matches("${text}", "i")`)
  }

  /**
   * 다중 속성으로 정확한 요소 찾기
   */
  static byMultipleAttributes(page: Page, attributes: Record<string, string>) {
    const attrSelectors = Object.entries(attributes)
      .map(([key, value]) => `[${key}="${value}"]`)
      .join('')
    
    return page.locator(attrSelectors)
  }

  /**
   * 보이는 요소 중에서만 선택 (숨겨진 요소 제외)
   */
  static visibleOnly(locator: Locator) {
    return locator.locator('visible=true')
  }

  /**
   * n번째 일치 요소 (0-based index)
   */
  static nth(locator: Locator, index: number) {
    return locator.nth(index)
  }

  /**
   * 첫 번째와 마지막 요소
   */
  static first(locator: Locator) {
    return locator.first()
  }

  static last(locator: Locator) {
    return locator.last()
  }
}

// 🎭 사용자 상호작용 시뮬레이터
export class ReliableUserActions {
  /**
   * 안전한 클릭 (오버레이, 로딩 상태 고려)
   */
  static async safeClick(locator: Locator, options: {
    timeout?: number,
    force?: boolean,
    waitForNavigation?: boolean
  } = {}) {
    const { timeout = 15000, force = false, waitForNavigation = false } = options
    
    // 1. 상호작용 가능 상태 대기
    await StableWaitPatterns.forInteractability(locator, timeout)
    
    // 2. 네비게이션 예상 시 대기 준비
    const navigationPromise = waitForNavigation 
      ? locator.page().waitForNavigation({ timeout: timeout })
      : Promise.resolve()
    
    // 3. 클릭 실행
    if (force) {
      await locator.click({ force: true, timeout })
    } else {
      await locator.click({ timeout })
    }
    
    // 4. 네비게이션 완료 대기 (필요한 경우)
    if (waitForNavigation) {
      await navigationPromise
      await StableWaitPatterns.forNetworkIdle(locator.page())
    }
    
    // 5. 클릭 후 안정화
    await locator.page().waitForTimeout(100)
  }

  /**
   * 안전한 호버 (마우스 오버)
   */
  static async safeHover(locator: Locator, timeout = 15000) {
    await StableWaitPatterns.forInteractability(locator, timeout)
    await locator.hover({ timeout })
    await locator.page().waitForTimeout(100) // 호버 효과 안정화
  }

  /**
   * 안전한 드래그앤드롭
   */
  static async safeDragAndDrop(
    source: Locator, 
    target: Locator, 
    options: { timeout?: number } = {}
  ) {
    const { timeout = 15000 } = options
    
    await StableWaitPatterns.forInteractability(source, timeout)
    await StableWaitPatterns.forInteractability(target, timeout)
    
    await source.dragTo(target, { timeout })
    await source.page().waitForTimeout(200) // 드롭 후 안정화
  }

  /**
   * 안전한 파일 업로드
   */
  static async safeFileUpload(
    fileInput: Locator, 
    filePaths: string[], 
    options: { timeout?: number } = {}
  ) {
    const { timeout = 15000 } = options
    
    await expect(fileInput).toBeVisible({ timeout })
    await fileInput.setInputFiles(filePaths, { timeout })
    await fileInput.page().waitForTimeout(500) // 파일 처리 안정화
  }
}

// 📊 테스트 메트릭 수집기
export class TestMetricsCollector {
  private static metrics: Map<string, any> = new Map()
  
  /**
   * 테스트 시작 시점 기록
   */
  static startTest(testName: string) {
    this.metrics.set(testName, {
      startTime: performance.now(),
      endTime: null,
      duration: null,
      status: 'running',
      steps: [],
      assertions: 0,
      errors: []
    })
  }

  /**
   * 테스트 종료 및 결과 기록
   */
  static endTest(testName: string, status: 'passed' | 'failed' | 'skipped') {
    const metric = this.metrics.get(testName)
    if (metric) {
      metric.endTime = performance.now()
      metric.duration = metric.endTime - metric.startTime
      metric.status = status
    }
  }

  /**
   * 테스트 단계 기록
   */
  static recordStep(testName: string, stepDescription: string) {
    const metric = this.metrics.get(testName)
    if (metric) {
      metric.steps.push({
        description: stepDescription,
        timestamp: performance.now() - metric.startTime
      })
    }
  }

  /**
   * 어서션 카운트 증가
   */
  static incrementAssertions(testName: string) {
    const metric = this.metrics.get(testName)
    if (metric) {
      metric.assertions++
    }
  }

  /**
   * 에러 기록
   */
  static recordError(testName: string, error: Error) {
    const metric = this.metrics.get(testName)
    if (metric) {
      metric.errors.push({
        message: error.message,
        stack: error.stack,
        timestamp: performance.now() - metric.startTime
      })
    }
  }

  /**
   * 모든 메트릭 조회
   */
  static getAllMetrics() {
    return new Map(this.metrics)
  }

  /**
   * 메트릭 정리
   */
  static clearMetrics() {
    this.metrics.clear()
  }
}

// 🌍 환경 일관성 보장
export class EnvironmentNormalizer {
  /**
   * 브라우저 환경 정규화
   */
  static async normalizeBrowserEnvironment(page: Page) {
    // 1. 타임존 고정 (UTC)
    await page.emulateTimezone('UTC')
    
    // 2. 언어 및 지역 설정 고정
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8'
    })
    
    // 3. 색상 scheme 고정
    await page.emulateMedia({ colorScheme: 'light' })
    
    // 4. 애니메이션 비활성화 (성능 및 안정성)
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-delay: 0.01ms !important;
          transition-duration: 0.01ms !important;
          transition-delay: 0.01ms !important;
        }
      `
    })
    
    // 5. 스크롤 동작 정규화
    await page.evaluate(() => {
      // 부드러운 스크롤 비활성화
      document.documentElement.style.scrollBehavior = 'auto'
    })
  }

  /**
   * 네트워크 조건 정규화
   */
  static async normalizeNetworkConditions(page: Page) {
    // 안정적인 네트워크 조건 시뮬레이션 (4G)
    const client = await page.context().newCDPSession(page)
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8, // 1.5 Mbps
      uploadThroughput: 750 * 1024 / 8, // 750 kbps  
      latency: 40 // 40ms RTT
    })
    
    return client
  }
}

// 🔄 재시도 및 복구 전략
export class RetryStrategy {
  /**
   * 지수 백오프를 사용한 재시도
   */
  static async withExponentialBackoff<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    baseDelay = 1000
  ): Promise<T> {
    let lastError: Error
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries) {
          throw error
        }
        
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`[Retry] Attempt ${attempt} failed, retrying in ${delay}ms...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError!
  }

  /**
   * 상태 기반 재시도
   */
  static async untilConditionMet<T>(
    operation: () => Promise<T>,
    condition: (result: T) => boolean,
    options: {
      maxAttempts?: number,
      interval?: number,
      timeout?: number
    } = {}
  ): Promise<T> {
    const { maxAttempts = 10, interval = 500, timeout = 30000 } = options
    const startTime = Date.now()
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout after ${timeout}ms`)
      }
      
      try {
        const result = await operation()
        if (condition(result)) {
          return result
        }
      } catch (error) {
        if (attempt === maxAttempts) {
          throw error
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, interval))
    }
    
    throw new Error(`Condition not met after ${maxAttempts} attempts`)
  }
}

// 내보내기
export {
  DeterministicTimeController,
  StableWaitPatterns, 
  TestStateManager,
  PreciseElementSelector,
  ReliableUserActions,
  TestMetricsCollector,
  EnvironmentNormalizer,
  RetryStrategy
}