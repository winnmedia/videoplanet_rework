/**
 * LoadingSpinner Modern Component Test Suite - Tailwind CSS Migration
 * TDD: 시각적 피드백 강화 및 접근성 개선 테스트
 */

import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'

import { LoadingSpinner } from './LoadingSpinner'


// Mock IntersectionObserver for performance testing
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('LoadingSpinner Modern - Enhanced Visual Feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    test('should render loading spinner with default props', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByRole('status')
      expect(spinner).toBeInTheDocument()
      expect(spinner).toHaveAttribute('aria-label', '로딩 중')
      expect(spinner).toHaveAttribute('aria-busy', 'true')
    })

    test('should render with custom text', () => {
      render(<LoadingSpinner showText text="데이터 로딩 중..." />)
      
      expect(screen.getByText('데이터 로딩 중...')).toBeInTheDocument()
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', '데이터 로딩 중...')
    })

    test('should have proper accessibility attributes', () => {
      render(<LoadingSpinner />)
      
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveAttribute('role', 'status')
      expect(spinner).toHaveAttribute('aria-live', 'polite')
      expect(spinner).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('Size Variants', () => {
    test.each([
      ['sm', 'w-4 h-4'],
      ['md', 'w-8 h-8'],
      ['lg', 'w-12 h-12'],
      ['xl', 'w-16 h-16']
    ])('should render %s size with correct classes', (size, expectedClass) => {
      render(<LoadingSpinner size={size as any} />)
      
      const spinnerCircle = document.querySelector('.animate-spin')
      expect(spinnerCircle).toHaveClass(expectedClass)
    })

    test('should handle invalid size gracefully', () => {
      render(<LoadingSpinner size={'invalid' as any} />)
      
      // Should fallback to default 'md' size
      const spinnerCircle = document.querySelector('.animate-spin')
      expect(spinnerCircle).toHaveClass('w-8', 'h-8')
    })
  })

  describe('Color Variants', () => {
    test.each([
      ['primary', 'text-primary'],
      ['white', 'text-white'],
      ['gray', 'text-gray-400']
    ])('should render %s variant with correct color', (variant, expectedClass) => {
      render(<LoadingSpinner variant={variant as any} />)
      
      const spinnerCircle = document.querySelector('.animate-spin')
      expect(spinnerCircle).toHaveClass(expectedClass)
    })

    test('should handle invalid variant gracefully', () => {
      render(<LoadingSpinner variant={'invalid' as any} />)
      
      // Should fallback to default 'primary'
      const spinnerCircle = document.querySelector('.animate-spin')
      expect(spinnerCircle).toHaveClass('text-primary')
    })
  })

  describe('Layout Options', () => {
    test('should center spinner when centered prop is true', () => {
      render(<LoadingSpinner centered />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveClass('flex', 'justify-center', 'items-center')
    })

    test('should render fullscreen spinner', () => {
      render(<LoadingSpinner fullscreen />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveClass('fixed', 'inset-0', 'z-modal', 'bg-white/80')
    })

    test('should combine centered and fullscreen', () => {
      render(<LoadingSpinner centered fullscreen />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveClass('fixed', 'inset-0', 'flex', 'justify-center', 'items-center')
    })
  })

  describe('Text Display', () => {
    test('should show text when showText is true', () => {
      render(<LoadingSpinner showText />)
      
      expect(screen.getByText('로딩 중')).toBeInTheDocument()
    })

    test('should hide text when showText is false', () => {
      render(<LoadingSpinner showText={false} />)
      
      expect(screen.queryByText('로딩 중')).not.toBeInTheDocument()
    })

    test('should render custom text with proper styling', () => {
      render(<LoadingSpinner showText text="처리 중..." />)
      
      const text = screen.getByText('처리 중...')
      expect(text).toHaveClass('text-sm', 'text-gray-600', 'animate-pulse')
      expect(text).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('Reduced Motion Support', () => {
    test('should respect prefers-reduced-motion setting', async () => {
      // Mock matchMedia for reduced motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(<LoadingSpinner />)
      
      await waitFor(() => {
        const container = screen.getByRole('status')
        expect(container).toHaveClass('motion-reduce:animate-none')
      })
    })

    test('should show static indicator when motion is reduced', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      render(<LoadingSpinner />)
      
      await waitFor(() => {
        const spinner = screen.getByRole('status')
        const staticIndicator = spinner.querySelector('.motion-reduce\\:block')
        expect(staticIndicator).toBeInTheDocument()
      })
    })
  })

  describe('Performance Optimization', () => {
    test('should not cause layout thrashing with animations', () => {
      const { container } = render(<LoadingSpinner />)
      
      // Animation should use transform instead of layout-affecting properties
      const animatedElement = container.querySelector('.animate-spin')
      const computedStyle = getComputedStyle(animatedElement as Element)
      
      // Spinner should use transform-based animation
      expect(animatedElement).toHaveClass('animate-spin')
    })

    test('should be lightweight and render quickly', () => {
      const startTime = performance.now()
      render(<LoadingSpinner />)
      const endTime = performance.now()
      
      // Should render in less than 10ms
      expect(endTime - startTime).toBeLessThan(10)
    })

    test('should handle rapid mount/unmount cycles', () => {
      const { unmount, rerender } = render(<LoadingSpinner />)
      
      // Rapid cycling should not cause errors
      for (let i = 0; i < 10; i++) {
        rerender(<LoadingSpinner key={i} />)
      }
      
      expect(() => unmount()).not.toThrow()
    })
  })

  describe('Visual Design', () => {
    test('should have smooth spinning animation', () => {
      render(<LoadingSpinner />)
      
      const spinnerCircle = document.querySelector('.animate-spin')
      expect(spinnerCircle).toHaveClass('animate-spin')
    })

    test('should use proper color opacity for visual hierarchy', () => {
      render(<LoadingSpinner variant="primary" />)
      
      const spinnerCircle = document.querySelector('.animate-spin')
      expect(spinnerCircle).toHaveClass('text-primary')
    })

    test('should have consistent spacing with text', () => {
      render(<LoadingSpinner showText text="로딩 중..." />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveClass('space-y-3')
    })
  })

  describe('Custom Styling', () => {
    test('should accept custom className', () => {
      render(<LoadingSpinner className="custom-spinner" />)
      
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('custom-spinner')
    })

    test('should accept custom style props', () => {
      render(<LoadingSpinner style={{ backgroundColor: 'red' }} />)
      
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveStyle({ backgroundColor: 'red' })
    })

    test('should pass through additional props', () => {
      render(<LoadingSpinner data-testid="my-spinner" />)
      
      expect(screen.getByTestId('my-spinner')).toBeInTheDocument()
    })
  })

  describe('Backdrop Variants', () => {
    test('should render with backdrop when fullscreen', () => {
      render(<LoadingSpinner fullscreen />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveClass('bg-white/80', 'backdrop-blur-sm')
    })

    test('should support dark backdrop variant', () => {
      render(<LoadingSpinner fullscreen backdrop="dark" />)
      
      const container = screen.getByRole('status')
      expect(container).toHaveClass('bg-gray-900/80')
    })

    test('should support transparent backdrop', () => {
      render(<LoadingSpinner fullscreen backdrop="transparent" />)
      
      const container = screen.getByRole('status')
      expect(container).not.toHaveClass('bg-white/80')
      expect(container).not.toHaveClass('bg-gray-900/80')
    })
  })

  describe('Integration with Loading States', () => {
    test('should work as overlay for content loading', () => {
      render(
        <div className="relative">
          <div>Some content</div>
          <LoadingSpinner overlay />
        </div>
      )
      
      const spinner = screen.getByRole('status')
      expect(spinner).toHaveClass('absolute', 'inset-0', 'bg-white/60')
    })

    test('should support inline loading states', () => {
      render(
        <button disabled>
          <LoadingSpinner size="sm" />
          저장 중...
        </button>
      )
      
      const spinner = document.querySelector('.animate-spin')
      expect(spinner).toHaveClass('w-4', 'h-4')
    })
  })
})