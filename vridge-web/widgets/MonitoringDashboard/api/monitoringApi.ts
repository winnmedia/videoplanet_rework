/**
 * Monitoring Dashboard API Layer
 * FSD Architecture: widgets/MonitoringDashboard/api/monitoringApi.ts
 */

import { notificationEngine, FeedbackEvent } from '@/processes/feedback-collection/lib/notificationEngine'
import { videoProductionMachine, WorkflowContext } from '@/processes/video-production/model/workflowMachine'
import { performanceMonitor } from '@/shared/lib/performance-monitor'

import { 
  WebVitalsChartData, 
  EventLogEntry, 
  MonitoringDashboardState,
  FilterOptions 
} from '../model/types'

/**
 * API 클래스 - 모든 모니터링 데이터 관리
 */
export class MonitoringDashboardApi {
  private updateInterval: NodeJS.Timeout | null = null
  private subscribers = new Set<(state: Partial<MonitoringDashboardState>) => void>()

  /**
   * 실시간 성능 메트릭 구독
   */
  subscribeToMetrics(callback: (state: Partial<MonitoringDashboardState>) => void): () => void {
    this.subscribers.add(callback)
    
    // 성능 메트릭 구독
    const performanceUnsubscribe = performanceMonitor.onMetric((metric) => {
      this.notifySubscribers({
        coreVitals: performanceMonitor.getCoreWebVitals(),
        customMetrics: performanceMonitor.getCustomMetrics(),
        budgetViolations: performanceMonitor.getBudgetViolations(),
        lastUpdate: new Date(),
        isConnected: true
      })
    })

    // 알림 엔진 구독
    const notificationUnsubscribe = notificationEngine.subscribe({
      id: `monitoring-dashboard-${Date.now()}`,
      projectId: 'all', // 모든 프로젝트 모니터링
      onEvent: (event) => {
        this.notifySubscribers({
          notifications: [event],
          systemEvents: [this.convertEventToLogEntry(event)],
          lastUpdate: new Date()
        })
      }
    })

    // 정기적 데이터 업데이트
    this.startPeriodicUpdate()

    // 정리 함수 반환
    return () => {
      this.subscribers.delete(callback)
      performanceUnsubscribe()
      notificationUnsubscribe()
      this.stopPeriodicUpdate()
    }
  }

  /**
   * 차트용 메트릭 히스토리 가져오기
   */
  async getMetricsHistory(timeRange: FilterOptions['timeRange'] = '1h'): Promise<WebVitalsChartData[]> {
    const now = new Date()
    const timeRangeMs = this.getTimeRangeMs(timeRange)
    const startTime = new Date(now.getTime() - timeRangeMs)

    // 실제 구현에서는 백엔드 API 호출
    // 현재는 성능 모니터에서 히스토리 데이터 생성
    const metrics = performanceMonitor.getMetrics()
    const filteredMetrics = metrics.filter(m => m.timestamp > startTime)

    // 시간별 그룹화 및 차트 데이터 변환
    const chartData: WebVitalsChartData[] = []
    const interval = Math.max(timeRangeMs / 50, 60000) // 최대 50개 포인트, 최소 1분 간격
    
    for (let time = startTime.getTime(); time <= now.getTime(); time += interval) {
      const timestamp = new Date(time)
      const timeMetrics = filteredMetrics.filter(
        m => Math.abs(m.timestamp.getTime() - time) < interval / 2
      )

      chartData.push({
        timestamp,
        LCP: this.getAverageMetricValue(timeMetrics, 'LCP') || 0,
        FID: this.getAverageMetricValue(timeMetrics, 'FID') || 0,
        CLS: this.getAverageMetricValue(timeMetrics, 'CLS') || 0,
        TTI: this.getAverageMetricValue(timeMetrics, 'TTI') || 0,
        FCP: this.getAverageMetricValue(timeMetrics, 'FCP') || 0
      })
    }

    return chartData
  }

  /**
   * 시스템 이벤트 로그 가져오기
   */
  async getSystemEvents(
    filter?: Partial<FilterOptions>, 
    limit: number = 100
  ): Promise<EventLogEntry[]> {
    // 실제 구현에서는 백엔드에서 로그 데이터 가져오기
    // 현재는 알림 엔진의 이벤트 히스토리를 변환
    const events = notificationEngine.getProjectEventHistory('all', limit)
    
    return events.map(event => this.convertEventToLogEntry(event))
      .filter(entry => this.matchesFilter(entry, filter))
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit)
  }

  /**
   * 워크플로우 상태 가져오기
   */
  async getWorkflowStates(projectIds?: string[]) {
    // 실제 구현에서는 XState 액터들의 상태를 수집
    // 현재는 샘플 데이터 반환
    return {
      activeWorkflows: this.getMockWorkflowStates(),
      completedCount: 3,
      pausedCount: 1,
      errorCount: 0
    }
  }

  /**
   * 대시보드 초기 상태 로드
   */
  async loadInitialState(projectId?: string): Promise<MonitoringDashboardState> {
    const [metricsHistory, systemEvents, workflowStates] = await Promise.all([
      this.getMetricsHistory('1h'),
      this.getSystemEvents(undefined, 50),
      this.getWorkflowStates(projectId ? [projectId] : undefined)
    ])

    return {
      isLoading: false,
      isConnected: true,
      error: null,
      lastUpdate: new Date(),
      
      // Performance data
      coreVitals: performanceMonitor.getCoreWebVitals(),
      customMetrics: performanceMonitor.getCustomMetrics(),
      metricsHistory,
      budgetViolations: performanceMonitor.getBudgetViolations(),
      
      // Workflow data
      activeWorkflows: workflowStates.activeWorkflows,
      workflowEvents: [],
      
      // System events
      systemEvents,
      notifications: systemEvents.slice(0, 10).map(this.convertLogEntryToEvent),
      
      // Settings
      refreshInterval: 5000,
      autoRefresh: true,
      selectedProject: projectId
    }
  }

  // Private helper methods
  private notifySubscribers(updates: Partial<MonitoringDashboardState>) {
    this.subscribers.forEach(callback => callback(updates))
  }

  private startPeriodicUpdate() {
    if (this.updateInterval) return
    
    this.updateInterval = setInterval(async () => {
      try {
        const updates = {
          coreVitals: performanceMonitor.getCoreWebVitals(),
          customMetrics: performanceMonitor.getCustomMetrics(),
          budgetViolations: performanceMonitor.getBudgetViolations(),
          lastUpdate: new Date(),
          isConnected: true
        }
        this.notifySubscribers(updates)
      } catch (error) {
        this.notifySubscribers({ 
          error: '데이터 업데이트 실패', 
          isConnected: false 
        })
      }
    }, 5000)
  }

  private stopPeriodicUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }
  }

  private getTimeRangeMs(range: FilterOptions['timeRange']): number {
    const ranges = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    }
    return ranges[range] || ranges['1h']
  }

  private getAverageMetricValue(metrics: Array<{ name: string; value: number }>, name: string): number | null {
    const values = metrics
      .filter(m => m.name === name)
      .map(m => m.value)
      .filter(v => v > 0)
    
    return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null
  }

  private convertEventToLogEntry(event: { id: string; timestamp: Date; type: string; data: Record<string, unknown>; projectId?: string }): EventLogEntry {
    return {
      id: event.id,
      timestamp: event.timestamp,
      type: this.mapEventType(event.type),
      severity: this.mapEventSeverity(event.type),
      message: this.generateEventMessage(event),
      details: event.data,
      source: event.projectId || 'system'
    }
  }

  private convertLogEntryToEvent = (entry: EventLogEntry): FeedbackEvent => ({
    id: entry.id,
    type: this.mapEventTypeToFeedbackType(entry.type),
    projectId: entry.source || 'unknown',
    timestamp: entry.timestamp,
    data: entry.details || {}
  })

  private mapEventTypeToFeedbackType(eventType: string): FeedbackEvent['type'] {
    if (eventType.includes('feedback')) return 'feedback_added'
    if (eventType.includes('stage')) return 'stage_completed'
    if (eventType.includes('user')) return 'user_online'
    return 'feedback_updated' // 기본값
  }

  private mapEventType(eventType: string): EventLogEntry['type'] {
    if (eventType.includes('feedback')) return 'workflow'
    if (eventType.includes('stage')) return 'workflow'
    if (eventType.includes('error')) return 'error'
    if (eventType.includes('performance')) return 'performance'
    return 'system'
  }

  private mapEventSeverity(eventType: string): EventLogEntry['severity'] {
    if (eventType.includes('error')) return 'high'
    if (eventType.includes('warning')) return 'medium'
    if (eventType.includes('completed')) return 'low'
    return 'low'
  }

  private generateEventMessage(event: { type: string }): string {
    const typeMessages = {
      'feedback_added': '새 피드백이 추가되었습니다',
      'feedback_resolved': '피드백이 해결되었습니다',
      'stage_completed': '단계가 완료되었습니다',
      'user_online': '사용자가 접속했습니다',
      'workflow_paused': '워크플로우가 일시정지되었습니다'
    }
    return typeMessages[event.type as keyof typeof typeMessages] || `이벤트: ${event.type}`
  }

  private matchesFilter(entry: EventLogEntry, filter?: Partial<FilterOptions>): boolean {
    if (!filter) return true
    
    if (filter.eventTypes && !filter.eventTypes.includes(entry.type)) return false
    if (filter.severities && !filter.severities.includes(entry.severity)) return false
    
    return true
  }

  private getMockWorkflowStates(): WorkflowContext[] {
    // 실제 구현에서는 XState 액터들의 상태 수집
    return [
      {
        projectId: 'project-1',
        title: '브랜드 홍보 영상',
        completedStages: ['planning', 'scripting'],
        currentProgress: 25,
        estimatedCompletionDays: 12,
        stageMetadata: {
          planning: { approved: true },
          scripting: { scriptLength: 120 }
        },
        connectedWidgets: ['videoPlanning'],
        widgetData: {
          videoPlanning: { completionRate: 0.75, tasks: 8, completed: 6 }
        }
      }
    ]
  }
}

// 싱글톤 인스턴스 생성
export const monitoringApi = new MonitoringDashboardApi()