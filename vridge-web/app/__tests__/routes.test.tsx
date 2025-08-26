import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    pathname: '/',
  }),
  usePathname: () => '/',
}))

describe('Page Routes', () => {
  describe('Login Page', () => {
    it('should render login page at /login', async () => {
      const LoginPage = (await import('../login/page')).default
      render(<LoginPage />)
      expect(screen.getByRole('heading', { name: /login/i })).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    })
  })

  describe('Dashboard Page', () => {
    it('should render dashboard page at /dashboard', async () => {
      const DashboardPage = (await import('../dashboard/page')).default
      render(<DashboardPage />)
      expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument()
      expect(screen.getByText(/프로젝트 현황/i)).toBeInTheDocument()
    })
  })

  describe('Projects Page', () => {
    it('should render projects page at /projects', async () => {
      const ProjectsPage = (await import('../projects/page')).default
      render(<ProjectsPage />)
      expect(screen.getByRole('heading', { name: /프로젝트/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /새 프로젝트/i })).toBeInTheDocument()
    })
  })

  describe('Feedback Page', () => {
    it('should render feedback page at /feedback', async () => {
      const FeedbackPage = (await import('../feedback/page')).default
      render(<FeedbackPage />)
      expect(screen.getByRole('heading', { name: /피드백/i })).toBeInTheDocument()
      expect(screen.getByText(/피드백 목록/i)).toBeInTheDocument()
    })
  })
})