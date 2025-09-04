/**
 * @fileoverview Button 컴포넌트 TDD 테스트 - 신규 Tailwind 기반
 * @description 초미니멀 디자인 시스템에 맞는 Button 컴포넌트 테스트
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

import { Button } from './Button.modern'

// Jest-axe matcher 확장
expect.extend(toHaveNoViolations)

describe('Button - Modern Tailwind Design System', () => {
  // === FAIL TESTS (구현 전 실패 테스트) ===
  
  describe('기본 렌더링과 접근성', () => {
    it('텍스트와 함께 올바르게 렌더링되어야 함', () => {
      render(<Button>클릭하세요</Button>)
      
      const button = screen.getByRole('button', { name: '클릭하세요' })
      expect(button).toBeInTheDocument()
      expect(button).toHaveTextContent('클릭하세요')
    })

    it('기본 variant는 primary여야 함', () => {
      render(<Button>Primary Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-vridge-500') // Tailwind primary color
    })

    it('접근성 위반이 없어야 함', async () => {
      const { container } = render(<Button>Accessible Button</Button>)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Variant 스타일링', () => {
    it('secondary variant 스타일이 적용되어야 함', () => {
      render(<Button variant="secondary">Secondary</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-gray-100', 'text-gray-900')
    })

    it('outline variant 스타일이 적용되어야 함', () => {
      render(<Button variant="outline">Outline</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('border-gray-300', 'bg-transparent')
    })

    it('ghost variant 스타일이 적용되어야 함', () => {
      render(<Button variant="ghost">Ghost</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-transparent', 'hover:bg-gray-50')
    })

    it('destructive variant 스타일이 적용되어야 함', () => {
      render(<Button variant="destructive">Delete</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('bg-error-500', 'text-white')
    })
  })

  describe('Size 변형', () => {
    it('sm size가 적용되어야 함', () => {
      render(<Button size="sm">Small</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-button-sm', 'px-3', 'text-sm')
    })

    it('default size가 적용되어야 함', () => {
      render(<Button>Default</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-button', 'px-4', 'text-base')
    })

    it('lg size가 적용되어야 함', () => {
      render(<Button size="lg">Large</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('h-button-lg', 'px-6', 'text-lg')
    })
  })

  describe('상태 및 인터렙션', () => {
    it('disabled 상태가 올바르게 처리되어야 함', () => {
      render(<Button disabled>Disabled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('opacity-50', 'cursor-not-allowed')
      expect(button).toHaveAttribute('aria-disabled', 'true')
    })

    it('loading 상태가 올바르게 처리되어야 함', () => {
      render(<Button loading>Loading</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument() // 스피너
    })

    it('클릭 이벤트가 올바르게 처리되어야 함', async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()
      
      render(<Button onClick={handleClick}>Click Me</Button>)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('disabled 상태에서는 클릭이 무시되어야 함', async () => {
      const handleClick = jest.fn()
      const user = userEvent.setup()
      
      render(<Button onClick={handleClick} disabled>Disabled</Button>)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })
  })

  describe('아이콘 및 전체 너비', () => {
    it('fullWidth prop이 적용되어야 함', () => {
      render(<Button fullWidth>Full Width</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('w-full')
    })

    it('아이콘과 함께 렌더링되어야 함', () => {
      const icon = <span data-testid="icon">🔥</span>
      render(<Button icon={icon}>With Icon</Button>)
      
      expect(screen.getByTestId('icon')).toBeInTheDocument()
      expect(screen.getByText('With Icon')).toBeInTheDocument()
    })

    it('아이콘 위치가 올바르게 배치되어야 함', () => {
      const icon = <span data-testid="icon">🔥</span>
      render(<Button icon={icon} iconPosition="right">Icon Right</Button>)
      
      const button = screen.getByRole('button')
      const iconElement = screen.getByTestId('icon')
      const textElement = screen.getByText('Icon Right')
      
      // 아이콘이 텍스트 뒤에 위치해야 함
      expect(button.children[1]).toBe(iconElement)
      expect(button.children[0]).toBe(textElement)
    })
  })

  describe('키보드 네비게이션', () => {
    it('Enter 키로 활성화되어야 함', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Enter Test</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' })
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('Space 키로 활성화되어야 함', () => {
      const handleClick = jest.fn()
      render(<Button onClick={handleClick}>Space Test</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      fireEvent.keyDown(button, { key: ' ', code: 'Space' })
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('포커스 스타일이 적용되어야 함', () => {
      render(<Button>Focus Test</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      
      expect(button).toHaveClass('focus:ring-2', 'focus:ring-vridge-500')
    })
  })

  describe('커스텀 props', () => {
    it('사용자 정의 className이 병합되어야 함', () => {
      render(<Button className="custom-class">Custom</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
      expect(button).toHaveClass('bg-vridge-500') // 기본 클래스도 유지
    })

    it('데이터 속성이 올바르게 전달되어야 함', () => {
      render(<Button data-testid="custom-button">Custom Data</Button>)
      
      expect(screen.getByTestId('custom-button')).toBeInTheDocument()
    })

    it('aria-label이 올바르게 설정되어야 함', () => {
      render(<Button aria-label="사용자 정의 레이블">Button</Button>)
      
      const button = screen.getByRole('button', { name: '사용자 정의 레이블' })
      expect(button).toBeInTheDocument()
    })
  })

  describe('애니메이션과 transition', () => {
    it('호버 시 애니메이션이 적용되어야 함', () => {
      render(<Button>Hover Test</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('transition-colors', 'duration-200')
    })

    it('active 상태 스타일이 적용되어야 함', () => {
      render(<Button>Active Test</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('active:scale-95')
    })
  })
})