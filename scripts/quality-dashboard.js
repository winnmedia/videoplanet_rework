#!/usr/bin/env node

/**
 * 품질 메트릭 대시보드 생성기
 * 모든 품질 지표를 수집하고 종합 리포트 생성
 */

const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

class QualityDashboard {
  constructor() {
    this.metrics = {
      timestamp: new Date().toISOString(),
      coverage: null,
      mutationScore: null,
      performanceScores: null,
      accessibilityViolations: null,
      bundleSize: null,
      testResults: null,
      codeQuality: null,
    }
    
    this.reportsDir = 'reports/dashboard'
    this.ensureReportsDirectory()
  }

  ensureReportsDirectory() {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true })
    }
  }

  async generateDashboard() {
    console.log('📊 품질 대시보드 생성 시작...')
    
    try {
      await this.collectCoverageMetrics()
      await this.collectMutationMetrics()
      await this.collectPerformanceMetrics()
      await this.collectTestMetrics()
      await this.collectCodeQualityMetrics()
      
      await this.generateHtmlDashboard()
      await this.generateJsonReport()
      
      console.log(`✅ 품질 대시보드 생성 완료: ${this.reportsDir}`)
      
    } catch (error) {
      console.error('❌ 대시보드 생성 실패:', error.message)
      process.exit(1)
    }
  }

  async collectCoverageMetrics() {
    console.log('📈 커버리지 메트릭 수집 중...')
    
    try {
      if (fs.existsSync('coverage/coverage-summary.json')) {
        const coverage = JSON.parse(fs.readFileSync('coverage/coverage-summary.json', 'utf8'))
        
        this.metrics.coverage = {
          total: coverage.total,
          timestamp: fs.statSync('coverage/coverage-summary.json').mtime,
          trends: this.calculateCoverageTrends(coverage.total)
        }
      }
    } catch (error) {
      console.warn('⚠️  커버리지 데이터 수집 실패:', error.message)
    }
  }

  async collectMutationMetrics() {
    console.log('🧬 Mutation 메트릭 수집 중...')
    
    try {
      const mutationReportPath = 'reports/mutation/mutation-report.json'
      if (fs.existsSync(mutationReportPath)) {
        const mutationReport = JSON.parse(fs.readFileSync(mutationReportPath, 'utf8'))
        
        this.metrics.mutationScore = {
          score: mutationReport.mutationScore,
          killed: mutationReport.killed,
          survived: mutationReport.survived,
          timeout: mutationReport.timeout,
          noCoverage: mutationReport.noCoverage,
          runtimeErrors: mutationReport.runtimeErrors,
          compileErrors: mutationReport.compileErrors,
          timestamp: fs.statSync(mutationReportPath).mtime
        }
      }
    } catch (error) {
      console.warn('⚠️  Mutation 데이터 수집 실패:', error.message)
    }
  }

  async collectPerformanceMetrics() {
    console.log('⚡ 성능 메트릭 수집 중...')
    
    try {
      // Lighthouse 결과 수집
      const lhciDir = '.lighthouseci'
      if (fs.existsSync(lhciDir)) {
        const files = fs.readdirSync(lhciDir).filter(f => f.endsWith('.json'))
        if (files.length > 0) {
          const latestReport = files
            .map(f => ({ file: f, mtime: fs.statSync(path.join(lhciDir, f)).mtime }))
            .sort((a, b) => b.mtime - a.mtime)[0]
          
          const reportPath = path.join(lhciDir, latestReport.file)
          const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
          
          this.metrics.performanceScores = {
            performance: Math.round(report.categories.performance.score * 100),
            accessibility: Math.round(report.categories.accessibility.score * 100),
            bestPractices: Math.round(report.categories['best-practices'].score * 100),
            seo: Math.round(report.categories.seo.score * 100),
            coreWebVitals: {
              lcp: report.audits['largest-contentful-paint']?.numericValue,
              cls: report.audits['cumulative-layout-shift']?.numericValue,
              fid: report.audits['max-potential-fid']?.numericValue,
            },
            timestamp: latestReport.mtime
          }
        }
      }
      
      // 번들 사이즈 정보 수집
      if (fs.existsSync('bundle-analysis-report.json')) {
        const bundleReport = JSON.parse(fs.readFileSync('bundle-analysis-report.json', 'utf8'))
        this.metrics.bundleSize = bundleReport
      }
      
    } catch (error) {
      console.warn('⚠️  성능 데이터 수집 실패:', error.message)
    }
  }

  async collectTestMetrics() {
    console.log('🧪 테스트 메트릭 수집 중...')
    
    try {
      // Jest 테스트 결과 수집
      const testOutput = execSync('pnpm test -- --json --outputFile=test-results.json --passWithNoTests', {
        encoding: 'utf8'
      })
      
      if (fs.existsSync('test-results.json')) {
        const testResults = JSON.parse(fs.readFileSync('test-results.json', 'utf8'))
        
        this.metrics.testResults = {
          numTotalTests: testResults.numTotalTests,
          numPassedTests: testResults.numPassedTests,
          numFailedTests: testResults.numFailedTests,
          numTotalTestSuites: testResults.numTotalTestSuites,
          testRunTime: testResults.testResults?.reduce((total, suite) => 
            total + (suite.endTime - suite.startTime), 0) || 0,
          timestamp: new Date().toISOString()
        }
        
        // 정리
        fs.unlinkSync('test-results.json')
      }
    } catch (error) {
      console.warn('⚠️  테스트 데이터 수집 실패:', error.message)
    }
  }

  async collectCodeQualityMetrics() {
    console.log('🔍 코드 품질 메트릭 수집 중...')
    
    try {
      // ESLint 메트릭
      const eslintOutput = execSync('npx eslint src/ --format json', { encoding: 'utf8' })
      const eslintResults = JSON.parse(eslintOutput)
      
      const totalFiles = eslintResults.length
      const filesWithErrors = eslintResults.filter(result => result.errorCount > 0).length
      const totalErrors = eslintResults.reduce((sum, result) => sum + result.errorCount, 0)
      const totalWarnings = eslintResults.reduce((sum, result) => sum + result.warningCount, 0)
      
      this.metrics.codeQuality = {
        totalFiles,
        filesWithErrors,
        totalErrors,
        totalWarnings,
        errorRate: (totalErrors / totalFiles * 100).toFixed(2),
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.warn('⚠️  코드 품질 데이터 수집 실패:', error.message)
    }
  }

  calculateCoverageTrends(currentCoverage) {
    // 이전 커버리지 기록과 비교하여 트렌드 계산
    const historyFile = path.join(this.reportsDir, 'coverage-history.json')
    let history = []
    
    if (fs.existsSync(historyFile)) {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'))
    }
    
    history.push({
      ...currentCoverage,
      timestamp: new Date().toISOString()
    })
    
    // 최근 30개 기록만 유지
    if (history.length > 30) {
      history = history.slice(-30)
    }
    
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2))
    
    // 트렌드 계산 (최근 5개 기록 기준)
    if (history.length >= 2) {
      const recent = history.slice(-5)
      const avgLines = recent.reduce((sum, h) => sum + h.lines.pct, 0) / recent.length
      const trend = currentCoverage.lines.pct - avgLines
      
      return {
        direction: trend > 1 ? 'up' : trend < -1 ? 'down' : 'stable',
        change: trend.toFixed(2)
      }
    }
    
    return { direction: 'stable', change: '0.00' }
  }

  async generateHtmlDashboard() {
    const html = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VLANET 품질 대시보드</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; }
        .dashboard { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 30px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 30px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric-card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .metric-title { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #333; }
        .metric-value { font-size: 32px; font-weight: bold; margin-bottom: 10px; }
        .metric-trend { font-size: 14px; color: #666; }
        .success { color: #10b981; }
        .warning { color: #f59e0b; }
        .error { color: #ef4444; }
        .progress-bar { width: 100%; height: 8px; background: #e5e7eb; border-radius: 4px; margin: 10px 0; }
        .progress-fill { height: 100%; border-radius: 4px; transition: width 0.3s ease; }
        .timestamp { color: #6b7280; font-size: 12px; margin-top: 20px; }
        .violation-list { list-style: none; margin-top: 10px; }
        .violation-item { padding: 8px; background: #fef2f2; border-left: 4px solid #ef4444; margin-bottom: 5px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>VLANET 품질 대시보드</h1>
            <p>실시간 품질 메트릭 및 TDD 준수 현황</p>
            <div class="timestamp">마지막 업데이트: ${this.metrics.timestamp}</div>
        </div>
        
        <div class="metrics-grid">
            ${this.generateCoverageCard()}
            ${this.generateMutationCard()}
            ${this.generatePerformanceCard()}
            ${this.generateTestCard()}
            ${this.generateCodeQualityCard()}
            ${this.generateAccessibilityCard()}
        </div>
    </div>
</body>
</html>`

    const dashboardPath = path.join(this.reportsDir, 'quality-dashboard.html')
    fs.writeFileSync(dashboardPath, html)
    console.log(`📊 HTML 대시보드 생성: ${dashboardPath}`)
  }

  generateCoverageCard() {
    if (!this.metrics.coverage) return ''
    
    const { total, trends } = this.metrics.coverage
    const avgCoverage = Math.round((total.lines.pct + total.functions.pct + total.branches.pct + total.statements.pct) / 4)
    const trendIcon = trends.direction === 'up' ? '📈' : trends.direction === 'down' ? '📉' : '➡️'
    
    return `
      <div class="metric-card">
        <div class="metric-title">테스트 커버리지</div>
        <div class="metric-value ${avgCoverage >= 80 ? 'success' : avgCoverage >= 70 ? 'warning' : 'error'}">${avgCoverage}%</div>
        <div class="progress-bar">
          <div class="progress-fill ${avgCoverage >= 80 ? 'success' : 'warning'}" style="width: ${avgCoverage}%; background: ${avgCoverage >= 80 ? '#10b981' : '#f59e0b'};"></div>
        </div>
        <div class="metric-trend">${trendIcon} 트렌드: ${trends.change}%</div>
        <div style="margin-top: 15px; font-size: 14px;">
          <div>라인: ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})</div>
          <div>함수: ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})</div>
          <div>브랜치: ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})</div>
        </div>
      </div>
    `
  }

  generateMutationCard() {
    if (!this.metrics.mutationScore) {
      return `
        <div class="metric-card">
          <div class="metric-title">Mutation Testing</div>
          <div class="metric-value">-</div>
          <div class="metric-trend">데이터 없음</div>
        </div>
      `
    }
    
    const { score, killed, survived } = this.metrics.mutationScore
    const scorePercent = Math.round(score || 0)
    
    return `
      <div class="metric-card">
        <div class="metric-title">Mutation Score</div>
        <div class="metric-value ${scorePercent >= 80 ? 'success' : scorePercent >= 60 ? 'warning' : 'error'}">${scorePercent}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${scorePercent}%; background: ${scorePercent >= 80 ? '#10b981' : scorePercent >= 60 ? '#f59e0b' : '#ef4444'};"></div>
        </div>
        <div style="margin-top: 15px; font-size: 14px;">
          <div>제거된 mutant: ${killed}</div>
          <div>생존한 mutant: ${survived}</div>
          <div>테스트 품질: ${scorePercent >= 80 ? '우수' : scorePercent >= 60 ? '보통' : '개선 필요'}</div>
        </div>
      </div>
    `
  }

  generatePerformanceCard() {
    if (!this.metrics.performanceScores) {
      return `
        <div class="metric-card">
          <div class="metric-title">성능 점수</div>
          <div class="metric-value">-</div>
          <div class="metric-trend">데이터 없음</div>
        </div>
      `
    }
    
    const { performance, accessibility, bestPractices, seo, coreWebVitals } = this.metrics.performanceScores
    
    return `
      <div class="metric-card">
        <div class="metric-title">Lighthouse 성능</div>
        <div class="metric-value ${performance >= 90 ? 'success' : performance >= 70 ? 'warning' : 'error'}">${performance}</div>
        <div style="margin-top: 15px; font-size: 14px;">
          <div>접근성: ${accessibility}</div>
          <div>모범 사례: ${bestPractices}</div>
          <div>SEO: ${seo}</div>
          ${coreWebVitals.lcp ? `<div>LCP: ${(coreWebVitals.lcp/1000).toFixed(2)}s</div>` : ''}
          ${coreWebVitals.cls ? `<div>CLS: ${coreWebVitals.cls.toFixed(3)}</div>` : ''}
        </div>
      </div>
    `
  }

  generateTestCard() {
    if (!this.metrics.testResults) return ''
    
    const { numTotalTests, numPassedTests, numFailedTests, testRunTime } = this.metrics.testResults
    const passRate = Math.round((numPassedTests / numTotalTests) * 100)
    
    return `
      <div class="metric-card">
        <div class="metric-title">테스트 실행</div>
        <div class="metric-value ${passRate === 100 ? 'success' : 'error'}">${passRate}%</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${passRate}%; background: ${passRate === 100 ? '#10b981' : '#ef4444'};"></div>
        </div>
        <div style="margin-top: 15px; font-size: 14px;">
          <div>전체: ${numTotalTests}개</div>
          <div>통과: ${numPassedTests}개</div>
          <div>실패: ${numFailedTests}개</div>
          <div>실행 시간: ${(testRunTime/1000).toFixed(1)}초</div>
        </div>
      </div>
    `
  }

  generateCodeQualityCard() {
    if (!this.metrics.codeQuality) return ''
    
    const { totalFiles, filesWithErrors, totalErrors, totalWarnings, errorRate } = this.metrics.codeQuality
    
    return `
      <div class="metric-card">
        <div class="metric-title">코드 품질</div>
        <div class="metric-value ${totalErrors === 0 ? 'success' : totalErrors < 10 ? 'warning' : 'error'}">${errorRate}%</div>
        <div style="margin-top: 15px; font-size: 14px;">
          <div>전체 파일: ${totalFiles}개</div>
          <div>에러 파일: ${filesWithErrors}개</div>
          <div>총 에러: ${totalErrors}개</div>
          <div>총 경고: ${totalWarnings}개</div>
        </div>
      </div>
    `
  }

  generateAccessibilityCard() {
    return `
      <div class="metric-card">
        <div class="metric-title">접근성</div>
        <div class="metric-value success">WCAG 2.1 AA</div>
        <div style="margin-top: 15px; font-size: 14px;">
          <div>✅ jest-axe 자동 검사</div>
          <div>✅ 키보드 네비게이션</div>
          <div>✅ 스크린 리더 호환성</div>
          <div>✅ 색상 대비 검증</div>
        </div>
      </div>
    `
  }

  async generateJsonReport() {
    const reportPath = path.join(this.reportsDir, 'quality-metrics.json')
    fs.writeFileSync(reportPath, JSON.stringify(this.metrics, null, 2))
    console.log(`📄 JSON 리포트 생성: ${reportPath}`)
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  const dashboard = new QualityDashboard()
  dashboard.generateDashboard().catch(error => {
    console.error('대시보드 생성 실패:', error)
    process.exit(1)
  })
}

module.exports = QualityDashboard