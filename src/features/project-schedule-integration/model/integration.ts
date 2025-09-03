import { Project, ProjectStatus } from '../../../entities/project'
import { ProjectSchedule, ScheduleStatus, MilestoneStatus, DeadlineStatus, isScheduleOnTrack, calculateScheduleHealth } from '../../../entities/schedule'
import {
  ProjectScheduleIntegration,
  SyncStatus,
  SyncConfiguration,
  ProjectScheduleSyncResult,
  SyncChange,
  SyncConflict,
  ConflictResolutionStrategy,
  ConflictType,
  SyncChangeType,
  SyncEntityType,
  LinkProjectScheduleCommand,
  SyncProjectScheduleCommand,
  ResolveConflictCommand,
  ProjectProgressSummary,
  PhaseProgress,
  MilestoneProgress,
  DeadlineProgress,
  RiskLevel,
  ActualProgress,
  AutomatedWorkflowRule,
  WorkflowEvent,
  CreateAutomationRuleCommand,
  TimelineVisualization,
  CalendarIntegration,
  IntegrateCalendarCommand,
  CalendarSyncStatus
} from './types'

// Project-Schedule Integration Domain Logic
export function linkProjectSchedule(
  project: Project,
  schedule: ProjectSchedule,
  command: LinkProjectScheduleCommand
): ProjectScheduleIntegration {
  if (project.id !== command.projectId) {
    throw new Error('프로젝트 ID가 일치하지 않습니다')
  }
  
  if (schedule.id !== command.scheduleId) {
    throw new Error('스케줄 ID가 일치하지 않습니다')
  }

  if (schedule.projectId !== project.id) {
    throw new Error('스케줄이 해당 프로젝트에 속하지 않습니다')
  }

  const now = new Date()

  return {
    projectId: command.projectId,
    scheduleId: command.scheduleId,
    isLinked: true,
    syncStatus: SyncStatus.SYNCED,
    lastSyncAt: now,
    syncErrors: [],
    autoSyncEnabled: true,
    syncConfiguration: command.syncConfiguration
  }
}

export function syncProjectSchedule(
  project: Project,
  schedule: ProjectSchedule,
  integration: ProjectScheduleIntegration,
  command: SyncProjectScheduleCommand
): ProjectScheduleSyncResult {
  const now = new Date()
  const changes: SyncChange[] = []
  const conflicts: SyncConflict[] = []
  const errors: string[] = []

  try {
    // 1. 상태 동기화
    if (integration.syncConfiguration.syncStatus) {
      const statusSync = syncProjectStatus(project, schedule)
      if (statusSync.conflict) {
        conflicts.push(statusSync.conflict)
      } else if (statusSync.change) {
        changes.push(statusSync.change)
      }
    }

    // 2. 마일스톤 동기화
    if (integration.syncConfiguration.syncMilestones) {
      const milestoneSync = syncMilestones(project, schedule)
      changes.push(...milestoneSync.changes)
      conflicts.push(...milestoneSync.conflicts)
    }

    // 3. 데드라인 동기화
    if (integration.syncConfiguration.syncDeadlines) {
      const deadlineSync = syncDeadlines(project, schedule)
      changes.push(...deadlineSync.changes)
      conflicts.push(...deadlineSync.conflicts)
    }

    // 4. 멤버 동기화
    if (integration.syncConfiguration.syncMembers) {
      const memberSync = syncMembers(project, schedule)
      changes.push(...memberSync.changes)
      conflicts.push(...memberSync.conflicts)
    }

    // 5. 진행률 동기화
    if (integration.syncConfiguration.syncProgress) {
      const progressSync = syncProgress(project, schedule)
      changes.push(...progressSync.changes)
      conflicts.push(...progressSync.conflicts)
    }

    return {
      success: conflicts.length === 0,
      projectId: command.projectId,
      scheduleId: command.scheduleId,
      syncedAt: now,
      changes,
      conflicts,
      errors
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : '동기화 중 알 수 없는 오류가 발생했습니다')
    
    return {
      success: false,
      projectId: command.projectId,
      scheduleId: command.scheduleId,
      syncedAt: now,
      changes,
      conflicts,
      errors
    }
  }
}

export function resolveConflict(
  conflict: SyncConflict,
  command: ResolveConflictCommand
): SyncConflict {
  if (conflict.id !== command.conflictId) {
    throw new Error('충돌 ID가 일치하지 않습니다')
  }

  if (conflict.resolvedAt) {
    throw new Error('이미 해결된 충돌입니다')
  }

  return {
    ...conflict,
    resolvedAt: new Date(),
    resolution: command.resolution
  }
}

export function calculateProjectProgress(
  project: Project,
  schedule: ProjectSchedule
): ProjectProgressSummary {
  const now = new Date()
  
  // 페이즈 진행률 계산
  const phaseProgress: PhaseProgress[] = schedule.timeline.phases.map(phase => {
    const delay = phase.status === 'completed' && phase.endDate 
      ? Math.max(0, Math.floor((new Date(phase.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
      : 0

    return {
      phaseId: phase.id,
      name: phase.name,
      progress: phase.progress,
      status: phase.status as any,
      startDate: phase.startDate,
      endDate: phase.endDate,
      actualStartDate: phase.status !== 'not_started' ? phase.startDate : undefined,
      actualEndDate: phase.status === 'completed' ? phase.endDate : undefined,
      delay,
      completedTasks: Math.floor(phase.progress / 100 * phase.deliverables.length),
      totalTasks: phase.deliverables.length
    }
  })

  // 마일스톤 진행률 계산
  const milestoneProgress: MilestoneProgress[] = schedule.milestones.map(milestone => {
    const daysFromTarget = Math.floor(
      (now.getTime() - milestone.targetDate.getTime()) / (1000 * 60 * 60 * 24)
    )
    const onTrack = milestone.status === 'completed' || 
      (milestone.status === 'in_progress' && daysFromTarget <= 0)

    return {
      milestoneId: milestone.id,
      name: milestone.name,
      targetDate: milestone.targetDate,
      actualDate: milestone.actualDate,
      status: milestone.status,
      progress: milestone.status === 'completed' ? 100 : 
        milestone.status === 'in_progress' ? 50 : 0,
      onTrack,
      daysFromTarget,
      completedCriteria: milestone.status === 'completed' ? milestone.criteria.length : 0,
      totalCriteria: milestone.criteria.length
    }
  })

  // 데드라인 진행률 계산
  const deadlineStatus: DeadlineProgress[] = schedule.deadlines.map(deadline => {
    const daysRemaining = Math.floor(
      (deadline.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )
    
    let riskLevel: RiskLevel = RiskLevel.LOW
    if (deadline.status === 'overdue') riskLevel = RiskLevel.CRITICAL
    else if (daysRemaining <= 1) riskLevel = RiskLevel.HIGH
    else if (daysRemaining <= 3) riskLevel = RiskLevel.MEDIUM

    return {
      deadlineId: deadline.id,
      name: deadline.name,
      dueDate: deadline.dueDate,
      status: deadline.status,
      daysRemaining,
      riskLevel,
      assignedTo: deadline.assignees,
      completionEstimate: deadline.status === 'completed' ? deadline.dueDate : undefined
    }
  })

  // 전체 진행률 계산
  const totalProgress = phaseProgress.reduce((sum, phase) => sum + phase.progress, 0) / 
    Math.max(phaseProgress.length, 1)

  // 건강 점수 계산
  const healthResult = calculateScheduleHealth(schedule)
  
  // 위험 수준 계산
  const riskLevel = healthResult.overallScore >= 80 ? RiskLevel.LOW :
    healthResult.overallScore >= 60 ? RiskLevel.MEDIUM :
    healthResult.overallScore >= 40 ? RiskLevel.HIGH : RiskLevel.CRITICAL

  // 완료 예상 날짜 계산
  const remainingWork = 100 - totalProgress
  const avgProgressRate = totalProgress / Math.max(1, 
    (now.getTime() - schedule.timeline.startDate.getTime()) / (1000 * 60 * 60 * 24)
  )
  const estimatedDaysRemaining = remainingWork / Math.max(0.1, avgProgressRate)
  const estimatedCompletion = new Date(now.getTime() + (estimatedDaysRemaining * 24 * 60 * 60 * 1000))

  // 실제 진행률 데이터
  const actualProgress: ActualProgress = {
    tasksCompleted: phaseProgress.reduce((sum, phase) => sum + phase.completedTasks, 0),
    totalTasks: phaseProgress.reduce((sum, phase) => sum + phase.totalTasks, 0),
    hoursWorked: 0, // 실제 구현에서는 시간 추적 시스템에서 가져옴
    estimatedHours: schedule.timeline.estimatedDuration * 8, // 8시간/일 가정
    budgetSpent: project.metadata.budget?.spent || 0,
    budgetAllocated: project.metadata.budget?.allocated || 0,
    deliveriesOnTime: milestoneProgress.filter(m => m.onTrack).length,
    totalDeliveries: milestoneProgress.length
  }

  return {
    projectId: project.id,
    overallProgress: totalProgress,
    phaseProgress,
    milestoneProgress,
    deadlineStatus,
    resourceUtilization: [], // 리소스 시스템에서 계산
    healthScore: healthResult.overallScore,
    riskLevel,
    estimatedCompletion,
    actualProgress
  }
}

export function createAutomationRule(
  command: CreateAutomationRuleCommand
): AutomatedWorkflowRule {
  const now = new Date()
  const ruleId = generateAutomationRuleId()

  // 규칙 유효성 검증
  validateAutomationRule(command.rule)

  return {
    id: ruleId,
    ...command.rule,
    createdAt: now,
    lastTriggered: undefined,
    triggerCount: 0
  }
}

export function shouldTriggerAutomation(
  rule: AutomatedWorkflowRule,
  event: WorkflowEvent,
  context: {
    project: Project
    schedule: ProjectSchedule
    changedData: any
  }
): boolean {
  // 1. 이벤트 매칭 확인
  if (rule.trigger.event !== event) {
    return false
  }

  // 2. 조건 확인
  for (const condition of rule.conditions) {
    if (!evaluateCondition(condition, context)) {
      return false
    }
  }

  // 3. 활성화 상태 확인
  if (!rule.isActive) {
    return false
  }

  return true
}

export function integrateCalendar(
  project: Project,
  schedule: ProjectSchedule,
  command: IntegrateCalendarCommand
): CalendarIntegration {
  const now = new Date()
  const integrationId = generateCalendarIntegrationId()

  // 캘린더 연결 유효성 검증
  validateCalendarIntegration(command)

  return {
    integrationId,
    projectId: command.projectId,
    scheduleId: command.scheduleId,
    externalCalendarId: command.externalCalendarId,
    calendarType: command.calendarType,
    syncDirection: 'bidirectional' as any, // 기본값
    isActive: true,
    lastSyncAt: undefined,
    syncStatus: CalendarSyncStatus.SETUP_REQUIRED,
    configuration: command.configuration,
    errors: []
  }
}

export function generateTimelineVisualization(
  project: Project,
  schedule: ProjectSchedule
): TimelineVisualization {
  const now = new Date()
  
  return {
    projectId: project.id,
    scheduleId: schedule.id,
    generatedAt: now,
    timeRange: {
      startDate: schedule.timeline.startDate,
      endDate: schedule.timeline.endDate
    },
    phases: schedule.timeline.phases.map((phase, index) => ({
      phaseId: phase.id,
      name: phase.name,
      startDate: phase.startDate,
      endDate: phase.endDate,
      progress: phase.progress,
      color: generatePhaseColor(index),
      dependencies: phase.dependencies,
      resources: [], // 리소스 매핑 구현 필요
      tasks: [] // 태스크 매핑 구현 필요
    })),
    milestones: schedule.milestones.map(milestone => ({
      milestoneId: milestone.id,
      name: milestone.name,
      date: milestone.targetDate,
      status: milestone.status,
      type: 'checkpoint' as any,
      criticality: milestone.priority,
      dependencies: milestone.dependencies
    })),
    deadlines: schedule.deadlines.map(deadline => ({
      deadlineId: deadline.id,
      name: deadline.name,
      date: deadline.dueDate,
      status: deadline.status,
      type: deadline.type,
      flexibility: 0, // 유연성 계산 구현 필요
      consequences: [deadline.consequences || '']
    })),
    dependencies: schedule.dependencies.map(dep => ({
      id: dep.id,
      fromId: dep.predecessorId,
      toId: dep.successorId,
      type: dep.type,
      lag: dep.lag,
      critical: false // 크리티컬 패스 계산 구현 필요
    })),
    criticalPath: [], // 크리티컬 패스 계산 구현 필요
    resources: [], // 리소스 시각화 구현 필요
    risks: [] // 위험 시각화 구현 필요
  }
}

export function detectIntegrationIssues(
  project: Project,
  schedule: ProjectSchedule,
  integration: ProjectScheduleIntegration
): string[] {
  const issues: string[] = []

  // 1. 동기화 상태 검증
  if (integration.syncStatus === SyncStatus.FAILED) {
    issues.push('동기화가 실패한 상태입니다')
  }

  // 2. 데이터 일관성 검증
  if (project.status === 'completed' && schedule.status !== 'completed') {
    issues.push('프로젝트는 완료되었으나 스케줄이 완료되지 않았습니다')
  }

  if (schedule.status === 'completed' && project.status !== 'completed') {
    issues.push('스케줄은 완료되었으나 프로젝트가 완료되지 않았습니다')
  }

  // 3. 날짜 일관성 검증
  const scheduleStart = new Date(schedule.timeline.startDate)
  const scheduleEnd = new Date(schedule.timeline.endDate)
  const projectCreated = new Date(project.createdAt)

  if (scheduleStart < projectCreated) {
    issues.push('스케줄 시작일이 프로젝트 생성일보다 이릅니다')
  }

  // 4. 멤버 일관성 검증 (프로젝트 멤버와 스케줄 할당자 비교)
  // 실제 구현에서는 스케줄의 할당자 정보와 비교

  // 5. 마지막 동기화 시점 확인
  if (integration.lastSyncAt) {
    const daysSinceSync = (Date.now() - integration.lastSyncAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceSync > 7) {
      issues.push('일주일 이상 동기화되지 않았습니다')
    }
  }

  return issues
}

// Helper functions
function syncProjectStatus(project: Project, schedule: ProjectSchedule): {
  change?: SyncChange
  conflict?: SyncConflict
} {
  const now = new Date()
  
  // 프로젝트와 스케줄 상태 매핑
  const statusMapping: Record<ProjectStatus, ScheduleStatus> = {
    'draft': 'draft' as ScheduleStatus,
    'planning': 'draft' as ScheduleStatus,
    'in_progress': 'active' as ScheduleStatus,
    'review': 'active' as ScheduleStatus,
    'completed': 'completed' as ScheduleStatus,
    'cancelled': 'cancelled' as ScheduleStatus,
    'on_hold': 'on_hold' as ScheduleStatus
  }

  const expectedScheduleStatus = statusMapping[project.status as ProjectStatus]
  
  if (schedule.status !== expectedScheduleStatus) {
    // 충돌 감지
    return {
      conflict: {
        id: generateConflictId(),
        type: ConflictType.STATUS_MISMATCH,
        description: `프로젝트 상태(${project.status})와 스케줄 상태(${schedule.status})가 일치하지 않습니다`,
        projectValue: project.status,
        scheduleValue: schedule.status,
        field: 'status',
        entity: 'project',
        detectedAt: now
      }
    }
  }

  return {}
}

function syncMilestones(project: Project, schedule: ProjectSchedule): {
  changes: SyncChange[]
  conflicts: SyncConflict[]
} {
  // 마일스톤 동기화 로직
  // 실제 구현에서는 프로젝트의 마일스톤 정보와 스케줄의 마일스톤을 비교
  return { changes: [], conflicts: [] }
}

function syncDeadlines(project: Project, schedule: ProjectSchedule): {
  changes: SyncChange[]
  conflicts: SyncConflict[]
} {
  // 데드라인 동기화 로직
  return { changes: [], conflicts: [] }
}

function syncMembers(project: Project, schedule: ProjectSchedule): {
  changes: SyncChange[]
  conflicts: SyncConflict[]
} {
  // 멤버 동기화 로직
  return { changes: [], conflicts: [] }
}

function syncProgress(project: Project, schedule: ProjectSchedule): {
  changes: SyncChange[]
  conflicts: SyncConflict[]
} {
  // 진행률 동기화 로직
  return { changes: [], conflicts: [] }
}

function validateAutomationRule(rule: Omit<AutomatedWorkflowRule, 'id' | 'createdAt' | 'lastTriggered' | 'triggerCount'>): void {
  if (!rule.name || rule.name.trim().length === 0) {
    throw new Error('자동화 규칙 이름이 필요합니다')
  }

  if (rule.actions.length === 0) {
    throw new Error('최소 하나의 액션이 필요합니다')
  }

  // 추가 유효성 검사 로직
}

function evaluateCondition(condition: any, context: any): boolean {
  // 조건 평가 로직 구현
  return true // 임시
}

function validateCalendarIntegration(command: IntegrateCalendarCommand): void {
  if (!command.externalCalendarId) {
    throw new Error('외부 캘린더 ID가 필요합니다')
  }

  // 추가 유효성 검사 로직
}

function generatePhaseColor(index: number): string {
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ]
  return colors[index % colors.length]
}

function generateAutomationRuleId(): string {
  return `rule_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function generateCalendarIntegrationId(): string {
  return `cal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

function generateConflictId(): string {
  return `conflict_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}