/**
 * 자동 일정 시스템 통합 테스트
 * DEVPLAN.md 요구사항: MSW와 함께 전체 플로우 테스트
 */

import { configureStore } from '@reduxjs/toolkit'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

import projectReducer, {
  createProject,
  generateAutoSchedule,
  updateAutoSchedule,
  type ProjectState
} from '../projectSlice'
import { DEFAULT_AUTO_SCHEDULE } from '@/shared/lib/project-scheduler'

// MSW 서버 설정
const server = setupServer(
  // 자동 일정 생성 API 모킹
  http.post('*/api/projects/:projectId/auto-schedule', async ({ params, request }) => {
    const { projectId } = params
    const projectIdStr = String(projectId) // 명시적으로 문자열 변환
    const body = await request.json() as any
    
    if (projectIdStr === 'error_project') {
      return HttpResponse.json({
        success: false,
        error: '자동 일정 생성에 실패했습니다'
      }, { status: 500 })
    }
    
    const startDate = new Date(body.startDate)
    const config = body.config
    
    // 기본 일정 계산
    const planningEndDate = new Date(startDate.getTime() + config.planningWeeks * 7 * 24 * 60 * 60 * 1000)
    const filmingStartDate = new Date(planningEndDate.getTime() + 24 * 60 * 60 * 1000)
    const filmingEndDate = new Date(filmingStartDate.getTime() + (config.filmingDays - 1) * 24 * 60 * 60 * 1000)
    const editingStartDate = new Date(filmingEndDate.getTime() + 24 * 60 * 60 * 1000)
    const editingEndDate = new Date(editingStartDate.getTime() + config.editingWeeks * 7 * 24 * 60 * 60 * 1000)
    
    const schedule = {
      planning: {
        startDate,
        endDate: planningEndDate,
        duration: config.planningWeeks,
        unit: 'weeks' as const
      },
      filming: {
        startDate: filmingStartDate,
        endDate: filmingEndDate,
        duration: config.filmingDays,
        unit: 'days' as const
      },
      editing: {
        startDate: editingStartDate,
        endDate: editingEndDate,
        duration: config.editingWeeks,
        unit: 'weeks' as const
      },
      totalDays: config.planningWeeks * 7 + config.filmingDays + config.editingWeeks * 7
    }
    
    const calendarEvents = [
      {
        id: `planning_${projectIdStr}`,
        title: '기획',
        startDate: startDate.toISOString(),
        endDate: planningEndDate.toISOString(),
        type: 'planning',
        projectId: projectIdStr
      },
      {
        id: `filming_${projectIdStr}`,
        title: '촬영',
        startDate: filmingStartDate.toISOString(),
        endDate: filmingEndDate.toISOString(),
        type: 'filming',
        projectId: projectIdStr
      },
      {
        id: `editing_${projectIdStr}`,
        title: '편집',
        startDate: editingStartDate.toISOString(),
        endDate: editingEndDate.toISOString(),
        type: 'editing',
        projectId: projectIdStr
      }
    ]
    
    return HttpResponse.json({
      success: true,
      data: {
        schedule,
        calendarEvents
      },
      message: '자동 일정이 생성되었습니다.'
    })
  }),

  // 자동 일정 업데이트 API 모킹
  http.put('*/api/projects/:projectId/auto-schedule', async ({ params, request }) => {
    const { projectId } = params
    const projectIdStr = String(projectId) // 명시적으로 문자열 변환
    const body = await request.json() as any
    
    if (projectIdStr === 'error_project') {
      return HttpResponse.json({
        success: false,
        error: '일정 업데이트에 실패했습니다.'
      }, { status: 500 })
    }
    
    const startDate = body.startDate ? new Date(body.startDate) : new Date()
    const config = body.config
    
    const planningEndDate = new Date(startDate.getTime() + config.planningWeeks * 7 * 24 * 60 * 60 * 1000)
    const filmingStartDate = new Date(planningEndDate.getTime() + 24 * 60 * 60 * 1000)
    const filmingEndDate = new Date(filmingStartDate.getTime() + (config.filmingDays - 1) * 24 * 60 * 60 * 1000)
    const editingStartDate = new Date(filmingEndDate.getTime() + 24 * 60 * 60 * 1000)
    const editingEndDate = new Date(editingStartDate.getTime() + config.editingWeeks * 7 * 24 * 60 * 60 * 1000)
    
    const schedule = {
      planning: {
        startDate,
        endDate: planningEndDate,
        duration: config.planningWeeks,
        unit: 'weeks' as const
      },
      filming: {
        startDate: filmingStartDate,
        endDate: filmingEndDate,
        duration: config.filmingDays,
        unit: 'days' as const
      },
      editing: {
        startDate: editingStartDate,
        endDate: editingEndDate,
        duration: config.editingWeeks,
        unit: 'weeks' as const
      },
      totalDays: config.planningWeeks * 7 + config.filmingDays + config.editingWeeks * 7
    }
    
    return HttpResponse.json({
      success: true,
      data: {
        schedule,
        updated: true
      },
      message: '자동 일정이 업데이트되었습니다.'
    })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())


describe('자동 일정 시스템 통합 테스트 (MSW)', () => {
  describe('generateAutoSchedule with MSW', () => {
    it('MSW 모킹된 API와 함께 자동 일정을 생성해야 한다', async () => {
      const store = createTestStore()
      const startDate = new Date('2024-01-01')
      
      const result = await store.dispatch(generateAutoSchedule({
        projectId: 'test_project_123',
        startDate,
        config: DEFAULT_AUTO_SCHEDULE
      }))
      
      expect(generateAutoSchedule.fulfilled.match(result)).toBe(true)
      
      if (generateAutoSchedule.fulfilled.match(result)) {
        // 스케줄이 올바르게 생성되었는지 확인
        expect(result.payload.schedule.planning.duration).toBe(1) // 기획 1주
        expect(result.payload.schedule.filming.duration).toBe(1)   // 촬영 1일
        expect(result.payload.schedule.editing.duration).toBe(2)   // 편집 2주
        
        // 캘린더 이벤트가 생성되었는지 확인
        expect(result.payload.calendarEvents).toHaveLength(3)
        expect(result.payload.calendarEvents[0].type).toBe('planning')
        expect(result.payload.calendarEvents[1].type).toBe('filming')
        expect(result.payload.calendarEvents[2].type).toBe('editing')
        
        // 각 이벤트가 올바른 projectId를 가지는지 확인
        result.payload.calendarEvents.forEach(event => {
          expect(event.projectId).toBe('test_project_123')
        })
      }
      
      const state = store.getState().project
      expect(state.isGeneratingSchedule).toBe(false)
      expect(state.scheduleError).toBeNull()
      expect(state.autoSchedulePreview).toBeTruthy()
    })

    it('API 에러 발생 시 적절한 에러 처리를 해야 한다', async () => {
      const store = createTestStore()
      
      const result = await store.dispatch(generateAutoSchedule({
        projectId: 'error_project',
        startDate: new Date('2024-01-01')
      }))
      
      expect(generateAutoSchedule.rejected.match(result)).toBe(true)
      
      const state = store.getState().project
      expect(state.isGeneratingSchedule).toBe(false)
      expect(state.scheduleError).toBe('자동 일정 생성에 실패했습니다')
      expect(state.autoSchedulePreview).toBeNull()
    })
  })

  describe('updateAutoSchedule with MSW', () => {
    it('MSW 모킹된 API와 함께 자동 일정을 업데이트해야 한다', async () => {
      const store = createTestStore({
        project: {
          currentProject: {
            id: 'test_project_456',
            title: '테스트 프로젝트',
            description: '',
            status: 'draft' as const,
            ownerId: 'user_1',
            members: [],
            videos: [],
            tags: [],
            settings: {
              isPublic: false,
              allowComments: true,
              allowDownload: false,
              requireApproval: true,
              watermarkEnabled: true
            },
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          }
        }
      })
      
      const customConfig = {
        planningWeeks: 3,
        filmingDays: 5,
        editingWeeks: 4
      }
      
      const result = await store.dispatch(updateAutoSchedule({
        projectId: 'test_project_456',
        config: customConfig
      }))
      
      expect(updateAutoSchedule.fulfilled.match(result)).toBe(true)
      
      if (updateAutoSchedule.fulfilled.match(result)) {
        expect(result.payload.schedule.planning.duration).toBe(3)
        expect(result.payload.schedule.filming.duration).toBe(5)
        expect(result.payload.schedule.editing.duration).toBe(4)
        expect(result.payload.updated).toBe(true)
        
        // 총 일수 계산 확인
        const expectedTotalDays = 3 * 7 + 5 + 4 * 7 // 21 + 5 + 28 = 54
        expect(result.payload.schedule.totalDays).toBe(expectedTotalDays)
      }
      
      const state = store.getState().project
      expect(state.isGeneratingSchedule).toBe(false)
      expect(state.scheduleError).toBeNull()
    })

    it('프로젝트가 없는 상태에서 업데이트 시 에러를 반환해야 한다', async () => {
      const store = createTestStore() // currentProject가 없는 상태
      
      const result = await store.dispatch(updateAutoSchedule({
        projectId: 'test_project_789',
        config: DEFAULT_AUTO_SCHEDULE
      }))
      
      expect(updateAutoSchedule.rejected.match(result)).toBe(true)
      
      if (updateAutoSchedule.rejected.match(result)) {
        expect(result.payload).toBe('현재 프로젝트가 없습니다')
      }
    })
  })

  describe('전체 플로우 통합 테스트', () => {
    it('프로젝트 생성 → 자동 일정 생성 → 일정 수정 전체 플로우가 동작해야 한다', async () => {
      const store = createTestStore()
      
      // 1. 프로젝트 생성 (자동 일정 포함)
      const createResult = await store.dispatch(createProject({
        title: '통합 테스트 프로젝트',
        description: '전체 플로우 테스트',
        startDate: new Date('2024-02-01'),
        autoScheduleConfig: DEFAULT_AUTO_SCHEDULE
      }))
      
      expect(createProject.fulfilled.match(createResult)).toBe(true)
      
      let state = store.getState().project
      expect(state.currentProject).toBeTruthy()
      expect(state.currentProject?.calendarEvents).toHaveLength(3)
      
      // 2. 자동 일정 추가 생성
      const generateResult = await store.dispatch(generateAutoSchedule({
        projectId: state.currentProject!.id,
        startDate: new Date('2024-03-01'),
        config: { planningWeeks: 2, filmingDays: 2, editingWeeks: 3 }
      }))
      
      expect(generateAutoSchedule.fulfilled.match(generateResult)).toBe(true)
      
      state = store.getState().project
      expect(state.autoSchedulePreview).toBeTruthy()
      
      // 3. 일정 업데이트
      const updateResult = await store.dispatch(updateAutoSchedule({
        projectId: state.currentProject!.id,
        config: { planningWeeks: 1, filmingDays: 3, editingWeeks: 2 }
      }))
      
      expect(updateAutoSchedule.fulfilled.match(updateResult)).toBe(true)
      
      // 최종 상태 검증
      state = store.getState().project
      expect(state.isGeneratingSchedule).toBe(false)
      expect(state.scheduleError).toBeNull()
      expect(state.autoSchedulePreview?.planning.duration).toBe(1)
      expect(state.autoSchedulePreview?.filming.duration).toBe(3)
      expect(state.autoSchedulePreview?.editing.duration).toBe(2)
    })
  })
})

// 테스트 스토어 헬퍼 함수 추가
function createTestStore(preloadedState?: { project: Partial<ProjectState> }) {
  return configureStore({
    reducer: {
      project: projectReducer
    },
    preloadedState: preloadedState ? {
      project: {
        projects: [],
        currentProject: null,
        isLoading: false,
        isCreating: false,
        isInviting: false,
        isGeneratingSchedule: false,
        error: null,
        createError: null,
        inviteError: null,
        scheduleError: null,
        autoSchedulePreview: null,
        autoScheduleConfig: DEFAULT_AUTO_SCHEDULE,
        invitationCooldowns: {},
        pendingInvitations: [],
        currentUserRole: null,
        permissions: {
          canEdit: false,
          canDelete: false,
          canInvite: false,
          canView: false
        },
        ...preloadedState.project
      }
    } : undefined
  })
}