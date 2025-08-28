#!/usr/bin/env node

/**
 * VRidge Build Validation Script
 * 
 * 이 스크립트는 빌드 프로세스의 무결성을 검증하고
 * 배포 전 중요한 품질 게이트를 실행합니다.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔍 VRidge Build Validation Starting...\n');

let hasErrors = false;

function logError(message) {
  console.error(`❌ ${message}`);
  hasErrors = true;
}

function logSuccess(message) {
  console.log(`✅ ${message}`);
}

function logInfo(message) {
  console.log(`ℹ️  ${message}`);
}

function runCommand(command, description) {
  try {
    logInfo(`Running: ${description}`);
    const result = execSync(command, { 
      encoding: 'utf8', 
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000 // 2 minutes timeout
    });
    logSuccess(`${description} completed`);
    return result;
  } catch (error) {
    logError(`${description} failed: ${error.message}`);
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.log('STDERR:', error.stderr);
    throw error;
  }
}

// 1. Package Manager Validation
console.log('📦 Package Manager Validation');
try {
  if (!fs.existsSync('pnpm-lock.yaml')) {
    logError('pnpm-lock.yaml not found! This project requires pnpm.');
  } else {
    logSuccess('pnpm lock file found');
  }
  
  if (fs.existsSync('package-lock.json') || fs.existsSync('yarn.lock')) {
    logError('npm or yarn lock files detected! Remove them and use pnpm only.');
  } else {
    logSuccess('No conflicting lock files found');
  }
} catch (error) {
  logError(`Package manager validation failed: ${error.message}`);
}

// 2. TypeScript Compilation Check
console.log('\n🔧 TypeScript Compilation Check');
try {
  runCommand('npx tsc --noEmit --skipLibCheck', 'TypeScript compilation check');
} catch (error) {
  // TypeScript errors are critical
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

// 4. Styling Conflict Detection
console.log('\n🎨 Styling Conflict Detection');
try {
  // Check for Tailwind arbitrary values
  try {
    const result = execSync('grep -r "\\[.*\\]" --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next . | grep -E "w-\\[|h-\\[|p-\\[|m-\\[|text-\\[|bg-\\["', { encoding: 'utf8' });
    if (result.trim()) {
      logError('Tailwind arbitrary values detected:');
      console.log(result);
    }
  } catch (error) {
    if (error.status === 1) {
      logSuccess('No Tailwind arbitrary values found');
    } else {
      throw error;
    }
  }
  
  // Check for Styled Components usage
  try {
    const result = execSync('grep -r "styled\\." --include="*.tsx" --include="*.ts" --exclude-dir=node_modules --exclude-dir=.next .', { encoding: 'utf8' });
    if (result.trim()) {
      logError('Styled Components usage detected:');
      console.log(result);
    }
  } catch (error) {
    if (error.status === 1) {
      logSuccess('No Styled Components usage found');
    } else {
      throw error;
    }
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

// 7. Build Artifacts Validation (if .next exists)
console.log('\n📁 Build Artifacts Validation');
const buildDir = '.next';
if (fs.existsSync(buildDir)) {
  try {
    const requiredFiles = [
      '.next/package.json',
      '.next/static',
      '.next/server'
    ];
    
    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        logSuccess(`${file} exists`);
      } else {
        logError(`${file} missing from build output`);
      }
    }
    
    // Check for common build issues
    const serverDir = '.next/server/pages';
    if (fs.existsSync(serverDir)) {
      const pages = fs.readdirSync(serverDir);
      if (pages.length > 0) {
        logSuccess(`${pages.length} pages built successfully`);
      } else {
        logError('No pages found in build output');
      }
    }
    
  } catch (error) {
    logError(`Build artifacts validation failed: ${error.message}`);
  }
} else {
  logInfo('No build artifacts found (run pnpm build first)');
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

// 9. Bundle Size Analysis (if build exists)
console.log('\n📊 Bundle Size Analysis');
if (fs.existsSync('.next')) {
  try {
    const staticDir = '.next/static';
    if (fs.existsSync(staticDir)) {
      const buildManifest = path.join('.next', 'build-manifest.json');
      if (fs.existsSync(buildManifest)) {
        const manifest = JSON.parse(fs.readFileSync(buildManifest, 'utf8'));
        const jsFiles = Object.values(manifest.pages).flat().filter(f => f.endsWith('.js'));
        
        logInfo(`Found ${jsFiles.length} JavaScript chunks`);
        
        // Check for extremely large chunks (> 2MB)
        for (const jsFile of jsFiles) {
          const fullPath = path.join('.next', jsFile);
          if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            const sizeInMB = stats.size / (1024 * 1024);
            
            if (sizeInMB > 2) {
              logError(`Large bundle detected: ${jsFile} (${sizeInMB.toFixed(2)}MB)`);
            }
          }
        }
        
        logSuccess('Bundle size analysis completed');
      }
    }
  } catch (error) {
    logError(`Bundle size analysis failed: ${error.message}`);
  }
}

// 10. Final Validation Summary
console.log('\n📋 Build Validation Summary');
console.log('='.repeat(50));

if (hasErrors) {
  console.error('❌ BUILD VALIDATION FAILED');
  console.error('Please fix the above errors before deployment.');
  process.exit(1);
} else {
  console.log('✅ ALL VALIDATIONS PASSED');
  console.log('🚀 Build is ready for deployment!');
  process.exit(0);
}