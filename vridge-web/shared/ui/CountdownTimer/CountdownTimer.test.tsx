/**
 * CountdownTimer Component Unit Tests
 * TDD Red 단계 - 실패하는 테스트 먼저 작성
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { CountdownTimer } from './CountdownTimer'

describe('CountdownTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('초기 렌더링', () => {
    it('초기 시간을 올바르게 표시해야 한다', () => {
      // Given
      const initialSeconds = 600 // 10분

      // When
      render(<CountdownTimer initialSeconds={initialSeconds} />)

      // Then
      expect(screen.getByText('10:00')).toBeInTheDocument()
    })

    it('1분 미만 시간을 올바르게 표시해야 한다', () => {
      // Given
      const initialSeconds = 45

      // When
      render(<CountdownTimer initialSeconds={initialSeconds} />)

      // Then
      expect(screen.getByText('0:45')).toBeInTheDocument()
    })

    it('0초일 때 00:00을 표시해야 한다', () => {
      // Given
      const initialSeconds = 0

      // When
      render(<CountdownTimer initialSeconds={initialSeconds} />)

      // Then
      expect(screen.getByText('0:00')).toBeInTheDocument()
    })
  })

  describe('카운트다운 동작', () => {
    it('1초마다 시간이 감소해야 한다', () => {
      // Given
      const initialSeconds = 60
      render(<CountdownTimer initialSeconds={initialSeconds} />)

      // When & Then
      expect(screen.getByText('1:00')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(screen.getByText('0:59')).toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(screen.getByText('0:58')).toBeInTheDocument()
    })

    it('0에 도달하면 카운트다운이 중지되어야 한다', () => {
      // Given
      const initialSeconds = 2
      render(<CountdownTimer initialSeconds={initialSeconds} />)

      // When
      act(() => {
        vi.advanceTimersByTime(3000) // 3초 진행
      })

      // Then
      expect(screen.getByText('0:00')).toBeInTheDocument()
      
      // 추가로 시간이 진행되어도 0:00 유지
      act(() => {
        vi.advanceTimersByTime(2000)
      })
      expect(screen.getByText('0:00')).toBeInTheDocument()
    })

    it('시간이 만료되면 onExpire 콜백을 호출해야 한다', () => {
      // Given
      const onExpire = vi.fn()
      render(<CountdownTimer initialSeconds={2} onExpire={onExpire} />)

      // When
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      // Then
      expect(onExpire).toHaveBeenCalledTimes(1)
    })

    it('onExpire 콜백은 0에 도달할 때 한 번만 호출되어야 한다', () => {
      // Given
      const onExpire = vi.fn()
      render(<CountdownTimer initialSeconds={1} onExpire={onExpire} />)

      // When
      act(() => {
        vi.advanceTimersByTime(2000) // 충분히 많은 시간 진행
      })

      // Then
      expect(onExpire).toHaveBeenCalledTimes(1)
    })
  })

  describe('리셋 기능', () => {
    it('reset prop이 변경되면 타이머가 리셋되어야 한다', () => {
      // Given
      const initialSeconds = 60
      const { rerender } = render(
        <CountdownTimer initialSeconds={initialSeconds} reset={false} />
      )

      // When - 타이머 진행
      act(() => {
        vi.advanceTimersByTime(10000) // 10초 진행
      })
      expect(screen.getByText('0:50')).toBeInTheDocument()

      // When - 리셋
      rerender(<CountdownTimer initialSeconds={initialSeconds} reset={true} />)

      // Then
      expect(screen.getByText('1:00')).toBeInTheDocument()
    })

    it('리셋 후 다시 카운트다운이 시작되어야 한다', () => {
      // Given
      const initialSeconds = 30
      const { rerender } = render(
        <CountdownTimer initialSeconds={initialSeconds} reset={false} />
      )

      // When - 타이머 진행 후 리셋
      act(() => {
        vi.advanceTimersByTime(5000)
      })
      rerender(<CountdownTimer initialSeconds={initialSeconds} reset={true} />)

      // Then - 리셋 후 다시 카운트다운 시작
      act(() => {
        vi.advanceTimersByTime(1000)
      })
      expect(screen.getByText('0:29')).toBeInTheDocument()
    })
  })

  describe('시간 포맷팅', () => {
    it('10분 이상 시간을 올바르게 포맷팅해야 한다', () => {
      // Given & When
      render(<CountdownTimer initialSeconds={725} />) // 12분 5초

      // Then
      expect(screen.getByText('12:05')).toBeInTheDocument()
    })

    it('1자리 초를 두 자리로 표시해야 한다', () => {
      // Given & When
      render(<CountdownTimer initialSeconds={67} />) // 1분 7초

      // Then
      expect(screen.getByText('1:07')).toBeInTheDocument()
    })

    it('정확히 분 단위일 때 :00을 표시해야 한다', () => {
      // Given & When
      render(<CountdownTimer initialSeconds={300} />) // 5분 정확히

      // Then
      expect(screen.getByText('5:00')).toBeInTheDocument()
    })
  })

  describe('스타일링 및 상태', () => {
    it('기본 클래스명을 가져야 한다', () => {
      // Given & When
      render(<CountdownTimer initialSeconds={60} />)
      const timer = screen.getByText('1:00')

      // Then
      expect(timer).toHaveClass('countdown-timer')
    })

    it('커스텀 클래스명을 추가할 수 있어야 한다', () => {
      // Given & When
      render(<CountdownTimer initialSeconds={60} className="custom-class" />)
      const timer = screen.getByText('1:00')

      // Then
      expect(timer).toHaveClass('countdown-timer')
      expect(timer).toHaveClass('custom-class')
    })

    it('만료된 상태에서 expired 클래스를 가져야 한다', () => {
      // Given
      render(<CountdownTimer initialSeconds={1} />)

      // When
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Then
      const timer = screen.getByText('0:00')
      expect(timer).toHaveClass('expired')
    })

    it('30초 미만일 때 warning 클래스를 가져야 한다', () => {
      // Given
      render(<CountdownTimer initialSeconds={30} />)

      // When
      act(() => {
        vi.advanceTimersByTime(1000) // 29초
      })

      // Then
      const timer = screen.getByText('0:29')
      expect(timer).toHaveClass('warning')
    })
  })

  describe('접근성', () => {
    it('적절한 ARIA 레이블을 가져야 한다', () => {
      // Given & When
      render(<CountdownTimer initialSeconds={600} />)
      const timer = screen.getByText('10:00')

      // Then
      expect(timer).toHaveAttribute('aria-label', '인증번호 유효시간: 10분 0초')
    })

    it('시간이 변경될 때 aria-live로 알려야 한다', () => {
      // Given
      render(<CountdownTimer initialSeconds={60} />)
      const timer = screen.getByText('1:00')

      // Then
      expect(timer).toHaveAttribute('aria-live', 'polite')
    })

    it('만료될 때 더 명확한 aria-label을 제공해야 한다', () => {
      // Given
      render(<CountdownTimer initialSeconds={1} />)

      // When
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      // Then
      const timer = screen.getByText('0:00')
      expect(timer).toHaveAttribute('aria-label', '인증번호가 만료되었습니다')
    })
  })

  describe('성능', () => {
    it('컴포넌트가 언마운트되면 타이머를 정리해야 한다', () => {
      // Given
      const { unmount } = render(<CountdownTimer initialSeconds={60} />)
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      // When
      unmount()

      // Then
      expect(clearIntervalSpy).toHaveBeenCalled()
    })

    it('initialSeconds가 변경되면 타이머가 재시작되어야 한다', () => {
      // Given
      const { rerender } = render(<CountdownTimer initialSeconds={60} />)

      // When - 시간 진행
      act(() => {
        vi.advanceTimersByTime(10000)
      })
      expect(screen.getByText('0:50')).toBeInTheDocument()

      // When - initialSeconds 변경
      rerender(<CountdownTimer initialSeconds={120} />)

      // Then
      expect(screen.getByText('2:00')).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('음수 초를 받으면 0:00을 표시해야 한다', () => {
      // Given & When
      render(<CountdownTimer initialSeconds={-10} />)

      // Then
      expect(screen.getByText('0:00')).toBeInTheDocument()
    })

    it('매우 큰 수의 초를 올바르게 처리해야 한다', () => {
      // Given & When
      render(<CountdownTimer initialSeconds={7200} />) // 2시간

      // Then
      expect(screen.getByText('120:00')).toBeInTheDocument()
    })

    it('소수점이 포함된 초를 정수로 처리해야 한다', () => {
      // Given & When
      render(<CountdownTimer initialSeconds={59.7} />)

      // Then
      expect(screen.getByText('0:59')).toBeInTheDocument()
    })

    it('onChange 콜백이 제공되면 매초마다 호출해야 한다', () => {
      // Given
      const onChange = vi.fn()
      render(<CountdownTimer initialSeconds={3} onChange={onChange} />)

      // When
      act(() => {
        vi.advanceTimersByTime(2000) // 2초 진행
      })

      // Then
      expect(onChange).toHaveBeenCalledTimes(2)
      expect(onChange).toHaveBeenNthCalledWith(1, 2) // 남은 초
      expect(onChange).toHaveBeenNthCalledWith(2, 1)
    })
  })
})