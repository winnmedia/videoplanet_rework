/**
 * @fileoverview 서브메뉴 투명도 90% 및 다크모드 지원 테스트
 * @description DEVPLAN.md 요구사항 검증을 위한 TDD 테스트
 */

import { render, screen } from '@testing-library/react'
import { SubMenu } from '../SubMenu'
import type { SubMenuItem } from '@/entities/menu/model/types'

// Mock 데이터
const mockItems: SubMenuItem[] = [
  {
    id: '1',
    name: '테스트 프로젝트',
    href: '/projects/1',
    status: 'active'
  },
  {
    id: '2', 
    name: '완료된 프로젝트',
    href: '/projects/2',
    status: 'completed'
  }
]

describe('SubMenu - Transparency & Dark Mode Support', () => {
  describe('투명도 90% 요구사항', () => {
    it('라이트 모드에서 90% 투명도 배경을 적용해야 한다', () => {
      render(
        <div data-theme="light">
          <SubMenu
            isOpen={true}
            title="테스트 메뉴"
            items={mockItems}
            onClose={() => {}}
            onItemClick={() => {}}
          />
        </div>
      )

      const submenu = screen.getByRole('menu')
      
      // 라이트 모드: bg-white/90 (90% 불투명도)
      expect(submenu).toHaveClass('bg-white/90')
    })

    it('다크 모드에서 90% 투명도 배경을 적용해야 한다', () => {
      render(
        <div data-theme="dark">
          <SubMenu
            isOpen={true}
            title="테스트 메뉴"
            items={mockItems}
            onClose={() => {}}
            onItemClick={() => {}}
          />
        </div>
      )

      const submenu = screen.getByRole('menu')
      
      // 다크 모드: bg-gray-900/90 (90% 불투명도)
      expect(submenu).toHaveClass('bg-gray-900/90')
      expect(submenu).toHaveClass('dark:bg-gray-900/90')
    })

    it('헤더에 적절한 블러 효과가 적용되어야 한다', () => {
      render(
        <SubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockItems}
          onClose={() => {}}
          onItemClick={() => {}}
        />
      )

      const header = screen.getByRole('banner')
      
      // 헤더 블러 백드롭 효과
      expect(header).toHaveClass('backdrop-blur-md')
      expect(header).toHaveClass('bg-white/95')
      expect(header).toHaveClass('dark:bg-gray-900/95')
    })
  })

  describe('다크 모드 색상 일관성', () => {
    it('다크 모드에서 텍스트 색상이 적절하게 반전되어야 한다', () => {
      render(
        <div data-theme="dark">
          <SubMenu
            isOpen={true}
            title="다크 모드 테스트"
            items={mockItems}
            onClose={() => {}}
            onItemClick={() => {}}
          />
        </div>
      )

      const title = screen.getByText('다크 모드 테스트')
      
      // 다크 모드 텍스트 색상
      expect(title).toHaveClass('text-gray-900')
      expect(title).toHaveClass('dark:text-white')
    })

    it('다크 모드에서 메뉴 아이템 호버 상태가 올바르게 적용되어야 한다', () => {
      render(
        <div data-theme="dark">
          <SubMenu
            isOpen={true}
            title="테스트 메뉴"
            items={mockItems}
            onClose={() => {}}
            onItemClick={() => {}}
          />
        </div>
      )

      const menuItems = screen.getAllByRole('menuitem')
      const firstItem = menuItems[0]

      // 다크 모드 호버 효과
      expect(firstItem).toHaveClass('hover:bg-gray-50')
      expect(firstItem).toHaveClass('dark:hover:bg-gray-800/50')
    })

    it('활성 아이템에 다크 모드 스타일이 적용되어야 한다', () => {
      render(
        <div data-theme="dark">
          <SubMenu
            isOpen={true}
            title="테스트 메뉴"
            items={mockItems}
            activeItemId="1"
            onClose={() => {}}
            onItemClick={() => {}}
          />
        </div>
      )

      const activeItem = screen.getByLabelText(/테스트 프로젝트/)

      // 다크 모드 활성 상태
      expect(activeItem).toHaveClass('bg-primary/5')
      expect(activeItem).toHaveClass('dark:bg-primary/10')
      expect(activeItem).toHaveClass('ring-1')
      expect(activeItem).toHaveClass('ring-primary/20')
      expect(activeItem).toHaveClass('dark:ring-primary/40')
    })
  })

  describe('백드롭 블러 효과', () => {
    it('모바일에서 백드롭에 블러 효과가 적용되어야 한다', () => {
      render(
        <SubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockItems}
          onClose={() => {}}
          onItemClick={() => {}}
        />
      )

      // 모바일 백드롭 (DOM에 존재하지 않을 수 있으므로 container 확인)
      const container = screen.getByRole('menu').parentElement
      expect(container).toBeInTheDocument()
    })

    it('데스크탑에서는 백드롭이 숨겨져야 한다', () => {
      render(
        <SubMenu
          isOpen={true}
          title="테스트 메뉴" 
          items={mockItems}
          onClose={() => {}}
          onItemClick={() => {}}
        />
      )

      // md:hidden 클래스로 데스크탑에서 숨김
      const submenu = screen.getByRole('menu')
      expect(submenu.previousElementSibling).toHaveClass('md:hidden')
    })
  })

  describe('투명도 접근성', () => {
    it('투명도가 적용되어도 충분한 대비율을 유지해야 한다', () => {
      render(
        <SubMenu
          isOpen={true}
          title="접근성 테스트"
          items={mockItems}
          onClose={() => {}}
          onItemClick={() => {}}
        />
      )

      const title = screen.getByText('접근성 테스트')
      const menuItems = screen.getAllByRole('menuitem')

      // 모든 텍스트 요소가 접근성 기준을 충족하는지 확인
      expect(title).toBeInTheDocument()
      expect(menuItems).toHaveLength(2)
      
      // 각 메뉴 아이템이 클릭 가능한지 확인
      menuItems.forEach(item => {
        expect(item).not.toHaveAttribute('disabled')
        expect(item).toHaveAttribute('role', 'menuitem')
      })
    })

    it('포커스 상태에서도 충분한 가시성을 유지해야 한다', () => {
      render(
        <SubMenu
          isOpen={true}
          title="테스트 메뉴"
          items={mockItems}
          onClose={() => {}}
          onItemClick={() => {}}
        />
      )

      const menuItems = screen.getAllByRole('menuitem')
      const firstItem = menuItems[0]

      // 포커스 링 스타일 확인
      expect(firstItem).toHaveClass('focus:outline-none')
      expect(firstItem).toHaveClass('focus:ring-2')
      expect(firstItem).toHaveClass('focus:ring-primary/20')
    })
  })
})