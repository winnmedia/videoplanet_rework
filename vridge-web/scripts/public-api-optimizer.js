#!/usr/bin/env node

/**
 * Public API 최적화 도구
 * - FSD Barrel Export 최적화
 * - Tree-shaking 개선
 * - 중복 Export 제거
 * - Import 경로 표준화
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class PublicApiOptimizer {
  constructor() {
    this.rootDir = process.cwd();
    this.fsdLayers = ['shared', 'entities', 'features', 'widgets', 'processes', 'app'];
    this.results = {
      analysis: {},
      optimizations: [],
      recommendations: []
    };
  }

  /**
   * Public API 파일 분석
   */
  analyzePublicApis() {
    console.log('🔍 Public API 파일 분석 중...');
    
    const analysis = {
      layers: {},
      totalIndexFiles: 0,
      exportAnalysis: {},
      importUsage: new Map()
    };

    this.fsdLayers.forEach(layer => {
      const layerPath = path.join(this.rootDir, layer);
      const srcLayerPath = path.join(this.rootDir, 'src', layer);
      
      // 두 경로 모두 확인 (병렬 시스템)
      const paths = [layerPath, srcLayerPath].filter(p => fs.existsSync(p));
      
      if (paths.length === 0) return;

      analysis.layers[layer] = {
        paths: paths,
        indexFiles: [],
        slices: {},
        totalExports: 0,
        duplicateExports: []
      };

      paths.forEach(layerDir => {
        this.analyzeLayerPublicApi(layerDir, layer, analysis.layers[layer]);
      });
    });

    // Import 사용량 분석
    this.analyzeImportUsage(analysis);

    this.results.analysis = analysis;

    console.log('📊 Public API 분석 결과:');
    Object.entries(analysis.layers).forEach(([layer, data]) => {
      console.log(`  ${layer}: ${data.indexFiles.length}개 index 파일, ${data.totalExports}개 export`);
    });
  }

  /**
   * 레이어별 Public API 분석
   */
  analyzeLayerPublicApi(layerDir, layerName, layerAnalysis) {
    const indexFiles = this.findIndexFiles(layerDir);
    layerAnalysis.indexFiles.push(...indexFiles);

    indexFiles.forEach(indexFile => {
      try {
        const content = fs.readFileSync(indexFile, 'utf8');
        const exports = this.parseExports(content);
        
        layerAnalysis.totalExports += exports.length;
        
        // 슬라이스별 분석
        const sliceName = this.getSliceName(indexFile, layerDir);
        if (sliceName) {
          layerAnalysis.slices[sliceName] = {
            path: indexFile,
            exports: exports,
            exportTypes: this.categorizeExports(exports),
            treeShakable: this.isTreeShakable(content)
          };
        }
      } catch (error) {
        console.warn(`index 파일 분석 실패: ${indexFile}`, error.message);
      }
    });
  }

  /**
   * Export 파싱
   */
  parseExports(content) {
    const exports = [];
    
    // Named exports
    const namedExportRegex = /export\s*\{\s*([^}]+)\s*\}/g;
    let match;
    while ((match = namedExportRegex.exec(content)) !== null) {
      const exportList = match[1].split(',').map(e => e.trim().split(' as ')[0].trim());
      exports.push(...exportList);
    }
    
    // Re-exports
    const reExportRegex = /export\s*\{\s*([^}]*)\s*\}\s*from\s*['"]([^'"]+)['"]/g;
    while ((match = reExportRegex.exec(content)) !== null) {
      const exportList = match[1] ? match[1].split(',').map(e => e.trim().split(' as ')[0].trim()) : ['*'];
      exports.push(...exportList.map(e => ({ name: e, from: match[2] })));
    }
    
    // Export all
    const exportAllRegex = /export\s*\*\s*from\s*['"]([^'"]+)['"]/g;
    while ((match = exportAllRegex.exec(content)) !== null) {
      exports.push({ name: '*', from: match[1] });
    }
    
    // Direct exports
    const directExportRegex = /export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)/g;
    while ((match = directExportRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }
    
    return exports;
  }

  /**
   * Export 타입 분류
   */
  categorizeExports(exports) {
    return {
      components: exports.filter(e => typeof e === 'string' && /^[A-Z]/.test(e)),
      hooks: exports.filter(e => typeof e === 'string' && e.startsWith('use')),
      types: exports.filter(e => typeof e === 'string' && e.includes('Type')),
      utils: exports.filter(e => typeof e === 'string' && /^[a-z]/.test(e)),
      reExports: exports.filter(e => typeof e === 'object')
    };
  }

  /**
   * Tree-shaking 가능 여부 확인
   */
  isTreeShakable(content) {
    // 사이드 이펙트가 있는 패턴들 검사
    const sideEffectPatterns = [
      /console\./,
      /window\./,
      /document\./,
      /process\.env/,
      /import\s+['"][^'"]*\.css['"]/, // CSS imports
      /import\s+['"][^'"]*\.scss['"]/, // SCSS imports
    ];
    
    return !sideEffectPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Import 사용량 분석
   */
  analyzeImportUsage(analysis) {
    console.log('🔗 Import 사용량 분석 중...');
    
    const allFiles = this.getAllSourceFiles();
    const importUsage = new Map();
    
    allFiles.forEach(filePath => {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const imports = this.parseImports(content);
        
        imports.forEach(imp => {
          if (imp.from.startsWith('@')) {
            const usage = importUsage.get(imp.from) || { count: 0, files: new Set(), imports: new Set() };
            usage.count++;
            usage.files.add(filePath);
            imp.imports.forEach(name => usage.imports.add(name));
            importUsage.set(imp.from, usage);
          }
        });
      } catch (error) {
        // 파일 읽기 실패 무시
      }
    });

    analysis.importUsage = importUsage;

    console.log('📈 가장 많이 사용되는 import:');
    Array.from(importUsage.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .forEach(([module, usage]) => {
        console.log(`  ${module}: ${usage.count}번 사용 (${usage.files.size}개 파일)`);
      });
  }

  /**
   * Import 파싱
   */
  parseImports(content) {
    const imports = [];
    
    // Named imports
    const importRegex = /import\s*\{\s*([^}]+)\s*\}\s*from\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
      const importList = match[1].split(',').map(i => i.trim().split(' as ')[0].trim());
      imports.push({
        imports: importList,
        from: match[2],
        type: 'named'
      });
    }
    
    // Default imports
    const defaultImportRegex = /import\s+(\w+)\s*from\s*['"]([^'"]+)['"]/g;
    while ((match = defaultImportRegex.exec(content)) !== null) {
      imports.push({
        imports: [match[1]],
        from: match[2],
        type: 'default'
      });
    }
    
    // Namespace imports
    const namespaceImportRegex = /import\s+\*\s+as\s+(\w+)\s+from\s*['"]([^'"]+)['"]/g;
    while ((match = namespaceImportRegex.exec(content)) !== null) {
      imports.push({
        imports: [match[1]],
        from: match[2],
        type: 'namespace'
      });
    }
    
    return imports;
  }

  /**
   * 최적화 기회 식별
   */
  identifyOptimizations() {
    console.log('🔧 최적화 기회 식별 중...');
    
    const optimizations = [];
    const analysis = this.results.analysis;

    // 1. 사용되지 않는 exports 식별
    Object.entries(analysis.layers).forEach(([layer, layerData]) => {
      Object.entries(layerData.slices).forEach(([slice, sliceData]) => {
        const unusedExports = this.findUnusedExports(sliceData, analysis.importUsage);
        
        if (unusedExports.length > 0) {
          optimizations.push({
            type: 'UNUSED_EXPORTS',
            priority: 'MEDIUM',
            layer,
            slice,
            description: `${unusedExports.length}개의 사용되지 않는 export 발견`,
            action: `다음 export들을 제거 고려: ${unusedExports.slice(0, 3).join(', ')}`,
            savings: `Bundle size: ~${unusedExports.length * 0.5}KB`
          });
        }
      });
    });

    // 2. 비효율적인 re-export 패턴
    Object.entries(analysis.layers).forEach(([layer, layerData]) => {
      layerData.indexFiles.forEach(indexFile => {
        try {
          const content = fs.readFileSync(indexFile, 'utf8');
          const reExportCount = (content.match(/export\s*\*\s*from/g) || []).length;
          
          if (reExportCount > 5) {
            optimizations.push({
              type: 'EXCESSIVE_REEXPORTS',
              priority: 'LOW',
              layer,
              file: indexFile,
              description: `${reExportCount}개의 export * 패턴 발견`,
              action: '명시적 named export로 변경하여 tree-shaking 개선',
              savings: 'Tree-shaking 효율성 향상'
            });
          }
        } catch (error) {
          // 파일 읽기 실패 무시
        }
      });
    });

    // 3. 중복 index 파일 (병렬 시스템)
    Object.entries(analysis.layers).forEach(([layer, layerData]) => {
      if (layerData.paths.length > 1) {
        optimizations.push({
          type: 'DUPLICATE_PATHS',
          priority: 'HIGH',
          layer,
          description: `${layerData.paths.length}개의 경로에서 중복된 레이어 구조`,
          action: '단일 경로로 통합하여 import 혼동 방지',
          savings: 'Import 복잡도 감소, 빌드 성능 향상'
        });
      }
    });

    this.results.optimizations = optimizations;

    console.log('🔧 최적화 기회:');
    optimizations.forEach((opt, index) => {
      console.log(`  ${index + 1}. [${opt.priority}] ${opt.type}`);
      console.log(`     ${opt.description}`);
      console.log(`     ${opt.action}`);
    });
  }

  /**
   * 사용되지 않는 exports 찾기
   */
  findUnusedExports(sliceData, importUsage) {
    const allImportedNames = new Set();
    
    // 모든 import에서 사용된 이름들 수집
    importUsage.forEach((usage, modulePath) => {
      if (modulePath.includes(sliceData.path.split('/').pop()?.replace('.ts', ''))) {
        usage.imports.forEach(name => allImportedNames.add(name));
      }
    });

    // export된 것 중 사용되지 않은 것들 찾기
    return sliceData.exports.filter(exp => {
      if (typeof exp === 'string') {
        return !allImportedNames.has(exp);
      }
      return false; // re-exports는 일단 유지
    });
  }

  /**
   * Public API 자동 생성
   */
  generateOptimizedPublicApis() {
    console.log('🔨 최적화된 Public API 생성 중...');
    
    const recommendations = [];

    Object.entries(this.results.analysis.layers).forEach(([layer, layerData]) => {
      Object.entries(layerData.slices).forEach(([slice, sliceData]) => {
        const optimizedContent = this.generateOptimizedIndexContent(sliceData);
        
        if (optimizedContent !== null) {
          recommendations.push({
            layer,
            slice,
            file: sliceData.path,
            optimizedContent,
            changes: this.compareContent(sliceData.path, optimizedContent)
          });
        }
      });
    });

    this.results.recommendations = recommendations;

    // 샘플 생성
    if (recommendations.length > 0) {
      const samplePath = path.join(this.rootDir, 'optimized-public-api-sample.ts');
      fs.writeFileSync(samplePath, recommendations[0].optimizedContent);
      console.log(`📝 최적화 샘플 생성: ${samplePath}`);
    }
  }

  /**
   * 최적화된 index 콘텐츠 생성
   */
  generateOptimizedIndexContent(sliceData) {
    if (!sliceData.exports.length) return null;

    const sections = [];

    // Tree-shaking 주석 추가
    sections.push('/**');
    sections.push(' * Public API for ' + path.basename(path.dirname(sliceData.path)));
    sections.push(' * Optimized for tree-shaking');
    sections.push(' */');
    sections.push('');

    // Type exports 우선
    const typeExports = sliceData.exportTypes.types;
    if (typeExports.length > 0) {
      sections.push('// Types');
      typeExports.forEach(type => {
        if (typeof type === 'string') {
          sections.push(`export type { ${type} } from './${type}';`);
        }
      });
      sections.push('');
    }

    // Component exports
    const componentExports = sliceData.exportTypes.components;
    if (componentExports.length > 0) {
      sections.push('// Components');
      componentExports.forEach(component => {
        if (typeof component === 'string') {
          sections.push(`export { ${component} } from './${component}';`);
        }
      });
      sections.push('');
    }

    // Hook exports
    const hookExports = sliceData.exportTypes.hooks;
    if (hookExports.length > 0) {
      sections.push('// Hooks');
      hookExports.forEach(hook => {
        if (typeof hook === 'string') {
          sections.push(`export { ${hook} } from './${hook}';`);
        }
      });
      sections.push('');
    }

    // Utility exports
    const utilExports = sliceData.exportTypes.utils;
    if (utilExports.length > 0) {
      sections.push('// Utilities');
      utilExports.forEach(util => {
        if (typeof util === 'string') {
          sections.push(`export { ${util} } from './${util}';`);
        }
      });
    }

    return sections.join('\n');
  }

  /**
   * 콘텐츠 비교
   */
  compareContent(filePath, newContent) {
    try {
      const oldContent = fs.readFileSync(filePath, 'utf8');
      const changes = {
        linesAdded: 0,
        linesRemoved: 0,
        linesChanged: 0,
        treeShakingImproved: false
      };

      // 간단한 라인 수 비교
      const oldLines = oldContent.split('\n').length;
      const newLines = newContent.split('\n').length;

      changes.linesChanged = Math.abs(oldLines - newLines);
      
      // Tree-shaking 개선 여부 확인
      const oldHasExportAll = /export\s*\*\s*from/.test(oldContent);
      const newHasExportAll = /export\s*\*\s*from/.test(newContent);
      
      changes.treeShakingImproved = oldHasExportAll && !newHasExportAll;

      return changes;
    } catch {
      return { error: 'Could not compare content' };
    }
  }

  /**
   * 유틸리티 메서드들
   */
  findIndexFiles(dir) {
    const indexFiles = [];
    
    try {
      const items = fs.readdirSync(dir, { withFileTypes: true });
      
      items.forEach(item => {
        if (item.isFile() && /index\.(ts|tsx|js|jsx)$/.test(item.name)) {
          indexFiles.push(path.join(dir, item.name));
        } else if (item.isDirectory()) {
          // 재귀적으로 하위 디렉토리 검색
          indexFiles.push(...this.findIndexFiles(path.join(dir, item.name)));
        }
      });
    } catch (error) {
      // 디렉토리 읽기 실패 무시
    }
    
    return indexFiles;
  }

  getAllSourceFiles() {
    const files = [];
    const searchDirs = ['app', 'features', 'entities', 'shared', 'widgets', 'processes', 'src'];
    
    const searchDir = (dir) => {
      try {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        
        items.forEach(item => {
          if (item.isDirectory() && !['node_modules', '.next', '.git'].includes(item.name)) {
            searchDir(path.join(dir, item.name));
          } else if (item.isFile() && /\.(ts|tsx|js|jsx)$/.test(item.name)) {
            files.push(path.join(dir, item.name));
          }
        });
      } catch (error) {
        // 디렉토리 읽기 실패 무시
      }
    };
    
    searchDirs.forEach(dir => {
      const fullPath = path.join(this.rootDir, dir);
      if (fs.existsSync(fullPath)) {
        searchDir(fullPath);
      }
    });
    
    return files;
  }

  getSliceName(indexFile, layerDir) {
    const relativePath = path.relative(layerDir, path.dirname(indexFile));
    return relativePath.split(path.sep)[0] || path.basename(layerDir);
  }

  /**
   * 보고서 생성
   */
  generateReport() {
    const reportPath = path.join(this.rootDir, 'public-api-optimization-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      analysis: this.results.analysis,
      optimizations: this.results.optimizations,
      recommendations: this.results.recommendations.map(r => ({
        ...r,
        optimizedContent: r.optimizedContent.slice(0, 200) + '...' // 내용 요약
      })),
      summary: {
        totalIndexFiles: Object.values(this.results.analysis.layers || {})
          .reduce((sum, layer) => sum + layer.indexFiles.length, 0),
        totalOptimizations: this.results.optimizations.length,
        estimatedSavings: this.results.optimizations
          .filter(o => o.savings?.includes('KB'))
          .reduce((sum, o) => sum + parseFloat(o.savings.match(/(\d+\.?\d*)/)?.[0] || 0), 0)
      }
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n📄 Public API 최적화 보고서: ${reportPath}`);
  }

  /**
   * 메인 실행 메서드
   */
  async run() {
    console.log('🚀 Public API 최적화 분석 시작\n');
    
    try {
      this.analyzePublicApis();
      this.identifyOptimizations();
      this.generateOptimizedPublicApis();
      this.generateReport();
      
      console.log('\n✅ Public API 최적화 분석 완료');
      
    } catch (error) {
      console.error('❌ 분석 중 오류 발생:', error.message);
      process.exit(1);
    }
  }
}

// 스크립트 실행
if (require.main === module) {
  const optimizer = new PublicApiOptimizer();
  optimizer.run();
}

module.exports = PublicApiOptimizer;