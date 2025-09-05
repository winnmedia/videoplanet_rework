#!/usr/bin/env node

/**
 * CSS 마이그레이션 분석기
 * SCSS 모듈을 Tailwind CSS로 마이그레이션하기 위한 분석 도구
 * - SCSS 사용량 분석
 * - Tailwind 호환성 검사
 * - 마이그레이션 우선순위 제안
 */

const fs = require('fs');
const path = require('path');

const sass = require('sass');

class CSSMigrationAnalyzer {
  constructor() {
    this.rootDir = process.cwd();
    this.results = {
      scssAnalysis: {},
      tailwindAnalysis: {},
      migrationPlan: [],
      compatibility: {}
    };
  }

  /**
   * SCSS 파일 분석
   */
  analyzeScssFiles() {
    console.log('🔍 SCSS 파일 분석 중...');
    
    const scssFiles = this.findScssFiles();
    const analysis = {
      totalFiles: scssFiles.length,
      filesBySize: [],
      complexityAnalysis: [],
      dependencies: new Map(),
      variables: new Set(),
      mixins: new Set()
    };

    scssFiles.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const stats = fs.statSync(filePath);
        
        const fileAnalysis = this.analyzeScssFile(filePath, content);
        
        analysis.filesBySize.push({
          file: filePath,
          size: stats.size,
          complexity: fileAnalysis.complexity,
          tailwindEquivalents: fileAnalysis.tailwindEquivalents,
          migrationDifficulty: fileAnalysis.migrationDifficulty
        });

        // 의존성 분석
        const imports = this.extractScssImports(content);
        if (imports.length > 0) {
          analysis.dependencies.set(filePath, imports);
        }

        // 변수와 믹신 추출
        fileAnalysis.variables.forEach(v => analysis.variables.add(v));
        fileAnalysis.mixins.forEach(m => analysis.mixins.add(m));

      } catch (error) {
        console.warn(`SCSS 파일 분석 실패: ${filePath}`, error.message);
      }
    });

    // 크기별 정렬
    analysis.filesBySize.sort((a, b) => b.size - a.size);

    this.results.scssAnalysis = analysis;

    console.log(`📊 SCSS 분석 결과:`);
    console.log(`  - 총 파일 수: ${analysis.totalFiles}개`);
    console.log(`  - 총 변수 수: ${analysis.variables.size}개`);
    console.log(`  - 총 믹신 수: ${analysis.mixins.size}개`);
  }

  /**
   * 개별 SCSS 파일 분석
   */
  analyzeScssFile(filePath, content) {
    const analysis = {
      complexity: 0,
      tailwindEquivalents: [],
      migrationDifficulty: 'EASY',
      variables: [],
      mixins: []
    };

    // 복잡도 계산 지표들
    const complexityFactors = {
      nestedSelectors: (content.match(/\s+&/g) || []).length,
      customProperties: (content.match(/--[\w-]+:/g) || []).length,
      calculations: (content.match(/calc\(/g) || []).length,
      mediaQueries: (content.match(/@media/g) || []).length,
      pseudoSelectors: (content.match(/::?[\w-]+/g) || []).length,
      functions: (content.match(/@function/g) || []).length,
      mixins: (content.match(/@mixin/g) || []).length,
      extends: (content.match(/@extend/g) || []).length
    };

    // 변수 추출
    const variableMatches = content.match(/\$[\w-]+:/g);
    if (variableMatches) {
      analysis.variables = variableMatches.map(v => v.replace(':', ''));
    }

    // 믹신 추출
    const mixinMatches = content.match(/@mixin\s+([\w-]+)/g);
    if (mixinMatches) {
      analysis.mixins = mixinMatches.map(m => m.replace('@mixin ', ''));
    }

    // 복잡도 점수 계산
    analysis.complexity = Object.values(complexityFactors).reduce((sum, count) => sum + count, 0);

    // Tailwind 동등 클래스 찾기
    analysis.tailwindEquivalents = this.findTailwindEquivalents(content);

    // 마이그레이션 난이도 결정
    if (analysis.complexity > 20 || complexityFactors.functions > 0) {
      analysis.migrationDifficulty = 'HARD';
    } else if (analysis.complexity > 10 || complexityFactors.mixins > 2) {
      analysis.migrationDifficulty = 'MEDIUM';
    }

    return analysis;
  }

  /**
   * SCSS에서 Tailwind 동등 클래스 찾기
   */
  findTailwindEquivalents(scssContent) {
    const equivalents = [];
    
    const patterns = {
      // 색상 패턴
      'color: #0031ff': 'text-primary-500',
      'background-color: #0031ff': 'bg-primary-500',
      'color: #ffffff': 'text-white',
      'background-color: #ffffff': 'bg-white',
      
      // 간격 패턴
      'margin: 8px': 'm-2',
      'padding: 8px': 'p-2',
      'margin: 16px': 'm-4',
      'padding: 16px': 'p-4',
      'margin: 24px': 'm-6',
      'padding: 24px': 'p-6',
      
      // 디스플레이 패턴
      'display: flex': 'flex',
      'display: grid': 'grid',
      'display: none': 'hidden',
      'display: block': 'block',
      
      // 정렬 패턴
      'justify-content: center': 'justify-center',
      'align-items: center': 'items-center',
      'text-align: center': 'text-center',
      
      // 크기 패턴
      'width: 100%': 'w-full',
      'height: 100%': 'h-full',
      
      // 테두리 패턴
      'border-radius: 4px': 'rounded',
      'border-radius: 8px': 'rounded-lg',
      
      // 폰트 패턴
      'font-weight: bold': 'font-bold',
      'font-weight: 500': 'font-medium',
    };

    Object.entries(patterns).forEach(([scssPattern, tailwindClass]) => {
      if (scssContent.includes(scssPattern)) {
        equivalents.push({
          scss: scssPattern,
          tailwind: tailwindClass,
          confidence: 'HIGH'
        });
      }
    });

    return equivalents;
  }

  /**
   * SCSS import 추출
   */
  extractScssImports(content) {
    const importMatches = content.match(/@import\s+['"]([^'"]+)['"]/g);
    if (!importMatches) return [];
    
    return importMatches.map(imp => {
      const match = imp.match(/@import\s+['"]([^'"]+)['"]/);
      return match ? match[1] : null;
    }).filter(Boolean);
  }

  /**
   * Tailwind 사용량 분석
   */
  analyzeTailwindUsage() {
    console.log('🎨 Tailwind 사용량 분석 중...');
    
    const reactFiles = this.findReactFiles();
    const analysis = {
      totalFiles: reactFiles.length,
      tailwindFiles: 0,
      classUsage: new Map(),
      migrationCandidates: []
    };

    reactFiles.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (this.hasTailwindClasses(content)) {
          analysis.tailwindFiles++;
          
          // 클래스 사용량 분석
          const classes = this.extractTailwindClasses(content);
          classes.forEach(cls => {
            analysis.classUsage.set(cls, (analysis.classUsage.get(cls) || 0) + 1);
          });
        } else {
          // SCSS import가 있는 파일을 마이그레이션 후보로 추가
          if (content.includes('.module.scss') || content.includes('.scss')) {
            analysis.migrationCandidates.push(filePath);
          }
        }
      } catch (error) {
        console.warn(`React 파일 분석 실패: ${filePath}`, error.message);
      }
    });

    // 가장 많이 사용되는 클래스들 정렬
    const sortedClasses = Array.from(analysis.classUsage.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20);

    this.results.tailwindAnalysis = {
      ...analysis,
      topClasses: sortedClasses
    };

    console.log(`📊 Tailwind 분석 결과:`);
    console.log(`  - Tailwind 사용 파일: ${analysis.tailwindFiles}/${analysis.totalFiles}개`);
    console.log(`  - 마이그레이션 후보: ${analysis.migrationCandidates.length}개`);
  }

  /**
   * 마이그레이션 계획 생성
   */
  generateMigrationPlan() {
    console.log('📋 마이그레이션 계획 생성 중...');
    
    const plan = [];
    const scssFiles = this.results.scssAnalysis.filesBySize || [];

    // Phase 1: 쉬운 마이그레이션 (간단한 SCSS 파일)
    const easyFiles = scssFiles.filter(f => f.migrationDifficulty === 'EASY');
    if (easyFiles.length > 0) {
      plan.push({
        phase: 1,
        title: '간단한 SCSS 모듈 마이그레이션',
        priority: 'HIGH',
        effort: 'LOW',
        files: easyFiles.slice(0, 5), // 상위 5개
        description: '복잡도가 낮고 Tailwind 대체가 쉬운 파일들',
        estimatedHours: easyFiles.length * 2
      });
    }

    // Phase 2: 중간 난이도 마이그레이션
    const mediumFiles = scssFiles.filter(f => f.migrationDifficulty === 'MEDIUM');
    if (mediumFiles.length > 0) {
      plan.push({
        phase: 2,
        title: '중간 복잡도 SCSS 모듈 마이그레이션',
        priority: 'MEDIUM',
        effort: 'MEDIUM',
        files: mediumFiles.slice(0, 3),
        description: '일부 커스텀 로직이 있지만 마이그레이션 가능한 파일들',
        estimatedHours: mediumFiles.length * 6
      });
    }

    // Phase 3: 복잡한 마이그레이션
    const hardFiles = scssFiles.filter(f => f.migrationDifficulty === 'HARD');
    if (hardFiles.length > 0) {
      plan.push({
        phase: 3,
        title: '복잡한 SCSS 모듈 리팩토링',
        priority: 'LOW',
        effort: 'HIGH',
        files: hardFiles.slice(0, 2),
        description: '복잡한 로직이 포함된 파일들 - 점진적 접근 필요',
        estimatedHours: hardFiles.length * 12
      });
    }

    this.results.migrationPlan = plan;

    console.log('📋 마이그레이션 계획:');
    plan.forEach(phase => {
      console.log(`  Phase ${phase.phase}: ${phase.title}`);
      console.log(`    우선순위: ${phase.priority} | 예상 시간: ${phase.estimatedHours}시간`);
      console.log(`    파일 수: ${phase.files.length}개`);
    });
  }

  /**
   * 호환성 검사
   */
  checkCompatibility() {
    console.log('🔧 호환성 검사 중...');
    
    const compatibility = {
      tailwindConfig: this.checkTailwindConfig(),
      designTokens: this.checkDesignTokenCompatibility(),
      buildSystem: this.checkBuildSystemCompatibility(),
      conflicts: this.detectStyleConflicts()
    };

    this.results.compatibility = compatibility;

    console.log('🔧 호환성 검사 결과:');
    console.log(`  - Tailwind 설정: ${compatibility.tailwindConfig ? '✅' : '❌'}`);
    console.log(`  - 디자인 토큰: ${compatibility.designTokens ? '✅' : '❌'}`);
    console.log(`  - 빌드 시스템: ${compatibility.buildSystem ? '✅' : '❌'}`);
    console.log(`  - 스타일 충돌: ${compatibility.conflicts.length}개`);
  }

  /**
   * 유틸리티 메서드들
   */
  findScssFiles() {
    const files = [];
    const searchDir = (dir) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      items.forEach(item => {
        if (item.isDirectory() && !['node_modules', '.next', '.git'].includes(item.name)) {
          searchDir(path.join(dir, item.name));
        } else if (item.isFile() && /\.s[ac]ss$/.test(item.name)) {
          files.push(path.join(dir, item.name));
        }
      });
    };
    
    searchDir(this.rootDir);
    return files;
  }

  findReactFiles() {
    const files = [];
    const searchDir = (dir) => {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      items.forEach(item => {
        if (item.isDirectory() && !['node_modules', '.next', '.git'].includes(item.name)) {
          searchDir(path.join(dir, item.name));
        } else if (item.isFile() && /\.(tsx|ts|jsx|js)$/.test(item.name)) {
          files.push(path.join(dir, item.name));
        }
      });
    };
    
    searchDir(this.rootDir);
    return files;
  }

  hasTailwindClasses(content) {
    return /className\s*=\s*["'][^"']*\b(bg-|text-|p-|m-|flex|grid|w-|h-)[^"']*["']/.test(content);
  }

  extractTailwindClasses(content) {
    const classes = [];
    const classNameRegex = /className\s*=\s*["']([^"']+)["']/g;
    let match;
    
    while ((match = classNameRegex.exec(content)) !== null) {
      const classString = match[1];
      const tailwindClasses = classString.split(/\s+/).filter(cls => 
        /^(bg-|text-|p-|m-|flex|grid|w-|h-|border-|rounded|shadow|font-|justify-|items-|space-|gap-|absolute|relative|fixed|block|inline|hidden)/.test(cls)
      );
      classes.push(...tailwindClasses);
    }
    
    return classes;
  }

  checkTailwindConfig() {
    try {
      const configPath = path.join(this.rootDir, 'tailwind.config.ts');
      return fs.existsSync(configPath);
    } catch {
      return false;
    }
  }

  checkDesignTokenCompatibility() {
    try {
      const configPath = path.join(this.rootDir, 'tailwind.config.ts');
      if (!fs.existsSync(configPath)) return false;
      
      const configContent = fs.readFileSync(configPath, 'utf8');
      return configContent.includes('vridge') && configContent.includes('primary');
    } catch {
      return false;
    }
  }

  checkBuildSystemCompatibility() {
    try {
      const packageJsonPath = path.join(this.rootDir, 'package.json');
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      
      return packageJson.devDependencies?.['prettier-plugin-tailwindcss'] &&
             packageJson.dependencies?.['tailwindcss'];
    } catch {
      return false;
    }
  }

  detectStyleConflicts() {
    const conflicts = [];
    
    // Tailwind와 SCSS가 같은 디렉토리에 있는 경우 검사
    const directories = new Set();
    
    const scssFiles = this.findScssFiles();
    scssFiles.forEach(file => {
      directories.add(path.dirname(file));
    });

    const reactFiles = this.findReactFiles();
    reactFiles.forEach(file => {
      try {
        const content = fs.readFileSync(file, 'utf8');
        if (this.hasTailwindClasses(content)) {
          const dir = path.dirname(file);
          if (directories.has(dir)) {
            conflicts.push({
              directory: dir,
              issue: 'Tailwind와 SCSS 모듈이 같은 디렉토리에 존재',
              severity: 'MEDIUM'
            });
          }
        }
      } catch {
        // 파일 읽기 실패 무시
      }
    });

    return conflicts;
  }

  /**
   * 보고서 생성
   */
  generateReport() {
    const reportPath = path.join(this.rootDir, 'css-migration-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      analysis: this.results,
      summary: {
        totalScssFiles: this.results.scssAnalysis.totalFiles || 0,
        tailwindAdoption: Math.round(
          (this.results.tailwindAnalysis?.tailwindFiles || 0) /
          (this.results.tailwindAnalysis?.totalFiles || 1) * 100
        ),
        migrationPhases: this.results.migrationPlan.length,
        estimatedEffort: this.results.migrationPlan.reduce(
          (sum, phase) => sum + phase.estimatedHours, 0
        )
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 CSS 마이그레이션 보고서: ${reportPath}`);
  }

  /**
   * 메인 실행 메서드
   */
  async run() {
    console.log('🚀 CSS 마이그레이션 분석 시작\n');
    
    try {
      this.analyzeScssFiles();
      this.analyzeTailwindUsage();
      this.generateMigrationPlan();
      this.checkCompatibility();
      this.generateReport();
      
      console.log('\n✅ CSS 마이그레이션 분석 완료');
      
    } catch (error) {
      console.error('❌ 분석 중 오류 발생:', error.message);
      process.exit(1);
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const analyzer = new CSSMigrationAnalyzer();
  analyzer.run();
}

module.exports = CSSMigrationAnalyzer;