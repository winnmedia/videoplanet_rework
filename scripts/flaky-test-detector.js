#!/usr/bin/env node

/**
 * Flaky Test 감지 및 격리 시스템
 * 테스트를 여러 번 실행하여 불안정한 테스트를 감지하고 격리
 */

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

class FlakyTestDetector {
  constructor() {
    this.config = {
      runs: 10, // 기본 실행 횟수
      failureThreshold: 0.1, // 10% 이상 실패 시 flaky로 간주
      timeoutThreshold: 30000, // 30초 이상 걸리는 테스트는 의심
      quarantineFile: 'jest.config.quarantine.js',
      reportFile: 'reports/flaky-tests.json'
    }
    
    this.results = {
      totalRuns: 0,
      flakyTests: [],
      slowTests: [],
      stableTests: [],
      analysisTime: null
    }
    
    this.ensureReportsDirectory()
  }

  ensureReportsDirectory() {
    const dir = path.dirname(this.config.reportFile)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
  }

  async detectFlakyTests(testPattern = '', runs = null) {
    const actualRuns = runs || this.config.runs
    console.log(`🔍 Flaky Test 감지 시작 (${actualRuns}회 실행)...`)
    
    if (testPattern) {
      console.log(`📁 테스트 패턴: ${testPattern}`)
    }
    
    const testStats = new Map()
    const startTime = Date.now()
    
    for (let i = 1; i <= actualRuns; i++) {
      console.log(`🔄 실행 ${i}/${actualRuns}...`)
      
      try {
        const output = this.runTestSuite(testPattern)
        this.parseTestResults(output, testStats, i)
      } catch (error) {
        console.warn(`⚠️  실행 ${i} 실패: ${error.message}`)
      }
    }
    
    this.results.totalRuns = actualRuns
    this.results.analysisTime = Date.now() - startTime
    
    this.analyzeTestStability(testStats)
    this.generateReport()
    this.handleFlakyTests()
    
    return this.results
  }

  runTestSuite(testPattern) {
    const command = testPattern 
      ? `npm run test -- --testPathPattern="${testPattern}" --json --outputFile=temp-test-results.json`
      : 'npm run test -- --json --outputFile=temp-test-results.json'
    
    try {
      execSync(command, { 
        stdio: 'pipe',
        timeout: 60000 // 1분 타임아웃
      })
      
      if (fs.existsSync('temp-test-results.json')) {
        const results = fs.readFileSync('temp-test-results.json', 'utf8')
        fs.unlinkSync('temp-test-results.json')
        return results
      }
      
      return '{}'
    } catch (error) {
      // Jest가 실패해도 결과 파일이 생성될 수 있음
      if (fs.existsSync('temp-test-results.json')) {
        const results = fs.readFileSync('temp-test-results.json', 'utf8')
        fs.unlinkSync('temp-test-results.json')
        return results
      }
      throw error
    }
  }

  parseTestResults(output, testStats, runNumber) {
    try {
      const results = JSON.parse(output)
      
      if (results.testResults) {
        results.testResults.forEach(suite => {
          suite.assertionResults.forEach(test => {
            const testKey = `${suite.name}::${test.fullName}`
            
            if (!testStats.has(testKey)) {
              testStats.set(testKey, {
                name: test.fullName,
                suite: suite.name,
                totalRuns: 0,
                passed: 0,
                failed: 0,
                skipped: 0,
                runtimes: [],
                failures: []
              })
            }
            
            const stat = testStats.get(testKey)
            stat.totalRuns++
            
            switch (test.status) {
              case 'passed':
                stat.passed++
                break
              case 'failed':
                stat.failed++
                stat.failures.push({
                  run: runNumber,
                  error: test.failureMessages?.join('\n') || 'Unknown error'
                })
                break
              case 'skipped':
              case 'pending':
                stat.skipped++
                break
            }
            
            // 실행 시간 기록
            if (test.duration) {
              stat.runtimes.push(test.duration)
            }
          })
        })
      }
    } catch (error) {
      console.warn(`⚠️  테스트 결과 파싱 실패 (실행 ${runNumber}): ${error.message}`)
    }
  }

  analyzeTestStability(testStats) {
    console.log('📊 테스트 안정성 분석 중...')
    
    testStats.forEach((stats, testKey) => {
      const failureRate = stats.failed / stats.totalRuns
      const avgRuntime = stats.runtimes.length > 0 
        ? stats.runtimes.reduce((sum, time) => sum + time, 0) / stats.runtimes.length 
        : 0
      
      const testInfo = {
        name: stats.name,
        suite: stats.suite,
        failureRate: failureRate,
        avgRuntime: avgRuntime,
        totalRuns: stats.totalRuns,
        passed: stats.passed,
        failed: stats.failed,
        failures: stats.failures
      }
      
      // Flaky 테스트 감지
      if (failureRate > 0 && failureRate < 1 && failureRate >= this.config.failureThreshold) {
        this.results.flakyTests.push({
          ...testInfo,
          reason: 'intermittent_failure',
          confidence: Math.round(failureRate * 100)
        })
      }
      
      // 느린 테스트 감지
      if (avgRuntime > this.config.timeoutThreshold) {
        this.results.slowTests.push({
          ...testInfo,
          reason: 'slow_execution',
          avgRuntimeMs: Math.round(avgRuntime)
        })
      }
      
      // 안정적인 테스트
      if (failureRate === 0 && avgRuntime <= this.config.timeoutThreshold) {
        this.results.stableTests.push(testInfo)
      }
    })
    
    console.log(`📈 분석 완료:`)
    console.log(`  - Flaky 테스트: ${this.results.flakyTests.length}개`)
    console.log(`  - 느린 테스트: ${this.results.slowTests.length}개`)
    console.log(`  - 안정적 테스트: ${this.results.stableTests.length}개`)
  }

  generateReport() {
    const report = {
      ...this.results,
      config: this.config,
      timestamp: new Date().toISOString(),
      summary: {
        flakyRate: this.results.flakyTests.length / 
          (this.results.flakyTests.length + this.results.stableTests.length) * 100,
        totalTests: this.results.flakyTests.length + this.results.slowTests.length + this.results.stableTests.length,
        healthScore: this.calculateHealthScore()
      }
    }
    
    fs.writeFileSync(this.config.reportFile, JSON.stringify(report, null, 2))
    console.log(`📊 Flaky Test 리포트 생성: ${this.config.reportFile}`)
  }

  calculateHealthScore() {
    const totalTests = this.results.flakyTests.length + this.results.stableTests.length
    if (totalTests === 0) return 100
    
    const stableRatio = this.results.stableTests.length / totalTests
    const flakyPenalty = this.results.flakyTests.length * 10 // 각 flaky test는 10점 감점
    const slowPenalty = this.results.slowTests.length * 2   // 각 slow test는 2점 감점
    
    const score = Math.max(0, 100 - flakyPenalty - slowPenalty)
    return Math.round(score)
  }

  handleFlakyTests() {
    if (this.results.flakyTests.length === 0) {
      console.log('✅ Flaky 테스트 없음')
      return
    }
    
    console.log(`❌ ${this.results.flakyTests.length}개의 Flaky 테스트 감지됨:`)
    
    this.results.flakyTests.forEach((test, index) => {
      console.log(`${index + 1}. ${test.name}`)
      console.log(`   파일: ${test.suite}`)
      console.log(`   실패율: ${(test.failureRate * 100).toFixed(1)}%`)
      console.log(`   신뢰도: ${test.confidence}%`)
      console.log('')
    })
    
    this.quarantineFlakyTests()
    
    // CI 환경에서는 실패로 처리
    if (process.env.CI === 'true') {
      console.error('🚫 Flaky 테스트가 감지되어 CI가 실패합니다.')
      console.error('   모든 Flaky 테스트를 수정한 후 다시 시도하세요.')
      process.exit(1)
    }
  }

  quarantineFlakyTests() {
    console.log('🚨 Flaky 테스트 격리 중...')
    
    // Jest 설정에 flaky 테스트 제외 설정 추가
    const quarantineConfig = {
      testPathIgnorePatterns: [
        '<rootDir>/.next/',
        '<rootDir>/node_modules/',
        '<rootDir>/cypress/',
      ],
      testNamePattern: this.results.flakyTests.length > 0 
        ? `^(?!.*(${this.results.flakyTests.map(t => t.name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})).*$`
        : undefined
    }
    
    if (this.results.flakyTests.length > 0) {
      const quarantineContent = `
// 자동 생성된 Flaky 테스트 격리 설정
// 이 파일은 flaky-test-detector.js에 의해 자동으로 관리됩니다.
// 수동으로 수정하지 마세요.

const baseConfig = require('./jest.config.js')

module.exports = {
  ...baseConfig,
  testNamePattern: \`^(?!.*(${this.results.flakyTests.map(t => t.name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')).join('|')})).*$\`,
  collectCoverage: false, // 격리된 테스트는 커버리지에서 제외
}
`
      
      fs.writeFileSync(this.config.quarantineFile, quarantineContent)
      console.log(`🔒 ${this.results.flakyTests.length}개 테스트가 격리되었습니다.`)
      console.log(`   격리 파일: ${this.config.quarantineFile}`)
      console.log('   격리된 테스트를 실행하려면: npm run test -- --config=jest.config.quarantine.js')
    }
  }

  async runRepairAttempt() {
    console.log('🔧 Flaky 테스트 자동 수정 시도...')
    
    for (const flakyTest of this.results.flakyTests) {
      console.log(`🛠️  ${flakyTest.name} 수정 시도 중...`)
      
      // 일반적인 flaky test 패턴 수정 제안
      const suggestions = this.generateRepairSuggestions(flakyTest)
      
      console.log('   수정 제안:')
      suggestions.forEach((suggestion, index) => {
        console.log(`   ${index + 1}. ${suggestion}`)
      })
    }
  }

  generateRepairSuggestions(flakyTest) {
    const suggestions = []
    const failures = flakyTest.failures.map(f => f.error).join(' ')
    
    // 타이밍 관련 문제
    if (failures.includes('timeout') || failures.includes('Timer') || failures.includes('setTimeout')) {
      suggestions.push('jest.useFakeTimers() 사용을 고려하세요')
      suggestions.push('waitFor() 또는 act() 래퍼 사용을 확인하세요')
    }
    
    // DOM 관련 문제
    if (failures.includes('not found') || failures.includes('null')) {
      suggestions.push('DOM 요소가 완전히 렌더링된 후 테스트하세요')
      suggestions.push('findBy* 쿼리 사용을 고려하세요 (비동기 대기)')
    }
    
    // 네트워크 관련 문제
    if (failures.includes('fetch') || failures.includes('network') || failures.includes('request')) {
      suggestions.push('MSW를 사용하여 모든 네트워크 호출을 모킹하세요')
      suggestions.push('실제 API 호출 대신 모킹된 응답을 사용하세요')
    }
    
    // 상태 관련 문제
    if (failures.includes('Redux') || failures.includes('state') || failures.includes('dispatch')) {
      suggestions.push('각 테스트마다 Redux store를 초기화하세요')
      suggestions.push('테스트 간 상태 격리를 확인하세요')
    }
    
    // 랜덤성 관련 문제
    if (failures.includes('random') || failures.includes('Math.random') || failures.includes('Date')) {
      suggestions.push('Math.random()과 Date를 모킹하여 결정론적으로 만드세요')
      suggestions.push('테스트용 고정 시드 값을 사용하세요')
    }
    
    // 기본 제안
    if (suggestions.length === 0) {
      suggestions.push('beforeEach()에서 테스트 환경을 완전히 초기화하세요')
      suggestions.push('테스트 간 공유 상태가 있는지 확인하세요')
      suggestions.push('비동기 작업이 완료될 때까지 기다리는지 확인하세요')
    }
    
    return suggestions
  }

  async runQuarantinedTests() {
    if (!fs.existsSync(this.config.quarantineFile)) {
      console.log('✅ 격리된 테스트가 없습니다.')
      return
    }
    
    console.log('🔒 격리된 테스트 실행 중...')
    
    try {
      execSync(`npm run test -- --config=${this.config.quarantineFile}`, { stdio: 'inherit' })
      console.log('✅ 격리된 테스트가 모두 통과했습니다. 격리 해제를 고려하세요.')
    } catch (error) {
      console.log('❌ 격리된 테스트가 여전히 실패합니다. 추가 수정이 필요합니다.')
    }
  }

  printSummary() {
    console.log('\n📊 Flaky Test 감지 결과 요약:')
    console.log(`전체 실행: ${this.results.totalRuns}회`)
    console.log(`분석 시간: ${(this.results.analysisTime / 1000).toFixed(1)}초`)
    console.log(`Flaky 테스트: ${this.results.flakyTests.length}개`)
    console.log(`느린 테스트: ${this.results.slowTests.length}개`)
    console.log(`안정적 테스트: ${this.results.stableTests.length}개`)
    
    const healthScore = this.calculateHealthScore()
    console.log(`테스트 건강도: ${healthScore}/100`)
    
    if (healthScore >= 90) {
      console.log('🟢 테스트 스위트 상태: 우수')
    } else if (healthScore >= 70) {
      console.log('🟡 테스트 스위트 상태: 보통')
    } else {
      console.log('🔴 테스트 스위트 상태: 개선 필요')
    }
  }
}

// CLI 인터페이스
const args = process.argv.slice(2)
const command = args[0] || 'detect'

async function main() {
  const detector = new FlakyTestDetector()
  
  switch (command) {
    case 'detect':
      const pattern = args[1]
      const runs = args[2] ? parseInt(args[2]) : null
      await detector.detectFlakyTests(pattern, runs)
      detector.printSummary()
      break
      
    case 'repair':
      await detector.runRepairAttempt()
      break
      
    case 'quarantine':
      await detector.runQuarantinedTests()
      break
      
    case 'help':
      console.log(`
사용법:
  npm run test:flaky                           # 모든 테스트에서 flaky 감지
  npm run test:flaky detect "pattern" 5        # 특정 패턴, 5회 실행
  npm run test:flaky repair                    # flaky 테스트 수정 제안
  npm run test:flaky quarantine               # 격리된 테스트 실행
      `)
      break
      
    default:
      console.error(`알 수 없는 명령: ${command}`)
      console.error('도움말: npm run test:flaky help')
      process.exit(1)
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('Flaky test detector 실패:', error)
    process.exit(1)
  })
}

module.exports = FlakyTestDetector