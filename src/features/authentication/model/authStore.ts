import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

// 사용자 인터페이스
export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  role?: 'owner' | 'admin' | 'editor' | 'reviewer' | 'viewer'
}

// 인증 상태 인터페이스
export interface AuthState {
  isAuthenticated: boolean
  user: User | null
  token: string | null
  refreshToken: string | null
  emailVerified: boolean
  pendingVerificationEmail: string | null
  isLoading: boolean
  error: string | null
}

// 초기 상태
const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  refreshToken: null,
  emailVerified: false,
  pendingVerificationEmail: null,
  isLoading: false,
  error: null
}

// 로컬스토리지 헬퍼 함수들
const setTokensToStorage = (token: string, refreshToken: string, user: User) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token)
    localStorage.setItem('refresh_token', refreshToken)
    localStorage.setItem('user_data', JSON.stringify(user))
  }
}

const clearTokensFromStorage = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('user_data')
  }
}

// 인증 슬라이스
export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 회원가입 시작
    signupStart: (state) => {
      state.isLoading = true
      state.error = null
    },

    // 회원가입 성공 (이메일 인증 대기)
    signupSuccess: (state, action: PayloadAction<{
      email: string
      message: string
    }>) => {
      state.isLoading = false
      state.pendingVerificationEmail = action.payload.email
      state.emailVerified = false
      state.error = null
    },

    // 회원가입 실패
    signupFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },

    // 이메일 인증 시작
    verifyEmailStart: (state) => {
      state.isLoading = true
      state.error = null
    },

    // 이메일 인증 성공 (자동 로그인)
    verifyEmailSuccess: (state, action: PayloadAction<{
      user: User
      token: string
      refreshToken: string
    }>) => {
      const { user, token, refreshToken } = action.payload
      
      state.isLoading = false
      state.isAuthenticated = true
      state.user = user
      state.token = token
      state.refreshToken = refreshToken
      state.emailVerified = true
      state.pendingVerificationEmail = null
      state.error = null

      // 토큰을 로컬스토리지에 저장
      setTokensToStorage(token, refreshToken, user)
    },

    // 이메일 인증 실패
    verifyEmailFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
      state.emailVerified = false
    },

    // 로그인 시작
    loginStart: (state) => {
      state.isLoading = true
      state.error = null
    },

    // 로그인 성공
    loginSuccess: (state, action: PayloadAction<{
      user: User
      token: string
      refreshToken: string
    }>) => {
      const { user, token, refreshToken } = action.payload
      
      state.isLoading = false
      state.isAuthenticated = true
      state.user = user
      state.token = token
      state.refreshToken = refreshToken
      state.emailVerified = true // 로그인 성공 시 이메일은 이미 인증됨
      state.error = null

      // 토큰을 로컬스토리지에 저장
      setTokensToStorage(token, refreshToken, user)
    },

    // 로그인 실패
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
      
      // 이메일 미인증 에러의 경우 emailVerified를 false로 설정
      if (action.payload.includes('이메일 인증')) {
        state.emailVerified = false
      }
    },

    // 로그아웃
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.refreshToken = null
      state.emailVerified = false
      state.pendingVerificationEmail = null
      state.isLoading = false
      state.error = null

      // 로컬스토리지에서 토큰 제거
      clearTokensFromStorage()
    },

    // 토큰 리프레시 성공
    refreshTokenSuccess: (state, action: PayloadAction<{
      token: string
      refreshToken: string
    }>) => {
      const { token, refreshToken } = action.payload
      
      state.token = token
      state.refreshToken = refreshToken

      // 새 토큰으로 로컬스토리지 업데이트
      if (state.user) {
        setTokensToStorage(token, refreshToken, state.user)
      }
    },

    // 에러 클리어
    clearAuthError: (state) => {
      state.error = null
    },

    // 로컬스토리지에서 인증 상태 복원
    restoreAuthState: (state, action: PayloadAction<{
      user: User
      token: string
      refreshToken: string
    }>) => {
      const { user, token, refreshToken } = action.payload
      
      state.isAuthenticated = true
      state.user = user
      state.token = token
      state.refreshToken = refreshToken
      state.emailVerified = true
    },

    // 인증 세션 만료
    sessionExpired: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.refreshToken = null
      state.error = '세션이 만료되었습니다. 다시 로그인해주세요.'
      
      clearTokensFromStorage()
    }
  }
})

// 액션 내보내기
export const {
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
  refreshTokenSuccess,
  clearAuthError,
  restoreAuthState,
  sessionExpired
} = authSlice.actions

// 리듀서 기본 내보내기
export default authSlice.reducer