'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

import styles from './LoginForm.module.scss'
import { useAuth } from '../model/useAuth'

export function LoginForm() {
  const router = useRouter()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rememberEmail, setRememberEmail] = useState(false)

  // 컴포넌트 마운트 시 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem('rememberedEmail')
    if (savedEmail) {
      setEmail(savedEmail)
      setRememberEmail(true)
    }
  }, [])

  // 아이디 저장 체크박스 핸들러
  const handleRememberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    setRememberEmail(checked)
    
    if (!checked) {
      localStorage.removeItem('rememberedEmail')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      await login(email, password)
      
      // 로그인 성공 시 아이디 저장 처리
      if (rememberEmail) {
        localStorage.setItem('rememberedEmail', email)
      } else {
        localStorage.removeItem('rememberedEmail')
      }
      
      router.push('/dashboard')
    } catch {
      setError('로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.inputWrapper}>
        <input
          id="email"
          name="email"
          type="email"
          className={styles.input}
          autoComplete="email"
          required
          placeholder="이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-label="이메일 주소"
          aria-required="true"
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? 'error-message' : undefined}
          disabled={loading}
        />
      </div>
      
      <div className={styles.inputWrapper}>
        <input
          id="password"
          name="password"
          type="password"
          className={styles.input}
          autoComplete="current-password"
          required
          placeholder="비밀번호"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          aria-label="비밀번호"
          aria-required="true"
          aria-invalid={error ? 'true' : 'false'}
          disabled={loading}
        />
      </div>

      {error && (
        <div 
          id="error-message"
          className={styles.error}
          role="alert"
          aria-live="polite"
        >
          {error}
        </div>
      )}

      <div className={styles.checkboxWrapper}>
        <label htmlFor="remember-email" className={styles.checkboxLabel}>
          <input
            id="remember-email"
            name="remember-email"
            type="checkbox"
            className={styles.checkbox}
            checked={rememberEmail}
            onChange={handleRememberChange}
            disabled={loading}
          />
          <span className={styles.checkboxText}>아이디 저장</span>
        </label>
      </div>

      <button
        type="submit"
        className={`${styles.button} ${loading ? styles.loading : ''}`}
        disabled={loading}
        aria-busy={loading}
        aria-label={loading ? '로그인 처리 중' : '로그인'}
      >
        {loading ? '로그인 중...' : '로그인'}
      </button>
    </form>
  )
}