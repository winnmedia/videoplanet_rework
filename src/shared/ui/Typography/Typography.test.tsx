import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { Typography } from './Typography'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

describe('Typography Component', () => {
  // Basic rendering tests
  it('should render with default variant (body)', () => {
    render(<Typography>Default text</Typography>)
    
    const element = screen.getByText('Default text')
    expect(element).toBeInTheDocument()
    expect(element.tagName).toBe('P')
    expect(element).toHaveClass('text-base', 'leading-relaxed')
  })

  it('should render h1 variant', () => {
    render(<Typography variant="h1">Heading 1</Typography>)
    
    const heading = screen.getByRole('heading', { level: 1 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Heading 1')
    expect(heading).toHaveClass('text-4xl', 'font-bold', 'leading-tight')
  })

  it('should render h2 variant', () => {
    render(<Typography variant="h2">Heading 2</Typography>)
    
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Heading 2')
    expect(heading).toHaveClass('text-3xl', 'font-bold', 'leading-tight')
  })

  it('should render h3 variant', () => {
    render(<Typography variant="h3">Heading 3</Typography>)
    
    const heading = screen.getByRole('heading', { level: 3 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Heading 3')
    expect(heading).toHaveClass('text-2xl', 'font-semibold', 'leading-tight')
  })

  it('should render h4 variant', () => {
    render(<Typography variant="h4">Heading 4</Typography>)
    
    const heading = screen.getByRole('heading', { level: 4 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Heading 4')
    expect(heading).toHaveClass('text-xl', 'font-semibold', 'leading-snug')
  })

  it('should render h5 variant', () => {
    render(<Typography variant="h5">Heading 5</Typography>)
    
    const heading = screen.getByRole('heading', { level: 5 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Heading 5')
    expect(heading).toHaveClass('text-lg', 'font-medium', 'leading-snug')
  })

  it('should render h6 variant', () => {
    render(<Typography variant="h6">Heading 6</Typography>)
    
    const heading = screen.getByRole('heading', { level: 6 })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveTextContent('Heading 6')
    expect(heading).toHaveClass('text-base', 'font-medium', 'leading-normal')
  })

  it('should render body variant', () => {
    render(<Typography variant="body">Body text</Typography>)
    
    const element = screen.getByText('Body text')
    expect(element).toBeInTheDocument()
    expect(element.tagName).toBe('P')
    expect(element).toHaveClass('text-base', 'leading-relaxed')
  })

  it('should render body2 variant', () => {
    render(<Typography variant="body2">Body text 2</Typography>)
    
    const element = screen.getByText('Body text 2')
    expect(element).toBeInTheDocument()
    expect(element.tagName).toBe('P')
    expect(element).toHaveClass('text-sm', 'leading-relaxed')
  })

  it('should render caption variant', () => {
    render(<Typography variant="caption">Caption text</Typography>)
    
    const element = screen.getByText('Caption text')
    expect(element).toBeInTheDocument()
    expect(element.tagName).toBe('SPAN')
    expect(element).toHaveClass('text-xs', 'leading-normal', 'text-gray-600')
  })

  it('should render overline variant', () => {
    render(<Typography variant="overline">Overline text</Typography>)
    
    const element = screen.getByText('Overline text')
    expect(element).toBeInTheDocument()
    expect(element.tagName).toBe('SPAN')
    expect(element).toHaveClass('text-xs', 'font-medium', 'uppercase', 'tracking-wider', 'text-gray-500')
  })

  // Color tests
  it('should apply color variant', () => {
    render(<Typography color="primary">Primary text</Typography>)
    
    const element = screen.getByText('Primary text')
    expect(element).toHaveClass('text-primary')
  })

  it('should apply danger color', () => {
    render(<Typography color="danger">Danger text</Typography>)
    
    const element = screen.getByText('Danger text')
    expect(element).toHaveClass('text-danger')
  })

  // Weight tests
  it('should apply weight variant', () => {
    render(<Typography weight="bold">Bold text</Typography>)
    
    const element = screen.getByText('Bold text')
    expect(element).toHaveClass('font-bold')
  })

  // Alignment tests
  it('should apply text alignment', () => {
    render(<Typography align="center">Centered text</Typography>)
    
    const element = screen.getByText('Centered text')
    expect(element).toHaveClass('text-center')
  })

  // Custom element tests
  it('should render as custom element', () => {
    render(
      <Typography as="span" variant="body">
        Custom span
      </Typography>
    )
    
    const element = screen.getByText('Custom span')
    expect(element.tagName).toBe('SPAN')
    expect(element).toHaveClass('text-base', 'leading-relaxed')
  })

  // Truncation tests
  it('should apply truncation', () => {
    render(<Typography truncate>Very long text that should be truncated</Typography>)
    
    const element = screen.getByText('Very long text that should be truncated')
    expect(element).toHaveClass('truncate')
  })

  // Custom className tests
  it('should support custom className', () => {
    render(
      <Typography className="custom-class">Custom class text</Typography>
    )
    
    const element = screen.getByText('Custom class text')
    expect(element).toHaveClass('custom-class')
  })

  // Accessibility tests
  it('should have no accessibility violations', async () => {
    const { container } = render(
      <div>
        <Typography variant="h1">Main Heading</Typography>
        <Typography variant="h2">Sub Heading</Typography>
        <Typography variant="body">Body paragraph text</Typography>
        <Typography variant="caption">Caption text</Typography>
      </div>
    )
    
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  // Semantic HTML tests
  it('should use semantic HTML elements by default', () => {
    const { container } = render(
      <div>
        <Typography variant="h1">H1</Typography>
        <Typography variant="h2">H2</Typography>
        <Typography variant="h3">H3</Typography>
        <Typography variant="body">Body</Typography>
        <Typography variant="caption">Caption</Typography>
      </div>
    )

    expect(container.querySelector('h1')).toBeInTheDocument()
    expect(container.querySelector('h2')).toBeInTheDocument()
    expect(container.querySelector('h3')).toBeInTheDocument()
    expect(container.querySelector('p')).toBeInTheDocument()
    expect(container.querySelector('span')).toBeInTheDocument()
  })

  // Multiple props combination tests
  it('should handle multiple props correctly', () => {
    render(
      <Typography
        variant="h2"
        color="primary"
        weight="light"
        align="center"
        className="custom-spacing"
      >
        Complex typography
      </Typography>
    )
    
    const element = screen.getByRole('heading', { level: 2 })
    expect(element).toHaveClass(
      'text-3xl',
      'font-light',
      'leading-tight',
      'text-primary',
      'text-center',
      'custom-spacing'
    )
  })
})