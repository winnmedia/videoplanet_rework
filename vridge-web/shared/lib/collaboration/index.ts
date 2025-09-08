/**
 * @fileoverview 협업 시스템 공개 API
 * @description 협업 시스템의 모든 기능을 한 곳에서 export
 */

// ===========================
// 타입들 export
// ===========================
export type {
  CollaborationUser,
  CollaborationChange,
  CollaborationState,
  CollaborationConflict,
  OptimisticUpdatePayload,
  PollingResponsePayload,
  ConflictResolutionPayload
} from './types'

// ===========================
// 핵심 훅들
// ===========================
export {
  useCollaboration,
  useVideoPlanningCollaboration,
  useCalendarCollaboration,
  useReadOnlyCollaboration
} from './hooks/useCollaboration'

// ===========================
// Redux 슬라이스 및 액션들
// ===========================
export {
  default as collaborationSlice,
  pollCollaborationData,
  submitChange,
  performOptimisticUpdate,
  resolveConflict,
  showConflictModal,
  hideConflictModal,
  showActivityFeed,
  hideActivityFeed,
  clearPollingError,
  selectActiveUsers,
  selectRecentChanges,
  selectConflicts,
  selectIsPolling,
  selectPollingError,
  selectShowConflictModal,
  selectShowActivityFeed,
  selectPendingChangesCount
} from './slice'

// ===========================
// 훅 타입 정의들
// ===========================
export type {
  UseCollaborationOptions,
  UseCollaborationReturn,
  CollaborationIndicatorProps,
  ConflictModalProps,
  ActivityFeedProps,
  CollaborationApiResponse,
  SubmitChangeApiResponse
} from './types'

// ===========================
// HOC (고차 컴포넌트)들
// ===========================
export {
  withVideoPlanningCollaboration,
  withCalendarCollaboration,
  withCollaboration,
  hasCollaborationProps
} from './hocs/withCollaboration'

export type {
  CollaborationInjectedProps,
  CollaborationHocOptions
} from './hocs/withCollaboration'

// ===========================
// 유틸리티 및 헬퍼들
// ===========================

/**
 * 협업 시스템이 활성화되었는지 확인
 */
export const isCollaborationEnabled = (): boolean => {
  return process.env.NODE_ENV === 'development' || 
         process.env.NEXT_PUBLIC_ENABLE_COLLABORATION === 'true'
}

/**
 * 폴링 간격 상수들
 */
export const POLLING_INTERVALS = {
  VIDEO_PLANNING: 2000,    // 2초 - 빠른 협업이 필요
  CALENDAR: 5000,          // 5초 - 일반적인 협업
  READ_ONLY: 10000,        // 10초 - 읽기 전용
  BACKGROUND: 30000        // 30초 - 백그라운드
} as const

/**
 * 디바운스 지연시간 상수들
 */
export const DEBOUNCE_DELAYS = {
  FAST: 300,      // 300ms - 빠른 반응
  NORMAL: 500,    // 500ms - 기본
  SLOW: 1000      // 1초 - 느린 반응
} as const

/**
 * 협업 리소스 타입 체크 함수들
 */
export const isVideoPlanningResource = (resourceType: string): boolean => {
  return ['video-planning', 'planning-stage', 'video-shot', 'insert-shot'].includes(resourceType)
}

export const isCalendarResource = (resourceType: string): boolean => {
  return ['calendar-event', 'calendar-schedule'].includes(resourceType)
}

/**
 * 변경사항 우선순위 계산
 */
export const getChangePriority = (change: import('./types').CollaborationChange): 'low' | 'medium' | 'high' => {
  const timeDiff = Date.now() - new Date(change.timestamp).getTime()
  
  if (timeDiff < 60000) return 'high'      // 1분 이내
  if (timeDiff < 300000) return 'medium'   // 5분 이내
  return 'low'                             // 5분 이후
}

/**
 * 사용자 상태 체크
 */
export const getUserStatus = (user: import('./types').CollaborationUser): 'active' | 'idle' | 'offline' => {
  if (!user.isOnline) return 'offline'
  
  const lastActivity = new Date(user.lastActivity).getTime()
  const timeDiff = Date.now() - lastActivity
  
  if (timeDiff < 60000) return 'active'    // 1분 이내
  if (timeDiff < 300000) return 'idle'     // 5분 이내
  return 'offline'
}

// ===========================
// 개발용 디버깅 도구들
// ===========================

/**
 * 협업 상태 디버깅 정보 출력
 */
export const debugCollaborationState = (state: import('./types').CollaborationState): void => {
  if (process.env.NODE_ENV !== 'development') return
  
  console.group('🔄 Collaboration State Debug')
  console.log('Active Users:', state.activeUsers.length)
  console.log('Recent Changes:', state.recentChanges.length)
  console.log('Pending Changes:', Object.keys(state.pendingChanges).length)
  console.log('Conflicts:', state.conflicts.length)
  console.log('Is Polling:', state.isPolling)
  console.log('Last Polled:', state.lastPolled)
  console.log('Polling Error:', state.pollingError)
  console.groupEnd()
}

/**
 * 강제 충돌 생성 (개발/테스트용)
 */
export const forceConflict = async (resourceId: string, resourceType: string): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('forceConflict는 개발 환경에서만 사용할 수 있습니다.')
    return
  }
  
  try {
    await fetch('/api/collaboration/force-conflict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceId, resourceType })
    })
    console.log('🚨 강제 충돌이 생성되었습니다:', { resourceId, resourceType })
  } catch (error) {
    console.error('강제 충돌 생성 실패:', error)
  }
}

/**
 * 사용자 시뮬레이션 (개발/테스트용)
 */
export const simulateUser = async (
  action: 'join' | 'leave', 
  userData?: { name: string; role: 'owner' | 'editor' | 'viewer' }
): Promise<void> => {
  if (process.env.NODE_ENV !== 'development') {
    console.warn('simulateUser는 개발 환경에서만 사용할 수 있습니다.')
    return
  }
  
  try {
    await fetch('/api/collaboration/simulate-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        userId: `sim-user-${Date.now()}`,
        userData
      })
    })
    console.log('👤 사용자 시뮬레이션 완료:', { action, userData })
  } catch (error) {
    console.error('사용자 시뮬레이션 실패:', error)
  }
}

// ===========================
// Re-export 타입들 (import 편의성을 위해)
// ===========================