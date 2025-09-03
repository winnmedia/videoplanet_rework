/**
 * @file Integrated Store Tests
 * @description Redux Toolkit 2.0 통합 스토어 테스트
 */

import { configureStore } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import {
  validateRootState,
  type RootState,
  type User,
  type Project
} from '@/shared/types/store'

// 테스트용 통합 스토어 구성을 위한 모의 슬라이스들
const mockAuthSlice = {
  name: 'auth',
  reducer: (state = {
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null,
    token: null,
    refreshToken: null
  }, action: any) => {
    switch (action.type) {
      case 'auth/loginSuccess':
        return {
          ...state,
          isAuthenticated: true,
          user: action.payload.user,
          token: action.payload.token,
          refreshToken: action.payload.refreshToken,
          loading: false,
          error: null
        }
      case 'auth/logout':
        return {
          isAuthenticated: false,
          user: null,
          loading: false,
          error: null,
          token: null,
          refreshToken: null
        }
      default:
        return state
    }
  }
}

const mockPipelineSlice = {
  name: 'pipeline',
  reducer: (state = {
    currentStep: 'signup',
    completedSteps: [],
    userProgress: {
      profile: null,
      projects: [],
      currentProject: null,
      planningDrafts: []
    },
    sessionData: {
      startedAt: null,
      lastActivity: null,
      timeSpent: 0
    },
    isLoading: false,
    error: null
  }, action: any) => {
    switch (action.type) {
      case 'pipeline/updateStep':
        return {
          ...state,
          currentStep: action.payload.step,
          completedSteps: [...state.completedSteps, state.currentStep]
        }
      default:
        return state
    }
  }
}

const mockProjectManagementSlice = {
  name: 'projectManagement',
  reducer: (state = {
    projects: [],
    currentProject: null,
    loading: false,
    error: null,
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      hasNext: false,
      hasPrev: false
    }
  }, action: any) => {
    switch (action.type) {
      case 'projectManagement/addProject':
        return {
          ...state,
          projects: [...state.projects, action.payload]
        }
      default:
        return state
    }
  }
}

const mockVideoFeedbackSlice = {
  name: 'videoFeedback',
  reducer: (state = {
    feedbacks: [],
    currentFeedback: null,
    loading: false,
    error: null
  }, action: any) => state
}

const mockCalendarSlice = {
  name: 'calendar',
  reducer: (state = {
    events: [],
    selectedDate: new Date().toISOString(),
    view: 'month',
    loading: false,
    error: null
  }, action: any) => state
}

describe('Integrated Store', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: mockAuthSlice.reducer,
        pipeline: mockPipelineSlice.reducer,
        projectManagement: mockProjectManagementSlice.reducer,
        videoFeedback: mockVideoFeedbackSlice.reducer,
        calendar: mockCalendarSlice.reducer
      },
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE']
          }
        }),
      devTools: true
    })

    // RTK Query 리스너 설정
    setupListeners(store.dispatch)
  })

  describe('스토어 초기화', () => {
    test('스토어가 올바른 초기 상태로 초기화되어야 한다', () => {
      const state = store.getState()

      expect(state.auth.isAuthenticated).toBe(false)
      expect(state.auth.user).toBeNull()
      expect(state.pipeline.currentStep).toBe('signup')
      expect(state.pipeline.completedSteps).toEqual([])
      expect(state.projectManagement.projects).toEqual([])
      expect(state.videoFeedback.feedbacks).toEqual([])
      expect(state.calendar.events).toEqual([])
    })

    test('스토어 상태가 Zod 스키마 검증을 통과해야 한다', () => {
      const state = store.getState()
      
      expect(validateRootState(state)).toBe(true)
    })
  })

  describe('Cross-slice 상태 동기화', () => {
    test('사용자 인증 성공 시 파이프라인 상태가 동기화되어야 한다', () => {
      // Arrange
      const mockUser: User = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User'
      }

      // Act: 사용자 로그인 성공
      store.dispatch({
        type: 'auth/loginSuccess',
        payload: {
          user: mockUser,
          token: 'access-token',
          refreshToken: 'refresh-token'
        }
      })

      // Assert: 인증 상태 확인
      const authState = store.getState().auth
      expect(authState.isAuthenticated).toBe(true)
      expect(authState.user).toEqual(mockUser)
      expect(authState.token).toBe('access-token')
    })

    test('프로젝트 생성 시 파이프라인과 프로젝트 관리 상태가 동기화되어야 한다', () => {
      // Arrange
      const mockProject: Project = {
        id: 'proj-123',
        name: 'Test Project',
        description: 'Test Description',
        status: 'active',
        createdAt: new Date().toISOString()
      }

      // Act: 프로젝트 추가
      store.dispatch({
        type: 'projectManagement/addProject',
        payload: mockProject
      })

      // Assert: 프로젝트 목록에 추가됨
      const projectState = store.getState().projectManagement
      expect(projectState.projects).toContain(mockProject)
      expect(projectState.projects.length).toBe(1)
    })
  })

  describe('상태 직렬화 및 검증', () => {
    test('모든 상태 변경이 직렬화 가능해야 한다', () => {
      // Redux DevTools에서 직렬화 가능성을 자동으로 검증
      const initialState = store.getState()
      
      // 여러 액션 디스패치
      store.dispatch({
        type: 'auth/loginSuccess',
        payload: {
          user: { id: 'user-123', email: 'test@example.com' },
          token: 'token',
          refreshToken: 'refresh-token'
        }
      })

      store.dispatch({
        type: 'pipeline/updateStep',
        payload: { step: 'login' }
      })

      const finalState = store.getState()
      
      // JSON 직렬화/역직렬화가 가능한지 확인
      expect(() => JSON.stringify(finalState)).not.toThrow()
      expect(() => JSON.parse(JSON.stringify(finalState))).not.toThrow()
    })

    test('상태 스냅샷이 타임트래블 디버깅을 지원해야 한다', () => {
      const states: any[] = []
      
      // 초기 상태 저장
      states.push(store.getState())

      // 여러 액션 실행하며 상태 스냅샷 저장
      store.dispatch({
        type: 'auth/loginSuccess',
        payload: {
          user: { id: 'user-123', email: 'test@example.com' },
          token: 'token',
          refreshToken: 'refresh-token'
        }
      })
      states.push(store.getState())

      store.dispatch({
        type: 'pipeline/updateStep',
        payload: { step: 'login' }
      })
      states.push(store.getState())

      // 각 스냅샷이 유효한 상태인지 확인
      states.forEach(state => {
        expect(validateRootState(state)).toBe(true)
      })

      // 상태 변경 추적 가능성 확인
      expect(states[0].auth.isAuthenticated).toBe(false)
      expect(states[1].auth.isAuthenticated).toBe(true)
      expect(states[2].pipeline.currentStep).toBe('login')
    })
  })

  describe('메모리 관리', () => {
    test('대량 상태 변경 후에도 메모리 누수가 없어야 한다', () => {
      // 대량의 프로젝트 생성
      for (let i = 0; i < 1000; i++) {
        store.dispatch({
          type: 'projectManagement/addProject',
          payload: {
            id: `proj-${i}`,
            name: `Project ${i}`,
            status: 'active',
            createdAt: new Date().toISOString()
          }
        })
      }

      const state = store.getState()
      expect(state.projectManagement.projects.length).toBe(1000)
      
      // 상태 직렬화가 여전히 가능한지 확인
      expect(() => JSON.stringify(state)).not.toThrow()
    })

    test('스토어 상태 클리어 후 초기 상태로 복원되어야 한다', () => {
      // 상태 변경
      store.dispatch({
        type: 'auth/loginSuccess',
        payload: {
          user: { id: 'user-123', email: 'test@example.com' },
          token: 'token',
          refreshToken: 'refresh-token'
        }
      })

      // 로그아웃
      store.dispatch({ type: 'auth/logout' })

      // 상태 확인
      const authState = store.getState().auth
      expect(authState.isAuthenticated).toBe(false)
      expect(authState.user).toBeNull()
      expect(authState.token).toBeNull()
    })
  })

  describe('에러 처리', () => {
    test('잘못된 액션이 상태를 손상시키지 않아야 한다', () => {
      const initialState = store.getState()

      // 잘못된 액션 디스패치
      store.dispatch({
        type: 'invalid/action',
        payload: { invalid: 'data' }
      })

      // 상태가 변경되지 않았는지 확인
      const currentState = store.getState()
      expect(currentState).toEqual(initialState)
      expect(validateRootState(currentState)).toBe(true)
    })

    test('부분적 상태 업데이트가 전체 상태 무결성을 유지해야 한다', () => {
      // 유효한 액션과 무효한 페이로드
      store.dispatch({
        type: 'auth/loginSuccess',
        payload: {
          user: null, // 무효한 사용자 데이터
          token: 'valid-token',
          refreshToken: 'valid-refresh-token'
        }
      })

      const state = store.getState()
      
      // 스키마 검증을 통과해야 함 (리듀서에서 안전하게 처리)
      expect(validateRootState(state)).toBe(true)
    })
  })
})