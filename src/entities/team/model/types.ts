import { z } from 'zod'

// 5-tier RBAC 시스템 - 프로젝트별 역할 정의
export enum ProjectRole {
  OWNER = 'owner',      // 프로젝트 소유자 - 모든 권한
  ADMIN = 'admin',      // 관리자 - 프로젝트 삭제 제외한 모든 권한  
  EDITOR = 'editor',    // 편집자 - 콘텐츠 편집, 파일 업로드/수정
  REVIEWER = 'reviewer', // 검토자 - 콘텐츠 조회, 피드백/댓글 작성
  VIEWER = 'viewer'     // 보기 권한만
}

// 권한 시스템
export enum Permission {
  // 프로젝트 관리
  DELETE_PROJECT = 'delete_project',
  EDIT_PROJECT_SETTINGS = 'edit_project_settings',
  
  // 멤버 관리
  MANAGE_MEMBERS = 'manage_members',
  INVITE_MEMBERS = 'invite_members',
  REMOVE_MEMBERS = 'remove_members',
  CHANGE_MEMBER_ROLES = 'change_member_roles',
  
  // 콘텐츠 관리
  EDIT_CONTENT = 'edit_content',
  UPLOAD_FILES = 'upload_files',
  DELETE_FILES = 'delete_files',
  
  // 리뷰 및 피드백
  REVIEW_CONTENT = 'review_content',
  APPROVE_CONTENT = 'approve_content',
  
  // 기본 권한
  VIEW_CONTENT = 'view_content',
  COMMENT = 'comment'
}

// 역할별 권한 매핑
export const RolePermission: Record<ProjectRole, Permission[]> = {
  [ProjectRole.OWNER]: [
    Permission.DELETE_PROJECT,
    Permission.EDIT_PROJECT_SETTINGS,
    Permission.MANAGE_MEMBERS,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.CHANGE_MEMBER_ROLES,
    Permission.EDIT_CONTENT,
    Permission.UPLOAD_FILES,
    Permission.DELETE_FILES,
    Permission.REVIEW_CONTENT,
    Permission.APPROVE_CONTENT,
    Permission.VIEW_CONTENT,
    Permission.COMMENT
  ],
  [ProjectRole.ADMIN]: [
    Permission.EDIT_PROJECT_SETTINGS,
    Permission.MANAGE_MEMBERS,
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.CHANGE_MEMBER_ROLES,
    Permission.EDIT_CONTENT,
    Permission.UPLOAD_FILES,
    Permission.DELETE_FILES,
    Permission.REVIEW_CONTENT,
    Permission.APPROVE_CONTENT,
    Permission.VIEW_CONTENT,
    Permission.COMMENT
  ],
  [ProjectRole.EDITOR]: [
    Permission.EDIT_CONTENT,
    Permission.UPLOAD_FILES,
    Permission.DELETE_FILES,
    Permission.VIEW_CONTENT,
    Permission.COMMENT
  ],
  [ProjectRole.REVIEWER]: [
    Permission.REVIEW_CONTENT,
    Permission.VIEW_CONTENT,
    Permission.COMMENT
  ],
  [ProjectRole.VIEWER]: [
    Permission.VIEW_CONTENT
  ]
}

// 역할 계층 구조 (높을수록 더 많은 권한)
export const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  [ProjectRole.OWNER]: 5,
  [ProjectRole.ADMIN]: 4,
  [ProjectRole.EDITOR]: 3,
  [ProjectRole.REVIEWER]: 2,
  [ProjectRole.VIEWER]: 1
}

// 권한 확인 헬퍼 함수
export const hasPermission = (role: ProjectRole, permission: Permission): boolean => {
  return RolePermission[role].includes(permission)
}

// 역할 계층 확인 함수
export const hasHigherRole = (role1: ProjectRole, role2: ProjectRole): boolean => {
  return ROLE_HIERARCHY[role1] > ROLE_HIERARCHY[role2]
}

// 팀 멤버 인터페이스
export interface TeamMember {
  id: string
  userId: string
  projectId: string
  role: ProjectRole
  email: string
  name: string
  avatar?: string
  joinedAt: string
  invitedBy: string
  status: 'active' | 'inactive' | 'suspended'
  lastActivity?: string
  metadata?: Record<string, any>
}

// 팀 초대 상태
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted', 
  DECLINED = 'declined',
  EXPIRED = 'expired',
  REVOKED = 'revoked'
}

// 팀 초대 인터페이스 (SendGrid 통합)
export interface TeamInvitation {
  id: string
  projectId: string
  email: string
  role: ProjectRole
  invitedBy: string
  status: InvitationStatus
  message?: string
  expiresAt: string
  createdAt: string
  acceptedAt?: string
  declinedAt?: string
  revokedAt?: string
  
  // SendGrid 통합 필드
  sendGridMessageId?: string
  emailTemplate?: string
  sendGridStatus?: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'failed'
  
  // 초대 토큰 (보안)
  inviteToken?: string
  
  metadata?: Record<string, any>
}

// Zod 스키마 정의
export const TeamMemberSchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  projectId: z.string().min(1),
  role: z.nativeEnum(ProjectRole),
  email: z.string().email(),
  name: z.string().min(1),
  avatar: z.string().url().optional(),
  joinedAt: z.string().datetime(),
  invitedBy: z.string().min(1),
  status: z.enum(['active', 'inactive', 'suspended']),
  lastActivity: z.string().datetime().optional(),
  metadata: z.record(z.any()).optional()
})

export const TeamInvitationSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  email: z.string().email(),
  role: z.nativeEnum(ProjectRole),
  invitedBy: z.string().min(1),
  status: z.nativeEnum(InvitationStatus),
  message: z.string().optional(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  acceptedAt: z.string().datetime().optional(),
  declinedAt: z.string().datetime().optional(),
  revokedAt: z.string().datetime().optional(),
  
  sendGridMessageId: z.string().optional(),
  emailTemplate: z.string().optional(),
  sendGridStatus: z.enum(['sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed']).optional(),
  
  inviteToken: z.string().optional(),
  metadata: z.record(z.any()).optional()
}).refine(
  (invitation) => {
    // 만료 검증
    const now = new Date()
    const expiresAt = new Date(invitation.expiresAt)
    return expiresAt > now
  },
  {
    message: 'Invitation has expired'
  }
)

// 검증 함수
export const validateTeamMember = (member: unknown): TeamMember => {
  return TeamMemberSchema.parse(member)
}

export const validateInvitation = (invitation: unknown): TeamInvitation => {
  return TeamInvitationSchema.parse(invitation)
}

// 팀 관리를 위한 명령/액션 타입
export interface InviteTeamMemberCommand {
  projectId: string
  email: string
  role: ProjectRole
  invitedBy: string
  message?: string
  expirationDays?: number
}

export interface AcceptInvitationCommand {
  invitationId: string
  userId: string
  inviteToken: string
}

export interface UpdateTeamMemberRoleCommand {
  projectId: string
  memberId: string
  newRole: ProjectRole
  updatedBy: string
}

export interface RemoveTeamMemberCommand {
  projectId: string
  memberId: string
  removedBy: string
  reason?: string
}

// 도메인 이벤트
export interface TeamMemberInvitedEvent {
  type: 'TEAM_MEMBER_INVITED'
  payload: {
    invitation: TeamInvitation
    project: { id: string; name: string }
  }
  timestamp: string
}

export interface TeamMemberJoinedEvent {
  type: 'TEAM_MEMBER_JOINED'
  payload: {
    member: TeamMember
    project: { id: string; name: string }
  }
  timestamp: string
}

export interface TeamMemberRoleChangedEvent {
  type: 'TEAM_MEMBER_ROLE_CHANGED'
  payload: {
    memberId: string
    projectId: string
    oldRole: ProjectRole
    newRole: ProjectRole
    changedBy: string
  }
  timestamp: string
}

export interface TeamMemberRemovedEvent {
  type: 'TEAM_MEMBER_REMOVED'
  payload: {
    memberId: string
    projectId: string
    removedBy: string
    reason?: string
  }
  timestamp: string
}

export type TeamDomainEvent = 
  | TeamMemberInvitedEvent
  | TeamMemberJoinedEvent 
  | TeamMemberRoleChangedEvent
  | TeamMemberRemovedEvent