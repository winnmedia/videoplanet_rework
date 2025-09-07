/**
 * FSD Architecture: Shared API Types and Interfaces
 * 모든 계층에서 사용할 수 있는 API 관련 타입 정의
 */

// Base API Response Structure
export interface ApiResponse<T = unknown> {
  data?: T
  error?: {
    message: string
    code?: string
    details?: unknown
  }
  status: number
  headers?: Headers
}

// Base API Request Configuration
export interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  headers?: Record<string, string>
  body?: string
  timeout?: number
}

// DTO (Data Transfer Object) Base Interface
export interface BaseDTO {
  id: string
  createdAt: string
  updatedAt: string
}

// ViewModel Base Interface
export interface BaseViewModel {
  id: string
  displayName: string
  status: 'active' | 'inactive' | 'pending'
}

// Error Handling Types
export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: unknown
}

// Pagination Types
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    hasMore: boolean
  }
}

// Validation Schema Types (Zod integration)
export interface ValidationResult<T> {
  success: boolean
  data?: T
  errors?: Array<{
    field: string
    message: string
    code: string
  }>
}
