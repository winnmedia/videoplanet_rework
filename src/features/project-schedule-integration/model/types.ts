// Project-Schedule Integration Types
import { Project, ProjectStatus } from '../../../entities/project'
import { ProjectSchedule, ScheduleStatus, MilestoneStatus, DeadlineStatus } from '../../../entities/schedule'

export interface ProjectScheduleIntegration {
  projectId: string
  scheduleId: string
  isLinked: boolean
  syncStatus: SyncStatus
  lastSyncAt?: Date
  syncErrors?: string[]
  autoSyncEnabled: boolean
  syncConfiguration: SyncConfiguration
}

export interface SyncConfiguration {
  syncMilestones: boolean
  syncDeadlines: boolean
  syncStatus: boolean
  syncMembers: boolean
  syncProgress: boolean
  conflictResolution: ConflictResolutionStrategy
}

export interface ProjectScheduleSyncResult {
  success: boolean
  projectId: string
  scheduleId: string
  syncedAt: Date
  changes: SyncChange[]
  conflicts: SyncConflict[]
  errors: string[]
}

export interface SyncChange {
  type: SyncChangeType
  entity: SyncEntityType
  entityId: string
  field: string
  oldValue: any
  newValue: any
  source: 'project' | 'schedule'
  appliedAt: Date
}

export interface SyncConflict {
  id: string
  type: ConflictType
  description: string
  projectValue: any
  scheduleValue: any
  field: string
  entity: string
  detectedAt: Date
  resolvedAt?: Date
  resolution?: ConflictResolution
}

export interface ConflictResolution {
  strategy: ConflictResolutionStrategy
  chosenValue: any
  reason?: string
  resolvedBy: string
}

export interface ProjectProgressSummary {
  projectId: string
  overallProgress: number // 0-100
  phaseProgress: PhaseProgress[]
  milestoneProgress: MilestoneProgress[]
  deadlineStatus: DeadlineProgress[]
  resourceUtilization: ResourceUtilization[]
  healthScore: number // 0-100
  riskLevel: RiskLevel
  estimatedCompletion: Date
  actualProgress: ActualProgress
}

export interface PhaseProgress {
  phaseId: string
  name: string
  progress: number // 0-100
  status: PhaseStatus
  startDate: Date
  endDate: Date
  actualStartDate?: Date
  actualEndDate?: Date
  delay: number // in days
  completedTasks: number
  totalTasks: number
}

export interface MilestoneProgress {
  milestoneId: string
  name: string
  targetDate: Date
  actualDate?: Date
  status: MilestoneStatus
  progress: number // 0-100
  onTrack: boolean
  daysFromTarget: number // negative = early, positive = late
  completedCriteria: number
  totalCriteria: number
}

export interface DeadlineProgress {
  deadlineId: string
  name: string
  dueDate: Date
  status: DeadlineStatus
  daysRemaining: number
  riskLevel: RiskLevel
  assignedTo: string[]
  completionEstimate?: Date
}

export interface ResourceUtilization {
  resourceId: string
  name: string
  allocatedHours: number
  actualHours: number
  utilizationRate: number // 0-100
  overallocation: boolean
  availability: ResourceAvailability[]
  conflicts: ResourceConflict[]
}

export interface ResourceAvailability {
  startDate: Date
  endDate: Date
  availableHours: number
  allocatedHours: number
  remainingHours: number
}

export interface ResourceConflict {
  conflictId: string
  type: ResourceConflictType
  description: string
  severity: ConflictSeverity
  affectedProjects: string[]
  suggestedResolution?: string
}

export interface ActualProgress {
  tasksCompleted: number
  totalTasks: number
  hoursWorked: number
  estimatedHours: number
  budgetSpent: number
  budgetAllocated: number
  deliveriesOnTime: number
  totalDeliveries: number
}

export interface AutomatedWorkflowRule {
  id: string
  name: string
  description: string
  projectId: string
  scheduleId: string
  isActive: boolean
  trigger: WorkflowTrigger
  conditions: WorkflowCondition[]
  actions: WorkflowAction[]
  createdBy: string
  createdAt: Date
  lastTriggered?: Date
  triggerCount: number
}

export interface WorkflowTrigger {
  event: WorkflowEvent
  source: 'project' | 'schedule' | 'both'
  frequency?: TriggerFrequency
}

export interface WorkflowCondition {
  field: string
  operator: ComparisonOperator
  value: any
  logicalOperator?: LogicalOperator
}

export interface WorkflowAction {
  type: ActionType
  target: ActionTarget
  parameters: Record<string, any>
  delay?: number // minutes
  priority: ActionPriority
}

export interface CalendarIntegration {
  integrationId: string
  projectId: string
  scheduleId: string
  externalCalendarId: string
  calendarType: CalendarType
  syncDirection: SyncDirection
  isActive: boolean
  lastSyncAt?: Date
  syncStatus: CalendarSyncStatus
  configuration: CalendarSyncConfiguration
  errors: CalendarSyncError[]
}

export interface CalendarSyncConfiguration {
  syncMilestones: boolean
  syncDeadlines: boolean
  syncMeetings: boolean
  syncPersonalEvents: boolean
  conflictHandling: CalendarConflictHandling
  notificationSettings: CalendarNotificationSettings
}

export interface CalendarNotificationSettings {
  onConflict: boolean
  onSync: boolean
  onError: boolean
  recipients: string[]
}

export interface CalendarSyncError {
  errorId: string
  type: CalendarErrorType
  message: string
  details?: string
  occurredAt: Date
  resolved: boolean
  resolvedAt?: Date
}

export interface TimelineVisualization {
  projectId: string
  scheduleId: string
  generatedAt: Date
  timeRange: {
    startDate: Date
    endDate: Date
  }
  phases: TimelinePhase[]
  milestones: TimelineMilestone[]
  deadlines: TimelineDeadline[]
  dependencies: TimelineDependency[]
  criticalPath: string[]
  resources: TimelineResource[]
  risks: TimelineRisk[]
}

export interface TimelinePhase {
  phaseId: string
  name: string
  startDate: Date
  endDate: Date
  progress: number
  color: string
  dependencies: string[]
  resources: string[]
  tasks: TimelineTask[]
}

export interface TimelineTask {
  taskId: string
  name: string
  startDate: Date
  endDate: Date
  progress: number
  assignee?: string
  priority: Priority
  status: TaskStatus
}

export interface TimelineMilestone {
  milestoneId: string
  name: string
  date: Date
  status: MilestoneStatus
  type: MilestoneType
  criticality: Priority
  dependencies: string[]
}

export interface TimelineDeadline {
  deadlineId: string
  name: string
  date: Date
  status: DeadlineStatus
  type: DeadlineType
  flexibility: number // days
  consequences: string[]
}

export interface TimelineDependency {
  id: string
  fromId: string
  toId: string
  type: DependencyType
  lag: number
  critical: boolean
}

export interface TimelineResource {
  resourceId: string
  name: string
  type: ResourceType
  utilization: ResourceUtilizationPeriod[]
  conflicts: ResourceConflictPeriod[]
}

export interface ResourceUtilizationPeriod {
  startDate: Date
  endDate: Date
  utilizationPercent: number
  allocatedTo: string[] // task/phase IDs
}

export interface ResourceConflictPeriod {
  startDate: Date
  endDate: Date
  conflictType: ResourceConflictType
  severity: ConflictSeverity
  affectedTasks: string[]
}

export interface TimelineRisk {
  riskId: string
  type: RiskType
  description: string
  probability: RiskProbability
  impact: RiskImpact
  affectedItems: string[]
  mitigationPlan?: string
  owner?: string
}

export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  FAILED = 'failed',
  CONFLICT = 'conflict',
  DISABLED = 'disabled'
}

export enum SyncChangeType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  MOVE = 'move',
  STATUS_CHANGE = 'status_change'
}

export enum SyncEntityType {
  PROJECT = 'project',
  SCHEDULE = 'schedule',
  MILESTONE = 'milestone',
  DEADLINE = 'deadline',
  PHASE = 'phase',
  TASK = 'task',
  MEMBER = 'member',
  RESOURCE = 'resource'
}

export enum ConflictType {
  STATUS_MISMATCH = 'status_mismatch',
  DATE_CONFLICT = 'date_conflict',
  RESOURCE_CONFLICT = 'resource_conflict',
  DEPENDENCY_CONFLICT = 'dependency_conflict',
  PROGRESS_MISMATCH = 'progress_mismatch',
  MEMBER_CONFLICT = 'member_conflict'
}

export enum ConflictResolutionStrategy {
  PROJECT_WINS = 'project_wins',
  SCHEDULE_WINS = 'schedule_wins',
  MANUAL_RESOLVE = 'manual_resolve',
  NEWER_WINS = 'newer_wins',
  PROMPT_USER = 'prompt_user'
}

export enum PhaseStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ResourceConflictType {
  OVERALLOCATION = 'overallocation',
  UNAVAILABLE = 'unavailable',
  SKILL_MISMATCH = 'skill_mismatch',
  DOUBLE_BOOKING = 'double_booking'
}

export enum ConflictSeverity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

export enum WorkflowEvent {
  PROJECT_STATUS_CHANGED = 'project_status_changed',
  MILESTONE_REACHED = 'milestone_reached',
  MILESTONE_MISSED = 'milestone_missed',
  DEADLINE_APPROACHING = 'deadline_approaching',
  DEADLINE_MISSED = 'deadline_missed',
  PHASE_STARTED = 'phase_started',
  PHASE_COMPLETED = 'phase_completed',
  RESOURCE_ALLOCATED = 'resource_allocated',
  RESOURCE_RELEASED = 'resource_released',
  BUDGET_THRESHOLD = 'budget_threshold',
  PROGRESS_UPDATE = 'progress_update',
  CONFLICT_DETECTED = 'conflict_detected'
}

export enum TriggerFrequency {
  IMMEDIATE = 'immediate',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  ON_CHANGE = 'on_change'
}

export enum ComparisonOperator {
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  GREATER_EQUAL = 'greater_equal',
  LESS_EQUAL = 'less_equal',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  IN = 'in',
  NOT_IN = 'not_in'
}

export enum LogicalOperator {
  AND = 'and',
  OR = 'or',
  NOT = 'not'
}

export enum ActionType {
  SEND_NOTIFICATION = 'send_notification',
  UPDATE_STATUS = 'update_status',
  CREATE_TASK = 'create_task',
  ASSIGN_RESOURCE = 'assign_resource',
  SEND_EMAIL = 'send_email',
  CREATE_CALENDAR_EVENT = 'create_calendar_event',
  TRIGGER_WEBHOOK = 'trigger_webhook',
  GENERATE_REPORT = 'generate_report',
  ESCALATE = 'escalate',
  AUTO_APPROVE = 'auto_approve',
  REQUEST_APPROVAL = 'request_approval'
}

export enum ActionTarget {
  PROJECT_OWNER = 'project_owner',
  SCHEDULE_MANAGER = 'schedule_manager',
  PHASE_ASSIGNEES = 'phase_assignees',
  ALL_MEMBERS = 'all_members',
  STAKEHOLDERS = 'stakeholders',
  EXTERNAL_SYSTEM = 'external_system',
  SPECIFIC_USERS = 'specific_users'
}

export enum ActionPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum CalendarType {
  GOOGLE_CALENDAR = 'google_calendar',
  OUTLOOK = 'outlook',
  APPLE_CALENDAR = 'apple_calendar',
  ICAL = 'ical',
  EXCHANGE = 'exchange',
  CALDAV = 'caldav'
}

export enum SyncDirection {
  BIDIRECTIONAL = 'bidirectional',
  TO_EXTERNAL = 'to_external',
  FROM_EXTERNAL = 'from_external'
}

export enum CalendarSyncStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  ERROR = 'error',
  SETUP_REQUIRED = 'setup_required'
}

export enum CalendarConflictHandling {
  SKIP_CONFLICTS = 'skip_conflicts',
  OVERWRITE = 'overwrite',
  CREATE_DUPLICATE = 'create_duplicate',
  ASK_USER = 'ask_user'
}

export enum CalendarErrorType {
  AUTHENTICATION_FAILED = 'authentication_failed',
  CALENDAR_NOT_FOUND = 'calendar_not_found',
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  NETWORK_ERROR = 'network_error',
  INVALID_DATA = 'invalid_data',
  SYNC_CONFLICT = 'sync_conflict'
}

export enum MilestoneType {
  PHASE_START = 'phase_start',
  PHASE_END = 'phase_end',
  DELIVERABLE = 'deliverable',
  REVIEW = 'review',
  APPROVAL = 'approval',
  CHECKPOINT = 'checkpoint',
  EXTERNAL = 'external'
}

export enum TaskStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
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

export enum ResourceType {
  PERSON = 'person',
  EQUIPMENT = 'equipment',
  FACILITY = 'facility',
  MATERIAL = 'material',
  SOFTWARE = 'software'
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum RiskType {
  SCHEDULE_DELAY = 'schedule_delay',
  BUDGET_OVERRUN = 'budget_overrun',
  RESOURCE_UNAVAILABLE = 'resource_unavailable',
  SCOPE_CREEP = 'scope_creep',
  QUALITY_ISSUE = 'quality_issue',
  STAKEHOLDER_CONFLICT = 'stakeholder_conflict',
  EXTERNAL_DEPENDENCY = 'external_dependency',
  TECHNICAL_RISK = 'technical_risk'
}

export enum RiskProbability {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high'
}

export enum RiskImpact {
  NEGLIGIBLE = 'negligible',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  SEVERE = 'severe'
}

// Commands for Integration
export interface LinkProjectScheduleCommand {
  projectId: string
  scheduleId: string
  syncConfiguration: SyncConfiguration
  linkedBy: string
}

export interface SyncProjectScheduleCommand {
  projectId: string
  scheduleId: string
  forceful?: boolean
  conflictResolution?: ConflictResolutionStrategy
  syncedBy: string
}

export interface ResolveConflictCommand {
  conflictId: string
  resolution: ConflictResolution
  resolvedBy: string
}

export interface CreateAutomationRuleCommand {
  projectId: string
  scheduleId: string
  rule: Omit<AutomatedWorkflowRule, 'id' | 'createdAt' | 'lastTriggered' | 'triggerCount'>
  createdBy: string
}

export interface IntegrateCalendarCommand {
  projectId: string
  scheduleId: string
  externalCalendarId: string
  calendarType: CalendarType
  configuration: CalendarSyncConfiguration
  integratedBy: string
}

// Domain Events
export interface ProjectScheduleLinkedEvent {
  type: 'PROJECT_SCHEDULE_LINKED'
  payload: { projectId: string; scheduleId: string; linkedBy: string }
  timestamp: Date
}

export interface ProjectScheduleSyncedEvent {
  type: 'PROJECT_SCHEDULE_SYNCED'
  payload: ProjectScheduleSyncResult
  timestamp: Date
}

export interface ConflictDetectedEvent {
  type: 'SYNC_CONFLICT_DETECTED'
  payload: { conflicts: SyncConflict[]; projectId: string; scheduleId: string }
  timestamp: Date
}

export interface AutomationTriggeredEvent {
  type: 'AUTOMATION_TRIGGERED'
  payload: { ruleId: string; projectId: string; scheduleId: string; trigger: WorkflowEvent }
  timestamp: Date
}

export interface CalendarIntegrationErrorEvent {
  type: 'CALENDAR_INTEGRATION_ERROR'
  payload: { integrationId: string; error: CalendarSyncError }
  timestamp: Date
}

export type IntegrationDomainEvent = 
  | ProjectScheduleLinkedEvent
  | ProjectScheduleSyncedEvent
  | ConflictDetectedEvent
  | AutomationTriggeredEvent
  | CalendarIntegrationErrorEvent