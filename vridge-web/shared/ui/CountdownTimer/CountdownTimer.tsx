/**
 * CountdownTimer Component
 * 이메일 인증번호 만료시간을 표시하는 카운트다운 타이머
 */

import { useEffect, useState, useCallback } from 'react'
import styles from './CountdownTimer.module.scss'

export interface CountdownTimerProps {
  /** 초기 시간 (초 단위) */
  initialSeconds: number
  /** 타이머 만료 시 실행할 콜백 */
  onExpire?: () => void
  /** 매초마다 실행할 콜백 (남은 시간 전달) */
  onChange?: (remainingSeconds: number) => void
  /** 타이머 리셋 트리거 */
  reset?: boolean
  /** 추가 CSS 클래스 */
  className?: string
}

export function CountdownTimer({
  initialSeconds,
  onExpire,
  onChange,
  reset = false,
  className = ''
}: CountdownTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState(() => 
    Math.max(0, Math.floor(initialSeconds))
  )
  const [isExpired, setIsExpired] = useState(false)

  // 시간 포맷팅 함수
  const formatTime = useCallback((seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }, [])

  // ARIA 레이블 생성
  const getAriaLabel = useCallback((seconds: number): string => {
    if (seconds === 0) {
      return '인증번호가 만료되었습니다'
    }
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `인증번호 유효시간: ${minutes}분 ${remainingSeconds}초`
  }, [])

  // 타이머 리셋 처리
  useEffect(() => {
    if (reset) {
      setRemainingSeconds(Math.max(0, Math.floor(initialSeconds)))
      setIsExpired(false)
    }
  }, [reset, initialSeconds])

  // initialSeconds 변경 시 타이머 재시작
  useEffect(() => {
    setRemainingSeconds(Math.max(0, Math.floor(initialSeconds)))
    setIsExpired(false)
  }, [initialSeconds])

  // 카운트다운 타이머 효과
  useEffect(() => {
    if (remainingSeconds <= 0) {
      if (!isExpired) {
        setIsExpired(true)
        onExpire?.()
      }
      return
    }

    const timer = setInterval(() => {
      setRemainingSeconds((prev) => {
        const newSeconds = prev - 1
        
        if (newSeconds <= 0) {
          setIsExpired(true)
          onExpire?.()
          return 0
        }

        onChange?.(newSeconds)
        return newSeconds
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [remainingSeconds, onExpire, onChange, isExpired])

  // CSS 클래스 결정
  const getTimerClasses = () => {
    const classes = ['countdown-timer']
    
    if (className) {
      classes.push(className)
    }
    
    if (isExpired || remainingSeconds === 0) {
      classes.push('expired')
    } else if (remainingSeconds < 30) {
      classes.push('warning')
    }

    return classes.join(' ')
  }

  return (
    <span
      className={getTimerClasses()}
      aria-label={getAriaLabel(remainingSeconds)}
      aria-live="polite"
    >
      {formatTime(remainingSeconds)}
    </span>
  )
}