/**
 * @file Integrated State Management Hooks
 * @description 통합 상태 관리 시스템을 위한 커스텀 훅
 */

import { useSelector, useDispatch } from 'react-redux'
import { useCallback, useMemo, useEffect } from 'react'
import type { AppDispatch, AppRootState } from '@/app/store.final'

// Enhanced selectors
import {
  selectIsAuthenticatedOptimized,
  selectCurrentUserOptimized,
  selectUserPermissions,
  selectSessionStatus,
  selectPipelineProgressOptimized,
  selectUserProjectsSummary,
  selectDashboardData
} from '@/shared/lib/selectors/optimizedSelectors'

// Actions
import { 
  loginWithThunk,
  updateActivity,
  resetAuth 
} from '@/features/authentication/model/authSlice.enhanced'
import { 
  updatePipelineStep,
  batchUpdatePipeline,
  syncWithAuthState
} from '@/processes/userPipeline/model/pipelineSlice.enhanced'

// ============================================================================
// 기본 상태 관리 훅
// ============================================================================

/**
 * 타입 안전한 디스패치 훅
 */
export const useAppDispatch = () => useDispatch<AppDispatch>()

/**
 * 타입 안전한 셀렉터 훅
 */
export const useAppSelector = <T>(
  selector: (state: AppRootState) => T,
  equalityFn?: (left: T, right: T) => boolean
) => useSelector(selector, equalityFn)

// ============================================================================
// 통합 인증 관리 훅
// ============================================================================

/**
 * 통합 인증 상태 관리 훅
 */
export const useAuth = () => {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector(selectIsAuthenticatedOptimized)
  const user = useAppSelector(selectCurrentUserOptimized)
  const permissions = useAppSelector(selectUserPermissions)
  const sessionStatus = useAppSelector(selectSessionStatus)

  // 로그인 함수
  const login = useCallback(async (credentials: { email: string; password: string }) => {
    try {
      const result = await dispatch(loginWithThunk(credentials))
      
      if (loginWithThunk.fulfilled.match(result)) {
        // 파이프라인과 동기화
        dispatch(syncWithAuthState({
          isAuthenticated: true,
          user: result.payload.user,
          targetStep: 'project'
        }))
        
        return { success: true, user: result.payload.user }
      } else {
        return { success: false, error: result.error?.message || 'Login failed' }
      }
    } catch (error) {
      return { success: false, error: 'Network error' }
    }
  }, [dispatch])

  // 로그아웃 함수
  const logout = useCallback(() => {
    dispatch(resetAuth())
  }, [dispatch])

  // 활동 업데이트
  const updateUserActivity = useCallback(() => {
    dispatch(updateActivity())
  }, [dispatch])

  // 권한 확인
  const hasPermission = useCallback((permission: string) => {
    return permissions.canAccess(permission)
  }, [permissions])

  // 편집 권한 확인
  const canEdit = useCallback((resourceId: string) => {
    return permissions.canEdit(resourceId)
  }, [permissions])

  return {
    // 상태
    isAuthenticated,
    user,
    permissions,
    sessionStatus,
    
    // 액션
    login,
    logout,
    updateUserActivity,
    
    // 유틸리티
    hasPermission,
    canEdit
  }
}

// ============================================================================
// 파이프라인 관리 훅
// ============================================================================

/**
 * 파이프라인 진행 상황 관리 훅
 */
export const usePipeline = () => {
  const dispatch = useAppDispatch()
  const progress = useAppSelector(selectPipelineProgressOptimized)
  const projectsSummary = useAppSelector(selectUserProjectsSummary)

  // 다음 단계로 이동
  const moveToNextStep = useCallback((stepData?: any) => {
    if (progress.canAdvance && progress.nextStep) {
      dispatch(updatePipelineStep({
        step: progress.nextStep,
        ...stepData
      }))
    }
  }, [dispatch, progress])

  // 배치 업데이트
  const updatePipelineBatch = useCallback((data: {
    step?: any
    userData?: any
    projectData?: any
    sessionData?: any
  }) => {
    dispatch(batchUpdatePipeline(data))
  }, [dispatch])

  // 특정 단계로 점프 (관리자용)
  const jumpToStep = useCallback((step: any, force = false) => {
    if (force) {
      // 강제 이동 (개발/테스트용)
      dispatch(updatePipelineStep({ step }))
    } else {
      // 일반 이동 (유효성 검사 포함)
      moveToNextStep({ step })
    }
  }, [dispatch, moveToNextStep])

  return {
    // 상태
    progress,
    projectsSummary,
    
    // 액션
    moveToNextStep,
    updatePipelineBatch,
    jumpToStep,
    
    // 유틸리티
    isComplete: progress.isComplete,
    canAdvance: progress.canAdvance,
    currentStepIndex: progress.currentStepIndex
  }
}

// ============================================================================
// 통합 대시보드 훅
// ============================================================================

/**
 * 대시보드 데이터 통합 관리 훅
 */
export const useDashboard = () => {
  const dashboardData = useAppSelector(selectDashboardData)
  const { updateUserActivity } = useAuth()
  
  // 대시보드 접근 시 활동 업데이트
  useEffect(() => {
    if (dashboardData.isReady) {
      updateUserActivity()
    }
  }, [dashboardData.isReady, updateUserActivity])

  // 새로고침 함수
  const refreshDashboard = useCallback(() => {
    // API 캐시 무효화 및 리페치
    // 구체적인 구현은 각 API 슬라이스에서 처리
    updateUserActivity()
  }, [updateUserActivity])

  return {
    // 상태
    data: dashboardData,
    isReady: dashboardData.isReady,
    
    // 액션
    refreshDashboard,
    
    // 유틸리티
    hasData: dashboardData.isReady && dashboardData.overview !== null
  }
}

// ============================================================================
// 실시간 데이터 동기화 훅
// ============================================================================

/**
 * 폴링 기반 실시간 데이터 동기화 훅
 */
export const useRealTimeSync = (enabled = true, intervalMs = 30000) => {
  const dispatch = useAppDispatch()
  const isAuthenticated = useAppSelector(selectIsAuthenticatedOptimized)

  useEffect(() => {
    if (!enabled || !isAuthenticated) return

    // 주기적 데이터 동기화
    const interval = setInterval(() => {
      // 각 API 슬라이스의 최신 데이터 가져오기
      dispatch(apiSlice.util.invalidateTags(['User', 'Project', 'VideoFeedback', 'CalendarEvent']))
      
      // 활동 시간 업데이트
      dispatch(updateActivity())
    }, intervalMs)

    return () => clearInterval(interval)
  }, [enabled, isAuthenticated, intervalMs, dispatch])

  // 수동 동기화
  const syncNow = useCallback(() => {
    if (isAuthenticated) {
      dispatch(apiSlice.util.invalidateTags(['User', 'Project', 'VideoFeedback', 'CalendarEvent']))
      dispatch(updateActivity())
    }
  }, [dispatch, isAuthenticated])

  return {
    syncNow,
    isEnabled: enabled && isAuthenticated
  }
}

// ============================================================================
// 낙관적 업데이트 훅
// ============================================================================

/**
 * 낙관적 업데이트 관리 훅
 */
export const useOptimisticUpdate = () => {
  const dispatch = useAppDispatch()

  const executeOptimistic = useCallback(async <T>(
    updateId: string,
    optimisticAction: any,
    serverAction: () => Promise<T>,
    rollbackAction?: any
  ) => {
    try {
      // 낙관적 업데이트 시작
      dispatch(optimisticAction)
      
      // 서버 요청 실행
      const result = await serverAction()
      
      // 성공 시 확정
      dispatch({
        type: 'auth/completeOptimisticUpdate',
        payload: { updateId }
      })
      
      return { success: true, data: result }
      
    } catch (error) {
      // 실패 시 롤백
      if (rollbackAction) {
        dispatch(rollbackAction)
      }
      
      dispatch({
        type: 'auth/rollbackOptimisticUpdate',
        payload: { updateId }
      })
      
      return { success: false, error }
    }
  }, [dispatch])

  return {
    executeOptimistic
  }
}

// ============================================================================
// 성능 모니터링 훅
// ============================================================================

/**
 * 렌더링 성능 모니터링 훅
 */
export const usePerformanceMonitor = (componentName: string) => {
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const start = performance.now()
      
      return () => {
        const duration = performance.now() - start
        if (duration > 100) {
          console.warn(`⚠️ Slow component: ${componentName} took ${duration.toFixed(2)}ms`)
        }
      }
    }
  }, [componentName])
}

// ============================================================================
// 에러 경계 훅
// ============================================================================

/**
 * 상태 관리 에러 처리 훅
 */
export const useStateErrorBoundary = () => {
  const dispatch = useAppDispatch()

  const handleStateError = useCallback((error: Error, errorInfo: any) => {
    console.error('State management error:', error, errorInfo)
    
    // 에러 복구 시도
    dispatch({
      type: 'app/handleStateError',
      payload: {
        error: error.message,
        timestamp: new Date().toISOString(),
        context: errorInfo
      }
    })
    
    // 심각한 에러인 경우 스토어 초기화
    if (error.message.includes('state corruption') || 
        error.message.includes('validation failed')) {
      console.warn('🚨 Critical state error, resetting store')
      resetStore()
    }
  }, [dispatch])

  return {
    handleStateError
  }
}