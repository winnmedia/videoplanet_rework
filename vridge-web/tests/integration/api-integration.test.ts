/**
 * @fileoverview API Integration Tests
 * @description 4개 주요 API 엔드포인트 통합 동작 검증
 * @layer tests/integration
 */

import { describe, it, expect } from 'vitest'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002/api'

describe('API Integration Tests', () => {
  let testProjectId: string
  const testVideoId: string = 'test-video-1'

  describe('1. 프로젝트 생성 → 조회 플로우', () => {
    it('프로젝트를 성공적으로 생성할 수 있어야 함', async () => {
      const projectData = {
        title: '통합 테스트 프로젝트',
        description: 'API 통합 테스트용 프로젝트',
        category: 'corporate',
        targetAudience: '내부 직원',
        duration: 180,
        budget: 1000000,
      }

      const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(projectData),
      })

      expect(response.status).toBe(201)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.project).toBeDefined()
      expect(result.project.id).toBeDefined()
      expect(result.project.title).toBe(projectData.title)
      expect(result.project.status).toBe('planning')

      testProjectId = result.project.id
      console.log('✅ 프로젝트 생성 성공:', testProjectId)
    })

    it('생성된 프로젝트를 조회할 수 있어야 함', async () => {
      const response = await fetch(`${API_BASE}/projects/${testProjectId}`)

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.project).toBeDefined()
      expect(result.project.id).toBe(testProjectId)
      expect(result.project.schedule).toBeDefined()

      console.log('✅ 프로젝트 조회 성공:', result.project.title)
    })

    it('사용자의 프로젝트 목록을 조회할 수 있어야 함', async () => {
      const response = await fetch(`${API_BASE}/projects?userId=test-user`)

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.projects).toBeInstanceOf(Array)
      expect(result.total).toBeGreaterThan(0)

      // 방금 생성한 프로젝트가 목록에 있는지 확인
      const createdProject = result.projects.find((p: Record<string, unknown>) => p.id === testProjectId)
      expect(createdProject).toBeDefined()

      console.log('✅ 프로젝트 목록 조회 성공:', result.total, '개')
    })
  })

  describe('2. 팀원 초대 이메일 발송 검증', () => {
    it('팀원 초대 이메일을 성공적으로 발송할 수 있어야 함', async () => {
      const invitationData = {
        email: 'test@example.com',
        role: 'editor',
        message: '프로젝트에 참여해 주세요!',
        expiresInDays: 7,
      }

      const response = await fetch(`${API_BASE}/projects/${testProjectId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invitationData),
      })

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.invitation).toBeDefined()
      expect(result.invitation.email).toBe(invitationData.email)
      expect(result.invitation.role).toBe(invitationData.role)
      expect(result.invitation.status).toBe('pending')
      expect(result.inviteLink).toBeDefined()

      console.log('✅ 팀원 초대 이메일 발송 성공')
      console.log('   초대 링크:', result.inviteLink)
    })

    it('잘못된 이메일 형식으로 초대 시 검증 오류가 발생해야 함', async () => {
      const invalidInvitationData = {
        email: 'invalid-email',
        role: 'editor',
      }

      const response = await fetch(`${API_BASE}/projects/${testProjectId}/invite`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidInvitationData),
      })

      expect(response.status).toBe(400)

      const result = await response.json()
      expect(result.error).toBe('Validation failed')
      expect(result.details).toBeDefined()

      console.log('✅ 이메일 형식 검증 정상 작동')
    })
  })

  describe('3. 댓글 추가 → 타임코드 정렬 확인', () => {
    const testComments = [
      { timecode: 120, content: '2분 지점 댓글', type: 'comment', priority: 'medium' },
      { timecode: 30, content: '30초 지점 댓글', type: 'suggestion', priority: 'high' },
      { timecode: 90, content: '1분 30초 지점 댓글', type: 'issue', priority: 'critical' },
      { timecode: 15, content: '15초 지점 댓글', type: 'comment', priority: 'low' },
    ]

    it('다양한 타임코드의 댓글들을 추가할 수 있어야 함', async () => {
      for (const comment of testComments) {
        const feedbackData = {
          projectId: testProjectId,
          videoId: testVideoId,
          ...comment,
          tags: ['test', 'integration'],
        }

        const response = await fetch(`${API_BASE}/feedback`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(feedbackData),
        })

        expect(response.status).toBe(201)

        const result = await response.json()
        expect(result.success).toBe(true)
        expect(result.feedback).toBeDefined()
        expect(result.feedback.timecode).toBe(comment.timecode)
        expect(result.feedback.content).toBe(comment.content)
      }

      console.log('✅ 4개 댓글 추가 성공')
    })

    it('댓글 조회 시 타임코드 기준으로 올바르게 정렬되어야 함', async () => {
      const response = await fetch(`${API_BASE}/feedback?projectId=${testProjectId}&videoId=${testVideoId}`)

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.feedbacks).toBeInstanceOf(Array)
      expect(result.feedbacks).toHaveLength(4)
      expect(result.sorted).toBe('timecode_asc')

      // 타임코드 순서 검증 (15, 30, 90, 120)
      const timecodes = result.feedbacks.map((f: Record<string, unknown>) => f.timecode)
      expect(timecodes).toEqual([15, 30, 90, 120])

      // 각 댓글 내용 검증
      expect(result.feedbacks[0].content).toBe('15초 지점 댓글')
      expect(result.feedbacks[1].content).toBe('30초 지점 댓글')
      expect(result.feedbacks[2].content).toBe('1분 30초 지점 댓글')
      expect(result.feedbacks[3].content).toBe('2분 지점 댓글')

      console.log('✅ 타임코드 정렬 검증 성공')
      console.log('   정렬된 타임코드:', timecodes)
    })
  })

  describe('4. 자동 일정 계산 정확성 검증', () => {
    it('기업용 중간 복잡도 프로젝트의 일정을 정확하게 계산해야 함', async () => {
      const scheduleRequest = {
        projectId: testProjectId,
        projectType: 'corporate',
        complexity: 'medium',
        teamSize: 3,
        budget: 1000000,
        targetDuration: 180,
        startDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        constraints: {
          maxPlanningDays: 10,
          maxShootingDays: 5,
          maxEditingDays: 15,
          availableDays: [1, 2, 3, 4, 5], // 월-금
        },
      }

      const response = await fetch(`${API_BASE}/projects/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleRequest),
      })

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)
      expect(result.schedule).toBeDefined()

      const { schedule } = result

      // 기본 구조 검증
      expect(schedule.projectId).toBe(testProjectId)
      expect(schedule.totalDays).toBeGreaterThan(0)
      expect(schedule.phases).toBeDefined()
      expect(schedule.phases.planning).toBeDefined()
      expect(schedule.phases.shooting).toBeDefined()
      expect(schedule.phases.editing).toBeDefined()

      // 각 단계 검증
      const { planning, shooting, editing } = schedule.phases

      expect(planning.duration).toBeGreaterThan(0)
      expect(planning.duration).toBeLessThanOrEqual(10) // maxPlanningDays 제한
      expect(planning.tasks).toBeInstanceOf(Array)
      expect(planning.tasks).toHaveLength(4)

      expect(shooting.duration).toBeGreaterThan(0)
      expect(shooting.duration).toBeLessThanOrEqual(5) // maxShootingDays 제한
      expect(shooting.tasks).toBeInstanceOf(Array)

      expect(editing.duration).toBeGreaterThan(0)
      expect(editing.duration).toBeLessThanOrEqual(15) // maxEditingDays 제한
      expect(editing.tasks).toBeInstanceOf(Array)

      // 날짜 순서 검증
      const planningStart = new Date(planning.startDate)
      const planningEnd = new Date(planning.endDate)
      const shootingStart = new Date(shooting.startDate)
      const shootingEnd = new Date(shooting.endDate)
      const editingStart = new Date(editing.startDate)
      const editingEnd = new Date(editing.endDate)

      expect(planningStart.getTime()).toBeLessThan(planningEnd.getTime())
      expect(planningEnd.getTime()).toBeLessThan(shootingStart.getTime())
      expect(shootingStart.getTime()).toBeLessThan(shootingEnd.getTime())
      expect(shootingEnd.getTime()).toBeLessThan(editingStart.getTime())
      expect(editingStart.getTime()).toBeLessThan(editingEnd.getTime())

      // 계산 요소 검증
      expect(schedule.calculationFactors).toBeDefined()
      expect(schedule.calculationFactors.projectType).toBe('corporate')
      expect(schedule.calculationFactors.complexity).toBe('medium')
      expect(schedule.calculationFactors.teamSize).toBe(3)
      expect(schedule.calculationFactors.complexityMultiplier).toBe(1.0)
      expect(schedule.calculationFactors.teamEfficiency).toBe(0.7)

      console.log('✅ 자동 일정 계산 검증 성공')
      console.log(`   총 일수: ${schedule.totalDays}일`)
      console.log(`   기획: ${planning.duration}일, 촬영: ${shooting.duration}일, 편집: ${editing.duration}일`)
    })

    it('다른 프로젝트 유형의 일정 계산도 정상 작동해야 함', async () => {
      const scheduleRequest = {
        projectId: testProjectId,
        projectType: 'marketing',
        complexity: 'simple',
        teamSize: 2,
      }

      const response = await fetch(`${API_BASE}/projects/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scheduleRequest),
      })

      expect(response.status).toBe(200)

      const result = await response.json()
      expect(result.success).toBe(true)

      const { schedule } = result
      expect(schedule.calculationFactors.projectType).toBe('marketing')
      expect(schedule.calculationFactors.complexity).toBe('simple')
      expect(schedule.calculationFactors.complexityMultiplier).toBe(0.7) // simple

      // 마케팅 프로젝트는 기업용보다 일반적으로 짧아야 함
      expect(schedule.totalDays).toBeLessThan(20)

      console.log('✅ 마케팅 프로젝트 일정 계산 성공')
      console.log(`   총 일수: ${schedule.totalDays}일`)
    })
  })
})

describe('헬스체크 API', () => {
  it('헬스체크 API가 정상 응답해야 함', async () => {
    const response = await fetch(`${API_BASE}/health`)

    expect(response.status).toBe(200)

    const result = await response.json()
    expect(result.status).toBe('healthy')
    expect(result.service).toBe('vridge-web')
    expect(result.timestamp).toBeDefined()
    expect(result.uptime).toBeGreaterThan(0)
    expect(result.memory).toBeDefined()

    console.log('✅ 헬스체크 통과')
  })
})
