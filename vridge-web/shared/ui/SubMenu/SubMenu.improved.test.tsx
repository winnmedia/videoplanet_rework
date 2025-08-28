/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import React from 'react'

import { SubMenuImproved } from './SubMenu.improved'
import type { SubMenuItem } from '@/entities/menu/model/types'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock keyboard navigation hook
jest.mock('./hooks/useKeyboardNavigation', () => ({
  useKeyboardNavigation: () => ({
    focusedIndex: 0,
    handleKeyDown: jest.fn()
  })
}))

describe('SubMenuImproved', () => {
  const user = userEvent.setup()
  
  const mockItems: SubMenuItem[] = [
    {
      id: '1',
      name: 'Project 1',
      path: '/projects/1',
      status: 'active',
      badge: 2
    },
    {
      id: '2',
      name: 'Project 2',
      path: '/projects/2',
      status: 'completed',
      badge: 0
    },
    {
      id: '3',
      name: 'Project 3',
      path: '/projects/3',
      status: 'pending',
      badge: 5
    }
  ]

  const mockOnClose = jest.fn()
  const mockOnItemClick = jest.fn()
  const mockOnCreateNew = jest.fn()
  const mockOnRetry = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Functionality', () => {
    it('should not render when isOpen is false', () => {
      render(
        <SubMenuImproved
          isOpen={false}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })

    it('should render when isOpen is true', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      expect(screen.getByRole('menu')).toBeInTheDocument()
      expect(screen.getByText('Test Menu')).toBeInTheDocument()
      expect(screen.getByText('총 3개 항목')).toBeInTheDocument()
    })

    it('should call onClose when close button is clicked', async () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      await user.click(screen.getByTestId('close-button'))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should call onItemClick when menu item is clicked', async () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      await user.click(screen.getByText('Project 1'))
      expect(mockOnItemClick).toHaveBeenCalledWith(mockItems[0])
    })
  })

  describe('Loading State', () => {
    it('should show loading skeleton when isLoading is true', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={[]}
          isLoading={true}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      expect(screen.getByTestId('submenu-loading')).toBeInTheDocument()
      expect(screen.queryByText('등록된 프로젝트가 없습니다')).not.toBeInTheDocument()
    })

    it('should show multiple skeleton items', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={[]}
          isLoading={true}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const skeletonItems = screen.getAllByText((content, element) => {
        return element?.classList.contains('animate-pulse') === true
      })
      expect(skeletonItems.length).toBeGreaterThan(0)
    })
  })

  describe('Error State', () => {
    it('should show error message when error is provided', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={[]}
          error="Failed to load data"
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
          onRetry={mockOnRetry}
        />
      )

      expect(screen.getByTestId('submenu-error')).toBeInTheDocument()
      expect(screen.getByText('Failed to load data')).toBeInTheDocument()
      expect(screen.getByTestId('retry-button')).toBeInTheDocument()
    })

    it('should call onRetry when retry button is clicked', async () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={[]}
          error="Failed to load data"
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
          onRetry={mockOnRetry}
        />
      )

      await user.click(screen.getByTestId('retry-button'))
      expect(mockOnRetry).toHaveBeenCalledTimes(1)
    })

    it('should not show retry button when onRetry is not provided', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={[]}
          error="Failed to load data"
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument()
    })
  })

  describe('Empty State', () => {
    it('should show empty state when no items and not loading', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={[]}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
          onCreateNew={mockOnCreateNew}
        />
      )

      expect(screen.getByText('등록된 프로젝트가 없습니다')).toBeInTheDocument()
      expect(screen.getByText('프로젝트 등록')).toBeInTheDocument()
    })

    it('should call onCreateNew when create button is clicked', async () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={[]}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
          onCreateNew={mockOnCreateNew}
        />
      )

      await user.click(screen.getByText('프로젝트 등록'))
      expect(mockOnCreateNew).toHaveBeenCalledTimes(1)
    })
  })

  describe('Menu Items', () => {
    it('should render all menu items with correct data', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      mockItems.forEach(item => {
        expect(screen.getByText(item.name)).toBeInTheDocument()
      })
    })

    it('should show status badges correctly', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      expect(screen.getByText('진행중')).toBeInTheDocument()
      expect(screen.getByText('완료')).toBeInTheDocument()
      expect(screen.getByText('대기')).toBeInTheDocument()
    })

    it('should show notification badges for items with badge > 0', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      expect(screen.getByLabelText('2개 알림')).toBeInTheDocument()
      expect(screen.getByLabelText('5개 알림')).toBeInTheDocument()
      
      // Badge with 0 should not be shown
      expect(screen.queryByText('0')).not.toBeInTheDocument()
    })

    it('should show 9+ for badges over 9', () => {
      const itemWithLargeBadge: SubMenuItem = {
        id: '4',
        name: 'Project 4',
        path: '/projects/4',
        badge: 15
      }

      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={[itemWithLargeBadge]}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      expect(screen.getByText('9+')).toBeInTheDocument()
    })

    it('should highlight active item', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          activeItemId="1"
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const activeItem = screen.getByTestId('menu-item-1')
      expect(activeItem).toHaveClass('bg-blue-50', 'border-blue-200', 'text-blue-900')
      expect(activeItem).toHaveAttribute('aria-current', 'page')
    })
  })

  describe('Accessibility', () => {
    it('should pass accessibility audit', async () => {
      const { container } = render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper ARIA attributes', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const menu = screen.getByRole('menu')
      expect(menu).toHaveAttribute('aria-label', 'Test Menu')
      expect(menu).toHaveAttribute('aria-orientation', 'vertical')
      expect(menu).toHaveAttribute('aria-describedby', 'submenu-description')
    })

    it('should provide description for screen readers', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const description = screen.getByText(/서브메뉴입니다. 화살표 키로 탐색하고/)
      expect(description).toHaveClass('sr-only')
    })

    it('should set proper tabindex for menu items', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems[0]).toHaveAttribute('tabindex', '0')
      expect(menuItems[1]).toHaveAttribute('tabindex', '-1')
      expect(menuItems[2]).toHaveAttribute('tabindex', '-1')
    })
  })

  describe('Keyboard Navigation', () => {
    it('should close on Escape key', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      fireEvent.keyDown(document, { key: 'Escape' })
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should handle keyboard navigation through useKeyboardNavigation hook', () => {
      const mockHandleKeyDown = jest.fn()
      const { useKeyboardNavigation } = require('./hooks/useKeyboardNavigation')
      useKeyboardNavigation.mockReturnValue({
        focusedIndex: 1,
        handleKeyDown: mockHandleKeyDown
      })

      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const menu = screen.getByRole('menu')
      fireEvent.keyDown(menu, { key: 'ArrowDown' })
      expect(mockHandleKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'ArrowDown' }))
    })
  })

  describe('Click Outside', () => {
    it('should close when clicking outside', () => {
      render(
        <div>
          <div data-testid="outside">Outside element</div>
          <SubMenuImproved
            isOpen={true}
            title="Test Menu"
            items={mockItems}
            onClose={mockOnClose}
            onItemClick={mockOnItemClick}
          />
        </div>
      )

      fireEvent.mouseDown(screen.getByTestId('outside'))
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    it('should not close when clicking inside the menu', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      fireEvent.mouseDown(screen.getByRole('menu'))
      expect(mockOnClose).not.toHaveBeenCalled()
    })
  })

  describe('Animation', () => {
    it('should apply slide-in animation class', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
          className="animate-slide-in"
        />
      )

      const menu = screen.getByRole('menu')
      expect(menu).toHaveClass('animate-slide-in')
    })

    it('should have proper transition classes', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const menu = screen.getByRole('menu')
      expect(menu).toHaveClass('transition-transform', 'duration-300', 'ease-out')
    })
  })

  describe('Add Button', () => {
    it('should show add button when onCreateNew is provided and items exist', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
          onCreateNew={mockOnCreateNew}
        />
      )

      expect(screen.getByTestId('add-button')).toBeInTheDocument()
    })

    it('should not show add button when loading or error', () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          isLoading={true}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
          onCreateNew={mockOnCreateNew}
        />
      )

      expect(screen.queryByTestId('add-button')).not.toBeInTheDocument()
    })

    it('should call onCreateNew when add button is clicked', async () => {
      render(
        <SubMenuImproved
          isOpen={true}
          title="Test Menu"
          items={mockItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
          onCreateNew={mockOnCreateNew}
        />
      )

      await user.click(screen.getByTestId('add-button'))
      expect(mockOnCreateNew).toHaveBeenCalledTimes(1)
    })
  })
})