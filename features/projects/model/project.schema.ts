import { z } from 'zod';

// 권한 레벨 정의
export const ProjectPermissionSchema = z.enum(['owner', 'editor', 'viewer']);
export type ProjectPermission = z.infer<typeof ProjectPermissionSchema>;

// 프로젝트 멤버 스키마
export const ProjectMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  email: z.string().email(),
  name: z.string(),
  avatarUrl: z.string().url().nullable(),
  permission: ProjectPermissionSchema,
  joinedAt: z.string().datetime(),
  isActive: z.boolean().default(true),
});
export type ProjectMember = z.infer<typeof ProjectMemberSchema>;

// 프로젝트 상태 스키마
export const ProjectStatusSchema = z.enum(['active', 'archived', 'deleted']);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

// 프로젝트 스키마
export const ProjectSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(100),
  description: z.string().max(500).nullable(),
  thumbnailUrl: z.string().url().nullable(),
  status: ProjectStatusSchema.default('active'),
  members: z.array(ProjectMemberSchema).default([]),
  memberCount: z.number().int().min(0).default(0),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastActivityAt: z.string().datetime().nullable(),
  ownerId: z.string(),
  tags: z.array(z.string()).default([]),
  settings: z.object({
    isPublic: z.boolean().default(false),
    allowComments: z.boolean().default(true),
    allowDownloads: z.boolean().default(false),
    maxFileSize: z.number().int().positive().default(104857600), // 100MB in bytes
    allowedFileTypes: z.array(z.string()).default(['mp4', 'mov', 'avi', 'mkv']),
  }).default({}),
});
export type Project = z.infer<typeof ProjectSchema>;

// 프로젝트 생성 스키마 (3단계 폼)
export const CreateProjectStep1Schema = z.object({
  title: z.string().min(1, '프로젝트 제목을 입력해주세요').max(100, '제목은 100자 이하로 입력해주세요'),
  description: z.string().max(500, '설명은 500자 이하로 입력해주세요').optional(),
  tags: z.array(z.string()).max(10, '태그는 최대 10개까지 추가할 수 있습니다').optional(),
});
export type CreateProjectStep1 = z.infer<typeof CreateProjectStep1Schema>;

export const CreateProjectStep2Schema = z.object({
  inviteEmails: z.array(z.string().email('올바른 이메일 형식이 아닙니다'))
    .max(20, '한 번에 최대 20명까지 초대할 수 있습니다')
    .optional(),
  defaultPermission: ProjectPermissionSchema.default('viewer'),
});
export type CreateProjectStep2 = z.infer<typeof CreateProjectStep2Schema>;

export const CreateProjectStep3Schema = z.object({
  isPublic: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  allowDownloads: z.boolean().default(false),
  maxFileSize: z.number().int().positive().default(104857600),
  allowedFileTypes: z.array(z.string()).min(1, '최소 1개 이상의 파일 형식을 선택해주세요'),
});
export type CreateProjectStep3 = z.infer<typeof CreateProjectStep3Schema>;

// 전체 프로젝트 생성 요청 스키마
export const CreateProjectRequestSchema = CreateProjectStep1Schema
  .merge(CreateProjectStep2Schema)
  .merge(CreateProjectStep3Schema);
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

// 프로젝트 업데이트 스키마
export const UpdateProjectSchema = ProjectSchema.partial().omit({
  id: true,
  createdAt: true,
  ownerId: true,
});
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

// 멤버 초대 스키마
export const InviteMembersSchema = z.object({
  projectId: z.string(),
  emails: z.array(z.string().email()).min(1).max(20),
  permission: ProjectPermissionSchema.default('viewer'),
  message: z.string().max(500).optional(),
});
export type InviteMembers = z.infer<typeof InviteMembersSchema>;

// 멤버 권한 업데이트 스키마
export const UpdateMemberPermissionSchema = z.object({
  projectId: z.string(),
  memberId: z.string(),
  permission: ProjectPermissionSchema,
});
export type UpdateMemberPermission = z.infer<typeof UpdateMemberPermissionSchema>;

// 프로젝트 필터 스키마
export const ProjectFilterSchema = z.object({
  search: z.string().optional(),
  status: ProjectStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  ownerId: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
  sortBy: z.enum(['updatedAt', 'createdAt', 'title', 'memberCount']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().positive().max(100).default(12),
});
export type ProjectFilter = z.infer<typeof ProjectFilterSchema>;

// API 응답 스키마
export const ProjectListResponseSchema = z.object({
  data: z.array(ProjectSchema),
  total: z.number().int().min(0),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});
export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>;