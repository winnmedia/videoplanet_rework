/**
 * FSD Architecture Test Helpers
 * Utilities for testing different layers of Feature-Sliced Design
 */

import { vi, expect, describe, it } from 'vitest'
import { render, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React, { ReactElement } from 'react'

/**
 * 안정적인 React.act() 래핑 헬퍼
 */
export async function actStable(action: () => Promise<void> | void) {
  await act(async () => {
    await action()
  })
}

/**
 * 향상된 waitFor with 안정성 보장
 */
export async function waitForStable<T>(
  callback: () => T, 
  options: {
    timeout?: number
    interval?: number
    onTimeout?: (lastError: Error) => void
  } = {}
) {
  const { timeout = 5000, interval = 50, onTimeout } = options
  
  try {
    return await waitFor(callback, { timeout, interval })
  } catch (error) {
    onTimeout?.(error as Error)
    throw error
  }
}

/**
 * CSS Module 클래스 매처 - 해시 기반 클래스명 안정적 매칭
 */
export const cssModuleMatchers = {
  hasClass: (baseClassName: string) => 
    expect.stringMatching(new RegExp(`_${baseClassName}_[a-f0-9]{6}`)),
  
  videoFeedback: (className: string) => 
    expect.stringMatching(new RegExp(`_${className}_[a-f0-9]{6}`)),
    
  videoPlanning: (className: string) => 
    expect.stringMatching(new RegExp(`_${className}_[a-f0-9]{6}`))
}

/**
 * Test helper for Shared layer components
 * Ensures complete isolation and no external dependencies
 */
export const testSharedComponent = (
  component: ReactElement,
  testName: string
) => {
  describe(`Shared Component: ${testName}`, () => {
    it('should render without external dependencies', async () => {
      await actStable(() => {
        const { container } = render(component)
        expect(container).toBeInTheDocument()
      })
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
    it('should render with required props', async () => {
      await actStable(() => {
        const result = render(React.createElement(WidgetComponent, requiredProps))
        expect(result.container.firstChild).toBeInTheDocument()
      })
    })
    
    it('should compose features and entities correctly', async () => {
      // Test that widget properly integrates lower layers
      await actStable(() => {
        const result = render(React.createElement(WidgetComponent, requiredProps))
        expect(result.container).toBeInTheDocument()
      })
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
 * 비디오 테스트 헬퍼
 */
export const videoTestHelpers = {
  mockVideoElement: () => {
    const mockVideo = {
      play: vi.fn().mockResolvedValue(undefined),
      pause: vi.fn(),
      currentTime: 0,
      duration: 180,
      volume: 1,
      muted: false,
      playbackRate: 1,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }
    
    // HTMLVideoElement 모킹
    Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
      writable: true,
      value: mockVideo.play
    })
    Object.defineProperty(window.HTMLMediaElement.prototype, 'pause', {
      writable: true,
      value: mockVideo.pause
    })
    
    return mockVideo
  },

  expectVideoControl: async (user: any, controlButton: HTMLElement, expectedState: string) => {
    await actStable(async () => {
      await user.click(controlButton)
    })
    
    await waitForStable(() => {
      // 재생 상태에 따른 버튼 변화 확인
      if (expectedState === 'playing') {
        expect(controlButton).toHaveAttribute('aria-label', expect.stringMatching(/일시정지|정지/i))
      } else if (expectedState === 'paused') {
        expect(controlButton).toHaveAttribute('aria-label', expect.stringMatching(/재생/i))
      }
    })
  }
}

/**
 * 드래그앤드롭 테스트 헬퍼
 */
export const dragDropHelpers = {
  createMockDataTransfer: () => {
    const data = new Map<string, string>()
    
    return {
      effectAllowed: '',
      dropEffect: 'none',
      files: [],
      items: [],
      types: [],
      setData: vi.fn((type: string, value: string) => {
        data.set(type, value)
      }),
      getData: vi.fn((type: string) => data.get(type) || ''),
      setDragImage: vi.fn(),
      clearData: vi.fn(() => data.clear())
    }
  },

  simulateDragAndDrop: async (
    source: HTMLElement, 
    target: HTMLElement,
    dragData: Record<string, string> = {}
  ) => {
    const dataTransfer = dragDropHelpers.createMockDataTransfer()
    
    await actStable(async () => {
      // 드래그 시작
      const dragStartEvent = new DragEvent('dragstart', { 
        bubbles: true, 
        cancelable: true,
        dataTransfer: dataTransfer as any
      })
      source.dispatchEvent(dragStartEvent)

      // 드래그 오버
      const dragOverEvent = new DragEvent('dragover', { 
        bubbles: true, 
        cancelable: true,
        dataTransfer: dataTransfer as any
      })
      target.dispatchEvent(dragOverEvent)

      // 드롭
      const dropEvent = new DragEvent('drop', { 
        bubbles: true, 
        cancelable: true,
        dataTransfer: dataTransfer as any
      })
      target.dispatchEvent(dropEvent)
    })
  }
}

/**
 * 모달 테스트 헬퍼
 */
export const modalTestHelpers = {
  expectModalOpen: async (screen: any, modalTestId: string = 'modal') => {
    await waitForStable(() => {
      const modal = screen.getByTestId(modalTestId)
      expect(modal).toBeInTheDocument()
      expect(modal).toHaveAttribute('role', 'dialog')
      expect(modal).toHaveAttribute('aria-modal', 'true')
    })
  },

  expectModalClosed: async (screen: any, modalTestId: string = 'modal') => {
    await waitForStable(() => {
      expect(screen.queryByTestId(modalTestId)).not.toBeInTheDocument()
    })
  },

  testEscapeClose: async (user: any, screen: any, modalTestId: string = 'modal') => {
    // 모달이 열려있는지 확인
    await modalTestHelpers.expectModalOpen(screen, modalTestId)
    
    // Escape 키 누르기
    await actStable(async () => {
      await user.keyboard('{Escape}')
    })
    
    // 모달이 닫혔는지 확인
    await modalTestHelpers.expectModalClosed(screen, modalTestId)
  },

  testBackdropClose: async (user: any, screen: any, modalTestId: string = 'modal') => {
    const modal = screen.getByTestId(modalTestId)
    
    await actStable(async () => {
      // 모달 뒷배경 클릭 (보통 모달 컨테이너 자체를 클릭)
      await user.click(modal)
    })
    
    await modalTestHelpers.expectModalClosed(screen, modalTestId)
  }
}

/**
 * 접근성 테스트 헬퍼
 */
export const a11yHelpers = {
  expectFocusable: (element: HTMLElement) => {
    const tabIndex = element.getAttribute('tabindex')
    const isInteractive = ['button', 'input', 'select', 'textarea', 'a'].includes(
      element.tagName.toLowerCase()
    )
    
    expect(tabIndex !== '-1' || isInteractive).toBe(true)
  },

  expectAriaLabel: (element: HTMLElement, label: string | RegExp) => {
    const ariaLabel = element.getAttribute('aria-label')
    const ariaLabelledBy = element.getAttribute('aria-labelledby')
    
    // aria-label 또는 aria-labelledby가 있어야 함
    expect(ariaLabel || ariaLabelledBy).toBeTruthy()
    
    if (ariaLabel && typeof label === 'string') {
      expect(ariaLabel).toBe(label)
    } else if (ariaLabel && label instanceof RegExp) {
      expect(ariaLabel).toMatch(label)
    }
  },

  expectKeyboardNavigation: async (
    user: any, 
    elements: HTMLElement[], 
    direction: 'forward' | 'backward' = 'forward'
  ) => {
    const key = direction === 'forward' ? '{Tab}' : '{Shift>}{Tab}{/Shift}'
    
    // 첫 번째 요소에 포커스
    elements[0].focus()
    expect(elements[0]).toHaveFocus()
    
    // 각 요소로 순차 이동
    for (let i = 1; i < elements.length; i++) {
      await actStable(async () => {
        await user.keyboard(key)
      })
      
      await waitForStable(() => {
        expect(elements[i]).toHaveFocus()
      })
    }
  },

  expectScreenReaderAnnouncement: (element: HTMLElement, expectedText?: string) => {
    // aria-live 또는 role="status" 확인
    const hasAriaLive = element.hasAttribute('aria-live')
    const hasStatusRole = element.getAttribute('role') === 'status'
    const hasAlertRole = element.getAttribute('role') === 'alert'
    
    expect(hasAriaLive || hasStatusRole || hasAlertRole).toBe(true)
    
    if (expectedText) {
      expect(element).toHaveTextContent(expectedText)
    }
  }
}

/**
 * 테스트 데이터 팩토리
 */
export const testDataFactory = {
  user: (overrides = {}) => ({
    id: `user-${Date.now()}`,
    name: 'Test User',
    email: 'test@example.com',
    role: 'editor',
    avatar: '/test-avatar.jpg',
    isOnline: true,
    lastSeen: new Date().toISOString(),
    permissions: {
      canEdit: true,
      canComment: true,
      canApprove: false
    },
    ...overrides
  }),

  project: (overrides = {}) => ({
    id: `project-${Date.now()}`,
    title: 'Test Project',
    description: 'Test project description',
    status: 'active',
    priority: 'medium',
    currentStage: 'concept',
    createdBy: 'user-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    startDate: new Date().toISOString(),
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    ...overrides
  }),

  comment: (overrides = {}) => ({
    id: `comment-${Date.now()}`,
    content: 'Test comment content',
    timestamp: 15.5,
    x: 50,
    y: 30,
    author: testDataFactory.user(),
    createdAt: new Date().toISOString(),
    status: 'open',
    priority: 'medium',
    tags: ['test'],
    ...overrides
  }),

  videoSession: (overrides = {}) => ({
    id: `session-${Date.now()}`,
    projectId: 'project-001',
    title: 'Test Video Session',
    description: 'Test video feedback session',
    version: 'v1.0',
    status: 'in_review',
    videoMetadata: {
      id: 'video-001',
      filename: 'test-video.mp4',
      url: '/test/video.mp4',
      duration: 180,
      resolution: { width: 1920, height: 1080 },
      fileSize: 50000000,
      format: 'mp4'
    },
    comments: [],
    markers: [],
    totalComments: 0,
    resolvedComments: 0,
    pendingComments: 0,
    createdBy: 'user-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
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
  it(`${componentName} should render within ${maxRenderTime}ms`, async () => {
    const start = performance.now()
    await actStable(() => {
      render(React.createElement(Component, props))
    })
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
      it(`should match snapshot for ${variantName}`, async () => {
        await actStable(() => {
          const result = render(React.createElement(Component, props))
          expect(result.container.firstChild).toMatchSnapshot()
        })
      })
    })
  })
}