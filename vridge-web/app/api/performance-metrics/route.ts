import { NextRequest, NextResponse } from 'next/server';

/**
 * 🚀 성능 메트릭 수집 API 엔드포인트
 * 클라이언트에서 전송된 성능 데이터를 수집하고 저장합니다.
 */

export interface PerformanceMetricsPayload {
  // Core Web Vitals
  lcp: number | null;
  fid: number | null;
  cls: number | null;
  fcp: number | null;
  ttfb: number | null;
  
  // 커스텀 메트릭
  pageLoadTime: number | null;
  domContentLoaded: number | null;
  videoLoadTime: number | null;
  apiResponseTime: number | null;
  renderTime: number | null;
  
  // 컨텍스트 정보
  url: string;
  userAgent: string;
  connectionType: string;
  timestamp: number;
  sessionId: string;
  performanceScore: number;
}

// 메트릭 저장소 (실제로는 데이터베이스나 외부 서비스 사용)
const metricsStore = new Map<string, PerformanceMetricsPayload[]>();

export async function POST(request: NextRequest) {
  try {
    const payload: PerformanceMetricsPayload = await request.json();
    
    // 기본 검증
    if (!payload.sessionId || !payload.timestamp || !payload.url) {
      return NextResponse.json(
        { error: 'Missing required fields: sessionId, timestamp, url' },
        { status: 400 }
      );
    }

    // 메트릭 데이터 저장
    const sessionMetrics = metricsStore.get(payload.sessionId) || [];
    sessionMetrics.push({
      ...payload,
      timestamp: Date.now(), // 서버 타임스탬프로 덮어쓰기
    });
    metricsStore.set(payload.sessionId, sessionMetrics);

    // 성능 임계값 확인 및 알림
    await checkPerformanceThresholds(payload);

    // 메트릭 집계 및 분석 (비동기)
    aggregateMetrics(payload);

    console.log(`📊 Performance metrics collected for session ${payload.sessionId}:`, {
      url: payload.url,
      lcp: payload.lcp,
      fid: payload.fid,
      cls: payload.cls,
      score: payload.performanceScore,
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Metrics collected successfully',
      sessionId: payload.sessionId 
    });

  } catch (error) {
    console.error('❌ Error collecting performance metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get('sessionId');
  const aggregated = url.searchParams.get('aggregated') === 'true';

  try {
    if (sessionId) {
      // 특정 세션의 메트릭 조회
      const metrics = metricsStore.get(sessionId) || [];
      return NextResponse.json({ 
        sessionId, 
        metrics,
        count: metrics.length 
      });
    }

    if (aggregated) {
      // 집계된 메트릭 조회
      const aggregatedMetrics = getAggregatedMetrics();
      return NextResponse.json(aggregatedMetrics);
    }

    // 최근 메트릭 요약
    const recentMetrics = getRecentMetricsSummary();
    return NextResponse.json(recentMetrics);

  } catch (error) {
    console.error('❌ Error retrieving performance metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ========================================
// 유틸리티 함수들
// ========================================

async function checkPerformanceThresholds(metrics: PerformanceMetricsPayload) {
  const thresholds = {
    lcp: 2500,
    fid: 100,
    cls: 0.1,
    performanceScore: 80
  };

  const alerts = [];

  // Core Web Vitals 임계값 검사
  if (metrics.lcp && metrics.lcp > thresholds.lcp) {
    alerts.push({
      metric: 'lcp',
      value: metrics.lcp,
      threshold: thresholds.lcp,
      severity: metrics.lcp > thresholds.lcp * 1.5 ? 'critical' : 'warning'
    });
  }

  if (metrics.fid && metrics.fid > thresholds.fid) {
    alerts.push({
      metric: 'fid',
      value: metrics.fid,
      threshold: thresholds.fid,
      severity: metrics.fid > thresholds.fid * 2 ? 'critical' : 'warning'
    });
  }

  if (metrics.cls && metrics.cls > thresholds.cls) {
    alerts.push({
      metric: 'cls',
      value: metrics.cls,
      threshold: thresholds.cls,
      severity: metrics.cls > thresholds.cls * 2 ? 'critical' : 'warning'
    });
  }

  // 성능 점수 임계값 검사
  if (metrics.performanceScore < thresholds.performanceScore) {
    alerts.push({
      metric: 'performanceScore',
      value: metrics.performanceScore,
      threshold: thresholds.performanceScore,
      severity: metrics.performanceScore < 60 ? 'critical' : 'warning'
    });
  }

  // 알림 발송 (실제로는 Slack, 이메일 등으로)
  if (alerts.length > 0) {
    console.warn('🚨 Performance alerts:', {
      url: metrics.url,
      sessionId: metrics.sessionId,
      alerts
    });

    // 여기서 실제 알림 발송 로직 구현
    // await sendSlackAlert(alerts, metrics);
    // await sendEmailAlert(alerts, metrics);
  }
}

function aggregateMetrics(metrics: PerformanceMetricsPayload) {
  // 실제로는 백그라운드 작업이나 별도 서비스에서 처리
  setTimeout(() => {
    // 메트릭 집계 로직
    console.log('📈 Aggregating metrics for analytics...', {
      url: metrics.url,
      timestamp: metrics.timestamp
    });
  }, 0);
}

function getAggregatedMetrics() {
  const allMetrics = Array.from(metricsStore.values()).flat();
  
  if (allMetrics.length === 0) {
    return { message: 'No metrics available' };
  }

  // 기본 통계 계산
  const lcpValues = allMetrics.filter(m => m.lcp !== null).map(m => m.lcp!) as number[];
  const fidValues = allMetrics.filter(m => m.fid !== null).map(m => m.fid!) as number[];
  const clsValues = allMetrics.filter(m => m.cls !== null).map(m => m.cls!) as number[];
  const scoreValues = allMetrics.map(m => m.performanceScore);

  const calculateStats = (values: number[]) => {
    if (values.length === 0) return null;
    const sorted = values.sort((a, b) => a - b);
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      count: values.length
    };
  };

  return {
    period: '24h',
    totalSessions: metricsStore.size,
    totalMetrics: allMetrics.length,
    coreWebVitals: {
      lcp: calculateStats(lcpValues),
      fid: calculateStats(fidValues),
      cls: calculateStats(clsValues),
    },
    performanceScore: calculateStats(scoreValues),
    topPages: getTopPagesByTraffic(allMetrics),
    alerts: getRecentAlerts(),
    lastUpdated: new Date().toISOString()
  };
}

function getRecentMetricsSummary() {
  const allMetrics = Array.from(metricsStore.values()).flat();
  const recentMetrics = allMetrics
    .filter(m => Date.now() - m.timestamp < 60 * 60 * 1000) // 최근 1시간
    .slice(-100); // 최근 100개

  return {
    period: '1h',
    count: recentMetrics.length,
    sessions: new Set(recentMetrics.map(m => m.sessionId)).size,
    averageScore: recentMetrics.length > 0 
      ? Math.round(recentMetrics.reduce((sum, m) => sum + m.performanceScore, 0) / recentMetrics.length)
      : 0,
    metrics: recentMetrics.slice(-20) // 최신 20개만 반환
  };
}

function getTopPagesByTraffic(metrics: PerformanceMetricsPayload[]) {
  const pageStats = new Map<string, { count: number; avgScore: number }>();
  
  metrics.forEach(metric => {
    const url = metric.url;
    const existing = pageStats.get(url) || { count: 0, avgScore: 0 };
    existing.count += 1;
    existing.avgScore = Math.round(
      (existing.avgScore * (existing.count - 1) + metric.performanceScore) / existing.count
    );
    pageStats.set(url, existing);
  });

  return Array.from(pageStats.entries())
    .map(([url, stats]) => ({ url, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

function getRecentAlerts() {
  // 실제로는 별도 알림 저장소에서 조회
  return [
    {
      id: 'alert-1',
      timestamp: Date.now() - 30 * 60 * 1000,
      severity: 'warning',
      metric: 'lcp',
      value: 3200,
      threshold: 2500,
      url: '/dashboard'
    }
  ];
}