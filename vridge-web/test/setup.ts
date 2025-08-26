/**
 * Vitest Global Test Setup
 * This file configures the testing environment for all tests
 */

import '@testing-library/jest-dom'
import './utils/custom-matchers'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll, afterAll, vi } from 'vitest'
import { server } from './mocks/server'
import { NextImageMock, NextLinkMock } from './mocks/next'

// Setup MSW (Mock Service Worker)
beforeAll(() => {
  // Start the MSW server before all tests
  server.listen({
    onUnhandledRequest: 'warn',
  })
})

// Reset handlers and cleanup after each test
afterEach(() => {
  // Reset any request handlers that are declared as a part of our tests
  server.resetHandlers()
  
  // Cleanup React Testing Library
  cleanup()
  
  // Clear all mocks
  vi.clearAllMocks()
})

// Clean up after all tests are done
afterAll(() => {
  // Close the MSW server
  server.close()
})

// Mock Next.js Image component
vi.mock('next/image', () => ({
  default: NextImageMock,
}))

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: NextLinkMock,
}))

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// Setup global test utilities
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: () => [],
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock scrollTo
global.scrollTo = vi.fn()
window.scrollTo = vi.fn()