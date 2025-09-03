/**
 * @file Optimized Selectors
 * @description 성능 최적화된 memoized selectors 및 캐싱 전략
 */

import { 
  createSelector, 
  createDraftSafeSelector,
  lruMemoize,
  weakMapMemoize
} from '@reduxjs/toolkit'
import { createSelectorCreator } from 'reselect'
import type { RootState } from '@/shared/types/store'

// ============================================================================
// 커스텀 메모이제이션 전략
// ============================================================================

/**
 * LRU 캐시 기반 셀렉터 생성자
 * - 자주 변경되는 데이터에 적합
 * - 메모리 사용량 제한
 */
export const createLRUSelector = createSelectorCreator({
  memoize: lruMemoize,
  memoizeOptions: {
    maxSize: 50 // 최대 50개 결과 캐시
  }
})

/**
 * WeakMap 기반 셀렉터 생성자
 * - 참조 기반 메모이제이션
 * - 메모리 누수 방지
 */
export const createWeakMapSelector = createSelectorCreator({
  memoize: weakMapMemoize
})

/**
 * 커스텀 등가성 검사 셀렉터
 * - 깊은 객체 비교
 * - 배열 순서 무시
 */
const createDeepEqualSelector = createSelectorCreator({
  memoize: lruMemoize,
  memoizeOptions: {
    maxSize: 20,
    equalityCheck: (a: any, b: any) => {
      if (a === b) return true
      if (Array.isArray(a) && Array.isArray(b)) {
        return a.length === b.length && 
               a.every((item, index) => item === b[index])
      }
      if (typeof a === 'object' && typeof b === 'object') {
        const keysA = Object.keys(a)
        const keysB = Object.keys(b)
        return keysA.length === keysB.length &&
               keysA.every(key => a[key] === b[key])
      }
      return false
    }
  }
})

// ============================================================================
// 기본 상태 선택자들
// ============================================================================

const selectAuthState = (state: RootState) => state.auth
const selectPipelineState = (state: RootState) => state.pipeline
const selectProjectManagementState = (state: RootState) => state.projectManagement
const selectVideoFeedbackState = (state: RootState) => state.videoFeedback
const selectCalendarState = (state: RootState) => state.calendar

// ============================================================================
// 인증 관련 최적화된 Selectors
// ============================================================================

/**
 * 인증 상태 - 자주 확인되므로 weakMap 사용
 */
export const selectIsAuthenticatedOptimized = createWeakMapSelector(
  [selectAuthState],
  (auth) => auth.isAuthenticated && !auth.loading
)

/**
 * 현재 사용자 정보 - LRU 캐시 사용
 */
export const selectCurrentUserOptimized = createLRUSelector(
  [selectAuthState],
  (auth) => auth.user
)

/**
 * 사용자 권한 정보 - 복잡한 계산이므로 캐싱
 */
export const selectUserPermissions = createLRUSelector(
  [selectCurrentUserOptimized],
  (user) => {
    if (!user) return { permissions: [], role: 'guest', canAccess: () => false }
    
    const permissions = user.permissions || []
    const role = user.role || 'user'
    
    return {
      permissions,
      role,
      isAdmin: role === 'admin',
      isModerator: role === 'moderator' || role === 'admin',
      canAccess: (resource: string) => {
        return role === 'admin' || permissions.includes(resource)
      },
      canEdit: (resourceId: string) => {
        return role === 'admin' || 
               permissions.includes('edit:all') ||
               user.id === resourceId
      }
    }
  }
)

/**
 * 세션 상태 정보 - 자주 업데이트되므로 깊은 비교
 */
export const selectSessionStatus = createDeepEqualSelector(
  [selectAuthState, selectPipelineState],
  (auth, pipeline) => {
    const isActive = auth.isAuthenticated && Boolean(pipeline.sessionData.lastActivity)
    const lastActivity = pipeline.sessionData.lastActivity 
      ? new Date(pipeline.sessionData.lastActivity) 
      : null
    
    let sessionHealth: 'healthy' | 'warning' | 'expired' = 'healthy'
    
    if (lastActivity) {
      const timeSinceActivity = Date.now() - lastActivity.getTime()
      const warningThreshold = 25 * 60 * 1000 // 25분
      const expiredThreshold = 30 * 60 * 1000 // 30분
      
      if (timeSinceActivity > expiredThreshold) {
        sessionHealth = 'expired'
      } else if (timeSinceActivity > warningThreshold) {
        sessionHealth = 'warning'
      }
    }
    
    return {
      isActive,
      lastActivity,
      timeSpent: pipeline.sessionData.timeSpent,
      health: sessionHealth,
      shouldWarnTimeout: sessionHealth === 'warning'
    }
  }
)

// ============================================================================
// 파이프라인 관련 최적화된 Selectors
// ============================================================================

/**
 * 파이프라인 진행률 - 복잡한 계산이므로 LRU 캐시
 */
export const selectPipelineProgressOptimized = createLRUSelector(
  [selectPipelineState],
  (pipeline) => {
    const PIPELINE_STEPS = ['signup', 'login', 'project', 'invite', 'planning', 'prompt', 'feedback']
    const currentStepIndex = PIPELINE_STEPS.indexOf(pipeline.currentStep)
    const completedCount = pipeline.completedSteps.length
    
    return {
      currentStep: pipeline.currentStep,
      currentStepIndex,
      completedCount,
      totalSteps: PIPELINE_STEPS.length,
      percentage: Math.round((completedCount / PIPELINE_STEPS.length) * 100),
      nextStep: currentStepIndex < PIPELINE_STEPS.length - 1 
        ? PIPELINE_STEPS[currentStepIndex + 1] 
        : null,
      isComplete: currentStepIndex === PIPELINE_STEPS.length - 1,
      canAdvance: currentStepIndex < PIPELINE_STEPS.length - 1
    }
  }
)

/**
 * 사용자 프로젝트 요약 - 자주 조회되므로 WeakMap 사용
 */
export const selectUserProjectsSummary = createWeakMapSelector(
  [selectPipelineState],
  (pipeline) => {
    const projects = pipeline.userProgress.projects
    
    return {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'active').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      currentProject: pipeline.userProgress.currentProject,
      recentProjects: projects
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
    }
  }
)

// ============================================================================
// 프로젝트 관리 최적화된 Selectors
// ============================================================================

/**
 * 필터링된 프로젝트 목록 - 파라미터화된 셀렉터
 */
export const selectFilteredProjects = createLRUSelector(
  [
    selectProjectManagementState,
    (_state: RootState, filters: {
      status?: string[]
      search?: string
      sortBy?: 'name' | 'createdAt' | 'status'
      sortOrder?: 'asc' | 'desc'
    }) => filters
  ],
  (projectManagement, filters) => {
    let projects = [...projectManagement.projects]
    
    // 상태 필터링
    if (filters.status && filters.status.length > 0) {
      projects = projects.filter(project => 
        filters.status!.includes(project.status)
      )
    }
    
    // 검색 필터링
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      projects = projects.filter(project =>
        project.name.toLowerCase().includes(searchLower) ||
        project.description?.toLowerCase().includes(searchLower)
      )
    }
    
    // 정렬
    if (filters.sortBy) {
      projects.sort((a, b) => {
        const aValue = a[filters.sortBy!]
        const bValue = b[filters.sortBy!]
        
        let comparison = 0
        if (aValue < bValue) comparison = -1
        if (aValue > bValue) comparison = 1
        
        return filters.sortOrder === 'desc' ? -comparison : comparison
      })
    }
    
    return projects
  }
)

/**
 * 프로젝트 통계 - 대시보드용
 */
export const selectProjectStatistics = createLRUSelector(
  [selectProjectManagementState],
  (projectManagement) => {
    const projects = projectManagement.projects
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    
    return {
      total: projects.length,
      byStatus: projects.reduce((acc, project) => {
        acc[project.status] = (acc[project.status] || 0) + 1
        return acc
      }, {} as Record<string, number>),
      recentActivity: projects.filter(project => 
        new Date(project.createdAt) > thirtyDaysAgo
      ).length,
      averageProjectsPerMonth: Math.round(projects.length / 12), // 가정: 1년치 데이터
      trending: {
        growing: projects.filter(p => p.status === 'active').length > 
                projects.filter(p => p.status === 'completed').length,
        mostActiveStatus: Object.entries(
          projects.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        ).sort(([,a], [,b]) => b - a)[0]?.[0] || 'draft'
      }
    }
  }
)

// ============================================================================
// 통합 대시보드 Selector
// ============================================================================

/**
 * 대시보드 전체 데이터 - 복잡한 조합이므로 LRU 캐시
 */
export const selectDashboardData = createLRUSelector(
  [
    selectIsAuthenticatedOptimized,
    selectCurrentUserOptimized,
    selectPipelineProgressOptimized,
    selectUserProjectsSummary,
    selectProjectStatistics,
    selectVideoFeedbackState,
    selectCalendarState
  ],
  (isAuthenticated, user, pipelineProgress, projectsSummary, projectStats, feedback, calendar) => {
    if (!isAuthenticated || !user) {
      return {
        isReady: false,
        user: null,
        overview: null
      }
    }
    
    return {
      isReady: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      overview: {
        pipeline: {
          currentStep: pipelineProgress.currentStep,
          percentage: pipelineProgress.percentage,
          canAdvance: pipelineProgress.canAdvance
        },
        projects: {
          total: projectsSummary.totalProjects,
          active: projectsSummary.activeProjects,
          recent: projectsSummary.recentProjects
        },
        statistics: projectStats,
        feedback: {
          pending: feedback.feedbacks.filter(f => f.status === 'pending').length,
          total: feedback.feedbacks.length
        },
        calendar: {
          upcomingEvents: calendar.events
            .filter(event => new Date(event.startDate) > new Date())
            .slice(0, 5)
        }
      }
    }
  }
)

// ============================================================================
// 성능 모니터링 Selector
// ============================================================================

/**
 * 셀렉터 성능 모니터링
 */
export const createMonitoredSelector = <T>(
  name: string,
  selector: (state: RootState) => T
) => {
  return createSelector(
    [selector],
    (result) => {
      if (process.env.NODE_ENV === 'development') {
        const start = performance.now()
        const finalResult = result
        const duration = performance.now() - start
        
        if (duration > 5) { // 5ms 이상 소요되는 셀렉터 로깅
          console.warn(`⚠️ Slow selector: ${name} took ${duration.toFixed(2)}ms`)
        }
        
        return finalResult
      }
      return result
    }
  )
}

// ============================================================================
// 무한 스크롤 및 페이지네이션 Selectors
// ============================================================================

/**
 * 페이지네이션된 데이터 선택자
 */
export const createPaginatedSelector = <T>(
  dataSelector: (state: RootState) => T[],
  pageSize: number = 10
) => {
  return createLRUSelector(
    [
      dataSelector,
      (_state: RootState, page: number) => page
    ],
    (data, page) => {
      const startIndex = (page - 1) * pageSize
      const endIndex = startIndex + pageSize
      
      return {
        items: data.slice(startIndex, endIndex),
        pagination: {
          currentPage: page,
          pageSize,
          totalItems: data.length,
          totalPages: Math.ceil(data.length / pageSize),
          hasNext: endIndex < data.length,
          hasPrev: page > 1
        }
      }
    }
  )
}

/**
 * 무한 스크롤 데이터 선택자
 */
export const createInfiniteScrollSelector = <T>(
  dataSelector: (state: RootState) => T[],
  loadedItemsSelector: (state: RootState) => number
) => {
  return createLRUSelector(
    [dataSelector, loadedItemsSelector],
    (data, loadedCount) => {
      return {
        items: data.slice(0, loadedCount),
        hasMore: loadedCount < data.length,
        totalItems: data.length,
        loadedItems: loadedCount
      }
    }
  )
}

// ============================================================================
// 개발 도구
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  // 셀렉터 성능 추적
  const selectorPerformance = new Map<string, { calls: number; totalTime: number }>()
  
  ;(window as any).__VLANET_SELECTOR_STATS__ = {
    getStats: () => Object.fromEntries(selectorPerformance.entries()),
    clearStats: () => selectorPerformance.clear(),
    getSlowSelectors: (threshold = 5) => {
      return Object.fromEntries(
        Array.from(selectorPerformance.entries())
          .filter(([, stats]) => (stats.totalTime / stats.calls) > threshold)
      )
    }
  }
}