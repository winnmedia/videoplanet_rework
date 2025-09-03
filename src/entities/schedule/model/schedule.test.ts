import {
  createSchedule,
  updateSchedule,
  addMilestone,
  addDeadline,
  addDependency,
  detectScheduleConflicts,
  calculateScheduleHealth,
  isScheduleOnTrack,
  getUpcomingDeadlines,
  validateScheduleIntegrity
} from './schedule'
import {
  CreateScheduleCommand,
  UpdateScheduleCommand,
  AddMilestoneCommand,
  AddDeadlineCommand,
  AddDependencyCommand,
  ScheduleStatus,
  MilestoneStatus,
  DeadlineStatus,
  Priority,
  DependencyType,
  DeadlineType,
  ConflictType
} from './types'

describe('Schedule Domain Logic', () => {
  const mockProjectId = 'project_123'
  const mockUserId = 'user_456'

  describe('createSchedule', () => {
    it('올바른 스케줄을 생성해야 한다', () => {
      // Given
      const command: CreateScheduleCommand = {
        projectId: mockProjectId,
        name: '비디오 제작 일정',
        description: '마케팅 비디오 제작 프로젝트 일정',
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-01'),
          bufferDays: 5
        },
        createdBy: mockUserId
      }

      // When
      const schedule = createSchedule(command)

      // Then
      expect(schedule.projectId).toBe(mockProjectId)
      expect(schedule.name).toBe('비디오 제작 일정')
      expect(schedule.status).toBe(ScheduleStatus.DRAFT)
      expect(schedule.timeline.bufferDays).toBe(5)
      expect(schedule.timeline.workingDays).toHaveLength(7)
      expect(schedule.milestones).toHaveLength(0)
      expect(schedule.deadlines).toHaveLength(0)
      expect(schedule.version).toBe(1)
      expect(schedule.timeline.estimatedDuration).toBeGreaterThan(0)
    })

    it('기본 근무일을 올바르게 설정해야 한다', () => {
      // Given
      const command: CreateScheduleCommand = {
        projectId: mockProjectId,
        name: '테스트 스케줄',
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-01-31')
        },
        createdBy: mockUserId
      }

      // When
      const schedule = createSchedule(command)

      // Then
      const workingDays = schedule.timeline.workingDays.filter(wd => wd.isWorkingDay)
      expect(workingDays).toHaveLength(5) // Monday to Friday
      expect(workingDays.every(wd => wd.startTime === '09:00' && wd.endTime === '18:00')).toBe(true)
    })
  })

  describe('updateSchedule', () => {
    it('스케줄을 정상적으로 업데이트해야 한다', () => {
      // Given
      const originalSchedule = createSchedule({
        projectId: mockProjectId,
        name: '원본 스케줄',
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-02-01')
        },
        createdBy: mockUserId
      })

      const updateCommand: UpdateScheduleCommand = {
        scheduleId: originalSchedule.id,
        name: '업데이트된 스케줄',
        status: ScheduleStatus.ACTIVE,
        timeline: {
          endDate: new Date('2025-02-15')
        },
        updatedBy: mockUserId
      }

      // When
      const updatedSchedule = updateSchedule(originalSchedule, updateCommand)

      // Then
      expect(updatedSchedule.name).toBe('업데이트된 스케줄')
      expect(updatedSchedule.status).toBe(ScheduleStatus.ACTIVE)
      expect(updatedSchedule.timeline.endDate).toEqual(new Date('2025-02-15'))
      expect(updatedSchedule.version).toBe(2)
      expect(updatedSchedule.updatedAt).not.toEqual(originalSchedule.updatedAt)
    })

    it('잘못된 스케줄 ID로 업데이트 시 에러를 발생시켜야 한다', () => {
      // Given
      const schedule = createSchedule({
        projectId: mockProjectId,
        name: '테스트 스케줄',
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-02-01')
        },
        createdBy: mockUserId
      })

      const updateCommand: UpdateScheduleCommand = {
        scheduleId: 'wrong_id',
        name: '업데이트',
        updatedBy: mockUserId
      }

      // When & Then
      expect(() => updateSchedule(schedule, updateCommand)).toThrow('스케줄 ID가 일치하지 않습니다')
    })
  })

  describe('addMilestone', () => {
    it('마일스톤을 정상적으로 추가해야 한다', () => {
      // Given
      const schedule = createSchedule({
        projectId: mockProjectId,
        name: '테스트 스케줄',
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-01')
        },
        createdBy: mockUserId
      })

      const milestoneCommand: AddMilestoneCommand = {
        scheduleId: schedule.id,
        milestone: {
          name: '프리프로덕션 완료',
          description: '기획 및 준비 단계 완료',
          targetDate: new Date('2025-01-15'),
          status: MilestoneStatus.PENDING,
          priority: Priority.HIGH,
          deliverables: ['스토리보드', '촬영계획서'],
          dependencies: [],
          approvers: [mockUserId],
          criteria: ['스토리보드 승인', '예산 확정']
        },
        createdBy: mockUserId
      }

      // When
      const updatedSchedule = addMilestone(schedule, milestoneCommand)

      // Then
      expect(updatedSchedule.milestones).toHaveLength(1)
      expect(updatedSchedule.milestones[0].name).toBe('프리프로덕션 완료')
      expect(updatedSchedule.milestones[0].priority).toBe(Priority.HIGH)
      expect(updatedSchedule.milestones[0].deliverables).toContain('스토리보드')
      expect(updatedSchedule.version).toBe(2)
    })

    it('타임라인 범위를 벗어난 마일스톤 추가 시 에러를 발생시켜야 한다', () => {
      // Given
      const schedule = createSchedule({
        projectId: mockProjectId,
        name: '테스트 스케줄',
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-02-01')
        },
        createdBy: mockUserId
      })

      const milestoneCommand: AddMilestoneCommand = {
        scheduleId: schedule.id,
        milestone: {
          name: '범위 외 마일스톤',
          targetDate: new Date('2025-03-01'), // 타임라인 종료일 이후
          status: MilestoneStatus.PENDING,
          priority: Priority.MEDIUM,
          deliverables: [],
          dependencies: [],
          approvers: [],
          criteria: []
        },
        createdBy: mockUserId
      }

      // When & Then
      expect(() => addMilestone(schedule, milestoneCommand)).toThrow(
        '마일스톤 목표 날짜가 프로젝트 타임라인 범위를 벗어납니다'
      )
    })
  })

  describe('addDeadline', () => {
    it('데드라인을 정상적으로 추가해야 한다', () => {
      // Given
      const schedule = createSchedule({
        projectId: mockProjectId,
        name: '테스트 스케줄',
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-01')
        },
        createdBy: mockUserId
      })

      const deadlineCommand: AddDeadlineCommand = {
        scheduleId: schedule.id,
        deadline: {
          name: '최종 검토 완료',
          description: '클라이언트 최종 승인',
          dueDate: new Date('2025-02-20'),
          type: DeadlineType.HARD,
          priority: Priority.CRITICAL,
          status: DeadlineStatus.PENDING,
          assignees: [mockUserId],
          notifications: [{
            type: 'email',
            timing: 3, // 3일 전
            recipients: [mockUserId]
          }]
        },
        createdBy: mockUserId
      }

      // When
      const updatedSchedule = addDeadline(schedule, deadlineCommand)

      // Then
      expect(updatedSchedule.deadlines).toHaveLength(1)
      expect(updatedSchedule.deadlines[0].name).toBe('최종 검토 완료')
      expect(updatedSchedule.deadlines[0].type).toBe(DeadlineType.HARD)
      expect(updatedSchedule.deadlines[0].priority).toBe(Priority.CRITICAL)
      expect(updatedSchedule.deadlines[0].notifications).toHaveLength(1)
      expect(updatedSchedule.version).toBe(2)
    })
  })

  describe('addDependency', () => {
    it('의존성을 정상적으로 추가해야 한다', () => {
      // Given
      const schedule = createSchedule({
        projectId: mockProjectId,
        name: '테스트 스케줄',
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-01')
        },
        createdBy: mockUserId
      })

      const dependencyCommand: AddDependencyCommand = {
        scheduleId: schedule.id,
        dependency: {
          predecessorId: 'task_1',
          successorId: 'task_2',
          type: DependencyType.FINISH_TO_START,
          lag: 1, // 1일 지연
          description: '촬영 후 편집 시작'
        },
        createdBy: mockUserId
      }

      // When
      const updatedSchedule = addDependency(schedule, dependencyCommand)

      // Then
      expect(updatedSchedule.dependencies).toHaveLength(1)
      expect(updatedSchedule.dependencies[0].predecessorId).toBe('task_1')
      expect(updatedSchedule.dependencies[0].successorId).toBe('task_2')
      expect(updatedSchedule.dependencies[0].type).toBe(DependencyType.FINISH_TO_START)
      expect(updatedSchedule.dependencies[0].lag).toBe(1)
      expect(updatedSchedule.version).toBe(2)
    })

    it('순환 의존성이 발생할 경우 에러를 발생시켜야 한다', () => {
      // Given
      let schedule = createSchedule({
        projectId: mockProjectId,
        name: '테스트 스케줄',
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-01')
        },
        createdBy: mockUserId
      })

      // 첫 번째 의존성 추가: A -> B
      schedule = addDependency(schedule, {
        scheduleId: schedule.id,
        dependency: {
          predecessorId: 'task_A',
          successorId: 'task_B',
          type: DependencyType.FINISH_TO_START,
          lag: 0
        },
        createdBy: mockUserId
      })

      // 순환 의존성을 만드는 두 번째 의존성: B -> A
      const cyclicDependencyCommand: AddDependencyCommand = {
        scheduleId: schedule.id,
        dependency: {
          predecessorId: 'task_B',
          successorId: 'task_A',
          type: DependencyType.FINISH_TO_START,
          lag: 0
        },
        createdBy: mockUserId
      }

      // When & Then
      expect(() => addDependency(schedule, cyclicDependencyCommand)).toThrow('순환 의존성이 발생합니다')
    })
  })

  describe('calculateScheduleHealth', () => {
    it('건강한 스케줄의 점수를 올바르게 계산해야 한다', () => {
      // Given
      const schedule = createSchedule({
        projectId: mockProjectId,
        name: '건강한 스케줄',
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-01')
        },
        createdBy: mockUserId
      })

      // When
      const health = calculateScheduleHealth(schedule)

      // Then
      expect(health.overallScore).toBe(100)
      expect(health.delayedMilestones).toBe(0)
      expect(health.overdueTasks).toBe(0)
      expect(health.risks).toHaveLength(0)
    })

    it('지연된 마일스톤이 있는 스케줄의 점수를 올바르게 계산해야 한다', () => {
      // Given
      let schedule = createSchedule({
        projectId: mockProjectId,
        name: '지연된 스케줄',
        timeline: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2025-03-01')
        },
        createdBy: mockUserId
      })

      // 과거 날짜의 미완료 마일스톤 추가
      schedule = addMilestone(schedule, {
        scheduleId: schedule.id,
        milestone: {
          name: '지연된 마일스톤',
          targetDate: new Date('2024-12-01'), // 과거 날짜
          status: MilestoneStatus.PENDING, // 아직 완료되지 않음
          priority: Priority.HIGH,
          deliverables: [],
          dependencies: [],
          approvers: [],
          criteria: []
        },
        createdBy: mockUserId
      })

      // When
      const health = calculateScheduleHealth(schedule)

      // Then
      expect(health.overallScore).toBeLessThan(100)
      expect(health.delayedMilestones).toBe(1)
      expect(health.risks).toContain('1개의 지연된 마일스톤')
    })
  })

  describe('getUpcomingDeadlines', () => {
    it('다가오는 데드라인을 올바르게 반환해야 한다', () => {
      // Given
      let schedule = createSchedule({
        projectId: mockProjectId,
        name: '테스트 스케줄',
        timeline: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2025-12-31')
        },
        createdBy: mockUserId
      })

      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 3) // 3일 후

      schedule = addDeadline(schedule, {
        scheduleId: schedule.id,
        deadline: {
          name: '다가오는 데드라인',
          dueDate: futureDate,
          type: DeadlineType.SOFT,
          priority: Priority.MEDIUM,
          status: DeadlineStatus.PENDING,
          assignees: [mockUserId],
          notifications: []
        },
        createdBy: mockUserId
      })

      // When
      const upcomingDeadlines = getUpcomingDeadlines(schedule, 7)

      // Then
      expect(upcomingDeadlines).toHaveLength(1)
      expect(upcomingDeadlines[0].name).toBe('다가오는 데드라인')
    })
  })

  describe('validateScheduleIntegrity', () => {
    it('유효한 스케줄은 검증을 통과해야 한다', () => {
      // Given
      const schedule = createSchedule({
        projectId: mockProjectId,
        name: '유효한 스케줄',
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-01')
        },
        createdBy: mockUserId
      })

      // When
      const validation = validateScheduleIntegrity(schedule)

      // Then
      expect(validation.isValid).toBe(true)
      expect(validation.errors).toHaveLength(0)
    })

    it('잘못된 타임라인을 가진 스케줄은 검증에 실패해야 한다', () => {
      // Given
      const schedule = createSchedule({
        projectId: mockProjectId,
        name: '잘못된 스케줄',
        timeline: {
          startDate: new Date('2025-03-01'),
          endDate: new Date('2025-01-01') // 시작일이 종료일보다 늦음
        },
        createdBy: mockUserId
      })

      // When
      const validation = validateScheduleIntegrity(schedule)

      // Then
      expect(validation.isValid).toBe(false)
      expect(validation.errors).toContain('시작 날짜가 종료 날짜보다 늦습니다')
    })
  })

  describe('detectScheduleConflicts', () => {
    it('충돌이 없는 스케줄에서는 빈 배열을 반환해야 한다', () => {
      // Given
      const schedule = createSchedule({
        projectId: mockProjectId,
        name: '충돌 없는 스케줄',
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-01')
        },
        createdBy: mockUserId
      })

      // When
      const conflicts = detectScheduleConflicts(schedule)

      // Then
      expect(conflicts).toHaveLength(0)
    })
  })

  describe('isScheduleOnTrack', () => {
    it('건강한 스케줄은 정상 진행 중으로 판단해야 한다', () => {
      // Given
      const schedule = createSchedule({
        projectId: mockProjectId,
        name: '정상 진행 스케줄',
        timeline: {
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-01')
        },
        createdBy: mockUserId
      })

      // When
      const isOnTrack = isScheduleOnTrack(schedule)

      // Then
      expect(isOnTrack).toBe(true)
    })
  })
})