/**
 * 백엔드 모니터링 시스템
 * Railway 백엔드 장애 상황에 대한 자동 감지 및 알림 제공
 */

import { config } from '../../../lib/config/env'
import { httpClient } from '../../api/http-client'

export interface BackendStatus {
  url: string
  healthy: boolean
  responseTime: number
  lastCheck: Date
  error?: string
  consecutiveFailures: number
}

export interface MonitoringConfig {
  checkInterval: number // ms
  healthTimeout: number // ms
  maxConsecutiveFailures: number
  notificationThreshold: number
  enableNotifications: boolean
}

export interface NotificationCallback {
  onBackendDown: (backend: string, status: BackendStatus) => void
  onBackendUp: (backend: string, status: BackendStatus) => void
  onFailoverTriggered: (from: string, to: string) => void
}

/**
 * 백엔드 모니터링 매니저
 * - 주기적으로 백엔드 상태 확인
 * - 장애 감지 시 알림 발송
 * - Failover 상황 추적
 */
export class BackendMonitor {
  private backends: Map<string, BackendStatus> = new Map()
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false
  private callbacks: NotificationCallback[] = []

  constructor(
    private readonly monitorConfig: MonitoringConfig = {
      checkInterval: 30000, // 30초
      healthTimeout: 5000, // 5초
      maxConsecutiveFailures: 3,
      notificationThreshold: 2,
      enableNotifications: true,
    }
  ) {
    this.initializeBackends()
  }

  private initializeBackends(): void {
    const appConfig = config.getConfig()

    // 기본 백엔드들 등록
    this.registerBackend('primary', appConfig.apiUrl)

    if (appConfig.fallbackApiUrl) {
      this.registerBackend('fallback', appConfig.fallbackApiUrl)
    }

    if (appConfig.localApiUrl) {
      this.registerBackend('local', appConfig.localApiUrl)
    }
  }

  /**
   * 백엔드를 모니터링 대상에 등록
   */
  public registerBackend(name: string, url: string): void {
    this.backends.set(name, {
      url,
      healthy: true,
      responseTime: 0,
      lastCheck: new Date(),
      consecutiveFailures: 0,
    })
  }

  /**
   * 모니터링 시작
   */
  public start(): void {
    if (this.isRunning) {
      console.warn('Backend monitor is already running')
      return
    }

    console.log(`Starting backend monitor (interval: ${this.monitorConfig.checkInterval}ms)`)
    this.isRunning = true

    // 즉시 첫 번째 체크 실행
    this.performHealthChecks()

    // 주기적 체크 설정
    this.intervalId = setInterval(() => {
      this.performHealthChecks()
    }, this.monitorConfig.checkInterval)
  }

  /**
   * 모니터링 중단
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
    console.log('Backend monitor stopped')
  }

  /**
   * 알림 콜백 등록
   */
  public onStatusChange(callbacks: NotificationCallback): void {
    this.callbacks.push(callbacks)
  }

  /**
   * 모든 백엔드 health check 수행
   */
  private async performHealthChecks(): Promise<void> {
    const checkPromises = Array.from(this.backends.entries()).map(([name, status]) =>
      this.checkBackendHealth(name, status)
    )

    await Promise.allSettled(checkPromises)

    // 전체 상태 로그
    if (process.env.NODE_ENV === 'development') {
      this.logStatus()
    }
  }

  /**
   * 개별 백엔드 health check
   */
  private async checkBackendHealth(name: string, status: BackendStatus): Promise<void> {
    const startTime = Date.now()

    try {
      const response = await fetch(`${status.url}/api/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.monitorConfig.healthTimeout),
        headers: {
          Accept: 'application/json',
          'User-Agent': 'VRidge-Monitor/1.0',
        },
      })

      const responseTime = Date.now() - startTime
      const isHealthy = response.ok && response.status === 200

      // 상태 업데이트
      const wasHealthy = status.healthy
      const updatedStatus: BackendStatus = {
        ...status,
        healthy: isHealthy,
        responseTime,
        lastCheck: new Date(),
        consecutiveFailures: isHealthy ? 0 : status.consecutiveFailures + 1,
        error: isHealthy ? undefined : `HTTP ${response.status}`,
      }

      this.backends.set(name, updatedStatus)

      // 상태 변화 감지 및 알림
      this.handleStatusChange(name, wasHealthy, updatedStatus)
    } catch (error) {
      const responseTime = Date.now() - startTime
      const wasHealthy = status.healthy

      const updatedStatus: BackendStatus = {
        ...status,
        healthy: false,
        responseTime,
        lastCheck: new Date(),
        consecutiveFailures: status.consecutiveFailures + 1,
        error: error instanceof Error ? error.message : 'Unknown error',
      }

      this.backends.set(name, updatedStatus)
      this.handleStatusChange(name, wasHealthy, updatedStatus)
    }
  }

  /**
   * 상태 변화 처리 및 알림
   */
  private handleStatusChange(name: string, wasHealthy: boolean, currentStatus: BackendStatus): void {
    // 정상 → 장애
    if (wasHealthy && !currentStatus.healthy) {
      if (currentStatus.consecutiveFailures >= this.monitorConfig.notificationThreshold) {
        console.warn(`🔴 Backend '${name}' is down (${currentStatus.consecutiveFailures} consecutive failures)`)
        this.notifyBackendDown(name, currentStatus)
      }
    }

    // 장애 → 정상
    if (!wasHealthy && currentStatus.healthy) {
      console.log(`🟢 Backend '${name}' is back online`)
      this.notifyBackendUp(name, currentStatus)
    }

    // 임계점 도달 시 failover 권장
    if (currentStatus.consecutiveFailures >= this.monitorConfig.maxConsecutiveFailures) {
      this.recommendFailover(name)
    }
  }

  /**
   * 백엔드 다운 알림
   */
  private notifyBackendDown(name: string, status: BackendStatus): void {
    if (!this.monitorConfig.enableNotifications) return

    this.callbacks.forEach(callback => {
      try {
        callback.onBackendDown(name, status)
      } catch (error) {
        console.error('Notification callback error:', error)
      }
    })
  }

  /**
   * 백엔드 복구 알림
   */
  private notifyBackendUp(name: string, status: BackendStatus): void {
    if (!this.monitorConfig.enableNotifications) return

    this.callbacks.forEach(callback => {
      try {
        callback.onBackendUp(name, status)
      } catch (error) {
        console.error('Notification callback error:', error)
      }
    })
  }

  /**
   * Failover 권장
   */
  private recommendFailover(failedBackend: string): void {
    const healthyBackends = Array.from(this.backends.entries())
      .filter(([_, status]) => status.healthy)
      .map(([name]) => name)

    if (healthyBackends.length > 0) {
      const recommendedBackend = healthyBackends[0]
      console.warn(`⚠️  Recommending failover from '${failedBackend}' to '${recommendedBackend}'`)

      this.callbacks.forEach(callback => {
        try {
          callback.onFailoverTriggered(failedBackend, recommendedBackend)
        } catch (error) {
          console.error('Failover notification callback error:', error)
        }
      })
    }
  }

  /**
   * 현재 상태 로깅
   */
  private logStatus(): void {
    const statusSummary = Array.from(this.backends.entries()).map(([name, status]) => ({
      name,
      healthy: status.healthy ? '🟢' : '🔴',
      responseTime: `${status.responseTime}ms`,
      failures: status.consecutiveFailures,
    }))

    console.table(statusSummary)
  }

  /**
   * 현재 모든 백엔드 상태 반환
   */
  public getStatus(): { [name: string]: BackendStatus } {
    const status: { [name: string]: BackendStatus } = {}
    this.backends.forEach((value, key) => {
      status[key] = { ...value }
    })
    return status
  }

  /**
   * 건강한 백엔드 목록 반환
   */
  public getHealthyBackends(): string[] {
    return Array.from(this.backends.entries())
      .filter(([_, status]) => status.healthy)
      .map(([name]) => name)
  }

  /**
   * 가장 응답시간이 빠른 건강한 백엔드 반환
   */
  public getFastestHealthyBackend(): string | null {
    const healthyBackends = Array.from(this.backends.entries())
      .filter(([_, status]) => status.healthy && status.responseTime > 0)
      .sort(([_, a], [__, b]) => a.responseTime - b.responseTime)

    return healthyBackends.length > 0 ? healthyBackends[0][0] : null
  }

  /**
   * 강제로 모든 백엔드 상태 갱신
   */
  public async forceRefresh(): Promise<void> {
    await this.performHealthChecks()
  }

  /**
   * 모니터링 중 여부 확인
   */
  public get running(): boolean {
    return this.isRunning
  }
}

// 싱글톤 인스턴스
let globalMonitor: BackendMonitor | null = null

/**
 * 글로벌 백엔드 모니터 인스턴스 반환
 */
export function getBackendMonitor(): BackendMonitor {
  if (!globalMonitor) {
    globalMonitor = new BackendMonitor()
  }
  return globalMonitor
}

/**
 * 개발팀 알림을 위한 기본 콜백
 */
export function createDefaultNotificationCallbacks(): NotificationCallback {
  return {
    onBackendDown: (backend: string, status: BackendStatus) => {
      // 브라우저 알림 (가능한 경우)
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`백엔드 장애`, {
            body: `${backend} 백엔드가 다운되었습니다. (${status.consecutiveFailures}회 연속 실패)`,
            icon: '/favicon.ico',
            tag: `backend-down-${backend}`,
          })
        }
      }

      // 콘솔 경고
      console.error(`🚨 BACKEND DOWN: ${backend} (${status.url}) - ${status.error}`)
    },

    onBackendUp: (backend: string, status: BackendStatus) => {
      // 브라우저 알림
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification(`백엔드 복구`, {
            body: `${backend} 백엔드가 복구되었습니다.`,
            icon: '/favicon.ico',
            tag: `backend-up-${backend}`,
          })
        }
      }

      console.log(`✅ BACKEND RECOVERED: ${backend} (${status.responseTime}ms)`)
    },

    onFailoverTriggered: (from: string, to: string) => {
      console.warn(`🔄 FAILOVER RECOMMENDED: ${from} → ${to}`)

      // 사용자에게 알림 표시 (Toast 등)
      if (typeof window !== 'undefined') {
        console.warn(`시스템이 ${from}에서 ${to} 백엔드로 자동 전환을 권장합니다.`)
      }
    },
  }
}
