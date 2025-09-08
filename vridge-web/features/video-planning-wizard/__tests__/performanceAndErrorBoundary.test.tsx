/**
 * @fileoverview 성능 및 에러 바운더리 테스트
 * @description React Error Boundary, 성능 최적화, 메모리 누수 방지 등 고급 테스트
 */

import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import React, { ErrorInfo, ReactNode } from 'react'


import { VideoPlanningWizardApi } from '../api/videoPlanningApi'
import type { VideoShot, InsertShot, TwelveShotsEditorProps } from '../model/types'
import { TwelveShotsEditor } from '../ui/TwelveShotsEditor'
import { VideoPlanningWizard } from '../ui/VideoPlanningWizard'

import { server } from '@/lib/api/msw-server'

// 테스트용 에러 바운더리
interface TestErrorBoundaryState {
  hasError: boolean
  error?: Error
  errorInfo?: ErrorInfo
}

class TestErrorBoundary extends React.Component<
  { children: ReactNode; onError?: (error: Error, errorInfo: ErrorInfo) => void },
  TestErrorBoundaryState
> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): TestErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, errorInfo })
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div data-testid="error-boundary">
          <h2>문제가 발생했습니다</h2>
          <details>
            <summary>에러 세부사항</summary>
            <pre>{this.state.error?.toString()}</pre>
            <pre>{this.state.errorInfo?.componentStack}</pre>
          </details>
          <button onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}>
            다시 시도
          </button>
        </div>
      )
    }

    return this.props.children
  }
}

// 에러를 발생시키는 컴포넌트
const ErrorThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('의도적으로 발생시킨 테스트 에러')
  }
  return <div>정상 컴포넌트</div>
}

// 대용량 데이터 생성 헬퍼
const generateLargeDataset = (size: number) => {
  return Array.from({ length: size }, (_, i) => ({
    id: `shot-${i + 1}`,
    title: `대용량 데이터 샷 ${i + 1}`,
    description: `이것은 ${i + 1}번째 샷의 상세한 설명입니다. 메모리 사용량 테스트를 위한 긴 텍스트입니다. `.repeat(10),
    shotType: ['클로즈업', '미디엄샷', '와이드샷', '익스트림 클로즈업'][i % 4],
    cameraMove: ['고정', '줌인', '줌아웃', '패닝', '틸트'][i % 5],
    composition: ['정면', '좌측', '우측', '중앙'][i % 4],
    duration: 3 + (i % 3),
    dialogue: i % 2 === 0 ? `샷 ${i + 1}의 대사 내용입니다.` : '',
    transition: ['컷', '페이드', '와이프'][i % 3],
    stageId: `stage-${Math.floor(i / 4) + 1}`,
    order: i + 1
  })) as VideoShot[]
}

// 성능 측정 헬퍼
const performanceTest = async (testName: string, testFunction: () => Promise<void>) => {
  const startTime = performance.now()
  await testFunction()
  const endTime = performance.now()
  const duration = endTime - startTime
  
  console.log(`Performance Test [${testName}]: ${duration.toFixed(2)}ms`)
  return duration
}

describe('Performance and Error Boundary Tests', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    // 성능 측정을 위한 초기화
    performance.mark?.('test-start')
  })

  afterEach(() => {
    server.resetHandlers()
    performance.mark?.('test-end')
  })

  describe('Error Boundary 테스트', () => {
    it('JavaScript 런타임 에러가 발생해도 전체 앱이 크래시되지 않아야 한다', async () => {
      // Arrange
      const errorHandler = jest.fn()
      const { rerender } = render(
        <TestErrorBoundary onError={errorHandler}>
          <ErrorThrowingComponent shouldThrow={false} />
        </TestErrorBoundary>
      )

      expect(screen.getByText('정상 컴포넌트')).toBeInTheDocument()

      // Act - 에러 발생시키기
      rerender(
        <TestErrorBoundary onError={errorHandler}>
          <ErrorThrowingComponent shouldThrow={true} />
        </TestErrorBoundary>
      )

      // Assert
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()
      expect(screen.getByText('문제가 발생했습니다')).toBeInTheDocument()
      expect(errorHandler).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.stringContaining('ErrorThrowingComponent')
        })
      )
    })

    it('에러 바운더리에서 복구 후 정상 동작해야 한다', async () => {
      // Arrange
      const { rerender } = render(
        <TestErrorBoundary>
          <ErrorThrowingComponent shouldThrow={true} />
        </TestErrorBoundary>
      )

      expect(screen.getByTestId('error-boundary')).toBeInTheDocument()

      // Act - 다시 시도 버튼 클릭
      await user.click(screen.getByText('다시 시도'))

      // 정상 컴포넌트로 변경
      rerender(
        <TestErrorBoundary>
          <ErrorThrowingComponent shouldThrow={false} />
        </TestErrorBoundary>
      )

      // Assert
      expect(screen.getByText('정상 컴포넌트')).toBeInTheDocument()
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument()
    })

    it('API 에러가 컴포넌트 레벨 에러로 전파되지 않아야 한다', async () => {
      // Arrange
      const errorHandler = jest.fn()
      
      server.use(
        http.post('*/api/video-planning/generate-stages', () => {
          return HttpResponse.error()
        })
      )

      render(
        <TestErrorBoundary onError={errorHandler}>
          <VideoPlanningWizard />
        </TestErrorBoundary>
      )

      // Act
      await user.type(screen.getByLabelText('제목'), '에러 테스트')
      await user.type(screen.getByLabelText('한 줄 스토리(로그라인)'), '에러 테스트')
      await user.click(screen.getByText('생성'))

      // Assert - API 에러는 UI 레벨에서 처리되어야 하고 에러 바운더리로 전파되지 않아야 함
      await waitFor(() => {
        expect(screen.getByText(/네트워크 연결을 확인/)).toBeInTheDocument()
      }, { timeout: 10000 })

      expect(errorHandler).not.toHaveBeenCalled()
      expect(screen.queryByTestId('error-boundary')).not.toBeInTheDocument()
    })

    it('비동기 에러도 적절하게 처리되어야 한다', async () => {
      // Arrange
      const AsyncErrorComponent = () => {
        const [shouldThrow, setShouldThrow] = React.useState(false)
        
        React.useEffect(() => {
          if (shouldThrow) {
            // 비동기 에러 발생
            setTimeout(() => {
              throw new Error('비동기 에러')
            }, 100)
          }
        }, [shouldThrow])

        return (
          <div>
            <button onClick={() => setShouldThrow(true)}>비동기 에러 발생</button>
            <div>비동기 컴포넌트</div>
          </div>
        )
      }

      const errorHandler = jest.fn()
      
      // 전역 에러 핸들러 설정
      const originalErrorHandler = window.onerror
      window.onerror = (message, source, lineno, colno, error) => {
        errorHandler(error)
        return true
      }

      render(<AsyncErrorComponent />)

      // Act
      await user.click(screen.getByText('비동기 에러 발생'))

      // Assert
      await waitFor(() => {
        expect(errorHandler).toHaveBeenCalled()
      }, { timeout: 1000 })

      // Cleanup
      window.onerror = originalErrorHandler
    })
  })

  describe('성능 최적화 테스트', () => {
    it('대용량 데이터 렌더링이 성능 예산 내에서 완료되어야 한다', async () => {
      // Arrange
      const largeDataset = generateLargeDataset(100)
      const mockProps: TwelveShotsEditorProps = {
        shots: largeDataset,
        insertShots: [],
        onShotUpdate: jest.fn(),
        onInsertUpdate: jest.fn(),
        onGenerateStoryboard: jest.fn(),
        onExport: jest.fn(),
        onBack: jest.fn(),
        isLoading: false
      }

      // Act & Assert
      const renderDuration = await performanceTest('Large Dataset Rendering', async () => {
        render(<TwelveShotsEditor {...mockProps} />)
        
        // 모든 카드가 렌더링되었는지 확인
        await waitFor(() => {
          expect(screen.getByText('총 100개 숏')).toBeInTheDocument()
        })
      })

      // 성능 예산: 500ms 이내
      expect(renderDuration).toBeLessThan(500)
    })

    it('불필요한 리렌더링이 발생하지 않아야 한다', async () => {
      // Arrange
      const renderCounter = jest.fn()
      
      const TrackedComponent = React.memo(({ data }: { data: any }) => {
        renderCounter()
        return <div>Data: {JSON.stringify(data)}</div>
      })

      const TestContainer = () => {
        const [count, setCount] = React.useState(0)
        const [data] = React.useState({ value: 'static' })

        return (
          <div>
            <TrackedComponent data={data} />
            <button onClick={() => setCount(c => c + 1)}>
              Increment: {count}
            </button>
          </div>
        )
      }

      render(<TestContainer />)

      expect(renderCounter).toHaveBeenCalledTimes(1)

      // Act - 관련 없는 상태 변경
      await user.click(screen.getByText(/Increment:/))
      await user.click(screen.getByText(/Increment:/))

      // Assert - TrackedComponent는 리렌더링되지 않아야 함
      expect(renderCounter).toHaveBeenCalledTimes(1)
    })

    it('메모리 누수가 발생하지 않아야 한다', async () => {
      // Arrange
      const cleanup = jest.fn()
      
      const MemoryTestComponent = () => {
        React.useEffect(() => {
          const interval = setInterval(() => {
            // 주기적 작업 시뮬레이션
          }, 100)

          const subscription = {
            unsubscribe: cleanup
          }

          return () => {
            clearInterval(interval)
            subscription.unsubscribe()
          }
        }, [])

        return <div>Memory Test Component</div>
      }

      const { unmount } = render(<MemoryTestComponent />)

      // Act
      unmount()

      // Assert
      expect(cleanup).toHaveBeenCalled()
    })

    it('이미지 지연 로딩이 성능을 개선해야 한다', async () => {
      // Arrange
      const imageLoadingMock = jest.fn()
      
      // 이미지 로딩 시뮬레이션
      Object.defineProperty(HTMLImageElement.prototype, 'loading', {
        get: () => 'lazy',
        set: imageLoadingMock
      })

      const mockShots = generateLargeDataset(50)
      const mockProps: TwelveShotsEditorProps = {
        shots: mockShots,
        insertShots: [],
        onShotUpdate: jest.fn(),
        onInsertUpdate: jest.fn(),
        onGenerateStoryboard: jest.fn().mockResolvedValue('/mock-image.jpg'),
        onExport: jest.fn(),
        onBack: jest.fn(),
        isLoading: false
      }

      render(<TwelveShotsEditor {...mockProps} />)

      // Act - 첫 번째 이미지만 생성
      const firstGenerateButton = screen.getAllByText('생성')[0]
      await user.click(firstGenerateButton)

      await waitFor(() => {
        expect(screen.getByAltText('스토리보드')).toBeInTheDocument()
      })

      // Assert - 지연 로딩이 설정되었는지 확인
      const images = document.querySelectorAll('img')
      images.forEach(img => {
        expect(img.loading).toBe('lazy')
      })
    })
  })

  describe('메모리 사용량 최적화', () => {
    it('큰 데이터셋 처리 시 메모리 사용량이 합리적이어야 한다', async () => {
      // Arrange
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0
      
      const veryLargeDataset = generateLargeDataset(1000)
      const mockProps: TwelveShotsEditorProps = {
        shots: veryLargeDataset,
        insertShots: [],
        onShotUpdate: jest.fn(),
        onInsertUpdate: jest.fn(),
        onGenerateStoryboard: jest.fn(),
        onExport: jest.fn(),
        onBack: jest.fn(),
        isLoading: false
      }

      // Act
      const { unmount } = render(<TwelveShotsEditor {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('총 1000개 숏')).toBeInTheDocument()
      })

      const peakMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Cleanup
      unmount()

      // Force garbage collection (테스트 환경에서만)
      if (global.gc) {
        global.gc()
      }

      await new Promise(resolve => setTimeout(resolve, 100))

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Assert
      if (initialMemory && peakMemory && finalMemory) {
        const memoryIncrease = peakMemory - initialMemory
        const memoryRecovered = peakMemory - finalMemory

        console.log(`Memory usage: +${(memoryIncrease / 1024 / 1024).toFixed(2)}MB, recovered: ${(memoryRecovered / 1024 / 1024).toFixed(2)}MB`)

        // 메모리 증가량이 50MB 미만이어야 함
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
        
        // 80% 이상의 메모리가 회수되어야 함
        expect(memoryRecovered / memoryIncrease).toBeGreaterThan(0.8)
      }
    })

    it('이벤트 리스너가 적절히 정리되어야 한다', async () => {
      // Arrange
      const addEventListenerSpy = jest.spyOn(window, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener')

      const EventListenerTestComponent = () => {
        React.useEffect(() => {
          const handleResize = () => {
            // 리사이즈 핸들러
          }

          const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
              // ESC 키 핸들러
            }
          }

          window.addEventListener('resize', handleResize)
          window.addEventListener('keydown', handleKeydown)

          return () => {
            window.removeEventListener('resize', handleResize)
            window.removeEventListener('keydown', handleKeydown)
          }
        }, [])

        return <div>Event Listener Test</div>
      }

      const { unmount } = render(<EventListenerTestComponent />)

      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      // Act
      unmount()

      // Assert
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))

      // Cleanup
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })
  })

  describe('동시성 처리', () => {
    it('여러 API 요청이 동시에 처리되어도 상태가 일관성 있게 유지되어야 한다', async () => {
      // Arrange
      let requestCount = 0
      server.use(
        http.post('*/api/video-planning/generate-storyboard', async ({ request }) => {
          const currentRequest = ++requestCount
          const body = await request.json() as { shot: VideoShot }
          
          // 요청마다 다른 지연 시간 (동시성 테스트)
          const delay = 100 + (currentRequest * 50)
          await new Promise(resolve => setTimeout(resolve, delay))
          
          return HttpResponse.json({
            success: true,
            storyboardUrl: `/mock-storyboard-${body.shot.id}.jpg`,
            metadata: { requestId: currentRequest }
          })
        })
      )

      const mockShots = generateLargeDataset(5)
      const mockProps: TwelveShotsEditorProps = {
        shots: mockShots.slice(0, 3),
        insertShots: [],
        onShotUpdate: jest.fn(),
        onInsertUpdate: jest.fn(),
        onGenerateStoryboard: jest.fn().mockImplementation(async (shotId) => {
          // 실제 API 호출 시뮬레이션
          const response = await fetch('/api/video-planning/generate-storyboard', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shot: mockShots.find(s => s.id === shotId) })
          })
          return response.json()
        }),
        onExport: jest.fn(),
        onBack: jest.fn(),
        isLoading: false
      }

      render(<TwelveShotsEditor {...mockProps} />)

      // Act - 모든 스토리보드를 동시에 생성
      const generateButtons = screen.getAllByText('생성')
      const promises = generateButtons.slice(0, 3).map(button => user.click(button))

      await Promise.all(promises)

      // Assert - 모든 스토리보드가 생성되어야 함
      await waitFor(() => {
        const storyboardImages = screen.getAllByAltText('스토리보드')
        expect(storyboardImages).toHaveLength(3)
      }, { timeout: 10000 })

      expect(requestCount).toBe(3)
    })

    it('API 요청 중 컴포넌트 언마운트 시 요청이 적절히 취소되어야 한다', async () => {
      // Arrange
      const abortSpy = jest.fn()
      let requestPromise: Promise<any> | null = null

      server.use(
        http.post('*/api/video-planning/generate-storyboard', async ({ request }) => {
          // AbortController 시뮬레이션
          const abortController = new AbortController()
          request.signal?.addEventListener('abort', abortSpy)

          requestPromise = new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
              if (abortController.signal.aborted) {
                reject(new Error('Request aborted'))
              } else {
                resolve(HttpResponse.json({
                  success: true,
                  storyboardUrl: '/mock-storyboard.jpg'
                }))
              }
            }, 2000)

            abortController.signal.addEventListener('abort', () => {
              clearTimeout(timer)
              reject(new Error('Request aborted'))
            })
          })

          return requestPromise
        })
      )

      const mockShots = generateLargeDataset(1)
      const mockProps: TwelveShotsEditorProps = {
        shots: mockShots,
        insertShots: [],
        onShotUpdate: jest.fn(),
        onInsertUpdate: jest.fn(),
        onGenerateStoryboard: jest.fn(),
        onExport: jest.fn(),
        onBack: jest.fn(),
        isLoading: false
      }

      const { unmount } = render(<TwelveShotsEditor {...mockProps} />)

      // Act - 스토리보드 생성 시작 후 즉시 언마운트
      await user.click(screen.getByText('생성'))
      
      // 요청이 시작되었는지 확인
      expect(screen.getByText('콘티를 생성하고 있습니다...')).toBeInTheDocument()
      
      // 컴포넌트 언마운트
      unmount()

      // Assert - 요청이 취소되어야 함
      if (requestPromise) {
        await expect(requestPromise).rejects.toThrow('Request aborted')
      }
    })
  })

  describe('접근성 성능', () => {
    it('스크린 리더 사용자를 위한 ARIA 속성이 성능에 미치는 영향이 최소여야 한다', async () => {
      // Arrange
      const mockShots = generateLargeDataset(20)
      const mockProps: TwelveShotsEditorProps = {
        shots: mockShots,
        insertShots: [],
        onShotUpdate: jest.fn(),
        onInsertUpdate: jest.fn(),
        onGenerateStoryboard: jest.fn(),
        onExport: jest.fn(),
        onBack: jest.fn(),
        isLoading: false
      }

      // Act & Assert
      const renderDuration = await performanceTest('Accessibility Attributes', async () => {
        render(<TwelveShotsEditor {...mockProps} />)
        
        await waitFor(() => {
          expect(screen.getByText('총 20개 숏')).toBeInTheDocument()
        })

        // ARIA 속성들이 적절히 설정되었는지 확인
        const inputs = screen.getAllByRole('textbox')
        inputs.forEach(input => {
          expect(input).toHaveAttribute('aria-label')
        })
      })

      // ARIA 속성이 있어도 렌더링 성능에 큰 영향을 주지 않아야 함
      expect(renderDuration).toBeLessThan(300)
    })

    it('키보드 네비게이션이 대량 데이터에서도 반응성을 유지해야 한다', async () => {
      // Arrange
      const mockShots = generateLargeDataset(50)
      const mockProps: TwelveShotsEditorProps = {
        shots: mockShots,
        insertShots: [],
        onShotUpdate: jest.fn(),
        onInsertUpdate: jest.fn(),
        onGenerateStoryboard: jest.fn(),
        onExport: jest.fn(),
        onBack: jest.fn(),
        isLoading: false
      }

      render(<TwelveShotsEditor {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('총 50개 숏')).toBeInTheDocument()
      })

      // Act & Assert - Tab 키 네비게이션 성능 테스트
      const navigationDuration = await performanceTest('Keyboard Navigation', async () => {
        const focusableElements = screen.getAllByRole('textbox').slice(0, 10)
        
        for (const element of focusableElements) {
          element.focus()
          await new Promise(resolve => setTimeout(resolve, 1))
        }
      })

      // 키보드 네비게이션이 빨라야 함 (50ms 이내)
      expect(navigationDuration).toBeLessThan(50)
    })
  })
})