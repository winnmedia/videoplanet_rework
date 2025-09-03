/**
 * 데이터 무결성 검사 및 고아 데이터 정리 시스템
 * CLAUDE.md Part 1.1 - 통합 개발 원칙 준수
 */

import { z } from 'zod';

// Zod 스키마 정의 - Members 데이터 검증
export const MemberSchema = z.object({
  id: z.number().int().positive(),
  project_id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  role: z.enum(['owner', 'admin', 'editor', 'reviewer', 'viewer']),
  rating: z.string().optional(), // 레거시 호환성
  created: z.string().datetime(),
  modified: z.string().datetime(),
});

// Project 데이터 검증 스키마
export const ProjectSchema = z.object({
  id: z.number().int().positive(),
  user_id: z.number().int().positive(),
  name: z.string().min(1).max(100),
  manager: z.string().min(1).max(50),
  consumer: z.string().min(1).max(50),
  description: z.string().optional(),
  color: z.string().nullable().optional(),
  created: z.string().datetime(),
  modified: z.string().datetime(),
});

// File 데이터 검증 스키마
export const FileSchema = z.object({
  id: z.number().int().positive(),
  project_id: z.number().int().positive(),
  files: z.string().min(1), // 파일 경로
  created: z.string().datetime(),
  modified: z.string().datetime(),
});

// ProjectInvite 데이터 검증 스키마
export const ProjectInviteSchema = z.object({
  id: z.number().int().positive(),
  project_id: z.number().int().positive(),
  inviter_id: z.number().int().positive().nullable(),
  email: z.string().email().max(100),
  role: z.enum(['owner', 'admin', 'editor', 'reviewer', 'viewer']),
  status: z.enum(['pending', 'accepted', 'declined', 'expired', 'cancelled']),
  token: z.string().nullable(),
  expires_at: z.string().datetime().nullable(),
  accepted_at: z.string().datetime().nullable().optional(),
  declined_at: z.string().datetime().nullable().optional(),
  created: z.string().datetime(),
  modified: z.string().datetime(),
});

// 전체 데이터 무결성 검사 결과
export const DataIntegrityReportSchema = z.object({
  timestamp: z.string().datetime(),
  total_records_checked: z.number().int().nonnegative(),
  validation_errors: z.array(z.object({
    table: z.string(),
    record_id: z.number().int(),
    field: z.string().optional(),
    error: z.string(),
    severity: z.enum(['critical', 'warning', 'info']),
  })),
  orphaned_data: z.array(z.object({
    table: z.string(),
    record_id: z.number().int(),
    reason: z.string(),
    cleanup_action: z.enum(['delete', 'migrate', 'flag']),
  })),
  migration_recommendations: z.array(z.object({
    table: z.string(),
    field_from: z.string(),
    field_to: z.string(),
    mapping_rule: z.string(),
    affected_records: z.number().int().nonnegative(),
  })),
  quality_score: z.number().min(0).max(100),
});

export type MemberData = z.infer<typeof MemberSchema>;
export type ProjectData = z.infer<typeof ProjectSchema>;
export type FileData = z.infer<typeof FileSchema>;
export type ProjectInviteData = z.infer<typeof ProjectInviteSchema>;
export type DataIntegrityReport = z.infer<typeof DataIntegrityReportSchema>;

// Rating → Role 매핑 함수
export const mapRatingToRole = (rating: string | number | null | undefined): string => {
  // null/undefined 처리
  if (rating === null || rating === undefined) {
    return 'viewer'; // 기본값
  }

  // 숫자형 변환
  const ratingNum = typeof rating === 'string' ? parseInt(rating, 10) : rating;
  
  // 매핑 규칙 (보고서 기준)
  switch (ratingNum) {
    case 1:
      return 'owner';
    case 2:
      return 'admin';
    case 3:
      return 'editor';
    case 4:
      return 'reviewer';
    case 5:
      return 'viewer';
    default:
      console.warn(`Unknown rating value: ${rating}, defaulting to 'viewer'`);
      return 'viewer';
  }
};

// Role → Rating 역매핑 함수 (레거시 호환성)
export const mapRoleToRating = (role: string): string => {
  switch (role) {
    case 'owner':
      return '1';
    case 'admin':
      return '2';
    case 'editor':
      return '3';
    case 'reviewer':
      return '4';
    case 'viewer':
      return '5';
    default:
      console.warn(`Unknown role value: ${role}, defaulting to '5' (viewer)`);
      return '5';
  }
};

// 데이터 무결성 검사 클래스
export class DataIntegrityChecker {
  private validationErrors: DataIntegrityReport['validation_errors'] = [];
  private orphanedData: DataIntegrityReport['orphaned_data'] = [];
  private migrationRecommendations: DataIntegrityReport['migration_recommendations'] = [];

  /**
   * Members 데이터 검증
   */
  validateMembers(members: unknown[]): MemberData[] {
    const validMembers: MemberData[] = [];

    members.forEach((member, index) => {
      try {
        const validatedMember = MemberSchema.parse(member);
        
        // rating → role 불일치 검사
        if (validatedMember.rating) {
          const expectedRole = mapRatingToRole(validatedMember.rating);
          if (expectedRole !== validatedMember.role) {
            this.validationErrors.push({
              table: 'members',
              record_id: validatedMember.id,
              field: 'role',
              error: `Role mismatch: role='${validatedMember.role}', expected from rating='${expectedRole}'`,
              severity: 'warning',
            });
            
            // 마이그레이션 권고사항 추가
            this.migrationRecommendations.push({
              table: 'members',
              field_from: 'rating',
              field_to: 'role', 
              mapping_rule: `${validatedMember.rating} → ${expectedRole}`,
              affected_records: 1,
            });
          }
        }

        validMembers.push(validatedMember);
      } catch (error) {
        this.validationErrors.push({
          table: 'members',
          record_id: (member as any)?.id || index,
          error: error instanceof Error ? error.message : 'Validation failed',
          severity: 'critical',
        });
      }
    });

    return validMembers;
  }

  /**
   * 고아 데이터 검사 (외래키 무결성)
   */
  checkOrphanedData(
    members: MemberData[],
    projects: ProjectData[],
    files: FileData[],
    invites: ProjectInviteData[]
  ): void {
    const projectIds = new Set(projects.map(p => p.id));
    const userIds = new Set(projects.map(p => p.user_id)); // 실제로는 User 테이블에서 가져와야 함

    // 고아 Members 검사 (존재하지 않는 project_id 참조)
    members.forEach(member => {
      if (!projectIds.has(member.project_id)) {
        this.orphanedData.push({
          table: 'members',
          record_id: member.id,
          reason: `References non-existent project_id: ${member.project_id}`,
          cleanup_action: 'delete',
        });
      }
    });

    // 고아 Files 검사
    files.forEach(file => {
      if (!projectIds.has(file.project_id)) {
        this.orphanedData.push({
          table: 'files',
          record_id: file.id,
          reason: `References non-existent project_id: ${file.project_id}`,
          cleanup_action: 'delete',
        });
      }
    });

    // 고아 ProjectInvites 검사
    invites.forEach(invite => {
      if (!projectIds.has(invite.project_id)) {
        this.orphanedData.push({
          table: 'project_invites',
          record_id: invite.id,
          reason: `References non-existent project_id: ${invite.project_id}`,
          cleanup_action: 'delete',
        });
      }
    });
  }

  /**
   * 데이터 품질 점수 계산
   */
  calculateQualityScore(totalRecords: number): number {
    const criticalErrors = this.validationErrors.filter(e => e.severity === 'critical').length;
    const warnings = this.validationErrors.filter(e => e.severity === 'warning').length;
    const orphans = this.orphanedData.length;

    // 품질 점수 공식 (100점 만점)
    const criticalPenalty = (criticalErrors / totalRecords) * 50; // 심각한 오류 50% 가중치
    const warningPenalty = (warnings / totalRecords) * 20; // 경고 20% 가중치  
    const orphanPenalty = (orphans / totalRecords) * 30; // 고아 데이터 30% 가중치

    const qualityScore = Math.max(0, 100 - criticalPenalty - warningPenalty - orphanPenalty);
    return Math.round(qualityScore * 100) / 100; // 소수점 둘째 자리까지
  }

  /**
   * 전체 무결성 검사 실행 및 보고서 생성
   */
  generateIntegrityReport(
    members: unknown[],
    projects: unknown[],
    files: unknown[],
    invites: unknown[]
  ): DataIntegrityReport {
    // 검사 초기화
    this.validationErrors = [];
    this.orphanedData = [];
    this.migrationRecommendations = [];

    // 각 테이블 검증
    const validMembers = this.validateMembers(members);
    const validProjects = projects.map(p => ProjectSchema.parse(p));
    const validFiles = files.map(f => FileSchema.parse(f));
    const validInvites = invites.map(i => ProjectInviteSchema.parse(i));

    // 고아 데이터 검사
    this.checkOrphanedData(validMembers, validProjects, validFiles, validInvites);

    const totalRecords = members.length + projects.length + files.length + invites.length;
    const qualityScore = this.calculateQualityScore(totalRecords);

    return {
      timestamp: new Date().toISOString(),
      total_records_checked: totalRecords,
      validation_errors: this.validationErrors,
      orphaned_data: this.orphanedData,
      migration_recommendations: this.migrationRecommendations,
      quality_score: qualityScore,
    };
  }
}

// 싱글톤 인스턴스 내보내기
export const dataIntegrityChecker = new DataIntegrityChecker();

// 편의 함수들
export const validateMemberData = (data: unknown): MemberData => MemberSchema.parse(data);
export const validateProjectData = (data: unknown): ProjectData => ProjectSchema.parse(data);
export const validateFileData = (data: unknown): FileData => FileSchema.parse(data);
export const validateProjectInviteData = (data: unknown): ProjectInviteData => ProjectInviteSchema.parse(data);