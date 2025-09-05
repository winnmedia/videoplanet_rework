/**
 * UnreadBadge 테스트
 * TDD Red Phase: 읽지 않음 배지 컴포넌트의 실패 테스트 작성
 */

import { render, screen } from '@testing-library/react'

import { UnreadBadge } from './UnreadBadge'

describe('UnreadBadge', () => {
  describe('기본 렌더링', () => {
    it('배지에 카운트가 표시되어야 한다', () => {
      render(<UnreadBadge count={3} />)
      
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    it('카운트가 0일 때 배지가 표시되지 않아야 한다', () => {
      render(<UnreadBadge count={0} />)
      
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('showZero=true일 때 0도 표시되어야 한다', () => {
      render(<UnreadBadge count={0} showZero={true} />)
      
      expect(screen.getByText('0')).toBeInTheDocument()
    })
  })

  describe('카운트 표시', () => {
    it('9 이하의 카운트는 그대로 표시되어야 한다', () => {
      render(<UnreadBadge count={9} />)
      
      expect(screen.getByText('9')).toBeInTheDocument()
    })

    it('9를 초과하는 카운트는 "9+"로 표시되어야 한다', () => {
      render(<UnreadBadge count={15} />)
      
      expect(screen.getByText('9+')).toBeInTheDocument()
    })

    it('100을 초과하는 카운트도 "9+"로 표시되어야 한다', () => {
      render(<UnreadBadge count={999} />)
      
      expect(screen.getByText('9+')).toBeInTheDocument()
    })
  })

  describe('우선순위별 색상', () => {
    it('낮은 우선순위는 회색으로 표시되어야 한다', () => {
      render(<UnreadBadge count={1} priority="low" />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('bg-gray-500')
    })

    it('중간 우선순위는 주황색으로 표시되어야 한다', () => {
      render(<UnreadBadge count={1} priority="medium" />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('bg-warning-500')
    })

    it('높은 우선순위는 빨간색으로 표시되어야 한다', () => {
      render(<UnreadBadge count={1} priority="high" />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('bg-error-500')
    })

    it('우선순위가 지정되지 않으면 기본 색상(파란색)을 사용해야 한다', () => {
      render(<UnreadBadge count={1} />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('bg-primary-500')
    })
  })

  describe('크기', () => {
    it('작은 크기(sm)가 적용되어야 한다', () => {
      render(<UnreadBadge count={1} size="sm" />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('min-w-4', 'h-4', 'text-xs')
    })

    it('중간 크기(md)가 기본값이어야 한다', () => {
      render(<UnreadBadge count={1} size="md" />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('min-w-6', 'h-6', 'text-sm')
    })

    it('큰 크기(lg)가 적용되어야 한다', () => {
      render(<UnreadBadge count={1} size="lg" />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('min-w-8', 'h-8', 'text-base')
    })

    it('크기가 지정되지 않으면 중간 크기를 사용해야 한다', () => {
      render(<UnreadBadge count={1} />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('min-w-6', 'h-6', 'text-sm')
    })
  })

  describe('접근성', () => {
    it('기본 ARIA 레이블이 설정되어야 한다', () => {
      render(<UnreadBadge count={5} />)
      
      const badge = screen.getByRole('status')
      expect(badge).toHaveAttribute('aria-label', '읽지 않음 5개')
    })

    it('커스텀 ARIA 레이블을 사용할 수 있어야 한다', () => {
      render(<UnreadBadge count={3} ariaLabel="새 메시지 3개" />)
      
      const badge = screen.getByRole('status')
      expect(badge).toHaveAttribute('aria-label', '새 메시지 3개')
    })

    it('높은 우선순위 배지는 적절한 레이블을 가져야 한다', () => {
      render(<UnreadBadge count={2} priority="high" />)
      
      const badge = screen.getByRole('status')
      expect(badge).toHaveAttribute('aria-label', '중요한 읽지 않음 2개')
    })

    it('9+ 표시 시에도 실제 카운트가 레이블에 포함되어야 한다', () => {
      render(<UnreadBadge count={15} />)
      
      const badge = screen.getByRole('status')
      expect(badge).toHaveAttribute('aria-label', '읽지 않음 15개')
    })
  })

  describe('커스텀 클래스', () => {
    it('추가 CSS 클래스를 적용할 수 있어야 한다', () => {
      render(<UnreadBadge count={1} className="custom-class" />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('custom-class')
    })

    it('커스텀 클래스가 기본 클래스와 함께 적용되어야 한다', () => {
      render(<UnreadBadge count={1} className="custom-class" />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('custom-class', 'bg-primary-500', 'text-white')
    })
  })

  describe('시각적 상태', () => {
    it('배지는 둥근 모양이어야 한다', () => {
      render(<UnreadBadge count={1} />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('rounded-full')
    })

    it('배지는 중앙 정렬되어야 한다', () => {
      render(<UnreadBadge count={1} />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('flex', 'items-center', 'justify-center')
    })

    it('배지 텍스트는 흰색이어야 한다', () => {
      render(<UnreadBadge count={1} />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('text-white')
    })

    it('배지는 굵은 글꼴을 사용해야 한다', () => {
      render(<UnreadBadge count={1} />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('font-bold')
    })
  })

  describe('애니메이션', () => {
    it('높은 우선순위 배지는 펄스 애니메이션을 가져야 한다', () => {
      render(<UnreadBadge count={1} priority="high" />)
      
      const badge = screen.getByText('1')
      expect(badge).toHaveClass('animate-pulse-soft')
    })

    it('일반 우선순위 배지는 펄스 애니메이션이 없어야 한다', () => {
      render(<UnreadBadge count={1} priority="medium" />)
      
      const badge = screen.getByText('1')
      expect(badge).not.toHaveClass('animate-pulse-soft')
    })
  })

  describe('엣지 케이스', () => {
    it('음수 카운트는 0으로 처리되어야 한다', () => {
      render(<UnreadBadge count={-5} />)
      
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })

    it('매우 큰 숫자도 올바르게 처리되어야 한다', () => {
      render(<UnreadBadge count={Number.MAX_SAFE_INTEGER} />)
      
      expect(screen.getByText('9+')).toBeInTheDocument()
    })

    it('NaN 값은 0으로 처리되어야 한다', () => {
      render(<UnreadBadge count={NaN} />)
      
      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    })
  })
})