/**
 * API 공통 타입 정의
 */

// 메트릭 데이터 타입
export interface MetricData {
  lcp?: number;
  fid?: number;
  cls?: number;
  timestamp: string;
  [key: string]: unknown;
}

// API 요약 타입
export interface ApiSummary {
  endpoint?: string;
  avgResponseTime?: number;
  errorRate?: number;
  requestCount?: number;
  [key: string]: unknown;
}

// 성능 메트릭 타입
export interface PerformanceMetrics {
  lcp: { current: number; trend: number };
  fid: { current: number; trend: number };
  cls: { current: number; trend: number };
  pageLoadTime: { current: number; trend: number };
  apiResponseTime: { current: number; trend: number };
  errorRate: { current: number; trend: number };
  responseTime?: number;
  uptime?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

// 시계열 데이터 타입
export interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
}

// 대시보드 데이터 타입
export interface DashboardData {
  overview: Record<string, unknown>;
  performance: Record<string, unknown>;
  userJourneys?: Record<string, unknown>;
  features?: Record<string, unknown>;
  userBehavior?: Record<string, unknown>;
  insights?: Array<unknown>;
  alerts?: Array<unknown>;
}

// 여정 메트릭 타입
export interface JourneyMetrics {
  topJourneys?: Array<{
    name: string;
    completionRate: number;
    avgDuration: number;
    dropOffPoint: string;
    trend: number;
  }>;
  funnelAnalysis?: Array<{
    step: string;
    users: number;
    dropOff: number;
    conversionRate: number;
  }>;
  overallConversionRate?: number;
  completionRate?: number;
  averageTime?: number;
  bounceRate?: number;
  conversionRate?: number;
  dropOffPoints?: Array<{
    step: string;
    rate: number;
  }>;
}

// 행동 메트릭 타입
export interface BehaviorMetrics {
  totalSessions: number;
  avgSessionDuration: number;
  bounceRate: number;
  featureUsage?: Array<{
    feature: string;
    count: number;
    percentage: number;
  }>;
  featureAbandonment?: Array<{
    feature: string;
    rate: number;
    avgTimeBeforeAbandonment: number;
  }>;
}