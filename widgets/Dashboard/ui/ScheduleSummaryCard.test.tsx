/**
 * ScheduleSummaryCard 테스트
 * TDD Red Phase: 편집 일정 간트 요약 카드 위젯의 실패 테스트 작성
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'

import { ScheduleSummaryCard } from './ScheduleSummaryCard'
import type { ScheduleStats } from '../model/types'

const mockScheduleStats: ScheduleStats = {
  totalProjects: 3,
  onTimeProjects: 2,
  delayedProjects: 1,
  completedThisWeek: 0,
  upcomingDeadlines: [
    {
      id: 'schedule-1',
      title: '브랜드 홍보 영상',
      phases: {
        planning: {
          startDate: '2025-08-20',
          endDate: '2025-08-25',
          progress: 100,
          status: 'completed'
        },
        shooting: {
          startDate: '2025-08-26',
          endDate: '2025-08-30',
          progress: 75,
          status: 'in_progress'
        },
        editing: {
          startDate: '2025-08-31',
          endDate: '2025-09-10',
          progress: 0,
          status: 'not_started'
        }
      },
      overallProgress: 58,
      priority: 'high',
      isDelayed: false,
      nextMilestone: '촬영 완료 (8/30)'
    }
  ],
  currentProjects: [
    {
      id: 'schedule-2',
      title: '제품 소개 영상',
      phases: {
        planning: {
          startDate: '2025-08-15',
          endDate: '2025-08-20',
          progress: 100,
          status: 'completed'
        },
        shooting: {
          startDate: '2025-08-21',
          endDate: '2025-08-25',
          progress: 100,
          status: 'completed'
        },
        editing: {
          startDate: '2025-08-26',
          endDate: '2025-09-05',
          progress: 45,
          status: 'in_progress'
        }
      },
      overallProgress: 82,
      priority: 'medium',
      isDelayed: true,
      nextMilestone: '편집 완료 (9/5)'
    }
  ]
}

describe('ScheduleSummaryCard', () => {
  const mockOnViewDetails = jest.fn()
  const mockOnProjectClick = jest.fn()
  const mockOnViewTypeChange = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('렌더링', () => {
    it('편집 일정 간트 제목이 표시되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      expect(screen.getByText('편집 일정 간트')).toBeInTheDocument()
    })

    it('프로젝트 통계가 올바르게 표시되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      expect(screen.getByText('전체 3개')).toBeInTheDocument()
      expect(screen.getByText('정상 2개')).toBeInTheDocument()
      expect(screen.getByText('지연 1개')).toBeInTheDocument()
    })

    it('주간 보기가 기본으로 선택되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      const weekButton = screen.getByRole('button', { name: /주간/i })
      expect(weekButton).toHaveClass('bg-primary-500')
    })

    it('월간 보기로 전환할 수 있어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="month"
        />
      )
      
      const monthButton = screen.getByRole('button', { name: /월간/i })
      expect(monthButton).toHaveClass('bg-primary-500')
    })

    it('프로젝트 간트 차트가 표시되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      expect(screen.getByText('브랜드 홍보 영상')).toBeInTheDocument()
      expect(screen.getByText('제품 소개 영상')).toBeInTheDocument()
    })

    it('각 단계의 진행률이 표시되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      // 브랜드 홍보 영상: 기획 100%, 촬영 75%, 편집 0%
      expect(screen.getByText('58%')).toBeInTheDocument() // 전체 진행률
      expect(screen.getByText('82%')).toBeInTheDocument() // 제품 소개 영상 진행률
    })
  })

  describe('상호작용', () => {
    it('보기 타입 변경 시 onViewTypeChange가 호출되어야 한다', async () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
          onViewTypeChange={mockOnViewTypeChange}
        />
      )
      
      const monthButton = screen.getByRole('button', { name: /월간/i })
      fireEvent.click(monthButton)
      
      await waitFor(() => {
        expect(mockOnViewTypeChange).toHaveBeenCalledWith('month')
      })
    })

    it('프로젝트 클릭 시 onProjectClick이 호출되어야 한다', async () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
          onProjectClick={mockOnProjectClick}
        />
      )
      
      const projectRow = screen.getByText('브랜드 홍보 영상').closest('button')
      expect(projectRow).toBeInTheDocument()
      
      if (projectRow) {
        fireEvent.click(projectRow)
        
        await waitFor(() => {
          expect(mockOnProjectClick).toHaveBeenCalledWith('schedule-1')
        })
      }
    })

    it('전체보기 버튼 클릭 시 onViewDetails가 호출되어야 한다', async () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
          onViewDetails={mockOnViewDetails}
        />
      )
      
      const viewDetailsButton = screen.getByRole('button', { name: /전체보기/i })
      fireEvent.click(viewDetailsButton)
      
      await waitFor(() => {
        expect(mockOnViewDetails).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('간트 차트 시각화', () => {
    it('각 단계별 진행률 바가 표시되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      // 기획, 촬영, 편집 단계 레이블
      expect(screen.getByText('기획')).toBeInTheDocument()
      expect(screen.getByText('촬영')).toBeInTheDocument()
      expect(screen.getByText('편집')).toBeInTheDocument()
    })

    it('완료된 단계는 녹색으로 표시되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      // 완료된 기획 단계를 찾아서 녹색인지 확인
      const completedPhase = screen.getByTestId('phase-planning-schedule-1')
      expect(completedPhase).toHaveClass('bg-success-500')
    })

    it('진행 중인 단계는 파란색으로 표시되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      // 진행 중인 촬영 단계를 찾아서 파란색인지 확인
      const inProgressPhase = screen.getByTestId('phase-shooting-schedule-1')
      expect(inProgressPhase).toHaveClass('bg-primary-500')
    })

    it('지연된 프로젝트는 경고 표시가 있어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      expect(screen.getByText('지연')).toBeInTheDocument()
      expect(screen.getByTestId('delayed-indicator')).toBeInTheDocument()
    })
  })

  describe('우선순위 표시', () => {
    it('높은 우선순위는 빨간색 점으로 표시되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      const highPriorityDot = screen.getByTestId('priority-high')
      expect(highPriorityDot).toHaveClass('bg-error-500')
    })

    it('중간 우선순위는 주황색 점으로 표시되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      const mediumPriorityDot = screen.getByTestId('priority-medium')
      expect(mediumPriorityDot).toHaveClass('bg-warning-500')
    })
  })

  describe('마일스톤 표시', () => {
    it('다음 마일스톤이 표시되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      expect(screen.getByText('촬영 완료 (8/30)')).toBeInTheDocument()
      expect(screen.getByText('편집 완료 (9/5)')).toBeInTheDocument()
    })

    it('Today 마커가 표시되어야 한다', () => {
      // Mock 현재 날짜를 2025-08-28로 설정
      const mockDate = new Date('2025-08-28')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)
      
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      expect(screen.getByText('Today')).toBeInTheDocument()
      expect(screen.getByTestId('today-marker')).toBeInTheDocument()
      
      jest.restoreAllMocks()
    })
  })

  describe('범례', () => {
    it('간트 차트 범례가 표시되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      expect(screen.getByText('완료')).toBeInTheDocument()
      expect(screen.getByText('진행중')).toBeInTheDocument()
      expect(screen.getByText('예정')).toBeInTheDocument()
      expect(screen.getByText('지연')).toBeInTheDocument()
    })
  })

  describe('빈 상태', () => {
    it('프로젝트가 없을 때 빈 상태 메시지가 표시되어야 한다', () => {
      const emptyStats = {
        totalProjects: 0,
        onTimeProjects: 0,
        delayedProjects: 0,
        completedThisWeek: 0,
        upcomingDeadlines: [],
        currentProjects: []
      }
      
      render(
        <ScheduleSummaryCard 
          data={emptyStats} 
          viewType="week"
        />
      )
      
      expect(screen.getByText('진행 중인 프로젝트가 없습니다')).toBeInTheDocument()
      expect(screen.getByText('새 프로젝트를 생성하여 일정을 관리해보세요.')).toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('적절한 ARIA 레이블이 설정되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      const card = screen.getByRole('region', { name: /편집 일정/i })
      expect(card).toBeInTheDocument()
      
      const ganttChart = screen.getByRole('table', { name: /간트 차트/i })
      expect(ganttChart).toBeInTheDocument()
    })

    it('키보드 네비게이션이 가능해야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
          onProjectClick={mockOnProjectClick}
        />
      )
      
      const firstProject = screen.getByText('브랜드 홍보 영상').closest('button')
      expect(firstProject).toBeInTheDocument()
      expect(firstProject).toHaveAttribute('tabIndex', '0')
    })
  })

  describe('툴팁', () => {
    it('진행률 바에 마우스 오버 시 툴팁이 표시되어야 한다', () => {
      render(
        <ScheduleSummaryCard 
          data={mockScheduleStats} 
          viewType="week"
        />
      )
      
      const progressBar = screen.getByTestId('phase-shooting-schedule-1')
      fireEvent.mouseEnter(progressBar)
      
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
      expect(screen.getByText('촬영: 75% 완료')).toBeInTheDocument()
    })
  })
})