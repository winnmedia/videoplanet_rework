// Notification Entity Public API
export type {
  Notification,
  NotificationType,
  NotificationStatus,
  NotificationPriority,
  NotificationMetadata,
  CreateNotificationCommand,
  MarkNotificationAsReadCommand,
  BulkMarkNotificationsAsReadCommand,
  ArchiveNotificationCommand,
  GetNotificationsQuery,
  NotificationListResponse,
  NotificationCreatedEvent,
  NotificationReadEvent,
  NotificationArchivedEvent,
  NotificationDomainEvent,
  NotificationPreferences,
  NotificationUpdate,
} from './model/types'

export {
  NotificationTypeSchema,
  NotificationStatusSchema,
  NotificationPrioritySchema,
  NotificationMetadataSchema,
  NotificationSchema,
  CreateNotificationCommandSchema,
  NotificationPreferencesSchema,
  createNotification,
  markAsRead,
  isExpired,
  canBeRead,
  getNotificationIcon,
  getPriorityColor,
  formatNotificationTime,
  isNotification,
  isCreateNotificationCommand,
  isNotificationPreferences,
} from './model/notification'

export { NotificationType, NotificationStatus, NotificationPriority } from './model/types'