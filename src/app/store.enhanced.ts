/**
 * @file Enhanced Integrated Store
 * @description Redux Toolkit 2.0 기반 통합 스토어 구현
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit'
import { setupListeners } from '@reduxjs/toolkit/query'
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist'
import storage from 'redux-persist/lib/storage'

// Shared types and validation
import { validateRootState, type RootState } from '@/shared/types/store'

// Enhanced slices (새로운 통합 버전)
import { enhancedAuthSlice } from '@/features/authentication/model/authSlice.enhanced'
import { enhancedPipelineSlice } from '@/processes/userPipeline/model/pipelineSlice.enhanced'
import { projectManagementSlice, projectManagementApi } from '@/features/project-management/model/projectManagementSlice.enhanced'
import { videoFeedbackSlice } from '@/features/video-feedback/model/videoFeedbackSlice.enhanced'
import { calendarSlice } from '@/features/calendar/model/calendarSlice.enhanced'

// RTK Query APIs
import { apiSlice } from '@/shared/api/apiSlice'

// ============================================================================
// 영속성 설정
// ============================================================================

/**
 * 영속성 변환 함수 - 직렬화 불가능한 데이터 처리
 */
const serializeTransforms = {
  // Set을 배열로 변환
  set: {
    in: (inboundState: any, key: string) => {
      if (key === 'completedSteps' && inboundState instanceof Set) {
        return Array.from(inboundState)
      }
      return inboundState
    },
    out: (outboundState: any, key: string) => {
      if (key === 'completedSteps' && Array.isArray(outboundState)) {
        return new Set(outboundState)
      }
      return outboundState
    }
  }
}

/**
 * 슬라이스별 영속성 설정
 */
const persistConfigs = {
  auth: {
    key: 'auth',
    storage,
    whitelist: ['isAuthenticated', 'user', 'token', 'refreshToken'],
    blacklist: ['loading', 'error']
  },
  pipeline: {
    key: 'pipeline',
    storage,
    whitelist: ['currentStep', 'completedSteps', 'userProgress', 'sessionData'],
    blacklist: ['loading', 'error'],
    transforms: [serializeTransforms.set]
  },
  projectManagement: {
    key: 'projectManagement',
    storage,
    whitelist: ['projects', 'currentProject'],
    blacklist: ['loading', 'error']
  }
}

// ============================================================================
// 루트 리듀서 구성
// ============================================================================

const rootReducer = combineReducers({
  // 핵심 도메인 슬라이스
  auth: persistReducer(persistConfigs.auth, enhancedAuthSlice.reducer),
  pipeline: persistReducer(persistConfigs.pipeline, enhancedPipelineSlice.reducer),
  
  // 기능별 슬라이스
  projectManagement: persistReducer(persistConfigs.projectManagement, projectManagementSlice.reducer),
  videoFeedback: videoFeedbackSlice.reducer,
  calendar: calendarSlice.reducer,
  
  // API 슬라이스
  [apiSlice.reducerPath]: apiSlice.reducer,
  [projectManagementApi.reducerPath]: projectManagementApi.reducer
})

// ============================================================================
// 스토어 설정
// ============================================================================

/**
 * 개발/프로덕션 환경별 미들웨어 설정
 */
const getMiddleware = (getDefaultMiddleware: any) => {
  const middleware = getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: [
        FLUSH,
        REHYDRATE,
        PAUSE,
        PERSIST,
        PURGE,
        REGISTER,
        // 커스텀 액션들
        'auth/loginWithThunk/pending',
        'auth/loginWithThunk/fulfilled',
        'auth/loginWithThunk/rejected'
      ],
      ignoredPaths: [
        // redux-persist 관련 경로
        'register',
        'rehydrate',
        // Set 타입 경로 (변환 처리됨)
        'pipeline.completedSteps'
      ]
    },
    immutableCheck: {
      ignoredPaths: ['pipeline.completedSteps']
    }
  })

  // RTK Query 미들웨어 추가
  middleware
    .concat(apiSlice.middleware)
    .concat(projectManagementApi.middleware)

  return middleware
}

/**
 * Redux DevTools 설정
 */
const getDevToolsConfig = () => ({
  name: 'VLANET Store',
  trace: process.env.NODE_ENV === 'development',
  traceLimit: 25,
  actionSanitizer: (action: any) => ({
    ...action,
    // 민감한 정보 마스킹
    payload: action.type.includes('token') || action.type.includes('password') 
      ? '***REDACTED***' 
      : action.payload
  }),
  stateSanitizer: (state: any) => ({
    ...state,
    auth: {
      ...state.auth,
      token: state.auth.token ? '***TOKEN***' : null,
      refreshToken: state.auth.refreshToken ? '***REFRESH_TOKEN***' : null
    }
  })
})

/**
 * 통합 스토어 생성
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware: getMiddleware,
  devTools: process.env.NODE_ENV === 'development' ? getDevToolsConfig() : false,
  preloadedState: undefined, // 초기 상태는 각 슬라이스에서 정의
})

// ============================================================================
// 영속성 설정
// ============================================================================

export const persistor = persistStore(store, {
  // 영속성 콜백 설정
  manualPersist: false,
  serialize: true
})

// ============================================================================
// RTK Query 설정
// ============================================================================

// API 리스너 설정 (리페치, 캐시 무효화 등)
setupListeners(store.dispatch)

// ============================================================================
// 타입 정의 및 훅
// ============================================================================

export type AppStore = typeof store
export type AppDispatch = typeof store.dispatch
export type AppGetState = typeof store.getState
export type AppRootState = ReturnType<AppGetState>

// 타입 안전성 검증
export const isValidRootState = (state: unknown): state is AppRootState => {
  return validateRootState(state)
}

// ============================================================================
// 스토어 유틸리티
// ============================================================================

/**
 * 스토어 상태 초기화
 */
export const resetStore = () => {
  store.dispatch({ type: 'RESET_STORE' })
  persistor.purge()
}

/**
 * 스토어 상태 내보내기 (백업용)
 */
export const exportStoreState = (): AppRootState => {
  const state = store.getState()
  if (!isValidRootState(state)) {
    throw new Error('Invalid store state detected')
  }
  return state
}

/**
 * 스토어 상태 가져오기 (복원용)
 */
export const importStoreState = (state: AppRootState) => {
  if (!isValidRootState(state)) {
    throw new Error('Invalid state provided for import')
  }
  // 상태 복원 로직 (필요시 구현)
}

// ============================================================================
// 개발 도구
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  // 전역 스토어 접근 (디버깅용)
  ;(window as any).__VLANET_STORE__ = store
  ;(window as any).__VLANET_PERSISTOR__ = persistor
  
  // 스토어 상태 검증 도구
  ;(window as any).__VALIDATE_STORE_STATE__ = () => {
    const state = store.getState()
    console.log('Store validation result:', isValidRootState(state))
    return isValidRootState(state)
  }
}

// ============================================================================
// 타입 호환성 보장
// ============================================================================

// 기존 코드와의 호환성을 위한 타입 재내보내기
export type { AppRootState as RootState }
export { store as appStore }

// 기본 내보내기
export default store