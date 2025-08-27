/**
 * Shared API Mocking System
 * 4개 모듈에서 공통으로 사용하는 API 모킹 시스템
 * 실제 네트워크 지연, 에러 시뮬레이션, 랜덤 응답 지원
 */

// 기본 API 응답 타입
export interface ApiResponse<T = any> {
  data: T
  status: number
  message: string
  timestamp: string
}

// 에러 응답 타입
export interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  status: number
  timestamp: string
}

// 모킹 설정 타입
export interface MockConfig {
  /** 기본 지연 시간 (밀리초) */
  baseDelay: number
  /** 랜덤 지연 범위 (밀리초) */
  randomDelayRange: number
  /** 에러 발생 확률 (0-1) */
  errorRate: number
  /** 네트워크 에러 시뮬레이션 여부 */
  simulateNetworkErrors: boolean
  /** 로깅 활성화 */
  enableLogging: boolean
}

// 기본 모킹 설정
const DEFAULT_CONFIG: MockConfig = {
  baseDelay: 500,
  randomDelayRange: 300,
  errorRate: 0.1, // 10% 에러율
  simulateNetworkErrors: true,
  enableLogging: process.env.NODE_ENV === 'development'
}

// 현재 모킹 설정
let currentConfig = { ...DEFAULT_CONFIG }

// 가능한 에러 타입들
const MOCK_ERRORS = [
  {
    code: 'NETWORK_ERROR',
    message: '네트워크 연결에 문제가 발생했습니다.',
    status: 0
  },
  {
    code: 'TIMEOUT_ERROR',
    message: '요청 시간이 초과되었습니다.',
    status: 408
  },
  {
    code: 'SERVER_ERROR',
    message: '서버에 일시적인 문제가 발생했습니다.',
    status: 500
  },
  {
    code: 'BAD_REQUEST',
    message: '잘못된 요청입니다.',
    status: 400
  },
  {
    code: 'UNAUTHORIZED',
    message: '인증이 필요합니다.',
    status: 401
  },
  {
    code: 'FORBIDDEN',
    message: '접근 권한이 없습니다.',
    status: 403
  },
  {
    code: 'NOT_FOUND',
    message: '요청한 리소스를 찾을 수 없습니다.',
    status: 404
  }
]

/**
 * 모킹 설정 업데이트
 */
export function updateMockConfig(config: Partial<MockConfig>): void {
  currentConfig = { ...currentConfig, ...config }
  
  if (currentConfig.enableLogging) {
    console.log('🔧 Mock config updated:', config)
  }
}

/**
 * 현재 모킹 설정 조회
 */
export function getMockConfig(): MockConfig {
  return { ...currentConfig }
}

/**
 * 랜덤 지연 생성
 */
function getRandomDelay(): number {
  const { baseDelay, randomDelayRange } = currentConfig
  const randomOffset = Math.random() * randomDelayRange
  return Math.floor(baseDelay + randomOffset)
}

/**
 * 랜덤 에러 생성
 */
function getRandomError(): ApiError {
  const errorTemplate = MOCK_ERRORS[Math.floor(Math.random() * MOCK_ERRORS.length)]
  
  return {
    ...errorTemplate,
    timestamp: new Date().toISOString(),
    details: {
      requestId: `req_${Math.random().toString(36).substr(2, 9)}`,
      retryAfter: Math.floor(Math.random() * 60) + 30 // 30-90초
    }
  }
}

/**
 * 에러 발생 여부 판단
 */
function shouldSimulateError(): boolean {
  return Math.random() < currentConfig.errorRate
}

/**
 * 성공 응답 생성
 */
function createSuccessResponse<T>(data: T, status: number = 200): ApiResponse<T> {
  return {
    data,
    status,
    message: 'Success',
    timestamp: new Date().toISOString()
  }
}

/**
 * 모의 API 호출 실행기
 */
export async function mockApiCall<T>(
  mockData: T | (() => T),
  options: {
    /** 커스텀 지연 시간 */
    delay?: number
    /** 이 요청에서 에러 시뮬레이션 비활성화 */
    disableErrors?: boolean
    /** 커스텀 에러 */
    customError?: ApiError
    /** 성공 상태 코드 */
    successStatus?: number
  } = {}
): Promise<ApiResponse<T>> {
  const delay = options.delay ?? getRandomDelay()
  
  if (currentConfig.enableLogging) {
    console.log(`🌐 Mock API call starting (delay: ${delay}ms)`)
  }

  // 지연 시뮬레이션
  await new Promise(resolve => setTimeout(resolve, delay))

  // 에러 시뮬레이션
  if (!options.disableErrors && (options.customError || shouldSimulateError())) {
    const error = options.customError || getRandomError()
    
    if (currentConfig.enableLogging) {
      console.error('❌ Mock API error:', error)
    }
    
    throw error
  }

  // 성공 응답
  const data = typeof mockData === 'function' ? (mockData as () => T)() : mockData
  const response = createSuccessResponse(data, options.successStatus)
  
  if (currentConfig.enableLogging) {
    console.log('✅ Mock API success:', response)
  }
  
  return response
}

/**
 * 페이지네이션 모킹 유틸리티
 */
export interface PaginatedResponse<T> {
  items: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export function createPaginatedMockData<T>(
  allData: T[],
  page: number = 1,
  limit: number = 10
): PaginatedResponse<T> {
  const total = allData.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const items = allData.slice(startIndex, endIndex)

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  }
}

/**
 * 검색 결과 모킹 유틸리티
 */
export function createSearchMockData<T>(
  allData: T[],
  searchTerm: string,
  searchFields: (keyof T)[],
  page: number = 1,
  limit: number = 10
): PaginatedResponse<T> {
  if (!searchTerm.trim()) {
    return createPaginatedMockData(allData, page, limit)
  }

  const filteredData = allData.filter(item => {
    return searchFields.some(field => {
      const value = item[field]
      if (typeof value === 'string') {
        return value.toLowerCase().includes(searchTerm.toLowerCase())
      }
      return false
    })
  })

  return createPaginatedMockData(filteredData, page, limit)
}

/**
 * 정렬 모킹 유틸리티
 */
export type SortOrder = 'asc' | 'desc'

export function createSortedMockData<T>(
  data: T[],
  sortField: keyof T,
  sortOrder: SortOrder = 'asc'
): T[] {
  return [...data].sort((a, b) => {
    const aValue = a[sortField]
    const bValue = b[sortField]

    if (aValue === bValue) return 0

    const comparison = aValue < bValue ? -1 : 1
    return sortOrder === 'asc' ? comparison : -comparison
  })
}

/**
 * 실시간 업데이트 모킹 (WebSocket 시뮬레이션)
 */
export class MockWebSocket {
  private listeners: Map<string, Function[]> = new Map()
  private isConnected = false
  private connectionDelay = 1000

  constructor(options: { connectionDelay?: number } = {}) {
    this.connectionDelay = options.connectionDelay ?? 1000
  }

  async connect(): Promise<void> {
    if (currentConfig.enableLogging) {
      console.log('🔌 Mock WebSocket connecting...')
    }

    await new Promise(resolve => setTimeout(resolve, this.connectionDelay))
    
    this.isConnected = true
    
    if (currentConfig.enableLogging) {
      console.log('✅ Mock WebSocket connected')
    }

    this.emit('connect', { timestamp: new Date().toISOString() })
  }

  disconnect(): void {
    this.isConnected = false
    this.emit('disconnect', { timestamp: new Date().toISOString() })
    
    if (currentConfig.enableLogging) {
      console.log('❌ Mock WebSocket disconnected')
    }
  }

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event)!.push(callback)
  }

  off(event: string, callback: Function): void {
    const callbacks = this.listeners.get(event)
    if (callbacks) {
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event) || []
    callbacks.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Mock WebSocket callback error:', error)
      }
    })
  }

  send(data: any): void {
    if (!this.isConnected) {
      throw new Error('WebSocket is not connected')
    }

    // 에코 응답 시뮬레이션
    setTimeout(() => {
      this.emit('message', {
        type: 'echo',
        data,
        timestamp: new Date().toISOString()
      })
    }, 100)
  }

  // 주기적 데이터 전송 시뮬레이션
  startPeriodicUpdates(interval: number = 5000): () => void {
    const intervalId = setInterval(() => {
      if (this.isConnected) {
        this.emit('update', {
          type: 'periodic',
          data: {
            timestamp: new Date().toISOString(),
            value: Math.random()
          }
        })
      }
    }, interval)

    return () => clearInterval(intervalId)
  }
}

/**
 * 파일 업로드 모킹
 */
export interface MockUploadProgress {
  loaded: number
  total: number
  percentage: number
  speed: number // bytes per second
}

export async function mockFileUpload(
  file: File,
  onProgress?: (progress: MockUploadProgress) => void
): Promise<ApiResponse<{ fileId: string; url: string }>> {
  const totalSize = file.size
  let loaded = 0
  const speed = 100000 // 100KB/s
  const chunkSize = Math.min(10000, totalSize) // 10KB chunks

  while (loaded < totalSize) {
    await new Promise(resolve => setTimeout(resolve, 100))
    
    loaded = Math.min(loaded + chunkSize, totalSize)
    
    if (onProgress) {
      onProgress({
        loaded,
        total: totalSize,
        percentage: Math.floor((loaded / totalSize) * 100),
        speed
      })
    }
  }

  return mockApiCall({
    fileId: `file_${Math.random().toString(36).substr(2, 9)}`,
    url: `https://mock-cdn.example.com/${file.name}`
  })
}

/**
 * 캐싱 모킹 유틸리티
 */
class MockCache {
  private cache = new Map<string, { data: any; expiry: number }>()

  set(key: string, data: any, ttl: number = 300000): void { // 기본 5분
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    })
  }

  get(key: string): any | null {
    const cached = this.cache.get(key)
    if (!cached) return null

    if (Date.now() > cached.expiry) {
      this.cache.delete(key)
      return null
    }

    return cached.data
  }

  delete(key: string): boolean {
    return this.cache.delete(key)
  }

  clear(): void {
    this.cache.clear()
  }
}

export const mockCache = new MockCache()

/**
 * 캐시된 API 호출
 */
export async function cachedMockApiCall<T>(
  key: string,
  mockData: T | (() => T),
  options: Parameters<typeof mockApiCall>[1] & { cacheTtl?: number } = {}
): Promise<ApiResponse<T>> {
  const cached = mockCache.get(key)
  if (cached) {
    if (currentConfig.enableLogging) {
      console.log(`💾 Cache hit for key: ${key}`)
    }
    return cached
  }

  const response = await mockApiCall(mockData, options)
  mockCache.set(key, response, options.cacheTtl)

  if (currentConfig.enableLogging) {
    console.log(`💾 Cache miss for key: ${key}, cached result`)
  }

  return response
}