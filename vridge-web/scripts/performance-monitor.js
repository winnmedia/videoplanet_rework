#!/usr/bin/env node
/**
 * Real-time Performance Monitoring Script
 * 72시간 내 성능 회복을 위한 실시간 모니터링 및 자동 알림
 * Performance & Web Vitals Lead Requirements
 */

const puppeteer = require('puppeteer')

const fs = require('fs').promises
const path = require('path')

const PERFORMANCE_THRESHOLDS = {
  // 2024 Core Web Vitals
  LCP: 2500,    // Largest Contentful Paint
  INP: 200,     // Interaction to Next Paint (NEW)
  CLS: 0.1,     // Cumulative Layout Shift
  
  // Supporting metrics
  FCP: 1800,    // First Contentful Paint
  TTI: 3800,    // Time to Interactive
  FID: 100,     // First Input Delay (legacy)
  
  // Network & Bundle
  SERVER_RESPONSE: 600,  // Server response time
  BUNDLE_SIZE: 1000000   // 1MB total
}

const MONITORING_CONFIG = {
  url: 'http://localhost:3000',
  interval: 30000, // 30 seconds
  samples: 5,      // Average over 5 samples
  timeout: 60000   // 60 seconds timeout
}

class PerformanceMonitor {
  constructor() {
    this.browser = null
    this.results = []
    this.violations = []
  }

  async init() {
    console.log('🚀 Performance Monitor 시작')
    console.log('Core Web Vitals 2024 기준으로 모니터링')
    
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    })
  }

  async measureCoreWebVitals() {
    const page = await this.browser.newPage()
    
    try {
      console.log(`📊 측정 중: ${MONITORING_CONFIG.url}`)
      
      // Enable performance metrics collection
      await page.setCacheEnabled(false)
      await page.evaluateOnNewDocument(() => {
        window.webVitalsData = {
          LCP: 0,
          INP: 0,
          CLS: 0,
          FCP: 0,
          FID: 0,
          measurements: []
        }
        
        // LCP Observer
        if ('PerformanceObserver' in window) {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            if (entries.length > 0) {
              window.webVitalsData.LCP = entries[entries.length - 1].startTime
            }
          })
          lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
          
          // INP Observer (2024 Core Web Vital)
          let maxINP = 0
          const inpObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (entry.entryType === 'event') {
                const interactionDelay = entry.processingStart - entry.startTime
                const presentationDelay = entry.startTime + entry.duration - entry.processingEnd
                const totalDelay = Math.max(interactionDelay + presentationDelay, entry.duration)
                
                if (totalDelay > maxINP) {
                  maxINP = totalDelay
                  window.webVitalsData.INP = maxINP
                }
              }
            })
          })
          inpObserver.observe({ type: 'event', buffered: true })
          
          // CLS Observer
          let clsScore = 0
          const clsObserver = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
              if (!entry.hadRecentInput) {
                clsScore += entry.value
                window.webVitalsData.CLS = clsScore
              }
            })
          })
          clsObserver.observe({ type: 'layout-shift', buffered: true })
          
          // FCP Observer
          const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint')
            if (fcpEntry) {
              window.webVitalsData.FCP = fcpEntry.startTime
            }
          })
          fcpObserver.observe({ type: 'paint', buffered: true })
        }
      })
      
      const startTime = Date.now()
      await page.goto(MONITORING_CONFIG.url, { waitUntil: 'networkidle0', timeout: MONITORING_CONFIG.timeout })
      
      // Simulate user interactions for INP measurement
      await page.click('button, a, input', { timeout: 5000 }).catch(() => {})
      await page.waitForTimeout(2000) // Allow time for measurements
      
      // Get performance data
      const performanceData = await page.evaluate(() => {
        const navigation = performance.getEntriesByType('navigation')[0]
        const serverResponseTime = navigation.responseStart - navigation.requestStart
        const tti = navigation.domContentLoadedEventEnd - navigation.navigationStart
        
        return {
          ...window.webVitalsData,
          TTI: tti,
          SERVER_RESPONSE: serverResponseTime,
          timestamp: new Date().toISOString()
        }
      })
      
      // Get bundle size information
      const resources = await page.evaluate(() => {
        return performance.getEntriesByType('resource')
          .filter(r => r.name.includes('.js') || r.name.includes('.css'))
          .reduce((total, r) => total + (r.transferSize || 0), 0)
      })
      
      performanceData.BUNDLE_SIZE = resources
      
      console.log('✅ 측정 완료:', JSON.stringify(performanceData, null, 2))
      
      return performanceData
      
    } catch (error) {
      console.error('❌ 측정 실패:', error.message)
      return null
    } finally {
      await page.close()
    }
  }

  checkViolations(data) {
    const violations = []
    
    Object.keys(PERFORMANCE_THRESHOLDS).forEach(metric => {
      const threshold = PERFORMANCE_THRESHOLDS[metric]
      const value = data[metric]
      
      if (value > threshold) {
        const violation = {
          metric,
          value,
          threshold,
          severity: this.getSeverity(metric, value, threshold),
          timestamp: new Date().toISOString()
        }
        violations.push(violation)
        
        console.error(`🚨 성능 예산 위반: ${metric} = ${value}ms (임계값: ${threshold}ms)`)
      } else {
        console.log(`✅ ${metric}: ${value}ms (임계값: ${threshold}ms 이내)`)
      }
    })
    
    return violations
  }

  getSeverity(metric, value, threshold) {
    const ratio = value / threshold
    
    if (ratio > 2) return 'CRITICAL'
    if (ratio > 1.5) return 'HIGH'
    if (ratio > 1.2) return 'MEDIUM'
    return 'LOW'
  }

  async generateReport() {
    if (this.results.length === 0) return
    
    const avgResults = {}
    Object.keys(PERFORMANCE_THRESHOLDS).forEach(metric => {
      const values = this.results.map(r => r[metric]).filter(v => v > 0)
      avgResults[metric] = values.length > 0 ? 
        values.reduce((a, b) => a + b, 0) / values.length : 0
    })
    
    const report = {
      timestamp: new Date().toISOString(),
      samples: this.results.length,
      averages: avgResults,
      violations: this.violations,
      recommendations: this.generateRecommendations(avgResults)
    }
    
    const reportPath = path.join(__dirname, '../reports/performance-monitor.json')
    await fs.mkdir(path.dirname(reportPath), { recursive: true })
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
    
    console.log('\n📊 성능 모니터링 리포트 생성됨:', reportPath)
    console.log('평균 결과:', JSON.stringify(avgResults, null, 2))
    
    if (this.violations.length > 0) {
      console.log('\n🚨 발견된 위반사항들:')
      this.violations.forEach(v => {
        console.log(`  ${v.metric}: ${v.value}ms > ${v.threshold}ms (심각도: ${v.severity})`)
      })
    }
    
    return report
  }

  generateRecommendations(data) {
    const recommendations = []
    
    if (data.LCP > PERFORMANCE_THRESHOLDS.LCP) {
      recommendations.push({
        metric: 'LCP',
        issue: 'Largest Contentful Paint가 느림',
        solutions: [
          'Critical 리소스 사전 로드 (preload)',
          '이미지 최적화 및 WebP/AVIF 포맷 사용',
          'Code splitting으로 초기 번들 크기 감소',
          'CDN 사용으로 리소스 전송 속도 개선'
        ]
      })
    }
    
    if (data.INP > PERFORMANCE_THRESHOLDS.INP) {
      recommendations.push({
        metric: 'INP',
        issue: 'Interaction to Next Paint이 느림 (2024 Core Web Vital)',
        solutions: [
          'Main thread 차단 작업 최소화',
          'React 19 concurrent features 활용',
          'Event handler 최적화',
          'Long tasks 분할 (시간 분할)'
        ]
      })
    }
    
    if (data.CLS > PERFORMANCE_THRESHOLDS.CLS) {
      recommendations.push({
        metric: 'CLS',
        issue: 'Cumulative Layout Shift 높음',
        solutions: [
          '이미지 및 동영상에 width/height 속성 명시',
          '폰트 로딩 최적화 (font-display: swap)',
          '광고나 동적 콘텐츠 공간 미리 확보',
          'CSS containment 속성 사용'
        ]
      })
    }
    
    if (data.SERVER_RESPONSE > PERFORMANCE_THRESHOLDS.SERVER_RESPONSE) {
      recommendations.push({
        metric: 'SERVER_RESPONSE',
        issue: '서버 응답 시간이 느림',
        solutions: [
          'Database 쿼리 최적화',
          '서버 측 캐싱 구현',
          'API response 압축 (gzip/brotli)',
          'Database connection pooling'
        ]
      })
    }
    
    return recommendations
  }

  async start() {
    await this.init()
    
    console.log(`🔄 ${MONITORING_CONFIG.interval/1000}초마다 ${MONITORING_CONFIG.samples}회 측정`)
    console.log('Ctrl+C로 종료\n')
    
    for (let i = 0; i < MONITORING_CONFIG.samples; i++) {
      console.log(`\n🔍 측정 ${i + 1}/${MONITORING_CONFIG.samples}`)
      
      const data = await this.measureCoreWebVitals()
      if (data) {
        this.results.push(data)
        const violations = this.checkViolations(data)
        this.violations.push(...violations)
      }
      
      if (i < MONITORING_CONFIG.samples - 1) {
        console.log(`⏳ ${MONITORING_CONFIG.interval/1000}초 대기 중...`)
        await new Promise(resolve => setTimeout(resolve, MONITORING_CONFIG.interval))
      }
    }
    
    await this.generateReport()
    await this.browser.close()
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close()
    }
  }
}

// Handle cleanup on exit
process.on('SIGINT', async () => {
  console.log('\n\n👋 모니터링 종료 중...')
  process.exit(0)
})

process.on('unhandledRejection', (error) => {
  console.error('❌ Unhandled rejection:', error)
  process.exit(1)
})

// Start monitoring
if (require.main === module) {
  const monitor = new PerformanceMonitor()
  monitor.start().catch(console.error)
}

module.exports = PerformanceMonitor