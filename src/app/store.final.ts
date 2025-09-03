/**
 * @file Final Integrated Store
 * @description VLANET 통합 파이프라인을 위한 최종 상태 관리 시스템
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

// Types and validation
import { validateRootState, type RootState } from '@/shared/types/store'

// Enhanced slices
import enhancedAuthSlice from '@/features/authentication/model/authSlice.enhanced'
import enhancedPipelineSlice from '@/processes/userPipeline/model/pipelineSlice.enhanced'

// Existing slices (to be migrated)
import { projectManagementSlice, projectManagementApi } from '@/features/project-management'
import videoFeedbackSlice from '@/features/video-feedback/model/videoFeedbackSlice'
import { calendarSlice } from '@/features/calendar'

// Middleware
import crossSliceSyncMiddleware from '@/shared/lib/middleware/crossSliceSync'
import persistenceMiddleware from '@/shared/lib/middleware/persistenceMiddleware'

// API slice
import { apiSlice } from '@/shared/api/apiSlice'

// ============================================================================
// 영속성 설정
// ============================================================================

/**
 * Set 직렬화 변환기
 */
const setTransform = {
  in: (inboundState: any, key: string) => {
    if (key === 'completedSteps' && Array.isArray(inboundState)) {
      return new Set(inboundState)
    }
    return inboundState
  },
  out: (outboundState: any, key: string) => {
    if (key === 'completedSteps' && outboundState instanceof Set) {
      return Array.from(outboundState)
    }
    return outboundState
  }
}

/**
 * 영속성 설정
 */
const persistConfigs = {
  auth: {
    key: 'vlanet_auth_v2',
    storage,
    whitelist: ['isAuthenticated', 'user', 'refreshToken', 'rememberMe', 'preferredLanguage'],
    blacklist: ['loading', 'error', 'token', 'errorDetails', 'optimisticUpdates']
  },
  pipeline: {
    key: 'vlanet_pipeline_v2',
    storage,
    whitelist: ['currentStep', 'completedSteps', 'userProgress', 'sessionData'],
    blacklist: ['loading', 'error', 'optimisticUpdates', 'transitionHistory'],
    transforms: [setTransform]
  },
  projectManagement: {
    key: 'vlanet_projects_v2',
    storage,
    whitelist: ['projects', 'currentProject'],
    blacklist: ['loading', 'error']
  }
}

// ============================================================================
// 루트 리듀서 구성
// ============================================================================

const rootReducer = combineReducers({
  // 핵심 도메인 슬라이스 (enhanced)
  auth: persistReducer(persistConfigs.auth, enhancedAuthSlice),
  pipeline: persistReducer(persistConfigs.pipeline, enhancedPipelineSlice),
  
  // 기능별 슬라이스 (기존)
  projectManagement: persistReducer(persistConfigs.projectManagement, projectManagementSlice.reducer),
  videoFeedback: videoFeedbackSlice,
  calendar: calendarSlice.reducer,
  
  // API 슬라이스들
  [apiSlice.reducerPath]: apiSlice.reducer,
  [projectManagementApi.reducerPath]: projectManagementApi.reducer
})

// ============================================================================
// 미들웨어 설정
// ============================================================================

const getMiddleware = (getDefaultMiddleware: any) => {
  return getDefaultMiddleware({
    serializableCheck: {
      ignoredActions: [
        FLUSH,
        REHYDRATE,
        PAUSE,
        PERSIST,
        PURGE,
        REGISTER,
        // RTK Query 액션들
        'api/executeMutation/pending',
        'api/executeMutation/fulfilled',
        'api/executeMutation/rejected',
        'api/executeQuery/pending',
        'api/executeQuery/fulfilled',
        'api/executeQuery/rejected'
      ],
      ignoredPaths: [
        'register',
        'rehydrate',
        // 변환 처리되는 경로들
        'pipeline.completedSteps',
        'auth.optimisticUpdates',
        'pipeline.optimisticUpdates'
      ]
    },
    immutableCheck: {
      ignoredPaths: [
        'pipeline.completedSteps',
        'auth.optimisticUpdates'
      ]
    }
  })
    .concat(apiSlice.middleware)
    .concat(projectManagementApi.middleware)
    .concat(crossSliceSyncMiddleware.middleware)
    .concat(persistenceMiddleware.middleware)
}

// ============================================================================
// Redux DevTools 설정
// ============================================================================

const getDevToolsConfig = () => ({
  name: 'VLANET Integration Store v2.0',
  trace: true,
  traceLimit: 25,
  maxAge: 50,
  
  // 액션 정리 (민감한 정보 마스킹)
  actionSanitizer: (action: any) => {
    if (action.type.includes('login') || action.type.includes('token')) {
      return {
        ...action,
        payload: {
          ...action.payload,
          // 토큰 정보 마스킹
          tokens: action.payload?.tokens ? {
            accessToken: '***ACCESS_TOKEN***',
            refreshToken: '***REFRESH_TOKEN***'
          } : action.payload?.tokens,
          password: action.payload?.password ? '***PASSWORD***' : action.payload?.password
        }
      }
    }
    return action
  },
  
  // 상태 정리 (민감한 정보 마스킹)
  stateSanitizer: (state: any) => ({
    ...state,
    auth: {
      ...state.auth,
      token: state.auth?.token ? '***TOKEN***' : null,
      refreshToken: state.auth?.refreshToken ? '***REFRESH_TOKEN***' : null
    }
  }),
  
  // 기능별 설정
  features: {
    pause: true,
    lock: true,
    persist: true,
    export: true,
    import: true,
    jump: true,
    skip: true,
    reorder: true,
    dispatch: true,
    test: true
  }
})

// ============================================================================
// 스토어 생성
// ============================================================================

/**
 * VLANET 통합 상태 관리 스토어
 */
export const store = configureStore({
  reducer: rootReducer,
  middleware: getMiddleware,
  devTools: process.env.NODE_ENV === 'development' ? getDevToolsConfig() : false,
  preloadedState: undefined
})

// ============================================================================
// 영속성 설정
// ============================================================================

export const persistor = persistStore(store, {
  manualPersist: false,
  serialize: true
})

// ============================================================================
// RTK Query 설정
// ============================================================================

setupListeners(store.dispatch)

// ============================================================================
// 타입 정의
// ============================================================================

export type AppStore = typeof store
export type AppDispatch = typeof store.dispatch
export type AppGetState = typeof store.getState
export type AppRootState = ReturnType<AppGetState>

// 타입 가드
export const isValidAppState = (state: unknown): state is AppRootState => {
  return validateRootState(state)
}

// ============================================================================
// 스토어 유틸리티
// ============================================================================

/**
 * 스토어 전체 초기화
 */
export const resetStore = () => {
  store.dispatch({ type: 'RESET_ALL_SLICES' })
  persistor.purge()
  
  // 모든 RTK Query 캐시 클리어
  store.dispatch(apiSlice.util.resetApiState())
  store.dispatch(projectManagementApi.util.resetApiState())
  
  console.log('🔄 Store: Complete reset performed')
}

/**
 * 메모리 사용량 모니터링
 */
export const getMemoryUsage = () => {
  const state = store.getState()
  const stateSize = JSON.stringify(state).length
  
  return {
    stateSizeBytes: stateSize,
    stateSizeKB: Math.round(stateSize / 1024),
    breakdown: {
      auth: JSON.stringify(state.auth).length,
      pipeline: JSON.stringify(state.pipeline).length,
      projectManagement: JSON.stringify(state.projectManagement).length,
      videoFeedback: JSON.stringify(state.videoFeedback).length,
      calendar: JSON.stringify(state.calendar).length
    }
  }
}

/**
 * 성능 최적화 - 스토어 상태 압축
 */
export const optimizeStoreState = () => {
  const state = store.getState()
  
  // 오래된 전환 이력 제거 (최근 20개만 유지)
  if (state.pipeline.transitionHistory?.length > 20) {
    store.dispatch({
      type: 'pipeline/optimizeTransitionHistory',
      payload: { keepLast: 20 }
    })
  }
  
  // 오래된 낙관적 업데이트 제거
  const now = Date.now()
  const maxAge = 5 * 60 * 1000 // 5분
  
  Object.entries(state.auth.optimisticUpdates || {}).forEach(([id, meta]) => {
    if (now - new Date(meta.timestamp).getTime() > maxAge) {
      store.dispatch({
        type: 'auth/cleanupOptimisticUpdate',
        payload: { updateId: id }
      })
    }
  })
  
  console.log('🧹 Store: State optimization completed')
}

// ============================================================================
// 개발 도구 및 디버깅
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  // 전역 디버깅 도구
  ;(window as any).__VLANET_STORE_V2__ = {
    store,
    persistor,
    getState: () => store.getState(),
    dispatch: store.dispatch,
    resetStore,
    getMemoryUsage,
    optimizeStoreState,
    
    // 상태 검증
    validateState: () => {
      const state = store.getState()
      const isValid = isValidAppState(state)
      console.log('State validation result:', isValid)
      return isValid
    },
    
    // 액션 테스트
    testAction: (action: any) => {
      console.log('Testing action:', action)
      store.dispatch(action)
      return store.getState()
    },
    
    // 성능 측정
    measureSelector: (selector: (state: AppRootState) => any) => {
      const start = performance.now()
      const result = selector(store.getState())
      const duration = performance.now() - start
      
      console.log(`Selector performance: ${duration.toFixed(2)}ms`)
      return { result, duration }
    }
  }
  
  // 메모리 사용량 모니터링 (5분마다)
  setInterval(() => {
    const usage = getMemoryUsage()
    
    if (usage.stateSizeKB > 1024) { // 1MB 이상
      console.warn(`⚠️ Store memory usage high: ${usage.stateSizeKB}KB`)
      optimizeStoreState()
    }
  }, 5 * 60 * 1000)
  
  // 페이지 언로드 시 메모리 정리
  window.addEventListener('beforeunload', () => {
    optimizeStoreState()
  })
}

// ============================================================================
// 타입 호환성
// ============================================================================

// 기존 코드와의 호환성을 위한 타입 재내보내기
export type { AppRootState as RootState }
export { store as appStore }

// 리듀서 개별 내보내기 (필요시)
export { 
  enhancedAuthSlice,
  enhancedPipelineSlice
}

// 기본 내보내기
export default store