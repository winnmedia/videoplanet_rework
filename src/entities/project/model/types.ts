// Project Domain Entity Types
export interface Project {
  id: string
  name: string
  description?: string
  status: ProjectStatus
  owner: ProjectMember
  members: ProjectMember[]
  settings: ProjectSettings
  metadata: ProjectMetadata
  createdAt: Date
  updatedAt: Date
  isArchived: boolean
}

export interface ProjectMember {
  userId: string
  role: ProjectMemberRole
  joinedAt: Date
  permissions: ProjectPermissions
}

export interface ProjectSettings {
  visibility: 'public' | 'private' | 'team'
  allowComments: boolean
  allowDownloads: boolean
  videoQuality: VideoQuality
  collaboration: CollaborationSettings
}

export interface CollaborationSettings {
  allowGuestComments: boolean
  requireApproval: boolean
  notificationSettings: ProjectNotificationSettings
}

export interface ProjectNotificationSettings {
  newComments: boolean
  statusChanges: boolean
  memberChanges: boolean
}

export interface ProjectMetadata {
  tags: string[]
  category: ProjectCategory
  estimatedDuration?: number
  actualDuration?: number
  budget?: ProjectBudget
  deliverables: string[]
}

export interface ProjectBudget {
  amount: number
  currency: string
  allocated: number
  spent: number
}

export interface ProjectPermissions {
  canEdit: boolean
  canDelete: boolean
  canInviteMembers: boolean
  canManageSettings: boolean
  canUploadVideos: boolean
  canViewAnalytics: boolean
}

export enum ProjectStatus {
  DRAFT = 'draft',
  PLANNING = 'planning',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  ON_HOLD = 'on_hold'
}

export enum ProjectMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  REVIEWER = 'reviewer',
  VIEWER = 'viewer'
}

export enum ProjectCategory {
  MARKETING = 'marketing',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  CORPORATE = 'corporate',
  DOCUMENTARY = 'documentary',
  OTHER = 'other'
}

export enum VideoQuality {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  ULTRA = 'ultra'
}

// Project Commands
export interface CreateProjectCommand {
  name: string
  description?: string
  ownerId: string
  category: ProjectCategory
  settings?: Partial<ProjectSettings>
  tags?: string[]
}

export interface UpdateProjectCommand {
  id: string
  name?: string
  description?: string
  status?: ProjectStatus
  settings?: Partial<ProjectSettings>
  metadata?: Partial<ProjectMetadata>
}

export interface AddProjectMemberCommand {
  projectId: string
  userId: string
  role: ProjectMemberRole
  invitedBy: string
}

export interface RemoveProjectMemberCommand {
  projectId: string
  userId: string
  removedBy: string
}

export interface UpdateProjectMemberRoleCommand {
  projectId: string
  userId: string
  newRole: ProjectMemberRole
  updatedBy: string
}

// Domain Events
export interface ProjectCreatedEvent {
  type: 'PROJECT_CREATED'
  payload: Project
  timestamp: Date
}

export interface ProjectUpdatedEvent {
  type: 'PROJECT_UPDATED'
  payload: { projectId: string; changes: Partial<Project> }
  timestamp: Date
}

export interface ProjectArchivedEvent {
  type: 'PROJECT_ARCHIVED'
  payload: { projectId: string; archivedBy: string }
  timestamp: Date
}

export interface ProjectMemberAddedEvent {
  type: 'PROJECT_MEMBER_ADDED'
  payload: { projectId: string; member: ProjectMember; addedBy: string }
  timestamp: Date
}

export interface ProjectMemberRemovedEvent {
  type: 'PROJECT_MEMBER_REMOVED'
  payload: { projectId: string; userId: string; removedBy: string }
  timestamp: Date
}

export type ProjectDomainEvent = 
  | ProjectCreatedEvent 
  | ProjectUpdatedEvent 
  | ProjectArchivedEvent
  | ProjectMemberAddedEvent
  | ProjectMemberRemovedEvent