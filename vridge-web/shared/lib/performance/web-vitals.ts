/**
 * Real User Monitoring (RUM) with Web Vitals
 * Performance Lead 요구사항: 실제 사용자 성능 데이터 수집 및 분석
 */
'use client';

import { 
  onCLS, 
  onFCP, 
  onINP, 
  onLCP, 
  onTTFB,
  type Metric,
  type CLSMetric,
  type FCPMetric,
  type INPMetric,
  type LCPMetric,
  type TTFBMetric
} from 'web-vitals';

// Performance analytics endpoint
const ANALYTICS_ENDPOINT = '/api/analytics/performance';

// Performance budget thresholds (Performance Lead 기준)
export const PERFORMANCE_THRESHOLDS = {
  // Core Web Vitals (2024)
  LCP: { good: 2500, poor: 4000 },    // Largest Contentful Paint
  INP: { good: 200, poor: 500 },      // Interaction to Next Paint 
  CLS: { good: 0.1, poor: 0.25 },     // Cumulative Layout Shift
  
  // Supporting metrics
  FCP: { good: 1800, poor: 3000 },    // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }     // Time to First Byte
} as const;

// Performance rating calculation
export function getPerformanceRating(value: number, thresholds: { good: number; poor: number }) {
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.poor) return 'needs-improvement';
  return 'poor';
}

// Enhanced analytics data with attribution
export interface PerformanceMetricData {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
  attribution?: any;
  
  // Context data
  url: string;
  userAgent: string;
  connection?: string;
  deviceMemory?: number;
  timestamp: number;
  
  // Page-specific data
  route: string;
  isFirstLoad: boolean;
  
  // Session data
  sessionId: string;
  userId?: string;
}

// Analytics sender with retry mechanism
async function sendToAnalytics(data: PerformanceMetricData) {
  // Don't send analytics in development mode
  if (process.env.NODE_ENV === 'development') {
    console.group(`🔍 Performance Metric: ${data.name}`);
    console.log('Value:', data.value);
    console.log('Rating:', data.rating);
    console.log('Attribution:', data.attribution);
    console.log('Full Data:', data);
    console.groupEnd();
    return;
  }

  try {
    // Use beacon API for reliability
    if ('sendBeacon' in navigator) {
      navigator.sendBeacon(
        ANALYTICS_ENDPOINT, 
        JSON.stringify(data)
      );
    } else {
      // Fallback to fetch with retry
      await fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        keepalive: true,
      });
    }
  } catch (error) {
    console.warn('Failed to send performance metric:', error);
    
    // Store in localStorage for retry
    const failedMetrics = JSON.parse(
      localStorage.getItem('failed_performance_metrics') || '[]'
    );
    failedMetrics.push(data);
    localStorage.setItem('failed_performance_metrics', JSON.stringify(failedMetrics));
  }
}

// Create metric data with enhanced context
function createMetricData(metric: Metric): PerformanceMetricData {
  // Get performance rating
  const thresholds = PERFORMANCE_THRESHOLDS[metric.name as keyof typeof PERFORMANCE_THRESHOLDS];
  const rating = thresholds ? getPerformanceRating(metric.value, thresholds) : 'good';
  
  // Get session ID (create if not exists)
  let sessionId = sessionStorage.getItem('performance_session_id');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('performance_session_id', sessionId);
  }

  return {
    name: metric.name,
    value: metric.value,
    rating,
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType || 'unknown',
    attribution: (metric as any).attribution,
    
    // Context
    url: window.location.href,
    userAgent: navigator.userAgent,
    connection: (navigator as any).connection?.effectiveType,
    deviceMemory: (navigator as any).deviceMemory,
    timestamp: Date.now(),
    
    // Page context
    route: window.location.pathname,
    isFirstLoad: metric.navigationType === 'navigate',
    
    // Session context
    sessionId,
    userId: localStorage.getItem('user_id') || undefined,
  };
}

// Metric handlers with attribution
function handleLCP(metric: LCPMetric) {
  const data = createMetricData(metric);
  sendToAnalytics(data);
}

function handleINP(metric: INPMetric) {
  const data = createMetricData(metric);
  sendToAnalytics(data);
}

function handleCLS(metric: CLSMetric) {
  const data = createMetricData(metric);
  sendToAnalytics(data);
}

function handleFCP(metric: FCPMetric) {
  const data = createMetricData(metric);
  sendToAnalytics(data);
}

// FID는 INP로 대체되었으므로 제거 (Core Web Vitals 2024)
// Legacy FID 지원이 필요한 경우, 별도 폴백 구현 필요

function handleTTFB(metric: TTFBMetric) {
  const data = createMetricData(metric);
  sendToAnalytics(data);
}

// Initialize Web Vitals monitoring
export function initWebVitals() {
  // Only run in browser
  if (typeof window === 'undefined') return;

  // Core Web Vitals (2024)
  onLCP(handleLCP);
  onINP(handleINP); 
  onCLS(handleCLS);
  
  // Supporting metrics
  onFCP(handleFCP);
  onTTFB(handleTTFB);

  // Send any failed metrics on page load
  const failedMetrics = JSON.parse(
    localStorage.getItem('failed_performance_metrics') || '[]'
  );
  
  if (failedMetrics.length > 0) {
    failedMetrics.forEach(sendToAnalytics);
    localStorage.removeItem('failed_performance_metrics');
  }

  console.log('🔍 Web Vitals monitoring initialized');
}

// Performance observer for custom metrics
export function observeCustomMetric(name: string, value: number, context?: Record<string, any>) {
  const sessionId = sessionStorage.getItem('performance_session_id') || 'unknown';
  
  const customMetric: PerformanceMetricData = {
    name: `custom.${name}`,
    value,
    rating: 'good', // Custom metrics don't have standard ratings
    delta: value,
    id: `${name}_${Date.now()}`,
    navigationType: 'unknown',
    
    url: window.location.href,
    userAgent: navigator.userAgent,
    connection: (navigator as any).connection?.effectiveType,
    deviceMemory: (navigator as any).deviceMemory,
    timestamp: Date.now(),
    
    route: window.location.pathname,
    isFirstLoad: false,
    sessionId,
    userId: localStorage.getItem('user_id') || undefined,
    
    ...context
  };

  sendToAnalytics(customMetric);
}

// Performance diagnostics
export function getPerformanceDiagnostics() {
  if (typeof window === 'undefined') return null;

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  const paint = performance.getEntriesByType('paint');
  
  return {
    // Navigation timing
    domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
    
    // Paint timing
    firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
    firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
    
    // Resource timing summary
    resourceCount: performance.getEntriesByType('resource').length,
    
    // Memory (if available)
    usedJSHeapSize: (performance as any).memory?.usedJSHeapSize,
    totalJSHeapSize: (performance as any).memory?.totalJSHeapSize,
  };
}