import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect, beforeEach } from '@jest/globals'
import { SignupForm } from './SignupForm'
import { authSlice } from '../../model/authStore'
import { pipelineSlice } from '@/processes/userPipeline/model/pipelineStore'

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/auth/signup'
  })
}))

describe('SignupForm - Basic Rendering', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        auth: authSlice.reducer,
        pipeline: pipelineSlice.reducer
      }
    })
    mockPush.mockClear()
  })

  const renderSignupForm = () => {
    return render(
      <Provider store={store}>
        <SignupForm />
      </Provider>
    )
  }

  describe('초기 렌더링', () => {
    it('should render signup form with legacy UI styling', () => {
      renderSignupForm()
      
      // 레거시 브랜드 컬러와 일치하는 스타일 확인
      const submitButton = screen.getByRole('button', { name: /회원가입/i })
      expect(submitButton).toHaveClass('bg-primary', 'hover:bg-primary-dark')
      
      // 폼 필드들 확인
      expect(screen.getByLabelText(/이름/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/이메일/i)).toBeInTheDocument()
      expect(screen.getByLabelText('비밀번호 *')).toBeInTheDocument()
      expect(screen.getByLabelText(/비밀번호 확인/i)).toBeInTheDocument()
    })

    it('should show VideoPlanet branding with correct primary color', () => {
      renderSignupForm()
      
      const heading = screen.getByRole('heading', { name: /VideoPlanet 회원가입/i })
      expect(heading).toHaveClass('text-primary')
    })

    it('should have proper accessibility attributes', () => {
      renderSignupForm()
      
      const form = screen.getByRole('form', { name: /회원가입/i })
      expect(form).toBeInTheDocument()
      
      // 필수 필드 표시 확인
      const emailField = screen.getByLabelText(/이메일/i)
      expect(emailField).toHaveAttribute('required')
      expect(emailField).toHaveAttribute('aria-required', 'true')
    })
  })

  describe('레거시 UI 호환성', () => {
    it('should maintain exact legacy button styling', () => {
      renderSignupForm()
      
      const submitButton = screen.getByRole('button', { name: /회원가입/i })
      
      // Button 컴포넌트의 레거시 스타일 확인
      expect(submitButton).toHaveClass(
        'bg-primary',
        'text-white', 
        'hover:bg-primary-dark',
        'rounded-md',
        'font-medium',
        'transition-colors'
      )
    })

    it('should use legacy Typography variants for text', () => {
      renderSignupForm()
      
      const heading = screen.getByRole('heading', { name: /VideoPlanet 회원가입/i })
      expect(heading).toHaveClass('text-2xl', 'font-semibold')
      
      const description = screen.getByText(/서비스 이용을 위해 계정을 생성해주세요/i)
      expect(description).toHaveClass('text-base', 'leading-relaxed')
    })

    it('should preserve legacy form field styling', () => {
      renderSignupForm()
      
      const emailField = screen.getByLabelText(/이메일/i)
      
      // 레거시 input 스타일 확인
      expect(emailField).toHaveClass(
        'border',
        'border-gray-300',
        'rounded-md',
        'px-3',
        'py-2'
      )
    })
  })
})