import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type {
  TeamManagementState,
  InvitationFlowStep,
  TeamManagementError,
  UITeamInvitation,
  UITeamMember
} from './types'
import { initialTeamManagementState, isValidFlowTransition, getFlowProgress } from './types'
import type { ProjectRole } from '../../../entities/team'

const teamManagementSlice = createSlice({
  name: 'teamManagement',
  initialState: initialTeamManagementState,
  reducers: {
    // 초대 플로우 관리
    startInvitationFlow: (
      state, 
      action: PayloadAction<{ projectId: string }>
    ) => {
      const { projectId } = action.payload
      state.currentProjectId = projectId
      state.invitationFlow.currentStep = 'input'
      state.invitationFlow.completedSteps = []
      state.invitationFlow.data = {
        projectId,
        email: '',
        role: 'viewer' as ProjectRole,
        message: undefined
      }
      state.invitationFlow.progress = 0
      state.invitationFlow.isLoading = false
      state.invitationFlow.error = null
      state.error = null
    },

    updateInvitationData: (
      state,
      action: PayloadAction<{
        email?: string
        role?: ProjectRole
        message?: string
      }>
    ) => {
      if (state.invitationFlow.data) {
        Object.assign(state.invitationFlow.data, action.payload)
      }
    },

    advanceInvitationStep: (
      state,
      action: PayloadAction<{ step: InvitationFlowStep }>
    ) => {
      const { step } = action.payload
      const currentStep = state.invitationFlow.currentStep
      
      if (isValidFlowTransition(currentStep, step)) {
        // 이전 단계를 완료 목록에 추가
        if (currentStep !== step) {
          if (!state.invitationFlow.completedSteps.includes(currentStep)) {
            state.invitationFlow.completedSteps.push(currentStep)
          }
        }
        
        state.invitationFlow.currentStep = step
        state.invitationFlow.progress = getFlowProgress(
          state.invitationFlow.completedSteps,
          step
        )
        
        // 플로우 상태에 따른 로딩 상태 설정
        state.invitationFlow.isLoading = step === 'sending'
      }
    },

    resetInvitationFlow: (state) => {
      state.invitationFlow = {
        currentStep: 'input',
        completedSteps: [],
        data: null,
        progress: 0,
        isLoading: false,
        error: null
      }
    },

    // 멤버 초대 (낙관적 업데이트)
    inviteMemberOptimistic: (
      state,
      action: PayloadAction<UITeamInvitation>
    ) => {
      const invitation = action.payload
      state.invitations.unshift(invitation)
      state.invitationFlow.currentStep = 'sending'
      state.invitationFlow.isLoading = true
    },

    inviteMemberSuccess: (
      state,
      action: PayloadAction<{
        tempId: string
        invitation: UITeamInvitation
      }>
    ) => {
      const { tempId, invitation } = action.payload
      
      // 낙관적 초대를 실제 초대로 교체
      const index = state.invitations.findIndex(inv => inv.id === tempId)
      if (index !== -1) {
        state.invitations[index] = invitation
      }
      
      state.invitationFlow.currentStep = 'sent'
      state.invitationFlow.isLoading = false
      if (!state.invitationFlow.completedSteps.includes('sending')) {
        state.invitationFlow.completedSteps.push('sending')
      }
      state.invitationFlow.progress = getFlowProgress(
        state.invitationFlow.completedSteps,
        'sent'
      )
    },

    inviteMemberFailure: (
      state,
      action: PayloadAction<{
        tempId: string
        error: TeamManagementError
      }>
    ) => {
      const { tempId, error } = action.payload
      
      // 낙관적 초대 제거
      state.invitations = state.invitations.filter(inv => inv.id !== tempId)
      
      state.error = error
      state.invitationFlow.currentStep = 'error'
      state.invitationFlow.isLoading = false
      state.invitationFlow.error = error
    },

    // 팀 멤버 로딩
    loadTeamMembersStart: (state) => {
      state.isLoading = true
      state.error = null
    },

    loadTeamMembersSuccess: (
      state,
      action: PayloadAction<{
        members: UITeamMember[]
        pagination: {
          page: number
          limit: number
          total: number
          hasMore: boolean
        }
      }>
    ) => {
      const { members, pagination } = action.payload
      state.members = members
      state.pagination = pagination
      state.isLoading = false
      state.error = null
    },

    loadTeamMembersFailure: (
      state,
      action: PayloadAction<TeamManagementError>
    ) => {
      state.isLoading = false
      state.error = action.payload
    },

    // 멤버 역할 변경 (낙관적 업데이트)
    updateMemberRoleOptimistic: (
      state,
      action: PayloadAction<{
        memberId: string
        newRole: ProjectRole
        previousRole: ProjectRole
      }>
    ) => {
      const { memberId, newRole } = action.payload
      const memberIndex = state.members.findIndex(m => m.id === memberId)
      
      if (memberIndex !== -1) {
        state.members[memberIndex].role = newRole
        state.members[memberIndex].isUpdating = true
        state.members[memberIndex].updateError = undefined
      }
    },

    updateMemberRoleSuccess: (
      state,
      action: PayloadAction<{
        memberId: string
        role: ProjectRole
      }>
    ) => {
      const { memberId, role } = action.payload
      const memberIndex = state.members.findIndex(m => m.id === memberId)
      
      if (memberIndex !== -1) {
        state.members[memberIndex].role = role
        state.members[memberIndex].isUpdating = false
        state.members[memberIndex].updateError = undefined
      }
    },

    updateMemberRoleFailure: (
      state,
      action: PayloadAction<{
        memberId: string
        previousRole: ProjectRole
        error: string
      }>
    ) => {
      const { memberId, previousRole, error } = action.payload
      const memberIndex = state.members.findIndex(m => m.id === memberId)
      
      if (memberIndex !== -1) {
        // 이전 역할로 롤백
        state.members[memberIndex].role = previousRole
        state.members[memberIndex].isUpdating = false
        state.members[memberIndex].updateError = error
      }
    },

    // 멤버 제거 (낙관적 업데이트)
    removeMemberOptimistic: (
      state,
      action: PayloadAction<{ memberId: string }>
    ) => {
      const { memberId } = action.payload
      state.members = state.members.filter(m => m.id !== memberId)
      state.pagination.total = Math.max(0, state.pagination.total - 1)
    },

    removeMemberSuccess: (
      state,
      action: PayloadAction<{ memberId: string }>
    ) => {
      // 낙관적 업데이트가 이미 완료됨, 추가 작업 없음
    },

    removeMemberFailure: (
      state,
      action: PayloadAction<{
        member: UITeamMember
        error: string
      }>
    ) => {
      const { member } = action.payload
      // 멤버를 다시 추가 (롤백)
      state.members.push(member)
      state.pagination.total += 1
      state.error = {
        type: 'MEMBER_NOT_FOUND',
        message: action.payload.error,
        code: 'REMOVE_FAILED',
        retryable: true
      }
    },

    // 초대 관리
    revokeInvitationOptimistic: (
      state,
      action: PayloadAction<{ invitationId: string }>
    ) => {
      const { invitationId } = action.payload
      state.invitations = state.invitations.filter(inv => inv.id !== invitationId)
    },

    resendInvitationStart: (
      state,
      action: PayloadAction<{ invitationId: string }>
    ) => {
      const { invitationId } = action.payload
      const invitationIndex = state.invitations.findIndex(inv => inv.id === invitationId)
      
      if (invitationIndex !== -1) {
        state.invitations[invitationIndex].isSending = true
        state.invitations[invitationIndex].sendError = undefined
      }
    },

    resendInvitationSuccess: (
      state,
      action: PayloadAction<{
        invitationId: string
        sendGridMessageId: string
      }>
    ) => {
      const { invitationId, sendGridMessageId } = action.payload
      const invitationIndex = state.invitations.findIndex(inv => inv.id === invitationId)
      
      if (invitationIndex !== -1) {
        state.invitations[invitationIndex].isSending = false
        state.invitations[invitationIndex].sendGridMessageId = sendGridMessageId
        state.invitations[invitationIndex].sendError = undefined
      }
    },

    resendInvitationFailure: (
      state,
      action: PayloadAction<{
        invitationId: string
        error: string
      }>
    ) => {
      const { invitationId, error } = action.payload
      const invitationIndex = state.invitations.findIndex(inv => inv.id === invitationId)
      
      if (invitationIndex !== -1) {
        state.invitations[invitationIndex].isSending = false
        state.invitations[invitationIndex].sendError = error
      }
    },

    // 필터 및 정렬
    updateFilters: (
      state,
      action: PayloadAction<Partial<TeamManagementState['filters']>>
    ) => {
      Object.assign(state.filters, action.payload)
    },

    updateSort: (
      state,
      action: PayloadAction<Partial<TeamManagementState['sort']>>
    ) => {
      Object.assign(state.sort, action.payload)
    },

    // 선택 상태 관리
    selectMembers: (
      state,
      action: PayloadAction<{ memberIds: string[] }>
    ) => {
      state.selectedMemberIds = action.payload.memberIds
    },

    selectInvitations: (
      state,
      action: PayloadAction<{ invitationIds: string[] }>
    ) => {
      state.selectedInvitationIds = action.payload.invitationIds
    },

    clearSelections: (state) => {
      state.selectedMemberIds = []
      state.selectedInvitationIds = []
    },

    // 에러 관리
    clearError: (state) => {
      state.error = null
      state.invitationFlow.error = null
    },

    // Pipeline 연동
    syncWithPipeline: (
      state,
      action: PayloadAction<{
        projectId: string
        userRole: ProjectRole
      }>
    ) => {
      const { projectId, userRole } = action.payload
      state.currentProjectId = projectId
      state.currentUserRole = userRole
    }
  }
})

export const {
  startInvitationFlow,
  updateInvitationData,
  advanceInvitationStep,
  resetInvitationFlow,
  inviteMemberOptimistic,
  inviteMemberSuccess,
  inviteMemberFailure,
  loadTeamMembersStart,
  loadTeamMembersSuccess,
  loadTeamMembersFailure,
  updateMemberRoleOptimistic,
  updateMemberRoleSuccess,
  updateMemberRoleFailure,
  removeMemberOptimistic,
  removeMemberSuccess,
  removeMemberFailure,
  revokeInvitationOptimistic,
  resendInvitationStart,
  resendInvitationSuccess,
  resendInvitationFailure,
  updateFilters,
  updateSort,
  selectMembers,
  selectInvitations,
  clearSelections,
  clearError,
  syncWithPipeline
} = teamManagementSlice.actions

export default teamManagementSlice.reducer