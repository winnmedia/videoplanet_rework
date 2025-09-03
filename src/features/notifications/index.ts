// Notifications Feature Public API

// API
export { 
  notificationApi,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useBulkMarkAsReadMutation,
  useArchiveNotificationMutation,
  useMarkAllAsReadMutation,
  useRefreshNotificationsQuery,
  useLazyGetNotificationsQuery,
  useLazyRefreshNotificationsQuery,
  notificationApiReducer,
  notificationApiEndpoints,
} from './api/notificationApi'

// Model
export {
  // Actions
  toggleDrawer,
  setDrawerOpen,
  openDrawer,
  closeDrawer,
  setRefreshing,
  startRefresh,
  finishRefresh,
  updateLastRefresh,
  updateFilters,
  resetFilters,
  setStatusFilter,
  setPriorityFilter,
  setTypeFilter,
  updatePreferences,
  resetPreferences,
  toggleAutoMarkAsRead,
  toggleSoundEnabled,
  toggleDesktopNotifications,
  toggleGroupByDate,
  setMaxNotificationsShown,
  setConnectionStatus,
  setConnected,
  setDisconnected,
  clearConnectionError,
  
  // Reducer
  notificationReducer,
  
  // Selectors
  selectNotificationDrawer,
  selectNotificationFilters,
  selectNotificationPreferences,
  selectNotificationConnection,
  selectIsDrawerOpen,
  selectIsRefreshing,
  selectActiveFilterCount,
} from './model/notificationSlice'

// Types
export type {
  NotificationFeatureState,
  NotificationFilters,
  NotificationUIPreferences,
  UseNotificationDrawer,
  UseNotificationActions,
  UseNotificationFilters,
  NotificationWebSocketMessage,
} from './model/types'

// UI Components
export { NotificationBell } from './ui/NotificationBell'
export type { NotificationBellProps } from './ui/NotificationBell'

export { NotificationDrawer } from './ui/NotificationDrawer'
export type { NotificationDrawerProps } from './ui/NotificationDrawer'

export { NotificationCenter } from './ui/NotificationCenter'
export type { NotificationCenterProps } from './ui/NotificationCenter'