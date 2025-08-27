/**
 * Performance Monitoring System
 * Phase 4 - Core Web Vitals + Custom Metrics
 */

export interface PerformanceMetric {
  name: string
  value: number
  timestamp: Date
  context?: Record<string, any>
}

export interface CoreWebVitals {
  LCP: number // Largest Contentful Paint
  FID: number // First Input Delay  
  CLS: number // Cumulative Layout Shift
  TTI: number // Time to Interactive
  FCP: number // First Contentful Paint
}

export interface CustomMetrics {
  videoLoadTime: number
  apiResponseTime: number
  stageTransitionTime: number
  feedbackDeliveryTime: number
  workflowCompletionTime: number
}

export class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetric[]>()
  private observers = new Map<string, PerformanceObserver>()
  private budgets = new Map<string, number>()
  private listeners = new Set<(metric: PerformanceMetric) => void>()

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebVitals()
      this.setupPerformanceBudgets()
    }
  }

  private initializeWebVitals() {
    // LCP (Largest Contentful Paint)
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries()
      const lastEntry = entries[entries.length - 1] as any
      this.recordMetric('LCP', lastEntry.startTime, {
        element: lastEntry.element?.tagName,
        url: lastEntry.url
      })
    })
    
    try {
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
      this.observers.set('LCP', lcpObserver)
    } catch (e) {
      console.warn('LCP observation not supported')
    }

    // FID (First Input Delay)
    const fidObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries() as any[]
      entries.forEach((entry) => {
        this.recordMetric('FID', entry.processingStart - entry.startTime, {
          eventType: entry.name,
          target: entry.target?.tagName
        })
      })
    })
    
    try {
      fidObserver.observe({ type: 'first-input', buffered: true })
      this.observers.set('FID', fidObserver)
    } catch (e) {
      console.warn('FID observation not supported')
    }

    // CLS (Cumulative Layout Shift)
    let clsScore = 0
    const clsObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries() as any[]
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          clsScore += entry.value
        }
      })
      this.recordMetric('CLS', clsScore)
    })
    
    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true })
      this.observers.set('CLS', clsObserver)
    } catch (e) {
      console.warn('CLS observation not supported')
    }

    // Navigation timing for TTI and FCP
    if ('performance' in window && 'navigation' in performance) {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
      
      // FCP from paint timing
      const paintEntries = performance.getEntriesByType('paint')
      const fcpEntry = paintEntries.find(entry => entry.name === 'first-contentful-paint')
      if (fcpEntry) {
        this.recordMetric('FCP', fcpEntry.startTime)
      }

      // TTI approximation
      const tti = navigationTiming.domContentLoadedEventEnd - navigationTiming.navigationStart
      this.recordMetric('TTI', tti)
    }
  }

  private setupPerformanceBudgets() {
    // Core Web Vitals budgets
    this.budgets.set('LCP', 2500)   // 2.5s
    this.budgets.set('FID', 100)    // 100ms
    this.budgets.set('CLS', 0.1)    // 0.1 score
    this.budgets.set('TTI', 3800)   // 3.8s
    this.budgets.set('FCP', 1800)   // 1.8s

    // Custom metrics budgets
    this.budgets.set('videoLoadTime', 5000)        // 5s
    this.budgets.set('apiResponseTime', 500)       // 500ms
    this.budgets.set('stageTransitionTime', 2000)  // 2s
    this.budgets.set('feedbackDeliveryTime', 200)  // 200ms
  }

  recordMetric(name: string, value: number, context?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: new Date(),
      context
    }

    // Store metric
    const existing = this.metrics.get(name) || []
    existing.push(metric)
    
    // Keep only last 100 metrics per type
    if (existing.length > 100) {
      existing.splice(0, existing.length - 100)
    }
    this.metrics.set(name, existing)

    // Check budget violation
    const budget = this.budgets.get(name)
    if (budget && value > budget) {
      this.handleBudgetViolation(metric, budget)
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(metric))
  }

  private handleBudgetViolation(metric: PerformanceMetric, budget: number): void {
    console.warn(`Performance budget violation: ${metric.name} = ${metric.value}ms (budget: ${budget}ms)`)
    
    // In production, you might want to send this to an analytics service
    if (typeof window !== 'undefined' && 'gtag' in window) {
      (window as any).gtag('event', 'performance_budget_violation', {
        metric_name: metric.name,
        metric_value: metric.value,
        budget_value: budget,
        violation_percentage: ((metric.value - budget) / budget * 100).toFixed(1)
      })
    }
  }

  // Custom metric recording methods
  measureVideoLoadTime(videoElement: HTMLVideoElement): () => void {
    const startTime = performance.now()
    
    const handleLoad = () => {
      const loadTime = performance.now() - startTime
      this.recordMetric('videoLoadTime', loadTime, {
        videoSrc: videoElement.src,
        videoDuration: videoElement.duration,
        videoSize: videoElement.videoWidth * videoElement.videoHeight
      })
      cleanup()
    }

    const handleError = () => {
      this.recordMetric('videoLoadTime', -1, { error: 'Failed to load' })
      cleanup()
    }

    const cleanup = () => {
      videoElement.removeEventListener('canplaythrough', handleLoad)
      videoElement.removeEventListener('error', handleError)
    }

    videoElement.addEventListener('canplaythrough', handleLoad, { once: true })
    videoElement.addEventListener('error', handleError, { once: true })

    return cleanup
  }

  measureApiCall<T>(promise: Promise<T>, endpoint: string): Promise<T> {
    const startTime = performance.now()
    
    return promise
      .then(result => {
        const responseTime = performance.now() - startTime
        this.recordMetric('apiResponseTime', responseTime, {
          endpoint,
          success: true
        })
        return result
      })
      .catch(error => {
        const responseTime = performance.now() - startTime
        this.recordMetric('apiResponseTime', responseTime, {
          endpoint,
          success: false,
          error: error.message
        })
        throw error
      })
  }

  measureStageTransition(fromStage: string, toStage: string): () => void {
    const startTime = performance.now()
    
    return () => {
      const transitionTime = performance.now() - startTime
      this.recordMetric('stageTransitionTime', transitionTime, {
        fromStage,
        toStage,
        transition: `${fromStage}_to_${toStage}`
      })
    }
  }

  measureFeedbackDelivery(): () => void {
    const startTime = performance.now()
    
    return () => {
      const deliveryTime = performance.now() - startTime
      this.recordMetric('feedbackDeliveryTime', deliveryTime)
    }
  }

  // Analytics and reporting
  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.get(name) || []
    }
    
    const allMetrics: PerformanceMetric[] = []
    this.metrics.forEach(metrics => allMetrics.push(...metrics))
    return allMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
  }

  getAverageMetric(name: string, windowMinutes = 5): number | null {
    const metrics = this.getMetrics(name)
    const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000)
    const recentMetrics = metrics.filter(m => m.timestamp > cutoff)
    
    if (recentMetrics.length === 0) return null
    
    const sum = recentMetrics.reduce((acc, m) => acc + m.value, 0)
    return sum / recentMetrics.length
  }

  getCoreWebVitals(): Partial<CoreWebVitals> {
    return {
      LCP: this.getAverageMetric('LCP') || 0,
      FID: this.getAverageMetric('FID') || 0,
      CLS: this.getAverageMetric('CLS') || 0,
      TTI: this.getAverageMetric('TTI') || 0,
      FCP: this.getAverageMetric('FCP') || 0
    }
  }

  getCustomMetrics(): Partial<CustomMetrics> {
    return {
      videoLoadTime: this.getAverageMetric('videoLoadTime') || 0,
      apiResponseTime: this.getAverageMetric('apiResponseTime') || 0,
      stageTransitionTime: this.getAverageMetric('stageTransitionTime') || 0,
      feedbackDeliveryTime: this.getAverageMetric('feedbackDeliveryTime') || 0,
      workflowCompletionTime: this.getAverageMetric('workflowCompletionTime') || 0
    }
  }

  getBudgetViolations(): Array<{ metric: string; current: number; budget: number; violation: number }> {
    const violations: Array<{ metric: string; current: number; budget: number; violation: number }> = []
    
    this.budgets.forEach((budget, metricName) => {
      const current = this.getAverageMetric(metricName)
      if (current !== null && current > budget) {
        violations.push({
          metric: metricName,
          current,
          budget,
          violation: current - budget
        })
      }
    })
    
    return violations
  }

  onMetric(callback: (metric: PerformanceMetric) => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  destroy(): void {
    this.observers.forEach(observer => observer.disconnect())
    this.observers.clear()
    this.listeners.clear()
    this.metrics.clear()
  }
}

// Global singleton
export const performanceMonitor = new PerformanceMonitor()