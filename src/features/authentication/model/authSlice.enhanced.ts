/**
 * @file Enhanced Authentication Slice
 * @description RTK Query와 통합된 고도화된 인증 상태 관리
 */

import { createSlice, createAsyncThunk, createSelector } from '@reduxjs/toolkit'
import { apiSlice } from '@/shared/api/apiSlice'
import type { 
  User, 
  AuthState,
  ApiError,
  OptimisticUpdateMeta 
} from '@/shared/types/store'

// ============================================================================
// 인증 API 정의 (RTK Query 확장)
// ============================================================================

/**
 * 인증 관련 API 엔드포인트
 */
export const authApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // 로그인
    login: builder.mutation<
      { user: User; tokens: { accessToken: string; refreshToken: string } },
      { email: string; password: string }
    >({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials
      }),
      invalidatesTags: ['Auth', 'User']
    }),

    // 회원가입
    register: builder.mutation<
      { user: User },
      { email: string; password: string; name?: string }
    >({
      query: (userData) => ({
        url: '/auth/register',
        method: 'POST',
        body: userData
      }),
      invalidatesTags: ['Auth']
    }),

    // 토큰 갱신
    refreshToken: builder.mutation<
      { accessToken: string; refreshToken: string },
      { refreshToken: string }
    >({
      query: ({ refreshToken }) => ({
        url: '/auth/refresh',
        method: 'POST',
        body: { refreshToken }
      }),
      invalidatesTags: ['Auth']
    }),

    // 로그아웃
    logout: builder.mutation<void, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST'
      }),
      invalidatesTags: ['Auth', 'User']
    }),

    // 사용자 프로필 조회
    getUserProfile: builder.query<User, void>({
      query: () => '/auth/profile',
      providesTags: ['User']
    }),

    // 사용자 프로필 업데이트
    updateUserProfile: builder.mutation<
      User,
      Partial<User> & { id: string }
    >({
      query: ({ id, ...userData }) => ({
        url: `/users/${id}`,
        method: 'PATCH',
        body: userData
      }),
      invalidatesTags: ['User'],
      // 낙관적 업데이트
      async onQueryStarted(newUserData, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          authApi.util.updateQueryData('getUserProfile', undefined, (draft) => {
            Object.assign(draft, newUserData)
          })
        )

        try {
          await queryFulfilled
        } catch {
          patchResult.undo()
        }
      }
    }),

    // 비밀번호 변경
    changePassword: builder.mutation<
      void,
      { currentPassword: string; newPassword: string }
    >({
      query: (passwordData) => ({
        url: '/auth/password',
        method: 'PUT',
        body: passwordData
      })
    }),

    // 비밀번호 재설정 요청
    requestPasswordReset: builder.mutation<void, { email: string }>({
      query: ({ email }) => ({
        url: '/auth/password/reset-request',
        method: 'POST',
        body: { email }
      })
    }),

    // 비밀번호 재설정
    resetPassword: builder.mutation<
      void,
      { token: string; newPassword: string }
    >({
      query: (resetData) => ({
        url: '/auth/password/reset',
        method: 'POST',
        body: resetData
      })
    })
  })
})

// ============================================================================
// 비동기 Thunk 액션
// ============================================================================

/**
 * 로그인 with RTK Query integration
 */
export const loginWithThunk = createAsyncThunk(
  'auth/loginWithThunk',
  async (
    credentials: { email: string; password: string },
    { dispatch, rejectWithValue }
  ) => {
    try {
      const result = await dispatch(authApi.endpoints.login.initiate(credentials))
      
      if ('error' in result) {
        return rejectWithValue(result.error)
      }
      
      return result.data
    } catch (error) {
      return rejectWithValue(error)
    }
  }
)

/**
 * 자동 로그인 (토큰 검증)
 */
export const verifyToken = createAsyncThunk(
  'auth/verifyToken',
  async (_, { dispatch, getState, rejectWithValue }) => {
    try {
      const result = await dispatch(authApi.endpoints.getUserProfile.initiate())
      
      if ('error' in result) {
        return rejectWithValue(result.error)
      }
      
      return result.data
    } catch (error) {
      return rejectWithValue(error)
    }
  }
)

// ============================================================================
// 강화된 Auth 상태 정의
// ============================================================================

export interface EnhancedAuthState extends AuthState {
  // 세션 관리
  sessionTimeout: number | null
  lastActivity: string | null
  
  // 보안 기능
  loginAttempts: number
  lockoutUntil: string | null
  
  // 사용자 환경설정
  rememberMe: boolean
  preferredLanguage: string
  
  // 낙관적 업데이트
  optimisticUpdates: Record<string, OptimisticUpdateMeta>
  
  // 에러 세부사항
  errorDetails: ApiError | null
}

const initialState: EnhancedAuthState = {
  // 기본 Auth 상태
  isAuthenticated: false,
  user: null,
  loading: false,
  error: null,
  token: null,
  refreshToken: null,
  
  // 세션 관리
  sessionTimeout: null,
  lastActivity: null,
  
  // 보안 기능
  loginAttempts: 0,
  lockoutUntil: null,
  
  // 사용자 환경설정
  rememberMe: false,
  preferredLanguage: 'ko',
  
  // 낙관적 업데이트
  optimisticUpdates: {},
  
  // 에러 세부사항
  errorDetails: null
}

// ============================================================================
// 강화된 Auth 슬라이스
// ============================================================================

export const enhancedAuthSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // 세션 활동 업데이트
    updateActivity: (state) => {
      state.lastActivity = new Date().toISOString()
    },

    // 세션 타임아웃 설정
    setSessionTimeout: (state, action) => {
      state.sessionTimeout = action.payload
    },

    // Remember Me 설정
    setRememberMe: (state, action) => {
      state.rememberMe = action.payload
    },

    // 언어 설정
    setLanguage: (state, action) => {
      state.preferredLanguage = action.payload
    },

    // 낙관적 업데이트 시작
    startOptimisticUpdate: (state, action) => {
      const { updateId, type, rollbackData } = action.payload
      state.optimisticUpdates[updateId] = {
        id: updateId,
        type,
        timestamp: new Date().toISOString(),
        rollbackData
      }
    },

    // 낙관적 업데이트 완료
    completeOptimisticUpdate: (state, action) => {
      const { updateId } = action.payload
      delete state.optimisticUpdates[updateId]
    },

    // 낙관적 업데이트 롤백
    rollbackOptimisticUpdate: (state, action) => {
      const { updateId } = action.payload
      const update = state.optimisticUpdates[updateId]
      
      if (update && update.rollbackData) {
        // 롤백 로직 구현
        if (update.type === 'updateUser') {
          state.user = update.rollbackData.user
        }
      }
      
      delete state.optimisticUpdates[updateId]
    },

    // 로그인 시도 증가
    incrementLoginAttempts: (state) => {
      state.loginAttempts += 1
      
      // 5회 시도 후 30분 잠금
      if (state.loginAttempts >= 5) {
        const lockoutTime = new Date()
        lockoutTime.setMinutes(lockoutTime.getMinutes() + 30)
        state.lockoutUntil = lockoutTime.toISOString()
      }
    },

    // 로그인 시도 초기화
    resetLoginAttempts: (state) => {
      state.loginAttempts = 0
      state.lockoutUntil = null
    },

    // 에러 상세 설정
    setErrorDetails: (state, action) => {
      state.errorDetails = action.payload
    },

    // 에러 클리어
    clearError: (state) => {
      state.error = null
      state.errorDetails = null
    },

    // 완전한 상태 초기화
    resetAuth: () => initialState
  },

  // RTK Query 액션 처리
  extraReducers: (builder) => {
    builder
      // 로그인 Thunk
      .addCase(loginWithThunk.pending, (state) => {
        state.loading = true
        state.error = null
        state.errorDetails = null
      })
      .addCase(loginWithThunk.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload.user
        state.token = action.payload.tokens.accessToken
        state.refreshToken = action.payload.tokens.refreshToken
        state.lastActivity = new Date().toISOString()
        state.loginAttempts = 0
        state.lockoutUntil = null
      })
      .addCase(loginWithThunk.rejected, (state, action) => {
        state.loading = false
        state.isAuthenticated = false
        state.error = action.error.message || 'Login failed'
        state.errorDetails = action.payload as ApiError
        state.loginAttempts += 1
      })

      // 토큰 검증
      .addCase(verifyToken.pending, (state) => {
        state.loading = true
      })
      .addCase(verifyToken.fulfilled, (state, action) => {
        state.loading = false
        state.isAuthenticated = true
        state.user = action.payload
        state.lastActivity = new Date().toISOString()
      })
      .addCase(verifyToken.rejected, (state) => {
        state.loading = false
        state.isAuthenticated = false
        state.user = null
        state.token = null
        state.refreshToken = null
      })

      // RTK Query 매처들
      .addMatcher(
        authApi.endpoints.login.matchFulfilled,
        (state, action) => {
          state.isAuthenticated = true
          state.user = action.payload.user
          state.token = action.payload.tokens.accessToken
          state.refreshToken = action.payload.tokens.refreshToken
          state.lastActivity = new Date().toISOString()
          state.loginAttempts = 0
          state.lockoutUntil = null
        }
      )
      .addMatcher(
        authApi.endpoints.logout.matchFulfilled,
        (state) => {
          state.isAuthenticated = false
          state.user = null
          state.token = null
          state.refreshToken = null
          state.lastActivity = null
        }
      )
      .addMatcher(
        authApi.endpoints.updateUserProfile.matchFulfilled,
        (state, action) => {
          state.user = action.payload
        }
      )
  }
})

// ============================================================================
// 액션 내보내기
// ============================================================================

export const {
  updateActivity,
  setSessionTimeout,
  setRememberMe,
  setLanguage,
  startOptimisticUpdate,
  completeOptimisticUpdate,
  rollbackOptimisticUpdate,
  incrementLoginAttempts,
  resetLoginAttempts,
  setErrorDetails,
  clearError,
  resetAuth
} = enhancedAuthSlice.actions

// RTK Query 훅 내보내기
export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useGetUserProfileQuery,
  useUpdateUserProfileMutation,
  useChangePasswordMutation,
  useRequestPasswordResetMutation,
  useResetPasswordMutation
} = authApi

// ============================================================================
// Memoized Selectors
// ============================================================================

// 기본 상태 선택자
const selectAuthState = (state: { auth: EnhancedAuthState }) => state.auth

// 인증 상태
export const selectIsAuthenticated = createSelector(
  [selectAuthState],
  (auth) => auth.isAuthenticated && !auth.loading
)

// 현재 사용자
export const selectCurrentUser = createSelector(
  [selectAuthState],
  (auth) => auth.user
)

// 사용자 권한
export const selectUserRole = createSelector(
  [selectCurrentUser],
  (user) => user?.role || 'guest'
)

// 로딩 상태
export const selectAuthLoading = createSelector(
  [selectAuthState],
  (auth) => auth.loading
)

// 에러 상태
export const selectAuthError = createSelector(
  [selectAuthState],
  (auth) => ({
    hasError: Boolean(auth.error || auth.errorDetails),
    message: auth.error,
    details: auth.errorDetails
  })
)

// 세션 상태
export const selectSessionInfo = createSelector(
  [selectAuthState],
  (auth) => ({
    lastActivity: auth.lastActivity,
    sessionTimeout: auth.sessionTimeout,
    isActive: Boolean(auth.lastActivity && auth.isAuthenticated)
  })
)

// 보안 상태
export const selectSecurityInfo = createSelector(
  [selectAuthState],
  (auth) => ({
    loginAttempts: auth.loginAttempts,
    isLockedOut: Boolean(auth.lockoutUntil && new Date(auth.lockoutUntil) > new Date()),
    lockoutUntil: auth.lockoutUntil
  })
)

// 사용자 환경설정
export const selectUserPreferences = createSelector(
  [selectAuthState],
  (auth) => ({
    rememberMe: auth.rememberMe,
    language: auth.preferredLanguage
  })
)

// 낙관적 업데이트 상태
export const selectOptimisticUpdates = createSelector(
  [selectAuthState],
  (auth) => auth.optimisticUpdates
)

// 권한 확인 셀렉터
export const selectHasPermission = createSelector(
  [selectCurrentUser, (_, permission: string) => permission],
  (user, permission) => {
    if (!user) return false
    
    // 권한 체크 로직 구현
    const permissions = user.permissions || []
    return permissions.includes(permission) || user.role === 'admin'
  }
)

// ============================================================================
// 기본 리듀서 내보내기
// ============================================================================

export default enhancedAuthSlice.reducer