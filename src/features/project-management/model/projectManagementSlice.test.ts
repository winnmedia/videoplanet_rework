import { configureStore } from '@reduxjs/toolkit'
import projectManagementSlice, {
  loadProjectsStart,
  loadProjectsSuccess,
  loadProjectsFailure,
  searchProjects,
  filterProjects,
  selectProject,
  selectMultipleProjects,
  createProjectStart,
  createProjectSuccess,
  createProjectFailure,
  loadProjectDetailsStart,
  loadProjectDetailsSuccess,
  loadProjectDetailsFailure,
  updateProjectStart,
  updateProjectSuccess,
  updateProjectFailure,
  clearError,
  resetState
} from './projectManagementSlice'
import type { 
  ProjectManagementState, 
  ProjectListItem, 
  ProjectDetails, 
  ProjectFilters 
} from './types'

describe('Project Management Slice', () => {
  type RootState = {
    projectManagement: ProjectManagementState
  }
  
  let store: ReturnType<typeof configureStore<RootState>>

  const mockProjectListItem: ProjectListItem = {
    id: 'project_123',
    name: '테스트 프로젝트',
    description: '테스트용 프로젝트입니다',
    status: 'active',
    category: '웹 개발',
    memberCount: 3,
    lastUpdated: '2025-01-01T10:00:00Z',
    createdAt: '2025-01-01T09:00:00Z',
    owner: {
      id: 'user_456',
      name: '홍길동',
      avatar: 'https://example.com/avatar.jpg'
    },
    isOwner: true,
    role: 'owner'
  }

  const mockProjectDetails: ProjectDetails = {
    id: 'project_123',
    name: '테스트 프로젝트',
    description: '테스트용 프로젝트입니다',
    status: 'active',
    category: '웹 개발',
    settings: {
      visibility: 'private',
      allowComments: true,
      requireApproval: false,
      maxFileSize: 100,
      allowedFormats: ['mp4', 'mov', 'avi']
    },
    members: [
      {
        id: 'member_789',
        userId: 'user_456',
        name: '홍길동',
        email: 'hong@example.com',
        role: 'owner',
        joinedAt: '2025-01-01T09:00:00Z',
        permissions: ['all']
      }
    ],
    statistics: {
      totalFiles: 5,
      totalComments: 12,
      totalViewTime: 3600,
      lastActivity: '2025-01-01T11:00:00Z'
    },
    permissions: {
      canEdit: true,
      canDelete: true,
      canInvite: true,
      canManageMembers: true,
      canChangeSettings: true
    },
    createdAt: '2025-01-01T09:00:00Z',
    updatedAt: '2025-01-01T10:00:00Z'
  }

  beforeEach(() => {
    store = configureStore({
      reducer: {
        projectManagement: projectManagementSlice
      }
    })
  })

  describe('초기 상태', () => {
    it('올바른 초기 상태를 가져야 함', () => {
      const state = store.getState().projectManagement

      expect(state.projects).toEqual([])
      expect(state.currentProject).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.searchQuery).toBe('')
      expect(state.selectedProjects).toEqual([])
      expect(state.filters).toEqual({
        sortBy: 'updated',
        sortOrder: 'desc'
      })
    })
  })

  describe('프로젝트 목록 액션', () => {
    it('loadProjectsStart - 로딩 상태를 설정해야 함', () => {
      store.dispatch(loadProjectsStart())
      
      const state = store.getState().projectManagement
      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('loadProjectsSuccess - 프로젝트 목록과 함께 성공 상태를 설정해야 함', () => {
      const projects = [mockProjectListItem]
      
      store.dispatch(loadProjectsSuccess({ projects }))
      
      const state = store.getState().projectManagement
      expect(state.isLoading).toBe(false)
      expect(state.projects).toEqual(projects)
      expect(state.error).toBeNull()
    })

    it('loadProjectsFailure - 에러 상태를 설정해야 함', () => {
      const errorMessage = '프로젝트 목록을 불러올 수 없습니다'
      
      store.dispatch(loadProjectsFailure(errorMessage))
      
      const state = store.getState().projectManagement
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('검색 및 필터 액션', () => {
    it('searchProjects - 검색 쿼리를 업데이트해야 함', () => {
      const searchQuery = '테스트'
      
      store.dispatch(searchProjects(searchQuery))
      
      const state = store.getState().projectManagement
      expect(state.searchQuery).toBe(searchQuery)
    })

    it('filterProjects - 필터를 업데이트해야 함', () => {
      const filters: Partial<ProjectFilters> = {
        status: ['active'],
        category: ['웹 개발'],
        sortBy: 'name'
      }
      
      store.dispatch(filterProjects(filters))
      
      const state = store.getState().projectManagement
      expect(state.filters.status).toEqual(['active'])
      expect(state.filters.category).toEqual(['웹 개발'])
      expect(state.filters.sortBy).toBe('name')
    })
  })

  describe('프로젝트 선택 액션', () => {
    it('selectProject - 단일 프로젝트를 선택해야 함', () => {
      const projectId = 'project_123'
      
      store.dispatch(selectProject(projectId))
      
      const state = store.getState().projectManagement
      expect(state.selectedProjects).toEqual([projectId])
    })

    it('selectMultipleProjects - 여러 프로젝트를 선택해야 함', () => {
      const projectIds = ['project_123', 'project_456']
      
      store.dispatch(selectMultipleProjects(projectIds))
      
      const state = store.getState().projectManagement
      expect(state.selectedProjects).toEqual(projectIds)
    })
  })

  describe('프로젝트 생성 액션', () => {
    it('createProjectStart - 생성 로딩 상태를 설정해야 함', () => {
      store.dispatch(createProjectStart())
      
      const state = store.getState().projectManagement
      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('createProjectSuccess - 새 프로젝트를 목록에 추가해야 함', () => {
      const newProject = mockProjectListItem
      
      store.dispatch(createProjectSuccess({ project: newProject }))
      
      const state = store.getState().projectManagement
      expect(state.isLoading).toBe(false)
      expect(state.projects).toContain(newProject)
    })

    it('createProjectFailure - 생성 실패 에러를 설정해야 함', () => {
      const errorMessage = '프로젝트를 생성할 수 없습니다'
      
      store.dispatch(createProjectFailure(errorMessage))
      
      const state = store.getState().projectManagement
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('프로젝트 상세 정보 액션', () => {
    it('loadProjectDetailsStart - 상세 정보 로딩 상태를 설정해야 함', () => {
      store.dispatch(loadProjectDetailsStart())
      
      const state = store.getState().projectManagement
      expect(state.isLoading).toBe(true)
    })

    it('loadProjectDetailsSuccess - 현재 프로젝트 상세 정보를 설정해야 함', () => {
      store.dispatch(loadProjectDetailsSuccess({ project: mockProjectDetails }))
      
      const state = store.getState().projectManagement
      expect(state.isLoading).toBe(false)
      expect(state.currentProject).toEqual(mockProjectDetails)
    })

    it('loadProjectDetailsFailure - 상세 정보 로딩 실패 에러를 설정해야 함', () => {
      const errorMessage = '프로젝트 상세 정보를 불러올 수 없습니다'
      
      store.dispatch(loadProjectDetailsFailure(errorMessage))
      
      const state = store.getState().projectManagement
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('프로젝트 업데이트 액션', () => {
    it('updateProjectStart - 업데이트 로딩 상태를 설정해야 함', () => {
      store.dispatch(updateProjectStart())
      
      const state = store.getState().projectManagement
      expect(state.isLoading).toBe(true)
    })

    it('updateProjectSuccess - 프로젝트 목록과 현재 프로젝트를 업데이트해야 함', () => {
      // 먼저 프로젝트를 목록과 현재 프로젝트로 설정
      store.dispatch(loadProjectsSuccess({ projects: [mockProjectListItem] }))
      store.dispatch(loadProjectDetailsSuccess({ project: mockProjectDetails }))

      const updatedData = { 
        name: '업데이트된 프로젝트', 
        description: '업데이트된 설명' 
      }
      
      store.dispatch(updateProjectSuccess({ 
        projectId: 'project_123', 
        updates: updatedData 
      }))
      
      const state = store.getState().projectManagement
      expect(state.isLoading).toBe(false)
      expect(state.currentProject?.name).toBe('업데이트된 프로젝트')
      expect(state.projects[0].name).toBe('업데이트된 프로젝트')
    })

    it('updateProjectFailure - 업데이트 실패 에러를 설정해야 함', () => {
      const errorMessage = '프로젝트를 업데이트할 수 없습니다'
      
      store.dispatch(updateProjectFailure(errorMessage))
      
      const state = store.getState().projectManagement
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('유틸리티 액션', () => {
    it('clearError - 에러를 클리어해야 함', () => {
      // 먼저 에러를 설정
      store.dispatch(loadProjectsFailure('테스트 에러'))
      
      store.dispatch(clearError())
      
      const state = store.getState().projectManagement
      expect(state.error).toBeNull()
    })

    it('resetState - 상태를 초기값으로 리셋해야 함', () => {
      // 먼저 상태를 변경
      store.dispatch(loadProjectsSuccess({ projects: [mockProjectListItem] }))
      store.dispatch(searchProjects('테스트'))
      
      store.dispatch(resetState())
      
      const state = store.getState().projectManagement
      expect(state.projects).toEqual([])
      expect(state.currentProject).toBeNull()
      expect(state.searchQuery).toBe('')
      expect(state.selectedProjects).toEqual([])
    })
  })
})