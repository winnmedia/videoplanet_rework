import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { authSlice, AuthState } from './authStore'
import { 
  signupStart, 
  signupSuccess, 
  signupFailure,
  verifyEmailStart,
  verifyEmailSuccess, 
  verifyEmailFailure,
  loginStart,
  loginSuccess,
  loginFailure,
  logout,
  clearAuthError
} from './authActions'

describe('Authentication Store', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice.reducer
      }
    })
  })

  describe('초기 상태', () => {
    it('should initialize with unauthenticated state', () => {
      const state = store.getState().auth
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.emailVerified).toBe(false)
    })
  })

  describe('회원가입 플로우', () => {
    it('should handle signup start', () => {
      store.dispatch(signupStart())
      
      const state = store.getState().auth
      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('should handle successful signup with email verification pending', () => {
      const signupData = {
        email: 'test@example.com',
        message: '인증 이메일을 전송했습니다.'
      }
      
      store.dispatch(signupSuccess(signupData))
      
      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      expect(state.pendingVerificationEmail).toBe('test@example.com')
      expect(state.emailVerified).toBe(false)
      expect(state.isAuthenticated).toBe(false)
    })

    it('should handle signup failure', () => {
      const errorMessage = '이미 등록된 이메일입니다.'
      
      store.dispatch(signupFailure(errorMessage))
      
      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('이메일 인증 플로우', () => {
    beforeEach(() => {
      // 회원가입 성공 상태로 설정
      store.dispatch(signupSuccess({
        email: 'test@example.com',
        message: '인증 이메일을 전송했습니다.'
      }))
    })

    it('should handle email verification start', () => {
      store.dispatch(verifyEmailStart())
      
      const state = store.getState().auth
      expect(state.isLoading).toBe(true)
    })

    it('should handle successful email verification and auto-login', () => {
      const verificationData = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        },
        token: 'jwt-token-123',
        refreshToken: 'refresh-token-123'
      }
      
      store.dispatch(verifyEmailSuccess(verificationData))
      
      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      expect(state.emailVerified).toBe(true)
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(verificationData.user)
      expect(state.token).toBe(verificationData.token)
      expect(state.refreshToken).toBe(verificationData.refreshToken)
      expect(state.pendingVerificationEmail).toBeNull()
    })

    it('should handle email verification failure', () => {
      const errorMessage = '인증 링크가 만료되었습니다.'
      
      store.dispatch(verifyEmailFailure(errorMessage))
      
      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(errorMessage)
      expect(state.emailVerified).toBe(false)
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe('로그인 플로우', () => {
    it('should handle login start', () => {
      store.dispatch(loginStart())
      
      const state = store.getState().auth
      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('should handle successful login', () => {
      const loginData = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        },
        token: 'jwt-token-123',
        refreshToken: 'refresh-token-123'
      }
      
      store.dispatch(loginSuccess(loginData))
      
      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      expect(state.isAuthenticated).toBe(true)
      expect(state.user).toEqual(loginData.user)
      expect(state.token).toBe(loginData.token)
      expect(state.refreshToken).toBe(loginData.refreshToken)
      expect(state.emailVerified).toBe(true)
    })

    it('should handle login failure', () => {
      const errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.'
      
      store.dispatch(loginFailure(errorMessage))
      
      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(errorMessage)
      expect(state.isAuthenticated).toBe(false)
    })

    it('should handle login failure for unverified email', () => {
      const errorMessage = '이메일 인증을 완료해주세요.'
      
      store.dispatch(loginFailure(errorMessage))
      
      const state = store.getState().auth
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(errorMessage)
      expect(state.emailVerified).toBe(false)
    })
  })

  describe('로그아웃 플로우', () => {
    beforeEach(() => {
      // 로그인된 상태로 설정
      store.dispatch(loginSuccess({
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        },
        token: 'jwt-token-123',
        refreshToken: 'refresh-token-123'
      }))
    })

    it('should handle logout and clear all auth data', () => {
      store.dispatch(logout())
      
      const state = store.getState().auth
      expect(state.isAuthenticated).toBe(false)
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.refreshToken).toBeNull()
      expect(state.emailVerified).toBe(false)
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
    })
  })

  describe('토큰 관리', () => {
    it('should persist tokens in localStorage on login success', () => {
      const loginData = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User'
        },
        token: 'jwt-token-123',
        refreshToken: 'refresh-token-123'
      }

      // Mock localStorage
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      }
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      })
      
      store.dispatch(loginSuccess(loginData))
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'auth_token', 
        loginData.token
      )
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'refresh_token', 
        loginData.refreshToken
      )
    })

    it('should clear tokens from localStorage on logout', () => {
      const localStorageMock = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn(),
      }
      Object.defineProperty(window, 'localStorage', {
        value: localStorageMock
      })
      
      store.dispatch(logout())
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('refresh_token')
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('user_data')
    })
  })

  describe('에러 처리', () => {
    it('should clear auth error', () => {
      // 에러 상태 설정
      store.dispatch(loginFailure('Test error'))
      
      expect(store.getState().auth.error).toBe('Test error')
      
      // 에러 클리어
      store.dispatch(clearAuthError())
      
      expect(store.getState().auth.error).toBeNull()
    })

    it('should maintain user data integrity on partial failures', () => {
      // 로그인 성공 상태
      store.dispatch(loginSuccess({
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        token: 'jwt-token-123',
        refreshToken: 'refresh-token-123'
      }))
      
      const originalUser = store.getState().auth.user
      
      // API 호출 실패 상황 시뮬레이션 (토큰은 유지되어야 함)
      store.dispatch(clearAuthError())
      
      const state = store.getState().auth
      expect(state.user).toEqual(originalUser)
      expect(state.isAuthenticated).toBe(true)
    })
  })
})