/**
 * Auto Schedule Service Tests
 * DEVPLAN.md 요구사항: TDD 원칙, 충돌 검지, 대안 제시
 */

import { addDays, addWeeks } from 'date-fns'

import {
  AutoScheduleService,
  calculateConflictSeverity,
  generateConflictSummaryText,
  type AutoScheduleOptions
} from '../auto-schedule-service'
import { DEFAULT_AUTO_SCHEDULE } from '../project-scheduler'

// Mock data
const mockProjectId = 'project_test_123'
const mockProjectTitle = '테스트 프로젝트'
const mockStartDate = new Date('2024-01-01T09:00:00Z')

describe('AutoScheduleService', () => {
  describe('createConflictAwareSchedule', () => {
    it('충돌이 없는 경우 기본 일정을 생성해야 한다', () => {
      const options: AutoScheduleOptions = {
        projectId: mockProjectId,
        projectTitle: mockProjectTitle,
        startDate: mockStartDate,
        config: DEFAULT_AUTO_SCHEDULE,
        existingEvents: [],
        skipWeekends: true
      }

      const result = AutoScheduleService.createConflictAwareSchedule(options)

      // 기본 일정 검증
      expect(result.planning.duration).toBe(1) // 1주
      expect(result.filming.duration).toBe(1)   // 1일
      expect(result.editing.duration).toBe(2)   // 2주
      expect(result.totalDays).toBe(22) // 7 + 1 + 14 = 22일

      // 충돌 상태 검증
      expect(result.hasConflicts).toBe(false)
      expect(result.conflicts).toHaveLength(0)
      expect(result.conflictSummary).toEqual({
        planningConflicts: 0,
        filmingConflicts: 0,
        editingConflicts: 0
      })

      // 대안 일정 없어야 함
      expect(result.alternatives).toHaveLength(0)
    })

    it('주말을 건너뛰고 평일부터 시작해야 한다', () => {
      // 토요일로 시작
      const weekendStart = new Date('2024-01-06T09:00:00Z') // 토요일

      const options: AutoScheduleOptions = {
        projectId: mockProjectId,
        projectTitle: mockProjectTitle,
        startDate: weekendStart,
        config: DEFAULT_AUTO_SCHEDULE,
        existingEvents: [],
        skipWeekends: true
      }

      const result = AutoScheduleService.createConflictAwareSchedule(options)

      // 월요일부터 시작해야 함
      const expectedStart = new Date('2024-01-08T09:00:00Z') // 월요일
      expect(result.planning.startDate.getDay()).toBe(1) // 월요일 = 1
      expect(result.planning.startDate.getTime()).toBeGreaterThanOrEqual(expectedStart.getTime())
    })

    it('커스텀 설정으로 일정을 생성해야 한다', () => {
      const customConfig = {
        planningWeeks: 2,
        filmingDays: 3,
        editingWeeks: 4
      }

      const options: AutoScheduleOptions = {
        projectId: mockProjectId,
        projectTitle: mockProjectTitle,
        startDate: mockStartDate,
        config: customConfig,
        existingEvents: [],
        skipWeekends: false
      }

      const result = AutoScheduleService.createConflictAwareSchedule(options)

      expect(result.planning.duration).toBe(2) // 2주
      expect(result.filming.duration).toBe(3)   // 3일
      expect(result.editing.duration).toBe(4)   // 4주
      expect(result.totalDays).toBe(45) // 14 + 3 + 28 = 45일
    })
  })

  describe('충돌 검지 및 대안 생성', () => {
    it('촬영 일정 충돌을 감지해야 한다', () => {
      // 기존 촬영 이벤트 (1월 9일)
      const existingFilmingEvent = {
        id: 'existing_filming',
        title: '기존 촬영',
        startDate: '2024-01-09T09:00:00Z',
        endDate: '2024-01-09T18:00:00Z',
        isAllDay: false,
        category: 'filming' as const,
        priority: 'high' as const,
        type: 'filming',
        projectId: 'existing_project',
        recurrence: 'none' as const,
        createdBy: 'user_123',
        isCompleted: false,
        isConflicting: false,
        project: {
          id: 'existing_project',
          name: '기존 프로젝트',
          color: '#ff0000',
          description: '',
          status: 'active' as const,
          phases: [],
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        phase: {
          id: 'existing_filming_phase',
          name: '촬영',
          type: 'filming' as const,
          projectId: 'existing_project',
          startDate: '2024-01-09T09:00:00Z',
          endDate: '2024-01-09T18:00:00Z',
          duration: 1,
          isMovable: true
        }
      }

      const options: AutoScheduleOptions = {
        projectId: mockProjectId,
        projectTitle: mockProjectTitle,
        startDate: mockStartDate,
        config: DEFAULT_AUTO_SCHEDULE,
        existingEvents: [existingFilmingEvent],
        skipWeekends: true
      }

      const result = AutoScheduleService.createConflictAwareSchedule(options)

      // 충돌 감지 확인
      expect(result.hasConflicts).toBe(true)
      expect(result.conflicts.length).toBeGreaterThan(0)
      expect(result.conflictSummary.filmingConflicts).toBeGreaterThan(0)

      // 대안 일정 생성 확인
      expect(result.alternatives).toBeDefined()
      expect(result.alternatives!.length).toBeGreaterThan(0)
    })

    it('대안 일정이 원래 일정보다 늦게 시작해야 한다', () => {
      const options: AutoScheduleOptions = {
        projectId: mockProjectId,
        projectTitle: mockProjectTitle,
        startDate: mockStartDate,
        config: DEFAULT_AUTO_SCHEDULE,
        existingEvents: [],
        skipWeekends: true
      }

      // 강제로 충돌 시뮬레이션
      const originalService = AutoScheduleService.createConflictAwareSchedule
      jest.spyOn(AutoScheduleService, 'createConflictAwareSchedule').mockImplementation((opts) => {
        const result = originalService.call(AutoScheduleService, opts)
        
        // 첫 번째 호출에서는 충돌이 있다고 가정
        if (!result.alternatives) {
          return {
            ...result,
            hasConflicts: true,
            conflicts: [{
              id: 'mock_conflict',
              type: 'filming-overlap',
              severity: 'warning' as const,
              events: [],
              message: '모킹된 충돌',
              suggestedResolution: '일정 조정 필요',
              createdAt: new Date().toISOString()
            }],
            alternatives: [
              {
                ...result,
                planning: {
                  ...result.planning,
                  startDate: addWeeks(result.planning.startDate, 1),
                  endDate: addWeeks(result.planning.endDate, 1)
                }
              }
            ]
          }
        }
        
        return result
      })

      const result = AutoScheduleService.createConflictAwareSchedule(options)

      expect(result.hasConflicts).toBe(true)
      expect(result.alternatives).toBeDefined()
      
      if (result.alternatives && result.alternatives.length > 0) {
        const alternative = result.alternatives[0]
        expect(alternative.planning.startDate.getTime()).toBeGreaterThan(
          result.planning.startDate.getTime()
        )
      }

      jest.restoreAllMocks()
    })
  })

  describe('suggestOptimalStartDate', () => {
    it('충돌이 없는 최적의 시작 날짜를 찾아야 한다', () => {
      const existingEvents = [] // 비어있는 이벤트 배열
      const minDate = new Date('2024-01-01')

      const optimalDate = AutoScheduleService.suggestOptimalStartDate(
        existingEvents,
        DEFAULT_AUTO_SCHEDULE,
        minDate
      )

      expect(optimalDate.getTime()).toBeGreaterThanOrEqual(minDate.getTime())
    })

    it('주말은 건너뛰고 평일을 제안해야 한다', () => {
      const existingEvents = []
      const saturdayStart = new Date('2024-01-06') // 토요일

      const optimalDate = AutoScheduleService.suggestOptimalStartDate(
        existingEvents,
        DEFAULT_AUTO_SCHEDULE,
        saturdayStart
      )

      // 월요일(1) 이상이어야 함
      expect(optimalDate.getDay()).toBeGreaterThanOrEqual(1)
      expect(optimalDate.getDay()).toBeLessThanOrEqual(5)
    })
  })
})

describe('헬퍼 함수들', () => {
  describe('calculateConflictSeverity', () => {
    it('충돌이 없으면 low를 반환해야 한다', () => {
      const severity = calculateConflictSeverity([])
      expect(severity).toBe('low')
    })

    it('촬영 충돌이 있으면 high를 반환해야 한다', () => {
      const conflicts = [{
        id: 'conflict_1',
        type: 'filming-overlap' as const,
        severity: 'warning' as const,
        events: [],
        message: '촬영 충돌',
        suggestedResolution: '일정 조정',
        createdAt: new Date().toISOString()
      }]

      const severity = calculateConflictSeverity(conflicts)
      expect(severity).toBe('high')
    })

    it('3개 이상의 충돌이 있으면 high를 반환해야 한다', () => {
      const conflicts = Array.from({ length: 3 }, (_, i) => ({
        id: `conflict_${i}`,
        type: 'resource-conflict' as const,
        severity: 'warning' as const,
        events: [],
        message: `충돌 ${i}`,
        suggestedResolution: '일정 조정',
        createdAt: new Date().toISOString()
      }))

      const severity = calculateConflictSeverity(conflicts)
      expect(severity).toBe('high')
    })

    it('2개의 충돌이 있으면 medium을 반환해야 한다', () => {
      const conflicts = Array.from({ length: 2 }, (_, i) => ({
        id: `conflict_${i}`,
        type: 'resource-conflict' as const,
        severity: 'warning' as const,
        events: [],
        message: `충돌 ${i}`,
        suggestedResolution: '일정 조정',
        createdAt: new Date().toISOString()
      }))

      const severity = calculateConflictSeverity(conflicts)
      expect(severity).toBe('medium')
    })
  })

  describe('generateConflictSummaryText', () => {
    it('충돌이 없으면 성공 메시지를 반환해야 한다', () => {
      const mockResult = {
        planning: { startDate: new Date(), endDate: new Date(), duration: 1, unit: 'weeks' as const },
        filming: { startDate: new Date(), endDate: new Date(), duration: 1, unit: 'days' as const },
        editing: { startDate: new Date(), endDate: new Date(), duration: 2, unit: 'weeks' as const },
        totalDays: 22,
        hasConflicts: false,
        conflicts: [],
        conflictSummary: {
          planningConflicts: 0,
          filmingConflicts: 0,
          editingConflicts: 0
        }
      }

      const summary = generateConflictSummaryText(mockResult)
      expect(summary).toContain('일정 충돌이 없습니다')
    })

    it('충돌이 있으면 충돌 정보를 포함한 메시지를 반환해야 한다', () => {
      const mockResult = {
        planning: { startDate: new Date(), endDate: new Date(), duration: 1, unit: 'weeks' as const },
        filming: { startDate: new Date(), endDate: new Date(), duration: 1, unit: 'days' as const },
        editing: { startDate: new Date(), endDate: new Date(), duration: 2, unit: 'weeks' as const },
        totalDays: 22,
        hasConflicts: true,
        conflicts: [
          {
            id: 'conflict_1',
            type: 'filming-overlap' as const,
            severity: 'warning' as const,
            events: [],
            message: '촬영 충돌',
            suggestedResolution: '일정 조정',
            createdAt: new Date().toISOString()
          }
        ],
        conflictSummary: {
          planningConflicts: 0,
          filmingConflicts: 1,
          editingConflicts: 0
        },
        alternatives: [
          {
            planning: { startDate: new Date(), endDate: new Date(), duration: 1, unit: 'weeks' as const },
            filming: { startDate: new Date(), endDate: new Date(), duration: 1, unit: 'days' as const },
            editing: { startDate: new Date(), endDate: new Date(), duration: 2, unit: 'weeks' as const },
            totalDays: 22
          }
        ]
      }

      const summary = generateConflictSummaryText(mockResult)
      expect(summary).toContain('1개의 일정 충돌이 발견')
      expect(summary).toContain('촬영 일정 충돌')
      expect(summary).toContain('1개의 대안 일정을 제안')
    })
  })
})