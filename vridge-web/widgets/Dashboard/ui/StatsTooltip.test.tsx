/**
 * RED PHASE: 툴팁 키보드 접근성 실패 테스트
 * 
 * TDD 첫 번째 단계 - 의도적으로 실패하는 테스트를 작성하여
 * 구현해야 할 기능의 명세를 정의합니다.
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'

import { StatsTooltip } from './StatsTooltip'

expect.extend(toHaveNoViolations)

describe('StatsTooltip - 키보드 접근성 (RED 테스트)', () => {
  const mockTooltipProps = {
    content: '전체 프로젝트 수: 활성 프로젝트와 완료된 프로젝트의 총합입니다.',
    ariaLabel: '전체 프로젝트 통계 도움말'
  }

  describe('키보드 네비게이션 접근성 (실패 예상)', () => {
    it('Tab 키로 툴팁 트리거에 포커스할 수 있어야 함', async () => {
      render(
        <div>
          <button>이전 버튼</button>
          <StatsTooltip {...mockTooltipProps} />
          <button>다음 버튼</button>
        </div>
      )

      // Tab 키 네비게이션 테스트
      const user = userEvent.setup()
      
      // 첫 번째 Tab: 이전 버튼에 포커스
      await user.tab()
      expect(screen.getByText('이전 버튼')).toHaveFocus()

      // 두 번째 Tab: 툴팁 트리거에 포커스되어야 함
      await user.tab()
      const tooltipTrigger = screen.getByRole('button', { name: /도움말/ })
      expect(tooltipTrigger).toHaveFocus()

      // 세 번째 Tab: 다음 버튼에 포커스
      await user.tab()
      expect(screen.getByText('다음 버튼')).toHaveFocus()
    })

    it('Enter 키로 툴팁을 열고 닫을 수 있어야 함', async () => {
      render(<StatsTooltip {...mockTooltipProps} />)
      
      const user = userEvent.setup()
      const trigger = screen.getByRole('button', { name: /도움말/ })
      
      // 포커스 설정
      trigger.focus()
      
      // Enter 키로 툴팁 열기
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText(mockTooltipProps.content)).toBeVisible()
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
      })
      
      // 다시 Enter 키로 툴팁 닫기
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.queryByText(mockTooltipProps.content)).not.toBeInTheDocument()
        expect(trigger).toHaveAttribute('aria-expanded', 'false')
      })
    })

    it('스페이스 키로 툴팁을 열고 닫을 수 있어야 함', async () => {
      render(<StatsTooltip {...mockTooltipProps} />)
      
      const user = userEvent.setup()
      const trigger = screen.getByRole('button', { name: /도움말/ })
      
      trigger.focus()
      
      // 스페이스 키로 툴팁 열기
      await user.keyboard(' ')
      
      await waitFor(() => {
        expect(screen.getByText(mockTooltipProps.content)).toBeVisible()
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
      })
      
      // 다시 스페이스 키로 툴팁 닫기  
      await user.keyboard(' ')
      
      await waitFor(() => {
        expect(screen.queryByText(mockTooltipProps.content)).not.toBeInTheDocument()
        expect(trigger).toHaveAttribute('aria-expanded', 'false')
      })
    })

    it('Escape 키로 열린 툴팁을 닫을 수 있어야 함', async () => {
      render(<StatsTooltip {...mockTooltipProps} />)
      
      const user = userEvent.setup()
      const trigger = screen.getByRole('button', { name: /도움말/ })
      
      // 툴팁 먼저 열기
      trigger.focus()
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(screen.getByText(mockTooltipProps.content)).toBeVisible()
      })
      
      // Escape 키로 닫기
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        expect(screen.queryByText(mockTooltipProps.content)).not.toBeInTheDocument()
        expect(trigger).toHaveAttribute('aria-expanded', 'false')
      })
    })
  })

  describe('포커스 관리 (실패 예상)', () => {
    it('툴팁이 닫힐 때 포커스가 트리거로 돌아가야 함', async () => {
      render(<StatsTooltip {...mockTooltipProps} />)
      
      const user = userEvent.setup()
      const trigger = screen.getByRole('button', { name: /도움말/ })
      
      // 툴팁 열기
      trigger.focus()
      await user.keyboard('{Enter}')
      
      // Escape로 닫기
      await user.keyboard('{Escape}')
      
      await waitFor(() => {
        // 포커스가 트리거로 돌아와야 함
        expect(trigger).toHaveFocus()
        expect(trigger).toHaveAttribute('aria-expanded', 'false')
      })
    })

    it('툴팁 외부 클릭 시 포커스가 트리거로 유지되어야 함', async () => {
      render(
        <div>
          <StatsTooltip {...mockTooltipProps} />
          <button data-testid="outside-button">외부 버튼</button>
        </div>
      )
      
      const user = userEvent.setup()
      const trigger = screen.getByRole('button', { name: /도움말/ })
      const outsideButton = screen.getByTestId('outside-button')
      
      // 툴팁 열기
      trigger.focus()
      await user.keyboard('{Enter}')
      
      // 외부 클릭
      await user.click(outsideButton)
      
      await waitFor(() => {
        // 툴팁이 닫히고 포커스가 올바르게 관리되어야 함
        expect(screen.queryByText(mockTooltipProps.content)).not.toBeInTheDocument()
        expect(trigger).toHaveAttribute('aria-expanded', 'false')
      })
    })
  })

  describe('ARIA 속성 및 스크린리더 호환성 (실패 예상)', () => {
    it('올바른 ARIA 속성들을 가져야 함', () => {
      render(<StatsTooltip {...mockTooltipProps} />)
      
      const trigger = screen.getByRole('button', { name: /도움말/ })
      
      // ARIA 속성 검증
      expect(trigger).toHaveAttribute('aria-describedby')
      expect(trigger).toHaveAttribute('aria-expanded', 'false')
      expect(trigger).toHaveAttribute('aria-label', mockTooltipProps.ariaLabel)
      expect(trigger).toHaveAttribute('type', 'button')
    })

    it('툴팁이 열릴 때 적절한 ARIA 상태가 업데이트되어야 함', async () => {
      render(<StatsTooltip {...mockTooltipProps} />)
      
      const user = userEvent.setup()
      const trigger = screen.getByRole('button', { name: /도움말/ })
      const tooltipId = trigger.getAttribute('aria-describedby')
      
      // 툴팁 열기
      await user.click(trigger)
      
      await waitFor(() => {
        const tooltipContent = screen.getByRole('tooltip')
        
        expect(trigger).toHaveAttribute('aria-expanded', 'true')
        expect(tooltipContent).toHaveAttribute('id', tooltipId)
        expect(tooltipContent).toHaveAttribute('role', 'tooltip')
      })
    })

    it('접근성 위반사항이 없어야 함', async () => {
      const { container } = render(<StatsTooltip {...mockTooltipProps} />)
      
      // 초기 상태 검사
      const results = await axe(container)
      expect(results).toHaveNoViolations()
      
      // 툴팁이 열린 상태 검사
      const user = userEvent.setup()
      const trigger = screen.getByRole('button', { name: /도움말/ })
      
      await user.click(trigger)
      
      await waitFor(async () => {
        const resultsWithTooltip = await axe(container)
        expect(resultsWithTooltip).toHaveNoViolations()
      })
    })
  })

  describe('시각적 포커스 인디케이터 (실패 예상)', () => {
    it('포커스 시 시각적 인디케이터가 표시되어야 함', async () => {
      render(<StatsTooltip {...mockTooltipProps} />)
      
      const user = userEvent.setup()
      const trigger = screen.getByRole('button', { name: /도움말/ })
      
      // Tab으로 포커스
      await user.tab()
      
      // 포커스 스타일 확인 (Tailwind focus classes)
      expect(trigger).toHaveClass('focus:outline-none')
      expect(trigger).toHaveClass('focus:ring-2') 
      expect(trigger).toHaveClass('focus:ring-blue-600')
    })

    it('마우스와 키보드 포커스가 구분되어야 함', async () => {
      render(<StatsTooltip {...mockTooltipProps} />)
      
      const user = userEvent.setup()
      const trigger = screen.getByRole('button', { name: /도움말/ })
      
      // 마우스 클릭 (focus-visible 적용되지 않아야 함)
      await user.click(trigger)
      expect(trigger).not.toHaveClass('focus-visible:ring-2')
      
      // Tab 키 포커스 (focus-visible 적용되어야 함)
      trigger.blur() // 포커스 제거
      await user.tab()
      expect(trigger).toHaveClass('focus-visible:ring-2')
    })
  })

  describe('성능 및 메모리 누수 방지 (실패 예상)', () => {
    it('컴포넌트 언마운트 시 이벤트 리스너가 정리되어야 함', () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener')
      const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener')
      
      const { unmount } = render(<StatsTooltip {...mockTooltipProps} />)
      
      // 툴팁 열기
      const trigger = screen.getByRole('button', { name: /도움말/ })
      fireEvent.click(trigger)
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(addEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
      
      // 언마운트 시 이벤트 리스너 정리 확인
      unmount()
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
      expect(removeEventListenerSpy).toHaveBeenCalledWith('click', expect.any(Function))
      
      addEventListenerSpy.mockRestore()
      removeEventListenerSpy.mockRestore()
    })

    it('신속한 토글 시에도 안정적으로 작동해야 함', async () => {
      render(<StatsTooltip {...mockTooltipProps} />)
      
      const user = userEvent.setup()
      const trigger = screen.getByRole('button', { name: /도움말/ })
      
      // 빠른 연속 토글
      for (let i = 0; i < 5; i++) {
        await user.click(trigger)
        await user.keyboard('{Escape}')
      }
      
      // 최종 상태가 안정적이어야 함
      await waitFor(() => {
        expect(screen.queryByText(mockTooltipProps.content)).not.toBeInTheDocument()
        expect(trigger).toHaveAttribute('aria-expanded', 'false')
      })
    })
  })

  describe('반응형 및 모바일 접근성 (실패 예상)', () => {
    it('터치 이벤트를 지원해야 함', async () => {
      render(<StatsTooltip {...mockTooltipProps} />)
      
      const trigger = screen.getByRole('button', { name: /도움말/ })
      
      // 터치 이벤트 시뮬레이션
      fireEvent.touchStart(trigger)
      fireEvent.touchEnd(trigger)
      
      await waitFor(() => {
        expect(screen.getByText(mockTooltipProps.content)).toBeVisible()
      })
    })

    it('최소 터치 타겟 크기를 만족해야 함 (44px x 44px)', () => {
      render(<StatsTooltip {...mockTooltipProps} />)
      
      const trigger = screen.getByRole('button', { name: /도움말/ })
      const computedStyle = window.getComputedStyle(trigger)
      
      expect(computedStyle.minWidth).toBe('44px')
      expect(computedStyle.minHeight).toBe('44px')
    })
  })
})