// Project Management Feature Types

export interface ProjectManagementState {
  projects: ProjectListItem[]
  currentProject: ProjectDetails | null
  isLoading: boolean
  error: string | null
  searchQuery: string
  filters: ProjectFilters
  selectedProjects: string[]
}

export interface ProjectListItem {
  id: string
  name: string
  description?: string
  status: 'active' | 'completed' | 'archived' | 'paused'
  category: string
  memberCount: number
  lastUpdated: string
  createdAt: string
  owner: {
    id: string
    name: string
    avatar?: string
  }
  isOwner: boolean
  role: 'owner' | 'admin' | 'member' | 'viewer'
}

export interface ProjectDetails {
  id: string
  name: string
  description?: string
  status: 'active' | 'completed' | 'archived' | 'paused'
  category: string
  settings: {
    visibility: 'public' | 'private' | 'team'
    allowComments: boolean
    requireApproval: boolean
    maxFileSize: number
    allowedFormats: string[]
  }
  members: ProjectMemberInfo[]
  statistics: {
    totalFiles: number
    totalComments: number
    totalViewTime: number
    lastActivity: string
  }
  permissions: {
    canEdit: boolean
    canDelete: boolean
    canInvite: boolean
    canManageMembers: boolean
    canChangeSettings: boolean
  }
  createdAt: string
  updatedAt: string
}

export interface ProjectMemberInfo {
  id: string
  userId: string
  name: string
  email: string
  avatar?: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joinedAt: string
  lastActivity?: string
  permissions: string[]
}

export interface ProjectFilters {
  status?: string[]
  category?: string[]
  role?: string[]
  dateRange?: {
    from: string
    to: string
  }
  sortBy: 'name' | 'created' | 'updated' | 'activity'
  sortOrder: 'asc' | 'desc'
}

export interface CreateProjectFormData {
  name: string
  description?: string
  category: string
  visibility: 'public' | 'private' | 'team'
  settings?: {
    allowComments?: boolean
    requireApproval?: boolean
    maxFileSize?: number
    allowedFormats?: string[]
  }
}

export interface UpdateProjectFormData {
  name?: string
  description?: string
  category?: string
  status?: 'active' | 'completed' | 'archived' | 'paused'
  settings?: {
    visibility?: 'public' | 'private' | 'team'
    allowComments?: boolean
    requireApproval?: boolean
    maxFileSize?: number
    allowedFormats?: string[]
  }
}

export interface InviteMemberData {
  email: string
  role: 'admin' | 'member' | 'viewer'
  message?: string
}

export interface UpdateMemberRoleData {
  memberId: string
  role: 'admin' | 'member' | 'viewer'
}

// API Response Types
export interface ProjectListResponse {
  projects: ProjectListItem[]
  pagination: {
    total: number
    page: number
    limit: number
    hasMore: boolean
  }
}

export interface ProjectDetailsResponse {
  project: ProjectDetails
}

// Action Types
export interface ProjectManagementActions {
  // Project List Actions
  loadProjects: (filters?: Partial<ProjectFilters>) => Promise<void>
  searchProjects: (query: string) => void
  filterProjects: (filters: Partial<ProjectFilters>) => void
  selectProject: (projectId: string) => void
  selectMultipleProjects: (projectIds: string[]) => void
  
  // Project CRUD Actions  
  createProject: (data: CreateProjectFormData) => Promise<string>
  loadProjectDetails: (projectId: string) => Promise<void>
  updateProject: (projectId: string, data: UpdateProjectFormData) => Promise<void>
  archiveProject: (projectId: string) => Promise<void>
  deleteProject: (projectId: string) => Promise<void>
  
  // Member Management Actions
  inviteMember: (projectId: string, data: InviteMemberData) => Promise<void>
  removeMember: (projectId: string, memberId: string) => Promise<void>
  updateMemberRole: (projectId: string, data: UpdateMemberRoleData) => Promise<void>
  
  // Bulk Actions
  bulkArchiveProjects: (projectIds: string[]) => Promise<void>
  bulkDeleteProjects: (projectIds: string[]) => Promise<void>
  
  // State Management
  clearError: () => void
  resetState: () => void
}

// Event Types
export type ProjectManagementEvent = 
  | { type: 'project_created'; payload: { projectId: string; project: ProjectDetails } }
  | { type: 'project_updated'; payload: { projectId: string; changes: Partial<ProjectDetails> } }
  | { type: 'project_archived'; payload: { projectId: string } }
  | { type: 'project_deleted'; payload: { projectId: string } }
  | { type: 'member_invited'; payload: { projectId: string; member: ProjectMemberInfo } }
  | { type: 'member_removed'; payload: { projectId: string; memberId: string } }
  | { type: 'role_updated'; payload: { projectId: string; memberId: string; role: string } }