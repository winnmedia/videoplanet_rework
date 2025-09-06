/**
 * Optimized Conflict Detection Hook
 * @description Performance-optimized hook for real-time conflict detection
 */

import { useMemo, useCallback, useRef, useEffect } from 'react'

// Simple debounce implementation to avoid lodash dependency
const debounce = <T extends (...args: any[]) => any>(func: T, delay: number): T & { cancel: () => void } => {
  let timeoutId: NodeJS.Timeout
  const debounced = ((...args: any[]) => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }) as T & { cancel: () => void }
  
  debounced.cancel = () => {
    clearTimeout(timeoutId)
  }
  
  return debounced
}

import type {
  ProjectCalendarEvent,
  EnhancedCalendarConflict,
  ConflictDetectionResult,
  ConflictResolutionOption,
  AutoResolutionResult
} from '@/entities/calendar'
import { ConflictDetectionService, ConflictResolutionService } from '@/entities/calendar'

interface UseConflictDetectionOptions {
  debounceMs?: number
  enableAutoResolution?: boolean
  autoResolutionStrategy?: 'minimize-disruption' | 'priority-based' | 'earliest-available'
  maxConflictsToShow?: number
}

interface ConflictDetectionHookResult {
  // Detection Results
  conflictResult: ConflictDetectionResult
  conflictsByDate: Map<string, EnhancedCalendarConflict[]>
  highPriorityConflicts: EnhancedCalendarConflict[]
  
  // Resolution Capabilities
  resolutionOptions: Map<string, ConflictResolutionOption[]>
  autoResolutionResults: AutoResolutionResult[]
  
  // Actions
  detectConflicts: (events: ProjectCalendarEvent[]) => ConflictDetectionResult
  generateResolutions: (conflictId: string) => ConflictResolutionOption[]
  validateResolution: (eventId: string, newStartDate: string, newEndDate: string) => {
    isValid: boolean
    warnings: string[]
  }
  
  // Performance Metrics
  detectionTime: number
  cacheHitRate: number
}

/**
 * Performance-optimized conflict detection hook
 */
export function useConflictDetection(
  events: ProjectCalendarEvent[],
  options: UseConflictDetectionOptions = {}
): ConflictDetectionHookResult {
  const {
    debounceMs = 300,
    enableAutoResolution = true,
    autoResolutionStrategy = 'minimize-disruption',
    maxConflictsToShow = 10
  } = options

  // Performance tracking
  const detectionTimeRef = useRef<number>(0)
  const cacheRef = useRef<Map<string, ConflictDetectionResult>>(new Map())
  const cacheHits = useRef<number>(0)
  const cacheMisses = useRef<number>(0)

  // Generate cache key for events
  const generateCacheKey = useCallback((events: ProjectCalendarEvent[]): string => {
    // Create deterministic key based on event IDs and dates
    return events
      .filter(e => e.phase.type === 'production') // Only production events matter for conflicts
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(e => `${e.id}:${e.startDate}:${e.endDate}`)
      .join('|')
  }, [])

  // Optimized conflict detection with caching
  const detectConflicts = useCallback((events: ProjectCalendarEvent[]): ConflictDetectionResult => {
    const startTime = performance.now()
    const cacheKey = generateCacheKey(events)
    
    // Check cache first
    const cached = cacheRef.current.get(cacheKey)
    if (cached) {
      cacheHits.current++
      detectionTimeRef.current = performance.now() - startTime
      return cached
    }

    cacheMisses.current++

    // Perform detection
    const result = ConflictDetectionService.detectConflicts(events)
    
    // Cache result (with size limit)
    if (cacheRef.current.size > 100) {
      // Clear oldest entries
      const keys = Array.from(cacheRef.current.keys())
      keys.slice(0, 50).forEach(key => cacheRef.current.delete(key))
    }
    cacheRef.current.set(cacheKey, result)
    
    detectionTimeRef.current = performance.now() - startTime
    return result
  }, [generateCacheKey])

  // Debounced conflict detection
  const debouncedDetectConflicts = useMemo(
    () => debounce(detectConflicts, debounceMs),
    [detectConflicts, debounceMs]
  )

  // Main conflict detection result
  const conflictResult = useMemo(() => {
    if (events.length === 0) {
      return {
        hasConflicts: false,
        conflicts: [],
        affectedEvents: [],
        conflictCount: 0
      }
    }

    return debouncedDetectConflicts(events)
  }, [events, debouncedDetectConflicts])

  // Group conflicts by date for efficient calendar rendering
  const conflictsByDate = useMemo(() => {
    const byDate = new Map<string, EnhancedCalendarConflict[]>()
    
    conflictResult.conflicts.forEach(conflict => {
      conflict.events.forEach(event => {
        // Get date range for event
        const start = new Date(event.startDate)
        const end = new Date(event.endDate)
        const current = new Date(start)
        
        while (current <= end) {
          const dateKey = current.toISOString().split('T')[0]
          const existing = byDate.get(dateKey) || []
          if (!existing.includes(conflict)) {
            existing.push(conflict)
            byDate.set(dateKey, existing)
          }
          current.setDate(current.getDate() + 1)
        }
      })
    })
    
    return byDate
  }, [conflictResult.conflicts])

  // High priority conflicts (severity: error)
  const highPriorityConflicts = useMemo(() => {
    return conflictResult.conflicts
      .filter(conflict => conflict.severity === 'error')
      .slice(0, maxConflictsToShow)
  }, [conflictResult.conflicts, maxConflictsToShow])

  // Generate resolution options for each conflict
  const resolutionOptions = useMemo(() => {
    const options = new Map<string, ConflictResolutionOption[]>()
    
    conflictResult.conflicts.forEach(conflict => {
      const conflictOptions = ConflictResolutionService.generateResolutionOptions(conflict, events)
      options.set(conflict.id, conflictOptions)
    })
    
    return options
  }, [conflictResult.conflicts, events])

  // Auto-resolution results if enabled
  const autoResolutionResults = useMemo(() => {
    if (!enableAutoResolution || conflictResult.conflicts.length === 0) {
      return []
    }

    // Only auto-resolve if we have a reasonable number of conflicts
    if (conflictResult.conflicts.length > 5) {
      return [] // Too many conflicts for auto-resolution
    }

    try {
      // This would typically be async, but for demo purposes we'll make it sync
      // In real implementation, you'd want to handle this with a separate async effect
      return [] // Placeholder - would contain actual auto-resolution results
    } catch (error) {
      console.warn('Auto-resolution failed:', error)
      return []
    }
  }, [conflictResult.conflicts, enableAutoResolution, autoResolutionStrategy])

  // Helper function to generate resolutions for specific conflict
  const generateResolutions = useCallback((conflictId: string): ConflictResolutionOption[] => {
    return resolutionOptions.get(conflictId) || []
  }, [resolutionOptions])

  // Validation helper
  const validateResolution = useCallback((
    eventId: string, 
    newStartDate: string, 
    newEndDate: string
  ) => {
    const validation = ConflictResolutionService.validateResolution(
      { eventId, newStartDate, newEndDate },
      events
    )

    return {
      isValid: validation.isValid,
      warnings: validation.warnings
    }
  }, [events])

  // Calculate cache hit rate
  const cacheHitRate = useMemo(() => {
    const total = cacheHits.current + cacheMisses.current
    return total > 0 ? (cacheHits.current / total) : 0
  }, [cacheHits.current, cacheMisses.current])

  // Cleanup effect
  useEffect(() => {
    return () => {
      debouncedDetectConflicts.cancel()
    }
  }, [debouncedDetectConflicts])

  return {
    // Detection Results
    conflictResult,
    conflictsByDate,
    highPriorityConflicts,
    
    // Resolution Capabilities
    resolutionOptions,
    autoResolutionResults,
    
    // Actions
    detectConflicts,
    generateResolutions,
    validateResolution,
    
    // Performance Metrics
    detectionTime: detectionTimeRef.current,
    cacheHitRate
  }
}