/**
 * API 응답 캐싱 시스템
 * 메모리 기반 LRU 캐시와 브라우저 저장소를 활용한 다층 캐싱 전략
 */

import { ApiResponse } from './client'

export interface CacheOptions {
  ttl?: number // Time To Live (seconds)
  strategy?: 'memory' | 'localStorage' | 'sessionStorage' | 'hybrid'
  key?: string // 커스텀 캐시 키
  tags?: string[] // 캐시 태그 (무효화용)
  staleWhileRevalidate?: boolean // 백그라운드 갱신 허용
  maxSize?: number // 최대 캐시 크기
}

export interface CacheEntry<T = unknown> {
  data: T
  timestamp: number
  ttl: number
  tags: string[]
  accessCount: number
  lastAccessed: number
  key: string
}

// LRU 캐시 구현
class LRUCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>()
  private accessOrder = new Set<string>()
  
  constructor(private maxSize: number = 100) {}
  
  get(key: string): CacheEntry<T> | null {
    const entry = this.cache.get(key)
    
    if (!entry) return null
    
    // TTL 확인
    const now = Date.now()
    if (now - entry.timestamp > entry.ttl * 1000) {
      this.delete(key)
      return null
    }
    
    // 접근 정보 업데이트
    entry.accessCount++
    entry.lastAccessed = now
    
    // LRU 순서 업데이트
    this.accessOrder.delete(key)
    this.accessOrder.add(key)
    
    return entry
  }
  
  set(key: string, entry: CacheEntry<T>): void {
    // 기존 엔트리 제거
    if (this.cache.has(key)) {
      this.accessOrder.delete(key)
    }
    
    // 용량 초과 시 가장 오래된 항목 제거
    while (this.cache.size >= this.maxSize) {
      const oldestKey = this.accessOrder.values().next().value
      if (oldestKey) {
        this.delete(oldestKey)
      }
    }
    
    // 새 엔트리 추가
    this.cache.set(key, entry)
    this.accessOrder.add(key)
  }
  
  delete(key: string): boolean {
    this.accessOrder.delete(key)
    return this.cache.delete(key)
  }
  
  clear(): void {
    this.cache.clear()
    this.accessOrder.clear()
  }
  
  size(): number {
    return this.cache.size
  }
  
  keys(): IterableIterator<string> {
    return this.cache.keys()
  }
  
  // 태그 기반 무효화
  invalidateByTag(tag: string): void {
    const keysToDelete: string[] = []
    
    this.cache.forEach((entry, key) => {
      if (entry.tags.includes(tag)) {
        keysToDelete.push(key)
      }
    })
    
    keysToDelete.forEach(key => this.delete(key))
  }
  
  // 통계 정보
  getStats(): {
    size: number
    hitRate: number
    entries: Array<{ key: string; accessCount: number; lastAccessed: number }>
  } {
    const entries: Array<{ key: string; accessCount: number; lastAccessed: number }> = []
    let totalAccess = 0
    
    this.cache.forEach((entry, key) => {
      entries.push({
        key,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed
      })
      totalAccess += entry.accessCount
    })
    
    const hitRate = entries.length > 0 ? totalAccess / entries.length : 0
    
    return { size: this.cache.size, hitRate, entries }
  }
}

// 브라우저 스토리지 유틸리티
class BrowserStorageAdapter {
  private storage: Storage | null = null
  
  constructor(type: 'localStorage' | 'sessionStorage') {
    if (typeof window !== 'undefined') {
      this.storage = type === 'localStorage' ? window.localStorage : window.sessionStorage
    }
  }
  
  get<T>(key: string): CacheEntry<T> | null {
    if (!this.storage) return null
    
    try {
      const item = this.storage.getItem(key)
      if (!item) return null
      
      const entry: CacheEntry<T> = JSON.parse(item)
      
      // TTL 확인
      const now = Date.now()
      if (now - entry.timestamp > entry.ttl * 1000) {
        this.delete(key)
        return null
      }
      
      return entry
    } catch (error) {
      console.warn('스토리지 캐시 읽기 실패:', error)
      return null
    }
  }
  
  set<T>(key: string, entry: CacheEntry<T>): boolean {
    if (!this.storage) return false
    
    try {
      this.storage.setItem(key, JSON.stringify(entry))
      return true
    } catch (error) {
      // 스토리지 용량 초과 등의 경우
      console.warn('스토리지 캐시 저장 실패:', error)
      return false
    }
  }
  
  delete(key: string): boolean {
    if (!this.storage) return false
    
    this.storage.removeItem(key)
    return true
  }
  
  clear(): void {
    if (!this.storage) return
    
    // 캐시 키만 삭제 (다른 데이터는 보존)
    const keysToDelete: string[] = []
    
    for (let i = 0; i < this.storage.length; i++) {
      const key = this.storage.key(i)
      if (key?.startsWith('api-cache:')) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.storage!.removeItem(key))
  }
}

// 메인 캐시 매니저
export class ApiCacheManager {
  private memoryCache = new LRUCache<ApiResponse>(200)
  private localStorageAdapter = new BrowserStorageAdapter('localStorage')
  private sessionStorageAdapter = new BrowserStorageAdapter('sessionStorage')
  
  private static instance: ApiCacheManager
  
  static getInstance(): ApiCacheManager {
    if (!ApiCacheManager.instance) {
      ApiCacheManager.instance = new ApiCacheManager()
    }
    return ApiCacheManager.instance
  }
  
  /**
   * 캐시 키 생성
   */
  private generateCacheKey(url: string, method: string = 'GET', customKey?: string): string {
    if (customKey) return `api-cache:${customKey}`
    
    // URL과 메소드를 기반으로 해시 생성
    const baseKey = `${method}:${url}`
    return `api-cache:${this.simpleHash(baseKey)}`
  }
  
  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36)
  }
  
  /**
   * 캐시된 데이터 조회
   */
  async get<T>(
    url: string, 
    method: string = 'GET', 
    options: Pick<CacheOptions, 'strategy' | 'key' | 'staleWhileRevalidate'> = {}
  ): Promise<{ data: ApiResponse<T>; isStale: boolean } | null> {
    const { strategy = 'hybrid', key: customKey, staleWhileRevalidate = false } = options
    const cacheKey = this.generateCacheKey(url, method, customKey)
    
    let entry: CacheEntry<ApiResponse<T>> | null = null
    
    // 메모리 캐시 우선 조회
    if (strategy === 'memory' || strategy === 'hybrid') {
      entry = this.memoryCache.get(cacheKey) as CacheEntry<ApiResponse<T>> | null
    }
    
    // 브라우저 스토리지 조회
    if (!entry && (strategy === 'localStorage' || strategy === 'hybrid')) {
      entry = this.localStorageAdapter.get<ApiResponse<T>>(cacheKey)
    }
    
    if (!entry && (strategy === 'sessionStorage' || strategy === 'hybrid')) {
      entry = this.sessionStorageAdapter.get<ApiResponse<T>>(cacheKey)
    }
    
    if (!entry) return null
    
    const now = Date.now()
    const age = now - entry.timestamp
    const isStale = age > entry.ttl * 1000
    
    // stale-while-revalidate 전략
    if (isStale && !staleWhileRevalidate) {
      this.delete(url, method, { key: customKey, strategy })
      return null
    }
    
    return {
      data: entry.data,
      isStale: isStale && staleWhileRevalidate
    }
  }
  
  /**
   * 캐시에 데이터 저장
   */
  async set<T>(
    url: string,
    method: string = 'GET',
    data: ApiResponse<T>,
    options: CacheOptions = {}
  ): Promise<void> {
    const {
      ttl = 300, // 기본 5분
      strategy = 'hybrid',
      key: customKey,
      tags = [],
      maxSize = 200
    } = options
    
    const cacheKey = this.generateCacheKey(url, method, customKey)
    
    const entry: CacheEntry<ApiResponse<T>> = {
      data,
      timestamp: Date.now(),
      ttl,
      tags: [...tags, method, this.extractPathFromUrl(url)],
      accessCount: 1,
      lastAccessed: Date.now(),
      key: cacheKey
    }
    
    // 메모리 캐시 저장
    if (strategy === 'memory' || strategy === 'hybrid') {
      this.memoryCache.set(cacheKey, entry)
    }
    
    // 브라우저 스토리지 저장 (용량이 큰 데이터는 제외)
    const dataSize = JSON.stringify(data).length
    const maxStorageSize = 50 * 1024 // 50KB
    
    if (dataSize < maxStorageSize) {
      if (strategy === 'localStorage' || strategy === 'hybrid') {
        this.localStorageAdapter.set(cacheKey, entry)
      }
      
      if (strategy === 'sessionStorage') {
        this.sessionStorageAdapter.set(cacheKey, entry)
      }
    }
  }
  
  /**
   * 캐시 삭제
   */
  async delete(
    url: string,
    method: string = 'GET',
    options: Pick<CacheOptions, 'strategy' | 'key'> = {}
  ): Promise<void> {
    const { strategy = 'hybrid', key: customKey } = options
    const cacheKey = this.generateCacheKey(url, method, customKey)
    
    if (strategy === 'memory' || strategy === 'hybrid') {
      this.memoryCache.delete(cacheKey)
    }
    
    if (strategy === 'localStorage' || strategy === 'hybrid') {
      this.localStorageAdapter.delete(cacheKey)
    }
    
    if (strategy === 'sessionStorage') {
      this.sessionStorageAdapter.delete(cacheKey)
    }
  }
  
  /**
   * 태그 기반 무효화
   */
  async invalidateByTag(tag: string): Promise<void> {
    this.memoryCache.invalidateByTag(tag)
    
    // 브라우저 스토리지의 태그 기반 무효화는 전체 순회가 필요
    // 성능을 고려하여 메모리 캐시만 처리하거나, 필요시 별도 구현
  }
  
  /**
   * 전체 캐시 클리어
   */
  async clear(): Promise<void> {
    this.memoryCache.clear()
    this.localStorageAdapter.clear()
    this.sessionStorageAdapter.clear()
  }
  
  /**
   * 캐시 통계
   */
  getStats(): {
    memory: ReturnType<LRUCache['getStats']>
    totalSize: number
  } {
    return {
      memory: this.memoryCache.getStats(),
      totalSize: this.memoryCache.size()
    }
  }
  
  private extractPathFromUrl(url: string): string {
    try {
      const urlObj = new URL(url)
      return urlObj.pathname
    } catch {
      return url
    }
  }
}

// 싱글톤 인스턴스
export const apiCache = ApiCacheManager.getInstance()

// 엔드포인트별 캐시 설정
export const CACHE_CONFIGS: Record<string, CacheOptions> = {
  '/api/menu/items': {
    ttl: 600, // 10분
    strategy: 'hybrid',
    tags: ['menu', 'navigation']
  },
  '/api/menu/submenu': {
    ttl: 300, // 5분
    strategy: 'hybrid',
    tags: ['menu', 'submenu']
  },
  '/api/projects': {
    ttl: 180, // 3분
    strategy: 'hybrid',
    tags: ['projects'],
    staleWhileRevalidate: true
  },
  '/api/feedback': {
    ttl: 120, // 2분
    strategy: 'memory', // 자주 변경되므로 메모리만
    tags: ['feedback']
  },
  '/api/health': {
    ttl: 30, // 30초
    strategy: 'memory',
    tags: ['health']
  }
}

/**
 * 엔드포인트에 맞는 캐시 설정 가져오기
 */
export function getCacheConfigForEndpoint(endpoint: string): CacheOptions {
  // 정확히 일치하는 설정 찾기
  if (CACHE_CONFIGS[endpoint]) {
    return CACHE_CONFIGS[endpoint]
  }
  
  // 패턴 매칭으로 찾기
  const matchingConfig = Object.entries(CACHE_CONFIGS)
    .find(([pattern]) => endpoint.startsWith(pattern))
  
  return matchingConfig 
    ? matchingConfig[1] 
    : { ttl: 300, strategy: 'memory', tags: [] } // 기본값
}