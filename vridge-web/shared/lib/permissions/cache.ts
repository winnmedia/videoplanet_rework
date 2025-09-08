/**
 * RBAC 권한 캐싱 시스템
 * 성능 최적화를 위한 메모리 기반 권한 캐시
 */

import { PermissionChecker } from '@/entities/rbac/lib/permissionChecker'
import type { 
  RBACUser, 
  Permission, 
  PermissionCache,
  UserRole 
} from '@/entities/rbac/model/types'

/**
 * 캐시 설정
 */
interface CacheConfig {
  /** 캐시 만료 시간 (밀리초, 기본: 5분) */
  ttl: number
  /** 최대 캐시 항목 수 (기본: 1000) */
  maxSize: number
  /** 캐시 정리 간격 (밀리초, 기본: 1분) */
  cleanupInterval: number
}

/**
 * 기본 캐시 설정
 */
const DEFAULT_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5분
  maxSize: 1000,
  cleanupInterval: 60 * 1000 // 1분
}

/**
 * 권한 캐시 매니저
 */
class PermissionCacheManager {
  private cache = new Map<string, PermissionCache>()
  private config: CacheConfig
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
    this.startCleanup()
  }

  /**
   * 캐시에서 사용자 권한 조회
   */
  get(userId: string): PermissionCache | null {
    const cached = this.cache.get(userId)
    
    if (!cached) {
      return null
    }

    // 만료 검사
    if (Date.now() > cached.expiresAt) {
      this.cache.delete(userId)
      return null
    }

    return cached
  }

  /**
   * 캐시에 사용자 권한 저장
   */
  set(userId: string, permissions: Permission[], projectPermissions: Record<string, Permission[]> = {}): void {
    // 캐시 크기 제한
    if (this.cache.size >= this.config.maxSize) {
      // LRU 방식으로 가장 오래된 항목 삭제
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) {
        this.cache.delete(oldestKey)
      }
    }

    const permissionCache: PermissionCache = {
      userId,
      permissions,
      projectPermissions,
      expiresAt: Date.now() + this.config.ttl,
      lastUpdated: new Date().toISOString()
    }

    this.cache.set(userId, permissionCache)
  }

  /**
   * 특정 사용자 캐시 무효화
   */
  invalidate(userId: string): void {
    this.cache.delete(userId)
  }

  /**
   * 모든 캐시 무효화
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * 캐시 통계 조회
   */
  getStats() {
    const now = Date.now()
    let expiredCount = 0
    let validCount = 0

    for (const cache of this.cache.values()) {
      if (now > cache.expiresAt) {
        expiredCount++
      } else {
        validCount++
      }
    }

    return {
      totalEntries: this.cache.size,
      validEntries: validCount,
      expiredEntries: expiredCount,
      cacheHitRate: this.getCacheHitRate(),
      memoryUsage: this.getMemoryUsage()
    }
  }

  /**
   * 만료된 캐시 정리
   */
  private cleanup(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, cache] of this.cache.entries()) {
      if (now > cache.expiresAt) {
        keysToDelete.push(key)
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key))

    if (keysToDelete.length > 0) {
      console.log(`Permission cache cleanup: removed ${keysToDelete.length} expired entries`)
    }
  }

  /**
   * 정기 캐시 정리 시작
   */
  private startCleanup(): void {
    this.cleanupTimer = setTimeout(() => {
      this.cleanup()
      // Recursive scheduling for continuous cleanup
      this.startCleanup()
    }, this.config.cleanupInterval)
  }

  /**
   * 캐시 정리 타이머 중지
   */
  stopCleanup(): void {
    if (this.cleanupTimer) {
      clearTimeout(this.cleanupTimer)
      this.cleanupTimer = undefined
    }
  }

  /**
   * 캐시 히트율 계산 (간단한 추정)
   */
  private getCacheHitRate(): number {
    // 실제 구현에서는 히트/미스 카운터를 유지해야 함
    return 0.85 // 예시 값
  }

  /**
   * 메모리 사용량 추정
   */
  private getMemoryUsage(): number {
    // 간단한 메모리 사용량 추정 (바이트)
    return this.cache.size * 1024 // 각 항목당 약 1KB로 추정
  }
}

/**
 * 전역 캐시 인스턴스
 */
export const permissionCache = new PermissionCacheManager()

/**
 * 캐시가 적용된 권한 검사기
 */
export class CachedPermissionChecker {
  /**
   * 캐시된 사용자 권한 조회
   */
  static async getUserPermissions(user: RBACUser): Promise<Permission[]> {
    // 1. 캐시 확인
    const cached = permissionCache.get(user.id)
    if (cached) {
      return cached.permissions
    }

    // 2. 캐시 미스인 경우 권한 계산
    const permissions = PermissionChecker.getValidPermissions(user)
    
    // 3. 캐시에 저장
    const projectPermissions = user.projectPermissions || {}
    permissionCache.set(user.id, permissions, projectPermissions)

    return permissions
  }

  /**
   * 캐시된 프로젝트별 권한 조회
   */
  static async getProjectPermissions(user: RBACUser, projectId: string): Promise<Permission[]> {
    // 1. 캐시 확인
    const cached = permissionCache.get(user.id)
    if (cached && cached.projectPermissions[projectId]) {
      return cached.projectPermissions[projectId]
    }

    // 2. 캐시 미스인 경우 프로젝트 권한 계산
    const projectPermissions = user.projectPermissions?.[projectId] || []
    const basePermissions = await this.getUserPermissions(user)
    const combinedPermissions = [...new Set([...basePermissions, ...projectPermissions])]

    // 3. 캐시 업데이트
    if (cached) {
      cached.projectPermissions[projectId] = combinedPermissions
      permissionCache.set(user.id, cached.permissions, cached.projectPermissions)
    } else {
      permissionCache.set(user.id, basePermissions, { [projectId]: combinedPermissions })
    }

    return combinedPermissions
  }

  /**
   * 캐시된 권한 검증
   */
  static async hasPermissionCached(
    user: RBACUser, 
    permission: Permission, 
    projectId?: string
  ): Promise<boolean> {
    try {
      let userPermissions: Permission[]

      if (projectId) {
        userPermissions = await this.getProjectPermissions(user, projectId)
      } else {
        userPermissions = await this.getUserPermissions(user)
      }

      return userPermissions.includes(permission)
    } catch (error) {
      console.error('Error checking cached permission:', error)
      // 캐시 오류 시 원본 검사기로 폴백
      const result = PermissionChecker.hasPermission(user, permission, { projectId })
      return result.allowed
    }
  }

  /**
   * 사용자 권한 변경 시 캐시 무효화
   */
  static invalidateUser(userId: string): void {
    permissionCache.invalidate(userId)
  }

  /**
   * 사용자 역할 변경 시 캐시 무효화
   */
  static invalidateUserRole(userId: string, newRole: UserRole): void {
    permissionCache.invalidate(userId)
    console.log(`Permission cache invalidated for user ${userId} due to role change to ${newRole}`)
  }

  /**
   * 프로젝트 권한 변경 시 관련 사용자들의 캐시 무효화
   */
  static invalidateProject(projectId: string, affectedUserIds: string[]): void {
    affectedUserIds.forEach(userId => {
      permissionCache.invalidate(userId)
    })
    console.log(`Permission cache invalidated for project ${projectId}, affected users: ${affectedUserIds.length}`)
  }
}

/**
 * 캐시 워밍업 - 자주 사용되는 사용자들의 권한을 미리 캐시
 */
export async function warmupPermissionCache(users: RBACUser[]): Promise<void> {
  console.log(`Warming up permission cache for ${users.length} users...`)
  
  const promises = users.map(async (user) => {
    try {
      await CachedPermissionChecker.getUserPermissions(user)
    } catch (error) {
      console.error(`Failed to warm up cache for user ${user.id}:`, error)
    }
  })

  await Promise.all(promises)
  console.log('Permission cache warmup completed')
}

/**
 * 캐시 건강 상태 모니터링
 */
export function getPermissionCacheHealth() {
  const stats = permissionCache.getStats()
  const isHealthy = stats.validEntries > 0 && stats.cacheHitRate > 0.5

  return {
    ...stats,
    isHealthy,
    status: isHealthy ? 'healthy' : 'degraded',
    recommendations: isHealthy ? [] : [
      'Consider increasing cache TTL',
      'Review cache size limits',
      'Check for memory pressure'
    ]
  }
}

// 프로세스 종료 시 캐시 정리
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    permissionCache.stopCleanup()
  })
}