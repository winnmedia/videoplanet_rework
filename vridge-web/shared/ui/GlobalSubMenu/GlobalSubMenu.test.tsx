import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { GlobalSubMenu } from './GlobalSubMenu'

const mockMenuItems = [
  { id: 'item-1', name: '첫 번째 항목', path: '/item-1' },
  { id: 'item-2', name: '두 번째 항목', path: '/item-2' },
  { id: 'item-3', name: '세 번째 항목', path: '/item-3' }
]

describe('GlobalSubMenu', () => {
  const mockOnClose = vi.fn()
  const mockOnItemClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('기본 렌더링', () => {
    it('isOpen이 false일 때 메뉴가 숨겨진다', () => {
      render(
        <GlobalSubMenu
          isOpen={false}
          title="테스트 메뉴"
          items={mockMenuItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const menu = screen.queryByRole('menu')
      expect(menu).not.toBeInTheDocument()
    })

    it('isOpen이 true일 때 메뉴가 표시된다', () => {
      render(
        <GlobalSubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockMenuItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const menu = screen.getByRole('menu')
      expect(menu).toBeInTheDocument()
      expect(screen.getByText('테스트 메뉴')).toBeInTheDocument()
    })

    it('모든 메뉴 항목이 렌더링된다', () => {
      render(
        <GlobalSubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockMenuItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      mockMenuItems.forEach(item => {
        expect(screen.getByText(item.name)).toBeInTheDocument()
      })
    })
  })

  describe('접근성 (Accessibility)', () => {
    it('적절한 ARIA 속성이 설정된다', () => {
      render(
        <GlobalSubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockMenuItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const menu = screen.getByRole('menu')
      expect(menu).toHaveAttribute('aria-label', '테스트 메뉴')
      expect(menu).toHaveAttribute('aria-orientation', 'vertical')
      
      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems).toHaveLength(mockMenuItems.length)
    })

    it('메뉴가 열릴 때 첫 번째 항목에 포커스된다', () => {
      render(
        <GlobalSubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockMenuItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const firstMenuItem = screen.getAllByRole('menuitem')[0]
      expect(firstMenuItem).toHaveFocus()
    })

    it('투명도 90%가 적용된다', () => {
      render(
        <GlobalSubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockMenuItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const menu = screen.getByRole('menu')
      expect(menu).toHaveClass('bg-white/90')
    })
  })

  describe('키보드 상호작용', () => {
    it('ESC 키로 메뉴를 닫을 수 있다', async () => {
      const user = userEvent.setup()
      
      render(
        <GlobalSubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockMenuItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      await user.keyboard('{Escape}')
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('화살표 키로 메뉴 항목 간 이동할 수 있다', async () => {
      const user = userEvent.setup()
      
      render(
        <GlobalSubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockMenuItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const menuItems = screen.getAllByRole('menuitem')
      
      // 첫 번째 항목에 포커스
      expect(menuItems[0]).toHaveFocus()
      
      // 아래 화살표로 다음 항목 이동
      await user.keyboard('{ArrowDown}')
      expect(menuItems[1]).toHaveFocus()
      
      // 위 화살표로 이전 항목 이동
      await user.keyboard('{ArrowUp}')
      expect(menuItems[0]).toHaveFocus()
    })

    it('Enter 키로 메뉴 항목을 선택할 수 있다', async () => {
      const user = userEvent.setup()
      
      render(
        <GlobalSubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockMenuItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const firstMenuItem = screen.getAllByRole('menuitem')[0]
      firstMenuItem.focus()
      
      await user.keyboard('{Enter}')
      expect(mockOnItemClick).toHaveBeenCalledWith(mockMenuItems[0])
    })

    it('Tab 키로 포커스 트랩이 작동한다', async () => {
      const user = userEvent.setup()
      
      render(
        <GlobalSubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockMenuItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const menuItems = screen.getAllByRole('menuitem')
      const closeButton = screen.getByLabelText('메뉴 닫기')
      
      // 첫 번째 항목에서 시작
      expect(menuItems[0]).toHaveFocus()
      
      // Tab으로 모든 항목 순회 후 닫기 버튼으로
      await user.tab()
      expect(menuItems[1]).toHaveFocus()
      
      await user.tab()
      expect(menuItems[2]).toHaveFocus()
      
      await user.tab()
      expect(closeButton).toHaveFocus()
      
      // 다시 Tab하면 첫 번째 항목으로 돌아감 (포커스 트랩)
      await user.tab()
      expect(menuItems[0]).toHaveFocus()
    })
  })

  describe('마우스 상호작용', () => {
    it('메뉴 항목 클릭 시 onItemClick이 호출된다', async () => {
      const user = userEvent.setup()
      
      render(
        <GlobalSubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockMenuItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const firstMenuItem = screen.getByText('첫 번째 항목')
      await user.click(firstMenuItem)
      
      expect(mockOnItemClick).toHaveBeenCalledWith(mockMenuItems[0])
    })

    it('바깥 영역 클릭 시 메뉴가 닫힌다', async () => {
      const user = userEvent.setup()
      
      render(
        <div data-testid="outside-area">
          <GlobalSubMenu
            isOpen={true}
            title="테스트 메뉴"
            items={mockMenuItems}
            onClose={mockOnClose}
            onItemClick={mockOnItemClick}
          />
        </div>
      )

      const outsideArea = screen.getByTestId('outside-area')
      await user.click(outsideArea)
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('닫기 버튼 클릭 시 메뉴가 닫힌다', async () => {
      const user = userEvent.setup()
      
      render(
        <GlobalSubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockMenuItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const closeButton = screen.getByLabelText('메뉴 닫기')
      await user.click(closeButton)
      
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('빈 상태', () => {
    it('항목이 없을 때 빈 상태 메시지를 표시한다', () => {
      render(
        <GlobalSubMenu
          isOpen={true}
          title="빈 메뉴"
          items={[]}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      expect(screen.getByText('항목이 없습니다')).toBeInTheDocument()
    })
  })

  describe('다크 모드', () => {
    it('다크 모드에서도 투명도가 일관되게 적용된다', () => {
      // 다크 모드 클래스 설정
      document.documentElement.className = 'dark'
      
      render(
        <GlobalSubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockMenuItems}
          onClose={mockOnClose}
          onItemClick={mockOnItemClick}
        />
      )

      const menu = screen.getByRole('menu')
      // 다크 모드에서도 90% 투명도 유지
      expect(menu).toHaveClass('dark:bg-gray-900/90')
      
      // 클린업
      document.documentElement.className = ''
    })
  })
})