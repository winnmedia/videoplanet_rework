'use client'

import React, { useState, useEffect, useRef } from 'react'

import styles from './Toast.module.scss'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastProps {
  id: string
  message: string
  type: ToastType
  duration?: number
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  action?: {
    text: string
    onClick: () => void
  }
  onRemove: (id: string) => void
}

export interface ToastContainerProps {
  toasts: Array<{
    id: string
    message: string
    type: ToastType
    duration?: number
    action?: {
      text: string
      onClick: () => void
    }
  }>
  onRemove: (id: string) => void
  maxToasts?: number
}

export const Toast = React.memo(function Toast({ 
  id, 
  message,
  type,
  duration = 5000,
  position = 'top-right',
  action,
  onRemove
}: ToastProps) {
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  
  const startTimer = () => {
    if (duration > 0) {
      timerRef.current = setTimeout(() => {
        onRemove(id)
      }, duration)
    }
  }

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    if (!isPaused) {
      startTimer()
    } else {
      clearTimer()
    }

    return () => clearTimer()
  }, [id, duration, onRemove, isPaused])

  const handleClose = () => {
    onRemove(id)
  }

  const handleMouseEnter = () => {
    setIsPaused(true)
  }

  const handleMouseLeave = () => {
    setIsPaused(false)
  }

  const typeIcons = {
    success: <span data-testid="success-icon">✓</span>,
    error: <span data-testid="error-icon">✕</span>,
    warning: <span data-testid="warning-icon">⚠</span>,
    info: <span data-testid="info-icon">ℹ</span>
  }

  // TODO(human): Add safe media query handling for test environment
  const isReducedMotion = typeof window !== 'undefined' && 
    window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches

  const positionClasses = {
    'top-right': styles.topright,
    'top-left': styles.topleft,
    'bottom-right': styles.bottomright,
    'bottom-left': styles.bottomleft
  }

  const toastClasses = [
    styles.toast,
    styles[type],
    styles.entering,
    positionClasses[position],
    isReducedMotion && styles.reducedMotion
  ].filter(Boolean).join(' ')

  return (
    <div 
      className={toastClasses}
      role={type === 'error' ? 'alertdialog' : 'alert'}
      aria-live="assertive"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.icon} aria-hidden="true">
        {typeIcons[type]}
      </div>
      <div className={styles.content}>
        <div className={styles.message}>{message}</div>
      </div>
      <div className={styles.actions}>
        {action && (
          <button 
            className={styles.actionButton}
            onClick={action.onClick}
            type="button"
          >
            {action.text}
          </button>
        )}
        <button 
          className={styles.closeButton}
          onClick={handleClose}
          aria-label="알림 닫기"
          type="button"
        >
          ×
        </button>
      </div>
    </div>
  )
})

export function ToastContainer({ 
  toasts, 
  onRemove, 
  maxToasts = 5 
}: ToastContainerProps) {
  const displayedToasts = toasts.slice(0, maxToasts)
  
  if (displayedToasts.length === 0) {
    return null
  }

  return (
    <div 
      className={styles.container}
      data-testid="toast-container"
    >
      {displayedToasts.map(toast => (
        <Toast 
          key={toast.id} 
          id={toast.id}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          action={toast.action}
          onRemove={onRemove}
        />
      ))}
    </div>
  )
}

// Toast 유틸리티 함수 인터페이스 정의
interface ToastItem {
  id: string
  type: ToastType
  message: string
  duration?: number
  action?: {
    text: string
    onClick: () => void
  }
}

let addToastFunction: ((toast: ToastItem) => void) | null = null

export const toast = {
  success: (message: string, options?: { duration?: number, action?: { text: string, onClick: () => void } }) => {
    if (addToastFunction) {
      addToastFunction({
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'success',
        message,
        duration: options?.duration || 5000,
        action: options?.action
      })
    }
  },
  error: (message: string, options?: { duration?: number, action?: { text: string, onClick: () => void } }) => {
    if (addToastFunction) {
      addToastFunction({
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'error',
        message,
        duration: options?.duration || 7000,
        action: options?.action
      })
    }
  },
  warning: (message: string, options?: { duration?: number, action?: { text: string, onClick: () => void } }) => {
    if (addToastFunction) {
      addToastFunction({
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'warning',
        message,
        duration: options?.duration || 6000,
        action: options?.action
      })
    }
  },
  info: (message: string, options?: { duration?: number, action?: { text: string, onClick: () => void } }) => {
    if (addToastFunction) {
      addToastFunction({
        id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'info',
        message,
        duration: options?.duration || 5000,
        action: options?.action
      })
    }
  },
  setAddFunction: (fn: (toast: ToastItem) => void) => {
    addToastFunction = fn
  }
}