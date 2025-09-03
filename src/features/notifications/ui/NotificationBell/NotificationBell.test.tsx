import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { axe, toHaveNoViolations } from 'jest-axe'
import { NotificationBell } from './NotificationBell'
import { notificationReducer } from '../../model/notificationSlice'
import { notificationApi } from '../../api/notificationApi'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock store setup
const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      notifications: notificationReducer,
      [notificationApi.reducerPath]: notificationApi.reducer,
    },
    preloadedState: {
      notifications: {
        isDrawerOpen: false,
        isRefreshing: false,
        lastRefresh: undefined,
        activeFilters: {
          status: ['unread', 'read'],
          priority: ['low', 'medium', 'high', 'urgent'],
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

describe('NotificationBell', () => {
  describe('Rendering', () => {
    it('should render notification bell button with correct test id', () => {
      renderWithProvider(<NotificationBell />)
      
      expect(screen.getByTestId('notification-bell')).toBeInTheDocument()
    })

    it('should render bell icon', () => {
      renderWithProvider(<NotificationBell />)
      
      const bellButton = screen.getByTestId('notification-bell')
      expect(bellButton).toHaveAttribute('aria-label', expect.stringContaining('notifications'))
    })

    it('should show unread count badge when there are unread notifications', () => {
      renderWithProvider(<NotificationBell unreadCount={5} />)
      
      const badge = screen.getByTestId('notification-count-badge')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveTextContent('5')
    })

    it('should not show badge when unread count is 0', () => {
      renderWithProvider(<NotificationBell unreadCount={0} />)
      
      expect(screen.queryByTestId('notification-count-badge')).not.toBeInTheDocument()
    })

    it('should show "9+" when unread count is greater than 9', () => {
      renderWithProvider(<NotificationBell unreadCount={15} />)
      
      const badge = screen.getByTestId('notification-count-badge')
      expect(badge).toHaveTextContent('9+')
    })

    it('should apply loading state correctly', () => {
      renderWithProvider(<NotificationBell isLoading={true} />)
      
      const bellButton = screen.getByTestId('notification-bell')
      expect(bellButton).toHaveAttribute('aria-busy', 'true')
      expect(bellButton).toBeDisabled()
    })
  })

  describe('Interactions', () => {
    it('should call onClick handler when bell is clicked', () => {
      const handleClick = jest.fn()
      renderWithProvider(<NotificationBell onClick={handleClick} />)
      
      fireEvent.click(screen.getByTestId('notification-bell'))
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should not call onClick when loading', () => {
      const handleClick = jest.fn()
      renderWithProvider(<NotificationBell onClick={handleClick} isLoading={true} />)
      
      fireEvent.click(screen.getByTestId('notification-bell'))
      
      expect(handleClick).not.toHaveBeenCalled()
    })

    it('should handle keyboard navigation (Enter)', () => {
      const handleClick = jest.fn()
      renderWithProvider(<NotificationBell onClick={handleClick} />)
      
      const bellButton = screen.getByTestId('notification-bell')
      fireEvent.keyDown(bellButton, { key: 'Enter', code: 'Enter' })
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('should handle keyboard navigation (Space)', () => {
      const handleClick = jest.fn()
      renderWithProvider(<NotificationBell onClick={handleClick} />)
      
      const bellButton = screen.getByTestId('notification-bell')
      fireEvent.keyDown(bellButton, { key: ' ', code: 'Space' })
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderWithProvider(<NotificationBell unreadCount={3} />)
      
      const bellButton = screen.getByTestId('notification-bell')
      
      expect(bellButton).toHaveAttribute('role', 'button')
      expect(bellButton).toHaveAttribute('aria-label')
      expect(bellButton).toHaveAttribute('tabIndex', '0')
    })

    it('should update aria-label based on unread count', () => {
      const { rerender } = renderWithProvider(<NotificationBell unreadCount={0} />)
      
      let bellButton = screen.getByTestId('notification-bell')
      expect(bellButton).toHaveAttribute('aria-label', 'Open notifications')
      
      rerender(
        <Provider store={createMockStore()}>
          <NotificationBell unreadCount={3} />
        </Provider>
      )
      
      bellButton = screen.getByTestId('notification-bell')
      expect(bellButton).toHaveAttribute('aria-label', '3 unread notifications')
    })

    it('should have proper focus indicators', async () => {
      renderWithProvider(<NotificationBell />)
      
      const bellButton = screen.getByTestId('notification-bell')
      
      // Focus the button
      bellButton.focus()
      
      expect(bellButton).toHaveFocus()
      expect(bellButton).toHaveClass('focus:outline-none', 'focus:ring-2')
    })

    it('should not have accessibility violations', async () => {
      const { container } = renderWithProvider(<NotificationBell unreadCount={5} />)
      const results = await axe(container)
      
      expect(results).toHaveNoViolations()
    })

    it('should work with screen readers', () => {
      renderWithProvider(<NotificationBell unreadCount={2} />)
      
      const bellButton = screen.getByTestId('notification-bell')
      const badge = screen.getByTestId('notification-count-badge')
      
      // Button should have accessible name
      expect(bellButton).toHaveAccessibleName()
      
      // Badge should have aria-hidden since info is in button label
      expect(badge).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Visual States', () => {
    it('should apply correct styles for default state', () => {
      renderWithProvider(<NotificationBell />)
      
      const bellButton = screen.getByTestId('notification-bell')
      
      expect(bellButton).toHaveClass(
        'relative',
        'p-2',
        'text-gray-600',
        'hover:text-gray-800',
        'focus:outline-none',
        'focus:ring-2',
        'focus:ring-primary',
        'rounded-md',
        'transition-colors'
      )
    })

    it('should apply correct styles for loading state', () => {
      renderWithProvider(<NotificationBell isLoading={true} />)
      
      const bellButton = screen.getByTestId('notification-bell')
      
      expect(bellButton).toHaveClass('opacity-50', 'cursor-not-allowed')
    })

    it('should apply correct badge styles', () => {
      renderWithProvider(<NotificationBell unreadCount={5} />)
      
      const badge = screen.getByTestId('notification-count-badge')
      
      expect(badge).toHaveClass(
        'absolute',
        '-top-1',
        '-right-1',
        'h-5',
        'w-5',
        'bg-red-500',
        'text-white',
        'text-xs',
        'font-bold',
        'rounded-full',
        'flex',
        'items-center',
        'justify-center',
        'min-w-0'
      )
    })
  })

  describe('Edge Cases', () => {
    it('should handle negative unread count', () => {
      renderWithProvider(<NotificationBell unreadCount={-1} />)
      
      expect(screen.queryByTestId('notification-count-badge')).not.toBeInTheDocument()
    })

    it('should handle very large unread count', () => {
      renderWithProvider(<NotificationBell unreadCount={999} />)
      
      const badge = screen.getByTestId('notification-count-badge')
      expect(badge).toHaveTextContent('9+')
    })

    it('should handle undefined unread count', () => {
      renderWithProvider(<NotificationBell />)
      
      expect(screen.queryByTestId('notification-count-badge')).not.toBeInTheDocument()
    })
  })
})