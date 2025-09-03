// Notification Domain Model
import { z } from 'zod'
import { 
  Notification, 
  NotificationType, 
  NotificationStatus, 
  NotificationPriority,
  NotificationMetadata,
  CreateNotificationCommand,
  NotificationPreferences
} from './types'

// Zod schemas for runtime validation
export const NotificationTypeSchema = z.nativeEnum(NotificationType)
export const NotificationStatusSchema = z.nativeEnum(NotificationStatus)
export const NotificationPrioritySchema = z.nativeEnum(NotificationPriority)

export const NotificationMetadataSchema = z.object({
  sourceId: z.string().optional(),
  sourceType: z.enum(['project', 'team', 'story', 'feedback', 'system']).optional(),
  actorId: z.string().optional(),
  actorName: z.string().optional(),
  contextData: z.record(z.unknown()).optional(),
})

export const NotificationSchema = z.object({
  id: z.string().min(1, 'Notification ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  type: NotificationTypeSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  metadata: NotificationMetadataSchema,
  status: NotificationStatusSchema,
  priority: NotificationPrioritySchema,
  createdAt: z.date(),
  readAt: z.date().optional(),
  expiresAt: z.date().optional(),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().max(50).optional(),
})

export const CreateNotificationCommandSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
  type: NotificationTypeSchema,
  title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
  message: z.string().min(1, 'Message is required').max(1000, 'Message too long'),
  metadata: NotificationMetadataSchema.optional(),
  priority: NotificationPrioritySchema.optional(),
  actionUrl: z.string().url().optional(),
  actionLabel: z.string().max(50).optional(),
  expiresAt: z.date().optional(),
})

export const NotificationPreferencesSchema = z.object({
  emailEnabled: z.boolean(),
  pushEnabled: z.boolean(),
  types: z.record(z.nativeEnum(NotificationType), z.boolean()).optional(),
  quietHours: z.object({
    start: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    end: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
    timezone: z.string(),
  }).optional(),
})

// Domain utility functions
export const createNotification = (command: CreateNotificationCommand): Notification => {
  const validatedCommand = CreateNotificationCommandSchema.parse(command)
  
  return {
    id: generateNotificationId(),
    userId: validatedCommand.userId,
    type: validatedCommand.type,
    title: validatedCommand.title,
    message: validatedCommand.message,
    metadata: validatedCommand.metadata || {},
    status: NotificationStatus.UNREAD,
    priority: validatedCommand.priority || NotificationPriority.MEDIUM,
    createdAt: new Date(),
    actionUrl: validatedCommand.actionUrl,
    actionLabel: validatedCommand.actionLabel,
    expiresAt: validatedCommand.expiresAt,
  }
}

export const markAsRead = (notification: Notification): Notification => {
  if (notification.status === NotificationStatus.READ) {
    return notification
  }
  
  return {
    ...notification,
    status: NotificationStatus.READ,
    readAt: new Date(),
  }
}

export const isExpired = (notification: Notification): boolean => {
  if (!notification.expiresAt) return false
  return new Date() > notification.expiresAt
}

export const canBeRead = (notification: Notification): boolean => {
  return !isExpired(notification) && notification.status === NotificationStatus.UNREAD
}

export const getNotificationIcon = (type: NotificationType): string => {
  const iconMap: Record<NotificationType, string> = {
    [NotificationType.PROJECT_UPDATE]: 'folder',
    [NotificationType.TEAM_INVITATION]: 'users',
    [NotificationType.FEEDBACK_RECEIVED]: 'message-circle',
    [NotificationType.SYSTEM_ANNOUNCEMENT]: 'megaphone',
    [NotificationType.SECURITY_ALERT]: 'shield-alert',
    [NotificationType.DEADLINE_REMINDER]: 'clock',
    [NotificationType.COLLABORATION_REQUEST]: 'handshake',
    [NotificationType.STORY_APPROVED]: 'check-circle',
    [NotificationType.STORY_REJECTED]: 'x-circle',
    [NotificationType.MENTION]: 'at-sign',
  }
  
  return iconMap[type] || 'bell'
}

export const getPriorityColor = (priority: NotificationPriority): string => {
  const colorMap: Record<NotificationPriority, string> = {
    [NotificationPriority.LOW]: 'text-gray-500',
    [NotificationPriority.MEDIUM]: 'text-blue-500',
    [NotificationPriority.HIGH]: 'text-orange-500',
    [NotificationPriority.URGENT]: 'text-red-500',
  }
  
  return colorMap[priority] || 'text-gray-500'
}

export const formatNotificationTime = (date: Date): string => {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  
  return date.toLocaleDateString()
}

// ID generation utility (temporary - should be replaced with proper ID generation)
const generateNotificationId = (): string => {
  return `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Type guards
export const isNotification = (obj: unknown): obj is Notification => {
  try {
    NotificationSchema.parse(obj)
    return true
  } catch {
    return false
  }
}

export const isCreateNotificationCommand = (obj: unknown): obj is CreateNotificationCommand => {
  try {
    CreateNotificationCommandSchema.parse(obj)
    return true
  } catch {
    return false
  }
}

export const isNotificationPreferences = (obj: unknown): obj is NotificationPreferences => {
  try {
    NotificationPreferencesSchema.parse(obj)
    return true
  } catch {
    return false
  }
}