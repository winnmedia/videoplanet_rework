/**
 * InvitationSummaryCard 테스트
 * TDD Red Phase: 초대 관리 요약 카드 위젯의 실패 테스트 작성
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InvitationSummaryCard } from './InvitationSummaryCard'
import type { InvitationStats } from '../model/types'

const mockInvitationStats: InvitationStats = {
  sentPending: 1,
  sentAccepted: 1,
  sentDeclined: 0,
  receivedPending: 1,
  receivedUnread: 1,
  recentInvitations: [
    {
      id: 'invite-1',
      type: 'sent',
      projectId: 'project-1',
      projectTitle: '브랜드 홍보 영상',
      targetEmail: 'designer@example.com',
      targetName: '최디자이너',
      status: 'pending',
      sentAt: '2025-08-27T14:30:00Z',
      expiresAt: '2025-09-03T14:30:00Z',
      canResend: true,
      isRead: true
    },
    {
      id: 'invite-2',
      type: 'received',
      targetEmail: 'me@example.com',
      senderName: '김매니저',
      projectId: 'project-external',
      projectTitle: '외부 협업 프로젝트',
      status: 'pending',
      sentAt: '2025-08-28T10:00:00Z',
      expiresAt: '2025-09-04T10:00:00Z',
      canResend: false,
      isRead: false
    }
  ]
}

describe('InvitationSummaryCard', () => {
  const mockOnViewDetails = jest.fn()
  const mockOnResendInvitation = jest.fn()
  const mockOnAcceptInvitation = jest.fn()
  const mockOnDeclineInvitation = jest.fn()
  const mockOnItemClick = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('렌더링', () => {
    it('초대 관리 제목이 표시되어야 한다', () => {
      render(<InvitationSummaryCard data={mockInvitationStats} />)
      
      expect(screen.getByText('초대 관리 요약')).toBeInTheDocument()
    })

    it('전송 대기 초대 수가 표시되어야 한다', () => {
      render(<InvitationSummaryCard data={mockInvitationStats} />)
      
      expect(screen.getByText('전송 대기 1개')).toBeInTheDocument()
    })

    it('받은 초대 수가 표시되어야 한다', () => {
      render(<InvitationSummaryCard data={mockInvitationStats} />)
      
      expect(screen.getByText('받은 초대 1개')).toBeInTheDocument()
    })

    it('초대 통계가 올바르게 표시되어야 한다', () => {
      render(<InvitationSummaryCard data={mockInvitationStats} />)
      
      expect(screen.getByText('1')).toBeInTheDocument() // 전송 대기
      expect(screen.getByText('1')).toBeInTheDocument() // 수락됨
      expect(screen.getByText('0')).toBeInTheDocument() // 거절됨
    })

    it('최근 초대 목록이 표시되어야 한다', () => {
      render(<InvitationSummaryCard data={mockInvitationStats} />)
      
      expect(screen.getByText('최디자이너')).toBeInTheDocument()
      expect(screen.getByText('김매니저')).toBeInTheDocument()
      expect(screen.getByText('브랜드 홍보 영상')).toBeInTheDocument()
      expect(screen.getByText('외부 협업 프로젝트')).toBeInTheDocument()
    })
  })

  describe('상호작용', () => {
    it('전체보기 버튼 클릭 시 onViewDetails가 호출되어야 한다', async () => {
      render(
        <InvitationSummaryCard 
          data={mockInvitationStats}
          onViewDetails={mockOnViewDetails}
        />
      )
      
      const viewDetailsButton = screen.getByRole('button', { name: /전체보기/i })
      fireEvent.click(viewDetailsButton)
      
      await waitFor(() => {
        expect(mockOnViewDetails).toHaveBeenCalledTimes(1)
      })
    })

    it('재전송 버튼 클릭 시 onResendInvitation이 호출되어야 한다', async () => {
      render(
        <InvitationSummaryCard 
          data={mockInvitationStats}
          onResendInvitation={mockOnResendInvitation}
        />
      )
      
      const resendButton = screen.getByRole('button', { name: /재전송/i })
      fireEvent.click(resendButton)
      
      await waitFor(() => {
        expect(mockOnResendInvitation).toHaveBeenCalledWith('invite-1')
      })
    })

    it('수락 버튼 클릭 시 onAcceptInvitation이 호출되어야 한다', async () => {
      render(
        <InvitationSummaryCard 
          data={mockInvitationStats}
          onAcceptInvitation={mockOnAcceptInvitation}
        />
      )
      
      const acceptButton = screen.getByRole('button', { name: /수락/i })
      fireEvent.click(acceptButton)
      
      await waitFor(() => {
        expect(mockOnAcceptInvitation).toHaveBeenCalledWith('invite-2')
      })
    })

    it('거절 버튼 클릭 시 onDeclineInvitation이 호출되어야 한다', async () => {
      render(
        <InvitationSummaryCard 
          data={mockInvitationStats}
          onDeclineInvitation={mockOnDeclineInvitation}
        />
      )
      
      const declineButton = screen.getByRole('button', { name: /거절/i })
      fireEvent.click(declineButton)
      
      await waitFor(() => {
        expect(mockOnDeclineInvitation).toHaveBeenCalledWith('invite-2')
      })
    })

    it('초대 아이템 클릭 시 onItemClick이 호출되어야 한다', async () => {
      render(
        <InvitationSummaryCard 
          data={mockInvitationStats}
          onItemClick={mockOnItemClick}
        />
      )
      
      const invitationItem = screen.getByText('최디자이너').closest('button')
      expect(invitationItem).toBeInTheDocument()
      
      if (invitationItem) {
        fireEvent.click(invitationItem)
        
        await waitFor(() => {
          expect(mockOnItemClick).toHaveBeenCalledWith('invite-1')
        })
      }
    })
  })

  describe('초대 상태 표시', () => {
    it('전송한 초대는 "전송됨" 라벨이 표시되어야 한다', () => {
      render(<InvitationSummaryCard data={mockInvitationStats} />)
      
      expect(screen.getByText('전송됨')).toBeInTheDocument()
    })

    it('받은 초대는 "받음" 라벨이 표시되어야 한다', () => {
      render(<InvitationSummaryCard data={mockInvitationStats} />)
      
      expect(screen.getByText('받음')).toBeInTheDocument()
    })

    it('대기 상태는 주황색으로 표시되어야 한다', () => {
      render(<InvitationSummaryCard data={mockInvitationStats} />)
      
      const pendingBadge = screen.getByText('대기중')
      expect(pendingBadge).toHaveClass('bg-warning-500')
    })

    it('수락 상태는 녹색으로 표시되어야 한다', () => {
      const acceptedStats = {
        ...mockInvitationStats,
        recentInvitations: [
          {
            ...mockInvitationStats.recentInvitations[0],
            status: 'accepted' as const
          }
        ]
      }
      
      render(<InvitationSummaryCard data={acceptedStats} />)
      
      const acceptedBadge = screen.getByText('수락됨')
      expect(acceptedBadge).toHaveClass('bg-success-500')
    })
  })

  describe('읽지 않음 배지', () => {
    it('읽지 않은 초대가 있을 때 배지가 표시되어야 한다', () => {
      render(<InvitationSummaryCard data={mockInvitationStats} />)
      
      const unreadBadge = screen.getByText('1')
      expect(unreadBadge).toBeInTheDocument()
      expect(unreadBadge).toHaveClass('bg-primary-500')
    })

    it('읽지 않은 초대가 없을 때 배지가 표시되지 않아야 한다', () => {
      const readStats = {
        ...mockInvitationStats,
        receivedUnread: 0
      }
      
      render(<InvitationSummaryCard data={readStats} />)
      
      expect(screen.queryByTestId('unread-badge')).not.toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('적절한 ARIA 레이블이 설정되어야 한다', () => {
      render(<InvitationSummaryCard data={mockInvitationStats} />)
      
      const card = screen.getByRole('region', { name: /초대 관리/i })
      expect(card).toBeInTheDocument()
      
      const unreadBadge = screen.getByText('1')
      expect(unreadBadge).toHaveAttribute('aria-label', '읽지 않은 초대 1개')
    })

    it('빠른 액션 버튼들이 적절한 라벨을 가져야 한다', () => {
      render(
        <InvitationSummaryCard 
          data={mockInvitationStats}
          onResendInvitation={mockOnResendInvitation}
          onAcceptInvitation={mockOnAcceptInvitation}
        />
      )
      
      expect(screen.getByRole('button', { name: /재전송/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /수락/i })).toBeInTheDocument()
    })
  })

  describe('빈 상태', () => {
    it('초대가 없을 때 빈 상태 메시지가 표시되어야 한다', () => {
      const emptyStats = {
        sentPending: 0,
        sentAccepted: 0,
        sentDeclined: 0,
        receivedPending: 0,
        receivedUnread: 0,
        recentInvitations: []
      }
      
      render(<InvitationSummaryCard data={emptyStats} />)
      
      expect(screen.getByText('초대 내역이 없습니다')).toBeInTheDocument()
      expect(screen.getByText('팀 멤버를 초대하거나 초대를 받으면 여기에 표시됩니다.')).toBeInTheDocument()
    })
  })

  describe('만료 처리', () => {
    it('곧 만료될 초대에 대해 경고가 표시되어야 한다', () => {
      const soonToExpireStats = {
        ...mockInvitationStats,
        recentInvitations: [
          {
            ...mockInvitationStats.recentInvitations[0],
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 하루 후
          }
        ]
      }
      
      render(<InvitationSummaryCard data={soonToExpireStats} />)
      
      expect(screen.getByText(/곧 만료/)).toBeInTheDocument()
    })
  })

  describe('HTML 중첩 규칙 준수', () => {
    it('button 내부에 button이 중첩되지 않아야 한다', () => {
      const { container } = render(
        <InvitationSummaryCard 
          data={mockInvitationStats}
          onResendInvitation={mockOnResendInvitation}
          onAcceptInvitation={mockOnAcceptInvitation}
          onDeclineInvitation={mockOnDeclineInvitation}
        />
      )
      
      // button 안의 button 중첩 확인
      const nestedButtons = container.querySelectorAll('button button')
      expect(nestedButtons).toHaveLength(0)
    })

    it('초대 아이템은 div로 구성되고 액션 버튼들만 button이어야 한다', () => {
      render(
        <InvitationSummaryCard 
          data={mockInvitationStats}
          onResendInvitation={mockOnResendInvitation}
          onAcceptInvitation={mockOnAcceptInvitation}
          onDeclineInvitation={mockOnDeclineInvitation}
        />
      )
      
      // 재전송, 수락, 거절 버튼만 존재해야 함
      expect(screen.getByRole('button', { name: /재전송/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /수락/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /거절/i })).toBeInTheDocument()
    })

    it('클릭 가능한 초대 아이템은 키보드 네비게이션을 지원해야 한다', () => {
      render(
        <InvitationSummaryCard 
          data={mockInvitationStats}
          onItemClick={mockOnItemClick}
        />
      )
      
      // tabindex를 가진 클릭 가능한 요소들 확인
      const clickableItems = screen.getAllByRole('button')
      expect(clickableItems.length).toBeGreaterThan(0)
      
      clickableItems.forEach(item => {
        expect(item).toHaveAttribute('tabindex', expect.any(String))
      })
    })
  })
})