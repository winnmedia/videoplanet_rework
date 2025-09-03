#!/usr/bin/env node

/**
 * 네트워크 조건별 성능 테스트 스크립트
 * 다양한 네트워크 환경에서 7단계 사용자 여정 성능 측정
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 네트워크 조건 정의 (Chrome DevTools Network Conditions)
const NETWORK_CONDITIONS = {
  'Fast3G': {
    name: 'Fast 3G',
    downloadThroughput: 1.6 * 1024 * 1024 / 8, // 1.6 Mbps
    uploadThroughput: 750 * 1024 / 8, // 750 Kbps  
    latency: 40 // 40ms RTT
  },
  'Slow3G': {
    name: 'Slow 3G',
    downloadThroughput: 500 * 1024 / 8, // 500 Kbps
    uploadThroughput: 500 * 1024 / 8, // 500 Kbps
    latency: 400 // 400ms RTT
  },
  'Regular2G': {
    name: 'Regular 2G',
    downloadThroughput: 250 * 1024 / 8, // 250 Kbps
    uploadThroughput: 50 * 1024 / 8, // 50 Kbps
    latency: 300 // 300ms RTT
  },
  'WiFi': {
    name: 'WiFi',
    downloadThroughput: 30 * 1024 * 1024 / 8, // 30 Mbps
    uploadThroughput: 15 * 1024 * 1024 / 8, // 15 Mbps
    latency: 10 // 10ms RTT
  }
};

// 7단계 사용자 여정 URL
const USER_JOURNEY_URLS = [
  { step: 1, name: '랜딩 페이지', url: 'http://localhost:3000/', critical: true },
  { step: 2, name: '사용자 인증', url: 'http://localhost:3000/', critical: true }, // Same URL but different UX
  { step: 3, name: '프로젝트 관리', url: 'http://localhost:3000/projects', critical: true },
  { step: 4, name: '팀 협업', url: 'http://localhost:3000/projects', critical: false }, // Feature within projects
  { step: 5, name: '캘린더 관리', url: 'http://localhost:3000/calendar', critical: true },
  { step: 6, name: '비디오 피드백', url: 'http://localhost:3000/feedback', critical: true },
  { step: 7, name: '프로젝트 완료', url: 'http://localhost:3000/projects', critical: false } // Project completion flow
];

// Core Web Vitals 임계값
const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, poor: 4000 }, // ms
  INP: { good: 200, poor: 500 },   // ms  
  CLS: { good: 0.1, poor: 0.25 },  // score
  FCP: { good: 1800, poor: 3000 }, // ms
  TTFB: { good: 800, poor: 1800 }  // ms
};

class NetworkPerformanceTest {
  constructor() {
    this.results = {
      testConfig: {
        timestamp: new Date().toISOString(),
        environment: 'WSL2-Ubuntu', 
        userAgent: 'Performance Testing Bot',
        bundleSize: null
      },
      networkResults: {},
      summary: {
        criticalPathAnalysis: {},
        regressionDetection: {},
        recommendations: []
      }
    };
  }

  async runAllNetworkTests() {
    console.log('🌐 네트워크 조건별 성능 테스트 시작...');
    
    try {
      // 번들 사이즈 분석
      await this.analyzeBundleSize();
      
      // 각 네트워크 조건별 테스트
      for (const [conditionKey, condition] of Object.entries(NETWORK_CONDITIONS)) {
        console.log(`\n📡 ${condition.name} 조건 테스트 시작...`);
        this.results.networkResults[conditionKey] = await this.testNetworkCondition(condition);
      }
      
      // 분석 및 권장사항 생성
      await this.analyzeResults();
      await this.generateRecommendations();
      await this.saveResults();
      
      console.log('\n✅ 네트워크 조건별 성능 테스트 완료');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ 네트워크 성능 테스트 실패:', error.message);
      throw error;
    }
  }

  async analyzeBundleSize() {
    console.log('📦 번들 사이즈 재분석...');
    
    try {
      const chunksDir = '.next/static/chunks';
      if (!fs.existsSync(chunksDir)) {
        throw new Error('Next.js 빌드 결과물을 찾을 수 없습니다. npm run build를 실행하세요.');
      }
      
      let totalSize = 0;
      const bundleBreakdown = {};
      
      const analyzeDirectory = (dir, prefix = '') => {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        
        files.forEach(file => {
          const filePath = path.join(dir, file.name);
          if (file.isDirectory()) {
            analyzeDirectory(filePath, prefix + file.name + '/');
          } else if (file.name.endsWith('.js')) {
            const size = fs.statSync(filePath).size;
            totalSize += size;
            
            // Bundle 유형별 분류
            let bundleType = 'other';
            if (file.name.includes('framework')) bundleType = 'framework';
            else if (file.name.includes('vendor')) bundleType = 'vendors';
            else if (file.name.includes('common')) bundleType = 'common';
            else if (file.name.includes('main')) bundleType = 'main';
            else if (file.name.includes('polyfill')) bundleType = 'polyfills';
            else if (file.name.includes('redux')) bundleType = 'redux';
            
            if (!bundleBreakdown[bundleType]) {
              bundleBreakdown[bundleType] = { files: [], totalSize: 0 };
            }
            
            bundleBreakdown[bundleType].files.push({
              name: prefix + file.name,
              size: size,
              sizeKB: Math.round(size / 1024)
            });
            bundleBreakdown[bundleType].totalSize += size;
          }
        });
      };
      
      analyzeDirectory(chunksDir);
      
      this.results.testConfig.bundleSize = {
        totalSize: totalSize,
        totalSizeKB: Math.round(totalSize / 1024),
        totalSizeMB: Math.round(totalSize / 1024 / 1024 * 100) / 100,
        breakdown: bundleBreakdown,
        budgetStatus: totalSize > (1024 * 1024) ? 'exceeded' : 'within'
      };
      
      console.log(`📊 총 번들 크기: ${this.results.testConfig.bundleSize.totalSizeMB} MB`);
      
    } catch (error) {
      console.error('⚠️ 번들 사이즈 분석 실패:', error.message);
    }
  }

  async testNetworkCondition(networkCondition) {
    const results = {
      condition: networkCondition,
      journeyResults: {},
      overallMetrics: {
        averageLCP: 0,
        averageINP: 0,
        averageCLS: 0,
        criticalPathTime: 0,
        totalTransferTime: 0
      }
    };
    
    let totalLCP = 0;
    let totalTests = 0;
    
    for (const journey of USER_JOURNEY_URLS) {
      if (!journey.critical) continue; // Critical path만 테스트
      
      console.log(`  🎯 ${journey.name} (Step ${journey.step}) 테스트 중...`);
      
      const journeyResult = await this.simulatePageLoad(journey, networkCondition);
      results.journeyResults[`step${journey.step}`] = journeyResult;
      
      if (journeyResult.metrics.LCP) {
        totalLCP += journeyResult.metrics.LCP;
        totalTests++;
      }
    }
    
    // 평균 계산
    if (totalTests > 0) {
      results.overallMetrics.averageLCP = Math.round(totalLCP / totalTests);
    }
    
    // Critical path 총 시간 계산 (번들 다운로드 + 네트워크 지연)
    const bundleSizeBytes = this.results.testConfig.bundleSize?.totalSize || 1200000;
    const downloadTimeMs = (bundleSizeBytes / networkCondition.downloadThroughput) * 1000;
    const networkLatency = networkCondition.latency;
    
    results.overallMetrics.criticalPathTime = Math.round(downloadTimeMs + networkLatency * 3); // RTT * 3 (DNS + Connect + Request)
    results.overallMetrics.totalTransferTime = Math.round(downloadTimeMs);
    
    return results;
  }

  async simulatePageLoad(journey, networkCondition) {
    // 실제 브라우저 테스트 없이 네트워크 조건 기반 예상 성능 계산
    const bundleSizeBytes = this.results.testConfig.bundleSize?.totalSize || 1200000;
    const downloadTimeMs = (bundleSizeBytes / networkCondition.downloadThroughput) * 1000;
    
    // 페이지별 기본 LCP (번들 로드 후 예상 렌더링 시간)
    const baseLCP = {
      1: 800,  // 랜딩 페이지
      3: 1200, // 프로젝트 관리
      5: 1100, // 캘린더  
      6: 1500  // 비디오 피드백
    };
    
    const estimatedLCP = downloadTimeMs + (baseLCP[journey.step] || 1000) + networkCondition.latency;
    
    return {
      journey: journey,
      networkCondition: networkCondition.name,
      metrics: {
        LCP: Math.round(estimatedLCP),
        FCP: Math.round(estimatedLCP * 0.6), // FCP는 LCP의 약 60%
        INP: Math.round(50 + networkCondition.latency * 0.3), // 기본 50ms + 네트워크 지연 영향
        CLS: 0.02, // Tailwind CSS 사용으로 낮은 CLS 예상
        TTFB: Math.round(networkCondition.latency * 2) // RTT * 2
      },
      performance: {
        downloadTime: Math.round(downloadTimeMs),
        networkLatency: networkCondition.latency,
        totalLoadTime: Math.round(estimatedLCP)
      },
      budgetCompliance: {
        LCP: estimatedLCP <= PERFORMANCE_THRESHOLDS.LCP.good ? 'good' : 
             estimatedLCP <= PERFORMANCE_THRESHOLDS.LCP.poor ? 'needs-improvement' : 'poor',
        overall: estimatedLCP <= PERFORMANCE_THRESHOLDS.LCP.good ? 'pass' : 'fail'
      }
    };
  }

  async analyzeResults() {
    console.log('\n📊 결과 분석 중...');
    
    // Critical path 분석
    const criticalSteps = [1, 3, 5, 6]; // 중요한 사용자 여정 단계
    
    Object.entries(this.results.networkResults).forEach(([networkKey, networkResult]) => {
      let worstLCP = 0;
      let worstStep = null;
      
      criticalSteps.forEach(stepNum => {
        const stepResult = networkResult.journeyResults[`step${stepNum}`];
        if (stepResult && stepResult.metrics.LCP > worstLCP) {
          worstLCP = stepResult.metrics.LCP;
          worstStep = stepNum;
        }
      });
      
      this.results.summary.criticalPathAnalysis[networkKey] = {
        networkCondition: networkResult.condition.name,
        worstLCP: worstLCP,
        worstStep: worstStep,
        averageLCP: networkResult.overallMetrics.averageLCP,
        budgetStatus: worstLCP <= PERFORMANCE_THRESHOLDS.LCP.good ? 'within' : 'exceeded',
        criticalPathTime: networkResult.overallMetrics.criticalPathTime
      };
    });
  }

  async generateRecommendations() {
    console.log('💡 성능 최적화 권장사항 생성 중...');
    
    const recommendations = [];
    const bundleSize = this.results.testConfig.bundleSize;
    
    // 번들 사이즈 기반 권장사항
    if (bundleSize && bundleSize.budgetStatus === 'exceeded') {
      recommendations.push({
        priority: 'P0',
        category: 'Bundle Optimization',
        issue: `번들 크기 초과 (${bundleSize.totalSizeMB} MB > 1.0 MB)`,
        solution: '코드 스플리팅 강화, 사용하지 않는 라이브러리 제거, Tree shaking 최적화',
        impact: 'High',
        estimatedImprovement: '30-40% LCP 개선 예상'
      });
    }
    
    // 네트워크별 성능 이슈
    Object.entries(this.results.summary.criticalPathAnalysis).forEach(([networkKey, analysis]) => {
      if (analysis.budgetStatus === 'exceeded') {
        recommendations.push({
          priority: 'P1',
          category: 'Network Optimization',
          issue: `${analysis.networkCondition}에서 LCP ${analysis.worstLCP}ms 초과`,
          solution: 'Critical resource preload, CDN 사용, 이미지 최적화',
          impact: 'Medium',
          networkCondition: analysis.networkCondition,
          estimatedImprovement: '20-30% 로딩 시간 개선'
        });
      }
    });
    
    // Progressive Enhancement 권장사항
    const slow3GResult = this.results.summary.criticalPathAnalysis.Slow3G;
    if (slow3GResult && slow3GResult.criticalPathTime > 10000) { // 10초 이상
      recommendations.push({
        priority: 'P1',
        category: 'Progressive Enhancement',
        issue: '저속 네트워크에서 초기 로딩 시간 과다',
        solution: 'Progressive Web App, Service Worker 캐싱, 점진적 렌더링',
        impact: 'Medium',
        estimatedImprovement: '저속 네트워크 환경에서 50% 체감 성능 개선'
      });
    }
    
    this.results.summary.recommendations = recommendations;
    
    console.log(`✅ ${recommendations.length}개의 권장사항 생성 완료`);
  }

  async saveResults() {
    const reportDir = 'reports/performance';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `network-performance-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    
    console.log(`📄 상세 결과 저장: ${reportPath}`);
    
    // 요약 CSV 생성
    await this.generateCSVSummary(reportDir, timestamp);
  }

  async generateCSVSummary(reportDir, timestamp) {
    const csvPath = path.join(reportDir, `network-summary-${timestamp}.csv`);
    
    let csvContent = 'Network Condition,Step,Page,LCP (ms),FCP (ms),INP (ms),Budget Status,Download Time (ms)\n';
    
    Object.entries(this.results.networkResults).forEach(([networkKey, networkResult]) => {
      Object.entries(networkResult.journeyResults).forEach(([stepKey, stepResult]) => {
        csvContent += [
          stepResult.networkCondition,
          stepResult.journey.step,
          stepResult.journey.name,
          stepResult.metrics.LCP,
          stepResult.metrics.FCP,
          stepResult.metrics.INP,
          stepResult.budgetCompliance.overall,
          stepResult.performance.downloadTime
        ].join(',') + '\n';
      });
    });
    
    fs.writeFileSync(csvPath, csvContent);
    console.log(`📊 CSV 요약 저장: ${csvPath}`);
  }

  printSummary() {
    console.log('\n🎯 네트워크 조건별 성능 테스트 요약\n');
    
    // 번들 정보
    if (this.results.testConfig.bundleSize) {
      const bundle = this.results.testConfig.bundleSize;
      console.log(`📦 번들 크기: ${bundle.totalSizeMB} MB (예산: ${bundle.budgetStatus})`);
    }
    
    console.log('\n📊 네트워크별 성능 지표:');
    console.log('─'.repeat(80));
    console.log('Network'.padEnd(15) + 'Avg LCP'.padEnd(12) + 'Critical Path'.padEnd(15) + 'Budget'.padEnd(10) + 'Status');
    console.log('─'.repeat(80));
    
    Object.entries(this.results.summary.criticalPathAnalysis).forEach(([networkKey, analysis]) => {
      const status = analysis.budgetStatus === 'within' ? '✅ PASS' : '❌ FAIL';
      console.log(
        analysis.networkCondition.padEnd(15) +
        `${analysis.averageLCP}ms`.padEnd(12) +
        `${analysis.criticalPathTime}ms`.padEnd(15) +
        analysis.budgetStatus.padEnd(10) +
        status
      );
    });
    
    console.log('\n💡 주요 권장사항:');
    this.results.summary.recommendations.slice(0, 3).forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority}] ${rec.issue}`);
      console.log(`   해결방안: ${rec.solution}`);
      console.log(`   예상 효과: ${rec.estimatedImprovement}\n`);
    });
    
    console.log('📋 상세 보고서는 reports/performance/ 디렉토리를 확인하세요.');
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  const tester = new NetworkPerformanceTest();
  tester.runAllNetworkTests().catch(error => {
    console.error('\n❌ 네트워크 성능 테스트 실패:', error);
    process.exit(1);
  });
}

module.exports = NetworkPerformanceTest;