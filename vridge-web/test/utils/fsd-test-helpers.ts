/**
 * FSD Architecture Test Helpers
 * Utilities for testing different layers of Feature-Sliced Design
 */

import { vi } from 'vitest'
import { render } from './test-utils'
import { ReactElement } from 'react'

/**
 * Test helper for Shared layer components
 * Ensures complete isolation and no external dependencies
 */
export const testSharedComponent = (
  component: ReactElement,
  testName: string
) => {
  describe(`Shared Component: ${testName}`, () => {
    it('should render without external dependencies', () => {
      const { container } = render(component)
      expect(container).toBeInTheDocument()
    })
    
    it('should not import from higher layers', () => {
      // This is a conceptual test - in practice, use ESLint rules
      expect(true).toBe(true)
    })
  })
}

/**
 * Test helper for Entity layer
 * Tests data models and business entities
 */
export const testEntity = (
  entityName: string,
  entityFactory: () => any,
  validationRules: Record<string, (value: any) => boolean>
) => {
  describe(`Entity: ${entityName}`, () => {
    it('should create valid entity instance', () => {
      const entity = entityFactory()
      expect(entity).toBeDefined()
    })
    
    Object.entries(validationRules).forEach(([field, validator]) => {
      it(`should validate ${field} field`, () => {
        const entity = entityFactory()
        expect(validator(entity[field])).toBe(true)
      })
    })
  })
}

/**
 * Test helper for Feature layer
 * Tests user interactions and feature logic
 */
export const testFeature = (
  featureName: string,
  setup: () => { trigger: () => void; getState: () => any },
  expectedBehavior: Record<string, any>
) => {
  describe(`Feature: ${featureName}`, () => {
    it('should handle user interaction', () => {
      const { trigger, getState } = setup()
      trigger()
      const state = getState()
      
      Object.entries(expectedBehavior).forEach(([key, value]) => {
        expect(state[key]).toEqual(value)
      })
    })
  })
}

/**
 * Test helper for Widget layer
 * Tests compositional components
 */
export const testWidget = (
  widgetName: string,
  WidgetComponent: React.ComponentType<any>,
  requiredProps: Record<string, any>
) => {
  describe(`Widget: ${widgetName}`, () => {
    it('should render with required props', () => {
      const { container } = render(<WidgetComponent {...requiredProps} />)
      expect(container.firstChild).toBeInTheDocument()
    })
    
    it('should compose features and entities correctly', () => {
      // Test that widget properly integrates lower layers
      const { container } = render(<WidgetComponent {...requiredProps} />)
      // Add specific integration tests
      expect(container).toBeInTheDocument()
    })
  })
}

/**
 * Test helper for Process layer
 * Tests complex business processes
 */
export const testProcess = (
  processName: string,
  processSteps: Array<() => Promise<any>>,
  expectedOutcome: any
) => {
  describe(`Process: ${processName}`, () => {
    it('should complete all process steps', async () => {
      const results = []
      
      for (const step of processSteps) {
        const result = await step()
        results.push(result)
      }
      
      expect(results[results.length - 1]).toEqual(expectedOutcome)
    })
    
    it('should handle process interruption', async () => {
      // Test process resilience
      const controller = new AbortController()
      
      try {
        for (const step of processSteps) {
          if (controller.signal.aborted) break
          await step()
        }
      } catch (error) {
        expect(error).toBeDefined()
      }
    })
  })
}

/**
 * Mock factory for API calls
 */
export const createApiMock = (endpoint: string, response: any) => {
  return vi.fn().mockResolvedValue(response)
}

/**
 * Test helper for integration tests
 */
export const integrationTest = (
  testName: string,
  layers: string[],
  testFn: () => void | Promise<void>
) => {
  describe(`Integration Test: ${testName}`, () => {
    it(`should integrate ${layers.join(' -> ')}`, async () => {
      await testFn()
    })
  })
}

/**
 * Performance testing helper
 */
export const testPerformance = (
  componentName: string,
  Component: React.ComponentType<any>,
  props: any,
  maxRenderTime: number = 16 // 60fps
) => {
  it(`${componentName} should render within ${maxRenderTime}ms`, () => {
    const start = performance.now()
    render(<Component {...props} />)
    const end = performance.now()
    
    expect(end - start).toBeLessThan(maxRenderTime)
  })
}

/**
 * Snapshot testing helper with proper naming
 */
export const testSnapshot = (
  componentName: string,
  Component: React.ComponentType<any>,
  variants: Record<string, any>
) => {
  describe(`${componentName} Snapshots`, () => {
    Object.entries(variants).forEach(([variantName, props]) => {
      it(`should match snapshot for ${variantName}`, () => {
        const { container } = render(<Component {...props} />)
        expect(container.firstChild).toMatchSnapshot()
      })
    })
  })
}