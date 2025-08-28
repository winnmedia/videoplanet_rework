/**
 * Dashboard Layout 테스트
 * TDD 방식으로 대시보드 레이아웃 개선사항 검증
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import DashboardPage from '../page'

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

// Mock Dashboard API
jest.mock('@/widgets/Dashboard/api/dashboardApi', () => ({
  dashboardApiClient: {
    fetchDashboardData: jest.fn().mockResolvedValue({
      stats: {
        totalProjects: 5,
        activeProjects: 3,
        completedProjects: 2,
        totalTeamMembers: 8
      },
      feedbackSummary: {
        totalUnread: 3,
        newComments: 2,
        newReplies: 1,
        emotionChanges: 0,
        recentItems: []
      },
      invitationStats: {
        sentPending: 1,
        sentAccepted: 2,
        sentDeclined: 0,
        receivedPending: 1,
        receivedUnread: 1,
        recentInvitations: []
      },
      scheduleStats: {
        upcomingTasks: [],
        todayTasks: [],
        overdueTasks: []
      },
      unreadStats: {
        totalUnread: 4,
        feedbackUnread: 3,
        invitationUnread: 1
      },
      recentActivity: []
    }),
    resendInvitation: jest.fn(),
    acceptInvitation: jest.fn()
  }
}))

const mockPush = jest.fn()

describe('Dashboard Layout Improvements', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    })
  })

  describe('그리드 레이아웃 표준화', () => {
    it('피드백 및 초대 카드가 동일한 높이를 가져야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByText('새 피드백 요약')).toBeInTheDocument()
      })

      const feedbackCard = screen.getByText('새 피드백 요약').closest('.min-h-\\[320px\\]')
      const invitationCard = screen.getByText('초대 관리 요약').closest('.min-h-\\[320px\\]')
      
      expect(feedbackCard).toBeInTheDocument()
      expect(invitationCard).toBeInTheDocument()
    })

    it('빠른 네비게이션이 반응형 그리드 레이아웃을 사용해야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByText('빠른 이동')).toBeInTheDocument()
      })

      const navigationGrid = screen.getByText('빠른 이동').parentElement?.querySelector('.grid')
      expect(navigationGrid).toHaveClass('grid-cols-2', 'sm:grid-cols-4')
    })

    it('프로젝트 현황 통계가 일관된 간격으로 배치되어야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByText('프로젝트 현황')).toBeInTheDocument()
      })

      const statsGrid = screen.getByText('프로젝트 현황').parentElement?.querySelector('.grid')
      expect(statsGrid).toHaveClass('gap-4')
    })
  })

  describe('아이콘 크기 표준화', () => {
    it('빠른 네비게이션 아이콘들이 모두 동일한 크기여야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByText('캘린더')).toBeInTheDocument()
      })

      const navigationButtons = screen.getAllByRole('button').filter(
        button => button.getAttribute('aria-label')?.includes('페이지로 이동')
      )

      navigationButtons.forEach(button => {
        const icon = button.querySelector('svg')
        expect(icon).toHaveClass('w-6', 'h-6')
        
        const iconContainer = button.querySelector('div')
        expect(iconContainer).toHaveClass('w-16', 'h-16')
      })
    })

    it('프로젝트 현황 카드 아이콘들이 표준화된 크기를 가져야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByText('전체')).toBeInTheDocument()
      })

      // 프로젝트 현황 카드들의 아이콘 확인
      const statsSection = screen.getByText('프로젝트 현황').parentElement
      const cardIcons = statsSection?.querySelectorAll('.bg-vridge-500 svg, .bg-primary-500 svg, .bg-success-500 svg, .bg-warning-500 svg')
      
      cardIcons?.forEach(icon => {
        expect(icon).toHaveClass('w-6', 'h-6')
      })
    })
  })

  describe('버튼 스타일 일관성', () => {
    it('전체보기 버튼들이 일관된 스타일을 가져야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByText('새 피드백 요약')).toBeInTheDocument()
      })

      const viewAllButtons = screen.getAllByText('전체보기')
      expect(viewAllButtons.length).toBeGreaterThan(0)
      
      viewAllButtons.forEach(button => {
        // 버튼이 적절한 스타일 클래스를 가지는지 확인
        expect(button).toHaveClass('transition-colors')
        expect(button.closest('button')).toBeInTheDocument()
      })
    })

    it('빠른 작업 버튼들이 hover 효과를 가져야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByText('새 프로젝트')).toBeInTheDocument()
      })

      const quickActionButtons = [
        screen.getByText('새 프로젝트').closest('button'),
        screen.getByText('일정 추가').closest('button')
      ]

      quickActionButtons.forEach(button => {
        expect(button).toHaveClass('group', 'transition-all')
      })
    })
  })

  describe('접근성 개선', () => {
    it('모든 네비게이션 버튼이 적절한 aria-label을 가져야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('캘린더 페이지로 이동')).toBeInTheDocument()
      })

      const navigationLabels = [
        '캘린더 페이지로 이동',
        '프로젝트 페이지로 이동',
        '피드백 페이지로 이동',
        '영상 기획 페이지로 이동'
      ]

      navigationLabels.forEach(label => {
        expect(screen.getByLabelText(label)).toBeInTheDocument()
      })
    })

    it('전체보기 버튼들이 적절한 aria-label을 가져야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('프로젝트 전체보기')).toBeInTheDocument()
      })
    })
  })

  describe('반응형 레이아웃', () => {
    it('최근 활동과 빠른 작업이 적절한 비율로 배치되어야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByText('최근 활동')).toBeInTheDocument()
      })

      const activitySection = screen.getByText('최근 활동').closest('.xl\\:col-span-2')
      const quickActionsSection = screen.getByText('빠른 작업').closest('.xl\\:col-span-1')
      
      expect(activitySection).toBeInTheDocument()
      expect(quickActionsSection).toBeInTheDocument()
    })

    it('모바일에서 단일 컬럼으로 배치되어야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByText('최근 활동')).toBeInTheDocument()
      })

      const mainGrid = screen.getByText('최근 활동').closest('.grid')
      expect(mainGrid).toHaveClass('grid-cols-1')
    })
  })

  describe('시각적 일관성', () => {
    it('모든 카드가 일관된 border-radius를 사용해야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByText('새 피드백 요약')).toBeInTheDocument()
      })

      const cards = [
        screen.getByText('새 피드백 요약').closest('div'),
        screen.getByText('초대 관리 요약').closest('div'),
        screen.getByText('최근 활동').closest('div'),
        screen.getByText('빠른 작업').closest('div')
      ]

      cards.forEach(card => {
        expect(card).toHaveClass('rounded-xl')
      })
    })

    it('모든 카드가 일관된 padding을 사용해야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByText('새 피드백 요약')).toBeInTheDocument()
      })

      const cards = [
        screen.getByText('새 피드백 요약').closest('.p-6'),
        screen.getByText('초대 관리 요약').closest('.p-6'),
        screen.getByText('최근 활동').closest('.p-6'),
        screen.getByText('빠른 작업').closest('.p-6')
      ]

      cards.forEach(card => {
        expect(card).toBeInTheDocument()
      })
    })
  })

  describe('사용자 상호작용', () => {
    it('네비게이션 버튼 클릭 시 올바른 경로로 이동해야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('캘린더 페이지로 이동')).toBeInTheDocument()
      })

      const calendarButton = screen.getByLabelText('캘린더 페이지로 이동')
      fireEvent.click(calendarButton)
      
      expect(mockPush).toHaveBeenCalledWith('/calendar')
    })

    it('빠른 작업 버튼 클릭 시 올바른 경로로 이동해야 한다', async () => {
      render(<DashboardPage />)
      
      await waitFor(() => {
        expect(screen.getByText('새 프로젝트')).toBeInTheDocument()
      })

      const newProjectButton = screen.getByText('새 프로젝트').closest('button')
      if (newProjectButton) {
        fireEvent.click(newProjectButton)
        expect(mockPush).toHaveBeenCalledWith('/projects/create')
      }
    })
  })
})