/**
 * Custom hook for performance monitoring and optimization
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePerformanceContext } from './PerformanceProvider';
import type { WebVitalMetric } from './webVitals';

interface PerformanceMetrics {
  lcp?: WebVitalMetric;
  inp?: WebVitalMetric;
  cls?: WebVitalMetric;
  fcp?: WebVitalMetric;
  fid?: WebVitalMetric;
  ttfb?: WebVitalMetric;
}

interface PerformanceHookReturn {
  // Current metrics
  metrics: PerformanceMetrics;
  allMetrics: WebVitalMetric[];
  
  // Performance status
  isMonitoring: boolean;
  hasPerformanceIssues: boolean;
  performanceScore: number;
  
  // Actions
  flushMetrics: () => Promise<void>;
  clearMetrics: () => void;
  getRecommendations: () => string[];
  
  // Utility functions
  trackCustomMetric: (name: string, value: number) => void;
  preloadResource: (url: string, type: string) => void;
  prefetchResource: (url: string) => void;
}

export default function usePerformance(): PerformanceHookReturn {
  const { 
    webVitalsMonitor, 
    performanceOptimizer, 
    resourceOptimizer, 
    isMonitoring 
  } = usePerformanceContext();

  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [allMetrics, setAllMetrics] = useState<WebVitalMetric[]>([]);

  // Update metrics from monitor
  useEffect(() => {
    if (!webVitalsMonitor || !isMonitoring) return;

    const updateMetrics = () => {
      const currentMetrics = webVitalsMonitor.getMetrics();
      setAllMetrics(currentMetrics);

      // Group metrics by name, taking the latest value
      const groupedMetrics = currentMetrics.reduce((acc, metric) => {
        acc[metric.name.toLowerCase() as keyof PerformanceMetrics] = metric;
        return acc;
      }, {} as PerformanceMetrics);

      setMetrics(groupedMetrics);
    };

    // Update immediately
    updateMetrics();

    // Update every 5 seconds
    const intervalId = setInterval(updateMetrics, 5000);

    return () => clearInterval(intervalId);
  }, [webVitalsMonitor, isMonitoring]);

  // Calculate performance score based on Core Web Vitals
  const performanceScore = useMemo(() => {
    const scores: number[] = [];
    
    // LCP scoring (0-100)
    if (metrics.lcp) {
      const lcpValue = metrics.lcp.value;
      if (lcpValue <= 2500) scores.push(100);
      else if (lcpValue <= 4000) scores.push(Math.max(0, 100 - ((lcpValue - 2500) / 1500) * 50));
      else scores.push(Math.max(0, 50 - ((lcpValue - 4000) / 2000) * 50));
    }

    // INP scoring (0-100)  
    if (metrics.inp) {
      const inpValue = metrics.inp.value;
      if (inpValue <= 200) scores.push(100);
      else if (inpValue <= 500) scores.push(Math.max(0, 100 - ((inpValue - 200) / 300) * 50));
      else scores.push(Math.max(0, 50 - ((inpValue - 500) / 500) * 50));
    }

    // CLS scoring (0-100)
    if (metrics.cls) {
      const clsValue = metrics.cls.value;
      if (clsValue <= 0.1) scores.push(100);
      else if (clsValue <= 0.25) scores.push(Math.max(0, 100 - ((clsValue - 0.1) / 0.15) * 50));
      else scores.push(Math.max(0, 50 - ((clsValue - 0.25) / 0.25) * 50));
    }

    // FCP scoring (0-100)
    if (metrics.fcp) {
      const fcpValue = metrics.fcp.value;
      if (fcpValue <= 1800) scores.push(100);
      else if (fcpValue <= 3000) scores.push(Math.max(0, 100 - ((fcpValue - 1800) / 1200) * 50));
      else scores.push(Math.max(0, 50 - ((fcpValue - 3000) / 2000) * 50));
    }

    return scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  }, [metrics]);

  // Check if there are performance issues
  const hasPerformanceIssues = useMemo(() => {
    return allMetrics.some(metric => metric.rating === 'poor') || performanceScore < 70;
  }, [allMetrics, performanceScore]);

  // Flush metrics
  const flushMetrics = useCallback(async () => {
    if (webVitalsMonitor) {
      await webVitalsMonitor.flushNow();
    }
  }, [webVitalsMonitor]);

  // Clear metrics
  const clearMetrics = useCallback(() => {
    if (webVitalsMonitor) {
      webVitalsMonitor.clearMetrics();
      setMetrics({});
      setAllMetrics([]);
    }
  }, [webVitalsMonitor]);

  // Get performance recommendations
  const getRecommendations = useCallback(() => {
    const recommendations: string[] = [];

    // LCP recommendations
    if (metrics.lcp && metrics.lcp.rating === 'poor') {
      recommendations.push('LCP 개선: 중요 리소스 preload, 이미지 최적화, 서버 응답 시간 단축');
    }

    // INP recommendations
    if (metrics.inp && metrics.inp.rating === 'poor') {
      recommendations.push('INP 개선: 긴 작업 분할, 코드 스플리팅, Web Workers 활용');
    }

    // CLS recommendations
    if (metrics.cls && metrics.cls.rating === 'poor') {
      recommendations.push('CLS 개선: 이미지/비디오 크기 지정, 폰트 최적화, 동적 콘텐츠 공간 예약');
    }

    // FCP recommendations
    if (metrics.fcp && metrics.fcp.rating === 'poor') {
      recommendations.push('FCP 개선: 중요 CSS 인라인, 렌더 블로킹 리소스 제거');
    }

    // TTFB recommendations
    if (metrics.ttfb && metrics.ttfb.rating === 'poor') {
      recommendations.push('TTFB 개선: 서버 최적화, CDN 사용, 캐싱 전략 개선');
    }

    // Add general recommendations based on performance score
    if (performanceScore < 50) {
      recommendations.push('전반적 성능 개선: 번들 크기 최적화, 리소스 압축, 캐싱 전략 점검');
    } else if (performanceScore < 70) {
      recommendations.push('성능 모니터링 강화: 지속적 측정 및 임계값 설정 필요');
    }

    return recommendations;
  }, [metrics, performanceScore]);

  // Track custom metric
  const trackCustomMetric = useCallback((name: string, value: number) => {
    if (webVitalsMonitor) {
      // Create custom metric in Web Vitals format
      const customMetric: WebVitalMetric = {
        name,
        value,
        rating: value > 1000 ? 'poor' : value > 500 ? 'needs-improvement' : 'good',
        delta: value,
        id: `custom-${Date.now()}`,
        timestamp: Date.now(),
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        deviceType: typeof window !== 'undefined' ? 
          (window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop') : 'desktop',
      };

      // Add to metrics
      setAllMetrics(prev => [...prev, customMetric]);
      
      console.log(`[Performance] Custom metric tracked: ${name} = ${value}ms`);
    }
  }, [webVitalsMonitor]);

  // Preload resource
  const preloadResource = useCallback((url: string, type: string) => {
    resourceOptimizer.preloadCriticalResources([{
      href: url,
      as: type,
      crossorigin: type === 'font',
    }]);
  }, [resourceOptimizer]);

  // Prefetch resource
  const prefetchResource = useCallback((url: string) => {
    resourceOptimizer.prefetchResources([url]);
  }, [resourceOptimizer]);

  return {
    metrics,
    allMetrics,
    isMonitoring,
    hasPerformanceIssues,
    performanceScore,
    flushMetrics,
    clearMetrics,
    getRecommendations,
    trackCustomMetric,
    preloadResource,
    prefetchResource,
  };
}

// Additional utility hooks for specific use cases

export function usePageLoadTracking(pageName: string) {
  const { trackCustomMetric } = usePerformance();

  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const loadTime = performance.now() - startTime;
      trackCustomMetric(`page-load-${pageName}`, loadTime);
    };
  }, [pageName, trackCustomMetric]);
}

export function useInteractionTracking(interactionName: string) {
  const { trackCustomMetric } = usePerformance();

  return useCallback((callback: () => void | Promise<void>) => {
    const startTime = performance.now();
    
    const result = callback();
    
    if (result instanceof Promise) {
      result.finally(() => {
        const interactionTime = performance.now() - startTime;
        trackCustomMetric(`interaction-${interactionName}`, interactionTime);
      });
    } else {
      const interactionTime = performance.now() - startTime;
      trackCustomMetric(`interaction-${interactionName}`, interactionTime);
    }
    
    return result;
  }, [interactionName, trackCustomMetric]);
}