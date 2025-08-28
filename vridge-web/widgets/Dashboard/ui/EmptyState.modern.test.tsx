/**
 * 통합 테스트: 빈 상태 CTA 개선을 위한 테스트 명세
 * 
 * 이 테스트는 다음을 검증합니다:
 * 1. 다양한 빈 상태 시나리오에서의 사용자 경험
 * 2. CTA 버튼의 접근성과 키보드 네비게이션
 * 3. MSW를 통한 API 상태별 UI 반응
 * 4. 사용자 여정 전반의 접근성 준수
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

import { DashboardWidget } from './DashboardWidget'
import { EmptyState } from './EmptyState'

expect.extend(toHaveNoViolations)

describe('EmptyState CTA 개선 - 통합 테스트', () => {
  const mockOnAction = jest.fn()
  const mockOnProjectClick = jest.fn()
  const mockOnRefresh = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('빈 상태 시나리오별 CTA 검증', () => {
    it('완전히 빈 대시보드 - 프로젝트 생성 CTA가 표시되어야 함', async () => {
      // MSW 핸들러: 빈 상태 데이터 모킹
      server.use(
        http.get('*/api/dashboard/stats', () => {
          return HttpResponse.json({
            success: true,
            data: {
              stats: { totalProjects: 0, activeProjects: 0, completedProjects: 0, totalTeamMembers: 1 },
              recentProjects: [],
              recentActivity: [],
              upcomingDeadlines: []
            }
          })
        })
      )

      render(
        <DashboardWidget 
          data={null}
          onProjectClick={mockOnProjectClick}
          onRefresh={mockOnRefresh}
        />
      )

      // 빈 상태 UI 요소 확인
      expect(screen.getByText('아직 생성된 프로젝트가 없습니다')).toBeInTheDocument()
      
      const ctaButton = screen.getByRole('button', { name: '프로젝트 생성하기' })
      expect(ctaButton).toBeInTheDocument()
      expect(ctaButton).toBeVisible()

      // CTA 버튼 접근성 검증
      expect(ctaButton).toHaveAttribute('type', 'button')
      expect(ctaButton).not.toHaveAttribute('disabled')
    })

    it('부분적 데이터 - 최근 프로젝트 빈 상태 CTA 검증', async () => {
      const partialData = {
        stats: { totalProjects: 1, activeProjects: 1, completedProjects: 0, totalTeamMembers: 2 },
        recentProjects: [], // 빈 상태
        recentActivity: [{ id: '1', type: 'task_completed', message: '작업 완료', timestamp: new Date().toISOString() }],
        upcomingDeadlines: []
      }

      render(
        <DashboardWidget 
          data={partialData}
          onProjectClick={mockOnProjectClick}
          onRefresh={mockOnRefresh}
        />
      )

      // 최근 프로젝트 섹션의 빈 상태 확인
      const projectsSection = screen.getByRole('region', { name: '최근 프로젝트' })
      const emptyStateTitle = within(projectsSection).getByText('최근 프로젝트가 없습니다')
      expect(emptyStateTitle).toBeInTheDocument()

      const emptyStateDesc = within(projectsSection).getByText('새로운 프로젝트를 생성해보세요')
      expect(emptyStateDesc).toBeInTheDocument()
    })

    it('로딩 실패 상태 - 새로고침 CTA 검증', async () => {
      render(
        <DashboardWidget 
          data={null}
          onRefresh={mockOnRefresh}
        />
      )

      const refreshButton = screen.getByRole('button', { name: '새로고침' })
      expect(refreshButton).toBeInTheDocument()

      // 새로고침 CTA 클릭 테스트
      const user = userEvent.setup()
      await user.click(refreshButton)

      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('CTA 키보드 접근성', () => {
    it('Tab 키로 CTA 버튼에 포커스할 수 있어야 함', async () => {
      render(
        <EmptyState
          title="테스트 빈 상태"
          description="테스트 설명"
          actionLabel="테스트 액션"
          onAction={mockOnAction}
          illustration="no-projects"
        />
      )

      const user = userEvent.setup()
      
      // Tab으로 CTA 버튼에 포커스
      await user.tab()
      
      const ctaButton = screen.getByRole('button', { name: '테스트 액션' })
      expect(ctaButton).toHaveFocus()
    })

    it('Enter 키와 스페이스 키로 CTA 실행이 가능해야 함', async () => {
      render(
        <EmptyState
          title="테스트 빈 상태"
          description="테스트 설명"
          actionLabel="테스트 액션"
          onAction={mockOnAction}
          illustration="no-projects"
        />
      )

      const user = userEvent.setup()
      const ctaButton = screen.getByRole('button', { name: '테스트 액션' })

      // Enter 키로 액션 실행
      ctaButton.focus()
      await user.keyboard('{Enter}')
      expect(mockOnAction).toHaveBeenCalledTimes(1)

      // 스페이스 키로 액션 실행
      jest.clearMocks()
      ctaButton.focus()
      await user.keyboard(' ')
      expect(mockOnAction).toHaveBeenCalledTimes(1)
    })

    it('Shift+Tab으로 역방향 네비게이션이 가능해야 함', async () => {
      render(
        <div>
          <button data-testid="prev-element">이전 요소</button>
          <EmptyState
            title="테스트 빈 상태"
            description="테스트 설명"
            actionLabel="테스트 액션"
            onAction={mockOnAction}
            illustration="no-projects"
          />
          <button data-testid="next-element">다음 요소</button>
        </div>
      )

      const user = userEvent.setup()
      
      // 다음 요소에서 Shift+Tab으로 CTA 버튼으로 이동
      const nextElement = screen.getByTestId('next-element')
      nextElement.focus()
      
      await user.keyboard('{Shift>}{Tab}{/Shift}')
      
      const ctaButton = screen.getByRole('button', { name: '테스트 액션' })
      expect(ctaButton).toHaveFocus()
    })
  })

  describe('시각적 포커스 인디케이터', () => {
    it('CTA 버튼에 포커스 시 시각적 인디케이터가 표시되어야 함', async () => {
      render(
        <EmptyState
          title="테스트 빈 상태"
          description="테스트 설명"
          actionLabel="테스트 액션"
          onAction={mockOnAction}
          illustration="no-projects"
        />
      )

      const user = userEvent.setup()
      const ctaButton = screen.getByRole('button', { name: '테스트 액션' })

      // Tab으로 포커스하여 focus-visible 적용
      await user.tab()

      // Tailwind CSS 포커스 클래스 확인
      expect(ctaButton).toHaveClass('focus:outline-none')
      expect(ctaButton).toHaveClass('focus:ring-2')
      expect(ctaButton).toHaveClass('focus:ring-blue-600')
    })

    it('최소 터치 타겟 크기를 만족해야 함', () => {
      render(
        <EmptyState
          title="테스트 빈 상태"
          description="테스트 설명"
          actionLabel="테스트 액션"
          onAction={mockOnAction}
          illustration="no-projects"
        />
      )

      const ctaButton = screen.getByRole('button', { name: '테스트 액션' })
      const computedStyle = window.getComputedStyle(ctaButton)

      // 최소 44px × 44px 터치 타겟 크기 확인
      expect(computedStyle.minHeight).toBe('44px')
      expect(computedStyle.minWidth).toBe('44px')
    })
  })

  describe('ARIA 및 시맨틱 마크업', () => {
    it('빈 상태 영역이 적절한 role을 가져야 함', () => {
      render(
        <EmptyState
          title="테스트 빈 상태"
          description="테스트 설명"
          actionLabel="테스트 액션"
          onAction={mockOnAction}
          illustration="no-projects"
        />
      )

      const emptyStateRegion = screen.getByRole('region', { name: '빈 상태' })
      expect(emptyStateRegion).toBeInTheDocument()
    })

    it('제목과 설명이 올바른 헤딩 구조를 가져야 함', () => {
      render(
        <EmptyState
          title="테스트 빈 상태"
          description="테스트 설명"
          actionLabel="테스트 액션"
          onAction={mockOnAction}
          illustration="no-projects"
        />
      )

      const title = screen.getByRole('heading')
      expect(title).toHaveTextContent('테스트 빈 상태')
      
      const description = screen.getByText('테스트 설명')
      expect(description).toBeInTheDocument()
    })

    it('일러스트레이션이 aria-hidden으로 설정되어야 함', () => {
      render(
        <EmptyState
          title="테스트 빈 상태"
          description="테스트 설명"
          actionLabel="테스트 액션"
          onAction={mockOnAction}
          illustration="no-projects"
        />
      )

      // 일러스트레이션 컨테이너가 aria-hidden="true" 속성을 가져야 함
      const illustration = screen.getByText('📁').closest('div')
      expect(illustration).toHaveAttribute('aria-hidden', 'true')
    })
  })

  describe('MSW 통합 - API 상태별 CTA 동작', () => {
    it('API 로딩 중일 때 적절한 로딩 상태를 표시해야 함', async () => {
      // 지연된 API 응답 모킹
      server.use(
        http.get('*/api/dashboard/stats', async () => {
          await new Promise(resolve => setTimeout(resolve, 500))
          return HttpResponse.json({
            success: true,
            data: {
              stats: { totalProjects: 0, activeProjects: 0, completedProjects: 0 },
              recentProjects: [],
              recentActivity: [],
              upcomingDeadlines: []
            }
          })
        })
      )

      render(
        <DashboardWidget 
          isLoading={true}
          onRefresh={mockOnRefresh}
        />
      )

      const loadingIndicator = screen.getByTestId('dashboard-loading')
      expect(loadingIndicator).toBeInTheDocument()
      expect(screen.getByText('데이터를 불러오고 있습니다...')).toBeInTheDocument()
    })

    it('API 에러 시 적절한 에러 상태와 재시도 CTA를 표시해야 함', async () => {
      // API 에러 응답 모킹
      server.use(
        http.get('*/api/dashboard/stats', () => {
          return HttpResponse.json(
            { error: 'DASHBOARD_LOAD_FAILED', message: '데이터 로드 실패' },
            { status: 500 }
          )
        })
      )

      render(
        <DashboardWidget 
          data={null}
          onRefresh={mockOnRefresh}
        />
      )

      expect(screen.getByText('데이터를 불러올 수 없습니다')).toBeInTheDocument()
      
      const retryButton = screen.getByRole('button', { name: '새로고침' })
      expect(retryButton).toBeInTheDocument()

      // 재시도 버튼 클릭 테스트
      const user = userEvent.setup()
      await user.click(retryButton)
      
      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('접근성 자동화 검증', () => {
    it('빈 상태 컴포넌트에 접근성 위반사항이 없어야 함', async () => {
      const { container } = render(
        <EmptyState
          title="테스트 빈 상태"
          description="테스트 설명"
          actionLabel="테스트 액션"
          onAction={mockOnAction}
          illustration="no-projects"
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('대시보드 빈 상태 전체에 접근성 위반사항이 없어야 함', async () => {
      const emptyData = {
        stats: { totalProjects: 0, activeProjects: 0, completedProjects: 0, totalTeamMembers: 1 },
        recentProjects: [],
        recentActivity: [],
        upcomingDeadlines: []
      }

      const { container } = render(
        <DashboardWidget 
          data={emptyData}
          onProjectClick={mockOnProjectClick}
          onRefresh={mockOnRefresh}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('성능 최적화', () => {
    it('CTA 버튼 클릭 시 INP가 200ms 미만이어야 함', async () => {
      const performanceEntries: PerformanceEntry[] = []
      const originalGetEntriesByType = performance.getEntriesByType
      
      performance.getEntriesByType = jest.fn().mockImplementation((type: string) => {
        if (type === 'event') {
          return performanceEntries
        }
        return originalGetEntriesByType.call(performance, type)
      })

      render(
        <EmptyState
          title="테스트 빈 상태"
          description="테스트 설명"
          actionLabel="테스트 액션"
          onAction={mockOnAction}
          illustration="no-projects"
        />
      )

      const startTime = performance.now()
      
      const user = userEvent.setup()
      const ctaButton = screen.getByRole('button', { name: '테스트 액션' })
      
      await user.click(ctaButton)
      
      const endTime = performance.now()
      const interactionTime = endTime - startTime

      // INP 목표: 200ms 미만
      expect(interactionTime).toBeLessThan(200)

      performance.getEntriesByType = originalGetEntriesByType
    })

    it('빠른 연속 클릭에 대한 디바운싱이 적용되어야 함', async () => {
      render(
        <EmptyState
          title="테스트 빈 상태"
          description="테스트 설명"
          actionLabel="테스트 액션"
          onAction={mockOnAction}
          illustration="no-projects"
        />
      )

      const user = userEvent.setup()
      const ctaButton = screen.getByRole('button', { name: '테스트 액션' })

      // 빠른 연속 클릭
      await user.click(ctaButton)
      await user.click(ctaButton)
      await user.click(ctaButton)

      // 디바운싱으로 인해 한 번만 호출되어야 함
      await waitFor(() => {
        expect(mockOnAction).toHaveBeenCalledTimes(1)
      })
    })
  })
})