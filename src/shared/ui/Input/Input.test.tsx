import React from 'react'
import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { Input } from './Input'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

describe('Input Component', () => {
  // Basic rendering tests
  it('should render input with label', () => {
    render(<Input label="테스트 입력" />)
    
    expect(screen.getByLabelText(/테스트 입력/i)).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })

  it('should render with placeholder', () => {
    render(<Input label="이름" placeholder="이름을 입력하세요" />)
    
    const input = screen.getByLabelText(/이름/i)
    expect(input).toHaveAttribute('placeholder', '이름을 입력하세요')
  })

  it('should render with default value', () => {
    render(<Input label="이름" defaultValue="홍길동" />)
    
    const input = screen.getByLabelText(/이름/i)
    expect(input).toHaveValue('홍길동')
  })

  // Input types test
  it('should render different input types', () => {
    const { rerender } = render(<Input label="이메일" type="email" />)
    expect(screen.getByLabelText(/이메일/i)).toHaveAttribute('type', 'email')

    rerender(<Input label="비밀번호" type="password" />)
    expect(screen.getByLabelText(/비밀번호/i)).toHaveAttribute('type', 'password')

    rerender(<Input label="나이" type="number" />)
    expect(screen.getByLabelText(/나이/i)).toHaveAttribute('type', 'number')
  })

  // Required field test
  it('should render required field with proper attributes', () => {
    render(<Input label="필수 필드" required />)
    
    const input = screen.getByLabelText(/필수 필드/i)
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).toBeRequired()
  })

  // Error state test
  it('should display error message', () => {
    render(<Input label="이메일" error="올바른 이메일을 입력하세요" />)
    
    const input = screen.getByLabelText(/이메일/i)
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText(/올바른 이메일을 입력하세요/i)).toBeInTheDocument()
    expect(screen.getByRole('alert')).toBeInTheDocument()
  })

  // Helper text test
  it('should display helper text', () => {
    render(
      <Input 
        label="비밀번호" 
        helperText="8자 이상 입력하세요" 
      />
    )
    
    const input = screen.getByLabelText(/비밀번호/i)
    expect(screen.getByText(/8자 이상 입력하세요/i)).toBeInTheDocument()
    expect(input).toHaveAttribute('aria-describedby')
  })

  // Disabled state test
  it('should render disabled state', () => {
    render(<Input label="비활성 필드" disabled />)
    
    const input = screen.getByLabelText(/비활성 필드/i)
    expect(input).toBeDisabled()
  })

  // Size variants test
  it('should render different sizes', () => {
    const { rerender } = render(<Input label="작은 입력" size="sm" />)
    expect(screen.getByLabelText(/작은 입력/i)).toHaveClass('h-9')

    rerender(<Input label="중간 입력" size="md" />)
    expect(screen.getByLabelText(/중간 입력/i)).toHaveClass('h-10')

    rerender(<Input label="큰 입력" size="lg" />)
    expect(screen.getByLabelText(/큰 입력/i)).toHaveClass('h-11')
  })

  // User interaction tests
  it('should handle onChange event', async () => {
    const handleChange = jest.fn()
    render(<Input label="테스트" onChange={handleChange} />)
    
    const input = screen.getByLabelText(/테스트/i)
    await userEvent.type(input, 'hello')
    
    expect(handleChange).toHaveBeenCalled()
    expect(input).toHaveValue('hello')
  })

  it('should handle onBlur event', async () => {
    const handleBlur = jest.fn()
    render(<Input label="테스트" onBlur={handleBlur} />)
    
    const input = screen.getByLabelText(/테스트/i)
    await userEvent.click(input)
    await userEvent.tab()
    
    expect(handleBlur).toHaveBeenCalled()
  })

  it('should handle onFocus event', async () => {
    const handleFocus = jest.fn()
    render(<Input label="테스트" onFocus={handleFocus} />)
    
    const input = screen.getByLabelText(/테스트/i)
    await userEvent.click(input)
    
    expect(handleFocus).toHaveBeenCalled()
  })

  // Focus management tests
  it('should be focusable', async () => {
    render(<Input label="포커스 테스트" />)
    
    const input = screen.getByLabelText(/포커스 테스트/i)
    input.focus()
    
    expect(input).toHaveFocus()
  })

  it('should support keyboard navigation', async () => {
    render(
      <div>
        <Input label="첫 번째 입력" />
        <Input label="두 번째 입력" />
      </div>
    )
    
    const firstInput = screen.getByLabelText(/첫 번째 입력/i)
    const secondInput = screen.getByLabelText(/두 번째 입력/i)
    
    firstInput.focus()
    expect(firstInput).toHaveFocus()
    
    await userEvent.keyboard('{Tab}')
    expect(secondInput).toHaveFocus()
  })

  // Accessibility tests
  it('should have no accessibility violations', async () => {
    const { container } = render(<Input label="접근성 테스트" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper ARIA attributes', () => {
    render(
      <Input 
        label="테스트 입력" 
        helperText="도움말 텍스트"
        error="에러 메시지"
        required
      />
    )
    
    const input = screen.getByLabelText(/테스트 입력/i)
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby')
  })

  // Custom className test
  it('should support custom className', () => {
    render(<Input label="커스텀 클래스" className="custom-class" />)
    
    const input = screen.getByLabelText(/커스텀 클래스/i)
    expect(input).toHaveClass('custom-class')
  })

  // Forward ref test
  it('should forward ref to input element', () => {
    const ref = React.createRef<HTMLInputElement>()
    render(<Input ref={ref} label="Ref 테스트" />)
    
    expect(ref.current).toBeInstanceOf(HTMLInputElement)
    expect(ref.current?.getAttribute('aria-label')).toContain('Ref 테스트')
  })

  // Textarea variant test
  it('should render textarea when multiline is true', () => {
    render(<Input label="여러 줄 입력" multiline />)
    
    expect(screen.getByRole('textbox')).toBeInstanceOf(HTMLTextAreaElement)
    expect(screen.getByLabelText(/여러 줄 입력/i)).toBeInTheDocument()
  })

  it('should render textarea with custom rows', () => {
    render(<Input label="큰 텍스트 영역" multiline rows={5} />)
    
    const textarea = screen.getByLabelText(/큰 텍스트 영역/i)
    expect(textarea).toHaveAttribute('rows', '5')
  })

  // Error state clearing test
  it('should clear error state when value changes', async () => {
    const { rerender } = render(
      <Input label="테스트" error="에러 메시지" />
    )
    
    expect(screen.getByText(/에러 메시지/i)).toBeInTheDocument()
    
    rerender(<Input label="테스트" error="" />)
    expect(screen.queryByText(/에러 메시지/i)).not.toBeInTheDocument()
  })

  // Multiple inputs accessibility
  it('should handle multiple inputs with proper labels', () => {
    render(
      <form>
        <Input label="이름" required />
        <Input label="이메일" type="email" required />
        <Input label="메시지" multiline helperText="선택사항" />
      </form>
    )
    
    expect(screen.getByLabelText(/이름/i)).toBeRequired()
    expect(screen.getByLabelText(/이메일/i)).toHaveAttribute('type', 'email')
    expect(screen.getByLabelText(/메시지/i)).toBeInstanceOf(HTMLTextAreaElement)
    expect(screen.getByText(/선택사항/i)).toBeInTheDocument()
  })
})