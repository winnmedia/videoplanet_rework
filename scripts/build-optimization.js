#!/usr/bin/env node

/**
 * 빌드 시스템 최적화 스크립트
 * - 번들 분석 및 최적화 제안
 * - 순환 의존성 해결
 * - Tree-shaking 개선
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class BuildOptimizer {
  constructor() {
    this.rootDir = process.cwd();
    this.results = {
      circularDependencies: [],
      bundleAnalysis: {},
      optimizationOpportunities: []
    };
  }

  /**
   * 1단계: 순환 의존성 분석
   */
  async analyzeCircularDependencies() {
    console.log('🔍 순환 의존성 분석 중...');
    
    try {
      const madgeOutput = execSync('npx madge --circular --extensions ts,tsx,js,jsx . --exclude "node_modules|\\.next|out|build" --json', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      });
      
      this.results.circularDependencies = JSON.parse(madgeOutput);
      
      console.log(`발견된 순환 의존성: ${this.results.circularDependencies.length}개`);
      
      // 우선순위별 분류
      const criticalCycles = this.results.circularDependencies.filter(cycle => 
        cycle.some(file => file.includes('entities/') || file.includes('shared/'))
      );
      
      if (criticalCycles.length > 0) {
        console.log('⚠️  크리티컬 순환 의존성 (entities/shared 관련):');
        criticalCycles.forEach((cycle, index) => {
          console.log(`  ${index + 1}) ${cycle.join(' → ')}`);
        });
      }
      
    } catch (error) {
      console.error('순환 의존성 분석 실패:', error.message);
    }
  }

  /**
   * 2단계: Bundle 분석
   */
  async analyzeBundleSize() {
    console.log('📦 번들 크기 분석 중...');
    
    const buildStatsPath = path.join(this.rootDir, '.next/server/chunks');
    
    if (fs.existsSync(buildStatsPath)) {
      const chunks = fs.readdirSync(buildStatsPath, { withFileTypes: true })
        .filter(dirent => dirent.isFile() && dirent.name.endsWith('.js'))
        .map(dirent => {
          const filePath = path.join(buildStatsPath, dirent.name);
          const stats = fs.statSync(filePath);
          return {
            name: dirent.name,
            size: stats.size,
            sizeKB: Math.round(stats.size / 1024)
          };
        })
        .sort((a, b) => b.size - a.size)
        .slice(0, 10); // Top 10 큰 청크

      this.results.bundleAnalysis = {
        largestChunks: chunks,
        totalSize: chunks.reduce((sum, chunk) => sum + chunk.size, 0)
      };

      console.log('📊 가장 큰 번들 청크들:');
      chunks.forEach((chunk, index) => {
        console.log(`  ${index + 1}. ${chunk.name}: ${chunk.sizeKB}KB`);
      });
    }
  }

  /**
   * 3단계: Import 패턴 분석
   */
  analyzeImportPatterns() {
    console.log('🔗 Import 패턴 분석 중...');
    
    const findImportViolations = (dir, violations = []) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      items.forEach(item => {
        if (item.isDirectory() && !['node_modules', '.next', '.git'].includes(item.name)) {
          findImportViolations(path.join(dir, item.name), violations);
        } else if (item.isFile() && /\.(ts|tsx|js|jsx)$/.test(item.name)) {
          const filePath = path.join(dir, item.name);
          const content = fs.readFileSync(filePath, 'utf8');
          
          // 직접 내부 import 패턴 검출
          const directImportMatches = content.match(/from\s+['"]@\w+\/\w+\/(?!index)[^'"]+['"]/g);
          if (directImportMatches) {
            violations.push({
              file: filePath,
              violations: directImportMatches,
              type: 'direct-internal-import'
            });
          }
          
          // 상향 의존성 패턴 검출 (FSD 위반)
          const layerOrder = ['shared', 'entities', 'features', 'widgets', 'processes', 'app'];
          const currentLayer = layerOrder.find(layer => filePath.includes(`/${layer}/`));
          
          if (currentLayer) {
            const currentIndex = layerOrder.indexOf(currentLayer);
            const higherLayerImports = content.match(/from\s+['"]@(app|processes|widgets|features|entities)[^'"]*['"]/g);
            
            if (higherLayerImports) {
              const invalidImports = higherLayerImports.filter(imp => {
                const importedLayer = imp.match(/@(\w+)/)?.[1];
                const importedIndex = layerOrder.indexOf(importedLayer);
                return importedIndex > currentIndex;
              });
              
              if (invalidImports.length > 0) {
                violations.push({
                  file: filePath,
                  violations: invalidImports,
                  type: 'upward-dependency'
                });
              }
            }
          }
        }
      });
      
      return violations;
    };

    const violations = findImportViolations(this.rootDir);
    
    console.log(`발견된 Import 위반: ${violations.length}개`);
    
    // 심각도별 분류
    const upwardDependencies = violations.filter(v => v.type === 'upward-dependency');
    const directImports = violations.filter(v => v.type === 'direct-internal-import');
    
    if (upwardDependencies.length > 0) {
      console.log('⚠️  상향 의존성 위반 (FSD 아키텍처):');
      upwardDependencies.slice(0, 5).forEach((violation, index) => {
        console.log(`  ${index + 1}. ${violation.file}`);
        violation.violations.forEach(v => console.log(`     ${v}`));
      });
    }
    
    if (directImports.length > 0) {
      console.log('🔧 직접 내부 Import (Public API 우회):');
      console.log(`   총 ${directImports.length}개 파일에서 위반 발견`);
    }

    this.results.importViolations = violations;
  }

  /**
   * 4단계: CSS 아키텍처 분석
   */
  analyzeCSSArchitecture() {
    console.log('🎨 CSS 아키텍처 분석 중...');
    
    // SCSS 파일 목록
    const scssFiles = this.findFilesByExtension(['.scss', '.sass']);
    const tailwindFiles = this.findFilesWithTailwind();
    
    console.log(`SCSS 모듈: ${scssFiles.length}개`);
    console.log(`Tailwind 사용 파일: ${tailwindFiles.length}개`);
    
    // 스타일링 충돌 가능성 분석
    const mixedStyleFiles = tailwindFiles.filter(file => 
      scssFiles.some(scssFile => 
        path.dirname(file) === path.dirname(scssFile)
      )
    );
    
    if (mixedStyleFiles.length > 0) {
      console.log('⚠️  스타일링 혼재 감지:');
      mixedStyleFiles.slice(0, 5).forEach((file, index) => {
        console.log(`  ${index + 1}. ${file}`);
      });
    }

    this.results.cssAnalysis = {
      scssFiles: scssFiles.length,
      tailwindFiles: tailwindFiles.length,
      mixedStyleFiles: mixedStyleFiles.length
    };
  }

  /**
   * 유틸리티 메서드들
   */
  findFilesByExtension(extensions) {
    const files = [];
    
    const searchDir = (dir) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      items.forEach(item => {
        if (item.isDirectory() && !['node_modules', '.next', '.git'].includes(item.name)) {
          searchDir(path.join(dir, item.name));
        } else if (item.isFile()) {
          if (extensions.some(ext => item.name.endsWith(ext))) {
            files.push(path.join(dir, item.name));
          }
        }
      });
    };
    
    searchDir(this.rootDir);
    return files;
  }

  findFilesWithTailwind() {
    const files = [];
    const tsxFiles = this.findFilesByExtension(['.tsx', '.ts', '.jsx', '.js']);
    
    tsxFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (/className\s*=\s*["'][^"']*\b(bg-|text-|p-|m-|flex|grid|w-|h-)[^"']*["']/.test(content)) {
          files.push(file);
        }
      } catch (error) {
        // 파일 읽기 실패 무시
      }
    });
    
    return files;
  }

  /**
   * 5단계: 최적화 제안 생성
   */
  generateOptimizationRecommendations() {
    console.log('💡 최적화 제안 생성 중...');
    
    const recommendations = [];

    // 순환 의존성 해결
    if (this.results.circularDependencies.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: '순환 의존성',
        issue: `${this.results.circularDependencies.length}개의 순환 의존성 발견`,
        solution: 'API 클라이언트와 모니터링 모듈 분리, 인터페이스 기반 의존성 주입 적용',
        impact: '빌드 시간 단축, 모듈 경계 명확화'
      });
    }

    // CSS 아키텍처
    if (this.results.cssAnalysis?.mixedStyleFiles > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'CSS 아키텍처',
        issue: `${this.results.cssAnalysis.mixedStyleFiles}개 파일에서 스타일링 혼재`,
        solution: 'SCSS → Tailwind 점진적 마이그레이션, CSS 격리 전략 적용',
        impact: '번들 크기 감소, 스타일링 일관성 개선'
      });
    }

    // Import 패턴
    if (this.results.importViolations?.length > 0) {
      const upwardDeps = this.results.importViolations.filter(v => v.type === 'upward-dependency').length;
      if (upwardDeps > 0) {
        recommendations.push({
          priority: 'HIGH',
          category: 'FSD 아키텍처',
          issue: `${upwardDeps}개의 상향 의존성 위반`,
          solution: '의존성 역전 원칙 적용, Public API 인터페이스 정의',
          impact: '아키텍처 무결성 보장, 코드 재사용성 향상'
        });
      }
    }

    this.results.optimizationOpportunities = recommendations;

    console.log('\n🎯 최적화 제안:');
    recommendations.forEach((rec, index) => {
      console.log(`\n${index + 1}. [${rec.priority}] ${rec.category}`);
      console.log(`   문제: ${rec.issue}`);
      console.log(`   해결책: ${rec.solution}`);
      console.log(`   효과: ${rec.impact}`);
    });
  }

  /**
   * 6단계: 결과 보고서 생성
   */
  generateReport() {
    const reportPath = path.join(this.rootDir, 'build-optimization-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      analysis: this.results,
      recommendations: this.results.optimizationOpportunities
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 상세 보고서가 생성되었습니다: ${reportPath}`);
  }

  /**
   * 메인 실행 메서드
   */
  async run() {
    console.log('🚀 빌드 시스템 최적화 분석 시작\n');
    
    try {
      await this.analyzeCircularDependencies();
      await this.analyzeBundleSize();
      this.analyzeImportPatterns();
      this.analyzeCSSArchitecture();
      this.generateOptimizationRecommendations();
      this.generateReport();
      
      console.log('\n✅ 빌드 최적화 분석 완료');
      
    } catch (error) {
      console.error('❌ 분석 중 오류 발생:', error.message);
      process.exit(1);
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const optimizer = new BuildOptimizer();
  optimizer.run();
}

module.exports = BuildOptimizer;