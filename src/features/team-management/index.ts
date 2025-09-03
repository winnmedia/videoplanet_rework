// Team Management Feature Public API
export type {
  TeamManagementState,
  InvitationFlowStep,
  TeamManagementError,
  UITeamInvitation,
  UITeamMember,
  InviteMemberFlowCommand,
  UpdateMemberRoleFlowCommand,
  RemoveMemberFlowCommand,
  TeamManagementEvent,
  PipelineTeamData
} from './model/types'

export {
  initialTeamManagementState,
  isValidFlowTransition,
  canPerformAction,
  getFlowProgress
} from './model/types'

export {
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
  removeMemberOptimistic,
  clearError,
  syncWithPipeline
} from './model/teamManagementSlice'

export {
  inviteMember,
  loadTeamMembers,
  updateMemberRole,
  removeMember,
  bulkRemoveMembers,
  resendInvitation,
  retryFailedOperation
} from './api/teamManagementThunks'

export { default as teamManagementReducer } from './model/teamManagementSlice'