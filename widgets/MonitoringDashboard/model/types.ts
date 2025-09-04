/**
 * Monitoring Dashboard - Types and Interfaces
 * FSD Architecture: widgets/MonitoringDashboard/model/types.ts
 */

import { FeedbackEvent } from '@/processes/feedback-collection/lib/notificationEngine'
import { WorkflowStage, WorkflowContext } from '@/processes/video-production/model/workflowMachine'
import { PerformanceMetric, CoreWebVitals, CustomMetrics } from '@/shared/lib/performance-monitor'

export interface MonitoringDashboardProps {
  projectId?: string
  refreshInterval?: number // ms, default: 5000
  className?: string
  'data-testid'?: string
}

// Core Web Vitals Chart Data
export interface WebVitalsChartData {
  timestamp: Date
  LCP: number
  FID: number
  CLS: number
  TTI: number
  FCP: number
}

// Performance Metrics Chart Props
export interface PerformanceMetricsChartProps {
  data: WebVitalsChartData[]
  budgets: Record<string, number>
  violations?: Array<{
    metric: string
    current: number
    budget: number
    violation: number
  }>
  className?: string
  'data-testid'?: string
}

// Workflow Progress Visualization
export interface WorkflowProgressProps {
  workflow: WorkflowContext
  isLoading?: boolean
  onStageClick?: (stage: WorkflowStage) => void
  className?: string
  'data-testid'?: string
}

// Workflow Stage Display
export interface WorkflowStageData {
  stage: WorkflowStage
  isCompleted: boolean
  isCurrent: boolean
  progress: number
  metadata?: Record<string, unknown>
  estimatedTime?: number
}

// System Notifications List
export interface SystemNotificationsProps {
  events: FeedbackEvent[]
  maxItems?: number
  onEventClick?: (event: FeedbackEvent) => void
  onClearAll?: () => void
  className?: string
  'data-testid'?: string
}

// Event Log Entry
export interface EventLogEntry {
  id: string
  timestamp: Date
  type: 'performance' | 'workflow' | 'system' | 'error'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  details?: Record<string, unknown>
  source?: string
}

// Event Log Props
export interface EventLogProps {
  events: EventLogEntry[]
  maxItems?: number
  filter?: {
    type?: string[]
    severity?: string[]
    source?: string[]
  }
  onEventClick?: (event: EventLogEntry) => void
  onClearLog?: () => void
  className?: string
  'data-testid'?: string
}

// Real-time Metrics Display
export interface RealtimeMetricsProps {
  coreVitals: Partial<CoreWebVitals>
  customMetrics: Partial<CustomMetrics>
  isConnected: boolean
  lastUpdate?: Date
  className?: string
  'data-testid'?: string
}

// Performance Budget Status
export interface BudgetStatusProps {
  violations: Array<{
    metric: string
    current: number
    budget: number
    violation: number
    severity: 'warning' | 'critical'
  }>
  className?: string
  'data-testid'?: string
}

// Monitoring Dashboard State
export interface MonitoringDashboardState {
  isLoading: boolean
  isConnected: boolean
  error: string | null
  lastUpdate: Date | null
  
  // Performance data
  coreVitals: Partial<CoreWebVitals>
  customMetrics: Partial<CustomMetrics>
  metricsHistory: WebVitalsChartData[]
  budgetViolations: Array<{
    metric: string
    current: number
    budget: number
    violation: number
  }>
  
  // Workflow data
  activeWorkflows: WorkflowContext[]
  workflowEvents: FeedbackEvent[]
  
  // System events
  systemEvents: EventLogEntry[]
  notifications: FeedbackEvent[]
  
  // Settings
  refreshInterval: number
  autoRefresh: boolean
  selectedProject?: string
}

// Chart Theme Configuration
export interface ChartTheme {
  primary: string
  success: string
  warning: string
  error: string
  info: string
  background: string
  grid: string
  text: string
  axis: string
}

// Accessibility Props
export interface A11yProps {
  'aria-label'?: string
  'aria-labelledby'?: string
  'aria-describedby'?: string
  role?: string
  tabIndex?: number
}

// Component Base Props
export interface BaseComponentProps extends A11yProps {
  className?: string
  'data-testid'?: string
  id?: string
}

// Filter Options
export interface FilterOptions {
  timeRange: '5m' | '15m' | '1h' | '6h' | '24h'
  metrics: string[]
  projects: string[]
  eventTypes: string[]
  severities: string[]
}