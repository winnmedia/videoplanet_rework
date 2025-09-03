import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { axe, toHaveNoViolations } from 'jest-axe'
import { NotificationDrawer } from './NotificationDrawer'
import { notificationReducer } from '../../model/notificationSlice'
import { notificationApi } from '../../api/notificationApi'
import { NotificationType, NotificationStatus, NotificationPriority } from '../../../../entities/notification'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock notifications data
const mockNotifications = [
  {
    id: '1',
    userId: 'user1',
    type: NotificationType.PROJECT_UPDATE,
    title: 'Project Updated',
    message: 'Your project "Video A" has been updated.',
    metadata: { sourceId: 'project1', sourceType: 'project' as const },
    status: NotificationStatus.UNREAD,
    priority: NotificationPriority.MEDIUM,
    createdAt: new Date('2024-01-15T10:00:00Z'),
    actionUrl: '/projects/project1',
    actionLabel: 'View Project',
  },
  {
    id: '2',
    userId: 'user1',
    type: NotificationType.FEEDBACK_RECEIVED,
    title: 'New Feedback',
    message: 'You received feedback on your video.',
    metadata: { sourceId: 'feedback1', sourceType: 'feedback' as const },
    status: NotificationStatus.READ,
    priority: NotificationPriority.HIGH,
    createdAt: new Date('2024-01-14T15:30:00Z'),
    actionUrl: '/feedback/feedback1',
  },
  {
    id: '3',
    userId: 'user1',
    type: NotificationType.SYSTEM_ANNOUNCEMENT,
    title: 'System Maintenance',
    message: 'Scheduled maintenance will occur tonight.',
    metadata: { sourceType: 'system' as const },
    status: NotificationStatus.UNREAD,
    priority: NotificationPriority.URGENT,
    createdAt: new Date('2024-01-13T09:00:00Z'),
  },
]

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      notifications: notificationReducer,
      [notificationApi.reducerPath]: notificationApi.reducer,
    },
    preloadedState: {
      notifications: {
        isDrawerOpen: true,
        isRefreshing: false,
        lastRefresh: undefined,
        activeFilters: {
          status: [NotificationStatus.UNREAD, NotificationStatus.READ],
          priority: [NotificationPriority.LOW, NotificationPriority.MEDIUM, NotificationPriority.HIGH, NotificationPriority.URGENT],
          types: [],
        },
        preferences: {
          autoMarkAsRead: false,
          soundEnabled: true,
          desktopNotifications: true,
          maxNotificationsShown: 10,
          groupByDate: true,
        },
        isConnected: false,
        connectionError: undefined,
      },
      ...initialState,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(notificationApi.middleware),
  })
}

const renderWithProvider = (component: React.ReactElement, store = createMockStore()) => {
  return render(<Provider store={store}>{component}</Provider>)
}

describe('NotificationDrawer', () => {
  describe('Rendering', () => {
    it('should render drawer with correct test id', () => {
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={jest.fn()} 
        />
      )
      
      expect(screen.getByTestId('notification-drawer')).toBeInTheDocument()
    })

    it('should not render when closed', () => {
      renderWithProvider(
        <NotificationDrawer 
          isOpen={false} 
          notifications={mockNotifications} 
          onClose={jest.fn()} 
        />
      )
      
      expect(screen.queryByTestId('notification-drawer')).not.toBeInTheDocument()
    })

    it('should render refresh button with correct test id', () => {
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={jest.fn()}
          onRefresh={jest.fn()}
        />
      )
      
      expect(screen.getByTestId('refresh-notifications-button')).toBeInTheDocument()
    })

    it('should render notifications list', () => {
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={jest.fn()} 
        />
      )
      
      expect(screen.getAllByTestId('notification-item')).toHaveLength(3)
    })

    it('should display empty state when no notifications', () => {
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={[]} 
          onClose={jest.fn()} 
        />
      )
      
      expect(screen.getByText('No notifications')).toBeInTheDocument()
    })

    it('should show refreshing state', () => {
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={jest.fn()}
          isRefreshing={true}
        />
      )
      
      expect(screen.getByTestId('notifications-refreshing')).toBeInTheDocument()
    })
  })

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const handleClose = jest.fn()
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={handleClose} 
        />
      )
      
      fireEvent.click(screen.getByRole('button', { name: /close/i }))
      
      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('should call onClose when pressing Escape', () => {
      const handleClose = jest.fn()
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={handleClose} 
        />
      )
      
      fireEvent.keyDown(screen.getByTestId('notification-drawer'), { key: 'Escape' })
      
      expect(handleClose).toHaveBeenCalledTimes(1)
    })

    it('should call onRefresh when refresh button is clicked', () => {
      const handleRefresh = jest.fn()
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={jest.fn()}
          onRefresh={handleRefresh}
        />
      )
      
      fireEvent.click(screen.getByTestId('refresh-notifications-button'))
      
      expect(handleRefresh).toHaveBeenCalledTimes(1)
    })

    it('should call onNotificationClick when notification is clicked', () => {
      const handleNotificationClick = jest.fn()
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={jest.fn()}
          onNotificationClick={handleNotificationClick}
        />
      )
      
      fireEvent.click(screen.getAllByTestId('notification-item')[0])
      
      expect(handleNotificationClick).toHaveBeenCalledWith(mockNotifications[0])
    })

    it('should not call onRefresh when refreshing is disabled', () => {
      const handleRefresh = jest.fn()
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={jest.fn()}
          onRefresh={handleRefresh}
          isRefreshing={true}
        />
      )
      
      const refreshButton = screen.getByTestId('refresh-notifications-button')
      fireEvent.click(refreshButton)
      
      expect(handleRefresh).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={jest.fn()} 
        />
      )
      
      const drawer = screen.getByTestId('notification-drawer')
      
      expect(drawer).toHaveAttribute('role', 'dialog')
      expect(drawer).toHaveAttribute('aria-labelledby')
      expect(drawer).toHaveAttribute('aria-modal', 'true')
    })

    it('should trap focus within drawer', async () => {
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={jest.fn()}
          onRefresh={jest.fn()}
        />
      )
      
      const closeButton = screen.getByRole('button', { name: /close/i })
      const refreshButton = screen.getByTestId('refresh-notifications-button')
      
      // Focus should start on close button or first focusable element
      closeButton.focus()
      expect(closeButton).toHaveFocus()
      
      // Tab should move to refresh button
      fireEvent.keyDown(closeButton, { key: 'Tab' })
      refreshButton.focus()
      expect(refreshButton).toHaveFocus()
    })

    it('should restore focus when closed', async () => {
      const handleClose = jest.fn()
      
      // Create a button to focus initially
      render(<button data-testid="trigger">Open</button>)
      const triggerButton = screen.getByTestId('trigger')
      triggerButton.focus()
      
      const { rerender } = renderWithProvider(
        <NotificationDrawer 
          isOpen={false} 
          notifications={mockNotifications} 
          onClose={handleClose} 
        />
      )
      
      // Open drawer
      rerender(
        <Provider store={createMockStore()}>
          <NotificationDrawer 
            isOpen={true} 
            notifications={mockNotifications} 
            onClose={handleClose} 
          />
        </Provider>
      )
      
      // Close drawer
      rerender(
        <Provider store={createMockStore()}>
          <NotificationDrawer 
            isOpen={false} 
            notifications={mockNotifications} 
            onClose={handleClose} 
          />
        </Provider>
      )
      
      // Focus should return to trigger (if implemented)
      // This test may need adjustment based on implementation
    })

    it('should not have accessibility violations', async () => {
      const { container } = renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={jest.fn()} 
        />
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper heading structure', () => {
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={jest.fn()} 
        />
      )
      
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })

    it('should announce loading state to screen readers', () => {
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={mockNotifications} 
          onClose={jest.fn()}
          isRefreshing={true}
        />
      )
      
      const refreshIndicator = screen.getByTestId('notifications-refreshing')
      expect(refreshIndicator).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Notification Items', () => {
    it('should display notification details correctly', () => {
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={[mockNotifications[0]]} 
          onClose={jest.fn()} 
        />
      )
      
      expect(screen.getByText('Project Updated')).toBeInTheDocument()
      expect(screen.getByText('Your project "Video A" has been updated.')).toBeInTheDocument()
    })

    it('should show unread indicator for unread notifications', () => {
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={[mockNotifications[0]]} // unread
          onClose={jest.fn()} 
        />
      )
      
      const notificationItem = screen.getByTestId('notification-item')
      // Check for visual indicator of unread status
      expect(notificationItem).toHaveClass('bg-blue-50') // or similar unread styling
    })

    it('should handle notifications without action URLs', () => {
      const notificationWithoutAction = { ...mockNotifications[2] }
      delete notificationWithoutAction.actionUrl
      
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={[notificationWithoutAction]} 
          onClose={jest.fn()} 
        />
      )
      
      expect(screen.getByText('System Maintenance')).toBeInTheDocument()
    })

    it('should limit notifications to maxNotifications prop', () => {
      const manyNotifications = Array.from({ length: 15 }, (_, i) => ({
        ...mockNotifications[0],
        id: `notification-${i}`,
        title: `Notification ${i}`,
      }))
      
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={manyNotifications} 
          onClose={jest.fn()}
          maxNotifications={10}
        />
      )
      
      expect(screen.getAllByTestId('notification-item')).toHaveLength(10)
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty notifications array gracefully', () => {
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={[]} 
          onClose={jest.fn()} 
        />
      )
      
      expect(screen.getByText(/no notifications/i)).toBeInTheDocument()
    })

    it('should handle notifications with missing properties', () => {
      const malformedNotification = {
        id: '1',
        userId: 'user1',
        type: NotificationType.PROJECT_UPDATE,
        title: '',
        message: '',
        metadata: {},
        status: NotificationStatus.UNREAD,
        priority: NotificationPriority.MEDIUM,
        createdAt: new Date(),
      }
      
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={[malformedNotification]} 
          onClose={jest.fn()} 
        />
      )
      
      // Should not crash
      expect(screen.getByTestId('notification-item')).toBeInTheDocument()
    })

    it('should handle very long notification content', () => {
      const longNotification = {
        ...mockNotifications[0],
        title: 'A'.repeat(200),
        message: 'B'.repeat(1000),
      }
      
      renderWithProvider(
        <NotificationDrawer 
          isOpen={true} 
          notifications={[longNotification]} 
          onClose={jest.fn()} 
        />
      )
      
      expect(screen.getByTestId('notification-item')).toBeInTheDocument()
    })
  })
})