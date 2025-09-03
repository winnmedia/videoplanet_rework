import {
  ProjectSchedule,
  CreateScheduleCommand,
  UpdateScheduleCommand,
  AddMilestoneCommand,
  AddDeadlineCommand,
  AddDependencyCommand,
  AllocateResourceCommand,
  Milestone,
  Deadline,
  TaskDependency,
  ResourceAllocation,
  ConflictDetection,
  ScheduleStatus,
  MilestoneStatus,
  DeadlineStatus,
  ConflictType,
  ConflictSeverity,
  DependencyType,
  WorkingDayConfig,
  ProjectTimeline,
  ProjectPhase,
  PhaseStatus
} from './types'

// Schedule Domain Logic
export function createSchedule(command: CreateScheduleCommand): ProjectSchedule {
  const now = new Date()
  const scheduleId = generateScheduleId()
  
  // Default working days (Monday-Friday, 9AM-6PM)
  const defaultWorkingDays: WorkingDayConfig[] = command.workingDays || [
    { dayOfWeek: 1, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
    { dayOfWeek: 2, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
    { dayOfWeek: 3, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
    { dayOfWeek: 4, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
    { dayOfWeek: 5, startTime: '09:00', endTime: '18:00', isWorkingDay: true },
    { dayOfWeek: 0, startTime: '09:00', endTime: '18:00', isWorkingDay: false },
    { dayOfWeek: 6, startTime: '09:00', endTime: '18:00', isWorkingDay: false }
  ]

  const timeline: ProjectTimeline = {
    startDate: command.timeline.startDate,
    endDate: command.timeline.endDate,
    estimatedDuration: calculateWorkingDays(
      command.timeline.startDate,
      command.timeline.endDate,
      defaultWorkingDays
    ),
    bufferDays: command.timeline.bufferDays || 0,
    workingDays: defaultWorkingDays,
    phases: []
  }

  return {
    id: scheduleId,
    projectId: command.projectId,
    name: command.name,
    description: command.description,
    timeline,
    milestones: [],
    deadlines: [],
    dependencies: [],
    resources: [],
    createdAt: now,
    updatedAt: now,
    status: ScheduleStatus.DRAFT,
    version: 1
  }
}

export function updateSchedule(
  schedule: ProjectSchedule, 
  command: UpdateScheduleCommand
): ProjectSchedule {
  if (schedule.id !== command.scheduleId) {
    throw new Error('스케줄 ID가 일치하지 않습니다')
  }

  const updatedSchedule: ProjectSchedule = {
    ...schedule,
    name: command.name ?? schedule.name,
    description: command.description ?? schedule.description,
    status: command.status ?? schedule.status,
    updatedAt: new Date(),
    version: schedule.version + 1
  }

  if (command.timeline) {
    updatedSchedule.timeline = {
      ...schedule.timeline,
      ...command.timeline
    }
    
    // Recalculate estimated duration if dates changed
    if (command.timeline.startDate || command.timeline.endDate) {
      updatedSchedule.timeline.estimatedDuration = calculateWorkingDays(
        updatedSchedule.timeline.startDate,
        updatedSchedule.timeline.endDate,
        updatedSchedule.timeline.workingDays
      )
    }
  }

  return updatedSchedule
}

export function addMilestone(
  schedule: ProjectSchedule,
  command: AddMilestoneCommand
): ProjectSchedule {
  if (schedule.id !== command.scheduleId) {
    throw new Error('스케줄 ID가 일치하지 않습니다')
  }

  const milestone: Milestone = {
    id: generateMilestoneId(),
    ...command.milestone
  }

  // Validate milestone date is within project timeline
  if (milestone.targetDate < schedule.timeline.startDate || 
      milestone.targetDate > schedule.timeline.endDate) {
    throw new Error('마일스톤 목표 날짜가 프로젝트 타임라인 범위를 벗어납니다')
  }

  return {
    ...schedule,
    milestones: [...schedule.milestones, milestone],
    updatedAt: new Date(),
    version: schedule.version + 1
  }
}

export function addDeadline(
  schedule: ProjectSchedule,
  command: AddDeadlineCommand
): ProjectSchedule {
  if (schedule.id !== command.scheduleId) {
    throw new Error('스케줄 ID가 일치하지 않습니다')
  }

  const deadline: Deadline = {
    id: generateDeadlineId(),
    ...command.deadline
  }

  return {
    ...schedule,
    deadlines: [...schedule.deadlines, deadline],
    updatedAt: new Date(),
    version: schedule.version + 1
  }
}

export function addDependency(
  schedule: ProjectSchedule,
  command: AddDependencyCommand
): ProjectSchedule {
  if (schedule.id !== command.scheduleId) {
    throw new Error('스케줄 ID가 일치하지 않습니다')
  }

  // Check for circular dependencies
  const wouldCreateCycle = detectCircularDependency(
    schedule.dependencies,
    command.dependency.predecessorId,
    command.dependency.successorId
  )

  if (wouldCreateCycle) {
    throw new Error('순환 의존성이 발생합니다')
  }

  const dependency: TaskDependency = {
    id: generateDependencyId(),
    ...command.dependency
  }

  return {
    ...schedule,
    dependencies: [...schedule.dependencies, dependency],
    updatedAt: new Date(),
    version: schedule.version + 1
  }
}

export function allocateResource(
  schedule: ProjectSchedule,
  command: AllocateResourceCommand
): ProjectSchedule {
  const resource = schedule.resources.find(r => r.id === command.resourceId)
  if (!resource) {
    throw new Error('리소스를 찾을 수 없습니다')
  }

  // Check resource availability
  const isAvailable = checkResourceAvailability(
    resource,
    command.allocation.startDate,
    command.allocation.endDate,
    command.allocation.hoursPerDay
  )

  if (!isAvailable) {
    throw new Error('해당 기간에 리소스를 사용할 수 없습니다')
  }

  // This would typically update the resource allocation in a separate collection
  // For this domain model, we assume the allocation is handled elsewhere
  return {
    ...schedule,
    updatedAt: new Date(),
    version: schedule.version + 1
  }
}

export function detectScheduleConflicts(schedule: ProjectSchedule): ConflictDetection[] {
  const conflicts: ConflictDetection[] = []
  
  // Check for resource overallocation
  conflicts.push(...detectResourceConflicts(schedule))
  
  // Check for impossible deadlines
  conflicts.push(...detectDeadlineConflicts(schedule))
  
  // Check for dependency cycles
  conflicts.push(...detectDependencyConflicts(schedule))

  return conflicts
}

export function calculateCriticalPath(schedule: ProjectSchedule): string[] {
  // Simplified critical path calculation
  // In a real implementation, this would use proper CPM algorithm
  const sortedMilestones = [...schedule.milestones]
    .sort((a, b) => a.targetDate.getTime() - b.targetDate.getTime())
  
  return sortedMilestones
    .filter(m => m.priority === 'critical' || m.priority === 'high')
    .map(m => m.id)
}

export function calculateScheduleHealth(schedule: ProjectSchedule): {
  overallScore: number
  delayedMilestones: number
  overdueTasks: number
  resourceUtilization: number
  risks: string[]
} {
  const now = new Date()
  
  const delayedMilestones = schedule.milestones.filter(m => 
    m.status !== MilestoneStatus.COMPLETED && 
    m.targetDate < now
  ).length

  const overdueTasks = schedule.deadlines.filter(d => 
    d.status === DeadlineStatus.OVERDUE
  ).length

  const totalResources = schedule.resources.length
  const avgUtilization = totalResources > 0 
    ? schedule.resources.reduce((sum, r) => sum + r.currentUtilization, 0) / totalResources
    : 0

  const risks: string[] = []
  
  if (delayedMilestones > 0) {
    risks.push(`${delayedMilestones}개의 지연된 마일스톤`)
  }
  
  if (overdueTasks > 0) {
    risks.push(`${overdueTasks}개의 연체된 작업`)
  }
  
  if (avgUtilization > 90) {
    risks.push('리소스 과부하 위험')
  }

  // Calculate overall health score (0-100)
  let score = 100
  score -= (delayedMilestones * 10)
  score -= (overdueTasks * 15)
  if (avgUtilization > 90) score -= 20
  
  return {
    overallScore: Math.max(0, score),
    delayedMilestones,
    overdueTasks,
    resourceUtilization: avgUtilization,
    risks
  }
}

export function isScheduleOnTrack(schedule: ProjectSchedule): boolean {
  const health = calculateScheduleHealth(schedule)
  return health.overallScore >= 70
}

export function getUpcomingDeadlines(
  schedule: ProjectSchedule, 
  daysAhead: number = 7
): Deadline[] {
  const now = new Date()
  const targetDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000))
  
  return schedule.deadlines.filter(d => 
    d.status === DeadlineStatus.PENDING &&
    d.dueDate >= now &&
    d.dueDate <= targetDate
  ).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
}

export function validateScheduleIntegrity(schedule: ProjectSchedule): {
  isValid: boolean
  errors: string[]
} {
  const errors: string[] = []
  
  // Check timeline validity
  if (schedule.timeline.startDate >= schedule.timeline.endDate) {
    errors.push('시작 날짜가 종료 날짜보다 늦습니다')
  }
  
  // Check milestones are within timeline
  schedule.milestones.forEach(milestone => {
    if (milestone.targetDate < schedule.timeline.startDate || 
        milestone.targetDate > schedule.timeline.endDate) {
      errors.push(`마일스톤 "${milestone.name}"이 타임라인 범위를 벗어납니다`)
    }
  })
  
  // Check for circular dependencies
  const hasCycles = schedule.dependencies.some(dep => 
    detectCircularDependency(schedule.dependencies, dep.predecessorId, dep.successorId)
  )
  
  if (hasCycles) {
    errors.push('순환 의존성이 감지되었습니다')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Helper functions
function generateScheduleId(): string {
  return `schedule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function generateMilestoneId(): string {
  return `milestone_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function generateDeadlineId(): string {
  return `deadline_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function generateDependencyId(): string {
  return `dependency_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function calculateWorkingDays(
  startDate: Date,
  endDate: Date,
  workingDays: WorkingDayConfig[]
): number {
  const workingDaysSet = new Set(
    workingDays.filter(wd => wd.isWorkingDay).map(wd => wd.dayOfWeek)
  )
  
  let workingDayCount = 0
  const current = new Date(startDate)
  
  while (current <= endDate) {
    if (workingDaysSet.has(current.getDay())) {
      workingDayCount++
    }
    current.setDate(current.getDate() + 1)
  }
  
  return workingDayCount
}

function detectCircularDependency(
  dependencies: TaskDependency[],
  from: string,
  to: string,
  visited: Set<string> = new Set()
): boolean {
  if (visited.has(from)) {
    return from === to
  }
  
  visited.add(from)
  
  const nextDeps = dependencies.filter(dep => dep.predecessorId === from)
  
  for (const dep of nextDeps) {
    if (detectCircularDependency(dependencies, dep.successorId, to, new Set(visited))) {
      return true
    }
  }
  
  return false
}

function checkResourceAvailability(
  resource: any,
  startDate: Date,
  endDate: Date,
  hoursPerDay: number
): boolean {
  // Simplified availability check
  // In real implementation, this would check against existing allocations
  return resource.currentUtilization + (hoursPerDay / 8 * 100) <= resource.maxUtilization
}

function detectResourceConflicts(schedule: ProjectSchedule): ConflictDetection[] {
  const conflicts: ConflictDetection[] = []
  
  schedule.resources.forEach(resource => {
    if (resource.currentUtilization > resource.maxUtilization) {
      conflicts.push({
        id: `conflict_${Date.now()}_${resource.id}`,
        type: ConflictType.RESOURCE_OVERALLOCATION,
        description: `리소스 "${resource.name}"이 과부하 상태입니다`,
        affectedItems: [resource.id],
        severity: ConflictSeverity.HIGH,
        detectedAt: new Date()
      })
    }
  })
  
  return conflicts
}

function detectDeadlineConflicts(schedule: ProjectSchedule): ConflictDetection[] {
  const conflicts: ConflictDetection[] = []
  const now = new Date()
  
  schedule.deadlines.forEach(deadline => {
    if (deadline.dueDate < now && deadline.status !== DeadlineStatus.COMPLETED) {
      conflicts.push({
        id: `conflict_${Date.now()}_${deadline.id}`,
        type: ConflictType.DEADLINE_IMPOSSIBLE,
        description: `데드라인 "${deadline.name}"이 이미 지났습니다`,
        affectedItems: [deadline.id],
        severity: ConflictSeverity.CRITICAL,
        detectedAt: new Date()
      })
    }
  })
  
  return conflicts
}

function detectDependencyConflicts(schedule: ProjectSchedule): ConflictDetection[] {
  const conflicts: ConflictDetection[] = []
  
  // Check for circular dependencies
  const dependencyMap = new Map<string, string[]>()
  
  schedule.dependencies.forEach(dep => {
    const successors = dependencyMap.get(dep.predecessorId) || []
    successors.push(dep.successorId)
    dependencyMap.set(dep.predecessorId, successors)
  })
  
  // Simplified cycle detection
  for (const [predecessor, successors] of dependencyMap) {
    for (const successor of successors) {
      if (detectCircularDependency(schedule.dependencies, successor, predecessor)) {
        conflicts.push({
          id: `conflict_${Date.now()}_cycle`,
          type: ConflictType.DEPENDENCY_CYCLE,
          description: '순환 의존성이 감지되었습니다',
          affectedItems: [predecessor, successor],
          severity: ConflictSeverity.HIGH,
          detectedAt: new Date()
        })
      }
    }
  }
  
  return conflicts
}