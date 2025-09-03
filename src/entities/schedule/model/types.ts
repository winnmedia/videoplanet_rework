// Project Schedule Domain Entity Types
export interface ProjectSchedule {
  id: string
  projectId: string
  name: string
  description?: string
  timeline: ProjectTimeline
  milestones: Milestone[]
  deadlines: Deadline[]
  dependencies: TaskDependency[]
  resources: ScheduleResource[]
  createdAt: Date
  updatedAt: Date
  status: ScheduleStatus
  version: number
}

export interface ProjectTimeline {
  startDate: Date
  endDate: Date
  estimatedDuration: number // in days
  actualDuration?: number
  bufferDays: number
  workingDays: WorkingDayConfig[]
  phases: ProjectPhase[]
}

export interface ProjectPhase {
  id: string
  name: string
  description?: string
  startDate: Date
  endDate: Date
  dependencies: string[] // phase IDs
  status: PhaseStatus
  progress: number // 0-100
  deliverables: string[]
  assignees: string[] // user IDs
}

export interface Milestone {
  id: string
  name: string
  description?: string
  targetDate: Date
  actualDate?: Date
  status: MilestoneStatus
  priority: Priority
  deliverables: string[]
  dependencies: string[] // milestone or task IDs
  approvers: string[] // user IDs
  criteria: string[] // completion criteria
}

export interface Deadline {
  id: string
  name: string
  description?: string
  dueDate: Date
  type: DeadlineType
  priority: Priority
  status: DeadlineStatus
  assignees: string[] // user IDs
  notifications: DeadlineNotification[]
  consequences?: string // what happens if missed
}

export interface TaskDependency {
  id: string
  predecessorId: string
  successorId: string
  type: DependencyType
  lag: number // days, can be negative for lead time
  description?: string
}

export interface ScheduleResource {
  id: string
  name: string
  type: ResourceType
  availability: ResourceAvailability[]
  cost?: ResourceCost
  skills?: string[]
  maxUtilization: number // percentage
  currentUtilization: number
}

export interface ResourceAvailability {
  startDate: Date
  endDate: Date
  availableHours: number
  timeSlots?: TimeSlot[]
  exceptions?: ResourceException[]
}

export interface TimeSlot {
  startTime: string // HH:mm format
  endTime: string
  daysOfWeek: number[] // 0-6, Sunday to Saturday
}

export interface ResourceException {
  date: Date
  type: 'unavailable' | 'partial'
  availableHours?: number
  reason?: string
}

export interface ResourceCost {
  hourlyRate: number
  currency: string
  overtime: {
    rate: number
    threshold: number // hours per day/week
  }
}

export interface WorkingDayConfig {
  dayOfWeek: number // 0-6
  startTime: string
  endTime: string
  isWorkingDay: boolean
}

export interface DeadlineNotification {
  type: NotificationType
  timing: number // days before deadline
  recipients: string[] // user IDs
  message?: string
}

export interface CalendarIntegration {
  scheduleId: string
  externalCalendarId?: string
  syncStatus: SyncStatus
  lastSyncAt?: Date
  syncErrors?: string[]
}

export interface ConflictDetection {
  id: string
  type: ConflictType
  description: string
  affectedItems: string[] // IDs of affected schedules/resources
  severity: ConflictSeverity
  suggestedResolution?: string
  detectedAt: Date
  resolvedAt?: Date
}

export enum ScheduleStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PhaseStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum MilestoneStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  MISSED = 'missed',
  CANCELLED = 'cancelled'
}

export enum DeadlineStatus {
  PENDING = 'pending',
  AT_RISK = 'at_risk',
  OVERDUE = 'overdue',
  COMPLETED = 'completed'
}

export enum DeadlineType {
  SOFT = 'soft', // flexible, can be moved
  HARD = 'hard', // fixed, cannot be moved
  REGULATORY = 'regulatory' // legal/compliance requirement
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
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

export enum NotificationType {
  EMAIL = 'email',
  SMS = 'sms',
  PUSH = 'push',
  IN_APP = 'in_app'
}

export enum SyncStatus {
  SYNCED = 'synced',
  PENDING = 'pending',
  FAILED = 'failed',
  DISABLED = 'disabled'
}

export enum ConflictType {
  RESOURCE_OVERALLOCATION = 'resource_overallocation',
  SCHEDULE_OVERLAP = 'schedule_overlap',
  DEADLINE_IMPOSSIBLE = 'deadline_impossible',
  DEPENDENCY_CYCLE = 'dependency_cycle',
  RESOURCE_UNAVAILABLE = 'resource_unavailable'
}

export enum ConflictSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Commands for Schedule Management
export interface CreateScheduleCommand {
  projectId: string
  name: string
  description?: string
  timeline: {
    startDate: Date
    endDate: Date
    bufferDays?: number
  }
  workingDays?: WorkingDayConfig[]
  createdBy: string
}

export interface UpdateScheduleCommand {
  scheduleId: string
  name?: string
  description?: string
  timeline?: Partial<ProjectTimeline>
  status?: ScheduleStatus
  updatedBy: string
}

export interface AddMilestoneCommand {
  scheduleId: string
  milestone: Omit<Milestone, 'id'>
  createdBy: string
}

export interface UpdateMilestoneCommand {
  scheduleId: string
  milestoneId: string
  updates: Partial<Milestone>
  updatedBy: string
}

export interface AddDeadlineCommand {
  scheduleId: string
  deadline: Omit<Deadline, 'id'>
  createdBy: string
}

export interface UpdateDeadlineCommand {
  scheduleId: string
  deadlineId: string
  updates: Partial<Deadline>
  updatedBy: string
}

export interface AddDependencyCommand {
  scheduleId: string
  dependency: Omit<TaskDependency, 'id'>
  createdBy: string
}

export interface AllocateResourceCommand {
  scheduleId: string
  resourceId: string
  allocation: ResourceAllocation
  allocatedBy: string
}

export interface ResourceAllocation {
  startDate: Date
  endDate: Date
  hoursPerDay: number
  phases?: string[] // which phases this resource is allocated to
}

// Domain Events
export interface ScheduleCreatedEvent {
  type: 'SCHEDULE_CREATED'
  payload: ProjectSchedule
  timestamp: Date
}

export interface ScheduleUpdatedEvent {
  type: 'SCHEDULE_UPDATED'
  payload: { scheduleId: string; changes: Partial<ProjectSchedule> }
  timestamp: Date
}

export interface MilestoneReachedEvent {
  type: 'MILESTONE_REACHED'
  payload: { scheduleId: string; milestone: Milestone }
  timestamp: Date
}

export interface DeadlineMissedEvent {
  type: 'DEADLINE_MISSED'
  payload: { scheduleId: string; deadline: Deadline }
  timestamp: Date
}

export interface ConflictDetectedEvent {
  type: 'CONFLICT_DETECTED'
  payload: { scheduleId: string; conflict: ConflictDetection }
  timestamp: Date
}

export interface ResourceAllocatedEvent {
  type: 'RESOURCE_ALLOCATED'
  payload: { 
    scheduleId: string
    resourceId: string
    allocation: ResourceAllocation
  }
  timestamp: Date
}

export type ScheduleDomainEvent = 
  | ScheduleCreatedEvent
  | ScheduleUpdatedEvent
  | MilestoneReachedEvent
  | DeadlineMissedEvent
  | ConflictDetectedEvent
  | ResourceAllocatedEvent