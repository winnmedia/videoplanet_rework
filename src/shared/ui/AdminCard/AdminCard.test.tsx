import { render, screen, fireEvent } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { AdminCard } from './AdminCard'

expect.extend(toHaveNoViolations)

describe('AdminCard', () => {
  describe('기본 렌더링', () => {
    it('기본 카드를 올바르게 렌더링한다', () => {
      render(<AdminCard>테스트 내용</AdminCard>)
      
      expect(screen.getByText('테스트 내용')).toBeInTheDocument()
      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('title이 제공되면 헤더를 렌더링한다', () => {
      render(
        <AdminCard title="테스트 제목">
          테스트 내용
        </AdminCard>
      )
      
      expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('테스트 제목')
    })

    it('action이 제공되면 헤더 액션을 렌더링한다', () => {
      const actionButton = <button>액션</button>
      
      render(
        <AdminCard title="제목" action={actionButton}>
          내용
        </AdminCard>
      )
      
      expect(screen.getByRole('button', { name: '액션' })).toBeInTheDocument()
    })
  })

  describe('variant 동작', () => {
    it('danger variant가 올바른 스타일을 적용한다', () => {
      render(
        <AdminCard variant="danger" data-testid="danger-card">
          위험 내용
        </AdminCard>
      )
      
      const card = screen.getByTestId('danger-card')
      expect(card).toHaveClass('border-admin-error', 'bg-red-50')
    })

    it('interactive variant가 클릭 이벤트를 처리한다', () => {
      const mockClick = jest.fn()
      
      render(
        <AdminCard variant="interactive" onClick={mockClick}>
          클릭 가능한 카드
        </AdminCard>
      )
      
      const card = screen.getByRole('button')
      fireEvent.click(card)
      
      expect(mockClick).toHaveBeenCalledTimes(1)
      expect(card).toHaveClass('cursor-pointer')
    })
  })

  describe('접근성 테스트', () => {
    it('접근성 규칙을 준수한다', async () => {
      const { container } = render(
        <AdminCard title="접근성 테스트 카드" aria-label="접근성 테스트용 관리자 카드">
          접근성 테스트 내용
        </AdminCard>
      )
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('키보드 네비게이션을 지원한다', () => {
      const mockClick = jest.fn()
      
      render(
        <AdminCard onClick={mockClick}>
          키보드 네비게이션 테스트
        </AdminCard>
      )
      
      const card = screen.getByRole('button')
      
      // Enter 키로 클릭 가능
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' })
      
      // 공백키로도 클릭 가능
      fireEvent.keyDown(card, { key: ' ', code: 'Space' })
      
      // 포커스 가능
      card.focus()
      expect(card).toHaveFocus()
    })
  })

  describe('크기 및 레이아웃', () => {
    it('size prop이 올바른 패딩을 적용한다', () => {
      const { rerender } = render(
        <AdminCard size="sm" data-testid="small-card">
          작은 카드
        </AdminCard>
      )
      
      expect(screen.getByTestId('small-card')).toHaveClass('p-4')
      
      rerender(
        <AdminCard size="lg" data-testid="large-card">
          큰 카드
        </AdminCard>
      )
      
      expect(screen.getByTestId('large-card')).toHaveClass('p-8')
    })

    it('fullWidth prop이 올바르게 동작한다', () => {
      render(
        <AdminCard fullWidth={false} data-testid="narrow-card">
          좁은 카드
        </AdminCard>
      )
      
      const card = screen.getByTestId('narrow-card')
      expect(card).not.toHaveClass('w-full')
    })
  })

  describe('에러 케이스', () => {
    it('빈 children이 제공되어도 오류없이 렌더링한다', () => {
      render(<AdminCard>{null}</AdminCard>)
      
      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('onClick 없이 interactive variant를 사용해도 오류없이 렌더링한다', () => {
      render(
        <AdminCard variant="interactive">
          클릭 핸들러 없는 인터랙티브 카드
        </AdminCard>
      )
      
      // div로 렌더링되어야 함 (button이 아닌)
      expect(screen.getByRole('region')).toBeInTheDocument()
      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })
  })
})