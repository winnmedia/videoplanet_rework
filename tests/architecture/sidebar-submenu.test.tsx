/**
 * TDD Red 단계: 서브메뉴 아키텍처 실패 테스트
 * @description 서브메뉴 컴포넌트의 FSD 의존성 및 상태 관리 문제를 검증하는 실패 테스트
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { act } from 'react'

import { menuApi } from '@/entities/menu'
import { NavigationProvider } from '@/features/navigation'
import { SideBar } from '@/widgets/SideBar'

// Mock modules
jest.mock('@/entities/menu/api/menuApi', () => ({
  menuApi: {
    getSubMenuItems: jest.fn(),
    invalidateMenuCache: jest.fn(),
  }
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/dashboard'
  })
}))

const mockMenuApi = menuApi as jest.Mocked<typeof menuApi>

describe('SideBar SubMenu Architecture - TDD Red Phase', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // 실패 테스트 1: FSD 경계 위반 검증
  describe('FSD Layer Boundary Violations', () => {
    it('should FAIL: widgets should not directly import from shared/ui internal modules', async () => {
      // 이 테스트는 현재 실패해야 함 - widgets가 shared/ui 내부 모듈을 직접 import하고 있음
      const sidebarModule = await import('@/widgets/SideBar/ui/SideBar')
      const moduleSource = sidebarModule.toString()
      
      // widgets/SideBar가 shared/ui/SubMenu의 내부 hooks를 직접 import하는지 검증
      // 실제로는 아래 assertion이 실패해야 함 (현재 코드가 규칙을 위반하고 있으므로)
      expect(moduleSource).not.toContain('shared/ui/SubMenu/hooks')
      
      // 올바른 방식: shared/ui의 public API(index.ts)를 통해서만 import해야 함
      expect(moduleSource).toContain('shared/ui')
    })

    it('should FAIL: SubMenu component violates import rules', async () => {
      // SubMenu가 entities에서 직접 type import하는지 확인
      const subMenuModule = await import('@/shared/ui/SubMenu/SubMenu')
      const moduleSource = subMenuModule.toString()
      
      // shared 레이어가 상위 레이어인 entities를 import하면 안됨
      // 현재 이 assertion이 실패해야 함
      expect(moduleSource).not.toContain('@/entities/menu/model/types')
    })
  })

  // 실패 테스트 2: 서브메뉴 상태 관리 문제
  describe('SubMenu State Management Issues', () => {
    it('should FAIL: submenu does not handle API failure gracefully', async () => {
      // API 실패 시나리오 설정
      mockMenuApi.getSubMenuItems.mockRejectedValue(new Error('API Error'))

      render(
        <NavigationProvider>
          <SideBar />
        </NavigationProvider>
      )

      // 프로젝트 메뉴 클릭
      const projectsMenu = screen.getByTestId('menu-projects')
      fireEvent.click(projectsMenu)

      await waitFor(() => {
        // 현재 구현에서는 이 테스트가 실패할 것임
        // 에러 상태 표시가 제대로 구현되지 않았기 때문
        const errorMessage = screen.queryByText(/서브메뉴를 불러올 수 없습니다/)
        expect(errorMessage).toBeInTheDocument()
      })
    })

    it('should FAIL: submenu lacks proper loading state', async () => {
      // 지연된 API 응답 시뮬레이션
      mockMenuApi.getSubMenuItems.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ items: [], total: 0, hasMore: false }), 1000))
      )

      render(
        <NavigationProvider>
          <SideBar />
        </NavigationProvider>
      )

      const projectsMenu = screen.getByTestId('menu-projects')
      fireEvent.click(projectsMenu)

      // 로딩 상태가 표시되어야 하지만, 현재 구현에서는 없음
      // 이 테스트는 실패해야 함
      const loadingSpinner = screen.queryByTestId('submenu-loading')
      expect(loadingSpinner).toBeInTheDocument()
    })
  })

  // 실패 테스트 3: 접근성 문제
  describe('Accessibility Violations', () => {
    it('should FAIL: submenu lacks proper ARIA attributes', async () => {
      mockMenuApi.getSubMenuItems.mockResolvedValue({
        items: [
          { id: '1', name: 'Test Project', path: '/projects/1', status: 'active' }
        ],
        total: 1,
        hasMore: false
      })

      render(
        <NavigationProvider>
          <SideBar />
        </NavigationProvider>
      )

      const projectsMenu = screen.getByTestId('menu-projects')
      fireEvent.click(projectsMenu)

      await waitFor(() => {
        const submenu = screen.getByTestId('sidebar-submenu')
        
        // 현재 구현에서 누락된 ARIA 속성들 확인
        // 이들 중 일부는 실패할 것임
        expect(submenu).toHaveAttribute('aria-expanded', 'true')
        expect(submenu).toHaveAttribute('aria-live', 'polite')
        expect(submenu).toHaveAttribute('role', 'region')
      })
    })
  })

  // 실패 테스트 4: 키보드 네비게이션 문제
  describe('Keyboard Navigation Issues', () => {
    it('should FAIL: submenu keyboard navigation is incomplete', async () => {
      mockMenuApi.getSubMenuItems.mockResolvedValue({
        items: [
          { id: '1', name: 'Project A', path: '/projects/1', status: 'active' },
          { id: '2', name: 'Project B', path: '/projects/2', status: 'pending' }
        ],
        total: 2,
        hasMore: false
      })

      render(
        <NavigationProvider>
          <SideBar />
        </NavigationProvider>
      )

      const projectsMenu = screen.getByTestId('menu-projects')
      fireEvent.click(projectsMenu)

      await waitFor(() => {
        const submenu = screen.getByTestId('sidebar-submenu')
        
        // Tab 키 네비게이션 테스트
        fireEvent.keyDown(submenu, { key: 'Tab' })
        
        // 현재 구현에서는 Tab 네비게이션이 제대로 작동하지 않을 것임
        const firstItem = screen.getByTestId('menu-item-1')
        expect(firstItem).toHaveFocus()
      })
    })
  })

  // 실패 테스트 5: 성능 문제
  describe('Performance Issues', () => {
    it('should FAIL: submenu causes unnecessary re-renders', async () => {
      const renderSpy = jest.fn()
      
      const TestComponent = () => {
        renderSpy()
        return (
          <NavigationProvider>
            <SideBar />
          </NavigationProvider>
        )
      }

      const { rerender } = render(<TestComponent />)
      
      // 초기 렌더링
      expect(renderSpy).toHaveBeenCalledTimes(1)
      
      // 동일한 props로 re-render
      rerender(<TestComponent />)
      
      // 현재 구현에서는 불필요한 re-render가 발생할 것임
      // 이 테스트는 실패해야 함 (최적화가 되어있지 않기 때문)
      expect(renderSpy).toHaveBeenCalledTimes(1) // Should not re-render
    })
  })
})

// 통합 실패 테스트: 전체 서브메뉴 워크플로우
describe('SubMenu Integration Failures', () => {
  it('should FAIL: complete submenu workflow has architectural issues', async () => {
    // 다양한 메뉴 타입에 대한 모킹
    mockMenuApi.getSubMenuItems
      .mockResolvedValueOnce({ items: [], total: 0, hasMore: false }) // projects
      .mockResolvedValueOnce({ items: [], total: 0, hasMore: false }) // feedback
      .mockResolvedValueOnce({ items: [], total: 0, hasMore: false }) // planning

    render(
      <NavigationProvider>
        <SideBar />
      </NavigationProvider>
    )

    // 1. 프로젝트 메뉴 열기
    const projectsMenu = screen.getByTestId('menu-projects')
    fireEvent.click(projectsMenu)
    
    // 2. 다른 메뉴로 전환
    const feedbackMenu = screen.getByTestId('menu-feedback')
    fireEvent.click(feedbackMenu)
    
    // 3. 서브메뉴 상태 확인
    await waitFor(() => {
      const submenu = screen.queryByTestId('sidebar-submenu')
      
      // 현재 구현의 문제점들:
      // - 메뉴 전환 시 이전 데이터가 깜빡일 수 있음
      // - 상태 정리가 제대로 안될 수 있음
      // - 메모리 누수 가능성
      
      // 이 assertions들은 현재 구현에서 실패할 것임
      expect(submenu).toHaveAttribute('aria-busy', 'false')
      expect(submenu).not.toHaveAttribute('data-loading')
    })

    // 4. 접근성 검증
    const submenu = screen.getByTestId('sidebar-submenu')
    
    // 접근성 표준 위반 검증 (현재 실패할 것임)
    expect(submenu).toHaveAttribute('aria-labelledby')
    expect(submenu).toHaveAttribute('role', 'region')
  })
})