/**
 * Card Component Tests (TDD Red Phase)
 * 레거시 카드 스타일 컴포넌트의 모든 기능을 검증하는 테스트
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import { Card } from './Card'

describe('Card', () => {
  describe('기본 렌더링', () => {
    it('기본 카드가 렌더링되어야 함', () => {
      render(<Card>카드 내용</Card>)
      
      const card = screen.getByText('카드 내용')
      expect(card).toBeInTheDocument()
    })

    it('기본 클래스가 적용되어야 함', () => {
      render(<Card data-testid="card">카드 내용</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('card')
    })

    it('여러 자식 요소를 렌더링해야 함', () => {
      render(
        <Card>
          <h3>제목</h3>
          <p>내용</p>
        </Card>
      )
      
      expect(screen.getByText('제목')).toBeInTheDocument()
      expect(screen.getByText('내용')).toBeInTheDocument()
    })
  })

  describe('변형 스타일', () => {
    it('outline 변형이 적용되어야 함', () => {
      render(<Card variant="outline" data-testid="card">내용</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('outline')
    })

    it('elevated 변형이 적용되어야 함', () => {
      render(<Card variant="elevated" data-testid="card">내용</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('elevated')
    })

    it('ghost 변형이 적용되어야 함', () => {
      render(<Card variant="ghost" data-testid="card">내용</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('ghost')
    })
  })

  describe('크기 옵션', () => {
    it('작은 크기(sm)가 적용되어야 함', () => {
      render(<Card size="sm" data-testid="card">내용</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('sm')
    })

    it('큰 크기(lg)가 적용되어야 함', () => {
      render(<Card size="lg" data-testid="card">내용</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('lg')
    })

    it('기본 크기(md)가 적용되어야 함', () => {
      render(<Card data-testid="card">내용</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('md')
    })
  })

  describe('인터랙티브 기능', () => {
    it('클릭 가능한 카드가 렌더링되어야 함', () => {
      const handleClick = vi.fn()
      
      render(<Card onClick={handleClick} data-testid="card">클릭 가능</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('clickable')
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('클릭 시 핸들러가 호출되어야 함', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      
      render(<Card onClick={handleClick} data-testid="card">클릭하세요</Card>)
      
      await user.click(screen.getByTestId('card'))
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('Enter 키로 클릭할 수 있어야 함', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      
      render(<Card onClick={handleClick} data-testid="card">키보드 접근</Card>)
      
      const card = screen.getByTestId('card')
      card.focus()
      await user.keyboard('{Enter}')
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('Space 키로 클릭할 수 있어야 함', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      
      render(<Card onClick={handleClick} data-testid="card">스페이스 키</Card>)
      
      const card = screen.getByTestId('card')
      card.focus()
      await user.keyboard(' ')
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('비활성화된 카드는 클릭되지 않아야 함', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      
      render(
        <Card onClick={handleClick} disabled data-testid="card">
          비활성화됨
        </Card>
      )
      
      const card = screen.getByTestId('card')
      await user.click(card)
      
      expect(handleClick).not.toHaveBeenCalled()
      expect(card).toHaveClass('disabled')
      expect(card).toHaveAttribute('aria-disabled', 'true')
    })
  })

  describe('호버 효과', () => {
    it('hover 옵션이 true일 때 호버 클래스가 적용되어야 함', () => {
      render(<Card hover data-testid="card">호버 카드</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('hover')
    })

    it('클릭 가능한 카드는 자동으로 호버 효과가 적용되어야 함', () => {
      render(<Card onClick={vi.fn()} data-testid="card">자동 호버</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('hover')
    })
  })

  describe('전체 너비', () => {
    it('fullWidth 옵션이 적용되어야 함', () => {
      render(<Card fullWidth data-testid="card">전체 너비</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('fullWidth')
    })
  })

  describe('헤더와 푸터', () => {
    it('헤더가 렌더링되어야 함', () => {
      const header = <h2>카드 헤더</h2>
      
      render(
        <Card header={header}>
          카드 내용
        </Card>
      )
      
      expect(screen.getByText('카드 헤더')).toBeInTheDocument()
    })

    it('푸터가 렌더링되어야 함', () => {
      const footer = <div>카드 푸터</div>
      
      render(
        <Card footer={footer}>
          카드 내용
        </Card>
      )
      
      expect(screen.getByText('카드 푸터')).toBeInTheDocument()
    })

    it('헤더와 푸터가 모두 렌더링되어야 함', () => {
      const header = <h2>헤더</h2>
      const footer = <div>푸터</div>
      
      render(
        <Card header={header} footer={footer}>
          내용
        </Card>
      )
      
      expect(screen.getByText('헤더')).toBeInTheDocument()
      expect(screen.getByText('내용')).toBeInTheDocument()
      expect(screen.getByText('푸터')).toBeInTheDocument()
    })
  })

  describe('접근성', () => {
    it('클릭 가능한 카드는 적절한 ARIA 속성을 가져야 함', () => {
      render(<Card onClick={vi.fn()} data-testid="card">접근성</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabindex', '0')
    })

    it('비활성화된 카드는 aria-disabled를 가져야 함', () => {
      render(<Card onClick={vi.fn()} disabled data-testid="card">비활성화</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('aria-disabled', 'true')
      expect(card).toHaveAttribute('tabindex', '-1')
    })

    it('일반 카드는 버튼 역할을 갖지 않아야 함', () => {
      render(<Card data-testid="card">일반 카드</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).not.toHaveAttribute('role')
      expect(card).not.toHaveAttribute('tabindex')
    })
  })

  describe('스타일링', () => {
    it('커스텀 클래스명이 적용되어야 함', () => {
      render(<Card className="custom-card" data-testid="card">커스텀</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-card')
    })

    it('인라인 스타일이 적용되어야 함', () => {
      render(<Card style={{ backgroundColor: 'red' }} data-testid="card">스타일</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('style')
      expect(card.style.backgroundColor).toBe('red')
    })
  })

  describe('레거시 디자인', () => {
    it('레거시 스타일이 기본으로 적용되어야 함', () => {
      render(<Card data-testid="card">레거시</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('legacyStyle')
    })

    it('20px border-radius가 적용되어야 함', () => {
      render(<Card data-testid="card">둥근 모서리</Card>)
      
      const card = screen.getByTestId('card')
      // CSS 클래스를 통해 확인
      expect(card).toHaveClass('legacyRadius')
    })
  })

  describe('로딩 상태', () => {
    it('로딩 상태가 표시되어야 함', () => {
      render(<Card loading data-testid="card">로딩 중</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('loading')
      expect(card).toHaveAttribute('aria-busy', 'true')
    })

    it('로딩 중일 때는 클릭할 수 없어야 함', async () => {
      const handleClick = vi.fn()
      const user = userEvent.setup()
      
      render(
        <Card onClick={handleClick} loading data-testid="card">
          로딩 중
        </Card>
      )
      
      await user.click(screen.getByTestId('card'))
      
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('에러 처리', () => {
    it('잘못된 variant에 대해 기본값을 사용해야 함', () => {
      // @ts-expect-error - 의도적으로 잘못된 props 테스트
      render(<Card variant="invalid" data-testid="card">기본값</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).not.toHaveClass('invalid')
      expect(card).toHaveClass('default') // 기본값으로 fallback
    })

    it('잘못된 size에 대해 기본값을 사용해야 함', () => {
      // @ts-expect-error - 의도적으로 잘못된 props 테스트
      render(<Card size="invalid" data-testid="card">기본 크기</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).not.toHaveClass('invalid')
      expect(card).toHaveClass('md') // 기본값으로 fallback
    })
  })

  describe('성능', () => {
    it('불필요한 리렌더링을 방지해야 함', () => {
      const { rerender } = render(<Card>첫 번째 렌더</Card>)
      
      const firstRender = screen.getByText('첫 번째 렌더').parentElement
      
      rerender(<Card>첫 번째 렌더</Card>)
      
      const secondRender = screen.getByText('첫 번째 렌더').parentElement
      expect(firstRender).toBe(secondRender)
    })
  })
})