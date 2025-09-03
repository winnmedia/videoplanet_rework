// Notification Feature Types
import { Notification, NotificationStatus, NotificationPriority } from '../../../entities/notification'

// UI state for notification feature
export interface NotificationFeatureState {
  // Drawer state
  isDrawerOpen: boolean
  isRefreshing: boolean
  lastRefresh?: Date
  
  // Filter state  
  activeFilters: NotificationFilters
  
  // UI preferences
  preferences: NotificationUIPreferences
  
  // Real-time connection state
  isConnected: boolean
  connectionError?: string
}

export interface NotificationFilters {
  status: NotificationStatus[]
  priority: NotificationPriority[]
  types: string[]
}

export interface NotificationUIPreferences {
  autoMarkAsRead: boolean
  soundEnabled: boolean
  desktopNotifications: boolean
  maxNotificationsShown: number
  groupByDate: boolean
}

// Actions
export interface ToggleDrawerAction {
  type: 'notifications/toggleDrawer'
}

export interface SetDrawerOpenAction {
  type: 'notifications/setDrawerOpen'
  payload: boolean
}

export interface SetRefreshingAction {
  type: 'notifications/setRefreshing'
  payload: boolean
}

export interface UpdateLastRefreshAction {
  type: 'notifications/updateLastRefresh'
  payload: Date
}

export interface UpdateFiltersAction {
  type: 'notifications/updateFilters'
  payload: Partial<NotificationFilters>
}

export interface UpdatePreferencesAction {
  type: 'notifications/updatePreferences'
  payload: Partial<NotificationUIPreferences>
}

export interface SetConnectionStatusAction {
  type: 'notifications/setConnectionStatus'
  payload: { isConnected: boolean; error?: string }
}

export interface AddOptimisticNotificationAction {
  type: 'notifications/addOptimistic'
  payload: Notification
}

export interface RemoveOptimisticNotificationAction {
  type: 'notifications/removeOptimistic'
  payload: string // notification id
}

export type NotificationFeatureAction =
  | ToggleDrawerAction
  | SetDrawerOpenAction
  | SetRefreshingAction
  | UpdateLastRefreshAction
  | UpdateFiltersAction
  | UpdatePreferencesAction
  | SetConnectionStatusAction
  | AddOptimisticNotificationAction
  | RemoveOptimisticNotificationAction

// Selectors return types
export interface NotificationSelectorState {
  notifications: Notification[]
  filteredNotifications: Notification[]
  unreadCount: number
  hasUnread: boolean
  isLoading: boolean
  error?: string
}

// Hook return types
export interface UseNotificationDrawer {
  isOpen: boolean
  toggle: () => void
  open: () => void
  close: () => void
  isRefreshing: boolean
  refresh: () => void
}

export interface UseNotificationActions {
  markAsRead: (notificationId: string) => void
  markAllAsRead: () => void
  archive: (notificationId: string) => void
  handleNotificationClick: (notification: Notification) => void
}

export interface UseNotificationFilters {
  filters: NotificationFilters
  updateFilters: (filters: Partial<NotificationFilters>) => void
  clearFilters: () => void
  activeFilterCount: number
}

// WebSocket message types for real-time updates
export interface NotificationWebSocketMessage {
  type: 'notification_created' | 'notification_read' | 'notification_deleted' | 'bulk_read'
  payload: {
    userId: string
    notification?: Notification
    notificationIds?: string[]
    unreadCount: number
  }
}