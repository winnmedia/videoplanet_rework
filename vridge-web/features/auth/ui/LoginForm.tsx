'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { loginSchema, type LoginInput } from '../model/auth.schema'
import { useAuth } from '../model/useAuth'

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
    setError: setFormError
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  })
  
  const rememberMe = watch('rememberMe')

  // 컴포넌트 마운트 시 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setValue('email', savedEmail)
      setValue('rememberMe', true)
    }
  }, [setValue])

  // 아이디 저장 체크박스 변경 시 처리
  useEffect(() => {
    if (!rememberMe) {
      localStorage.removeItem('rememberedEmail')
    }
  }, [rememberMe])

  const onSubmit = async (data: LoginInput) => {
    try {
      await login(data.email, data.password)
      
      // 로그인 성공 시 아이디 저장 처리
      if (data.rememberMe) {
        localStorage.setItem('rememberedEmail', data.email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }
      
      router.push('/dashboard')
    } catch (error) {
      setFormError('root', {
        message: '로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.'
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="email" className="sr-only">
          이메일 주소
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="이메일"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-primary-dark"
          aria-label="이메일 주소"
          aria-required="true"
          aria-invalid={!!errors.email || !!errors.root}
          aria-describedby={errors.email ? 'email-error' : errors.root ? 'error-message' : undefined}
          disabled={isSubmitting}
          {...register('email')}
        />
        {errors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>
      
      <div>
        <label htmlFor="password" className="sr-only">
          비밀번호
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="비밀번호"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-primary-dark"
          aria-label="비밀번호"
          aria-required="true"
          aria-invalid={!!errors.password || !!errors.root}
          disabled={isSubmitting}
          {...register('password')}
        />
        {errors.password && (
          <p id="password-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.password.message}
          </p>
        )}
      </div>

      {errors.root && (
        <div 
          id="error-message"
          className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400"
          role="alert"
          aria-live="polite"
        >
          {errors.root.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <label htmlFor="remember-me" className="flex items-center">
          <input
            id="remember-me"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:text-gray-300 dark:bg-gray-700 dark:border-gray-600"
            disabled={isSubmitting}
            {...register('rememberMe')}
          />
          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">아이디 저장</span>
        </label>
        
        <div className="text-sm">
          <a href="/reset-password" className="font-medium text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary">
            비밀번호 찾기
          </a>
        </div>
      </div>

      <button
        type="submit"
        className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed dark:bg-primary-dark dark:hover:bg-primary dark:disabled:bg-gray-700"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        aria-label={isSubmitting ? '로그인 처리 중' : '로그인'}
      >
        {isSubmitting ? '로그인 중...' : '로그인'}
      </button>
      
      <div className="mt-6 text-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          계정이 없으신가요?{' '}
          <a href="/signup" className="font-medium text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary">
            회원가입
          </a>
        </span>
      </div>
    </form>
  )
}