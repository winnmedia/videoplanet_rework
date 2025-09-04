/**
 * Toast Component Tests (TDD Red Phase)
 * 토스트 알림 컴포넌트의 모든 기능을 검증하는 테스트
 */

import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import { Toast, ToastContainer, toast } from './Toast'

// 타이머 모킹
vi.useFakeTimers()

describe('Toast', () => {
  const defaultProps = {
    id: 'test-toast',
    message: '테스트 메시지',
    type: 'info' as const,
    onRemove: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.clearAllTimers()
  })

  afterEach(() => {
    act(() => {
      vi.runOnlyPendingTimers()
    })
  })

  describe('기본 렌더링', () => {
    it('토스트 메시지가 렌더링되어야 함', () => {
      render(<Toast {...defaultProps} />)
      
      expect(screen.getByText('테스트 메시지')).toBeInTheDocument()
    })

    it('기본 info 타입으로 렌더링되어야 함', () => {
      render(<Toast {...defaultProps} />)
      
      const toast = screen.getByRole('alert')
      expect(toast).toHaveClass('info')
    })

    it('닫기 버튼이 렌더링되어야 함', () => {
      render(<Toast {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: '알림 닫기' })).toBeInTheDocument()
    })
  })

  describe('토스트 타입', () => {
    it('성공 타입으로 렌더링되어야 함', () => {
      render(<Toast {...defaultProps} type="success" />)
      
      const toast = screen.getByRole('alert')
      expect(toast).toHaveClass('success')
    })

    it('에러 타입으로 렌더링되어야 함', () => {
      render(<Toast {...defaultProps} type="error" />)
      
      const toast = screen.getByRole('alertdialog')
      expect(toast).toHaveClass('error')
    })

    it('경고 타입으로 렌더링되어야 함', () => {
      render(<Toast {...defaultProps} type="warning" />)
      
      const toast = screen.getByRole('alert')
      expect(toast).toHaveClass('warning')
    })

    it('각 타입별 아이콘이 표시되어야 함', () => {
      const { rerender } = render(<Toast {...defaultProps} type="success" />)
      expect(screen.getByTestId('success-icon')).toBeInTheDocument()
      
      rerender(<Toast {...defaultProps} type="error" />)
      expect(screen.getByTestId('error-icon')).toBeInTheDocument()
      
      rerender(<Toast {...defaultProps} type="warning" />)
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument()
      
      rerender(<Toast {...defaultProps} type="info" />)
      expect(screen.getByTestId('info-icon')).toBeInTheDocument()
    })
  })

  describe('자동 제거', () => {
    it('기본 5초 후 자동으로 제거되어야 함', () => {
      render(<Toast {...defaultProps} />)
      
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      expect(defaultProps.onRemove).toHaveBeenCalledWith('test-toast')
    })

    it('커스텀 duration 후 제거되어야 함', () => {
      render(<Toast {...defaultProps} duration={3000} />)
      
      act(() => {
        vi.advanceTimersByTime(3000)
      })
      
      expect(defaultProps.onRemove).toHaveBeenCalledWith('test-toast')
    })

    it('duration이 0이면 자동 제거되지 않아야 함', () => {
      render(<Toast {...defaultProps} duration={0} />)
      
      act(() => {
        vi.advanceTimersByTime(10000)
      })
      
      expect(defaultProps.onRemove).not.toHaveBeenCalled()
    })

    it('마우스 호버 시 타이머가 정지되어야 함', () => {
      render(<Toast {...defaultProps} />)
      
      const toast = screen.getByRole('alert')
      
      // 2초 후 호버
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      
      fireEvent.mouseEnter(toast)
      
      // 추가 5초 대기 (원래라면 제거되어야 할 시간)
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      expect(defaultProps.onRemove).not.toHaveBeenCalled()
    })

    it('마우스 리브 시 타이머가 재시작되어야 함', () => {
      render(<Toast {...defaultProps} />)
      
      const toast = screen.getByRole('alert')
      
      fireEvent.mouseEnter(toast)
      fireEvent.mouseLeave(toast)
      
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      
      expect(defaultProps.onRemove).toHaveBeenCalledWith('test-toast')
    })
  })

  describe('인터랙션', () => {
    it('닫기 버튼 클릭 시 제거되어야 함', () => {
      render(<Toast {...defaultProps} />)
      
      const closeButton = screen.getByRole('button', { name: '알림 닫기' })
      fireEvent.click(closeButton)
      
      expect(defaultProps.onRemove).toHaveBeenCalledWith('test-toast')
    })

    it('액션 버튼이 있을 때 클릭 가능해야 함', () => {
      const actionFn = vi.fn()
      
      render(
        <Toast 
          {...defaultProps} 
          action={{ text: '실행', onClick: actionFn }}
        />
      )
      
      const actionButton = screen.getByRole('button', { name: '실행' })
      fireEvent.click(actionButton)
      
      expect(actionFn).toHaveBeenCalled()
    })
  })

  describe('접근성', () => {
    it('적절한 ARIA 속성이 설정되어야 함', () => {
      render(<Toast {...defaultProps} />)
      
      const toast = screen.getByRole('alert')
      expect(toast).toHaveAttribute('aria-live', 'assertive')
    })

    it('에러 타입의 경우 role이 alertdialog이어야 함', () => {
      render(<Toast {...defaultProps} type="error" />)
      
      const toast = screen.getByRole('alertdialog')
      expect(toast).toBeInTheDocument()
    })

    it('닫기 버튼에 적절한 aria-label이 있어야 함', () => {
      render(<Toast {...defaultProps} />)
      
      const closeButton = screen.getByRole('button', { name: '알림 닫기' })
      expect(closeButton).toHaveAttribute('aria-label', '알림 닫기')
    })

    it('키보드로 닫을 수 있어야 함', () => {
      render(<Toast {...defaultProps} />)
      
      const closeButton = screen.getByRole('button', { name: '알림 닫기' })
      closeButton.focus()
      
      // Enter 키로 버튼 클릭과 동일한 효과
      fireEvent.click(closeButton)
      
      expect(defaultProps.onRemove).toHaveBeenCalledWith('test-toast')
    })
  })

  describe('애니메이션', () => {
    it('등장 애니메이션 클래스가 적용되어야 함', () => {
      render(<Toast {...defaultProps} />)
      
      const toast = screen.getByRole('alert')
      expect(toast).toHaveClass('entering')
    })

    it('prefers-reduced-motion 설정 시 애니메이션이 비활성화되어야 함', () => {
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
        })),
      })

      render(<Toast {...defaultProps} />)
      
      const toast = screen.getByRole('alert')
      expect(toast).toHaveClass('reducedMotion')
    })
  })

  describe('위치', () => {
    it('기본 top-right 위치로 렌더링되어야 함', () => {
      render(<Toast {...defaultProps} />)
      
      const toast = screen.getByRole('alert')
      expect(toast).toHaveClass('topright')
    })

    it('커스텀 위치로 렌더링되어야 함', () => {
      render(<Toast {...defaultProps} position="bottom-left" />)
      
      const toast = screen.getByRole('alert')
      expect(toast).toHaveClass('bottomleft')
    })
  })
})

describe('ToastContainer', () => {
  it('빈 상태에서는 아무것도 렌더링하지 않아야 함', () => {
    render(<ToastContainer toasts={[]} onRemove={vi.fn()} />)
    
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('여러 토스트를 렌더링해야 함', () => {
    const toasts = [
      { id: '1', message: '첫 번째', type: 'info' as const },
      { id: '2', message: '두 번째', type: 'success' as const }
    ]
    
    render(<ToastContainer toasts={toasts} onRemove={vi.fn()} />)
    
    expect(screen.getByText('첫 번째')).toBeInTheDocument()
    expect(screen.getByText('두 번째')).toBeInTheDocument()
  })

  it('최대 개수 제한이 적용되어야 함', () => {
    const toasts = Array.from({ length: 10 }, (_, i) => ({
      id: `toast-${i}`,
      message: `메시지 ${i}`,
      type: 'info' as const
    }))
    
    render(<ToastContainer toasts={toasts} onRemove={vi.fn()} maxToasts={5} />)
    
    const alerts = screen.getAllByRole('alert')
    expect(alerts).toHaveLength(5)
  })
})

describe('toast 유틸리티 함수', () => {
  const mockAddToast = vi.fn()
  
  beforeEach(() => {
    // toast 함수의 내부 상태 초기화
    toast.setAddFunction(mockAddToast)
  })

  it('toast.success()가 성공 토스트를 생성해야 함', () => {
    toast.success('성공 메시지')
    
    expect(mockAddToast).toHaveBeenCalledWith({
      id: expect.any(String),
      type: 'success',
      message: '성공 메시지',
      duration: 5000
    })
  })

  it('toast.error()가 에러 토스트를 생성해야 함', () => {
    toast.error('에러 메시지')
    
    expect(mockAddToast).toHaveBeenCalledWith({
      id: expect.any(String),
      type: 'error',
      message: '에러 메시지',
      duration: 7000 // 에러는 더 오래 표시
    })
  })

  it('toast.warning()이 경고 토스트를 생성해야 함', () => {
    toast.warning('경고 메시지')
    
    expect(mockAddToast).toHaveBeenCalledWith({
      id: expect.any(String),
      type: 'warning',
      message: '경고 메시지',
      duration: 6000
    })
  })

  it('toast.info()가 정보 토스트를 생성해야 함', () => {
    toast.info('정보 메시지')
    
    expect(mockAddToast).toHaveBeenCalledWith({
      id: expect.any(String),
      type: 'info',
      message: '정보 메시지',
      duration: 5000
    })
  })

  it('커스텀 옵션을 적용해야 함', () => {
    toast.success('커스텀 토스트', {
      duration: 3000,
      action: { text: '액션', onClick: vi.fn() }
    })
    
    expect(mockAddToast).toHaveBeenCalledWith({
      id: expect.any(String),
      type: 'success',
      message: '커스텀 토스트',
      duration: 3000,
      action: { text: '액션', onClick: expect.any(Function) }
    })
  })
})