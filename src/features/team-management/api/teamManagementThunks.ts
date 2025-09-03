import { createAsyncThunk } from '@reduxjs/toolkit'
import { teamApi } from '../../../shared/api/team'
import type { 
  InviteMemberFlowCommand,
  UpdateMemberRoleFlowCommand,
  RemoveMemberFlowCommand
} from '../model/types'
import {
  inviteMemberOptimistic,
  inviteMemberSuccess,
  inviteMemberFailure,
  updateMemberRoleOptimistic,
  updateMemberRoleSuccess,
  updateMemberRoleFailure,
  removeMemberOptimistic,
  removeMemberSuccess,
  removeMemberFailure,
  loadTeamMembersStart,
  loadTeamMembersSuccess,
  loadTeamMembersFailure,
  advanceInvitationStep
} from '../model/teamManagementSlice'
import { ProjectRole, InvitationStatus } from '../../../entities/team'
import { nanoid } from '@reduxjs/toolkit'

// 팀 멤버 초대 (낙관적 업데이트 포함)
export const inviteMember = createAsyncThunk(
  'teamManagement/inviteMember',
  async (command: InviteMemberFlowCommand, { dispatch, rejectWithValue }) => {
    // 1. 낙관적 초대 생성
    const tempId = `temp-${nanoid()}`
    const optimisticInvitation = {
      id: tempId,
      projectId: command.projectId,
      email: command.email,
      role: command.role,
      invitedBy: 'current-user', // TODO: 현재 사용자 ID로 교체
      status: InvitationStatus.PENDING,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
      message: command.message,
      isOptimistic: true,
      isSending: true
    }

    dispatch(inviteMemberOptimistic(optimisticInvitation))
    dispatch(advanceInvitationStep({ step: 'sending' }))

    try {
      // 2. 실제 초대 전송
      const response = await teamApi.sendInvitation({
        projectId: command.projectId,
        email: command.email,
        role: command.role,
        message: command.message
      })

      // 3. 성공 시 낙관적 초대를 실제 초대로 교체
      const realInvitation = {
        ...response.invitation,
        isOptimistic: false,
        isSending: false
      }

      dispatch(inviteMemberSuccess({
        tempId,
        invitation: realInvitation
      }))

      dispatch(advanceInvitationStep({ step: 'sent' }))

      return realInvitation
    } catch (error) {
      // 4. 실패 시 낙관적 초대 제거 및 에러 처리
      const teamError = {
        type: 'INVITATION_FAILED' as const,
        message: error instanceof Error ? error.message : 'Failed to send invitation',
        code: 'SENDGRID_ERROR',
        retryable: true,
        details: {
          email: command.email,
          projectId: command.projectId
        }
      }

      dispatch(inviteMemberFailure({
        tempId,
        error: teamError
      }))

      dispatch(advanceInvitationStep({ step: 'error' }))

      return rejectWithValue(teamError)
    }
  }
)

// 팀 멤버 목록 로딩
export const loadTeamMembers = createAsyncThunk(
  'teamManagement/loadTeamMembers',
  async (
    params: { projectId: string; page?: number; limit?: number },
    { dispatch, rejectWithValue }
  ) => {
    dispatch(loadTeamMembersStart())

    try {
      const response = await teamApi.getTeamMembers(params.projectId, {
        page: params.page,
        limit: params.limit
      })

      dispatch(loadTeamMembersSuccess({
        members: response.members.map(member => ({
          ...member,
          isUpdating: false,
          updateError: undefined
        })),
        pagination: response.pagination
      }))

      return response
    } catch (error) {
      const teamError = {
        type: 'NETWORK_ERROR' as const,
        message: error instanceof Error ? error.message : 'Failed to load team members',
        code: 'API_ERROR',
        retryable: true
      }

      dispatch(loadTeamMembersFailure(teamError))
      return rejectWithValue(teamError)
    }
  }
)

// 멤버 역할 변경 (낙관적 업데이트)
export const updateMemberRole = createAsyncThunk(
  'teamManagement/updateMemberRole',
  async (command: UpdateMemberRoleFlowCommand, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as any
    const member = state.teamManagement.members.find((m: any) => m.id === command.memberId)
    
    if (!member) {
      return rejectWithValue({
        type: 'MEMBER_NOT_FOUND',
        message: 'Member not found',
        code: 'NOT_FOUND',
        retryable: false
      })
    }

    const previousRole = member.role

    // 1. 낙관적 업데이트
    dispatch(updateMemberRoleOptimistic({
      memberId: command.memberId,
      newRole: command.newRole,
      previousRole
    }))

    try {
      // 2. 실제 API 호출
      const response = await teamApi.updateMemberRole(command.projectId, {
        memberId: command.memberId,
        role: command.newRole
      })

      // 3. 성공 확인
      dispatch(updateMemberRoleSuccess({
        memberId: command.memberId,
        role: response.member.role as ProjectRole
      }))

      return response.member
    } catch (error) {
      // 4. 실패 시 롤백
      const errorMessage = error instanceof Error ? error.message : 'Failed to update member role'
      
      dispatch(updateMemberRoleFailure({
        memberId: command.memberId,
        previousRole,
        error: errorMessage
      }))

      return rejectWithValue({
        type: 'PERMISSION_DENIED' as const,
        message: errorMessage,
        code: 'RBAC_VIOLATION',
        retryable: false
      })
    }
  }
)

// 멤버 제거 (낙관적 업데이트)
export const removeMember = createAsyncThunk(
  'teamManagement/removeMember',
  async (command: RemoveMemberFlowCommand, { dispatch, getState, rejectWithValue }) => {
    const state = getState() as any
    const member = state.teamManagement.members.find((m: any) => m.id === command.memberId)
    
    if (!member) {
      return rejectWithValue({
        type: 'MEMBER_NOT_FOUND',
        message: 'Member not found',
        code: 'NOT_FOUND',
        retryable: false
      })
    }

    // 1. 낙관적 제거
    dispatch(removeMemberOptimistic({
      memberId: command.memberId
    }))

    try {
      // 2. 실제 API 호출
      await teamApi.removeMember(command.projectId, {
        memberId: command.memberId,
        reason: command.reason
      })

      // 3. 성공 확인
      dispatch(removeMemberSuccess({
        memberId: command.memberId
      }))

      return { memberId: command.memberId }
    } catch (error) {
      // 4. 실패 시 멤버 복원
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove member'
      
      dispatch(removeMemberFailure({
        member,
        error: errorMessage
      }))

      return rejectWithValue({
        type: 'PERMISSION_DENIED' as const,
        message: errorMessage,
        code: 'REMOVE_FAILED',
        retryable: false
      })
    }
  }
)

// 초대 재전송
export const resendInvitation = createAsyncThunk(
  'teamManagement/resendInvitation',
  async (invitationId: string, { dispatch, rejectWithValue }) => {
    dispatch({ 
      type: 'teamManagement/resendInvitationStart',
      payload: { invitationId }
    })

    try {
      // 기존 초대를 취소하고 새로 전송
      await teamApi.revokeInvitation(invitationId)
      
      // TODO: 새 초대 전송 로직 구현
      // 현재는 단순히 성공으로 처리
      
      dispatch({
        type: 'teamManagement/resendInvitationSuccess',
        payload: {
          invitationId,
          sendGridMessageId: `resent-${nanoid()}`
        }
      })

      return { invitationId }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to resend invitation'
      
      dispatch({
        type: 'teamManagement/resendInvitationFailure',
        payload: {
          invitationId,
          error: errorMessage
        }
      })

      return rejectWithValue(errorMessage)
    }
  }
)

// 벌크 멤버 제거
export const bulkRemoveMembers = createAsyncThunk(
  'teamManagement/bulkRemoveMembers',
  async (
    params: { projectId: string; memberIds: string[]; reason?: string },
    { dispatch }
  ) => {
    const results = []
    
    for (const memberId of params.memberIds) {
      try {
        const result = await dispatch(removeMember({
          projectId: params.projectId,
          memberId,
          reason: params.reason
        })).unwrap()
        
        results.push({ memberId, success: true, result })
      } catch (error) {
        results.push({ 
          memberId, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return results
  }
)

// 에러 재시도 헬퍼
export const retryFailedOperation = createAsyncThunk(
  'teamManagement/retryFailedOperation',
  async (_, { getState, dispatch }) => {
    const state = getState() as any
    const error = state.teamManagement.error
    
    if (!error || !error.retryable) {
      throw new Error('No retryable operation found')
    }

    // 에러 타입에 따른 재시도 로직
    switch (error.type) {
      case 'INVITATION_FAILED':
        if (error.details) {
          return dispatch(inviteMember({
            projectId: error.details.projectId,
            email: error.details.email,
            role: error.details.role || ProjectRole.VIEWER,
            message: error.details.message
          }))
        }
        break
        
      case 'NETWORK_ERROR':
        if (state.teamManagement.currentProjectId) {
          return dispatch(loadTeamMembers({
            projectId: state.teamManagement.currentProjectId
          }))
        }
        break
        
      default:
        throw new Error(`Cannot retry operation of type: ${error.type}`)
    }
  }
)