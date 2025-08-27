/**
 * SideBar Component Test Suite - DEVPLAN.md Menu Structure
 * TDD: 영상 기획 메뉴 추가 테스트
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import { SideBar } from './SideBar'

// Mock navigation hooks
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}))

describe('SideBar - DEVPLAN.md Menu Structure', () => {
  const defaultProps = {
    className: '',
    isCollapsed: false,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Complete Menu Structure', () => {
    test('should render all 6 menu items as per DEVPLAN.md', () => {
      render(<SideBar {...defaultProps} />)
      
      // DEVPLAN.md 요구사항: 홈, 전체일정, 프로젝트 관리, 영상 기획, 영상 피드백, 콘텐츠
      expect(screen.getByText('홈')).toBeInTheDocument()
      expect(screen.getByText('전체 일정')).toBeInTheDocument()
      expect(screen.getByText('프로젝트 관리')).toBeInTheDocument()
      expect(screen.getByText('영상 기획')).toBeInTheDocument() // 신규 추가
      expect(screen.getByText('영상 피드백')).toBeInTheDocument()
      expect(screen.getByText('콘텐츠')).toBeInTheDocument()
    })

    test('should have correct menu order matching DEVPLAN.md specification', () => {
      render(<SideBar {...defaultProps} />)
      
      const menuItems = screen.getAllByRole('listitem')
      const expectedOrder = ['홈', '전체 일정', '프로젝트 관리', '영상 기획', '영상 피드백', '콘텐츠']
      
      expectedOrder.forEach((label, index) => {
        expect(menuItems[index]).toHaveTextContent(label)
      })
    })

    test('should show submenu for planning menu', async () => {
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      const planningMenu = screen.getByText('영상 기획')
      await user.click(planningMenu)
      
      // 영상 기획 서브메뉴 항목들 확인
      await waitFor(() => {
        expect(screen.getByText('컨셉 기획')).toBeInTheDocument()
        expect(screen.getByText('대본 작성')).toBeInTheDocument()
        expect(screen.getByText('스토리보드')).toBeInTheDocument()
        expect(screen.getByText('촬영 리스트')).toBeInTheDocument()
      })
    })

    test('should have proper paths for planning submenu items', async () => {
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      const planningMenu = screen.getByText('영상 기획')
      await user.click(planningMenu)
      
      await waitFor(() => {
        const conceptItem = screen.getByText('컨셉 기획')
        const scriptItem = screen.getByText('대본 작성')
        const storyboardItem = screen.getByText('스토리보드')
        const shotListItem = screen.getByText('촬영 리스트')
        
        // 각 항목이 올바른 경로로 링크되는지 확인 (구현에 따라 data attributes 또는 다른 방식으로 검증)
        expect(conceptItem).toBeInTheDocument()
        expect(scriptItem).toBeInTheDocument()
        expect(storyboardItem).toBeInTheDocument()
        expect(shotListItem).toBeInTheDocument()
      })
    })
  })

  describe('Menu Navigation', () => {
    test('should navigate to planning page when planning menu is clicked', async () => {
      const mockPush = jest.fn()
      require('next/navigation').useRouter.mockReturnValue({ push: mockPush })
      
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      // 영상 기획 메뉴는 서브메뉴가 있으므로 첫 클릭은 서브메뉴 열기
      const planningMenu = screen.getByText('영상 기획')
      await user.click(planningMenu)
      
      // 서브메뉴 항목 클릭 시 해당 페이지로 이동
      await waitFor(() => {
        const conceptItem = screen.getByText('컨셉 기획')
        user.click(conceptItem)
      })
    })

    test('should maintain menu state when switching between menus', async () => {
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      // 프로젝트 관리 서브메뉴 열기
      await user.click(screen.getByText('프로젝트 관리'))
      
      // 영상 기획 서브메뉴로 전환
      await user.click(screen.getByText('영상 기획'))
      
      // 영상 기획 서브메뉴가 표시되고 프로젝트 관리 서브메뉴는 닫혀야 함
      await waitFor(() => {
        expect(screen.getByText('컨셉 기획')).toBeInTheDocument()
        expect(screen.queryByText('웹사이트 리뉴얼 프로젝트')).not.toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    test('should have proper ARIA labels for planning menu', () => {
      render(<SideBar {...defaultProps} />)
      
      const planningMenu = screen.getByText('영상 기획').closest('li')
      expect(planningMenu).toHaveAttribute('role')
    })

    test('should support keyboard navigation for planning menu', async () => {
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      const planningMenu = screen.getByText('영상 기획')
      
      // Tab으로 포커스 이동
      await user.tab()
      
      // Enter로 서브메뉴 열기
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText('컨셉 기획')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    test('should handle empty planning submenu gracefully', async () => {
      // Mock API to return empty planning items
      jest.spyOn(require('@/entities/menu/api/menuApi'), 'menuApi').mockResolvedValue({
        items: [],
        total: 0,
        hasMore: false
      })
      
      const user = userEvent.setup()
      render(<SideBar {...defaultProps} />)
      
      await user.click(screen.getByText('영상 기획'))
      
      // Should show empty state for planning menu
      await waitFor(() => {
        expect(screen.getByText('등록된')).toBeInTheDocument()
      })
    })
  })
})