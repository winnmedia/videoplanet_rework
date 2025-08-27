/**
 * Custom Testing Utilities
 * Provides enhanced render function with providers and utilities
 */

import { render, RenderOptions, RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React, { ReactElement } from 'react'

/**
 * Provider wrapper for tests
 * Add any global providers here (Theme, Auth, etc.)
 */
interface ProvidersProps {
  children: React.ReactNode
}

function Providers({ children }: ProvidersProps) {
  // Add any providers your app needs
  // Example: <ThemeProvider><AuthProvider>{children}</AuthProvider></ThemeProvider>
  return <>{children}</>
}

/**
 * Custom render function that wraps components with necessary providers
 */
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  // Add any custom options here
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult {
  return render(ui, { wrapper: Providers, ...options })
}

/**
 * Setup function that combines render with userEvent
 * This is the recommended pattern for most tests
 */
export function setup(ui: ReactElement, options?: CustomRenderOptions) {
  return {
    user: userEvent.setup(),
    ...customRender(ui, options),
  }
}

// Re-export everything from React Testing Library
export * from '@testing-library/react'

// Override the default render with our custom one
export { customRender as render }

/**
 * Test data factories
 * Centralized place for creating test data
 */
export const createMockUser = (overrides = {}) => ({
  id: '1',
  email: 'test@example.com',
  name: 'Test User',
  avatar: '/default-avatar.png',
  ...overrides,
})

export const createMockItem = (overrides = {}) => ({
  id: '1',
  title: 'Test Item',
  description: 'Test Description',
  createdAt: new Date().toISOString(),
  ...overrides,
})

/**
 * Async utilities for testing
 */
export const waitForLoadingToFinish = () => {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

/**
 * Accessibility testing utilities
 */
export const checkA11y = async (container: HTMLElement) => {
  // This is a placeholder for axe-core integration
  // You can add actual accessibility testing here
  return true
}