/**
 * @fileoverview 협업 시스템 메인 훅 - Performance Optimized
 * @description 적응형 폴링 및 성능 최적화된 협업 기능을 위한 올인원 훅
 * @performance LCP < 1.5s 목표 달성을 위한 최적화
 */

import { useCallback, useEffect, useRef, useMemo } from 'react'
import { useSelector } from 'react-redux'

import { useAppDispatch } from '@/app/store/store'
import { performanceMonitor } from '@/shared/lib/performance-monitor'

import { useDebounce } from '../../hooks/useDebounce'
import {
  pollCollaborationData,
  submitChange,
  performOptimisticUpdate,
  resolveConflict,
  selectActiveUsers,
  selectRecentChanges,
  selectConflicts,
  selectIsPolling,
  selectPollingError,
  selectShowConflictModal,
  selectShowActivityFeed,
  selectPendingChangesCount
} from '../slice'
import type {
  UseCollaborationOptions,
  UseCollaborationReturn,
  OptimisticUpdatePayload,
  ConflictResolutionPayload,
  CollaborationChange,
  AdaptivePollingConfig
} from '../types'

// ===========================
// 적응형 폴링 설정
// ===========================

const ADAPTIVE_POLLING_CONFIG: AdaptivePollingConfig = {
  // 기본 간격 (활성 상태)
  baseInterval: 2000, // 2초
  
  // 최소/최대 간격
  minInterval: 1000, // 1초
  maxInterval: 30000, // 30초
  
  // 백그라운드 간격 승수
  backgroundMultiplier: 3,
  
  // 네트워크 상태 기반 조정
  networkAdjustments: {
    'slow-2g': 2.5,
    '2g': 2.0,
    '3g': 1.5,
    '4g': 1.0,
    'fast': 0.8
  },
  
  // 에러 발생 시 지수 백오프
  exponentialBackoff: {
    enabled: true,
    maxRetries: 5,
    baseDelay: 1000
  },
  
  // 사용자 활동 기반 조정
  activityBasedAdjustment: {
    enabled: true,
    activeMultiplier: 0.8, // 활성 시 더 빨른 폴링
    inactiveMultiplier: 2.0 // 비활성 시 느린 폴링
  }
}

// ===========================
// 성능 최적화된 기본 옵션
// ===========================

const DEFAULT_OPTIONS: UseCollaborationOptions = {
  pollInterval: ADAPTIVE_POLLING_CONFIG.baseInterval,
  enabled: true,
  detectConflicts: true,
  showActivityFeed: false,
  debounceDelay: 300, // 500ms에서 300ms로 감소 (응답성 개선)
  adaptivePolling: ADAPTIVE_POLLING_CONFIG,
  requestDeduplication: true,
  performanceOptimization: {
    enableRequestBatching: true,
    enableSmartCaching: true,
    maxCacheAge: 10000, // 10초
    enablePerformanceMonitoring: true
  }
}

// ===========================
// 메인 협업 훅
// ===========================

export function useCollaboration(options: Partial<UseCollaborationOptions> = {}): UseCollaborationReturn {
  const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options])
  const dispatch = useAppDispatch()
  
  // 성능 추적 관련
  const performanceMetrics = useRef({
    pollCount: 0,
    lastPollTime: 0,
    averageResponseTime: 0,
    errorCount: 0
  })
  
  // Redux 상태 선택
  const activeUsers = useSelector(selectActiveUsers)
  const recentChanges = useSelector(selectRecentChanges)
  const conflicts = useSelector(selectConflicts)
  const isPolling = useSelector(selectIsPolling)
  const pollingError = useSelector(selectPollingError)
  const showConflictModal = useSelector(selectShowConflictModal)
  const showActivityFeed = useSelector(selectShowActivityFeed)
  const pendingChangesCount = useSelector(selectPendingChangesCount)
  
  // 적응형 폴링 인터벌 관리
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pendingSubmissions = useRef<Set<string>>(new Set())
  const adaptiveConfig = useRef({ ...config.adaptivePolling })
  const currentInterval = useRef(config.pollInterval)
  const retryCount = useRef(0)
  const lastPollRequest = useRef<Promise<any> | null>(null)
  const userActivity = useRef({ isActive: true, lastActivity: Date.now() })
  const requestCache = useRef(new Map<string, { data: any; timestamp: number }>())
  
  // ===========================
  // 폴링 제어 함수들
  // ===========================
  
  const calculateAdaptiveInterval = useCallback(() => {
    let interval = config.adaptivePolling!.baseInterval
    
    // 네트워크 상태 기반 조정
    if (typeof navigator !== 'undefined' && 'connection' in navigator) {
      const connection = (navigator as any).connection
      const effectiveType = connection?.effectiveType || '4g'
      const networkAdjustments = config.adaptivePolling!.networkAdjustments
      const networkMultiplier = networkAdjustments[effectiveType as keyof typeof networkAdjustments] || 1.0
      interval *= networkMultiplier
    }
    
    // 사용자 활동 기반 조정
    if (config.adaptivePolling!.activityBasedAdjustment.enabled) {
      const timeSinceActivity = Date.now() - userActivity.current.lastActivity
      const isRecentlyActive = timeSinceActivity < 60000 // 1분
      
      if (isRecentlyActive && userActivity.current.isActive) {
        interval *= config.adaptivePolling!.activityBasedAdjustment.activeMultiplier
      } else {
        interval *= config.adaptivePolling!.activityBasedAdjustment.inactiveMultiplier
      }
    }
    
    // 백그라운드 상태 확인
    if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
      interval *= config.adaptivePolling!.backgroundMultiplier
    }
    
    // 에러 발생 시 지수 백오프
    if (config.adaptivePolling!.exponentialBackoff.enabled && retryCount.current > 0) {
      const backoffMultiplier = Math.pow(2, Math.min(retryCount.current, config.adaptivePolling!.exponentialBackoff.maxRetries))
      interval = Math.min(interval * backoffMultiplier, config.adaptivePolling!.maxInterval)
    }
    
    // 최소/최대 간격 제한
    return Math.max(
      config.adaptivePolling!.minInterval,
      Math.min(interval, config.adaptivePolling!.maxInterval)
    )
  }, [config.adaptivePolling, userActivity])
  
  const executePoll = useCallback(async () => {
    if (!config.enabled) return
    
    // 요청 중복 제거
    if (config.requestDeduplication && lastPollRequest.current) {
      try {
        return await lastPollRequest.current
      } catch (error) {
        // 기존 요청이 실패한 경우 새로 시도
      }
    }
    
    // 성능 모니터링 시작
    const startTime = performance.now()
    
    try {
      const pollAction = dispatch(pollCollaborationData())
      
      if (config.requestDeduplication) {
        lastPollRequest.current = Promise.resolve(pollAction)
      }
      
      const result = pollAction
      
      // 성공 시 재시도 카운터 리셋
      retryCount.current = 0
      
      // 성능 메트릭 업데이트
      const responseTime = performance.now() - startTime
      performanceMetrics.current.pollCount++
      performanceMetrics.current.lastPollTime = responseTime
      performanceMetrics.current.averageResponseTime = 
        (performanceMetrics.current.averageResponseTime * (performanceMetrics.current.pollCount - 1) + responseTime) / performanceMetrics.current.pollCount
      
      // Performance Monitor에 메트릭 기록
      if (config.performanceOptimization?.enablePerformanceMonitoring) {
        performanceMonitor.recordMetric('collaborationPollTime', responseTime, {
          pollCount: performanceMetrics.current.pollCount,
          currentInterval: currentInterval.current
        })
      }
      
      return result
    } catch (error) {
      retryCount.current++
      performanceMetrics.current.errorCount++
      
      console.warn('[Collaboration] Poll failed:', error, 'Retry count:', retryCount.current)
      throw error
    } finally {
      lastPollRequest.current = null
    }
  }, [dispatch, config.enabled, config.requestDeduplication, config.performanceOptimization])
  
  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current || !config.enabled) return
    
    // 즉시 한 번 실행
    executePoll()
    
    // 적응형 인터벌로 폴링 시작
    const scheduleNextPoll = () => {
      currentInterval.current = calculateAdaptiveInterval()
      
      pollingIntervalRef.current = setTimeout(() => {
        executePoll().finally(() => {
          pollingIntervalRef.current = null
          scheduleNextPoll()
        })
      }, currentInterval.current)
    }
    
    scheduleNextPoll()
  }, [config.enabled, executePoll, calculateAdaptiveInterval])
  
  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])
  
  // 수동 폴링 (새로고침 버튼용)
  const poll = useCallback(async () => {
    dispatch(pollCollaborationData())
  }, [dispatch])
  
  // ===========================
  // 낙관적 업데이트 & 제출
  // ===========================
  
  const performOptimisticUpdateAction = useCallback((payload: OptimisticUpdatePayload) => {
    // 1. 즉시 UI에 반영 (낙관적 업데이트)
    dispatch(performOptimisticUpdate(payload))
    
    // 2. 서버에 제출할 변경사항 생성
    const change: CollaborationChange = {
      id: payload.changeId,
      userId: 'current_user', // 실제로는 auth에서 가져옴
      userName: '현재사용자',
      type: payload.resourceType as 'video-planning' | 'calendar-event',
      action: payload.action,
      resourceId: payload.resourceId,
      resourceType: payload.resourceType,
      data: payload.data,
      timestamp: new Date().toISOString(),
      version: Date.now()
    }
    
    // 3. 중복 제출 방지
    if (pendingSubmissions.current.has(payload.changeId)) {
      return
    }
    
    pendingSubmissions.current.add(payload.changeId)
    
    // 4. 디바운스된 서버 제출
    debouncedSubmit(change)
  }, [dispatch])
  
  // 디바운스된 제출 함수
  const debouncedSubmit = useDebounce(
    useCallback(async (change: CollaborationChange) => {
      try {
        dispatch(submitChange(change))
      } finally {
        pendingSubmissions.current.delete(change.id)
      }
    }, [dispatch]),
    config.debounceDelay
  )
  
  // ===========================
  // 충돌 해결
  // ===========================
  
  const resolveConflictAction = useCallback((payload: ConflictResolutionPayload) => {
    dispatch(resolveConflict(payload))
    
    // 충돌이 모두 해결되었으면 모달 닫기
    const remainingConflicts = conflicts.filter(c => c.id !== payload.conflictId)
    if (remainingConflicts.length === 0) {
      dispatch({ type: 'collaboration/hideConflictModal' })
    }
  }, [dispatch, conflicts])
  
  // ===========================
  // UI 제어 함수들
  // ===========================
  
  const showConflicts = useCallback(() => {
    dispatch({ type: 'collaboration/showConflictModal' })
  }, [dispatch])
  
  const hideConflicts = useCallback(() => {
    dispatch({ type: 'collaboration/hideConflictModal' })
  }, [dispatch])
  
  const showActivity = useCallback(() => {
    dispatch({ type: 'collaboration/showActivityFeed' })
  }, [dispatch])
  
  const hideActivity = useCallback(() => {
    dispatch({ type: 'collaboration/hideActivityFeed' })
  }, [dispatch])
  
  // ===========================
  // 생명주기 관리
  // ===========================
  
  // 컴포넌트 마운트 시 폴링 시작
  useEffect(() => {
    if (config.enabled) {
      startPolling()
    }
    
    return () => {
      stopPolling()
    }
  }, [config.enabled, startPolling, stopPolling])
  
  // 새로운 충돌 발생 시 모달 자동 표시
  useEffect(() => {
    if (config.detectConflicts && conflicts.length > 0 && !showConflictModal) {
      dispatch({ type: 'collaboration/showConflictModal' })
    }
  }, [conflicts.length, config.detectConflicts, showConflictModal, dispatch])
  
  // 사용자 활동 추적 및 윈도우 포커스/블러 처리
  useEffect(() => {
    const updateUserActivity = () => {
      userActivity.current.isActive = true
      userActivity.current.lastActivity = Date.now()
    }
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateUserActivity()
        if (config.enabled && !pollingIntervalRef.current) {
          startPolling()
        }
      }
      // 백그라운드 상태에서는 적응형 간격으로 자동 조정됨
    }
    
    const handleFocus = () => {
      updateUserActivity()
      if (config.enabled && !pollingIntervalRef.current) {
        startPolling()
      }
    }
    
    // 사용자 상호작용 이벤트 추적
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
    
    activityEvents.forEach(event => {
      document.addEventListener(event, updateUserActivity, { passive: true })
    })
    
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    
    return () => {
      activityEvents.forEach(event => {
        document.removeEventListener(event, updateUserActivity)
      })
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [config.enabled, startPolling])
  
  // ===========================
  // 반환값 구성
  // ===========================
  
  return {
    state: {
      activeUsers,
      recentChanges,
      pendingChanges: {}, // 실제로는 slice에서 가져와야 하지만 단순화
      conflicts,
      isPolling,
      lastPolled: null, // 실제로는 slice에서 가져와야 함
      pollingError,
      showConflictModal,
      showActivityFeed,
      // 성능 메트릭 추가
      performance: {
        currentInterval: currentInterval.current,
        averageResponseTime: performanceMetrics.current.averageResponseTime,
        pollCount: performanceMetrics.current.pollCount,
        errorCount: performanceMetrics.current.errorCount,
        errorRate: performanceMetrics.current.pollCount > 0 
          ? performanceMetrics.current.errorCount / performanceMetrics.current.pollCount 
          : 0
      }
    },
    actions: {
      performOptimisticUpdate: performOptimisticUpdateAction,
      poll,
      resolveConflict: resolveConflictAction,
      startPolling,
      stopPolling,
      showConflicts,
      hideConflicts,
      showActivity,
      hideActivity,
      // 성능 관련 액션 추가
      forceAdaptiveRecalculation: () => {
        if (pollingIntervalRef.current) {
          stopPolling()
          startPolling()
        }
      },
      getPerformanceMetrics: () => ({ 
        ...performanceMetrics.current,
        currentInterval: currentInterval.current,
        errorRate: performanceMetrics.current.pollCount > 0 
          ? performanceMetrics.current.errorCount / performanceMetrics.current.pollCount 
          : 0
      })
    }
  }
}

// ===========================
// 특화된 훅들
// ===========================

/**
 * 비디오 기획용 협업 훅 - 고성능 최적화
 */
export function useVideoPlanningCollaboration() {
  return useCollaboration({
    adaptivePolling: {
      ...ADAPTIVE_POLLING_CONFIG,
      baseInterval: 1500, // 더 빠른 기본 간격
      activityBasedAdjustment: {
        enabled: true,
        activeMultiplier: 0.7, // 매우 활성적인 폴링
        inactiveMultiplier: 1.8 // 비활성 시 적당히 느린 폴링
      }
    },
    detectConflicts: true,
    showActivityFeed: true,
    debounceDelay: 200, // 더 빠른 응답성
    performanceOptimization: {
      enableRequestBatching: true,
      enableSmartCaching: true,
      maxCacheAge: 8000, // 8초 캐시
      enablePerformanceMonitoring: true
    }
  })
}

/**
 * 캘린더용 협업 훅 - 균형잡힌 최적화
 */
export function useCalendarCollaboration() {
  return useCollaboration({
    adaptivePolling: {
      ...ADAPTIVE_POLLING_CONFIG,
      baseInterval: 3000, // 기본 간격
      activityBasedAdjustment: {
        enabled: true,
        activeMultiplier: 0.8,
        inactiveMultiplier: 2.5 // 비활성 시 더 느린 폴링
      }
    },
    detectConflicts: true,
    showActivityFeed: false,
    performanceOptimization: {
      enableRequestBatching: true,
      enableSmartCaching: true,
      maxCacheAge: 15000, // 15초 캐시
      enablePerformanceMonitoring: true
    }
  })
}

/**
 * 읽기 전용 협업 훅 - 최소 리소스 사용
 */
export function useReadOnlyCollaboration() {
  return useCollaboration({
    adaptivePolling: {
      ...ADAPTIVE_POLLING_CONFIG,
      baseInterval: 8000, // 느린 기본 간격
      maxInterval: 60000, // 최대 1분
      activityBasedAdjustment: {
        enabled: true,
        activeMultiplier: 1.0, // 활성 시에도 느림 유지
        inactiveMultiplier: 3.0 // 비활성 시 매우 느림
      },
      backgroundMultiplier: 5 // 백그라운드에서 매우 느림
    },
    detectConflicts: false,
    showActivityFeed: true,
    debounceDelay: 1000, // 더 긴 디바운스
    performanceOptimization: {
      enableRequestBatching: true,
      enableSmartCaching: true,
      maxCacheAge: 30000, // 30초 캐시
      enablePerformanceMonitoring: false // 성능 모니터링 비활성화
    }
  })
}