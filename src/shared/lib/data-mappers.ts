/**
 * VLANET 데이터 변환 레이어 - DTO ↔ Domain Model ↔ ViewModel
 * 
 * 서버 DTO(snake_case)를 도메인 모델(camelCase)로, 
 * 도메인 모델을 UI ViewModel로 안전하게 변환합니다.
 * 
 * 핵심 원칙:
 * - 모든 변환에서 데이터 계약 검증 수행
 * - GDPR 준수 데이터 필터링
 * - 결정론적 변환 (동일 입력 → 동일 출력)
 * - 오류 내성 (부분 실패 허용)
 */

import { z } from 'zod'
import {
  userDataContract,
  projectDataContract,
  videoDataContract,
  analyticsDataContract,
  pipelineProgressContract,
  DataContractValidator,
  type UserData,
  type ProjectData,
  type VideoData,
  type AnalyticsData,
  type PipelineProgress
} from './data-contracts'

// =============================================================================
// 변환 결과 타입
// =============================================================================

export interface MapperResult<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    violations: Array<{
      field: string
      message: string
      severity: 'error' | 'warning'
    }>
  }
}

export interface AnonymizationOptions {
  includePersonalData: boolean
  includeAnalytics: boolean
  retentionPeriod: number // days
}

// =============================================================================
// ViewModel 타입 정의
// =============================================================================

export interface UserViewModel {
  displayInfo: {
    name: string
    initials: string
    avatar?: string
    role: string
    roleDisplayName: string
  }
  status: {
    isOnline: boolean
    lastSeen?: string
    isActive: boolean
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    language: string
    notifications: {
      email: boolean
      push: boolean
      feedbackReceived: boolean
      projectUpdates: boolean
      systemMessages: boolean
    }
    videoSettings: {
      autoplay: boolean
      quality: string
      volume: number
      playbackSpeed: number
    }
  }
  activity: {
    totalHoursWatched: number
    projectsCreated: number
    sessionsThisWeek: number
    joinedDate: string
  }
  gdprStatus: {
    consentGiven: boolean
    dataRetentionExpiry: string
    canRequestDeletion: boolean
  }
}

export interface ProjectViewModel {
  displayInfo: {
    name: string
    description?: string
    category: string
    status: string
    statusColor: string
  }
  progress: {
    overall: number
    currentPhase: {
      name: string
      progress: number
      status: string
    }
    phases: Array<{
      id: string
      name: string
      status: string
      progress: number
      isActive: boolean
    }>
  }
  timeline: {
    createdAt: string
    updatedAt: string
    estimatedCompletion?: string
    timeRemaining?: string
  }
  team: {
    owner: {
      id: string
      name: string
      role: string
    }
    memberCount: number
    canInvite: boolean
  }
  resources: {
    videoCount: number
    commentCount: number
    storageUsed: string
    budgetUsed?: number
  }
}

export interface VideoViewModel {
  displayInfo: {
    title: string
    description?: string
    duration: number
    durationFormatted: string
    thumbnailUrl?: string
  }
  technical: {
    resolution: string
    format: string
    fileSize: string
    quality: string
    status: string
  }
  playback: {
    hlsUrl?: string
    mp4Url?: string
    previewUrl?: string
    canDownload: boolean
  }
  aiInfo?: {
    model: string
    version: string
    qualityScore: number
    generatedAt: string
    revisionCount: number
  }
  metadata: {
    tags: string[]
    language: string
    transcription?: string
    uploadedBy: string
    uploadedAt: string
  }
}

// =============================================================================
// User DTO Mapper
// =============================================================================

export class UserDtoMapper {
  /**
   * 서버 DTO → 도메인 모델 변환
   */
  static fromDto(dto: unknown): MapperResult<UserData> {
    try {
      // snake_case → camelCase 변환
      const transformed = this.transformKeys(dto)
      
      // 데이터 계약 검증
      const validation = DataContractValidator.validateWithReport(
        userDataContract,
        transformed
      )

      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VALIDATION_FAILED',
            message: '사용자 데이터 검증 실패',
            violations: validation.errors
          }
        }
      }

      return {
        success: true,
        data: validation.data!
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'TRANSFORMATION_ERROR',
          message: 'DTO 변환 중 오류 발생',
          violations: [{
            field: 'root',
            message: error instanceof Error ? error.message : '알 수 없는 오류',
            severity: 'error'
          }]
        }
      }
    }
  }

  /**
   * 도메인 모델 → ViewModel 변환
   */
  static toViewModel(user: UserData): UserViewModel {
    return {
      displayInfo: {
        name: user.displayName || user.username,
        initials: this.generateInitials(user.displayName || user.username),
        avatar: user.avatar,
        role: user.role,
        roleDisplayName: this.getRoleDisplayName(user.role)
      },
      status: {
        isOnline: false, // 실시간 상태는 별도 시스템에서 관리
        lastSeen: user.activityMetrics.lastLoginAt,
        isActive: user.isActive
      },
      preferences: {
        theme: user.profile.preferences.theme,
        language: user.profile.preferences.language,
        notifications: user.profile.preferences.notifications,
        videoSettings: user.profile.preferences.videoSettings
      },
      activity: {
        totalHoursWatched: Math.round(user.activityMetrics.totalWatchTime / (1000 * 60 * 60)),
        projectsCreated: user.activityMetrics.projectsCreated,
        sessionsThisWeek: 0, // 별도 계산 필요
        joinedDate: user.createdAt
      },
      gdprStatus: {
        consentGiven: user.gdprConsent.consentGiven,
        dataRetentionExpiry: new Date(
          new Date(user.gdprConsent.consentDate).getTime() + user.gdprConsent.retentionPeriod
        ).toISOString(),
        canRequestDeletion: true
      }
    }
  }

  /**
   * GDPR 준수 데이터 익명화
   */
  static sanitizeForGDPR(
    user: Partial<UserData>, 
    options: AnonymizationOptions
  ): Partial<UserData> {
    const sanitized = { ...user }

    if (!options.includePersonalData) {
      // PII 제거
      delete sanitized.email
      delete sanitized.username
      delete sanitized.displayName
      delete sanitized.avatar
      
      // 익명 ID로 변경
      if (sanitized.id) {
        sanitized.id = `usr_anonymous_${this.generateAnonymousId(sanitized.id)}`
      }
    }

    if (!options.includeAnalytics) {
      delete sanitized.activityMetrics
    }

    return sanitized
  }

  /**
   * snake_case → camelCase 키 변환
   */
  private static transformKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(item => this.transformKeys(item))

    const transformed: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = this.toCamelCase(key)
      transformed[camelKey] = this.transformKeys(value)
    }
    return transformed
  }

  private static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }

  private static generateInitials(name: string): string {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2)
  }

  private static getRoleDisplayName(role: string): string {
    const roleMap = {
      admin: '관리자',
      manager: '매니저',
      creator: '크리에이터',
      reviewer: '검토자',
      viewer: '뷰어'
    }
    return roleMap[role as keyof typeof roleMap] || role
  }

  private static generateAnonymousId(originalId: string): string {
    // 결정론적 익명 ID 생성 (해시 기반)
    let hash = 0
    for (let i = 0; i < originalId.length; i++) {
      const char = originalId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 32bit 정수로 변환
    }
    return Math.abs(hash).toString(36)
  }
}

// =============================================================================
// Project DTO Mapper
// =============================================================================

export class ProjectDtoMapper {
  static fromDto(dto: unknown): MapperResult<ProjectData> {
    try {
      const transformed = this.transformKeys(dto)
      
      const validation = DataContractValidator.validateWithReport(
        projectDataContract,
        transformed
      )

      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'PROJECT_VALIDATION_FAILED',
            message: '프로젝트 데이터 검증 실패',
            violations: validation.errors
          }
        }
      }

      return {
        success: true,
        data: validation.data!
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PROJECT_TRANSFORMATION_ERROR',
          message: 'Project DTO 변환 중 오류 발생',
          violations: [{
            field: 'root',
            message: error instanceof Error ? error.message : '알 수 없는 오류',
            severity: 'error'
          }]
        }
      }
    }
  }

  static toViewModel(project: ProjectData): ProjectViewModel {
    return {
      displayInfo: {
        name: project.name,
        description: project.description,
        category: project.metadata.category,
        status: project.status,
        statusColor: this.getStatusColor(project.status)
      },
      progress: {
        overall: this.calculateOverallProgress(project.pipeline.phases),
        currentPhase: this.getCurrentPhaseInfo(project.pipeline),
        phases: project.pipeline.phases.map((phase, index) => ({
          id: phase.id,
          name: phase.name,
          status: phase.status,
          progress: phase.progress,
          isActive: phase.id === project.pipeline.currentPhase
        }))
      },
      timeline: {
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        estimatedCompletion: project.pipeline.estimatedCompletion,
        timeRemaining: this.calculateTimeRemaining(project.pipeline.estimatedCompletion)
      },
      team: {
        owner: {
          id: project.owner.userId,
          name: 'Project Owner', // 실제로는 User 엔티티에서 가져와야 함
          role: project.owner.role
        },
        memberCount: project.members.length + 1, // +1 for owner
        canInvite: project.owner.permissions.canInviteMembers
      },
      resources: {
        videoCount: 0, // 별도 집계 필요
        commentCount: 0, // 별도 집계 필요
        storageUsed: '0 MB', // 별도 계산 필요
        budgetUsed: project.metadata.budget?.spent
      }
    }
  }

  static toExportFormat(
    project: ProjectData, 
    options: {
      includeMembers: boolean
      includeVideos: boolean
      includeComments: boolean
      format: 'json' | 'csv' | 'xml'
    }
  ) {
    const exportData: any = {
      metadata: {
        version: '1.0.0',
        schema: 'vridge_project_v1',
        exportedAt: new Date().toISOString(),
        format: options.format
      },
      data: {
        project: {
          id: project.id,
          name: project.name,
          description: project.description,
          status: project.status,
          createdAt: project.createdAt,
          updatedAt: project.updatedAt
        }
      }
    }

    if (options.includeMembers) {
      exportData.data.members = project.members
    }

    return exportData
  }

  private static transformKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(item => this.transformKeys(item))

    const transformed: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = this.toCamelCase(key)
      transformed[camelKey] = this.transformKeys(value)
    }
    return transformed
  }

  private static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }

  private static calculateOverallProgress(phases: any[]): number {
    if (phases.length === 0) return 0
    const totalProgress = phases.reduce((sum, phase) => sum + phase.progress, 0)
    return Math.round((totalProgress / phases.length) * 100) / 100
  }

  private static getCurrentPhaseInfo(pipeline: any) {
    const currentPhase = pipeline.phases.find(
      (phase: any) => phase.id === pipeline.currentPhase
    )
    return {
      name: currentPhase?.name || 'Unknown',
      progress: currentPhase?.progress || 0,
      status: currentPhase?.status || 'pending'
    }
  }

  private static getStatusColor(status: string): string {
    const colorMap = {
      draft: '#gray',
      planning: '#blue',
      in_progress: '#yellow',
      review: '#orange',
      completed: '#green',
      cancelled: '#red',
      on_hold: '#purple'
    }
    return colorMap[status as keyof typeof colorMap] || '#gray'
  }

  private static calculateTimeRemaining(estimatedCompletion?: string): string | undefined {
    if (!estimatedCompletion) return undefined
    
    const now = new Date()
    const completion = new Date(estimatedCompletion)
    const diff = completion.getTime() - now.getTime()
    
    if (diff <= 0) return '지연됨'
    
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
    if (days === 1) return '1일 남음'
    return `${days}일 남음`
  }
}

// =============================================================================
// Video DTO Mapper
// =============================================================================

export class VideoDtoMapper {
  static fromDto(dto: unknown): MapperResult<VideoData> {
    try {
      const transformed = this.transformKeys(dto)
      
      const validation = DataContractValidator.validateWithReport(
        videoDataContract,
        transformed
      )

      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'VIDEO_VALIDATION_FAILED',
            message: '비디오 데이터 검증 실패',
            violations: validation.errors
          }
        }
      }

      return {
        success: true,
        data: validation.data!
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'VIDEO_TRANSFORMATION_ERROR',
          message: 'Video DTO 변환 중 오류 발생',
          violations: [{
            field: 'root',
            message: error instanceof Error ? error.message : '알 수 없는 오류',
            severity: 'error'
          }]
        }
      }
    }
  }

  static toViewModel(video: VideoData): VideoViewModel {
    return {
      displayInfo: {
        title: video.title,
        description: video.description,
        duration: video.duration,
        durationFormatted: this.formatDuration(video.duration),
        thumbnailUrl: video.metadata.thumbnailUrl
      },
      technical: {
        resolution: `${video.resolution.width}x${video.resolution.height}`,
        format: video.format.toUpperCase(),
        fileSize: this.formatFileSize(video.fileSize),
        quality: video.quality,
        status: video.status
      },
      playback: {
        hlsUrl: video.storageLocation.cdn ? `${video.storageLocation.cdn}/playlist.m3u8` : undefined,
        mp4Url: video.storageLocation.cdn ? `${video.storageLocation.cdn}/${video.filename}` : undefined,
        previewUrl: video.metadata.previewUrl,
        canDownload: video.accessControl.downloadPermissions !== undefined
      },
      aiInfo: video.aiGeneration ? {
        model: video.aiGeneration.model,
        version: video.aiGeneration.version,
        qualityScore: video.aiGeneration.qualityScore,
        generatedAt: video.aiGeneration.generatedAt,
        revisionCount: video.aiGeneration.revisionHistory.length
      } : undefined,
      metadata: {
        tags: video.metadata.tags,
        language: video.metadata.language,
        transcription: video.metadata.transcription,
        uploadedBy: video.uploadedBy,
        uploadedAt: video.createdAt
      }
    }
  }

  static generateUrls(
    video: { id: string },
    config: {
      cdnBase: string
      thumbnailSize: 'small' | 'medium' | 'large'
      previewDuration: number
    }
  ) {
    const baseUrl = `${config.cdnBase}/${video.id}`
    return {
      thumbnail: `${baseUrl}/thumb-${config.thumbnailSize}.jpg`,
      preview: `${baseUrl}/preview-${config.previewDuration}s.mp4`,
      hls: `${baseUrl}/playlist.m3u8`
    }
  }

  private static transformKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(item => this.transformKeys(item))

    const transformed: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = this.toCamelCase(key)
      transformed[camelKey] = this.transformKeys(value)
    }
    return transformed
  }

  private static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }

  private static formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  private static formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`
  }
}

// =============================================================================
// Analytics DTO Mapper
// =============================================================================

export class AnalyticsDtoMapper {
  static fromDto(dto: unknown): MapperResult<AnalyticsData> {
    try {
      const transformed = this.transformKeys(dto)
      
      const validation = DataContractValidator.validateWithReport(
        analyticsDataContract,
        transformed
      )

      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'ANALYTICS_VALIDATION_FAILED',
            message: '분석 데이터 검증 실패',
            violations: validation.errors
          }
        }
      }

      return {
        success: true,
        data: validation.data!
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'ANALYTICS_TRANSFORMATION_ERROR',
          message: 'Analytics DTO 변환 중 오류 발생',
          violations: [{
            field: 'root',
            message: error instanceof Error ? error.message : '알 수 없는 오류',
            severity: 'error'
          }]
        }
      }
    }
  }

  static anonymize(analytics: AnalyticsData): AnalyticsData {
    return {
      ...analytics,
      sessionId: `session_anonymous_${this.generateAnonymousId(analytics.sessionId)}`,
      userId: null, // 완전 익명화
      events: analytics.events.map(event => ({
        ...event,
        properties: this.sanitizeEventProperties(event.properties),
        anonymized: true
      })),
      gdprCompliant: true,
      retentionExpiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30일
    }
  }

  static aggregateMetrics(
    data: Array<{ date: string; pageViews: number; watchTime: number }>,
    options: {
      period: 'daily' | 'weekly' | 'monthly'
      metrics: string[]
      fillGaps: boolean
    }
  ) {
    const totalPageViews = data.reduce((sum, item) => sum + item.pageViews, 0)
    const totalWatchTime = data.reduce((sum, item) => sum + item.watchTime, 0)
    const averageWatchTime = Math.round((totalWatchTime / data.length) * 100) / 100

    return {
      totalPageViews,
      totalWatchTime,
      averageWatchTime,
      dataPoints: data,
      period: options.period
    }
  }

  private static transformKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(item => this.transformKeys(item))

    const transformed: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = this.toCamelCase(key)
      transformed[camelKey] = this.transformKeys(value)
    }
    return transformed
  }

  private static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }

  private static generateAnonymousId(originalId: string): string {
    let hash = 0
    for (let i = 0; i < originalId.length; i++) {
      const char = originalId.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36)
  }

  private static sanitizeEventProperties(properties: Record<string, unknown>): Record<string, unknown> {
    const sanitized = { ...properties }
    
    // PII 제거
    delete sanitized.user_agent
    delete sanitized.ip_address
    delete sanitized.referrer
    
    return sanitized
  }
}

// =============================================================================
// Pipeline DTO Mapper
// =============================================================================

export class PipelineDtoMapper {
  static fromDto(dto: unknown): MapperResult<PipelineProgress> {
    try {
      const transformed = this.transformKeys(dto)
      
      const validation = DataContractValidator.validateWithReport(
        pipelineProgressContract,
        transformed
      )

      if (!validation.isValid) {
        return {
          success: false,
          error: {
            code: 'PIPELINE_VALIDATION_FAILED',
            message: '파이프라인 데이터 검증 실패',
            violations: validation.errors
          }
        }
      }

      return {
        success: true,
        data: validation.data!
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'PIPELINE_TRANSFORMATION_ERROR',
          message: 'Pipeline DTO 변환 중 오류 발생',
          violations: [{
            field: 'root',
            message: error instanceof Error ? error.message : '알 수 없는 오류',
            severity: 'error'
          }]
        }
      }
    }
  }

  static calculateEstimates(pipeline: PipelineProgress) {
    const completedStages = pipeline.phases.filter(p => p.status === 'completed')
    const remainingStages = pipeline.phases.filter(p => p.status !== 'completed').length

    // 완료된 스테이지들의 평균 소요시간 계산
    let avgStageTime = 0
    if (completedStages.length > 0) {
      const totalTime = completedStages.reduce((sum, stage) => {
        if (stage.startedAt && stage.completedAt) {
          return sum + (new Date(stage.completedAt).getTime() - new Date(stage.startedAt).getTime())
        }
        return sum
      }, 0)
      avgStageTime = totalTime / completedStages.length
    }

    const estimatedRemainingTime = avgStageTime * remainingStages
    const estimatedCompletion = new Date(Date.now() + estimatedRemainingTime).toISOString()
    
    return {
      estimatedCompletion,
      remainingStages,
      confidence: completedStages.length >= 2 ? 0.8 : 0.5 // 더 많은 데이터가 있으면 높은 신뢰도
    }
  }

  static analyzePerformance(pipeline: { stages: Array<{ id: string; status: string; executionTime?: number; errorCount?: number }> }) {
    const bottlenecks = []
    const recommendations = []

    for (const stage of pipeline.stages) {
      if (stage.executionTime && stage.executionTime > 172800000) { // 2일 초과
        bottlenecks.push({
          stageId: stage.id,
          severity: 'high' as const,
          issue: 'Long execution time',
          impact: 'Delays overall pipeline completion'
        })
        recommendations.push(`Review ${stage.id} configuration`)
      }

      if (stage.errorCount && stage.errorCount > 3) {
        bottlenecks.push({
          stageId: stage.id,
          severity: 'medium' as const,
          issue: 'High error count',
          impact: 'May cause reliability issues'
        })
      }
    }

    return {
      bottlenecks,
      recommendations,
      overallHealth: bottlenecks.length === 0 ? 'healthy' : 'needs_attention'
    }
  }

  private static transformKeys(obj: any): any {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(item => this.transformKeys(item))

    const transformed: any = {}
    for (const [key, value] of Object.entries(obj)) {
      const camelKey = this.toCamelCase(key)
      transformed[camelKey] = this.transformKeys(value)
    }
    return transformed
  }

  private static toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
  }
}