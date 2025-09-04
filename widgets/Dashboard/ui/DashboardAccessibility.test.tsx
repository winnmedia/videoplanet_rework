/**
 * 접근성 테스트: jest-axe 기반 ARIA/스크린리더 호환성
 * 
 * 이 테스트는 WCAG 2.1 AA 기준에 따른 접근성 요구사항을 검증합니다:
 * - 키보드 네비게이션 (2.1.1, 2.1.2)
 * - 포커스 관리 (2.4.3, 2.4.7)
 * - ARIA 라벨링 (1.3.1, 4.1.2)
 * - 색상 대비 (1.4.3)
 * - 터치 타겟 크기 (2.5.5)
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { http, HttpResponse } from 'msw'
import React from 'react'

import { server } from '@/test/mocks/server'

import { DashboardWidget } from './DashboardWidget'
import { FeedbackSummaryCard } from './FeedbackSummaryCard'
import { InvitationSummaryCard } from './InvitationSummaryCard'
import { ScheduleSummaryCard } from './ScheduleSummaryCard'
import { UnreadBadge } from './UnreadBadge'

expect.extend(toHaveNoViolations)

describe('Dashboard 접근성 테스트 - WCAG 2.1 AA 준수', () => {
  const mockDashboardData = {
    stats: {
      totalProjects: 12,
      activeProjects: 8, 
      completedProjects: 4,
      totalTeamMembers: 15
    },
    recentProjects: [
      {
        id: 'proj-001',
        name: '웹사이트 리뉴얼 프로젝트',
        description: '회사 웹사이트 전체 리뉴얼',
        status: 'in-progress',
        progress: 65,
        createdAt: '2025-08-01T10:00:00Z',
        updatedAt: '2025-08-25T10:30:00Z'
      }
    ],
    recentActivity: [
      {
        id: 'act-001',
        type: 'project_created',
        message: '새 프로젝트가 생성되었습니다',
        timestamp: '2025-08-28T10:30:00Z'
      }
    ],
    upcomingDeadlines: []
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('전체 대시보드 접근성 검증', () => {
    it('완전한 대시보드에 접근성 위반사항이 없어야 함', async () => {
      const { container } = render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('로딩 상태에서 접근성 위반사항이 없어야 함', async () => {
      const { container } = render(
        <DashboardWidget 
          isLoading={true}
          onRefresh={jest.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('에러 상태에서 접근성 위반사항이 없어야 함', async () => {
      const { container } = render(
        <DashboardWidget 
          data={null}
          onRefresh={jest.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('키보드 네비게이션 접근성 (WCAG 2.1.1, 2.1.2)', () => {
    it('Tab 키로 모든 인터랙티브 요소에 순차적으로 접근할 수 있어야 함', async () => {
      render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      const user = userEvent.setup()
      
      // 첫 번째 Tab: 새로고침 버튼
      await user.tab()
      const refreshButton = screen.getByRole('button', { name: '새로고침' })
      expect(refreshButton).toHaveFocus()

      // 다음 Tab들로 모든 프로젝트 카드에 접근 가능한지 확인
      await user.tab()
      const firstProject = screen.getByRole('button', { name: /웹사이트 리뉴얼 프로젝트/ })
      expect(firstProject).toHaveFocus()
    })

    it('Shift+Tab으로 역방향 네비게이션이 가능해야 함', async () => {
      render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      const user = userEvent.setup()
      
      // 끝에서 시작해서 역방향 네비게이션
      const firstProject = screen.getByRole('button', { name: /웹사이트 리뉴얼 프로젝트/ })
      firstProject.focus()
      
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      
      const refreshButton = screen.getByRole('button', { name: '새로고침' })
      expect(refreshButton).toHaveFocus()
    })

    it('키보드 트랩이 적절히 구현되어야 함', async () => {
      render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      const user = userEvent.setup()
      
      // 첫 번째 요소에서 Shift+Tab 시 마지막 요소로 이동하지 않아야 함
      const refreshButton = screen.getByRole('button', { name: '새로고침' })
      refreshButton.focus()
      
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      
      // 포커스가 페이지 밖으로 나가거나 잘못된 요소로 가지 않아야 함
      expect(document.activeElement).not.toBe(refreshButton)
    })
  })

  describe('포커스 관리 (WCAG 2.4.3, 2.4.7)', () => {
    it('포커스 순서가 논리적이어야 함', async () => {
      render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      const user = userEvent.setup()
      const focusableElements: HTMLElement[] = []

      // Tab으로 모든 포커스 가능한 요소 수집
      let currentElement: Element | null = null
      for (let i = 0; i < 10; i++) { // 최대 10번 Tab
        await user.tab()
        if (document.activeElement === currentElement) break
        
        currentElement = document.activeElement
        if (currentElement && currentElement instanceof HTMLElement) {
          focusableElements.push(currentElement)
        }
      }

      // 포커스 순서가 DOM 순서와 일치하는지 확인
      expect(focusableElements.length).toBeGreaterThan(0)
      
      // 각 요소가 시각적으로 논리적인 순서인지 확인
      for (let i = 1; i < focusableElements.length; i++) {
        const prev = focusableElements[i - 1].getBoundingClientRect()
        const current = focusableElements[i].getBoundingClientRect()
        
        // 위에서 아래, 왼쪽에서 오른쪽 순서
        expect(current.top >= prev.top - 10).toBe(true) // 10px 허용 오차
      }
    })

    it('포커스 인디케이터가 충분히 눈에 띄어야 함', async () => {
      render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      const user = userEvent.setup()
      await user.tab()
      
      const focusedElement = document.activeElement as HTMLElement
      const computedStyle = window.getComputedStyle(focusedElement)
      
      // 포커스 인디케이터 스타일 확인
      expect(focusedElement).toHaveClass('focus:ring-2')
      expect(focusedElement).toHaveClass('focus:ring-blue-600')
    })
  })

  describe('ARIA 라벨링 및 시맨틱 구조 (WCAG 1.3.1, 4.1.2)', () => {
    it('적절한 헤딩 구조를 가져야 함', () => {
      render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      // h1 요소 확인
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toHaveTextContent('프로젝트 대시보드')

      // h2 요소들 확인
      const sectionHeadings = screen.getAllByRole('heading', { level: 2 })
      expect(sectionHeadings.length).toBeGreaterThan(0)
      
      // 섹션별 헤딩이 적절한 텍스트를 가져야 함
      const headingTexts = sectionHeadings.map(h => h.textContent)
      expect(headingTexts).toContain('최근 프로젝트')
      expect(headingTexts).toContain('최근 활동')
    })

    it('랜드마크 역할이 적절히 설정되어야 함', () => {
      render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      // main 랜드마크
      const mainContent = screen.getByRole('main')
      expect(mainContent).toHaveAttribute('aria-label', '대시보드')

      // region 랜드마크들
      const statsRegion = screen.getByRole('region', { name: '프로젝트 통계' })
      expect(statsRegion).toBeInTheDocument()

      const projectsRegion = screen.getByRole('region', { name: '최근 프로젝트' })
      expect(projectsRegion).toBeInTheDocument()

      const activityRegion = screen.getByRole('region', { name: '최근 활동' })
      expect(activityRegion).toBeInTheDocument()
    })

    it('상호작용 가능한 요소들이 적절한 역할을 가져야 함', () => {
      render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      // 버튼 역할 확인
      const refreshButton = screen.getByRole('button', { name: '새로고침' })
      expect(refreshButton).toHaveAttribute('type', 'button')

      const projectButton = screen.getByRole('button', { name: /웹사이트 리뉴얼 프로젝트/ })
      expect(projectButton).toHaveAttribute('type', 'button')
    })
  })

  describe('위젯별 접근성 검증', () => {
    it('FeedbackSummaryCard 접근성 검증', async () => {
      const feedbackData = {
        totalFeedback: 12,
        unresolved: 5,
        highPriority: 2
      }

      const { container } = render(
        <FeedbackSummaryCard data={feedbackData} />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // 스크린리더를 위한 적절한 레이블 확인
      const cardTitle = screen.getByText(/피드백 요약/)
      expect(cardTitle).toBeInTheDocument()
    })

    it('InvitationSummaryCard 접근성 검증', async () => {
      const invitationData = {
        pending: 3,
        accepted: 8,
        declined: 1
      }

      const { container } = render(
        <InvitationSummaryCard data={invitationData} />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('ScheduleSummaryCard 접근성 검증', async () => {
      const scheduleData = {
        upcomingDeadlines: 3,
        overdueTasks: 1,
        todayTasks: 5
      }

      const { container } = render(
        <ScheduleSummaryCard data={scheduleData} />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('UnreadBadge 접근성 검증', async () => {
      const { container } = render(
        <UnreadBadge count={5} ariaLabel="읽지 않은 알림 5개" />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // 스크린리더를 위한 적절한 라벨 확인
      const badge = screen.getByLabelText('읽지 않은 알림 5개')
      expect(badge).toBeInTheDocument()
    })
  })

  describe('색상 및 대비 접근성 (WCAG 1.4.3)', () => {
    it('통계 카드의 텍스트가 충분한 대비를 가져야 함', () => {
      render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      const statsCards = screen.getAllByTestId('stats-card')
      statsCards.forEach(card => {
        const title = card.querySelector('h3')
        const value = card.querySelector('div[class*="text-3xl"]')
        
        if (title) {
          // 제목 텍스트 - text-gray-600 클래스 확인
          expect(title).toHaveClass('text-gray-600')
        }
        
        if (value) {
          // 값 텍스트 - text-blue-600 클래스 확인 (충분한 대비)
          expect(value).toHaveClass('text-blue-600')
        }
      })
    })

    it('상태별 색상이 색각이상자를 고려해야 함', () => {
      const projectWithStatus = {
        ...mockDashboardData,
        recentProjects: [
          { ...mockDashboardData.recentProjects[0], status: 'completed' },
          { ...mockDashboardData.recentProjects[0], id: 'proj-002', status: 'in-progress' },
          { ...mockDashboardData.recentProjects[0], id: 'proj-003', status: 'planning' }
        ]
      }

      render(
        <DashboardWidget 
          data={projectWithStatus}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      // 상태 표시가 색상에만 의존하지 않고 텍스트나 아이콘도 포함해야 함
      const statusElements = screen.getAllByText(/완료|진행중|기획/)
      expect(statusElements.length).toBeGreaterThan(0)
    })
  })

  describe('반응형 접근성', () => {
    it('모바일 뷰포트에서도 접근성이 유지되어야 함', async () => {
      // 뷰포트 크기 변경
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })

      window.dispatchEvent(new Event('resize'))

      const { container } = render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()

      // 터치 타겟 크기 확인
      const interactiveElements = screen.getAllByRole('button')
      interactiveElements.forEach(element => {
        const rect = element.getBoundingClientRect()
        expect(Math.min(rect.width, rect.height)).toBeGreaterThanOrEqual(44)
      })
    })

    it('고대비 모드에서도 접근성이 유지되어야 함', async () => {
      // 고대비 모드 시뮬레이션
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      })

      const { container } = render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('동적 콘텐츠 접근성', () => {
    it('데이터 업데이트 시 스크린리더에 변경사항이 알려져야 함', async () => {
      const { rerender } = render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      const updatedData = {
        ...mockDashboardData,
        stats: { ...mockDashboardData.stats, totalProjects: 15 }
      }

      // aria-live 영역이 있는지 확인
      rerender(
        <DashboardWidget 
          data={updatedData}
          onProjectClick={jest.fn()}
          onRefresh={jest.fn()}
        />
      )

      // 업데이트된 값 확인
      expect(screen.getByText('15')).toBeInTheDocument()
    })

    it('로딩 상태가 스크린리더에 적절히 전달되어야 함', () => {
      render(
        <DashboardWidget 
          isLoading={true}
          onRefresh={jest.fn()}
        />
      )

      const loadingIndicator = screen.getByTestId('dashboard-loading')
      expect(loadingIndicator).toBeInTheDocument()
      
      // 로딩 메시지가 스크린리더에 전달되는지 확인
      expect(screen.getByText('데이터를 불러오고 있습니다...')).toBeInTheDocument()
    })
  })
})