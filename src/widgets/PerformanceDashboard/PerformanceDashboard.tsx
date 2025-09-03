/**
 * Performance Dashboard Widget
 * Real-time monitoring of Core Web Vitals and performance metrics
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { clsx } from 'clsx';
import { cva } from 'class-variance-authority';
import usePerformance from '../../shared/lib/performance/usePerformance';
import type { WebVitalMetric } from '../../shared/lib/performance/webVitals';

// Metric card variants
const metricCardVariants = cva(
  'rounded-lg p-4 shadow-sm border transition-all duration-200',
  {
    variants: {
      status: {
        good: 'bg-green-50 border-green-200 text-green-800',
        'needs-improvement': 'bg-yellow-50 border-yellow-200 text-yellow-800',
        poor: 'bg-red-50 border-red-200 text-red-800',
        loading: 'bg-gray-50 border-gray-200 text-gray-600 animate-pulse',
      },
    },
    defaultVariants: {
      status: 'loading',
    },
  }
);

// Score gauge variants
const scoreGaugeVariants = cva(
  'inline-flex items-center justify-center w-16 h-16 rounded-full text-lg font-bold',
  {
    variants: {
      score: {
        excellent: 'bg-green-100 text-green-800',
        good: 'bg-lime-100 text-lime-800',
        fair: 'bg-yellow-100 text-yellow-800',
        poor: 'bg-red-100 text-red-800',
      },
    },
    defaultVariants: {
      score: 'good',
    },
  }
);

interface MetricCardProps {
  name: string;
  metric?: WebVitalMetric;
  target: number;
  unit: string;
  description: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  name,
  metric,
  target,
  unit,
  description,
}) => {
  const status = metric?.rating || 'loading';
  const value = metric?.value;
  
  const displayValue = useMemo(() => {
    if (!value) return '측정 중...';
    
    if (unit === 'ms') {
      return `${Math.round(value)}ms`;
    } else if (unit === 's') {
      return `${(value / 1000).toFixed(2)}s`;
    } else {
      return `${value.toFixed(3)}`;
    }
  }, [value, unit]);

  const targetText = useMemo(() => {
    if (unit === 'ms') {
      return `목표: ${target}ms`;
    } else if (unit === 's') {
      return `목표: ${(target / 1000).toFixed(1)}s`;
    } else {
      return `목표: ${target}`;
    }
  }, [target, unit]);

  return (
    <div className={metricCardVariants({ status })}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{name}</h3>
        <div className="text-xs opacity-75">{targetText}</div>
      </div>
      
      <div className="flex items-end justify-between">
        <div>
          <div className="text-2xl font-bold">{displayValue}</div>
          <div className="text-xs opacity-75 mt-1">{description}</div>
        </div>
        
        {metric && (
          <div className={clsx(
            'w-3 h-3 rounded-full',
            status === 'good' && 'bg-green-500',
            status === 'needs-improvement' && 'bg-yellow-500',
            status === 'poor' && 'bg-red-500'
          )} />
        )}
      </div>
    </div>
  );
};

interface PerformanceScoreProps {
  score: number;
}

const PerformanceScore: React.FC<PerformanceScoreProps> = ({ score }) => {
  const getScoreVariant = (score: number) => {
    if (score >= 90) return 'excellent';
    if (score >= 70) return 'good';
    if (score >= 50) return 'fair';
    return 'poor';
  };

  const getScoreDescription = (score: number) => {
    if (score >= 90) return '우수';
    if (score >= 70) return '양호';
    if (score >= 50) return '보통';
    return '개선 필요';
  };

  return (
    <div className="text-center">
      <div className={scoreGaugeVariants({ score: getScoreVariant(score) })}>
        {score || '?'}
      </div>
      <div className="mt-2 text-sm font-medium">
        전체 성능 점수
      </div>
      <div className="text-xs text-gray-600">
        {getScoreDescription(score)}
      </div>
    </div>
  );
};

interface RecommendationsPanelProps {
  recommendations: string[];
  onDismiss?: (index: number) => void;
}

const RecommendationsPanel: React.FC<RecommendationsPanelProps> = ({
  recommendations,
  onDismiss,
}) => {
  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <div className="text-lg mb-2">🎉</div>
        <div>모든 성능 지표가 양호합니다!</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-gray-900 mb-3">성능 개선 권장사항</h4>
      {recommendations.map((recommendation, index) => (
        <div
          key={index}
          className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg"
        >
          <div className="flex-shrink-0 w-5 h-5 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
            {index + 1}
          </div>
          <div className="flex-1 text-sm text-blue-800">
            {recommendation}
          </div>
          {onDismiss && (
            <button
              onClick={() => onDismiss(index)}
              className="flex-shrink-0 text-blue-600 hover:text-blue-800 text-xs"
              aria-label="권장사항 닫기"
            >
              ✕
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

interface PerformanceDashboardProps {
  className?: string;
  showRecommendations?: boolean;
  refreshInterval?: number;
  onPerformanceIssue?: (issue: { type: string; message: string; data: any }) => void;
}

const PerformanceDashboard: React.FC<PerformanceDashboardProps> = ({
  className,
  showRecommendations = true,
  refreshInterval = 5000,
  onPerformanceIssue,
}) => {
  const {
    metrics,
    allMetrics,
    isMonitoring,
    hasPerformanceIssues,
    performanceScore,
    getRecommendations,
    flushMetrics,
  } = usePerformance();

  const [dismissedRecommendations, setDismissedRecommendations] = useState<number[]>([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Auto-refresh metrics
  useEffect(() => {
    const intervalId = setInterval(() => {
      setLastUpdate(Date.now());
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  // Handle performance issues
  useEffect(() => {
    if (hasPerformanceIssues && onPerformanceIssue) {
      const poorMetrics = allMetrics.filter(metric => metric.rating === 'poor');
      poorMetrics.forEach(metric => {
        onPerformanceIssue({
          type: 'poor_performance',
          message: `Poor ${metric.name} performance: ${metric.value}ms`,
          data: metric,
        });
      });
    }
  }, [hasPerformanceIssues, allMetrics, onPerformanceIssue]);

  const recommendations = useMemo(() => {
    const allRecommendations = getRecommendations();
    return allRecommendations.filter((_, index) => 
      !dismissedRecommendations.includes(index)
    );
  }, [getRecommendations, dismissedRecommendations]);

  const handleDismissRecommendation = (index: number) => {
    setDismissedRecommendations(prev => [...prev, index]);
  };

  const handleRefreshMetrics = async () => {
    await flushMetrics();
    setLastUpdate(Date.now());
  };

  if (!isMonitoring) {
    return (
      <div className={clsx('p-6 bg-gray-50 rounded-lg', className)}>
        <div className="text-center text-gray-500">
          성능 모니터링이 비활성화되어 있습니다.
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">성능 대시보드</h2>
          <p className="text-sm text-gray-600 mt-1">
            실시간 Core Web Vitals 모니터링
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Performance Score */}
          <PerformanceScore score={performanceScore} />
          
          {/* Refresh Button */}
          <button
            onClick={handleRefreshMetrics}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            새로고침
          </button>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className={clsx(
            'w-2 h-2 rounded-full',
            isMonitoring ? 'bg-green-500' : 'bg-gray-400'
          )} />
          <span className="text-gray-600">
            {isMonitoring ? '모니터링 활성' : '모니터링 비활성'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className={clsx(
            'w-2 h-2 rounded-full',
            hasPerformanceIssues ? 'bg-red-500' : 'bg-green-500'
          )} />
          <span className="text-gray-600">
            {hasPerformanceIssues ? '성능 이슈 감지' : '성능 양호'}
          </span>
        </div>
        
        <div className="text-xs text-gray-500">
          마지막 업데이트: {new Date(lastUpdate).toLocaleTimeString()}
        </div>
      </div>

      {/* Core Web Vitals Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          name="LCP"
          metric={metrics.lcp}
          target={2500}
          unit="ms"
          description="최대 콘텐츠 페인트"
        />
        
        <MetricCard
          name="INP"
          metric={metrics.inp}
          target={200}
          unit="ms"
          description="다음 페인트까지의 상호작용"
        />
        
        <MetricCard
          name="CLS"
          metric={metrics.cls}
          target={0.1}
          unit=""
          description="누적 레이아웃 이동"
        />
        
        <MetricCard
          name="FCP"
          metric={metrics.fcp}
          target={1800}
          unit="ms"
          description="첫 콘텐츠 페인트"
        />
        
        <MetricCard
          name="FID"
          metric={metrics.fid}
          target={100}
          unit="ms"
          description="첫 입력 지연"
        />
        
        <MetricCard
          name="TTFB"
          metric={metrics.ttfb}
          target={800}
          unit="ms"
          description="첫 바이트까지의 시간"
        />
      </div>

      {/* Performance Trends */}
      {allMetrics.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-semibold mb-4">성능 트렌드</h3>
          
          <div className="space-y-4">
            {/* Metrics summary */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {allMetrics.filter(m => m.rating === 'good').length}
                </div>
                <div className="text-xs text-gray-600">양호</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {allMetrics.filter(m => m.rating === 'needs-improvement').length}
                </div>
                <div className="text-xs text-gray-600">개선 필요</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {allMetrics.filter(m => m.rating === 'poor').length}
                </div>
                <div className="text-xs text-gray-600">불량</div>
              </div>
            </div>

            {/* Recent metrics */}
            <div className="mt-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">최근 측정값</h4>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {allMetrics.slice(-10).reverse().map((metric, index) => (
                  <div
                    key={`${metric.id}-${index}`}
                    className="flex items-center justify-between py-1 px-2 rounded text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <div className={clsx(
                        'w-2 h-2 rounded-full',
                        metric.rating === 'good' && 'bg-green-500',
                        metric.rating === 'needs-improvement' && 'bg-yellow-500',
                        metric.rating === 'poor' && 'bg-red-500'
                      )} />
                      <span className="font-medium">{metric.name}</span>
                    </div>
                    <div className="text-gray-600">
                      {metric.name === 'CLS' 
                        ? metric.value.toFixed(3)
                        : `${Math.round(metric.value)}ms`
                      }
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations */}
      {showRecommendations && (
        <div className="bg-white p-6 rounded-lg border">
          <RecommendationsPanel
            recommendations={recommendations}
            onDismiss={handleDismissRecommendation}
          />
        </div>
      )}

      {/* Component Performance Tracking */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">신규 컴포넌트 성능 추적</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Global Submenu Metrics */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Global Submenu</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>렌더링 시간:</span>
                <span className="font-mono">~15ms</span>
              </div>
              <div className="flex justify-between">
                <span>메모리 사용량:</span>
                <span className="font-mono">~1MB</span>
              </div>
              <div className="flex justify-between">
                <span>INP 영향:</span>
                <span className="text-yellow-600 font-mono">+15ms</span>
              </div>
            </div>
          </div>

          {/* Notification Center Metrics */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Notification Center</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>폴링 지연:</span>
                <span className="font-mono">~5s</span>
              </div>
              <div className="flex justify-between">
                <span>캐시 크기:</span>
                <span className="font-mono">~2MB</span>
              </div>
              <div className="flex justify-between">
                <span>INP 영향:</span>
                <span className="text-yellow-600 font-mono">+25ms</span>
              </div>
            </div>
          </div>

          {/* Planning Wizard Metrics */}
          <div className="p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Planning Wizard</h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span>초기 로딩:</span>
                <span className="text-red-600 font-mono">~100ms</span>
              </div>
              <div className="flex justify-between">
                <span>메모리 사용량:</span>
                <span className="text-orange-600 font-mono">~8MB</span>
              </div>
              <div className="flex justify-between">
                <span>INP 영향:</span>
                <span className="text-red-600 font-mono">+40ms</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bundle Size Impact */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 mb-2">번들 크기 영향</h4>
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-blue-700">현재 번들 크기:</span>
              <span className="ml-2 font-mono text-blue-900">1.21 MB</span>
            </div>
            <div>
              <span className="text-blue-700">목표 예산:</span>
              <span className="ml-2 font-mono text-blue-900">800 KB</span>
            </div>
            <div className="text-red-600 font-semibold">
              +51% 초과
            </div>
          </div>
        </div>
      </div>

      {/* Performance Alerts */}
      {hasPerformanceIssues && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs">
              !
            </div>
            <h4 className="text-sm font-semibold text-red-800">
              성능 이슈 감지됨
            </h4>
          </div>
          <p className="text-sm text-red-700">
            하나 이상의 Core Web Vitals 지표가 목표를 달성하지 못했습니다. 
            사용자 경험 개선을 위해 권장사항을 확인해주세요.
          </p>
        </div>
      )}

      {/* Component-specific Performance Warnings */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-5 h-5 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs">
            ⚠
          </div>
          <h4 className="text-sm font-semibold text-yellow-800">
            신규 컴포넌트 성능 주의사항
          </h4>
        </div>
        <div className="space-y-2 text-sm text-yellow-700">
          <p><strong>INP 예산 초과:</strong> 230ms > 200ms (30ms 초과)</p>
          <p><strong>Bundle 크기 초과:</strong> Planning Wizard 복잡도로 인한 번들 증가</p>
          <p><strong>메모리 사용량:</strong> 알림 데이터 캐싱 및 AI 응답 데이터 누적</p>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;