/**
 * 알림 캐시 관리자
 * 
 * 기능:
 * - RTK Query 캐시 최적화 및 무효화 전략
 * - 실시간 업데이트와 캐시 동기화
 * - 메모리 사용량 최적화
 * - 성능 모니터링 및 지표 수집
 */

import { createApi, fetchBaseQuery, BaseQueryFn } from '@reduxjs/toolkit/query/react'
import { notificationApi } from '../../features/notifications/api/notificationApi'

// 캐시 성능 메트릭
interface CacheMetrics {
  hitRate: number
  missRate: number
  invalidationCount: number
  averageResponseTime: number
  memoryUsage: number
  lastOptimizedAt: Date
}

// 캐시 정책 설정
interface CachePolicy {
  // 캐시 유지 시간 (초)
  keepUnusedDataFor: number
  // 자동 리패치 간격 (초)
  pollingInterval?: number
  // 최대 캐시 크기 (항목 수)
  maxCacheSize: number
  // 백그라운드 리패치 활성화
  refetchOnWindowFocus: boolean
  // 재연결 시 리패치
  refetchOnReconnect: boolean
}

// 기본 캐시 정책
const DEFAULT_CACHE_POLICY: CachePolicy = {
  keepUnusedDataFor: 300, // 5분
  maxCacheSize: 1000,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true
}

/**
 * 알림 캐시 관리자 클래스
 */
export class NotificationCacheManager {
  private metrics: CacheMetrics = {
    hitRate: 0,
    missRate: 0,
    invalidationCount: 0,
    averageResponseTime: 0,
    memoryUsage: 0,
    lastOptimizedAt: new Date()
  }
  
  private policy: CachePolicy
  private optimizationTimer: NodeJS.Timeout | null = null
  
  constructor(policy: Partial<CachePolicy> = {}) {
    this.policy = { ...DEFAULT_CACHE_POLICY, ...policy }
    this.startOptimizationSchedule()
  }

  /**
   * 실시간 이벤트에 따른 캐시 무효화
   */
  invalidateOnRealtimeEvent(eventType: string, payload: any, store: any): void {
    const dispatch = store.dispatch
    
    switch (eventType) {
      case 'notification_created':
        // 새 알림 생성 시
        this.invalidateNotificationList(dispatch)
        this.invalidateUnreadCount(dispatch)
        this.metrics.invalidationCount++
        break
        
      case 'notification_read':
        // 알림 읽음 처리 시
        this.invalidateSpecificNotification(dispatch, payload.notificationId)
        this.invalidateUnreadCount(dispatch)
        this.metrics.invalidationCount++
        break
        
      case 'notification_archived':
        // 알림 아카이브 시
        this.invalidateNotificationList(dispatch)
        this.invalidateUnreadCount(dispatch)
        this.metrics.invalidationCount++
        break
        
      case 'bulk_notifications_read':
        // 대량 읽음 처리 시
        payload.notificationIds.forEach((id: string) => {
          this.invalidateSpecificNotification(dispatch, id)
        })
        this.invalidateUnreadCount(dispatch)
        this.metrics.invalidationCount += payload.notificationIds.length
        break
    }
  }

  /**
   * 알림 목록 캐시 무효화
   */
  private invalidateNotificationList(dispatch: any): void {
    dispatch(
      notificationApi.util.invalidateTags(['Notification'])
    )
  }

  /**
   * 읽지 않은 알림 카운트 캐시 무효화
   */
  private invalidateUnreadCount(dispatch: any): void {
    dispatch(
      notificationApi.util.invalidateTags(['NotificationCount'])
    )
  }

  /**
   * 특정 알림 캐시 무효화
   */
  private invalidateSpecificNotification(dispatch: any, notificationId: string): void {
    dispatch(
      notificationApi.util.invalidateTags([
        { type: 'Notification', id: notificationId }
      ])
    )
  }

  /**
   * 선택적 캐시 업데이트 (무효화보다 효율적)
   */
  updateCacheOptimistically(eventType: string, payload: any, store: any): void {
    const dispatch = store.dispatch
    const getState = store.getState
    
    switch (eventType) {
      case 'notification_read':
        // 읽음 상태 업데이트
        this.updateNotificationReadStatus(dispatch, getState, payload.notificationId, true)
        this.decrementUnreadCount(dispatch, getState)
        break
        
      case 'notification_created':
        // 새 알림을 캐시에 직접 추가
        this.addNotificationToCache(dispatch, getState, payload.notification)
        this.incrementUnreadCount(dispatch, getState)
        break
    }
  }

  /**
   * 알림 읽음 상태 업데이트
   */
  private updateNotificationReadStatus(dispatch: any, getState: any, notificationId: string, isRead: boolean): void {
    // RTK Query 캐시의 모든 알림 목록에서 해당 알림의 상태 업데이트
    const queries = notificationApi.util.selectInvalidatedBy(getState(), ['Notification'])
    
    queries.forEach(query => {
      if (query.endpointName === 'getNotifications') {
        dispatch(
          notificationApi.util.updateQueryData(
            'getNotifications', 
            query.originalArgs,
            (draft) => {
              const notification = draft.notifications.find(n => n.id === notificationId)
              if (notification) {
                notification.status = isRead ? 'read' : 'unread'
                notification.readAt = isRead ? new Date() : undefined
              }
            }
          )
        )
      }
    })
  }

  /**
   * 읽지 않은 알림 카운트 증가
   */
  private incrementUnreadCount(dispatch: any, getState: any): void {
    const queries = notificationApi.util.selectInvalidatedBy(getState(), ['NotificationCount'])
    
    queries.forEach(query => {
      if (query.endpointName === 'getUnreadCount') {
        dispatch(
          notificationApi.util.updateQueryData(
            'getUnreadCount',
            query.originalArgs,
            (draft) => draft + 1
          )
        )
      }
    })
  }

  /**
   * 읽지 않은 알림 카운트 감소
   */
  private decrementUnreadCount(dispatch: any, getState: any): void {
    const queries = notificationApi.util.selectInvalidatedBy(getState(), ['NotificationCount'])
    
    queries.forEach(query => {
      if (query.endpointName === 'getUnreadCount') {
        dispatch(
          notificationApi.util.updateQueryData(
            'getUnreadCount',
            query.originalArgs,
            (draft) => Math.max(0, draft - 1)
          )
        )
      }
    })
  }

  /**
   * 새 알림을 캐시에 추가
   */
  private addNotificationToCache(dispatch: any, getState: any, notification: any): void {
    const queries = notificationApi.util.selectInvalidatedBy(getState(), ['Notification'])
    
    queries.forEach(query => {
      if (query.endpointName === 'getNotifications') {
        dispatch(
          notificationApi.util.updateQueryData(
            'getNotifications',
            query.originalArgs,
            (draft) => {
              // 최신 알림을 목록 앞에 추가
              draft.notifications.unshift(notification)
              draft.total += 1
              draft.unreadCount += notification.status === 'unread' ? 1 : 0
              
              // 최대 크기 제한
              if (draft.notifications.length > this.policy.maxCacheSize) {
                draft.notifications.pop()
                draft.hasMore = true
              }
            }
          )
        )
      }
    })
  }

  /**
   * 캐시 최적화 실행
   */
  optimizeCache(store: any): void {
    const state = store.getState()
    const dispatch = store.dispatch
    
    // 사용하지 않는 캐시 항목 정리
    this.cleanupUnusedCache(dispatch, state)
    
    // 메모리 사용량 계산
    this.calculateMemoryUsage(state)
    
    // 캐시 히트율 계산
    this.calculateHitRate(state)
    
    this.metrics.lastOptimizedAt = new Date()
    
    console.log('[NotificationCache] Cache optimized:', this.metrics)
  }

  /**
   * 사용하지 않는 캐시 정리
   */
  private cleanupUnusedCache(dispatch: any, state: any): void {
    const now = Date.now()
    const maxAge = this.policy.keepUnusedDataFor * 1000
    
    // RTK Query 내부 캐시 상태 확인
    const apiState = state.api?.notificationApi
    if (!apiState) return
    
    const expiredQueries = Object.entries(apiState.queries)
      .filter(([_, queryData]: [string, any]) => {
        const lastUsed = queryData.fulfilledTimeStamp || queryData.startedTimeStamp
        return lastUsed && (now - lastUsed) > maxAge
      })
      .map(([queryKey]) => queryKey)
    
    // 만료된 쿼리 제거
    expiredQueries.forEach(queryKey => {
      dispatch(
        notificationApi.util.removeQueryData(queryKey)
      )
    })
    
    if (expiredQueries.length > 0) {
      console.log(`[NotificationCache] Cleaned up ${expiredQueries.length} expired cache entries`)
    }
  }

  /**
   * 메모리 사용량 계산
   */
  private calculateMemoryUsage(state: any): void {
    const apiState = state.api?.notificationApi
    if (!apiState) return
    
    // 대략적인 메모리 사용량 계산 (JSON 문자열 크기 기준)
    const cacheSize = JSON.stringify(apiState).length
    this.metrics.memoryUsage = Math.round(cacheSize / 1024) // KB 단위
  }

  /**
   * 캐시 히트율 계산
   */
  private calculateHitRate(state: any): void {
    const apiState = state.api?.notificationApi
    if (!apiState) return
    
    const queries = Object.values(apiState.queries) as any[]
    const totalQueries = queries.length
    const cacheHits = queries.filter(q => q.data && !q.isLoading).length
    
    if (totalQueries > 0) {
      this.metrics.hitRate = Math.round((cacheHits / totalQueries) * 100)
      this.metrics.missRate = 100 - this.metrics.hitRate
    }
  }

  /**
   * 성능 메트릭 반환
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics }
  }

  /**
   * 캐시 정책 업데이트
   */
  updatePolicy(newPolicy: Partial<CachePolicy>): void {
    this.policy = { ...this.policy, ...newPolicy }
    console.log('[NotificationCache] Policy updated:', this.policy)
  }

  /**
   * 최적화 스케줄 시작
   */
  private startOptimizationSchedule(): void {
    // 5분마다 캐시 최적화 실행
    this.optimizationTimer = setInterval(() => {
      // store 인스턴스가 필요하므로 외부에서 호출되도록 이벤트 발생
      window.dispatchEvent(new CustomEvent('cacheOptimizationNeeded'))
    }, 5 * 60 * 1000)
  }

  /**
   * 리소스 정리
   */
  destroy(): void {
    if (this.optimizationTimer) {
      clearInterval(this.optimizationTimer)
      this.optimizationTimer = null
    }
    
    console.log('[NotificationCache] Cache manager destroyed')
  }
}

// 싱글톤 인스턴스
let cacheManagerInstance: NotificationCacheManager | null = null

/**
 * 캐시 매니저 싱글톤 인스턴스 반환
 */
export function getNotificationCacheManager(policy?: Partial<CachePolicy>): NotificationCacheManager {
  if (!cacheManagerInstance) {
    cacheManagerInstance = new NotificationCacheManager(policy)
  }
  return cacheManagerInstance
}

/**
 * 캐시 매니저 종료
 */
export function destroyNotificationCacheManager(): void {
  if (cacheManagerInstance) {
    cacheManagerInstance.destroy()
    cacheManagerInstance = null
  }
}