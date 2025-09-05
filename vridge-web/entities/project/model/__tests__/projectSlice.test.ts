/**
 * Project Slice Tests
 * DEVPLAN.md 요구사항: Redux Toolkit 2.0, TDD 원칙 준수, MSW 사용
 */

import { configureStore } from '@reduxjs/toolkit'

import projectReducer, {
  createProject,
  inviteTeamMember,
  fetchProjects,
  setAutoSchedulePreview,
  clearCreateError,
  clearInviteError,
  selectProjects,
  selectIsCreating,
  selectCreateError,
  selectInviteError,
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
        error: null,
        createError: null,
        inviteError: null,
        autoSchedulePreview: null,
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
      expect(state.error).toBeNull()
      expect(state.createError).toBeNull()
      expect(state.inviteError).toBeNull()
      expect(state.autoSchedulePreview).toBeNull()
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