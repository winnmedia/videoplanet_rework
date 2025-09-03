import {
  ProjectStatus,
  ProjectMemberRole,
  ProjectCategory,
  VideoQuality,
  CreateProjectCommand,
  UpdateProjectCommand,
  AddProjectMemberCommand
} from './types'
import {
  createProject,
  updateProject,
  addProjectMember,
  removeProjectMember,
  getProjectMemberPermissions,
  canUserEditProject,
  isProjectActive,
  validateProjectName
} from './project'

describe('Project Domain Model', () => {
  const mockCreateProjectCommand: CreateProjectCommand = {
    name: '테스트 프로젝트',
    description: '테스트용 프로젝트입니다',
    ownerId: 'user_123',
    category: ProjectCategory.MARKETING,
    tags: ['test', 'marketing']
  }

  describe('createProject', () => {
    it('유효한 프로젝트 생성 명령으로 프로젝트를 생성해야 함', () => {
      const project = createProject(mockCreateProjectCommand)

      expect(project.name).toBe('테스트 프로젝트')
      expect(project.description).toBe('테스트용 프로젝트입니다')
      expect(project.status).toBe(ProjectStatus.DRAFT)
      expect(project.owner.userId).toBe('user_123')
      expect(project.owner.role).toBe(ProjectMemberRole.OWNER)
      expect(project.metadata.category).toBe(ProjectCategory.MARKETING)
      expect(project.metadata.tags).toEqual(['test', 'marketing'])
      expect(project.isArchived).toBe(false)
      expect(project.id).toBeDefined()
      expect(project.createdAt).toBeInstanceOf(Date)
      expect(project.updatedAt).toBeInstanceOf(Date)
    })

    it('기본 설정으로 프로젝트를 생성해야 함', () => {
      const minimalCommand: CreateProjectCommand = {
        name: '최소 프로젝트',
        ownerId: 'user_456',
        category: ProjectCategory.OTHER
      }

      const project = createProject(minimalCommand)

      expect(project.settings.visibility).toBe('private')
      expect(project.settings.allowComments).toBe(true)
      expect(project.settings.videoQuality).toBe(VideoQuality.HIGH)
      expect(project.metadata.tags).toEqual([])
      expect(project.members).toHaveLength(1) // Owner만 포함
    })
  })

  describe('updateProject', () => {
    it('프로젝트 정보를 업데이트해야 함', () => {
      const originalProject = createProject(mockCreateProjectCommand)
      
      const updateCommand: UpdateProjectCommand = {
        id: originalProject.id,
        name: '업데이트된 프로젝트',
        status: ProjectStatus.IN_PROGRESS,
        metadata: {
          tags: ['updated', 'active']
        }
      }

      const updatedProject = updateProject(originalProject, updateCommand)

      expect(updatedProject.name).toBe('업데이트된 프로젝트')
      expect(updatedProject.status).toBe(ProjectStatus.IN_PROGRESS)
      expect(updatedProject.metadata.tags).toEqual(['updated', 'active'])
      expect(updatedProject.updatedAt.getTime()).toBeGreaterThanOrEqual(originalProject.updatedAt.getTime())
      expect(updatedProject.id).toBe(originalProject.id)
    })
  })

  describe('addProjectMember', () => {
    it('프로젝트에 새 멤버를 추가해야 함', () => {
      const project = createProject(mockCreateProjectCommand)
      
      const addMemberCommand: AddProjectMemberCommand = {
        projectId: project.id,
        userId: 'user_789',
        role: ProjectMemberRole.EDITOR,
        invitedBy: 'user_123'
      }

      const updatedProject = addProjectMember(project, addMemberCommand)

      expect(updatedProject.members).toHaveLength(2)
      const newMember = updatedProject.members.find(m => m.userId === 'user_789')
      expect(newMember).toBeDefined()
      expect(newMember?.role).toBe(ProjectMemberRole.EDITOR)
    })

    it('이미 존재하는 멤버 추가 시 오류를 발생시켜야 함', () => {
      const project = createProject(mockCreateProjectCommand)
      
      const addMemberCommand: AddProjectMemberCommand = {
        projectId: project.id,
        userId: 'user_123', // 이미 소유자로 존재
        role: ProjectMemberRole.EDITOR,
        invitedBy: 'user_123'
      }

      expect(() => addProjectMember(project, addMemberCommand))
        .toThrow('사용자가 이미 프로젝트 멤버입니다')
    })
  })

  describe('removeProjectMember', () => {
    it('프로젝트에서 멤버를 제거해야 함', () => {
      let project = createProject(mockCreateProjectCommand)
      
      // 먼저 멤버 추가
      const addMemberCommand: AddProjectMemberCommand = {
        projectId: project.id,
        userId: 'user_789',
        role: ProjectMemberRole.EDITOR,
        invitedBy: 'user_123'
      }
      project = addProjectMember(project, addMemberCommand)

      // 멤버 제거
      const updatedProject = removeProjectMember(project, {
        projectId: project.id,
        userId: 'user_789',
        removedBy: 'user_123'
      })

      expect(updatedProject.members).toHaveLength(1) // 소유자만 남음
      expect(updatedProject.members.find(m => m.userId === 'user_789')).toBeUndefined()
    })

    it('소유자 제거 시 오류를 발생시켜야 함', () => {
      const project = createProject(mockCreateProjectCommand)

      expect(() => removeProjectMember(project, {
        projectId: project.id,
        userId: 'user_123', // 소유자
        removedBy: 'user_456'
      })).toThrow('프로젝트 소유자는 제거할 수 없습니다')
    })
  })

  describe('getProjectMemberPermissions', () => {
    it('소유자 권한을 반환해야 함', () => {
      const project = createProject(mockCreateProjectCommand)
      const ownerMember = project.members[0]
      const permissions = getProjectMemberPermissions(ownerMember.role)

      expect(permissions.canEdit).toBe(true)
      expect(permissions.canDelete).toBe(true)
      expect(permissions.canInviteMembers).toBe(true)
      expect(permissions.canManageSettings).toBe(true)
      expect(permissions.canUploadVideos).toBe(true)
      expect(permissions.canViewAnalytics).toBe(true)
    })

    it('편집자 권한을 반환해야 함', () => {
      const permissions = getProjectMemberPermissions(ProjectMemberRole.EDITOR)

      expect(permissions.canEdit).toBe(true)
      expect(permissions.canUploadVideos).toBe(true)
      expect(permissions.canDelete).toBe(false)
      expect(permissions.canInviteMembers).toBe(false)
      expect(permissions.canManageSettings).toBe(false)
    })

    it('뷰어 권한을 반환해야 함', () => {
      const permissions = getProjectMemberPermissions(ProjectMemberRole.VIEWER)

      expect(permissions.canEdit).toBe(false)
      expect(permissions.canDelete).toBe(false)
      expect(permissions.canUploadVideos).toBe(false)
      expect(permissions.canViewAnalytics).toBe(false)
    })
  })

  describe('canUserEditProject', () => {
    it('소유자가 프로젝트를 편집할 수 있는지 확인해야 함', () => {
      const project = createProject(mockCreateProjectCommand)
      expect(canUserEditProject(project, 'user_123')).toBe(true)
    })

    it('멤버가 아닌 사용자는 프로젝트를 편집할 수 없어야 함', () => {
      const project = createProject(mockCreateProjectCommand)
      expect(canUserEditProject(project, 'user_999')).toBe(false)
    })
  })

  describe('isProjectActive', () => {
    it('활성 프로젝트를 식별해야 함', () => {
      const project = createProject(mockCreateProjectCommand)
      const activeProject = { ...project, status: ProjectStatus.IN_PROGRESS }
      expect(isProjectActive(activeProject)).toBe(true)
    })

    it('보관된 프로젝트를 비활성으로 식별해야 함', () => {
      const project = createProject(mockCreateProjectCommand)
      const archivedProject = { ...project, isArchived: true }
      expect(isProjectActive(archivedProject)).toBe(false)
    })

    it('취소된 프로젝트를 비활성으로 식별해야 함', () => {
      const project = createProject(mockCreateProjectCommand)
      const cancelledProject = { ...project, status: ProjectStatus.CANCELLED }
      expect(isProjectActive(cancelledProject)).toBe(false)
    })
  })

  describe('validateProjectName', () => {
    it('유효한 프로젝트 이름을 승인해야 함', () => {
      expect(validateProjectName('유효한 프로젝트 이름')).toBe(true)
      expect(validateProjectName('Project 123')).toBe(true)
      expect(validateProjectName('테스트-프로젝트_v1')).toBe(true)
    })

    it('잘못된 프로젝트 이름을 거부해야 함', () => {
      expect(validateProjectName('')).toBe(false)
      expect(validateProjectName('  ')).toBe(false)
      expect(validateProjectName('a'.repeat(101))).toBe(false) // 너무 긴 이름
    })
  })
})