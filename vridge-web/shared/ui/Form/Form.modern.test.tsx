/**
 * @file Form.modern.test.tsx
 * @description 모던 Form 컴포넌트 TDD 테스트
 * - 레거시 폼 디자인 100% 시각적 충실성 검증
 * - WCAG 2.1 AA 접근성 완전 준수
 * - React 19 + Tailwind CSS 활용
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import React from 'react'

import { Form, FormField, FormGroup, type FormProps } from './Form.modern'

expect.extend(toHaveNoViolations)

describe('Form.modern', () => {
  const defaultProps: FormProps = {
    onSubmit: jest.fn(),
    children: (
      <>
        <FormField
          name="email"
          label="이메일"
          type="email"
          required
        />
        <FormField
          name="password"
          label="비밀번호"
          type="password"
          required
        />
      </>
    )
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('렌더링 및 기본 기능', () => {
    test('폼과 필드가 정상적으로 렌더링된다', () => {
      render(<Form {...defaultProps} />)
      
      expect(screen.getByRole('form')).toBeInTheDocument()
      expect(screen.getByLabelText('이메일')).toBeInTheDocument()
      expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
    })

    test('제출 버튼이 표시된다 (기본값)', () => {
      render(<Form {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /제출|확인/i })).toBeInTheDocument()
    })

    test('커스텀 제출 버튼 텍스트가 적용된다', () => {
      render(<Form {...defaultProps} submitText="로그인" />)
      
      expect(screen.getByRole('button', { name: '로그인' })).toBeInTheDocument()
    })

    test('제출 버튼 비활성화 시 disabled 속성이 적용된다', () => {
      render(<Form {...defaultProps} submitDisabled />)
      
      const submitButton = screen.getByRole('button', { name: /제출|확인/i })
      expect(submitButton).toBeDisabled()
    })
  })

  describe('폼 제출 및 검증', () => {
    test('필수 필드가 비어있을 때 제출이 차단된다', async () => {
      const user = userEvent.setup()
      render(<Form {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /제출|확인/i })
      await user.click(submitButton)
      
      // HTML5 validation이 작동하거나 커스텀 검증 메시지 표시
      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })

    test('모든 필드가 입력되었을 때 onSubmit이 호출된다', async () => {
      const user = userEvent.setup()
      render(<Form {...defaultProps} />)
      
      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')
      const submitButton = screen.getByRole('button', { name: /제출|확인/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalledWith({
          email: 'test@example.com',
          password: 'password123'
        })
      })
    })

    test('Enter 키로 폼 제출이 가능하다', async () => {
      const user = userEvent.setup()
      render(<Form {...defaultProps} />)
      
      const emailInput = screen.getByLabelText('이메일')
      const passwordInput = screen.getByLabelText('비밀번호')
      
      await user.type(emailInput, 'test@example.com')
      await user.type(passwordInput, 'password123')
      await user.keyboard('{Enter}')
      
      await waitFor(() => {
        expect(defaultProps.onSubmit).toHaveBeenCalled()
      })
    })

    test('로딩 상태에서는 제출이 차단된다', async () => {
      const user = userEvent.setup()
      render(<Form {...defaultProps} loading />)
      
      const submitButton = screen.getByRole('button', { name: /제출|확인/i })
      expect(submitButton).toBeDisabled()
      
      await user.click(submitButton)
      expect(defaultProps.onSubmit).not.toHaveBeenCalled()
    })
  })

  describe('FormField 컴포넌트', () => {
    test('기본 텍스트 입력 필드가 렌더링된다', () => {
      render(
        <Form onSubmit={jest.fn()}>
          <FormField name="username" label="사용자명" />
        </Form>
      )
      
      const input = screen.getByLabelText('사용자명')
      expect(input).toHaveAttribute('type', 'text')
      expect(input).toHaveAttribute('name', 'username')
    })

    test('다양한 입력 타입이 지원된다', () => {
      render(
        <Form onSubmit={jest.fn()}>
          <FormField name="email" label="이메일" type="email" />
          <FormField name="password" label="비밀번호" type="password" />
          <FormField name="age" label="나이" type="number" />
          <FormField name="website" label="웹사이트" type="url" />
        </Form>
      )
      
      expect(screen.getByLabelText('이메일')).toHaveAttribute('type', 'email')
      expect(screen.getByLabelText('비밀번호')).toHaveAttribute('type', 'password')
      expect(screen.getByLabelText('나이')).toHaveAttribute('type', 'number')
      expect(screen.getByLabelText('웹사이트')).toHaveAttribute('type', 'url')
    })

    test('textarea 타입이 올바르게 렌더링된다', () => {
      render(
        <Form onSubmit={jest.fn()}>
          <FormField name="message" label="메시지" type="textarea" />
        </Form>
      )
      
      const textarea = screen.getByLabelText('메시지')
      expect(textarea.tagName).toBe('TEXTAREA')
    })

    test('select 타입과 옵션이 렌더링된다', () => {
      const options = [
        { value: 'option1', label: '옵션 1' },
        { value: 'option2', label: '옵션 2' }
      ]
      
      render(
        <Form onSubmit={jest.fn()}>
          <FormField name="category" label="카테고리" type="select" options={options} />
        </Form>
      )
      
      expect(screen.getByLabelText('카테고리')).toBeInTheDocument()
      expect(screen.getByText('옵션 1')).toBeInTheDocument()
      expect(screen.getByText('옵션 2')).toBeInTheDocument()
    })
  })

  describe('레거시 디자인 시각적 충실성', () => {
    test('폼 컨테이너: 레거시 카드 스타일 적용', () => {
      render(<Form {...defaultProps} />)
      
      const form = screen.getByRole('form')
      expect(form).toHaveClass(
        // 레거시: background: white, border-radius: 12px, padding: 24px
        'bg-white', 'rounded-lg', 'p-6',
        // 레거시: box-shadow: 0 4px 8px rgba(0,0,0,0.08)
        'shadow-md'
      )
    })

    test('입력 필드: 레거시 스타일 정확히 적용', () => {
      render(
        <Form onSubmit={jest.fn()}>
          <FormField name="test" label="테스트" />
        </Form>
      )
      
      const input = screen.getByLabelText('테스트')
      expect(input).toHaveClass(
        // 레거시: height: 44px, padding: 8px 16px
        'h-input', 'px-4', 'py-2.5',
        // 레거시: border: 1px solid #e4e4e4, border-radius: 12px
        'border', 'border-neutral-300', 'rounded-lg',
        // 레거시: focus ring
        'focus:ring-2', 'focus:ring-vridge-500/20'
      )
    })

    test('라벨: 레거시 타이포그래피 스타일', () => {
      render(
        <Form onSubmit={jest.fn()}>
          <FormField name="test" label="테스트 라벨" />
        </Form>
      )
      
      const label = screen.getByText('테스트 라벨')
      expect(label).toHaveClass(
        // 레거시: font-size: 14px, font-weight: 600, color: #25282f
        'text-sm', 'font-semibold', 'text-neutral-900'
      )
    })

    test('제출 버튼: 레거시 primary 버튼 스타일', () => {
      render(<Form {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /제출|확인/i })
      expect(submitButton).toHaveClass(
        // 레거시: background: linear-gradient(135deg, #0031ff, #0025cc)
        'bg-gradient-to-br', 'from-vridge-500', 'to-vridge-600',
        // 레거시: height: 44px, border-radius: 12px, padding: 0 24px
        'h-input', 'px-6', 'rounded-lg',
        // 레거시: color: white, font-weight: 600
        'text-white', 'font-semibold'
      )
    })

    test('에러 상태: 레거시 에러 스타일 적용', () => {
      render(
        <Form onSubmit={jest.fn()}>
          <FormField name="test" label="테스트" error="에러 메시지" />
        </Form>
      )
      
      const input = screen.getByLabelText('테스트')
      const errorMessage = screen.getByText('에러 메시지')
      
      expect(input).toHaveClass(
        // 레거시: border-color: #d93a3a, focus:ring: rgba(217,58,58,0.2)
        'border-error-500', 'focus:ring-error-500/20'
      )
      
      expect(errorMessage).toHaveClass(
        // 레거시: color: #d93a3a, font-size: 12px
        'text-error-600', 'text-xs'
      )
    })

    test('로딩 상태: 레거시 로딩 스피너', () => {
      render(<Form {...defaultProps} loading />)
      
      const submitButton = screen.getByRole('button', { name: /제출|확인/i })
      // 로딩 스피너가 표시되고 텍스트가 숨겨짐
      expect(submitButton).toHaveClass('relative')
      expect(submitButton.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('FormGroup 컴포넌트', () => {
    test('필드를 그룹화하여 렌더링한다', () => {
      render(
        <Form onSubmit={jest.fn()}>
          <FormGroup title="개인정보">
            <FormField name="name" label="이름" />
            <FormField name="email" label="이메일" />
          </FormGroup>
        </Form>
      )
      
      expect(screen.getByText('개인정보')).toBeInTheDocument()
      expect(screen.getByLabelText('이름')).toBeInTheDocument()
      expect(screen.getByLabelText('이메일')).toBeInTheDocument()
    })

    test('그룹 제목 스타일이 적용된다', () => {
      render(
        <Form onSubmit={jest.fn()}>
          <FormGroup title="그룹 제목">
            <FormField name="test" label="테스트" />
          </FormGroup>
        </Form>
      )
      
      const groupTitle = screen.getByText('그룹 제목')
      expect(groupTitle).toHaveClass(
        // 레거시: font-size: 18px, font-weight: 600, margin-bottom: 16px
        'text-lg', 'font-semibold', 'mb-4'
      )
    })
  })

  describe('WCAG 2.1 AA 접근성 검증', () => {
    test('접근성 위반 사항이 없어야 함', async () => {
      const { container } = render(<Form {...defaultProps} />)
      
      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    test('폼에 role="form" 적용', () => {
      render(<Form {...defaultProps} />)
      
      expect(screen.getByRole('form')).toBeInTheDocument()
    })

    test('라벨과 입력 필드가 올바르게 연결', () => {
      render(
        <Form onSubmit={jest.fn()}>
          <FormField name="email" label="이메일 주소" />
        </Form>
      )
      
      const label = screen.getByText('이메일 주소')
      const input = screen.getByLabelText('이메일 주소')
      
      expect(label).toHaveAttribute('for', input.id)
      expect(input).toHaveAttribute('id', label.getAttribute('for'))
    })

    test('에러 메시지가 aria-describedby로 연결', () => {
      render(
        <Form onSubmit={jest.fn()}>
          <FormField name="email" label="이메일" error="유효한 이메일을 입력하세요" />
        </Form>
      )
      
      const input = screen.getByLabelText('이메일')
      const errorMessage = screen.getByText('유효한 이메일을 입력하세요')
      
      expect(input).toHaveAttribute('aria-describedby')
      expect(errorMessage).toHaveAttribute('id', input.getAttribute('aria-describedby'))
      expect(errorMessage).toHaveAttribute('role', 'alert')
    })

    test('필수 필드에 aria-required 적용', () => {
      render(
        <Form onSubmit={jest.fn()}>
          <FormField name="email" label="이메일" required />
        </Form>
      )
      
      const input = screen.getByLabelText('이메일')
      expect(input).toHaveAttribute('aria-required', 'true')
      expect(input).toBeRequired()
    })
  })

  describe('다크 모드 및 반응형', () => {
    test('다크 모드: 배경색 및 텍스트 색상 변경', () => {
      document.documentElement.classList.add('dark')
      
      render(<Form {...defaultProps} />)
      
      const form = screen.getByRole('form')
      expect(form).toHaveClass('dark:bg-neutral-900', 'dark:text-white')
      
      document.documentElement.classList.remove('dark')
    })

    test('모바일: 반응형 패딩 적용', () => {
      render(<Form {...defaultProps} />)
      
      const form = screen.getByRole('form')
      expect(form).toHaveClass('p-4', 'sm:p-6')
    })
  })

  describe('성능 및 최적화', () => {
    test('초기값 설정이 올바르게 작동한다', () => {
      render(
        <Form onSubmit={jest.fn()} defaultValues={{ email: 'test@example.com' }}>
          <FormField name="email" label="이메일" />
        </Form>
      )
      
      const emailInput = screen.getByLabelText('이메일') as HTMLInputElement
      expect(emailInput.value).toBe('test@example.com')
    })

    test('폼 리셋 기능이 작동한다', async () => {
      const user = userEvent.setup()
      const { container } = render(
        <Form onSubmit={jest.fn()}>
          <FormField name="email" label="이메일" />
          <button type="reset">리셋</button>
        </Form>
      )
      
      const emailInput = screen.getByLabelText('이메일') as HTMLInputElement
      const resetButton = screen.getByRole('button', { name: '리셋' })
      
      await user.type(emailInput, 'test@example.com')
      expect(emailInput.value).toBe('test@example.com')
      
      await user.click(resetButton)
      expect(emailInput.value).toBe('')
    })
  })

  describe('에러 처리 및 검증', () => {
    test('onSubmit 실행 중 에러 발생 시 처리', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation()
      const errorOnSubmit = jest.fn().mockRejectedValue(new Error('Submit error'))
      
      const user = userEvent.setup()
      render(<Form onSubmit={errorOnSubmit}>
        <FormField name="email" label="이메일" />
      </Form>)
      
      const emailInput = screen.getByLabelText('이메일')
      const submitButton = screen.getByRole('button', { name: /제출|확인/i })
      
      await user.type(emailInput, 'test@example.com')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith(
          expect.stringContaining('Form submission error'),
          expect.any(Error)
        )
      })
      
      consoleError.mockRestore()
    })

    test('커스텀 검증 함수가 작동한다', async () => {
      const validate = jest.fn().mockReturnValue({ email: '유효하지 않은 이메일입니다.' })
      
      const user = userEvent.setup()
      render(<Form onSubmit={jest.fn()} validate={validate}>
        <FormField name="email" label="이메일" />
      </Form>)
      
      const emailInput = screen.getByLabelText('이메일')
      const submitButton = screen.getByRole('button', { name: /제출|확인/i })
      
      await user.type(emailInput, 'invalid-email')
      await user.click(submitButton)
      
      expect(validate).toHaveBeenCalledWith({ email: 'invalid-email' })
      expect(screen.getByText('유효하지 않은 이메일입니다.')).toBeInTheDocument()
    })
  })
})