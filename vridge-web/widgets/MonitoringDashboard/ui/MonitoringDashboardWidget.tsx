'use client'

/**
 * Monitoring Dashboard Widget - Main Component
 * 실시간 시스템 모니터링 대시보드
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react'

import { WorkflowStage } from '@/processes/video-production/model/workflowMachine'

import styles from './MonitoringDashboardWidget.module.scss'
import { PerformanceMetricsChart } from './PerformanceMetricsChart'
import { SystemNotifications } from './SystemNotifications'
import { WorkflowProgressVisualization } from './WorkflowProgressVisualization'
import { monitoringApi } from '../api/monitoringApi'
import { MonitoringDashboardProps, MonitoringDashboardState, FilterOptions } from '../model/types'

export const MonitoringDashboardWidget: React.FC<MonitoringDashboardProps> = ({
  projectId,
  refreshInterval = 5000,
  className = '',
  'data-testid': testId = 'monitoring-dashboard'
}) => {
  // 대시보드 상태 관리
  const [state, setState] = useState<MonitoringDashboardState>({
    isLoading: true,
    isConnected: false,
    error: null,
    lastUpdate: null,
    
    // Performance data
    coreVitals: {},
    customMetrics: {},
    metricsHistory: [],
    budgetViolations: [],
    
    // Workflow data
    activeWorkflows: [],
    workflowEvents: [],
    
    // System events
    systemEvents: [],
    notifications: [],
    
    // Settings
    refreshInterval: refreshInterval,
    autoRefresh: true,
    selectedProject: projectId
  })

  // 초기 데이터 로드
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))
        const initialState = await monitoringApi.loadInitialState(projectId)
        setState(prev => ({ ...prev, ...initialState }))
      } catch (error) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: '대시보드 데이터를 로드할 수 없습니다.',
          isConnected: false
        }))
      }
    }

    loadInitialData()
  }, [projectId])

  // 실시간 데이터 구독
  useEffect(() => {
    const unsubscribe = monitoringApi.subscribeToMetrics((updates) => {
      setState(prev => ({ ...prev, ...updates }))
    })

    return unsubscribe
  }, [])

  // 데이터 새로고침
  const handleRefresh = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, error: null }))
      const freshData = await monitoringApi.loadInitialState(projectId)
      setState(prev => ({ ...prev, ...freshData }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: '데이터 새로고침에 실패했습니다.',
        isConnected: false
      }))
    }
  }, [projectId])

  // 워크플로우 단계 클릭 핸들러
  const handleStageClick = useCallback((stage: WorkflowStage) => {
    console.log(`워크플로우 단계 클릭: ${stage}`)
    // TODO: 단계 상세 정보 모달 열기 또는 다른 액션
  }, [])

  // 알림 클릭 핸들러
  const handleEventClick = useCallback((event: { id: string; type: string; message: string }) => {
    console.log('이벤트 클릭:', event)
    // TODO: 이벤트 상세 정보 모달 열기
  }, [])

  // 모든 알림 삭제
  const handleClearNotifications = useCallback(() => {
    setState(prev => ({
      ...prev,
      notifications: [],
      systemEvents: []
    }))
  }, [])

  // 차트용 예산 데이터
  const chartBudgets = useMemo(() => ({
    LCP: 2500,  // 2.5s
    FID: 100,   // 100ms
    CLS: 0.1,   // 0.1 score
    TTI: 3800,  // 3.8s
    FCP: 1800   // 1.8s
  }), [])

  // 연결 상태 메시지
  const connectionStatus = useMemo(() => {
    if (state.isLoading) return '로딩 중...'
    if (!state.isConnected) return '연결 끊어짐'
    if (state.error) return `오류: ${state.error}`
    return '연결됨'
  }, [state.isLoading, state.isConnected, state.error])

  // 로딩 상태
  if (state.isLoading && !state.lastUpdate) {
    return (
      <div 
        className={`${styles.container} ${styles.loading} ${className}`}
        data-testid={testId}
        role="region"
        aria-label="모니터링 대시보드 로딩 중"
      >
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner} aria-hidden="true" />
          <h2>대시보드 로딩 중...</h2>
          <p>성능 메트릭과 시스템 상태를 불러오고 있습니다.</p>
        </div>
      </div>
    )
  }

  // 에러 상태
  if (state.error && !state.lastUpdate) {
    return (
      <div 
        className={`${styles.container} ${styles.error} ${className}`}
        data-testid={testId}
        role="alert"
        aria-label="모니터링 대시보드 에러"
      >
        <div className={styles.errorContent}>
          <div className={styles.errorIcon} aria-hidden="true">⚠️</div>
          <h2>대시보드 오류</h2>
          <p>{state.error}</p>
          <button 
            className={styles.retryButton}
            onClick={handleRefresh}
            type="button"
            aria-label="다시 시도"
          >
            다시 시도
          </button>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`${styles.container} ${className}`}
      data-testid={testId}
      role="region"
      aria-labelledby="dashboard-title"
    >
      {/* 헤더 */}
      <header className={styles.header}>
        <div className={styles.titleSection}>
          <h1 id="dashboard-title" className={styles.title}>
            시스템 모니터링 대시보드
          </h1>
          {projectId && (
            <div className={styles.projectInfo}>
              프로젝트: {projectId}
            </div>
          )}
        </div>
        
        <div className={styles.headerControls}>
          {/* 연결 상태 */}
          <div 
            className={`
              ${styles.connectionStatus}
              ${state.isConnected ? styles.connected : styles.disconnected}
            `}
            role="status"
            aria-label={`연결 상태: ${connectionStatus}`}
          >
            <div className={styles.statusIndicator} aria-hidden="true" />
            <span>{connectionStatus}</span>
          </div>
          
          {/* 마지막 업데이트 시간 */}
          {state.lastUpdate && (
            <div className={styles.lastUpdate}>
              마지막 업데이트: {state.lastUpdate.toLocaleTimeString('ko-KR')}
            </div>
          )}
          
          {/* 새로고침 버튼 */}
          <button
            className={styles.refreshButton}
            onClick={handleRefresh}
            disabled={state.isLoading}
            aria-label="데이터 새로고침"
            type="button"
          >
            🔄
          </button>
        </div>
      </header>

      {/* 대시보드 콘텐츠 */}
      <main className={styles.content}>
        {/* 상단 영역: 성능 및 워크플로우 */}
        <div className={styles.topSection}>
          {/* 성능 메트릭 차트 */}
          <div className={styles.performanceSection}>
            <PerformanceMetricsChart
              data={state.metricsHistory}
              budgets={chartBudgets}
              violations={state.budgetViolations}
              className={styles.performanceChart}
            />
          </div>
          
          {/* 워크플로우 진행 상황 */}
          <div className={styles.workflowSection}>
            {state.activeWorkflows.length > 0 ? (
              state.activeWorkflows.map(workflow => (
                <WorkflowProgressVisualization
                  key={workflow.projectId}
                  workflow={workflow}
                  isLoading={state.isLoading}
                  onStageClick={handleStageClick}
                  className={styles.workflowProgress}
                />
              ))
            ) : (
              <div className={styles.noWorkflows}>
                <div className={styles.emptyIcon} aria-hidden="true">🚀</div>
                <h3>진행 중인 워크플로우 없음</h3>
                <p>아직 진행 중인 비디오 제작 워크플로우가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
        
        {/* 하단 영역: 시스템 알림 */}
        <div className={styles.bottomSection}>
          <SystemNotifications
            events={state.notifications}
            maxItems={50}
            onEventClick={handleEventClick}
            onClearAll={handleClearNotifications}
            className={styles.notifications}
          />
        </div>
      </main>
      
      {/* 오류 메시지 (대시보드를 유지하면서 표시) */}
      {state.error && state.lastUpdate && (
        <div 
          className={styles.errorBanner}
          role="alert"
          aria-live="polite"
        >
          <span className={styles.errorText}>⚠️ {state.error}</span>
          <button
            className={styles.dismissButton}
            onClick={() => setState(prev => ({ ...prev, error: null }))}
            aria-label="오류 메시지 닫기"
            type="button"
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}