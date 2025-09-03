export type MemberRole = 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer'

export type MemberStatus = 'active' | 'inactive' | 'pending' | 'suspended'

export interface Member {
  /** 멤버 고유 ID */
  id: number
  
  /** 사용자 정보 */
  user: {
    id: number
    username: string
    email: string
    firstName?: string
    lastName?: string
  }
  
  /** 프로젝트 정보 */
  project: {
    id: number
    name: string
  }
  
  /** 멤버 역할 (5단계 권한) */
  role: MemberRole
  
  /** 멤버 상태 */
  status: MemberStatus
  
  /** 초대 날짜 */
  invitedAt: string
  
  /** 참여 날짜 */
  joinedAt?: string
  
  /** 생성 날짜 */
  created: string
  
  /** 수정 날짜 */
  updated: string
  
  /** 레거시 rating 필드 (호환성용) */
  rating?: string
  
  /** 권한 메타데이터 */
  permissions: MemberPermissions
}

export interface MemberPermissions {
  /** 사용자 초대 권한 */
  canInviteUsers: boolean
  
  /** 프로젝트 편집 권한 */
  canEditProject: boolean
  
  /** 파일 업로드 권한 */
  canUploadFiles: boolean
  
  /** 피드백 작성 권한 */
  canCreateFeedback: boolean
  
  /** 피드백 승인 권한 */
  canApproveFeedback: boolean
  
  /** 멤버 관리 권한 */
  canManageMembers: boolean
  
  /** 프로젝트 삭제 권한 */
  canDeleteProject: boolean
}

export interface CreateMemberRequest {
  userId: number
  projectId: number
  role: MemberRole
}

export interface UpdateMemberRequest {
  role?: MemberRole
  status?: MemberStatus
}

export interface MemberFilters {
  projectId?: number
  role?: MemberRole
  status?: MemberStatus
  search?: string
}

export interface MemberListResponse {
  members: Member[]
  total: number
  page: number
  pageSize: number
}