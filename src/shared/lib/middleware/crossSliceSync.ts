/**
 * @file Cross-Slice Synchronization Middleware
 * @description 슬라이스 간 상태 동기화 및 사이드 이펙트 처리
 */

import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import type { RootState, AppDispatch } from '@/app/store.enhanced'

// Enhanced slices actions
import { loginWithThunk, resetAuth, updateActivity } from '@/features/authentication/model/authSlice.enhanced'
import { 
  syncWithAuthState, 
  clearPipelineProgress,
  updatePipelineStep 
} from '@/processes/userPipeline/model/pipelineSlice.enhanced'

// ============================================================================
// Cross-Slice 동기화 미들웨어 생성
// ============================================================================

export const crossSliceSyncMiddleware = createListenerMiddleware()

// ============================================================================
// 인증 상태 → 파이프라인 동기화
// ============================================================================

/**
 * 로그인 성공 시 파이프라인 상태 동기화
 */
crossSliceSyncMiddleware.startListening({
  matcher: isAnyOf(loginWithThunk.fulfilled),
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    const { user } = action.payload
    
    // 파이프라인과 인증 상태 동기화
    listenerApi.dispatch(syncWithAuthState({
      isAuthenticated: true,
      user: user,
      targetStep: 'project' // 로그인 완료 시 프로젝트 단계로 이동
    }))
    
    // 활동 시간 업데이트
    listenerApi.dispatch(updateActivity())
    
    console.log(`✅ Cross-slice sync: User ${user.email} logged in, pipeline synced`)
  }
})

/**
 * 로그아웃 시 파이프라인 초기화
 */
crossSliceSyncMiddleware.startListening({
  actionCreator: resetAuth,
  effect: async (action, listenerApi) => {
    // 파이프라인 진행 상황 초기화
    listenerApi.dispatch(clearPipelineProgress())
    
    console.log('✅ Cross-slice sync: Auth reset, pipeline cleared')
  }
})

// ============================================================================
// 파이프라인 상태 → 세션 활동 추적
// ============================================================================

/**
 * 파이프라인 단계 변경 시 세션 활동 업데이트
 */
crossSliceSyncMiddleware.startListening({
  actionCreator: updatePipelineStep,
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    
    // 인증된 사용자만 활동 추적
    if (state.auth.isAuthenticated) {
      listenerApi.dispatch(updateActivity())
    }
    
    console.log(`✅ Cross-slice sync: Pipeline step updated to ${action.payload.step}, activity tracked`)
  }
})

// ============================================================================
// 프로젝트 관리 → 파이프라인 동기화
// ============================================================================

/**
 * 프로젝트 생성/업데이트 시 파이프라인 데이터 동기화
 */
crossSliceSyncMiddleware.startListening({
  predicate: (action) => {
    return action.type.startsWith('projectManagement/') && 
           (action.type.includes('fulfilled') || action.type.includes('addProject'))
  },
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    
    // 프로젝트 관련 액션인지 확인하고 파이프라인 업데이트
    if (action.type.includes('addProject') && action.payload) {
      const project = action.payload
      
      // 파이프라인에 프로젝트 데이터 동기화
      listenerApi.dispatch(updatePipelineStep({
        step: 'invite',
        projectData: project
      }))
      
      console.log(`✅ Cross-slice sync: Project ${project.id} added, pipeline updated`)
    }
  }
})

// ============================================================================
// 에러 상태 전파
// ============================================================================

/**
 * API 에러 발생 시 관련 슬라이스들에 에러 상태 전파
 */
crossSliceSyncMiddleware.startListening({
  predicate: (action) => {
    return action.type.endsWith('/rejected') && action.error
  },
  effect: async (action, listenerApi) => {
    const errorMessage = action.error?.message || 'Unknown error'
    const actionType = action.type
    
    console.warn(`❌ Cross-slice sync: Error in ${actionType}:`, errorMessage)
    
    // 인증 관련 에러
    if (actionType.includes('auth/')) {
      // 401 에러 시 자동 로그아웃
      if (action.error?.message?.includes('401') || 
          action.error?.message?.includes('unauthorized')) {
        listenerApi.dispatch(resetAuth())
        console.log('✅ Cross-slice sync: Unauthorized error, user logged out')
      }
    }
    
    // 파이프라인 관련 에러
    if (actionType.includes('pipeline/')) {
      // 필요시 파이프라인 에러 처리
    }
  }
})

// ============================================================================
// 성능 모니터링
// ============================================================================

/**
 * 액션 디스패치 성능 모니터링
 */
crossSliceSyncMiddleware.startListening({
  predicate: () => process.env.NODE_ENV === 'development',
  effect: async (action, listenerApi) => {
    const start = performance.now()
    
    // 액션 처리 완료 후 성능 측정
    setTimeout(() => {
      const duration = performance.now() - start
      
      if (duration > 100) { // 100ms 이상 소요되는 액션 로깅
        console.warn(`⚠️ Performance: Action ${action.type} took ${duration.toFixed(2)}ms`)
      }
    }, 0)
  }
})

// ============================================================================
// 데이터 유효성 검증
// ============================================================================

/**
 * 상태 업데이트 후 데이터 무결성 검증
 */
crossSliceSyncMiddleware.startListening({
  predicate: (action) => {
    return process.env.NODE_ENV === 'development' && 
           (action.type.includes('/fulfilled') || action.type.includes('update'))
  },
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    
    // 기본적인 상태 무결성 검증
    const validationErrors: string[] = []
    
    // 인증 상태 검증
    if (state.auth.isAuthenticated && !state.auth.user) {
      validationErrors.push('Auth: authenticated but user is null')
    }
    
    if (state.auth.isAuthenticated && !state.auth.token) {
      validationErrors.push('Auth: authenticated but token is null')
    }
    
    // 파이프라인 상태 검증
    if (state.pipeline.userProgress.profile && !state.auth.user) {
      validationErrors.push('Pipeline: user profile exists but auth user is null')
    }
    
    if (validationErrors.length > 0) {
      console.error('❌ Cross-slice validation errors:', validationErrors)
      
      // 개발 환경에서는 에러 발생
      if (process.env.NODE_ENV === 'development') {
        throw new Error(`State validation failed: ${validationErrors.join(', ')}`)
      }
    }
  }
})

// ============================================================================
// 로컬 스토리지 동기화
// ============================================================================

/**
 * 중요한 상태 변경 시 로컬 스토리지 동기화
 */
crossSliceSyncMiddleware.startListening({
  predicate: (action) => {
    return action.type.includes('auth/') || 
           action.type.includes('pipeline/') ||
           action.type.includes('setRememberMe')
  },
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    
    try {
      // Remember Me 설정에 따른 저장
      if (state.auth.rememberMe) {
        localStorage.setItem('vlanet_remember_me', 'true')
        
        if (state.auth.refreshToken) {
          localStorage.setItem('vlanet_refresh_token', state.auth.refreshToken)
        }
      } else {
        localStorage.removeItem('vlanet_remember_me')
        localStorage.removeItem('vlanet_refresh_token')
      }
      
      // 사용자 환경설정 저장
      if (state.auth.user) {
        localStorage.setItem('vlanet_user_preferences', JSON.stringify({
          language: state.auth.preferredLanguage,
          theme: 'light' // 추후 확장
        }))
      }
      
    } catch (error) {
      console.warn('⚠️ Local storage sync failed:', error)
    }
  }
})

// ============================================================================
// 개발 도구
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  // 액션 히스토리 추적
  const actionHistory: Array<{ action: any; timestamp: number }> = []
  
  crossSliceSyncMiddleware.startListening({
    predicate: () => true,
    effect: async (action, listenerApi) => {
      actionHistory.push({
        action: {
          type: action.type,
          payload: action.payload
        },
        timestamp: Date.now()
      })
      
      // 최대 100개까지만 보관
      if (actionHistory.length > 100) {
        actionHistory.shift()
      }
    }
  })
  
  // 전역 디버깅 도구
  ;(window as any).__VLANET_ACTION_HISTORY__ = actionHistory
  ;(window as any).__VLANET_CLEAR_HISTORY__ = () => {
    actionHistory.length = 0
    console.log('Action history cleared')
  }
}

// ============================================================================
// 미들웨어 내보내기
// ============================================================================

export default crossSliceSyncMiddleware