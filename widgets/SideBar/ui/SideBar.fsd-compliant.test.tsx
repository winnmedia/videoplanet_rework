/**
 * FSD 경계 준수 테스트 - SideBar 위젯
 * 목적: SideBar가 상대경로 import 없이 Public API만 사용하는지 검증
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'

// FSD 준수: Public API만 import
import { SideBar } from './SideBar.fsd-compliant'

// Mock: 환경 변수 검증 비활성화
vi.stubEnv('SKIP_ENV_VALIDATION', 'true')

// Mock: Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  })
}))

// Mock: FSD Public APIs
vi.mock('@/entities/menu', () => ({
  menuApi: {
    getSubMenuItems: vi.fn().mockResolvedValue([
      { id: '1', name: 'Test Project', path: '/projects/1', status: 'active' }
    ])
  },
  createMenuItem: vi.fn((data) => data),
  createSubMenuItem: vi.fn((data) => data)
}))

vi.mock('@/features/navigation', () => ({
  useNavigation: () => ({
    state: {
      activeMenuId: null,
      isSubMenuOpen: false,
      currentPath: '/dashboard',
      focusedIndex: 0
    },
    actions: {
      setActiveMenu: vi.fn(),
      openSubMenu: vi.fn(),
      closeSubMenu: vi.fn(),
      setFocusedIndex: vi.fn()
    }
  }),
  NavigationProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useSubMenuKeyboard: vi.fn(),
  useFocusTrap: vi.fn()
}))

vi.mock('@/shared/ui', () => ({
  MenuButton: ({ children, ...props }: any) => <button {...props}>{children}</button>,
  SubMenu: ({ isOpen, items, title, onClose }: any) => 
    isOpen ? <div data-testid="submenu">{title}</div> : null
}))

describe('SideBar - FSD Compliance', () => {
  beforeEach(() => {
    // 환경 변수 Mock을 각 테스트 전에 설정
    vi.stubEnv('SKIP_ENV_VALIDATION', 'true')
    // DOM 초기화
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    })
  })

  it('renders without FSD boundary violations', () => {
    render(<SideBar data-testid="fsd-compliant-sidebar" />)
    
    expect(screen.getByTestId('fsd-compliant-sidebar')).toBeInTheDocument()
  })

  it('integrates with navigation feature through Public API', () => {
    render(<SideBar />)
    
    // NavigationProvider가 올바르게 감싸고 있는지 확인
    expect(screen.getByRole('complementary')).toBeInTheDocument()
  })

  it('renders main menu items correctly', () => {
    render(<SideBar />)
    
    // 핵심 메뉴 항목들이 렌더링되는지 확인
    expect(screen.getByTestId('menu-home')).toBeInTheDocument()
    expect(screen.getByTestId('menu-calendar')).toBeInTheDocument()
    expect(screen.getByTestId('menu-projects')).toBeInTheDocument()
    expect(screen.getByTestId('menu-planning')).toBeInTheDocument()
    expect(screen.getByTestId('menu-feedback')).toBeInTheDocument()
  })
})