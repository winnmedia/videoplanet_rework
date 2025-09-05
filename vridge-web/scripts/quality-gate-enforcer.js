#!/usr/bin/env node
/**
 * Quality Gate Enforcer - Anti-Bypass System
 * Frontend Platform Lead: Robert
 * 
 * Mission: Make it impossible to bypass quality gates
 * Ensures deterministic builds and prevents shortcuts that compromise E2E stability
 */

const { execSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class QualityGateEnforcer {
  constructor() {
    this.violations = [];
    this.bypasses = [];
    this.enforcements = [];
    this.startTime = Date.now();
  }

  log(level, message) {
    const timestamp = new Date().toISOString();
    const prefix = {
      'ERROR': '🚫',
      'WARN': '⚠️',
      'INFO': '📋',
      'SUCCESS': '✅',
      'ENFORCE': '🛡️'
    }[level];
    
    console.log(`[${timestamp}] ${prefix} ${message}`);
    
    if (level === 'ERROR') this.violations.push(message);
    if (level === 'ENFORCE') this.enforcements.push(message);
  }

  /**
   * Check for quality gate bypass attempts in configuration
   */
  detectConfigurationBypasses() {
    this.log('INFO', 'Scanning for quality gate bypass attempts...');

    const configFiles = [
      { file: 'next.config.js', patterns: ['ignoreBuildErrors', 'ignoreDuringBuilds'] },
      { file: 'eslint.config.mjs', patterns: ['disable-next-line', 'eslint-disable'] },
      { file: 'tsconfig.json', patterns: ['skipLibCheck: true', 'noEmit: false'] },
      { file: 'vitest.config.ts', patterns: ['passWithNoTests', 'silent: true'] },
      { file: '.eslintrc.js', patterns: ['rules: {}', 'extends: []'] }
    ];

    configFiles.forEach(({ file, patterns }) => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        patterns.forEach(pattern => {
          if (content.includes(pattern)) {
            this.log('ERROR', `Quality bypass detected in ${file}: ${pattern}`);
            this.bypasses.push({ file, pattern, type: 'configuration' });
          }
        });
      }
    });

    // Special check for emergency bypass in Next.js config
    if (fs.existsSync('next.config.js')) {
      const content = fs.readFileSync('next.config.js', 'utf8');
      if (content.includes('EMERGENCY_BUILD') && !process.env.EMERGENCY_BUILD) {
        this.log('ENFORCE', 'Emergency bypass mechanism found but not activated - security maintained');
      } else if (content.includes('EMERGENCY_BUILD') && process.env.EMERGENCY_BUILD === 'true') {
        this.log('WARN', 'EMERGENCY BUILD MODE ACTIVE - Quality gates bypassed for hotfix deployment');
        this.bypasses.push({ file: 'next.config.js', pattern: 'EMERGENCY_BUILD', type: 'emergency' });
      }
    }
  }

  /**
   * Enforce branch protection and required checks
   */
  enforceGitWorkflow() {
    this.log('INFO', 'Enforcing Git workflow and branch protection...');

    try {
      // Check current branch
      const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
      
      if (currentBranch === 'main' || currentBranch === 'master') {
        this.log('ERROR', `Direct commits to ${currentBranch} branch detected - use pull requests only`);
        this.violations.push(`Direct ${currentBranch} commit violation`);
      }

      // Check for pre-commit hooks
      const preCommitHook = '.husky/pre-commit';
      if (!fs.existsSync(preCommitHook)) {
        this.log('ERROR', 'Pre-commit hooks missing - quality gates can be bypassed');
        this.violations.push('Missing pre-commit hooks');
      } else {
        const hookContent = fs.readFileSync(preCommitHook, 'utf8');
        const requiredChecks = ['lint-staged', 'type-check', 'test'];
        const missingChecks = requiredChecks.filter(check => !hookContent.includes(check));
        
        if (missingChecks.length > 0) {
          this.log('ERROR', `Pre-commit hook missing checks: ${missingChecks.join(', ')}`);
          this.violations.push(`Incomplete pre-commit hooks: ${missingChecks.join(', ')}`);
        } else {
          this.log('ENFORCE', 'Pre-commit hooks properly configured - local bypasses prevented');
        }
      }

      // Check for commit message compliance
      try {
        const lastCommitMsg = execSync('git log -1 --pretty=%B', { encoding: 'utf8' }).trim();
        const conventionalCommitPattern = /^(feat|fix|docs|style|refactor|perf|test|chore|ci|build)(\(.+\))?: .+/;
        
        if (!conventionalCommitPattern.test(lastCommitMsg)) {
          this.log('WARN', 'Last commit does not follow Conventional Commits format');
        } else {
          this.log('ENFORCE', 'Commit message format compliance verified');
        }
      } catch (error) {
        this.log('WARN', 'Could not verify commit message format');
      }

    } catch (error) {
      this.log('WARN', `Git workflow enforcement partially failed: ${error.message}`);
    }
  }

  /**
   * Validate build system integrity
   */
  validateBuildIntegrity() {
    this.log('INFO', 'Validating build system integrity...');

    // Check package manager consistency
    if (fs.existsSync('package-lock.json') || fs.existsSync('yarn.lock')) {
      this.log('ERROR', 'Non-PNPM lock files detected - compromises build determinism');
      this.violations.push('Package manager inconsistency');
    }

    // Validate package.json engines
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    if (!packageJson.engines || !packageJson.engines.node) {
      this.log('ERROR', 'Node.js version not locked in package.json - affects determinism');
      this.violations.push('Node version not locked');
    }

    if (!packageJson.engines || !packageJson.engines.pnpm) {
      this.log('ERROR', 'PNPM version not locked in package.json - affects determinism');
      this.violations.push('PNPM version not locked');
    }

    // Check for dangerous scripts
    const dangerousScripts = ['--skip-checks', '--no-verify', '--force', '--ignore-errors'];
    Object.entries(packageJson.scripts || {}).forEach(([scriptName, command]) => {
      dangerousScripts.forEach(dangerous => {
        if (command.includes(dangerous)) {
          this.log('ERROR', `Dangerous script flag in ${scriptName}: ${dangerous}`);
          this.violations.push(`Dangerous script: ${scriptName}`);
        }
      });
    });

    // Validate CI configuration
    const ciFile = '.github/workflows/ci.yml';
    if (fs.existsSync(ciFile)) {
      const ciContent = fs.readFileSync(ciFile, 'utf8');
      
      // Check for quality gate bypasses in CI
      const bypassPatterns = ['continue-on-error: true', 'allow-failure', '--no-verify'];
      bypassPatterns.forEach(pattern => {
        if (ciContent.includes(pattern)) {
          this.log('WARN', `Potential CI bypass detected: ${pattern}`);
        }
      });

      // Verify required quality gates are present
      const requiredGates = ['typecheck', 'lint', 'test', 'build'];
      const missingGates = requiredGates.filter(gate => !ciContent.includes(gate));
      
      if (missingGates.length > 0) {
        this.log('ERROR', `Missing quality gates in CI: ${missingGates.join(', ')}`);
        this.violations.push('Incomplete CI quality gates');
      } else {
        this.log('ENFORCE', 'All required quality gates present in CI pipeline');
      }
    }
  }

  /**
   * Enforce TypeScript strictness
   */
  enforceTypeScriptStrict() {
    this.log('INFO', 'Enforcing TypeScript strict mode configuration...');

    const tsConfigFiles = ['tsconfig.json', 'src/shared/tsconfig.json', 'src/entities/tsconfig.json'];
    
    tsConfigFiles.forEach(tsConfigFile => {
      if (fs.existsSync(tsConfigFile)) {
        try {
          const tsConfig = JSON.parse(fs.readFileSync(tsConfigFile, 'utf8'));
          const compilerOptions = tsConfig.compilerOptions || {};

          // Check critical strict mode settings
          const strictSettings = {
            'strict': true,
            'noEmit': true,
            'skipLibCheck': false // Should be explicit
          };

          Object.entries(strictSettings).forEach(([setting, expectedValue]) => {
            if (compilerOptions[setting] !== expectedValue && setting !== 'skipLibCheck') {
              this.log('ERROR', `TypeScript ${setting} must be ${expectedValue} in ${tsConfigFile}`);
              this.violations.push(`TypeScript strictness violation: ${setting}`);
            }
          });

          // Warn about skipLibCheck (acceptable but should be conscious choice)
          if (compilerOptions.skipLibCheck === true) {
            this.log('WARN', `skipLibCheck enabled in ${tsConfigFile} - reduces type safety`);
          }

          // Check for project references in root config
          if (tsConfigFile === 'tsconfig.json' && !tsConfig.references) {
            this.log('WARN', 'TypeScript project references not configured - slower builds');
          } else if (tsConfig.references) {
            this.log('ENFORCE', `TypeScript project references configured: ${tsConfig.references.length} projects`);
          }

        } catch (error) {
          this.log('ERROR', `Invalid TypeScript configuration in ${tsConfigFile}: ${error.message}`);
        }
      }
    });
  }

  /**
   * Check for test coverage bypasses
   */
  enforceTestCoverage() {
    this.log('INFO', 'Enforcing test coverage standards...');

    // Check vitest configuration
    if (fs.existsSync('vitest.config.ts')) {
      const vitestContent = fs.readFileSync('vitest.config.ts', 'utf8');
      
      // Look for coverage bypasses
      const coverageBypasses = ['coverage: false', 'skipFull: true', 'thresholds: {}'];
      coverageBypasses.forEach(bypass => {
        if (vitestContent.includes(bypass)) {
          this.log('ERROR', `Test coverage bypass detected: ${bypass}`);
          this.violations.push('Test coverage bypass');
        }
      });

      // Verify minimum thresholds
      if (vitestContent.includes('thresholds:') && vitestContent.includes('lines: 75')) {
        this.log('ENFORCE', 'Minimum test coverage thresholds properly configured');
      } else {
        this.log('WARN', 'Test coverage thresholds may not be properly configured');
      }
    }

    // Check for test file bypasses
    try {
      const testBypassResult = execSync('grep -r "skip\\|todo\\|only" --include="*.test.*" --include="*.spec.*" src/', { encoding: 'utf8' });
      if (testBypassResult.trim()) {
        this.log('WARN', 'Test bypasses detected (skip/todo/only):');
        console.log(testBypassResult);
      }
    } catch (error) {
      // No bypasses found (grep returns 1 when no matches)
      if (error.status === 1) {
        this.log('ENFORCE', 'No test bypasses detected');
      }
    }
  }

  /**
   * Validate security configurations
   */
  enforceSecurityStandards() {
    this.log('INFO', 'Enforcing security standards...');

    // Check for hardcoded secrets
    try {
      const secretPatterns = [
        'API_KEY.*=.*[\'"][^\'"][\'"]',
        'SECRET.*=.*[\'"][^\'"][\'"]',
        'PASSWORD.*=.*[\'"][^\'"][\'"]',
        'TOKEN.*=.*[\'"][^\'"][\'"]'
      ];

      secretPatterns.forEach(pattern => {
        try {
          const result = execSync(`grep -rE "${pattern}" --include="*.ts" --include="*.tsx" --exclude-dir=node_modules src/`, { encoding: 'utf8' });
          if (result.trim()) {
            this.log('ERROR', `Potential hardcoded secret detected: ${pattern}`);
            this.violations.push('Hardcoded secrets');
          }
        } catch (error) {
          // No matches found
        }
      });
    } catch (error) {
      this.log('WARN', 'Security scanning partially failed');
    }

    // Verify environment variable validation exists
    const envValidationPaths = [
      'src/lib/config/env.ts',
      'lib/config/env.ts',
      'src/shared/config/env.ts'
    ];

    const hasEnvValidation = envValidationPaths.some(path => fs.existsSync(path));
    if (hasEnvValidation) {
      this.log('ENFORCE', 'Environment variable validation system detected');
    } else {
      this.log('WARN', 'Environment variable validation system not found');
    }
  }

  /**
   * Generate enforcement report
   */
  generateReport() {
    const duration = Date.now() - this.startTime;
    
    const report = {
      timestamp: new Date().toISOString(),
      duration: `${duration}ms`,
      summary: {
        totalViolations: this.violations.length,
        bypassAttempts: this.bypasses.length,
        enforcements: this.enforcements.length,
        status: this.violations.length === 0 ? 'COMPLIANT' : 'VIOLATIONS_DETECTED'
      },
      violations: this.violations,
      bypasses: this.bypasses,
      enforcements: this.enforcements,
      recommendations: this.generateRecommendations()
    };

    // Save report
    const reportPath = '.next/quality-gate-enforcement-report.json';
    if (!fs.existsSync('.next')) {
      fs.mkdirSync('.next', { recursive: true });
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

    return report;
  }

  /**
   * Generate actionable recommendations
   */
  generateRecommendations() {
    const recommendations = [];

    if (this.violations.some(v => v.includes('bypass'))) {
      recommendations.push('Remove all quality gate bypasses from configuration files');
    }

    if (this.violations.some(v => v.includes('pre-commit'))) {
      recommendations.push('Configure comprehensive pre-commit hooks with lint-staged');
    }

    if (this.violations.some(v => v.includes('TypeScript'))) {
      recommendations.push('Enforce strict TypeScript configuration across all tsconfig.json files');
    }

    if (this.violations.some(v => v.includes('coverage'))) {
      recommendations.push('Remove test coverage bypasses and maintain minimum thresholds');
    }

    if (recommendations.length === 0) {
      recommendations.push('All quality gates are properly enforced - maintain current standards');
    }

    return recommendations;
  }

  /**
   * Run complete enforcement validation
   */
  async enforce() {
    console.log('🛡️  Quality Gate Enforcer - Anti-Bypass System');
    console.log('=' .repeat(60));
    console.log('Mission: Make quality gate bypasses impossible\\n');

    // Run all enforcement checks
    this.detectConfigurationBypasses();
    this.enforceGitWorkflow();
    this.validateBuildIntegrity();
    this.enforceTypeScriptStrict();
    this.enforceTestCoverage();
    this.enforceSecurityStandards();

    // Generate final report
    const report = this.generateReport();

    // Display summary
    console.log('\\n' + '=' .repeat(60));
    console.log('🛡️  QUALITY GATE ENFORCEMENT SUMMARY');
    console.log('=' .repeat(60));
    console.log(`Status: ${report.summary.status}`);
    console.log(`Total Violations: ${report.summary.totalViolations}`);
    console.log(`Bypass Attempts: ${report.summary.bypassAttempts}`);
    console.log(`Enforcements Active: ${report.summary.enforcements}`);
    console.log(`Duration: ${report.duration}`);

    if (report.summary.totalViolations > 0) {
      console.log('\\n❌ QUALITY GATE VIOLATIONS DETECTED');
      console.log('The following violations must be fixed:');
      this.violations.forEach(violation => {
        console.log(`   • ${violation}`);
      });

      console.log('\\n💡 RECOMMENDED ACTIONS:');
      report.recommendations.forEach(rec => {
        console.log(`   • ${rec}`);
      });

      console.log('\\n🚫 BUILD BLOCKED - Fix violations before proceeding');
      process.exit(1);
    } else {
      console.log('\\n✅ ALL QUALITY GATES PROPERLY ENFORCED');
      console.log('🛡️  No bypass mechanisms detected');
      console.log('🎯 Build determinism and E2E stability protected');
      
      if (this.enforcements.length > 0) {
        console.log('\\n🛡️  ACTIVE ENFORCEMENT MECHANISMS:');
        this.enforcements.forEach(enforcement => {
          console.log(`   • ${enforcement}`);
        });
      }

      console.log('\\n🎉 Quality Gate Enforcement: PASSED');
      process.exit(0);
    }
  }
}

// Run enforcement if called directly
if (require.main === module) {
  const enforcer = new QualityGateEnforcer();
  enforcer.enforce().catch(error => {
    console.error('❌ Quality Gate Enforcer failed:', error);
    process.exit(1);
  });
}

module.exports = QualityGateEnforcer;