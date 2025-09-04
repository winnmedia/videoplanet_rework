/**
 * Real-time Feedback Notification Engine
 * Phase 3 - SSE (Server-Sent Events) System
 */

export interface FeedbackEvent {
  id: string
  type: 'feedback_added' | 'feedback_updated' | 'feedback_resolved' | 'stage_completed' | 'user_online'
  projectId: string
  userId?: string
  timestamp: Date
  data: Record<string, unknown>
}

export interface NotificationSubscriber {
  id: string
  projectId: string
  onEvent: (event: FeedbackEvent) => void
  filter?: (event: FeedbackEvent) => boolean
}

export class NotificationEngine {
  private subscribers = new Map<string, NotificationSubscriber>()
  private eventHistory = new Map<string, FeedbackEvent[]>()
  private connectionStatus = new Map<string, 'connected' | 'disconnected' | 'reconnecting'>()

  subscribe(subscriber: NotificationSubscriber): () => void {
    this.subscribers.set(subscriber.id, subscriber)
    this.connectionStatus.set(subscriber.id, 'connected')
    
    // Send recent events to new subscriber (last 10 events)
    const recentEvents = this.eventHistory.get(subscriber.projectId)?.slice(-10) || []
    recentEvents.forEach(event => {
      if (!subscriber.filter || subscriber.filter(event)) {
        subscriber.onEvent(event)
      }
    })

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(subscriber.id)
      this.connectionStatus.delete(subscriber.id)
    }
  }

  publish(event: FeedbackEvent): void {
    // Store in history
    const projectEvents = this.eventHistory.get(event.projectId) || []
    projectEvents.push(event)
    
    // Keep only last 100 events per project
    if (projectEvents.length > 100) {
      projectEvents.splice(0, projectEvents.length - 100)
    }
    this.eventHistory.set(event.projectId, projectEvents)

    // Notify subscribers
    for (const [subscriberId, subscriber] of this.subscribers) {
      if (subscriber.projectId === event.projectId) {
        try {
          if (!subscriber.filter || subscriber.filter(event)) {
            subscriber.onEvent(event)
          }
        } catch (error) {
          console.error(`Error delivering event to subscriber ${subscriberId}:`, error)
          this.connectionStatus.set(subscriberId, 'disconnected')
        }
      }
    }
  }

  getConnectionStatus(subscriberId: string): 'connected' | 'disconnected' | 'reconnecting' {
    return this.connectionStatus.get(subscriberId) || 'disconnected'
  }

  getProjectEventHistory(projectId: string, limit = 50): FeedbackEvent[] {
    return this.eventHistory.get(projectId)?.slice(-limit) || []
  }

  getActiveSubscribersCount(projectId: string): number {
    return Array.from(this.subscribers.values())
      .filter(sub => sub.projectId === projectId)
      .filter(sub => this.connectionStatus.get(sub.id) === 'connected')
      .length
  }

  simulateRealtimeEvents(projectId: string): () => void {
    const interval = setInterval(() => {
      const events: FeedbackEvent[] = [
        {
          id: `event_${Date.now()}`,
          type: 'feedback_added',
          projectId,
          userId: 'user_1',
          timestamp: new Date(),
          data: {
            feedbackId: `feedback_${Math.random().toString(36).substring(7)}`,
            message: '색감 조정이 필요합니다',
            timestamp: '00:01:23',
            priority: 'medium'
          }
        },
        {
          id: `event_${Date.now() + 1}`,
          type: 'user_online',
          projectId,
          userId: 'user_2',
          timestamp: new Date(),
          data: {
            userName: '김디자이너',
            cursor: { x: 450, y: 230 }
          }
        },
        {
          id: `event_${Date.now() + 2}`,
          type: 'stage_completed',
          projectId,
          timestamp: new Date(),
          data: {
            stage: 'editing',
            completedBy: 'user_3',
            duration: 125000,
            nextStage: 'post_production'
          }
        }
      ]

      // Randomly pick and publish one event
      const randomEvent = events[Math.floor(Math.random() * events.length)]
      this.publish(randomEvent)

    }, 3000) // Every 3 seconds

    // Return cleanup function
    return () => clearInterval(interval)
  }
}

// Global singleton instance
export const notificationEngine = new NotificationEngine()