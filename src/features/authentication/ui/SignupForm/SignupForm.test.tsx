import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import { SignupForm } from './SignupForm'
import { authSlice } from '../../model/authStore'
import { pipelineSlice } from '@/processes/userPipeline/model/pipelineStore'

// MSW handlers for API mocking
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.post('/api/auth/signup', async ({ request }) => {
    const body = await request.json() as { email: string; password: string; name: string }
    
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { error: '이미 등록된 이메일입니다.' },
        { status: 400 }
      )
    }
    
    return HttpResponse.json({
      message: '인증 이메일을 전송했습니다.',
      email: body.email
    })
  })
)

beforeEach(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

// Mock Next.js router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    pathname: '/auth/signup'
  })
}))

describe('SignupForm', () => {
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
      expect(screen.getByLabelText(/^비밀번호/i)).toBeInTheDocument()
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

  describe('폼 유효성 검증', () => {
    it('should validate required fields with legacy error styling', async () => {
      renderSignupForm()
      
      const submitButton = screen.getByRole('button', { name: /회원가입/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        const errorMessages = screen.getAllByRole('alert')
        expect(errorMessages.length).toBeGreaterThan(0)
        
        // 레거시 에러 스타일 확인 (danger 컬러 사용)
        errorMessages.forEach(error => {
          expect(error).toHaveClass('text-danger')
        })
      })
    })

    it('should validate email format', async () => {
      renderSignupForm()
      
      const emailField = screen.getByLabelText(/이메일/i)
      fireEvent.change(emailField, { target: { value: 'invalid-email' } })
      fireEvent.blur(emailField)
      
      await waitFor(() => {
        expect(screen.getByText(/올바른 이메일 주소를 입력해주세요/i)).toBeInTheDocument()
      })
    })

    it('should validate password confirmation match', async () => {
      renderSignupForm()
      
      const passwordField = screen.getByLabelText(/^비밀번호/i)
      const confirmField = screen.getByLabelText(/비밀번호 확인/i)
      
      fireEvent.change(passwordField, { target: { value: 'password123!' } })
      fireEvent.change(confirmField, { target: { value: 'different123!' } })
      fireEvent.blur(confirmField)
      
      await waitFor(() => {
        expect(screen.getByText(/비밀번호가 일치하지 않습니다/i)).toBeInTheDocument()
      })
    })

    it('should validate password strength', async () => {
      renderSignupForm()
      
      const passwordField = screen.getByLabelText(/^비밀번호/i)
      fireEvent.change(passwordField, { target: { value: '123' } })
      fireEvent.blur(passwordField)
      
      await waitFor(() => {
        expect(screen.getByText(/비밀번호는 8자 이상이며 대소문자, 숫자, 특수문자를 포함해야 합니다/i)).toBeInTheDocument()
      })
    })
  })

  describe('회원가입 프로세스', () => {
    it('should handle successful signup with legacy success styling', async () => {
      renderSignupForm()
      
      // 폼 필드 입력
      fireEvent.change(screen.getByLabelText(/이름/i), { target: { value: 'Test User' } })
      fireEvent.change(screen.getByLabelText(/이메일/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/^비밀번호/i), { target: { value: 'Password123!' } })
      fireEvent.change(screen.getByLabelText(/비밀번호 확인/i), { target: { value: 'Password123!' } })
      
      // 회원가입 버튼 클릭
      fireEvent.click(screen.getByRole('button', { name: /회원가입/i }))
      
      // 로딩 상태 확인
      await waitFor(() => {
        expect(screen.getByText(/처리 중.../i)).toBeInTheDocument()
      })
      
      // 성공 메시지 확인 (레거시 성공 컬러 사용)
      await waitFor(() => {
        const successMessage = screen.getByText(/인증 이메일을 전송했습니다/i)
        expect(successMessage).toBeInTheDocument()
        expect(successMessage).toHaveClass('text-success')
      }, { timeout: 3000 })
    })

    it('should handle signup failure with legacy error styling', async () => {
      renderSignupForm()
      
      // 이미 등록된 이메일로 테스트
      fireEvent.change(screen.getByLabelText(/이름/i), { target: { value: 'Test User' } })
      fireEvent.change(screen.getByLabelText(/이메일/i), { target: { value: 'existing@example.com' } })
      fireEvent.change(screen.getByLabelText(/^비밀번호/i), { target: { value: 'Password123!' } })
      fireEvent.change(screen.getByLabelText(/비밀번호 확인/i), { target: { value: 'Password123!' } })
      
      fireEvent.click(screen.getByRole('button', { name: /회원가입/i }))
      
      await waitFor(() => {
        const errorMessage = screen.getByText(/이미 등록된 이메일입니다/i)
        expect(errorMessage).toBeInTheDocument()
        expect(errorMessage).toHaveClass('text-danger')
      })
    })

    it('should update pipeline state on successful signup', async () => {
      renderSignupForm()
      
      // 폼 필드 입력
      fireEvent.change(screen.getByLabelText(/이름/i), { target: { value: 'Test User' } })
      fireEvent.change(screen.getByLabelText(/이메일/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/^비밀번호/i), { target: { value: 'Password123!' } })
      fireEvent.change(screen.getByLabelText(/비밀번호 확인/i), { target: { value: 'Password123!' } })
      
      fireEvent.click(screen.getByRole('button', { name: /회원가입/i }))
      
      await waitFor(() => {
        const state = store.getState()
        expect(state.auth.pendingVerificationEmail).toBe('test@example.com')
        expect(state.pipeline.currentStep).toBe('signup')
      })
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

    it('should show email verification pending state with legacy styling', async () => {
      renderSignupForm()
      
      // 성공적인 회원가입 완료
      fireEvent.change(screen.getByLabelText(/이름/i), { target: { value: 'Test User' } })
      fireEvent.change(screen.getByLabelText(/이메일/i), { target: { value: 'test@example.com' } })
      fireEvent.change(screen.getByLabelText(/^비밀번호/i), { target: { value: 'Password123!' } })
      fireEvent.change(screen.getByLabelText(/비밀번호 확인/i), { target: { value: 'Password123!' } })
      
      fireEvent.click(screen.getByRole('button', { name: /회원가입/i }))
      
      // 이메일 인증 대기 화면 확인
      await waitFor(() => {
        expect(screen.getByText(/📧/)).toBeInTheDocument()
        expect(screen.getByText(/인증 이메일을 전송했습니다/i)).toBeInTheDocument()
        expect(screen.getByText(/test@example.com/)).toBeInTheDocument()
      })
    })
  })

  describe('접근성 준수', () => {
    it('should announce form validation errors to screen readers', async () => {
      renderSignupForm()
      
      const submitButton = screen.getByRole('button', { name: /회원가입/i })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        const alerts = screen.getAllByRole('alert')
        expect(alerts.length).toBeGreaterThan(0)
        
        alerts.forEach(alert => {
          expect(alert).toBeInTheDocument()
        })
      })
    })

    it('should support keyboard navigation', () => {
      renderSignupForm()
      
      const nameField = screen.getByLabelText(/이름/i)
      const emailField = screen.getByLabelText(/이메일/i)
      
      nameField.focus()
      expect(document.activeElement).toBe(nameField)
      
      // Tab 키로 다음 필드로 이동
      fireEvent.keyDown(nameField, { key: 'Tab' })
      // 실제로는 브라우저가 처리하므로 여기서는 포커스 이동 가능 여부만 확인
      expect(emailField).toHaveAttribute('tabIndex', '0')
    })

    it('should provide clear form instructions', () => {
      renderSignupForm()
      
      expect(screen.getByText(/서비스 이용을 위해 계정을 생성해주세요/i)).toBeInTheDocument()
      expect(screen.getByText(/이미 계정이 있으신가요/i)).toBeInTheDocument()
    })
  })
})