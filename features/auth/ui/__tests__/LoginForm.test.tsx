import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { useAuth } from '../../model/useAuth'
import { LoginForm } from '../LoginForm'

// Mock modules
vi.mock('../../model/useAuth')
vi.mock('next/navigation')

describe('LoginForm', () => {
  const mockLogin = vi.fn()
  const mockPush = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    ;(useAuth as any).mockReturnValue({
      login: mockLogin
    })
    ;(useRouter as any).mockReturnValue({
      push: mockPush
    })
    
    // Clear localStorage
    localStorage.clear()
  })

  it('should render all form elements', () => {
    render(<LoginForm />)
    
    expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/비밀번호/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /로그인/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/아이디 저장/i)).toBeInTheDocument()
  })

  it('should handle form submission with valid credentials', async () => {
    mockLogin.mockResolvedValue(undefined)
    
    render(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/이메일/i)
    const passwordInput = screen.getByLabelText(/비밀번호/i)
    const submitButton = screen.getByRole('button', { name: /로그인/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123')
      expect(mockPush).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('should display error message on login failure', async () => {
    mockLogin.mockRejectedValue(new Error('Login failed'))
    
    render(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/이메일/i)
    const passwordInput = screen.getByLabelText(/비밀번호/i)
    const submitButton = screen.getByRole('button', { name: /로그인/i })
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/로그인에 실패했습니다/i)
    })
  })

  it('should save email to localStorage when remember is checked', async () => {
    mockLogin.mockResolvedValue(undefined)
    
    render(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/이메일/i)
    const rememberCheckbox = screen.getByLabelText(/아이디 저장/i)
    
    fireEvent.change(emailInput, { target: { value: 'remember@example.com' } })
    fireEvent.click(rememberCheckbox)
    
    const submitButton = screen.getByRole('button', { name: /로그인/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(localStorage.getItem('rememberedEmail')).toBe('remember@example.com')
    })
  })

  it('should load saved email from localStorage on mount', () => {
    localStorage.setItem('rememberedEmail', 'saved@example.com')
    
    render(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/이메일/i) as HTMLInputElement
    expect(emailInput.value).toBe('saved@example.com')
    
    const rememberCheckbox = screen.getByLabelText(/아이디 저장/i) as HTMLInputElement
    expect(rememberCheckbox.checked).toBe(true)
  })

  it('should disable inputs while loading', async () => {
    mockLogin.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))
    
    render(<LoginForm />)
    
    const submitButton = screen.getByRole('button', { name: /로그인/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByLabelText(/이메일/i)).toBeDisabled()
      expect(screen.getByLabelText(/비밀번호/i)).toBeDisabled()
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveAttribute('aria-busy', 'true')
    })
  })

  it('should be accessible with proper ARIA attributes', () => {
    render(<LoginForm />)
    
    const emailInput = screen.getByLabelText(/이메일/i)
    expect(emailInput).toHaveAttribute('aria-required', 'true')
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(emailInput).toHaveAttribute('autoComplete', 'email')
    
    const passwordInput = screen.getByLabelText(/비밀번호/i)
    expect(passwordInput).toHaveAttribute('aria-required', 'true')
    expect(passwordInput).toHaveAttribute('type', 'password')
    expect(passwordInput).toHaveAttribute('autoComplete', 'current-password')
  })

  it('should have error state with proper ARIA attributes when error occurs', async () => {
    mockLogin.mockRejectedValue(new Error('Login failed'))
    
    render(<LoginForm />)
    
    const submitButton = screen.getByRole('button', { name: /로그인/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      const emailInput = screen.getByLabelText(/이메일/i)
      const passwordInput = screen.getByLabelText(/비밀번호/i)
      
      expect(emailInput).toHaveAttribute('aria-invalid', 'true')
      expect(emailInput).toHaveAttribute('aria-describedby', 'error-message')
      expect(passwordInput).toHaveAttribute('aria-invalid', 'true')
      
      const errorMessage = screen.getByRole('alert')
      expect(errorMessage).toHaveAttribute('id', 'error-message')
      expect(errorMessage).toHaveAttribute('aria-live', 'polite')
    })
  })
})