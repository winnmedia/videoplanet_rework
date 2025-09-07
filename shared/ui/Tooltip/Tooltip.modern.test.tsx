import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { vi } from 'vitest'

import { Tooltip } from './Tooltip.modern'

describe('Tooltip', () => {
  it('호버 시 툴팁이 표시되어야 함', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="이것은 툴팁입니다">
        <button>호버해주세요</button>
      </Tooltip>
    )

    const trigger = screen.getByRole('button', { name: '호버해주세요' })
    
    // 툴팁이 처음에는 보이지 않음
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    
    // 호버 시 툴팁 표시
    await user.hover(trigger)
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
      expect(screen.getByRole('tooltip')).toHaveTextContent('이것은 툴팁입니다')
    })
  })

  it('언호버 시 툴팁이 사라져야 함', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="이것은 툴팁입니다">
        <button>호버해주세요</button>
      </Tooltip>
    )

    const trigger = screen.getByRole('button', { name: '호버해주세요' })
    
    // 호버 후 툴팁 표시
    await user.hover(trigger)
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })
    
    // 언호버 시 툴팁 사라짐
    await user.unhover(trigger)
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  it('포커스 시 툴팁이 표시되어야 함 (키보드 접근성)', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="이것은 툴팁입니다">
        <button>포커스해주세요</button>
      </Tooltip>
    )

    const trigger = screen.getByRole('button', { name: '포커스해주세요' })
    
    // 포커스 시 툴팁 표시
    await user.tab()
    expect(trigger).toHaveFocus()
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })
  })

  it('ESC 키로 툴팁을 닫을 수 있어야 함', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="이것은 툴팁입니다">
        <button>테스트 버튼</button>
      </Tooltip>
    )

    const trigger = screen.getByRole('button', { name: '테스트 버튼' })
    
    // 포커스로 툴팁 표시
    await user.tab()
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })
    
    // ESC 키로 닫기
    await user.keyboard('{Escape}')
    await waitFor(() => {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    })
  })

  it('다양한 위치에서 툴팁이 표시되어야 함', async () => {
    const user = userEvent.setup()
    
    const { rerender } = render(
      <Tooltip content="위쪽 툴팁" position="top">
        <button>위쪽</button>
      </Tooltip>
    )

    await user.hover(screen.getByRole('button', { name: '위쪽' }))
    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveClass('transform -translate-x-1/2 -translate-y-full')
    })

    rerender(
      <Tooltip content="아래쪽 툴팁" position="bottom">
        <button>아래쪽</button>
      </Tooltip>
    )

    await user.hover(screen.getByRole('button', { name: '아래쪽' }))
    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip')
      expect(tooltip).toHaveClass('transform -translate-x-1/2')
    })
  })

  it('비활성 상태에서도 툴팁이 표시되어야 함', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="비활성 버튼입니다">
        <button disabled>비활성 버튼</button>
      </Tooltip>
    )

    const trigger = screen.getByRole('button', { name: '비활성 버튼' })
    
    await user.hover(trigger)
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
      expect(screen.getByRole('tooltip')).toHaveTextContent('비활성 버튼입니다')
    })
  })

  it('접근성: aria-describedby가 올바르게 설정되어야 함', async () => {
    const user = userEvent.setup()
    render(
      <Tooltip content="접근성 테스트">
        <button>테스트 버튼</button>
      </Tooltip>
    )

    const trigger = screen.getByRole('button', { name: '테스트 버튼' })
    
    await user.hover(trigger)
    
    await waitFor(() => {
      const tooltip = screen.getByRole('tooltip')
      const tooltipId = tooltip.getAttribute('id')
      
      expect(trigger).toHaveAttribute('aria-describedby', tooltipId)
    })
  })

  it('지연 시간을 설정할 수 있어야 함', async () => {
    vi.useFakeTimers()
    const user = userEvent.setup()
    
    render(
      <Tooltip content="지연된 툴팁" delay={500}>
        <button>지연 테스트</button>
      </Tooltip>
    )

    const trigger = screen.getByRole('button', { name: '지연 테스트' })
    
    await user.hover(trigger)
    
    // 즉시는 툴팁이 보이지 않음
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    
    // 500ms 후 툴팁 표시
    vi.advanceTimersByTime(500)
    
    await waitFor(() => {
      expect(screen.getByRole('tooltip')).toBeInTheDocument()
    })

    vi.useRealTimers()
  })
})