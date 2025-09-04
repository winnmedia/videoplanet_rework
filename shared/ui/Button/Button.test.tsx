/**
 * Button Component Tests
 * Testing a shared UI component following TDD principles
 */

import { screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { render, setup } from '@/test/utils/test-utils'

import { Button } from './Button'

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with children text', () => {
      render(<Button>Click me</Button>)
      
      const button = screen.getByRole('button', { name: /click me/i })
      expect(button).toBeInTheDocument()
    })
    
    it('should render with default primary variant', () => {
      render(<Button>Primary Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('button', 'primary', 'md')
    })
    
    it('should render with secondary variant', () => {
      render(<Button variant="secondary">Secondary Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('button', 'secondary', 'md')
    })
    
    it('should render with danger variant', () => {
      render(<Button variant="danger">Delete</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('button', 'danger', 'md')
    })
  })
  
  describe('Sizes', () => {
    it('should render with medium size by default', () => {
      render(<Button>Medium Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('button', 'primary', 'md')
    })
    
    it('should render with small size', () => {
      render(<Button size="sm">Small Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('button', 'primary', 'sm')
    })
    
    it('should render with large size', () => {
      render(<Button size="lg">Large Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('button', 'primary', 'lg')
    })
  })
  
  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('button', 'primary', 'md')
    })
    
    it('should show loading state', () => {
      render(<Button loading>Save</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(button).toHaveClass('button', 'primary', 'md', 'loading')
      
      // Original text should be visible in span
      expect(screen.getByText('Save')).toBeInTheDocument()
    })
    
    it('should be disabled when loading', () => {
      render(<Button loading>Processing</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toBeDisabled()
      expect(button).toHaveClass('button', 'primary', 'md', 'loading')
    })
  })
  
  describe('Interactions', () => {
    it('should handle click events', async () => {
      const handleClick = vi.fn()
      const { user } = setup(<Button onClick={handleClick}>Click me</Button>)
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(handleClick).toHaveBeenCalledTimes(1)
    })
    
    it('should not trigger click when disabled', async () => {
      const handleClick = vi.fn()
      const { user } = setup(
        <Button disabled onClick={handleClick}>
          Disabled
        </Button>
      )
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })
    
    it('should not trigger click when loading', async () => {
      const handleClick = vi.fn()
      const { user } = setup(
        <Button loading onClick={handleClick}>
          Loading
        </Button>
      )
      
      const button = screen.getByRole('button')
      await user.click(button)
      
      expect(handleClick).not.toHaveBeenCalled()
    })
    
    it('should support keyboard navigation', async () => {
      const handleClick = vi.fn()
      const { user } = setup(<Button onClick={handleClick}>Press Enter</Button>)
      
      const button = screen.getByRole('button')
      button.focus()
      
      await user.keyboard('{Enter}')
      expect(handleClick).toHaveBeenCalledTimes(1)
      
      await user.keyboard(' ') // Space key
      expect(handleClick).toHaveBeenCalledTimes(2)
    })
  })
  
  describe('Styling', () => {
    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('custom-class')
    })
    
    it('should maintain base classes with custom className', () => {
      render(<Button className="ml-4">Styled</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('button', 'primary', 'md', 'ml-4')
    })
    
    it('should have focus styles', () => {
      render(<Button>Focus me</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('button', 'primary', 'md')
      // Focus styles are handled by CSS, not classes
    })
  })
  
  describe('Accessibility', () => {
    it('should have proper ARIA attributes when loading', () => {
      render(<Button loading>Saving...</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
    })
    
    it('should not have aria-busy when not loading', () => {
      render(<Button>Normal Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'false')
    })
    
    it('should support aria-label', () => {
      render(<Button aria-label="Close dialog">X</Button>)
      
      const button = screen.getByRole('button', { name: /close dialog/i })
      expect(button).toBeInTheDocument()
    })
    
    it('should have proper loading aria attributes', () => {
      render(<Button loading>Loading</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('aria-busy', 'true')
      expect(button).toHaveAttribute('aria-label', '처리 중')
      // Loading spinner is created via CSS ::after pseudo-element
    })
  })
  
  describe('Props Forwarding', () => {
    it('should forward HTML button attributes', () => {
      render(
        <Button
          type="submit"
          form="test-form"
          name="submit-button"
          value="submit"
        >
          Submit
        </Button>
      )
      
      const button = screen.getByRole('button')
      expect(button).toHaveAttribute('type', 'submit')
      expect(button).toHaveAttribute('form', 'test-form')
      expect(button).toHaveAttribute('name', 'submit-button')
      expect(button).toHaveAttribute('value', 'submit')
    })
    
    it('should forward data attributes', () => {
      render(<Button data-testid="custom-button">Test</Button>)
      
      const button = screen.getByTestId('custom-button')
      expect(button).toBeInTheDocument()
    })
  })
  
  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const { rerender } = render(<Button>Static Button</Button>)
      
      const button = screen.getByRole('button')
      const initialHTML = button.outerHTML
      
      // Re-render with same props
      rerender(<Button>Static Button</Button>)
      
      expect(button.outerHTML).toBe(initialHTML)
    })
  })
  
  describe('Additional Variants', () => {
    it('should render with outline variant', () => {
      render(<Button variant="outline">Outline Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('button', 'outline', 'md')
    })
    
    it('should render with ghost variant', () => {
      render(<Button variant="ghost">Ghost Button</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('button', 'ghost', 'md')
    })
    
    it('should render with fullWidth prop', () => {
      render(<Button fullWidth>Full Width</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('button', 'primary', 'md', 'fullWidth')
    })
    
    it('should render with icon support', () => {
      render(<Button icon={<span>icon</span>}>With Icon</Button>)
      
      const button = screen.getByRole('button')
      expect(button).toHaveClass('button', 'primary', 'md', 'icon')
      expect(screen.getByText('icon')).toBeInTheDocument()
      expect(screen.getByText('With Icon')).toBeInTheDocument()
    })
  })
})