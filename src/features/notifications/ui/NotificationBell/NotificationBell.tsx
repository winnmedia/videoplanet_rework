import React from 'react'
import { clsx } from 'clsx'
import { useRealtimeNotificationCount } from '../../../../shared/lib/realtime-notification-pipeline'

export interface NotificationBellProps {
  userId?: string
  onClick?: () => void
  isLoading?: boolean
  className?: string
  // 테스트용 prop (실시간 카운트 비활성화)
  disableRealtime?: boolean
  // 정적 카운트 (테스트용)
  staticCount?: number
}

// Bell SVG icon
const BellIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className} 
    fill="none" 
    stroke="currentColor" 
    viewBox="0 0 24 24" 
    xmlns="http://www.w3.org/2000/svg"
  >
    <path 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      strokeWidth={2} 
      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" 
    />
  </svg>
)

// Loading spinner for bell
const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={clsx('animate-spin', className)} 
    fill="none" 
    viewBox="0 0 24 24"
  >
    <circle 
      className="opacity-25" 
      cx="12" 
      cy="12" 
      r="10" 
      stroke="currentColor" 
      strokeWidth="4"
    />
    <path 
      className="opacity-75" 
      fill="currentColor" 
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
)

export const NotificationBell = React.forwardRef<HTMLButtonElement, NotificationBellProps>(
  ({ userId, onClick, isLoading = false, className, disableRealtime = false, staticCount }, ref) => {
    // 실시간 알림 카운트 훅 사용 (테스트가 아닌 경우)
    const realtimeState = useRealtimeNotificationCount(
      !disableRealtime && userId ? userId : ''
    )
    
    // 카운트 결정: 정적 카운트 > 실시간 카운트 > 기본값 0
    const unreadCount = staticCount !== undefined 
      ? staticCount 
      : (!disableRealtime && userId ? realtimeState.unreadCount : 0)
    
    // Determine if we should show the badge
    const shouldShowBadge = unreadCount > 0
    
    // Format count for display (max 9+)
    const displayCount = unreadCount > 9 ? '9+' : unreadCount.toString()
    
    // Create accessible label
    const ariaLabel = unreadCount > 0 
      ? `${unreadCount} unread notifications`
      : 'Open notifications'

    // Handle click and keyboard events
    const handleClick = () => {
      if (!isLoading && onClick) {
        onClick()
      }
    }

    const handleKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        handleClick()
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        role="button"
        tabIndex={0}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        disabled={isLoading}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={clsx(
          // Base styles
          'relative p-2 rounded-md transition-colors',
          'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
          
          // Color states
          {
            'text-gray-600 hover:text-gray-800': !isLoading && (!userId || realtimeState.isConnected),
            'text-gray-400': !isLoading && userId && !realtimeState.isConnected, // 연결 끊어진 상태
            'opacity-50 cursor-not-allowed': isLoading,
          },
          
          className
        )}
        {...(process.env.NODE_ENV === 'test' && { 
          'data-testid': 'notification-bell',
          'data-unread-count': unreadCount,
          'data-connected': !userId || realtimeState.isConnected,
          'data-error': realtimeState.error?.message || null
        })}
      >
        {/* Bell Icon or Loading Spinner */}
        {isLoading ? (
          <LoadingSpinner className="h-6 w-6" />
        ) : (
          <BellIcon className="h-6 w-6" />
        )}

        {/* Unread Count Badge */}
        {shouldShowBadge && !isLoading && (
          <span
            className={clsx(
              'absolute -top-1 -right-1',
              'h-5 w-5 min-w-0',
              'bg-red-500 text-white',
              'text-xs font-bold',
              'rounded-full',
              'flex items-center justify-center',
              'border-2 border-white'
            )}
            aria-hidden="true"
            {...(process.env.NODE_ENV === 'test' && { 
              'data-testid': 'notification-count-badge',
              'data-count': unreadCount,
              'data-display-count': displayCount
            })}
          >
            {displayCount}
          </span>
        )}
      </button>
    )
  }
)

NotificationBell.displayName = 'NotificationBell'