import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { NotificationBell } from './NotificationBell'

// jest-axe 매처 확장
expect.extend(toHaveNoViolations)

describe('NotificationBell Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('기본 기능', () => {
    it('벨 아이콘이 렌더링된다', () => {
      render(<NotificationBell data-testid="notification-bell" />)
      
      const bell = screen.getByTestId('notification-bell')
      expect(bell).toBeInTheDocument()
      expect(bell).toHaveAttribute('aria-label')
    })

    it('읽지 않은 알림 수가 표시된다', () => {
      render(<NotificationBell />)
      
      // 읽지 않은 알림이 2개인 상태 (mock 데이터 기준)
      const badge = screen.getByText('2')
      expect(badge).toBeInTheDocument()
    })

    it('벨 아이콘 클릭 시 알림 센터가 열린다', async () => {
      const user = userEvent.setup()
      render(<NotificationBell data-testid="notification-bell" />)
      
      const bell = screen.getByTestId('notification-bell')
      await user.click(bell)
      
      const notificationCenter = screen.getByRole('region')
      expect(notificationCenter).toBeInTheDocument()
    })
  })

  describe('접근성 (Accessibility)', () => {
    it('WCAG 접근성 기준을 준수한다', async () => {
      const { container } = render(<NotificationBell />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('적절한 ARIA 라벨이 설정된다', () => {
      render(<NotificationBell />)
      
      const bell = screen.getByRole('button')
      expect(bell).toHaveAttribute('aria-label')
      expect(bell.getAttribute('aria-label')).toContain('알림 센터')
      expect(bell.getAttribute('aria-label')).toContain('읽지 않은 알림 2개')
    })

    it('키보드로 접근 가능하다', () => {
      render(<NotificationBell />)
      
      const bell = screen.getByRole('button')
      bell.focus()
      expect(bell).toHaveFocus()
    })

    it('Enter 키로 알림 센터를 열 수 있다', async () => {
      const user = userEvent.setup()
      render(<NotificationBell />)
      
      const bell = screen.getByRole('button')
      bell.focus()
      await user.keyboard('{Enter}')
      
      const notificationCenter = screen.getByRole('region')
      expect(notificationCenter).toBeInTheDocument()
    })

    it('Space 키로 알림 센터를 열 수 있다', async () => {
      const user = userEvent.setup()
      render(<NotificationBell />)
      
      const bell = screen.getByRole('button')
      bell.focus()
      await user.keyboard(' ')
      
      const notificationCenter = screen.getByRole('region')
      expect(notificationCenter).toBeInTheDocument()
    })
  })

  describe('키보드 네비게이션 통합 테스트', () => {
    it('벨 → 알림 센터 → 알림 항목 간 포커스 이동이 원활하다', async () => {
      const user = userEvent.setup()
      render(<NotificationBell />)
      
      // 1. 벨 아이콘에 포커스 후 열기
      const bell = screen.getByRole('button')
      bell.focus()
      await user.keyboard('{Enter}')
      
      // 2. 알림 센터가 열리고 새로고침 버튼에 포커스
      const refreshButton = screen.getByLabelText('새로고침')
      expect(refreshButton).toHaveFocus()
      
      // 3. Tab으로 닫기 버튼으로 이동
      await user.tab()
      const closeButton = screen.getByLabelText('알림 센터 닫기')
      expect(closeButton).toHaveFocus()
      
      // 4. Tab으로 첫 번째 알림으로 이동
      await user.tab()
      const firstNotification = screen.getByTestId('notification-notif-1')
      expect(firstNotification).toHaveFocus()
    })

    it('알림 센터 내에서 화살표 키로 알림 간 이동할 수 있다', async () => {
      const user = userEvent.setup()
      render(<NotificationBell />)
      
      // 알림 센터 열기
      const bell = screen.getByRole('button')
      await user.click(bell)
      
      // 첫 번째 알림에 포커스
      const notifications = screen.getAllByTestId(/^notification-/)
      notifications[0].focus()
      
      // 화살표 키로 다음 알림으로 이동
      await user.keyboard('{ArrowDown}')
      expect(notifications[1]).toHaveFocus()
      
      // 위 화살표로 이전 알림으로 이동
      await user.keyboard('{ArrowUp}')
      expect(notifications[0]).toHaveFocus()
    })

    it('ESC 키로 알림 센터를 닫을 수 있다', async () => {
      const user = userEvent.setup()
      render(<NotificationBell />)
      
      // 알림 센터 열기
      const bell = screen.getByRole('button')
      await user.click(bell)
      
      const notificationCenter = screen.getByRole('region')
      expect(notificationCenter).toBeInTheDocument()
      
      // ESC 키로 닫기
      await user.keyboard('{Escape}')
      expect(notificationCenter).not.toBeInTheDocument()
    })

    it('포커스 트랩이 알림 센터 내에서 작동한다', async () => {
      const user = userEvent.setup()
      render(<NotificationBell />)
      
      // 알림 센터 열기
      const bell = screen.getByRole('button')
      await user.click(bell)
      
      const refreshButton = screen.getByLabelText('새로고침')
      const closeButton = screen.getByLabelText('알림 센터 닫기')
      const firstNotification = screen.getByTestId('notification-notif-1')
      
      // 새로고침 버튼에서 시작
      expect(refreshButton).toHaveFocus()
      
      // Tab으로 모든 요소 순회
      await user.tab()
      expect(closeButton).toHaveFocus()
      
      await user.tab()
      expect(firstNotification).toHaveFocus()
      
      // Shift+Tab으로 역방향 이동
      await user.tab({ shift: true })
      expect(closeButton).toHaveFocus()
      
      await user.tab({ shift: true })
      expect(refreshButton).toHaveFocus()
    })
  })

  describe('상호작용 시나리오', () => {
    it('알림 클릭 → 읽음 처리 → 알림 센터 닫기 플로우가 작동한다', async () => {
      const user = userEvent.setup()
      render(<NotificationBell />)
      
      // 초기 읽지 않은 알림 수 확인 (2개)
      expect(screen.getByText('2')).toBeInTheDocument()
      
      // 알림 센터 열기
      const bell = screen.getByRole('button')
      await user.click(bell)
      
      // 읽지 않은 첫 번째 알림 클릭
      const firstUnreadNotification = screen.getByTestId('notification-notif-1')
      await user.click(firstUnreadNotification)
      
      // 알림 센터가 닫힌다
      expect(screen.queryByRole('region')).not.toBeInTheDocument()
      
      // 읽지 않은 알림 수가 1로 줄어든다
      expect(screen.getByText('1')).toBeInTheDocument()
    })

    it('새로고침 버튼이 작동한다', async () => {
      const user = userEvent.setup()
      const consoleSpy = vi.spyOn(console, 'log')
      
      render(<NotificationBell />)
      
      // 알림 센터 열기
      const bell = screen.getByRole('button')
      await user.click(bell)
      
      // 새로고침 버튼 클릭
      const refreshButton = screen.getByLabelText('새로고침')
      await user.click(refreshButton)
      
      expect(consoleSpy).toHaveBeenCalledWith('알림 새로고침')
      
      // 로딩 상태 확인
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByText('알림을 불러오는 중...')).toBeInTheDocument()
      
      consoleSpy.mockRestore()
    })
  })

  describe('다크 모드 호환성', () => {
    it('다크 모드에서도 투명도가 올바르게 적용된다', () => {
      // 다크 모드 설정
      document.documentElement.className = 'dark'
      
      render(<NotificationBell />)
      
      const bell = screen.getByRole('button')
      expect(bell).toHaveClass('dark:text-gray-300', 'dark:hover:text-gray-100', 'dark:hover:bg-gray-700')
      
      // 클린업
      document.documentElement.className = ''
    })
  })
})