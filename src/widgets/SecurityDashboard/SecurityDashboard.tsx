import React, { useState, useEffect } from 'react'
import { RoleGuard } from '@/shared/ui/RoleGuard'
import { usePermission } from '@/shared/lib/rbac-system'

interface SecurityEvent {
  id: string
  type: 'PERMISSION_DENIED' | 'UNAUTHORIZED_ACCESS' | 'ROLE_CHANGE' | 'SUSPICIOUS_ACTIVITY'
  userId: string
  resource: string
  permission: string
  timestamp: Date
  severity: 'low' | 'medium' | 'high' | 'critical'
  metadata?: Record<string, unknown>
}

interface SecurityMetricsData {
  totalEvents: number
  highSeverityEvents: number
  mediumSeverityEvents: number
  lowSeverityEvents: number
  activeThreats: number
  blockedAttempts: number
}

// Main Security Dashboard Component
export function SecurityDashboard() {
  const { hasPermission, loading } = usePermission('security:read')
  
  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center justify-center p-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mr-3" />
        <span>권한 확인 중...</span>
      </div>
    )
  }
  
  return (
    <RoleGuard 
      requiredRole="admin"
      fallback={
        <div role="alert" className="p-6 bg-red-50 text-red-700 rounded-lg">
          <h2 className="text-lg font-medium mb-2">접근 권한 없음</h2>
          <p>보안 대시보드 접근 권한이 없습니다. 관리자에게 문의하세요.</p>
        </div>
      }
    >
      <main 
        role="main" 
        aria-label="보안 대시보드"
        className="max-w-7xl mx-auto p-6 space-y-6"
      >
        <header>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            보안 모니터링 대시보드
          </h1>
          <p className="text-gray-600">
            시스템 보안 상태와 위협을 실시간으로 모니터링합니다
          </p>
        </header>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Security Metrics */}
          <section 
            className="lg:col-span-1"
            role="region"
            aria-labelledby="metrics-heading"
          >
            <h2 id="metrics-heading" className="text-xl font-semibold mb-4">
              보안 지표
            </h2>
            <SecurityMetrics />
          </section>
          
          {/* Recent Security Events */}
          <section 
            className="lg:col-span-2"
            role="region"
            aria-labelledby="events-heading"
          >
            <h2 id="events-heading" className="text-xl font-semibold mb-4">
              최근 보안 이벤트
            </h2>
            <SecurityEventList />
          </section>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Threat Level Indicators */}
          <section role="region" aria-labelledby="threats-heading">
            <h3 id="threats-heading" className="text-lg font-medium mb-3">
              위험 수준 지표
            </h3>
            <ThreatIndicatorPanel />
          </section>
          
          {/* Quick Actions */}
          <section role="region" aria-labelledby="actions-heading">
            <h3 id="actions-heading" className="text-lg font-medium mb-3">
              빠른 작업
            </h3>
            <SecurityActions />
          </section>
        </div>
      </main>
    </RoleGuard>
  )
}

// Security Metrics Component
export function SecurityMetrics() {
  const [metrics, setMetrics] = useState<SecurityMetricsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/security/metrics')
        if (!response.ok) throw new Error('Failed to fetch metrics')
        const data = await response.json()
        setMetrics(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }
    
    fetchMetrics()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000)
    return () => clearInterval(interval)
  }, [])
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
            <div className="h-8 bg-gray-200 rounded"></div>
          </div>
        </div>
        <p className="sr-only">지표 로딩 중...</p>
      </div>
    )
  }
  
  if (error) {
    return (
      <div role="alert" className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">지표 로드 실패: {error}</p>
      </div>
    )
  }
  
  if (!metrics) return null
  
  const metricItems = [
    { label: '전체 이벤트', value: metrics.totalEvents, color: 'text-blue-600' },
    { label: '고위험 이벤트', value: metrics.highSeverityEvents, color: 'text-red-600' },
    { label: '활성 위협', value: metrics.activeThreats, color: 'text-orange-600' },
    { label: '차단된 시도', value: metrics.blockedAttempts, color: 'text-green-600' }
  ]
  
  return (
    <div className="bg-white rounded-lg shadow divide-y">
      {metricItems.map((item, index) => (
        <div key={index} className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">{item.label}</span>
            <span className={`text-2xl font-bold ${item.color}`}>
              {item.value.toLocaleString()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// Security Event List Component
export function SecurityEventList() {
  const [events, setEvents] = useState<SecurityEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [severityFilter, setSeverityFilter] = useState<string>('all')
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set())
  
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const response = await fetch('/api/security/events')
        if (!response.ok) throw new Error('Failed to fetch events')
        const data = await response.json()
        setEvents(data.events.map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        })))
      } catch (err) {
        console.error('Failed to fetch security events:', err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchEvents()
  }, [])
  
  const filteredEvents = events.filter(event => 
    severityFilter === 'all' || event.severity === severityFilter
  )
  
  const toggleEventExpansion = (eventId: string) => {
    const newExpanded = new Set(expandedEvents)
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId)
    } else {
      newExpanded.add(eventId)
    }
    setExpandedEvents(newExpanded)
  }
  
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="border rounded p-4">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }
  
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Filter Controls */}
      <div className="p-4 border-b">
        <label htmlFor="severity-filter" className="block text-sm font-medium text-gray-700 mb-2">
          심각도 필터
        </label>
        <select
          id="severity-filter"
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">모든 심각도</option>
          <option value="critical">위험</option>
          <option value="high">높음</option>
          <option value="medium">보통</option>
          <option value="low">낮음</option>
        </select>
      </div>
      
      {/* Event List */}
      <div className="divide-y max-h-96 overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            보안 이벤트가 없습니다
          </div>
        ) : (
          filteredEvents.map((event) => (
            <SecurityEventItem
              key={event.id}
              event={event}
              isExpanded={expandedEvents.has(event.id)}
              onToggleExpansion={() => toggleEventExpansion(event.id)}
            />
          ))
        )}
      </div>
    </div>
  )
}

// Individual Security Event Item
function SecurityEventItem({ 
  event, 
  isExpanded, 
  onToggleExpansion 
}: { 
  event: SecurityEvent
  isExpanded: boolean
  onToggleExpansion: () => void 
}) {
  const eventTypeLabels = {
    PERMISSION_DENIED: '권한 거부',
    UNAUTHORIZED_ACCESS: '무단 접근 시도',
    ROLE_CHANGE: '권한 변경',
    SUSPICIOUS_ACTIVITY: '의심스러운 활동'
  }
  
  const severityConfig = {
    critical: { color: 'bg-red-100 text-red-800', label: '위험' },
    high: { color: 'bg-red-100 text-red-800', label: '높음' },
    medium: { color: 'bg-yellow-100 text-yellow-800', label: '보통' },
    low: { color: 'bg-green-100 text-green-800', label: '낮음' }
  }
  
  const config = severityConfig[event.severity]
  const shouldAlert = event.severity === 'critical' || event.severity === 'high'
  
  return (
    <div 
      className="p-4"
      role={shouldAlert ? 'alert' : undefined}
      aria-live={shouldAlert ? 'assertive' : undefined}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-gray-900">
              {eventTypeLabels[event.type]}
            </span>
            <span 
              className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}
              role="img"
              aria-label={`심각도: ${config.label}`}
            >
              {config.label}
            </span>
          </div>
          <div className="mt-1 text-sm text-gray-600">
            리소스: {event.resource} | 사용자: {event.userId}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {event.timestamp.toLocaleString('ko-KR')}
          </div>
        </div>
        
        <button
          onClick={onToggleExpansion}
          className="ml-4 px-3 py-1 text-sm text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          aria-expanded={isExpanded}
          aria-label="상세 정보 보기"
        >
          {isExpanded ? '접기' : '상세'}
        </button>
      </div>
      
      {isExpanded && event.metadata && (
        <div className="mt-3 p-3 bg-gray-50 rounded">
          <h4 className="text-sm font-medium text-gray-700 mb-2">상세 정보</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {Object.entries(event.metadata).map(([key, value]) => (
              <div key={key}>
                <dt className="text-gray-600">{key}:</dt>
                <dd className="text-gray-900">{String(value)}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  )
}

// Threat Level Indicator Component
export function ThreatIndicator({ 
  level, 
  count 
}: { 
  level: 'low' | 'medium' | 'high' | 'critical'
  count: number 
}) {
  const config = {
    critical: { color: 'bg-red-100 text-red-800', label: '위험', icon: '🚨' },
    high: { color: 'bg-red-100 text-red-800', label: '높음', icon: '⚠️' },
    medium: { color: 'bg-yellow-100 text-yellow-800', label: '보통', icon: '⚡' },
    low: { color: 'bg-green-100 text-green-800', label: '낮음', icon: '✅' }
  }
  
  const { color, label, icon } = config[level]
  
  return (
    <div 
      className={`p-4 rounded-lg ${color}`}
      role="img"
      aria-label={`${count}건의 ${label}위험 위협`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-xl" aria-hidden="true">{icon}</span>
          <span className="font-medium">{label}</span>
        </div>
        <span className="text-2xl font-bold">{count}</span>
      </div>
      <p className="mt-1 text-sm">
        {count}건의 {label.includes('위험') ? label : `${label}위험`} 위협
      </p>
    </div>
  )
}

// Threat Indicator Panel
function ThreatIndicatorPanel() {
  const [threats, setThreats] = useState({
    critical: 0,
    high: 3,
    medium: 12,
    low: 5
  })
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <ThreatIndicator level="critical" count={threats.critical} />
      <ThreatIndicator level="high" count={threats.high} />
      <ThreatIndicator level="medium" count={threats.medium} />
      <ThreatIndicator level="low" count={threats.low} />
    </div>
  )
}

// Security Actions Component
function SecurityActions() {
  return (
    <div className="bg-white rounded-lg shadow p-6 space-y-4">
      <button 
        className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
        aria-label="모든 사용자 세션 강제 로그아웃"
      >
        긴급 세션 종료
      </button>
      
      <button 
        className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
        aria-label="의심스러운 활동 차단"
      >
        의심 활동 차단
      </button>
      
      <button 
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="보안 로그 내보내기"
      >
        로그 내보내기
      </button>
    </div>
  )
}