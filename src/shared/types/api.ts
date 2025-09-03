// API-specific types placeholder
export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}