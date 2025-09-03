// Project Template Domain Entity Types
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
  
  // Template Structure
  structure: TemplateStructure
  schedule: TemplateSchedule
  resources: TemplateResource[]
  settings: TemplateSettings
  
  // Metadata
  metadata: TemplateMetadata
}

export interface TemplateStructure {
  phases: TemplatePhase[]
  deliverables: TemplateDeliverable[]
  workflows: TemplateWorkflow[]
  dependencies: TemplateDependency[]
}

export interface TemplatePhase {
  id: string
  name: string
  description?: string
  order: number
  estimatedDuration: number // in days
  dependencies: string[] // other phase IDs
  deliverables: string[] // deliverable IDs
  roles: RequiredRole[]
  resources: string[] // resource IDs
}

export interface TemplateDeliverable {
  id: string
  name: string
  description?: string
  type: DeliverableType
  format: string[] // file formats
  size?: DeliverableSize
  approvalRequired: boolean
  approvers: RoleType[]
  dependencies: string[] // other deliverable IDs
}

export interface TemplateWorkflow {
  id: string
  name: string
  description?: string
  type: WorkflowType
  steps: WorkflowStep[]
  triggers: WorkflowTrigger[]
  automation: WorkflowAutomation[]
}

export interface WorkflowStep {
  id: string
  name: string
  description?: string
  type: StepType
  assignee: RoleType
  estimatedHours: number
  dependencies: string[] // previous step IDs
  approvals: ApprovalRequirement[]
}

export interface TemplateDependency {
  id: string
  predecessorId: string
  successorId: string
  type: DependencyType
  lag: number // in hours
  description?: string
}

export interface TemplateSchedule {
  estimatedDuration: number // total project duration in days
  bufferPercentage: number
  workingHours: WorkingHours
  milestones: TemplateMilestone[]
  deadlines: TemplateDeadline[]
}

export interface TemplateMilestone {
  id: string
  name: string
  description?: string
  daysFromStart: number
  priority: Priority
  criteria: string[]
  deliverables: string[]
}

export interface TemplateDeadline {
  id: string
  name: string
  description?: string
  daysFromStart: number
  type: DeadlineType
  priority: Priority
  flexibility: number // days that can be moved
}

export interface WorkingHours {
  hoursPerDay: number
  daysPerWeek: number
  workingDays: number[] // 0-6, Sunday to Saturday
  holidays: string[] // ISO date strings
}

export interface TemplateResource {
  id: string
  name: string
  type: ResourceType
  role: RoleType
  skillsRequired: string[]
  experienceLevel: ExperienceLevel
  allocationPercentage: number // 0-100
  phases: string[] // which phases this resource is needed
  cost?: ResourceCost
}

export interface RequiredRole {
  role: RoleType
  count: number
  experienceLevel: ExperienceLevel
  skills: string[]
  allocation: number // percentage
}

export interface TemplateSettings {
  defaultVisibility: ProjectVisibility
  collaboration: CollaborationSettings
  approvalWorkflow: ApprovalWorkflowSettings
  notifications: NotificationSettings
  quality: QualitySettings
}

export interface ApprovalWorkflowSettings {
  enabled: boolean
  levels: ApprovalLevel[]
  autoApproval: AutoApprovalRules
}

export interface ApprovalLevel {
  level: number
  name: string
  roles: RoleType[]
  threshold: number // minimum approvers needed
}

export interface AutoApprovalRules {
  enabled: boolean
  conditions: ApprovalCondition[]
  timeout: number // hours
}

export interface ApprovalCondition {
  field: string
  operator: 'equals' | 'greater_than' | 'less_than' | 'contains'
  value: any
}

export interface QualitySettings {
  reviewRequired: boolean
  reviewers: RoleType[]
  qualityGates: QualityGate[]
  standards: QualityStandard[]
}

export interface QualityGate {
  name: string
  phase: string
  criteria: QualityCriteria[]
  blockingLevel: 'warning' | 'error'
}

export interface QualityCriteria {
  name: string
  description: string
  metric: string
  threshold: number
}

export interface QualityStandard {
  name: string
  description: string
  requirements: string[]
  checkpoints: string[]
}

export interface TemplateMetadata {
  complexity: ComplexityLevel
  teamSize: TeamSizeRange
  budget: BudgetRange
  duration: DurationRange
  successMetrics: string[]
  risks: TemplateRisk[]
  bestPractices: string[]
  commonPitfalls: string[]
}

export interface TemplateRisk {
  name: string
  description: string
  probability: RiskProbability
  impact: RiskImpact
  mitigation: string[]
}

export interface TemplateRating {
  average: number
  count: number
  distribution: RatingDistribution
}

export interface RatingDistribution {
  1: number
  2: number
  3: number
  4: number
  5: number
}

export interface TeamSizeRange {
  min: number
  max: number
  optimal: number
}

export interface BudgetRange {
  min: number
  max: number
  currency: string
}

export interface DurationRange {
  min: number // days
  max: number
  typical: number
}

export interface WorkflowTrigger {
  event: TriggerEvent
  conditions: TriggerCondition[]
  actions: TriggerAction[]
}

export interface TriggerCondition {
  field: string
  operator: string
  value: any
}

export interface TriggerAction {
  type: ActionType
  config: Record<string, any>
}

export interface WorkflowAutomation {
  name: string
  description: string
  trigger: WorkflowTrigger
  enabled: boolean
}

export interface ApprovalRequirement {
  required: boolean
  roles: RoleType[]
  count: number
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
  MEDIA = 'media',
  TECHNOLOGY = 'technology',
  HEALTHCARE = 'healthcare',
  FINANCE = 'finance',
  RETAIL = 'retail',
  MANUFACTURING = 'manufacturing',
  EDUCATION = 'education',
  GOVERNMENT = 'government',
  NON_PROFIT = 'non_profit',
  OTHER = 'other'
}

export enum DeliverableType {
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  IMAGE = 'image',
  PRESENTATION = 'presentation',
  DATASET = 'dataset',
  CODE = 'code',
  DESIGN = 'design',
  REPORT = 'report',
  OTHER = 'other'
}

export enum DeliverableSize {
  SMALL = 'small',    // < 100MB
  MEDIUM = 'medium',  // 100MB - 1GB
  LARGE = 'large',    // 1GB - 10GB
  XLARGE = 'xlarge'   // > 10GB
}

export enum WorkflowType {
  SEQUENTIAL = 'sequential',
  PARALLEL = 'parallel',
  CONDITIONAL = 'conditional',
  ITERATIVE = 'iterative'
}

export enum StepType {
  CREATION = 'creation',
  REVIEW = 'review',
  APPROVAL = 'approval',
  EDITING = 'editing',
  TESTING = 'testing',
  DELIVERY = 'delivery',
  ARCHIVE = 'archive'
}

export enum RoleType {
  OWNER = 'owner',
  PRODUCER = 'producer',
  DIRECTOR = 'director',
  EDITOR = 'editor',
  DESIGNER = 'designer',
  WRITER = 'writer',
  REVIEWER = 'reviewer',
  CLIENT = 'client',
  STAKEHOLDER = 'stakeholder',
  ADMIN = 'admin'
}

export enum ResourceType {
  PERSON = 'person',
  EQUIPMENT = 'equipment',
  SOFTWARE = 'software',
  FACILITY = 'facility',
  MATERIAL = 'material',
  LICENSE = 'license'
}

export enum ExperienceLevel {
  JUNIOR = 'junior',
  INTERMEDIATE = 'intermediate',
  SENIOR = 'senior',
  EXPERT = 'expert'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum DeadlineType {
  SOFT = 'soft',
  HARD = 'hard',
  REGULATORY = 'regulatory'
}

export enum DependencyType {
  FINISH_TO_START = 'finish_to_start',
  START_TO_START = 'start_to_start',
  FINISH_TO_FINISH = 'finish_to_finish',
  START_TO_FINISH = 'start_to_finish'
}

export enum ProjectVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  TEAM = 'team',
  ORGANIZATION = 'organization'
}

export enum ComplexityLevel {
  SIMPLE = 'simple',
  MODERATE = 'moderate',
  COMPLEX = 'complex',
  EXPERT = 'expert'
}

export enum RiskProbability {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

export enum RiskImpact {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum TriggerEvent {
  PHASE_STARTED = 'phase_started',
  PHASE_COMPLETED = 'phase_completed',
  MILESTONE_REACHED = 'milestone_reached',
  DEADLINE_APPROACHING = 'deadline_approaching',
  DELIVERABLE_SUBMITTED = 'deliverable_submitted',
  APPROVAL_GRANTED = 'approval_granted',
  APPROVAL_REJECTED = 'approval_rejected',
  RESOURCE_ALLOCATED = 'resource_allocated',
  BUDGET_THRESHOLD = 'budget_threshold'
}

export enum ActionType {
  SEND_NOTIFICATION = 'send_notification',
  CREATE_TASK = 'create_task',
  ASSIGN_RESOURCE = 'assign_resource',
  UPDATE_STATUS = 'update_status',
  GENERATE_REPORT = 'generate_report',
  ESCALATE = 'escalate'
}

// Template Commands
export interface CreateTemplateCommand {
  name: string
  description: string
  category: TemplateCategory
  industry: IndustryType
  structure: TemplateStructure
  schedule: TemplateSchedule
  resources: TemplateResource[]
  settings: TemplateSettings
  metadata: TemplateMetadata
  isPublic: boolean
  createdBy: string
  tags: string[]
}

export interface UpdateTemplateCommand {
  templateId: string
  name?: string
  description?: string
  category?: TemplateCategory
  structure?: Partial<TemplateStructure>
  schedule?: Partial<TemplateSchedule>
  resources?: TemplateResource[]
  settings?: Partial<TemplateSettings>
  metadata?: Partial<TemplateMetadata>
  isPublic?: boolean
  tags?: string[]
  updatedBy: string
}

export interface CloneTemplateCommand {
  templateId: string
  name: string
  description?: string
  modifications?: TemplateModifications
  clonedBy: string
}

export interface TemplateModifications {
  structure?: Partial<TemplateStructure>
  schedule?: Partial<TemplateSchedule>
  resources?: TemplateResource[]
  settings?: Partial<TemplateSettings>
}

export interface ApplyTemplateCommand {
  templateId: string
  projectName: string
  projectDescription?: string
  customizations?: ProjectCustomizations
  appliedBy: string
}

export interface ProjectCustomizations {
  startDate?: Date
  budget?: number
  teamMembers?: string[]
  modifications?: TemplateModifications
}

export interface RateTemplateCommand {
  templateId: string
  rating: number // 1-5
  review?: string
  ratedBy: string
}

// Template Domain Events
export interface TemplateCreatedEvent {
  type: 'TEMPLATE_CREATED'
  payload: ProjectTemplate
  timestamp: Date
}

export interface TemplateUpdatedEvent {
  type: 'TEMPLATE_UPDATED'
  payload: { templateId: string; changes: Partial<ProjectTemplate> }
  timestamp: Date
}

export interface TemplateAppliedEvent {
  type: 'TEMPLATE_APPLIED'
  payload: { templateId: string; projectId: string; appliedBy: string }
  timestamp: Date
}

export interface TemplateRatedEvent {
  type: 'TEMPLATE_RATED'
  payload: { templateId: string; rating: number; ratedBy: string }
  timestamp: Date
}

export interface TemplateClonedEvent {
  type: 'TEMPLATE_CLONED'
  payload: { originalId: string; clonedId: string; clonedBy: string }
  timestamp: Date
}

export type TemplateDomainEvent = 
  | TemplateCreatedEvent
  | TemplateUpdatedEvent
  | TemplateAppliedEvent
  | TemplateRatedEvent
  | TemplateClonedEvent

// Template Search & Filtering
export interface TemplateFilters {
  category?: TemplateCategory[]
  industry?: IndustryType[]
  complexity?: ComplexityLevel[]
  teamSize?: { min: number; max: number }
  duration?: { min: number; max: number }
  rating?: { min: number }
  tags?: string[]
  createdBy?: string
  isPublic?: boolean
}

export interface TemplateSortOptions {
  field: 'name' | 'createdAt' | 'updatedAt' | 'rating' | 'usageCount'
  order: 'asc' | 'desc'
}

export interface TemplateSearchResult {
  templates: ProjectTemplate[]
  total: number
  filters: TemplateFilters
  sort: TemplateSortOptions
}