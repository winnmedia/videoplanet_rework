import { configureStore } from '@reduxjs/toolkit'
import teamManagementSlice, {
  startInvitationFlow,
  updateInvitationData,
  advanceInvitationStep,
  inviteMemberOptimistic,
  inviteMemberSuccess,
  inviteMemberFailure,
  updateMemberRoleOptimistic,
  removeMemberOptimistic,
  loadTeamMembersSuccess,
  clearError,
  resetInvitationFlow
} from './teamManagementSlice'
import { ProjectRole, InvitationStatus } from '../../../entities/team'

const createTestStore = () => configureStore({
  reducer: {
    teamManagement: teamManagementSlice
  }
})

describe('Team Management Slice', () => {
  describe('initial state', () => {
    it('should have correct initial state', () => {
      const store = createTestStore()
      const state = store.getState().teamManagement
      
      expect(state.invitations).toEqual([])
      expect(state.members).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.invitationFlow.currentStep).toBe('input')
      expect(state.invitationFlow.data).toBeNull()
    })
  })

  describe('invitation flow', () => {
    it('should start invitation flow', () => {
      const store = createTestStore()
      
      store.dispatch(startInvitationFlow({ projectId: 'project-123' }))
      const state = store.getState().teamManagement
      
      expect(state.invitationFlow.currentStep).toBe('input')
      expect(state.invitationFlow.data?.projectId).toBe('project-123')
      expect(state.invitationFlow.isLoading).toBe(false)
    })

    it('should update invitation data', () => {
      const store = createTestStore()
      
      store.dispatch(startInvitationFlow({ projectId: 'project-123' }))
      store.dispatch(updateInvitationData({
        email: 'test@example.com',
        role: ProjectRole.EDITOR,
        message: 'Join our project!'
      }))
      
      const state = store.getState().teamManagement
      expect(state.invitationFlow.data?.email).toBe('test@example.com')
      expect(state.invitationFlow.data?.role).toBe(ProjectRole.EDITOR)
      expect(state.invitationFlow.data?.message).toBe('Join our project!')
    })

    it('should advance invitation step', () => {
      const store = createTestStore()
      
      store.dispatch(startInvitationFlow({ projectId: 'project-123' }))
      store.dispatch(advanceInvitationStep({ step: 'review' }))
      
      const state = store.getState().teamManagement
      expect(state.invitationFlow.currentStep).toBe('review')
      expect(state.invitationFlow.completedSteps.includes('input')).toBe(true)
    })

    it('should reset invitation flow', () => {
      const store = createTestStore()
      
      store.dispatch(startInvitationFlow({ projectId: 'project-123' }))
      store.dispatch(updateInvitationData({ email: 'test@example.com' }))
      store.dispatch(advanceInvitationStep({ step: 'review' }))
      store.dispatch(resetInvitationFlow())
      
      const state = store.getState().teamManagement
      expect(state.invitationFlow.currentStep).toBe('input')
      expect(state.invitationFlow.data).toBeNull()
      expect(state.invitationFlow.completedSteps.length).toBe(0)
    })
  })

  describe('invite member operations', () => {
    it('should handle optimistic invitation', () => {
      const store = createTestStore()
      
      const optimisticInvitation = {
        id: 'temp-123',
        projectId: 'project-456',
        email: 'test@example.com',
        role: ProjectRole.EDITOR,
        invitedBy: 'user-789',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        isOptimistic: true
      }
      
      store.dispatch(inviteMemberOptimistic(optimisticInvitation))
      const state = store.getState().teamManagement
      
      expect(state.invitations).toHaveLength(1)
      expect(state.invitations[0].isOptimistic).toBe(true)
      expect(state.invitations[0].email).toBe('test@example.com')
      expect(state.invitationFlow.currentStep).toBe('sending')
    })

    it('should replace optimistic invitation with real one on success', () => {
      const store = createTestStore()
      
      // Add optimistic invitation
      const optimisticInvitation = {
        id: 'temp-123',
        projectId: 'project-456',
        email: 'test@example.com',
        role: ProjectRole.EDITOR,
        invitedBy: 'user-789',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        isOptimistic: true
      }
      
      store.dispatch(inviteMemberOptimistic(optimisticInvitation))
      
      // Replace with real invitation
      const realInvitation = {
        ...optimisticInvitation,
        id: 'real-456',
        sendGridMessageId: 'sg-msg-789',
        isOptimistic: false
      }
      
      store.dispatch(inviteMemberSuccess({
        tempId: 'temp-123',
        invitation: realInvitation
      }))
      
      const state = store.getState().teamManagement
      expect(state.invitations).toHaveLength(1)
      expect(state.invitations[0].id).toBe('real-456')
      expect(state.invitations[0].isOptimistic).toBe(false)
      expect(state.invitations[0].sendGridMessageId).toBe('sg-msg-789')
      expect(state.invitationFlow.currentStep).toBe('sent')
    })

    it('should handle invitation failure', () => {
      const store = createTestStore()
      
      const optimisticInvitation = {
        id: 'temp-123',
        projectId: 'project-456',
        email: 'test@example.com',
        role: ProjectRole.EDITOR,
        invitedBy: 'user-789',
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        isOptimistic: true
      }
      
      store.dispatch(inviteMemberOptimistic(optimisticInvitation))
      store.dispatch(inviteMemberFailure({
        tempId: 'temp-123',
        error: {
          type: 'INVITATION_FAILED',
          message: 'Failed to send email',
          code: 'SENDGRID_ERROR',
          retryable: true
        }
      }))
      
      const state = store.getState().teamManagement
      expect(state.invitations).toHaveLength(0) // Optimistic invitation removed
      expect(state.error?.type).toBe('INVITATION_FAILED')
      expect(state.invitationFlow.currentStep).toBe('error')
    })
  })

  describe('member management', () => {
    it('should load team members', () => {
      const store = createTestStore()
      
      const members = [
        {
          id: 'member-123',
          userId: 'user-456',
          projectId: 'project-789',
          role: ProjectRole.OWNER,
          email: 'owner@example.com',
          name: 'Project Owner',
          joinedAt: new Date().toISOString(),
          invitedBy: 'system',
          status: 'active'
        },
        {
          id: 'member-124',
          userId: 'user-457',
          projectId: 'project-789',
          role: ProjectRole.EDITOR,
          email: 'editor@example.com',
          name: 'Content Editor',
          joinedAt: new Date().toISOString(),
          invitedBy: 'user-456',
          status: 'active'
        }
      ]
      
      store.dispatch(loadTeamMembersSuccess({
        members,
        pagination: { page: 1, limit: 20, total: 2, hasMore: false }
      }))
      
      const state = store.getState().teamManagement
      expect(state.members).toHaveLength(2)
      expect(state.members[0].role).toBe(ProjectRole.OWNER)
      expect(state.pagination.total).toBe(2)
    })

    it('should handle optimistic member role update', () => {
      const store = createTestStore()
      
      // First load a member
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
      
      store.dispatch(loadTeamMembersSuccess({
        members: [member],
        pagination: { page: 1, limit: 20, total: 1, hasMore: false }
      }))
      
      // Update role optimistically
      store.dispatch(updateMemberRoleOptimistic({
        memberId: 'member-123',
        newRole: ProjectRole.ADMIN,
        previousRole: ProjectRole.EDITOR
      }))
      
      const state = store.getState().teamManagement
      expect(state.members[0].role).toBe(ProjectRole.ADMIN)
      expect(state.members[0].isUpdating).toBe(true)
    })

    it('should handle optimistic member removal', () => {
      const store = createTestStore()
      
      // First load members
      const members = [
        {
          id: 'member-123',
          userId: 'user-456',
          projectId: 'project-789',
          role: ProjectRole.OWNER,
          email: 'owner@example.com',
          name: 'Owner',
          joinedAt: new Date().toISOString(),
          invitedBy: 'system',
          status: 'active'
        },
        {
          id: 'member-124',
          userId: 'user-457',
          projectId: 'project-789',
          role: ProjectRole.EDITOR,
          email: 'editor@example.com',
          name: 'Editor',
          joinedAt: new Date().toISOString(),
          invitedBy: 'user-456',
          status: 'active'
        }
      ]
      
      store.dispatch(loadTeamMembersSuccess({
        members,
        pagination: { page: 1, limit: 20, total: 2, hasMore: false }
      }))
      
      // Remove member optimistically
      store.dispatch(removeMemberOptimistic({ memberId: 'member-124' }))
      
      const state = store.getState().teamManagement
      expect(state.members).toHaveLength(1)
      expect(state.members[0].id).toBe('member-123') // Owner remains
    })
  })

  describe('error handling', () => {
    it('should clear error', () => {
      const store = createTestStore()
      
      // Set error first
      store.dispatch(inviteMemberFailure({
        tempId: 'temp-123',
        error: {
          type: 'INVITATION_FAILED',
          message: 'Failed to send email',
          code: 'SENDGRID_ERROR',
          retryable: true
        }
      }))
      
      expect(store.getState().teamManagement.error).not.toBeNull()
      
      store.dispatch(clearError())
      expect(store.getState().teamManagement.error).toBeNull()
    })
  })

  describe('pipeline integration', () => {
    it('should sync with pipeline state', () => {
      const store = createTestStore()
      
      // Start invitation flow for specific project
      store.dispatch(startInvitationFlow({ projectId: 'project-123' }))
      
      // This would typically be called when pipeline advances to 'invite' step
      const state = store.getState().teamManagement
      expect(state.currentProjectId).toBe('project-123')
    })
  })
})