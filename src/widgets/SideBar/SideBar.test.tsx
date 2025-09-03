import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { SideBar } from './SideBar'

expect.extend(toHaveNoViolations)

// 기본 메뉴 구조 목 데이터
const mockMenuItems = [
  { id: 'dashboard', label: '대시보드', href: '/dashboard', icon: 'dashboard' },
  { id: 'projects', label: '프로젝트', href: '/projects', icon: 'projects' },
  { id: 'calendar', label: '캘린더', href: '/calendar', icon: 'calendar' },
  { id: 'feedback', label: '피드백', href: '/feedback', icon: 'feedback' },
]

describe('SideBar Widget', () => {
  describe('렌더링 및 기본 구조', () => {
    it('메뉴 아이템들이 올바르게 렌더링되어야 함', () => {
      render(<SideBar menuItems={mockMenuItems} />)
      
      expect(screen.getByText('대시보드')).toBeInTheDocument()
      expect(screen.getByText('프로젝트')).toBeInTheDocument()
      expect(screen.getByText('캘린더')).toBeInTheDocument()
      expect(screen.getByText('피드백')).toBeInTheDocument()
    })

    it('각 메뉴 아이템이 올바른 링크를 가져야 함', () => {
      render(<SideBar menuItems={mockMenuItems} />)
      
      expect(screen.getByRole('link', { name: '대시보드' })).toHaveAttribute('href', '/dashboard')
      expect(screen.getByRole('link', { name: '프로젝트' })).toHaveAttribute('href', '/projects')
      expect(screen.getByRole('link', { name: '캘린더' })).toHaveAttribute('href', '/calendar')
      expect(screen.getByRole('link', { name: '피드백' })).toHaveAttribute('href', '/feedback')
    })
  })

  describe('상호작용 및 상태 관리', () => {
    it('활성 메뉴 아이템이 올바르게 하이라이트되어야 함', () => {
      render(<SideBar menuItems={mockMenuItems} activeItemId="projects" />)
      
      const activeItem = screen.getByRole('link', { name: '프로젝트' })
      expect(activeItem).toHaveClass('bg-primary/10', 'text-primary')
    })

    it('메뉴 아이템 클릭 시 콜백이 호출되어야 함', () => {
      const onItemClick = jest.fn()
      render(<SideBar menuItems={mockMenuItems} onItemClick={onItemClick} />)
      
      const dashboardItem = screen.getByRole('link', { name: '대시보드' })
      fireEvent.click(dashboardItem)
      
      expect(onItemClick).toHaveBeenCalledWith('dashboard')
    })
  })

  describe('반응형 및 UX', () => {
    it('모바일에서 접을 수 있는 상태를 지원해야 함', () => {
      render(<SideBar menuItems={mockMenuItems} isCollapsed={true} />)
      
      // 축소된 상태에서는 메인 텍스트가 숨겨지고 아이콘만 표시 (sr-only는 제외)
      expect(screen.queryByText('대시보드')).toBeInTheDocument() // sr-only 버전이 있음
      expect(screen.getByRole('navigation')).toHaveClass('w-16')
    })

    it('확장/축소 토글 버튼이 작동해야 함', () => {
      const onToggle = jest.fn()
      render(<SideBar menuItems={mockMenuItems} onToggle={onToggle} />)
      
      const toggleButton = screen.getByRole('button', { name: /사이드바 토글/i })
      fireEvent.click(toggleButton)
      
      expect(onToggle).toHaveBeenCalled()
    })
  })

  describe('접근성 (A11y)', () => {
    it('스크린 리더를 위한 적절한 ARIA 레이블을 가져야 함', () => {
      render(<SideBar menuItems={mockMenuItems} />)
      
      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', '주 네비게이션')
      expect(screen.getByRole('list')).toBeInTheDocument()
    })

    it('키보드 네비게이션을 지원해야 함', () => {
      render(<SideBar menuItems={mockMenuItems} />)
      
      const firstItem = screen.getByRole('link', { name: '대시보드' })
      firstItem.focus()
      
      expect(firstItem).toHaveFocus()
      
      // 키보드로 접근 가능한 요소들이 tabindex를 가지고 있는지 확인
      const allLinks = screen.getAllByRole('link')
      allLinks.forEach(link => {
        expect(link).toHaveAttribute('tabindex', '0')
      })
    })

    it('접근성 위반이 없어야 함', async () => {
      const { container } = render(<SideBar menuItems={mockMenuItems} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('에러 처리 및 엣지 케이스', () => {
    it('메뉴 아이템이 없을 때 빈 상태를 표시해야 함', () => {
      render(<SideBar menuItems={[]} />)
      
      expect(screen.getByText('메뉴가 없습니다')).toBeInTheDocument()
    })

    it('잘못된 props가 전달되어도 크래시하지 않아야 함', () => {
      expect(() => {
        render(<SideBar menuItems={[] as never} />)
      }).not.toThrow()
    })
  })

  describe('스타일링 및 테마', () => {
    it('올바른 Tailwind CSS 클래스가 적용되어야 함', () => {
      render(<SideBar menuItems={mockMenuItems} />)
      
      const sidebar = screen.getByRole('navigation')
      expect(sidebar).toHaveClass('bg-white', 'border-r', 'border-gray-200')
    })

    it('다크 모드를 지원해야 함', () => {
      render(<SideBar menuItems={mockMenuItems} theme="dark" />)
      
      const sidebar = screen.getByRole('navigation')
      expect(sidebar).toHaveClass('bg-gray-900', 'border-gray-700')
    })
  })
})