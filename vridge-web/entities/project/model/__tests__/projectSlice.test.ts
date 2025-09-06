/**
 * Project Slice Tests
 * DEVPLAN.md 요구사항: Redux Toolkit 2.0, TDD 원칙 준수, MSW 사용
 */

import { configureStore } from '@reduxjs/toolkit'

import projectReducer, {
  createProject,
  inviteTeamMember,
  fetchProjects,
  generateAutoSchedule,
  updateAutoSchedule,
  setAutoSchedulePreview,
  setAutoScheduleConfig,
  clearCreateError,
  clearInviteError,
  clearScheduleError,
  selectProjects,
  selectIsCreating,
  selectCreateError,
  selectInviteError,
  selectAutoScheduleConfig,
  selectIsGeneratingSchedule,
  selectScheduleError,
  type ProjectState
} from '../projectSlice'

// 테스트용 스토어 설정
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
        autoScheduleConfig: { planningWeeks: 1, filmingDays: 1, editingWeeks: 2 },
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

describe('projectSlice', () => {
  describe('초기 상태', () => {
    it('올바른 초기 상태를 가져야 한다', () => {
      const store = createTestStore()
      const state = store.getState().project
      
      expect(state.projects).toEqual([])
      expect(state.currentProject).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.isCreating).toBe(false)
      expect(state.isInviting).toBe(false)
      expect(state.isGeneratingSchedule).toBe(false)
      expect(state.error).toBeNull()
      expect(state.createError).toBeNull()
      expect(state.inviteError).toBeNull()
      expect(state.scheduleError).toBeNull()
      expect(state.autoSchedulePreview).toBeNull()
      expect(state.autoScheduleConfig).toEqual({ planningWeeks: 1, filmingDays: 1, editingWeeks: 2 })
      expect(state.invitationCooldowns).toEqual({})
      expect(state.pendingInvitations).toEqual([])
      expect(state.currentUserRole).toBeNull()
      expect(state.permissions).toEqual({
        canEdit: false,
        canDelete: false,
        canInvite: false,
        canView: false
      })
    })
  })

  describe('동기 액션', () => {
    it('setAutoSchedulePreview는 자동 스케줄 프리뷰를 설정해야 한다', () => {
      const store = createTestStore()
      const mockSchedule = {
        planning: {
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-01-08'),
          duration: 1,
          unit: 'weeks' as const
        },
        filming: {
          startDate: new Date('2024-01-09'),
          endDate: new Date('2024-01-09'),
          duration: 1,
          unit: 'days' as const
        },
        editing: {
          startDate: new Date('2024-01-10'),
          endDate: new Date('2024-01-24'),
          duration: 2,
          unit: 'weeks' as const
        },
        totalDays: 24
      }
      
      store.dispatch(setAutoSchedulePreview(mockSchedule))
      
      const state = store.getState().project
      expect(state.autoSchedulePreview).toEqual(mockSchedule)
    })

    it('clearCreateError는 생성 에러를 지워야 한다', () => {
      const store = createTestStore({
        project: { createError: '생성 실패' }
      })
      
      store.dispatch(clearCreateError())
      
      const state = store.getState().project
      expect(state.createError).toBeNull()
    })

    it('clearInviteError는 초대 에러를 지워야 한다', () => {
      const store = createTestStore({
        project: { inviteError: '초대 실패' }
      })
      
      store.dispatch(clearInviteError())
      
      const state = store.getState().project
      expect(state.inviteError).toBeNull()
    })
  })

  describe('비동기 액션 - createProject', () => {
    it('pending 상태에서 isCreating을 true로 설정해야 한다', () => {
      const store = createTestStore()
      
      store.dispatch(createProject.pending('', {
        title: '테스트 프로젝트',
        description: '테스트 설명'
      }))
      
      const state = store.getState().project
      expect(state.isCreating).toBe(true)
      expect(state.createError).toBeNull()
    })

    it('fulfilled 상태에서 프로젝트를 생성하고 상태를 업데이트해야 한다', () => {
      const store = createTestStore()
      const mockProject = {
        id: 'project_123',
        title: '테스트 프로젝트',
        description: '테스트 설명',
        status: 'draft' as const,
        ownerId: 'user_123',
        members: [{
          userId: 'user_123',
          role: 'owner' as const,
          joinedAt: '2024-01-01T00:00:00Z'
        }],
        videos: [],
        tags: [],
        settings: {
          isPublic: false,
          allowComments: true,
          allowDownload: false,
          requireApproval: true,
          watermarkEnabled: true
        },
        calendarEvents: [],
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      }
      const mockResponse = {
        project: mockProject,
        calendarEvents: []
      }
      
      store.dispatch(createProject.fulfilled(mockResponse, '', {
        title: '테스트 프로젝트',
        description: '테스트 설명'
      }))
      
      const state = store.getState().project
      expect(state.isCreating).toBe(false)
      expect(state.projects).toHaveLength(1)
      expect(state.projects[0]).toEqual(mockProject)
      expect(state.currentProject).toEqual(mockProject)
      expect(state.autoSchedulePreview).toBeNull()
    })

    it('프로젝트 생성 시 자동으로 일정이 생성되어야 한다 (DEVPLAN.md 요구사항)', async () => {
      const store = createTestStore()
      
      const result = await store.dispatch(createProject({
        title: '자동 일정 테스트 프로젝트',
        description: '자동 일정이 생성되는 프로젝트',
        startDate: new Date('2024-01-01')
      }))
      
      expect(createProject.fulfilled.match(result)).toBe(true)
      if (createProject.fulfilled.match(result)) {
        // 프로젝트가 생성되고 캘린더 이벤트가 포함되어야 함
        expect(result.payload.project.calendarEvents).toHaveLength(3)
        expect(result.payload.calendarEvents).toHaveLength(3)
        
        const calendarEvents = result.payload.calendarEvents
        expect(calendarEvents[0].type).toBe('planning')
        expect(calendarEvents[1].type).toBe('filming')
        expect(calendarEvents[2].type).toBe('editing')
        
        // 기본 일정 기간 확인 (기획 1주, 촬영 1일, 편집 2주)
        expect(calendarEvents[0].title).toBe('기획')
        expect(calendarEvents[1].title).toBe('촬영')
        expect(calendarEvents[2].title).toBe('편집')
      }
      
      const state = store.getState().project
      expect(state.currentProject?.calendarEvents).toHaveLength(3)
    })

    it('사용자 정의 자동 일정 설정으로 프로젝트를 생성해야 한다', async () => {
      const store = createTestStore()
      
      const result = await store.dispatch(createProject({
        title: '커스텀 일정 프로젝트',
        startDate: new Date('2024-01-01'),
        autoScheduleConfig: {
          planningWeeks: 2,
          filmingDays: 3,
          editingWeeks: 4
        }
      }))
      
      expect(createProject.fulfilled.match(result)).toBe(true)
      if (createProject.fulfilled.match(result)) {
        const calendarEvents = result.payload.calendarEvents
        expect(calendarEvents).toHaveLength(3)
        
        // 시작일 확인
        const planningStart = new Date(calendarEvents[0].startDate)
        expect(planningStart.toISOString()).toBe('2024-01-01T00:00:00.000Z')
      }
    })

    it('rejected 상태에서 에러를 설정해야 한다', () => {
      const store = createTestStore()
      const errorMessage = '프로젝트 생성 실패'
      
      store.dispatch(createProject.rejected(
        null,
        '',
        { title: '테스트 프로젝트' },
        errorMessage
      ))
      
      const state = store.getState().project
      expect(state.isCreating).toBe(false)
      expect(state.createError).toBe(errorMessage)
    })
  })

  describe('비동기 액션 - inviteTeamMember', () => {
    it('pending 상태에서 isInviting을 true로 설정해야 한다', () => {
      const store = createTestStore()
      
      store.dispatch(inviteTeamMember.pending('', {
        projectId: 'project_123',
        invitation: {
          email: 'test@example.com',
          role: 'editor'
        }
      }))
      
      const state = store.getState().project
      expect(state.isInviting).toBe(true)
      expect(state.inviteError).toBeNull()
    })

    it('fulfilled 상태에서 쿨다운을 설정해야 한다', () => {
      const store = createTestStore()
      const mockResponse = {
        success: true,
        invitationId: 'invite_123',
        email: 'test@example.com',
        timestamp: Date.now()
      }
      
      store.dispatch(inviteTeamMember.fulfilled(mockResponse, '', {
        projectId: 'project_123',
        invitation: {
          email: 'test@example.com',
          role: 'editor'
        }
      }))
      
      const state = store.getState().project
      expect(state.isInviting).toBe(false)
      expect(state.invitationCooldowns['test@example.com']).toBe(mockResponse.timestamp)
    })

    it('rejected 상태에서 에러를 설정해야 한다', () => {
      const store = createTestStore()
      const errorMessage = '초대 전송 실패'
      
      store.dispatch(inviteTeamMember.rejected(
        null,
        '',
        {
          projectId: 'project_123',
          invitation: { email: 'test@example.com', role: 'editor' }
        },
        errorMessage
      ))
      
      const state = store.getState().project
      expect(state.isInviting).toBe(false)
      expect(state.inviteError).toBe(errorMessage)
    })
  })

  describe('셀렉터', () => {
    it('selectProjects는 프로젝트 배열을 반환해야 한다', () => {
      const mockProjects = [
        {
          id: 'project_1',
          title: '프로젝트 1',
          description: '',
          status: 'active' as const,
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
      ]
      const store = createTestStore({ project: { projects: mockProjects } })
      
      const projects = selectProjects(store.getState())
      expect(projects).toEqual(mockProjects)
    })

    it('selectIsCreating은 생성 상태를 반환해야 한다', () => {
      const store = createTestStore({ project: { isCreating: true } })
      
      const isCreating = selectIsCreating(store.getState())
      expect(isCreating).toBe(true)
    })

    it('selectCreateError는 생성 에러를 반환해야 한다', () => {
      const errorMessage = '생성 실패'
      const store = createTestStore({ project: { createError: errorMessage } })
      
      const createError = selectCreateError(store.getState())
      expect(createError).toBe(errorMessage)
    })

    it('selectInviteError는 초대 에러를 반환해야 한다', () => {
      const errorMessage = '초대 실패'
      const store = createTestStore({ project: { inviteError: errorMessage } })
      
      const inviteError = selectInviteError(store.getState())
      expect(inviteError).toBe(errorMessage)
    })
  })

  describe('자동 일정 시스템 - DEVPLAN.md 요구사항', () => {
    describe('generateAutoSchedule 액션', () => {
      it('프로젝트 생성 시 기본 자동 일정(기획 1주, 촬영 1일, 편집 2주)을 생성해야 한다', async () => {
        const store = createTestStore()
        const startDate = new Date('2024-01-01')
        
        const result = await store.dispatch(generateAutoSchedule({ 
          projectId: 'project_123', 
          startDate,
          config: {
            planningWeeks: 1,
            filmingDays: 1,
            editingWeeks: 2
          }
        }))
        
        expect(generateAutoSchedule.fulfilled.match(result)).toBe(true)
        if (generateAutoSchedule.fulfilled.match(result)) {
          expect(result.payload.schedule.planning.duration).toBe(1)
          expect(result.payload.schedule.filming.duration).toBe(1)
          expect(result.payload.schedule.editing.duration).toBe(2)
        }
      })

      it('자동 일정 생성 시 프로젝트에 캘린더 이벤트가 생성되어야 한다', async () => {
        const store = createTestStore({
          project: {
            currentProject: {
              id: 'project_123',
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
        
        const result = await store.dispatch(generateAutoSchedule({
          projectId: 'project_123',
          startDate: new Date('2024-01-01')
        }))
        
        expect(generateAutoSchedule.fulfilled.match(result)).toBe(true)
        if (generateAutoSchedule.fulfilled.match(result)) {
          expect(result.payload.calendarEvents).toHaveLength(3)
          expect(result.payload.calendarEvents[0].type).toBe('planning')
          expect(result.payload.calendarEvents[1].type).toBe('filming') 
          expect(result.payload.calendarEvents[2].type).toBe('editing')
        }
        
        const state = store.getState().project
        expect(state.currentProject?.calendarEvents).toHaveLength(3)
      })

      it('자동 일정 설정 변경 시 기존 일정을 업데이트해야 한다', async () => {
        const store = createTestStore({
          project: {
            currentProject: {
              id: 'project_123',
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
        
        const result = await store.dispatch(updateAutoSchedule({
          projectId: 'project_123',
          config: { planningWeeks: 2, filmingDays: 1, editingWeeks: 3 }
        }))
        
        expect(updateAutoSchedule.fulfilled.match(result)).toBe(true)
        if (updateAutoSchedule.fulfilled.match(result)) {
          expect(result.payload.schedule.planning.duration).toBe(2)
          expect(result.payload.schedule.editing.duration).toBe(3)
          expect(result.payload.updated).toBe(true)
        }
      })
    })

    describe('자동 일정 상태 관리', () => {
      it('autoScheduleConfig 상태가 존재해야 한다', () => {
        const store = createTestStore()
        const state = store.getState().project
        
        expect(state.autoScheduleConfig).toBeDefined()
        expect(state.autoScheduleConfig.planningWeeks).toBe(1)
        expect(state.autoScheduleConfig.filmingDays).toBe(1)
        expect(state.autoScheduleConfig.editingWeeks).toBe(2)
      })

      it('isGeneratingSchedule 로딩 상태가 존재해야 한다', () => {
        const store = createTestStore()
        const state = store.getState().project
        
        expect(state.isGeneratingSchedule).toBe(false)
      })

      it('scheduleError 에러 상태가 존재해야 한다', () => {
        const store = createTestStore()
        const state = store.getState().project
        
        expect(state.scheduleError).toBeNull()
      })
    })

    describe('새로운 동기 액션', () => {
      it('setAutoScheduleConfig는 자동 일정 설정을 업데이트해야 한다', () => {
        const store = createTestStore()
        const newConfig = { planningWeeks: 3, filmingDays: 2, editingWeeks: 4 }
        
        store.dispatch(setAutoScheduleConfig(newConfig))
        
        const state = store.getState().project
        expect(state.autoScheduleConfig).toEqual(newConfig)
      })

      it('clearScheduleError는 일정 에러를 지워야 한다', () => {
        const store = createTestStore({
          project: { scheduleError: '일정 생성 실패' }
        })
        
        store.dispatch(clearScheduleError())
        
        const state = store.getState().project  
        expect(state.scheduleError).toBeNull()
      })
    })

    describe('새로운 셀렉터', () => {
      it('selectAutoScheduleConfig는 자동 일정 설정을 반환해야 한다', () => {
        const config = { planningWeeks: 2, filmingDays: 3, editingWeeks: 4 }
        const store = createTestStore({ project: { autoScheduleConfig: config } })
        
        const selectedConfig = selectAutoScheduleConfig(store.getState())
        expect(selectedConfig).toEqual(config)
      })

      it('selectIsGeneratingSchedule는 생성 상태를 반환해야 한다', () => {
        const store = createTestStore({ project: { isGeneratingSchedule: true } })
        
        const isGenerating = selectIsGeneratingSchedule(store.getState())
        expect(isGenerating).toBe(true)
      })

      it('selectScheduleError는 일정 에러를 반환해야 한다', () => {
        const errorMessage = '일정 생성 실패'
        const store = createTestStore({ project: { scheduleError: errorMessage } })
        
        const scheduleError = selectScheduleError(store.getState())
        expect(scheduleError).toBe(errorMessage)
      })
    })
  })

  describe('입력 검증 (Zod)', () => {
    it('유효하지 않은 프로젝트 데이터로 생성을 시도하면 에러를 반환해야 한다', async () => {
      const store = createTestStore()
      
      // 빈 제목으로 프로젝트 생성 시도
      const result = await store.dispatch(createProject({ title: '' }))
      
      expect(createProject.rejected.match(result)).toBe(true)
      if (createProject.rejected.match(result)) {
        expect(result.payload).toContain('프로젝트 제목을 입력해주세요')
      }
    })

    it('유효하지 않은 이메일로 초대를 시도하면 에러를 반환해야 한다', async () => {
      const store = createTestStore()
      
      const result = await store.dispatch(inviteTeamMember({
        projectId: 'project_123',
        invitation: {
          email: 'invalid-email',
          role: 'editor'
        }
      }))
      
      expect(inviteTeamMember.rejected.match(result)).toBe(true)
      if (inviteTeamMember.rejected.match(result)) {
        expect(result.payload).toContain('유효한 이메일을 입력해주세요')
      }
    })
  })
})