import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { 
  ProjectManagementState, 
  ProjectListItem, 
  ProjectDetails, 
  ProjectFilters,
  ProjectMemberInfo
} from './types'

const initialState: ProjectManagementState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
  searchQuery: '',
  filters: {
    sortBy: 'updated',
    sortOrder: 'desc'
  },
  selectedProjects: []
}

const projectManagementSlice = createSlice({
  name: 'projectManagement',
  initialState,
  reducers: {
    // 프로젝트 목록 로딩
    loadProjectsStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    loadProjectsSuccess: (state, action: PayloadAction<{ projects: ProjectListItem[] }>) => {
      state.isLoading = false
      state.projects = action.payload.projects
      state.error = null
    },
    loadProjectsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // 검색 및 필터
    searchProjects: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload
    },
    filterProjects: (state, action: PayloadAction<Partial<ProjectFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },

    // 프로젝트 선택
    selectProject: (state, action: PayloadAction<string>) => {
      state.selectedProjects = [action.payload]
    },
    selectMultipleProjects: (state, action: PayloadAction<string[]>) => {
      state.selectedProjects = action.payload
    },

    // 프로젝트 생성
    createProjectStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    createProjectSuccess: (state, action: PayloadAction<{ project: ProjectListItem }>) => {
      state.isLoading = false
      state.projects = [action.payload.project, ...state.projects]
      state.error = null
    },
    createProjectFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // 프로젝트 상세 정보
    loadProjectDetailsStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    loadProjectDetailsSuccess: (state, action: PayloadAction<{ project: ProjectDetails }>) => {
      state.isLoading = false
      state.currentProject = action.payload.project
      state.error = null
    },
    loadProjectDetailsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // 프로젝트 업데이트
    updateProjectStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    updateProjectSuccess: (
      state, 
      action: PayloadAction<{ projectId: string; updates: Partial<ProjectDetails> }>
    ) => {
      state.isLoading = false
      const { projectId, updates } = action.payload

      // 프로젝트 목록에서 해당 프로젝트 업데이트
      const projectIndex = state.projects.findIndex(p => p.id === projectId)
      if (projectIndex !== -1) {
        state.projects[projectIndex] = { ...state.projects[projectIndex], ...updates }
      }

      // 현재 프로젝트가 업데이트된 프로젝트인 경우 업데이트
      if (state.currentProject?.id === projectId) {
        state.currentProject = { ...state.currentProject, ...updates }
      }

      state.error = null
    },
    updateProjectFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // 프로젝트 아카이브
    archiveProjectStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    archiveProjectSuccess: (state, action: PayloadAction<{ projectId: string }>) => {
      state.isLoading = false
      const projectIndex = state.projects.findIndex(p => p.id === action.payload.projectId)
      if (projectIndex !== -1) {
        state.projects[projectIndex].status = 'archived'
      }
      if (state.currentProject?.id === action.payload.projectId) {
        state.currentProject.status = 'archived'
      }
    },
    archiveProjectFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // 프로젝트 삭제
    deleteProjectStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    deleteProjectSuccess: (state, action: PayloadAction<{ projectId: string }>) => {
      state.isLoading = false
      state.projects = state.projects.filter(p => p.id !== action.payload.projectId)
      if (state.currentProject?.id === action.payload.projectId) {
        state.currentProject = null
      }
      state.selectedProjects = state.selectedProjects.filter(id => id !== action.payload.projectId)
    },
    deleteProjectFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // 멤버 관리
    inviteMemberStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    inviteMemberSuccess: (
      state, 
      action: PayloadAction<{ projectId: string; member: ProjectMemberInfo }>
    ) => {
      state.isLoading = false
      if (state.currentProject?.id === action.payload.projectId) {
        state.currentProject.members.push(action.payload.member)
      }
      // 프로젝트 목록의 멤버 수 업데이트
      const projectIndex = state.projects.findIndex(p => p.id === action.payload.projectId)
      if (projectIndex !== -1) {
        state.projects[projectIndex].memberCount += 1
      }
    },
    inviteMemberFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    removeMemberStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    removeMemberSuccess: (
      state, 
      action: PayloadAction<{ projectId: string; memberId: string }>
    ) => {
      state.isLoading = false
      const { projectId, memberId } = action.payload
      
      if (state.currentProject?.id === projectId) {
        state.currentProject.members = state.currentProject.members.filter(
          member => member.id !== memberId
        )
      }
      // 프로젝트 목록의 멤버 수 업데이트
      const projectIndex = state.projects.findIndex(p => p.id === projectId)
      if (projectIndex !== -1) {
        state.projects[projectIndex].memberCount -= 1
      }
    },
    removeMemberFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    updateMemberRoleStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    updateMemberRoleSuccess: (
      state, 
      action: PayloadAction<{ projectId: string; memberId: string; role: string }>
    ) => {
      state.isLoading = false
      const { projectId, memberId, role } = action.payload
      
      if (state.currentProject?.id === projectId) {
        const memberIndex = state.currentProject.members.findIndex(m => m.id === memberId)
        if (memberIndex !== -1) {
          state.currentProject.members[memberIndex].role = role as 'admin' | 'member' | 'viewer'
        }
      }
    },
    updateMemberRoleFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // 유틸리티
    clearError: (state) => {
      state.error = null
    },
    resetState: () => initialState
  }
})

export const {
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
  archiveProjectStart,
  archiveProjectSuccess,
  archiveProjectFailure,
  deleteProjectStart,
  deleteProjectSuccess,
  deleteProjectFailure,
  inviteMemberStart,
  inviteMemberSuccess,
  inviteMemberFailure,
  removeMemberStart,
  removeMemberSuccess,
  removeMemberFailure,
  updateMemberRoleStart,
  updateMemberRoleSuccess,
  updateMemberRoleFailure,
  clearError,
  resetState
} = projectManagementSlice.actions

export default projectManagementSlice.reducer