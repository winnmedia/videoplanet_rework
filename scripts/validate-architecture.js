#!/usr/bin/env node

/**
 * 🏗️ FSD 아키텍처 검증 스크립트
 * Feature-Sliced Design 원칙 준수 여부를 자동으로 검증합니다.
 */

const fs = require('fs');
const path = require('path');

const glob = require('glob');

// ========================================
// 설정
// ========================================
const LAYERS = ['app', 'processes', 'pages', 'widgets', 'features', 'entities', 'shared'];
const LAYER_HIERARCHY = {
  app: 0,
  processes: 1,
  pages: 2, 
  widgets: 3,
  features: 4,
  entities: 5,
  shared: 6
};

const ALLOWED_SEGMENTS = ['ui', 'model', 'lib', 'api', 'config'];
const PROJECT_ROOT = process.cwd();

// ========================================
// 유틸리티 함수
// ========================================
function log(level, message, details = null) {
  const colors = {
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    info: '\x1b[36m',
    reset: '\x1b[0m'
  };
  
  const emoji = {
    success: '✅',
    warning: '⚠️',
    error: '❌',
    info: 'ℹ️'
  };
  
  console.log(`${colors[level]}${emoji[level]} ${message}${colors.reset}`);
  
  if (details) {
    console.log(`   ${details}`);
  }
}

function getFileLayer(filePath) {
  const relativePath = path.relative(PROJECT_ROOT, filePath);
  const parts = relativePath.split(path.sep);
  
  for (const layer of LAYERS) {
    if (parts[0] === layer) {
      return layer;
    }
  }
  
  return null;
}

function parseImportPath(importPath, currentFile) {
  // 상대 경로를 절대 경로로 변환
  if (importPath.startsWith('.')) {
    const currentDir = path.dirname(currentFile);
    return path.resolve(currentDir, importPath);
  }
  
  // 절대 경로 (@ 별칭 포함)
  if (importPath.startsWith('@/')) {
    return path.join(PROJECT_ROOT, importPath.slice(2));
  }
  
  return null; // 외부 모듈
}

function extractImports(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports = [];
    
    // ES6 import 문 매칭
    const importRegex = /import.*from\s+['"`]([^'"`]+)['"`]/g;
    let match;
    
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const resolvedPath = parseImportPath(importPath, filePath);
      
      if (resolvedPath) {
        imports.push({
          importPath,
          resolvedPath,
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }
    
    // require 문도 체크
    const requireRegex = /require\(['"`]([^'"`]+)['"`]\)/g;
    while ((match = requireRegex.exec(content)) !== null) {
      const importPath = match[1];
      const resolvedPath = parseImportPath(importPath, filePath);
      
      if (resolvedPath) {
        imports.push({
          importPath,
          resolvedPath,
          line: content.substring(0, match.index).split('\n').length
        });
      }
    }
    
    return imports;
  } catch (error) {
    log('warning', `파일 읽기 실패: ${filePath}`, error.message);
    return [];
  }
}

// ========================================
// 검증 규칙
// ========================================
function validateLayerHierarchy() {
  log('info', '레이어 계층 구조 검증 중...');
  
  const violations = [];
  const files = glob.sync('**/*.{js,ts,jsx,tsx}', {
    cwd: PROJECT_ROOT,
    ignore: ['node_modules/**', '**/*.test.*', '**/*.spec.*', 'dist/**', '.next/**']
  });
  
  files.forEach(file => {
    const filePath = path.join(PROJECT_ROOT, file);
    const fileLayer = getFileLayer(filePath);
    
    if (!fileLayer) return;
    
    const imports = extractImports(filePath);
    
    imports.forEach(imp => {
      const targetLayer = getFileLayer(imp.resolvedPath);
      
      if (!targetLayer) return;
      
      const sourceLevel = LAYER_HIERARCHY[fileLayer];
      const targetLevel = LAYER_HIERARCHY[targetLayer];
      
      // 상위 레이어가 하위 레이어를 import하는 것은 위반
      if (sourceLevel > targetLevel) {
        violations.push({
          file: file,
          line: imp.line,
          from: fileLayer,
          to: targetLayer,
          importPath: imp.importPath,
          message: `${fileLayer} 레이어가 상위 레이어 ${targetLayer}를 import합니다`
        });
      }
    });
  });
  
  if (violations.length === 0) {
    log('success', '레이어 계층 구조 검증 통과');
  } else {
    log('error', `레이어 계층 구조 위반 ${violations.length}건 발견`);
    violations.forEach(violation => {
      log('error', violation.message, `${violation.file}:${violation.line} - ${violation.importPath}`);
    });
  }
  
  return violations;
}

function validateCrossFeatureImports() {
  log('info', '크로스 피처 import 검증 중...');
  
  const violations = [];
  const featureFiles = glob.sync('features/**/*.{js,ts,jsx,tsx}', {
    cwd: PROJECT_ROOT,
    ignore: ['**/index.*', '**/*.test.*', '**/*.spec.*']
  });
  
  featureFiles.forEach(file => {
    const filePath = path.join(PROJECT_ROOT, file);
    const fileFeature = file.split('/')[1]; // features/auth/... -> auth
    
    const imports = extractImports(filePath);
    
    imports.forEach(imp => {
      const relativePath = path.relative(PROJECT_ROOT, imp.resolvedPath);
      
      if (relativePath.startsWith('features/')) {
        const targetFeature = relativePath.split('/')[1];
        
        // 다른 피처를 직접 import하는 것은 위반
        if (fileFeature !== targetFeature) {
          violations.push({
            file: file,
            line: imp.line,
            from: fileFeature,
            to: targetFeature,
            importPath: imp.importPath,
            message: `피처 '${fileFeature}'가 다른 피처 '${targetFeature}'를 직접 import합니다`
          });
        }
      }
    });
  });
  
  if (violations.length === 0) {
    log('success', '크로스 피처 import 검증 통과');
  } else {
    log('error', `크로스 피처 import 위반 ${violations.length}건 발견`);
    violations.forEach(violation => {
      log('error', violation.message, `${violation.file}:${violation.line} - ${violation.importPath}`);
    });
  }
  
  return violations;
}

function validateSliceStructure() {
  log('info', '슬라이스 구조 검증 중...');
  
  const violations = [];
  
  // 각 레이어별 구조 검증
  LAYERS.slice(1).forEach(layer => { // app 레이어 제외
    const layerPath = path.join(PROJECT_ROOT, layer);
    
    if (!fs.existsSync(layerPath)) {
      return; // 레이어가 없으면 스킵
    }
    
    const slices = fs.readdirSync(layerPath).filter(item => {
      const itemPath = path.join(layerPath, item);
      return fs.statSync(itemPath).isDirectory();
    });
    
    slices.forEach(slice => {
      const slicePath = path.join(layerPath, slice);
      const segments = fs.readdirSync(slicePath).filter(item => {
        const itemPath = path.join(slicePath, item);
        return fs.statSync(itemPath).isDirectory();
      });
      
      // index.ts 파일 존재 여부 확인
      const indexFiles = ['index.ts', 'index.js', 'index.tsx', 'index.jsx'];
      const hasIndex = indexFiles.some(file => 
        fs.existsSync(path.join(slicePath, file))
      );
      
      if (!hasIndex && segments.length > 0) {
        violations.push({
          slice: `${layer}/${slice}`,
          message: `슬라이스 '${layer}/${slice}'에 Public API (index.ts) 파일이 없습니다`
        });
      }
      
      // 허용되지 않는 세그먼트 확인
      segments.forEach(segment => {
        if (!ALLOWED_SEGMENTS.includes(segment)) {
          violations.push({
            slice: `${layer}/${slice}`,
            segment: segment,
            message: `슬라이스 '${layer}/${slice}'에 허용되지 않는 세그먼트 '${segment}'가 있습니다`
          });
        }
      });
    });
  });
  
  if (violations.length === 0) {
    log('success', '슬라이스 구조 검증 통과');
  } else {
    log('error', `슬라이스 구조 위반 ${violations.length}건 발견`);
    violations.forEach(violation => {
      log('error', violation.message, violation.slice);
    });
  }
  
  return violations;
}

function validatePublicApiUsage() {
  log('info', 'Public API 사용 검증 중...');
  
  const violations = [];
  const files = glob.sync('**/*.{js,ts,jsx,tsx}', {
    cwd: PROJECT_ROOT,
    ignore: ['node_modules/**', '**/*.test.*', '**/*.spec.*', 'dist/**', '.next/**']
  });
  
  files.forEach(file => {
    const filePath = path.join(PROJECT_ROOT, file);
    const imports = extractImports(filePath);
    
    imports.forEach(imp => {
      const relativePath = path.relative(PROJECT_ROOT, imp.resolvedPath);
      
      // 슬라이스 내부로의 직접 import 확인
      LAYERS.slice(1).forEach(layer => {
        if (relativePath.startsWith(`${layer}/`)) {
          const pathParts = relativePath.split('/');
          
          if (pathParts.length >= 4) { // layer/slice/segment/file
            const slice = pathParts[1];
            const segment = pathParts[2];
            const fileName = pathParts[pathParts.length - 1];
            
            // index 파일이 아닌 직접 import는 위반
            if (!fileName.startsWith('index.')) {
              violations.push({
                file: file,
                line: imp.line,
                target: `${layer}/${slice}`,
                importPath: imp.importPath,
                message: `슬라이스 '${layer}/${slice}' 내부로의 직접 import가 감지됨 (Public API 사용 권장)`
              });
            }
          }
        }
      });
    });
  });
  
  if (violations.length === 0) {
    log('success', 'Public API 사용 검증 통과');
  } else {
    log('warning', `Public API 미사용 ${violations.length}건 발견 (권장사항)`);
    violations.slice(0, 10).forEach(violation => { // 최대 10개만 출력
      log('warning', violation.message, `${violation.file}:${violation.line} - ${violation.importPath}`);
    });
    
    if (violations.length > 10) {
      log('info', `... 외 ${violations.length - 10}건 더`);
    }
  }
  
  return violations;
}

function generateArchitectureReport(violations) {
  log('info', '아키텍처 검증 보고서 생성 중...');
  
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalViolations: violations.reduce((sum, v) => sum + v.violations.length, 0),
      layerHierarchy: violations.find(v => v.type === 'layer-hierarchy')?.violations.length || 0,
      crossFeature: violations.find(v => v.type === 'cross-feature')?.violations.length || 0,
      sliceStructure: violations.find(v => v.type === 'slice-structure')?.violations.length || 0,
      publicApi: violations.find(v => v.type === 'public-api')?.violations.length || 0
    },
    details: violations
  };
  
  // 보고서 파일 저장
  const reportPath = path.join(PROJECT_ROOT, 'architecture-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log('success', `보고서 저장 완료: ${reportPath}`);
  
  return report;
}

// ========================================
// 메인 실행
// ========================================
function main() {
  console.log('🏗️ FSD 아키텍처 검증 시작\n');
  
  const allViolations = [];
  
  // 각 검증 규칙 실행
  const layerViolations = validateLayerHierarchy();
  allViolations.push({ type: 'layer-hierarchy', violations: layerViolations });
  
  const crossFeatureViolations = validateCrossFeatureImports();
  allViolations.push({ type: 'cross-feature', violations: crossFeatureViolations });
  
  const sliceViolations = validateSliceStructure();
  allViolations.push({ type: 'slice-structure', violations: sliceViolations });
  
  const publicApiViolations = validatePublicApiUsage();
  allViolations.push({ type: 'public-api', violations: publicApiViolations });
  
  // 보고서 생성
  const report = generateArchitectureReport(allViolations);
  
  // 최종 결과
  console.log('\n📊 검증 결과 요약');
  console.log('='.repeat(50));
  
  const totalViolations = report.summary.totalViolations;
  const criticalViolations = report.summary.layerHierarchy + report.summary.crossFeature;
  
  if (totalViolations === 0) {
    log('success', '모든 아키텍처 검증 통과! 🎉');
    process.exit(0);
  } else {
    if (criticalViolations > 0) {
      log('error', `심각한 아키텍처 위반 ${criticalViolations}건 발견`);
      log('error', 'CI/CD 파이프라인에서 빌드를 중단합니다');
      process.exit(1);
    } else {
      log('warning', `권장사항 위반 ${totalViolations}건 발견`);
      log('warning', '빌드는 계속되지만 개선을 권장합니다');
      process.exit(0);
    }
  }
}

// 스크립트 직접 실행 시에만 main 함수 호출
if (require.main === module) {
  main();
}

module.exports = {
  validateLayerHierarchy,
  validateCrossFeatureImports,
  validateSliceStructure,
  validatePublicApiUsage,
  generateArchitectureReport
};