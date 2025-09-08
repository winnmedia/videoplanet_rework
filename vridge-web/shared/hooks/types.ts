/**
 * @fileoverview Shared Hooks Types
 * @description 공유 훅의 타입 정의
 * @layer shared/hooks
 */

export interface NotificationHook {
  notifications: Array<{
    id: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    timestamp: number
  }>
  addNotification: (message: string, type?: string) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
}

export interface PerformanceMetricsHook {
  metrics: {
    loadTime: number
    renderTime: number
    memoryUsage: number
  }
  startMeasurement: (name: string) => void
  endMeasurement: (name: string) => void
  getMetrics: () => Record<string, number>
}