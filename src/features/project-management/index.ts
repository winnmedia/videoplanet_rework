// Project Management Feature Public API

// Components
export * from './ProjectCreateForm'
export * from './TeamInviteForm'

// Types
export type {
  ProjectManagementState,
  ProjectListItem,
  ProjectDetails,
  ProjectMemberInfo,
  ProjectFilters,
  CreateProjectFormData,
  UpdateProjectFormData,
  InviteMemberData,
  UpdateMemberRoleData,
  ProjectManagementActions,
  ProjectManagementEvent,
  ProjectListResponse,
  ProjectDetailsResponse
} from './model/types'

// Redux State Management
export { default as projectManagementReducer } from './model/projectManagementSlice'
export {
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
} from './model/projectManagementSlice'

// RTK Query API
export {
  projectManagementApi,
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
} from './api/projectManagementApi'