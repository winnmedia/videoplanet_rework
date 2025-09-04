export interface Notification {
  id: string
  type: 'invitation' | 'comment' | 'reaction' | 'conflict'
  title: string
  message: string
  timestamp: Date
  isRead: boolean
  actionUrl?: string
  avatarUrl?: string
  metadata?: Record<string, unknown>
}

export interface NotificationCenterProps {
  isOpen: boolean
  notifications: Notification[]
  unreadCount: number
  isLoading?: boolean
  onClose: () => void
  onNotificationClick: (notification: Notification) => void
  onRefresh: () => void
  onMarkAsRead: (notificationId: string) => void
  className?: string
  'data-testid'?: string
}