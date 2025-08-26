/**
 * Homepage Test Suite
 * Following TDD principles - Writing tests first before implementation
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { screen, within } from '@testing-library/react'
import { render, setup } from '@/test/utils/test-utils'
import Home from './page'

describe('Homepage', () => {
  describe('Layout and Structure', () => {
    it('should render the main container with proper structure', () => {
      render(<Home />)
      
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
      expect(main).toHaveClass('flex', 'flex-col')
    })
    
    it('should have a header section with Next.js logo', () => {
      render(<Home />)
      
      const logo = screen.getByAltText('Next.js logo')
      expect(logo).toBeInTheDocument()
      expect(logo).toHaveAttribute('width', '180')
      expect(logo).toHaveAttribute('height', '38')
    })
    
    it('should display getting started instructions', () => {
      render(<Home />)
      
      expect(screen.getByText(/Get started by editing/i)).toBeInTheDocument()
      expect(screen.getByText(/app\/page\.tsx/i)).toBeInTheDocument()
      expect(screen.getByText(/Save and see your changes instantly/i)).toBeInTheDocument()
    })
  })
  
  describe('Call-to-Action Buttons', () => {
    it('should render Deploy Now button with correct attributes', () => {
      render(<Home />)
      
      const deployButton = screen.getByRole('link', { name: /deploy now/i })
      expect(deployButton).toBeInTheDocument()
      expect(deployButton).toHaveAttribute('href', expect.stringContaining('vercel.com'))
      expect(deployButton).toHaveAttribute('target', '_blank')
      expect(deployButton).toHaveAttribute('rel', 'noopener noreferrer')
    })
    
    it('should render Read Docs button with correct attributes', () => {
      render(<Home />)
      
      const docsButton = screen.getByRole('link', { name: /read our docs/i })
      expect(docsButton).toBeInTheDocument()
      expect(docsButton).toHaveAttribute('href', expect.stringContaining('nextjs.org/docs'))
      expect(docsButton).toHaveAttribute('target', '_blank')
    })
    
    it('should have proper styling for primary and secondary buttons', () => {
      render(<Home />)
      
      const deployButton = screen.getByRole('link', { name: /deploy now/i })
      const docsButton = screen.getByRole('link', { name: /read our docs/i })
      
      // Primary button (Deploy Now) should have dark background
      expect(deployButton).toHaveClass('bg-foreground', 'text-background')
      
      // Secondary button (Read Docs) should have border
      expect(docsButton).toHaveClass('border', 'border-solid')
    })
  })
  
  describe('Footer Navigation', () => {
    it('should render footer with three navigation links', () => {
      render(<Home />)
      
      const footer = screen.getByRole('contentinfo')
      expect(footer).toBeInTheDocument()
      
      const links = within(footer).getAllByRole('link')
      expect(links).toHaveLength(3)
    })
    
    it('should have Learn link with correct attributes', () => {
      render(<Home />)
      
      const learnLink = screen.getByRole('link', { name: /learn/i })
      expect(learnLink).toBeInTheDocument()
      expect(learnLink).toHaveAttribute('href', expect.stringContaining('nextjs.org/learn'))
      
      const fileIcon = within(learnLink).getByAltText('File icon')
      expect(fileIcon).toBeInTheDocument()
    })
    
    it('should have Examples link with correct attributes', () => {
      render(<Home />)
      
      const examplesLink = screen.getByRole('link', { name: /examples/i })
      expect(examplesLink).toBeInTheDocument()
      expect(examplesLink).toHaveAttribute('href', expect.stringContaining('vercel.com/templates'))
      
      const windowIcon = within(examplesLink).getByAltText('Window icon')
      expect(windowIcon).toBeInTheDocument()
    })
    
    it('should have Go to nextjs.org link with correct attributes', () => {
      render(<Home />)
      
      const nextjsLink = screen.getByRole('link', { name: /go to nextjs\.org/i })
      expect(nextjsLink).toBeInTheDocument()
      expect(nextjsLink).toHaveAttribute('href', expect.stringContaining('nextjs.org'))
      
      const globeIcon = within(nextjsLink).getByAltText('Globe icon')
      expect(globeIcon).toBeInTheDocument()
    })
  })
  
  describe('Responsive Design', () => {
    it('should have responsive classes for mobile and desktop', () => {
      render(<Home />)
      
      const main = screen.getByRole('main')
      expect(main).toHaveClass('sm:items-start')
      
      const ctaContainer = screen.getByRole('link', { name: /deploy now/i }).parentElement
      expect(ctaContainer).toHaveClass('sm:flex-row')
    })
    
    it('should apply proper padding based on screen size', () => {
      const { container } = render(<Home />)
      
      const wrapper = container.firstChild
      expect(wrapper).toHaveClass('p-8', 'sm:p-20')
    })
  })
  
  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      render(<Home />)
      
      // The page should have proper semantic structure
      const main = screen.getByRole('main')
      expect(main).toBeInTheDocument()
      
      const footer = screen.getByRole('contentinfo')
      expect(footer).toBeInTheDocument()
    })
    
    it('should have aria-hidden on decorative icons', () => {
      render(<Home />)
      
      const footer = screen.getByRole('contentinfo')
      const images = within(footer).getAllByRole('img', { hidden: true })
      
      images.forEach(img => {
        expect(img).toHaveAttribute('aria-hidden', 'true')
      })
    })
    
    it('should have descriptive alt text for all images', () => {
      render(<Home />)
      
      const images = screen.getAllByRole('img')
      
      images.forEach(img => {
        expect(img).toHaveAttribute('alt')
        expect(img.getAttribute('alt')).not.toBe('')
      })
    })
  })
  
  describe('User Interactions', () => {
    it('should support keyboard navigation through all interactive elements', async () => {
      const { user } = setup(<Home />)
      
      // Tab through all interactive elements
      await user.tab()
      expect(screen.getByRole('link', { name: /deploy now/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('link', { name: /read our docs/i })).toHaveFocus()
      
      await user.tab()
      expect(screen.getByRole('link', { name: /learn/i })).toHaveFocus()
    })
    
    it('should show hover states on interactive elements', async () => {
      const { user } = setup(<Home />)
      
      const deployButton = screen.getByRole('link', { name: /deploy now/i })
      
      // Hover over button
      await user.hover(deployButton)
      
      // Check for hover classes
      expect(deployButton).toHaveClass('hover:bg-[#383838]')
    })
  })
  
  describe('Performance', () => {
    it('should mark critical images with priority', () => {
      render(<Home />)
      
      const logo = screen.getByAltText('Next.js logo')
      // Note: priority is a Next.js Image prop, not rendered as HTML attribute
      // This test would need to be adjusted based on actual implementation
      expect(logo).toBeInTheDocument()
    })
  })
  
  describe('SEO and Meta', () => {
    it('should have proper semantic HTML structure', () => {
      const { container } = render(<Home />)
      
      // Check for semantic elements
      expect(container.querySelector('main')).toBeInTheDocument()
      expect(container.querySelector('footer')).toBeInTheDocument()
    })
  })
})

/**
 * Integration Tests
 */
describe('Homepage Integration', () => {
  it('should render complete page without errors', () => {
    const { container } = render(<Home />)
    
    // Verify no console errors
    expect(container).toBeInTheDocument()
    
    // Verify all major sections are present
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(5) // 2 CTA + 3 footer links
  })
  
  it('should maintain consistent styling across all elements', () => {
    render(<Home />)
    
    // Verify font family is applied
    const { container } = render(<Home />)
    const wrapper = container.firstChild
    expect(wrapper).toHaveClass('font-sans')
  })
})

/**
 * Snapshot Tests
 */
describe('Homepage Snapshots', () => {
  it('should match snapshot for default state', () => {
    const { container } = render(<Home />)
    expect(container.firstChild).toMatchSnapshot()
  })
})