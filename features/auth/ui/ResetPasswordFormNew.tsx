'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { 
  resetPasswordRequestSchema, 
  resetPasswordSchema,
  type ResetPasswordRequestInput,
  type ResetPasswordInput 
} from '../model/auth.schema'

export function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [emailSent, setEmailSent] = useState(false)

  // 이메일 요청 폼
  const emailForm = useForm<ResetPasswordRequestInput>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: {
      email: ''
    }
  })

  // 비밀번호 재설정 폼
  const resetForm = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || '',
      password: '',
      confirmPassword: ''
    }
  })

  // 이메일로 재설정 링크 요청
  const handleEmailSubmit = async (data: ResetPasswordRequestInput) => {
    try {
      const response = await fetch('/api/auth/reset-password-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || '요청 처리에 실패했습니다')
      }

      setEmailSent(true)
    } catch (error) {
      emailForm.setError('root', {
        message: error instanceof Error ? error.message : '요청 처리에 실패했습니다'
      })
    }
  }

  // 새 비밀번호 설정
  const handleResetSubmit = async (data: ResetPasswordInput) => {
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || '비밀번호 재설정에 실패했습니다')
      }

      // 성공 시 로그인 페이지로 이동
      router.push('/login?reset=success')
    } catch (error) {
      resetForm.setError('root', {
        message: error instanceof Error ? error.message : '비밀번호 재설정에 실패했습니다'
      })
    }
  }

  // 토큰이 있으면 비밀번호 재설정 폼 표시
  if (token) {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">새 비밀번호 설정</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            안전한 새 비밀번호를 입력해주세요
          </p>
        </div>

        <form onSubmit={resetForm.handleSubmit(handleResetSubmit)} className="space-y-6">
          <input type="hidden" {...resetForm.register('token')} />
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              새 비밀번호
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="새 비밀번호를 입력하세요"
              disabled={resetForm.formState.isSubmitting}
              {...resetForm.register('password')}
            />
            {resetForm.formState.errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {resetForm.formState.errors.password.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              대소문자, 숫자, 특수문자를 각 1개 이상 포함하여 8자 이상
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="비밀번호를 다시 입력하세요"
              disabled={resetForm.formState.isSubmitting}
              {...resetForm.register('confirmPassword')}
            />
            {resetForm.formState.errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {resetForm.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>

          {resetForm.formState.errors.root && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400" role="alert">
              {resetForm.formState.errors.root.message}
            </div>
          )}

          <button
            type="submit"
            disabled={resetForm.formState.isSubmitting}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {resetForm.formState.isSubmitting ? '비밀번호 재설정 중...' : '비밀번호 재설정'}
          </button>
        </form>
      </div>
    )
  }

  // 이메일 요청 폼
  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">비밀번호 재설정</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다
        </p>
      </div>

      {emailSent ? (
        <div className="space-y-6">
          <div className="p-6 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  이메일을 발송했습니다
                </h3>
                <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                  {emailForm.getValues('email')}로 비밀번호 재설정 링크를 발송했습니다.
                  이메일을 확인해주세요.
                </p>
                <p className="mt-2 text-xs text-green-600 dark:text-green-400">
                  이메일이 도착하지 않았다면 스팸 폴더를 확인해주세요.
                </p>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => setEmailSent(false)}
              className="text-sm text-primary hover:text-primary-dark font-medium"
            >
              다른 이메일로 다시 시도
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              이메일 주소
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="이메일 주소를 입력하세요"
              disabled={emailForm.formState.isSubmitting}
              {...emailForm.register('email')}
            />
            {emailForm.formState.errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                {emailForm.formState.errors.email.message}
              </p>
            )}
          </div>

          {emailForm.formState.errors.root && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400" role="alert">
              {emailForm.formState.errors.root.message}
            </div>
          )}

          <button
            type="submit"
            disabled={emailForm.formState.isSubmitting}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {emailForm.formState.isSubmitting ? '전송 중...' : '재설정 링크 전송'}
          </button>
        </form>
      )}

      <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
        <a href="/login" className="font-medium text-primary hover:text-primary-dark">
          로그인으로 돌아가기
        </a>
      </div>
    </div>
  )
}