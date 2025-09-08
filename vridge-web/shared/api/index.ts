// Shared API utilities and configurations
// FSD Architecture: Centralized API exports

// RTK Query API Slice for state management
export { apiSlice } from './apiSlice'

// HTTP Client - 단순하고 직접적인 HTTP 통신
export {
  httpClient,
  createHttpClient,
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
