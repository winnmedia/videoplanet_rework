import React, { useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { Notification, formatNotificationTime, getNotificationIcon, getPriorityColor } from '../../../../entities/notification'

export interface NotificationDrawerProps {
  isOpen: boolean
  notifications: Notification[]
  onClose: () => void
  onRefresh?: () => void
  onNotificationClick?: (notification: Notification) => void
  isRefreshing?: boolean
  maxNotifications?: number
  className?: string
}

// Icon components
const CloseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
)

const RefreshIcon: React.FC<{ className?: string; isSpinning?: boolean }> = ({ className, isSpinning }) => (
  <svg 
    className={clsx(className, isSpinning && 'animate-spin')} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
    />
  </svg>
)

// Individual notification item component
const NotificationItem: React.FC<{
  notification: Notification
  onClick?: (notification: Notification) => void
}> = ({ notification, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick(notification)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  const isUnread = notification.status === 'unread'
  const priorityColor = getPriorityColor(notification.priority)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={clsx(
        'p-4 border-b border-gray-200 cursor-pointer transition-colors',
        'hover:bg-gray-50 focus:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary',
        {
          'bg-blue-50 border-l-4 border-l-blue-500': isUnread,
          'bg-white': !isUnread,
        }
      )}
      {...(process.env.NODE_ENV === 'test' && { 'data-testid': 'notification-item' })}
    >
      <div className="flex items-start space-x-3">
        {/* Priority indicator & icon */}
        <div className="flex-shrink-0">
          <div className={clsx('w-2 h-2 rounded-full mt-2', priorityColor.replace('text-', 'bg-'))} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Title and time */}
          <div className="flex items-start justify-between">
            <h3 className={clsx(
              'text-sm font-medium text-gray-900 truncate',
              { 'font-semibold': isUnread }
            )}>
              {notification.title}
            </h3>
            <span className="ml-2 text-xs text-gray-500 flex-shrink-0">
              {formatNotificationTime(notification.createdAt)}
            </span>
          </div>

          {/* Message */}
          <p className="mt-1 text-sm text-gray-600 line-clamp-2">
            {notification.message}
          </p>

          {/* Action label */}
          {notification.actionUrl && notification.actionLabel && (
            <div className="mt-2">
              <span className="text-xs text-primary font-medium">
                {notification.actionLabel} →
              </span>
            </div>
          )}

          {/* Metadata */}
          {notification.metadata.actorName && (
            <div className="mt-1 text-xs text-gray-500">
              From {notification.metadata.actorName}
            </div>
          )}
        </div>

        {/* Unread indicator */}
        {isUnread && (
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-blue-500 rounded-full" />
          </div>
        )}
      </div>
    </div>
  )
}

export const NotificationDrawer = React.forwardRef<HTMLDivElement, NotificationDrawerProps>(
  ({ 
    isOpen, 
    notifications, 
    onClose, 
    onRefresh, 
    onNotificationClick, 
    isRefreshing = false,
    maxNotifications = 10,
    className 
  }, ref) => {
    const drawerRef = useRef<HTMLDivElement>(null)
    const titleId = React.useId()

    // Focus trap and escape key handling
    useEffect(() => {
      if (!isOpen) return

      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault()
          onClose()
        }
      }

      // Trap focus within drawer
      const handleFocusTrap = (event: KeyboardEvent) => {
        if (event.key !== 'Tab') return

        const drawer = drawerRef.current
        if (!drawer) return

        const focusableElements = drawer.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const firstElement = focusableElements[0] as HTMLElement
        const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

        if (event.shiftKey) {
          if (document.activeElement === firstElement) {
            event.preventDefault()
            lastElement.focus()
          }
        } else {
          if (document.activeElement === lastElement) {
            event.preventDefault()
            firstElement.focus()
          }
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      document.addEventListener('keydown', handleFocusTrap)

      // Focus first element when opened
      const firstFocusable = drawerRef.current?.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      if (firstFocusable) {
        firstFocusable.focus()
      }

      return () => {
        document.removeEventListener('keydown', handleKeyDown)
        document.removeEventListener('keydown', handleFocusTrap)
      }
    }, [isOpen, onClose])

    // Don't render if not open
    if (!isOpen) {
      return null
    }

    // Limit notifications shown
    const displayedNotifications = notifications.slice(0, maxNotifications)
    const hasMoreNotifications = notifications.length > maxNotifications

    const handleRefresh = () => {
      if (!isRefreshing && onRefresh) {
        onRefresh()
      }
    }

    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={onClose}
        />

        {/* Drawer */}
        <div
          ref={drawerRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={clsx(
            'fixed top-0 right-0 h-full w-80 md:w-96',
            'bg-white shadow-xl z-50',
            'transform transition-transform duration-300 ease-in-out',
            'overflow-hidden flex flex-col',
            className
          )}
          {...(process.env.NODE_ENV === 'test' && { 'data-testid': 'notification-drawer' })}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              Notifications
            </h2>
            <div className="flex items-center space-x-2">
              {/* Refresh button */}
              {onRefresh && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className={clsx(
                    'p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors',
                    'focus:outline-none focus:ring-2 focus:ring-primary',
                    {
                      'opacity-50 cursor-not-allowed': isRefreshing,
                    }
                  )}
                  aria-label="Refresh notifications"
                  {...(process.env.NODE_ENV === 'test' && { 'data-testid': 'refresh-notifications-button' })}
                >
                  <RefreshIcon className="w-5 h-5" isSpinning={isRefreshing} />
                </button>
              )}

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="p-2 text-gray-500 hover:text-gray-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary"
                aria-label="Close notifications"
              >
                <CloseIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Refreshing indicator */}
          {isRefreshing && (
            <div
              className="p-3 bg-blue-50 border-b border-blue-200 text-center"
              aria-live="polite"
              {...(process.env.NODE_ENV === 'test' && { 'data-testid': 'notifications-refreshing' })}
            >
              <span className="text-sm text-blue-700">Refreshing notifications...</span>
            </div>
          )}

          {/* Notifications list */}
          <div className="flex-1 overflow-y-auto">
            {displayedNotifications.length === 0 ? (
              // Empty state
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                  <p className="text-gray-500">You're all caught up!</p>
                </div>
              </div>
            ) : (
              <>
                {displayedNotifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onClick={onNotificationClick}
                  />
                ))}

                {/* More notifications indicator */}
                {hasMoreNotifications && (
                  <div className="p-4 text-center border-t border-gray-200">
                    <p className="text-sm text-gray-500">
                      +{notifications.length - maxNotifications} more notifications
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </>
    )
  }
)

NotificationDrawer.displayName = 'NotificationDrawer'