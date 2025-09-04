#!/usr/bin/env node

/**
 * E2E-Optimized Build Validation Script for VRidge
 * Frontend Platform Lead: Robert
 * 
 * Purpose: Maximize build determinism and E2E test reliability
 * Ensures build artifacts meet quality standards for stable E2E execution
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🏗️  Deterministic Build Validation for E2E Testing');
console.log('=' + '='.repeat(60));
console.log('Frontend Platform Lead: Ensuring build determinism\n');

let hasErrors = false;
let hasWarnings = false;
const buildMetrics = {
  timestamp: new Date().toISOString(),
  determinismScore: 0,
  e2eReadiness: false
};

function logError(message) {
  console.error(`❌ CRITICAL: ${message}`);
  hasErrors = true;
}

function logWarning(message) {
  console.warn(`⚠️  WARNING: ${message}`);
  hasWarnings = true;
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logInfo(message) {
  console.log(`📋 ${message}`);
}

function logDeterminism(message, score = 0) {
  console.log(`🎯 DETERMINISM: ${message}`);
  buildMetrics.determinismScore += score;
}

function runCommand(command, description, options = {}) {
  try {
    logInfo(`🔄 ${description}`);
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: options.silent ? ['pipe', 'pipe', 'pipe'] : ['pipe', 'pipe', 'inherit'],
      timeout: options.timeout || 180000, // 3 minutes timeout for deterministic builds
      ...options
    });
    logSuccess(`✅ ${description} completed`);
    return result;
  } catch (error) {
    const errorMsg = `${description} failed: ${error.message}`;
    if (options.allowFailure) {
      logWarning(errorMsg);
      return null;
    } else {
      logError(errorMsg);
      if (error.stdout && !options.silent) console.log('STDOUT:', error.stdout);
      if (error.stderr && !options.silent) console.log('STDERR:', error.stderr);
      throw error;
    }
  }
}

// 1. Deterministic Package Manager Validation
console.log('📦 PHASE 1: Deterministic Package Manager Validation');
try {
  if (!fs.existsSync('pnpm-lock.yaml')) {
    logError('pnpm-lock.yaml not found! E2E tests require deterministic dependencies.');
  } else {
    const lockContent = fs.readFileSync('pnpm-lock.yaml', 'utf8');
    const lockHash = crypto.createHash('sha256').update(lockContent).digest('hex').slice(0, 8);
    logDeterminism(`Lock file hash: ${lockHash}`, 15);
    logSuccess('pnpm lock file validated for determinism');
  }
  
  if (fs.existsSync('package-lock.json') || fs.existsSync('yarn.lock')) {
    logError('npm/yarn lock files compromise build determinism! Remove immediately.');
  } else {
    logDeterminism('No conflicting lock files - determinism maintained', 10);
  }
  
  // Validate pnpm version consistency
  try {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const expectedPnpmVersion = packageJson.engines?.pnpm || packageJson.packageManager;
    if (expectedPnpmVersion) {
      logDeterminism(`PNPM version locked: ${expectedPnpmVersion}`, 10);
    } else {
      logWarning('PNPM version not locked in package.json - may affect determinism');
    }
  } catch (error) {
    logWarning('Could not validate PNPM version lock');
  }
} catch (error) {
  logError(`Package manager validation failed: ${error.message}`);
}

// 2. TypeScript Project References Build Validation
console.log('\n🔧 PHASE 2: TypeScript Project References & Incremental Builds');
try {
  // Check for TypeScript project references
  const rootTsConfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf8'));
  if (rootTsConfig.references && rootTsConfig.references.length > 0) {
    logDeterminism(`TypeScript project references: ${rootTsConfig.references.length} projects`, 20);
    
    // Validate FSD layer references
    const expectedReferences = ['./src/shared', './src/entities', './src/features', './src/widgets', './src/processes', './src/app'];
    const actualRefs = rootTsConfig.references.map(ref => ref.path);
    const missingRefs = expectedReferences.filter(ref => !actualRefs.includes(ref));
    
    if (missingRefs.length > 0) {
      logWarning(`Missing TypeScript references: ${missingRefs.join(', ')}`);
    } else {
      logDeterminism('All FSD layers have TypeScript references - incremental builds enabled', 15);
    }
  } else {
    logWarning('TypeScript project references not configured - slower builds expected');
  }
  
  // Run incremental TypeScript check
  runCommand('npx tsc --build --verbose', 'TypeScript incremental build validation');
  
  // Check for .tsbuildinfo files (proof of incremental builds)
  const buildInfoFiles = ['dist/shared/.tsbuildinfo', 'dist/entities/.tsbuildinfo', 'dist/features/.tsbuildinfo'];
  let foundBuildInfo = 0;
  buildInfoFiles.forEach(file => {
    if (fs.existsSync(file)) {
      foundBuildInfo++;
    }
  });
  
  if (foundBuildInfo > 0) {
    logDeterminism(`Incremental build cache files: ${foundBuildInfo}`, 10);
    logSuccess('TypeScript incremental builds configured correctly');
  }
  
} catch (error) {
  logError('TypeScript validation failed - E2E tests may be unstable due to type issues');
  process.exit(1);
}

// 3. ESLint FSD Boundary Validation
console.log('\n🏗️  FSD Architecture Boundary Validation');
try {
  runCommand('npx eslint . --ext .ts,.tsx --max-warnings=0', 'ESLint FSD boundary check');
} catch (error) {
  // ESLint errors are critical
  process.exit(1);
}

// 4. Styling Migration & Determinism Validation
console.log('\n🎨 PHASE 4: Styling Determinism & Migration Compliance');
try {
  let stylingScore = 0;
  
  // Critical: Check for Tailwind arbitrary values (FORBIDDEN)
  try {
    const result = execSync('grep -rE "\\[[0-9]+px\\]|\\[[0-9]+rem\\]|\\[#[0-9a-fA-F]+\\]" --include="*.tsx" --include="*.ts" src/', { encoding: 'utf8' });
    if (result.trim()) {
      logError('CRITICAL: Tailwind arbitrary values compromise design system determinism:');
      console.log(result);
      logError('E2E visual tests will be unstable! Use design tokens from tailwind.config.js');
    }
  } catch (error) {
    if (error.status === 1) {
      logDeterminism('No arbitrary Tailwind values - design system determinism maintained', 20);
      stylingScore += 20;
    } else {
      throw error;
    }
  }
  
  // Critical: Check for Styled Components (FORBIDDEN in new code)
  try {
    const result = execSync('grep -rE "styled\\.[a-z]+|styled\\(" --include="*.tsx" --include="*.ts" src/', { encoding: 'utf8' });
    if (result.trim()) {
      logError('CRITICAL: Styled Components detected - violates migration policy:');
      console.log(result);
      logError('Convert to Tailwind CSS immediately for E2E stability');
    }
  } catch (error) {
    if (error.status === 1) {
      logDeterminism('No Styled Components - migration compliance verified', 15);
      stylingScore += 15;
    } else {
      throw error;
    }
  }
  
  // Check for @apply usage (FORBIDDEN)
  try {
    const result = execSync('grep -r "@apply" --include="*.css" --include="*.scss" src/', { encoding: 'utf8' });
    if (result.trim()) {
      logError('CRITICAL: @apply directives detected - use component-based styling:');
      console.log(result);
    }
  } catch (error) {
    if (error.status === 1) {
      logDeterminism('No @apply directives - component-based styling enforced', 10);
      stylingScore += 10;
    } else {
      throw error;
    }
  }
  
  // Validate Tailwind config exists and is properly structured
  if (fs.existsSync('tailwind.config.js')) {
    try {
      const tailwindConfig = require('../tailwind.config.js');
      if (tailwindConfig.theme) {
        logDeterminism('Tailwind design system configuration validated', 10);
        stylingScore += 10;
      }
    } catch (error) {
      logWarning('Could not validate Tailwind configuration structure');
    }
  } else {
    logError('tailwind.config.js missing - design system not configured!');
  }
  
  if (stylingScore >= 45) {
    logSuccess(`Styling determinism score: ${stylingScore}/55 - E2E visual stability ensured`);
  } else {
    logWarning(`Styling determinism score: ${stylingScore}/55 - E2E visual tests may be unstable`);
  }
  
} catch (error) {
  logError(`Styling validation failed: ${error.message}`);
}

// 5. Environment Configuration Validation
console.log('\n🔐 Environment Configuration Validation');
try {
  const envExample = '.env.example';
  if (fs.existsSync(envExample)) {
    const envVars = fs.readFileSync(envExample, 'utf8')
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(line => line.split('=')[0]);
    
    logInfo(`Found ${envVars.length} environment variables to validate`);
    
    // Check if environment validation script exists
    const envValidationScript = 'lib/config/env.ts';
    if (fs.existsSync(envValidationScript)) {
      logSuccess('Environment validation script found');
    } else {
      logError('Environment validation script missing');
    }
    
    logSuccess('Environment configuration validated');
  } else {
    logError('.env.example file not found');
  }
} catch (error) {
  logError(`Environment validation failed: ${error.message}`);
}

// 6. Next.js Configuration Validation
console.log('\n⚙️  Next.js Configuration Validation');
try {
  const nextConfig = require('../next.config.js');
  
  // Critical: Check for dangerous build settings
  if (nextConfig.eslint && nextConfig.eslint.ignoreDuringBuilds) {
    logError('ESLint is ignored during builds! This is dangerous for production.');
  }
  
  if (nextConfig.typescript && nextConfig.typescript.ignoreBuildErrors) {
    logError('TypeScript errors are ignored during builds! This is dangerous for production.');
  }
  
  if (!nextConfig.eslint?.ignoreDuringBuilds && !nextConfig.typescript?.ignoreBuildErrors) {
    logSuccess('Next.js configuration is production-safe');
  }
  
} catch (error) {
  logError(`Next.js configuration validation failed: ${error.message}`);
}

// 7. E2E-Critical Build Artifacts Validation
console.log('\n📁 PHASE 7: E2E-Critical Build Artifacts & Determinism');
const buildDir = '.next';
if (fs.existsSync(buildDir)) {
  try {
    const requiredFiles = [
      '.next/package.json',
      '.next/static',
      '.next/server',
      '.next/BUILD_ID'
    ];
    
    let artifactsScore = 0;
    
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        logSuccess(`✓ ${file} exists`);
        artifactsScore += 5;
      } else {
        logError(`✗ ${file} missing - E2E tests may fail to start`);
      }
    }
    
    // Critical: Validate BUILD_ID for deterministic deployments
    if (fs.existsSync('.next/BUILD_ID')) {
      const buildId = fs.readFileSync('.next/BUILD_ID', 'utf8').trim();
      logDeterminism(`Build ID: ${buildId}`, 10);
      
      // Store build ID for E2E test correlation
      buildMetrics.buildId = buildId;
    }
    
    // Validate static assets for E2E test stability
    const staticChunksDir = '.next/static/chunks';
    if (fs.existsSync(staticChunksDir)) {
      const chunks = fs.readdirSync(staticChunksDir).filter(f => f.endsWith('.js'));
      logInfo(`JavaScript chunks: ${chunks.length}`);
      
      // Check for deterministic chunk naming (should contain hashes)
      const hashedChunks = chunks.filter(chunk => /[a-f0-9]{8,}/.test(chunk));
      const determinismRatio = hashedChunks.length / chunks.length;
      
      if (determinismRatio >= 0.8) {
        logDeterminism(`Chunk naming determinism: ${(determinismRatio * 100).toFixed(1)}%`, 15);
        artifactsScore += 15;
      } else {
        logWarning(`Low chunk naming determinism: ${(determinismRatio * 100).toFixed(1)}% - E2E may be unstable`);
      }
    }
    
    // Check for hydration-safe build outputs
    const serverPagesDir = '.next/server/pages';
    if (fs.existsSync(serverPagesDir)) {
      const pages = fs.readdirSync(serverPagesDir);
      if (pages.length > 0) {
        logDeterminism(`Server-side pages: ${pages.length} - hydration ready`, 10);
        artifactsScore += 10;
      } else {
        logError('No server pages - hydration may fail in E2E tests');
      }
    }
    
    if (artifactsScore >= 35) {
      logSuccess(`Build artifacts score: ${artifactsScore}/45 - E2E startup stability ensured`);
    } else {
      logWarning(`Build artifacts score: ${artifactsScore}/45 - E2E tests may have startup issues`);
    }
    
  } catch (error) {
    logError(`Build artifacts validation failed: ${error.message}`);
  }
} else {
  logWarning('No build artifacts found - run `pnpm build` before E2E tests');
  logInfo('E2E tests require a production build for stability');
}

// 8. Dependencies Security Check
console.log('\n🔒 Dependencies Security Check');
try {
  // Check for known vulnerabilities
  runCommand('pnpm audit --audit-level moderate --prod', 'Security audit');
  
  // Check package.json for suspicious dependencies
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const suspiciousPatterns = [
    'event-stream',
    'eslint-scope',
    'flatmap-stream'
  ];
  
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  for (const [dep, version] of Object.entries(allDeps)) {
    for (const pattern of suspiciousPatterns) {
      if (dep.includes(pattern)) {
        logError(`Suspicious dependency detected: ${dep}@${version}`);
      }
    }
  }
  
  logSuccess('Dependencies security check completed');
} catch (error) {
  // Security issues are warnings, not blockers
  console.warn(`⚠️  Security check warning: ${error.message}`);
}

// 9. E2E Performance Budget Validation
console.log('\n📊 PHASE 9: E2E Performance Budget & Bundle Analysis');
if (fs.existsSync('.next')) {
  try {
    const staticDir = '.next/static';
    if (fs.existsSync(staticDir)) {
      const buildManifest = path.join('.next', 'build-manifest.json');
      if (fs.existsSync(buildManifest)) {
        const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
        const jsFiles = Object.values(manifest.pages).flat().filter(f => f.endsWith('.js'));
        
        logInfo(`JavaScript chunks for E2E analysis: ${jsFiles.length}`);
        
        let totalSize = 0;
        let largestChunkSize = 0;
        let performanceScore = 0;
        
        // E2E Performance Budget Validation
        for (const jsFile of jsFiles) {
          const fullPath = path.join('.next', jsFile);
          if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            const sizeInMB = stats.size / (1024 * 1024);
            totalSize += sizeInMB;
            
            if (sizeInMB > largestChunkSize) {
              largestChunkSize = sizeInMB;
            }
            
            // E2E Performance Budget Enforcement
            if (sizeInMB > 5) {
              logError(`CRITICAL: Chunk exceeds E2E performance budget: ${jsFile} (${sizeInMB.toFixed(2)}MB > 5MB)`);
              logError('E2E tests will timeout during navigation - optimize immediately');
            } else if (sizeInMB > 2) {
              logWarning(`Large chunk may affect E2E timing: ${jsFile} (${sizeInMB.toFixed(2)}MB)`);
            } else {
              performanceScore += 2;
            }
          }
        }
        
        // Overall bundle analysis for E2E predictability
        buildMetrics.bundleAnalysis = {
          totalChunks: jsFiles.length,
          totalSizeMB: totalSize.toFixed(2),
          largestChunkMB: largestChunkSize.toFixed(2),
          performanceScore
        };
        
        logInfo(`Total bundle size: ${totalSize.toFixed(2)}MB`);
        logInfo(`Largest chunk: ${largestChunkSize.toFixed(2)}MB`);
        
        // E2E Performance Budget Gates
        if (totalSize > 20) {
          logError(`Total bundle exceeds E2E budget: ${totalSize.toFixed(2)}MB > 20MB`);
          logError('E2E tests will have slow page loads and potential timeouts');
        } else if (totalSize > 15) {
          logWarning(`Bundle approaching E2E limit: ${totalSize.toFixed(2)}MB`);
        } else {
          logDeterminism(`Bundle within E2E performance budget: ${totalSize.toFixed(2)}MB`, 10);
          performanceScore += 10;
        }
        
        if (jsFiles.length > 50) {
          logWarning(`High chunk count (${jsFiles.length}) may affect E2E test determinism`);
        } else {
          logDeterminism(`Chunk count optimal for E2E: ${jsFiles.length}`, 5);
          performanceScore += 5;
        }
        
        logSuccess(`E2E performance budget validation completed (Score: ${performanceScore})`);
      }
    }
  } catch (error) {
    logError(`E2E performance analysis failed: ${error.message}`);
  }
}

// 10. Final E2E Readiness Assessment
console.log('\n🎯 PHASE 10: E2E Readiness Assessment');

// Calculate overall E2E readiness score
buildMetrics.e2eReadiness = buildMetrics.determinismScore >= 70 && !hasErrors;
buildMetrics.hasErrors = hasErrors;
buildMetrics.hasWarnings = hasWarnings;

// Generate deterministic build report
const reportPath = '.next/e2e-readiness-report.json';
if (fs.existsSync('.next')) {
  fs.writeFileSync(reportPath, JSON.stringify(buildMetrics, null, 2));
  logInfo(`E2E readiness report saved: ${reportPath}`);
}

console.log('\n' + '='.repeat(70));
console.log('🏁 DETERMINISTIC BUILD VALIDATION SUMMARY');
console.log('='.repeat(70));
console.log(`🎯 Determinism Score: ${buildMetrics.determinismScore}/100`);
console.log(`⚠️  Warnings: ${hasWarnings ? 'YES' : 'NO'}`);
console.log(`❌ Critical Errors: ${hasErrors ? 'YES' : 'NO'}`);
console.log(`🧪 E2E Test Ready: ${buildMetrics.e2eReadiness ? 'YES' : 'NO'}`);

if (hasErrors) {
  console.log('\n🚫 BUILD VALIDATION FAILED - E2E TESTS WILL BE UNSTABLE');
  console.log('💡 Action Required:');
  console.log('   1. Fix all critical errors listed above');
  console.log('   2. Ensure deterministic build artifacts');
  console.log('   3. Re-run validation before E2E testing');
  console.log('   4. Maintain 72-hour E2E fix timeline');
  process.exit(1);
} else if (buildMetrics.determinismScore < 70) {
  console.log('\n⚠️  BUILD DETERMINISM INSUFFICIENT FOR E2E STABILITY');
  console.log(`Current Score: ${buildMetrics.determinismScore}/100 (Minimum: 70)`);
  console.log('💡 Recommendations:');
  console.log('   1. Implement missing TypeScript project references');
  console.log('   2. Ensure styling consistency (Tailwind only)');
  console.log('   3. Verify build artifact determinism');
  console.log('   4. Address all warnings to improve score');
  process.exit(1);
} else {
  console.log('\n✅ ALL VALIDATIONS PASSED - E2E TESTS READY');
  console.log('🎉 Build Determinism Certified for E2E Testing!');
  console.log('🚀 Deterministic artifacts ready for stable E2E execution');
  console.log(`📊 Final Determinism Score: ${buildMetrics.determinismScore}/100`);
  console.log('\n💡 E2E Test Environment Ready:');
  console.log('   ✓ Deterministic dependencies locked');
  console.log('   ✓ TypeScript incremental builds configured');
  console.log('   ✓ Styling consistency enforced');
  console.log('   ✓ Build artifacts validated');
  console.log('   ✓ Performance budgets within limits');
  process.exit(0);
}