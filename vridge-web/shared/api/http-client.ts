/**
 * 단순 HTTP 클라이언트 - 최소한의 기능으로 구성
 * 책임: HTTP 요청/응답만 처리
 */

export interface HttpConfig {
  baseUrl: string
  timeout?: number
  headers?: Record<string, string>
}

export interface HttpResponse<T = unknown> {
  data: T
  status: number
  ok: boolean
}

export interface HttpError {
  message: string
  status: number
  data?: unknown
}

/**
 * 단순 HTTP 클라이언트
 * - 의존성 없음
 * - 단일 책임: HTTP 통신
 * - 함수형 접근
 */
export class SimpleHttpClient {
  constructor(private config: HttpConfig) {}

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<HttpResponse<T>> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout || 30000)

    try {
      const url = `${this.config.baseUrl}${endpoint}`
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
    return this.request<T>(endpoint, { method: 'GET' })
  }

  async post<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete<T>(endpoint: string): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' })
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    })
  }
}

// 기본 인스턴스 생성 (함수형 접근)
export function createHttpClient(config: HttpConfig): SimpleHttpClient {
  return new SimpleHttpClient(config)
}

// 기본 설정으로 클라이언트 생성
export const httpClient = createHttpClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'https://videoplanet.up.railway.app',
  timeout: 30000,
})
