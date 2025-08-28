/**
 * 핵심 사용자 여정 모니터링 시스템
 * 비즈니스 크리티컬한 사용자 경로를 추적하고 이탈 지점을 실시간 감지
 */

import { 
  CriticalUserJourney, 
  UserJourneyEvent, 
  BusinessMetric,
  MonitoringSchemaValidator 
} from '@/shared/api/monitoring-schemas'
import { realTimeDataCollector } from './real-time-data-collector'
import { alertManager } from '@/lib/api/monitoring'

// 비즈니스 크리티컬 여정 정의
export enum CriticalJourneyType {
  ONBOARDING = 'onboarding',
  PROJECT_CREATION = 'project_creation', 
  VIDEO_UPLOAD = 'video_upload',
  FEEDBACK_SUBMISSION = 'feedback_submission',
  COLLABORATION = 'collaboration',
  SUBMENU_NAVIGATION = 'submenu_navigation'
}

// 여정 단계 정의
export interface JourneyStep {
  stepId: string
  stepName: string
  expectedMaxDuration: number // 밀리초
  isOptional: boolean
  successCriteria: string[]
  errorIndicators: string[]
  businessValue: number // 1-10 점수
}

// 여정 설정
export interface JourneyDefinition {
  journeyType: CriticalJourneyType
  name: string
  description: string
  steps: JourneyStep[]
  maxTotalDuration: number // 밀리초
  conversionGoal: string
  businessPriority: 'low' | 'medium' | 'high' | 'critical'
  targetCompletionRate: number // 0-1
  alertThresholds: {
    abandonmentRate: number // 0-1
    avgDuration: number // 밀리초
    errorRate: number // 0-1
  }
}

// 활성 여정 추적
interface ActiveJourney {
  journeyId: string
  userId?: string
  sessionId: string
  journeyType: CriticalJourneyType
  startTime: string
  currentStep: string
  completedSteps: string[]
  stepTimestamps: Record<string, string>
  stepDurations: Record<string, number>
  errors: Array<{ step: string; error: string; timestamp: string }>
  metadata: Record<string, any>
  isAbandoned: boolean
  isCompleted: boolean
}

// 여정 통계
interface JourneyStats {
  journeyType: CriticalJourneyType
  totalStarted: number
  totalCompleted: number
  totalAbandoned: number
  completionRate: number
  abandonmentRate: number
  avgDuration: number
  errorRate: number
  commonDropOffPoints: Array<{ step: string; abandonmentRate: number }>
  performanceTrends: Array<{ date: string; completionRate: number; avgDuration: number }>
}

export class UserJourneyMonitor {
  private static instance: UserJourneyMonitor
  private activeJourneys: Map<string, ActiveJourney> = new Map()
  private journeyDefinitions: Map<CriticalJourneyType, JourneyDefinition> = new Map()
  private journeyStats: Map<CriticalJourneyType, JourneyStats> = new Map()
  private cleanupInterval: NodeJS.Timeout | null = null
  private debugMode: boolean

  private constructor() {
    this.debugMode = process.env.NODE_ENV !== 'production'
    this.initializeJourneyDefinitions()
    this.startCleanupTimer()
    this.setupEventListeners()
    
    if (this.debugMode) {
      console.log('[UserJourneyMonitor] Initialized with', this.journeyDefinitions.size, 'journey types')
    }
  }

  static getInstance(): UserJourneyMonitor {
    if (!UserJourneyMonitor.instance) {
      UserJourneyMonitor.instance = new UserJourneyMonitor()
    }
    return UserJourneyMonitor.instance
  }

  private initializeJourneyDefinitions(): void {
    // 온보딩 여정
    this.journeyDefinitions.set(CriticalJourneyType.ONBOARDING, {
      journeyType: CriticalJourneyType.ONBOARDING,
      name: '사용자 온보딩',
      description: '신규 사용자의 첫 서비스 경험',
      maxTotalDuration: 10 * 60 * 1000, // 10분
      conversionGoal: 'complete_onboarding',
      businessPriority: 'critical',
      targetCompletionRate: 0.8,
      alertThresholds: {
        abandonmentRate: 0.3,
        avgDuration: 8 * 60 * 1000,
        errorRate: 0.1
      },
      steps: [
        {
          stepId: 'landing',
          stepName: '랜딩 페이지 도착',
          expectedMaxDuration: 30000,
          isOptional: false,
          successCriteria: ['page_loaded', 'content_visible'],
          errorIndicators: ['load_timeout', 'render_error'],
          businessValue: 5
        },
        {
          stepId: 'signup',
          stepName: '회원가입',
          expectedMaxDuration: 3 * 60 * 1000,
          isOptional: false,
          successCriteria: ['form_submitted', 'account_created'],
          errorIndicators: ['validation_error', 'server_error'],
          businessValue: 9
        },
        {
          stepId: 'email_verification',
          stepName: '이메일 인증',
          expectedMaxDuration: 2 * 60 * 1000,
          isOptional: false,
          successCriteria: ['email_verified'],
          errorIndicators: ['verification_failed', 'email_not_received'],
          businessValue: 8
        },
        {
          stepId: 'profile_setup',
          stepName: '프로필 설정',
          expectedMaxDuration: 3 * 60 * 1000,
          isOptional: true,
          successCriteria: ['profile_completed'],
          errorIndicators: ['upload_failed', 'save_error'],
          businessValue: 6
        },
        {
          stepId: 'first_dashboard',
          stepName: '대시보드 진입',
          expectedMaxDuration: 30000,
          isOptional: false,
          successCriteria: ['dashboard_loaded', 'welcome_shown'],
          errorIndicators: ['auth_failed', 'load_error'],
          businessValue: 10
        }
      ]
    })

    // 프로젝트 생성 여정
    this.journeyDefinitions.set(CriticalJourneyType.PROJECT_CREATION, {
      journeyType: CriticalJourneyType.PROJECT_CREATION,
      name: '프로젝트 생성',
      description: '새 프로젝트 생성 완료 여정',
      maxTotalDuration: 5 * 60 * 1000, // 5분
      conversionGoal: 'project_created',
      businessPriority: 'high',
      targetCompletionRate: 0.9,
      alertThresholds: {
        abandonmentRate: 0.2,
        avgDuration: 4 * 60 * 1000,
        errorRate: 0.05
      },
      steps: [
        {
          stepId: 'create_button_click',
          stepName: '프로젝트 생성 버튼 클릭',
          expectedMaxDuration: 5000,
          isOptional: false,
          successCriteria: ['button_clicked', 'form_opened'],
          errorIndicators: ['button_unresponsive', 'form_load_error'],
          businessValue: 5
        },
        {
          stepId: 'form_completion',
          stepName: '프로젝트 정보 입력',
          expectedMaxDuration: 3 * 60 * 1000,
          isOptional: false,
          successCriteria: ['form_valid', 'all_required_filled'],
          errorIndicators: ['validation_error', 'field_error'],
          businessValue: 8
        },
        {
          stepId: 'project_submission',
          stepName: '프로젝트 생성 제출',
          expectedMaxDuration: 30000,
          isOptional: false,
          successCriteria: ['project_saved', 'redirect_success'],
          errorIndicators: ['server_error', 'timeout'],
          businessValue: 10
        },
        {
          stepId: 'project_dashboard',
          stepName: '프로젝트 대시보드 진입',
          expectedMaxDuration: 15000,
          isOptional: false,
          successCriteria: ['dashboard_loaded', 'project_data_visible'],
          errorIndicators: ['load_error', 'permission_denied'],
          businessValue: 9
        }
      ]
    })

    // 서브메뉴 네비게이션 여정
    this.journeyDefinitions.set(CriticalJourneyType.SUBMENU_NAVIGATION, {
      journeyType: CriticalJourneyType.SUBMENU_NAVIGATION,
      name: '서브메뉴 네비게이션',
      description: '서브메뉴를 통한 기능 접근 성공',
      maxTotalDuration: 60 * 1000, // 1분
      conversionGoal: 'successful_navigation',
      businessPriority: 'high',
      targetCompletionRate: 0.95,
      alertThresholds: {
        abandonmentRate: 0.1,
        avgDuration: 30000,
        errorRate: 0.02
      },
      steps: [
        {
          stepId: 'menu_hover',
          stepName: '메뉴 호버/클릭',
          expectedMaxDuration: 5000,
          isOptional: false,
          successCriteria: ['menu_activated', 'submenu_visible'],
          errorIndicators: ['menu_unresponsive', 'submenu_missing'],
          businessValue: 5
        },
        {
          stepId: 'submenu_selection',
          stepName: '서브메뉴 항목 선택',
          expectedMaxDuration: 10000,
          isOptional: false,
          successCriteria: ['item_clicked', 'navigation_initiated'],
          errorIndicators: ['item_unclickable', 'wrong_target'],
          businessValue: 8
        },
        {
          stepId: 'page_navigation',
          stepName: '대상 페이지 로딩',
          expectedMaxDuration: 30000,
          isOptional: false,
          successCriteria: ['page_loaded', 'content_rendered'],
          errorIndicators: ['navigation_failed', 'page_error', '404_error'],
          businessValue: 10
        },
        {
          stepId: 'feature_access',
          stepName: '기능 사용 가능 확인',
          expectedMaxDuration: 15000,
          isOptional: true,
          successCriteria: ['features_available', 'user_interaction_possible'],
          errorIndicators: ['features_broken', 'permission_error'],
          businessValue: 7
        }
      ]
    })

    // 피드백 제출 여정
    this.journeyDefinitions.set(CriticalJourneyType.FEEDBACK_SUBMISSION, {
      journeyType: CriticalJourneyType.FEEDBACK_SUBMISSION,
      name: '피드백 제출',
      description: '비디오 피드백 작성 및 제출 완료',
      maxTotalDuration: 15 * 60 * 1000, // 15분
      conversionGoal: 'feedback_submitted',
      businessPriority: 'high',
      targetCompletionRate: 0.85,
      alertThresholds: {
        abandonmentRate: 0.25,
        avgDuration: 12 * 60 * 1000,
        errorRate: 0.08
      },
      steps: [
        {
          stepId: 'video_access',
          stepName: '비디오 접근',
          expectedMaxDuration: 30000,
          isOptional: false,
          successCriteria: ['video_loaded', 'player_ready'],
          errorIndicators: ['video_load_error', 'player_crash'],
          businessValue: 6
        },
        {
          stepId: 'feedback_start',
          stepName: '피드백 작성 시작',
          expectedMaxDuration: 60000,
          isOptional: false,
          successCriteria: ['feedback_form_opened', 'timestamp_selected'],
          errorIndicators: ['form_error', 'timestamp_invalid'],
          businessValue: 7
        },
        {
          stepId: 'content_creation',
          stepName: '피드백 내용 작성',
          expectedMaxDuration: 10 * 60 * 1000,
          isOptional: false,
          successCriteria: ['content_written', 'min_length_met'],
          errorIndicators: ['text_loss', 'editor_crash'],
          businessValue: 9
        },
        {
          stepId: 'feedback_submit',
          stepName: '피드백 제출',
          expectedMaxDuration: 30000,
          isOptional: false,
          successCriteria: ['feedback_saved', 'confirmation_shown'],
          errorIndicators: ['submit_failed', 'server_error'],
          businessValue: 10
        }
      ]
    })

    // 각 여정의 통계 초기화
    for (const journeyType of this.journeyDefinitions.keys()) {
      this.journeyStats.set(journeyType, {
        journeyType,
        totalStarted: 0,
        totalCompleted: 0,
        totalAbandoned: 0,
        completionRate: 0,
        abandonmentRate: 0,
        avgDuration: 0,
        errorRate: 0,
        commonDropOffPoints: [],
        performanceTrends: []
      })
    }
  }

  /**
   * 사용자 여정 시작
   */
  startJourney(
    journeyType: CriticalJourneyType,
    userId?: string,
    metadata: Record<string, any> = {}
  ): string {
    const journeyId = this.generateJourneyId()
    const sessionId = this.getSessionId()
    
    const journey: ActiveJourney = {
      journeyId,
      userId,
      sessionId,
      journeyType,
      startTime: new Date().toISOString(),
      currentStep: '',
      completedSteps: [],
      stepTimestamps: {},
      stepDurations: {},
      errors: [],
      metadata,
      isAbandoned: false,
      isCompleted: false
    }
    
    this.activeJourneys.set(journeyId, journey)
    
    // 통계 업데이트
    const stats = this.journeyStats.get(journeyType)
    if (stats) {
      stats.totalStarted++
      this.journeyStats.set(journeyType, stats)
    }
    
    // 비즈니스 메트릭 수집
    realTimeDataCollector.collectBusinessMetric({
      metricName: 'user_journey_started',
      value: 1,
      unit: 'count',
      source: 'journey_monitor',
      businessSlice: this.getBusinessSliceForJourney(journeyType),
      dimensions: {
        journeyType: journeyType,
        userId: userId || 'anonymous'
      }
    })
    
    // 사용자 여정 이벤트 수집
    realTimeDataCollector.collectUserJourneyEvent({
      userId,
      eventType: 'page_view',
      eventName: 'journey_started',
      page: this.getCurrentPage(),
      properties: {
        journeyId,
        journeyType,
        metadata: JSON.stringify(metadata)
      },
      success: true
    })
    
    if (this.debugMode) {
      console.log(`[UserJourneyMonitor] Started journey: ${journeyType} (${journeyId})`)
    }
    
    return journeyId
  }

  /**
   * 여정 단계 진행
   */
  progressStep(
    journeyId: string,
    stepId: string,
    success: boolean = true,
    error?: string,
    additionalData: Record<string, any> = {}
  ): void {
    const journey = this.activeJourneys.get(journeyId)
    if (!journey || journey.isCompleted || journey.isAbandoned) return
    
    const definition = this.journeyDefinitions.get(journey.journeyType)
    if (!definition) return
    
    const step = definition.steps.find(s => s.stepId === stepId)
    if (!step) return
    
    const now = new Date().toISOString()
    const stepStartTime = journey.stepTimestamps[stepId] || journey.startTime
    const duration = Date.now() - new Date(stepStartTime).getTime()
    
    // 단계 완료 처리
    if (success) {
      journey.completedSteps.push(stepId)
      journey.currentStep = stepId
      journey.stepTimestamps[stepId] = now
      journey.stepDurations[stepId] = duration
      
      // 단계별 성능 체크
      if (duration > step.expectedMaxDuration) {
        alertManager.emit('journey_step_slow', {
          journeyId,
          journeyType: journey.journeyType,
          stepId,
          duration,
          expectedDuration: step.expectedMaxDuration,
          userId: journey.userId
        })
      }
    } else {
      // 에러 처리
      journey.errors.push({
        step: stepId,
        error: error || 'Unknown error',
        timestamp: now
      })
      
      // 에러 즉시 알림
      alertManager.emit('journey_step_error', {
        journeyId,
        journeyType: journey.journeyType,
        stepId,
        error,
        userId: journey.userId
      })
    }
    
    // 사용자 여정 이벤트 수집
    realTimeDataCollector.collectUserJourneyEvent({
      userId: journey.userId,
      eventType: success ? 'click' : 'error',
      eventName: `step_${success ? 'completed' : 'failed'}`,
      page: this.getCurrentPage(),
      properties: {
        journeyId,
        journeyType: journey.journeyType,
        stepId,
        stepName: step.stepName,
        duration,
        ...additionalData
      },
      duration,
      success,
      errorMessage: error
    })
    
    // 여정 완료 체크
    this.checkJourneyCompletion(journeyId)
    
    if (this.debugMode) {
      console.log(`[UserJourneyMonitor] Step progress: ${stepId} ${success ? 'SUCCESS' : 'FAILED'} in ${duration}ms`)
    }
  }

  /**
   * 여정 중단/포기
   */
  abandonJourney(journeyId: string, reason?: string): void {
    const journey = this.activeJourneys.get(journeyId)
    if (!journey || journey.isCompleted || journey.isAbandoned) return
    
    journey.isAbandoned = true
    const abandonedAt = new Date().toISOString()
    const totalDuration = Date.now() - new Date(journey.startTime).getTime()
    
    // 통계 업데이트
    const stats = this.journeyStats.get(journey.journeyType)
    if (stats) {
      stats.totalAbandoned++
      stats.abandonmentRate = stats.totalAbandoned / stats.totalStarted
      this.journeyStats.set(journey.journeyType, stats)
    }
    
    // 중단률 임계값 체크
    const definition = this.journeyDefinitions.get(journey.journeyType)
    if (definition && stats && stats.abandonmentRate > definition.alertThresholds.abandonmentRate) {
      alertManager.emit('high_abandonment_rate', {
        journeyType: journey.journeyType,
        abandonmentRate: stats.abandonmentRate,
        threshold: definition.alertThresholds.abandonmentRate,
        recentAbandonments: this.getRecentAbandonments(journey.journeyType)
      })
    }
    
    // 비즈니스 메트릭 수집
    realTimeDataCollector.collectBusinessMetric({
      metricName: 'user_journey_abandoned',
      value: 1,
      unit: 'count',
      source: 'journey_monitor',
      businessSlice: this.getBusinessSliceForJourney(journey.journeyType),
      dimensions: {
        journeyType: journey.journeyType,
        abandonedAt: journey.currentStep,
        reason: reason || 'unknown',
        userId: journey.userId || 'anonymous'
      }
    })
    
    // 사용자 여정 데이터 저장
    this.saveCriticalUserJourney(journey, false, reason)
    
    if (this.debugMode) {
      console.log(`[UserJourneyMonitor] Journey abandoned: ${journeyId} at step ${journey.currentStep}`)
    }
  }

  /**
   * 여정 완료 체크
   */
  private checkJourneyCompletion(journeyId: string): void {
    const journey = this.activeJourneys.get(journeyId)
    if (!journey) return
    
    const definition = this.journeyDefinitions.get(journey.journeyType)
    if (!definition) return
    
    const requiredSteps = definition.steps.filter(step => !step.isOptional)
    const completedRequiredSteps = requiredSteps.filter(step => 
      journey.completedSteps.includes(step.stepId)
    )
    
    // 모든 필수 단계 완료 시
    if (completedRequiredSteps.length === requiredSteps.length) {
      this.completeJourney(journeyId)
    }
  }

  /**
   * 여정 완료 처리
   */
  private completeJourney(journeyId: string, conversionValue?: number): void {
    const journey = this.activeJourneys.get(journeyId)
    if (!journey || journey.isCompleted || journey.isAbandoned) return
    
    journey.isCompleted = true
    const totalDuration = Date.now() - new Date(journey.startTime).getTime()
    
    // 통계 업데이트
    const stats = this.journeyStats.get(journey.journeyType)
    if (stats) {
      stats.totalCompleted++
      stats.completionRate = stats.totalCompleted / stats.totalStarted
      stats.avgDuration = (stats.avgDuration * (stats.totalCompleted - 1) + totalDuration) / stats.totalCompleted
      this.journeyStats.set(journey.journeyType, stats)
    }
    
    // 비즈니스 메트릭 수집
    realTimeDataCollector.collectBusinessMetric({
      metricName: 'user_journey_completed',
      value: 1,
      unit: 'count',
      source: 'journey_monitor',
      businessSlice: this.getBusinessSliceForJourney(journey.journeyType),
      dimensions: {
        journeyType: journey.journeyType,
        totalDuration: totalDuration.toString(),
        conversionValue: conversionValue?.toString() || '0',
        userId: journey.userId || 'anonymous'
      }
    })
    
    // 전환 가치 메트릭
    if (conversionValue) {
      realTimeDataCollector.collectBusinessMetric({
        metricName: 'conversion_value',
        value: conversionValue,
        unit: 'currency',
        source: 'journey_monitor',
        businessSlice: this.getBusinessSliceForJourney(journey.journeyType),
        dimensions: {
          journeyType: journey.journeyType,
          journeyId,
          userId: journey.userId || 'anonymous'
        }
      })
    }
    
    // 사용자 여정 데이터 저장
    this.saveCriticalUserJourney(journey, true, undefined, conversionValue)
    
    if (this.debugMode) {
      console.log(`[UserJourneyMonitor] Journey completed: ${journeyId} in ${totalDuration}ms`)
    }
  }

  /**
   * 핵심 사용자 여정 데이터 저장
   */
  private saveCriticalUserJourney(
    journey: ActiveJourney, 
    completed: boolean,
    abandonReason?: string,
    conversionValue?: number
  ): void {
    try {
      const criticalJourney: CriticalUserJourney = {
        journeyId: journey.journeyId,
        journeyType: journey.journeyType,
        userId: journey.userId,
        sessionId: journey.sessionId,
        startTime: journey.startTime,
        endTime: new Date().toISOString(),
        currentStep: journey.currentStep,
        totalSteps: this.journeyDefinitions.get(journey.journeyType)?.steps.length || 0,
        completed,
        abandonedAt: abandonReason ? journey.currentStep : undefined,
        errorEncountered: journey.errors.length > 0,
        conversionValue,
        metadata: {
          completedSteps: journey.completedSteps,
          stepDurations: journey.stepDurations,
          errors: journey.errors,
          ...journey.metadata
        }
      }
      
      const validated = MonitoringSchemaValidator.validateCriticalUserJourney ? 
        MonitoringSchemaValidator.validateCriticalUserJourney(criticalJourney) : criticalJourney
      
      // 실시간 데이터 컬렉터로 전송
      realTimeDataCollector.collectUserJourneyEvent({
        userId: journey.userId,
        eventType: 'conversion',
        eventName: 'critical_journey_end',
        page: this.getCurrentPage(),
        properties: {
          ...validated,
          completed: completed.toString(),
          abandonReason: abandonReason || ''
        },
        duration: Date.now() - new Date(journey.startTime).getTime(),
        success: completed
      })
      
    } catch (error) {
      console.error('[UserJourneyMonitor] Failed to save critical journey:', error)
    }
  }

  private getBusinessSliceForJourney(journeyType: CriticalJourneyType): string {
    const mapping: Record<CriticalJourneyType, string> = {
      [CriticalJourneyType.ONBOARDING]: 'user_engagement',
      [CriticalJourneyType.PROJECT_CREATION]: 'project_management',
      [CriticalJourneyType.VIDEO_UPLOAD]: 'video_production',
      [CriticalJourneyType.FEEDBACK_SUBMISSION]: 'feedback_collection',
      [CriticalJourneyType.COLLABORATION]: 'video_production',
      [CriticalJourneyType.SUBMENU_NAVIGATION]: 'user_engagement'
    }
    return mapping[journeyType] || 'user_engagement'
  }

  private generateJourneyId(): string {
    return `journey_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }

  private getSessionId(): string {
    // 실제 구현에서는 브라우저 세션 ID를 가져오거나 생성
    return typeof window !== 'undefined' && window.sessionStorage ? 
      (window.sessionStorage.getItem('sessionId') || this.generateSessionId()) :
      'server_session'
  }

  private generateSessionId(): string {
    const id = `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
    if (typeof window !== 'undefined' && window.sessionStorage) {
      window.sessionStorage.setItem('sessionId', id)
    }
    return id
  }

  private getCurrentPage(): string {
    return typeof window !== 'undefined' ? window.location.pathname : 'server_side'
  }

  private getRecentAbandonments(journeyType: CriticalJourneyType): ActiveJourney[] {
    const recentTime = Date.now() - (60 * 60 * 1000) // 1시간 전
    return Array.from(this.activeJourneys.values())
      .filter(journey => 
        journey.journeyType === journeyType &&
        journey.isAbandoned &&
        new Date(journey.startTime).getTime() > recentTime
      )
  }

  private startCleanupTimer(): void {
    // 24시간마다 완료/중단된 여정 정리
    this.cleanupInterval = setInterval(() => {
      this.cleanupCompletedJourneys()
    }, 24 * 60 * 60 * 1000)
  }

  private cleanupCompletedJourneys(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000) // 24시간 전
    let cleaned = 0
    
    for (const [journeyId, journey] of this.activeJourneys.entries()) {
      const journeyTime = new Date(journey.startTime).getTime()
      if ((journey.isCompleted || journey.isAbandoned) && journeyTime < cutoffTime) {
        this.activeJourneys.delete(journeyId)
        cleaned++
      }
    }
    
    if (this.debugMode && cleaned > 0) {
      console.log(`[UserJourneyMonitor] Cleaned up ${cleaned} completed journeys`)
    }
  }

  private setupEventListeners(): void {
    // 페이지 언로드 시 활성 여정들을 중단 처리
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        for (const journey of this.activeJourneys.values()) {
          if (!journey.isCompleted && !journey.isAbandoned) {
            this.abandonJourney(journey.journeyId, 'page_unload')
          }
        }
      })
    }
  }

  /**
   * 여정 상태 조회
   */
  getJourneyStatus(journeyId: string): ActiveJourney | undefined {
    return this.activeJourneys.get(journeyId)
  }

  /**
   * 여정 통계 조회
   */
  getJourneyStats(journeyType?: CriticalJourneyType): JourneyStats | Map<CriticalJourneyType, JourneyStats> {
    if (journeyType) {
      return this.journeyStats.get(journeyType)!
    }
    return this.journeyStats
  }

  /**
   * 활성 여정 수 조회
   */
  getActiveJourneyCount(): number {
    return Array.from(this.activeJourneys.values())
      .filter(journey => !journey.isCompleted && !journey.isAbandoned).length
  }

  /**
   * 정리 및 종료
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
    }
    
    // 모든 활성 여정 중단 처리
    for (const journey of this.activeJourneys.values()) {
      if (!journey.isCompleted && !journey.isAbandoned) {
        this.abandonJourney(journey.journeyId, 'monitor_shutdown')
      }
    }
    
    this.activeJourneys.clear()
    
    if (this.debugMode) {
      console.log('[UserJourneyMonitor] Destroyed')
    }
  }
}

// 싱글톤 인스턴스 내보내기
export const userJourneyMonitor = UserJourneyMonitor.getInstance()

// 편의 함수들
export const startUserJourney = userJourneyMonitor.startJourney.bind(userJourneyMonitor)
export const progressJourneyStep = userJourneyMonitor.progressStep.bind(userJourneyMonitor)
export const abandonUserJourney = userJourneyMonitor.abandonJourney.bind(userJourneyMonitor)
export const getJourneyStats = userJourneyMonitor.getJourneyStats.bind(userJourneyMonitor)