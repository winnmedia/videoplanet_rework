/**
 * 데이터 품질 검사 파이프라인
 * CLAUDE.md Part 1.1 - TDD 원칙 및 데이터 품질 보장
 * Daniel's Data Lead Standards - 결정론적 변환, 계약 기반 검증
 */

import { z } from 'zod';
import { dataIntegrityChecker, type DataIntegrityReport, mapRatingToRole, mapRoleToRating } from './data-integrity-checker';

// 환경 변수 검증 스키마 (CLAUDE.md Part 4.4.2)
export const EnvConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  API_BASE_URL: z.string().url(),
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().optional(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// 데이터 품질 규칙 정의
export const DataQualityRulesSchema = z.object({
  min_quality_score: z.number().min(0).max(100).default(80),
  max_critical_errors: z.number().int().nonnegative().default(0),
  max_orphaned_records: z.number().int().nonnegative().default(5),
  require_role_rating_consistency: z.boolean().default(true),
  enable_automatic_cleanup: z.boolean().default(false),
});

export type DataQualityRules = z.infer<typeof DataQualityRulesSchema>;

// 품질 검사 파이프라인 상태
export enum PipelineStatus {
  IDLE = 'idle',
  RUNNING = 'running', 
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// 파이프라인 실행 결과
export const PipelineExecutionResultSchema = z.object({
  execution_id: z.string().uuid(),
  status: z.nativeEnum(PipelineStatus),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
  duration_ms: z.number().int().nonnegative().nullable(),
  quality_report: z.lazy(() => DataIntegrityReportSchema).optional(),
  actions_taken: z.array(z.object({
    action: z.enum(['cleanup', 'migrate', 'flag', 'notify']),
    table: z.string(),
    record_count: z.number().int().nonnegative(),
    details: z.string(),
  })),
  errors: z.array(z.string()),
  recommendations: z.array(z.string()),
});

export type PipelineExecutionResult = z.infer<typeof PipelineExecutionResultSchema>;

// 데이터 소스 인터페이스 (의존성 역전)
export interface DataSource {
  getMembers(): Promise<unknown[]>;
  getProjects(): Promise<unknown[]>;
  getFiles(): Promise<unknown[]>;
  getProjectInvites(): Promise<unknown[]>;
  executeCleanup(orphanedIds: { table: string; ids: number[] }[]): Promise<void>;
  executeMigration(migrations: { table: string; field_from: string; field_to: string; mapping: Record<string, string> }[]): Promise<void>;
}

// Mock 데이터 소스 (테스트용)
export class MockDataSource implements DataSource {
  constructor(
    private mockData: {
      members: unknown[];
      projects: unknown[];
      files: unknown[];
      invites: unknown[];
    }
  ) {}

  async getMembers(): Promise<unknown[]> {
    return this.mockData.members;
  }

  async getProjects(): Promise<unknown[]> {
    return this.mockData.projects;
  }

  async getFiles(): Promise<unknown[]> {
    return this.mockData.files;
  }

  async getProjectInvites(): Promise<unknown[]> {
    return this.mockData.invites;
  }

  async executeCleanup(orphanedIds: { table: string; ids: number[] }[]): Promise<void> {
    console.log('Mock cleanup executed:', orphanedIds);
  }

  async executeMigration(migrations: { table: string; field_from: string; field_to: string; mapping: Record<string, string> }[]): Promise<void> {
    console.log('Mock migration executed:', migrations);
  }
}

/**
 * 데이터 품질 검사 파이프라인 클래스
 * 결정론적 변환과 계약 기반 검증을 보장합니다.
 */
export class DataQualityPipeline {
  private status: PipelineStatus = PipelineStatus.IDLE;
  private currentExecution: PipelineExecutionResult | null = null;

  constructor(
    private dataSource: DataSource,
    private rules: DataQualityRules = DataQualityRulesSchema.parse({})
  ) {}

  /**
   * 파이프라인 실행 - TDD 원칙 준수
   */
  async execute(): Promise<PipelineExecutionResult> {
    const executionId = crypto.randomUUID();
    const startTime = new Date();

    this.status = PipelineStatus.RUNNING;
    this.currentExecution = {
      execution_id: executionId,
      status: PipelineStatus.RUNNING,
      started_at: startTime.toISOString(),
      completed_at: null,
      duration_ms: null,
      actions_taken: [],
      errors: [],
      recommendations: [],
    };

    try {
      // Phase 1: 데이터 수집
      const [members, projects, files, invites] = await Promise.all([
        this.dataSource.getMembers(),
        this.dataSource.getProjects(),
        this.dataSource.getFiles(),
        this.dataSource.getProjectInvites(),
      ]);

      // Phase 2: 무결성 검사 실행
      const qualityReport = dataIntegrityChecker.generateIntegrityReport(
        members,
        projects,
        files,
        invites
      );

      this.currentExecution.quality_report = qualityReport;

      // Phase 3: 품질 규칙 검증
      const qualityValidation = this.validateQualityRules(qualityReport);
      
      if (!qualityValidation.passed) {
        this.currentExecution.errors.push(...qualityValidation.errors);
      }

      // Phase 4: 자동 수정 작업 (설정에 따라)
      if (this.rules.enable_automatic_cleanup) {
        await this.performAutomaticActions(qualityReport);
      }

      // Phase 5: 권고사항 생성
      this.generateRecommendations(qualityReport);

      // 완료 처리
      const endTime = new Date();
      this.status = PipelineStatus.COMPLETED;
      this.currentExecution.status = PipelineStatus.COMPLETED;
      this.currentExecution.completed_at = endTime.toISOString();
      this.currentExecution.duration_ms = endTime.getTime() - startTime.getTime();

      return this.currentExecution;

    } catch (error) {
      // 오류 처리
      this.status = PipelineStatus.FAILED;
      this.currentExecution.status = PipelineStatus.FAILED;
      this.currentExecution.errors.push(
        error instanceof Error ? error.message : 'Unknown pipeline error'
      );
      
      const endTime = new Date();
      this.currentExecution.completed_at = endTime.toISOString();
      this.currentExecution.duration_ms = endTime.getTime() - startTime.getTime();

      throw error;
    }
  }

  /**
   * 품질 규칙 검증
   */
  private validateQualityRules(report: DataIntegrityReport): { passed: boolean; errors: string[] } {
    const errors: string[] = [];

    // 최소 품질 점수 확인
    if (report.quality_score < this.rules.min_quality_score) {
      errors.push(`Quality score ${report.quality_score}% is below minimum threshold ${this.rules.min_quality_score}%`);
    }

    // 심각한 오류 수 확인
    const criticalErrors = report.validation_errors.filter(e => e.severity === 'critical');
    if (criticalErrors.length > this.rules.max_critical_errors) {
      errors.push(`Critical errors count ${criticalErrors.length} exceeds maximum allowed ${this.rules.max_critical_errors}`);
    }

    // 고아 데이터 수 확인
    if (report.orphaned_data.length > this.rules.max_orphaned_records) {
      errors.push(`Orphaned records count ${report.orphaned_data.length} exceeds maximum allowed ${this.rules.max_orphaned_records}`);
    }

    // Role-Rating 일관성 확인
    if (this.rules.require_role_rating_consistency) {
      const inconsistentRoles = report.validation_errors.filter(
        e => e.table === 'members' && e.field === 'role' && e.error.includes('Role mismatch')
      );
      if (inconsistentRoles.length > 0) {
        errors.push(`Found ${inconsistentRoles.length} role-rating inconsistencies that must be resolved`);
      }
    }

    return {
      passed: errors.length === 0,
      errors,
    };
  }

  /**
   * 자동 수정 작업 수행
   */
  private async performAutomaticActions(report: DataIntegrityReport): Promise<void> {
    // 고아 데이터 정리
    const orphanedByTable = new Map<string, number[]>();
    
    report.orphaned_data.forEach(orphan => {
      if (orphan.cleanup_action === 'delete') {
        const ids = orphanedByTable.get(orphan.table) || [];
        ids.push(orphan.record_id);
        orphanedByTable.set(orphan.table, ids);
      }
    });

    if (orphanedByTable.size > 0) {
      const cleanupData = Array.from(orphanedByTable.entries()).map(([table, ids]) => ({ table, ids }));
      await this.dataSource.executeCleanup(cleanupData);

      this.currentExecution?.actions_taken.push({
        action: 'cleanup',
        table: 'multiple',
        record_count: cleanupData.reduce((sum, item) => sum + item.ids.length, 0),
        details: `Cleaned up orphaned records from: ${Array.from(orphanedByTable.keys()).join(', ')}`,
      });
    }

    // Rating → Role 마이그레이션
    const roleMigrations = report.migration_recommendations.filter(
      rec => rec.field_from === 'rating' && rec.field_to === 'role'
    );

    if (roleMigrations.length > 0) {
      const migrations = roleMigrations.map(rec => ({
        table: rec.table,
        field_from: rec.field_from,
        field_to: rec.field_to,
        mapping: this.createRatingRoleMapping(),
      }));

      await this.dataSource.executeMigration(migrations);

      this.currentExecution?.actions_taken.push({
        action: 'migrate',
        table: 'members',
        record_count: roleMigrations.reduce((sum, rec) => sum + rec.affected_records, 0),
        details: 'Migrated rating values to role field using 1→owner, 2→admin, 3→editor, 4→reviewer, 5→viewer mapping',
      });
    }
  }

  /**
   * Rating → Role 매핑 테이블 생성
   */
  private createRatingRoleMapping(): Record<string, string> {
    return {
      '1': 'owner',
      '2': 'admin', 
      '3': 'editor',
      '4': 'reviewer',
      '5': 'viewer',
    };
  }

  /**
   * 권고사항 생성
   */
  private generateRecommendations(report: DataIntegrityReport): void {
    const recommendations: string[] = [];

    // 품질 점수 기반 권고
    if (report.quality_score < 90) {
      recommendations.push('Consider implementing stricter data validation at input boundaries');
    }

    if (report.quality_score < 70) {
      recommendations.push('Review data entry processes and add real-time validation');
    }

    if (report.quality_score < 50) {
      recommendations.push('URGENT: Implement comprehensive data cleanup and migration strategy');
    }

    // 오류 패턴 기반 권고
    const roleErrors = report.validation_errors.filter(e => e.field === 'role');
    if (roleErrors.length > 5) {
      recommendations.push('Implement automatic role synchronization from rating field during data updates');
    }

    // 고아 데이터 기반 권고
    if (report.orphaned_data.length > 0) {
      recommendations.push('Set up foreign key constraints in database to prevent orphaned data creation');
    }

    // 마이그레이션 기반 권고
    if (report.migration_recommendations.length > 0) {
      recommendations.push('Execute pending data migrations during next maintenance window');
    }

    this.currentExecution!.recommendations = recommendations;
  }

  /**
   * 파이프라인 상태 조회
   */
  getStatus(): PipelineStatus {
    return this.status;
  }

  /**
   * 현재 실행 결과 조회
   */
  getCurrentExecution(): PipelineExecutionResult | null {
    return this.currentExecution;
  }

  /**
   * 파이프라인 취소 (진행 중인 경우)
   */
  cancel(): void {
    if (this.status === PipelineStatus.RUNNING) {
      this.status = PipelineStatus.CANCELLED;
      if (this.currentExecution) {
        this.currentExecution.status = PipelineStatus.CANCELLED;
        this.currentExecution.completed_at = new Date().toISOString();
      }
    }
  }
}

// 환경 설정 검증 함수 (CLAUDE.md 준수)
export const validateEnvironmentConfig = (): z.infer<typeof EnvConfigSchema> => {
  const config = {
    NODE_ENV: process.env.NODE_ENV,
    API_BASE_URL: process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL,
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    LOG_LEVEL: process.env.LOG_LEVEL,
  };

  try {
    return EnvConfigSchema.parse(config);
  } catch (error) {
    console.error('Environment configuration validation failed:', error);
    throw new Error('Invalid environment configuration. Check your .env file.');
  }
};

// 편의 함수들
export const createMockDataSource = (mockData: {
  members: unknown[];
  projects: unknown[];
  files: unknown[];
  invites: unknown[];
}): MockDataSource => new MockDataSource(mockData);

export const createDataQualityPipeline = (
  dataSource: DataSource,
  rules?: Partial<DataQualityRules>
): DataQualityPipeline => {
  const validatedRules = DataQualityRulesSchema.parse(rules || {});
  return new DataQualityPipeline(dataSource, validatedRules);
};

// 유틸리티: Rating-Role 매핑 검증
export const validateRatingRoleMapping = (rating: unknown, role: unknown): boolean => {
  if (rating === null || rating === undefined) return true; // null 값은 허용
  
  const expectedRole = mapRatingToRole(rating);
  return expectedRole === role;
};

// 유틸리티: 역방향 검증
export const validateRoleRatingMapping = (role: unknown, rating: unknown): boolean => {
  if (typeof role !== 'string') return false;
  
  const expectedRating = mapRoleToRating(role);
  return expectedRating === String(rating);
};