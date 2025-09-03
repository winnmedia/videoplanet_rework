/**
 * 데이터 무결성 검사 테스트
 * CLAUDE.md Part 3 - TDD 원칙 준수 (Red → Green → Refactor)
 */

import { describe, it, expect, beforeEach } from 'jest';
import {
  DataIntegrityChecker,
  mapRatingToRole,
  mapRoleToRating,
  validateMemberData,
  validateProjectData,
  dataIntegrityChecker,
  MemberSchema,
  type MemberData,
  type ProjectData,
  type DataIntegrityReport,
} from './data-integrity-checker';

describe('DataIntegrityChecker', () => {
  let checker: DataIntegrityChecker;

  beforeEach(() => {
    checker = new DataIntegrityChecker();
  });

  describe('Rating → Role 매핑 함수', () => {
    describe('mapRatingToRole', () => {
      it('숫자 rating을 올바른 role로 매핑해야 함', () => {
        expect(mapRatingToRole(1)).toBe('owner');
        expect(mapRatingToRole(2)).toBe('admin');
        expect(mapRatingToRole(3)).toBe('editor');
        expect(mapRatingToRole(4)).toBe('reviewer');
        expect(mapRatingToRole(5)).toBe('viewer');
      });

      it('문자열 rating을 올바른 role로 매핑해야 함', () => {
        expect(mapRatingToRole('1')).toBe('owner');
        expect(mapRatingToRole('2')).toBe('admin');
        expect(mapRatingToRole('3')).toBe('editor');
        expect(mapRatingToRole('4')).toBe('reviewer');
        expect(mapRatingToRole('5')).toBe('viewer');
      });

      it('null/undefined rating은 기본값 viewer로 처리해야 함', () => {
        expect(mapRatingToRole(null)).toBe('viewer');
        expect(mapRatingToRole(undefined)).toBe('viewer');
      });

      it('유효하지 않은 rating은 viewer로 처리하고 경고해야 함', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        expect(mapRatingToRole(0)).toBe('viewer');
        expect(mapRatingToRole(6)).toBe('viewer');
        expect(mapRatingToRole('invalid')).toBe('viewer');
        
        expect(consoleSpy).toHaveBeenCalledTimes(3);
        consoleSpy.mockRestore();
      });
    });

    describe('mapRoleToRating', () => {
      it('올바른 role을 rating으로 역매핑해야 함', () => {
        expect(mapRoleToRating('owner')).toBe('1');
        expect(mapRoleToRating('admin')).toBe('2');
        expect(mapRoleToRating('editor')).toBe('3');
        expect(mapRoleToRating('reviewer')).toBe('4');
        expect(mapRoleToRating('viewer')).toBe('5');
      });

      it('유효하지 않은 role은 5로 처리하고 경고해야 함', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
        
        expect(mapRoleToRating('invalid')).toBe('5');
        expect(consoleSpy).toHaveBeenCalled();
        
        consoleSpy.mockRestore();
      });
    });
  });

  describe('Zod 스키마 검증', () => {
    describe('MemberSchema', () => {
      it('유효한 Member 데이터를 통과시켜야 함', () => {
        const validMember = {
          id: 1,
          project_id: 100,
          user_id: 200,
          role: 'owner' as const,
          rating: '1',
          created: '2025-09-03T10:00:00.000Z',
          modified: '2025-09-03T10:00:00.000Z',
        };

        expect(() => MemberSchema.parse(validMember)).not.toThrow();
        const parsed = MemberSchema.parse(validMember);
        expect(parsed.role).toBe('owner');
      });

      it('필수 필드 누락 시 검증 실패해야 함', () => {
        const invalidMember = {
          id: 1,
          project_id: 100,
          // user_id 누락
          role: 'owner' as const,
          created: '2025-09-03T10:00:00.000Z',
          modified: '2025-09-03T10:00:00.000Z',
        };

        expect(() => MemberSchema.parse(invalidMember)).toThrow();
      });

      it('유효하지 않은 role 값 시 검증 실패해야 함', () => {
        const invalidMember = {
          id: 1,
          project_id: 100,
          user_id: 200,
          role: 'invalid_role',
          created: '2025-09-03T10:00:00.000Z',
          modified: '2025-09-03T10:00:00.000Z',
        };

        expect(() => MemberSchema.parse(invalidMember)).toThrow();
      });
    });
  });

  describe('데이터 무결성 검사', () => {
    describe('validateMembers', () => {
      it('유효한 Member 배열을 올바르게 검증해야 함', () => {
        const validMembers = [
          {
            id: 1,
            project_id: 100,
            user_id: 200,
            role: 'owner',
            rating: '1',
            created: '2025-09-03T10:00:00.000Z',
            modified: '2025-09-03T10:00:00.000Z',
          },
        ];

        const result = checker.validateMembers(validMembers);
        
        expect(result).toHaveLength(1);
        expect(result[0].role).toBe('owner');
      });

      it('role-rating 불일치를 감지하고 경고해야 함', () => {
        const inconsistentMembers = [
          {
            id: 1,
            project_id: 100,
            user_id: 200,
            role: 'admin',  // rating '1'과 불일치
            rating: '1',    // owner여야 함
            created: '2025-09-03T10:00:00.000Z',
            modified: '2025-09-03T10:00:00.000Z',
          },
        ];

        const result = checker.validateMembers(inconsistentMembers);
        
        expect(result).toHaveLength(1);
        
        // 검증 오류가 기록되었는지 확인
        const report = checker.generateIntegrityReport(inconsistentMembers, [], [], []);
        const roleErrors = report.validation_errors.filter(
          e => e.table === 'members' && e.field === 'role'
        );
        expect(roleErrors).toHaveLength(1);
        expect(roleErrors[0].severity).toBe('warning');
      });

      it('유효하지 않은 Member 데이터에 대해 오류를 기록해야 함', () => {
        const invalidMembers = [
          {
            id: 1,
            project_id: 100,
            // user_id 누락
            role: 'owner',
            created: '2025-09-03T10:00:00.000Z',
            modified: '2025-09-03T10:00:00.000Z',
          },
        ];

        const result = checker.validateMembers(invalidMembers);
        
        expect(result).toHaveLength(0); // 유효하지 않은 데이터는 포함되지 않음
        
        // 오류가 기록되었는지 확인
        const report = checker.generateIntegrityReport(invalidMembers, [], [], []);
        const criticalErrors = report.validation_errors.filter(e => e.severity === 'critical');
        expect(criticalErrors.length).toBeGreaterThan(0);
      });
    });

    describe('checkOrphanedData', () => {
      it('존재하지 않는 project_id를 참조하는 고아 데이터를 감지해야 함', () => {
        const members: MemberData[] = [
          {
            id: 1,
            project_id: 999, // 존재하지 않는 프로젝트
            user_id: 200,
            role: 'owner',
            created: '2025-09-03T10:00:00.000Z',
            modified: '2025-09-03T10:00:00.000Z',
          },
        ];

        const projects: ProjectData[] = [
          {
            id: 100, // 999와 다름
            user_id: 200,
            name: 'Test Project',
            manager: 'Test Manager',
            consumer: 'Test Consumer',
            created: '2025-09-03T10:00:00.000Z',
            modified: '2025-09-03T10:00:00.000Z',
          },
        ];

        checker.checkOrphanedData(members, projects, [], []);
        
        const report = checker.generateIntegrityReport(
          [members[0]], // 타입 변환
          [projects[0]],
          [],
          []
        );

        const orphanedMembers = report.orphaned_data.filter(o => o.table === 'members');
        expect(orphanedMembers).toHaveLength(1);
        expect(orphanedMembers[0].reason).toContain('References non-existent project_id: 999');
        expect(orphanedMembers[0].cleanup_action).toBe('delete');
      });
    });

    describe('calculateQualityScore', () => {
      it('오류가 없으면 100점을 반환해야 함', () => {
        const score = checker.calculateQualityScore(100);
        expect(score).toBe(100);
      });

      it('오류가 있으면 점수를 적절히 차감해야 함', () => {
        // 임의로 오류 추가 (실제로는 validateMembers나 checkOrphanedData 결과)
        checker.validateMembers([
          {
            id: 1,
            // 누락된 필드들로 인한 검증 오류 유발
          }
        ]);

        const score = checker.calculateQualityScore(10);
        expect(score).toBeLessThan(100);
        expect(score).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('전체 무결성 검사 통합', () => {
    it('전체 워크플로우가 올바르게 작동해야 함', () => {
      const mockMembers = [
        {
          id: 1,
          project_id: 100,
          user_id: 200,
          role: 'owner',
          rating: '1',
          created: '2025-09-03T10:00:00.000Z',
          modified: '2025-09-03T10:00:00.000Z',
        },
      ];

      const mockProjects = [
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

      const report = checker.generateIntegrityReport(
        mockMembers,
        mockProjects,
        [],
        []
      );

      expect(report.timestamp).toBeDefined();
      expect(report.total_records_checked).toBe(2);
      expect(report.quality_score).toBeGreaterThan(90); // 문제없는 데이터는 높은 점수
      expect(report.validation_errors).toHaveLength(0);
      expect(report.orphaned_data).toHaveLength(0);
    });
  });
});

describe('편의 함수들', () => {
  describe('validateMemberData', () => {
    it('유효한 데이터를 통과시켜야 함', () => {
      const validData = {
        id: 1,
        project_id: 100,
        user_id: 200,
        role: 'owner' as const,
        created: '2025-09-03T10:00:00.000Z',
        modified: '2025-09-03T10:00:00.000Z',
      };

      expect(() => validateMemberData(validData)).not.toThrow();
    });

    it('유효하지 않은 데이터를 거부해야 함', () => {
      const invalidData = {
        id: 'invalid', // 숫자여야 함
      };

      expect(() => validateMemberData(invalidData)).toThrow();
    });
  });

  describe('validateProjectData', () => {
    it('유효한 프로젝트 데이터를 통과시켜야 함', () => {
      const validData = {
        id: 1,
        user_id: 200,
        name: 'Test Project',
        manager: 'Test Manager',
        consumer: 'Test Consumer',
        created: '2025-09-03T10:00:00.000Z',
        modified: '2025-09-03T10:00:00.000Z',
      };

      expect(() => validateProjectData(validData)).not.toThrow();
    });
  });
});

// 결정론적 테스트를 위한 고정 시드 데이터
export const FIXED_TEST_DATA = {
  members: [
    {
      id: 1,
      project_id: 100,
      user_id: 200,
      role: 'owner' as const,
      rating: '1',
      created: '2025-09-03T10:00:00.000Z',
      modified: '2025-09-03T10:00:00.000Z',
    },
    {
      id: 2,
      project_id: 100,
      user_id: 201,
      role: 'admin' as const,
      rating: '2',
      created: '2025-09-03T10:00:00.000Z',
      modified: '2025-09-03T10:00:00.000Z',
    },
  ],
  projects: [
    {
      id: 100,
      user_id: 200,
      name: 'Test Project',
      manager: 'Test Manager',
      consumer: 'Test Consumer',
      created: '2025-09-03T10:00:00.000Z',
      modified: '2025-09-03T10:00:00.000Z',
    },
  ],
  files: [],
  invites: [],
};