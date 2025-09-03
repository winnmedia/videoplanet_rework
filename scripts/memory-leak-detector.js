#!/usr/bin/env node

/**
 * 메모리 사용량 및 메모리 누수 검사 스크립트  
 * Node.js 프로세스 메모리 분석 및 잠재적 메모리 누수 패턴 탐지
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 메모리 임계값 (MB)
const MEMORY_THRESHOLDS = {
  HEAP_USED_WARNING: 50,     // 50MB 경고
  HEAP_USED_CRITICAL: 100,   // 100MB 위험
  HEAP_TOTAL_WARNING: 80,    // 80MB 경고
  HEAP_TOTAL_CRITICAL: 150,  // 150MB 위험
  RSS_WARNING: 200,          // 200MB 경고
  RSS_CRITICAL: 400,         // 400MB 위험
  EXTERNAL_WARNING: 30,      // 30MB 경고
  EXTERNAL_CRITICAL: 60      // 60MB 위험
};

// 메모리 누수 위험 패턴
const MEMORY_LEAK_PATTERNS = [
  {
    name: 'Redux Store Memory Leak',
    files: ['**/*slice.ts', '**/*store.ts', '**/*reducer.ts'],
    patterns: [
      /createSlice\(\{[\s\S]*?reducers:[\s\S]*?\}\)/g,
      /configureStore\(\{[\s\S]*?\}\)/g,
      /createAsyncThunk/g,
      /createEntityAdapter/g
    ],
    risks: [
      'Large state objects without cleanup',
      'Infinite data accumulation in store',
      'Missing action cleanup in components',
      'Unclosed subscriptions to store'
    ]
  },
  {
    name: 'Event Listener Memory Leak',
    files: ['**/*.tsx', '**/*.ts'],
    patterns: [
      /addEventListener\s*\(/g,
      /useEffect\s*\(\s*\(\s*\)\s*=>/g,
      /setInterval\s*\(/g,
      /setTimeout\s*\(/g,
      /WebSocket\s*\(/g,
      /new\s+EventSource\s*\(/g
    ],
    risks: [
      'Missing removeEventListener in cleanup',
      'useEffect without cleanup function', 
      'Timers not cleared on unmount',
      'WebSocket connections not closed',
      'EventSource connections not closed'
    ]
  },
  {
    name: 'DOM Reference Memory Leak',
    files: ['**/*.tsx'],
    patterns: [
      /useRef\s*\</g,
      /createRef\s*\(/g,
      /document\.getElementById/g,
      /document\.querySelector/g,
      /document\.getElementsBy/g
    ],
    risks: [
      'Direct DOM references preventing GC',
      'Refs not nulled on unmount',
      'Circular references through DOM nodes',
      'Large DOM trees held in memory'
    ]
  },
  {
    name: 'Canvas/Video Memory Leak',
    files: ['**/feedback/**/*.tsx', '**/video/**/*.ts'],
    patterns: [
      /getContext\s*\(\s*['"`]2d['"`]\s*\)/g,
      /new\s+VideoPlayer/g,
      /canvas\.width/g,
      /canvas\.height/g,
      /drawImage\s*\(/g,
      /createImageData/g
    ],
    risks: [
      'Canvas contexts not released',
      'Video elements not properly disposed',
      'Large image data retained in memory',
      'Animation frames not cancelled'
    ]
  },
  {
    name: 'Async/Promise Memory Leak',
    files: ['**/*.ts', '**/*.tsx'],
    patterns: [
      /new\s+Promise\s*\(/g,
      /fetch\s*\(/g,
      /axios\s*\./g,
      /createAsyncThunk/g,
      /async\s+function/g,
      /await\s+/g
    ],
    risks: [
      'Unresolved promises holding references',
      'Network requests not cancelled',
      'Race conditions in async operations',
      'Memory buildup from concurrent requests'
    ]
  }
];

class MemoryLeakDetector {
  constructor() {
    this.results = {
      timestamp: new Date().toISOString(),
      environment: 'Node.js ' + process.version,
      memoryAnalysis: {
        baseline: null,
        current: null,
        peak: null,
        trend: []
      },
      leakDetection: {
        patterns: {},
        riskFiles: [],
        recommendations: []
      },
      codeAnalysis: {
        totalFiles: 0,
        analyzedFiles: 0,
        riskScore: 0
      }
    };
  }

  async runMemoryAnalysis() {
    console.log('🧠 메모리 사용량 및 누수 검사 시작...');
    
    try {
      // 1. 기본 메모리 상태 수집
      await this.collectBaselineMemory();
      
      // 2. 코드 정적 분석 (메모리 누수 패턴 탐지)
      await this.analyzeCodePatterns();
      
      // 3. 메모리 사용량 시뮬레이션
      await this.simulateMemoryUsage();
      
      // 4. 권장사항 생성
      await this.generateRecommendations();
      
      // 5. 결과 저장
      await this.saveResults();
      
      console.log('✅ 메모리 분석 완료');
      this.printSummary();
      
    } catch (error) {
      console.error('❌ 메모리 분석 실패:', error.message);
      throw error;
    }
  }

  async collectBaselineMemory() {
    console.log('📊 기본 메모리 상태 수집 중...');
    
    const memoryUsage = process.memoryUsage();
    const memoryInMB = {
      rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100,
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
      external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100,
      arrayBuffers: Math.round(memoryUsage.arrayBuffers / 1024 / 1024 * 100) / 100
    };
    
    this.results.memoryAnalysis.baseline = {
      timestamp: new Date().toISOString(),
      usage: memoryInMB,
      status: this.assessMemoryStatus(memoryInMB),
      warnings: this.checkMemoryThresholds(memoryInMB)
    };
    
    this.results.memoryAnalysis.current = this.results.memoryAnalysis.baseline;
    
    console.log(`💾 현재 메모리 사용량: RSS ${memoryInMB.rss}MB, Heap ${memoryInMB.heapUsed}MB`);
  }

  assessMemoryStatus(memory) {
    const issues = [];
    
    if (memory.heapUsed > MEMORY_THRESHOLDS.HEAP_USED_CRITICAL) {
      issues.push('CRITICAL: Heap usage too high');
    } else if (memory.heapUsed > MEMORY_THRESHOLDS.HEAP_USED_WARNING) {
      issues.push('WARNING: Heap usage elevated');
    }
    
    if (memory.rss > MEMORY_THRESHOLDS.RSS_CRITICAL) {
      issues.push('CRITICAL: RSS memory too high');
    } else if (memory.rss > MEMORY_THRESHOLDS.RSS_WARNING) {
      issues.push('WARNING: RSS memory elevated');
    }
    
    return issues.length === 0 ? 'OK' : issues.join(', ');
  }

  checkMemoryThresholds(memory) {
    const warnings = [];
    
    Object.entries(MEMORY_THRESHOLDS).forEach(([threshold, value]) => {
      const memoryType = threshold.split('_')[0].toLowerCase();
      const level = threshold.split('_')[1].toLowerCase();
      
      if (memory[memoryType] && memory[memoryType] > value) {
        warnings.push({
          type: memoryType,
          level: level,
          current: memory[memoryType],
          threshold: value,
          message: `${memoryType} memory ${level}: ${memory[memoryType]}MB > ${value}MB`
        });
      }
    });
    
    return warnings;
  }

  async analyzeCodePatterns() {
    console.log('🔍 메모리 누수 패턴 분석 중...');
    
    let totalFiles = 0;
    let analyzedFiles = 0;
    let totalRiskScore = 0;
    
    for (const pattern of MEMORY_LEAK_PATTERNS) {
      console.log(`  🔎 ${pattern.name} 패턴 검사 중...`);
      
      const patternResults = {
        name: pattern.name,
        filesScanned: 0,
        matchesFound: 0,
        riskFiles: [],
        riskLevel: 'low'
      };
      
      try {
        // Glob 패턴으로 파일 검색
        for (const filePattern of pattern.files) {
          const files = await this.findFiles(filePattern);
          totalFiles += files.length;
          
          for (const file of files) {
            try {
              const content = fs.readFileSync(file, 'utf8');
              analyzedFiles++;
              patternResults.filesScanned++;
              
              let fileMatches = 0;
              const fileRisks = [];
              
              for (let i = 0; i < pattern.patterns.length; i++) {
                const regex = pattern.patterns[i];
                const matches = content.match(regex);
                
                if (matches) {
                  fileMatches += matches.length;
                  fileRisks.push({
                    pattern: regex.toString(),
                    matches: matches.length,
                    risk: pattern.risks[i] || 'Unknown risk'
                  });
                }
              }
              
              if (fileMatches > 0) {
                patternResults.matchesFound += fileMatches;
                patternResults.riskFiles.push({
                  file: file,
                  matches: fileMatches,
                  risks: fileRisks,
                  riskScore: this.calculateFileRiskScore(fileMatches, fileRisks)
                });
              }
              
            } catch (error) {
              console.warn(`    ⚠️ 파일 분석 실패: ${file}`);
            }
          }
        }
        
        // 리스크 레벨 계산
        if (patternResults.matchesFound > 10) {
          patternResults.riskLevel = 'high';
          totalRiskScore += 3;
        } else if (patternResults.matchesFound > 5) {
          patternResults.riskLevel = 'medium';
          totalRiskScore += 2;
        } else if (patternResults.matchesFound > 0) {
          patternResults.riskLevel = 'low';
          totalRiskScore += 1;
        }
        
      } catch (error) {
        console.warn(`    ⚠️ 패턴 분석 실패: ${pattern.name}`);
      }
      
      this.results.leakDetection.patterns[pattern.name] = patternResults;
    }
    
    this.results.codeAnalysis = {
      totalFiles: totalFiles,
      analyzedFiles: analyzedFiles,
      riskScore: totalRiskScore,
      riskLevel: totalRiskScore > 10 ? 'high' : totalRiskScore > 5 ? 'medium' : 'low'
    };
    
    console.log(`✅ 코드 분석 완료: ${analyzedFiles}개 파일, 리스크 점수 ${totalRiskScore}`);
  }

  async findFiles(pattern) {
    try {
      // 간단한 glob 구현 (실제로는 glob 라이브러리를 사용하는 것이 좋음)
      const command = `find src -name "${pattern.replace('**/', '').replace('*', '\\*')}" -type f 2>/dev/null || echo ""`;
      const output = execSync(command, { encoding: 'utf8', cwd: process.cwd() });
      return output.trim() ? output.trim().split('\n') : [];
    } catch (error) {
      return [];
    }
  }

  calculateFileRiskScore(matches, risks) {
    let score = matches * 0.5; // 기본 매치 점수
    
    // 리스크 유형별 가중치
    risks.forEach(risk => {
      if (risk.risk.includes('cleanup')) score += 2;
      if (risk.risk.includes('useEffect')) score += 1.5;
      if (risk.risk.includes('WebSocket')) score += 2;
      if (risk.risk.includes('Canvas')) score += 1.5;
      if (risk.risk.includes('Promise')) score += 1;
    });
    
    return Math.round(score * 100) / 100;
  }

  async simulateMemoryUsage() {
    console.log('🎭 메모리 사용량 시뮬레이션 중...');
    
    const simulations = [
      { name: 'Redux Store Growth', baseMemory: 15, growthRate: 2 },
      { name: 'Component Mount/Unmount', baseMemory: 10, growthRate: 0.5 },
      { name: 'Video Player Usage', baseMemory: 25, growthRate: 5 },
      { name: 'Canvas Operations', baseMemory: 20, growthRate: 3 },
      { name: 'Network Requests', baseMemory: 5, growthRate: 1 }
    ];
    
    const projectedMemory = {
      light: 0, // 가벼운 사용
      normal: 0, // 일반 사용  
      heavy: 0   // 집중 사용
    };
    
    simulations.forEach(sim => {
      projectedMemory.light += sim.baseMemory + sim.growthRate * 1;
      projectedMemory.normal += sim.baseMemory + sim.growthRate * 3;
      projectedMemory.heavy += sim.baseMemory + sim.growthRate * 8;
    });
    
    this.results.memoryAnalysis.projections = {
      scenarios: simulations,
      estimated: projectedMemory,
      warnings: []
    };
    
    // 경고 생성
    Object.entries(projectedMemory).forEach(([scenario, memory]) => {
      if (memory > MEMORY_THRESHOLDS.HEAP_USED_CRITICAL) {
        this.results.memoryAnalysis.projections.warnings.push({
          scenario: scenario,
          memory: memory,
          level: 'critical',
          message: `${scenario} usage may exceed safe memory limits (${memory}MB)`
        });
      } else if (memory > MEMORY_THRESHOLDS.HEAP_USED_WARNING) {
        this.results.memoryAnalysis.projections.warnings.push({
          scenario: scenario,
          memory: memory,
          level: 'warning',
          message: `${scenario} usage approaching memory limits (${memory}MB)`
        });
      }
    });
    
    console.log(`📈 예상 메모리 사용량 - 가벼운: ${projectedMemory.light}MB, 일반: ${projectedMemory.normal}MB, 집중: ${projectedMemory.heavy}MB`);
  }

  async generateRecommendations() {
    console.log('💡 메모리 최적화 권장사항 생성 중...');
    
    const recommendations = [];
    
    // 코드 패턴 기반 권장사항
    Object.entries(this.results.leakDetection.patterns).forEach(([patternName, pattern]) => {
      if (pattern.riskLevel === 'high') {
        recommendations.push({
          priority: 'P0',
          category: 'Memory Leak Prevention',
          issue: `High risk: ${patternName} (${pattern.matchesFound} potential issues)`,
          solution: this.getPatternSolution(patternName),
          impact: 'High',
          files: pattern.riskFiles.slice(0, 3).map(f => f.file)
        });
      } else if (pattern.riskLevel === 'medium') {
        recommendations.push({
          priority: 'P1',
          category: 'Memory Optimization',
          issue: `Medium risk: ${patternName} (${pattern.matchesFound} potential issues)`,
          solution: this.getPatternSolution(patternName),
          impact: 'Medium',
          files: pattern.riskFiles.slice(0, 2).map(f => f.file)
        });
      }
    });
    
    // 메모리 사용량 기반 권장사항
    if (this.results.memoryAnalysis.projections) {
      this.results.memoryAnalysis.projections.warnings.forEach(warning => {
        recommendations.push({
          priority: warning.level === 'critical' ? 'P0' : 'P1',
          category: 'Memory Budget',
          issue: warning.message,
          solution: 'Implement memory monitoring, add cleanup logic, optimize data structures',
          impact: warning.level === 'critical' ? 'High' : 'Medium'
        });
      });
    }
    
    // 일반적인 최적화 권장사항
    if (this.results.codeAnalysis.riskScore > 5) {
      recommendations.push({
        priority: 'P1',
        category: 'General Optimization',
        issue: 'Overall memory leak risk detected',
        solution: 'Implement comprehensive cleanup patterns, add memory monitoring',
        impact: 'Medium'
      });
    }
    
    this.results.leakDetection.recommendations = recommendations;
    console.log(`✅ ${recommendations.length}개의 권장사항 생성 완료`);
  }

  getPatternSolution(patternName) {
    const solutions = {
      'Redux Store Memory Leak': 'Implement state cleanup actions, use RTK Query cache invalidation, limit store data retention',
      'Event Listener Memory Leak': 'Add cleanup functions in useEffect, remove event listeners on unmount, clear timers',
      'DOM Reference Memory Leak': 'Null refs on unmount, avoid direct DOM manipulation, use React patterns',
      'Canvas/Video Memory Leak': 'Dispose canvas contexts, pause/destroy video elements, clear animation frames',
      'Async/Promise Memory Leak': 'Cancel pending requests on unmount, implement request deduplication, handle race conditions'
    };
    
    return solutions[patternName] || 'Review code for proper cleanup patterns';
  }

  async saveResults() {
    const reportDir = 'reports/performance';
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(reportDir, `memory-analysis-${timestamp}.json`);
    
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`📄 메모리 분석 결과 저장: ${reportPath}`);
  }

  printSummary() {
    console.log('\n🧠 메모리 사용량 및 누수 검사 요약\n');
    
    // 현재 메모리 상태
    const current = this.results.memoryAnalysis.current;
    console.log('📊 현재 메모리 상태:');
    console.log(`  RSS: ${current.usage.rss}MB`);
    console.log(`  Heap Used: ${current.usage.heapUsed}MB`);
    console.log(`  Heap Total: ${current.usage.heapTotal}MB`);
    console.log(`  External: ${current.usage.external}MB`);
    console.log(`  상태: ${current.status}\n`);
    
    // 코드 분석 결과
    const code = this.results.codeAnalysis;
    console.log('🔍 코드 분석 결과:');
    console.log(`  분석된 파일: ${code.analyzedFiles}개`);
    console.log(`  리스크 점수: ${code.riskScore} (${code.riskLevel})`);
    
    // 패턴별 요약
    console.log('\n🔎 메모리 누수 패턴 탐지:');
    console.log('─'.repeat(70));
    console.log('Pattern'.padEnd(25) + 'Matches'.padEnd(10) + 'Risk'.padEnd(10) + 'Status');
    console.log('─'.repeat(70));
    
    Object.entries(this.results.leakDetection.patterns).forEach(([name, pattern]) => {
      const status = pattern.riskLevel === 'high' ? '❌ HIGH' : 
                    pattern.riskLevel === 'medium' ? '⚠️ MED' : '✅ LOW';
      console.log(
        name.substring(0, 24).padEnd(25) +
        pattern.matchesFound.toString().padEnd(10) +
        pattern.riskLevel.padEnd(10) +
        status
      );
    });
    
    // 권장사항
    console.log('\n💡 우선 순위 권장사항:');
    this.results.leakDetection.recommendations
      .sort((a, b) => a.priority.localeCompare(b.priority))
      .slice(0, 3)
      .forEach((rec, index) => {
        console.log(`${index + 1}. [${rec.priority}] ${rec.issue}`);
        console.log(`   해결방안: ${rec.solution}`);
        if (rec.files && rec.files.length > 0) {
          console.log(`   대상 파일: ${rec.files.join(', ')}`);
        }
        console.log('');
      });
    
    console.log('📋 상세 보고서는 reports/performance/ 디렉토리를 확인하세요.');
  }
}

// 스크립트 직접 실행 시
if (require.main === module) {
  const detector = new MemoryLeakDetector();
  detector.runMemoryAnalysis().catch(error => {
    console.error('\n❌ 메모리 분석 실패:', error);
    process.exit(1);
  });
}

module.exports = MemoryLeakDetector;