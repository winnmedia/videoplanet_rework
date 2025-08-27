/**
 * Performance Metrics React Hook
 * Phase 4 - React integration for performance monitoring
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

import { performanceMonitor, type PerformanceMetric, type CoreWebVitals, type CustomMetrics } from '../performance-monitor'

export interface PerformanceState {
  coreWebVitals: Partial<CoreWebVitals>
  customMetrics: Partial<CustomMetrics>
  budgetViolations: Array<{ metric: string; current: number; budget: number; violation: number }>
  recentMetrics: PerformanceMetric[]
  isMonitoring: boolean
}

export function usePerformanceMetrics(updateInterval = 5000): PerformanceState {
  const [state, setState] = useState<PerformanceState>({
    coreWebVitals: {},
    customMetrics: {},
    budgetViolations: [],
    recentMetrics: [],
    isMonitoring: false
  })

  const intervalRef = useRef<NodeJS.Timeout>()
  const unsubscribeRef = useRef<(() => void) | null>(null)

  const updateMetrics = useCallback(() => {
    const coreWebVitals = performanceMonitor.getCoreWebVitals()
    const customMetrics = performanceMonitor.getCustomMetrics()
    const budgetViolations = performanceMonitor.getBudgetViolations()
    const recentMetrics = performanceMonitor.getMetrics().slice(0, 10) // Last 10 metrics

    setState(prevState => ({
      ...prevState,
      coreWebVitals,
      customMetrics,
      budgetViolations,
      recentMetrics,
      isMonitoring: true
    }))
  }, [])

  useEffect(() => {
    // Initial load
    updateMetrics()

    // Subscribe to real-time metric updates
    const unsubscribe = performanceMonitor.onMetric(() => {
      updateMetrics()
    })
    unsubscribeRef.current = unsubscribe

    // Periodic updates
    intervalRef.current = setInterval(updateMetrics, updateInterval)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [updateMetrics, updateInterval])

  return state
}

export function useVideoPerformance() {
  const measureVideoLoad = useCallback((videoElement: HTMLVideoElement) => {
    return performanceMonitor.measureVideoLoadTime(videoElement)
  }, [])

  return { measureVideoLoad }
}

export function useApiPerformance() {
  const measureApiCall = useCallback(<T>(promise: Promise<T>, endpoint: string): Promise<T> => {
    return performanceMonitor.measureApiCall(promise, endpoint)
  }, [])

  return { measureApiCall }
}

export function useWorkflowPerformance() {
  const measureStageTransition = useCallback((fromStage: string, toStage: string) => {
    return performanceMonitor.measureStageTransition(fromStage, toStage)
  }, [])

  const measureFeedbackDelivery = useCallback(() => {
    return performanceMonitor.measureFeedbackDelivery()
  }, [])

  const recordWorkflowCompletion = useCallback((totalTime: number, stages: number) => {
    performanceMonitor.recordMetric('workflowCompletionTime', totalTime, {
      totalStages: stages,
      averageStageTime: totalTime / stages
    })
  }, [])

  return {
    measureStageTransition,
    measureFeedbackDelivery,
    recordWorkflowCompletion
  }
}

export function usePerformanceBudgetAlert(onViolation?: (violation: { metric: string; current: number; budget: number; violation: number }) => void) {
  const [violations, setViolations] = useState<Array<{ metric: string; current: number; budget: number; violation: number }>>([])

  useEffect(() => {
    const checkBudgets = () => {
      const currentViolations = performanceMonitor.getBudgetViolations()
      setViolations(currentViolations)

      // Alert on new violations
      if (onViolation && currentViolations.length > violations.length) {
        const newViolations = currentViolations.slice(violations.length)
        newViolations.forEach(onViolation)
      }
    }

    const interval = setInterval(checkBudgets, 10000) // Check every 10s
    checkBudgets() // Initial check

    return () => clearInterval(interval)
  }, [violations.length, onViolation])

  return violations
}