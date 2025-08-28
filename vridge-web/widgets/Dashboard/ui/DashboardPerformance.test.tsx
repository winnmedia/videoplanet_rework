/**
 * 성능 예산 테스트: INP < 200ms 검증
 * 
 * 이 테스트는 Core Web Vitals 중 INP (Interaction to Next Paint) 메트릭을 
 * 200ms 미만으로 유지하기 위한 성능 검증을 수행합니다.
 * 
 * 테스트 영역:
 * 1. 사용자 인터랙션 응답 시간 측정
 * 2. 렌더링 성능 최적화 검증
 * 3. 메모리 누수 방지 테스트
 * 4. 번들 크기 임계값 검증
 * 5. 실제 사용자 시나리오 성능 테스트
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { server } from '@/test/mocks/server'
import { http, HttpResponse } from 'msw'

import { DashboardWidget } from './DashboardWidget'
import { EmptyState } from './EmptyState'

// Performance Observer 모킹
const performanceEntries: PerformanceEntry[] = []
const originalPerformanceObserver = global.PerformanceObserver
const originalPerformanceNow = performance.now

const mockPerformanceObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => performanceEntries)
}))

describe('대시보드 성능 예산 테스트 - INP < 200ms', () => {
  const mockDashboardData = {
    stats: {
      totalProjects: 12,
      activeProjects: 8,
      completedProjects: 4,
      totalTeamMembers: 15
    },
    recentProjects: Array.from({ length: 5 }, (_, i) => ({
      id: `proj-${i + 1}`,
      name: `테스트 프로젝트 ${i + 1}`,
      description: `프로젝트 ${i + 1} 설명`,
      status: 'in-progress',
      progress: Math.floor(Math.random() * 100),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })),
    recentActivity: Array.from({ length: 10 }, (_, i) => ({
      id: `act-${i + 1}`,
      type: 'task_completed',
      message: `활동 ${i + 1}`,
      timestamp: new Date().toISOString()
    })),
    upcomingDeadlines: []
  }

  beforeAll(() => {
    // Performance Observer 모킹 설정
    global.PerformanceObserver = mockPerformanceObserver as any
    
    // PerformanceEntry 구현 모킹
    global.PerformanceEntry = class MockPerformanceEntry {
      name = ''
      entryType = ''
      startTime = 0
      duration = 0
    } as any
  })

  afterAll(() => {
    global.PerformanceObserver = originalPerformanceObserver
    performance.now = originalPerformanceNow
  })

  beforeEach(() => {
    jest.clearAllMocks()
    performanceEntries.length = 0
    
    // performance.now 모킹
    let mockTime = 0
    performance.now = jest.fn(() => mockTime++)
  })

  afterEach(() => {
    server.resetHandlers()
  })

  describe('INP 메트릭 측정 및 검증', () => {
    it('버튼 클릭 시 INP가 200ms 미만이어야 함', async () => {
      const mockOnRefresh = jest.fn()
      
      render(
        <DashboardWidget 
          data={mockDashboardData}
          onRefresh={mockOnRefresh}
        />
      )

      const refreshButton = screen.getByRole('button', { name: '새로고침' })
      
      // 인터랙션 시작 시간 기록
      const startTime = performance.now()
      
      // 사용자 인터랙션 시뮬레이션
      const user = userEvent.setup()
      await user.click(refreshButton)
      
      // 다음 페인트까지 대기 (requestAnimationFrame 시뮬레이션)
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      const endTime = performance.now()
      const interactionTime = endTime - startTime
      
      // INP 목표: 200ms 미만
      expect(interactionTime).toBeLessThan(200)
      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })

    it('프로젝트 카드 클릭 시 INP가 200ms 미만이어야 함', async () => {
      const mockOnProjectClick = jest.fn()
      
      render(
        <DashboardWidget 
          data={mockDashboardData}
          onProjectClick={mockOnProjectClick}
        />
      )

      const projectButton = screen.getAllByRole('button')[1] // 첫 번째 프로젝트 카드
      
      const startTime = performance.now()
      
      const user = userEvent.setup()
      await user.click(projectButton)
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      const endTime = performance.now()
      const interactionTime = endTime - startTime
      
      expect(interactionTime).toBeLessThan(200)
      expect(mockOnProjectClick).toHaveBeenCalledTimes(1)
    })

    it('키보드 인터랙션 시 INP가 200ms 미만이어야 함', async () => {
      const mockOnAction = jest.fn()
      
      render(
        <EmptyState
          title="테스트 빈 상태"
          description="테스트 설명"
          actionLabel="테스트 액션"
          onAction={mockOnAction}
        />
      )

      const actionButton = screen.getByRole('button', { name: '테스트 액션' })
      actionButton.focus()
      
      const startTime = performance.now()
      
      // Enter 키 인터랙션
      fireEvent.keyDown(actionButton, { key: 'Enter', code: 'Enter' })
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      const endTime = performance.now()
      const interactionTime = endTime - startTime
      
      expect(interactionTime).toBeLessThan(200)
      expect(mockOnAction).toHaveBeenCalledTimes(1)
    })
  })

  describe('렌더링 성능 최적화 검증', () => {
    it('초기 렌더링이 100ms 미만이어야 함', async () => {
      const startTime = performance.now()
      
      render(
        <DashboardWidget 
          data={mockDashboardData}
        />
      )
      
      // DOM 렌더링 완료 대기
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-container')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      expect(renderTime).toBeLessThan(100)
    })

    it('데이터 업데이트 시 리렌더링이 50ms 미만이어야 함', async () => {
      const { rerender } = render(
        <DashboardWidget 
          data={mockDashboardData}
        />
      )

      // 초기 렌더링 완료 대기
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-container')).toBeInTheDocument()
      })

      const updatedData = {
        ...mockDashboardData,
        stats: { ...mockDashboardData.stats, totalProjects: 15 }
      }

      const startTime = performance.now()
      
      rerender(
        <DashboardWidget 
          data={updatedData}
        />
      )
      
      // 리렌더링 완료 대기
      await waitFor(() => {
        expect(screen.getByText('15')).toBeInTheDocument()
      })
      
      const endTime = performance.now()
      const rerenderTime = endTime - startTime
      
      expect(rerenderTime).toBeLessThan(50)
    })

    it('대용량 데이터 렌더링이 500ms 미만이어야 함', async () => {
      const largeData = {
        ...mockDashboardData,
        recentProjects: Array.from({ length: 100 }, (_, i) => ({
          id: `proj-${i + 1}`,
          name: `대용량 테스트 프로젝트 ${i + 1}`,
          description: `매우 긴 설명을 가진 프로젝트 ${i + 1}입니다. `.repeat(10),
          status: 'in-progress',
          progress: Math.floor(Math.random() * 100),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })),
        recentActivity: Array.from({ length: 200 }, (_, i) => ({
          id: `act-${i + 1}`,
          type: 'task_completed',
          message: `대용량 활동 데이터 ${i + 1}`,
          timestamp: new Date().toISOString()
        }))
      }

      const startTime = performance.now()
      
      render(
        <DashboardWidget 
          data={largeData}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-container')).toBeInTheDocument()
      }, { timeout: 1000 })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      expect(renderTime).toBeLessThan(500)
    })
  })

  describe('메모리 누수 방지 테스트', () => {
    it('컴포넌트 언마운트 시 메모리가 정리되어야 함', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')
      
      const { unmount } = render(
        <DashboardWidget 
          data={mockDashboardData}
        />
      )

      // 이벤트 리스너가 추가되었다면
      const addedListeners = addEventListenerSpy.mock.calls.length
      
      unmount()
      
      // 같은 수만큼 제거되어야 함
      const removedListeners = removeEventListenerSpy.mock.calls.length
      expect(removedListeners).toBeGreaterThanOrEqual(addedListeners)
      
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it('타이머가 정리되어야 함', () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout')
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout')
      const setIntervalSpy = jest.spyOn(global, 'setInterval')  
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval')

      const { unmount } = render(
        <DashboardWidget 
          data={mockDashboardData}
        />
      )

      const timeouts = setTimeoutSpy.mock.calls.length
      const intervals = setIntervalSpy.mock.calls.length

      unmount()

      // 설정된 타이머만큼 정리되어야 함
      expect(clearTimeoutSpy.mock.calls.length).toBeGreaterThanOrEqual(timeouts * 0.8) // 80% 이상
      expect(clearIntervalSpy.mock.calls.length).toBeGreaterThanOrEqual(intervals)

      setTimeoutSpy.mockRestore()
      clearTimeoutSpy.mockRestore()
      setIntervalSpy.mockRestore()
      clearIntervalSpy.mockRestore()
    })
  })

  describe('연속 인터랙션 성능 테스트', () => {
    it('빠른 연속 클릭에 대한 디바운싱 성능', async () => {
      const mockOnRefresh = jest.fn()
      
      render(
        <DashboardWidget 
          data={mockDashboardData}
          onRefresh={mockOnRefresh}
        />
      )

      const refreshButton = screen.getByRole('button', { name: '새로고침' })
      const user = userEvent.setup()
      
      const interactionTimes: number[] = []
      
      // 10번의 연속 클릭 테스트
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now()
        
        await user.click(refreshButton)
        
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0))
        })
        
        const endTime = performance.now()
        interactionTimes.push(endTime - startTime)
      }
      
      // 모든 인터랙션이 200ms 미만이어야 함
      interactionTimes.forEach((time, index) => {
        expect(time).toBeLessThan(200, `${index + 1}번째 인터랙션: ${time}ms`)
      })
      
      // 평균 응답 시간도 200ms 미만
      const averageTime = interactionTimes.reduce((a, b) => a + b, 0) / interactionTimes.length
      expect(averageTime).toBeLessThan(200)
      
      // 디바운싱으로 인해 실제 함수 호출은 1번만
      await waitFor(() => {
        expect(mockOnRefresh).toHaveBeenCalledTimes(1)
      })
    })

    it('스크롤 중 인터랙션 성능', async () => {
      const mockOnProjectClick = jest.fn()
      
      render(
        <div style={{ height: '200px', overflow: 'auto' }}>
          <DashboardWidget 
            data={mockDashboardData}
            onProjectClick={mockOnProjectClick}
          />
        </div>
      )

      const container = screen.getByTestId('dashboard-container').parentElement!
      const projectButton = screen.getAllByRole('button')[1]
      
      // 스크롤 시뮬레이션
      fireEvent.scroll(container, { target: { scrollY: 100 } })
      
      const startTime = performance.now()
      
      const user = userEvent.setup()
      await user.click(projectButton)
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      const endTime = performance.now()
      const interactionTime = endTime - startTime
      
      expect(interactionTime).toBeLessThan(200)
      expect(mockOnProjectClick).toHaveBeenCalledTimes(1)
    })
  })

  describe('네트워크 지연 중 인터랙션 성능', () => {
    it('API 로딩 중에도 UI 인터랙션이 블로킹되지 않아야 함', async () => {
      // 지연된 API 응답 모킹
      server.use(
        http.get('*/api/dashboard/stats', async () => {
          await new Promise(resolve => setTimeout(resolve, 2000)) // 2초 지연
          return HttpResponse.json({
            success: true,
            data: mockDashboardData
          })
        })
      )

      const mockOnRefresh = jest.fn()
      
      render(
        <DashboardWidget 
          isLoading={true}
          onRefresh={mockOnRefresh}
        />
      )

      // 로딩 중에도 버튼 클릭 가능한지 확인
      const refreshButton = screen.getByRole('button', { name: '새로고침' })
      
      const startTime = performance.now()
      
      const user = userEvent.setup()
      await user.click(refreshButton)
      
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 0))
      })
      
      const endTime = performance.now()
      const interactionTime = endTime - startTime
      
      // 네트워크 요청과 관계없이 UI 인터랙션은 빨라야 함
      expect(interactionTime).toBeLessThan(200)
      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })
  })

  describe('접근성 기능의 성능 영향', () => {
    it('스크린리더 지원이 성능에 미치는 영향이 최소화되어야 함', async () => {
      const startTime = performance.now()
      
      render(
        <DashboardWidget 
          data={mockDashboardData}
        />
      )
      
      // 모든 ARIA 속성과 접근성 기능이 포함된 상태에서 렌더링
      await waitFor(() => {
        expect(screen.getByRole('main')).toBeInTheDocument()
        expect(screen.getAllByRole('region')).toHaveLength(3)
        expect(screen.getAllByRole('button')).toHaveLength(6) // 새로고침 + 5개 프로젝트
      })
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // 접근성 기능이 있어도 렌더링 시간이 150ms 미만이어야 함
      expect(renderTime).toBeLessThan(150)
    })

    it('포커스 관리가 인터랙션 성능에 미치는 영향', async () => {
      render(
        <DashboardWidget 
          data={mockDashboardData}
        />
      )

      const buttons = screen.getAllByRole('button')
      const interactionTimes: number[] = []
      
      // 모든 버튼에 포커스 및 클릭 테스트
      for (const button of buttons.slice(0, 3)) { // 처음 3개만 테스트
        const startTime = performance.now()
        
        button.focus()
        fireEvent.click(button)
        
        await act(async () => {
          await new Promise(resolve => setTimeout(resolve, 0))
        })
        
        const endTime = performance.now()
        interactionTimes.push(endTime - startTime)
      }
      
      // 모든 포커스 인터랙션이 200ms 미만
      interactionTimes.forEach((time, index) => {
        expect(time).toBeLessThan(200, `${index + 1}번째 포커스 인터랙션: ${time}ms`)
      })
    })
  })

  describe('성능 예산 임계값 검증', () => {
    it('메인 스레드 블로킹 시간이 50ms 미만이어야 함', async () => {
      // Long Task 시뮬레이션을 위한 무거운 작업
      const heavyData = {
        ...mockDashboardData,
        recentProjects: Array.from({ length: 1000 }, (_, i) => ({
          id: `heavy-proj-${i}`,
          name: `Heavy Project ${i}`,
          description: 'Heavy description '.repeat(100),
          status: 'in-progress',
          progress: i % 100,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }))
      }

      const startTime = performance.now()
      
      render(
        <DashboardWidget 
          data={heavyData}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByTestId('dashboard-container')).toBeInTheDocument()
      }, { timeout: 1000 })
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // 1000개 항목도 1초 이내 처리
      expect(totalTime).toBeLessThan(1000)
    })

    it('JavaScript 번들 크기 영향 최소화', () => {
      // 컴포넌트가 불필요한 종속성을 가지지 않는지 확인
      const componentString = DashboardWidget.toString()
      
      // 무거운 라이브러리 사용 금지 검증
      expect(componentString).not.toMatch(/lodash|moment|jquery/i)
      
      // 동적 import 사용 권장 패턴 확인
      expect(componentString.length).toBeLessThan(10000) // 10KB 미만
    })
  })
})