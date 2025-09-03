import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { 
  ProjectListResponse,
  ProjectDetailsResponse,
  ProjectListItem,
  ProjectDetails,
  CreateProjectFormData,
  UpdateProjectFormData,
  InviteMemberData,
  UpdateMemberRoleData,
  ProjectMemberInfo,
  ProjectFilters
} from '../model/types'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

export const projectManagementApi = createApi({
  reducerPath: 'projectManagementApi',
  baseQuery: fetchBaseQuery({
    baseUrl: `${API_BASE_URL}/api/projects`,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('auth_token')
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['Project', 'ProjectList', 'ProjectMembers'],
  endpoints: (builder) => ({
    // 프로젝트 목록 조회
    getProjects: builder.query<ProjectListResponse, {
      page?: number
      limit?: number
      search?: string
      filters?: Partial<ProjectFilters>
    }>({
      query: ({ page = 1, limit = 10, search, filters }) => {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString()
        })
        
        if (search) params.append('search', search)
        if (filters?.status?.length) {
          filters.status.forEach(status => params.append('status[]', status))
        }
        if (filters?.category?.length) {
          filters.category.forEach(category => params.append('category[]', category))
        }
        if (filters?.role?.length) {
          filters.role.forEach(role => params.append('role[]', role))
        }
        if (filters?.dateRange?.from) params.append('from', filters.dateRange.from)
        if (filters?.dateRange?.to) params.append('to', filters.dateRange.to)
        if (filters?.sortBy) params.append('sortBy', filters.sortBy)
        if (filters?.sortOrder) params.append('sortOrder', filters.sortOrder)

        return `/?${params.toString()}`
      },
      providesTags: ['ProjectList']
    }),

    // 프로젝트 상세 정보 조회
    getProjectDetails: builder.query<ProjectDetailsResponse, string>({
      query: (projectId) => `/${projectId}`,
      providesTags: (result, error, projectId) => [
        { type: 'Project', id: projectId },
        { type: 'ProjectMembers', id: projectId }
      ]
    }),

    // 프로젝트 생성
    createProject: builder.mutation<{ project: ProjectListItem }, CreateProjectFormData>({
      query: (data) => ({
        url: '/',
        method: 'POST',
        body: data
      }),
      invalidatesTags: ['ProjectList']
    }),

    // 프로젝트 업데이트
    updateProject: builder.mutation<{ project: ProjectDetails }, {
      projectId: string
      data: UpdateProjectFormData
    }>({
      query: ({ projectId, data }) => ({
        url: `/${projectId}`,
        method: 'PUT',
        body: data
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'Project', id: projectId },
        'ProjectList'
      ]
    }),

    // 프로젝트 아카이브
    archiveProject: builder.mutation<{ success: boolean }, string>({
      query: (projectId) => ({
        url: `/${projectId}/archive`,
        method: 'POST'
      }),
      invalidatesTags: (result, error, projectId) => [
        { type: 'Project', id: projectId },
        'ProjectList'
      ]
    }),

    // 프로젝트 삭제
    deleteProject: builder.mutation<{ success: boolean }, string>({
      query: (projectId) => ({
        url: `/${projectId}`,
        method: 'DELETE'
      }),
      invalidatesTags: ['ProjectList']
    }),

    // 프로젝트 복원 (아카이브 해제)
    restoreProject: builder.mutation<{ success: boolean }, string>({
      query: (projectId) => ({
        url: `/${projectId}/restore`,
        method: 'POST'
      }),
      invalidatesTags: (result, error, projectId) => [
        { type: 'Project', id: projectId },
        'ProjectList'
      ]
    }),

    // 멤버 초대
    inviteMember: builder.mutation<{ member: ProjectMemberInfo }, {
      projectId: string
      data: InviteMemberData
    }>({
      query: ({ projectId, data }) => ({
        url: `/${projectId}/members/invite`,
        method: 'POST',
        body: data
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'ProjectMembers', id: projectId },
        { type: 'Project', id: projectId },
        'ProjectList'
      ]
    }),

    // 멤버 제거
    removeMember: builder.mutation<{ success: boolean }, {
      projectId: string
      memberId: string
    }>({
      query: ({ projectId, memberId }) => ({
        url: `/${projectId}/members/${memberId}`,
        method: 'DELETE'
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'ProjectMembers', id: projectId },
        { type: 'Project', id: projectId },
        'ProjectList'
      ]
    }),

    // 멤버 역할 업데이트
    updateMemberRole: builder.mutation<{ success: boolean }, {
      projectId: string
      data: UpdateMemberRoleData
    }>({
      query: ({ projectId, data }) => ({
        url: `/${projectId}/members/${data.memberId}/role`,
        method: 'PUT',
        body: { role: data.role }
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'ProjectMembers', id: projectId },
        { type: 'Project', id: projectId }
      ]
    }),

    // 프로젝트 멤버 목록 조회
    getProjectMembers: builder.query<{ members: ProjectMemberInfo[] }, string>({
      query: (projectId) => `/${projectId}/members`,
      providesTags: (result, error, projectId) => [
        { type: 'ProjectMembers', id: projectId }
      ]
    }),

    // 프로젝트 통계 조회
    getProjectStatistics: builder.query<{
      statistics: {
        totalFiles: number
        totalComments: number
        totalViewTime: number
        memberActivity: Array<{
          memberId: string
          lastActive: string
          activityCount: number
        }>
        dailyActivity: Array<{
          date: string
          fileUploads: number
          comments: number
          views: number
        }>
      }
    }, string>({
      query: (projectId) => `/${projectId}/statistics`,
      providesTags: (result, error, projectId) => [
        { type: 'Project', id: `${projectId}_stats` }
      ]
    }),

    // 프로젝트 복제
    duplicateProject: builder.mutation<{ project: ProjectListItem }, {
      projectId: string
      name: string
      includeMembers?: boolean
    }>({
      query: ({ projectId, name, includeMembers = false }) => ({
        url: `/${projectId}/duplicate`,
        method: 'POST',
        body: { name, includeMembers }
      }),
      invalidatesTags: ['ProjectList']
    }),

    // 프로젝트 즐겨찾기 토글
    toggleProjectFavorite: builder.mutation<{ isFavorite: boolean }, string>({
      query: (projectId) => ({
        url: `/${projectId}/favorite`,
        method: 'POST'
      }),
      invalidatesTags: (result, error, projectId) => [
        { type: 'Project', id: projectId },
        'ProjectList'
      ]
    }),

    // 대량 작업: 여러 프로젝트 아카이브
    bulkArchiveProjects: builder.mutation<{ success: boolean; archivedCount: number }, string[]>({
      query: (projectIds) => ({
        url: '/bulk/archive',
        method: 'POST',
        body: { projectIds }
      }),
      invalidatesTags: ['ProjectList']
    }),

    // 대량 작업: 여러 프로젝트 삭제
    bulkDeleteProjects: builder.mutation<{ success: boolean; deletedCount: number }, string[]>({
      query: (projectIds) => ({
        url: '/bulk/delete',
        method: 'POST',
        body: { projectIds }
      }),
      invalidatesTags: ['ProjectList']
    }),

    // 프로젝트 설정 업데이트
    updateProjectSettings: builder.mutation<{ success: boolean }, {
      projectId: string
      settings: {
        visibility?: 'public' | 'private' | 'team'
        allowComments?: boolean
        requireApproval?: boolean
        maxFileSize?: number
        allowedFormats?: string[]
        notifications?: {
          onComment: boolean
          onMemberJoin: boolean
          onFileUpload: boolean
          onStatusChange: boolean
        }
      }
    }>({
      query: ({ projectId, settings }) => ({
        url: `/${projectId}/settings`,
        method: 'PUT',
        body: settings
      }),
      invalidatesTags: (result, error, { projectId }) => [
        { type: 'Project', id: projectId }
      ]
    })
  })
})

export const {
  useGetProjectsQuery,
  useGetProjectDetailsQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useArchiveProjectMutation,
  useDeleteProjectMutation,
  useRestoreProjectMutation,
  useInviteMemberMutation,
  useRemoveMemberMutation,
  useUpdateMemberRoleMutation,
  useGetProjectMembersQuery,
  useGetProjectStatisticsQuery,
  useDuplicateProjectMutation,
  useToggleProjectFavoriteMutation,
  useBulkArchiveProjectsMutation,
  useBulkDeleteProjectsMutation,
  useUpdateProjectSettingsMutation,
  useLazyGetProjectsQuery,
  useLazyGetProjectDetailsQuery
} = projectManagementApi