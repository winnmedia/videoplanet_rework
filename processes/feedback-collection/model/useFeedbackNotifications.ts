/**
 * Real-time Feedback Notifications Hook
 * Phase 3 - processes 레이어와 widgets 레이어 연결
 */

'use client'

import { useEffect, useState, useCallback, useRef } from 'react'

import { notificationEngine, type FeedbackEvent, type NotificationSubscriber } from '../lib/notificationEngine'

export interface FeedbackNotificationOptions {
  projectId: string
  userId?: string
  enableSound?: boolean
  filterTypes?: FeedbackEvent['type'][]
  onEvent?: (event: FeedbackEvent) => void
}

export interface FeedbackNotificationState {
  events: FeedbackEvent[]
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting'
  activeUsers: number
  lastEvent?: FeedbackEvent
  unreadCount: number
}

export function useFeedbackNotifications(options: FeedbackNotificationOptions): FeedbackNotificationState {
  const [state, setState] = useState<FeedbackNotificationState>({
    events: [],
    connectionStatus: 'disconnected',
    activeUsers: 0,
    unreadCount: 0
  })

  const subscriberIdRef = useRef<string>('')
  const unsubscribeRef = useRef<(() => void) | null>(null)
  const simulationCleanupRef = useRef<(() => void) | null>(null)

  // Generate unique subscriber ID
  useEffect(() => {
    subscriberIdRef.current = `subscriber_${Date.now()}_${Math.random().toString(36).substring(7)}`
  }, [])

  const handleEvent = useCallback((event: FeedbackEvent) => {
    setState(prevState => {
      const newEvents = [...prevState.events, event].slice(-50) // Keep last 50 events
      const newUnreadCount = prevState.unreadCount + 1
      
      return {
        ...prevState,
        events: newEvents,
        lastEvent: event,
        unreadCount: newUnreadCount
      }
    })

    // Play notification sound if enabled
    if (options.enableSound && typeof window !== 'undefined') {
      try {
        const audio = new Audio('/notification-sound.mp3')
        audio.volume = 0.3
        audio.play().catch(() => {
          // Ignore audio play errors (e.g., autoplay policy)
        })
      } catch (error) {
        console.warn('Could not play notification sound:', error)
      }
    }

    // Call custom event handler
    if (options.onEvent) {
      options.onEvent(event)
    }
  }, [options.enableSound, options.onEvent])

  const eventFilter = useCallback((event: FeedbackEvent): boolean => {
    // Filter by event types if specified
    if (options.filterTypes && options.filterTypes.length > 0) {
      return options.filterTypes.includes(event.type)
    }
    return true
  }, [options.filterTypes])

  // Subscribe to notifications
  useEffect(() => {
    if (!subscriberIdRef.current) return

    const subscriber: NotificationSubscriber = {
      id: subscriberIdRef.current,
      projectId: options.projectId,
      onEvent: handleEvent,
      filter: eventFilter
    }

    // Subscribe to notification engine
    const unsubscribe = notificationEngine.subscribe(subscriber)
    unsubscribeRef.current = unsubscribe

    // Update connection status
    setState(prevState => ({
      ...prevState,
      connectionStatus: 'connected',
      activeUsers: notificationEngine.getActiveSubscribersCount(options.projectId)
    }))

    // Start simulation in development mode
    if (process.env.NODE_ENV === 'development') {
      const simulationCleanup = notificationEngine.simulateRealtimeEvents(options.projectId)
      simulationCleanupRef.current = simulationCleanup
    }

    // Cleanup function
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
        unsubscribeRef.current = null
      }
      if (simulationCleanupRef.current) {
        simulationCleanupRef.current()
        simulationCleanupRef.current = null
      }
    }
  }, [options.projectId, handleEvent, eventFilter])

  // Update connection status periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (subscriberIdRef.current) {
        const status = notificationEngine.getConnectionStatus(subscriberIdRef.current)
        const activeUsers = notificationEngine.getActiveSubscribersCount(options.projectId)
        
        setState(prevState => ({
          ...prevState,
          connectionStatus: status,
          activeUsers
        }))
      }
    }, 5000) // Check every 5 seconds

    return () => clearInterval(interval)
  }, [options.projectId])

  return state
}

export function useResetUnreadCount() {
  return useCallback(() => {
    // Reset unread count - typically called when user views notifications
    // This could be enhanced to mark specific events as read
  }, [])
}