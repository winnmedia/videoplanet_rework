import type { TeamMember, TeamInvitation } from '../../../entities/team'
import { ProjectRole } from '../../../entities/team'

// 팀 초대 플로우 단계 정의 
export type InvitationFlowStep = 'input' | 'review' | 'sending' | 'sent' | 'error'

// 팀 초대 플로우 데이터
export interface TeamInvitationFlow {
  currentStep: InvitationFlowStep
  completedSteps: InvitationFlowStep[] // Redux 직렬화를 위해 Set 대신 배열 사용
  data: {
    projectId: string
    email: string
    role: ProjectRole
    message?: string
  } | null
  progress: number // 0-100
  isLoading: boolean
  error: TeamManagementError | null
}

// 팀 관리 에러 타입
export interface TeamManagementError {
  type: 'INVITATION_FAILED' | 'PERMISSION_DENIED' | 'MEMBER_NOT_FOUND' | 'VALIDATION_ERROR' | 'NETWORK_ERROR'
  message: string
  code?: string
  retryable: boolean
  details?: Record<string, any>
}

// 확장된 TeamInvitation (UI 상태 포함)
export interface UITeamInvitation extends TeamInvitation {
  isOptimistic?: boolean
  isSending?: boolean
  sendError?: string
}

// 확장된 TeamMember (UI 상태 포함)  
export interface UITeamMember extends TeamMember {
  isUpdating?: boolean
  updateError?: string
}

// 팀 관리 상태
export interface TeamManagementState {
  // 데이터 상태
  invitations: UITeamInvitation[]
  members: UITeamMember[]
  currentProjectId: string | null
  currentUserRole: ProjectRole | null
  
  // UI 상태
  isLoading: boolean
  error: TeamManagementError | null
  invitationFlow: TeamInvitationFlow
  
  // 필터 및 정렬
  filters: {
    role?: ProjectRole[]
    status?: string[]
    searchQuery: string
  }
  sort: {
    field: 'name' | 'role' | 'joinedAt' | 'lastActivity'
    order: 'asc' | 'desc'
  }
  
  // 페이지네이션
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
  
  // 선택 상태 (벌크 작업용)
  selectedMemberIds: string[] // Redux 직렬화를 위해 Set 대신 배열 사용
  selectedInvitationIds: string[] // Redux 직렬화를 위해 Set 대신 배열 사용
}

// 팀 관리 액션 타입
export type TeamManagementActions = 
  | 'invite_member'
  | 'remove_member' 
  | 'change_role'
  | 'resend_invitation'
  | 'revoke_invitation'

// 플로우 단계 순서
const FLOW_ORDER: InvitationFlowStep[] = ['input', 'review', 'sending', 'sent', 'error']

// 플로우 전환 유효성 검사
export const isValidFlowTransition = (
  currentStep: InvitationFlowStep,
  targetStep: InvitationFlowStep
): boolean => {
  const currentIndex = FLOW_ORDER.indexOf(currentStep)
  const targetIndex = FLOW_ORDER.indexOf(targetStep)
  
  if (currentIndex === -1 || targetIndex === -1) return false
  
  // error 단계는 sending에서만 가능
  if (targetStep === 'error') {
    return currentStep === 'sending'
  }
  
  // 일반적으로는 순차적 진행만 허용
  return targetIndex === currentIndex + 1 || targetStep === currentStep
}

// 플로우 진행률 계산
export const getFlowProgress = (
  completedSteps: InvitationFlowStep[],
  currentStep: InvitationFlowStep
): number => {
  const totalSteps = 5 // input, review, sending, sent, error를 포함한 총 단계
  let completedCount = completedSteps.length
  
  const progressSteps: InvitationFlowStep[] = ['input', 'review', 'sending', 'sent']
  
  // 현재 단계가 진행 중이면 카운트에 포함
  if (progressSteps.includes(currentStep) && !completedSteps.includes(currentStep)) {
    completedCount++
  }
  
  return Math.round((completedCount / totalSteps) * 100)
}

// 권한 검사 함수
export const canPerformAction = (
  userRole: ProjectRole,
  action: TeamManagementActions,
  targetRole?: ProjectRole
): boolean => {
  switch (action) {
    case 'invite_member':
      // Admin 이상만 멤버 초대 가능
      return [ProjectRole.OWNER, ProjectRole.ADMIN].includes(userRole)
      
    case 'remove_member':
      // Owner만 다른 멤버 제거 가능, Admin은 Editor 이하만 제거 가능
      if (userRole === ProjectRole.OWNER) return true
      if (userRole === ProjectRole.ADMIN && targetRole) {
        return ![ProjectRole.OWNER, ProjectRole.ADMIN].includes(targetRole)
      }
      return false
      
    case 'change_role':
      // Owner만 역할 변경 가능, 단 Owner 역할로는 변경 불가
      return userRole === ProjectRole.OWNER
      
    case 'resend_invitation':
    case 'revoke_invitation':
      // Admin 이상만 초대 관리 가능
      return [ProjectRole.OWNER, ProjectRole.ADMIN].includes(userRole)
      
    default:
      return false
  }
}

// 초기 상태
export const initialTeamManagementState: TeamManagementState = {
  invitations: [],
  members: [],
  currentProjectId: null,
  currentUserRole: null,
  isLoading: false,
  error: null,
  invitationFlow: {
    currentStep: 'input',
    completedSteps: [],
    data: null,
    progress: 0,
    isLoading: false,
    error: null
  },
  filters: {
    searchQuery: ''
  },
  sort: {
    field: 'joinedAt',
    order: 'desc'
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false
  },
  selectedMemberIds: [],
  selectedInvitationIds: []
}

// 명령/액션 인터페이스
export interface InviteMemberFlowCommand {
  projectId: string
  email: string
  role: ProjectRole
  message?: string
}

export interface UpdateMemberRoleFlowCommand {
  projectId: string
  memberId: string
  newRole: ProjectRole
}

export interface RemoveMemberFlowCommand {
  projectId: string
  memberId: string
  reason?: string
}

export interface BulkRemoveMembersCommand {
  projectId: string
  memberIds: string[]
  reason?: string
}

// Redux 액션 페이로드 타입
export interface TeamManagementActionPayloads {
  // 초대 플로우
  startInvitationFlow: { projectId: string }
  updateInvitationData: Partial<TeamInvitationFlow['data']>
  advanceInvitationStep: { step: InvitationFlowStep }
  resetInvitationFlow: void
  
  // 데이터 로딩
  loadTeamMembers: { projectId: string; page?: number; limit?: number }
  loadInvitations: { projectId: string; page?: number; limit?: number }
  
  // 멤버 관리
  inviteMember: InviteMemberFlowCommand
  updateMemberRole: UpdateMemberRoleFlowCommand
  removeMember: RemoveMemberFlowCommand
  bulkRemoveMembers: BulkRemoveMembersCommand
  
  // 초대 관리
  resendInvitation: { invitationId: string }
  revokeInvitation: { invitationId: string }
  
  // 필터 및 정렬
  updateFilters: Partial<TeamManagementState['filters']>
  updateSort: Partial<TeamManagementState['sort']>
  
  // 선택 상태
  selectMembers: { memberIds: string[] }
  selectInvitations: { invitationIds: string[] }
  clearSelections: void
  
  // 에러 처리
  clearError: void
  retryFailedOperation: void
}

// 통합된 팀 관리 이벤트 (pipeline 연동용)
export interface TeamManagementEvent {
  type: 'TEAM_INVITATION_SENT' | 'TEAM_MEMBER_JOINED' | 'TEAM_MEMBER_ROLE_CHANGED' | 'TEAM_MEMBER_REMOVED'
  payload: {
    projectId: string
    userId?: string
    email?: string
    role?: ProjectRole
    previousRole?: ProjectRole
  }
  timestamp: string
}

// Pipeline 연동 데이터
export interface PipelineTeamData {
  projectId: string
  projectName: string
  userRole: ProjectRole
  invitationsSent: number
  membersJoined: number
  completedAt?: string
}