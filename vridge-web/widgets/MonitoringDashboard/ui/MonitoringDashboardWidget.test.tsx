/**
 * Monitoring Dashboard Widget - TDD Test Cases
 * Red 단계: 실패하는 테스트 작성
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'

import { MonitoringDashboardWidget } from './MonitoringDashboardWidget'
import { monitoringApi } from '../api/monitoringApi'
import '@testing-library/jest-dom'

// Mock API
jest.mock('../api/monitoringApi', () => ({
  monitoringApi: {
    loadInitialState: jest.fn(),
    subscribeToMetrics: jest.fn(() => () => {}),
  }
}))

// Mock 성능 모니터
jest.mock('@/shared/lib/performance-monitor', () => ({
  performanceMonitor: {
    getCoreWebVitals: jest.fn(() => ({})),
    getCustomMetrics: jest.fn(() => ({})),
    getBudgetViolations: jest.fn(() => [])
  }
}))

// Mock 알림 엔진
jest.mock('@/processes/feedback-collection/lib/notificationEngine', () => ({
  notificationEngine: {
    subscribe: jest.fn(() => () => {}),
    getProjectEventHistory: jest.fn(() => [])
  }
}))

describe('MonitoringDashboardWidget - TDD Red Phase', () => {
  const mockApi = monitoringApi as jest.Mocked<typeof monitoringApi>
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // 기본 API 모킹 설정
    mockApi.loadInitialState.mockResolvedValue({
      isLoading: false,
      isConnected: true,
      error: null,
      lastUpdate: new Date(),
      coreVitals: { LCP: 2000, FID: 50, CLS: 0.05, TTI: 3000, FCP: 1500 },
      customMetrics: { videoLoadTime: 1000, apiResponseTime: 200 },
      metricsHistory: [
        {
          timestamp: new Date(),
          LCP: 2000,
          FID: 50,
          CLS: 0.05,
          TTI: 3000,
          FCP: 1500
        }
      ],
      budgetViolations: [],
      activeWorkflows: [
        {
          projectId: 'test-project-1',
          title: '테스트 프로젝트',
          completedStages: ['planning'],
          currentProgress: 25,
          estimatedCompletionDays: 10,
          stageMetadata: {},
          connectedWidgets: [],
          widgetData: {}
        }
      ],
      workflowEvents: [],
      systemEvents: [],
      notifications: [
        {
          id: '1',
          type: 'feedback_added',
          projectId: 'test-project-1',
          timestamp: new Date(),
          data: { message: '테스트 피드백' }
        }
      ],
      refreshInterval: 5000,
      autoRefresh: true,
      selectedProject: 'test-project-1'
    })
  })

  describe('1. 기본 렌더링 테스트', () => {
    test('어 대시보드 위젯이 올바르게 렌더링되어야 한다', async () => {
      await act(async () => {
        render(<MonitoringDashboardWidget />)
      })
      
      // 제목이 표시되는지 확인
      expect(screen.getByRole('heading', { name: /시스템 모니터링 대시보드/i })).toBeInTheDocument()
      
      // 성능 차트가 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByTestId('performance-metrics-chart')).toBeInTheDocument()
      })
      
      // 워크플로우 진행 상황이 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByTestId('workflow-progress-visualization')).toBeInTheDocument()
      })
      
      // 알림 영역이 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByTestId('system-notifications')).toBeInTheDocument()
      })
    })

    test('로딩 상태가 올바르게 표시되어야 한다', () => {
      mockApi.loadInitialState.mockImplementation(() => new Promise(() => {}))
      
      render(<MonitoringDashboardWidget />)
      
      expect(screen.getByText('대시보드 로딩 중...')).toBeInTheDocument()
      expect(screen.getByText('성능 메트릭과 시스템 상태를 불러오고 있습니다.')).toBeInTheDocument()
    })

    test('에러 상태가 올바르게 표시되어야 한다', async () => {
      const errorMessage = '데이터 로드 실패'
      mockApi.loadInitialState.mockRejectedValue(new Error(errorMessage))
      
      render(<MonitoringDashboardWidget />)
      
      await waitFor(() => {
        expect(screen.getByText('대시보드 오류')).toBeInTheDocument()
        expect(screen.getByText('대시보드 데이터를 로드할 수 없습니다.')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /다시 시도/i })).toBeInTheDocument()
      })
    })
  })

  describe('2. 사용자 인터랙션 테스트', () => {
    test('새로고침 버튼이 올바르게 동작해야 한다', async () => {
      await act(async () => {
        render(<MonitoringDashboardWidget />)
      })
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /데이터 새로고침/i })).toBeInTheDocument()
      })
      
      const refreshButton = screen.getByRole('button', { name: /데이터 새로고침/i })
      
      await act(async () => {
        await user.click(refreshButton)
      })
      
      // API가 다시 호출되어야 함
      await waitFor(() => {
        expect(mockApi.loadInitialState).toHaveBeenCalledTimes(2)
      })
    })

    test('워크플로우 단계 클릭이 올바르게 처리되어야 한다', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation()
      
      await act(async () => {
        render(<MonitoringDashboardWidget />)
      })
      
      // 워크플로우 진행 상황이 로드될 때까지 대기
      await waitFor(() => {
        expect(screen.getByTestId('workflow-progress-visualization')).toBeInTheDocument()
      })
      
      // 기획 단계 클릭 (완료된 단계)
      const planningStage = screen.getByRole('button', { name: /기획 단계.*완료/i })
      
      await act(async () => {
        await user.click(planningStage)
      })
      
      expect(consoleSpy).toHaveBeenCalledWith('워크플로우 단계 클릭: planning')
      
      consoleSpy.mockRestore()
    })

    test('알림 지우기가 올바르게 동작해야 한다', async () => {
      await act(async () => {
        render(<MonitoringDashboardWidget />)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('system-notifications')).toBeInTheDocument()
      })
      
      const clearButton = screen.getByRole('button', { name: /모든 알림 삭제/i })
      
      await act(async () => {
        await user.click(clearButton)
      })
      
      // 알림이 없어졌는지 확인
      await waitFor(() => {
        expect(screen.getByText('알림 없음')).toBeInTheDocument()
      })
    })
  })

  describe('3. 접근성 테스트', () => {
    test('대시보드에 적절한 ARIA 레이블이 있어야 한다', async () => {
      await act(async () => {
        render(<MonitoringDashboardWidget />)
      })
      
      // 메인 영역이 올바른 role을 가지고 있는지 확인
      expect(screen.getByRole('region', { name: /시스템 모니터링 대시보드/i })).toBeInTheDocument()
      
      // 연결 상태가 올바른 role을 가지고 있는지 확인
      await waitFor(() => {
        expect(screen.getByRole('status', { name: /연결 상태/i })).toBeInTheDocument()
      })
    })

    test('키보드 네비게이션이 올바르게 동작해야 한다', async () => {
      await act(async () => {
        render(<MonitoringDashboardWidget />)
      })
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /데이터 새로고침/i })).toBeInTheDocument()
      })
      
      const refreshButton = screen.getByRole('button', { name: /데이터 새로고침/i })
      
      // Tab으로 포커스 이동
      refreshButton.focus()
      expect(refreshButton).toHaveFocus()
      
      // Enter로 클릭 시뮬레이션
      fireEvent.keyDown(refreshButton, { key: 'Enter' })
      
      await waitFor(() => {
        expect(mockApi.loadInitialState).toHaveBeenCalledTimes(2)
      })
    })

    test('스크린 리더를 위한 대체 텍스트가 제공되어야 한다', async () => {
      await act(async () => {
        render(<MonitoringDashboardWidget />)
      })
      
      await waitFor(() => {
        // 성능 차트에 alt text가 있는지 확인
        expect(screen.getByRole('img', { name: /Core Web Vitals 성능 메트릭 차트/i })).toBeInTheDocument()
      })
    })
  })

  describe('4. 상태 관리 테스트', () => {
    test('API 오류 시 상태가 올바르게 업데이트되어야 한다', async () => {
      // 초기 로드는 성공
      render(<MonitoringDashboardWidget />)
      
      await waitFor(() => {
        expect(screen.getByTestId('monitoring-dashboard')).toBeInTheDocument()
      })
      
      // 새로고침 시 API 오류 발생
      mockApi.loadInitialState.mockRejectedValueOnce(new Error('네트워크 오류'))
      
      const refreshButton = screen.getByRole('button', { name: /데이터 새로고침/i })
      
      await act(async () => {
        await user.click(refreshButton)
      })
      
      // 에러 배너가 표시되어야 함
      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeInTheDocument()
        expect(screen.getByText(/데이터 새로고침에 실패했습니다/i)).toBeInTheDocument()
      })
    })

    test('프로젝트 ID 변경 시 데이터가 다시 로드되어야 한다', async () => {
      const { rerender } = render(<MonitoringDashboardWidget projectId="project-1" />)
      
      await waitFor(() => {
        expect(mockApi.loadInitialState).toHaveBeenCalledWith('project-1')
      })
      
      // 프로젝트 ID 변경
      rerender(<MonitoringDashboardWidget projectId="project-2" />)
      
      await waitFor(() => {
        expect(mockApi.loadInitialState).toHaveBeenCalledWith('project-2')
      })
    })
  })

  describe('5. 성능 메트릭 테스트', () => {
    test('예산 위반 시 경고가 표시되어야 한다', async () => {
      const budgetViolations = [
        {
          metric: 'LCP',
          current: 3000,
          budget: 2500,
          violation: 500
        }
      ]
      
      mockApi.loadInitialState.mockResolvedValueOnce({
        ...mockApi.loadInitialState.mock.results[0].value,
        budgetViolations
      })
      
      await act(async () => {
        render(<MonitoringDashboardWidget />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('현재 예산 위반')).toBeInTheDocument()
        expect(screen.getByText(/LCP.*3000.*2500/)).toBeInTheDocument()
      })
    })

    test('빈 데이터 상태가 올바르게 표시되어야 한다', async () => {
      mockApi.loadInitialState.mockResolvedValueOnce({
        ...mockApi.loadInitialState.mock.results[0].value,
        metricsHistory: [],
        activeWorkflows: [],
        notifications: []
      })
      
      await act(async () => {
        render(<MonitoringDashboardWidget />)
      })
      
      await waitFor(() => {
        expect(screen.getByText('성능 데이터 없음')).toBeInTheDocument()
        expect(screen.getByText('진행 중인 워크플로우 없음')).toBeInTheDocument()
        expect(screen.getByText('알림 없음')).toBeInTheDocument()
      })
    })
  })

  describe('6. 반응형 디자인 테스트', () => {
    test('모바일 화면에서 올바르게 렌더링되어야 한다', async () => {
      // 모바일 뷰포트 시뮬레이션
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375
      })
      
      await act(async () => {
        render(<MonitoringDashboardWidget />)
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('monitoring-dashboard')).toBeInTheDocument()
        // 모바일에서는 헤더가 세로 정렬되는지 확인 (스타일링으로 검증 어려움, 기본 렌더링 확인)
      })
    })
  })

  describe('7. 실시간 데이터 업데이트 테스트', () => {
    test('실시간 데이터 구독이 올바르게 설정되어야 한다', async () => {
      let subscriptionCallback: Function | undefined
      
      mockApi.subscribeToMetrics.mockImplementation((callback) => {
        subscriptionCallback = callback
        return () => {}
      })
      
      await act(async () => {
        render(<MonitoringDashboardWidget />)
      })
      
      expect(mockApi.subscribeToMetrics).toHaveBeenCalledWith(expect.any(Function))
      
      // 실시간 데이터 업데이트 시뮬레이션
      if (subscriptionCallback) {
        await act(async () => {
          subscriptionCallback({
            coreVitals: { LCP: 3000 }, // 예산 초과
            lastUpdate: new Date()
          })
        })
        
        // UI가 업데이트되어야 함
        await waitFor(() => {
          expect(screen.getByText(/3000/)).toBeInTheDocument()
        })
      }
    })
  })
})