/**
 * 실시간 모니터링 대시보드
 * 핵심 지표, 알림, 사용자 여정 상태를 실시간으로 표시
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'

import { 
  Alert, 
  AlertPriority, 
  AlertStatus,
  alertSystem,
  subscribeToAlerts,
  getActiveAlerts,
  acknowledgeAlert,
  resolveAlert
} from '@/lib/analytics/alert-system'
import { apiMonitor } from '@/lib/analytics/monitoring-system'
import { 
  userJourneyMonitor,
  CriticalJourneyType,
  getJourneyStats 
} from '@/lib/analytics/user-journey-monitor'
import { 
  webVitalsMonitor,
  getCurrentWebVitals 
} from '@/lib/analytics/web-vitals-monitor'
import { Card } from '@/shared/ui/Card/Card.modern'
import { LoadingSpinner } from '@/shared/ui/LoadingSpinner/LoadingSpinner.modern'
import { Toast } from '@/shared/ui/Toast/Toast.modern'

// 대시보드 탭
type DashboardTab = 'overview' | 'alerts' | 'journeys' | 'performance' | 'api'

// 메트릭 카드 데이터
interface MetricCard {
  title: string
  value: string | number
  unit?: string
  trend?: 'up' | 'down' | 'stable'
  status: 'good' | 'warning' | 'critical'
  description?: string
}

// 알림 우선순위별 색상
const alertColors: Record<AlertPriority, string> = {
  low: 'bg-blue-100 text-blue-800 border-blue-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200'
}

// 상태별 색상
const statusColors: Record<AlertStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  sent: 'bg-blue-100 text-blue-800',
  acknowledged: 'bg-yellow-100 text-yellow-800',
  resolved: 'bg-green-100 text-green-800',
  suppressed: 'bg-purple-100 text-purple-800'
}

export const RealTimeMonitoringDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [journeyStats, setJourneyStats] = useState<any>({})
  const [webVitals, setWebVitals] = useState<any>({})
  const [apiStats, setApiStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null)
  const [lastUpdate, setLastUpdate] = useState<string>(new Date().toISOString())

  // 실시간 데이터 구독 및 업데이트
  useEffect(() => {
    let alertSubscription: (() => void) | null = null
    let refreshInterval: NodeJS.Timeout | null = null

    const initializeDashboard = async () => {
      try {
        // 초기 데이터 로드
        await loadAllData()
        
        // 알림 구독
        alertSubscription = subscribeToAlerts('dashboard', (alert: Alert) => {
          setAlerts(prev => {
            const existing = prev.find(a => a.alertId === alert.alertId)
            if (existing) {
              return prev.map(a => a.alertId === alert.alertId ? alert : a)
            }
            return [alert, ...prev].slice(0, 50) // 최대 50개 알림 표시
          })
          
          // 새 알림 토스트 표시
          if (alert.status === 'pending' || alert.status === 'sent') {
            setToast({
              message: `새 알림: ${alert.title}`,
              type: alert.severity === 'critical' ? 'error' : 'warning'
            })
          }
        })
        
        // 주기적 데이터 업데이트 (30초마다)
        refreshInterval = setInterval(async () => {
          await loadAllData()
          setLastUpdate(new Date().toISOString())
        }, 30000)
        
        setLoading(false)
      } catch (error) {
        console.error('Dashboard initialization failed:', error)
        setLoading(false)
      }
    }

    initializeDashboard()

    return () => {
      if (alertSubscription) alertSubscription()
      if (refreshInterval) clearInterval(refreshInterval)
    }
  }, [])

  const loadAllData = async () => {
    try {
      // 병렬로 모든 데이터 로드
      const [alertsData, journeyData, vitalsData, apiData] = await Promise.all([
        Promise.resolve(getActiveAlerts()),
        Promise.resolve(getJourneyStats()),
        Promise.resolve(getCurrentWebVitals()),
        Promise.resolve(apiMonitor.getPerformanceSummary())
      ])

      setAlerts(alertsData)
      setJourneyStats(journeyData)
      setWebVitals(vitalsData)
      setApiStats(apiData)
    } catch (error) {
      console.error('Failed to load dashboard data:', error)
    }
  }

  // 개요 메트릭 계산
  const overviewMetrics = useMemo((): MetricCard[] => {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical' && a.status !== 'resolved').length
    const totalJourneys = Object.values(journeyStats as any).reduce((sum: number, stat: any) => sum + (stat?.totalStarted || 0), 0)
    const avgCompletionRate = Object.values(journeyStats as any).length > 0 
      ? Object.values(journeyStats as any).reduce((sum: number, stat: any) => sum + (stat?.completionRate || 0), 0) / Object.values(journeyStats as any).length
      : 0
    
    return [
      {
        title: '활성 알림',
        value: alerts.filter(a => a.status !== 'resolved').length,
        status: criticalAlerts > 0 ? 'critical' : alerts.length > 0 ? 'warning' : 'good',
        description: `${criticalAlerts}개 심각 알림 포함`
      },
      {
        title: '사용자 여정 완료율',
        value: (avgCompletionRate * 100).toFixed(1),
        unit: '%',
        status: avgCompletionRate >= 0.8 ? 'good' : avgCompletionRate >= 0.6 ? 'warning' : 'critical',
        trend: avgCompletionRate >= 0.8 ? 'up' : 'down'
      },
      {
        title: 'Web 성능 점수',
        value: webVitals.performanceScore || 0,
        unit: '/100',
        status: (webVitals.performanceScore || 0) >= 80 ? 'good' : (webVitals.performanceScore || 0) >= 60 ? 'warning' : 'critical',
        trend: (webVitals.performanceScore || 0) >= 80 ? 'up' : 'down'
      },
      {
        title: 'API 평균 응답시간',
        value: Object.values(apiStats).length > 0 
          ? Object.values(apiStats).reduce((sum: number, stat: any) => sum + (stat?.avgResponseTime || 0), 0) / Object.values(apiStats).length
          : 0,
        unit: 'ms',
        status: 'good' // 실제로는 임계값과 비교
      }
    ]
  }, [alerts, journeyStats, webVitals, apiStats])

  const handleAlertAction = async (alertId: string, action: 'acknowledge' | 'resolve') => {
    try {
      const success = action === 'acknowledge' 
        ? acknowledgeAlert(alertId, 'dashboard_user')
        : resolveAlert(alertId, 'dashboard_user', 'Resolved via dashboard')
      
      if (success) {
        await loadAllData() // 데이터 새로고침
        setToast({
          message: `알림이 ${action === 'acknowledge' ? '확인' : '해결'}되었습니다`,
          type: 'success'
        })
      } else {
        setToast({
          message: '작업을 수행할 수 없습니다',
          type: 'error'
        })
      }
    } catch (error) {
      setToast({
        message: '오류가 발생했습니다',
        type: 'error'
      })
    }
  }

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* 주요 메트릭 카드들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewMetrics.map((metric, index) => (
          <Card key={index} className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {metric.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                  {metric.unit && <span className="text-sm text-gray-500">{metric.unit}</span>}
                </p>
                {metric.description && (
                  <p className="text-xs text-gray-500 mt-1">{metric.description}</p>
                )}
              </div>
              <div className="flex items-center">
                {metric.trend && (
                  <span className={`text-sm ${
                    metric.trend === 'up' ? 'text-green-600' : 
                    metric.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'}
                  </span>
                )}
                <span className={`w-3 h-3 rounded-full ml-2 ${
                  metric.status === 'good' ? 'bg-green-500' :
                  metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                }`} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* 최근 알림 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            최근 알림
          </h3>
          <button 
            onClick={() => setActiveTab('alerts')}
            className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            전체 보기 →
          </button>
        </div>
        <div className="space-y-3">
          {alerts.slice(0, 5).map(alert => (
            <div key={alert.alertId} className="flex items-center justify-between p-3 border rounded-lg border-gray-200 dark:border-gray-700">
              <div className="flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${alertColors[alert.severity]}`}>
                    {alert.severity.toUpperCase()}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${statusColors[alert.status]}`}>
                    {alert.status}
                  </span>
                </div>
                <p className="font-medium text-gray-900 dark:text-white mt-1">
                  {alert.title}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {alert.description}
                </p>
              </div>
              <div className="text-xs text-gray-500">
                {new Date(alert.triggeredAt).toLocaleTimeString()}
              </div>
            </div>
          ))}
          {alerts.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              활성 알림이 없습니다
            </div>
          )}
        </div>
      </Card>
    </div>
  )

  const renderAlertsTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            활성 알림 ({alerts.filter(a => a.status !== 'resolved').length})
          </h3>
          <div className="flex space-x-2">
            <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
              <option value="">모든 우선순위</option>
              <option value="critical">심각</option>
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
            <select className="px-3 py-1 border border-gray-300 rounded-md text-sm">
              <option value="">모든 상태</option>
              <option value="pending">대기중</option>
              <option value="sent">전송됨</option>
              <option value="acknowledged">확인됨</option>
            </select>
          </div>
        </div>
        
        <div className="space-y-4">
          {alerts.map(alert => (
            <div key={alert.alertId} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${alertColors[alert.severity]}`}>
                      {alert.severity.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs ${statusColors[alert.status]}`}>
                      {alert.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      {alert.metadata.businessSlice}
                    </span>
                  </div>
                  
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {alert.title}
                  </h4>
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    {alert.description}
                  </p>
                  
                  <div className="text-sm text-gray-500 space-x-4">
                    <span>발생: {new Date(alert.triggeredAt).toLocaleString()}</span>
                    {alert.acknowledgedAt && (
                      <span>확인: {new Date(alert.acknowledgedAt).toLocaleString()}</span>
                    )}
                    {alert.resolvedAt && (
                      <span>해결: {new Date(alert.resolvedAt).toLocaleString()}</span>
                    )}
                  </div>
                  
                  {alert.metadata.currentValue && (
                    <div className="mt-2 text-sm">
                      <span className="text-gray-600">현재값: </span>
                      <span className="font-mono">{alert.metadata.currentValue}</span>
                      {alert.metadata.threshold && (
                        <>
                          <span className="text-gray-600 ml-2">임계값: </span>
                          <span className="font-mono">{alert.metadata.threshold}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 ml-4">
                  {alert.status === 'pending' || alert.status === 'sent' ? (
                    <button
                      onClick={() => handleAlertAction(alert.alertId, 'acknowledge')}
                      className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-md text-sm hover:bg-yellow-200"
                    >
                      확인
                    </button>
                  ) : null}
                  
                  {alert.status !== 'resolved' && (
                    <button
                      onClick={() => handleAlertAction(alert.alertId, 'resolve')}
                      className="px-3 py-1 bg-green-100 text-green-800 rounded-md text-sm hover:bg-green-200"
                    >
                      해결
                    </button>
                  )}
                </div>
              </div>
              
              {/* 전송 시도 이력 */}
              {alert.attempts.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-xs text-gray-500 mb-1">전송 이력:</div>
                  <div className="flex space-x-2">
                    {alert.attempts.map((attempt, index) => (
                      <span
                        key={index}
                        className={`px-2 py-1 rounded text-xs ${
                          attempt.status === 'success' ? 'bg-green-100 text-green-800' :
                          attempt.status === 'failed' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {attempt.channel} {attempt.status === 'success' ? '✓' : '✗'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
          
          {alerts.length === 0 && (
            <div className="text-center text-gray-500 py-8">
              알림이 없습니다
            </div>
          )}
        </div>
      </Card>
    </div>
  )

  const renderJourneysTab = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Object.entries(journeyStats).map(([journeyType, stats]: [string, any]) => (
          <Card key={journeyType} className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              {journeyType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">총 시작</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalStarted || 0}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">완료율</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {((stats?.completionRate || 0) * 100).toFixed(1)}%
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">평균 소요시간</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {Math.round((stats?.avgDuration || 0) / 1000)}s
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-600">에러율</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  {((stats?.errorRate || 0) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>진행률</span>
                <span>{stats?.totalCompleted || 0}/{stats?.totalStarted || 0}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((stats?.completionRate || 0) * 100)}%` }}
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )

  const renderPerformanceTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Core Web Vitals
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">LCP (Largest Contentful Paint)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {webVitals.lcp ? `${webVitals.lcp.toFixed(0)}ms` : 'N/A'}
            </p>
            <div className={`mt-2 px-2 py-1 rounded text-xs inline-block ${
              !webVitals.lcp ? 'bg-gray-100 text-gray-600' :
              webVitals.lcp <= 2500 ? 'bg-green-100 text-green-800' :
              webVitals.lcp <= 4000 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {!webVitals.lcp ? 'No Data' :
               webVitals.lcp <= 2500 ? 'Good' :
               webVitals.lcp <= 4000 ? 'Needs Improvement' : 'Poor'}
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">INP (Interaction to Next Paint)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {webVitals.inp ? `${webVitals.inp.toFixed(0)}ms` : 'N/A'}
            </p>
            <div className={`mt-2 px-2 py-1 rounded text-xs inline-block ${
              !webVitals.inp ? 'bg-gray-100 text-gray-600' :
              webVitals.inp <= 200 ? 'bg-green-100 text-green-800' :
              webVitals.inp <= 500 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {!webVitals.inp ? 'No Data' :
               webVitals.inp <= 200 ? 'Good' :
               webVitals.inp <= 500 ? 'Needs Improvement' : 'Poor'}
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">CLS (Cumulative Layout Shift)</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {webVitals.cls ? webVitals.cls.toFixed(3) : 'N/A'}
            </p>
            <div className={`mt-2 px-2 py-1 rounded text-xs inline-block ${
              webVitals.cls === undefined ? 'bg-gray-100 text-gray-600' :
              webVitals.cls <= 0.1 ? 'bg-green-100 text-green-800' :
              webVitals.cls <= 0.25 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}>
              {webVitals.cls === undefined ? 'No Data' :
               webVitals.cls <= 0.1 ? 'Good' :
               webVitals.cls <= 0.25 ? 'Needs Improvement' : 'Poor'}
            </div>
          </div>
        </div>
        
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 mb-1">종합 성능 점수</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            {webVitals.performanceScore || 0}/100
          </p>
          <div className="mt-2 text-xs text-gray-500">
            수집된 메트릭: {webVitals.collectedCount || 0}개
          </div>
        </div>
      </Card>
    </div>
  )

  const renderApiTab = () => (
    <div className="space-y-6">
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          API 성능 현황
        </h3>
        
        <div className="space-y-4">
          {Object.entries(apiStats).map(([endpoint, stats]: [string, any]) => (
            <div key={endpoint} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {endpoint}
                </h4>
                <span className={`px-2 py-1 rounded-full text-xs ${
                  (stats?.errorRate || 0) < 0.05 ? 'bg-green-100 text-green-800' :
                  (stats?.errorRate || 0) < 0.1 ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {((stats?.errorRate || 0) * 100).toFixed(1)}% 오류
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">평균 응답시간</p>
                  <p className="font-semibold">
                    {(stats?.avgResponseTime || 0).toFixed(0)}ms
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">총 요청수</p>
                  <p className="font-semibold">
                    {stats?.totalRequests || 0}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">오류율</p>
                  <p className="font-semibold">
                    {((stats?.errorRate || 0) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
          
          {Object.keys(apiStats).length === 0 && (
            <div className="text-center text-gray-500 py-8">
              API 통계 데이터가 없습니다
            </div>
          )}
        </div>
      </Card>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            실시간 모니터링 대시보드
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            마지막 업데이트: {new Date(lastUpdate).toLocaleString()}
          </p>
        </div>
        
        <button
          onClick={loadAllData}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          새로고침
        </button>
      </div>

      {/* 탭 네비게이션 */}
      <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: '개요' },
            { id: 'alerts', label: `알림 (${alerts.filter(a => a.status !== 'resolved').length})` },
            { id: 'journeys', label: '사용자 여정' },
            { id: 'performance', label: '성능' },
            { id: 'api', label: 'API' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DashboardTab)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      {activeTab === 'overview' && renderOverviewTab()}
      {activeTab === 'alerts' && renderAlertsTab()}
      {activeTab === 'journeys' && renderJourneysTab()}
      {activeTab === 'performance' && renderPerformanceTab()}
      {activeTab === 'api' && renderApiTab()}

      {/* 토스트 메시지 */}
      {toast && (
        <Toast
          message={toast.message}
          variant={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}

export default RealTimeMonitoringDashboard