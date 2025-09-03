#!/usr/bin/env node

/**
 * 데이터 품질 게이트 실행 스크립트
 * CI/CD 파이프라인에서 호출되어 데이터 무결성을 검증합니다.
 * 
 * Usage: node scripts/data-quality-gate.js [--env=production] [--config=path/to/config.json]
 * 
 * Exit codes:
 * - 0: 품질 게이트 통과
 * - 1: 품질 게이트 실패 (배포 차단)
 * - 2: 설정 오류
 * - 3: 데이터 소스 연결 실패
 */

const fs = require('fs').promises;
const path = require('path');

// 환경별 기본 설정
const QUALITY_GATE_PRESETS = {
  development: {
    min_quality_score: 70,
    max_critical_errors: 5,
    max_warnings: 20,
    block_deployment_on_failure: false,
    auto_fix_orphaned_data: true,
    enforce_role_rating_consistency: true,
    enforce_foreign_key_integrity: false,
    generate_quality_report: true,
  },
  
  staging: {
    min_quality_score: 80,
    max_critical_errors: 2,
    max_warnings: 10,
    block_deployment_on_failure: true,
    notify_on_quality_degradation: true,
    enforce_role_rating_consistency: true,
    enforce_foreign_key_integrity: true,
    generate_quality_report: true,
  },
  
  production: {
    min_quality_score: 90,
    max_critical_errors: 0,
    max_warnings: 5,
    max_orphaned_records: 0,
    block_deployment_on_failure: true,
    enforce_role_rating_consistency: true,
    enforce_foreign_key_integrity: true,
    auto_fix_orphaned_data: false,
    generate_quality_report: true,
  },
};

// 명령행 인수 파싱
function parseArguments() {
  const args = process.argv.slice(2);
  const options = {
    env: process.env.NODE_ENV || 'development',
    config: null,
    verbose: false,
    dryRun: false,
  };

  args.forEach(arg => {
    if (arg.startsWith('--env=')) {
      options.env = arg.split('=')[1];
    } else if (arg.startsWith('--config=')) {
      options.config = arg.split('=')[1];
    } else if (arg === '--verbose') {
      options.verbose = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Data Quality Gate Runner

Usage: node scripts/data-quality-gate.js [options]

Options:
  --env=<environment>     Environment (development, staging, production)
  --config=<path>         Custom configuration file path
  --verbose               Enable verbose logging
  --dry-run              Run without making any changes
  --help, -h             Show this help message

Examples:
  node scripts/data-quality-gate.js --env=production
  node scripts/data-quality-gate.js --config=./quality-config.json --verbose
      `);
      process.exit(0);
    }
  });

  return options;
}

// 설정 로드
async function loadConfiguration(options) {
  try {
    let config;

    if (options.config) {
      // 사용자 정의 설정 파일 로드
      const configContent = await fs.readFile(options.config, 'utf-8');
      config = JSON.parse(configContent);
    } else {
      // 환경별 기본 설정 사용
      config = QUALITY_GATE_PRESETS[options.env];
      if (!config) {
        throw new Error(`Unknown environment: ${options.env}`);
      }
    }

    if (options.verbose) {
      console.log('Configuration loaded:', JSON.stringify(config, null, 2));
    }

    return config;
  } catch (error) {
    console.error('Failed to load configuration:', error.message);
    process.exit(2);
  }
}

// Mock 데이터 소스 (실제 환경에서는 데이터베이스 연결로 대체)
class MockDataSourceForScript {
  constructor(options) {
    this.options = options;
  }

  async getMembers() {
    // 실제 구현에서는 데이터베이스에서 가져옴
    return [
      {
        id: 1,
        project_id: 100,
        user_id: 200,
        role: 'owner',
        rating: '1',
        created: '2025-09-03T10:00:00.000Z',
        modified: '2025-09-03T10:00:00.000Z',
      },
      {
        id: 2,
        project_id: 100,
        user_id: 201,
        role: 'editor',
        rating: '2', // 불일치 - admin이어야 함
        created: '2025-09-03T10:00:00.000Z',
        modified: '2025-09-03T10:00:00.000Z',
      },
      {
        id: 3,
        project_id: 999, // 고아 데이터
        user_id: 202,
        role: 'viewer',
        rating: '5',
        created: '2025-09-03T10:00:00.000Z',
        modified: '2025-09-03T10:00:00.000Z',
      },
    ];
  }

  async getProjects() {
    return [
      {
        id: 100,
        user_id: 200,
        name: 'Test Project',
        manager: 'Test Manager',
        consumer: 'Test Consumer',
        created: '2025-09-03T10:00:00.000Z',
        modified: '2025-09-03T10:00:00.000Z',
      },
    ];
  }

  async getFiles() {
    return [
      {
        id: 1,
        project_id: 100,
        files: 'test-file.mp4',
        created: '2025-09-03T10:00:00.000Z',
        modified: '2025-09-03T10:00:00.000Z',
      },
      {
        id: 2,
        project_id: 999, // 고아 데이터
        files: 'orphan-file.mp4',
        created: '2025-09-03T10:00:00.000Z',
        modified: '2025-09-03T10:00:00.000Z',
      },
    ];
  }

  async getProjectInvites() {
    return [];
  }

  async executeCleanup(orphanedIds) {
    if (this.options.dryRun) {
      console.log('[DRY RUN] Would cleanup orphaned records:', orphanedIds);
      return;
    }
    
    console.log('Executing cleanup for orphaned records:', orphanedIds);
    // 실제 구현에서는 데이터베이스에서 삭제
  }

  async executeMigration(migrations) {
    if (this.options.dryRun) {
      console.log('[DRY RUN] Would execute migrations:', migrations);
      return;
    }
    
    console.log('Executing migrations:', migrations);
    // 실제 구현에서는 데이터베이스 업데이트
  }
}

// 품질 게이트 실행 (간소화된 구현)
async function runQualityGate(dataSource, config, options) {
  const startTime = Date.now();
  
  try {
    console.log(`🔍 Starting data quality gate (${options.env} environment)`);
    
    // Phase 1: 데이터 수집
    if (options.verbose) console.log('📊 Collecting data...');
    const [members, projects, files, invites] = await Promise.all([
      dataSource.getMembers(),
      dataSource.getProjects(), 
      dataSource.getFiles(),
      dataSource.getProjectInvites(),
    ]);

    const totalRecords = members.length + projects.length + files.length + invites.length;
    console.log(`📈 Analyzing ${totalRecords} records...`);

    // Phase 2: 무결성 검사 (간소화)
    const qualityIssues = [];
    const warnings = [];
    
    // Rating-Role 일치성 검사
    let roleInconsistencies = 0;
    members.forEach((member, index) => {
      if (member.rating) {
        const expectedRole = mapRatingToRole(member.rating);
        if (expectedRole !== member.role) {
          roleInconsistencies++;
          const issue = `Member[${member.id}]: Role mismatch (role='${member.role}', rating='${member.rating}', expected='${expectedRole}')`;
          
          if (config.enforce_role_rating_consistency) {
            qualityIssues.push(issue);
          } else {
            warnings.push(issue);
          }
        }
      }
    });

    // 고아 데이터 검사
    const projectIds = new Set(projects.map(p => p.id));
    let orphanedRecords = 0;
    
    members.forEach(member => {
      if (!projectIds.has(member.project_id)) {
        orphanedRecords++;
        qualityIssues.push(`Orphaned member[${member.id}]: references non-existent project_id ${member.project_id}`);
      }
    });

    files.forEach(file => {
      if (!projectIds.has(file.project_id)) {
        orphanedRecords++;
        qualityIssues.push(`Orphaned file[${file.id}]: references non-existent project_id ${file.project_id}`);
      }
    });

    // Phase 3: 품질 점수 계산
    const maxIssues = totalRecords * 0.5; // 최대 50% 이슈 허용
    const qualityScore = Math.max(0, 100 - (qualityIssues.length / maxIssues) * 100);

    // Phase 4: 자동 수정 (설정된 경우)
    let autoFixActions = [];
    if (config.auto_fix_orphaned_data && orphanedRecords > 0) {
      const orphanedIds = [
        { table: 'members', ids: members.filter(m => !projectIds.has(m.project_id)).map(m => m.id) },
        { table: 'files', ids: files.filter(f => !projectIds.has(f.project_id)).map(f => f.id) },
      ].filter(item => item.ids.length > 0);

      if (orphanedIds.length > 0) {
        await dataSource.executeCleanup(orphanedIds);
        autoFixActions.push(`Cleaned up ${orphanedIds.reduce((sum, item) => sum + item.ids.length, 0)} orphaned records`);
      }
    }

    if (config.auto_migrate_rating_to_role && roleInconsistencies > 0) {
      const migrations = [{
        table: 'members',
        field_from: 'rating',
        field_to: 'role',
        mapping: { '1': 'owner', '2': 'admin', '3': 'editor', '4': 'reviewer', '5': 'viewer' }
      }];
      
      await dataSource.executeMigration(migrations);
      autoFixActions.push(`Migrated ${roleInconsistencies} role-rating inconsistencies`);
    }

    // Phase 5: 결과 평가
    const executionTime = Date.now() - startTime;
    
    console.log(`\n📋 Quality Gate Results (${executionTime}ms):`);
    console.log(`   Quality Score: ${qualityScore.toFixed(1)}% (required: ${config.min_quality_score}%)`);
    console.log(`   Critical Issues: ${qualityIssues.length} (max: ${config.max_critical_errors || 0})`);
    console.log(`   Warnings: ${warnings.length} (max: ${config.max_warnings || 10})`);
    console.log(`   Orphaned Records: ${orphanedRecords} (max: ${config.max_orphaned_records || 5})`);
    console.log(`   Auto-fix Actions: ${autoFixActions.length}`);

    // 상세 이슈 출력
    if (options.verbose || qualityIssues.length > 0) {
      if (qualityIssues.length > 0) {
        console.log('\n🚨 Critical Issues:');
        qualityIssues.forEach(issue => console.log(`   - ${issue}`));
      }
      
      if (warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        warnings.forEach(warning => console.log(`   - ${warning}`));
      }

      if (autoFixActions.length > 0) {
        console.log('\n🔧 Auto-fix Actions:');
        autoFixActions.forEach(action => console.log(`   - ${action}`));
      }
    }

    // Phase 6: 게이트 통과/실패 결정
    const failed = 
      qualityScore < config.min_quality_score ||
      qualityIssues.length > (config.max_critical_errors || 0) ||
      warnings.length > (config.max_warnings || 10) ||
      orphanedRecords > (config.max_orphaned_records || 5);

    if (failed) {
      console.log('\n❌ Quality Gate FAILED');
      
      if (config.block_deployment_on_failure) {
        console.log('🚫 Deployment blocked due to quality gate failure');
        return false;
      } else {
        console.log('⚠️  Quality gate failed but deployment is allowed');
        return true; // 경고만, 배포는 진행
      }
    } else {
      console.log('\n✅ Quality Gate PASSED');
      return true;
    }

  } catch (error) {
    console.error('❌ Quality gate execution failed:', error.message);
    if (options.verbose) console.error(error.stack);
    return false;
  }
}

// Rating → Role 매핑 함수
function mapRatingToRole(rating) {
  const ratingNum = parseInt(rating, 10);
  switch (ratingNum) {
    case 1: return 'owner';
    case 2: return 'admin';
    case 3: return 'editor';
    case 4: return 'reviewer';
    case 5: return 'viewer';
    default: return 'viewer';
  }
}

// 보고서 생성
async function generateQualityReport(result, options) {
  if (!options.config?.generate_quality_report && !QUALITY_GATE_PRESETS[options.env]?.generate_quality_report) {
    return;
  }

  const reportPath = path.join(process.cwd(), 'reports', `data-quality-${options.env}-${Date.now()}.json`);
  
  try {
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    
    const report = {
      timestamp: new Date().toISOString(),
      environment: options.env,
      status: result ? 'passed' : 'failed',
      execution_time: Date.now(),
      config: options.config || QUALITY_GATE_PRESETS[options.env],
    };

    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    console.log(`📊 Quality report generated: ${reportPath}`);
  } catch (error) {
    console.warn('Failed to generate quality report:', error.message);
  }
}

// 메인 실행
async function main() {
  const options = parseArguments();
  const config = await loadConfiguration(options);
  
  console.log(`🚀 Data Quality Gate - VideoPlanet (v1.0.0)`);
  console.log(`   Environment: ${options.env}`);
  if (options.dryRun) console.log('   Mode: DRY RUN');
  
  const dataSource = new MockDataSourceForScript(options);
  const success = await runQualityGate(dataSource, config, options);
  
  await generateQualityReport(success, { ...options, config });
  
  if (success) {
    console.log('\n🎉 Data quality validation completed successfully');
    process.exit(0);
  } else {
    console.log('\n💥 Data quality validation failed');
    process.exit(1);
  }
}

// 스크립트 실행
if (require.main === module) {
  main().catch(error => {
    console.error('Unexpected error:', error);
    process.exit(3);
  });
}

module.exports = {
  runQualityGate,
  MockDataSourceForScript,
  QUALITY_GATE_PRESETS,
};