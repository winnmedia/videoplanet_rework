import { z } from 'zod'
import {
  teamApi,
  SendInvitationRequest,
  SendInvitationResponse,
  GetInvitationsResponse,
  AcceptInvitationRequest,
  UpdateMemberRoleRequest,
  RemoveMemberRequest,
  GetTeamMembersResponse,
  SendGridWebhookEvent,
  validateSendInvitationRequest,
  validateWebhookEvent
} from './team'

// Mock fetch 
global.fetch = jest.fn()
const mockFetch = fetch as jest.MockedFunction<typeof fetch>

describe('Team API Contract', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendInvitation', () => {
    it('should send invitation with SendGrid integration', async () => {
      const mockResponse: SendInvitationResponse = {
        invitation: {
          id: 'invite-123',
          projectId: 'project-456',
          email: 'test@example.com',
          role: 'editor',
          invitedBy: 'user-789',
          status: 'pending',
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          sendGridMessageId: 'sg-msg-12345',
          emailTemplate: 'team-invitation-v1'
        },
        sendGridStatus: 'sent'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      } as Response)

      const request: SendInvitationRequest = {
        projectId: 'project-456',
        email: 'test@example.com',
        role: 'editor',
        message: 'Join our video project!'
      }

      const result = await teamApi.sendInvitation(request)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/team/invitations'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"projectId":"project-456"')
        })
      )

      expect(result.invitation.sendGridMessageId).toBeDefined()
      expect(result.sendGridStatus).toBe('sent')
    })

    it('should fail validation for invalid email', async () => {
      const invalidRequest = {
        projectId: 'project-456',
        email: 'invalid-email',
        role: 'editor'
      }

      expect(() => validateSendInvitationRequest(invalidRequest)).toThrow()
    })

    it('should fail validation for invalid role', async () => {
      const invalidRequest = {
        projectId: 'project-456',
        email: 'test@example.com', 
        role: 'invalid-role' as any
      }

      expect(() => validateSendInvitationRequest(invalidRequest)).toThrow()
    })
  })

  describe('getInvitations', () => {
    it('should fetch project invitations with pagination', async () => {
      const mockResponse: GetInvitationsResponse = {
        invitations: [
          {
            id: 'invite-123',
            projectId: 'project-456',
            email: 'test1@example.com',
            role: 'editor',
            invitedBy: 'user-789',
            status: 'pending',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            sendGridStatus: 'delivered'
          },
          {
            id: 'invite-124',
            projectId: 'project-456',
            email: 'test2@example.com',
            role: 'viewer',
            invitedBy: 'user-789',
            status: 'accepted',
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            acceptedAt: new Date().toISOString()
          }
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 20,
          hasMore: false
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      } as Response)

      const result = await teamApi.getInvitations('project-456')

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/team/projects/project-456/invitations'),
        expect.objectContaining({
          method: 'GET'
        })
      )

      expect(result.invitations).toHaveLength(2)
      expect(result.pagination.total).toBe(2)
    })
  })

  describe('acceptInvitation', () => {
    it('should accept invitation and create team member', async () => {
      const mockResponse = {
        member: {
          id: 'member-123',
          userId: 'user-456',
          projectId: 'project-789',
          role: 'editor',
          email: 'test@example.com',
          name: 'Test User',
          joinedAt: new Date().toISOString(),
          invitedBy: 'user-owner',
          status: 'active'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => mockResponse
      } as Response)

      const request: AcceptInvitationRequest = {
        invitationId: 'invite-123',
        inviteToken: 'secure-token-123'
      }

      const result = await teamApi.acceptInvitation(request)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/team/invitations/invite-123/accept'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(request)
        })
      )

      expect(result.member.status).toBe('active')
    })

    it('should handle expired invitation error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 410,
        json: async () => ({
          error: 'INVITATION_EXPIRED',
          message: 'This invitation has expired'
        })
      } as Response)

      const request: AcceptInvitationRequest = {
        invitationId: 'invite-expired',
        inviteToken: 'token-123'
      }

      await expect(teamApi.acceptInvitation(request))
        .rejects.toThrow('This invitation has expired')
    })
  })

  describe('updateMemberRole', () => {
    it('should update team member role with permission check', async () => {
      const mockResponse = {
        member: {
          id: 'member-123',
          userId: 'user-456',
          projectId: 'project-789',
          role: 'admin', // Updated from editor
          email: 'test@example.com',
          name: 'Test User',
          joinedAt: new Date().toISOString(),
          invitedBy: 'user-owner',
          status: 'active'
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      } as Response)

      const request: UpdateMemberRoleRequest = {
        memberId: 'member-123',
        role: 'admin'
      }

      const result = await teamApi.updateMemberRole('project-789', request)

      expect(result.member.role).toBe('admin')
    })

    it('should reject role update without permission', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'INSUFFICIENT_PERMISSIONS',
          message: 'Only owners and admins can change member roles'
        })
      } as Response)

      const request: UpdateMemberRoleRequest = {
        memberId: 'member-123',
        role: 'admin'
      }

      await expect(teamApi.updateMemberRole('project-789', request))
        .rejects.toThrow('Only owners and admins can change member roles')
    })
  })

  describe('SendGrid webhook events', () => {
    it('should validate processed webhook event', () => {
      const webhookEvent: SendGridWebhookEvent = {
        email: 'test@example.com',
        event: 'delivered',
        timestamp: Math.floor(Date.now() / 1000),
        sg_event_id: 'sg-event-123',
        sg_message_id: 'sg-msg-12345'
      }

      expect(() => validateWebhookEvent(webhookEvent)).not.toThrow()
    })

    it('should handle bounced email webhook', () => {
      const bouncedEvent: SendGridWebhookEvent = {
        email: 'invalid@example.com',
        event: 'bounce',
        timestamp: Math.floor(Date.now() / 1000),
        sg_event_id: 'sg-event-124',
        sg_message_id: 'sg-msg-12345',
        reason: 'Invalid email address'
      }

      expect(() => validateWebhookEvent(bouncedEvent)).not.toThrow()
      expect(bouncedEvent.reason).toBeDefined()
    })

    it('should fail validation for invalid webhook event', () => {
      const invalidEvent = {
        email: 'test@example.com',
        event: 'invalid_event',
        timestamp: 'invalid_timestamp'
      }

      expect(() => validateWebhookEvent(invalidEvent)).toThrow()
    })
  })

  describe('getTeamMembers', () => {
    it('should fetch team members with roles and permissions', async () => {
      const mockResponse: GetTeamMembersResponse = {
        members: [
          {
            id: 'member-123',
            userId: 'user-456',
            projectId: 'project-789',
            role: 'owner',
            email: 'owner@example.com',
            name: 'Project Owner',
            joinedAt: new Date().toISOString(),
            invitedBy: 'system',
            status: 'active',
            permissions: ['delete_project', 'manage_members', 'edit_content']
          },
          {
            id: 'member-124',
            userId: 'user-457',
            projectId: 'project-789',
            role: 'editor',
            email: 'editor@example.com',
            name: 'Content Editor',
            joinedAt: new Date().toISOString(),
            invitedBy: 'user-456',
            status: 'active',
            permissions: ['edit_content', 'upload_files']
          }
        ],
        pagination: {
          total: 2,
          page: 1,
          limit: 20,
          hasMore: false
        }
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      } as Response)

      const result = await teamApi.getTeamMembers('project-789')

      expect(result.members).toHaveLength(2)
      expect(result.members[0].role).toBe('owner')
      expect(result.members[0].permissions).toContain('delete_project')
    })
  })

  describe('removeMember', () => {
    it('should remove team member', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 204
      } as Response)

      const request: RemoveMemberRequest = {
        memberId: 'member-123',
        reason: 'Left the project'
      }

      await teamApi.removeMember('project-789', request)

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/team/projects/project-789/members/member-123'),
        expect.objectContaining({
          method: 'DELETE',
          body: JSON.stringify(request)
        })
      )
    })

    it('should prevent removing project owner', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          error: 'CANNOT_REMOVE_OWNER',
          message: 'Project owner cannot be removed'
        })
      } as Response)

      const request: RemoveMemberRequest = {
        memberId: 'owner-123'
      }

      await expect(teamApi.removeMember('project-789', request))
        .rejects.toThrow('Project owner cannot be removed')
    })
  })
})