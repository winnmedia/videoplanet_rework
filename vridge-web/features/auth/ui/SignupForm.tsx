'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

import styles from './SignupForm.module.scss'
import { useAuth } from '../model/useAuth'

export function SignupForm() {
  const router = useRouter()
  const { signup } = useAuth()
  const [email, setEmail] = useState('')
  const [authNumber, setAuthNumber] = useState('')
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [validEmail, setValidEmail] = useState(false)
  const [emailVerificationSent, setEmailVerificationSent] = useState(false)
  const [emailSendLoading, setEmailSendLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [canResend, setCanResend] = useState(true)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)

  // 카운트다운 타이머 시작
  const startCountdown = () => {
    setCountdown(60)
    setCanResend(false)
    
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          setCanResend(true)
          if (countdownRef.current) {
            clearInterval(countdownRef.current)
            countdownRef.current = null
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }
    }
  }, [])

  const handleSendVerification = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('올바른 이메일 주소를 입력해주세요.')
      return
    }

    setEmailSendLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          type: 'signup'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '인증 이메일 발송에 실패했습니다.')
      }

      setEmailVerificationSent(true)
      setError('')
      startCountdown() // 이메일 발송 성공 시 카운트다운 시작
      
      // 개발 모드에서 코드가 반환된 경우
      if (data.devCode) {
        console.log('🔑 개발 모드 인증번호:', data.devCode)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '인증 이메일 발송에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setEmailSendLoading(false)
    }
  }

  const handleVerifyEmail = async () => {
    if (!authNumber) {
      setError('인증번호를 입력해주세요.')
      return
    }

    try {
      const response = await fetch('/api/auth/send-verification', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code: authNumber,
          type: 'signup'
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '인증번호가 올바르지 않습니다.')
      }

      setValidEmail(true)
      setError('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '인증번호가 올바르지 않습니다.')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validEmail) {
      setError('이메일 인증을 완료해주세요.')
      return
    }

    if (nickname.length < 2) {
      setError('닉네임은 최소 2자 이상 입력해주세요.')
      return
    }

    if (password.length < 10) {
      setError('비밀번호는 최소 10자 이상 입력해주세요.')
      return
    }

    if (password !== passwordConfirm) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      await signup({
        email,
        nickname,
        password,
        auth_number: authNumber
      })
      router.push('/dashboard')
    } catch {
      setError('회원가입에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {!validEmail ? (
        <>
          {/* 이메일 인증 단계 */}
          <div className={styles.inputWrapper}>
            <input
              type="email"
              className={styles.input}
              placeholder="이메일"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={emailVerificationSent || emailSendLoading}
              required
            />
            {!emailVerificationSent && (
              <button
                type="button"
                className={styles.verifyButton}
                onClick={handleSendVerification}
                disabled={emailSendLoading || !email}
              >
                {emailSendLoading ? '발송 중...' : '인증번호 발송'}
              </button>
            )}
            
            {emailVerificationSent && (
              <button
                type="button"
                className={`${styles.verifyButton} ${!canResend ? styles.disabled : ''}`}
                onClick={handleSendVerification}
                disabled={emailSendLoading || !canResend}
              >
                {emailSendLoading ? '발송 중...' : 
                 !canResend ? `재발송 (${countdown}초)` : '인증번호 재발송'}
              </button>
            )}
          </div>

          {emailVerificationSent && (
            <div className={styles.inputWrapper}>
              <input
                type="text"
                className={styles.input}
                placeholder="인증번호 입력"
                value={authNumber}
                onChange={(e) => setAuthNumber(e.target.value)}
                maxLength={6}
              />
              <button
                type="button"
                className={styles.verifyButton}
                onClick={handleVerifyEmail}
                disabled={!authNumber}
              >
                인증 확인
              </button>
            </div>
          )}
        </>
      ) : (
        <>
          {/* 회원가입 정보 입력 단계 */}
          <div className={styles.inputWrapper}>
            <input
              type="text"
              className={styles.input}
              placeholder="닉네임 입력 (최소 2자)"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={10}
              required
            />
          </div>
          
          <div className={styles.inputWrapper}>
            <input
              type="password"
              className={styles.input}
              placeholder="비밀번호 입력 (최소 10자)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              maxLength={20}
              required
            />
          </div>

          <div className={styles.inputWrapper}>
            <input
              type="password"
              className={styles.input}
              placeholder="비밀번호 확인"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              maxLength={20}
              required
            />
          </div>
        </>
      )}

      {error && (
        <div 
          className={styles.error}
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      {validEmail && (
        <button
          type="submit"
          className={`${styles.button} ${loading ? styles.loading : ''}`}
          disabled={loading || nickname.length < 2 || password.length < 10 || password !== passwordConfirm}
          aria-busy={loading}
          aria-label={loading ? '회원가입 처리 중' : '회원가입'}
        >
          {loading ? '가입 중...' : '회원가입'}
        </button>
      )}
    </form>
  )
}