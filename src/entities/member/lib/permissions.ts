import { MemberRole, MemberPermissions } from '../model/types'

/**
 * 역할별 권한 매트릭스
 * 5단계 권한 시스템: Owner > Admin > Editor > Reviewer > Viewer
 */
const ROLE_PERMISSIONS: Record<MemberRole, MemberPermissions> = {
  owner: {
    canInviteUsers: true,
    canEditProject: true,
    canUploadFiles: true,
    canCreateFeedback: true,
    canApproveFeedback: true,
    canManageMembers: true,
    canDeleteProject: true,
  },
  admin: {
    canInviteUsers: true,
    canEditProject: true,
    canUploadFiles: true,
    canCreateFeedback: true,
    canApproveFeedback: true,
    canManageMembers: true,
    canDeleteProject: false,
  },
  editor: {
    canInviteUsers: false,
    canEditProject: true,
    canUploadFiles: true,
    canCreateFeedback: true,
    canApproveFeedback: false,
    canManageMembers: false,
    canDeleteProject: false,
  },
  reviewer: {
    canInviteUsers: false,
    canEditProject: false,
    canUploadFiles: false,
    canCreateFeedback: true,
    canApproveFeedback: false,
    canManageMembers: false,
    canDeleteProject: false,
  },
  viewer: {
    canInviteUsers: false,
    canEditProject: false,
    canUploadFiles: false,
    canCreateFeedback: false,
    canApproveFeedback: false,
    canManageMembers: false,
    canDeleteProject: false,
  },
}

/**
 * 역할별 권한을 반환합니다
 */
export function getPermissionsByRole(role: MemberRole): MemberPermissions {
  return ROLE_PERMISSIONS[role]
}

/**
 * 특정 권한을 확인합니다
 */
export function hasPermission(
  role: MemberRole,
  permission: keyof MemberPermissions
): boolean {
  return ROLE_PERMISSIONS[role][permission]
}

/**
 * 역할의 우선순위를 반환합니다 (숫자가 클수록 높은 권한)
 */
export function getRoleLevel(role: MemberRole): number {
  const levels = {
    viewer: 1,
    reviewer: 2,
    editor: 3,
    admin: 4,
    owner: 5,
  }
  return levels[role]
}

/**
 * 두 역할을 비교합니다
 */
export function compareRoles(roleA: MemberRole, roleB: MemberRole): number {
  return getRoleLevel(roleA) - getRoleLevel(roleB)
}

/**
 * 더 높은 권한의 역할인지 확인합니다
 */
export function isHigherRole(roleA: MemberRole, roleB: MemberRole): boolean {
  return getRoleLevel(roleA) > getRoleLevel(roleB)
}

/**
 * 같거나 더 높은 권한의 역할인지 확인합니다
 */
export function isEqualOrHigherRole(roleA: MemberRole, roleB: MemberRole): boolean {
  return getRoleLevel(roleA) >= getRoleLevel(roleB)
}

/**
 * 레거시 rating 값을 새로운 role로 변환합니다
 */
export function convertRatingToRole(rating: string | number): MemberRole {
  const ratingStr = String(rating)
  
  switch (ratingStr) {
    case '1':
      return 'owner'
    case '2':
      return 'admin'
    case '3':
      return 'editor'
    case '4':
      return 'reviewer'
    case '5':
      return 'viewer'
    default:
      return 'viewer' // 기본값
  }
}

/**
 * 역할을 레거시 rating 값으로 변환합니다
 */
export function convertRoleToRating(role: MemberRole): string {
  const roleToRating = {
    owner: '1',
    admin: '2',
    editor: '3',
    reviewer: '4',
    viewer: '5',
  }
  return roleToRating[role]
}

/**
 * 역할의 표시 이름을 반환합니다
 */
export function getRoleDisplayName(role: MemberRole): string {
  const displayNames = {
    owner: '소유자',
    admin: '관리자',
    editor: '편집자',
    reviewer: '검토자',
    viewer: '조회자',
  }
  return displayNames[role]
}

/**
 * 역할의 색상 클래스를 반환합니다
 */
export function getRoleColorClass(role: MemberRole): string {
  const colorClasses = {
    owner: 'text-role-owner bg-red-100',
    admin: 'text-role-admin bg-orange-100',
    editor: 'text-role-editor bg-yellow-100',
    reviewer: 'text-role-reviewer bg-green-100',
    viewer: 'text-role-viewer bg-gray-100',
  }
  return colorClasses[role]
}