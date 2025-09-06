import { configureStore } from '@reduxjs/toolkit'

import { notificationSlice, NotificationState } from '../notificationSlice'
import { NotificationType } from '../types'

type TestStore = ReturnType<typeof createTestStore>

const createTestStore = () => {
  return configureStore({
    reducer: {
      notifications: notificationSlice.reducer,
    },
  })
}

describe('notificationSlice', () => {
  let store: TestStore

  beforeEach(() => {
    store = createTestStore()
  })

  describe('초기 상태', () => {
    it('빈 알림 목록으로 시작해야 함', () => {
      const state = store.getState().notifications
      
      expect(state.items).toEqual([])
      expect(state.unreadCount).toBe(0)
      expect(state.isLoading).toBe(false)
      expect(state.lastFetched).toBeNull()
      expect(state.connectionStatus).toBe('disconnected')
    })
  })

  describe('알림 수신', () => {
    it('새 알림을 목록 맨 앞에 추가해야 함', () => {
      const newNotification = {
        id: 'notif-1',
        type: 'invitation' as NotificationType,
        title: '프로젝트 초대',
        message: 'VRidge 홍보 영상 프로젝트에 초대되었습니다',
        timestamp: new Date().toISOString(),
        isRead: false,
        actionUrl: '/projects/123'
      }

      store.dispatch(notificationSlice.actions.addNotification(newNotification))

      const state = store.getState().notifications
      expect(state.items).toHaveLength(1)
      expect(state.items[0]).toEqual(newNotification)
      expect(state.unreadCount).toBe(1)
    })

    it('중복된 알림 ID는 추가하지 않아야 함', () => {
      const notification = {
        id: 'notif-1',
        type: 'invitation' as NotificationType,
        title: '프로젝트 초대',
        message: 'VRidge 홍보 영상 프로젝트에 초대되었습니다',
        timestamp: new Date().toISOString(),
        isRead: false,
        actionUrl: '/projects/123'
      }

      store.dispatch(notificationSlice.actions.addNotification(notification))
      store.dispatch(notificationSlice.actions.addNotification(notification))

      const state = store.getState().notifications
      expect(state.items).toHaveLength(1)
    })
  })

  describe('읽음 상태 관리', () => {
    beforeEach(() => {
      const notifications = [
        {
          id: 'notif-1',
          type: 'invitation' as NotificationType,
          title: '프로젝트 초대',
          message: '프로젝트에 초대되었습니다',
          timestamp: new Date().toISOString(),
          isRead: false,
          actionUrl: '/projects/123'
        },
        {
          id: 'notif-2',
          type: 'comment' as NotificationType,
          title: '새 댓글',
          message: '새 댓글이 달렸습니다',
          timestamp: new Date().toISOString(),
          isRead: false,
          actionUrl: '/feedback/456'
        }
      ]

      store.dispatch(notificationSlice.actions.setNotifications(notifications))
    })

    it('특정 알림을 읽음으로 표시해야 함', () => {
      store.dispatch(notificationSlice.actions.markAsRead('notif-1'))

      const state = store.getState().notifications
      const notification = state.items.find(n => n.id === 'notif-1')
      
      expect(notification?.isRead).toBe(true)
      expect(state.unreadCount).toBe(1)
    })

    it('모든 알림을 읽음으로 표시해야 함', () => {
      store.dispatch(notificationSlice.actions.markAllAsRead())

      const state = store.getState().notifications
      
      expect(state.items.every(n => n.isRead)).toBe(true)
      expect(state.unreadCount).toBe(0)
    })
  })

  describe('WebSocket 연결 상태', () => {
    it('연결 상태를 업데이트해야 함', () => {
      store.dispatch(notificationSlice.actions.setConnectionStatus('connected'))

      const state = store.getState().notifications
      expect(state.connectionStatus).toBe('connected')
    })

    it('재연결 시도 중 상태를 설정해야 함', () => {
      store.dispatch(notificationSlice.actions.setConnectionStatus('reconnecting'))

      const state = store.getState().notifications
      expect(state.connectionStatus).toBe('reconnecting')
    })
  })

  describe('로딩 상태', () => {
    it('로딩 상태를 설정해야 함', () => {
      store.dispatch(notificationSlice.actions.setLoading(true))

      const state = store.getState().notifications
      expect(state.isLoading).toBe(true)
    })
  })

  describe('알림 제거', () => {
    beforeEach(() => {
      const notifications = [
        {
          id: 'notif-1',
          type: 'invitation' as NotificationType,
          title: '프로젝트 초대',
          message: '프로젝트에 초대되었습니다',
          timestamp: new Date().toISOString(),
          isRead: false,
          actionUrl: '/projects/123'
        },
        {
          id: 'notif-2',
          type: 'comment' as NotificationType,
          title: '새 댓글',
          message: '새 댓글이 달렸습니다',
          timestamp: new Date().toISOString(),
          isRead: true,
          actionUrl: '/feedback/456'
        }
      ]

      store.dispatch(notificationSlice.actions.setNotifications(notifications))
    })

    it('특정 알림을 제거해야 함', () => {
      store.dispatch(notificationSlice.actions.removeNotification('notif-1'))

      const state = store.getState().notifications
      expect(state.items).toHaveLength(1)
      expect(state.items.find(n => n.id === 'notif-1')).toBeUndefined()
      expect(state.unreadCount).toBe(0) // 읽지 않은 알림이 제거되었으므로
    })
  })

  describe('선택자 (Selectors)', () => {
    beforeEach(() => {
      const notifications = [
        {
          id: 'notif-1',
          type: 'invitation' as NotificationType,
          title: '프로젝트 초대',
          message: '프로젝트에 초대되었습니다',
          timestamp: new Date(Date.now() - 1000).toISOString(),
          isRead: false,
          actionUrl: '/projects/123'
        },
        {
          id: 'notif-2',
          type: 'comment' as NotificationType,
          title: '새 댓글',
          message: '새 댓글이 달렸습니다',
          timestamp: new Date().toISOString(),
          isRead: true,
          actionUrl: '/feedback/456'
        }
      ]

      store.dispatch(notificationSlice.actions.setNotifications(notifications))
    })

    it('읽지 않은 알림만 필터링해야 함', () => {
      const state = store.getState()
      const unreadNotifications = notificationSlice.selectors.selectUnreadNotifications(state)
      
      expect(unreadNotifications).toHaveLength(1)
      expect(unreadNotifications[0].id).toBe('notif-1')
    })

    it('타입별로 알림을 필터링해야 함', () => {
      const state = store.getState()
      const invitationNotifications = notificationSlice.selectors.selectNotificationsByType(state, 'invitation')
      
      expect(invitationNotifications).toHaveLength(1)
      expect(invitationNotifications[0].type).toBe('invitation')
    })

    it('최신 순으로 정렬된 알림을 반환해야 함', () => {
      const state = store.getState()
      const sortedNotifications = notificationSlice.selectors.selectSortedNotifications(state)
      
      expect(sortedNotifications[0].id).toBe('notif-2') // 더 최신
      expect(sortedNotifications[1].id).toBe('notif-1')
    })
  })
})