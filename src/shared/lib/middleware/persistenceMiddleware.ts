/**
 * @file Persistence Middleware
 * @description 데이터 영속성, 세션 관리 및 오프라인 지원
 */

import { createListenerMiddleware } from '@reduxjs/toolkit'
import { z } from 'zod'
import type { RootState } from '@/shared/types/store'
import { validateRootState } from '@/shared/types/store'

// ============================================================================
// 영속성 설정 및 스키마
// ============================================================================

/**
 * LocalStorage 키 정의
 */
const STORAGE_KEYS = {
  AUTH_TOKEN: 'vlanet_auth_token',
  REFRESH_TOKEN: 'vlanet_refresh_token',
  USER_PREFERENCES: 'vlanet_user_preferences',
  PIPELINE_PROGRESS: 'vlanet_pipeline_progress',
  SESSION_DATA: 'vlanet_session_data',
  OFFLINE_QUEUE: 'vlanet_offline_queue',
  LAST_SYNC: 'vlanet_last_sync'
} as const

/**
 * 저장 가능한 상태 스키마
 */
const PersistableStateSchema = z.object({
  auth: z.object({
    rememberMe: z.boolean(),
    preferredLanguage: z.string(),
    refreshToken: z.string().nullable()
  }).partial(),
  pipeline: z.object({
    currentStep: z.string(),
    completedSteps: z.array(z.string()),
    userProgress: z.any(),
    sessionData: z.any()
  }).partial(),
  preferences: z.object({
    theme: z.string().optional(),
    language: z.string().optional(),
    notifications: z.boolean().optional()
  }).optional()
})

/**
 * 오프라인 큐 아이템 스키마
 */
const OfflineQueueItemSchema = z.object({
  id: z.string(),
  action: z.object({
    type: z.string(),
    payload: z.any()
  }),
  timestamp: z.number(),
  retryCount: z.number().default(0),
  maxRetries: z.number().default(3),
  critical: z.boolean().default(false)
})

type OfflineQueueItem = z.infer<typeof OfflineQueueItemSchema>

// ============================================================================
// 영속성 미들웨어 생성
// ============================================================================

export const persistenceMiddleware = createListenerMiddleware()

// ============================================================================
// 로컬 스토리지 유틸리티
// ============================================================================

/**
 * 안전한 localStorage 읽기
 */
const safeLocalStorageGet = (key: string): any => {
  try {
    if (typeof window === 'undefined') return null
    
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : null
  } catch (error) {
    console.warn(`Failed to read from localStorage key: ${key}`, error)
    return null
  }
}

/**
 * 안전한 localStorage 쓰기
 */
const safeLocalStorageSet = (key: string, value: any): boolean => {
  try {
    if (typeof window === 'undefined') return false
    
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch (error) {
    console.warn(`Failed to write to localStorage key: ${key}`, error)
    return false
  }
}

/**
 * localStorage 클리어
 */
const clearStorageKey = (key: string): void => {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key)
    }
  } catch (error) {
    console.warn(`Failed to remove localStorage key: ${key}`, error)
  }
}

// ============================================================================
// 인증 상태 영속성
// ============================================================================

/**
 * 로그인 성공 시 토큰 저장
 */
persistenceMiddleware.startListening({
  predicate: (action) => action.type.includes('auth/login') && action.type.includes('fulfilled'),
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    
    if (state.auth.rememberMe && state.auth.refreshToken) {
      safeLocalStorageSet(STORAGE_KEYS.REFRESH_TOKEN, state.auth.refreshToken)
    }
    
    // 사용자 환경설정 저장
    if (state.auth.user) {
      safeLocalStorageSet(STORAGE_KEYS.USER_PREFERENCES, {
        language: state.auth.preferredLanguage,
        userId: state.auth.user.id
      })
    }
    
    console.log('✅ Persistence: Auth data saved to localStorage')
  }
})

/**
 * 로그아웃 시 데이터 클리어
 */
persistenceMiddleware.startListening({
  predicate: (action) => action.type.includes('auth/logout') || action.type.includes('auth/reset'),
  effect: async (action, listenerApi) => {
    // 민감한 데이터 제거
    clearStorageKey(STORAGE_KEYS.AUTH_TOKEN)
    clearStorageKey(STORAGE_KEYS.REFRESH_TOKEN)
    clearStorageKey(STORAGE_KEYS.SESSION_DATA)
    
    // 파이프라인 진행 상황도 클리어 (선택적)
    const state = listenerApi.getState() as RootState
    if (!state.auth.rememberMe) {
      clearStorageKey(STORAGE_KEYS.PIPELINE_PROGRESS)
    }
    
    console.log('✅ Persistence: Auth data cleared from localStorage')
  }
})

// ============================================================================
// 파이프라인 진행 상황 영속성
// ============================================================================

/**
 * 파이프라인 단계 변경 시 진행 상황 저장
 */
persistenceMiddleware.startListening({
  predicate: (action) => action.type.includes('pipeline/update'),
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    
    if (state.auth.isAuthenticated) {
      const pipelineData = {
        currentStep: state.pipeline.currentStep,
        completedSteps: state.pipeline.completedSteps,
        userProgress: {
          projects: state.pipeline.userProgress.projects,
          currentProject: state.pipeline.userProgress.currentProject
        },
        lastSaved: Date.now()
      }
      
      safeLocalStorageSet(STORAGE_KEYS.PIPELINE_PROGRESS, pipelineData)
      console.log(`✅ Persistence: Pipeline progress saved (${state.pipeline.currentStep})`)
    }
  }
})

// ============================================================================
// 세션 관리
// ============================================================================

/**
 * 세션 데이터 자동 저장
 */
persistenceMiddleware.startListening({
  predicate: (action) => action.type.includes('updateActivity') || action.type.includes('setSessionTimeout'),
  effect: async (action, listenerApi) => {
    const state = listenerApi.getState() as RootState
    
    if (state.auth.isAuthenticated) {
      const sessionData = {
        lastActivity: state.pipeline.sessionData.lastActivity,
        timeSpent: state.pipeline.sessionData.timeSpent,
        sessionTimeout: state.auth.sessionTimeout,
        userId: state.auth.user?.id
      }
      
      safeLocalStorageSet(STORAGE_KEYS.SESSION_DATA, sessionData)
    }
  }
})

/**
 * 세션 타임아웃 체크
 */
let sessionTimeoutInterval: NodeJS.Timeout | null = null

persistenceMiddleware.startListening({
  predicate: (action) => action.type.includes('auth/login') && action.type.includes('fulfilled'),
  effect: async (action, listenerApi) => {
    // 기존 타이머 클리어
    if (sessionTimeoutInterval) {
      clearInterval(sessionTimeoutInterval)
    }
    
    // 5분마다 세션 체크
    sessionTimeoutInterval = setInterval(() => {
      const state = listenerApi.getState() as RootState
      
      if (state.auth.isAuthenticated && state.auth.sessionTimeout) {
        const lastActivity = new Date(state.pipeline.sessionData.lastActivity || 0)
        const now = new Date()
        const timeoutMs = state.auth.sessionTimeout * 1000
        
        if (now.getTime() - lastActivity.getTime() > timeoutMs) {
          console.log('⏰ Session timeout, logging out user')
          listenerApi.dispatch({ type: 'auth/logout' })
        }
      }
    }, 5 * 60 * 1000) // 5분
    
    console.log('✅ Persistence: Session timeout monitor started')
  }
})

// ============================================================================
// 오프라인 지원
// ============================================================================

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true
let offlineQueue: OfflineQueueItem[] = []

/**
 * 오프라인 큐 초기화
 */
const initializeOfflineQueue = () => {
  const savedQueue = safeLocalStorageGet(STORAGE_KEYS.OFFLINE_QUEUE)
  if (savedQueue && Array.isArray(savedQueue)) {
    offlineQueue = savedQueue.filter(item => {
      try {
        return OfflineQueueItemSchema.parse(item)
      } catch {
        return false
      }
    })
  }
}

/**
 * 오프라인 액션 큐 관리
 */
persistenceMiddleware.startListening({
  predicate: (action) => {
    // API 요청 액션들을 오프라인 큐에 추가
    return !isOnline && (
      action.type.includes('api/') ||
      action.type.includes('mutation') ||
      action.type.includes('update') && action.type.includes('async')
    )
  },
  effect: async (action, listenerApi) => {
    const queueItem: OfflineQueueItem = {
      id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      action: {
        type: action.type,
        payload: action.payload
      },
      timestamp: Date.now(),
      retryCount: 0,
      maxRetries: 3,
      critical: action.type.includes('auth/') || action.type.includes('save')
    }
    
    offlineQueue.push(queueItem)
    safeLocalStorageSet(STORAGE_KEYS.OFFLINE_QUEUE, offlineQueue)
    
    console.log(`📱 Offline: Action queued (${action.type})`)
  }
})

/**
 * 온라인 복귀 시 큐 처리
 */
const processOfflineQueue = async (listenerApi: any) => {
  console.log(`📡 Online: Processing ${offlineQueue.length} queued actions`)
  
  const processPromises = offlineQueue.map(async (queueItem) => {
    try {
      // 액션 재실행
      await listenerApi.dispatch(queueItem.action)
      return queueItem.id
    } catch (error) {
      queueItem.retryCount++
      
      if (queueItem.retryCount >= queueItem.maxRetries) {
        console.error(`❌ Offline queue: Max retries reached for ${queueItem.action.type}`)
        return queueItem.id
      } else {
        console.warn(`⚠️ Offline queue: Retry ${queueItem.retryCount}/${queueItem.maxRetries} for ${queueItem.action.type}`)
        return null // 재시도 대상
      }
    }
  })
  
  const processedIds = await Promise.all(processPromises)
  
  // 처리된 항목들 제거
  offlineQueue = offlineQueue.filter((item, index) => 
    processedIds[index] === null
  )
  
  safeLocalStorageSet(STORAGE_KEYS.OFFLINE_QUEUE, offlineQueue)
}

// 네트워크 상태 모니터링
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    isOnline = true
    console.log('📡 Network: Back online')
    
    // 큐 처리는 스토어가 초기화된 후에 실행
    setTimeout(() => {
      // processOfflineQueue 호출 (listenerApi 필요 시 별도 처리)
    }, 1000)
  })
  
  window.addEventListener('offline', () => {
    isOnline = false
    console.log('📱 Network: Gone offline')
  })
}

// ============================================================================
// 상태 복원
// ============================================================================

/**
 * 앱 시작 시 저장된 상태 복원
 */
export const restorePersistedState = async (): Promise<Partial<RootState> | null> => {
  try {
    const [
      refreshToken,
      userPreferences,
      pipelineProgress,
      sessionData
    ] = await Promise.all([
      safeLocalStorageGet(STORAGE_KEYS.REFRESH_TOKEN),
      safeLocalStorageGet(STORAGE_KEYS.USER_PREFERENCES),
      safeLocalStorageGet(STORAGE_KEYS.PIPELINE_PROGRESS),
      safeLocalStorageGet(STORAGE_KEYS.SESSION_DATA)
    ])
    
    const restoredState: Partial<RootState> = {}
    
    // 인증 상태 복원
    if (refreshToken) {
      restoredState.auth = {
        refreshToken,
        rememberMe: true,
        preferredLanguage: userPreferences?.language || 'ko',
        // 다른 필드들은 기본값 사용
        isAuthenticated: false,
        user: null,
        loading: false,
        error: null,
        token: null
      } as any
    }
    
    // 파이프라인 상태 복원
    if (pipelineProgress && pipelineProgress.lastSaved) {
      const timeDiff = Date.now() - pipelineProgress.lastSaved
      
      // 24시간 이내 데이터만 복원
      if (timeDiff < 24 * 60 * 60 * 1000) {
        restoredState.pipeline = {
          currentStep: pipelineProgress.currentStep,
          completedSteps: pipelineProgress.completedSteps || [],
          userProgress: pipelineProgress.userProgress || {
            profile: null,
            projects: [],
            currentProject: null,
            planningDrafts: []
          }
        } as any
      }
    }
    
    console.log('✅ Persistence: State restored from localStorage')
    return restoredState
    
  } catch (error) {
    console.error('❌ Persistence: Failed to restore state', error)
    return null
  }
}

/**
 * 저장된 데이터 클리어
 */
export const clearPersistedData = () => {
  Object.values(STORAGE_KEYS).forEach(key => {
    clearStorageKey(key)
  })
  
  console.log('✅ Persistence: All persisted data cleared')
}

/**
 * 데이터 백업/내보내기
 */
export const exportUserData = (): string | null => {
  try {
    const userData: Record<string, any> = {}
    
    Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
      const data = safeLocalStorageGet(storageKey)
      if (data) {
        userData[key] = data
      }
    })
    
    return JSON.stringify({
      version: '1.0',
      timestamp: Date.now(),
      data: userData
    }, null, 2)
    
  } catch (error) {
    console.error('❌ Failed to export user data', error)
    return null
  }
}

// ============================================================================
// 초기화
// ============================================================================

if (typeof window !== 'undefined') {
  initializeOfflineQueue()
}

// ============================================================================
// 개발 도구
// ============================================================================

if (process.env.NODE_ENV === 'development') {
  ;(window as any).__VLANET_PERSISTENCE__ = {
    getStorageData: () => {
      const data: Record<string, any> = {}
      Object.entries(STORAGE_KEYS).forEach(([key, storageKey]) => {
        data[key] = safeLocalStorageGet(storageKey)
      })
      return data
    },
    clearData: clearPersistedData,
    exportData: exportUserData,
    getOfflineQueue: () => offlineQueue,
    isOnline: () => isOnline
  }
}

export default persistenceMiddleware