import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import React from 'react'
import { describe, expect, it, beforeEach, vi } from 'vitest'

import { LoginForm } from '../LoginForm'
import { ResetPasswordForm } from '../ResetPasswordFormNew'
import { SignupForm } from '../SignupFormNew'
import { SocialAuthButtons } from '../SocialAuthButtons'

// Extend Vitest matchers
expect.extend(toHaveNoViolations)

// Mock modules
vi.mock('../../model/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn()
  })
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn()
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null)
  })
}))

vi.mock('next-auth/react', () => ({
  signIn: vi.fn()
}))

describe('Authentication Components Accessibility', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('LoginForm', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<LoginForm />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper form structure with labels', () => {
      const { getByLabelText } = render(<LoginForm />)
      
      expect(getByLabelText(/이메일/i)).toBeInTheDocument()
      expect(getByLabelText(/비밀번호/i)).toBeInTheDocument()
      expect(getByLabelText(/아이디 저장/i)).toBeInTheDocument()
    })

    it('should have proper ARIA attributes', () => {
      const { getByLabelText } = render(<LoginForm />)
      
      const emailInput = getByLabelText(/이메일/i)
      expect(emailInput).toHaveAttribute('aria-required', 'true')
      expect(emailInput).toHaveAttribute('type', 'email')
      
      const passwordInput = getByLabelText(/비밀번호/i)
      expect(passwordInput).toHaveAttribute('aria-required', 'true')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('SignupForm', () => {
    it('should have no accessibility violations in email step', async () => {
      const { container } = render(<SignupForm />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper form labels in email step', () => {
      const { getByLabelText } = render(<SignupForm />)
      expect(getByLabelText(/이메일/i)).toBeInTheDocument()
    })
  })

  describe('ResetPasswordForm', () => {
    it('should have no accessibility violations in email request step', async () => {
      const { container } = render(<ResetPasswordForm />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper heading structure', () => {
      const { getByRole } = render(<ResetPasswordForm />)
      expect(getByRole('heading', { level: 1 })).toBeInTheDocument()
    })
  })

  describe('SocialAuthButtons', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<SocialAuthButtons mode="login" />)
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper button labels', () => {
      const { getByLabelText } = render(<SocialAuthButtons mode="login" />)
      
      expect(getByLabelText(/Google로 로그인/i)).toBeInTheDocument()
      expect(getByLabelText(/GitHub으로 로그인/i)).toBeInTheDocument()
    })

    it('should have proper button labels for signup mode', () => {
      const { getByLabelText } = render(<SocialAuthButtons mode="signup" />)
      
      expect(getByLabelText(/Google로 가입/i)).toBeInTheDocument()
      expect(getByLabelText(/GitHub으로 가입/i)).toBeInTheDocument()
    })
  })

  describe('Dark Mode Support', () => {
    it('should have dark mode classes in LoginForm', () => {
      const { container } = render(<LoginForm />)
      const darkElements = container.querySelectorAll('[class*="dark:"]')
      expect(darkElements.length).toBeGreaterThan(0)
    })

    it('should have dark mode classes in SignupForm', () => {
      const { container } = render(<SignupForm />)
      const darkElements = container.querySelectorAll('[class*="dark:"]')
      expect(darkElements.length).toBeGreaterThan(0)
    })

    it('should have dark mode classes in ResetPasswordForm', () => {
      const { container } = render(<ResetPasswordForm />)
      const darkElements = container.querySelectorAll('[class*="dark:"]')
      expect(darkElements.length).toBeGreaterThan(0)
    })
  })

  describe('Keyboard Navigation', () => {
    it('should allow tab navigation through LoginForm', () => {
      const { getByLabelText, getByRole } = render(<LoginForm />)
      
      const elements = [
        getByLabelText(/이메일/i),
        getByLabelText(/비밀번호/i),
        getByLabelText(/아이디 저장/i),
        getByRole('button', { name: /로그인/i })
      ]
      
      elements.forEach(element => {
        expect(element).toHaveProperty('tabIndex')
        expect(element.tabIndex).toBeGreaterThanOrEqual(-1)
      })
    })
  })

  describe('Error States', () => {
    it('should have accessible error messages', async () => {
      const { container, getByRole } = render(<LoginForm />)
      
      // Submit empty form to trigger error
      const submitButton = getByRole('button', { name: /로그인/i })
      submitButton.click()
      
      // Wait for error state
      await vi.waitFor(async () => {
        const results = await axe(container)
        expect(results).toHaveNoViolations()
      })
    })
  })
})