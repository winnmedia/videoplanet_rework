/**
 * Monitoring Dashboard Widget - Public API
 * FSD Architecture: widgets/MonitoringDashboard/index.ts
 */

// Main Widget Component
export { MonitoringDashboardWidget } from './ui/MonitoringDashboardWidget'

// Sub Components (for individual use if needed)
export { PerformanceMetricsChart } from './ui/PerformanceMetricsChart'
export { WorkflowProgressVisualization } from './ui/WorkflowProgressVisualization'
export { SystemNotifications } from './ui/SystemNotifications'

// Types (for external integration)
export type {
  MonitoringDashboardProps,
  MonitoringDashboardState,
  WebVitalsChartData,
  PerformanceMetricsChartProps,
  WorkflowProgressProps,
  SystemNotificationsProps,
  EventLogEntry,
  FilterOptions,
  ChartTheme
} from './model/types'

// API Layer (for external integration)
export { monitoringApi } from './api/monitoringApi'
export type { MonitoringDashboardApi } from './api/monitoringApi'