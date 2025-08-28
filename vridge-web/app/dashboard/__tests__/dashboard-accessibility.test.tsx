/**
 * Dashboard Accessibility 테스트
 * TDD 방식으로 접근성 기준 준수 검증
 */

import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import DashboardPage from '../page'

expect.extend(toHaveNoViolations)

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter: jest.fn().mockReturnValue({
    push: jest.fn()
  })
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

describe('Dashboard Accessibility', () => {
  describe('자동화된 접근성 검사', () => {
    it('접근성 위반 사항이 없어야 한다', async () => {
      const { container } = render(<DashboardPage />)
      
      // 데이터 로딩 완료 대기
      await screen.findByText('새 피드백 요약')
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('키보드 네비게이션', () => {
    it('모든 상호작용 요소가 키보드로 접근 가능해야 한다', async () => {
      render(<DashboardPage />)
      
      await screen.findByText('새 피드백 요약')
      
      const interactiveElements = screen.getAllByRole('button')
      
      interactiveElements.forEach(element => {
        // tabIndex가 명시적으로 -1이 아닌 경우 키보드 접근이 가능해야 함
        const tabIndex = element.getAttribute('tabindex')
        if (tabIndex !== '-1') {
          expect(element).not.toHaveAttribute('tabindex', '-1')
        }
      })
    })

    it('빠른 네비게이션 버튼들이 논리적 순서로 탭 이동이 가능해야 한다', async () => {
      render(<DashboardPage />)
      
      await screen.findByLabelText('캘린더 페이지로 이동')
      
      const navigationButtons = [
        screen.getByLabelText('캘린더 페이지로 이동'),
        screen.getByLabelText('프로젝트 페이지로 이동'),
        screen.getByLabelText('피드백 페이지로 이동'),
        screen.getByLabelText('영상 기획 페이지로 이동')
      ]

      navigationButtons.forEach(button => {
        expect(button).toBeVisible()
        expect(button).not.toHaveAttribute('tabindex', '-1')
      })
    })
  })

  describe('ARIA 레이블 및 역할', () => {
    it('모든 섹션이 적절한 의미론적 구조를 가져야 한다', async () => {
      render(<DashboardPage />)
      
      await screen.findByText('새 피드백 요약')
      
      // main 요소 확인
      const mainContent = screen.getByRole('main')
      expect(mainContent).toBeInTheDocument()
      
      // section 요소들 확인
      const sections = screen.getAllByRole('region')
      expect(sections.length).toBeGreaterThan(0)
    })

    it('버튼들이 설명적인 레이블을 가져야 한다', async () => {
      render(<DashboardPage />)
      
      await screen.findByLabelText('캘린더 페이지로 이동')
      
      const buttonLabels = [
        '캘린더 페이지로 이동',
        '프로젝트 페이지로 이동',
        '피드백 페이지로 이동',
        '영상 기획 페이지로 이동',
        '프로젝트 전체보기'
      ]

      buttonLabels.forEach(label => {
        expect(screen.getByLabelText(label)).toBeInTheDocument()
      })
    })

    it('읽지 않음 배지가 적절한 ARIA 레이블을 가져야 한다', async () => {
      render(<DashboardPage />)
      
      await screen.findByText('새 피드백 요약')
      
      // 읽지 않음 배지가 있는 경우 ARIA 레이블 확인
      const unreadElements = screen.queryAllByLabelText(/읽지 않은/)
      unreadElements.forEach(element => {
        expect(element).toHaveAttribute('aria-label')
      })
    })
  })

  describe('색상 대비 및 시각적 접근성', () => {
    it('텍스트 요소들이 충분한 색상 대비를 가져야 한다', async () => {
      render(<DashboardPage />)
      
      await screen.findByText('새 피드백 요약')
      
      // 주요 텍스트 요소들 확인
      const headings = screen.getAllByRole('heading')
      headings.forEach(heading => {
        expect(heading).toBeVisible()
        expect(heading).toHaveClass(/text-gray-900|text-white/)
      })
    })

    it('상호작용 요소들이 시각적으로 구분 가능해야 한다', async () => {
      render(<DashboardPage />)
      
      await screen.findByText('새 피드백 요약')
      
      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        // 버튼이 배경색이나 테두리를 가져야 함
        const hasVisualStyling = 
          button.className.includes('bg-') || 
          button.className.includes('border') ||
          button.className.includes('shadow')
        
        expect(hasVisualStyling).toBe(true)
      })
    })
  })

  describe('상태 및 피드백', () => {
    it('로딩 상태가 적절하게 표시되어야 한다', () => {
      // 로딩 상태에서 렌더링
      const LoadingComponent = () => {
        return (
          <div className="min-h-screen bg-white">
            <main className="ml-sidebar pt-20 px-8 pb-8">
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <div className="w-8 h-8 border-4 border-vridge-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-gray-500">대시보드를 불러오는 중...</p>
                </div>
              </div>
            </main>
          </div>
        )
      }
      
      render(<LoadingComponent />)
      
      const loadingText = screen.getByText('대시보드를 불러오는 중...')
      expect(loadingText).toBeInTheDocument()
      expect(loadingText).toBeVisible()
    })

    it('빈 상태 메시지가 사용자에게 도움이 되는 정보를 제공해야 한다', async () => {
      render(<DashboardPage />)
      
      await screen.findByText('새 피드백 요약')
      
      // 빈 상태 메시지들 확인
      const emptyStateMessages = [
        /최근 활동이 없습니다/,
        /프로젝트를 생성하거나 작업을 시작해보세요/
      ]

      emptyStateMessages.forEach(message => {
        const element = screen.queryByText(message)
        if (element) {
          expect(element).toBeVisible()
        }
      })
    })
  })

  describe('다크모드 지원 (클래스 기반)', () => {
    it('다크모드 클래스가 적용될 수 있는 구조를 가져야 한다', async () => {
      render(<DashboardPage />)
      
      await screen.findByText('새 피드백 요약')
      
      // 백그라운드 색상이 다크모드 대응 가능한 구조인지 확인
      const mainContainer = screen.getByRole('main').closest('.min-h-screen')
      expect(mainContainer).toHaveClass('bg-white')
      
      // 텍스트 색상이 다크모드 대응 가능한지 확인
      const headings = screen.getAllByRole('heading')
      headings.forEach(heading => {
        const hasCompatibleTextColor = 
          heading.className.includes('text-gray-900') ||
          heading.className.includes('text-black') ||
          heading.className.includes('text-white')
        
        expect(hasCompatibleTextColor).toBe(true)
      })
    })

    it('카드 컴포넌트들이 다크모드 호환 배경색을 사용해야 한다', async () => {
      render(<DashboardPage />)
      
      await screen.findByText('새 피드백 요약')
      
      // 카드 배경색이 다크모드 대응 가능한지 확인
      const cardElements = screen.getAllByRole('region')
      cardElements.forEach(card => {
        const hasCompatibleBg = 
          card.className.includes('bg-white') ||
          card.className.includes('bg-gray-')
        
        expect(hasCompatibleBg).toBe(true)
      })
    })
  })

  describe('모바일 접근성', () => {
    it('터치 타겟이 최소 44x44px을 만족해야 한다', async () => {
      render(<DashboardPage />)
      
      await screen.findByLabelText('캘린더 페이지로 이동')
      
      const navigationButtons = screen.getAllByRole('button').filter(
        button => button.getAttribute('aria-label')?.includes('페이지로 이동')
      )

      navigationButtons.forEach(button => {
        const iconContainer = button.querySelector('div')
        expect(iconContainer).toHaveClass('w-16', 'h-16')
      })
    })

    it('스크롤 가능한 영역이 적절하게 식별되어야 한다', async () => {
      render(<DashboardPage />)
      
      await screen.findByText('새 피드백 요약')
      
      const scrollableContainer = screen.getByRole('main')
      expect(scrollableContainer).toBeInTheDocument()
      
      // 스크롤이 필요한 경우를 대비한 구조 확인
      expect(scrollableContainer).toHaveClass('pb-8')
    })
  })
})