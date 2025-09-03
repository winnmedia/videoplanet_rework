import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

describe('Button Component', () => {
  // Basic rendering tests
  it('should render with default props', () => {
    render(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveClass('bg-primary', 'text-white')
  })

  it('should render with custom variant', () => {
    render(<Button variant="secondary">Secondary Button</Button>)
    
    const button = screen.getByRole('button', { name: /secondary button/i })
    expect(button).toHaveClass('bg-secondary', 'text-white')
  })

  it('should render with custom size', () => {
    render(<Button size="lg">Large Button</Button>)
    
    const button = screen.getByRole('button', { name: /large button/i })
    expect(button).toHaveClass('px-xl', 'py-lg', 'text-lg')
  })

  it('should render disabled state', () => {
    render(<Button disabled>Disabled Button</Button>)
    
    const button = screen.getByRole('button', { name: /disabled button/i })
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:opacity-50', 'disabled:cursor-not-allowed')
  })

  it('should render loading state', () => {
    render(<Button loading>Loading Button</Button>)
    
    const button = screen.getByRole('button', { name: /loading button/i })
    expect(button).toBeDisabled()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })

  // Interaction tests
  it('should handle click events', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    await userEvent.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should not call onClick when disabled', async () => {
    const handleClick = jest.fn()
    render(
      <Button onClick={handleClick} disabled>
        Disabled Button
      </Button>
    )
    
    const button = screen.getByRole('button', { name: /disabled button/i })
    await userEvent.click(button)
    
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('should not call onClick when loading', async () => {
    const handleClick = jest.fn()
    render(
      <Button onClick={handleClick} loading>
        Loading Button
      </Button>
    )
    
    const button = screen.getByRole('button', { name: /loading button/i })
    await userEvent.click(button)
    
    expect(handleClick).not.toHaveBeenCalled()
  })

  // Keyboard navigation tests
  it('should be focusable', () => {
    render(<Button>Focus me</Button>)
    
    const button = screen.getByRole('button', { name: /focus me/i })
    button.focus()
    
    expect(button).toHaveFocus()
  })

  it('should handle Enter key press', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Press Enter</Button>)
    
    const button = screen.getByRole('button', { name: /press enter/i })
    button.focus()
    await userEvent.keyboard('{Enter}')
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should handle Space key press', async () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Press Space</Button>)
    
    const button = screen.getByRole('button', { name: /press space/i })
    button.focus()
    await userEvent.keyboard(' ')
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  // Accessibility tests
  it('should have no accessibility violations', async () => {
    const { container } = render(<Button>Accessible Button</Button>)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper ARIA attributes when loading', async () => {
    render(<Button loading>Loading Button</Button>)
    
    const button = screen.getByRole('button', { name: /loading button/i })
    expect(button).toHaveAttribute('aria-disabled', 'true')
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('should support custom className', () => {
    render(<Button className="custom-class">Custom Button</Button>)
    
    const button = screen.getByRole('button', { name: /custom button/i })
    expect(button).toHaveClass('custom-class')
  })

  // Type variants test
  it('should render as different element types', () => {
    const { container } = render(<Button as="a" href="/test">Link Button</Button>)
    
    const link = container.querySelector('a')
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/test')
    expect(link).toHaveTextContent('Link Button')
  })
})