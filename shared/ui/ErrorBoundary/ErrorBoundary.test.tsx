/**
 * ErrorBoundary Component Tests (TDD Red Phase)
 * React 에러 경계 컴포넌트의 모든 기능을 검증하는 테스트
 */

import { render, screen } from '@testing-library/react'

import { ErrorBoundary } from './ErrorBoundary'

// 에러를 발생시키는 테스트 컴포넌트
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error')
  }
  return <div>No error</div>
}

// 콘솔 에러를 무시하도록 설정
const originalError = console.error
beforeAll(() => {
  console.error = jest.fn()
})

afterAll(() => {
  console.error = originalError
})

describe('ErrorBoundary', () => {
  describe('정상 상태', () => {
    it('에러가 없을 때 자식 컴포넌트를 렌더링해야 함', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('No error')).toBeInTheDocument()
    })

    it('여러 자식 컴포넌트를 렌더링해야 함', () => {
      render(
        <ErrorBoundary>
          <div>Child 1</div>
          <div>Child 2</div>
        </ErrorBoundary>
      )
      
      expect(screen.getByText('Child 1')).toBeInTheDocument()
      expect(screen.getByText('Child 2')).toBeInTheDocument()
    })
  })

  describe('에러 발생 시', () => {
    it('기본 에러 UI를 표시해야 함', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('오류가 발생했습니다')).toBeInTheDocument()
      expect(screen.getByText('페이지를 새로고침해주세요.')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument()
    })

    it('커스텀 에러 메시지를 표시해야 함', () => {
      const customMessage = '데이터를 불러올 수 없습니다'
      
      render(
        <ErrorBoundary errorMessage={customMessage}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      expect(screen.getByText(customMessage)).toBeInTheDocument()
    })

    it('커스텀 fallback UI를 렌더링해야 함', () => {
      const CustomFallback = () => <div>Custom Error UI</div>
      
      render(
        <ErrorBoundary fallback={<CustomFallback />}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('Custom Error UI')).toBeInTheDocument()
    })

    it('fallback 함수를 사용할 때 에러 정보를 전달해야 함', () => {
      const fallbackFn = jest.fn(() => <div>Function Fallback</div>)
      
      render(
        <ErrorBoundary fallback={fallbackFn}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      expect(fallbackFn).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      )
      expect(screen.getByText('Function Fallback')).toBeInTheDocument()
    })
  })

  describe('에러 보고', () => {
    it('onError 콜백이 호출되어야 함', () => {
      const onErrorMock = jest.fn()
      
      render(
        <ErrorBoundary onError={onErrorMock}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          componentStack: expect.any(String)
        })
      )
    })

    it('개발 모드에서 에러 세부사항이 표시되어야 함', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'
      
      render(
        <ErrorBoundary showDetails>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('에러 세부사항')).toBeInTheDocument()
      expect(screen.getByText(/Error: Test error/)).toBeInTheDocument()
      
      process.env.NODE_ENV = originalEnv
    })

    it('프로덕션 모드에서 에러 세부사항이 숨겨져야 함', () => {
      const originalEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'
      
      render(
        <ErrorBoundary showDetails>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      expect(screen.queryByText('에러 세부사항')).not.toBeInTheDocument()
      
      process.env.NODE_ENV = originalEnv
    })
  })

  describe('복구 기능', () => {
    it('새로고침 버튼이 작동해야 함', async () => {
      const reloadMock = jest.fn()
      Object.defineProperty(window, 'location', {
        value: { reload: reloadMock },
        writable: true
      })
      
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      const refreshButton = screen.getByRole('button', { name: '새로고침' })
      refreshButton.click()
      
      expect(reloadMock).toHaveBeenCalled()
    })

    it('재시도 버튼이 컴포넌트를 다시 렌더링해야 함', () => {
      let shouldThrow = true
      const TestComponent = () => {
        if (shouldThrow) {
          shouldThrow = false
          throw new Error('Test error')
        }
        return <div>Recovered</div>
      }
      
      render(
        <ErrorBoundary showRetry>
          <TestComponent />
        </ErrorBoundary>
      )
      
      // 에러 상태 확인
      expect(screen.getByText('오류가 발생했습니다')).toBeInTheDocument()
      
      // 재시도 버튼 클릭
      const retryButton = screen.getByRole('button', { name: '재시도' })
      retryButton.click()
      
      // 복구됨 확인
      expect(screen.getByText('Recovered')).toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('에러 UI에 적절한 ARIA 속성이 있어야 함', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      const errorContainer = screen.getByRole('alert')
      expect(errorContainer).toHaveAttribute('aria-live', 'assertive')
    })

    it('에러 제목이 적절한 heading 레벨을 가져야 함', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument()
    })

    it('버튼들이 키보드로 접근 가능해야 함', () => {
      render(
        <ErrorBoundary showRetry>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      const refreshButton = screen.getByRole('button', { name: '새로고침' })
      const retryButton = screen.getByRole('button', { name: '재시도' })
      
      expect(refreshButton).not.toHaveAttribute('tabindex', '-1')
      expect(retryButton).not.toHaveAttribute('tabindex', '-1')
    })
  })

  describe('스타일링', () => {
    it('커스텀 클래스명이 적용되어야 함', () => {
      render(
        <ErrorBoundary className="custom-error">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      const errorContainer = screen.getByRole('alert')
      expect(errorContainer).toHaveClass('custom-error')
    })

    it('작은 크기 변형이 적용되어야 함', () => {
      render(
        <ErrorBoundary size="sm">
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      )
      
      const errorContainer = screen.getByRole('alert')
      expect(errorContainer).toHaveClass('sm')
    })
  })

  describe('다양한 에러 타입', () => {
    it('일반 Error 객체를 처리해야 함', () => {
      const ErrorComponent = () => {
        throw new Error('General error')
      }
      
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('오류가 발생했습니다')).toBeInTheDocument()
    })

    it('문자열 에러를 처리해야 함', () => {
      const ErrorComponent = () => {
        throw 'String error'
      }
      
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('오류가 발생했습니다')).toBeInTheDocument()
    })

    it('null 에러를 처리해야 함', () => {
      const ErrorComponent = () => {
        throw null
      }
      
      render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      )
      
      expect(screen.getByText('오류가 발생했습니다')).toBeInTheDocument()
    })
  })

  describe('성능', () => {
    it('에러 발생 전까지는 추가 렌더링을 유발하지 않아야 함', () => {
      const renderMock = jest.fn(() => <div>Child</div>)
      const Child = renderMock
      
      render(
        <ErrorBoundary>
          <Child />
        </ErrorBoundary>
      )
      
      expect(renderMock).toHaveBeenCalledTimes(1)
    })
  })
})