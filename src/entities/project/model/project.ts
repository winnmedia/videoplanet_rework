import {
  Project,
  ProjectStatus,
  ProjectMemberRole,
  ProjectCategory,
  VideoQuality,
  CreateProjectCommand,
  UpdateProjectCommand,
  AddProjectMemberCommand,
  RemoveProjectMemberCommand,
  ProjectMember,
  ProjectSettings,
  ProjectMetadata,
  ProjectPermissions
} from './types'

// Project Domain Logic
export function createProject(command: CreateProjectCommand): Project {
  const now = new Date()
  const projectId = generateProjectId()

  const defaultSettings: ProjectSettings = {
    visibility: 'private',
    allowComments: true,
    allowDownloads: false,
    videoQuality: VideoQuality.HIGH,
    collaboration: {
      allowGuestComments: false,
      requireApproval: true,
      notificationSettings: {
        newComments: true,
        statusChanges: true,
        memberChanges: true
      }
    }
  }

  const metadata: ProjectMetadata = {
    tags: command.tags || [],
    category: command.category,
    deliverables: []
  }

  const owner: ProjectMember = {
    userId: command.ownerId,
    role: ProjectMemberRole.OWNER,
    joinedAt: now,
    permissions: getProjectMemberPermissions(ProjectMemberRole.OWNER)
  }

  return {
    id: projectId,
    name: command.name,
    description: command.description,
    status: ProjectStatus.DRAFT,
    owner,
    members: [owner],
    settings: { ...defaultSettings, ...command.settings },
    metadata,
    createdAt: now,
    updatedAt: now,
    isArchived: false
  }
}

export function updateProject(project: Project, command: UpdateProjectCommand): Project {
  if (project.id !== command.id) {
    throw new Error('프로젝트 ID가 일치하지 않습니다')
  }

  return {
    ...project,
    name: command.name ?? project.name,
    description: command.description ?? project.description,
    status: command.status ?? project.status,
    settings: command.settings ? { ...project.settings, ...command.settings } : project.settings,
    metadata: command.metadata ? { ...project.metadata, ...command.metadata } : project.metadata,
    updatedAt: new Date()
  }
}

export function addProjectMember(
  project: Project,
  command: AddProjectMemberCommand
): Project {
  if (project.id !== command.projectId) {
    throw new Error('프로젝트 ID가 일치하지 않습니다')
  }

  // 이미 존재하는 멤버인지 확인
  if (project.members.some(member => member.userId === command.userId)) {
    throw new Error('사용자가 이미 프로젝트 멤버입니다')
  }

  const newMember: ProjectMember = {
    userId: command.userId,
    role: command.role,
    joinedAt: new Date(),
    permissions: getProjectMemberPermissions(command.role)
  }

  return {
    ...project,
    members: [...project.members, newMember],
    updatedAt: new Date()
  }
}

export function removeProjectMember(
  project: Project,
  command: RemoveProjectMemberCommand
): Project {
  if (project.id !== command.projectId) {
    throw new Error('프로젝트 ID가 일치하지 않습니다')
  }

  // 소유자는 제거할 수 없음
  if (project.owner.userId === command.userId) {
    throw new Error('프로젝트 소유자는 제거할 수 없습니다')
  }

  return {
    ...project,
    members: project.members.filter(member => member.userId !== command.userId),
    updatedAt: new Date()
  }
}

export function getProjectMemberPermissions(role: ProjectMemberRole): ProjectPermissions {
  const basePermissions = {
    canEdit: false,
    canDelete: false,
    canInviteMembers: false,
    canManageSettings: false,
    canUploadVideos: false,
    canViewAnalytics: false
  }

  switch (role) {
    case ProjectMemberRole.OWNER:
      return {
        canEdit: true,
        canDelete: true,
        canInviteMembers: true,
        canManageSettings: true,
        canUploadVideos: true,
        canViewAnalytics: true
      }

    case ProjectMemberRole.ADMIN:
      return {
        ...basePermissions,
        canEdit: true,
        canInviteMembers: true,
        canManageSettings: true,
        canUploadVideos: true,
        canViewAnalytics: true
      }

    case ProjectMemberRole.EDITOR:
      return {
        ...basePermissions,
        canEdit: true,
        canUploadVideos: true
      }

    case ProjectMemberRole.REVIEWER:
      return {
        ...basePermissions,
        canEdit: false, // 리뷰어는 편집 권한 없음
        canViewAnalytics: true
      }

    case ProjectMemberRole.VIEWER:
    default:
      return basePermissions
  }
}

export function canUserEditProject(project: Project, userId: string): boolean {
  const member = project.members.find(m => m.userId === userId)
  return member?.permissions.canEdit ?? false
}

export function canUserDeleteProject(project: Project, userId: string): boolean {
  const member = project.members.find(m => m.userId === userId)
  return member?.permissions.canDelete ?? false
}

export function isProjectActive(project: Project): boolean {
  if (project.isArchived) return false
  if (project.status === ProjectStatus.CANCELLED) return false
  return true
}

export function validateProjectName(name: string): boolean {
  if (!name || name.trim().length === 0) return false
  if (name.length > 100) return false
  return true
}

export function getProjectStatusDisplayName(status: ProjectStatus): string {
  const statusMap = {
    [ProjectStatus.DRAFT]: '초안',
    [ProjectStatus.PLANNING]: '기획중',
    [ProjectStatus.IN_PROGRESS]: '진행중',
    [ProjectStatus.REVIEW]: '검토중',
    [ProjectStatus.COMPLETED]: '완료',
    [ProjectStatus.CANCELLED]: '취소됨',
    [ProjectStatus.ON_HOLD]: '보류'
  }

  return statusMap[status] || status
}

export function getProjectCategoryDisplayName(category: ProjectCategory): string {
  const categoryMap = {
    [ProjectCategory.MARKETING]: '마케팅',
    [ProjectCategory.EDUCATION]: '교육',
    [ProjectCategory.ENTERTAINMENT]: '엔터테인먼트',
    [ProjectCategory.CORPORATE]: '기업',
    [ProjectCategory.DOCUMENTARY]: '다큐멘터리',
    [ProjectCategory.OTHER]: '기타'
  }

  return categoryMap[category] || category
}

// Helper functions
function generateProjectId(): string {
  return `proj_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}