/**
 * Shared API Layer Public API
 * 모든 API 관련 기능의 중앙 집중식 export
 *
 * FSD 규칙: 다른 레이어에서는 반드시 이 index.ts를 통해서만 import
 *
 * @layer shared/api
 */

// 통합 API 서비스 (Primary - 권장)
export {
  apiService,
  getBackendStatus,
  forceHealthCheck,
  type ApiServiceResult,
  type HealthResponseType,
} from './api-service'

// RTK Query API Slice for state management
export { apiSlice } from './apiSlice'

// HTTP Client - 단순하고 직접적인 HTTP 통신
export {
  httpClient,
  createHttpClient,
  API_PROXY_CONFIG,
  type HttpConfig,
  type HttpResponse,
  type HttpError,
  SimpleHttpClient,
} from './http-client'

// Legacy API Client for backward compatibility
export { apiClient } from './client'
export { default as apiClientDefault } from './client'

// API Types and Interfaces
export type { ApiConfig, ApiResponse } from './client'

// Zod 스키마 및 타입 정의
export * from './schemas'

// Mock 시스템 (mockSystem 모듈이 존재하는 경우에만 활성화)
// export {
//   setupApiMocks,
//   resetApiMocks,
//   mockApiHandlers,
// } from './mockSystem'
