/**
 * Auto Schedule Service with Conflict Detection
 * DEVPLAN.md 요구사항: 자동 일정 생성 시 캘린더 충돌 검사 및 대안 제시
 * @layer shared/lib
 */

import { addDays, addWeeks, format, isWeekend } from 'date-fns'
import { ko } from 'date-fns/locale'

import { ConflictDetectionService } from '@/entities/calendar/lib/conflictDetection'
import type { 
  ProjectCalendarEvent, 
  EnhancedCalendarConflict,
  ProjectPhaseType 
} from '@/entities/calendar/model/types'
import { 
  calculateAutoSchedule,
  type AutoScheduleConfig,
  type AutoScheduleResult,
  DEFAULT_AUTO_SCHEDULE
} from './project-scheduler'

// ===========================
// Types
// ===========================

export interface ConflictAwareScheduleResult extends AutoScheduleResult {
  conflicts: EnhancedCalendarConflict[]
  hasConflicts: boolean
  alternatives?: AutoScheduleResult[]
  conflictSummary: {
    planningConflicts: number
    filmingConflicts: number
    editingConflicts: number
  }
}

export interface ScheduleConflictCheck {
  phase: ProjectPhaseType
  conflictingEvents: ProjectCalendarEvent[]
  severity: 'warning' | 'error'
  message: string
  suggestedAction: string
}

export interface AutoScheduleOptions {
  projectId: string
  projectTitle: string
  startDate: Date
  config?: AutoScheduleConfig
  existingEvents?: ProjectCalendarEvent[]
  skipWeekends?: boolean
  bufferDays?: number
}

// ===========================
// Auto Schedule Service
// ===========================

export class AutoScheduleService {
  /**
   * 충돌을 고려한 자동 일정 생성
   * DEVPLAN.md DoD: "자동 일정 디폴트(기획 1주·촬영 1일·편집 2주) + 충돌 검사"
   */
  static createConflictAwareSchedule(options: AutoScheduleOptions): ConflictAwareScheduleResult {
    const {
      projectId,
      projectTitle,
      startDate,
      config = DEFAULT_AUTO_SCHEDULE,
      existingEvents = [],
      skipWeekends = true,
      bufferDays = 0
    } = options

    // 1. 기본 자동 일정 계산
    let adjustedStartDate = new Date(startDate)
    
    // 주말 건너뛰기
    if (skipWeekends) {
      adjustedStartDate = this.skipWeekendsForward(adjustedStartDate)
    }
    
    const baseSchedule = calculateAutoSchedule(adjustedStartDate, config)
    
    // 2. 캘린더 이벤트로 변환
    const proposedEvents = this.convertScheduleToCalendarEvents(
      projectId,
      projectTitle,
      baseSchedule
    )
    
    // 3. 기존 이벤트와 충돌 검사
    const allEvents = [...existingEvents, ...proposedEvents]
    const conflictResult = ConflictDetectionService.detectConflicts(allEvents)
    
    // 4. 충돌 분석
    const conflictSummary = this.analyzeConflictsByPhase(conflictResult.conflicts, proposedEvents)
    
    // 5. 충돌이 있으면 대안 생성
    let alternatives: AutoScheduleResult[] = []
    if (conflictResult.hasConflicts) {
      alternatives = this.generateAlternativeSchedules(options, conflictResult.conflicts)
    }
    
    return {
      ...baseSchedule,
      conflicts: conflictResult.conflicts,
      hasConflicts: conflictResult.hasConflicts,
      alternatives,
      conflictSummary
    }
  }

  /**
   * 일정을 캘린더 이벤트로 변환
   */
  private static convertScheduleToCalendarEvents(
    projectId: string,
    projectTitle: string,
    schedule: AutoScheduleResult
  ): ProjectCalendarEvent[] {
    const events: ProjectCalendarEvent[] = []
    
    // 기획 단계
    events.push({
      id: `${projectId}-planning`,
      title: `${projectTitle} - 기획`,
      description: '프로젝트 기획 및 사전 준비',
      startDate: schedule.planning.startDate.toISOString(),
      endDate: schedule.planning.endDate.toISOString(),
      isAllDay: true,
      category: 'project-deadline',
      priority: 'high',
      type: 'planning',
      projectId,
      projectTitle,
      projectColor: this.generateProjectColor(projectId),
      recurrence: 'none',
      createdBy: 'system',
      isCompleted: false,
      isConflicting: false,
      project: {
        id: projectId,
        name: projectTitle,
        color: this.generateProjectColor(projectId),
        description: '',
        status: 'active',
        phases: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      phase: {
        id: `${projectId}-planning-phase`,
        name: '기획',
        type: 'planning',
        projectId,
        startDate: schedule.planning.startDate.toISOString(),
        endDate: schedule.planning.endDate.toISOString(),
        duration: schedule.planning.duration * 7,
        isMovable: true
      }
    })
    
    // 촬영 단계
    events.push({
      id: `${projectId}-filming`,
      title: `${projectTitle} - 촬영`,
      description: '현장 촬영 진행',
      startDate: schedule.filming.startDate.toISOString(),
      endDate: schedule.filming.endDate.toISOString(),
      isAllDay: true,
      category: 'filming',
      priority: 'high',
      type: 'filming',
      projectId,
      projectTitle,
      projectColor: this.generateProjectColor(projectId),
      recurrence: 'none',
      createdBy: 'system',
      isCompleted: false,
      isConflicting: false,
      project: {
        id: projectId,
        name: projectTitle,
        color: this.generateProjectColor(projectId),
        description: '',
        status: 'active',
        phases: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      phase: {
        id: `${projectId}-filming-phase`,
        name: '촬영',
        type: 'filming',
        projectId,
        startDate: schedule.filming.startDate.toISOString(),
        endDate: schedule.filming.endDate.toISOString(),
        duration: schedule.filming.duration,
        isMovable: true
      }
    })
    
    // 편집 단계
    events.push({
      id: `${projectId}-editing`,
      title: `${projectTitle} - 편집`,
      description: '후반 작업 및 편집',
      startDate: schedule.editing.startDate.toISOString(),
      endDate: schedule.editing.endDate.toISOString(),
      isAllDay: true,
      category: 'project-deadline',
      priority: 'medium',
      type: 'editing',
      projectId,
      projectTitle,
      projectColor: this.generateProjectColor(projectId),
      recurrence: 'none',
      createdBy: 'system',
      isCompleted: false,
      isConflicting: false,
      project: {
        id: projectId,
        name: projectTitle,
        color: this.generateProjectColor(projectId),
        description: '',
        status: 'active',
        phases: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      phase: {
        id: `${projectId}-editing-phase`,
        name: '편집',
        type: 'editing',
        projectId,
        startDate: schedule.editing.startDate.toISOString(),
        endDate: schedule.editing.endDate.toISOString(),
        duration: schedule.editing.duration * 7,
        isMovable: true
      }
    })
    
    return events
  }

  /**
   * 충돌을 단계별로 분석
   */
  private static analyzeConflictsByPhase(
    conflicts: EnhancedCalendarConflict[],
    proposedEvents: ProjectCalendarEvent[]
  ) {
    const summary = {
      planningConflicts: 0,
      filmingConflicts: 0,
      editingConflicts: 0
    }
    
    conflicts.forEach(conflict => {
      conflict.events.forEach(event => {
        if (proposedEvents.some(pe => pe.id === event.id)) {
          switch (event.phase.type) {
            case 'planning':
              summary.planningConflicts++
              break
            case 'filming':
              summary.filmingConflicts++
              break
            case 'editing':
              summary.editingConflicts++
              break
          }
        }
      })
    })
    
    return summary
  }

  /**
   * 충돌 시 대안 일정 생성
   */
  private static generateAlternativeSchedules(
    originalOptions: AutoScheduleOptions,
    conflicts: EnhancedCalendarConflict[]
  ): AutoScheduleResult[] {
    const alternatives: AutoScheduleResult[] = []
    const { startDate, config = DEFAULT_AUTO_SCHEDULE } = originalOptions
    
    // 대안 1: 1주 뒤로 미루기
    const option1StartDate = addWeeks(startDate, 1)
    alternatives.push(calculateAutoSchedule(option1StartDate, config))
    
    // 대안 2: 2주 뒤로 미루기  
    const option2StartDate = addWeeks(startDate, 2)
    alternatives.push(calculateAutoSchedule(option2StartDate, config))
    
    // 대안 3: 주말 건너뛰고 다음 평일부터
    const option3StartDate = this.skipWeekendsForward(addDays(startDate, 1))
    alternatives.push(calculateAutoSchedule(option3StartDate, config))
    
    return alternatives
  }

  /**
   * 주말을 건너뛰고 다음 평일 찾기
   */
  private static skipWeekendsForward(date: Date): Date {
    let adjustedDate = new Date(date)
    while (isWeekend(adjustedDate)) {
      adjustedDate = addDays(adjustedDate, 1)
    }
    return adjustedDate
  }

  /**
   * 프로젝트 색상 생성 (간단한 해시 기반)
   */
  private static generateProjectColor(projectId: string): string {
    const colors = [
      '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FCEA2B', '#FF9FF3', '#54A0FF', '#5F27CD'
    ]
    
    let hash = 0
    for (let i = 0; i < projectId.length; i++) {
      hash = ((hash << 5) - hash + projectId.charCodeAt(i)) & 0xffffffff
    }
    
    return colors[Math.abs(hash) % colors.length]
  }

  /**
   * 충돌 해결 제안 생성
   */
  static generateConflictResolutionSuggestions(
    conflicts: EnhancedCalendarConflict[]
  ): string[] {
    const suggestions: string[] = []
    
    conflicts.forEach(conflict => {
      switch (conflict.type) {
        case 'filming-overlap':
          suggestions.push(
            `촬영 일정 조정: ${conflict.events[0].title}과 ${conflict.events[1].title}의 촬영 날짜를 다르게 조정하세요.`
          )
          break
        case 'resource-conflict':
          suggestions.push(
            '리소스 충돌 해결: 동일한 장비나 인력이 필요한 작업의 일정을 조정하세요.'
          )
          break
        case 'double-booking':
          suggestions.push(
            '중복 예약 해결: 같은 시간에 예약된 일정 중 하나를 다른 시간으로 변경하세요.'
          )
          break
      }
    })
    
    return [...new Set(suggestions)] // 중복 제거
  }

  /**
   * 최적의 시작 날짜 제안
   */
  static suggestOptimalStartDate(
    existingEvents: ProjectCalendarEvent[],
    config: AutoScheduleConfig = DEFAULT_AUTO_SCHEDULE,
    minDate: Date = new Date()
  ): Date {
    let candidateDate = new Date(minDate)
    let attempts = 0
    const maxAttempts = 30 // 30일 내에서 찾기
    
    while (attempts < maxAttempts) {
      // 주말 건너뛰기
      candidateDate = this.skipWeekendsForward(candidateDate)
      
      // 임시 일정 생성하여 충돌 검사
      const tempOptions: AutoScheduleOptions = {
        projectId: 'temp',
        projectTitle: 'temp',
        startDate: candidateDate,
        config,
        existingEvents,
        skipWeekends: true
      }
      
      const result = this.createConflictAwareSchedule(tempOptions)
      
      // 충돌이 없으면 해당 날짜 반환
      if (!result.hasConflicts) {
        return candidateDate
      }
      
      // 하루씩 뒤로 밀어가며 재시도
      candidateDate = addDays(candidateDate, 1)
      attempts++
    }
    
    // 최적 날짜를 찾지 못한 경우 원래 날짜 반환
    return minDate
  }
}

// ===========================
// Helper Functions
// ===========================

/**
 * 충돌 심각도 계산
 */
export function calculateConflictSeverity(conflicts: EnhancedCalendarConflict[]): 'low' | 'medium' | 'high' {
  if (conflicts.length === 0) return 'low'
  
  const hasFilmingConflicts = conflicts.some(c => c.type === 'filming-overlap')
  const conflictCount = conflicts.length
  
  if (hasFilmingConflicts || conflictCount >= 3) return 'high'
  if (conflictCount >= 2) return 'medium'
  return 'low'
}

/**
 * 충돌 요약 텍스트 생성
 */
export function generateConflictSummaryText(result: ConflictAwareScheduleResult): string {
  if (!result.hasConflicts) {
    return '일정 충돌이 없습니다. 제안된 일정으로 진행 가능합니다.'
  }
  
  const { conflictSummary } = result
  const totalConflicts = conflictSummary.planningConflicts + 
                        conflictSummary.filmingConflicts + 
                        conflictSummary.editingConflicts
  
  let summary = `총 ${totalConflicts}개의 일정 충돌이 발견되었습니다. `
  
  if (conflictSummary.filmingConflicts > 0) {
    summary += `촬영 일정 충돌 ${conflictSummary.filmingConflicts}개가 가장 중요합니다. `
  }
  
  if (result.alternatives && result.alternatives.length > 0) {
    summary += `${result.alternatives.length}개의 대안 일정을 제안합니다.`
  }
  
  return summary
}

// ===========================
// Exports
// ===========================

export type {
  ConflictAwareScheduleResult,
  ScheduleConflictCheck,
  AutoScheduleOptions
}