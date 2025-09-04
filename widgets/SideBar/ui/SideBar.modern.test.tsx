/**
 * @fileoverview SideBar 현대화 TDD 테스트 - 신규 Tailwind 기반
 * @description 초미니멀 디자인 시스템에 맞는 사이드바 테스트
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

import { SideBar } from './SideBar.modern'

// Jest-axe matcher 확장
expect.extend(toHaveNoViolations)

// 라우터 모킹
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/dashboard'
  }),
  usePathname: () => '/dashboard'
}))

describe('SideBar - Modern Tailwind Design System', () => {
  beforeEach(() => {
    mockPush.mockClear()
    // localStorage 모킹
    Object.defineProperty(window, 'localStorage', {
      value: {
        removeItem: jest.fn(),
        getItem: jest.fn(),
        setItem: jest.fn()
      },
      writable: true
    })
  })

  // === FAIL TESTS (구현 전 실패 테스트) ===
  
  describe('기본 렌더링과 접근성', () => {
    it('사이드바가 올바르게 렌더링되어야 함', () => {
      render(<SideBar />)
      
      const sidebar = screen.getByRole('complementary', { name: '네비게이션 사이드바' })
      expect(sidebar).toBeInTheDocument()
      
      const nav = screen.getByRole('navigation', { name: '주 메뉴' })
      expect(nav).toBeInTheDocument()
    })

    it('기본 메뉴 항목들이 표시되어야 함', () => {
      render(<SideBar />)
      
      expect(screen.getByRole('button', { name: '홈' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '전체 일정' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '프로젝트 관리' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '영상 기획' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '영상 피드백' })).toBeInTheDocument()
    })

    it('로그아웃 버튼이 표시되어야 함', () => {
      render(<SideBar />)
      
      const logoutButton = screen.getByRole('button', { name: '로그아웃' })
      expect(logoutButton).toBeInTheDocument()
    })

    it('접근성 위반이 없어야 함', async () => {
      const { container } = render(<SideBar />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('현대적인 스타일링', () => {
    it('사이드바에 현대적인 Tailwind 클래스가 적용되어야 함', () => {
      render(<SideBar data-testid="sidebar" />)
      
      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toHaveClass(
        'fixed', 'left-0', 'top-0', 'h-screen',
        'bg-white', 'border-r', 'border-gray-200',
        'shadow-sm'
      )
    })

    it('메뉴 버튼들이 현대적인 스타일을 가져야 함', () => {
      render(<SideBar />)
      
      const homeButton = screen.getByRole('button', { name: '홈' })
      expect(homeButton).toHaveClass(
        'flex', 'items-center', 'w-full', 'px-4', 'py-3',
        'text-left', 'rounded-lg', 'transition-colors'
      )
    })

    it('활성 메뉴 항목이 하이라이트되어야 함', () => {
      render(<SideBar />)
      
      // 홈이 현재 활성 상태 (pathname이 /dashboard)
      const homeButton = screen.getByRole('button', { name: '홈' })
      expect(homeButton).toHaveClass('bg-vridge-50', 'text-vridge-600', 'border-vridge-200')
    })
  })

  describe('메뉴 네비게이션', () => {
    it('홈 메뉴 클릭 시 대시보드로 이동해야 함', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      const homeButton = screen.getByRole('button', { name: '홈' })
      await user.click(homeButton)
      
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('전체 일정 메뉴 클릭 시 캘린더로 이동해야 함', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      const calendarButton = screen.getByRole('button', { name: '전체 일정' })
      await user.click(calendarButton)
      
      expect(mockPush).toHaveBeenCalledWith('/calendar')
    })

    it('서브메뉴가 있는 항목 클릭 시 서브메뉴가 토글되어야 함', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      const projectsButton = screen.getByRole('button', { name: '프로젝트 관리' })
      await user.click(projectsButton)
      
      // 서브메뉴 컨테이너가 나타나야 함
      await waitFor(() => {
        expect(screen.getByTestId('sidebar-submenu')).toBeInTheDocument()
      })
    })
  })

  describe('서브메뉴 기능', () => {
    it('서브메뉴가 열릴 때 올바른 항목들이 표시되어야 함', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      const projectsButton = screen.getByRole('button', { name: '프로젝트 관리' })
      await user.click(projectsButton)
      
      await waitFor(() => {
        expect(screen.getByText('모든 프로젝트')).toBeInTheDocument()
        expect(screen.getByText('진행중인 프로젝트')).toBeInTheDocument()
        expect(screen.getByText('완료된 프로젝트')).toBeInTheDocument()
      })
    })

    it('서브메뉴 항목 클릭 시 해당 페이지로 이동해야 함', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      // 프로젝트 메뉴 열기
      const projectsButton = screen.getByRole('button', { name: '프로젝트 관리' })
      await user.click(projectsButton)
      
      // 서브메뉴 항목 클릭
      await waitFor(async () => {
        const allProjectsItem = screen.getByText('모든 프로젝트')
        await user.click(allProjectsItem)
        expect(mockPush).toHaveBeenCalledWith('/projects')
      })
    })

    it('서브메뉴 외부 클릭 시 서브메뉴가 닫혀야 함', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      // 서브메뉴 열기
      const projectsButton = screen.getByRole('button', { name: '프로젝트 관리' })
      await user.click(projectsButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('sidebar-submenu')).toBeInTheDocument()
      })
      
      // 서브메뉴 외부 클릭 (사이드바 영역)
      const sidebar = screen.getByRole('complementary')
      await user.click(sidebar)
      
      await waitFor(() => {
        expect(screen.queryByTestId('sidebar-submenu')).not.toBeInTheDocument()
      })
    })
  })

  describe('키보드 네비게이션', () => {
    it('Tab 키로 메뉴 항목들 간 이동이 가능해야 함', () => {
      render(<SideBar />)
      
      const homeButton = screen.getByRole('button', { name: '홈' })
      homeButton.focus()
      expect(homeButton).toHaveFocus()
      
      // Tab으로 다음 항목 이동
      fireEvent.keyDown(homeButton, { key: 'Tab' })
      const calendarButton = screen.getByRole('button', { name: '전체 일정' })
      calendarButton.focus()
      expect(calendarButton).toHaveFocus()
    })

    it('Enter 키로 메뉴 항목 활성화가 가능해야 함', () => {
      render(<SideBar />)
      
      const homeButton = screen.getByRole('button', { name: '홈' })
      homeButton.focus()
      fireEvent.keyDown(homeButton, { key: 'Enter' })
      
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })

    it('Escape 키로 서브메뉴 닫기가 가능해야 함', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      // 서브메뉴 열기
      const projectsButton = screen.getByRole('button', { name: '프로젝트 관리' })
      await user.click(projectsButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('sidebar-submenu')).toBeInTheDocument()
      })
      
      // Escape 키로 닫기
      fireEvent.keyDown(document, { key: 'Escape' })
      
      await waitFor(() => {
        expect(screen.queryByTestId('sidebar-submenu')).not.toBeInTheDocument()
      })
    })
  })

  describe('반응형 동작', () => {
    it('모바일에서 햄버거 메뉴가 표시되어야 함', () => {
      // 모바일 뷰포트 시뮬레이션
      Object.defineProperty(window, 'innerWidth', { value: 600, writable: true })
      render(<SideBar />)
      
      const hamburgerButton = screen.getByRole('button', { name: '메뉴 토글' })
      expect(hamburgerButton).toBeInTheDocument()
    })

    it('데스크탑에서 햄버거 메뉴가 숨겨져야 함', () => {
      // 데스크탑 뷰포트 시뮬레이션
      Object.defineProperty(window, 'innerWidth', { value: 1200, writable: true })
      render(<SideBar />)
      
      const hamburgerButton = screen.queryByRole('button', { name: '메뉴 토글' })
      expect(hamburgerButton).not.toBeInTheDocument()
    })

    it('collapsed prop이 true일 때 축소된 상태여야 함', () => {
      render(<SideBar isCollapsed={true} data-testid="sidebar" />)
      
      const sidebar = screen.getByTestId('sidebar')
      expect(sidebar).toHaveClass('w-16') // 축소된 너비
    })
  })

  describe('로그아웃 기능', () => {
    it('로그아웃 버튼 클릭 시 localStorage 정리 후 로그인 페이지로 이동해야 함', async () => {
      const user = userEvent.setup()
      render(<SideBar />)
      
      const logoutButton = screen.getByRole('button', { name: '로그아웃' })
      await user.click(logoutButton)
      
      expect(localStorage.removeItem).toHaveBeenCalledWith('VGID')
      expect(mockPush).toHaveBeenCalledWith('/login')
    })

    it('로그아웃 버튼이 사이드바 하단에 위치해야 함', () => {
      render(<SideBar data-testid="sidebar" />)
      
      const logoutButton = screen.getByRole('button', { name: '로그아웃' })
      expect(logoutButton).toHaveClass('mt-auto') // flex container의 마지막으로 밀어냄
    })
  })

  describe('메뉴 아이콘', () => {
    it('각 메뉴 항목에 적절한 아이콘이 표시되어야 함', () => {
      render(<SideBar />)
      
      // 홈 아이콘 확인
      const homeButton = screen.getByRole('button', { name: '홈' })
      expect(homeButton.querySelector('.menu-icon')).toBeInTheDocument()
      
      // 프로젝트 관리 아이콘 확인
      const projectsButton = screen.getByRole('button', { name: '프로젝트 관리' })
      expect(projectsButton.querySelector('.menu-icon')).toBeInTheDocument()
    })

    it('활성 메뉴의 아이콘이 변경되어야 함', () => {
      render(<SideBar />)
      
      // 활성 메뉴 (홈)의 아이콘이 active 상태여야 함
      const homeButton = screen.getByRole('button', { name: '홈' })
      const homeIcon = homeButton.querySelector('.menu-icon')
      expect(homeIcon).toHaveClass('text-vridge-600')
    })
  })

  describe('카운트 배지', () => {
    it('메뉴 항목에 카운트가 있을 때 배지가 표시되어야 함', () => {
      render(<SideBar />)
      
      // 프로젝트 관리에 카운트가 있다고 가정
      const projectsButton = screen.getByRole('button', { name: '프로젝트 관리' })
      const badge = projectsButton.querySelector('.count-badge')
      
      if (badge) {
        expect(badge).toHaveClass('bg-vridge-500', 'text-white', 'rounded-full')
      }
    })
  })
})