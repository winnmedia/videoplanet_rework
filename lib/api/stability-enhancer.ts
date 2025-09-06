/**
 * API Stability Enhancer
 * Railway 백엔드 연동의 안정성을 극대화하는 통합 유틸리티
 */

import { config } from '@/lib/config/env'

import { ApiError, ApiResponse, ApiRequestConfig } from './client'
import { apiClient } from './client'

// 안정성 설정
interface StabilityConfig {
  /** 백엔드 상태 체크 간격 (밀리초) */
  healthCheckInterval: number
  /** 백엔드 오프라인 감지 임계값 (연속 실패 횟수) */
  offlineThreshold: number
  /** 캐시 사용 임계값 (응답 시간 밀리초) */
  cacheThreshold: number
  /** 폴백 데이터 사용 여부 */
  enableFallback: boolean
  /** 재시도 전략 */
  retryStrategy: 'exponential' | 'linear' | 'fixed'
}

const DEFAULT_STABILITY_CONFIG: StabilityConfig = {
  healthCheckInterval: 30000, // 30초
  offlineThreshold: 3,
  cacheThreshold: 2000, // 2초
  enableFallback: true,
  retryStrategy: 'exponential'
}

// 백엔드 상태 관리
class BackendHealthMonitor {
  private isOnline = true
  private consecutiveFailures = 0
  private lastHealthCheck = Date.now()
  private healthCheckTimer: NodeJS.Timeout | null = null
  private config: StabilityConfig

  constructor(config: StabilityConfig = DEFAULT_STABILITY_CONFIG) {
    this.config = config
    this.startHealthCheck()
  }

  private startHealthCheck() {
    if (typeof window === 'undefined') return // 서버 사이드에서는 실행하지 않음

    this.healthCheckTimer = setInterval(() => {
      this.checkBackendHealth()
    }, this.config.healthCheckInterval)
  }

  private async checkBackendHealth() {
    try {
      const startTime = Date.now()
      
      // Railway 백엔드 헬스체크 엔드포인트 호출
      const response = await fetch(`${config.get('backendUrl')}/health/`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000) // 5초 타임아웃
      })

      const responseTime = Date.now() - startTime

      if (response.ok) {
        this.consecutiveFailures = 0
        
        // 응답이 느리면 오프라인으로 간주하지는 않지만 경고
        if (responseTime > this.config.cacheThreshold) {
          console.warn(`🐌 Railway 백엔드 응답이 느립니다: ${responseTime}ms`)
        }
        
        if (!this.isOnline) {
          this.isOnline = true
          console.log('✅ Railway 백엔드가 다시 온라인 상태입니다')
          this.notifyBackendOnline()
        }
      } else {
        this.handleHealthCheckFailure('HTTP Error: ' + response.status)
      }
      
      this.lastHealthCheck = Date.now()
      
    } catch (error) {
      this.handleHealthCheckFailure(error instanceof Error ? error.message : 'Unknown error')
    }
  }

  private handleHealthCheckFailure(reason: string) {
    this.consecutiveFailures++
    
    if (this.consecutiveFailures >= this.config.offlineThreshold && this.isOnline) {
      this.isOnline = false
      console.error('❌ Railway 백엔드가 오프라인 상태입니다:', reason)
      this.notifyBackendOffline()
    }
  }

  private notifyBackendOnline() {
    // 이벤트 발송하여 UI에 알림
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backend:online'))
    }
  }

  private notifyBackendOffline() {
    // 이벤트 발송하여 UI에 알림
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('backend:offline'))
    }
  }

  public getStatus() {
    return {
      isOnline: this.isOnline,
      consecutiveFailures: this.consecutiveFailures,
      lastHealthCheck: this.lastHealthCheck,
      timeSinceLastCheck: Date.now() - this.lastHealthCheck
    }
  }

  public forceHealthCheck() {
    return this.checkBackendHealth()
  }

  public destroy() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
      this.healthCheckTimer = null
    }
  }
}

// 스마트 API 클라이언트 래퍼
class StableApiClient {
  private healthMonitor: BackendHealthMonitor
  private fallbackData: Map<string, any> = new Map()
  private config: StabilityConfig

  constructor(config: StabilityConfig = DEFAULT_STABILITY_CONFIG) {
    this.config = config
    this.healthMonitor = new BackendHealthMonitor(config)
    this.initializeFallbackData()
  }

  private initializeFallbackData() {
    // 핵심 엔드포인트별 폴백 데이터 정의
    this.fallbackData.set('/api/menu/submenu', {
      projects: [
        { id: '1', name: '웹사이트 리뉴얼', path: '/projects/1', status: 'active', badge: 3, lastModified: new Date().toISOString() },
        { id: '2', name: '모바일 앱 개발', path: '/projects/2', status: 'active', badge: 1, lastModified: new Date().toISOString() }
      ],
      feedback: [
        { id: '1', name: 'UI 개선 피드백', path: '/feedback/1', status: 'active', badge: 2, lastModified: new Date().toISOString() }
      ],
      planning: [
        { id: '1', name: '컨셉 기획', path: '/planning/concept', status: 'active', badge: 1, lastModified: new Date().toISOString() }
      ]
    })

    this.fallbackData.set('/api/projects', [
      {
        id: 'proj-001',
        name: '웹사이트 리뉴얼 프로젝트',
        description: '회사 웹사이트 전체 리뉴얼 작업',
        status: 'in-progress',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['web', 'frontend'],
        priority: 'high',
        progress: 65
      }
    ])

    this.fallbackData.set('/api/feedback', [
      {
        id: 'fb-001',
        title: '웹사이트 로딩 속도 개선',
        content: '메인 페이지 로딩 속도 개선이 필요합니다.',
        type: 'improvement',
        status: 'open',
        authorId: 'user-001',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        tags: ['performance', 'frontend'],
        priority: 'high',
        attachments: []
      }
    ])
  }

  public async request<T>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const backendStatus = this.healthMonitor.getStatus()
    
    try {
      // 백엔드가 오프라인이고 폴백이 활성화된 경우
      if (!backendStatus.isOnline && this.config.enableFallback) {
        return this.useFallbackData<T>(endpoint)
      }

      // 정상적인 API 호출
      const method = config.method?.toUpperCase() || 'GET'
      
      switch (method) {
        case 'GET':
          return await apiClient.get<T>(endpoint, config)
        case 'POST':
          return await apiClient.post<T>(endpoint, config.body ? JSON.parse(config.body as string) : undefined, config)
        case 'PUT':
          return await apiClient.put<T>(endpoint, config.body ? JSON.parse(config.body as string) : undefined, config)
        case 'PATCH':
          return await apiClient.patch<T>(endpoint, config.body ? JSON.parse(config.body as string) : undefined, config)
        case 'DELETE':
          return await apiClient.delete<T>(endpoint, config)
        default:
          return await apiClient.get<T>(endpoint, config)
      }

    } catch (error) {
      console.warn(`API 호출 실패: ${endpoint}`, error)

      // Railway 특화 에러 처리
      if (this.isRailwayError(error)) {
        console.log('🚂 Railway 백엔드 에러 감지, 폴백 데이터 사용')
        
        if (this.config.enableFallback) {
          return this.useFallbackData<T>(endpoint)
        }
      }

      throw error
    }
  }

  private isRailwayError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message: string }).message
      return message.includes('RAILWAY_') || 
             message.includes('railway') ||
             message.includes('api.vlanet.net')
    }
    return false
  }

  private useFallbackData<T>(endpoint: string): Promise<ApiResponse<T>> {
    console.log(`📦 폴백 데이터 사용: ${endpoint}`)

    // URL에서 기본 경로 추출
    const basePath = endpoint.split('?')[0]
    const fallbackData = this.fallbackData.get(basePath)

    if (fallbackData) {
      // URL 파라미터를 고려한 데이터 필터링
      const url = new URL(endpoint, 'http://localhost')
      const type = url.searchParams.get('type')
      
      let data = fallbackData
      
      // 서브메뉴 타입별 필터링
      if (basePath === '/api/menu/submenu' && type && fallbackData[type]) {
        data = {
          items: fallbackData[type],
          pagination: {
            page: 1,
            limit: 10,
            total: fallbackData[type].length,
            hasMore: false
          }
        }
      } else if (Array.isArray(fallbackData)) {
        // 페이지네이션 형태로 감싸기
        data = {
          items: fallbackData,
          pagination: {
            page: 1,
            limit: 10,
            total: fallbackData.length,
            hasMore: false
          }
        }
      }

      return Promise.resolve({
        data: data as T,
        status: 200,
        headers: new Headers({
          'x-fallback': 'true',
          'x-fallback-reason': 'railway-backend-unavailable'
        })
      })
    }

    // 폴백 데이터가 없으면 빈 응답 반환
    return Promise.resolve({
      data: { items: [], pagination: { page: 1, limit: 10, total: 0, hasMore: false } } as T,
      status: 200,
      headers: new Headers({
        'x-fallback': 'true',
        'x-fallback-reason': 'no-fallback-data'
      })
    })
  }

  public getHealthStatus() {
    return this.healthMonitor.getStatus()
  }

  public forceHealthCheck() {
    return this.healthMonitor.forceHealthCheck()
  }

  public destroy() {
    this.healthMonitor.destroy()
  }
}

// 싱글톤 인스턴스 생성
let stableApiInstance: StableApiClient | null = null

export const getStableApiClient = (config?: Partial<StabilityConfig>) => {
  if (!stableApiInstance) {
    stableApiInstance = new StableApiClient({ ...DEFAULT_STABILITY_CONFIG, ...config })
  }
  return stableApiInstance
}

// 편의 함수들
export const stableApi = {
  get: <T = unknown>(endpoint: string, config?: ApiRequestConfig) => 
    getStableApiClient().request<T>(endpoint, { ...config, method: 'GET' }),
  
  post: <T = unknown>(endpoint: string, data?: unknown, config?: ApiRequestConfig) => 
    getStableApiClient().request<T>(endpoint, { 
      ...config, 
      method: 'POST', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  
  put: <T = unknown>(endpoint: string, data?: unknown, config?: ApiRequestConfig) => 
    getStableApiClient().request<T>(endpoint, { 
      ...config, 
      method: 'PUT', 
      body: data ? JSON.stringify(data) : undefined 
    }),
  
  delete: <T = unknown>(endpoint: string, config?: ApiRequestConfig) => 
    getStableApiClient().request<T>(endpoint, { ...config, method: 'DELETE' })
}

// 백엔드 상태 이벤트 타입
declare global {
  interface WindowEventMap {
    'backend:online': CustomEvent
    'backend:offline': CustomEvent
  }
}

export { StableApiClient, BackendHealthMonitor }
export type { StabilityConfig }