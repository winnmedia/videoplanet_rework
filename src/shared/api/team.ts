import { z } from 'zod'
import { apiClient } from './client'
import type { TeamMember, TeamInvitation, ProjectRole } from '~/entities/team'

// Request/Response 스키마 정의
export const SendInvitationRequestSchema = z.object({
  projectId: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['owner', 'admin', 'editor', 'reviewer', 'viewer']),
  message: z.string().optional(),
  expirationDays: z.number().min(1).max(30).optional().default(7)
})

export const SendInvitationResponseSchema = z.object({
  invitation: z.object({
    id: z.string(),
    projectId: z.string(),
    email: z.string().email(),
    role: z.string(),
    invitedBy: z.string(),
    status: z.string(),
    expiresAt: z.string().datetime(),
    createdAt: z.string().datetime(),
    message: z.string().optional(),
    sendGridMessageId: z.string().optional(),
    emailTemplate: z.string().optional(),
    inviteToken: z.string().optional()
  }),
  sendGridStatus: z.enum(['sent', 'delivered', 'failed']).optional()
})

export const GetInvitationsResponseSchema = z.object({
  invitations: z.array(z.object({
    id: z.string(),
    projectId: z.string(),
    email: z.string().email(),
    role: z.string(),
    invitedBy: z.string(),
    status: z.string(),
    expiresAt: z.string().datetime(),
    createdAt: z.string().datetime(),
    acceptedAt: z.string().datetime().optional(),
    declinedAt: z.string().datetime().optional(),
    message: z.string().optional(),
    sendGridStatus: z.enum(['sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed']).optional(),
    inviteToken: z.string().optional()
  })),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    hasMore: z.boolean()
  })
})

export const AcceptInvitationRequestSchema = z.object({
  invitationId: z.string().min(1),
  inviteToken: z.string().min(1)
})

export const AcceptInvitationResponseSchema = z.object({
  member: z.object({
    id: z.string(),
    userId: z.string(),
    projectId: z.string(),
    role: z.string(),
    email: z.string().email(),
    name: z.string(),
    avatar: z.string().url().optional(),
    joinedAt: z.string().datetime(),
    invitedBy: z.string(),
    status: z.string()
  })
})

export const UpdateMemberRoleRequestSchema = z.object({
  memberId: z.string().min(1),
  role: z.enum(['admin', 'editor', 'reviewer', 'viewer']) // owner는 제외
})

export const RemoveMemberRequestSchema = z.object({
  memberId: z.string().min(1),
  reason: z.string().optional()
})

export const GetTeamMembersResponseSchema = z.object({
  members: z.array(z.object({
    id: z.string(),
    userId: z.string(),
    projectId: z.string(),
    role: z.string(),
    email: z.string().email(),
    name: z.string(),
    avatar: z.string().url().optional(),
    joinedAt: z.string().datetime(),
    invitedBy: z.string(),
    status: z.string(),
    lastActivity: z.string().datetime().optional(),
    permissions: z.array(z.string()).optional()
  })),
  pagination: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    hasMore: z.boolean()
  })
})

// SendGrid 웹훅 이벤트 스키마
export const SendGridWebhookEventSchema = z.object({
  email: z.string().email(),
  event: z.enum(['processed', 'delivered', 'open', 'click', 'bounce', 'dropped', 'spamreport', 'unsubscribe']),
  timestamp: z.number(),
  sg_event_id: z.string(),
  sg_message_id: z.string(),
  reason: z.string().optional(),
  status: z.string().optional(),
  url: z.string().optional()
})

// 타입 정의
export type SendInvitationRequest = z.infer<typeof SendInvitationRequestSchema>
export type SendInvitationResponse = z.infer<typeof SendInvitationResponseSchema>
export type GetInvitationsResponse = z.infer<typeof GetInvitationsResponseSchema>
export type AcceptInvitationRequest = z.infer<typeof AcceptInvitationRequestSchema>
export type AcceptInvitationResponse = z.infer<typeof AcceptInvitationResponseSchema>
export type UpdateMemberRoleRequest = z.infer<typeof UpdateMemberRoleRequestSchema>
export type RemoveMemberRequest = z.infer<typeof RemoveMemberRequestSchema>
export type GetTeamMembersResponse = z.infer<typeof GetTeamMembersResponseSchema>
export type SendGridWebhookEvent = z.infer<typeof SendGridWebhookEventSchema>

// 검증 함수
export const validateSendInvitationRequest = (data: unknown): SendInvitationRequest => {
  return SendInvitationRequestSchema.parse(data)
}

export const validateWebhookEvent = (data: unknown): SendGridWebhookEvent => {
  return SendGridWebhookEventSchema.parse(data)
}

// API 에러 타입
export interface TeamApiError {
  error: string
  message: string
  details?: Record<string, any>
}

// Team API 클라이언트
export const teamApi = {
  // 팀 초대 전송 (SendGrid 통합)
  async sendInvitation(request: SendInvitationRequest): Promise<SendInvitationResponse> {
    const validatedRequest = validateSendInvitationRequest(request)
    
    const response = await apiClient.post('/api/team/invitations', validatedRequest)
    
    if (!response.ok) {
      const errorData = await response.json() as TeamApiError
      throw new Error(errorData.message)
    }
    
    const data = await response.json()
    return SendInvitationResponseSchema.parse(data)
  },

  // 프로젝트별 초대 목록 조회
  async getInvitations(
    projectId: string, 
    params?: { page?: number; limit?: number; status?: string }
  ): Promise<GetInvitationsResponse> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.status) searchParams.set('status', params.status)
    
    const url = `/api/team/projects/${projectId}/invitations?${searchParams}`
    const response = await apiClient.get(url)
    
    if (!response.ok) {
      const errorData = await response.json() as TeamApiError
      throw new Error(errorData.message)
    }
    
    const data = await response.json()
    return GetInvitationsResponseSchema.parse(data)
  },

  // 초대 수락
  async acceptInvitation(request: AcceptInvitationRequest): Promise<AcceptInvitationResponse> {
    const validatedRequest = AcceptInvitationRequestSchema.parse(request)
    
    const response = await apiClient.post(
      `/api/team/invitations/${validatedRequest.invitationId}/accept`,
      validatedRequest
    )
    
    if (!response.ok) {
      const errorData = await response.json() as TeamApiError
      throw new Error(errorData.message)
    }
    
    const data = await response.json()
    return AcceptInvitationResponseSchema.parse(data)
  },

  // 초대 거절
  async declineInvitation(invitationId: string, inviteToken: string): Promise<void> {
    const response = await apiClient.post(
      `/api/team/invitations/${invitationId}/decline`,
      { inviteToken }
    )
    
    if (!response.ok) {
      const errorData = await response.json() as TeamApiError
      throw new Error(errorData.message)
    }
  },

  // 초대 철회 (프로젝트 소유자/관리자만)
  async revokeInvitation(invitationId: string): Promise<void> {
    const response = await apiClient.delete(`/api/team/invitations/${invitationId}`)
    
    if (!response.ok) {
      const errorData = await response.json() as TeamApiError
      throw new Error(errorData.message)
    }
  },

  // 팀 멤버 목록 조회
  async getTeamMembers(
    projectId: string,
    params?: { page?: number; limit?: number; role?: string }
  ): Promise<GetTeamMembersResponse> {
    const searchParams = new URLSearchParams()
    if (params?.page) searchParams.set('page', params.page.toString())
    if (params?.limit) searchParams.set('limit', params.limit.toString())
    if (params?.role) searchParams.set('role', params.role)
    
    const url = `/api/team/projects/${projectId}/members?${searchParams}`
    const response = await apiClient.get(url)
    
    if (!response.ok) {
      const errorData = await response.json() as TeamApiError
      throw new Error(errorData.message)
    }
    
    const data = await response.json()
    return GetTeamMembersResponseSchema.parse(data)
  },

  // 멤버 역할 변경
  async updateMemberRole(
    projectId: string,
    request: UpdateMemberRoleRequest
  ): Promise<AcceptInvitationResponse> {
    const validatedRequest = UpdateMemberRoleRequestSchema.parse(request)
    
    const response = await apiClient.patch(
      `/api/team/projects/${projectId}/members/${validatedRequest.memberId}/role`,
      validatedRequest
    )
    
    if (!response.ok) {
      const errorData = await response.json() as TeamApiError
      throw new Error(errorData.message)
    }
    
    const data = await response.json()
    return AcceptInvitationResponseSchema.parse(data)
  },

  // 멤버 제거
  async removeMember(projectId: string, request: RemoveMemberRequest): Promise<void> {
    const validatedRequest = RemoveMemberRequestSchema.parse(request)
    
    const response = await apiClient.delete(
      `/api/team/projects/${projectId}/members/${validatedRequest.memberId}`,
      { body: JSON.stringify(validatedRequest) }
    )
    
    if (!response.ok) {
      const errorData = await response.json() as TeamApiError
      throw new Error(errorData.message)
    }
  },

  // SendGrid 웹훅 처리
  async processWebhookEvent(events: SendGridWebhookEvent[]): Promise<void> {
    const validatedEvents = events.map(event => validateWebhookEvent(event))
    
    const response = await apiClient.post('/api/team/webhook/sendgrid', {
      events: validatedEvents
    })
    
    if (!response.ok) {
      const errorData = await response.json() as TeamApiError
      throw new Error(errorData.message)
    }
  }
}

// Convenience functions (테스트에서 사용)
export const inviteTeamMember = teamApi.sendInvitation
export const getTeamMembers = teamApi.getTeamMembers
export const removeTeamMember = teamApi.removeMember

// API 엔드포인트 상수
export const TEAM_API_ENDPOINTS = {
  SEND_INVITATION: '/api/team/invitations',
  GET_INVITATIONS: (projectId: string) => `/api/team/projects/${projectId}/invitations`,
  ACCEPT_INVITATION: (invitationId: string) => `/api/team/invitations/${invitationId}/accept`,
  DECLINE_INVITATION: (invitationId: string) => `/api/team/invitations/${invitationId}/decline`,
  REVOKE_INVITATION: (invitationId: string) => `/api/team/invitations/${invitationId}`,
  GET_TEAM_MEMBERS: (projectId: string) => `/api/team/projects/${projectId}/members`,
  UPDATE_MEMBER_ROLE: (projectId: string, memberId: string) => 
    `/api/team/projects/${projectId}/members/${memberId}/role`,
  REMOVE_MEMBER: (projectId: string, memberId: string) => 
    `/api/team/projects/${projectId}/members/${memberId}`,
  SENDGRID_WEBHOOK: '/api/team/webhook/sendgrid'
} as const