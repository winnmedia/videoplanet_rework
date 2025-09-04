/**
 * API Client Interfaces - 순환 의존성 해결을 위한 인터페이스 분리
 * 의존성 역전 원칙(Dependency Inversion Principle) 적용
 */

export interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
}

export interface CacheOptions {
  ttl?: number;
  tags?: string[];
  staleWhileRevalidate?: boolean;
  enabled?: boolean;
  forceRefresh?: boolean;
}

export interface RetryConfig {
  maxRetries?: number;
  baseDelay?: number;
  enableRetry?: boolean;
}

export interface ApiRequestConfig extends RequestInit {
  params?: Record<string, string | number | boolean>;
  timeout?: number;
  withAuth?: boolean;
  retryConfig?: RetryConfig;
  cacheConfig?: CacheOptions;
}

// 캐시 서비스 인터페이스
export interface ICacheService {
  get<T>(url: string, method: string, options?: CacheOptions): Promise<{ data: ApiResponse<T>; isStale: boolean } | null>;
  set<T>(url: string, method: string, data: ApiResponse<T>, options?: CacheOptions): Promise<void>;
  delete(url: string, method: string): Promise<void>;
  invalidateByTag(tag: string): Promise<void>;
  clear(): Promise<void>;
  getStats(): CacheStats;
}

export interface CacheStats {
  hitRate: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  cacheSize: number;
}

// 모니터링 서비스 인터페이스
export interface IMonitoringService {
  generateRequestId(): string;
  logInfo(message: string, context?: Record<string, unknown>): void;
  logWarning(message: string, context?: Record<string, unknown>): void;
  logError(message: string, error: Error | ApiError, context?: Record<string, unknown>): void;
  recordApiCall(
    endpoint: string, 
    method: string, 
    statusCode: number, 
    responseTime: number, 
    metadata?: Record<string, unknown>
  ): void;
}

// 재시도 서비스 인터페이스
export interface IRetryService {
  execute<T>(
    operation: () => Promise<T>,
    config?: RetryConfig,
    onRetry?: (context: RetryContext) => void
  ): Promise<T>;
}

export interface RetryContext {
  attempt: number;
  totalAttempts: number;
  lastError: Error;
  nextDelay: number;
}

// Circuit Breaker 인터페이스
export interface ICircuitBreaker {
  execute<T>(operation: () => Promise<T>): Promise<T>;
  getState(): CircuitBreakerState;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// API 클라이언트 인터페이스
export interface IApiClient {
  get<T = unknown>(endpoint: string, config?: ApiRequestConfig): Promise<ApiResponse<T>>;
  post<T = unknown>(endpoint: string, data?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>>;
  put<T = unknown>(endpoint: string, data?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>>;
  patch<T = unknown>(endpoint: string, data?: unknown, config?: ApiRequestConfig): Promise<ApiResponse<T>>;
  delete<T = unknown>(endpoint: string, config?: ApiRequestConfig): Promise<ApiResponse<T>>;
  upload<T = unknown>(
    endpoint: string, 
    file: File | Blob, 
    additionalData?: Record<string, string | number | boolean>,
    config?: ApiRequestConfig
  ): Promise<ApiResponse<T>>;
  invalidateCache(endpoint?: string, method?: string, tag?: string): Promise<void>;
  getCacheStats(): CacheStats;
}

// 환경 설정 인터페이스
export interface IConfigService {
  get(key: string): string | number;
  getApiEndpoint(endpoint: string): string;
}

// 디버그 서비스 인터페이스  
export interface IDebugService {
  logRequest(requestInfo: RequestDebugInfo): void;
}

export interface RequestDebugInfo {
  timestamp: string;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  responseStatus: number;
  responseHeaders: Record<string, string>;
  responseData?: unknown;
  errorDetails?: {
    message: string;
    code: string;
  };
}