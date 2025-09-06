'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { useState, useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { signupSchema, type SignupInput } from '../model/auth.schema'
import { useAuth } from '../model/useAuth'

export function SignupForm() {
  const router = useRouter()
  const { signup } = useAuth()
  const [step, setStep] = useState<'email' | 'details'>('email')
  const [emailVerified, setEmailVerified] = useState(false)
  const [verificationCode, setVerificationCode] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [verifyingCode, setVerifyingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    setError: setFormError,
    getValues
  } = useForm<SignupInput>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      companyName: '',
      termsAccepted: undefined as any,
      marketingAccepted: false
    }
  })

  const email = watch('email')
  const password = watch('password')
  const termsAccepted = watch('termsAccepted')

  // 카운트다운 타이머
  useEffect(() => {
    if (countdown > 0) {
      countdownRef.current = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
    }
    return () => {
      if (countdownRef.current) {
        clearTimeout(countdownRef.current)
      }
    }
  }, [countdown])

  // 인증 코드 발송
  const handleSendVerification = async () => {
    const emailValue = getValues('email')
    if (!emailValue || errors.email) return

    setSendingCode(true)
    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue, type: 'signup' })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '인증 코드 발송에 실패했습니다')
      }

      setCountdown(60)
      if (process.env.NODE_ENV === 'development' && data.devCode) {
        console.log('Dev verification code:', data.devCode)
      }
    } catch (error) {
      setFormError('root', {
        message: error instanceof Error ? error.message : '인증 코드 발송에 실패했습니다'
      })
    } finally {
      setSendingCode(false)
    }
  }

  // 인증 코드 확인
  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setFormError('root', { message: '6자리 인증 코드를 입력해주세요' })
      return
    }

    setVerifyingCode(true)
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: getValues('email'),
          code: verificationCode,
          type: 'signup'
        })
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || '인증에 실패했습니다')
      }

      setEmailVerified(true)
      setStep('details')
    } catch (error) {
      setFormError('root', {
        message: error instanceof Error ? error.message : '인증에 실패했습니다'
      })
    } finally {
      setVerifyingCode(false)
    }
  }

  // 폼 제출
  const onSubmit = async (data: SignupInput) => {
    if (!emailVerified) {
      setFormError('root', { message: '이메일 인증을 완료해주세요' })
      return
    }

    try {
      await signup({
        email: data.email,
        nickname: data.name,
        password: data.password,
        auth_number: verificationCode,
        company_name: data.companyName,
        marketing_accepted: data.marketingAccepted
      } as any)
      router.push('/dashboard')
    } catch (error) {
      setFormError('root', {
        message: '회원가입에 실패했습니다. 다시 시도해주세요.'
      })
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {step === 'email' ? (
        // 이메일 인증 단계
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              이메일
            </label>
            <div className="flex gap-2">
              <input
                id="email"
                type="email"
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors disabled:bg-gray-50 disabled:text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                placeholder="이메일 주소를 입력하세요"
                disabled={emailVerified || sendingCode}
                {...register('email')}
              />
              <button
                type="button"
                onClick={handleSendVerification}
                disabled={!email || !!errors.email || sendingCode || countdown > 0}
                className="px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {sendingCode ? '발송 중...' : countdown > 0 ? `재발송 (${countdown}초)` : '인증번호 발송'}
              </button>
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
            )}
          </div>

          {countdown > 0 && (
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                인증 코드
              </label>
              <div className="flex gap-2">
                <input
                  id="code"
                  type="text"
                  maxLength={6}
                  className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  placeholder="6자리 인증 코드"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                  disabled={verifyingCode}
                />
                <button
                  type="button"
                  onClick={handleVerifyCode}
                  disabled={verificationCode.length !== 6 || verifyingCode}
                  className="px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {verifyingCode ? '확인 중...' : '인증 확인'}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        // 회원 정보 입력 단계
        <div className="space-y-4">
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg dark:bg-green-900/20 dark:border-green-800">
            <p className="text-sm text-green-700 dark:text-green-400">
              이메일 인증 완료: {email}
            </p>
          </div>

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="실명을 입력하세요"
              {...register('name')}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              회사명 (선택)
            </label>
            <input
              id="companyName"
              type="text"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="회사명을 입력하세요"
              {...register('companyName')}
            />
            {errors.companyName && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.companyName.message}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              비밀번호 <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="비밀번호를 입력하세요"
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              대소문자, 숫자, 특수문자를 각 1개 이상 포함하여 8자 이상
            </p>
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              비밀번호 확인 <span className="text-red-500">*</span>
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-colors dark:bg-gray-800 dark:border-gray-600 dark:text-white"
              placeholder="비밀번호를 다시 입력하세요"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="space-y-3 border-t pt-4 dark:border-gray-700">
            <label className="flex items-start">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                {...register('termsAccepted')}
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                <span className="text-red-500">*</span> 서비스 이용약관 및 개인정보 처리방침에 동의합니다
                <a href="/terms" target="_blank" className="ml-1 text-primary hover:underline">
                  약관 보기
                </a>
              </span>
            </label>
            {errors.termsAccepted && (
              <p className="ml-6 text-sm text-red-600 dark:text-red-400">{errors.termsAccepted.message}</p>
            )}

            <label className="flex items-start">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary dark:bg-gray-700 dark:border-gray-600"
                {...register('marketingAccepted')}
              />
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                (선택) 마케팅 정보 수신에 동의합니다
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !termsAccepted}
            className="w-full px-4 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '회원가입 처리 중...' : '회원가입'}
          </button>
        </div>
      )}

      {errors.root && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400" role="alert">
          {errors.root.message}
        </div>
      )}

      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        이미 계정이 있으신가요?{' '}
        <a href="/login" className="font-medium text-primary hover:text-primary-dark">
          로그인
        </a>
      </div>
    </form>
  )
}