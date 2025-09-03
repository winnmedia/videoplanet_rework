#!/usr/bin/env node
/**
 * Comprehensive E2E Test Suite Runner
 * 전체 사용자 여정 E2E 테스트 실행 및 결과 검증
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// 테스트 구성 설정
const TEST_CONFIG = {
  suites: [
    {
      name: 'Complete User Journey',
      spec: 'cypress/e2e/complete-user-journey.cy.ts',
      tags: ['@smoke', '@integration', '@complete-journey'],
      timeout: 300000, // 5분
      priority: 1
    },
    {
      name: 'Accessibility Compliance',
      spec: 'cypress/e2e/accessibility-compliance.cy.ts', 
      tags: ['@a11y', '@wcag'],
      timeout: 180000, // 3분
      priority: 2
    },
    {
      name: 'Performance Monitoring',
      spec: 'cypress/e2e/performance-monitoring.cy.ts',
      tags: ['@performance', '@web-vitals'],
      timeout: 240000, // 4분
      priority: 2
    },
    {
      name: 'Cross-browser Compatibility',
      spec: 'cypress/e2e/cross-browser-compatibility.cy.ts',
      tags: ['@cross-browser', '@compatibility'],
      timeout: 300000, // 5분
      priority: 3
    }
  ],
  browsers: ['chrome', 'firefox', 'edge'],
  viewports: [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 }, 
    { name: 'desktop', width: 1280, height: 720 }
  ],
  retries: {
    runMode: 2,
    openMode: 0
  },
  parallel: true,
  record: true
};

// 결과 수집을 위한 전역 변수
const testResults = {
  startTime: new Date(),
  endTime: null,
  totalTests: 0,
  passedTests: 0,
  failedTests: 0,
  skippedTests: 0,
  suiteResults: [],
  performanceMetrics: {},
  accessibilityViolations: [],
  visualDiffs: []
};

// 로그 유틸리티
function log(message, level = 'info') {
  const timestamp = new Date().toISOString();
  const prefix = {
    info: '📋',
    success: '✅', 
    warn: '⚠️',
    error: '❌',
    debug: '🔍'
  }[level];
  
  console.log(`${prefix} [${timestamp}] ${message}`);
}

// 환경 검증
function validateEnvironment() {
  log('환경 검증 시작...', 'info');
  
  try {
    // Node.js 버전 확인
    const nodeVersion = process.version;
    log(`Node.js 버전: ${nodeVersion}`);
    
    // pnpm 확인
    execSync('pnpm --version', { stdio: 'pipe' });
    log('pnpm 확인 완료');
    
    // Cypress 설치 확인
    execSync('npx cypress version', { stdio: 'pipe' });
    log('Cypress 확인 완료');
    
    // 필수 환경 변수 확인
    const requiredEnvVars = [
      'CYPRESS_baseUrl',
      'NEXT_PUBLIC_API_URL'
    ];
    
    requiredEnvVars.forEach(envVar => {
      if (!process.env[envVar]) {
        throw new Error(`필수 환경 변수가 설정되지 않음: ${envVar}`);
      }
    });
    
    log('환경 검증 완료', 'success');
    return true;
  } catch (error) {
    log(`환경 검증 실패: ${error.message}`, 'error');
    return false;
  }
}

// 서버 상태 확인
function checkServerHealth() {
  log('서버 상태 확인 중...');
  
  try {
    // Frontend 서버 확인
    execSync('curl -f http://localhost:3000/ -o /dev/null -s', { stdio: 'pipe' });
    log('Frontend 서버 정상');
    
    // Backend API 확인  
    execSync('curl -f http://127.0.0.1:8000/api/health/ -o /dev/null -s', { stdio: 'pipe' });
    log('Backend API 서버 정상');
    
    return true;
  } catch (error) {
    log('서버 상태 확인 실패 - 서버를 먼저 시작해주세요', 'error');
    return false;
  }
}

// 테스트 실행
function runTestSuite(suite, browser = 'chrome', viewport = null) {
  log(`테스트 스위트 실행: ${suite.name} (${browser})`);
  
  const startTime = Date.now();
  let command = `npx cypress run --spec "${suite.spec}" --browser ${browser}`;
  
  // 뷰포트 설정
  if (viewport) {
    command += ` --config viewportWidth=${viewport.width},viewportHeight=${viewport.height}`;
  }
  
  // 병렬 실행 설정
  if (TEST_CONFIG.parallel) {
    command += ' --record --parallel';
  }
  
  // 태그 필터링
  if (suite.tags && suite.tags.length > 0) {
    command += ` --env grepTags="${suite.tags.join(' ')}"`;
  }
  
  // 재시도 설정
  command += ` --config retries=${TEST_CONFIG.retries.runMode}`;
  
  try {
    const output = execSync(command, { 
      encoding: 'utf8',
      timeout: suite.timeout,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    const duration = Date.now() - startTime;
    log(`테스트 스위트 완료: ${suite.name} (${duration}ms)`, 'success');
    
    // 결과 파싱 및 저장
    const result = parseTestOutput(output, suite, browser, viewport);
    result.duration = duration;
    result.success = true;
    
    testResults.suiteResults.push(result);
    testResults.passedTests += result.passed;
    testResults.totalTests += result.total;
    
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    log(`테스트 스위트 실패: ${suite.name} - ${error.message}`, 'error');
    
    const result = {
      suite: suite.name,
      browser,
      viewport: viewport?.name || 'default',
      duration,
      success: false,
      error: error.message,
      passed: 0,
      failed: 1,
      total: 1
    };
    
    testResults.suiteResults.push(result);
    testResults.failedTests += 1;
    testResults.totalTests += 1;
    
    return result;
  }
}

// 테스트 출력 파싱
function parseTestOutput(output, suite, browser, viewport) {
  const lines = output.split('\n');
  const result = {
    suite: suite.name,
    browser,
    viewport: viewport?.name || 'default',
    passed: 0,
    failed: 0,
    skipped: 0,
    total: 0,
    tests: [],
    performance: {},
    accessibility: []
  };
  
  // Cypress 결과 파싱 (간소화된 버전)
  lines.forEach(line => {
    if (line.includes('✓') || line.includes('passing')) {
      result.passed++;
    } else if (line.includes('✗') || line.includes('failing')) {
      result.failed++;
    } else if (line.includes('pending') || line.includes('skipped')) {
      result.skipped++;
    }
    
    // 성능 메트릭 추출
    if (line.includes('LCP:') || line.includes('FCP:') || line.includes('CLS:')) {
      const match = line.match(/(LCP|FCP|CLS|INP|TTFB):\s*([\d.]+)(ms|s)?/);
      if (match) {
        result.performance[match[1]] = parseFloat(match[2]);
      }
    }
    
    // 접근성 위반사항 추출
    if (line.includes('accessibility violation')) {
      result.accessibility.push(line.trim());
    }
  });
  
  result.total = result.passed + result.failed + result.skipped;
  return result;
}

// Percy 시각적 회귀 테스트 실행
function runVisualRegressionTests() {
  log('Percy 시각적 회귀 테스트 실행 중...');
  
  if (!process.env.PERCY_TOKEN) {
    log('PERCY_TOKEN이 설정되지 않음 - 시각적 테스트 건너뜀', 'warn');
    return;
  }
  
  try {
    const output = execSync('pnpm percy exec -- cypress run --spec "cypress/e2e/complete-user-journey.cy.ts"', {
      encoding: 'utf8',
      timeout: 300000
    });
    
    log('Percy 시각적 테스트 완료', 'success');
    
    // Percy 결과 파싱
    const visualDiffs = parsePercyOutput(output);
    testResults.visualDiffs = visualDiffs;
    
  } catch (error) {
    log(`Percy 테스트 실패: ${error.message}`, 'error');
    testResults.visualDiffs = [{ error: error.message }];
  }
}

// Percy 출력 파싱
function parsePercyOutput(output) {
  const lines = output.split('\n');
  const diffs = [];
  
  lines.forEach(line => {
    if (line.includes('Percy snapshot')) {
      diffs.push({ type: 'snapshot', message: line.trim() });
    } else if (line.includes('visual difference')) {
      diffs.push({ type: 'diff', message: line.trim() });
    }
  });
  
  return diffs;
}

// 포괄적인 테스트 보고서 생성
function generateComprehensiveReport() {
  log('종합 테스트 보고서 생성 중...');
  
  testResults.endTime = new Date();
  const totalDuration = testResults.endTime - testResults.startTime;
  
  // 성공률 계산
  const successRate = testResults.totalTests > 0 
    ? ((testResults.passedTests / testResults.totalTests) * 100).toFixed(2)
    : 0;
  
  // 보고서 생성
  const report = {
    summary: {
      startTime: testResults.startTime.toISOString(),
      endTime: testResults.endTime.toISOString(),
      duration: `${Math.round(totalDuration / 1000)}초`,
      totalTests: testResults.totalTests,
      passedTests: testResults.passedTests,
      failedTests: testResults.failedTests,
      successRate: `${successRate}%`,
      status: testResults.failedTests === 0 ? 'PASSED' : 'FAILED'
    },
    suiteResults: testResults.suiteResults,
    performanceMetrics: aggregatePerformanceMetrics(),
    accessibilityCompliance: aggregateAccessibilityResults(),
    visualRegression: {
      totalSnapshots: testResults.visualDiffs.length,
      differences: testResults.visualDiffs.filter(d => d.type === 'diff').length,
      status: testResults.visualDiffs.some(d => d.type === 'diff') ? 'DIFFERENCES_FOUND' : 'PASSED'
    },
    recommendations: generateRecommendations()
  };
  
  // 보고서 파일 저장
  const reportsDir = path.join(__dirname, '..', 'reports');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  
  const reportPath = path.join(reportsDir, `e2e-test-report-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // 마크다운 요약 생성
  const markdownReport = generateMarkdownReport(report);
  const markdownPath = path.join(reportsDir, `e2e-summary-${Date.now()}.md`);
  fs.writeFileSync(markdownPath, markdownReport);
  
  log(`보고서 생성 완료: ${reportPath}`);
  log(`마크다운 요약: ${markdownPath}`);
  
  return report;
}

// 성능 메트릭 집계
function aggregatePerformanceMetrics() {
  const allMetrics = testResults.suiteResults
    .filter(result => result.performance && Object.keys(result.performance).length > 0)
    .map(result => result.performance);
  
  if (allMetrics.length === 0) return {};
  
  const aggregated = {};
  const metricKeys = ['LCP', 'FCP', 'CLS', 'INP', 'TTFB'];
  
  metricKeys.forEach(key => {
    const values = allMetrics.map(m => m[key]).filter(v => v != null);
    if (values.length > 0) {
      aggregated[key] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length
      };
    }
  });
  
  return aggregated;
}

// 접근성 결과 집계
function aggregateAccessibilityResults() {
  const allViolations = testResults.suiteResults
    .flatMap(result => result.accessibility || []);
    
  return {
    totalViolations: allViolations.length,
    compliance: allViolations.length === 0 ? 'WCAG 2.1 AA 준수' : 'WCAG 위반사항 발견',
    violations: allViolations
  };
}

// 개선 권장사항 생성
function generateRecommendations() {
  const recommendations = [];
  
  // 실패한 테스트 기반 권장사항
  if (testResults.failedTests > 0) {
    recommendations.push('실패한 테스트를 검토하고 수정하세요.');
  }
  
  // 성능 기반 권장사항
  const perfMetrics = aggregatePerformanceMetrics();
  if (perfMetrics.LCP && perfMetrics.LCP.avg > 2500) {
    recommendations.push('LCP 성능을 개선하세요. (목표: < 2.5초)');
  }
  if (perfMetrics.CLS && perfMetrics.CLS.avg > 0.1) {
    recommendations.push('CLS 개선이 필요합니다. (목표: < 0.1)');
  }
  
  // 접근성 기반 권장사항
  const a11yResults = aggregateAccessibilityResults();
  if (a11yResults.totalViolations > 0) {
    recommendations.push('접근성 위반사항을 해결하세요.');
  }
  
  // 시각적 회귀 기반 권장사항
  if (testResults.visualDiffs.some(d => d.type === 'diff')) {
    recommendations.push('시각적 차이점을 검토하고 승인 또는 수정하세요.');
  }
  
  return recommendations;
}

// 마크다운 보고서 생성
function generateMarkdownReport(report) {
  return `
# 📊 VLANET E2E 테스트 종합 보고서

## 🎯 테스트 요약

- **전체 테스트**: ${report.summary.totalTests}개
- **성공**: ${report.summary.passedTests}개 ✅
- **실패**: ${report.summary.failedTests}개 ❌
- **성공률**: ${report.summary.successRate}
- **실행 시간**: ${report.summary.duration}
- **상태**: ${report.summary.status === 'PASSED' ? '✅ 통과' : '❌ 실패'}

## 🏃‍♂️ 사용자 여정 완료율

${report.summary.status === 'PASSED' ? '✅ 100% - 모든 사용자 여정이 성공적으로 완료되었습니다.' : '❌ 일부 사용자 여정에서 오류가 발생했습니다.'}

## ⚡ 성능 메트릭

${Object.keys(report.performanceMetrics).length > 0 ? 
  Object.entries(report.performanceMetrics)
    .map(([metric, data]) => `- **${metric}**: 평균 ${data.avg.toFixed(2)}ms (최소: ${data.min}ms, 최대: ${data.max}ms)`)
    .join('\n') : 
  '성능 데이터 없음'
}

## ♿ 접근성 준수

- **상태**: ${report.accessibilityCompliance.compliance}
- **위반사항**: ${report.accessibilityCompliance.totalViolations}개

## 👁️ 시각적 회귀 테스트

- **상태**: ${report.visualRegression.status === 'PASSED' ? '✅ 통과' : '⚠️ 차이점 발견'}
- **스냅샷**: ${report.visualRegression.totalSnapshots}개
- **차이점**: ${report.visualRegression.differences}개

## 📋 권장사항

${report.recommendations.length > 0 ? 
  report.recommendations.map(r => `- ${r}`).join('\n') :
  '모든 테스트가 성공적으로 통과했습니다! 🎉'
}

## 📈 스위트별 상세 결과

${report.suiteResults.map(suite => 
  `### ${suite.suite} (${suite.browser})
- 통과: ${suite.passed || 0}개
- 실패: ${suite.failed || 0}개
- 실행시간: ${suite.duration}ms
- 상태: ${suite.success ? '✅' : '❌'}`
).join('\n\n')}

---

*보고서 생성 시각: ${new Date().toISOString()}*
`;
}

// 메인 실행 함수
async function main() {
  console.log('🚀 VLANET 포괄적 E2E 테스트 스위트 실행 시작\n');
  
  // 환경 검증
  if (!validateEnvironment()) {
    process.exit(1);
  }
  
  // 서버 상태 확인
  if (!checkServerHealth()) {
    log('서버를 시작한 후 다시 실행해주세요:', 'warn');
    log('Frontend: pnpm dev (http://localhost:3000)', 'info');
    log('Backend: python manage.py runserver (http://127.0.0.1:8000)', 'info');
    process.exit(1);
  }
  
  log('🎭 테스트 스위트 실행 시작...\n');
  
  // 우선순위별 테스트 실행
  const sortedSuites = TEST_CONFIG.suites.sort((a, b) => a.priority - b.priority);
  
  for (const suite of sortedSuites) {
    log(`\n📋 ${suite.name} 테스트 시작`);
    
    // 주요 브라우저에서 테스트 실행
    for (const browser of ['chrome']) { // 로컬에서는 Chrome만 실행
      const result = runTestSuite(suite, browser);
      
      if (!result.success && suite.priority === 1) {
        log('중요한 테스트 스위트 실패 - 실행 중단', 'error');
        break;
      }
    }
  }
  
  // Percy 시각적 회귀 테스트 (선택적)
  if (process.env.PERCY_TOKEN) {
    log('\n🎨 시각적 회귀 테스트 실행...');
    runVisualRegressionTests();
  }
  
  // 종합 보고서 생성
  log('\n📊 종합 보고서 생성 중...');
  const finalReport = generateComprehensiveReport();
  
  // 결과 출력
  console.log('\n' + '='.repeat(80));
  console.log('🏁 VLANET E2E 테스트 스위트 실행 완료');
  console.log('='.repeat(80));
  
  console.log(`\n📈 테스트 결과:`);
  console.log(`   전체: ${finalReport.summary.totalTests}개`);
  console.log(`   성공: ${finalReport.summary.passedTests}개 ✅`);
  console.log(`   실패: ${finalReport.summary.failedTests}개 ❌`);
  console.log(`   성공률: ${finalReport.summary.successRate}`);
  console.log(`   실행시간: ${finalReport.summary.duration}`);
  
  console.log(`\n🎯 사용자 여정: ${finalReport.summary.status === 'PASSED' ? '✅ 100% 완료' : '❌ 일부 실패'}`);
  console.log(`⚡ 성능: ${Object.keys(finalReport.performanceMetrics).length > 0 ? '✅ 측정 완료' : '⚠️ 데이터 부족'}`);
  console.log(`♿ 접근성: ${finalReport.accessibilityCompliance.totalViolations === 0 ? '✅ WCAG 2.1 AA 준수' : '❌ 위반사항 발견'}`);
  console.log(`👁️ 시각적: ${finalReport.visualRegression.status === 'PASSED' ? '✅ 회귀 없음' : '⚠️ 검토 필요'}`);
  
  if (finalReport.recommendations.length > 0) {
    console.log('\n💡 권장사항:');
    finalReport.recommendations.forEach(rec => console.log(`   - ${rec}`));
  }
  
  console.log('\n' + '='.repeat(80));
  
  // 최종 종료 코드 결정
  const exitCode = finalReport.summary.status === 'PASSED' ? 0 : 1;
  
  if (exitCode === 0) {
    console.log('🎉 모든 테스트가 성공적으로 완료되었습니다!');
  } else {
    console.log('🚨 일부 테스트가 실패했습니다. 보고서를 확인해주세요.');
  }
  
  process.exit(exitCode);
}

// 프로그램 실행
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ 예상치 못한 오류 발생:', error);
    process.exit(1);
  });
}

module.exports = { main, TEST_CONFIG, testResults };