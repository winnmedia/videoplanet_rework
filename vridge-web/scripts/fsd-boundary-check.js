#!/usr/bin/env node

/**
 * FSD Boundary Violation Detection Script
 * Production-grade architecture boundary enforcement
 * 
 * CRITICAL: This script MUST FAIL CI/CD pipeline on violations
 */

const fs = require('fs');
const path = require('path');

// FSD Layer Hierarchy (lower index = lower layer)
const FSD_LAYERS = [
  'shared',
  'entities', 
  'features',
  'widgets',
  'processes',
  'pages',
  'app'
];

const LAYER_INDEX = Object.fromEntries(
  FSD_LAYERS.map((layer, index) => [layer, index])
);

class FSDViolationDetector {
  constructor() {
    this.violations = [];
    this.criticalViolations = [];
    this.publicApiMissing = [];
  }

  /**
   * Detect upward dependency violations
   * Lower layers cannot import from higher layers
   */
  checkLayerViolations(filePath, content) {
    const currentLayer = this.extractLayer(filePath);
    if (!currentLayer) return;

    const importLines = content.split('\n')
      .filter(line => line.trim().match(/^import.*from\s+['"]/))
      .map((line, lineNumber) => ({ line: line.trim(), lineNumber: lineNumber + 1 }));

    for (const { line, lineNumber } of importLines) {
      const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
      if (!importMatch) continue;

      const importPath = importMatch[1];
      const importedLayer = this.extractLayerFromImport(importPath);
      
      if (!importedLayer) continue;

      // Check upward dependency violation
      if (LAYER_INDEX[currentLayer] < LAYER_INDEX[importedLayer]) {
        const violation = {
          type: 'UPWARD_DEPENDENCY',
          severity: 'CRITICAL',
          file: filePath,
          line: lineNumber,
          currentLayer,
          importedLayer,
          importPath,
          message: `${currentLayer} layer cannot import from higher ${importedLayer} layer`
        };
        
        this.criticalViolations.push(violation);
      }

      // Check internal import violations (non-public API)
      if (this.isInternalImport(importPath)) {
        const violation = {
          type: 'INTERNAL_IMPORT',
          severity: 'CRITICAL', 
          file: filePath,
          line: lineNumber,
          importPath,
          message: `Direct internal import forbidden. Use public API (index.ts) only: ${importPath}`
        };
        
        this.criticalViolations.push(violation);
      }
    }
  }

  /**
   * Check if all slices have proper public API (index.ts)
   */
  checkPublicApiCompleteness() {
    const layers = ['entities', 'features', 'widgets', 'shared'];
    
    for (const layer of layers) {
      const layerPath = path.join(process.cwd(), layer);
      if (!fs.existsSync(layerPath)) continue;

      const slices = fs.readdirSync(layerPath)
        .filter(item => {
          const itemPath = path.join(layerPath, item);
          return fs.statSync(itemPath).isDirectory();
        });

      for (const slice of slices) {
        const indexPath = path.join(layerPath, slice, 'index.ts');
        if (!fs.existsSync(indexPath)) {
          this.publicApiMissing.push({
            type: 'MISSING_PUBLIC_API',
            severity: 'ERROR',
            layer,
            slice,
            path: indexPath,
            message: `Missing public API: ${layer}/${slice}/index.ts`
          });
        }
      }
    }
  }

  /**
   * Extract layer from file path
   */
  extractLayer(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    for (const layer of FSD_LAYERS) {
      if (normalizedPath.includes(`/${layer}/`)) {
        return layer;
      }
    }
    return null;
  }

  /**
   * Extract layer from import path
   */
  extractLayerFromImport(importPath) {
    // Handle absolute imports like @entities/user
    const absoluteMatch = importPath.match(/^@(shared|entities|features|widgets|processes|pages|app)/);
    if (absoluteMatch) {
      return absoluteMatch[1];
    }

    // Handle relative imports
    const segments = importPath.split('/').filter(s => s && s !== '.' && s !== '..');
    for (const segment of segments) {
      if (FSD_LAYERS.includes(segment)) {
        return segment;
      }
    }
    
    return null;
  }

  /**
   * Check if import is internal (not through public API)
   */
  isInternalImport(importPath) {
    // Internal import patterns that should go through index.ts
    const internalPatterns = [
      /^@(entities|features|widgets)\/.+\/(api|model|lib|ui)\/.+/,
      /^@shared\/.+\/(lib|api|ui)\/.+/,
      // Relative internal imports
      /^\.\.\/.+\/(api|model|lib|ui)\/.+/
    ];

    return internalPatterns.some(pattern => pattern.test(importPath));
  }

  /**
   * Find TypeScript files recursively
   */
  findTypeScriptFiles(dir = '.', files = []) {
    const ignorePatterns = [
      'node_modules', '.next', 'build', 'dist', 'coverage', 'scripts', '.git'
    ];
    
    try {
      const entries = fs.readdirSync(dir);
      
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        
        // Skip ignored directories
        if (ignorePatterns.includes(entry)) continue;
        
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
          this.findTypeScriptFiles(fullPath, files);
        } else if (stat.isFile() && /\.(ts|tsx)$/.test(entry) && !entry.endsWith('.d.ts')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
    
    return files;
  }

  /**
   * Scan all TypeScript files for violations
   */
  async scan() {
    console.log('🔍 Scanning FSD architecture boundaries...');
    
    const files = this.findTypeScriptFiles();
    console.log(`📁 Found ${files.length} TypeScript files to analyze`);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        this.checkLayerViolations(file, content);
      } catch (error) {
        console.warn(`⚠️  Failed to read file: ${file}`, error.message);
      }
    }

    // Check public API completeness
    this.checkPublicApiCompleteness();
  }

  /**
   * Generate violation report
   */
  generateReport() {
    const totalViolations = this.criticalViolations.length + this.violations.length + this.publicApiMissing.length;
    
    console.log('\n' + '='.repeat(60));
    console.log('📋 FSD ARCHITECTURE BOUNDARY ANALYSIS REPORT');
    console.log('='.repeat(60));
    
    if (totalViolations === 0) {
      console.log('✅ PASS: No FSD boundary violations detected!');
      console.log('🏗️  Architecture integrity maintained');
      return true;
    }

    console.log(`❌ FAIL: ${totalViolations} violations detected`);
    console.log(`🚨 Critical violations: ${this.criticalViolations.length}`);
    console.log(`📋 Missing public APIs: ${this.publicApiMissing.length}`);
    
    // Report critical violations
    if (this.criticalViolations.length > 0) {
      console.log('\n🚨 CRITICAL VIOLATIONS (Build Blockers):');
      console.log('-'.repeat(50));
      
      for (const violation of this.criticalViolations) {
        console.log(`❌ ${violation.type} in ${violation.file}:${violation.line || 'N/A'}`);
        console.log(`   ${violation.message}`);
        if (violation.importPath) {
          console.log(`   Import: ${violation.importPath}`);
        }
        console.log('');
      }
    }

    // Report missing public APIs
    if (this.publicApiMissing.length > 0) {
      console.log('\n📋 MISSING PUBLIC APIs:');
      console.log('-'.repeat(30));
      
      for (const missing of this.publicApiMissing) {
        console.log(`❌ ${missing.layer}/${missing.slice}/index.ts`);
        console.log(`   ${missing.message}`);
        console.log('');
      }
    }

    console.log('\n🔧 REQUIRED ACTIONS:');
    console.log('1. Fix all CRITICAL violations before merge');
    console.log('2. Create missing index.ts public API files');  
    console.log('3. Use only public APIs for imports');
    console.log('4. Respect FSD layer hierarchy');
    
    return false;
  }
}

// Main execution
async function main() {
  const detector = new FSDViolationDetector();
  
  try {
    await detector.scan();
    const success = detector.generateReport();
    
    // Exit with error code if violations found
    if (!success) {
      console.log('\n💥 FSD boundary check FAILED - blocking build');
      process.exit(1);
    }
    
    console.log('\n✅ FSD boundary check PASSED - build can continue');
    process.exit(0);
    
  } catch (error) {
    console.error('💥 FSD boundary check script failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { FSDViolationDetector };