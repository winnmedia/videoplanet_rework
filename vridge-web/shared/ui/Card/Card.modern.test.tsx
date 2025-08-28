/**
 * @fileoverview Card 컴포넌트 TDD 테스트 - 신규 Tailwind 기반
 * @description 초미니멀 디자인 시스템에 맞는 Card 컴포넌트 테스트
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Card } from './Card.modern'

// Jest-axe matcher 확장
expect.extend(toHaveNoViolations)

describe('Card - Modern Tailwind Design System', () => {
  // === FAIL TESTS (구현 전 실패 테스트) ===
  
  describe('기본 렌더링과 접근성', () => {
    it('children과 함께 올바르게 렌더링되어야 함', () => {
      render(
        <Card>
          <p>카드 콘텐츠</p>
        </Card>
      )
      
      const card = screen.getByText('카드 콘텐츠').closest('div')
      expect(card).toBeInTheDocument()
      expect(screen.getByText('카드 콘텐츠')).toBeInTheDocument()
    })

    it('기본 variant는 default여야 함', () => {
      render(<Card data-testid="card">기본 카드</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('bg-white', 'border', 'border-gray-200')
    })

    it('접근성 위반이 없어야 함', async () => {
      const { container } = render(<Card>접근성 테스트</Card>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Variant 스타일링', () => {
    it('outlined variant 스타일이 적용되어야 함', () => {
      render(<Card variant="outlined" data-testid="card">Outlined Card</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('bg-transparent', 'border-2', 'border-gray-300')
    })

    it('filled variant 스타일이 적용되어야 함', () => {
      render(<Card variant="filled" data-testid="card">Filled Card</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('bg-gray-50', 'border-transparent')
    })

    it('elevated variant 스타일이 적용되어야 함', () => {
      render(<Card variant="elevated" data-testid="card">Elevated Card</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('bg-white', 'shadow-md', 'border-transparent')
    })
  })

  describe('Padding 변형', () => {
    it('none padding이 적용되어야 함', () => {
      render(<Card padding="none" data-testid="card">No Padding</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('p-0')
    })

    it('sm padding이 적용되어야 함', () => {
      render(<Card padding="sm" data-testid="card">Small Padding</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('p-3')
    })

    it('default padding이 적용되어야 함', () => {
      render(<Card data-testid="card">Default Padding</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('p-4')
    })

    it('lg padding이 적용되어야 함', () => {
      render(<Card padding="lg" data-testid="card">Large Padding</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('p-6')
    })
  })

  describe('인터렉티브 상태', () => {
    it('clickable prop이 true일 때 클릭 가능 스타일이 적용되어야 함', () => {
      const handleClick = jest.fn()
      render(
        <Card clickable onClick={handleClick} data-testid="card">
          Clickable Card
        </Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('cursor-pointer', 'hover:shadow-md')
      expect(card).toHaveAttribute('role', 'button')
      expect(card).toHaveAttribute('tabIndex', '0')
    })

    it('클릭 이벤트가 올바르게 처리되어야 함', async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()
      
      render(
        <Card clickable onClick={handleClick} data-testid="card">
          Click Me
        </Card>
      )
      
      const card = screen.getByTestId('card')
      await user.click(card)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('disabled 상태가 올바르게 처리되어야 함', () => {
      const handleClick = jest.fn()
      render(
        <Card clickable disabled onClick={handleClick} data-testid="card">
          Disabled Card
        </Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('opacity-50', 'cursor-not-allowed')
      expect(card).toHaveAttribute('aria-disabled', 'true')
      expect(card).toHaveAttribute('tabIndex', '-1')
    })

    it('disabled 상태에서는 클릭이 무시되어야 함', async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()
      
      render(
        <Card clickable disabled onClick={handleClick} data-testid="card">
          Disabled Card
        </Card>
      )
      
      const card = screen.getByTestId('card')
      await user.click(card)
      
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('키보드 네비게이션', () => {
    it('Enter 키로 활성화되어야 함', () => {
      const handleClick = jest.fn()
      render(
        <Card clickable onClick={handleClick} data-testid="card">
          Enter Test
        </Card>
      )
      
      const card = screen.getByTestId('card')
      card.focus()
      fireEvent.keyDown(card, { key: 'Enter', code: 'Enter' })
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('Space 키로 활성화되어야 함', () => {
      const handleClick = jest.fn()
      render(
        <Card clickable onClick={handleClick} data-testid="card">
          Space Test
        </Card>
      )
      
      const card = screen.getByTestId('card')
      card.focus()
      fireEvent.keyDown(card, { key: ' ', code: 'Space' })
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('포커스 스타일이 적용되어야 함', () => {
      render(
        <Card clickable data-testid="card">
          Focus Test
        </Card>
      )
      
      const card = screen.getByTestId('card')
      card.focus()
      
      expect(card).toHaveClass('focus:ring-2', 'focus:ring-vridge-500')
    })
  })

  describe('Header와 Footer', () => {
    it('header가 올바르게 렌더링되어야 함', () => {
      const header = <h2>카드 제목</h2>
      render(
        <Card header={header}>
          카드 본문
        </Card>
      )
      
      expect(screen.getByRole('heading', { name: '카드 제목' })).toBeInTheDocument()
      expect(screen.getByText('카드 본문')).toBeInTheDocument()
    })

    it('footer가 올바르게 렌더링되어야 함', () => {
      const footer = <button>액션</button>
      render(
        <Card footer={footer}>
          카드 본문
        </Card>
      )
      
      expect(screen.getByRole('button', { name: '액션' })).toBeInTheDocument()
      expect(screen.getByText('카드 본문')).toBeInTheDocument()
    })

    it('header와 footer가 함께 올바르게 렌더링되어야 함', () => {
      const header = <h2>제목</h2>
      const footer = <div>푸터</div>
      
      render(
        <Card header={header} footer={footer}>
          본문
        </Card>
      )
      
      expect(screen.getByRole('heading', { name: '제목' })).toBeInTheDocument()
      expect(screen.getByText('본문')).toBeInTheDocument()
      expect(screen.getByText('푸터')).toBeInTheDocument()
    })

    it('header와 footer의 구조가 올바르게 배치되어야 함', () => {
      const header = <div data-testid="header">Header</div>
      const footer = <div data-testid="footer">Footer</div>
      
      render(
        <Card header={header} footer={footer} data-testid="card">
          <div data-testid="content">Content</div>
        </Card>
      )
      
      const card = screen.getByTestId('card')
      const headerEl = screen.getByTestId('header')
      const contentEl = screen.getByTestId('content')
      const footerEl = screen.getByTestId('footer')
      
      // 순서 확인: header -> content -> footer
      const children = Array.from(card.children)
      expect(children[0]).toContain(headerEl)
      expect(children[1]).toContain(contentEl)
      expect(children[2]).toContain(footerEl)
    })
  })

  describe('커스텀 props', () => {
    it('fullWidth prop이 적용되어야 함', () => {
      render(<Card fullWidth data-testid="card">Full Width</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('w-full')
    })

    it('사용자 정의 className이 병합되어야 함', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Custom Class
        </Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-class')
      expect(card).toHaveClass('bg-white') // 기본 클래스도 유지
    })

    it('style prop이 올바르게 적용되어야 함', () => {
      const customStyle = { backgroundColor: 'red', color: 'white' }
      render(
        <Card style={customStyle} data-testid="card">
          Custom Style
        </Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toHaveStyle(customStyle)
    })

    it('데이터 속성이 올바르게 전달되어야 함', () => {
      render(
        <Card data-testid="custom-card" data-custom="test-value">
          Custom Data
        </Card>
      )
      
      const card = screen.getByTestId('custom-card')
      expect(card).toHaveAttribute('data-custom', 'test-value')
    })
  })

  describe('애니메이션과 transition', () => {
    it('transition 클래스가 적용되어야 함', () => {
      render(<Card data-testid="card">Animated Card</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('transition-all', 'duration-200')
    })

    it('hover 애니메이션이 clickable일 때만 적용되어야 함', () => {
      render(<Card clickable data-testid="card">Hover Card</Card>)
      
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('hover:shadow-md')
    })
  })

  describe('로딩 상태', () => {
    it('loading 상태가 올바르게 표시되어야 함', () => {
      render(
        <Card loading data-testid="card">
          Loading Card
        </Card>
      )
      
      const card = screen.getByTestId('card')
      expect(card).toHaveAttribute('aria-busy', 'true')
      expect(card).toHaveClass('animate-pulse')
    })

    it('loading 상태에서는 클릭이 비활성화되어야 함', async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()
      
      render(
        <Card clickable loading onClick={handleClick} data-testid="card">
          Loading Card
        </Card>
      )
      
      const card = screen.getByTestId('card')
      await user.click(card)
      
      expect(handleClick).not.toHaveBeenCalled()
    })
  })
})