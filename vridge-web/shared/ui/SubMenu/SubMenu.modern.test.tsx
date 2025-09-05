/**
 * SubMenu Modern Component Test Suite - Tailwind CSS Migration
 * TDD: Z-index 계층 관리 및 오버레이 문제 해결 테스트
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import type { SubMenuItem } from '@/entities/menu/model/types'

import { SubMenu } from './SubMenu'

const mockSubMenuItems: SubMenuItem[] = [
  {
    id: '1',
    name: '웹사이트 리뉴얼 프로젝트',
    path: '/projects/1',
    status: 'active',
    badge: 3
  },
  {
    id: '2', 
    name: '모바일 앱 개발',
    path: '/projects/2',
    status: 'pending',
    badge: 0
  },
  {
    id: '3',
    name: '브랜딩 영상 제작',
    path: '/projects/3',
    status: 'completed',
    badge: 1
  }
]

describe('SubMenu Modern - Z-Index and Overlay Management', () => {
  const mockOnClose = vi.fn()
  const mockOnItemClick = vi.fn()

  const defaultProps = {
    isOpen: true,
    title: '프로젝트 관리',
    items: mockSubMenuItems,
    onClose: mockOnClose,
    onItemClick: mockOnItemClick,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Z-Index Hierarchy', () => {
    test('should have correct z-index to avoid content overlap', () => {
      render(<SubMenu {...defaultProps} />)
      
      const submenu = screen.getByTestId('submenu')
      // z-45 클래스가 적용되었는지 확인 (사이드바보다 높고 모달보다 낮음)
      expect(submenu).toHaveClass('z-45')
    })

    test('should have backdrop with appropriate z-index', () => {
      render(<SubMenu {...defaultProps} />)
      
      const backdrop = document.querySelector('.backdrop')
      expect(backdrop).toHaveClass('z-backdrop')
    })

    test('should not interfere with main content when positioned correctly', () => {
      render(<SubMenu {...defaultProps} />)
      
      const submenu = screen.getByTestId('submenu')
      
      // 고정 위치와 올바른 좌표
      expect(submenu).toHaveClass('fixed')
      expect(submenu).toHaveClass('left-sidebar') // 사이드바 너비만큼 떨어진 위치
      expect(submenu).toHaveClass('top-0')
      expect(submenu).toHaveClass('h-full')
    })
  })

  describe('Layout Structure', () => {
    test('should have proper width and positioning', () => {
      render(<SubMenu {...defaultProps} />)
      
      const submenu = screen.getByTestId('submenu')
      
      // 고정 너비와 위치
      expect(submenu).toHaveClass('w-80') // 320px 너비
      expect(submenu).toHaveClass('bg-white')
      expect(submenu).toHaveClass('shadow-lg')
    })

    test('should handle responsive behavior on mobile', () => {
      // Mock mobile window size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })
      
      render(<SubMenu {...defaultProps} />)
      
      const submenu = screen.getByTestId('submenu')
      
      // 모바일에서 전체 너비
      expect(submenu).toHaveClass('md:left-sidebar')
      expect(submenu).toHaveClass('md:w-80')
    })
  })

  describe('Backdrop Interaction', () => {
    test('should close submenu when backdrop is clicked', async () => {
      const user = userEvent.setup()
      render(<SubMenu {...defaultProps} />)
      
      const backdrop = document.querySelector('.backdrop')
      expect(backdrop).toBeInTheDocument()
      
      await user.click(backdrop!)
      expect(mockOnClose).toHaveBeenCalledTimes(1)
    })

    test('should have proper opacity for backdrop', () => {
      render(<SubMenu {...defaultProps} />)
      
      const backdrop = document.querySelector('.backdrop')
      expect(backdrop).toHaveClass('bg-black/50') // 50% 투명도
    })
  })

  describe('Content Accessibility', () => {
    test('should maintain proper focus management', () => {
      render(<SubMenu {...defaultProps} />)
      
      const firstItem = screen.getByTestId('menu-item-1')
      expect(firstItem).toHaveAttribute('tabIndex', '0')
      
      const secondItem = screen.getByTestId('menu-item-2')
      expect(secondItem).toHaveAttribute('tabIndex', '-1')
    })

    test('should have proper ARIA attributes', () => {
      render(<SubMenu {...defaultProps} />)
      
      const submenu = screen.getByTestId('submenu')
      expect(submenu).toHaveAttribute('role', 'menu')
      expect(submenu).toHaveAttribute('aria-label', '프로젝트 관리')
      expect(submenu).toHaveAttribute('aria-orientation', 'vertical')
    })
  })

  describe('Animation and Transitions', () => {
    test('should have smooth entry animation', () => {
      render(<SubMenu {...defaultProps} />)
      
      const submenu = screen.getByTestId('submenu')
      expect(submenu).toHaveClass('animate-slide-in-left')
    })

    test('should handle reduced motion preference', () => {
      // Mock prefers-reduced-motion
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
      
      render(<SubMenu {...defaultProps} />)
      
      const submenu = screen.getByTestId('submenu')
      // 애니메이션이 비활성화되어야 함
      expect(submenu).toHaveClass('motion-reduce:animate-none')
    })
  })

  describe('Empty State Handling', () => {
    test('should show empty state when no items provided', () => {
      render(<SubMenu {...defaultProps} items={[]} />)
      
      const emptyMessage = screen.getByText(/등록된.*프로젝트가 없습니다/)
      expect(emptyMessage).toBeInTheDocument()
    })

    test('should show create button in empty state when callback provided', () => {
      const mockOnCreateNew = vi.fn()
      render(
        <SubMenu 
          {...defaultProps} 
          items={[]} 
          onCreateNew={mockOnCreateNew}
        />
      )
      
      const createButton = screen.getByText('프로젝트 등록')
      expect(createButton).toBeInTheDocument()
    })
  })

  describe('Error State Prevention', () => {
    test('should handle undefined items gracefully', () => {
      expect(() => {
        render(<SubMenu {...defaultProps} items={undefined as any} />)
      }).not.toThrow()
    })

    test('should prevent content overflow with long item names', () => {
      const longNameItems = [{
        id: '1',
        name: '매우 긴 프로젝트 이름이 들어가서 오버플로우가 발생할 수 있는 경우를 테스트하는 아이템',
        path: '/projects/1',
        status: 'active' as const
      }]
      
      render(<SubMenu {...defaultProps} items={longNameItems} />)
      
      const itemName = screen.getByText(/매우 긴 프로젝트/)
      expect(itemName).toHaveClass('truncate')
    })
  })

  describe('Performance Optimizations', () => {
    test('should not render when closed', () => {
      const { rerender } = render(<SubMenu {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByTestId('submenu')).not.toBeInTheDocument()
      
      rerender(<SubMenu {...defaultProps} isOpen={true} />)
      expect(screen.getByTestId('submenu')).toBeInTheDocument()
    })

    test('should handle large number of items efficiently', () => {
      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        id: `item-${i}`,
        name: `프로젝트 ${i + 1}`,
        path: `/projects/${i + 1}`,
        status: 'active' as const
      }))
      
      const startTime = performance.now()
      render(<SubMenu {...defaultProps} items={manyItems} />)
      const endTime = performance.now()
      
      // 렌더링이 100ms 이내에 완료되어야 함
      expect(endTime - startTime).toBeLessThan(100)
    })
  })
})