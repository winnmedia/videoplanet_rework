import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { NotificationCenter } from './NotificationCenter'

const mockNotifications = [
  {
    id: 'notif-1',
    type: 'invitation' as const,
    title: '프로젝트 초대',
    message: '새 프로젝트에 초대되었습니다',
    timestamp: new Date('2024-01-15T10:00:00Z'),
    isRead: false,
    actionUrl: '/projects/123'
  },
  {
    id: 'notif-2',
    type: 'comment' as const,
    title: '새 댓글',
    message: '영상에 새 댓글이 달렸습니다',
    timestamp: new Date('2024-01-14T15:30:00Z'),
    isRead: true,
    actionUrl: '/feedback/456'
  },
  {
    id: 'notif-3',
    type: 'conflict' as const,
    title: '촬영 일정 충돌',
    message: '촬영 일정에 충돌이 있습니다',
    timestamp: new Date('2024-01-13T09:00:00Z'),
    isRead: false,
    actionUrl: '/calendar?conflict=789'
  }
]

describe('NotificationCenter', () => {
  const mockOnClose = vi.fn()
  const mockOnNotificationClick = vi.fn()
  const mockOnRefresh = vi.fn()
  const mockOnMarkAsRead = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('기본 렌더링', () => {
    it('isOpen이 false일 때 알림 센터가 숨겨진다', () => {
      render(
        <NotificationCenter
          isOpen={false}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      const drawer = screen.queryByRole('region')
      expect(drawer).not.toBeInTheDocument()
    })

    it('isOpen이 true일 때 알림 센터가 표시된다', () => {
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      const drawer = screen.getByRole('region')
      expect(drawer).toBeInTheDocument()
      expect(screen.getByText('알림')).toBeInTheDocument()
    })

    it('모든 알림이 렌더링된다', () => {
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      mockNotifications.forEach(notification => {
        expect(screen.getByText(notification.title)).toBeInTheDocument()
        expect(screen.getByText(notification.message)).toBeInTheDocument()
      })
    })

    it('읽지 않은 알림은 시각적으로 구분된다', () => {
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      const unreadNotifications = mockNotifications.filter(n => !n.isRead)
      unreadNotifications.forEach(notification => {
        const notificationElement = screen.getByTestId(`notification-${notification.id}`)
        expect(notificationElement).toHaveClass('bg-blue-50/50')
      })
    })
  })

  describe('접근성 (Accessibility)', () => {
    it('적절한 ARIA 속성이 설정된다', () => {
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      const drawer = screen.getByRole('region')
      expect(drawer).toHaveAttribute('aria-label', '알림 센터 - 읽지 않은 알림 2개')
      
      const notificationList = screen.getByRole('list')
      expect(notificationList).toHaveAttribute('aria-label', '알림 목록')
    })

    it('포커스 트랩이 작동한다', async () => {
      const user = userEvent.setup()
      
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      const refreshButton = screen.getByLabelText('새로고침')
      const closeButton = screen.getByLabelText('알림 센터 닫기')
      const firstNotification = screen.getByTestId('notification-notif-1')
      
      // 새로고침 버튼에서 시작
      refreshButton.focus()
      expect(refreshButton).toHaveFocus()
      
      // Tab으로 이동
      await user.tab()
      expect(closeButton).toHaveFocus()
      
      await user.tab()
      expect(firstNotification).toHaveFocus()
    })

    it('ESC 키로 알림 센터를 닫을 수 있다', async () => {
      const user = userEvent.setup()
      
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      await user.keyboard('{Escape}')
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('키보드 상호작용', () => {
    it('화살표 키로 알림 간 이동할 수 있다', async () => {
      const user = userEvent.setup()
      
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      const notifications = screen.getAllByTestId(/^notification-/)
      
      // 첫 번째 알림에 포커스
      notifications[0].focus()
      expect(notifications[0]).toHaveFocus()
      
      // 아래 화살표로 다음 알림
      await user.keyboard('{ArrowDown}')
      expect(notifications[1]).toHaveFocus()
      
      // 위 화살표로 이전 알림
      await user.keyboard('{ArrowUp}')
      expect(notifications[0]).toHaveFocus()
    })

    it('Enter 키로 알림을 클릭할 수 있다', async () => {
      const user = userEvent.setup()
      
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      const firstNotification = screen.getByTestId('notification-notif-1')
      firstNotification.focus()
      
      await user.keyboard('{Enter}')
      expect(mockOnNotificationClick).toHaveBeenCalledWith(mockNotifications[0])
    })
  })

  describe('마우스 상호작용', () => {
    it('알림 클릭 시 onNotificationClick이 호출된다', async () => {
      const user = userEvent.setup()
      
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      const firstNotification = screen.getByTestId('notification-notif-1')
      await user.click(firstNotification)
      
      expect(mockOnNotificationClick).toHaveBeenCalledWith(mockNotifications[0])
    })

    it('새로고침 버튼 클릭 시 onRefresh가 호출된다', async () => {
      const user = userEvent.setup()
      
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      const refreshButton = screen.getByLabelText('새로고침')
      await user.click(refreshButton)
      
      expect(mockOnRefresh).toHaveBeenCalled()
    })

    it('닫기 버튼 클릭 시 onClose가 호출된다', async () => {
      const user = userEvent.setup()
      
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      const closeButton = screen.getByLabelText('알림 센터 닫기')
      await user.click(closeButton)
      
      expect(mockOnClose).toHaveBeenCalled()
    })

    it('바깥 영역 클릭 시 알림 센터가 닫힌다', async () => {
      const user = userEvent.setup()
      
      render(
        <div data-testid="outside-area">
          <NotificationCenter
            isOpen={true}
            notifications={mockNotifications}
            unreadCount={2}
            onClose={mockOnClose}
            onNotificationClick={mockOnNotificationClick}
            onRefresh={mockOnRefresh}
            onMarkAsRead={mockOnMarkAsRead}
          />
        </div>
      )

      const outsideArea = screen.getByTestId('outside-area')
      await user.click(outsideArea)
      
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  describe('알림 타입 표시', () => {
    it('각 알림 타입에 맞는 아이콘이 표시된다', () => {
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      // 초대 알림 (사용자 아이콘)
      const invitationIcon = screen.getByTestId('notification-notif-1').querySelector('[data-icon="invitation"]')
      expect(invitationIcon).toBeInTheDocument()
      
      // 댓글 알림 (채팅 아이콘)
      const commentIcon = screen.getByTestId('notification-notif-2').querySelector('[data-icon="comment"]')
      expect(commentIcon).toBeInTheDocument()
      
      // 충돌 알림 (경고 아이콘)
      const conflictIcon = screen.getByTestId('notification-notif-3').querySelector('[data-icon="conflict"]')
      expect(conflictIcon).toBeInTheDocument()
    })
  })

  describe('시간 표시', () => {
    it('상대적 시간이 올바르게 표시된다', () => {
      // 현재 시간을 고정하여 테스트
      const mockDate = new Date('2024-01-15T12:00:00Z')
      vi.useFakeTimers()
      vi.setSystemTime(mockDate)
      
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      // 2시간 전 알림
      expect(screen.getByText('2시간 전')).toBeInTheDocument()
      // 하루 전 알림  
      expect(screen.getByText('1일 전')).toBeInTheDocument()
      // 2일 전 알림
      expect(screen.getByText('2일 전')).toBeInTheDocument()
      
      vi.useRealTimers()
    })
  })

  describe('빈 상태', () => {
    it('알림이 없을 때 빈 상태를 표시한다', () => {
      render(
        <NotificationCenter
          isOpen={true}
          notifications={[]}
          unreadCount={0}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      expect(screen.getByText('새 알림이 없습니다')).toBeInTheDocument()
      expect(screen.getByText('모든 알림을 확인했습니다')).toBeInTheDocument()
    })
  })

  describe('로딩 상태', () => {
    it('로딩 중일 때 로딩 스피너가 표시된다', () => {
      render(
        <NotificationCenter
          isOpen={true}
          notifications={mockNotifications}
          unreadCount={2}
          isLoading={true}
          onClose={mockOnClose}
          onNotificationClick={mockOnNotificationClick}
          onRefresh={mockOnRefresh}
          onMarkAsRead={mockOnMarkAsRead}
        />
      )

      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument()
      expect(screen.getByText('알림을 불러오는 중...')).toBeInTheDocument()
    })
  })
})