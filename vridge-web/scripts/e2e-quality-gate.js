#!/usr/bin/env node

/**
 * VLANET E2E 테스트 품질 게이트 스크립트
 * 종합적인 E2E 테스트 실행 및 결과 분석
 */

const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CYPRESS_SPECS = [
  'cypress/e2e/smoke.cy.ts',
  'cypress/e2e/error-handling.cy.ts', 
  'cypress/e2e/accessibility.cy.ts',
  'cypress/e2e/performance-quality.cy.ts'
];

const QUALITY_THRESHOLDS = {
  minPassRate: 80, // 최소 80% 통과율
  maxFailures: 5,  // 최대 5개 실패 허용
  maxHydrationErrors: 0, // 수화 오류 허용 안함
  maxA11yViolations: 3   // 최대 3개 접근성 위반 허용
};

class E2EQualityGate {
  constructor() {
    this.results = {
      overall: { passed: 0, failed: 0, total: 0 },
      specs: {},
      issues: [],
      metrics: {}
    };
  }

  async run() {
    console.log('🚀 VLANET E2E 품질 게이트 시작');
    console.log('=' .repeat(60));

    try {
      // 1. 환경 검증
      await this.verifyEnvironment();

      // 2. E2E 테스트 실행
      await this.runE2ETests();

      // 3. 결과 분석
      await this.analyzeResults();

      // 4. 품질 게이트 판정
      const passed = this.evaluateQualityGate();

      // 5. 리포트 생성
      await this.generateReport();

      console.log('\n' + '='.repeat(60));
      console.log(passed ? '✅ 품질 게이트 통과' : '❌ 품질 게이트 실패');
      
      process.exit(passed ? 0 : 1);

    } catch (error) {
      console.error('❌ E2E 품질 게이트 실행 중 오류:', error);
      process.exit(1);
    }
  }

  async verifyEnvironment() {
    console.log('🔍 환경 검증 중...');

    // 프론트엔드 서버 확인
    try {
      const response = await this.checkServer('http://localhost:3005');
      console.log(`✅ 프론트엔드 서버 응답: ${response.status}`);
    } catch (error) {
      throw new Error('프론트엔드 서버가 응답하지 않습니다. pnpm run dev가 실행 중인지 확인하세요.');
    }

    // 백엔드 API 확인
    try {
      const response = await this.checkServer('http://127.0.0.1:8001/api/v1/projects/');
      console.log(`✅ 백엔드 API 응답: ${response.status}`);
    } catch (error) {
      throw new Error('백엔드 API가 응답하지 않습니다. Django 서버가 포트 8001에서 실행 중인지 확인하세요.');
    }

    console.log('✅ 환경 검증 완료\n');
  }

  async checkServer(url) {
    const https = require('http');
    const { URL } = require('url');
    
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port,
        path: parsedUrl.pathname,
        method: 'GET',
        timeout: 5000
      };

      const req = https.request(options, (res) => {
        resolve({ status: res.statusCode });
      });

      req.on('error', reject);
      req.on('timeout', () => reject(new Error('Timeout')));
      req.end();
    });
  }

  async runE2ETests() {
    console.log('🧪 E2E 테스트 실행 중...');

    for (const spec of CYPRESS_SPECS) {
      console.log(`\n▶️  ${spec} 실행 중...`);
      
      try {
        const result = await this.runCypressSpec(spec);
        this.results.specs[spec] = result;
        
        console.log(`✅ ${spec}: ${result.passed}/${result.total} 통과`);
        
        this.results.overall.passed += result.passed;
        this.results.overall.failed += result.failed;
        this.results.overall.total += result.total;
        
      } catch (error) {
        console.log(`❌ ${spec}: 실행 실패 - ${error.message}`);
        
        this.results.specs[spec] = {
          passed: 0,
          failed: 1,
          total: 1,
          error: error.message,
          issues: [error.message]
        };
        
        this.results.overall.failed += 1;
        this.results.overall.total += 1;
      }
    }
  }

  async runCypressSpec(spec) {
    return new Promise((resolve, reject) => {
      const command = 'npx';
      const args = ['cypress', 'run', '--spec', spec];
      
      const process = spawn(command, args, {
        stdio: 'pipe'
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        const result = this.parseCypressOutput(stdout, stderr);
        
        // Cypress는 테스트 실패 시 non-zero exit code를 반환하지만
        // 우리는 결과를 파싱해서 품질 게이트에서 판단합니다
        resolve(result);
      });

      process.on('error', (error) => {
        reject(new Error(`Cypress 실행 실패: ${error.message}`));
      });
    });
  }

  parseCypressOutput(stdout, stderr) {
    const result = {
      passed: 0,
      failed: 0,
      total: 0,
      issues: []
    };

    // Cypress 결과 파싱
    const testResultMatch = stdout.match(/Tests:\s+(\d+)/);
    const passingMatch = stdout.match(/Passing:\s+(\d+)/);
    const failingMatch = stdout.match(/Failing:\s+(\d+)/);
    
    if (testResultMatch) result.total = parseInt(testResultMatch[1]);
    if (passingMatch) result.passed = parseInt(passingMatch[1]);
    if (failingMatch) result.failed = parseInt(failingMatch[1]);

    // 주요 이슈 식별
    if (stdout.includes('Hydration failed')) {
      result.issues.push('React 수화(Hydration) 오류 감지');
    }
    
    if (stdout.includes('accessibility violations')) {
      result.issues.push('접근성 위반 감지');
    }
    
    if (stdout.includes('performance threshold')) {
      result.issues.push('성능 임계값 초과');
    }

    if (stderr.includes('CORS')) {
      result.issues.push('CORS 정책 오류');
    }

    return result;
  }

  async analyzeResults() {
    console.log('\n📊 결과 분석 중...');

    // 전체 통과율 계산
    const passRate = this.results.overall.total > 0 
      ? (this.results.overall.passed / this.results.overall.total) * 100 
      : 0;

    this.results.metrics.passRate = passRate;

    // 주요 이슈 집계
    const allIssues = Object.values(this.results.specs)
      .flatMap(spec => spec.issues || []);
    
    const hydrationErrors = allIssues.filter(issue => 
      issue.includes('Hydration') || issue.includes('수화')).length;
    
    const a11yViolations = allIssues.filter(issue => 
      issue.includes('accessibility') || issue.includes('접근성')).length;

    this.results.metrics.hydrationErrors = hydrationErrors;
    this.results.metrics.a11yViolations = a11yViolations;

    console.log(`📈 전체 통과율: ${passRate.toFixed(1)}%`);
    console.log(`🔥 수화 오류: ${hydrationErrors}개`);
    console.log(`♿ 접근성 위반: ${a11yViolations}개`);
  }

  evaluateQualityGate() {
    console.log('\n⚖️  품질 게이트 판정 중...');

    const issues = [];

    // 통과율 검사
    if (this.results.metrics.passRate < QUALITY_THRESHOLDS.minPassRate) {
      issues.push(`통과율 ${this.results.metrics.passRate.toFixed(1)}% < ${QUALITY_THRESHOLDS.minPassRate}%`);
    }

    // 실패 개수 검사
    if (this.results.overall.failed > QUALITY_THRESHOLDS.maxFailures) {
      issues.push(`실패 ${this.results.overall.failed}개 > ${QUALITY_THRESHOLDS.maxFailures}개`);
    }

    // 수화 오류 검사
    if (this.results.metrics.hydrationErrors > QUALITY_THRESHOLDS.maxHydrationErrors) {
      issues.push(`수화 오류 ${this.results.metrics.hydrationErrors}개 > ${QUALITY_THRESHOLDS.maxHydrationErrors}개`);
    }

    // 접근성 위반 검사
    if (this.results.metrics.a11yViolations > QUALITY_THRESHOLDS.maxA11yViolations) {
      issues.push(`접근성 위반 ${this.results.metrics.a11yViolations}개 > ${QUALITY_THRESHOLDS.maxA11yViolations}개`);
    }

    if (issues.length > 0) {
      console.log('❌ 품질 기준 미달:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      return false;
    }

    console.log('✅ 모든 품질 기준 충족');
    return true;
  }

  async generateReport() {
    console.log('\n📝 리포트 생성 중...');

    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.overall.total,
        passed: this.results.overall.passed,
        failed: this.results.overall.failed,
        passRate: this.results.metrics.passRate
      },
      specs: this.results.specs,
      metrics: this.results.metrics,
      thresholds: QUALITY_THRESHOLDS,
      qualityGatePassed: this.results.metrics.passRate >= QUALITY_THRESHOLDS.minPassRate &&
                         this.results.overall.failed <= QUALITY_THRESHOLDS.maxFailures &&
                         this.results.metrics.hydrationErrors <= QUALITY_THRESHOLDS.maxHydrationErrors &&
                         this.results.metrics.a11yViolations <= QUALITY_THRESHOLDS.maxA11yViolations
    };

    // JSON 리포트
    const reportPath = path.join('reports', 'e2e-quality-gate-report.json');
    await this.ensureDirectoryExists('reports');
    fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2));

    // 마크다운 리포트 
    const markdownReport = this.generateMarkdownReport(reportData);
    const markdownPath = path.join('reports', 'E2E_TEST_EXECUTION_REPORT.md');
    fs.writeFileSync(markdownPath, markdownReport);

    console.log(`📄 리포트 생성 완료: ${reportPath}, ${markdownPath}`);
  }

  generateMarkdownReport(data) {
    const { summary, specs, metrics, qualityGatePassed } = data;
    
    return `# VLANET E2E 테스트 실행 리포트

## 실행 요약

**실행 일시:** ${new Date(data.timestamp).toLocaleString('ko-KR')}
**품질 게이트:** ${qualityGatePassed ? '✅ 통과' : '❌ 실패'}

| 지표 | 값 |
|------|-----|
| 전체 테스트 | ${summary.total} |
| 성공 | ${summary.passed} |
| 실패 | ${summary.failed} |
| 통과율 | ${summary.passRate.toFixed(1)}% |

## 스펙별 결과

${Object.entries(specs).map(([spec, result]) => `
### ${spec}
- **통과:** ${result.passed}/${result.total}
- **문제점:** ${result.issues?.length || 0}개
${result.issues?.map(issue => `  - ${issue}`).join('\n') || ''}
`).join('')}

## 품질 메트릭

| 항목 | 실제값 | 임계값 | 상태 |
|------|--------|--------|------|
| 통과율 | ${metrics.passRate.toFixed(1)}% | ≥${QUALITY_THRESHOLDS.minPassRate}% | ${metrics.passRate >= QUALITY_THRESHOLDS.minPassRate ? '✅' : '❌'} |
| 실패 개수 | ${summary.failed} | ≤${QUALITY_THRESHOLDS.maxFailures} | ${summary.failed <= QUALITY_THRESHOLDS.maxFailures ? '✅' : '❌'} |
| 수화 오류 | ${metrics.hydrationErrors} | ≤${QUALITY_THRESHOLDS.maxHydrationErrors} | ${metrics.hydrationErrors <= QUALITY_THRESHOLDS.maxHydrationErrors ? '✅' : '❌'} |
| 접근성 위반 | ${metrics.a11yViolations} | ≤${QUALITY_THRESHOLDS.maxA11yViolations} | ${metrics.a11yViolations <= QUALITY_THRESHOLDS.maxA11yViolations ? '✅' : '❌'} |

## 발견된 주요 이슈

### 1. React 수화(Hydration) 오류
- **영향도:** 높음
- **설명:** 서버-클라이언트 렌더링 불일치로 인한 수화 실패
- **해결방안:** 
  - 동적 콘텐츠의 서버-클라이언트 일관성 확보
  - useEffect를 통한 클라이언트 전용 렌더링 처리
  - 조건부 렌더링에서 typeof window !== 'undefined' 사용 최소화

### 2. API 계약 준수
- **상태:** 백엔드 API가 JSON 대신 HTML 에러 응답 반환
- **해결방안:** Django에서 표준 JSON 에러 응답 형식 구현 필요

### 3. 접근성 (A11Y)
- **상태:** 키보드 네비게이션 및 스크린 리더 지원 개선 필요
- **해결방안:** aria-label, role 속성 추가 및 포커스 관리 개선

## 권장 사항

1. **즉시 수정 필요:**
   - React 수화 오류 해결 (최우선)
   - 백엔드 JSON 에러 응답 형식 표준화

2. **단기 개선:**
   - 접근성 속성 추가 및 키보드 네비게이션 개선
   - 에러 바운더리 구현 강화

3. **장기 개선:**
   - 성능 최적화 (LCP, FID, CLS 개선)
   - E2E 테스트 커버리지 확대

---
*리포트 생성 시간: ${new Date().toLocaleString('ko-KR')}*
`;
  }

  async ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// CLI 실행
if (require.main === module) {
  const qualityGate = new E2EQualityGate();
  qualityGate.run().catch(console.error);
}

module.exports = E2EQualityGate;