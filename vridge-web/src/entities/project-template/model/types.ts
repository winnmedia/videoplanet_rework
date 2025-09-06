/**
 * Project Template Domain Types
 * FSD 경계: 프로젝트 템플릿 엔티티의 순수 도메인 타입들
 */

export enum ComplexityLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate', 
  COMPLEX = 'complex',
  EXPERT = 'expert'
}

export enum TemplateCategory {
  MARKETING = 'marketing',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  CORPORATE = 'corporate',
  DOCUMENTARY = 'documentary',
  SOCIAL_MEDIA = 'social_media',
  EVENT = 'event',
  PRODUCT = 'product',
  TRAINING = 'training',
  CUSTOM = 'custom'
}

export enum IndustryType {
  TECHNOLOGY = 'technology',
  HEALTHCARE = 'healthcare',
  FINANCE = 'finance',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  MANUFACTURING = 'manufacturing',
  RETAIL = 'retail',
  OTHER = 'other'
}

export enum RoleType {
  DIRECTOR = 'director',
  PRODUCER = 'producer',
  CINEMATOGRAPHER = 'cinematographer',
  EDITOR = 'editor',
  SOUND_ENGINEER = 'sound_engineer',
  GRAPHIC_DESIGNER = 'graphic_designer',
  TALENT = 'talent',
  OTHER = 'other'
}

// Independent types for project template (no cross-entity dependencies)
export enum ProjectCategory {
  MARKETING = 'marketing',
  EDUCATION = 'education',
  ENTERTAINMENT = 'entertainment',
  CORPORATE = 'corporate',
  DOCUMENTARY = 'documentary',
  OTHER = 'other'
}

export enum ProjectMemberRole {
  OWNER = 'owner',
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

// Template-specific project types (independent of project entity)
export interface TemplateProject {
  id: string
  name: string
  description: string
  status: 'draft' | 'active' | 'completed' | 'archived'
  owner: {
    userId: string
    role: ProjectMemberRole
    joinedAt: Date
    permissions: {
      canEdit: boolean
      canDelete: boolean
      canInviteMembers: boolean
      canManageSettings: boolean
      canUploadVideos: boolean
      canViewAnalytics: boolean
    }
  }
  members: Array<{
    userId: string
    role: ProjectMemberRole
    joinedAt: Date
    permissions: {
      canEdit: boolean
      canDelete: boolean
      canInviteMembers: boolean
      canManageSettings: boolean
      canUploadVideos: boolean
      canViewAnalytics: boolean
    }
  }>
  settings: {
    visibility: 'public' | 'private' | 'unlisted'
    allowComments: boolean
    allowDownloads: boolean
    videoQuality: 'low' | 'medium' | 'high' | 'ultra'
    collaboration: {
      allowGuestComments: boolean
      requireApproval: boolean
      notificationSettings: {
        emailNotifications: boolean
        pushNotifications: boolean
        slackIntegration: boolean
      }
    }
  }
  metadata: {
    tags: string[]
    category: ProjectCategory
    deliverables: string[]
  }
  createdAt: Date
  updatedAt: Date
  isArchived: boolean
}

// Template-specific schedule types (independent of schedule entity)
export interface TemplateProjectSchedule {
  id: string
  projectId: string
  name: string
  description: string
  timeline: {
    startDate: Date
    endDate: Date
    estimatedDuration: number
    bufferDays: number
    workingDays: {
      monday: boolean
      tuesday: boolean
      wednesday: boolean
      thursday: boolean
      friday: boolean
      saturday: boolean
      sunday: boolean
      hoursPerDay: number
    }
    phases: Array<{
      id: string
      name: string
      description: string
      startDate: Date
      endDate: Date
      dependencies: string[]
      status: 'not_started' | 'in_progress' | 'completed' | 'blocked'
      progress: number
      deliverables: string[]
      assignees: string[]
    }>
  }
  milestones: Array<{
    id: string
    name: string
    description: string
    targetDate: Date
    status: 'pending' | 'achieved' | 'missed'
    priority: 'low' | 'medium' | 'high' | 'critical'
    deliverables: string[]
    dependencies: string[]
    approvers: string[]
    criteria: string[]
  }>
  deadlines: Array<{
    id: string
    name: string
    description: string
    dueDate: Date
    type: 'soft' | 'hard'
    priority: 'low' | 'medium' | 'high' | 'critical'
    status: 'pending' | 'completed' | 'overdue'
    assignees: string[]
    notifications: string[]
  }>
  dependencies: Array<{
    id: string
    type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
    predecessorId: string
    successorId: string
    lag: number
  }>
  resources: Array<{
    id: string
    name: string
    type: 'person' | 'equipment' | 'software' | 'material'
    allocationPercentage: number
    cost?: {
      hourlyRate: number
      currency: string
    }
  }>
  createdAt: Date
  updatedAt: Date
  status: 'draft' | 'active' | 'completed' | 'archived'
  version: number
}

export interface TemplateRating {
  average: number
  count: number
  distribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  category: TemplateCategory
  industry: IndustryType
  version: string
  isPublic: boolean
  createdBy: string
  createdAt: Date
  updatedAt: Date
  usageCount: number
  rating: TemplateRating
  tags: string[]
  structure: {
    phases: Array<{
      id: string
      name: string
      description: string
      order: number
      estimatedDuration: number
      dependencies: string[]
      deliverables: string[]
      resources: string[]
    }>
    deliverables: Array<{
      id: string
      name: string
      description: string
      type: 'video' | 'document' | 'asset' | 'report' | 'other'
      estimatedSize?: number
      format?: string
      quality?: string
    }>
    workflows: Array<{
      id: string
      name: string
      description: string
      steps: Array<{
        id: string
        name: string
        description: string
        order: number
        estimatedDuration: number
        role: RoleType
        dependencies: string[]
        outputs: string[]
      }>
    }>
    dependencies: Array<{
      id: string
      type: 'sequence' | 'parallel' | 'conditional'
      sourceId: string
      targetId: string
      condition?: string
    }>
  }
  schedule: {
    estimatedDuration: number
    bufferPercentage: number
    workingHours: {
      hoursPerDay: number
      workingDays: string[]
    }
    milestones: Array<{
      name: string
      description: string
      daysFromStart: number
      priority: 'low' | 'medium' | 'high' | 'critical'
      deliverables: string[]
      criteria: string[]
    }>
    deadlines: Array<{
      name: string
      description: string
      daysFromStart: number
      type: 'soft' | 'hard'
      priority: 'low' | 'medium' | 'high' | 'critical'
    }>
  }
  resources: Array<{
    id: string
    name: string
    role: RoleType
    type: 'person' | 'equipment' | 'software' | 'material'
    allocationPercentage: number
    cost?: {
      hourlyRate: number
      currency: string
    }
    skills?: string[]
    availability?: string
  }>
  settings: {
    defaultVisibility: 'public' | 'private' | 'unlisted'
    collaboration: {
      allowGuestComments: boolean
      requireApproval: boolean
      notificationSettings: {
        emailNotifications: boolean
        pushNotifications: boolean
        slackIntegration: boolean
      }
    }
  }
  metadata: {
    complexity: ComplexityLevel
    teamSize: {
      min: number
      max: number
      recommended: number
    }
    estimatedCost: {
      min: number
      max: number
      currency: string
    }
    prerequisites: string[]
    learningOutcomes?: string[]
    successMetrics?: string[]
  }
}

// Command types
export interface CreateTemplateCommand {
  name: string
  description: string
  category: TemplateCategory
  industry: IndustryType
  isPublic: boolean
  createdBy: string
  tags: string[]
  structure: ProjectTemplate['structure']
  schedule: ProjectTemplate['schedule']
  resources: ProjectTemplate['resources']
  settings: ProjectTemplate['settings']
  metadata: ProjectTemplate['metadata']
}

export interface UpdateTemplateCommand {
  templateId: string
  name?: string
  description?: string
  category?: TemplateCategory
  isPublic?: boolean
  tags?: string[]
  structure?: Partial<ProjectTemplate['structure']>
  schedule?: Partial<ProjectTemplate['schedule']>
  resources?: ProjectTemplate['resources']
  settings?: Partial<ProjectTemplate['settings']>
  metadata?: Partial<ProjectTemplate['metadata']>
}

export interface CloneTemplateCommand {
  templateId: string
  name: string
  description?: string
  clonedBy: string
  modifications?: TemplateModifications
}

export interface ApplyTemplateCommand {
  templateId: string
  projectName: string
  projectDescription?: string
  appliedBy: string
  customizations?: ProjectCustomizations
}

export interface RateTemplateCommand {
  templateId: string
  rating: 1 | 2 | 3 | 4 | 5
  userId: string
  comment?: string
}

export interface TemplateModifications {
  structure?: Partial<ProjectTemplate['structure']>
  schedule?: Partial<ProjectTemplate['schedule']>
  resources?: ProjectTemplate['resources']
  settings?: Partial<ProjectTemplate['settings']>
}

export interface ProjectCustomizations {
  startDate?: Date
  teamSize?: number
  budget?: {
    amount: number
    currency: string
  }
  specificRequirements?: string[]
}

// Command types for template-created projects
export interface CreateProjectCommand {
  name: string
  description: string
  ownerId: string
  category: ProjectCategory
  settings: TemplateProject['settings']
  tags: string[]
}

export interface CreateScheduleCommand {
  projectId: string
  name: string
  description: string
  timeline: {
    startDate: Date
    endDate: Date
    bufferDays: number
  }
  createdBy: string
}