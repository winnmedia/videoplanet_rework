/**
 * 포괄적인 성능 측정 E2E 테스트 스위트
 * Core Web Vitals, 로딩 성능, 런타임 성능 측정
 * 
 * @author Grace (QA Lead)
 * @date 2025-09-06
 * @metrics LCP, FID, CLS, TTFB, FCP
 * @coverage 페이지 로딩, 사용자 인터랙션, 네트워크 최적화, 메모리 사용량
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import type { CDPSession } from '@playwright/test'

// ⚡ 성능 측정 설정
const PERFORMANCE_CONFIG = {
  baseURL: 'https://vridge-xyc331ybx-vlanets-projects.vercel.app',
  // Core Web Vitals 기준선 (Google 권장)
  thresholds: {
    LCP: {
      good: 2500,      // Good: ≤ 2.5s
      needsWork: 4000  // Needs Improvement: 2.5s - 4.0s
    },
    FID: {
      good: 100,       // Good: ≤ 100ms
      needsWork: 300   // Needs Improvement: 100ms - 300ms
    },
    CLS: {
      good: 0.1,       // Good: ≤ 0.1
      needsWork: 0.25  // Needs Improvement: 0.1 - 0.25
    },
    TTFB: {
      good: 800,       // Good: ≤ 800ms
      needsWork: 1800  // Needs Improvement: 800ms - 1800ms
    },
    FCP: {
      good: 1800,      // Good: ≤ 1.8s
      needsWork: 3000  // Needs Improvement: 1.8s - 3.0s
    },
    // 추가 성능 메트릭
    Speed: {
      loadTime: 3000,          // 전체 로드 시간
      domContentLoaded: 2000,  // DOM 콘텐츠 로드
      networkIdle: 5000        // 네트워크 유휴 상태
    }
  },
  // 네트워크 시뮬레이션 설정
  networkConditions: {
    '4G': { downloadThroughput: 1.5 * 1024 * 1024 / 8, uploadThroughput: 750 * 1024 / 8, latency: 40 },
    '3G': { downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8, latency: 150 },
    'Slow3G': { downloadThroughput: 400 * 1024 / 8, uploadThroughput: 400 * 1024 / 8, latency: 400 }
  }
}

// 🛠 성능 측정 유틸리티
class PerformanceTestHelpers {
  /**
   * Core Web Vitals 측정
   */
  static async measureCoreWebVitals(page: Page): Promise<any> {
    return await page.evaluate(() => {
      return new Promise((resolve) => {
        const vitals = {
          LCP: null,
          FID: null,
          CLS: null,
          FCP: null,
          TTFB: null
        }

        // LCP (Largest Contentful Paint) 측정
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          const lastEntry = entries[entries.length - 1]
          vitals.LCP = lastEntry.startTime
        }).observe({ entryTypes: ['largest-contentful-paint'] })

        // FID (First Input Delay) 측정
        new PerformanceObserver((entryList) => {
          const firstInput = entryList.getEntries()[0]
          vitals.FID = firstInput.processingStart - firstInput.startTime
        }).observe({ entryTypes: ['first-input'] })

        // CLS (Cumulative Layout Shift) 측정
        let clsValue = 0
        new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            if (!entry.hadRecentInput) {
              clsValue += entry.value
            }
          }
          vitals.CLS = clsValue
        }).observe({ entryTypes: ['layout-shift'] })

        // FCP (First Contentful Paint) 측정
        new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
          if (fcpEntry) {
            vitals.FCP = fcpEntry.startTime
          }
        }).observe({ entryTypes: ['paint'] })

        // TTFB (Time to First Byte) 측정
        const navigationEntry = performance.getEntriesByType('navigation')[0]
        if (navigationEntry) {
          vitals.TTFB = navigationEntry.responseStart - navigationEntry.requestStart
        }

        // 3초 후 결과 반환 (모든 메트릭이 수집될 시간을 확보)
        setTimeout(() => {
          resolve(vitals)
        }, 3000)
      })
    })
  }

  /**
   * 페이지 로딩 성능 메트릭
   */
  static async measurePageLoadMetrics(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      const paint = performance.getEntriesByType('paint')
      
      return {
        // 네트워크 타이밍
        dnsLookup: navigation.domainLookupEnd - navigation.domainLookupStart,
        tcpConnection: navigation.connectEnd - navigation.connectStart,
        sslHandshake: navigation.secureConnectionStart > 0 ? 
          navigation.connectEnd - navigation.secureConnectionStart : 0,
        
        // 요청/응답 타이밍
        ttfb: navigation.responseStart - navigation.requestStart,
        responseTime: navigation.responseEnd - navigation.responseStart,
        
        // DOM 처리 타이밍
        domInteractive: navigation.domInteractive - navigation.navigationStart,
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.navigationStart,
        domComplete: navigation.domComplete - navigation.navigationStart,
        
        // 로드 완료 타이밍
        loadEventStart: navigation.loadEventStart - navigation.navigationStart,
        loadEventEnd: navigation.loadEventEnd - navigation.navigationStart,
        
        // 페인트 타이밍
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        
        // 총 로딩 시간
        totalLoadTime: navigation.loadEventEnd - navigation.navigationStart
      }
    })
  }

  /**
   * 리소스 로딩 성능 분석
   */
  static async analyzeResourcePerformance(page: Page): Promise<any> {
    return await page.evaluate(() => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      
      const analysis = {
        totalResources: resources.length,
        byType: {} as any,
        slowestResources: [] as any[],
        largestResources: [] as any[],
        totalTransferSize: 0,
        totalEncodedSize: 0
      }

      // 리소스 타입별 분류
      resources.forEach(resource => {
        const type = resource.initiatorType || 'other'
        if (!analysis.byType[type]) {
          analysis.byType[type] = {
            count: 0,
            totalDuration: 0,
            totalSize: 0
          }
        }
        
        analysis.byType[type].count++
        analysis.byType[type].totalDuration += resource.duration
        analysis.byType[type].totalSize += resource.transferSize || 0
        
        analysis.totalTransferSize += resource.transferSize || 0
        analysis.totalEncodedSize += resource.encodedBodySize || 0
      })

      // 가장 느린 리소스 상위 5개
      analysis.slowestResources = resources
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)
        .map(r => ({
          name: r.name.split('/').pop() || r.name,
          type: r.initiatorType,
          duration: Math.round(r.duration),
          transferSize: r.transferSize || 0
        }))

      // 가장 큰 리소스 상위 5개  
      analysis.largestResources = resources
        .filter(r => r.transferSize > 0)
        .sort((a, b) => (b.transferSize || 0) - (a.transferSize || 0))
        .slice(0, 5)
        .map(r => ({
          name: r.name.split('/').pop() || r.name,
          type: r.initiatorType,
          transferSize: r.transferSize || 0,
          encodedSize: r.encodedBodySize || 0
        }))

      return analysis
    })
  }

  /**
   * 메모리 사용량 측정
   */
  static async measureMemoryUsage(page: Page): Promise<any> {
    // Chrome DevTools Protocol을 통한 메모리 측정
    const client = await page.context().newCDPSession(page)
    
    try {
      // JavaScript 힙 메모리 측정
      const heapUsage = await client.send('Runtime.getHeapUsage')
      
      // 브라우저 메모리 정보
      const memoryInfo = await page.evaluate(() => {
        if ('memory' in performance) {
          return {
            // @ts-ignore - 브라우저 특정 API
            usedJSHeapSize: performance.memory.usedJSHeapSize,
            // @ts-ignore
            totalJSHeapSize: performance.memory.totalJSHeapSize,
            // @ts-ignore
            jsHeapSizeLimit: performance.memory.jsHeapSizeLimit
          }
        }
        return null
      })

      return {
        heapUsed: heapUsage.usedSize,
        heapTotal: heapUsage.totalSize,
        memoryInfo
      }
    } finally {
      await client.detach()
    }
  }

  /**
   * 네트워크 조건 시뮬레이션
   */
  static async simulateNetworkConditions(page: Page, condition: '4G' | '3G' | 'Slow3G') {
    const client = await page.context().newCDPSession(page)
    const config = PERFORMANCE_CONFIG.networkConditions[condition]
    
    await client.send('Network.emulateNetworkConditions', {
      offline: false,
      downloadThroughput: config.downloadThroughput,
      uploadThroughput: config.uploadThroughput,
      latency: config.latency
    })
    
    return client
  }

  /**
   * 성능 점수 계산 (Google Lighthouse 방식)
   */
  static calculatePerformanceScore(metrics: any): any {
    const weights = {
      FCP: 10,
      LCP: 25,
      FID: 25,
      CLS: 25,
      TTFB: 10,
      Speed: 5
    }

    const scores = {} as any
    let totalWeightedScore = 0
    let totalWeight = 0

    // 각 메트릭별 점수 계산 (0-100)
    Object.keys(weights).forEach(metric => {
      if (metrics[metric] !== null && metrics[metric] !== undefined) {
        const threshold = PERFORMANCE_CONFIG.thresholds[metric]
        if (threshold) {
          let score = 100
          
          if (metrics[metric] > threshold.needsWork) {
            score = 0
          } else if (metrics[metric] > threshold.good) {
            // 선형 보간
            score = 50 - ((metrics[metric] - threshold.good) / (threshold.needsWork - threshold.good)) * 50
          }
          
          scores[metric] = Math.round(score)
          totalWeightedScore += score * weights[metric]
          totalWeight += weights[metric]
        }
      }
    })

    const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 0

    return {
      overall: overallScore,
      category: overallScore >= 90 ? 'Good' : overallScore >= 50 ? 'Needs Improvement' : 'Poor',
      breakdown: scores
    }
  }
}

// 📊 성능 결과 수집기
class PerformanceReportCollector {
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
        goodPerformance: 0,
        needsImprovement: 0,
        poorPerformance: 0
      },
      coreWebVitals: {} as any,
      performanceScores: [] as any[],
      recommendations: [] as string[],
      details: [] as any[]
    }

    this.results.forEach((result, testName) => {
      report.details.push({
        testName,
        ...result
      })

      if (result.performanceScore) {
        const category = result.performanceScore.category
        if (category === 'Good') report.summary.goodPerformance++
        else if (category === 'Needs Improvement') report.summary.needsImprovement++
        else if (category === 'Poor') report.summary.poorPerformance++

        report.performanceScores.push({
          test: testName,
          score: result.performanceScore.overall,
          category: result.performanceScore.category
        })
      }

      if (result.coreWebVitals) {
        report.coreWebVitals[testName] = result.coreWebVitals
      }
    })

    // 권고사항 생성
    const avgScore = report.performanceScores.reduce((sum, s) => sum + s.score, 0) / report.performanceScores.length
    
    if (avgScore < 50) {
      report.recommendations.push('성능 최적화가 시급합니다. Core Web Vitals 개선에 집중하세요.')
      report.recommendations.push('이미지 최적화 및 압축을 구현하세요.')
      report.recommendations.push('불필요한 JavaScript 제거 및 코드 분할을 적용하세요.')
    } else if (avgScore < 90) {
      report.recommendations.push('추가 성능 개선이 필요합니다.')
      report.recommendations.push('캐싱 전략을 강화하세요.')
      report.recommendations.push('CSS 및 JavaScript 최적화를 진행하세요.')
    } else {
      report.recommendations.push('훌륭한 성능을 유지하고 있습니다.')
      report.recommendations.push('현재 성능을 지속적으로 모니터링하세요.')
    }

    return report
  }
}

const performanceReporter = new PerformanceReportCollector()

// ⚡ I. Core Web Vitals 측정 테스트
test.describe('⚡ Core Web Vitals 성능 측정', () => {
  test('01. 대시보드 페이지 Core Web Vitals', async ({ page }) => {
    const testResult = { status: 'pending', coreWebVitals: null, performanceScore: null, details: {} }

    try {
      const startTime = performance.now()
      
      // 페이지 로드
      await page.goto(`${PERFORMANCE_CONFIG.baseURL}/dashboard`)
      await page.waitForLoadState('domcontentloaded')
      
      // Core Web Vitals 측정
      const vitals = await PerformanceTestHelpers.measureCoreWebVitals(page)
      testResult.coreWebVitals = vitals
      
      // 페이지 로딩 메트릭
      const loadMetrics = await PerformanceTestHelpers.measurePageLoadMetrics(page)
      testResult.details.loadMetrics = loadMetrics
      
      // 성능 점수 계산
      const performanceScore = PerformanceTestHelpers.calculatePerformanceScore({
        ...vitals,
        Speed: performance.now() - startTime
      })
      testResult.performanceScore = performanceScore

      // Core Web Vitals 기준 검증
      const violations = []
      const passes = []

      if (vitals.LCP && vitals.LCP <= PERFORMANCE_CONFIG.thresholds.LCP.good) {
        passes.push(`LCP: ${vitals.LCP}ms (Good)`)
      } else if (vitals.LCP) {
        violations.push(`LCP: ${vitals.LCP}ms (${vitals.LCP > PERFORMANCE_CONFIG.thresholds.LCP.needsWork ? 'Poor' : 'Needs Improvement'})`)
      }

      if (vitals.FID && vitals.FID <= PERFORMANCE_CONFIG.thresholds.FID.good) {
        passes.push(`FID: ${vitals.FID}ms (Good)`)
      } else if (vitals.FID) {
        violations.push(`FID: ${vitals.FID}ms (${vitals.FID > PERFORMANCE_CONFIG.thresholds.FID.needsWork ? 'Poor' : 'Needs Improvement'})`)
      }

      if (vitals.CLS !== null && vitals.CLS <= PERFORMANCE_CONFIG.thresholds.CLS.good) {
        passes.push(`CLS: ${vitals.CLS} (Good)`)
      } else if (vitals.CLS !== null) {
        violations.push(`CLS: ${vitals.CLS} (${vitals.CLS > PERFORMANCE_CONFIG.thresholds.CLS.needsWork ? 'Poor' : 'Needs Improvement'})`)
      }

      testResult.details.violations = violations
      testResult.details.passes = passes
      
      // 전반적 성능 평가
      if (performanceScore.overall >= 90) {
        testResult.status = 'passed'
      } else if (performanceScore.overall >= 50) {
        testResult.status = 'warning'
      } else {
        testResult.status = 'failed'
      }

    } catch (error) {
      testResult.status = 'failed'
      testResult.details.error = error.message
    }

    performanceReporter.addResult('대시보드 Core Web Vitals', testResult)
  })

  test('02. 로그인 페이지 성능 측정', async ({ page }) => {
    const testResult = { status: 'pending', coreWebVitals: null, performanceScore: null, details: {} }

    try {
      // 페이지 로드
      await page.goto(`${PERFORMANCE_CONFIG.baseURL}/login`)
      await page.waitForLoadState('networkidle')
      
      // Core Web Vitals 측정
      const vitals = await PerformanceTestHelpers.measureCoreWebVitals(page)
      testResult.coreWebVitals = vitals
      
      // 성능 점수 계산
      const performanceScore = PerformanceTestHelpers.calculatePerformanceScore(vitals)
      testResult.performanceScore = performanceScore

      // 폼 상호작용 성능 테스트
      const interactionStart = performance.now()
      await page.fill('input[type="email"], input[name="email"]', 'test@example.com')
      await page.fill('input[type="password"], input[name="password"]', 'password123')
      const interactionTime = performance.now() - interactionStart
      
      testResult.details.interactionTime = interactionTime
      
      // 상호작용 성능 평가
      if (interactionTime < 100) {
        testResult.details.interactionPerformance = 'Excellent'
      } else if (interactionTime < 300) {
        testResult.details.interactionPerformance = 'Good'
      } else {
        testResult.details.interactionPerformance = 'Needs Improvement'
      }

      testResult.status = performanceScore.overall >= 50 ? 'passed' : 'failed'

    } catch (error) {
      testResult.status = 'failed'
      testResult.details.error = error.message
    }

    performanceReporter.addResult('로그인 페이지 성능', testResult)
  })

  test('03. 프로젝트 목록 페이지 성능', async ({ page }) => {
    const testResult = { status: 'pending', coreWebVitals: null, performanceScore: null, details: {} }

    try {
      await page.goto(`${PERFORMANCE_CONFIG.baseURL}/projects`)
      await page.waitForLoadState('domcontentloaded')
      
      // Core Web Vitals 측정
      const vitals = await PerformanceTestHelpers.measureCoreWebVitals(page)
      testResult.coreWebVitals = vitals
      
      // 리소스 분석
      const resourceAnalysis = await PerformanceTestHelpers.analyzeResourcePerformance(page)
      testResult.details.resources = resourceAnalysis
      
      // 성능 점수
      const performanceScore = PerformanceTestHelpers.calculatePerformanceScore(vitals)
      testResult.performanceScore = performanceScore

      testResult.status = performanceScore.overall >= 50 ? 'passed' : 'failed'

    } catch (error) {
      testResult.status = 'failed'
      testResult.details.error = error.message
    }

    performanceReporter.addResult('프로젝트 목록 성능', testResult)
  })
})

// 📱 II. 다양한 네트워크 조건에서의 성능 테스트
test.describe('📱 네트워크 조건별 성능 테스트', () => {
  ['4G', '3G', 'Slow3G'].forEach(networkType => {
    test(`04. ${networkType} 네트워크에서 메인 페이지 성능`, async ({ page }) => {
      const testResult = { status: 'pending', networkType, coreWebVitals: null, details: {} }

      try {
        // 네트워크 조건 시뮬레이션
        const cdpSession = await PerformanceTestHelpers.simulateNetworkConditions(page, networkType as any)
        
        const startTime = performance.now()
        await page.goto(`${PERFORMANCE_CONFIG.baseURL}`)
        await page.waitForLoadState('domcontentloaded')
        const loadTime = performance.now() - startTime
        
        // Core Web Vitals 측정
        const vitals = await PerformanceTestHelpers.measureCoreWebVitals(page)
        testResult.coreWebVitals = vitals
        testResult.details.loadTime = loadTime
        
        // 네트워크별 기준 적용
        const networkThresholds = {
          '4G': 3000,
          '3G': 5000, 
          'Slow3G': 8000
        }
        
        if (loadTime <= networkThresholds[networkType]) {
          testResult.status = 'passed'
        } else {
          testResult.status = 'failed'
        }
        
        await cdpSession.detach()

      } catch (error) {
        testResult.status = 'failed'
        testResult.details.error = error.message
      }

      performanceReporter.addResult(`${networkType} 네트워크 성능`, testResult)
    })
  })
})

// 🖼 III. 리소스 최적화 및 메모리 사용량 테스트
test.describe('🖼 리소스 최적화 및 메모리 테스트', () => {
  test('05. 이미지 최적화 및 로딩 성능', async ({ page }) => {
    const testResult = { status: 'pending', details: {} }

    try {
      await page.goto(`${PERFORMANCE_CONFIG.baseURL}/dashboard`)
      await page.waitForLoadState('networkidle')
      
      // 이미지 리소스 분석
      const imageAnalysis = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'))
        
        return images.map(img => ({
          src: img.src,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          displayWidth: img.clientWidth,
          displayHeight: img.clientHeight,
          hasLazyLoading: img.loading === 'lazy',
          format: img.src.split('.').pop()?.toLowerCase(),
          sizeEfficiency: (img.clientWidth * img.clientHeight) / (img.naturalWidth * img.naturalHeight)
        }))
      })
      
      testResult.details.images = imageAnalysis
      
      // 이미지 최적화 점검
      const oversizedImages = imageAnalysis.filter(img => img.sizeEfficiency < 0.8)
      const unoptimizedFormats = imageAnalysis.filter(img => 
        img.format && !['webp', 'avif'].includes(img.format)
      )
      const withoutLazyLoading = imageAnalysis.filter(img => !img.hasLazyLoading)
      
      testResult.details.optimization = {
        total: imageAnalysis.length,
        oversized: oversizedImages.length,
        unoptimizedFormat: unoptimizedFormats.length,
        withoutLazyLoading: withoutLazyLoading.length
      }

      // 최적화 점수 계산
      const optimizationScore = Math.max(0, 100 - 
        (oversizedImages.length * 20) - 
        (unoptimizedFormats.length * 15) - 
        (withoutLazyLoading.length * 10)
      )
      
      testResult.details.optimizationScore = optimizationScore
      testResult.status = optimizationScore >= 70 ? 'passed' : 'failed'

    } catch (error) {
      testResult.status = 'failed'
      testResult.details.error = error.message
    }

    performanceReporter.addResult('이미지 최적화', testResult)
  })

  test('06. 메모리 사용량 모니터링', async ({ page }) => {
    const testResult = { status: 'pending', details: {} }

    try {
      // 초기 메모리 측정
      await page.goto(`${PERFORMANCE_CONFIG.baseURL}/dashboard`)
      await page.waitForLoadState('domcontentloaded')
      
      const initialMemory = await PerformanceTestHelpers.measureMemoryUsage(page)
      testResult.details.initialMemory = initialMemory
      
      // 여러 페이지 네비게이션으로 메모리 누수 테스트
      const pages = ['/projects', '/calendar', '/feedback']
      const memorySnapshots = []
      
      for (const pagePath of pages) {
        await page.goto(`${PERFORMANCE_CONFIG.baseURL}${pagePath}`)
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(1000) // 메모리 안정화
        
        const memory = await PerformanceTestHelpers.measureMemoryUsage(page)
        memorySnapshots.push({
          page: pagePath,
          memory
        })
      }
      
      testResult.details.memorySnapshots = memorySnapshots
      
      // 메모리 증가율 계산
      const finalMemory = memorySnapshots[memorySnapshots.length - 1].memory
      const memoryIncrease = ((finalMemory.heapUsed - initialMemory.heapUsed) / initialMemory.heapUsed) * 100
      
      testResult.details.memoryIncrease = memoryIncrease
      
      // 메모리 누수 검사 (30% 이상 증가 시 경고)
      if (memoryIncrease > 30) {
        testResult.status = 'warning'
        testResult.details.warning = `메모리 사용량 ${memoryIncrease.toFixed(1)}% 증가 - 메모리 누수 가능성`
      } else {
        testResult.status = 'passed'
      }

    } catch (error) {
      testResult.status = 'failed'
      testResult.details.error = error.message
    }

    performanceReporter.addResult('메모리 사용량', testResult)
  })
})

// 🎯 IV. 사용자 경험 성능 테스트
test.describe('🎯 사용자 경험 성능 테스트', () => {
  test('07. 인터랙션 응답 시간 측정', async ({ page }) => {
    const testResult = { status: 'pending', details: {} }

    try {
      await page.goto(`${PERFORMANCE_CONFIG.baseURL}/dashboard`)
      await page.waitForLoadState('domcontentloaded')
      
      const interactions = []
      
      // 버튼 클릭 응답 시간 측정
      const buttons = await page.$$('button, a')
      
      for (let i = 0; i < Math.min(5, buttons.length); i++) {
        try {
          const button = buttons[i]
          const text = await button.textContent()
          
          const startTime = performance.now()
          await button.hover() // 마우스 호버 효과
          const hoverTime = performance.now() - startTime
          
          interactions.push({
            element: text?.trim().substring(0, 20) || `Button ${i}`,
            type: 'hover',
            responseTime: hoverTime
          })
          
          // 실제 클릭은 네비게이션을 유발할 수 있으므로 제한적으로 테스트
        } catch (error) {
          // 개별 인터랙션 실패는 무시
        }
      }
      
      testResult.details.interactions = interactions
      
      // 평균 응답 시간 계산
      const avgResponseTime = interactions.reduce((sum, i) => sum + i.responseTime, 0) / interactions.length
      testResult.details.averageResponseTime = avgResponseTime
      
      // 응답성 평가
      if (avgResponseTime < 16) { // 60fps = 16.67ms per frame
        testResult.status = 'passed'
        testResult.details.performance = 'Excellent (60fps)'
      } else if (avgResponseTime < 33) { // 30fps = 33.33ms per frame
        testResult.status = 'passed'
        testResult.details.performance = 'Good (30fps)'
      } else {
        testResult.status = 'warning'
        testResult.details.performance = 'Needs Improvement'
      }

    } catch (error) {
      testResult.status = 'failed'
      testResult.details.error = error.message
    }

    performanceReporter.addResult('인터랙션 응답성', testResult)
  })

  test('08. 스크롤 성능 및 부드러움', async ({ page }) => {
    const testResult = { status: 'pending', details: {} }

    try {
      await page.goto(`${PERFORMANCE_CONFIG.baseURL}/projects`)
      await page.waitForLoadState('domcontentloaded')
      
      // 스크롤 성능 측정을 위한 FPS 카운터
      const scrollPerformance = await page.evaluate(() => {
        return new Promise((resolve) => {
          let frameCount = 0
          let lastTime = performance.now()
          const scrollStart = performance.now()
          const fps = []
          
          const measureFPS = () => {
            const currentTime = performance.now()
            const deltaTime = currentTime - lastTime
            
            if (deltaTime > 0) {
              const currentFPS = 1000 / deltaTime
              fps.push(currentFPS)
            }
            
            frameCount++
            lastTime = currentTime
            
            if (performance.now() - scrollStart < 2000) { // 2초간 측정
              requestAnimationFrame(measureFPS)
            } else {
              const avgFPS = fps.reduce((sum, f) => sum + f, 0) / fps.length
              const minFPS = Math.min(...fps)
              
              resolve({
                averageFPS: avgFPS,
                minimumFPS: minFPS,
                frameCount,
                duration: performance.now() - scrollStart
              })
            }
          }
          
          // 스크롤 시작
          window.scrollTo(0, 0)
          const scrollHeight = document.body.scrollHeight
          let currentScroll = 0
          
          const scroll = () => {
            currentScroll += 50
            window.scrollTo(0, currentScroll)
            
            if (currentScroll < scrollHeight - window.innerHeight) {
              setTimeout(scroll, 16) // ~60fps
            }
          }
          
          requestAnimationFrame(measureFPS)
          setTimeout(scroll, 100) // 측정 시작 후 스크롤 개시
        })
      })
      
      testResult.details.scrollPerformance = scrollPerformance
      
      // 스크롤 성능 평가
      if (scrollPerformance.averageFPS >= 55) {
        testResult.status = 'passed'
        testResult.details.rating = 'Smooth'
      } else if (scrollPerformance.averageFPS >= 30) {
        testResult.status = 'passed'  
        testResult.details.rating = 'Acceptable'
      } else {
        testResult.status = 'failed'
        testResult.details.rating = 'Janky'
      }

    } catch (error) {
      testResult.status = 'failed'
      testResult.details.error = error.message
    }

    performanceReporter.addResult('스크롤 성능', testResult)
  })
})

// 📊 성능 테스트 종합 보고서
test.afterAll(async () => {
  const report = performanceReporter.generateReport()
  
  console.log('\n' + '⚡'.repeat(60))
  console.log('🎯 성능 테스트 종합 보고서')
  console.log('⚡'.repeat(60))
  console.log(`📅 실행 시간: ${new Date().toLocaleString('ko-KR')}`)
  console.log(`📊 총 테스트: ${report.summary.totalTests}개`)
  console.log(`🟢 우수한 성능: ${report.summary.goodPerformance}개`)
  console.log(`🟡 개선 필요: ${report.summary.needsImprovement}개`)
  console.log(`🔴 성능 부족: ${report.summary.poorPerformance}개`)
  
  const overallHealthScore = ((report.summary.goodPerformance * 100 + report.summary.needsImprovement * 50) / report.summary.totalTests).toFixed(1)
  console.log(`📈 전체 성능 점수: ${overallHealthScore}점`)
  
  console.log('\n' + '-'.repeat(50))
  console.log('⚡ Core Web Vitals 현황:')
  
  Object.keys(report.coreWebVitals).forEach(testName => {
    const vitals = report.coreWebVitals[testName]
    console.log(`\n📋 ${testName}:`)
    
    if (vitals.LCP) {
      const lcpStatus = vitals.LCP <= PERFORMANCE_CONFIG.thresholds.LCP.good ? '🟢' :
                       vitals.LCP <= PERFORMANCE_CONFIG.thresholds.LCP.needsWork ? '🟡' : '🔴'
      console.log(`  ${lcpStatus} LCP: ${vitals.LCP.toFixed(0)}ms`)
    }
    
    if (vitals.FID) {
      const fidStatus = vitals.FID <= PERFORMANCE_CONFIG.thresholds.FID.good ? '🟢' :
                       vitals.FID <= PERFORMANCE_CONFIG.thresholds.FID.needsWork ? '🟡' : '🔴'
      console.log(`  ${fidStatus} FID: ${vitals.FID.toFixed(0)}ms`)
    }
    
    if (vitals.CLS !== null) {
      const clsStatus = vitals.CLS <= PERFORMANCE_CONFIG.thresholds.CLS.good ? '🟢' :
                       vitals.CLS <= PERFORMANCE_CONFIG.thresholds.CLS.needsWork ? '🟡' : '🔴'
      console.log(`  ${clsStatus} CLS: ${vitals.CLS.toFixed(3)}`)
    }
  })

  console.log('\n' + '-'.repeat(50))
  console.log('📊 성능 점수 순위:')
  
  report.performanceScores
    .sort((a, b) => b.score - a.score)
    .forEach((scoreData, index) => {
      const emoji = scoreData.category === 'Good' ? '🟢' :
                   scoreData.category === 'Needs Improvement' ? '🟡' : '🔴'
      console.log(`  ${index + 1}. ${emoji} ${scoreData.test}: ${scoreData.score}점 (${scoreData.category})`)
    })

  console.log('\n' + '-'.repeat(50))
  console.log('🎯 성능 최적화 권고사항:')
  
  report.recommendations.forEach((recommendation, index) => {
    console.log(`  ${index + 1}. ${recommendation}`)
  })

  console.log('\n' + '-'.repeat(50))
  console.log('📈 추가 분석 포인트:')
  
  if (overallHealthScore < 50) {
    console.log('🔴 Critical: 전반적인 성능 최적화가 시급합니다.')
    console.log('  • Core Web Vitals 지표 모두 개선 필요')
    console.log('  • 리소스 로딩 최적화 (이미지, JS, CSS)')
    console.log('  • 렌더링 차단 요소 제거')
    console.log('  • 서버 응답 시간 개선')
  } else if (overallHealthScore < 80) {
    console.log('🟡 Warning: 일부 성능 지표 개선이 필요합니다.')
    console.log('  • LCP 개선을 위한 이미지 최적화')
    console.log('  • JavaScript 번들 크기 최적화')
    console.log('  • 캐싱 전략 강화')
  } else {
    console.log('🟢 Good: 전반적으로 우수한 성능을 유지하고 있습니다.')
    console.log('  • 현재 성능 수준 지속 유지')
    console.log('  • 정기적 성능 모니터링 권장')
    console.log('  • 새로운 기능 추가 시 성능 영향 평가')
  }

  console.log('\n📌 모니터링 권장사항:')
  console.log('  • 실제 사용자 모니터링 (RUM) 도구 도입')
  console.log('  • 성능 예산 설정 및 CI/CD 파이프라인 통합')  
  console.log('  • Core Web Vitals 대시보드 구축')
  console.log('  • 성능 회귀 방지를 위한 자동화된 테스트')

  console.log('\n' + '⚡'.repeat(60))

  // JSON 보고서 저장
  try {
    const fs = require('fs')
    const reportPath = `./test-results/performance-report-${Date.now()}.json`
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`📄 상세 성능 보고서 저장: ${reportPath}`)
  } catch (error) {
    console.warn(`성능 보고서 저장 실패: ${error.message}`)
  }
})