/**
 * Performance Dashboard Widget
 * Performance Lead 요구사항: 실시간 성능 모니터링 대시보드
 */
'use client';

import React, { useState, useEffect } from 'react';

import { 
  initWebVitals, 
  getPerformanceDiagnostics, 
  PERFORMANCE_THRESHOLDS,
  type PerformanceMetricData 
} from '@shared/lib/performance/web-vitals';

interface MetricCardProps {
  name: string;
  value: number;
  unit: string;
  rating: 'good' | 'needs-improvement' | 'poor';
  threshold: { good: number; poor: number };
}

function MetricCard({ name, value, unit, rating, threshold }: MetricCardProps) {
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'good': return 'text-green-600 border-green-200 bg-green-50';
      case 'needs-improvement': return 'text-orange-600 border-orange-200 bg-orange-50';
      case 'poor': return 'text-red-600 border-red-200 bg-red-50';
      default: return 'text-gray-600 border-gray-200 bg-gray-50';
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === 'ms' && value > 1000) {
      return `${(value / 1000).toFixed(2)}s`;
    }
    return `${value.toFixed(unit === 'ms' ? 0 : 3)}${unit}`;
  };

  return (
    <div className={`p-4 rounded-lg border-2 ${getRatingColor(rating)}`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-sm">{name}</h3>
        <span className={`text-xs px-2 py-1 rounded-full ${getRatingColor(rating)}`}>
          {rating}
        </span>
      </div>
      
      <div className="text-2xl font-bold mb-1">
        {formatValue(value, unit)}
      </div>
      
      <div className="text-xs opacity-75">
        Good: ≤{formatValue(threshold.good, unit)} | 
        Poor: &gt;{formatValue(threshold.poor, unit)}
      </div>
      
      {/* Visual indicator */}
      <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-300 ${
            rating === 'good' ? 'bg-green-500' : 
            rating === 'needs-improvement' ? 'bg-orange-500' : 'bg-red-500'
          }`}
          style={{ 
            width: `${Math.min((value / threshold.poor) * 100, 100)}%` 
          }}
        />
      </div>
    </div>
  );
}

interface PerformanceData {
  LCP: number;
  INP: number;
  CLS: number;
  FCP: number;
  TTFB: number;
  [key: string]: number;
}

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<PerformanceData>({
    LCP: 0,
    INP: 0,
    CLS: 0,
    FCP: 0,
    TTFB: 0,
  });
  
  const [diagnostics, setDiagnostics] = useState<ReturnType<typeof getPerformanceDiagnostics>>(null);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Rating calculation
  const getRating = (value: number, thresholds: { good: number; poor: number }) => {
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.poor) return 'needs-improvement';
    return 'poor';
  };

  useEffect(() => {
    // Initialize Web Vitals monitoring
    initWebVitals();
    setIsMonitoring(true);

    // Get initial diagnostics
    const initialDiagnostics = getPerformanceDiagnostics();
    setDiagnostics(initialDiagnostics);

    // Listen for performance metrics updates
    const handlePerformanceUpdate = (event: CustomEvent<PerformanceMetricData>) => {
      const { name, value } = event.detail;
      
      setMetrics(prev => ({
        ...prev,
        [name]: value
      }));
    };

    // Custom event listener for performance updates
    window.addEventListener('performance-metric', handlePerformanceUpdate as EventListener);

    // Periodic diagnostics update
    const diagnosticsInterval = setInterval(() => {
      const newDiagnostics = getPerformanceDiagnostics();
      setDiagnostics(newDiagnostics);
    }, 5000);

    return () => {
      window.removeEventListener('performance-metric', handlePerformanceUpdate as EventListener);
      clearInterval(diagnosticsInterval);
    };
  }, []);

  // Core Web Vitals metrics
  const coreWebVitals = [
    {
      name: 'LCP',
      fullName: 'Largest Contentful Paint',
      value: metrics.LCP,
      unit: 'ms',
      threshold: PERFORMANCE_THRESHOLDS.LCP,
    },
    {
      name: 'INP',
      fullName: 'Interaction to Next Paint', 
      value: metrics.INP,
      unit: 'ms',
      threshold: PERFORMANCE_THRESHOLDS.INP,
    },
    {
      name: 'CLS',
      fullName: 'Cumulative Layout Shift',
      value: metrics.CLS,
      unit: '',
      threshold: PERFORMANCE_THRESHOLDS.CLS,
    },
  ];

  // Supporting metrics
  const supportingMetrics = [
    {
      name: 'FCP',
      fullName: 'First Contentful Paint',
      value: metrics.FCP,
      unit: 'ms',
      threshold: PERFORMANCE_THRESHOLDS.FCP,
    },
    {
      name: 'TTFB',
      fullName: 'Time to First Byte',
      value: metrics.TTFB,
      unit: 'ms',
      threshold: PERFORMANCE_THRESHOLDS.TTFB,
    },
  ];

  if (process.env.NODE_ENV === 'production') {
    return null; // Only show in development
  }

  return (
    <div className="fixed top-4 right-4 w-80 bg-white rounded-lg shadow-lg border p-4 z-50 max-h-96 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h2 className="font-bold text-lg">Performance Monitor</h2>
        <div className={`w-3 h-3 rounded-full ${isMonitoring ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
      </div>

      {/* Core Web Vitals */}
      <div className="mb-6">
        <h3 className="font-semibold text-sm mb-3 text-gray-700">Core Web Vitals (2024)</h3>
        <div className="space-y-3">
          {coreWebVitals.map((metric) => (
            <MetricCard
              key={metric.name}
              name={metric.fullName}
              value={metric.value}
              unit={metric.unit}
              rating={getRating(metric.value, metric.threshold)}
              threshold={metric.threshold}
            />
          ))}
        </div>
      </div>

      {/* Supporting Metrics */}
      <div className="mb-6">
        <h3 className="font-semibold text-sm mb-3 text-gray-700">Supporting Metrics</h3>
        <div className="space-y-3">
          {supportingMetrics.map((metric) => (
            <MetricCard
              key={metric.name}
              name={metric.fullName}
              value={metric.value}
              unit={metric.unit}
              rating={getRating(metric.value, metric.threshold)}
              threshold={metric.threshold}
            />
          ))}
        </div>
      </div>

      {/* Diagnostics */}
      {diagnostics && (
        <div>
          <h3 className="font-semibold text-sm mb-3 text-gray-700">Diagnostics</h3>
          <div className="text-xs space-y-1 text-gray-600">
            <div>DOM Ready: {diagnostics.domContentLoaded.toFixed(0)}ms</div>
            <div>Load Complete: {diagnostics.loadComplete.toFixed(0)}ms</div>
            <div>Resources: {diagnostics.resourceCount}</div>
            {diagnostics.usedJSHeapSize && (
              <div>JS Heap: {(diagnostics.usedJSHeapSize / 1024 / 1024).toFixed(1)}MB</div>
            )}
          </div>
        </div>
      )}

      {/* Performance Tips */}
      <div className="mt-4 p-3 bg-blue-50 rounded-lg">
        <h4 className="font-semibold text-sm text-blue-800 mb-2">Performance Tips</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• LCP: Optimize images and server response time</li>
          <li>• INP: Reduce JavaScript execution time</li>
          <li>• CLS: Set dimensions for images/videos</li>
        </ul>
      </div>
    </div>
  );
}

export default PerformanceDashboard;