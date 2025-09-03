import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { AuthState, AuthenticatedUser, AuthTokens } from './types'

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  token: null,
  refreshToken: null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // Login Actions
    loginStart: (state) => {
      state.loading = true
      state.error = null
    },
    loginSuccess: (state, action: PayloadAction<{ user: AuthenticatedUser; tokens: AuthTokens }>) => {
      state.isAuthenticated = true
      state.user = action.payload.user
      state.token = action.payload.tokens.accessToken
      state.refreshToken = action.payload.tokens.refreshToken
      state.loading = false
      state.error = null
    },
    loginFailure: (state, action: PayloadAction<string>) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.refreshToken = null
      state.loading = false
      state.error = action.payload
    },

    // Register Actions
    registerStart: (state) => {
      state.loading = true
      state.error = null
    },
    registerSuccess: (state, action: PayloadAction<AuthenticatedUser>) => {
      state.user = action.payload
      state.loading = false
      state.error = null
      // 회원가입 성공 시에는 아직 인증되지 않은 상태
      state.isAuthenticated = false
    },
    registerFailure: (state, action: PayloadAction<string>) => {
      state.loading = false
      state.error = action.payload
    },

    // Logout Action
    logout: (state) => {
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.refreshToken = null
      state.loading = false
      state.error = null
    },

    // Token Refresh Actions
    refreshTokenStart: (state) => {
      state.loading = true
    },
    refreshTokenSuccess: (state, action: PayloadAction<AuthTokens>) => {
      state.token = action.payload.accessToken
      state.refreshToken = action.payload.refreshToken
      state.loading = false
    },
    refreshTokenFailure: (state, action: PayloadAction<string>) => {
      // 토큰 갱신 실패 시 로그아웃 상태로 변경
      state.isAuthenticated = false
      state.user = null
      state.token = null
      state.refreshToken = null
      state.loading = false
      state.error = action.payload
    },

    // Utility Actions
    clearError: (state) => {
      state.error = null
    },

    // User Update Action
    updateUser: (state, action: PayloadAction<Partial<AuthenticatedUser>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload }
      }
    }
  }
})

export const {
  loginStart,
  loginSuccess,
  loginFailure,
  registerStart,
  registerSuccess,
  registerFailure,
  logout,
  refreshTokenStart,
  refreshTokenSuccess,
  refreshTokenFailure,
  clearError,
  updateUser
} = authSlice.actions

// Selectors
export const selectAuth = (state: { auth: AuthState }) => state.auth
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated
export const selectCurrentUser = (state: { auth: AuthState }) => state.auth.user
export const selectAuthLoading = (state: { auth: AuthState }) => state.auth.loading
export const selectAuthError = (state: { auth: AuthState }) => state.auth.error
export const selectAuthToken = (state: { auth: AuthState }) => state.auth.token

export default authSlice.reducer