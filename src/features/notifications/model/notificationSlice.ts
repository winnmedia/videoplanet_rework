import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import {
  NotificationFeatureState,
  NotificationFilters,
  NotificationUIPreferences,
} from './types'
import { NotificationStatus, NotificationPriority } from '../../../entities/notification'

// Default state
const defaultFilters: NotificationFilters = {
  status: [NotificationStatus.UNREAD, NotificationStatus.READ],
  priority: [NotificationPriority.LOW, NotificationPriority.MEDIUM, NotificationPriority.HIGH, NotificationPriority.URGENT],
  types: [],
}

const defaultPreferences: NotificationUIPreferences = {
  autoMarkAsRead: false,
  soundEnabled: true,
  desktopNotifications: true,
  maxNotificationsShown: 10,
  groupByDate: true,
}

const initialState: NotificationFeatureState = {
  isDrawerOpen: false,
  isRefreshing: false,
  lastRefresh: undefined,
  activeFilters: defaultFilters,
  preferences: defaultPreferences,
  isConnected: false,
  connectionError: undefined,
}

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // Drawer actions
    toggleDrawer: (state) => {
      state.isDrawerOpen = !state.isDrawerOpen
    },

    setDrawerOpen: (state, action: PayloadAction<boolean>) => {
      state.isDrawerOpen = action.payload
    },

    openDrawer: (state) => {
      state.isDrawerOpen = true
    },

    closeDrawer: (state) => {
      state.isDrawerOpen = false
    },

    // Refresh actions
    setRefreshing: (state, action: PayloadAction<boolean>) => {
      state.isRefreshing = action.payload
    },

    startRefresh: (state) => {
      state.isRefreshing = true
    },

    finishRefresh: (state) => {
      state.isRefreshing = false
      state.lastRefresh = new Date()
    },

    updateLastRefresh: (state, action: PayloadAction<Date>) => {
      state.lastRefresh = action.payload
    },

    // Filter actions
    updateFilters: (state, action: PayloadAction<Partial<NotificationFilters>>) => {
      state.activeFilters = {
        ...state.activeFilters,
        ...action.payload,
      }
    },

    resetFilters: (state) => {
      state.activeFilters = defaultFilters
    },

    setStatusFilter: (state, action: PayloadAction<NotificationStatus[]>) => {
      state.activeFilters.status = action.payload
    },

    setPriorityFilter: (state, action: PayloadAction<NotificationPriority[]>) => {
      state.activeFilters.priority = action.payload
    },

    setTypeFilter: (state, action: PayloadAction<string[]>) => {
      state.activeFilters.types = action.payload
    },

    // Preferences actions
    updatePreferences: (state, action: PayloadAction<Partial<NotificationUIPreferences>>) => {
      state.preferences = {
        ...state.preferences,
        ...action.payload,
      }
    },

    resetPreferences: (state) => {
      state.preferences = defaultPreferences
    },

    toggleAutoMarkAsRead: (state) => {
      state.preferences.autoMarkAsRead = !state.preferences.autoMarkAsRead
    },

    toggleSoundEnabled: (state) => {
      state.preferences.soundEnabled = !state.preferences.soundEnabled
    },

    toggleDesktopNotifications: (state) => {
      state.preferences.desktopNotifications = !state.preferences.desktopNotifications
    },

    toggleGroupByDate: (state) => {
      state.preferences.groupByDate = !state.preferences.groupByDate
    },

    setMaxNotificationsShown: (state, action: PayloadAction<number>) => {
      state.preferences.maxNotificationsShown = Math.max(1, Math.min(50, action.payload))
    },

    // Connection actions
    setConnectionStatus: (state, action: PayloadAction<{ isConnected: boolean; error?: string }>) => {
      state.isConnected = action.payload.isConnected
      state.connectionError = action.payload.error
    },

    setConnected: (state) => {
      state.isConnected = true
      state.connectionError = undefined
    },

    setDisconnected: (state, action: PayloadAction<string | undefined>) => {
      state.isConnected = false
      state.connectionError = action.payload
    },

    clearConnectionError: (state) => {
      state.connectionError = undefined
    },
  },
})

// Export actions
export const {
  // Drawer actions
  toggleDrawer,
  setDrawerOpen,
  openDrawer,
  closeDrawer,
  
  // Refresh actions
  setRefreshing,
  startRefresh,
  finishRefresh,
  updateLastRefresh,
  
  // Filter actions
  updateFilters,
  resetFilters,
  setStatusFilter,
  setPriorityFilter,
  setTypeFilter,
  
  // Preferences actions
  updatePreferences,
  resetPreferences,
  toggleAutoMarkAsRead,
  toggleSoundEnabled,
  toggleDesktopNotifications,
  toggleGroupByDate,
  setMaxNotificationsShown,
  
  // Connection actions
  setConnectionStatus,
  setConnected,
  setDisconnected,
  clearConnectionError,
} = notificationSlice.actions

// Export reducer
export const notificationReducer = notificationSlice.reducer

// Selectors
export const selectNotificationDrawer = (state: { notifications: NotificationFeatureState }) => ({
  isOpen: state.notifications.isDrawerOpen,
  isRefreshing: state.notifications.isRefreshing,
  lastRefresh: state.notifications.lastRefresh,
})

export const selectNotificationFilters = (state: { notifications: NotificationFeatureState }) => 
  state.notifications.activeFilters

export const selectNotificationPreferences = (state: { notifications: NotificationFeatureState }) => 
  state.notifications.preferences

export const selectNotificationConnection = (state: { notifications: NotificationFeatureState }) => ({
  isConnected: state.notifications.isConnected,
  error: state.notifications.connectionError,
})

export const selectIsDrawerOpen = (state: { notifications: NotificationFeatureState }) => 
  state.notifications.isDrawerOpen

export const selectIsRefreshing = (state: { notifications: NotificationFeatureState }) => 
  state.notifications.isRefreshing

export const selectActiveFilterCount = (state: { notifications: NotificationFeatureState }) => {
  const { status, priority, types } = state.notifications.activeFilters
  let count = 0
  
  // Count non-default filters
  if (status.length !== defaultFilters.status.length) count++
  if (priority.length !== defaultFilters.priority.length) count++
  if (types.length > 0) count++
  
  return count
}

export default notificationSlice.reducer