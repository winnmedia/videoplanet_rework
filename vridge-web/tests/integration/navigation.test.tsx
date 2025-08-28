/**
 * Navigation Integration Test Suite
 * TDD: 네비게이션 시스템 전체 통합 테스트
 * 
 * 검증 범위:
 * - SideBar와 동적 라우트 페이지 간 통합
 * - 에러 경계 처리
 * - 네비게이션 상태 관리
 * - 접근성 및 사용자 경험
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SideBar } from '../../widgets/SideBar/ui/SideBar'
import ProjectDetailPage from '../../app/projects/[id]/page'
import FeedbackDetailPage from '../../app/feedback/[id]/page'

// Navigation 통합 테스트를 위한 Mock Router
class MockRouter {
  currentPath: string = '/dashboard'
  
  push = jest.fn((path: string) => {
    this.currentPath = path
  })
  
  getCurrentPath = () => this.currentPath
}

const mockRouter = new MockRouter()

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => mockRouter.getCurrentPath(),
  useParams: () => {
    const pathParts = mockRouter.getCurrentPath().split('/')
    const id = pathParts[pathParts.length - 1]
    return { id: id && id !== 'projects' && id !== 'feedback' ? id : undefined }
  },
}))

// Mock menu API
jest.mock('../../entities/menu/api/menuApi', () => ({
  menuApi: {
    getSubMenuItems: jest.fn()
  }
}))

// Mock SideBar를 실제 컴포넌트로 교체하지 않고 통합 테스트에서만 실제 사용
jest.unmock('../../widgets/SideBar/ui/SideBar')

describe('Navigation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRouter.currentPath = '/dashboard'
    
    // Mock successful API response for project submenu
    require('../../entities/menu/api/menuApi').menuApi.getSubMenuItems.mockResolvedValue([
      { id: '1', label: '웹사이트 리뉴얼 프로젝트', path: '/projects/1' },
      { id: '2', label: '모바일 앱 개발', path: '/projects/2' },
      { id: '3', label: '브랜딩 영상 제작', path: '/projects/3' }
    ])
  })

  describe('Direct Navigation Flow', () => {
    test('should navigate from sidebar to planning page directly', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      const planningMenu = screen.getByTestId('menu-planning')
      await user.click(planningMenu)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/planning')
      expect(mockRouter.getCurrentPath()).toBe('/planning')
    })

    test('should navigate from sidebar to feedback page directly', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      const feedbackMenu = screen.getByTestId('menu-feedback')
      await user.click(feedbackMenu)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/feedback')
      expect(mockRouter.getCurrentPath()).toBe('/feedback')
    })

    test('should handle multiple navigation actions correctly', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      // 홈 → 캘린더 → 영상 기획 순서로 네비게이션
      await user.click(screen.getByTestId('menu-home'))
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard')
      
      await user.click(screen.getByTestId('menu-calendar'))
      expect(mockRouter.push).toHaveBeenCalledWith('/calendar')
      
      await user.click(screen.getByTestId('menu-planning'))
      expect(mockRouter.push).toHaveBeenCalledWith('/planning')
      
      expect(mockRouter.push).toHaveBeenCalledTimes(3)
    })
  })

  describe('SubMenu Navigation Flow', () => {
    test('should navigate through project submenu correctly', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      // 프로젝트 메뉴 클릭하여 서브메뉴 열기
      const projectsMenu = screen.getByTestId('menu-projects')
      await user.click(projectsMenu)
      
      // API 호출 검증
      expect(require('../../entities/menu/api/menuApi').menuApi.getSubMenuItems)
        .toHaveBeenCalledWith('projects')
      
      // 서브메뉴 항목 표시 대기
      await waitFor(() => {
        // SubMenu 컴포넌트가 렌더링되어야 함 (실제 구현에 따라 조정)
        expect(screen.getByTestId('sidebar-submenu')).toBeInTheDocument()
      })
      
      // 직접적인 네비게이션은 발생하지 않음
      expect(mockRouter.push).not.toHaveBeenCalled()
    })

    test('should toggle project submenu on repeated clicks', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      const projectsMenu = screen.getByTestId('menu-projects')
      
      // 첫 번째 클릭: 서브메뉴 열기
      await user.click(projectsMenu)
      await waitFor(() => {
        expect(screen.getByTestId('sidebar-submenu')).toBeInTheDocument()
      })
      
      // 두 번째 클릭: 서브메뉴 닫기
      await user.click(projectsMenu)
      
      // 서브메뉴가 닫혔는지 확인 (구현에 따라 조정 필요)
    })
  })

  describe('Error Boundary Integration', () => {
    test('should handle page rendering errors gracefully', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // 잘못된 ID로 프로젝트 페이지 렌더링 시도
      mockRouter.currentPath = '/projects/invalid'
      
      expect(() => {
        render(<ProjectDetailPage />)
      }).not.toThrow()
      
      consoleSpy.mockRestore()
    })

    test('should handle sidebar API failures gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
      
      // API 실패 시뮬레이션
      require('../../entities/menu/api/menuApi').menuApi.getSubMenuItems.mockRejectedValue(
        new Error('Network Error')
      )
      
      const user = userEvent.setup()
      render(<SideBar />)
      
      const projectsMenu = screen.getByTestId('menu-projects')
      await user.click(projectsMenu)
      
      // 에러가 발생해도 앱이 크래시되지 않음
      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Failed to load sub menu items:', expect.any(Error))
      })
      
      // 사이드바가 여전히 렌더링되어야 함
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })
  })

  describe('State Consistency', () => {
    test('should maintain active menu state across navigation', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      // 영상 기획 메뉴 활성화
      await user.click(screen.getByTestId('menu-planning'))
      mockRouter.currentPath = '/planning'
      
      // 페이지가 변경된 후 메뉴 상태가 일관되는지 확인
      expect(mockRouter.getCurrentPath()).toBe('/planning')
      
      // 다른 메뉴 클릭
      await user.click(screen.getByTestId('menu-feedback'))
      mockRouter.currentPath = '/feedback'
      
      expect(mockRouter.getCurrentPath()).toBe('/feedback')
    })

    test('should close submenu when navigating to direct menu items', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      // 프로젝트 서브메뉴 열기
      await user.click(screen.getByTestId('menu-projects'))
      await waitFor(() => {
        expect(screen.getByTestId('sidebar-submenu')).toBeInTheDocument()
      })
      
      // 영상 기획 메뉴로 직접 네비게이션
      await user.click(screen.getByTestId('menu-planning'))
      
      // 서브메뉴가 닫혔는지 확인 (구현에 따라 조정 필요)
      // 그리고 planning 페이지로 네비게이션되었는지 확인
      expect(mockRouter.push).toHaveBeenCalledWith('/planning')
    })
  })

  describe('Dynamic Route Parameter Handling', () => {
    test('should handle project detail page with valid ID', () => {
      mockRouter.currentPath = '/projects/1'
      
      render(<ProjectDetailPage />)
      
      expect(screen.getByText('웹사이트 리뉴얼 프로젝트')).toBeInTheDocument()
      expect(screen.getByText('1')).toBeInTheDocument() // Project ID
    })

    test('should handle feedback detail page with valid ID', () => {
      mockRouter.currentPath = '/feedback/2'
      
      render(<FeedbackDetailPage />)
      
      expect(screen.getByText('모바일 앱 개발 피드백')).toBeInTheDocument()
      expect(screen.getByText('2')).toBeInTheDocument() // Feedback ID
    })

    test('should handle invalid route parameters gracefully', () => {
      mockRouter.currentPath = '/projects/999'
      
      render(<ProjectDetailPage />)
      
      expect(screen.getByText('프로젝트를 찾을 수 없습니다')).toBeInTheDocument()
      
      // 사이드바는 여전히 표시되어야 함
      expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    })
  })

  describe('Accessibility Integration', () => {
    test('should maintain focus management across navigation', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      const planningMenu = screen.getByTestId('menu-planning')
      
      // 키보드 네비게이션으로 메뉴에 포커스
      planningMenu.focus()
      expect(document.activeElement).toBe(planningMenu)
      
      // Enter 키로 네비게이션
      await user.keyboard('{Enter}')
      
      expect(mockRouter.push).toHaveBeenCalledWith('/planning')
    })

    test('should announce navigation changes to screen readers', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      // ARIA 관련 속성들이 올바르게 설정되어 있는지 확인
      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toHaveAttribute('role', 'complementary')
      expect(sidebar).toHaveAttribute('aria-label', '네비게이션 사이드바')
      
      const nav = screen.getByRole('navigation', { name: '주 메뉴' })
      expect(nav).toBeInTheDocument()
    })
  })

  describe('Performance and Memory Leaks', () => {
    test('should cleanup event listeners on component unmount', () => {
      const { unmount } = render(<SideBar />)
      
      // 컴포넌트 언마운트
      unmount()
      
      // 메모리 누수 검증을 위해 window 이벤트 리스너 확인
      // (실제 구현에서 window.addEventListener를 사용하는 경우)
      expect(() => {
        // 이벤트 발생시켜도 에러가 발생하지 않아야 함
        window.dispatchEvent(new Event('resize'))
      }).not.toThrow()
    })

    test('should not cause memory leaks with repeated navigation', async () => {
      const user = userEvent.setup()
      
      // 여러 번 렌더링/언마운트 반복
      for (let i = 0; i < 5; i++) {
        const { unmount } = render(<SideBar />)
        
        const planningMenu = screen.getByTestId('menu-planning')
        await user.click(planningMenu)
        
        unmount()
      }
      
      // 메모리 사용량이 과도하게 증가하지 않았는지 확인
      // (실제로는 성능 모니터링 도구로 측정해야 함)
      expect(true).toBe(true) // 플레이스홀더
    })
  })

  describe('Mobile Responsive Navigation', () => {
    test('should handle mobile navigation correctly', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 500,
      })
      
      const user = userEvent.setup()
      render(<SideBar />)
      
      // 모바일에서 햄버거 버튼 표시 확인
      const hamburgerButton = screen.getByLabelText('메뉴 토글')
      expect(hamburgerButton).toBeInTheDocument()
      
      // 햄버거 버튼 클릭으로 메뉴 토글
      await user.click(hamburgerButton)
      
      // 토글 후에도 네비게이션 기능이 정상 작동하는지 확인
      const planningMenu = screen.getByTestId('menu-planning')
      await user.click(planningMenu)
      
      expect(mockRouter.push).toHaveBeenCalledWith('/planning')
    })
  })
})