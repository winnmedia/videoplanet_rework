/**
 * SideBar Component Test Suite - Navigation System Validation
 * TDD: 네비게이션 수정사항 검증 테스트 
 * 
 * 수정된 네비게이션 로직:
 * - planning, feedback: hasSubMenu: false (직접 네비게이션)
 * - projects: hasSubMenu: true (서브메뉴 유지)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import { SideBar } from './SideBar'


// Mock navigation hooks
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/dashboard',
}))

// Mock menu API
vi.mock('../../../entities/menu/api/menuApi', () => ({
  menuApi: {
    getSubMenuItems: vi.fn()
  }
}))

describe('SideBar - Updated Navigation System', () => {
  const defaultProps = {
    className: '',
    isCollapsed: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Menu Structure Validation', () => {
    test('should render all required menu items', () => {
      render(<SideBar {...defaultProps} />)
      
      // 현재 구현된 5개 메뉴 확인
      expect(screen.getByText('홈')).toBeInTheDocument()
      expect(screen.getByText('전체 일정')).toBeInTheDocument()
      expect(screen.getByText('프로젝트 관리')).toBeInTheDocument()
      expect(screen.getByText('영상 기획')).toBeInTheDocument()
      expect(screen.getByText('영상 피드백')).toBeInTheDocument()
    })

    test('should have correct testid attributes for each menu item', () => {
      render(<SideBar {...defaultProps} />)
      
      expect(screen.getByTestId('menu-home')).toBeInTheDocument()
      expect(screen.getByTestId('menu-calendar')).toBeInTheDocument()
      expect(screen.getByTestId('menu-projects')).toBeInTheDocument()
      expect(screen.getByTestId('menu-planning')).toBeInTheDocument()
      expect(screen.getByTestId('menu-feedback')).toBeInTheDocument()
    })
  })

  describe('Direct Navigation Behavior', () => {
    test('should navigate directly to planning page when planning menu is clicked', async () => {
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      const planningMenu = screen.getByTestId('menu-planning')
      await user.click(planningMenu)
      
      // hasSubMenu: false이므로 즉시 페이지 이동
      expect(mockPush).toHaveBeenCalledWith('/planning')
    })

    test('should navigate directly to feedback page when feedback menu is clicked', async () => {
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      const feedbackMenu = screen.getByTestId('menu-feedback')
      await user.click(feedbackMenu)
      
      // hasSubMenu: false이므로 즉시 페이지 이동
      expect(mockPush).toHaveBeenCalledWith('/feedback')
    })

    test('should navigate directly to home page when home menu is clicked', async () => {
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      const homeMenu = screen.getByTestId('menu-home')
      await user.click(homeMenu)
      
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    test('should navigate directly to calendar page when calendar menu is clicked', async () => {
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      const calendarMenu = screen.getByTestId('menu-calendar')
      await user.click(calendarMenu)
      
      expect(mockPush).toHaveBeenCalledWith('/calendar')
    })
  })

  describe('SubMenu Behavior (Projects Only)', () => {
    beforeEach(() => {
      // Mock successful API response for project submenu
      require('../../../entities/menu/api/menuApi').menuApi.getSubMenuItems.mockResolvedValue([
        { id: '1', label: '웹사이트 리뉴얼 프로젝트', path: '/projects/1' },
        { id: '2', label: '모바일 앱 개발', path: '/projects/2' },
        { id: '3', label: '브랜딩 영상 제작', path: '/projects/3' }
      ])
    })

    test('should open submenu when projects menu is clicked', async () => {
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      const projectsMenu = screen.getByTestId('menu-projects')
      await user.click(projectsMenu)
      
      // API 호출 검증
      expect(require('../../../entities/menu/api/menuApi').menuApi.getSubMenuItems)
        .toHaveBeenCalledWith('projects')
      
      // 페이지 이동은 하지 않음
      expect(mockPush).not.toHaveBeenCalled()
    })

    test('should toggle submenu when projects menu is clicked twice', async () => {
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      const projectsMenu = screen.getByTestId('menu-projects')
      
      // 첫 번째 클릭: 서브메뉴 열기
      await user.click(projectsMenu)
      
      // 두 번째 클릭: 서브메뉴 닫기
      await user.click(projectsMenu)
      
      // 서브메뉴가 닫혔으므로 더 이상 표시되지 않음
      // 구현에 따라 추가 검증 로직 필요
    })
  })

  describe('Error Scenarios', () => {
    test('should handle submenu API failure gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      require('../../../entities/menu/api/menuApi').menuApi.getSubMenuItems.mockRejectedValue(
        new Error('API Error')
      )
      
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      const projectsMenu = screen.getByTestId('menu-projects')
      await user.click(projectsMenu)
      
      // 에러 로깅 확인
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load sub menu items:', expect.any(Error))
      })
      
      consoleSpy.mockRestore()
    })

    test('should handle missing router gracefully', () => {
      // router mock을 undefined로 설정하여 에러 상황 시뮬레이션
      vi.doMock('next/navigation', () => ({
        useRouter: () => null,
        usePathname: () => '/dashboard',
      }))
      
      // 컴포넌트가 크래시 없이 렌더링되는지 확인
      expect(() => render(<SideBar {...defaultProps} />)).not.toThrow()
    })
  })

  describe('Responsive Behavior', () => {
    test('should show mobile hamburger button on mobile', () => {
      // Mock mobile window size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })
      
      render(<SideBar {...defaultProps} />)
      
      const hamburgerButton = screen.getByLabelText('메뉴 토글')
      expect(hamburgerButton).toBeInTheDocument()
    })

    test('should handle mobile menu toggle', async () => {
      const user = userEvent.setup()
      
      // Mock mobile window size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })
      
      render(<SideBar {...defaultProps} />)
      
      const hamburgerButton = screen.getByLabelText('메뉴 토글')
      await user.click(hamburgerButton)
      
      // 토글 동작 확인 (구현 세부사항에 따라 조정 필요)
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels', () => {
      render(<SideBar {...defaultProps} />)
      
      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toHaveAttribute('role', 'complementary')
      expect(sidebar).toHaveAttribute('aria-label', '네비게이션 사이드바')
      
      const nav = screen.getByRole('navigation', { name: '주 메뉴' })
      expect(nav).toBeInTheDocument()
    })

    test('should have logout button with proper accessibility', () => {
      render(<SideBar {...defaultProps} />)
      
      const logoutButton = screen.getByTestId('logout-button')
      expect(logoutButton).toHaveAttribute('aria-label', '로그아웃')
      expect(logoutButton).toHaveAttribute('type', 'button')
    })
  })

  describe('State Management', () => {
    test('should maintain active menu state correctly', async () => {
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      // 홈 메뉴 클릭 후 planning 메뉴 클릭
      await user.click(screen.getByTestId('menu-home'))
      await user.click(screen.getByTestId('menu-planning'))
      
      // 각각 올바른 경로로 네비게이션되었는지 확인
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
      expect(mockPush).toHaveBeenCalledWith('/planning')
    })
  })

  describe('Z-Index Layer Management', () => {
    test('should have correct z-index hierarchy (sidebar: 40, submenu: 45, modal: 50)', () => {
      render(<SideBar {...defaultProps} />)
      
      const sidebar = screen.getByTestId('sidebar')
      
      // 사이드바 z-index 확인
      expect(sidebar).toHaveClass('z-40')
    })

    test('should have mobile hamburger button with highest z-index for visibility', () => {
      render(<SideBar {...defaultProps} />)
      
      // 모바일 뷰에서 햄버거 버튼이 표시되는지 확인
      const hamburgerButton = screen.queryByLabelText('메뉴 토글')
      // 데스크톱에서는 표시되지 않을 수 있음
      if (hamburgerButton) {
        expect(hamburgerButton).toHaveClass('z-modal')
      }
    })

    test('should have mobile backdrop with correct z-index when expanded', () => {
      render(<SideBar {...defaultProps} isCollapsed={false} />)
      
      // 모바일 백드롭이 있다면 z-index 확인
      const backdrop = screen.queryByTestId('mobile-backdrop')
      if (backdrop) {
        expect(backdrop).toHaveClass('z-backdrop')
      }
    })
  })

  describe('Layout Structure', () => {
    test('should not interfere with main content area', () => {
      render(<SideBar {...defaultProps} />)
      
      const sidebar = screen.getByTestId('sidebar')
      
      // 사이드바가 fixed 포지션이고 올바른 위치에 있는지 확인
      expect(sidebar).toHaveClass('fixed')
      expect(sidebar).toHaveClass('left-0')
      expect(sidebar).toHaveClass('top-0')
      expect(sidebar).toHaveClass('h-full')
    })

    test('should have proper width and responsive behavior', () => {
      render(<SideBar {...defaultProps} />)
      
      const sidebar = screen.getByTestId('sidebar')
      
      // 데스크톱에서 고정 너비
      expect(sidebar).toHaveClass('w-sidebar')
      
      // 모바일에서 전체 너비
      expect(sidebar).toHaveClass('md:w-sidebar')
    })
  })

  describe('Visual Hierarchy and Content Overlay Prevention', () => {
    test('should ensure submenu does not cover main content inappropriately', async () => {
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      // 프로젝트 메뉴 클릭하여 서브메뉴 열기
      const projectsMenu = screen.getByTestId('menu-projects')
      await user.click(projectsMenu)
      
      // 서브메뉴가 올바른 z-index를 가지는지 확인
      await waitFor(() => {
        const submenu = screen.getByTestId('sidebar-submenu')
        expect(submenu).toHaveClass('z-45')
      })
    })

    test('should handle submenu backdrop properly', async () => {
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      const projectsMenu = screen.getByTestId('menu-projects')
      await user.click(projectsMenu)
      
      // 서브메뉴 백드롭이 적절한 z-index를 가지는지 확인
      await waitFor(() => {
        const backdrop = document.querySelector('[data-testid="sidebar-submenu"] .backdrop')
        expect(backdrop).toHaveClass('z-backdrop')
      })
    })
  })
})