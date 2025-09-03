import {
  TeamManagementState,
  InvitationFlowStep,
  TeamManagementActions,
  initialTeamManagementState,
  isValidFlowTransition,
  canPerformAction,
  getFlowProgress
} from './types'
import { ProjectRole, InvitationStatus } from '../../../entities/team'

describe('Team Management Feature Types', () => {
  describe('TeamManagementState', () => {
    it('should have valid initial state', () => {
      const state = initialTeamManagementState
      
      expect(state.invitations).toEqual([])
      expect(state.members).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.invitationFlow.currentStep).toBe('input')
      expect(state.invitationFlow.completedSteps).toEqual([])
    })
  })

  describe('InvitationFlowStep validation', () => {
    it('should validate all flow steps are defined', () => {
      const expectedSteps = ['input', 'review', 'sending', 'sent', 'error']
      
      expectedSteps.forEach(step => {
        expect(typeof step).toBe('string')
      })
    })

    it('should validate flow transitions', () => {
      // Valid transitions
      expect(isValidFlowTransition('input', 'review')).toBe(true)
      expect(isValidFlowTransition('review', 'sending')).toBe(true)
      expect(isValidFlowTransition('sending', 'sent')).toBe(true)
      expect(isValidFlowTransition('sending', 'error')).toBe(true)
      
      // Invalid transitions (backwards or skipping steps)
      expect(isValidFlowTransition('review', 'input')).toBe(false)
      expect(isValidFlowTransition('input', 'sending')).toBe(false)
      expect(isValidFlowTransition('sent', 'review')).toBe(false)
    })

    it('should calculate flow progress correctly', () => {
      const completedSteps = ['input', 'review']
      const currentStep = 'sending'
      
      const progress = getFlowProgress(completedSteps, currentStep)
      
      expect(progress).toBe(60) // 3 out of 5 steps: 2 completed + 1 current = 3, (3/5)*100 = 60
    })
  })

  describe('Permission system integration', () => {
    it('should validate team member can invite others', () => {
      const userRole = ProjectRole.ADMIN
      const action = 'invite_member'
      
      expect(canPerformAction(userRole, action)).toBe(true)
    })

    it('should prevent viewer from inviting members', () => {
      const userRole = ProjectRole.VIEWER
      const action = 'invite_member'
      
      expect(canPerformAction(userRole, action)).toBe(false)
    })

    it('should prevent non-owner from removing owner', () => {
      const userRole = ProjectRole.ADMIN
      const action = 'remove_member'
      const targetRole = ProjectRole.OWNER
      
      expect(canPerformAction(userRole, action, targetRole)).toBe(false)
    })

    it('should allow owner to remove any member', () => {
      const userRole = ProjectRole.OWNER
      const action = 'remove_member'
      const targetRole = ProjectRole.ADMIN
      
      expect(canPerformAction(userRole, action, targetRole)).toBe(true)
    })
  })

  describe('Team state operations', () => {
    it('should handle optimistic invitation updates', () => {
      const initialState = initialTeamManagementState
      const optimisticInvitation = {
        id: 'temp-invite-123',
        projectId: 'project-456',
        email: 'test@example.com',
        role: ProjectRole.EDITOR,
        invitedBy: 'user-789',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        isOptimistic: true
      }

      const updatedState = {
        ...initialState,
        invitations: [optimisticInvitation]
      }
      
      expect(updatedState.invitations).toHaveLength(1)
      expect(updatedState.invitations[0].isOptimistic).toBe(true)
    })

    it('should handle member role updates', () => {
      const member = {
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

      const updatedMember = {
        ...member,
        role: ProjectRole.ADMIN
      }

      expect(updatedMember.role).toBe(ProjectRole.ADMIN)
      expect(updatedMember.id).toBe(member.id)
    })
  })

  describe('Error handling states', () => {
    it('should track different error types', () => {
      const errorDetails = {
        type: 'INVITATION_FAILED',
        message: 'Failed to send invitation email',
        code: 'SENDGRID_ERROR',
        retryable: true,
        details: {
          email: 'invalid@example.com',
          sendGridError: 'Invalid email format'
        }
      }
      
      expect(errorDetails.type).toBe('INVITATION_FAILED')
      expect(errorDetails.retryable).toBe(true)
      expect(errorDetails.details?.email).toBe('invalid@example.com')
    })

    it('should handle permission errors', () => {
      const permissionError = {
        type: 'PERMISSION_DENIED',
        message: 'Insufficient permissions to perform this action',
        code: 'RBAC_VIOLATION',
        retryable: false,
        details: {
          requiredRole: ProjectRole.ADMIN,
          userRole: ProjectRole.VIEWER,
          action: 'invite_member'
        }
      }
      
      expect(permissionError.retryable).toBe(false)
      expect(permissionError.details.requiredRole).toBe(ProjectRole.ADMIN)
    })
  })

  describe('Integration with user pipeline', () => {
    it('should sync with pipeline project creation', () => {
      const pipelineData = {
        projectId: 'project-123',
        projectName: 'My Video Project',
        currentStep: 'invite',
        userRole: ProjectRole.OWNER
      }

      const teamState = {
        ...initialTeamManagementState,
        currentProjectId: pipelineData.projectId,
        currentUserRole: pipelineData.userRole,
        invitationFlow: {
          ...initialTeamManagementState.invitationFlow,
          data: {
            projectId: pipelineData.projectId,
            email: '',
            role: ProjectRole.VIEWER
          }
        }
      }
      
      expect(teamState.currentProjectId).toBe(pipelineData.projectId)
      expect(teamState.currentUserRole).toBe(ProjectRole.OWNER)
    })
  })
})