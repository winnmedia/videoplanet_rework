/**
 * HTTP 클라이언트 - Railway 백엔드 장애 대응 포함
 * 책임: HTTP 통신, 환경별 failover, health check
 */

export interface HttpConfig {
  baseUrl: string
  timeout?: number
  headers?: Record<string, string>
  fallbackUrls?: string[]
  enableHealthCheck?: boolean
  retryAttempts?: number
}

export interface HttpResponse<T = unknown> {
  data: T
  status: number
  ok: boolean
  source?: 'primary' | 'fallback' | 'local'
}

export interface HttpError {
  message: string
  status: number
  data?: unknown
  source?: string
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  version?: string
  database?: boolean
  redis?: boolean
  timestamp: string
}

/**
 * 향상된 HTTP 클라이언트
 * - Railway 백엔드 장애 대응
 * - 환경별 자동 failover
 * - Health check 포함
 * - 결정론적 retry 로직
 */
export class SimpleHttpClient {
  private healthStatus = new Map<string, { healthy: boolean; lastCheck: number }>()
  private readonly HEALTH_CHECK_INTERVAL = 30000 // 30초
  private readonly HEALTH_CHECK_TIMEOUT = 5000 // 5초

  constructor(private config: HttpConfig) {
    // 환경별 기본 fallback URL 설정
    if (!this.config.fallbackUrls) {
      this.config.fallbackUrls = this.getDefaultFallbackUrls()
    }
  }

  private getDefaultFallbackUrls(): string[] {
    const isDev = process.env.NODE_ENV === 'development'
    const isProd = process.env.NODE_ENV === 'production'

    if (isDev) {
      return [
        'http://localhost:8001', // Django 로컬 서버
        'http://localhost:8000', // 대안 포트
      ]
    }

    if (isProd) {
      return [
        'http://localhost:8001', // 로컬 fallback
        'https://api.vlanet.net', // 대안 도메인
      ]
    }

    return []
  }

  private async checkHealth(baseUrl: string): Promise<boolean> {
    const cacheKey = baseUrl
    const cached = this.healthStatus.get(cacheKey)
    const now = Date.now()

    // 캐시된 결과 사용 (30초 이내)
    if (cached && now - cached.lastCheck < this.HEALTH_CHECK_INTERVAL) {
      return cached.healthy
    }

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), this.HEALTH_CHECK_TIMEOUT)

      const response = await fetch(`${baseUrl}/api/health`, {
        method: 'GET',
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })

      clearTimeout(timeoutId)
      const isHealthy = response.ok && response.status === 200

      this.healthStatus.set(cacheKey, { healthy: isHealthy, lastCheck: now })
      return isHealthy
    } catch (error) {
      this.healthStatus.set(cacheKey, { healthy: false, lastCheck: now })
      console.warn(`Health check failed for ${baseUrl}:`, error)
      return false
    }
  }

  private async selectHealthyEndpoint(): Promise<{ url: string; source: 'primary' | 'fallback' | 'local' }> {
    // 1. Primary URL health check
    if (this.config.enableHealthCheck !== false) {
      const isPrimaryHealthy = await this.checkHealth(this.config.baseUrl)
      if (isPrimaryHealthy) {
        return { url: this.config.baseUrl, source: 'primary' }
      }
    } else {
      // Health check 비활성화 시 primary 사용
      return { url: this.config.baseUrl, source: 'primary' }
    }

    // 2. Fallback URLs health check
    if (this.config.fallbackUrls) {
      for (const fallbackUrl of this.config.fallbackUrls) {
        const isHealthy = await this.checkHealth(fallbackUrl)
        if (isHealthy) {
          const source = fallbackUrl.includes('localhost') ? 'local' : 'fallback'
          return { url: fallbackUrl, source }
        }
      }
    }

    // 3. 모든 health check 실패 시 primary 사용 (마지막 시도)
    console.warn('모든 백엔드 health check 실패, primary URL로 시도')
    return { url: this.config.baseUrl, source: 'primary' }
  }

  private async requestWithRetry<T>(endpoint: string, options: RequestInit = {}): Promise<HttpResponse<T>> {
    const maxRetries = this.config.retryAttempts || 2
    let lastError: HttpError

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // 매 시도마다 건강한 엔드포인트 선택
        const { url: baseUrl, source } = await this.selectHealthyEndpoint()

        const response = await this.performRequest<T>(baseUrl, endpoint, options)
        return { ...response, source }
      } catch (error) {
        lastError = error as HttpError

        // 500 이상 서버 에러나 네트워크 오류만 retry
        const shouldRetry = lastError.status >= 500 || lastError.status === 0

        if (attempt < maxRetries && shouldRetry) {
          console.warn(`Request failed (attempt ${attempt + 1}/${maxRetries + 1}):`, lastError.message)
          // Exponential backoff: 1초, 2초, 4초
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000))
          continue
        }

        throw lastError
      }
    }

    throw lastError!
  }

  private async performRequest<T>(
    baseUrl: string,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<HttpResponse<T>> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000)

    try {
      const url = `${baseUrl}${endpoint}`
      const headers = {
        'Content-Type': 'application/json',
        ...this.config.headers,
        ...(options.headers as Record<string, string>),
      }

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      let data: T
      const contentType = response.headers.get('content-type')

      if (contentType?.includes('application/json')) {
        data = await response.json()
      } else {
        data = (await response.text()) as T
      }

      if (!response.ok) {
        throw {
          message: `HTTP ${response.status}`,
          status: response.status,
          data,
        } as HttpError
      }

      return {
        data,
        status: response.status,
        ok: response.ok,
      }
    } catch (error) {
      clearTimeout(timeoutId)

      if (error && typeof error === 'object' && 'status' in error) {
        throw error // HttpError
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw {
            message: 'Request timeout',
            status: 408,
          } as HttpError
        }

        throw {
          message: error.message,
          status: 0,
        } as HttpError
      }

      throw {
        message: 'Unknown error',
        status: 0,
      } as HttpError
    }
  }

  async get<T>(endpoint: string): Promise<HttpResponse<T>> {
    return this.requestWithRetry<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    return this.requestWithRetry<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    return this.requestWithRetry<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<HttpResponse<T>> {
    return this.requestWithRetry<T>(endpoint, { method: 'DELETE' })
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    return this.requestWithRetry<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async healthCheck(): Promise<HealthCheckResponse> {
    try {
      const response = await this.get<HealthCheckResponse>('/api/health')
      return response.data
    } catch (error) {
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
      }
    }
  }

  // 백엔드 상태 모니터링
  getBackendStatus(): { [url: string]: { healthy: boolean; lastCheck: number } } {
    const status: { [url: string]: { healthy: boolean; lastCheck: number } } = {}
    this.healthStatus.forEach((value, key) => {
      status[key] = value
    })
    return status
  }

  // Health check 강제 실행
  async forceHealthCheck(): Promise<void> {
    this.healthStatus.clear()
    await this.selectHealthyEndpoint()
  }
}

// 기본 인스턴스 생성 (함수형 접근)
export function createHttpClient(config: HttpConfig): SimpleHttpClient {
  return new SimpleHttpClient(config)
}

// 환경별 설정으로 클라이언트 생성
export const httpClient = createHttpClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://videoplanet.up.railway.app',
  timeout: 30000,
  enableHealthCheck: true,
  retryAttempts: 2,
  fallbackUrls: [
    process.env.NODE_ENV === 'development' ? 'http://localhost:8001' : 'http://localhost:8001', // Production fallback to local
  ],
})

// API 프록시 구성 (Django 백엔드와 Next.js API 라우트 간 경로 매핑)
export const API_PROXY_CONFIG = {
  // 프론트엔드 경로 -> 백엔드 경로 매핑
  routes: {
    '/api/health': '/api/health/',
    '/api/projects': '/api/v1/projects/',
    '/api/projects/:id': '/api/v1/projects/:id/',
    '/api/feedback': '/feedbacks/',
    '/api/feedback/:id': '/feedbacks/:id/',
    '/api/auth/login': '/users/auth/login/',
    '/api/auth/signup': '/users/auth/signup/',
    '/api/auth/reset-password': '/users/auth/password-reset/',
    '/api/video-planning': '/api/video-planning/',
    '/api/collaboration': '/api/collaboration/',
  },
  // 백엔드 경로 정규화 함수
  normalizeBackendPath: (frontendPath: string): string => {
    const config = API_PROXY_CONFIG.routes as Record<string, string>
    // 동적 경로 처리 (:id 등)
    for (const [pattern, backendPath] of Object.entries(config)) {
      const regex = new RegExp('^' + pattern.replace(':id', '([^/]+)') + '$')
      const match = frontendPath.match(regex)
      if (match) {
        return backendPath.replace(':id', match[1])
      }
    }
    return config[frontendPath] || frontendPath
  },
} as const
