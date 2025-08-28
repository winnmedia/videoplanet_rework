/**
 * API Client for frontend-backend communication
 * Handles all HTTP requests with proper error handling and configuration
 */

import { config } from '@/lib/config/env';
import { railwayDebugger } from './debug-helper';
import { 
  withRetry, 
  getRetryConfigForEndpoint, 
  apiCircuitBreaker,
  DEFAULT_RETRY_CONFIG
} from './retry-handler';
import { apiMonitor } from './monitoring';
import { apiCache, getCacheConfigForEndpoint, CacheOptions } from './cache';

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}

export interface ApiRequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  withAuth?: boolean;
  retryConfig?: {
    maxRetries?: number;
    baseDelay?: number;
    enableRetry?: boolean;
  };
  cacheConfig?: CacheOptions & {
    enabled?: boolean;
    forceRefresh?: boolean;
  };
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

class ApiClient {
  private static instance: ApiClient;
  private baseUrl: string;
  private defaultTimeout: number;
  private defaultHeaders: HeadersInit;
  
  private constructor() {
    this.baseUrl = config.get('apiUrl');
    this.defaultTimeout = config.get('apiTimeout');
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }
  
  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }
  
  /**
   * Create a promise that rejects after a timeout
   */
  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timed out after ${timeout}ms`));
      }, timeout);
    });
  }
  
  /**
   * Build URL with query parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    const url = new URL(config.getApiEndpoint(endpoint));
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }
  
  /**
   * Get authentication configuration for requests
   */
  private getAuthConfig(): Partial<RequestInit> {
    // Use cookie-based authentication to match backend
    return {
      credentials: 'include' as RequestCredentials,
    };
  }
  
  /**
   * Handle API errors
   */
  private handleError(error: unknown, status?: number): ApiError {
    if (error instanceof Error) {
      return {
        message: error.message,
        status: status || 500,
        details: error.stack,
      };
    }
    
    if (typeof error === 'object' && error !== null) {
      const errorObj = error as Record<string, unknown>;
      return {
        message: (typeof errorObj.message === 'string' ? errorObj.message : 'An error occurred'),
        status: (typeof errorObj.status === 'number' ? errorObj.status : status || 500),
        code: (typeof errorObj.code === 'string' ? errorObj.code : undefined),
        details: errorObj.details || error,
      };
    }
    
    return {
      message: String(error),
      status: status || 500,
    };
  }
  
  /**
   * Main request method with retry logic and monitoring
   */
  private async request<T>(
    endpoint: string,
    config: ApiRequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const requestId = apiMonitor.generateRequestId()
    const startTime = Date.now()
    let retryAttempts = 0
    let success = false
    let statusCode = 500
    const {
      params,
      timeout = this.defaultTimeout,
      withAuth = false,
      headers: customHeaders = {},
      retryConfig = {},
      cacheConfig = {},
      ...fetchOptions
    } = config;
    
    // Build URL
    const url = this.buildUrl(endpoint, params);
    const method = fetchOptions.method || 'GET';
    
    // 캐시 설정 준비
    const endpointCacheConfig = getCacheConfigForEndpoint(endpoint);
    const finalCacheConfig = {
      ...endpointCacheConfig,
      ...cacheConfig,
      enabled: cacheConfig.enabled !== false // 기본값: true
    };
    
    // GET 요청이고 캐시가 활성화된 경우 캐시 확인
    if (method === 'GET' && finalCacheConfig.enabled && !finalCacheConfig.forceRefresh) {
      try {
        const cachedResult = await apiCache.get<T>(url, method, finalCacheConfig);
        
        if (cachedResult) {
          const { data: cachedData, isStale } = cachedResult;
          
          // 캐시 히트 로깅
          apiMonitor.logInfo(`캐시 히트: ${method} ${endpoint}${isStale ? ' (stale)' : ''}`, {
            endpoint,
            url,
            requestId,
            method,
            cached: true,
            stale: isStale
          });
          
          // 백그라운드 갱신이 필요한 경우 비동기로 실행
          if (isStale && finalCacheConfig.staleWhileRevalidate) {
            // 백그라운드에서 새 데이터를 가져와 캐시 갱신
            this.backgroundRefresh(endpoint, config, url, method, finalCacheConfig);
          }
          
          return cachedData;
        }
      } catch (cacheError) {
        // 캐시 에러는 무시하고 정상 요청 진행
        apiMonitor.logWarning('캐시 조회 실패', {
          endpoint,
          error: (cacheError as Error).message,
          requestId
        });
      }
    }
    
    // Prepare headers
    const headers = {
      ...this.defaultHeaders,
      ...customHeaders,
    };
    
    // Prepare auth configuration
    const authConfig = withAuth ? this.getAuthConfig() : {};
    
    // 재시도 설정 준비
    const enableRetry = retryConfig.enableRetry !== false; // 기본값: true
    const endpointRetryConfig = getRetryConfigForEndpoint(endpoint);
    const finalRetryConfig = {
      ...endpointRetryConfig,
      ...retryConfig,
      maxRetries: retryConfig.maxRetries ?? endpointRetryConfig.maxRetries,
      baseDelay: retryConfig.baseDelay ?? endpointRetryConfig.baseDelay
    };
    
    // Fetch function with circuit breaker
    const fetchFunction = async (): Promise<Response> => {
      const fetchPromise = fetch(url, {
        ...fetchOptions,
        ...authConfig,
        headers,
      });
      
      // Race between fetch and timeout
      return Promise.race([
        fetchPromise,
        this.createTimeoutPromise(timeout),
      ]) as Promise<Response>;
    };
    
    // 재시도 로직 적용 또는 직접 실행
    const response = enableRetry
      ? await withRetry(
          () => apiCircuitBreaker.execute(fetchFunction),
          finalRetryConfig,
          undefined,
          undefined,
          (context) => {
            retryAttempts = context.attempt - 1
            apiMonitor.logWarning(`API 재시도: ${endpoint} (${context.attempt}/${context.totalAttempts})`, {
              endpoint,
              url,
              requestId,
              error: context.lastError.message,
              nextDelay: context.nextDelay,
              method: fetchOptions.method || 'GET'
            });
          }
        )
      : await apiCircuitBreaker.execute(fetchFunction);
    
    try {
      
      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Railway API 디버깅 로깅
        railwayDebugger.logRequest({
          timestamp: new Date().toISOString(),
          url,
          method: fetchOptions.method || 'GET',
          requestHeaders: Object.fromEntries(Object.entries(headers)),
          requestBody: fetchOptions.body ? JSON.parse(fetchOptions.body as string) : undefined,
          responseStatus: response.status,
          responseHeaders: Object.fromEntries(response.headers.entries()),
          responseData: errorData,
          errorDetails: {
            message: errorData.message || response.statusText,
            code: `HTTP_${response.status}`
          }
        });
        
        // Handle specific Railway backend error codes
        let enhancedError = errorData;
        switch (response.status) {
          case 404:
            enhancedError = {
              ...errorData,
              message: 'API 엔드포인트를 찾을 수 없습니다. Railway 백엔드 연결을 확인해주세요.',
              code: 'RAILWAY_ENDPOINT_NOT_FOUND'
            };
            break;
          case 403:
            enhancedError = {
              ...errorData,
              message: errorData.message || '인증에 실패했습니다.',
              code: 'RAILWAY_AUTH_FAILED'
            };
            break;
          case 500:
            enhancedError = {
              ...errorData,
              message: errorData.message || 'Railway 서버 오류가 발생했습니다.',
              code: 'RAILWAY_SERVER_ERROR'
            };
            break;
          case 0:
            // Network error or CORS issue
            enhancedError = {
              message: 'Railway 백엔드 연결에 실패했습니다. CORS 설정을 확인해주세요.',
              code: 'RAILWAY_CONNECTION_FAILED'
            };
            break;
        }
        
        const apiError = this.handleError(enhancedError, response.status);
        
        // 에러 로깅
        apiMonitor.logError(
          `API 요청 실패: ${fetchOptions.method || 'GET'} ${endpoint}`,
          apiError,
          {
            endpoint,
            url,
            requestId,
            statusCode: response.status,
            method: fetchOptions.method || 'GET',
            retryAttempts
          }
        );
        
        throw apiError;
      }
      
      // 성공 처리
      statusCode = response.status;
      success = true;
      
      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('text/')) {
        data = await response.text() as T;
      } else {
        data = await response.blob() as T;
      }
      
      const responseData: ApiResponse<T> = {
        data,
        status: response.status,
        headers: response.headers,
      };
      
      // 성공한 GET 요청인 경우 캐시에 저장
      if (method === 'GET' && finalCacheConfig.enabled) {
        try {
          await apiCache.set(url, method, responseData, finalCacheConfig);
        } catch (cacheError) {
          // 캐시 저장 실패는 무시 (메인 응답에 영향 없음)
          apiMonitor.logWarning('캐시 저장 실패', {
            endpoint,
            error: (cacheError as Error).message,
            requestId
          });
        }
      }
      
      // 성공 로깅
      apiMonitor.logInfo(
        `API 요청 성공: ${method} ${endpoint}`,
        {
          endpoint,
          url,
          requestId,
          statusCode,
          method,
          retryAttempts,
          responseTime: Date.now() - startTime,
          cached: false
        }
      );
      
      return responseData;
    } catch (error) {
      // 타임아웃 에러 처리
      if (error instanceof Error && error.message.includes('timed out')) {
        const timeoutError = this.handleError(error, 408);
        
        apiMonitor.logError(
          `API 타임아웃: ${fetchOptions.method || 'GET'} ${endpoint}`,
          timeoutError,
          {
            endpoint,
            url,
            requestId,
            timeout,
            method: fetchOptions.method || 'GET',
            retryAttempts
          }
        );
        
        throw timeoutError;
      }
      
      // 기타 에러 처리
      apiMonitor.logError(
        `API 요청 중 예상치 못한 에러: ${fetchOptions.method || 'GET'} ${endpoint}`,
        error as Error,
        {
          endpoint,
          url,
          requestId,
          method: fetchOptions.method || 'GET',
          retryAttempts
        }
      );
      
      throw error;
    } finally {
      // 메트릭 기록
      const responseTime = Date.now() - startTime;
      
      apiMonitor.recordApiCall(
        endpoint,
        fetchOptions.method || 'GET',
        statusCode,
        responseTime,
        {
          requestId,
          success,
          retryAttempts
        }
      );
    }
  }
  
  /**
   * GET request
   */
  public async get<T = unknown>(
    endpoint: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'GET',
    });
  }
  
  /**
   * POST request
   */
  public async post<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  /**
   * PUT request
   */
  public async put<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  /**
   * PATCH request
   */
  public async patch<T = unknown>(
    endpoint: string,
    data?: unknown,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }
  
  /**
   * DELETE request
   */
  public async delete<T = unknown>(
    endpoint: string,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...config,
      method: 'DELETE',
    });
  }
  
  /**
   * 백그라운드에서 캐시 리프레시
   */
  private async backgroundRefresh<T>(
    endpoint: string,
    originalConfig: ApiRequestConfig,
    url: string,
    method: string,
    cacheConfig: CacheOptions
  ): Promise<void> {
    try {
      // 백그라운드 요청은 캐시를 사용하지 않도록 설정
      const backgroundConfig: ApiRequestConfig = {
        ...originalConfig,
        cacheConfig: {
          ...cacheConfig,
          enabled: false // 캐시 비활성화
        }
      };
      
      const freshData = await this.request<T>(endpoint, backgroundConfig);
      
      // 새로운 데이터를 캐시에 저장
      await apiCache.set(url, method, freshData, cacheConfig);
      
      apiMonitor.logInfo(`백그라운드 캐시 갱신 완료: ${method} ${endpoint}`, {
        endpoint,
        url,
        method,
        backgroundRefresh: true
      });
      
    } catch (error) {
      // 백그라운드 리프레시 실패는 로그만 남기고 무시
      apiMonitor.logWarning(`백그라운드 캐시 갱신 실패: ${method} ${endpoint}`, {
        endpoint,
        url,
        method,
        error: (error as Error).message,
        backgroundRefresh: true
      });
    }
  }
  
  /**
   * 캐시 무효화
   */
  public async invalidateCache(
    endpoint?: string,
    method?: string,
    tag?: string
  ): Promise<void> {
    try {
      if (tag) {
        await apiCache.invalidateByTag(tag);
        apiMonitor.logInfo(`태그 기반 캐시 무효화: ${tag}`);
      } else if (endpoint && method) {
        const url = this.buildUrl(endpoint);
        await apiCache.delete(url, method);
        apiMonitor.logInfo(`캐시 삭제: ${method} ${endpoint}`);
      } else {
        await apiCache.clear();
        apiMonitor.logInfo('전체 캐시 클리어');
      }
    } catch (error) {
      apiMonitor.logError('캐시 무효화 실패', error as Error, {
        endpoint,
        method,
        tag
      });
    }
  }
  
  /**
   * 캐시 통계 조회
   */
  public getCacheStats() {
    return apiCache.getStats();
  }
  
  /**
   * Upload file
   */
  public async upload<T = unknown>(
    endpoint: string,
    file: File | Blob,
    additionalData?: Record<string, string | number | boolean>,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }
    
    return this.request<T>(endpoint, {
      ...config,
      method: 'POST',
      body: formData,
      headers: {
        ...config?.headers,
        // Remove Content-Type to let browser set it with boundary
      },
    });
  }
}

// Export singleton instance
export const apiClient = ApiClient.getInstance();

// Export convenience functions
export const api = {
  get: <T = unknown>(endpoint: string, config?: ApiRequestConfig) => 
    apiClient.get<T>(endpoint, config),
  
  post: <T = unknown>(endpoint: string, data?: unknown, config?: ApiRequestConfig) => 
    apiClient.post<T>(endpoint, data, config),
  
  put: <T = unknown>(endpoint: string, data?: unknown, config?: ApiRequestConfig) => 
    apiClient.put<T>(endpoint, data, config),
  
  patch: <T = unknown>(endpoint: string, data?: unknown, config?: ApiRequestConfig) => 
    apiClient.patch<T>(endpoint, data, config),
  
  delete: <T = unknown>(endpoint: string, config?: ApiRequestConfig) => 
    apiClient.delete<T>(endpoint, config),
  
  upload: <T = unknown>(
    endpoint: string, 
    file: File | Blob, 
    additionalData?: Record<string, string | number | boolean>,
    config?: ApiRequestConfig
  ) => apiClient.upload<T>(endpoint, file, additionalData, config),
};

export default api;