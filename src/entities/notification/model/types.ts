// Notification Domain Entity Types
export interface Notification {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  metadata: NotificationMetadata
  status: NotificationStatus
  priority: NotificationPriority
  createdAt: Date
  readAt?: Date
  expiresAt?: Date
  actionUrl?: string
  actionLabel?: string
}

export enum NotificationType {
  PROJECT_UPDATE = 'project_update',
  TEAM_INVITATION = 'team_invitation',
  FEEDBACK_RECEIVED = 'feedback_received',
  SYSTEM_ANNOUNCEMENT = 'system_announcement',
  SECURITY_ALERT = 'security_alert',
  DEADLINE_REMINDER = 'deadline_reminder',
  COLLABORATION_REQUEST = 'collaboration_request',
  STORY_APPROVED = 'story_approved',
  STORY_REJECTED = 'story_rejected',
  MENTION = 'mention'
}

export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  ARCHIVED = 'archived'
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export interface NotificationMetadata {
  sourceId?: string // ID of the source entity (project, team, etc.)
  sourceType?: 'project' | 'team' | 'story' | 'feedback' | 'system'
  actorId?: string // ID of the user who triggered this notification
  actorName?: string // Name of the user who triggered this notification
  contextData?: Record<string, unknown> // Additional context-specific data
}

// Notification Actions/Commands
export interface CreateNotificationCommand {
  userId: string
  type: NotificationType
  title: string
  message: string
  metadata?: NotificationMetadata
  priority?: NotificationPriority
  actionUrl?: string
  actionLabel?: string
  expiresAt?: Date
}

export interface MarkNotificationAsReadCommand {
  notificationId: string
  userId: string
}

export interface BulkMarkNotificationsAsReadCommand {
  notificationIds: string[]
  userId: string
}

export interface ArchiveNotificationCommand {
  notificationId: string
  userId: string
}

// Notification Queries
export interface GetNotificationsQuery {
  userId: string
  status?: NotificationStatus[]
  types?: NotificationType[]
  limit?: number
  offset?: number
  priority?: NotificationPriority[]
}

export interface NotificationListResponse {
  notifications: Notification[]
  total: number
  unreadCount: number
  hasMore: boolean
}

// Domain Events
export interface NotificationCreatedEvent {
  type: 'NOTIFICATION_CREATED'
  payload: Notification
  timestamp: Date
}

export interface NotificationReadEvent {
  type: 'NOTIFICATION_READ'
  payload: { notificationId: string; userId: string; readAt: Date }
  timestamp: Date
}

export interface NotificationArchivedEvent {
  type: 'NOTIFICATION_ARCHIVED'
  payload: { notificationId: string; userId: string }
  timestamp: Date
}

export type NotificationDomainEvent = 
  | NotificationCreatedEvent 
  | NotificationReadEvent 
  | NotificationArchivedEvent

// Notification Settings (from User preferences)
export interface NotificationPreferences {
  emailEnabled: boolean
  pushEnabled: boolean
  types: Partial<Record<NotificationType, boolean>>
  quietHours?: {
    start: string // HH:MM format
    end: string // HH:MM format
    timezone: string
  }
}

// Real-time notification data
export interface NotificationUpdate {
  type: 'notification_created' | 'notification_read' | 'notification_archived'
  notification: Notification
  unreadCount: number
}