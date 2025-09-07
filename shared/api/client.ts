/**
 * 레거시 호환성을 위한 래퍼 - http-client.ts로 위임
 * 단일 책임: 기존 API와의 호환성 유지
 */

import { httpClient, HttpResponse, HttpError, HttpConfig } from './http-client'

// 레거시 인터페이스 호환성
export interface ApiConfig extends HttpConfig {
  timeout?: number
}

export interface ApiResponse<T = unknown> {
  data?: T
  error?: {
    message: string
    code?: string
    details?: unknown
  }
  status: number
}

/**
 * 레거시 API 형식으로 변환하는 래퍼
 */
class LegacyApiClient {
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.convertResponse(() => httpClient.get<T>(endpoint))
  }

  async post<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.convertResponse(() => httpClient.post<T>(endpoint, body))
  }

  async put<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.convertResponse(() => httpClient.put<T>(endpoint, body))
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.convertResponse(() => httpClient.delete<T>(endpoint))
  }

  async patch<T>(endpoint: string, body?: unknown): Promise<ApiResponse<T>> {
    return this.convertResponse(() => httpClient.patch<T>(endpoint, body))
  }

  private async convertResponse<T>(request: () => Promise<HttpResponse<T>>): Promise<ApiResponse<T>> {
    try {
      const response = await request()
      return {
        data: response.data,
        status: response.status,
      }
    } catch (error) {
      const httpError = error as HttpError
      return {
        error: {
          message: httpError.message,
          details: httpError.data,
        },
        status: httpError.status,
      }
    }
  }
}

const apiClient = new LegacyApiClient()

// Named export for named imports
export { apiClient }

// Default export for default imports (backward compatibility)
export default apiClient
