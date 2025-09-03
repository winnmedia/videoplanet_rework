import { z } from 'zod'

// Base schemas
export const UUIDSchema = z.string().uuid()
export const ISODateSchema = z.string().datetime()
export const PositiveIntegerSchema = z.number().int().positive()
export const NonNegativeNumberSchema = z.number().nonnegative()

// Project schemas
export const ProjectStatusSchema = z.enum([
  'draft',
  'planning', 
  'in_progress',
  'review',
  'completed',
  'cancelled',
  'on_hold'
])

export const ProjectMemberRoleSchema = z.enum([
  'owner',
  'admin',
  'editor',
  'reviewer',
  'viewer'
])

export const ProjectCategorySchema = z.enum([
  'marketing',
  'education',
  'entertainment',
  'corporate',
  'documentary',
  'other'
])

export const VideoQualitySchema = z.enum([
  'low',
  'medium',
  'high',
  'ultra'
])

export const ProjectPermissionsSchema = z.object({
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  canInviteMembers: z.boolean(),
  canManageSettings: z.boolean(),
  canUploadVideos: z.boolean(),
  canViewAnalytics: z.boolean()
})

export const ProjectMemberSchema = z.object({
  userId: UUIDSchema,
  role: ProjectMemberRoleSchema,
  joinedAt: ISODateSchema,
  permissions: ProjectPermissionsSchema
})

export const CollaborationSettingsSchema = z.object({
  allowGuestComments: z.boolean(),
  requireApproval: z.boolean(),
  notificationSettings: z.object({
    newComments: z.boolean(),
    statusChanges: z.boolean(),
    memberChanges: z.boolean()
  })
})

export const ProjectSettingsSchema = z.object({
  visibility: z.enum(['public', 'private', 'team']),
  allowComments: z.boolean(),
  allowDownloads: z.boolean(),
  videoQuality: VideoQualitySchema,
  collaboration: CollaborationSettingsSchema
})

export const ProjectBudgetSchema = z.object({
  amount: NonNegativeNumberSchema,
  currency: z.string().min(3).max(3),
  allocated: NonNegativeNumberSchema,
  spent: NonNegativeNumberSchema
}).refine(data => data.spent <= data.allocated, {
  message: "지출은 할당된 예산을 초과할 수 없습니다"
})

export const ProjectMetadataSchema = z.object({
  tags: z.array(z.string()),
  category: ProjectCategorySchema,
  estimatedDuration: z.number().int().positive().optional(),
  actualDuration: z.number().int().positive().optional(),
  budget: ProjectBudgetSchema.optional(),
  deliverables: z.array(z.string())
})

export const ProjectSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  status: ProjectStatusSchema,
  owner: ProjectMemberSchema,
  members: z.array(ProjectMemberSchema),
  settings: ProjectSettingsSchema,
  metadata: ProjectMetadataSchema,
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  isArchived: z.boolean()
})

// Schedule schemas
export const ScheduleStatusSchema = z.enum([
  'draft',
  'active',
  'on_hold',
  'completed',
  'cancelled'
])

export const PhaseStatusSchema = z.enum([
  'not_started',
  'in_progress',
  'on_hold',
  'completed',
  'cancelled'
])

export const MilestoneStatusSchema = z.enum([
  'pending',
  'in_progress',
  'completed',
  'missed',
  'cancelled'
])

export const DeadlineStatusSchema = z.enum([
  'pending',
  'at_risk',
  'overdue',
  'completed'
])

export const PrioritySchema = z.enum([
  'low',
  'medium',
  'high',
  'critical'
])

export const DependencyTypeSchema = z.enum([
  'finish_to_start',
  'start_to_start',
  'finish_to_finish',
  'start_to_finish'
])

export const ResourceTypeSchema = z.enum([
  'person',
  'equipment',
  'facility',
  'material',
  'software'
])

export const WorkingDayConfigSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  isWorkingDay: z.boolean()
})

export const ProjectPhaseSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  startDate: ISODateSchema,
  endDate: ISODateSchema,
  dependencies: z.array(UUIDSchema),
  status: PhaseStatusSchema,
  progress: z.number().min(0).max(100),
  deliverables: z.array(z.string()),
  assignees: z.array(UUIDSchema)
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: "종료 날짜는 시작 날짜보다 늦어야 합니다"
})

export const ProjectTimelineSchema = z.object({
  startDate: ISODateSchema,
  endDate: ISODateSchema,
  estimatedDuration: PositiveIntegerSchema,
  actualDuration: z.number().int().positive().optional(),
  bufferDays: NonNegativeNumberSchema,
  workingDays: z.array(WorkingDayConfigSchema),
  phases: z.array(ProjectPhaseSchema)
}).refine(data => new Date(data.endDate) > new Date(data.startDate), {
  message: "종료 날짜는 시작 날짜보다 늦어야 합니다"
})

export const MilestoneSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  targetDate: ISODateSchema,
  actualDate: ISODateSchema.optional(),
  status: MilestoneStatusSchema,
  priority: PrioritySchema,
  deliverables: z.array(z.string()),
  dependencies: z.array(UUIDSchema),
  approvers: z.array(UUIDSchema),
  criteria: z.array(z.string())
})

export const DeadlineNotificationSchema = z.object({
  type: z.enum(['email', 'sms', 'push', 'in_app']),
  timing: PositiveIntegerSchema,
  recipients: z.array(UUIDSchema),
  message: z.string().max(200).optional()
})

export const DeadlineSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  dueDate: ISODateSchema,
  type: z.enum(['soft', 'hard', 'regulatory']),
  priority: PrioritySchema,
  status: DeadlineStatusSchema,
  assignees: z.array(UUIDSchema),
  notifications: z.array(DeadlineNotificationSchema),
  consequences: z.string().max(300).optional()
})

export const TaskDependencySchema = z.object({
  id: UUIDSchema,
  predecessorId: UUIDSchema,
  successorId: UUIDSchema,
  type: DependencyTypeSchema,
  lag: z.number().int(),
  description: z.string().max(200).optional()
})

export const ResourceCostSchema = z.object({
  hourlyRate: NonNegativeNumberSchema,
  currency: z.string().min(3).max(3),
  overtime: z.object({
    rate: NonNegativeNumberSchema,
    threshold: PositiveIntegerSchema
  })
})

export const TimeSlotSchema = z.object({
  startTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
  daysOfWeek: z.array(z.number().int().min(0).max(6))
})

export const ResourceExceptionSchema = z.object({
  date: ISODateSchema,
  type: z.enum(['unavailable', 'partial']),
  availableHours: z.number().nonnegative().optional(),
  reason: z.string().max(200).optional()
})

export const ResourceAvailabilitySchema = z.object({
  startDate: ISODateSchema,
  endDate: ISODateSchema,
  availableHours: NonNegativeNumberSchema,
  timeSlots: z.array(TimeSlotSchema).optional(),
  exceptions: z.array(ResourceExceptionSchema).optional()
}).refine(data => new Date(data.endDate) >= new Date(data.startDate), {
  message: "종료 날짜는 시작 날짜와 같거나 늦어야 합니다"
})

export const ScheduleResourceSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  type: ResourceTypeSchema,
  availability: z.array(ResourceAvailabilitySchema),
  cost: ResourceCostSchema.optional(),
  skills: z.array(z.string()).optional(),
  maxUtilization: z.number().min(0).max(100),
  currentUtilization: z.number().min(0).max(100)
})

export const ConflictDetectionSchema = z.object({
  id: UUIDSchema,
  type: z.enum([
    'resource_overallocation',
    'schedule_overlap',
    'deadline_impossible',
    'dependency_cycle',
    'resource_unavailable'
  ]),
  description: z.string().min(1).max(500),
  affectedItems: z.array(UUIDSchema),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  suggestedResolution: z.string().max(500).optional(),
  detectedAt: ISODateSchema,
  resolvedAt: ISODateSchema.optional()
})

export const ProjectScheduleSchema = z.object({
  id: UUIDSchema,
  projectId: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  timeline: ProjectTimelineSchema,
  milestones: z.array(MilestoneSchema),
  deadlines: z.array(DeadlineSchema),
  dependencies: z.array(TaskDependencySchema),
  resources: z.array(ScheduleResourceSchema),
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  status: ScheduleStatusSchema,
  version: PositiveIntegerSchema
})

// Template schemas
export const TemplateCategorySchema = z.enum([
  'marketing',
  'education',
  'entertainment',
  'corporate',
  'documentary',
  'social_media',
  'event',
  'product',
  'training',
  'custom'
])

export const IndustryTypeSchema = z.enum([
  'media',
  'technology',
  'healthcare',
  'finance',
  'retail',
  'manufacturing',
  'education',
  'government',
  'non_profit',
  'other'
])

export const ComplexityLevelSchema = z.enum([
  'simple',
  'moderate',
  'complex',
  'expert'
])

export const RoleTypeSchema = z.enum([
  'owner',
  'producer',
  'director',
  'editor',
  'designer',
  'writer',
  'reviewer',
  'client',
  'stakeholder',
  'admin'
])

export const ExperienceLevelSchema = z.enum([
  'junior',
  'intermediate',
  'senior',
  'expert'
])

export const DeliverableTypeSchema = z.enum([
  'video',
  'audio',
  'document',
  'image',
  'presentation',
  'dataset',
  'code',
  'design',
  'report',
  'other'
])

export const WorkflowTypeSchema = z.enum([
  'sequential',
  'parallel',
  'conditional',
  'iterative'
])

export const StepTypeSchema = z.enum([
  'creation',
  'review',
  'approval',
  'editing',
  'testing',
  'delivery',
  'archive'
])

export const RequiredRoleSchema = z.object({
  role: RoleTypeSchema,
  count: PositiveIntegerSchema,
  experienceLevel: ExperienceLevelSchema,
  skills: z.array(z.string()),
  allocation: z.number().min(0).max(100)
})

export const TemplatePhaseSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  order: NonNegativeNumberSchema,
  estimatedDuration: PositiveIntegerSchema,
  dependencies: z.array(UUIDSchema),
  deliverables: z.array(UUIDSchema),
  roles: z.array(RequiredRoleSchema),
  resources: z.array(UUIDSchema)
})

export const TemplateDeliverableSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: DeliverableTypeSchema,
  format: z.array(z.string()),
  size: z.enum(['small', 'medium', 'large', 'xlarge']).optional(),
  approvalRequired: z.boolean(),
  approvers: z.array(RoleTypeSchema),
  dependencies: z.array(UUIDSchema)
})

export const WorkflowStepSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: StepTypeSchema,
  assignee: RoleTypeSchema,
  estimatedHours: PositiveIntegerSchema,
  dependencies: z.array(UUIDSchema),
  approvals: z.array(z.object({
    required: z.boolean(),
    roles: z.array(RoleTypeSchema),
    count: PositiveIntegerSchema
  }))
})

export const WorkflowTriggerSchema = z.object({
  event: z.enum([
    'phase_started',
    'phase_completed', 
    'milestone_reached',
    'deadline_approaching',
    'deliverable_submitted',
    'approval_granted',
    'approval_rejected',
    'resource_allocated',
    'budget_threshold'
  ]),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.string(),
    value: z.any()
  })),
  actions: z.array(z.object({
    type: z.enum([
      'send_notification',
      'create_task',
      'assign_resource',
      'update_status',
      'generate_report',
      'escalate'
    ]),
    config: z.record(z.any())
  }))
})

export const TemplateWorkflowSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  type: WorkflowTypeSchema,
  steps: z.array(WorkflowStepSchema),
  triggers: z.array(WorkflowTriggerSchema),
  automation: z.array(z.object({
    name: z.string(),
    description: z.string(),
    trigger: WorkflowTriggerSchema,
    enabled: z.boolean()
  }))
})

export const TemplateStructureSchema = z.object({
  phases: z.array(TemplatePhaseSchema),
  deliverables: z.array(TemplateDeliverableSchema),
  workflows: z.array(TemplateWorkflowSchema),
  dependencies: z.array(TaskDependencySchema)
})

export const TemplateMilestoneSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  daysFromStart: NonNegativeNumberSchema,
  priority: PrioritySchema,
  criteria: z.array(z.string()),
  deliverables: z.array(UUIDSchema)
})

export const TemplateDeadlineSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  daysFromStart: NonNegativeNumberSchema,
  type: z.enum(['soft', 'hard', 'regulatory']),
  priority: PrioritySchema,
  flexibility: NonNegativeNumberSchema
})

export const WorkingHoursSchema = z.object({
  hoursPerDay: z.number().min(1).max(24),
  daysPerWeek: z.number().min(1).max(7),
  workingDays: z.array(z.number().int().min(0).max(6)),
  holidays: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/))
})

export const TemplateScheduleSchema = z.object({
  estimatedDuration: PositiveIntegerSchema,
  bufferPercentage: z.number().min(0).max(100),
  workingHours: WorkingHoursSchema,
  milestones: z.array(TemplateMilestoneSchema),
  deadlines: z.array(TemplateDeadlineSchema)
})

export const TemplateResourceSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  type: ResourceTypeSchema,
  role: RoleTypeSchema,
  skillsRequired: z.array(z.string()),
  experienceLevel: ExperienceLevelSchema,
  allocationPercentage: z.number().min(0).max(100),
  phases: z.array(UUIDSchema),
  cost: ResourceCostSchema.optional()
})

export const QualityGateSchema = z.object({
  name: z.string().min(1).max(100),
  phase: UUIDSchema,
  criteria: z.array(z.object({
    name: z.string(),
    description: z.string(),
    metric: z.string(),
    threshold: z.number()
  })),
  blockingLevel: z.enum(['warning', 'error'])
})

export const TemplateSettingsSchema = z.object({
  defaultVisibility: z.enum(['public', 'private', 'team', 'organization']),
  collaboration: CollaborationSettingsSchema,
  approvalWorkflow: z.object({
    enabled: z.boolean(),
    levels: z.array(z.object({
      level: PositiveIntegerSchema,
      name: z.string(),
      roles: z.array(RoleTypeSchema),
      threshold: PositiveIntegerSchema
    })),
    autoApproval: z.object({
      enabled: z.boolean(),
      conditions: z.array(z.object({
        field: z.string(),
        operator: z.enum(['equals', 'greater_than', 'less_than', 'contains']),
        value: z.any()
      })),
      timeout: PositiveIntegerSchema
    })
  }),
  notifications: z.object({
    newComments: z.boolean(),
    statusChanges: z.boolean(),
    memberChanges: z.boolean()
  }),
  quality: z.object({
    reviewRequired: z.boolean(),
    reviewers: z.array(RoleTypeSchema),
    qualityGates: z.array(QualityGateSchema),
    standards: z.array(z.object({
      name: z.string(),
      description: z.string(),
      requirements: z.array(z.string()),
      checkpoints: z.array(z.string())
    }))
  })
})

export const TemplateMetadataSchema = z.object({
  complexity: ComplexityLevelSchema,
  teamSize: z.object({
    min: PositiveIntegerSchema,
    max: PositiveIntegerSchema,
    optimal: PositiveIntegerSchema
  }).refine(data => data.min <= data.optimal && data.optimal <= data.max, {
    message: "팀 크기 범위가 올바르지 않습니다"
  }),
  budget: z.object({
    min: NonNegativeNumberSchema,
    max: NonNegativeNumberSchema,
    currency: z.string().min(3).max(3)
  }).refine(data => data.min <= data.max, {
    message: "예산 범위가 올바르지 않습니다"
  }),
  duration: z.object({
    min: PositiveIntegerSchema,
    max: PositiveIntegerSchema,
    typical: PositiveIntegerSchema
  }).refine(data => data.min <= data.typical && data.typical <= data.max, {
    message: "기간 범위가 올바르지 않습니다"
  }),
  successMetrics: z.array(z.string()),
  risks: z.array(z.object({
    name: z.string(),
    description: z.string(),
    probability: z.enum(['low', 'medium', 'high']),
    impact: z.enum(['low', 'medium', 'high', 'critical']),
    mitigation: z.array(z.string())
  })),
  bestPractices: z.array(z.string()),
  commonPitfalls: z.array(z.string())
})

export const ProjectTemplateSchema = z.object({
  id: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  category: TemplateCategorySchema,
  industry: IndustryTypeSchema,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  isPublic: z.boolean(),
  createdBy: UUIDSchema,
  createdAt: ISODateSchema,
  updatedAt: ISODateSchema,
  usageCount: NonNegativeNumberSchema,
  rating: z.object({
    average: z.number().min(0).max(5),
    count: NonNegativeNumberSchema,
    distribution: z.object({
      1: NonNegativeNumberSchema,
      2: NonNegativeNumberSchema,
      3: NonNegativeNumberSchema,
      4: NonNegativeNumberSchema,
      5: NonNegativeNumberSchema
    })
  }),
  tags: z.array(z.string()),
  structure: TemplateStructureSchema,
  schedule: TemplateScheduleSchema,
  resources: z.array(TemplateResourceSchema),
  settings: TemplateSettingsSchema,
  metadata: TemplateMetadataSchema
})

// API Request/Response schemas
export const CreateProjectRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  category: ProjectCategorySchema,
  settings: ProjectSettingsSchema.partial().optional(),
  tags: z.array(z.string()).optional()
})

export const CreateScheduleRequestSchema = z.object({
  projectId: UUIDSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  timeline: z.object({
    startDate: ISODateSchema,
    endDate: ISODateSchema,
    bufferDays: NonNegativeNumberSchema.optional()
  }),
  workingDays: z.array(WorkingDayConfigSchema).optional()
})

export const CreateTemplateRequestSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(10).max(1000),
  category: TemplateCategorySchema,
  industry: IndustryTypeSchema,
  structure: TemplateStructureSchema,
  schedule: TemplateScheduleSchema,
  resources: z.array(TemplateResourceSchema),
  settings: TemplateSettingsSchema,
  metadata: TemplateMetadataSchema,
  isPublic: z.boolean().default(false),
  tags: z.array(z.string()).default([])
})

export const ApplyTemplateRequestSchema = z.object({
  templateId: UUIDSchema,
  projectName: z.string().min(1).max(100),
  projectDescription: z.string().max(1000).optional(),
  customizations: z.object({
    startDate: ISODateSchema.optional(),
    budget: z.number().positive().optional(),
    teamMembers: z.array(UUIDSchema).optional(),
    modifications: z.object({
      structure: TemplateStructureSchema.partial().optional(),
      schedule: TemplateScheduleSchema.partial().optional(),
      resources: z.array(TemplateResourceSchema).optional(),
      settings: TemplateSettingsSchema.partial().optional()
    }).optional()
  }).optional()
})

// Response schemas
export const ProjectResponseSchema = ProjectSchema
export const ScheduleResponseSchema = ProjectScheduleSchema
export const TemplateResponseSchema = ProjectTemplateSchema

export const ProjectListResponseSchema = z.object({
  projects: z.array(ProjectSchema),
  total: NonNegativeNumberSchema,
  page: PositiveIntegerSchema,
  limit: PositiveIntegerSchema,
  hasNext: z.boolean()
})

export const TemplateListResponseSchema = z.object({
  templates: z.array(ProjectTemplateSchema),
  total: NonNegativeNumberSchema,
  page: PositiveIntegerSchema,
  limit: PositiveIntegerSchema,
  hasNext: z.boolean()
})

export const ConflictDetectionResponseSchema = z.object({
  conflicts: z.array(ConflictDetectionSchema),
  scheduleId: UUIDSchema,
  detectedAt: ISODateSchema
})

// Error schemas
export const ValidationErrorSchema = z.object({
  field: z.string(),
  message: z.string(),
  value: z.any()
})

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
  details: z.array(ValidationErrorSchema).optional(),
  timestamp: ISODateSchema,
  path: z.string()
})

// Type exports for TypeScript integration
export type ProjectRequest = z.infer<typeof CreateProjectRequestSchema>
export type ScheduleRequest = z.infer<typeof CreateScheduleRequestSchema>
export type TemplateRequest = z.infer<typeof CreateTemplateRequestSchema>
export type ApplyTemplateRequest = z.infer<typeof ApplyTemplateRequestSchema>

export type ProjectResponse = z.infer<typeof ProjectResponseSchema>
export type ScheduleResponse = z.infer<typeof ScheduleResponseSchema>
export type TemplateResponse = z.infer<typeof TemplateResponseSchema>

export type ProjectListResponse = z.infer<typeof ProjectListResponseSchema>
export type TemplateListResponse = z.infer<typeof TemplateListResponseSchema>
export type ConflictDetectionResponse = z.infer<typeof ConflictDetectionResponseSchema>

export type ValidationError = z.infer<typeof ValidationErrorSchema>
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>