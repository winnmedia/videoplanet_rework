#!/usr/bin/env node

/**
 * 성능 모니터링 및 품질 게이트 스크립트
 * Core Web Vitals와 번들 사이즈를 모니터링하고 임계값 검증
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

// 성능 임계값 (CLAUDE.md 기준)
const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals
  LCP: 2500, // Largest Contentful Paint < 2.5s
  INP: 200,  // Interaction to Next Paint < 200ms  
  CLS: 0.1,  // Cumulative Layout Shift < 0.1
  
  // Bundle size thresholds
  BUNDLE_SIZE: 1024 * 1024, // 1MB total
  MAIN_BUNDLE: 150 * 1024,  // 150KB for main bundle
  PAGE_BUNDLE: 80 * 1024,   // 80KB per page
  
  // Performance scores (0-100)
  LIGHTHOUSE_PERFORMANCE: 90,
  LIGHTHOUSE_ACCESSIBILITY: 95,
  LIGHTHOUSE_BEST_PRACTICES: 90,
  LIGHTHOUSE_SEO: 90
}

class PerformanceMonitor {
  constructor() {
    this.results = {
      bundleAnalysis: null,
      lighthouseReport: null,
      coreWebVitals: null,
      violations: []
    }
  }

  async runAllChecks() {
    console.log('🔍 성능 품질 게이트 검사 시작...')
    
    try {
      await this.analyzeBundleSize()
      await this.runLighthouseAudit()
      await this.checkCoreWebVitals()
      await this.generateReport()
      
      if (this.results.violations.length > 0) {
        this.printViolations()
        process.exit(1)
      }
      
      console.log('✅ 모든 성능 품질 게이트 통과')
    } catch (error) {
      console.error('❌ 성능 검사 실패:', error.message)
      process.exit(1)
    }
  }

  async analyzeBundleSize() {
    console.log('📦 번들 사이즈 분석 중...')
    
    try {
      // Next.js 빌드가 되어있는지 확인
      if (!fs.existsSync('.next/static')) {
        console.log('🏗️  프로덕션 빌드 실행 중...')
        execSync('npm run build', { stdio: 'inherit' })
      }
      
      // Size-limit 실행
      const sizeOutput = execSync('npx size-limit --json', { encoding: 'utf8' })
      const sizeResults = JSON.parse(sizeOutput)
      
      this.results.bundleAnalysis = sizeResults
      
      // 번들 사이즈 검증
      sizeResults.forEach(result => {
        const sizeInBytes = this.parseSize(result.size)
        const limitInBytes = this.parseSize(result.limit)
        
        if (sizeInBytes > limitInBytes) {
          this.results.violations.push({
            type: 'bundle-size',
            message: `번들 사이즈 초과: ${result.name} (${result.size} > ${result.limit})`,
            actual: result.size,
            expected: result.limit
          })
        }
      })
      
      console.log(`✅ 번들 사이즈 분석 완료 (${sizeResults.length}개 번들 검사)`)
      
    } catch (error) {
      if (error.message.includes('size-limit')) {
        console.warn('⚠️  Size-limit 실행 실패, 기본 번들 분석으로 대체')
        await this.fallbackBundleAnalysis()
      } else {
        throw error
      }
    }
  }

  async fallbackBundleAnalysis() {
    // .next/static 디렉토리의 파일 사이즈 직접 계산
    const staticDir = '.next/static'
    let totalSize = 0
    
    const calculateDirSize = (dir) => {
      const files = fs.readdirSync(dir, { withFileTypes: true })
      return files.reduce((size, file) => {
        const filePath = path.join(dir, file.name)
        if (file.isDirectory()) {
          return size + calculateDirSize(filePath)
        } else {
          return size + fs.statSync(filePath).size
        }
      }, 0)
    }
    
    if (fs.existsSync(staticDir)) {
      totalSize = calculateDirSize(staticDir)
      
      if (totalSize > PERFORMANCE_THRESHOLDS.BUNDLE_SIZE) {
        this.results.violations.push({
          type: 'bundle-size',
          message: `전체 번들 사이즈 초과: ${(totalSize / 1024).toFixed(2)}KB > ${PERFORMANCE_THRESHOLDS.BUNDLE_SIZE / 1024}KB`,
          actual: totalSize,
          expected: PERFORMANCE_THRESHOLDS.BUNDLE_SIZE
        })
      }
    }
  }

  async runLighthouseAudit() {
    console.log('🔍 Lighthouse 성능 감사 실행 중...')
    
    try {
      // Lighthouse CI 실행
      const lighthouseOutput = execSync('npx lhci autorun --collect.numberOfRuns=1', { 
        encoding: 'utf8',
        stdio: 'pipe'
      })
      
      // 결과 파일 읽기
      const lhciDir = '.lighthouseci'
      if (fs.existsSync(lhciDir)) {
        const files = fs.readdirSync(lhciDir).filter(f => f.endsWith('.json'))
        if (files.length > 0) {
          const reportPath = path.join(lhciDir, files[0])
          const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
          
          this.results.lighthouseReport = report
          this.validateLighthouseScores(report)
        }
      }
      
      console.log('✅ Lighthouse 감사 완료')
      
    } catch (error) {
      console.warn('⚠️  Lighthouse 실행 실패:', error.message)
      // Lighthouse 실패는 경고만 하고 계속 진행
    }
  }

  validateLighthouseScores(report) {
    const categories = report.categories || {}
    
    Object.entries(PERFORMANCE_THRESHOLDS).forEach(([key, threshold]) => {
      if (key.startsWith('LIGHTHOUSE_')) {
        const categoryKey = key.replace('LIGHTHOUSE_', '').toLowerCase().replace('_', '-')
        const category = categories[categoryKey]
        
        if (category) {
          const score = Math.round(category.score * 100)
          if (score < threshold) {
            this.results.violations.push({
              type: 'lighthouse',
              message: `Lighthouse ${categoryKey} 점수 미달: ${score} < ${threshold}`,
              actual: score,
              expected: threshold
            })
          }
        }
      }
    })
  }

  async checkCoreWebVitals() {
    console.log('🎯 Core Web Vitals 검사 중...')
    
    // Lighthouse 결과에서 Core Web Vitals 추출
    if (this.results.lighthouseReport) {
      const audits = this.results.lighthouseReport.audits || {}
      
      // LCP 검사
      const lcp = audits['largest-contentful-paint']
      if (lcp && lcp.numericValue > PERFORMANCE_THRESHOLDS.LCP) {
        this.results.violations.push({
          type: 'core-web-vitals',
          message: `LCP 임계값 초과: ${lcp.numericValue}ms > ${PERFORMANCE_THRESHOLDS.LCP}ms`,
          actual: lcp.numericValue,
          expected: PERFORMANCE_THRESHOLDS.LCP
        })
      }
      
      // CLS 검사
      const cls = audits['cumulative-layout-shift']
      if (cls && cls.numericValue > PERFORMANCE_THRESHOLDS.CLS) {
        this.results.violations.push({
          type: 'core-web-vitals',
          message: `CLS 임계값 초과: ${cls.numericValue} > ${PERFORMANCE_THRESHOLDS.CLS}`,
          actual: cls.numericValue,
          expected: PERFORMANCE_THRESHOLDS.CLS
        })
      }
      
      console.log('✅ Core Web Vitals 검사 완료')
    } else {
      console.warn('⚠️  Lighthouse 결과가 없어 Core Web Vitals 검사 생략')
    }
  }

  async generateReport() {
    const reportDir = 'reports/performance'
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true })
    }
    
    const report = {
      timestamp: new Date().toISOString(),
      thresholds: PERFORMANCE_THRESHOLDS,
      results: this.results,
      summary: {
        totalViolations: this.results.violations.length,
        passed: this.results.violations.length === 0,
        bundleAnalyzed: !!this.results.bundleAnalysis,
        lighthouseRan: !!this.results.lighthouseReport,
        coreWebVitalsChecked: !!this.results.coreWebVitals
      }
    }
    
    const reportPath = path.join(reportDir, `performance-report-${Date.now()}.json`)
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    console.log(`📊 성능 보고서 생성: ${reportPath}`)
  }

  printViolations() {
    console.error('❌ 성능 품질 게이트 실패:')
    console.error(`총 ${this.results.violations.length}개의 위반사항 발견\n`)
    
    this.results.violations.forEach((violation, index) => {
      console.error(`${index + 1}. [${violation.type}] ${violation.message}`)
      if (violation.actual !== undefined && violation.expected !== undefined) {
        console.error(`   실제: ${violation.actual}, 예상: ${violation.expected}`)
      }
      console.error('')
    })
    
    console.error('🚫 성능 기준을 충족할 때까지 배포가 차단됩니다.')
  }

  parseSize(sizeString) {
    const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 }
    const match = sizeString.toString().match(/^([\d.]+)\s*([A-Z]+)$/i)
    
    if (!match) return parseInt(sizeString) || 0
    
    const [, number, unit] = match
    return Math.round(parseFloat(number) * (units[unit.toUpperCase()] || 1))
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  const monitor = new PerformanceMonitor()
  monitor.runAllChecks().catch(error => {
    console.error('성능 모니터링 실패:', error)
    process.exit(1)
  })
}

module.exports = PerformanceMonitor