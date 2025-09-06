import { z } from 'zod'

import { apiSlice } from '@/shared/api'

import type { Project, CreateProjectDto } from '../model/types'

// 팀원 초대 관련 타입 및 스키마
export const TeamInviteSchema = z.object({
  projectId: z.string(),
  emails: z.array(z.string().email('유효한 이메일 주소를 입력해주세요')),
  role: z.enum(['Owner', 'Admin', 'Editor', 'Reviewer', 'Viewer']),
  expiryDate: z.string().optional()
})

export type TeamInviteData = z.infer<typeof TeamInviteSchema>

export interface TeamInvite {
  id: string
  email: string
  role: string
  status: 'pending' | 'accepted' | 'expired' | 'revoked'
  expiryDate: string
  sentAt: string
  lastSentAt?: string | null
}

export interface TeamMember {
  id: string
  email: string
  name: string
  role: string
  joinedAt: string
  avatar?: string | null
}

// RBAC 권한 검증
const ROLE_PERMISSIONS = {
  Owner: ['create', 'read', 'update', 'delete', 'invite', 'manage_roles'],
  Admin: ['create', 'read', 'update', 'invite', 'manage_content'],
  Editor: ['create', 'read', 'update'],
  Reviewer: ['read', 'review'],
  Viewer: ['read']
} as const

export function hasPermission(userRole: string, permission: string): boolean {
  const permissions = ROLE_PERMISSIONS[userRole as keyof typeof ROLE_PERMISSIONS]
  return permissions?.includes(permission as any) ?? false
}

export const projectApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    createProject: builder.mutation<Project, CreateProjectDto>({
      query: (data) => ({
        url: '/projects',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Project']
    }),
    
    generateDefaultSchedule: builder.mutation<{
      data: {
        planning: { duration: number; startDate: string; endDate: string }
        shooting: { duration: number; startDate: string; endDate: string }
        editing: { duration: number; startDate: string; endDate: string }
      }
    }, void>({
      query: () => ({
        url: '/projects/default-schedule',
        method: 'POST',
      }),
    }),

    // 팀원 초대 (SendGrid 라우트 사용)
    inviteTeamMember: builder.mutation<{ 
      success: boolean; 
      message: string; 
      emailId?: string; 
      inviteLink?: string; 
    }, {
      projectId: string;
      invitation: {
        email: string;
        role: 'editor' | 'viewer' | 'admin';
        message?: string;
      };
    }>({
      queryFn: async (data) => {
        try {
          // InvitationService를 통한 초대 처리
          const { invitationService } = await import('@/shared/services/invitation');
          
          const result = await invitationService.sendInvitation({
            email: data.invitation.email,
            role: data.invitation.role,
            projectId: data.projectId,
            inviterName: '프로젝트 관리자', // TODO: 실제 초대자명 전달
            projectName: 'VRidge 프로젝트', // TODO: 실제 프로젝트명 전달
            message: data.invitation.message,
            expiresInDays: 7
          });

          if (!result.success) {
            return { 
              error: {
                status: 'CUSTOM_ERROR',
                error: result.message,
                data: undefined
              } as const
            };
          }

          return { 
            data: {
              success: result.success,
              message: result.message,
              inviteId: result.inviteId,
              canRetryAt: result.canRetryAt
            }
          };
        } catch (error) {
          console.error('RTK Query invite error:', error);
          return { 
            error: {
              status: 'CUSTOM_ERROR',
              error: '네트워크 오류가 발생했습니다.',
              data: undefined
            } as const
          };
        }
      },
      invalidatesTags: ['ProjectTeam']
    }),

    // 프로젝트 팀 조회 (초대 + 멤버)
    getProjectTeam: builder.query<{ invites: TeamInvite[]; members: TeamMember[] }, string>({
      query: (projectId) => `/projects/${projectId}/team`,
      providesTags: ['ProjectTeam']
    }),

    // 초대 재전송
    resendInvite: builder.mutation<{ success: boolean }, string>({
      query: (inviteId) => ({
        url: `/projects/invites/${inviteId}/resend`,
        method: 'POST'
      }),
      invalidatesTags: ['ProjectTeam']
    }),

    // 초대 철회
    revokeInvite: builder.mutation<{ success: boolean }, string>({
      query: (inviteId) => ({
        url: `/projects/invites/${inviteId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['ProjectTeam']
    }),

    // 초대 수락
    acceptInvite: builder.mutation<{ success: boolean }, { inviteId: string; token: string }>({
      query: ({ inviteId, token }) => ({
        url: `/projects/invites/${inviteId}/accept`,
        method: 'POST',
        body: { token }
      }),
      invalidatesTags: ['ProjectTeam']
    }),

    // 초대 거절
    declineInvite: builder.mutation<{ success: boolean }, { inviteId: string; token: string }>({
      query: ({ inviteId, token }) => ({
        url: `/projects/invites/${inviteId}/decline`,
        method: 'POST',
        body: { token }
      }),
      invalidatesTags: ['ProjectTeam']
    }),

    // 멤버 제거
    removeMember: builder.mutation<{ success: boolean }, { projectId: string; memberId: string }>({
      query: ({ projectId, memberId }) => ({
        url: `/projects/${projectId}/members/${memberId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['ProjectTeam']
    }),

    // 초대 링크 생성
    generateInviteLink: builder.mutation<{ token: string; url: string }, { projectId: string; role: string; expiryDays?: number }>({
      query: ({ projectId, role, expiryDays = 7 }) => ({
        url: `/projects/${projectId}/invite-link`,
        method: 'POST',
        body: { role, expiryDays }
      })
    })
  }),
})

export const { 
  useCreateProjectMutation,
  useGenerateDefaultScheduleMutation,
  useInviteTeamMemberMutation,
  useGetProjectTeamQuery,
  useResendInviteMutation,
  useRevokeInviteMutation,
  useAcceptInviteMutation,
  useDeclineInviteMutation,
  useRemoveMemberMutation,
  useGenerateInviteLinkMutation
} = projectApi