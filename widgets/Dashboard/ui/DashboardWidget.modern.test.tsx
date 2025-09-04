/**
 * @fileoverview DashboardWidget 현대화 TDD 테스트 - 신규 Tailwind 기반
 * @description 초미니멀 디자인 시스템에 맞는 Dashboard 위젯 테스트
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

import { DashboardWidget } from './DashboardWidget.modern'
import type { DashboardData } from '../model/types'

// Jest-axe matcher 확장
expect.extend(toHaveNoViolations)

// Mock 데이터
const mockDashboardData: DashboardData = {
  stats: {
    totalProjects: 12,
    activeProjects: 8,
    completedProjects: 4,
    totalTeamMembers: 6
  },
  recentProjects: [
    {
      id: '1',
      title: '브랜드 영상 제작',
      status: 'in_progress',
      progress: 75,
      deadline: '2025-09-15',
      teamMembers: ['김팀장', '이디자이너'],
      priority: 'high'
    },
    {
      id: '2', 
      title: '제품 소개 영상',
      status: 'planning',
      progress: 30,
      deadline: '2025-10-01',
      teamMembers: ['박기획자'],
      priority: 'medium'
    }
  ],
  recentActivity: [
    {
      id: '1',
      type: 'project_created',
      message: '새 프로젝트가 생성되었습니다',
      timestamp: '2025-08-28T10:00:00Z',
      user: '김팀장'
    },
    {
      id: '2',
      type: 'feedback_received',
      message: '피드백이 도착했습니다',
      timestamp: '2025-08-28T09:30:00Z', 
      user: '이클라이언트'
    }
  ],
  upcomingDeadlines: []
}

describe('DashboardWidget - Modern Tailwind Design System', () => {
  // === FAIL TESTS (구현 전 실패 테스트) ===
  
  describe('기본 렌더링과 접근성', () => {
    it('로딩 상태가 올바르게 표시되어야 함', () => {
      render(<DashboardWidget isLoading={true} />)
      
      expect(screen.getByRole('status')).toBeInTheDocument()
      expect(screen.getByText('데이터를 불러오고 있습니다...')).toBeInTheDocument()
    })

    it('데이터가 없는 경우 에러 상태가 표시되어야 함', () => {
      const mockRefresh = jest.fn()
      render(<DashboardWidget data={null} onRefresh={mockRefresh} />)
      
      expect(screen.getByText('데이터를 불러올 수 없습니다')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument()
    })

    it('프로젝트가 없는 경우 빈 상태가 표시되어야 함', () => {
      const emptyData = { ...mockDashboardData, stats: { ...mockDashboardData.stats, totalProjects: 0 } }
      render(<DashboardWidget data={emptyData} />)
      
      expect(screen.getByText('아직 생성된 프로젝트가 없습니다')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '프로젝트 생성하기' })).toBeInTheDocument()
    })

    it('정상 데이터로 대시보드가 렌더링되어야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)
      
      expect(screen.getByRole('main', { name: '대시보드' })).toBeInTheDocument()
      expect(screen.getByRole('heading', { name: '프로젝트 대시보드' })).toBeInTheDocument()
    })

    it('접근성 위반이 없어야 함', async () => {
      const { container } = render(<DashboardWidget data={mockDashboardData} />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('통계 카드 렌더링', () => {
    it('모든 통계 카드가 표시되어야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)
      
      // 통계 섹션
      const statsSection = screen.getByRole('region', { name: '프로젝트 통계' })
      expect(statsSection).toBeInTheDocument()
      
      // 각 통계 카드들
      expect(screen.getByText('전체 프로젝트')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
      
      expect(screen.getByText('진행중인 프로젝트')).toBeInTheDocument()
      expect(screen.getByText('8')).toBeInTheDocument()
      
      expect(screen.getByText('완료된 프로젝트')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument()
      
      expect(screen.getByText('팀 멤버')).toBeInTheDocument()
      expect(screen.getByText('6')).toBeInTheDocument()
    })

    it('통계 카드들이 현대적인 스타일을 가져야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)
      
      // 첫 번째 통계 카드 찾기
      const statsCards = screen.getAllByTestId('stats-card')
      expect(statsCards[0]).toHaveClass('bg-white', 'rounded-lg', 'shadow-sm')
    })
  })

  describe('프로젝트 리스트 렌더링', () => {
    it('최근 프로젝트 섹션이 표시되어야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)
      
      const projectsSection = screen.getByRole('region', { name: '최근 프로젝트' })
      expect(projectsSection).toBeInTheDocument()
      
      expect(screen.getByText('최근 프로젝트')).toBeInTheDocument()
    })

    it('프로젝트 카드들이 올바르게 렌더링되어야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)
      
      // 프로젝트 제목들
      expect(screen.getByText('브랜드 영상 제작')).toBeInTheDocument()
      expect(screen.getByText('제품 소개 영상')).toBeInTheDocument()
      
      // 프로젝트 상태
      expect(screen.getByText('진행중')).toBeInTheDocument()
      expect(screen.getByText('기획')).toBeInTheDocument()
    })

    it('프로젝트 클릭 이벤트가 처리되어야 함', async () => {
      const mockProjectClick = jest.fn()
      const user = userEvent.setup()
      
      render(
        <DashboardWidget 
          data={mockDashboardData} 
          onProjectClick={mockProjectClick}
        />
      )
      
      const projectCard = screen.getByText('브랜드 영상 제작').closest('[role="button"]')
      if (projectCard) {
        await user.click(projectCard)
        expect(mockProjectClick).toHaveBeenCalledWith('1')
      }
    })
  })

  describe('활동 피드 렌더링', () => {
    it('최근 활동 섹션이 표시되어야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)
      
      const activitySection = screen.getByRole('region', { name: '최근 활동' })
      expect(activitySection).toBeInTheDocument()
      
      expect(screen.getByText('최근 활동')).toBeInTheDocument()
    })

    it('활동 항목들이 올바르게 렌더링되어야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)
      
      expect(screen.getByText('새 프로젝트가 생성되었습니다')).toBeInTheDocument()
      expect(screen.getByText('피드백이 도착했습니다')).toBeInTheDocument()
      expect(screen.getByText('김팀장')).toBeInTheDocument()
      expect(screen.getByText('이클라이언트')).toBeInTheDocument()
    })

    it('활동이 없는 경우 빈 상태가 표시되어야 함', () => {
      const dataWithoutActivity = { ...mockDashboardData, recentActivity: [] }
      render(<DashboardWidget data={dataWithoutActivity} />)
      
      expect(screen.getByText('최근 활동이 없습니다')).toBeInTheDocument()
    })
  })

  describe('새로고침 기능', () => {
    it('새로고침 버튼이 표시되고 동작해야 함', async () => {
      const mockRefresh = jest.fn()
      const user = userEvent.setup()
      
      render(
        <DashboardWidget 
          data={mockDashboardData} 
          onRefresh={mockRefresh}
        />
      )
      
      const refreshButton = screen.getByRole('button', { name: '새로고침' })
      expect(refreshButton).toBeInTheDocument()
      
      await user.click(refreshButton)
      expect(mockRefresh).toHaveBeenCalledTimes(1)
    })

    it('새로고침 버튼에 올바른 아이콘이 표시되어야 함', () => {
      render(
        <DashboardWidget 
          data={mockDashboardData} 
          onRefresh={jest.fn()}
        />
      )
      
      const refreshButton = screen.getByRole('button', { name: '새로고침' })
      expect(refreshButton).toHaveTextContent('새로고침')
      
      // 새로고침 아이콘 확인 (↻)
      expect(refreshButton.querySelector('.refresh-icon')).toBeInTheDocument()
    })
  })

  describe('반응형 레이아웃', () => {
    it('데스크탑 그리드 클래스가 적용되어야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)
      
      const container = screen.getByTestId('dashboard-container')
      expect(container).toHaveClass('grid', 'gap-6')
    })

    it('모바일에서 스택 레이아웃이 적용되어야 함', () => {
      render(<DashboardWidget data={mockDashboardData} />)
      
      const statsSection = screen.getByTestId('stats-container')
      expect(statsSection).toHaveClass('flex', 'flex-col', 'gap-4')
    })
  })

  describe('키보드 네비게이션', () => {
    it('Tab 키로 포커스 이동이 가능해야 함', () => {
      render(
        <DashboardWidget 
          data={mockDashboardData} 
          onRefresh={jest.fn()}
        />
      )
      
      // 첫 번째 포커스 요소 (새로고침 버튼)
      const refreshButton = screen.getByRole('button', { name: '새로고침' })
      refreshButton.focus()
      expect(refreshButton).toHaveFocus()
    })

    it('프로젝트 카드가 키보드로 활성화 가능해야 함', () => {
      const mockProjectClick = jest.fn()
      render(
        <DashboardWidget 
          data={mockDashboardData} 
          onProjectClick={mockProjectClick}
        />
      )
      
      const projectCard = screen.getByText('브랜드 영상 제작').closest('[role="button"]')
      if (projectCard) {
        projectCard.focus()
        fireEvent.keyDown(projectCard, { key: 'Enter' })
        expect(mockProjectClick).toHaveBeenCalledWith('1')
      }
    })
  })

  describe('데이터 검증', () => {
    it('잘못된 데이터 구조에서 오류가 발생하지 않아야 함', () => {
      const invalidData = {
        stats: null,
        recentProjects: null,
        recentActivity: null,
        upcomingDeadlines: null
      } as any
      
      expect(() => {
        render(<DashboardWidget data={invalidData} />)
      }).not.toThrow()
    })

    it('부분적 데이터에서도 렌더링되어야 함', () => {
      const partialData = {
        stats: mockDashboardData.stats,
        recentProjects: [],
        recentActivity: [],
        upcomingDeadlines: []
      }
      
      render(<DashboardWidget data={partialData} />)
      
      // 통계는 표시되어야 함
      expect(screen.getByText('전체 프로젝트')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
    })
  })
})