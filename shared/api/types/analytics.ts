/**
 * Analytics API Types
 * 분석 API를 위한 강타입 정의
 */

export interface MetricData {
  lcp?: number;
  fid?: number;
  cls?: number;
  timestamp?: string;
  [key: string]: unknown;
}

export interface ApiSummary {
  avgResponseTime?: number;
  totalRequests?: number;
  errorRate?: number;
  [key: string]: unknown;
}

export interface TrendMetric {
  current: number;
  trend: number;
}

export interface PerformanceMetrics {
  lcp: TrendMetric;
  fid: TrendMetric;
  cls: TrendMetric;
  pageLoadTime: TrendMetric;
  apiResponseTime: TrendMetric;
}

export interface TimeSeriesData {
  timestamp: string;
  value: number;
  label?: string;
}

export interface DashboardData {
  metrics: PerformanceMetrics;
  timeSeriesData: TimeSeriesData[];
  summary: Record<string, ApiSummary>;
}

export interface UserJourneyStep {
  step: string;
  completionRate: number;
  averageTime: number;
  dropOffRate?: number;
}

export interface UserJourneyData {
  journey: UserJourneyStep[];
  totalUsers: number;
  completionRate: number;
}