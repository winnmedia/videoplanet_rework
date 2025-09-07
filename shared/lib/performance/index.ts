/**
 * shared/lib/performance Public API
 * FSD 경계: 성능 최적화 유틸리티의 Public 인터페이스
 */

export { 
  ErrorPerformanceProvider, 
  OptimizedErrorPage,
  OptimizedNetworkError,
  INPOptimizedButton,
  CLSOptimizedContainer,
  useErrorPerformance,
  useErrorPerformanceMonitor,
  ErrorPerformanceMonitor
} from './ErrorPerformanceOptimizer'

export * from './web-vitals'