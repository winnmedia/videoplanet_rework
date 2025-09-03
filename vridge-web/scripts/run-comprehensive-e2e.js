/**
 * 종합적인 E2E 테스트 실행 스크립트
 * 에러 처리, 접근성, 성능, 품질 게이트 검증
 */

const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')

class E2ETestRunner {
  constructor() {
    this.results = {
      startTime: new Date(),
      endTime: null,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      skippedTests: 0,
      suites: {},
      performance: {},
      accessibility: {},
      errors: []
    }
    
    this.config = {
      baseUrl: process.env.CYPRESS_BASE_URL || 'http://localhost:3000',
      apiUrl: process.env.API_BASE_URL || 'http://127.0.0.1:8001',
      headless: process.env.CI === 'true' || process.argv.includes('--headless'),
      record: process.argv.includes('--record'),
      parallel: process.argv.includes('--parallel'),
      browser: process.env.CYPRESS_BROWSER || 'chrome'
    }
  }

  async checkPrerequisites() {
    console.log('🔍 사전 요구사항 확인 중...')
    
    // 프론트엔드 서버 확인
    try {
      const response = await fetch(this.config.baseUrl)
      if (!response.ok) {
        throw new Error(`Frontend server not accessible: ${response.status}`)
      }
      console.log('✅ 프론트엔드 서버 연결 확인')
    } catch (error) {
      console.error('❌ 프론트엔드 서버에 연결할 수 없습니다:', error.message)
      process.exit(1)
    }
    
    // 백엔드 API 서버 확인
    try {
      const response = await fetch(`${this.config.apiUrl}/api/v1/projects/`)
      console.log('✅ 백엔드 API 서버 연결 확인')
    } catch (error) {
      console.error('❌ 백엔드 API 서버에 연결할 수 없습니다:', error.message)
      console.log('백엔드 서버를 8001 포트에서 실행해주세요: python3 manage.py runserver 8001')
      process.exit(1)
    }
    
    // Cypress 설치 확인
    if (!fs.existsSync('./node_modules/.bin/cypress')) {
      console.error('❌ Cypress가 설치되지 않았습니다. pnpm install을 실행해주세요.')
      process.exit(1)
    }
    
    console.log('✅ 모든 사전 요구사항 확인 완료')
  }

  buildCypressCommand() {
    const cypressCmd = [
      './node_modules/.bin/cypress',
      this.config.headless ? 'run' : 'open'
    ]
    
    if (this.config.headless) {
      cypressCmd.push('--browser', this.config.browser)
      cypressCmd.push('--config', `baseUrl=${this.config.baseUrl}`)
      cypressCmd.push('--env', `API_BASE_URL=${this.config.apiUrl}`)
      
      if (this.config.record) {
        cypressCmd.push('--record')
      }
      
      if (this.config.parallel) {
        cypressCmd.push('--parallel')
      }
    }
    
    return cypressCmd
  }

  async runTestSuite(specPattern) {
    return new Promise((resolve, reject) => {
      const cmd = this.buildCypressCommand()
      cmd.push('--spec', specPattern)
      
      console.log(`🚀 테스트 실행: ${specPattern}`)
      console.log(`명령어: ${cmd.join(' ')}`)
      
      const process = spawn(cmd[0], cmd.slice(1), {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      })
      
      let stdout = ''
      let stderr = ''
      
      process.stdout.on('data', (data) => {
        stdout += data.toString()
        console.log(data.toString())
      })
      
      process.stderr.on('data', (data) => {
        stderr += data.toString()
        console.error(data.toString())
      })
      
      process.on('close', (code) => {
        const result = {
          specPattern,
          exitCode: code,
          stdout,
          stderr,
          success: code === 0
        }
        
        if (code === 0) {
          console.log(`✅ ${specPattern} 테스트 성공`)
        } else {
          console.error(`❌ ${specPattern} 테스트 실패 (exit code: ${code})`)
        }
        
        resolve(result)
      })
      
      process.on('error', (error) => {
        console.error(`프로세스 에러: ${error.message}`)
        reject(error)
      })
    })
  }

  parseTestResults(result) {
    const { stdout, specPattern } = result
    
    // Cypress 결과 파싱 (간단한 예시)
    const passedMatch = stdout.match(/(\d+) passing/)
    const failedMatch = stdout.match(/(\d+) failing/)
    const pendingMatch = stdout.match(/(\d+) pending/)
    
    const passed = passedMatch ? parseInt(passedMatch[1]) : 0
    const failed = failedMatch ? parseInt(failedMatch[1]) : 0
    const pending = pendingMatch ? parseInt(pendingMatch[1]) : 0
    
    this.results.totalTests += passed + failed + pending
    this.results.passedTests += passed
    this.results.failedTests += failed
    this.results.skippedTests += pending
    
    this.results.suites[specPattern] = {
      passed,
      failed,
      pending,
      success: result.success
    }
    
    if (!result.success) {
      this.results.errors.push({
        suite: specPattern,
        output: result.stderr
      })
    }
  }

  generateReport() {
    this.results.endTime = new Date()
    const duration = this.results.endTime - this.results.startTime
    
    const report = {
      summary: {
        startTime: this.results.startTime.toISOString(),
        endTime: this.results.endTime.toISOString(),
        duration: `${Math.round(duration / 1000)}초`,
        totalTests: this.results.totalTests,
        passedTests: this.results.passedTests,
        failedTests: this.results.failedTests,
        skippedTests: this.results.skippedTests,
        successRate: this.results.totalTests > 0 ? 
          Math.round((this.results.passedTests / this.results.totalTests) * 100) : 0
      },
      suiteResults: this.results.suites,
      errors: this.results.errors,
      recommendations: this.generateRecommendations()
    }
    
    // JSON 리포트 저장
    const reportPath = path.join(__dirname, '../cypress/reports/e2e-test-report.json')
    fs.mkdirSync(path.dirname(reportPath), { recursive: true })
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    
    // 콘솔 출력
    console.log('\\n' + '='.repeat(80))
    console.log('📊 E2E 테스트 결과 요약')
    console.log('='.repeat(80))
    console.log(`⏱️  실행 시간: ${report.summary.duration}`)
    console.log(`✅ 성공: ${report.summary.passedTests}`)
    console.log(`❌ 실패: ${report.summary.failedTests}`)
    console.log(`⏸️  건너뜀: ${report.summary.skippedTests}`)
    console.log(`📈 성공률: ${report.summary.successRate}%`)
    console.log('\\n스위트별 결과:')
    
    Object.entries(report.suiteResults).forEach(([suite, results]) => {
      const status = results.success ? '✅' : '❌'
      console.log(`${status} ${suite}: ${results.passed}개 성공, ${results.failed}개 실패`)
    })
    
    if (report.errors.length > 0) {
      console.log('\\n❌  발생한 에러:')
      report.errors.forEach(error => {
        console.log(`- ${error.suite}`)
      })
    }
    
    if (report.recommendations.length > 0) {
      console.log('\\n💡 개선 권장사항:')
      report.recommendations.forEach(rec => {
        console.log(`- ${rec}`)
      })
    }
    
    console.log(`\\n📄 상세 리포트: ${reportPath}`)
    console.log('='.repeat(80))
    
    return report
  }

  generateRecommendations() {
    const recommendations = []
    
    if (this.results.failedTests > 0) {
      recommendations.push('실패한 테스트를 검토하고 수정하세요')
    }
    
    const errorRate = this.results.failedTests / this.results.totalTests
    if (errorRate > 0.1) {
      recommendations.push('테스트 실패율이 10%를 초과합니다. 시스템 안정성을 점검하세요')
    }
    
    // 스위트별 분석
    Object.entries(this.results.suites).forEach(([suite, results]) => {
      if (suite.includes('error-handling') && results.failed > 0) {
        recommendations.push('에러 처리 시스템을 점검하고 개선하세요')
      }
      
      if (suite.includes('accessibility') && results.failed > 0) {
        recommendations.push('접근성 문제를 해결하여 WCAG 2.1 AA 준수를 달성하세요')
      }
      
      if (suite.includes('performance') && results.failed > 0) {
        recommendations.push('성능 최적화가 필요합니다. Core Web Vitals 임계값을 확인하세요')
      }
    })
    
    return recommendations
  }

  async run() {
    console.log('🚀 VideoPlanet E2E 종합 테스트 스위트 시작')
    console.log('='.repeat(80))
    
    try {
      await this.checkPrerequisites()
      
      const testSuites = [
        'cypress/e2e/error-handling.cy.ts',
        'cypress/e2e/accessibility.cy.ts',
        'cypress/e2e/performance-quality.cy.ts'
      ]
      
      console.log(`📋 실행할 테스트 스위트: ${testSuites.length}개`)
      console.log(`🌐 프론트엔드: ${this.config.baseUrl}`)
      console.log(`🔗 백엔드 API: ${this.config.apiUrl}`)
      console.log(`🖥️  브라우저: ${this.config.browser}`)
      console.log(`👤 헤드리스 모드: ${this.config.headless ? '예' : '아니오'}`)
      console.log('')
      
      for (const suite of testSuites) {
        const result = await this.runTestSuite(suite)
        this.parseTestResults(result)
        
        // 각 스위트 간 잠시 대기
        await new Promise(resolve => setTimeout(resolve, 2000))
      }
      
      const report = this.generateReport()
      
      // 종료 코드 설정
      if (this.results.failedTests > 0) {
        console.log('\\n❌ 일부 테스트가 실패했습니다.')
        process.exit(1)
      } else {
        console.log('\\n✅ 모든 테스트가 성공했습니다!')
        process.exit(0)
      }
      
    } catch (error) {
      console.error('❌ E2E 테스트 실행 중 오류 발생:', error.message)
      process.exit(1)
    }
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  const runner = new E2ETestRunner()
  runner.run().catch(error => {
    console.error('스크립트 실행 에러:', error)
    process.exit(1)
  })
}

module.exports = E2ETestRunner