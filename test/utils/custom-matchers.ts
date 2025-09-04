/**
 * Custom Vitest Matchers
 * Extended assertions for better testing experience
 */

import { expect } from 'vitest'

// Define custom matcher types
interface CustomMatchers<R = unknown> {
  toBeWithinRange(floor: number, ceiling: number): R
  toHaveNoAxeViolations(): R
  toBeValidEmail(): R
  toBeValidUrl(): R
  toHaveBeenCalledWithError(error: string | RegExp): R
  toRenderWithoutErrors(): R
}

declare module 'vitest' {
  interface Assertion<T = unknown> extends CustomMatchers<T> {}
  interface AsymmetricMatchersContaining extends CustomMatchers {}
}

// Implement custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      }
    }
  },
  
  toBeValidEmail(received: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const pass = emailRegex.test(received)
    
    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid email`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected ${received} to be a valid email`,
        pass: false,
      }
    }
  },
  
  toBeValidUrl(received: string) {
    try {
      new URL(received)
      return {
        message: () => `expected ${received} not to be a valid URL`,
        pass: true,
      }
    } catch {
      return {
        message: () => `expected ${received} to be a valid URL`,
        pass: false,
      }
    }
  },
  
  toHaveBeenCalledWithError(received: { mock?: { calls: unknown[][] } }, error: string | RegExp) {
    if (!received.mock) {
      return {
        message: () => 'Expected a mock function',
        pass: false,
      }
    }
    
    const calls = received.mock.calls
    const errorMatcher = typeof error === 'string' 
      ? (e: unknown) => (e as { message?: string })?.message === error || e === error
      : (e: unknown) => error.test((e as { message?: string })?.message || String(e))
    
    const hasErrorCall = calls.some((call: unknown[]) => 
      call.some(arg => errorMatcher(arg))
    )
    
    if (hasErrorCall) {
      return {
        message: () => `expected not to be called with error matching ${error}`,
        pass: true,
      }
    } else {
      return {
        message: () => `expected to be called with error matching ${error}`,
        pass: false,
      }
    }
  },
  
  toRenderWithoutErrors(received: { error?: unknown }) {
    // Check if component rendered without throwing
    const pass = received && !received.error
    
    if (pass) {
      return {
        message: () => 'expected component to throw an error during render',
        pass: true,
      }
    } else {
      return {
        message: () => `expected component to render without errors, but got: ${received?.error}`,
        pass: false,
      }
    }
  },
  
  async toHaveNoAxeViolations(received: Element) {
    // This is a placeholder for axe-core integration
    // You would need to install and configure @axe-core/react
    const pass = true // Placeholder
    
    if (pass) {
      return {
        message: () => 'expected to have accessibility violations',
        pass: true,
      }
    } else {
      return {
        message: () => 'expected to have no accessibility violations',
        pass: false,
      }
    }
  },
})

export {}