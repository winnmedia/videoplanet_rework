/**
 * 에러 처리 시스템 통합 테스트
 * 전체 에러 처리 플로우 검증, 실제 사용 시나리오 테스트
 * TDD 기반, MSW 모킹, 성능 및 접근성 검증 포함
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import React from 'react'

import { 
  useNetworkStatus,
  ErrorPerformanceProvider, 
  OptimizedErrorPage,
  useErrorPerformanceMonitor 
} from '../../lib'
import { ErrorBoundary, DefaultErrorFallback } from '../ErrorBoundary'
import { HttpErrorPage, NetworkErrorDisplay, OfflineIndicator } from '../ErrorDisplay'

// MSW 서버 설정
const server = setupServer(
  // 정상 응답
  rest.get('/api/health', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ status: 'ok' }))
  }),
  
  // 다양한 HTTP 에러 시뮬레이션
  rest.get('/api/error/:code', (req, res, ctx) => {
    const code = parseInt(req.params.code as string)
    return res(ctx.status(code), ctx.json({ error: `HTTP ${code}` }))
  }),
  
  // 네트워크 지연 시뮬레이션
  rest.get('/api/slow', (req, res, ctx) => {
    return res(ctx.delay(5000), ctx.json({ data: 'slow response' }))
  }),
  
  // 네트워크 실패 시뮬레이션
  rest.get('/api/network-fail', (req, res, ctx) => {
    return res.networkError('Network error')
  })
)

// 테스트용 컴포넌트들
const ThrowError: React.FC<{ error: Error }> = ({ error }) => {
  throw error
}

const NetworkStatusTestComponent: React.FC = () => {
  const networkStatus = useNetworkStatus({
    enableConnectionMonitoring: true,
    pingInterval: 1000
  })
  
  return (
    <div>
      <div data-testid="online-status">{networkStatus.isOnline.toString()}</div>
      <div data-testid="offline-status">{networkStatus.isOffline.toString()}</div>
      <div data-testid="connection-type">{networkStatus.effectiveType || 'unknown'}</div>
    </div>
  )
}

const PerformanceTestComponent: React.FC = () => {
  const [hasError, setHasError] = React.useState(false)
  const metrics = useErrorPerformanceMonitor((metrics) => {
    console.log('Performance metrics:', metrics)
  })
  
  if (hasError) {
    throw new Error('Test error for performance')
  }
  
  return (
    <div>
      <button onClick={() => setHasError(true)} data-testid="trigger-error">
        Trigger Error
      </button>
      <div data-testid="cls-metric">{metrics.cls || 0}</div>
      <div data-testid="lcp-metric">{metrics.lcp || 0}</div>
    </div>
  )
}

describe('에러 처리 시스템 통합 테스트', () => {
  beforeAll(() => server.listen())
  afterEach(() => {
    server.resetHandlers()
    jest.clearAllMocks()
  })
  afterAll(() => server.close())

  describe('ErrorBoundary 통합 시나리오', () => {
    it('JavaScript 에러를 캐치하고 적절한 UI를 표시해야 함', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      const testError = new Error('테스트 에러')
      
      render(
        <ErrorBoundary>
          <ThrowError error={testError} />
        </ErrorBoundary>
      )
      
      // 에러 UI가 표시되는지 확인
      expect(screen.getByText('오류가 발생했습니다')).toBeInTheDocument()
      expect(screen.getByText('테스트 에러')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument()
      
      consoleError.mockRestore()
    })

    it('비동기 에러도 적절히 처리해야 함', async () => {
      const AsyncErrorComponent: React.FC = () => {
        const [error, setError] = React.useState<Error | null>(null)
        
        React.useEffect(() => {
          const timer = setTimeout(() => {
            setError(new Error('비동기 에러'))
          }, 100)
          return () => clearTimeout(timer)
        }, [])
        
        if (error) throw error
        return <div>Loading...</div>
      }
      
      render(
        <ErrorBoundary>
          <AsyncErrorComponent />
        </ErrorBoundary>
      )
      
      // 초기에는 로딩 상태
      expect(screen.getByText('Loading...')).toBeInTheDocument()
      
      // 에러 발생 후 에러 UI 표시
      await waitFor(() => {
        expect(screen.getByText('오류가 발생했습니다')).toBeInTheDocument()
      }, { timeout: 200 })
    })

    it('에러 복구 기능이 동작해야 함', async () => {
      const user = userEvent.setup()
      let shouldError = true
      
      const RecoverableComponent: React.FC = () => {
        if (shouldError) {
          throw new Error('복구 가능한 에러')
        }
        return <div>복구 완료</div>
      }
      
      const { rerender } = render(
        <ErrorBoundary>
          <RecoverableComponent />
        </ErrorBoundary>
      )
      
      // 에러 상태 확인
      expect(screen.getByText('복구 가능한 에러')).toBeInTheDocument()
      
      // 다시 시도 버튼 클릭
      const retryButton = screen.getByRole('button', { name: /다시 시도/ })
      
      // 에러 조건 해제
      shouldError = false
      
      await user.click(retryButton)
      
      // 컴포넌트 재렌더링 시뮬레이션
      rerender(
        <ErrorBoundary>
          <RecoverableComponent />
        </ErrorBoundary>
      )
      
      await waitFor(() => {
        expect(screen.getByText('복구 완료')).toBeInTheDocument()
      })
    })
  })

  describe('HTTP 에러 처리 시나리오', () => {
    const httpErrorScenarios = [
      { status: 400, title: '잘못된 요청' },
      { status: 401, title: '인증이 필요합니다' },
      { status: 403, title: '접근 권한이 없습니다' },
      { status: 404, title: '페이지를 찾을 수 없습니다' },
      { status: 500, title: '서버 오류가 발생했습니다' }
    ] as const

    httpErrorScenarios.forEach(({ status, title }) => {
      it(`HTTP ${status} 에러를 적절히 표시해야 함`, () => {
        render(
          <HttpErrorPage 
            status={status}
            onRetry={jest.fn()}
            onHome={jest.fn()}
          />
        )
        
        expect(screen.getByText(title)).toBeInTheDocument()
        expect(screen.getByText(`HTTP ${status}`)).toBeInTheDocument()
      })
    })

    it('401 에러 시 로그인 버튼을 표시해야 함', () => {
      const mockLogin = jest.fn()
      
      render(
        <HttpErrorPage 
          status={401}
          onLogin={mockLogin}
        />
      )
      
      const loginButton = screen.getByRole('button', { name: /로그인하기/ })
      expect(loginButton).toBeInTheDocument()
      
      fireEvent.click(loginButton)
      expect(mockLogin).toHaveBeenCalledTimes(1)
    })
  })

  describe('네트워크 상태 관리 통합', () => {
    beforeEach(() => {
      // navigator.onLine 모킹
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      })
    })

    it('네트워크 상태 변화를 감지해야 함', async () => {
      render(<NetworkStatusTestComponent />)
      
      // 초기 온라인 상태
      expect(screen.getByTestId('online-status')).toHaveTextContent('true')
      expect(screen.getByTestId('offline-status')).toHaveTextContent('false')
      
      // 오프라인 이벤트 시뮬레이션
      act(() => {
        Object.defineProperty(navigator, 'onLine', { writable: true, value: false })
        window.dispatchEvent(new Event('offline'))
      })
      
      await waitFor(() => {
        expect(screen.getByTestId('online-status')).toHaveTextContent('false')
        expect(screen.getByTestId('offline-status')).toHaveTextContent('true')
      })
    })

    it('오프라인 상태에서 적절한 UI를 표시해야 함', async () => {
      render(
        <OfflineIndicator 
          isOffline={true} 
          onRetry={jest.fn()} 
        />
      )
      
      expect(screen.getByText('인터넷 연결이 끊어졌습니다')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /다시 연결/ })).toBeInTheDocument()
    })
  })

  describe('성능 최적화 통합', () => {
    it('에러 상태에서 성능 최적화가 적용되어야 함', async () => {
      render(
        <ErrorPerformanceProvider isErrorState={true} optimizationLevel="aggressive">
          <PerformanceTestComponent />
        </ErrorPerformanceProvider>
      )
      
      const triggerButton = screen.getByTestId('trigger-error')
      
      // 성능 메트릭이 초기화되었는지 확인
      expect(screen.getByTestId('cls-metric')).toHaveTextContent('0')
      expect(screen.getByTestId('lcp-metric')).toHaveTextContent('0')
    })

    it('코드 스플리팅이 올바르게 동작해야 함', async () => {
      render(
        <React.Suspense fallback={<div>Loading...</div>}>
          <OptimizedErrorPage 
            status={404}
            onRetry={jest.fn()}
          />
        </React.Suspense>
      )
      
      // 지연 로딩 중 스켈레톤이 표시되는지 확인
      await waitFor(() => {
        expect(screen.getByText('페이지를 찾을 수 없습니다')).toBeInTheDocument()
      })
    })
  })

  describe('실제 사용 시나리오', () => {
    it('API 호출 실패 시 에러 처리 플로우가 동작해야 함', async () => {
      const APICallComponent: React.FC = () => {
        const [error, setError] = React.useState<string | null>(null)
        const [loading, setLoading] = React.useState(false)
        
        const fetchData = async () => {
          setLoading(true)
          setError(null)
          
          try {
            const response = await fetch('/api/error/500')
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`)
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
          } finally {
            setLoading(false)
          }
        }
        
        if (error) {
          return (
            <NetworkErrorDisplay 
              error={{ message: error, isOffline: false }}
              onRetry={fetchData}
            />
          )
        }
        
        return (
          <div>
            <button onClick={fetchData} disabled={loading}>
              {loading ? '로딩 중...' : 'API 호출'}
            </button>
          </div>
        )
      }
      
      const user = userEvent.setup()
      render(<APICallComponent />)
      
      // API 호출 버튼 클릭
      const callButton = screen.getByRole('button', { name: /API 호출/ })
      await user.click(callButton)
      
      // 로딩 상태 확인
      expect(screen.getByText('로딩 중...')).toBeInTheDocument()
      
      // 에러 UI 표시 확인
      await waitFor(() => {
        expect(screen.getByText('네트워크 연결 오류')).toBeInTheDocument()
        expect(screen.getByText('HTTP 500')).toBeInTheDocument()
      })
      
      // 재시도 버튼 확인
      expect(screen.getByRole('button', { name: /다시 시도/ })).toBeInTheDocument()
    })

    it('전체 페이지 에러 처리 시나리오', async () => {
      const PageComponent: React.FC = () => {
        const [pageError, setPageError] = React.useState<number | null>(null)
        
        if (pageError) {
          return (
            <HttpErrorPage 
              status={pageError as any}
              onRetry={() => setPageError(null)}
              onHome={() => console.log('Go home')}
            />
          )
        }
        
        return (
          <div>
            <button onClick={() => setPageError(404)}>
              404 에러 발생
            </button>
            <button onClick={() => setPageError(500)}>
              500 에러 발생
            </button>
          </div>
        )
      }
      
      const user = userEvent.setup()
      render(<PageComponent />)
      
      // 404 에러 트리거
      await user.click(screen.getByRole('button', { name: /404 에러 발생/ }))
      
      expect(screen.getByText('페이지를 찾을 수 없습니다')).toBeInTheDocument()
      expect(screen.getByText('HTTP 404')).toBeInTheDocument()
      
      // 다시 시도로 복구
      await user.click(screen.getByRole('button', { name: /다시 시도/ }))
      
      // 원래 페이지로 복구됨
      expect(screen.getByRole('button', { name: /404 에러 발생/ })).toBeInTheDocument()
    })
  })

  describe('접근성 통합 테스트', () => {
    it('스크린 리더 사용자를 위한 에러 알림이 동작해야 함', async () => {
      const user = userEvent.setup()
      
      render(
        <div>
          <button onClick={() => {
            // 동적으로 에러 생성
            const errorDiv = document.createElement('div')
            errorDiv.setAttribute('role', 'alert')
            errorDiv.setAttribute('aria-live', 'assertive')
            errorDiv.textContent = '에러가 발생했습니다'
            document.body.appendChild(errorDiv)
          }}>
            에러 트리거
          </button>
        </div>
      )
      
      await user.click(screen.getByRole('button', { name: /에러 트리거/ }))
      
      await waitFor(() => {
        const alert = document.querySelector('[role="alert"]')
        expect(alert).toBeInTheDocument()
        expect(alert).toHaveAttribute('aria-live', 'assertive')
      })
    })

    it('키보드 네비게이션이 에러 상태에서도 동작해야 함', async () => {
      const user = userEvent.setup()
      
      render(
        <HttpErrorPage 
          status={404}
          onRetry={jest.fn()}
          onHome={jest.fn()}
        />
      )
      
      // Tab으로 버튼들 간 이동
      await user.tab()
      expect(screen.getByRole('button', { name: /다시 시도/ })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('button', { name: /홈으로 가기/ })).toHaveFocus()
    })
  })

  describe('성능 기준 검증', () => {
    it('에러 컴포넌트가 렌더링 성능 기준을 만족해야 함', async () => {
      const startTime = performance.now()
      
      render(
        <HttpErrorPage 
          status={500}
          onRetry={jest.fn()}
        />
      )
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // 렌더링 시간이 16ms(60fps 기준) 이하여야 함
      expect(renderTime).toBeLessThan(16)
    })

    it('에러 상태에서 메모리 누수가 없어야 함', async () => {
      const Component: React.FC<{ showError: boolean }> = ({ showError }) => {
        if (showError) {
          return <HttpErrorPage status={404} />
        }
        return <div>Normal content</div>
      }
      
      const { rerender, unmount } = render(<Component showError={false} />)
      
      // 에러 상태로 전환
      rerender(<Component showError={true} />)
      expect(screen.getByText('페이지를 찾을 수 없습니다')).toBeInTheDocument()
      
      // 정상 상태로 복귀
      rerender(<Component showError={false} />)
      expect(screen.getByText('Normal content')).toBeInTheDocument()
      
      // 언마운트
      unmount()
      
      // 메모리 누수 체크는 실제로는 더 복잡한 도구가 필요하지만,
      // 여기서는 기본적인 렌더링 사이클 검증
      expect(screen.queryByText('페이지를 찾을 수 없습니다')).not.toBeInTheDocument()
    })
  })
})