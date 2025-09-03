import { render, screen } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { Header } from './Header'

// Extend Jest matchers for accessibility testing
expect.extend(toHaveNoViolations)

describe('Header Component', () => {
  // Basic rendering tests
  it('should render with brand logo', () => {
    render(<Header />)
    
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
    
    const brand = screen.getByRole('link', { name: /videoplanet/i })
    expect(brand).toBeInTheDocument()
    expect(brand).toHaveAttribute('href', '/')
  })

  it('should render navigation menu', () => {
    render(<Header />)
    
    const nav = screen.getByRole('navigation')
    expect(nav).toBeInTheDocument()
    
    // Check main navigation items
    expect(screen.getByRole('link', { name: /dashboard/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /projects/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /feedback/i })).toBeInTheDocument()
  })

  it('should render user menu when authenticated', () => {
    render(<Header isAuthenticated />)
    
    const userMenu = screen.getByRole('button', { name: /user menu/i })
    expect(userMenu).toBeInTheDocument()
  })

  it('should render login button when not authenticated', () => {
    render(<Header isAuthenticated={false} />)
    
    const loginButton = screen.getByRole('link', { name: /log in/i })
    expect(loginButton).toBeInTheDocument()
    
    const signupButton = screen.getByRole('link', { name: /sign up/i })
    expect(signupButton).toBeInTheDocument()
  })

  it('should render mobile menu toggle', () => {
    render(<Header />)
    
    const mobileToggle = screen.getByRole('button', { name: /toggle menu/i })
    expect(mobileToggle).toBeInTheDocument()
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'false')
  })

  // Mobile menu interaction tests
  it('should toggle mobile menu when clicked', async () => {
    render(<Header />)
    
    const mobileToggle = screen.getByRole('button', { name: /toggle menu/i })
    
    // Initial state
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'false')
    
    // Click to open
    await userEvent.click(mobileToggle)
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'true')
    
    // Click to close
    await userEvent.click(mobileToggle)
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('should close mobile menu when navigation item is clicked', async () => {
    render(<Header />)
    
    const mobileToggle = screen.getByRole('button', { name: /toggle menu/i })
    
    // Open mobile menu
    await userEvent.click(mobileToggle)
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'true')
    
    // Click mobile navigation item (there are two Dashboard links - desktop and mobile)
    const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i })
    // Click the mobile one (should be the second one)
    await userEvent.click(dashboardLinks[1])
    
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'false')
  })

  // User menu interaction tests
  it('should toggle user menu when clicked', async () => {
    render(<Header isAuthenticated />)
    
    const userMenu = screen.getByRole('button', { name: /user menu/i })
    
    // Click to open
    await userEvent.click(userMenu)
    
    // Check dropdown items appear
    expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /settings/i })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: /log out/i })).toBeInTheDocument()
  })

  it('should close user menu when clicking outside', async () => {
    render(
      <div>
        <Header isAuthenticated />
        <div data-testid="outside-element">Outside</div>
      </div>
    )
    
    const userMenu = screen.getByRole('button', { name: /user menu/i })
    
    // Open user menu
    await userEvent.click(userMenu)
    expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument()
    
    // Click outside
    const outsideElement = screen.getByTestId('outside-element')
    await userEvent.click(outsideElement)
    
    expect(screen.queryByRole('menuitem', { name: /profile/i })).not.toBeInTheDocument()
  })

  // Keyboard navigation tests
  it('should support keyboard navigation', async () => {
    render(<Header isAuthenticated />)
    
    const brandLink = screen.getByRole('link', { name: /videoplanet/i })
    const dashboardLinks = screen.getAllByRole('link', { name: /dashboard/i })
    const userMenu = screen.getByRole('button', { name: /user menu/i })
    
    // Tab navigation
    brandLink.focus()
    expect(brandLink).toHaveFocus()
    
    await userEvent.tab()
    expect(dashboardLinks[0]).toHaveFocus()
    
    // Navigate to user menu
    userMenu.focus()
    expect(userMenu).toHaveFocus()
    
    // Open user menu with Enter
    await userEvent.keyboard('{Enter}')
    expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument()
    
    // Profile item should be first and focused after opening
    const profileItem = screen.getByRole('menuitem', { name: /profile/i })
    expect(profileItem).toBeInTheDocument()
  })

  it('should close user menu with Escape key', async () => {
    render(<Header isAuthenticated />)
    
    const userMenu = screen.getByRole('button', { name: /user menu/i })
    
    // Open user menu
    await userEvent.click(userMenu)
    expect(screen.getByRole('menuitem', { name: /profile/i })).toBeInTheDocument()
    
    // Close with Escape
    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('menuitem', { name: /profile/i })).not.toBeInTheDocument()
  })

  // Accessibility tests
  it('should have no accessibility violations', async () => {
    const { container } = render(<Header isAuthenticated />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('should have proper ARIA attributes', () => {
    render(<Header isAuthenticated />)
    
    const header = screen.getByRole('banner')
    expect(header).toBeInTheDocument()
    
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveAttribute('aria-label', 'Main navigation')
    
    const mobileToggle = screen.getByRole('button', { name: /toggle menu/i })
    expect(mobileToggle).toHaveAttribute('aria-expanded', 'false')
    expect(mobileToggle).toHaveAttribute('aria-controls')
    
    const userMenu = screen.getByRole('button', { name: /user menu/i })
    expect(userMenu).toHaveAttribute('aria-haspopup', 'true')
    expect(userMenu).toHaveAttribute('aria-expanded', 'false')
  })

  // Responsive behavior tests
  it('should hide desktop navigation items on mobile', () => {
    // Mock window.matchMedia for mobile viewport
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })
    
    render(<Header />)
    
    // Navigation should exist but be hidden on mobile
    const nav = screen.getByRole('navigation')
    expect(nav).toHaveClass('hidden', 'md:flex')
  })

  // Brand and styling tests
  it('should render with correct branding styles', () => {
    render(<Header />)
    
    const header = screen.getByRole('banner')
    expect(header).toHaveClass('bg-white', 'border-b', 'border-gray-200')
    
    const brand = screen.getByRole('link', { name: /videoplanet/i })
    expect(brand).toHaveClass('text-primary', 'font-bold')
  })

  it('should apply sticky positioning', () => {
    render(<Header />)
    
    const header = screen.getByRole('banner')
    expect(header).toHaveClass('sticky', 'top-0', 'z-50')
  })

  // Custom props tests
  it('should support custom className', () => {
    render(<Header className="custom-header-class" />)
    
    const header = screen.getByRole('banner')
    expect(header).toHaveClass('custom-header-class')
  })

  it('should handle notification badge when provided', () => {
    render(<Header isAuthenticated notificationCount={5} />)
    
    const notificationBadge = screen.getByText('5')
    expect(notificationBadge).toBeInTheDocument()
    expect(notificationBadge).toHaveClass('bg-danger', 'text-white')
  })
})