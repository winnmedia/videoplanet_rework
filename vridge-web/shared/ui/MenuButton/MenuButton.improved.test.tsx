/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import React from 'react'

import { MenuButtonImproved } from './MenuButton.improved'
import type { MenuItem } from '../../../entities/menu'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock dependencies
jest.mock('../../../features/navigation/lib/useReducedMotion', () => ({
  usePrecisionTiming: () => ({
    reducedMotion: false,
    createTransition: () => ({})
  })
}))

// Mock Next.js Image
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}))

describe('MenuButtonImproved', () => {
  const user = userEvent.setup()
  
  const mockMenuItem: MenuItem = {
    id: 'test',
    label: 'Test Menu',
    path: '/test',
    icon: '/icon.svg',
    activeIcon: '/icon-active.svg',
    hasSubMenu: false,
    count: 0
  }

  const mockOnClick = jest.fn()
  const mockOnFocus = jest.fn()
  const mockOnMouseEnter = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should render menu button with correct label', () => {
      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
        />
      )

      expect(screen.getByRole('button')).toBeInTheDocument()
      expect(screen.getByText('Test Menu')).toBeInTheDocument()
    })

    it('should call onClick when button is clicked', async () => {
      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
        />
      )

      await user.click(screen.getByRole('button'))
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })

    it('should call onFocus when button is focused', async () => {
      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
          onFocus={mockOnFocus}
        />
      )

      screen.getByRole('button').focus()
      expect(mockOnFocus).toHaveBeenCalledTimes(1)
    })

    it('should call onMouseEnter when button is hovered', async () => {
      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
          onMouseEnter={mockOnMouseEnter}
        />
      )

      await user.hover(screen.getByRole('button'))
      expect(mockOnMouseEnter).toHaveBeenCalledTimes(1)
    })
  })

  describe('Active State', () => {
    it('should apply active styling when isActive is true', () => {
      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
          isActive={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-blue-50', 'text-blue-900')
      expect(button).toHaveAttribute('aria-current', 'page')
    })

    it('should use activeIcon when active', () => {
      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
          isActive={true}
        />
      )

      const img = screen.getByRole('img')
      expect(img).toHaveAttribute('src', '/icon-active.svg')
    })
  })

  describe('SubMenu Support', () => {
    const subMenuItem: MenuItem = {
      ...mockMenuItem,
      hasSubMenu: true
    }

    it('should show submenu indicator when hasSubMenu is true', () => {
      render(
        <MenuButtonImproved 
          item={subMenuItem}
          onClick={mockOnClick}
        />
      )

      // Check for submenu chevron icon
      const chevron = screen.getByRole('button').querySelector('svg')
      expect(chevron).toBeInTheDocument()
    })

    it('should have expanded styling when isExpanded is true', () => {
      render(
        <MenuButtonImproved 
          item={subMenuItem}
          onClick={mockOnClick}
          isExpanded={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-gray-100')
      expect(button).toHaveAttribute('aria-expanded', 'true')
    })

    it('should have correct aria-label for submenu', () => {
      render(
        <MenuButtonImproved 
          item={subMenuItem}
          onClick={mockOnClick}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Test Menu 서브메뉴 열기')
    })
  })

  describe('Loading State', () => {
    it('should show loading state when isLoading is true', () => {
      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
          isLoading={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('opacity-75', 'cursor-wait')
      expect(button).toBeDisabled()
      expect(screen.getByLabelText('로딩 중')).toBeInTheDocument()
    })

    it('should show shimmer effect for icon during loading', () => {
      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
          isLoading={true}
        />
      )

      expect(screen.getByTestId('shimmer-effect')).toBeInTheDocument()
    })
  })

  describe('Count Badge', () => {
    it('should show count badge when count is provided', () => {
      const itemWithCount: MenuItem = {
        ...mockMenuItem,
        count: 5
      }

      render(
        <MenuButtonImproved 
          item={itemWithCount}
          onClick={mockOnClick}
        />
      )

      const badge = screen.getByText('5')
      expect(badge).toBeInTheDocument()
      expect(badge).toHaveAttribute('aria-label', '5개 항목')
    })

    it('should show 99+ for counts over 99', () => {
      const itemWithLargeCount: MenuItem = {
        ...mockMenuItem,
        count: 150
      }

      render(
        <MenuButtonImproved 
          item={itemWithLargeCount}
          onClick={mockOnClick}
        />
      )

      expect(screen.getByText('99+')).toBeInTheDocument()
    })
  })

  describe('External Link', () => {
    it('should show external link indicator for http URLs', () => {
      const externalItem: MenuItem = {
        ...mockMenuItem,
        path: 'https://example.com'
      }

      render(
        <MenuButtonImproved 
          item={externalItem}
          onClick={mockOnClick}
        />
      )

      const externalIndicator = screen.getByLabelText('외부 링크')
      expect(externalIndicator).toBeInTheDocument()
      expect(externalIndicator).toHaveAttribute('title', '새 탭에서 열립니다')
    })
  })

  describe('Accessibility', () => {
    it('should pass accessibility audit', async () => {
      const { container } = render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA attributes', () => {
      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
          isActive={true}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-label', 'Test Menu로 이동')
      expect(button).toHaveAttribute('aria-describedby')
      expect(button).toHaveAttribute('aria-current', 'page')
    })

    it('should provide description for screen readers', () => {
      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
          isActive={true}
        />
      )

      const description = screen.getByText('현재 활성화된 메뉴입니다')
      expect(description).toHaveClass('sr-only')
    })

    it('should support keyboard navigation', async () => {
      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
        />
      )

      const button = screen.getByRole('button')
      
      // Tab to focus
      await user.tab()
      expect(button).toHaveFocus()

      // Enter to activate
      await user.keyboard('{Enter}')
      expect(mockOnClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('Visual Interactions', () => {
    it('should apply hover effects', async () => {
      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
        />
      )

      const button = screen.getByRole('button')
      await user.hover(button)

      expect(button).toHaveClass('hover:bg-gray-50')
    })

    it('should show ripple effect on mouse down', async () => {
      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
        />
      )

      const button = screen.getByRole('button')
      fireEvent.mouseDown(button, {
        clientX: 50,
        clientY: 50,
        currentTarget: {
          getBoundingClientRect: () => ({ left: 0, top: 0 })
        }
      })

      // Ripple element should be created
      await waitFor(() => {
        const ripple = button.querySelector('.animate-ping')
        expect(ripple).toBeInTheDocument()
      })
    })
  })

  describe('Reduced Motion', () => {
    beforeEach(() => {
      // Mock reduced motion preference
      jest.doMock('../../../features/navigation/lib/useReducedMotion', () => ({
        usePrecisionTiming: () => ({
          reducedMotion: true,
          createTransition: () => ({})
        })
      }))
    })

    it('should respect reduced motion preference', () => {
      const { usePrecisionTiming } = require('../../../features/navigation/lib/useReducedMotion')
      usePrecisionTiming.mockReturnValue({
        reducedMotion: true,
        createTransition: () => ({})
      })

      render(
        <MenuButtonImproved 
          item={mockMenuItem}
          onClick={mockOnClick}
        />
      )

      const button = screen.getByRole('button')
      expect(button).toHaveClass('transition-none')
    })
  })
})