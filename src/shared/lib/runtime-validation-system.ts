/**
 * 런타임 검증 체계 및 품질 게이트
 * CLAUDE.md Part 4.1 - 품질 게이트 & CI 준수
 * Daniel's Data Lead Standards - 계약 기반 검증, 결정론적 변환
 */

import { z } from 'zod';
import { dataIntegrityChecker, type DataIntegrityReport } from './data-integrity-checker';
import { DataQualityPipeline, PipelineStatus, type DataSource, type PipelineExecutionResult } from './data-quality-pipeline';

// 품질 게이트 설정 스키마
export const QualityGateConfigSchema = z.object({
  // 기본 품질 임계값
  min_quality_score: z.number().min(0).max(100).default(80),
  max_critical_errors: z.number().int().nonnegative().default(0),
  max_warnings: z.number().int().nonnegative().default(10),
  max_orphaned_records: z.number().int().nonnegative().default(5),
  
  // 특정 검증 규칙
  enforce_role_rating_consistency: z.boolean().default(true),
  enforce_foreign_key_integrity: z.boolean().default(true),
  enforce_schema_compliance: z.boolean().default(true),
  
  // CI/CD 통합 설정
  block_deployment_on_failure: z.boolean().default(true),
  notify_on_quality_degradation: z.boolean().default(true),
  generate_quality_report: z.boolean().default(true),
  
  // 자동 수정 설정
  auto_fix_orphaned_data: z.boolean().default(false),
  auto_migrate_rating_to_role: z.boolean().default(false),
});

export type QualityGateConfig = z.infer<typeof QualityGateConfigSchema>;

// 품질 게이트 실행 결과
export const QualityGateResultSchema = z.object({
  gate_id: z.string(),
  timestamp: z.string().datetime(),
  status: z.enum(['passed', 'failed', 'warning', 'blocked']),
  config: QualityGateConfigSchema,
  pipeline_result: z.any(), // PipelineExecutionResult
  
  // 게이트별 상세 결과
  quality_checks: z.object({
    score_check: z.object({
      passed: z.boolean(),
      actual_score: z.number(),
      required_score: z.number(),
      message: z.string().optional(),
    }),
    error_check: z.object({
      passed: z.boolean(),
      critical_count: z.number(),
      warning_count: z.number(),
      max_critical: z.number(),
      max_warnings: z.number(),
    }),
    orphan_check: z.object({
      passed: z.boolean(),
      orphan_count: z.number(),
      max_allowed: z.number(),
    }),
    consistency_check: z.object({
      passed: z.boolean(),
      inconsistent_records: z.number(),
      enforcement_enabled: z.boolean(),
    }),
  }),
  
  // 액션 및 권고사항
  blocking_issues: z.array(z.string()),
  warnings: z.array(z.string()),
  recommendations: z.array(z.string()),
  
  // 메트릭
  execution_duration_ms: z.number(),
  total_records_validated: z.number(),
});

export type QualityGateResult = z.infer<typeof QualityGateResultSchema>;

// 데이터 계약 검증기
export class DataContractValidator {
  private violations: string[] = [];

  /**
   * Members 테이블 계약 검증
   */
  validateMembersContract(data: unknown[]): boolean {
    this.violations = [];
    
    data.forEach((record, index) => {
      try {
        // 기본 스키마 검증
        const member = z.object({
          id: z.number().int().positive(),
          project_id: z.number().int().positive(),
          user_id: z.number().int().positive(),
          role: z.enum(['owner', 'admin', 'editor', 'reviewer', 'viewer']),
          rating: z.string().optional(),
          created: z.string().datetime(),
          modified: z.string().datetime(),
        }).parse(record);

        // 비즈니스 규칙 검증
        if (member.rating) {
          const expectedRole = this.mapRatingToRole(member.rating);
          if (expectedRole !== member.role) {
            this.violations.push(
              `Record ${index}: Role-Rating mismatch (role='${member.role}', rating='${member.rating}', expected='${expectedRole}')`
            );
          }
        }

        // 데이터 일관성 검증
        if (new Date(member.modified) < new Date(member.created)) {
          this.violations.push(
            `Record ${index}: Modified date cannot be before created date`
          );
        }

      } catch (error) {
        this.violations.push(
          `Record ${index}: Schema validation failed - ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    });

    return this.violations.length === 0;
  }

  /**
   * 계약 위반 내역 조회
   */
  getViolations(): string[] {
    return [...this.violations];
  }

  private mapRatingToRole(rating: string): string {
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
}

// 런타임 검증 시스템 (메인 클래스)
export class RuntimeValidationSystem {
  private contractValidator = new DataContractValidator();
  
  constructor(
    private dataSource: DataSource,
    private config: QualityGateConfig = QualityGateConfigSchema.parse({})
  ) {}

  /**
   * 품질 게이트 실행 - CI/CD 파이프라인에서 호출
   */
  async executeQualityGate(): Promise<QualityGateResult> {
    const gateId = `gate-${Date.now()}`;
    const startTime = Date.now();

    // 데이터 품질 파이프라인 실행
    const pipeline = new DataQualityPipeline(this.dataSource, {
      min_quality_score: this.config.min_quality_score,
      max_critical_errors: this.config.max_critical_errors,
      max_orphaned_records: this.config.max_orphaned_records,
      require_role_rating_consistency: this.config.enforce_role_rating_consistency,
      enable_automatic_cleanup: this.config.auto_fix_orphaned_data,
    });

    const pipelineResult = await pipeline.execute();
    
    // 품질 검사 실행
    const qualityChecks = this.performQualityChecks(pipelineResult);
    
    // 전체 상태 결정
    const status = this.determineGateStatus(qualityChecks, pipelineResult);
    
    // 차단 이슈 및 경고 수집
    const { blockingIssues, warnings } = this.collectIssuesAndWarnings(qualityChecks, pipelineResult);

    const result: QualityGateResult = {
      gate_id: gateId,
      timestamp: new Date().toISOString(),
      status,
      config: this.config,
      pipeline_result: pipelineResult,
      quality_checks: qualityChecks,
      blocking_issues: blockingIssues,
      warnings,
      recommendations: pipelineResult.recommendations,
      execution_duration_ms: Date.now() - startTime,
      total_records_validated: pipelineResult.quality_report?.total_records_checked || 0,
    };

    // CI/CD 차단 처리
    if (status === 'failed' && this.config.block_deployment_on_failure) {
      throw new QualityGateError(
        'Quality gate failed - deployment blocked',
        result
      );
    }

    return result;
  }

  /**
   * 런타임 데이터 검증 - 애플리케이션 실행 중 호출
   */
  async validateRuntimeData(data: {
    members?: unknown[];
    projects?: unknown[];
    files?: unknown[];
    invites?: unknown[];
  }): Promise<{
    valid: boolean;
    violations: string[];
    quality_score: number;
  }> {
    const violations: string[] = [];
    let totalRecords = 0;

    // Members 계약 검증
    if (data.members) {
      const membersValid = this.contractValidator.validateMembersContract(data.members);
      if (!membersValid) {
        violations.push(...this.contractValidator.getViolations());
      }
      totalRecords += data.members.length;
    }

    // 무결성 검사
    const report = dataIntegrityChecker.generateIntegrityReport(
      data.members || [],
      data.projects || [],
      data.files || [],
      data.invites || []
    );

    // 추가 검증 오류 수집
    violations.push(...report.validation_errors.map(e => 
      `${e.table}[${e.record_id}]${e.field ? `.${e.field}` : ''}: ${e.error}`
    ));

    return {
      valid: violations.length === 0,
      violations,
      quality_score: report.quality_score,
    };
  }

  private performQualityChecks(pipelineResult: PipelineExecutionResult): QualityGateResult['quality_checks'] {
    const report = pipelineResult.quality_report;
    if (!report) {
      throw new Error('Pipeline execution did not generate quality report');
    }

    // 점수 체크
    const scoreCheck = {
      passed: report.quality_score >= this.config.min_quality_score,
      actual_score: report.quality_score,
      required_score: this.config.min_quality_score,
      message: report.quality_score < this.config.min_quality_score 
        ? `Quality score ${report.quality_score}% is below required ${this.config.min_quality_score}%`
        : undefined,
    };

    // 오류 수 체크
    const criticalErrors = report.validation_errors.filter(e => e.severity === 'critical');
    const warnings = report.validation_errors.filter(e => e.severity === 'warning');
    
    const errorCheck = {
      passed: criticalErrors.length <= this.config.max_critical_errors && 
              warnings.length <= this.config.max_warnings,
      critical_count: criticalErrors.length,
      warning_count: warnings.length,
      max_critical: this.config.max_critical_errors,
      max_warnings: this.config.max_warnings,
    };

    // 고아 데이터 체크
    const orphanCheck = {
      passed: report.orphaned_data.length <= this.config.max_orphaned_records,
      orphan_count: report.orphaned_data.length,
      max_allowed: this.config.max_orphaned_records,
    };

    // 일관성 체크 (Role-Rating)
    const inconsistentRoles = report.validation_errors.filter(
      e => e.table === 'members' && e.field === 'role' && e.error.includes('Role mismatch')
    );
    
    const consistencyCheck = {
      passed: !this.config.enforce_role_rating_consistency || inconsistentRoles.length === 0,
      inconsistent_records: inconsistentRoles.length,
      enforcement_enabled: this.config.enforce_role_rating_consistency,
    };

    return {
      score_check: scoreCheck,
      error_check: errorCheck,
      orphan_check: orphanCheck,
      consistency_check: consistencyCheck,
    };
  }

  private determineGateStatus(
    checks: QualityGateResult['quality_checks'], 
    pipelineResult: PipelineExecutionResult
  ): QualityGateResult['status'] {
    // 파이프라인 자체가 실패한 경우
    if (pipelineResult.status === PipelineStatus.FAILED) {
      return 'failed';
    }

    // 필수 체크 실패
    const criticalChecks = [
      checks.score_check.passed,
      checks.error_check.passed,
      checks.orphan_check.passed,
    ];

    if (this.config.enforce_role_rating_consistency) {
      criticalChecks.push(checks.consistency_check.passed);
    }

    const hasCriticalFailures = criticalChecks.some(check => !check);
    
    if (hasCriticalFailures) {
      return this.config.block_deployment_on_failure ? 'blocked' : 'failed';
    }

    // 경고만 있는 경우
    if (checks.error_check.warning_count > 0 || !checks.consistency_check.passed) {
      return 'warning';
    }

    return 'passed';
  }

  private collectIssuesAndWarnings(
    checks: QualityGateResult['quality_checks'],
    pipelineResult: PipelineExecutionResult
  ): { blockingIssues: string[]; warnings: string[] } {
    const blockingIssues: string[] = [];
    const warnings: string[] = [];

    // 점수 이슈
    if (!checks.score_check.passed && checks.score_check.message) {
      blockingIssues.push(checks.score_check.message);
    }

    // 오류 수 이슈
    if (checks.error_check.critical_count > checks.error_check.max_critical) {
      blockingIssues.push(
        `Critical errors: ${checks.error_check.critical_count} (max: ${checks.error_check.max_critical})`
      );
    }
    
    if (checks.error_check.warning_count > checks.error_check.max_warnings) {
      warnings.push(
        `Warnings: ${checks.error_check.warning_count} (max: ${checks.error_check.max_warnings})`
      );
    }

    // 고아 데이터 이슈
    if (!checks.orphan_check.passed) {
      blockingIssues.push(
        `Orphaned records: ${checks.orphan_check.orphan_count} (max: ${checks.orphan_check.max_allowed})`
      );
    }

    // 일관성 이슈
    if (checks.consistency_check.enforcement_enabled && !checks.consistency_check.passed) {
      const message = `Role-Rating inconsistencies: ${checks.consistency_check.inconsistent_records}`;
      if (this.config.enforce_role_rating_consistency) {
        blockingIssues.push(message);
      } else {
        warnings.push(message);
      }
    }

    // 파이프라인 오류
    blockingIssues.push(...pipelineResult.errors);

    return { blockingIssues, warnings };
  }
}

// 품질 게이트 실패 에러 클래스
export class QualityGateError extends Error {
  constructor(
    message: string,
    public readonly gateResult: QualityGateResult
  ) {
    super(message);
    this.name = 'QualityGateError';
  }
}

// CI/CD 통합을 위한 편의 함수들
export const runQualityGate = async (
  dataSource: DataSource,
  config?: Partial<QualityGateConfig>
): Promise<QualityGateResult> => {
  const validatedConfig = QualityGateConfigSchema.parse(config || {});
  const system = new RuntimeValidationSystem(dataSource, validatedConfig);
  return system.executeQualityGate();
};

// 환경별 기본 설정
export const QUALITY_GATE_PRESETS = {
  development: QualityGateConfigSchema.parse({
    min_quality_score: 70,
    max_critical_errors: 5,
    max_warnings: 20,
    block_deployment_on_failure: false,
    auto_fix_orphaned_data: true,
  }),
  
  staging: QualityGateConfigSchema.parse({
    min_quality_score: 80,
    max_critical_errors: 2,
    max_warnings: 10,
    block_deployment_on_failure: true,
    notify_on_quality_degradation: true,
  }),
  
  production: QualityGateConfigSchema.parse({
    min_quality_score: 90,
    max_critical_errors: 0,
    max_warnings: 5,
    max_orphaned_records: 0,
    block_deployment_on_failure: true,
    enforce_role_rating_consistency: true,
    enforce_foreign_key_integrity: true,
  }),
};

// 메트릭 수집을 위한 유틸리티
export const extractQualityMetrics = (result: QualityGateResult) => ({
  gate_status: result.status,
  quality_score: result.pipeline_result.quality_report?.quality_score || 0,
  critical_errors: result.quality_checks.error_check.critical_count,
  warnings: result.quality_checks.error_check.warning_count,
  orphaned_records: result.quality_checks.orphan_check.orphan_count,
  execution_duration: result.execution_duration_ms,
  timestamp: result.timestamp,
});

// CLI용 실행 함수 (스크립트에서 사용)
export const runQualityGateFromCLI = async (configPath?: string): Promise<void> => {
  try {
    // 설정 로드 (파일 또는 환경 변수에서)
    const config = configPath ? 
      JSON.parse(await import('fs/promises').then(fs => fs.readFile(configPath, 'utf-8'))) :
      QUALITY_GATE_PRESETS[process.env.NODE_ENV as keyof typeof QUALITY_GATE_PRESETS || 'development'];

    // 실제 데이터 소스는 환경에 따라 구성
    // 여기서는 예시로 MockDataSource 사용
    console.log('Quality Gate execution not implemented for CLI - implement DataSource first');
    
  } catch (error) {
    console.error('Quality gate failed:', error);
    process.exit(1);
  }
};