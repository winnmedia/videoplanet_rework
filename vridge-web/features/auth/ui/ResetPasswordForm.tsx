'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'

import { resetPasswordRequestSchema, type ResetPasswordRequestInput } from '../model/auth.schema'
import { useAuth } from '../model/useAuth'

export function ResetPasswordForm() {
  const { requestPasswordReset } = useAuth()
  const [isSuccess, setIsSuccess] = useState(false)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError: setFormError
  } = useForm<ResetPasswordRequestInput>({
    resolver: zodResolver(resetPasswordRequestSchema),
    defaultValues: {
      email: ''
    }
  })

  const onSubmit = async (data: ResetPasswordRequestInput) => {
    try {
      await requestPasswordReset(data.email)
      setIsSuccess(true)
    } catch (error) {
      setFormError('root', {
        message: error instanceof Error ? error.message : '비밀번호 재설정 요청에 실패했습니다. 다시 시도해주세요.'
      })
    }
  }

  if (isSuccess) {
    return (
      <div className="space-y-6">
        <div 
          className="p-4 rounded-lg bg-green-50 border border-green-200 text-green-700 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400"
          role="status"
          aria-live="polite"
        >
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.236 4.53L7.53 10.53a.75.75 0 00-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium">비밀번호 재설정 이메일이 발송되었습니다</h3>
              <p className="mt-1 text-sm">
                이메일을 확인하시고 링크를 클릭하여 비밀번호를 재설정해주세요.
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-center">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            이메일을 받지 못하셨나요?{' '}
          </span>
          <button
            type="button"
            onClick={() => setIsSuccess(false)}
            className="text-sm font-medium text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary transition-colors"
          >
            다시 요청하기
          </button>
        </div>
        
        <div className="text-center">
          <a href="/login" className="text-sm font-medium text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary">
            로그인으로 돌아가기
          </a>
        </div>
      </div>
    )
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
          placeholder="이메일 주소를 입력하세요"
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white dark:focus:ring-primary-dark"
          aria-label="이메일 주소"
          aria-required="true"
          aria-invalid={!!errors.email || !!errors.root}
          aria-describedby={errors.email ? 'email-error' : errors.root ? 'error-message' : 'email-description'}
          disabled={isSubmitting}
          {...register('email')}
        />
        <p id="email-description" className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          가입하신 이메일 주소를 입력하시면 비밀번호 재설정 링크를 보내드립니다.
        </p>
        {errors.email && (
          <p id="email-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
            {errors.email.message}
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

      <button
        type="submit"
        className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed dark:bg-primary-dark dark:hover:bg-primary dark:disabled:bg-gray-700"
        disabled={isSubmitting}
        aria-busy={isSubmitting}
        aria-label={isSubmitting ? '비밀번호 재설정 요청 처리 중' : '비밀번호 재설정 요청'}
      >
        {isSubmitting ? '요청 처리 중...' : '비밀번호 재설정 요청'}
      </button>
      
      <div className="text-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          비밀번호가 기억나셨나요?{' '}
          <a href="/login" className="font-medium text-primary hover:text-primary-dark dark:text-primary-light dark:hover:text-primary">
            로그인
          </a>
        </span>
      </div>
    </form>
  )
}