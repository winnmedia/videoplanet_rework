/**
 * @fileoverview Toast 컴포넌트 테스트 - TDD 방식
 * @description 초미니멀 디자인 시스템의 Toast 컴포넌트 테스트
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { Toast } from './Toast.modern'

// Mock timers for animations
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.runOnlyPendingTimers()
  vi.useRealTimers()
})

describe('Toast 컴포넌트', () => {
  describe('기본 렌더링', () => {
    it('기본 메시지를 올바르게 렌더링해야 한다', () => {
      render(
        <Toast message="테스트 메시지" />
      )

      expect(screen.getByText('테스트 메시지')).toBeInTheDocument()
    })

    it('올바른 역할과 접근성 속성을 가져야 한다', () => {
      render(
        <Toast message="알림 메시지" />
      )

      const toast = screen.getByRole('alert')
      expect(toast).toBeInTheDocument()
      expect(toast).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('변형(Variant) 스타일', () => {
    it('성공 변형에 올바른 클래스를 적용해야 한다', () => {
      render(
        <Toast message="성공!" variant="success" />
      )

      const toast = screen.getByRole('alert')
      expect(toast).toHaveClass('bg-success-50', 'border-success-200', 'text-success-700')
    })

    it('에러 변형에 올바른 클래스를 적용해야 한다', () => {
      render(
        <Toast message="에러 발생!" variant="error" />
      )

      const toast = screen.getByRole('alert')
      expect(toast).toHaveClass('bg-error-50', 'border-error-200', 'text-error-700')
    })

    it('경고 변형에 올바른 클래스를 적용해야 한다', () => {
      render(
        <Toast message="경고!" variant="warning" />
      )

      const toast = screen.getByRole('alert')
      expect(toast).toHaveClass('bg-warning-50', 'border-warning-200', 'text-warning-700')
    })

    it('정보 변형에 올바른 클래스를 적용해야 한다', () => {
      render(
        <Toast message="정보" variant="info" />
      )

      const toast = screen.getByRole('alert')
      expect(toast).toHaveClass('bg-vridge-50', 'border-vridge-200', 'text-vridge-700')
    })
  })

  describe('위치(Position) 설정', () => {
    it('우상단 위치에 올바른 클래스를 적용해야 한다', () => {
      render(
        <Toast message="메시지" position="top-right" />
      )

      const toast = screen.getByRole('alert').parentElement
      expect(toast).toHaveClass('top-4', 'right-4')
    })

    it('우하단 위치에 올바른 클래스를 적용해야 한다', () => {
      render(
        <Toast message="메시지" position="bottom-right" />
      )

      const toast = screen.getByRole('alert').parentElement
      expect(toast).toHaveClass('bottom-4', 'right-4')
    })

    it('중앙 위치에 올바른 클래스를 적용해야 한다', () => {
      render(
        <Toast message="메시지" position="center" />
      )

      const toast = screen.getByRole('alert').parentElement
      expect(toast).toHaveClass('top-1/2', 'left-1/2', 'transform', '-translate-x-1/2', '-translate-y-1/2')
    })
  })

  describe('닫기 기능', () => {
    it('닫기 버튼을 클릭하면 onClose가 호출되어야 한다', () => {
      const onClose = jest.fn()
      render(
        <Toast message="메시지" onClose={onClose} />
      )

      const closeButton = screen.getByRole('button', { name: /닫기/i })
      fireEvent.click(closeButton)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('닫기 버튼이 올바른 접근성 속성을 가져야 한다', () => {
      render(
        <Toast message="메시지" onClose={() => {}} />
      )

      const closeButton = screen.getByRole('button', { name: /닫기/i })
      expect(closeButton).toHaveAttribute('aria-label', 'Toast 닫기')
    })

    it('Escape 키를 누르면 onClose가 호출되어야 한다', () => {
      const onClose = jest.fn()
      render(
        <Toast message="메시지" onClose={onClose} />
      )

      const toast = screen.getByRole('alert')
      fireEvent.keyDown(toast, { key: 'Escape', code: 'Escape' })

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('자동 닫기', () => {
    it('지정된 시간 후에 자동으로 닫혀야 한다', async () => {
      const onClose = jest.fn()
      render(
        <Toast 
          message="메시지" 
          onClose={onClose}
          autoClose={true}
          autoCloseDelay={3000}
        />
      )

      // 3초 후에 자동 닫기
      jest.advanceTimersByTime(3000)

      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })

    it('마우스 호버 시 자동 닫기가 일시정지되어야 한다', async () => {
      const onClose = jest.fn()
      render(
        <Toast 
          message="메시지" 
          onClose={onClose}
          autoClose={true}
          autoCloseDelay={3000}
        />
      )

      const toast = screen.getByRole('alert')
      
      // 1초 후 호버
      jest.advanceTimersByTime(1000)
      fireEvent.mouseEnter(toast)
      
      // 추가 3초 대기 (원래라면 닫혀야 했을 시간)
      jest.advanceTimersByTime(3000)
      expect(onClose).not.toHaveBeenCalled()

      // 마우스 떠나기
      fireEvent.mouseLeave(toast)
      
      // 나머지 시간 대기
      jest.advanceTimersByTime(2000)
      
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })
  })

  describe('아이콘', () => {
    it('성공 변형에 체크 아이콘을 표시해야 한다', () => {
      render(
        <Toast message="성공!" variant="success" />
      )

      const icon = screen.getByTestId('toast-icon-success')
      expect(icon).toBeInTheDocument()
    })

    it('에러 변형에 X 아이콘을 표시해야 한다', () => {
      render(
        <Toast message="에러!" variant="error" />
      )

      const icon = screen.getByTestId('toast-icon-error')
      expect(icon).toBeInTheDocument()
    })

    it('경고 변형에 경고 아이콘을 표시해야 한다', () => {
      render(
        <Toast message="경고!" variant="warning" />
      )

      const icon = screen.getByTestId('toast-icon-warning')
      expect(icon).toBeInTheDocument()
    })

    it('정보 변형에 정보 아이콘을 표시해야 한다', () => {
      render(
        <Toast message="정보" variant="info" />
      )

      const icon = screen.getByTestId('toast-icon-info')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('애니메이션', () => {
    it('표시될 때 fade-in 애니메이션을 적용해야 한다', () => {
      render(
        <Toast message="메시지" />
      )

      const toast = screen.getByRole('alert')
      expect(toast).toHaveClass('animate-slide-up')
    })
  })

  describe('접근성', () => {
    it('스크린 리더를 위한 올바른 텍스트를 가져야 한다', () => {
      render(
        <Toast message="중요한 알림" variant="error" />
      )

      const toast = screen.getByRole('alert')
      expect(toast).toHaveAttribute('aria-describedby')
      
      const description = screen.getByText('오류 알림: 중요한 알림')
      expect(description).toBeInTheDocument()
    })

    it('키보드로 포커스 가능해야 한다', () => {
      render(
        <Toast message="메시지" onClose={() => {}} />
      )

      const toast = screen.getByRole('alert')
      expect(toast).toHaveAttribute('tabIndex', '0')
    })
  })
})