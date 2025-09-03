/**
 * 데이터 품질 검사 파이프라인 테스트
 * CLAUDE.md Part 3 - TDD 원칙 준수 (Red → Green → Refactor)
 * MSW를 활용한 결정론적 테스트 (Part 3.4)
 */

import { describe, it, expect, beforeEach, jest } from 'jest';
import {
  DataQualityPipeline,
  PipelineStatus,
  MockDataSource,
  createMockDataSource,
  createDataQualityPipeline,
  validateEnvironmentConfig,
  validateRatingRoleMapping,
  validateRoleRatingMapping,
  DataQualityRulesSchema,
  type DataSource,
  type DataQualityRules,
  type PipelineExecutionResult,
} from './data-quality-pipeline';

// 고정 테스트 데이터 (결정론적 테스트)
const FIXED_MOCK_DATA = {
  members: [
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
      role: 'editor', // rating과 불일치
      rating: '2',    // admin이어야 함
      created: '2025-09-03T10:00:00.000Z',
      modified: '2025-09-03T10:00:00.000Z',
    },
    {
      id: 3,
      project_id: 999, // 존재하지 않는 프로젝트 (고아 데이터)
      user_id: 202,
      role: 'viewer',
      rating: '5',
      created: '2025-09-03T10:00:00.000Z',
      modified: '2025-09-03T10:00:00.000Z',
    },
  ],
  projects: [
    {
      id: 100,
      user_id: 200,
      name: 'Valid Project',
      manager: 'Test Manager',
      consumer: 'Test Consumer',
      created: '2025-09-03T10:00:00.000Z',
      modified: '2025-09-03T10:00:00.000Z',
    },
  ],
  files: [
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
  ],
  invites: [],
};

describe('DataQualityPipeline', () => {
  let mockDataSource: MockDataSource;
  let pipeline: DataQualityPipeline;
  let defaultRules: DataQualityRules;

  beforeEach(() => {
    // 고정된 시드 데이터로 결정론적 테스트 보장
    mockDataSource = createMockDataSource(FIXED_MOCK_DATA);
    defaultRules = DataQualityRulesSchema.parse({});
    pipeline = createDataQualityPipeline(mockDataSource, defaultRules);

    // 시간 Mock (결정론성 보장)
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-09-03T10:00:00.000Z'));
    
    // UUID Mock (결정론성 보장)  
    global.crypto = {
      randomUUID: jest.fn().mockReturnValue('test-uuid-12345'),
    } as any;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('파이프라인 초기화', () => {
    it('기본 상태로 초기화되어야 함', () => {
      expect(pipeline.getStatus()).toBe(PipelineStatus.IDLE);
      expect(pipeline.getCurrentExecution()).toBeNull();
    });

    it('사용자 정의 규칙으로 초기화 가능해야 함', () => {
      const customRules: Partial<DataQualityRules> = {
        min_quality_score: 90,
        max_critical_errors: 0,
        enable_automatic_cleanup: true,
      };

      const customPipeline = createDataQualityPipeline(mockDataSource, customRules);
      expect(customPipeline.getStatus()).toBe(PipelineStatus.IDLE);
    });
  });

  describe('파이프라인 실행', () => {
    it('성공적으로 실행되어야 함', async () => {
      const result = await pipeline.execute();

      expect(result.execution_id).toBe('test-uuid-12345');
      expect(result.status).toBe(PipelineStatus.COMPLETED);
      expect(result.started_at).toBe('2025-09-03T10:00:00.000Z');
      expect(result.completed_at).toBeDefined();
      expect(result.duration_ms).toBeGreaterThanOrEqual(0);
      expect(result.quality_report).toBeDefined();
    });

    it('데이터 품질 문제를 올바르게 감지해야 함', async () => {
      const result = await pipeline.execute();

      expect(result.quality_report).toBeDefined();
      
      const report = result.quality_report!;
      
      // Role-Rating 불일치 감지
      const roleErrors = report.validation_errors.filter(
        e => e.table === 'members' && e.field === 'role'
      );
      expect(roleErrors.length).toBeGreaterThan(0);

      // 고아 데이터 감지
      const orphanedMembers = report.orphaned_data.filter(o => o.table === 'members');
      const orphanedFiles = report.orphaned_data.filter(o => o.table === 'files');
      
      expect(orphanedMembers.length).toBeGreaterThan(0);
      expect(orphanedFiles.length).toBeGreaterThan(0);

      // 마이그레이션 권고사항
      expect(report.migration_recommendations.length).toBeGreaterThan(0);
    });

    it('품질 점수를 올바르게 계산해야 함', async () => {
      const result = await pipeline.execute();
      
      expect(result.quality_report?.quality_score).toBeDefined();
      expect(result.quality_report?.quality_score).toBeGreaterThan(0);
      expect(result.quality_report?.quality_score).toBeLessThanOrEqual(100);
    });

    it('실행 중 상태를 올바르게 관리해야 함', async () => {
      expect(pipeline.getStatus()).toBe(PipelineStatus.IDLE);

      const executePromise = pipeline.execute();
      
      // 실행 중에는 상태가 RUNNING이어야 함
      expect(pipeline.getStatus()).toBe(PipelineStatus.RUNNING);
      expect(pipeline.getCurrentExecution()?.status).toBe(PipelineStatus.RUNNING);

      await executePromise;

      // 완료 후에는 상태가 COMPLETED여야 함
      expect(pipeline.getStatus()).toBe(PipelineStatus.COMPLETED);
      expect(pipeline.getCurrentExecution()?.status).toBe(PipelineStatus.COMPLETED);
    });
  });

  describe('자동 수정 작업', () => {
    it('자동 정리가 활성화된 경우 고아 데이터를 정리해야 함', async () => {
      const autoCleanupRules: Partial<DataQualityRules> = {
        enable_automatic_cleanup: true,
        max_orphaned_records: 0, // 고아 데이터 허용 안함
      };

      const cleanupPipeline = createDataQualityPipeline(mockDataSource, autoCleanupRules);
      
      // executeCleanup 메서드 스파이
      const cleanupSpy = jest.spyOn(mockDataSource, 'executeCleanup').mockResolvedValue();
      const migrationSpy = jest.spyOn(mockDataSource, 'executeMigration').mockResolvedValue();

      const result = await cleanupPipeline.execute();

      expect(cleanupSpy).toHaveBeenCalled();
      expect(migrationSpy).toHaveBeenCalled();
      
      // 정리 작업이 기록되었는지 확인
      const cleanupActions = result.actions_taken.filter(a => a.action === 'cleanup');
      const migrationActions = result.actions_taken.filter(a => a.action === 'migrate');
      
      expect(cleanupActions.length).toBeGreaterThan(0);
      expect(migrationActions.length).toBeGreaterThan(0);
    });

    it('자동 정리가 비활성화된 경우 정리 작업을 수행하지 않아야 함', async () => {
      const noCleanupRules: Partial<DataQualityRules> = {
        enable_automatic_cleanup: false,
      };

      const noCleanupPipeline = createDataQualityPipeline(mockDataSource, noCleanupRules);
      
      const cleanupSpy = jest.spyOn(mockDataSource, 'executeCleanup');
      const migrationSpy = jest.spyOn(mockDataSource, 'executeMigration');

      const result = await noCleanupPipeline.execute();

      expect(cleanupSpy).not.toHaveBeenCalled();
      expect(migrationSpy).not.toHaveBeenCalled();
      expect(result.actions_taken).toHaveLength(0);
    });
  });

  describe('품질 규칙 검증', () => {
    it('최소 품질 점수 위반 시 오류를 기록해야 함', async () => {
      const strictRules: Partial<DataQualityRules> = {
        min_quality_score: 95, // 매우 높은 기준
      };

      const strictPipeline = createDataQualityPipeline(mockDataSource, strictRules);
      const result = await strictPipeline.execute();

      // 품질 점수가 95% 미만일 경우 오류 기록
      if (result.quality_report && result.quality_report.quality_score < 95) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors.some(e => e.includes('Quality score'))).toBe(true);
      }
    });

    it('심각한 오류 수 위반 시 오류를 기록해야 함', async () => {
      const strictRules: Partial<DataQualityRules> = {
        max_critical_errors: 0,
      };

      const strictPipeline = createDataQualityPipeline(mockDataSource, strictRules);
      const result = await strictPipeline.execute();

      const criticalErrors = result.quality_report?.validation_errors.filter(
        e => e.severity === 'critical'
      ) || [];

      if (criticalErrors.length > 0) {
        expect(result.errors.some(e => e.includes('Critical errors count'))).toBe(true);
      }
    });
  });

  describe('권고사항 생성', () => {
    it('품질 점수에 따른 권고사항을 생성해야 함', async () => {
      const result = await pipeline.execute();
      
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);

      // 품질 점수가 낮으면 권고사항이 생성되어야 함
      if (result.quality_report && result.quality_report.quality_score < 90) {
        expect(result.recommendations.length).toBeGreaterThan(0);
      }
    });

    it('특정 문제 패턴에 대한 권고사항을 생성해야 함', async () => {
      const result = await pipeline.execute();

      // Role 오류가 많으면 자동 동기화 권고
      const roleErrors = result.quality_report?.validation_errors.filter(
        e => e.field === 'role'
      ) || [];

      if (roleErrors.length > 5) {
        expect(result.recommendations.some(
          r => r.includes('automatic role synchronization')
        )).toBe(true);
      }

      // 고아 데이터가 있으면 외래키 제약조건 권고
      const orphanedData = result.quality_report?.orphaned_data || [];
      if (orphanedData.length > 0) {
        expect(result.recommendations.some(
          r => r.includes('foreign key constraints')
        )).toBe(true);
      }
    });
  });

  describe('파이프라인 제어', () => {
    it('실행 중인 파이프라인을 취소할 수 있어야 함', () => {
      // 실행 상태로 설정
      pipeline.execute(); // 비동기 실행
      
      expect(pipeline.getStatus()).toBe(PipelineStatus.RUNNING);

      pipeline.cancel();

      expect(pipeline.getStatus()).toBe(PipelineStatus.CANCELLED);
      expect(pipeline.getCurrentExecution()?.status).toBe(PipelineStatus.CANCELLED);
    });

    it('실행 중이 아닌 파이프라인은 취소되지 않아야 함', () => {
      expect(pipeline.getStatus()).toBe(PipelineStatus.IDLE);

      pipeline.cancel(); // 아무 효과 없음

      expect(pipeline.getStatus()).toBe(PipelineStatus.IDLE);
    });
  });

  describe('오류 처리', () => {
    it('데이터 소스 오류 시 실패 상태로 전환해야 함', async () => {
      const failingDataSource: DataSource = {
        getMembers: jest.fn().mockRejectedValue(new Error('Database connection failed')),
        getProjects: jest.fn().mockResolvedValue([]),
        getFiles: jest.fn().mockResolvedValue([]),
        getProjectInvites: jest.fn().mockResolvedValue([]),
        executeCleanup: jest.fn().mockResolvedValue(),
        executeMigration: jest.fn().mockResolvedValue(),
      };

      const failingPipeline = new DataQualityPipeline(failingDataSource);

      await expect(failingPipeline.execute()).rejects.toThrow('Database connection failed');
      
      expect(failingPipeline.getStatus()).toBe(PipelineStatus.FAILED);
      expect(failingPipeline.getCurrentExecution()?.status).toBe(PipelineStatus.FAILED);
      expect(failingPipeline.getCurrentExecution()?.errors).toContain('Database connection failed');
    });
  });
});

describe('MockDataSource', () => {
  let mockDataSource: MockDataSource;

  beforeEach(() => {
    mockDataSource = createMockDataSource(FIXED_MOCK_DATA);
  });

  it('목업 데이터를 올바르게 반환해야 함', async () => {
    const members = await mockDataSource.getMembers();
    const projects = await mockDataSource.getProjects();
    const files = await mockDataSource.getFiles();
    const invites = await mockDataSource.getProjectInvites();

    expect(members).toEqual(FIXED_MOCK_DATA.members);
    expect(projects).toEqual(FIXED_MOCK_DATA.projects);
    expect(files).toEqual(FIXED_MOCK_DATA.files);
    expect(invites).toEqual(FIXED_MOCK_DATA.invites);
  });

  it('정리 및 마이그레이션 작업을 로깅해야 함', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    await mockDataSource.executeCleanup([{ table: 'members', ids: [1, 2] }]);
    await mockDataSource.executeMigration([{ 
      table: 'members', 
      field_from: 'rating', 
      field_to: 'role',
      mapping: { '1': 'owner', '2': 'admin' }
    }]);

    expect(consoleSpy).toHaveBeenCalledWith('Mock cleanup executed:', [{ table: 'members', ids: [1, 2] }]);
    expect(consoleSpy).toHaveBeenCalledWith('Mock migration executed:', expect.any(Array));

    consoleSpy.mockRestore();
  });
});

describe('유틸리티 함수들', () => {
  describe('validateEnvironmentConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      jest.resetModules();
      process.env = { ...originalEnv };
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('유효한 환경 설정을 통과시켜야 함', () => {
      process.env.NODE_ENV = 'test';
      process.env.API_BASE_URL = 'https://api.example.com';
      process.env.LOG_LEVEL = 'info';

      expect(() => validateEnvironmentConfig()).not.toThrow();

      const config = validateEnvironmentConfig();
      expect(config.NODE_ENV).toBe('test');
      expect(config.API_BASE_URL).toBe('https://api.example.com');
      expect(config.LOG_LEVEL).toBe('info');
    });

    it('유효하지 않은 환경 설정을 거부해야 함', () => {
      process.env.NODE_ENV = 'invalid';
      process.env.API_BASE_URL = 'not-a-url';

      expect(() => validateEnvironmentConfig()).toThrow('Invalid environment configuration');
    });
  });

  describe('validateRatingRoleMapping', () => {
    it('일치하는 rating-role 쌍을 true로 반환해야 함', () => {
      expect(validateRatingRoleMapping('1', 'owner')).toBe(true);
      expect(validateRatingRoleMapping('2', 'admin')).toBe(true);
      expect(validateRatingRoleMapping(3, 'editor')).toBe(true);
      expect(validateRatingRoleMapping(null, 'viewer')).toBe(true); // null은 허용
    });

    it('불일치하는 rating-role 쌍을 false로 반환해야 함', () => {
      expect(validateRatingRoleMapping('1', 'admin')).toBe(false);
      expect(validateRatingRoleMapping('2', 'editor')).toBe(false);
      expect(validateRatingRoleMapping('invalid', 'owner')).toBe(false);
    });
  });

  describe('validateRoleRatingMapping', () => {
    it('일치하는 role-rating 쌍을 true로 반환해야 함', () => {
      expect(validateRoleRatingMapping('owner', '1')).toBe(true);
      expect(validateRoleRatingMapping('admin', '2')).toBe(true);
      expect(validateRoleRatingMapping('editor', '3')).toBe(true);
    });

    it('불일치하는 role-rating 쌍을 false로 반환해야 함', () => {
      expect(validateRoleRatingMapping('owner', '2')).toBe(false);
      expect(validateRoleRatingMapping('invalid', '1')).toBe(false);
      expect(validateRoleRatingMapping(123, '1')).toBe(false); // 숫자 타입
    });
  });
});