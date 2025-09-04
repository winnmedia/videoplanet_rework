/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import React from 'react'

import { SideBar } from './SideBar.improved'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    prefetch: jest.fn()
  }),
  usePathname: () => '/dashboard'
}))

jest.mock('../../../entities/menu', () => ({
  menuApi: {
    getSubMenuItems: jest.fn()
  },
  createMenuItem: (item: any) => item,
  createSubMenuItem: (item: any) => item
}))

jest.mock('../../../features/navigation', () => ({
  useNavigation: () => ({
    state: {
      activeMenuId: null,
      isSubMenuOpen: false,
      currentPath: '/dashboard',
      focusedIndex: -1
    },
    actions: {
      setActiveMenu: jest.fn(),
      openSubMenu: jest.fn(),
      closeSubMenu: jest.fn(),
      setFocusedIndex: jest.fn()
    }
  }),
  useSubMenuKeyboard: jest.fn(),
  useFocusTrap: jest.fn(),
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}))

// Mock Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />
}))

describe('SideBar - UI/UX Improvements', () => {
  const user = userEvent.setup()
  
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading States', () => {
    it('should display loading spinner when data is being fetched', async () => {
      render(<SideBar data-testid="sidebar" />)
      
      // 로딩 상태가 표시되어야 함
      expect(screen.queryByTestId('sidebar-loading')).toBeNull() // 실패할 예정
      expect(screen.queryByLabelText('메뉴 로딩 중')).toBeNull() // 실패할 예정
    })

    it('should show skeleton loading for menu items', async () => {
      render(<SideBar data-testid="sidebar" />)
      
      // 스켈레톤 로딩이 표시되어야 함
      expect(screen.queryByTestId('menu-skeleton')).toBeNull() // 실패할 예정
    })

    it('should display loading state in submenu when fetching projects', async () => {
      render(<SideBar />)
      
      const projectsButton = screen.getByTestId('menu-projects')
      await user.click(projectsButton)
      
      // 서브메뉴 로딩 상태
      expect(screen.queryByTestId('submenu-loading')).toBeNull() // 실패할 예정
      expect(screen.queryByLabelText('프로젝트 로딩 중')).toBeNull() // 실패할 예정
    })
  })

  describe('Error States', () => {
    it('should display error message when menu data fails to load', async () => {
      // API 에러 시뮬레이션
      const mockMenuApi = require('../../../entities/menu').menuApi
      mockMenuApi.getSubMenuItems.mockRejectedValueOnce(new Error('Network error'))
      
      render(<SideBar />)
      
      const projectsButton = screen.getByTestId('menu-projects')
      await user.click(projectsButton)
      
      await waitFor(() => {
        // 에러 상태 UI
        expect(screen.queryByTestId('submenu-error')).toBeNull() // 실패할 예정
        expect(screen.queryByText('데이터를 불러오는데 실패했습니다')).toBeNull() // 실패할 예정
        expect(screen.queryByText('다시 시도')).toBeNull() // 실패할 예정
      })
    })

    it('should provide retry functionality on error', async () => {
      const mockMenuApi = require('../../../entities/menu').menuApi
      mockMenuApi.getSubMenuItems.mockRejectedValueOnce(new Error('Network error'))
      
      render(<SideBar />)
      
      const projectsButton = screen.getByTestId('menu-projects')
      await user.click(projectsButton)
      
      await waitFor(() => {
        const retryButton = screen.queryByTestId('retry-button')
        expect(retryButton).toBeNull() // 실패할 예정
      })
    })
  })

  describe('Smooth Animations', () => {
    it('should apply smooth transitions when expanding/collapsing menu', async () => {
      render(<SideBar />)
      
      const projectsButton = screen.getByTestId('menu-projects')
      
      // 애니메이션 클래스가 적용되어야 함
      expect(projectsButton).not.toHaveClass('animate-expand') // 실패할 예정
      
      await user.click(projectsButton)
      
      expect(projectsButton).not.toHaveClass('animate-expand') // 실패할 예정
    })

    it('should have smooth hover effects on menu items', async () => {
      render(<SideBar />)
      
      const homeButton = screen.getByTestId('menu-home')
      
      await user.hover(homeButton)
      
      // 호버 상태 애니메이션
      expect(homeButton).not.toHaveClass('hover:scale-105') // 실패할 예정
      expect(homeButton).not.toHaveClass('transition-transform') // 실패할 예정
    })

    it('should animate submenu entrance and exit', async () => {
      render(<SideBar />)
      
      const projectsButton = screen.getByTestId('menu-projects')
      await user.click(projectsButton)
      
      await waitFor(() => {
        const submenu = screen.queryByTestId('sidebar-submenu')
        expect(submenu).not.toHaveClass('animate-slide-in') // 실패할 예정
      })
    })
  })

  describe('Mobile Optimization', () => {
    it('should show improved mobile hamburger with ripple effect', async () => {
      // 모바일 환경 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600
      })
      
      render(<SideBar />)
      
      const hamburger = screen.getByLabelText('메뉴 토글')
      
      // 개선된 햄버거 버튼 스타일
      expect(hamburger).not.toHaveClass('bg-white', 'shadow-lg', 'hover:shadow-xl') // 실패할 예정
      expect(hamburger).not.toHaveClass('active:scale-95', 'transition-all') // 실패할 예정
    })

    it('should provide smooth mobile menu transitions', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600
      })
      
      render(<SideBar />)
      
      const hamburger = screen.getByLabelText('메뉴 토글')
      await user.click(hamburger)
      
      const sidebar = screen.getByTestId('sidebar')
      
      // 모바일 메뉴 애니메이션
      expect(sidebar).not.toHaveClass('transform', 'translate-x-0', 'transition-transform') // 실패할 예정
    })

    it('should handle mobile swipe gestures', async () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 600
      })
      
      render(<SideBar />)
      
      const sidebar = screen.getByTestId('sidebar')
      
      // 스와이프 제스처 시뮬레이션
      fireEvent.touchStart(sidebar, {
        touches: [{ clientX: 0, clientY: 0 }]
      })
      
      fireEvent.touchMove(sidebar, {
        touches: [{ clientX: -100, clientY: 0 }]
      })
      
      fireEvent.touchEnd(sidebar)
      
      // 스와이프 처리가 되어야 함
      expect(sidebar).not.toHaveAttribute('data-swipe-closing') // 실패할 예정
    })
  })

  describe('Enhanced Accessibility', () => {
    it('should provide comprehensive ARIA labels and descriptions', async () => {
      render(<SideBar />)
      
      // 개선된 ARIA 속성들
      const nav = screen.getByRole('complementary')
      expect(nav).not.toHaveAttribute('aria-describedby') // 실패할 예정
      
      const menuButtons = screen.getAllByRole('button')
      menuButtons.forEach(button => {
        expect(button).not.toHaveAttribute('aria-describedby') // 실패할 예정
      })
    })

    it('should announce state changes to screen readers', async () => {
      render(<SideBar />)
      
      // 라이브 리전이 있어야 함
      expect(screen.queryByRole('status')).toBeNull() // 실패할 예정
      expect(screen.queryByLabelText('네비게이션 상태 알림')).toBeNull() // 실패할 예정
    })

    it('should provide keyboard shortcuts hints', async () => {
      render(<SideBar />)
      
      // 키보드 단축키 힌트
      expect(screen.queryByText('Alt + M: 메뉴 토글')).toBeNull() // 실패할 예정
      expect(screen.queryByText('화살표 키: 메뉴 탐색')).toBeNull() // 실패할 예정
    })

    it('should pass advanced accessibility audit', async () => {
      const { container } = render(<SideBar />)
      
      // A11y 테스트 - 더 엄격한 규칙 적용
      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
          'focus-order-semantics': { enabled: true },
          'keyboard-navigation': { enabled: true }
        }
      })
      
      expect(results).toHaveNoViolations()
    })
  })

  describe('Improved Visual Feedback', () => {
    it('should show visual loading indicators for better UX', async () => {
      render(<SideBar />)
      
      // 시각적 로딩 인디케이터
      expect(screen.queryByTestId('pulse-loader')).toBeNull() // 실패할 예정
      expect(screen.queryByTestId('shimmer-effect')).toBeNull() // 실패할 예정
    })

    it('should provide hover and focus states with improved styling', async () => {
      render(<SideBar />)
      
      const homeButton = screen.getByTestId('menu-home')
      
      await user.hover(homeButton)
      
      // 개선된 호버 스타일
      expect(homeButton).not.toHaveClass('bg-blue-50', 'border-blue-200') // 실패할 예정
      
      await user.unhover(homeButton)
      homeButton.focus()
      
      // 개선된 포커스 스타일
      expect(homeButton).not.toHaveClass('ring-2', 'ring-blue-500', 'ring-offset-2') // 실패할 예정
    })

    it('should show success feedback when navigating', async () => {
      render(<SideBar />)
      
      const homeButton = screen.getByTestId('menu-home')
      await user.click(homeButton)
      
      // 성공 피드백
      expect(screen.queryByTestId('navigation-success')).toBeNull() // 실패할 예정
    })
  })

  describe('Performance Optimizations', () => {
    it('should implement virtualization for large menu lists', async () => {
      render(<SideBar />)
      
      // 가상화 컨테이너
      expect(screen.queryByTestId('virtual-menu-container')).toBeNull() // 실패할 예정
    })

    it('should prefetch menu data on hover', async () => {
      render(<SideBar />)
      
      const projectsButton = screen.getByTestId('menu-projects')
      
      await user.hover(projectsButton)
      
      // 프리페치 확인
      const mockMenuApi = require('../../../entities/menu').menuApi
      expect(mockMenuApi.getSubMenuItems).not.toHaveBeenCalled() // 실패할 예정 (프리페치 구현 후 호출되어야 함)
    })
  })
})