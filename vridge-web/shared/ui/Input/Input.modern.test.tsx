/**
 * @fileoverview Input 컴포넌트 TDD 테스트 - 신규 Tailwind 기반
 * @description 초미니멀 디자인 시스템에 맞는 Input 컴포넌트 테스트
 */

import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'

import { Input } from './Input.modern'

// Jest-axe matcher 확장
expect.extend(toHaveNoViolations)

describe('Input - Modern Tailwind Design System', () => {
  // === FAIL TESTS (구현 전 실패 테스트) ===
  
  describe('기본 렌더링과 접근성', () => {
    it('기본 input이 올바르게 렌더링되어야 함', () => {
      render(<Input placeholder="텍스트 입력" />)
      
      const input = screen.getByPlaceholderText('텍스트 입력')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('type', 'text')
    })

    it('label이 올바르게 연결되어야 함', () => {
      render(
        <Input 
          id="test-input"
          label="이름"
          placeholder="이름을 입력하세요"
        />
      )
      
      const label = screen.getByText('이름')
      const input = screen.getByLabelText('이름')
      
      expect(label).toBeInTheDocument()
      expect(input).toBeInTheDocument()
      expect(label).toHaveAttribute('for', 'test-input')
      expect(input).toHaveAttribute('id', 'test-input')
    })

    it('접근성 위반이 없어야 함', async () => {
      const { container } = render(
        <Input label="접근성 테스트" placeholder="텍스트 입력" />
      )
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Size 변형', () => {
    it('sm size가 적용되어야 함', () => {
      render(<Input size="sm" placeholder="Small Input" />)
      
      const input = screen.getByPlaceholderText('Small Input')
      expect(input).toHaveClass('h-8', 'px-2', 'text-sm')
    })

    it('default size가 적용되어야 함', () => {
      render(<Input placeholder="Default Input" />)
      
      const input = screen.getByPlaceholderText('Default Input')
      expect(input).toHaveClass('h-input', 'px-3', 'text-base')
    })

    it('lg size가 적용되어야 함', () => {
      render(<Input size="lg" placeholder="Large Input" />)
      
      const input = screen.getByPlaceholderText('Large Input')
      expect(input).toHaveClass('h-12', 'px-4', 'text-lg')
    })
  })

  describe('상태 스타일링', () => {
    it('기본 상태 스타일이 적용되어야 함', () => {
      render(<Input placeholder="Default State" />)
      
      const input = screen.getByPlaceholderText('Default State')
      expect(input).toHaveClass(
        'border-gray-300',
        'bg-white',
        'text-gray-900'
      )
    })

    it('error 상태 스타일이 적용되어야 함', () => {
      render(
        <Input 
          placeholder="Error Input"
          error="오류가 발생했습니다"
        />
      )
      
      const input = screen.getByPlaceholderText('Error Input')
      expect(input).toHaveClass('border-error-500')
      expect(input).toHaveAttribute('aria-invalid', 'true')
    })

    it('disabled 상태 스타일이 적용되어야 함', () => {
      render(<Input placeholder="Disabled Input" disabled />)
      
      const input = screen.getByPlaceholderText('Disabled Input')
      expect(input).toBeDisabled()
      expect(input).toHaveClass('bg-gray-100', 'cursor-not-allowed')
      expect(input).toHaveAttribute('aria-disabled', 'true')
    })

    it('focused 상태 스타일이 적용되어야 함', () => {
      render(<Input placeholder="Focus Input" />)
      
      const input = screen.getByPlaceholderText('Focus Input')
      expect(input).toHaveClass(
        'focus:ring-2',
        'focus:ring-vridge-500',
        'focus:border-vridge-500'
      )
    })
  })

  describe('Helper Text와 Error Message', () => {
    it('helper text가 올바르게 표시되어야 함', () => {
      render(
        <Input 
          placeholder="Helper Input"
          helperText="도움말 텍스트입니다"
        />
      )
      
      const helperText = screen.getByText('도움말 텍스트입니다')
      expect(helperText).toBeInTheDocument()
      expect(helperText).toHaveClass('text-sm', 'text-gray-500')
    })

    it('error message가 올바르게 표시되어야 함', () => {
      render(
        <Input 
          placeholder="Error Input"
          error="오류 메시지입니다"
        />
      )
      
      const errorMessage = screen.getByText('오류 메시지입니다')
      expect(errorMessage).toBeInTheDocument()
      expect(errorMessage).toHaveClass('text-sm', 'text-error-500')
      
      const input = screen.getByPlaceholderText('Error Input')
      expect(input).toHaveAttribute('aria-describedby')
    })

    it('error가 있을 때 helper text가 숨겨져야 함', () => {
      render(
        <Input 
          placeholder="Error Input"
          helperText="도움말 텍스트"
          error="오류 메시지"
        />
      )
      
      expect(screen.getByText('오류 메시지')).toBeInTheDocument()
      expect(screen.queryByText('도움말 텍스트')).not.toBeInTheDocument()
    })
  })

  describe('Required와 Optional 표시', () => {
    it('required input에 별표가 표시되어야 함', () => {
      render(
        <Input 
          label="필수 입력"
          required
          placeholder="Required Input"
        />
      )
      
      const asterisk = screen.getByText('*')
      expect(asterisk).toBeInTheDocument()
      expect(asterisk).toHaveClass('text-error-500')
      
      const input = screen.getByPlaceholderText('Required Input')
      expect(input).toHaveAttribute('required')
      expect(input).toHaveAttribute('aria-required', 'true')
    })

    it('optional input에 (선택) 텍스트가 표시되어야 함', () => {
      render(
        <Input 
          label="선택 입력"
          optional
          placeholder="Optional Input"
        />
      )
      
      const optionalText = screen.getByText('(선택)')
      expect(optionalText).toBeInTheDocument()
      expect(optionalText).toHaveClass('text-gray-500')
    })
  })

  describe('아이콘 지원', () => {
    it('startIcon이 올바르게 렌더링되어야 함', () => {
      const startIcon = <span data-testid="start-icon">🔍</span>
      render(
        <Input 
          startIcon={startIcon}
          placeholder="Search..."
        />
      )
      
      expect(screen.getByTestId('start-icon')).toBeInTheDocument()
      
      const input = screen.getByPlaceholderText('Search...')
      expect(input).toHaveClass('pl-10') // 아이콘 공간을 위한 좌측 패딩
    })

    it('endIcon이 올바르게 렌더링되어야 함', () => {
      const endIcon = <span data-testid="end-icon">✓</span>
      render(
        <Input 
          endIcon={endIcon}
          placeholder="Validation..."
        />
      )
      
      expect(screen.getByTestId('end-icon')).toBeInTheDocument()
      
      const input = screen.getByPlaceholderText('Validation...')
      expect(input).toHaveClass('pr-10') // 아이콘 공간을 위한 우측 패딩
    })

    it('양쪽 아이콘이 모두 있을 때 올바른 패딩이 적용되어야 함', () => {
      const startIcon = <span data-testid="start-icon">🔍</span>
      const endIcon = <span data-testid="end-icon">✓</span>
      
      render(
        <Input 
          startIcon={startIcon}
          endIcon={endIcon}
          placeholder="Both Icons..."
        />
      )
      
      expect(screen.getByTestId('start-icon')).toBeInTheDocument()
      expect(screen.getByTestId('end-icon')).toBeInTheDocument()
      
      const input = screen.getByPlaceholderText('Both Icons...')
      expect(input).toHaveClass('pl-10', 'pr-10')
    })
  })

  describe('입력 타입 지원', () => {
    it('password 타입이 올바르게 설정되어야 함', () => {
      render(<Input type="password" placeholder="비밀번호" />)
      
      const input = screen.getByPlaceholderText('비밀번호')
      expect(input).toHaveAttribute('type', 'password')
    })

    it('email 타입이 올바르게 설정되어야 함', () => {
      render(<Input type="email" placeholder="이메일" />)
      
      const input = screen.getByPlaceholderText('이메일')
      expect(input).toHaveAttribute('type', 'email')
    })

    it('number 타입이 올바르게 설정되어야 함', () => {
      render(<Input type="number" placeholder="숫자" />)
      
      const input = screen.getByPlaceholderText('숫자')
      expect(input).toHaveAttribute('type', 'number')
    })
  })

  describe('사용자 인터렉션', () => {
    it('입력 값이 올바르게 변경되어야 함', async () => {
      const handleChange = jest.fn()
      const user = userEvent.setup()
      
      render(
        <Input 
          placeholder="Type here"
          onChange={handleChange}
        />
      )
      
      const input = screen.getByPlaceholderText('Type here')
      await user.type(input, 'Hello')
      
      expect(handleChange).toHaveBeenCalledTimes(5) // 'H', 'e', 'l', 'l', 'o'
      expect(input).toHaveValue('Hello')
    })

    it('Enter 키 이벤트가 올바르게 처리되어야 함', () => {
      const handleKeyDown = jest.fn()
      render(
        <Input 
          placeholder="Press Enter"
          onKeyDown={handleKeyDown}
        />
      )
      
      const input = screen.getByPlaceholderText('Press Enter')
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' })
      
      expect(handleKeyDown).toHaveBeenCalledTimes(1)
    })

    it('focus와 blur 이벤트가 올바르게 처리되어야 함', () => {
      const handleFocus = jest.fn()
      const handleBlur = jest.fn()
      
      render(
        <Input 
          placeholder="Focus Blur Test"
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      )
      
      const input = screen.getByPlaceholderText('Focus Blur Test')
      
      input.focus()
      expect(handleFocus).toHaveBeenCalledTimes(1)
      
      input.blur()
      expect(handleBlur).toHaveBeenCalledTimes(1)
    })
  })

  describe('fullWidth와 커스텀 props', () => {
    it('fullWidth prop이 적용되어야 함', () => {
      render(
        <div data-testid="container">
          <Input fullWidth placeholder="Full Width Input" />
        </div>
      )
      
      const input = screen.getByPlaceholderText('Full Width Input')
      expect(input.parentElement).toHaveClass('w-full')
    })

    it('사용자 정의 className이 병합되어야 함', () => {
      render(
        <Input 
          className="custom-input"
          placeholder="Custom Class"
        />
      )
      
      const input = screen.getByPlaceholderText('Custom Class')
      expect(input).toHaveClass('custom-input')
      expect(input).toHaveClass('border-gray-300') // 기본 클래스도 유지
    })

    it('데이터 속성이 올바르게 전달되어야 함', () => {
      render(
        <Input 
          placeholder="Data Attributes"
          data-testid="custom-input"
          data-custom="test-value"
        />
      )
      
      const input = screen.getByTestId('custom-input')
      expect(input).toHaveAttribute('data-custom', 'test-value')
    })
  })
})