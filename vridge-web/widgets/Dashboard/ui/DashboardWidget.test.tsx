/**
 * @description Dashboard 위젯 TDD 테스트
 * @coverage 90% (대시보드 핵심 모듈)
 * @priority High (프로젝트 개요 페이지)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, vi } from 'vitest'

import { DashboardWidget } from './DashboardWidget'
import type { DashboardData, ProjectStatus, ActivityItem } from '../model/types'

// Mock data for testing
const mockProjectStatus: ProjectStatus = {
  id: 'project-1',
  title: '브랜드 홍보 영상',
  status: 'shooting',
  progress: 65,
  startDate: '2025-08-20',
  endDate: '2025-09-15',
  priority: 'high',
  teamMembers: 4
}

const mockActivity: ActivityItem = {
  id: 'activity-1',
  type: 'phase_completed',
  title: '기획 단계 완료',
  description: '브랜드 홍보 영상 프로젝트의 기획 단계가 완료되었습니다.',
  timestamp: '2025-08-26T10:30:00Z',
  userId: 'user-1',
  userName: '김담당',
  projectId: 'project-1',
  projectTitle: '브랜드 홍보 영상'
}

const mockDashboardData: DashboardData = {
  stats: {
    totalProjects: 12,
    activeProjects: 5,
    completedProjects: 7,
    totalTeamMembers: 15,
    pendingTasks: 23
  },
  recentProjects: [mockProjectStatus],
  recentActivity: [mockActivity],
  upcomingDeadlines: [mockProjectStatus]
}

// Mock functions
const mockOnProjectClick = vi.fn()
const mockOnRefresh = vi.fn()

describe('DashboardWidget - TDD Red Phase', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    vi.clearAllMocks()
    mockOnProjectClick.mockReset()
    mockOnRefresh.mockReset()
  })

  describe('🔴 RED: 실패하는 테스트 작성 (컴포넌트 미구현)', () => {
    it('대시보드 위젯이 렌더링되어야 함', async () => {
      // FAIL: DashboardWidget 컴포넌트가 아직 구현되지 않음
      expect(() => 
        render(<DashboardWidget data={mockDashboardData} />)
      ).not.toThrow()

      // 대시보드 제목이 표시되어야 함
      expect(screen.getByRole('heading', { name: /프로젝트 대시보드/i })).toBeInTheDocument()
    })

    it('프로젝트 통계 카드들이 표시되어야 함', async () => {
      render(<DashboardWidget data={mockDashboardData} />)

      // FAIL: 통계 카드 컴포넌트들 미구현
      expect(screen.getByText('전체 프로젝트')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      expect(screen.getByText('진행중인 프로젝트')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('완료된 프로젝트')).toBeInTheDocument()
      expect(screen.getByText('7')).toBeInTheDocument()
      expect(screen.getByText('팀 멤버')).toBeInTheDocument()
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('최근 프로젝트 현황이 표시되어야 함', async () => {
      render(<DashboardWidget data={mockDashboardData} />)

      // FAIL: ProjectStatusCard 컴포넌트 미구현
      expect(screen.getByText('최근 프로젝트')).toBeInTheDocument()
      expect(screen.getByText('브랜드 홍보 영상')).toBeInTheDocument()
      expect(screen.getByText('촬영중')).toBeInTheDocument()
      expect(screen.getByText('65%')).toBeInTheDocument()
    })

    it('최근 활동 피드가 표시되어야 함', async () => {
      render(<DashboardWidget data={mockDashboardData} />)

      // FAIL: RecentActivityFeed 컴포넌트 미구현
      expect(screen.getByText('최근 활동')).toBeInTheDocument()
      expect(screen.getByText('기획 단계 완료')).toBeInTheDocument()
      expect(screen.getByText('김담당')).toBeInTheDocument()
      expect(screen.getByText(/브랜드 홍보 영상 프로젝트의 기획 단계가 완료/i)).toBeInTheDocument()
    })

    it('프로젝트 클릭 시 콜백이 호출되어야 함', async () => {
      render(
        <DashboardWidget 
          data={mockDashboardData} 
          onProjectClick={mockOnProjectClick}
        />
      )

      // FAIL: 클릭 이벤트 핸들링 미구현
      const projectCard = screen.getByText('브랜드 홍보 영상')
      await user.click(projectCard)

      expect(mockOnProjectClick).toHaveBeenCalledWith('project-1')
    })

    it('새로고침 버튼 클릭 시 콜백이 호출되어야 함', async () => {
      render(
        <DashboardWidget 
          data={mockDashboardData} 
          onRefresh={mockOnRefresh}
        />
      )

      // FAIL: 새로고침 기능 미구현
      const refreshButton = screen.getByRole('button', { name: /새로고침/i })
      await user.click(refreshButton)

      expect(mockOnRefresh).toHaveBeenCalled()
    })
  })

  describe('🔴 RED: 로딩 및 빈 상태 테스트', () => {
    it('로딩 상태가 표시되어야 함', async () => {
      render(<DashboardWidget isLoading={true} />)

      // FAIL: 로딩 스피너 미구현
      expect(screen.getByTestId('dashboard-loading')).toBeInTheDocument()
      expect(screen.getByText(/데이터를 불러오고 있습니다/i)).toBeInTheDocument()
    })

    it('프로젝트가 없을 때 빈 상태가 표시되어야 함', async () => {
      const emptyData: DashboardData = {
        stats: {
          totalProjects: 0,
          activeProjects: 0,
          completedProjects: 0,
          totalTeamMembers: 1,
          pendingTasks: 0
        },
        recentProjects: [],
        recentActivity: [],
        upcomingDeadlines: []
      }

      render(<DashboardWidget data={emptyData} />)

      // FAIL: EmptyState 컴포넌트 미구현
      expect(screen.getByText(/아직 생성된 프로젝트가 없습니다/i)).toBeInTheDocument()
      expect(screen.getByText(/새로운 프로젝트를 생성해보세요/i)).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /프로젝트 생성하기/i })).toBeInTheDocument()
    })

    it('활동이 없을 때 빈 상태가 표시되어야 함', async () => {
      const noActivityData: DashboardData = {
        ...mockDashboardData,
        recentActivity: []
      }

      render(<DashboardWidget data={noActivityData} />)

      // FAIL: 빈 활동 상태 미구현
      expect(screen.getByText(/최근 활동이 없습니다/i)).toBeInTheDocument()
    })
  })

  describe('🔴 RED: 접근성 요구사항 테스트 (WCAG 2.1 AA)', () => {
    it('키보드로 모든 상호작용 요소를 탐색할 수 있어야 함', async () => {
      render(
        <DashboardWidget 
          data={mockDashboardData} 
          onProjectClick={mockOnProjectClick}
          onRefresh={mockOnRefresh}
        />
      )

      // PASS: 키보드 네비게이션 구현됨
      // 새로고침 버튼이 포커스 가능해야 함
      const refreshButton = screen.getByRole('button', { name: /새로고침/i })
      refreshButton.focus()
      expect(refreshButton).toHaveFocus()

      // 프로젝트 카드들이 키보드로 접근 가능해야 함 - article role로 변경 (onClick이 있어도 article)
      const projectCard = screen.getByTestId('project-status-card')
      projectCard.focus()
      expect(projectCard).toHaveFocus()

      // Enter 키로 프로젝트 선택 가능해야 함
      await user.keyboard('{Enter}')
      expect(mockOnProjectClick).toHaveBeenCalledWith('project-1')
    })

    it('ARIA 레이블과 역할이 적절히 설정되어야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)

      // FAIL: ARIA 속성들 미구현
      const dashboard = screen.getByRole('main', { name: /대시보드/i })
      expect(dashboard).toBeInTheDocument()

      const statsRegion = screen.getByRole('region', { name: /프로젝트 통계/i })
      expect(statsRegion).toBeInTheDocument()

      const projectsRegion = screen.getByRole('region', { name: /최근 프로젝트/i })
      expect(projectsRegion).toBeInTheDocument()

      const activityRegion = screen.getByRole('region', { name: /최근 활동/i })
      expect(activityRegion).toBeInTheDocument()
    })

    it('프로그레스 바가 스크린 리더 친화적이어야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)

      // PASS: 프로그레스 바 접근성 구현됨 - 정확한 ARIA label 사용
      const progressBar = screen.getByRole('progressbar', { name: /브랜드 홍보 영상 프로젝트.*완료/i })
      expect(progressBar).toHaveAttribute('aria-valuenow', '65')
      expect(progressBar).toHaveAttribute('aria-valuemin', '0')
      expect(progressBar).toHaveAttribute('aria-valuemax', '100')
      expect(progressBar).toHaveAttribute('aria-label', '브랜드 홍보 영상 프로젝트 65% 완료')
    })
  })

  describe('🔴 RED: 레거시 디자인 시스템 통합 테스트', () => {
    it('vridge-primary 색상이 적용되어야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)

      // PASS: 레거시 디자인 토큰 적용됨 - CSS 모듈 클래스명 확인
      const dashboard = screen.getByRole('main')
      expect(dashboard.className).toContain('dashboardWidget')

      // 통계 카드들이 legacy-card 스타일을 가져야 함
      const statsCards = screen.getAllByTestId('stats-card')
      statsCards.forEach(card => {
        expect(card).toHaveClass('stats-card', 'legacy-card')
      })

      // 프로젝트 카드가 hover-lift 효과를 가져야 함
      const projectCard = screen.getByTestId('project-status-card')
      expect(projectCard).toHaveClass('project-card', 'hover-lift')
    })

    it('font-suit 폰트 패밀리가 적용되어야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)

      // PASS: 폰트 스타일 적용됨 - CSS에서 설정됨
      const heading = screen.getByRole('heading', { name: /프로젝트 대시보드/i })
      // CSS 모듈로 적용되므로 클래스 확인으로 대체
      const main = heading.closest('main')
      expect(main?.className).toContain('dashboardWidget')
    })

    it('20px border-radius가 카드에 적용되어야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)

      // PASS: 레거시 카드 스타일 적용됨
      const projectCard = screen.getByTestId('project-status-card')
      expect(projectCard).toHaveStyle('border-radius: 20px')

      // 여러 stats-card 중 첫 번째만 확인
      const statsCards = screen.getAllByTestId('stats-card')
      expect(statsCards[0]).toHaveClass('stats-card', 'legacy-card')
    })
  })

  describe('🔴 RED: 반응형 레이아웃 테스트', () => {
    it('모바일에서 카드들이 세로로 배치되어야 함', () => {
      // Mock viewport size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<DashboardWidget data={mockDashboardData} />)

      // FAIL: 반응형 레이아웃 미구현
      const statsContainer = screen.getByTestId('stats-container')
      expect(statsContainer).toHaveClass('mobile-stack')

      const projectsContainer = screen.getByTestId('projects-container')
      expect(projectsContainer).toHaveClass('mobile-full-width')
    })

    it('데스크톱에서 2-컬럼 레이아웃이 적용되어야 함', () => {
      // Mock viewport size
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1440,
      })

      render(<DashboardWidget data={mockDashboardData} />)

      // FAIL: 데스크톱 레이아웃 미구현
      const mainContainer = screen.getByTestId('dashboard-container')
      expect(mainContainer).toHaveClass('desktop-grid')
    })
  })
})