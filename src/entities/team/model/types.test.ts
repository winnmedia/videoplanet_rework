import { z } from 'zod'
import { 
  ProjectRole, 
  TeamInvitation, 
  TeamMember,
  InvitationStatus,
  Permission,
  RolePermission,
  validateTeamMember,
  validateInvitation,
  ROLE_HIERARCHY,
  hasPermission
} from './types'

describe('Team Entity Types', () => {
  describe('ProjectRole validation', () => {
    it('should validate owner role with full permissions', () => {
      const ownerRoleSchema = z.nativeEnum(ProjectRole)
      expect(() => ownerRoleSchema.parse(ProjectRole.OWNER)).not.toThrow()
      expect(ProjectRole.OWNER).toBe('owner')
    })

    it('should validate all 5-tier roles', () => {
      const expectedRoles = ['owner', 'admin', 'editor', 'reviewer', 'viewer']
      const actualRoles = Object.values(ProjectRole)
      expect(actualRoles).toEqual(expectedRoles)
      expect(actualRoles).toHaveLength(5)
    })

    it('should maintain role hierarchy order', () => {
      expect(ROLE_HIERARCHY[ProjectRole.OWNER]).toBe(5)
      expect(ROLE_HIERARCHY[ProjectRole.ADMIN]).toBe(4) 
      expect(ROLE_HIERARCHY[ProjectRole.EDITOR]).toBe(3)
      expect(ROLE_HIERARCHY[ProjectRole.REVIEWER]).toBe(2)
      expect(ROLE_HIERARCHY[ProjectRole.VIEWER]).toBe(1)
    })
  })

  describe('Permission system', () => {
    it('should validate owner has all permissions', () => {
      const ownerPermissions = RolePermission[ProjectRole.OWNER]
      const allPermissions = Object.values(Permission)
      
      expect(ownerPermissions).toEqual(expect.arrayContaining(allPermissions))
    })

    it('should validate admin cannot delete project', () => {
      const adminPermissions = RolePermission[ProjectRole.ADMIN]
      
      expect(adminPermissions).not.toContain(Permission.DELETE_PROJECT)
      expect(adminPermissions).toContain(Permission.MANAGE_MEMBERS)
    })

    it('should validate editor can edit but not manage members', () => {
      const editorPermissions = RolePermission[ProjectRole.EDITOR]
      
      expect(editorPermissions).toContain(Permission.EDIT_CONTENT)
      expect(editorPermissions).not.toContain(Permission.MANAGE_MEMBERS)
    })

    it('should validate reviewer can only review and view', () => {
      const reviewerPermissions = RolePermission[ProjectRole.REVIEWER]
      
      expect(reviewerPermissions).toContain(Permission.VIEW_CONTENT)
      expect(reviewerPermissions).toContain(Permission.REVIEW_CONTENT)
      expect(reviewerPermissions).not.toContain(Permission.EDIT_CONTENT)
    })

    it('should validate viewer has only view permission', () => {
      const viewerPermissions = RolePermission[ProjectRole.VIEWER]
      
      expect(viewerPermissions).toEqual([Permission.VIEW_CONTENT])
    })
  })

  describe('hasPermission function', () => {
    it('should allow owner all permissions', () => {
      expect(hasPermission(ProjectRole.OWNER, Permission.DELETE_PROJECT)).toBe(true)
      expect(hasPermission(ProjectRole.OWNER, Permission.MANAGE_MEMBERS)).toBe(true)
      expect(hasPermission(ProjectRole.OWNER, Permission.VIEW_CONTENT)).toBe(true)
    })

    it('should deny viewer edit permissions', () => {
      expect(hasPermission(ProjectRole.VIEWER, Permission.EDIT_CONTENT)).toBe(false)
      expect(hasPermission(ProjectRole.VIEWER, Permission.MANAGE_MEMBERS)).toBe(false)
      expect(hasPermission(ProjectRole.VIEWER, Permission.VIEW_CONTENT)).toBe(true)
    })

    it('should deny admin delete project permission', () => {
      expect(hasPermission(ProjectRole.ADMIN, Permission.DELETE_PROJECT)).toBe(false)
      expect(hasPermission(ProjectRole.ADMIN, Permission.MANAGE_MEMBERS)).toBe(true)
    })
  })

  describe('TeamMember validation', () => {
    it('should fail validation for missing required fields', () => {
      expect(() => validateTeamMember({} as any)).toThrow()
    })

    it('should pass validation for valid team member', () => {
      const validMember: TeamMember = {
        id: 'member-123',
        userId: 'user-456', 
        projectId: 'project-789',
        role: ProjectRole.EDITOR,
        email: 'test@example.com',
        name: 'Test User',
        joinedAt: new Date().toISOString(),
        invitedBy: 'user-owner',
        status: 'active'
      }
      
      expect(() => validateTeamMember(validMember)).not.toThrow()
    })

    it('should fail validation for invalid email', () => {
      const invalidMember = {
        id: 'member-123',
        userId: 'user-456',
        projectId: 'project-789', 
        role: ProjectRole.EDITOR,
        email: 'invalid-email',
        name: 'Test User',
        joinedAt: new Date().toISOString(),
        invitedBy: 'user-owner',
        status: 'active'
      }
      
      expect(() => validateTeamMember(invalidMember)).toThrow()
    })
  })

  describe('TeamInvitation validation', () => {
    it('should fail validation for expired invitation', () => {
      const expiredInvitation = {
        id: 'invite-123',
        projectId: 'project-789',
        email: 'test@example.com',
        role: ProjectRole.VIEWER,
        invitedBy: 'user-owner',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        createdAt: new Date().toISOString(),
        message: 'Join our project'
      }
      
      expect(() => validateInvitation(expiredInvitation)).toThrow(/expired/i)
    })

    it('should pass validation for valid pending invitation', () => {
      const validInvitation: TeamInvitation = {
        id: 'invite-123',
        projectId: 'project-789', 
        email: 'test@example.com',
        role: ProjectRole.VIEWER,
        invitedBy: 'user-owner',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days from now
        createdAt: new Date().toISOString(),
        message: 'Join our project'
      }
      
      expect(() => validateInvitation(validInvitation)).not.toThrow()
    })

    it('should validate invitation status transitions', () => {
      const pendingInvitation: TeamInvitation = {
        id: 'invite-123',
        projectId: 'project-789',
        email: 'test@example.com', 
        role: ProjectRole.VIEWER,
        invitedBy: 'user-owner',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
        createdAt: new Date().toISOString()
      }
      
      // Should be able to accept pending invitation
      const acceptedInvitation = {
        ...pendingInvitation,
        status: InvitationStatus.ACCEPTED,
        acceptedAt: new Date().toISOString()
      }
      
      expect(() => validateInvitation(acceptedInvitation)).not.toThrow()
    })
  })

  describe('SendGrid integration fields', () => {
    it('should validate invitation has sendgrid metadata', () => {
      const invitationWithSendGrid: TeamInvitation = {
        id: 'invite-123',
        projectId: 'project-789',
        email: 'test@example.com',
        role: ProjectRole.EDITOR,
        invitedBy: 'user-owner', 
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
        createdAt: new Date().toISOString(),
        message: 'Join our project',
        sendGridMessageId: 'sg-msg-12345',
        emailTemplate: 'team-invitation-v1'
      }
      
      expect(() => validateInvitation(invitationWithSendGrid)).not.toThrow()
      expect(invitationWithSendGrid.sendGridMessageId).toBeDefined()
      expect(invitationWithSendGrid.emailTemplate).toBeDefined()
    })
  })
})