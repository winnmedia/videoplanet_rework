import { createSlice, createSelector, PayloadAction } from '@reduxjs/toolkit'

import type { 
  Notification, 
  NotificationState, 
  NotificationType, 
  ConnectionStatus 
} from './types'

// 초기 상태
const initialState: NotificationState = {
  items: [],
  unreadCount: 0,
  isLoading: false,
  lastFetched: null,
  connectionStatus: 'disconnected',
  error: null
}

// 유틸리티 함수: 읽지 않은 알림 수 계산
const calculateUnreadCount = (notifications: Notification[]): number => {
  return notifications.filter(notification => !notification.isRead).length
}

// 유틸리티 함수: 알림 만료 검사 (ISO 문자열 처리)
const filterValidNotifications = (notifications: Notification[]): Notification[] => {
  const now = new Date()
  return notifications.filter(notification => {
    if (!notification.expiresAt) return true
    return new Date(notification.expiresAt) > now
  })
}

export const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    // 새 알림 추가
    addNotification: (state, action: PayloadAction<Notification>) => {
      const newNotification = action.payload
      
      // 중복 체크
      const existingIndex = state.items.findIndex(item => item.id === newNotification.id)
      if (existingIndex !== -1) {
        return // 이미 존재하는 알림은 추가하지 않음
      }
      
      // 새 알림을 맨 앞에 추가
      state.items.unshift(newNotification)
      
      // 유효한 알림만 필터링
      state.items = filterValidNotifications(state.items)
      
      // 읽지 않은 알림 수 업데이트
      state.unreadCount = calculateUnreadCount(state.items)
    },

    // 알림 목록 설정 (초기 로딩용)
    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.items = filterValidNotifications(action.payload)
      state.unreadCount = calculateUnreadCount(state.items)
      state.lastFetched = new Date().toISOString()
    },

    // 특정 알림을 읽음으로 표시
    markAsRead: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload
      const notification = state.items.find(item => item.id === notificationId)
      
      if (notification && !notification.isRead) {
        notification.isRead = true
        state.unreadCount = calculateUnreadCount(state.items)
      }
    },

    // 모든 알림을 읽음으로 표시
    markAllAsRead: (state) => {
      state.items.forEach(notification => {
        notification.isRead = true
      })
      state.unreadCount = 0
    },

    // 특정 알림 제거
    removeNotification: (state, action: PayloadAction<string>) => {
      const notificationId = action.payload
      state.items = state.items.filter(item => item.id !== notificationId)
      state.unreadCount = calculateUnreadCount(state.items)
    },

    // 만료된 알림 제거
    removeExpiredNotifications: (state) => {
      const validNotifications = filterValidNotifications(state.items)
      const removedCount = state.items.length - validNotifications.length
      
      if (removedCount > 0) {
        state.items = validNotifications
        state.unreadCount = calculateUnreadCount(state.items)
      }
    },

    // 연결 상태 업데이트
    setConnectionStatus: (state, action: PayloadAction<ConnectionStatus>) => {
      state.connectionStatus = action.payload
      
      // 연결이 실패했을 때 에러 상태 설정
      if (action.payload === 'failed') {
        state.error = 'WebSocket 연결에 실패했습니다'
      } else {
        state.error = null
      }
    },

    // 로딩 상태 설정
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    // 에러 설정
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload
    },

    // 상태 초기화
    reset: () => initialState
  }
})

// 기본 선택자들
const selectNotificationState = (state: { notifications: NotificationState }) => state.notifications

// 메모화된 선택자들
const selectAllNotifications = createSelector(
  [selectNotificationState],
  (notificationState) => notificationState.items
)

const selectUnreadNotifications = createSelector(
  [selectAllNotifications],
  (notifications) => notifications.filter(notification => !notification.isRead)
)

const selectNotificationsByType = createSelector(
  [selectAllNotifications, (_state: any, type: NotificationType) => type],
  (notifications, type) => notifications.filter(notification => notification.type === type)
)

const selectSortedNotifications = createSelector(
  [selectAllNotifications],
  (notifications) => [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
)

const selectUnreadCount = createSelector(
  [selectNotificationState],
  (notificationState) => notificationState.unreadCount
)

const selectConnectionStatus = createSelector(
  [selectNotificationState],
  (notificationState) => notificationState.connectionStatus
)

const selectIsLoading = createSelector(
  [selectNotificationState],
  (notificationState) => notificationState.isLoading
)

const selectError = createSelector(
  [selectNotificationState],
  (notificationState) => notificationState.error
)

const selectLastFetched = createSelector(
  [selectNotificationState],
  (notificationState) => notificationState.lastFetched
)

// 복합 선택자
const selectRecentNotifications = createSelector(
  [selectSortedNotifications],
  (notifications) => {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    return notifications.filter(notification => new Date(notification.timestamp) > twentyFourHoursAgo)
  }
)

const selectHighPriorityUnreadNotifications = createSelector(
  [selectUnreadNotifications],
  (unreadNotifications) => unreadNotifications.filter(notification => notification.priority === 'high')
)

// 선택자들을 별도로 내보내기 (Redux Toolkit 2.0에서는 selectors가 read-only)

// 액션들과 리듀서 내보내기
export const {
  addNotification,
  setNotifications,
  markAsRead,
  markAllAsRead,
  removeNotification,
  removeExpiredNotifications,
  setConnectionStatus,
  setLoading,
  setError,
  reset
} = notificationSlice.actions

export default notificationSlice.reducer

// 선택자들 내보내기
export {
  selectAllNotifications,
  selectUnreadNotifications,
  selectNotificationsByType,
  selectSortedNotifications,
  selectUnreadCount,
  selectConnectionStatus,
  selectIsLoading,
  selectError,
  selectLastFetched,
  selectRecentNotifications,
  selectHighPriorityUnreadNotifications
}

// 타입 내보내기
export type { NotificationState }