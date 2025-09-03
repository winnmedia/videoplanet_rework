'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppDispatch, useAppSelector } from '@/shared/lib/hooks/redux'
import { Button } from '@/shared/ui/Button'
import { Typography } from '@/shared/ui/Typography'
import { signupStart, signupSuccess, signupFailure, clearAuthError } from '../../model/authActions'
import { updatePipelineStep } from '@/processes/userPipeline/model/pipelineActions'
import Link from 'next/link'
import { clsx } from 'clsx'

// 폼 데이터 인터페이스
interface SignupFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

// 유효성 검사 에러 인터페이스
interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

export const SignupForm: React.FC = () => {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const { isLoading, error, pendingVerificationEmail } = useAppSelector(state => state.auth)

  // 폼 상태 관리
  const [formData, setFormData] = useState<SignupFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })

  const [formErrors, setFormErrors] = useState<FormErrors>({})
  const [touchedFields, setTouchedFields] = useState<Set<string>>(new Set())

  // 에러 메시지 클리어
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        dispatch(clearAuthError())
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error, dispatch])

  // 폼 필드 변경 핸들러
  const handleInputChange = (field: keyof SignupFormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // 실시간 유효성 검사 (터치된 필드에 대해서만)
    if (touchedFields.has(field)) {
      validateField(field, value)
    }
  }

  // 필드 블러 핸들러
  const handleFieldBlur = (field: keyof SignupFormData) => {
    setTouchedFields(prev => new Set(prev).add(field))
    validateField(field, formData[field])
  }

  // 필드별 유효성 검사
  const validateField = (field: keyof SignupFormData, value: string) => {
    const errors: FormErrors = { ...formErrors }

    switch (field) {
      case 'name':
        if (!value.trim()) {
          errors.name = '이름을 입력해주세요.'
        } else if (value.length < 2) {
          errors.name = '이름은 2자 이상 입력해주세요.'
        } else {
          delete errors.name
        }
        break

      case 'email':
        if (!value) {
          errors.email = '이메일을 입력해주세요.'
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          errors.email = '올바른 이메일 주소를 입력해주세요.'
        } else {
          delete errors.email
        }
        break

      case 'password':
        if (!value) {
          errors.password = '비밀번호를 입력해주세요.'
        } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value)) {
          errors.password = '비밀번호는 8자 이상이며 대소문자, 숫자, 특수문자를 포함해야 합니다.'
        } else {
          delete errors.password
        }
        break

      case 'confirmPassword':
        if (!value) {
          errors.confirmPassword = '비밀번호 확인을 입력해주세요.'
        } else if (value !== formData.password) {
          errors.confirmPassword = '비밀번호가 일치하지 않습니다.'
        } else {
          delete errors.confirmPassword
        }
        break
    }

    setFormErrors(errors)
  }

  // 전체 폼 유효성 검사
  const validateForm = (): boolean => {
    const errors: FormErrors = {}

    Object.keys(formData).forEach(field => {
      validateField(field as keyof SignupFormData, formData[field as keyof SignupFormData])
    })

    return Object.keys(formErrors).length === 0
  }

  // 회원가입 API 호출
  const handleSignup = async (formData: SignupFormData) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다.')
      }

      return data
    } catch (error) {
      throw error
    }
  }

  // 폼 제출 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // 모든 필드를 터치된 것으로 표시
    const allFields = new Set(Object.keys(formData))
    setTouchedFields(allFields)

    // 유효성 검사
    Object.keys(formData).forEach(field => {
      validateField(field as keyof SignupFormData, formData[field as keyof SignupFormData])
    })

    if (Object.keys(formErrors).length > 0) {
      return
    }

    dispatch(signupStart())

    try {
      const result = await handleSignup(formData)
      
      dispatch(signupSuccess({
        email: formData.email,
        message: result.message
      }))

      // 파이프라인 상태 업데이트 (signup 단계 완료)
      dispatch(updatePipelineStep({
        step: 'login', // 이메일 인증 대기이므로 login 단계로 이동
        userData: {
          email: formData.email,
          name: formData.name,
          id: 'pending-verification' // 임시 ID
        }
      }))

    } catch (error) {
      dispatch(signupFailure((error as Error).message))
    }
  }

  // 이메일 인증 대기 화면
  if (pendingVerificationEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="text-6xl mb-6">📧</div>
            <Typography variant="h2" className="text-2xl font-semibold text-foreground mb-4">
              인증 이메일을 전송했습니다
            </Typography>
            <Typography variant="body" className="text-base leading-relaxed text-gray-600 mb-6">
              <span className="font-medium text-primary">{pendingVerificationEmail}</span>로 전송된 
              인증 링크를 클릭해주세요.
            </Typography>
            <div className="bg-info/10 border border-info/20 rounded-md p-4 mb-6">
              <Typography variant="body2" className="text-sm text-info">
                인증 메일이 도착하지 않았다면 스팸함을 확인해보세요.
              </Typography>
            </div>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="w-full"
            >
              다시 시도
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* 헤더 */}
        <div className="text-center">
          <Typography variant="h2" className="text-2xl font-semibold text-primary mb-2">
            VideoPlanet 회원가입
          </Typography>
          <Typography variant="body" className="text-base leading-relaxed text-gray-600">
            서비스 이용을 위해 계정을 생성해주세요.
          </Typography>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div 
            className="bg-danger/10 border border-danger/20 rounded-md p-4"
            role="alert"
            aria-live="polite"
          >
            <Typography variant="body2" className="text-danger">
              {error}
            </Typography>
          </div>
        )}

        {/* 회원가입 폼 */}
        <form 
          className="space-y-6" 
          onSubmit={handleSubmit}
          aria-label="회원가입"
          noValidate
        >
          {/* 이름 필드 */}
          <div>
            <label 
              htmlFor="name" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              이름 *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              aria-required="true"
              aria-invalid={formErrors.name ? 'true' : 'false'}
              aria-describedby={formErrors.name ? 'name-error' : undefined}
              className={clsx(
                'w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
                'transition-colors',
                formErrors.name ? 'border-danger bg-danger/5' : 'border-gray-300'
              )}
              placeholder="홍길동"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              onBlur={() => handleFieldBlur('name')}
            />
            {formErrors.name && (
              <Typography 
                variant="body2" 
                className="text-danger mt-1"
                id="name-error"
                role="alert"
              >
                {formErrors.name}
              </Typography>
            )}
          </div>

          {/* 이메일 필드 */}
          <div>
            <label 
              htmlFor="email" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              이메일 *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              aria-required="true"
              aria-invalid={formErrors.email ? 'true' : 'false'}
              aria-describedby={formErrors.email ? 'email-error' : undefined}
              className={clsx(
                'w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
                'transition-colors',
                formErrors.email ? 'border-danger bg-danger/5' : 'border-gray-300'
              )}
              placeholder="name@example.com"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={() => handleFieldBlur('email')}
            />
            {formErrors.email && (
              <Typography 
                variant="body2" 
                className="text-danger mt-1"
                id="email-error"
                role="alert"
              >
                {formErrors.email}
              </Typography>
            )}
          </div>

          {/* 비밀번호 필드 */}
          <div>
            <label 
              htmlFor="password" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              비밀번호 *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              aria-required="true"
              aria-invalid={formErrors.password ? 'true' : 'false'}
              aria-describedby={formErrors.password ? 'password-error' : undefined}
              className={clsx(
                'w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
                'transition-colors',
                formErrors.password ? 'border-danger bg-danger/5' : 'border-gray-300'
              )}
              placeholder="8자 이상, 대소문자/숫자/특수문자 포함"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              onBlur={() => handleFieldBlur('password')}
            />
            {formErrors.password && (
              <Typography 
                variant="body2" 
                className="text-danger mt-1"
                id="password-error"
                role="alert"
              >
                {formErrors.password}
              </Typography>
            )}
          </div>

          {/* 비밀번호 확인 필드 */}
          <div>
            <label 
              htmlFor="confirmPassword" 
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              비밀번호 확인 *
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              required
              aria-required="true"
              aria-invalid={formErrors.confirmPassword ? 'true' : 'false'}
              aria-describedby={formErrors.confirmPassword ? 'confirmPassword-error' : undefined}
              className={clsx(
                'w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400',
                'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary',
                'transition-colors',
                formErrors.confirmPassword ? 'border-danger bg-danger/5' : 'border-gray-300'
              )}
              placeholder="비밀번호를 다시 입력해주세요"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              onBlur={() => handleFieldBlur('confirmPassword')}
            />
            {formErrors.confirmPassword && (
              <Typography 
                variant="body2" 
                className="text-danger mt-1"
                id="confirmPassword-error"
                role="alert"
              >
                {formErrors.confirmPassword}
              </Typography>
            )}
          </div>

          {/* 제출 버튼 */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={isLoading}
            disabled={isLoading}
            className="w-full bg-primary hover:bg-primary-dark text-white rounded-md font-medium transition-colors"
          >
            {isLoading ? '처리 중...' : '회원가입'}
          </Button>
        </form>

        {/* 로그인 링크 */}
        <div className="text-center">
          <Typography variant="body2" className="text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link 
              href="/auth/login" 
              className="text-primary hover:text-primary-dark font-medium transition-colors"
            >
              로그인하기
            </Link>
          </Typography>
        </div>
      </div>
    </div>
  )
}