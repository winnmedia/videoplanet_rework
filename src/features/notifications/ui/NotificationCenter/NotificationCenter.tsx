import React, { useCallback, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import {
  NotificationBell,
  NotificationDrawer,
  toggleDrawer,
  closeDrawer,
  startRefresh,
  finishRefresh,
  selectIsDrawerOpen,
  selectIsRefreshing,
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useLazyRefreshNotificationsQuery,
  useMarkAsReadMutation,
} from '../../index'
import { Notification } from '../../../../entities/notification'

export interface NotificationCenterProps {
  userId: string
  className?: string
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  userId,
  className,
}) => {
  const dispatch = useDispatch()
  const router = useRouter()
  
  // Redux state
  const isDrawerOpen = useSelector(selectIsDrawerOpen)
  const isRefreshing = useSelector(selectIsRefreshing)

  // API queries and mutations
  const { 
    data: notificationsData,
    isLoading: isLoadingNotifications,
    error: notificationsError
  } = useGetNotificationsQuery({
    userId,
    limit: 10,
  })

  const { 
    data: unreadCount = 0,
    isLoading: isLoadingUnreadCount
  } = useGetUnreadCountQuery(userId)

  const [triggerRefresh] = useLazyRefreshNotificationsQuery()
  const [markAsRead] = useMarkAsReadMutation()

  // Handlers
  const handleToggleDrawer = useCallback(() => {
    dispatch(toggleDrawer())
  }, [dispatch])

  const handleCloseDrawer = useCallback(() => {
    dispatch(closeDrawer())
  }, [dispatch])

  const handleRefresh = useCallback(async () => {
    try {
      dispatch(startRefresh())
      await triggerRefresh({
        userId,
        lastFetch: new Date().toISOString(),
      }).unwrap()
    } catch (error) {
      console.error('Failed to refresh notifications:', error)
    } finally {
      dispatch(finishRefresh())
    }
  }, [dispatch, triggerRefresh, userId])

  const handleNotificationClick = useCallback(async (notification: Notification) => {
    try {
      // Mark as read if unread
      if (notification.status === 'unread') {
        await markAsRead({
          notificationId: notification.id,
          userId,
        }).unwrap()
      }

      // Close drawer
      dispatch(closeDrawer())

      // Navigate if has action URL
      if (notification.actionUrl) {
        router.push(notification.actionUrl)
      }
    } catch (error) {
      console.error('Failed to handle notification click:', error)
      
      // Still try to navigate even if mark as read fails
      if (notification.actionUrl) {
        router.push(notification.actionUrl)
      }
    }
  }, [markAsRead, userId, dispatch, router])

  // Auto-refresh on mount
  useEffect(() => {
    if (userId) {
      handleRefresh()
    }
  }, [userId, handleRefresh])

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Alt+N to toggle notifications
      if (event.altKey && event.key === 'n') {
        event.preventDefault()
        handleToggleDrawer()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleToggleDrawer])

  const notifications = notificationsData?.notifications || []
  const isLoading = isLoadingNotifications || isLoadingUnreadCount

  return (
    <div className={className}>
      {/* Notification Bell */}
      <NotificationBell
        unreadCount={unreadCount}
        onClick={handleToggleDrawer}
        isLoading={isLoading}
      />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isDrawerOpen}
        notifications={notifications}
        onClose={handleCloseDrawer}
        onRefresh={handleRefresh}
        onNotificationClick={handleNotificationClick}
        isRefreshing={isRefreshing}
        maxNotifications={10}
      />
    </div>
  )
}

export default NotificationCenter