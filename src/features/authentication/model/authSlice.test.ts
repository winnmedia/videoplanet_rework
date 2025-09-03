import { configureStore } from '@reduxjs/toolkit'
import authSlice, {
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  registerStart,
  registerSuccess,
  registerFailure,
  clearError,
  refreshTokenStart,
  refreshTokenSuccess,
  refreshTokenFailure
} from './authSlice'
import { AuthState, AuthenticatedUser, AuthTokens } from './types'

describe('Auth Slice', () => {
  const mockUser: AuthenticatedUser = {
    id: 'user_123',
    email: 'test@example.com',
    username: 'testuser',
    displayName: '테스트 사용자',
    role: 'user',
    permissions: ['read', 'write']
  }

  const mockTokens: AuthTokens = {
    accessToken: 'access_token_123',
    refreshToken: 'refresh_token_123',
    expiresIn: 3600
  }

  const initialState: AuthState = {
    isAuthenticated: false,
    user: null,
    loading: false,
    error: null,
    token: null,
    refreshToken: null
  }

  type RootState = {
    auth: AuthState
  }
  
  let store: ReturnType<typeof configureStore<RootState>>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice
      }
    })
  })

  describe('Login Actions', () => {
    it('로그인 시작 시 로딩 상태를 설정해야 함', () => {
      store.dispatch(loginStart())
      
      const state = store.getState().auth
      expect(state.loading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('로그인 성공 시 사용자 정보와 토큰을 설정해야 함', () => {
      store.dispatch(loginSuccess({ user: mockUser, tokens: mockTokens }))
      
      const state = store.getState().auth
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(mockUser)
      expect(state.token).toBe(mockTokens.accessToken)
      expect(state.refreshToken).toBe(mockTokens.refreshToken)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('로그인 실패 시 에러를 설정해야 함', () => {
      const errorMessage = '로그인에 실패했습니다'
      
      store.dispatch(loginFailure(errorMessage))
      
      const state = store.getState().auth
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.loading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('Register Actions', () => {
    it('회원가입 시작 시 로딩 상태를 설정해야 함', () => {
      store.dispatch(registerStart())
      
      const state = store.getState().auth
      expect(state.loading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('회원가입 성공 시 사용자 정보를 설정해야 함', () => {
      store.dispatch(registerSuccess(mockUser))
      
      const state = store.getState().auth
      expect(state.user).toEqual(mockUser)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
      // 회원가입 성공 시에는 아직 인증되지 않은 상태
      expect(state.isAuthenticated).toBe(false)
    })

    it('회원가입 실패 시 에러를 설정해야 함', () => {
      const errorMessage = '회원가입에 실패했습니다'
      
      store.dispatch(registerFailure(errorMessage))
      
      const state = store.getState().auth
      expect(state.loading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('Logout Action', () => {
    it('로그아웃 시 모든 인증 정보를 초기화해야 함', () => {
      // 먼저 로그인 상태로 만들기
      store.dispatch(loginSuccess({ user: mockUser, tokens: mockTokens }))
      
      // 로그아웃 실행
      store.dispatch(logout())
      
      const state = store.getState().auth
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('Token Refresh Actions', () => {
    it('토큰 갱신 시작 시 로딩 상태를 설정해야 함', () => {
      store.dispatch(refreshTokenStart())
      
      const state = store.getState().auth
      expect(state.loading).toBe(true)
    })

    it('토큰 갱신 성공 시 새 토큰을 설정해야 함', () => {
      const newTokens: AuthTokens = {
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
        expiresIn: 3600
      }
      
      store.dispatch(refreshTokenSuccess(newTokens))
      
      const state = store.getState().auth
      expect(state.token).toBe(newTokens.accessToken)
      expect(state.refreshToken).toBe(newTokens.refreshToken)
      expect(state.loading).toBe(false)
    })

    it('토큰 갱신 실패 시 로그아웃 상태로 변경해야 함', () => {
      // 먼저 로그인 상태로 만들기
      store.dispatch(loginSuccess({ user: mockUser, tokens: mockTokens }))
      
      const errorMessage = '토큰 갱신에 실패했습니다'
      store.dispatch(refreshTokenFailure(errorMessage))
      
      const state = store.getState().auth
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(state.error).toBe(errorMessage)
      expect(state.loading).toBe(false)
    })
  })

  describe('Utility Actions', () => {
    it('에러 초기화 시 에러 상태를 null로 설정해야 함', () => {
      // 먼저 에러 상태로 만들기
      store.dispatch(loginFailure('테스트 에러'))
      
      // 에러 초기화
      store.dispatch(clearError())
      
      const state = store.getState().auth
      expect(state.error).toBeNull()
    })
  })

  describe('State Persistence', () => {
    it('초기 상태가 올바르게 설정되어야 함', () => {
      const state = store.getState().auth
      expect(state).toEqual(initialState)
    })
  })
})