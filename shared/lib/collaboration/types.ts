/**
 * @fileoverview 협업 시스템 타입 정의
 * @description 단순한 폴링 기반 협업 시스템의 핵심 타입들
 */

// ===========================
// 기본 타입 정의
// ===========================

export interface CollaborationUser {
  id: string
  name: string
  avatar?: string
  role: 'owner' | 'editor' | 'viewer'
  lastActivity: string
  isOnline: boolean
}

export interface CollaborationChange {
  id: string
  userId: string
  userName: string
  type: 'video-planning' | 'calendar-event'
  action: 'create' | 'update' | 'delete'
  resourceId: string
  resourceType: string
  data: Record<string, unknown>
  timestamp: string
  version: number
}

export interface CollaborationState {
  // 현재 활성 사용자들
  activeUsers: CollaborationUser[]
  
  // 변경사항 히스토리 (최근 50개)
  recentChanges: CollaborationChange[]
  
  // 낙관적 업데이트 대기 중인 변경사항들
  pendingChanges: Record<string, CollaborationChange>
  
  // 충돌 발생한 변경사항들
  conflicts: CollaborationConflict[]
  
  // 폴링 상태
  isPolling: boolean
  lastPolled: string | null
  pollingError: string | null
  
  // UI 상태
  showConflictModal: boolean
  showActivityFeed: boolean
}

export interface CollaborationConflict {
  id: string
  resourceId: string
  resourceType: string
  localChange: CollaborationChange
  remoteChange: CollaborationChange
  resolvedAt?: string
  resolution?: 'local' | 'remote' | 'merged'
}

// ===========================
// 액션 타입 정의
// ===========================

export interface OptimisticUpdatePayload {
  changeId: string
  resourceId: string
  resourceType: string
  data: Record<string, unknown>
  action: 'create' | 'update' | 'delete'
}

export interface PollingResponsePayload {
  activeUsers: CollaborationUser[]
  recentChanges: CollaborationChange[]
  serverVersion: number
}

export interface ConflictResolutionPayload {
  conflictId: string
  resolution: 'local' | 'remote' | 'merged'
  mergedData?: Record<string, unknown>
}

// ===========================
// 성능 최적화 타입 정의
// ===========================

export interface AdaptivePollingConfig {
  // 기본 폴링 간격
  baseInterval: number
  
  // 최소/최대 간격 제한
  minInterval: number
  maxInterval: number
  
  // 백그라운드 상태 시 간격 승수
  backgroundMultiplier: number
  
  // 네트워크 상태 기반 조정
  networkAdjustments: {
    'slow-2g': number
    '2g': number
    '3g': number
    '4g': number
    'fast': number
  }
  
  // 지수 백오프 설정
  exponentialBackoff: {
    enabled: boolean
    maxRetries: number
    baseDelay: number
  }
  
  // 사용자 활동 기반 조정
  activityBasedAdjustment: {
    enabled: boolean
    activeMultiplier: number
    inactiveMultiplier: number
  }
}

export interface PerformanceOptimization {
  enableRequestBatching: boolean
  enableSmartCaching: boolean
  maxCacheAge: number
  enablePerformanceMonitoring: boolean
}

export interface CollaborationPerformanceMetrics {
  currentInterval: number
  averageResponseTime: number
  pollCount: number
  errorCount: number
  errorRate: number
}

// ===========================
// 훅 옵션 타입 (성능 최적화 포함)
// ===========================

export interface UseCollaborationOptions {
  // 기본 폴링 간격 (하위 호환성)
  pollInterval: number
  
  // 자동 폴링 활성화 여부
  enabled: boolean
  
  // 충돌 감지 활성화 여부
  detectConflicts: boolean
  
  // 활동 피드 표시 여부
  showActivityFeed: boolean
  
  // 디바운스 지연시간
  debounceDelay: number
  
  // 적응형 폴링 설정 (성능 최적화)
  adaptivePolling?: AdaptivePollingConfig
  
  // 요청 중복 제거 활성화
  requestDeduplication?: boolean
  
  // 성능 최적화 옵션
  performanceOptimization?: PerformanceOptimization
}

export interface UseCollaborationReturn {
  // 상태 (성능 메트릭 포함)
  state: CollaborationState & {
    performance: CollaborationPerformanceMetrics
  }
  
  // 액션들 (성능 최적화 액션 포함)
  actions: {
    // 낙관적 업데이트 수행
    performOptimisticUpdate: (payload: OptimisticUpdatePayload) => void
    
    // 수동 폴링 실행
    poll: () => Promise<void>
    
    // 충돌 해결
    resolveConflict: (payload: ConflictResolutionPayload) => void
    
    // 폴링 시작/중단
    startPolling: () => void
    stopPolling: () => void
    
    // UI 제어
    showConflicts: () => void
    hideConflicts: () => void
    showActivity: () => void
    hideActivity: () => void
    
    // 성능 최적화 액션
    forceAdaptiveRecalculation: () => void
    getPerformanceMetrics: () => CollaborationPerformanceMetrics
  }
}

// ===========================
// 컴포넌트 Props 타입
// ===========================

export interface CollaborationIndicatorProps {
  activeUsers: CollaborationUser[]
  className?: string
  maxDisplayUsers?: number
}

export interface ConflictModalProps {
  conflicts: CollaborationConflict[]
  onResolve: (payload: ConflictResolutionPayload) => void
  onClose: () => void
  isOpen: boolean
}

export interface ActivityFeedProps {
  changes: CollaborationChange[]
  activeUsers: CollaborationUser[]
  isOpen: boolean
  onClose: () => void
  className?: string
}

// ===========================
// API 응답 타입
// ===========================

export interface CollaborationApiResponse {
  success: boolean
  data: {
    activeUsers: CollaborationUser[]
    changes: CollaborationChange[]
    serverVersion: number
    timestamp: string
  }
  error?: string
}

export interface SubmitChangeApiResponse {
  success: boolean
  data: {
    changeId: string
    version: number
    conflicts?: CollaborationConflict[]
  }
  error?: string
}