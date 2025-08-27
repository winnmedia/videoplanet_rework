'use client'

import { 
  ReactNode, 
  useEffect, 
  useRef, 
  useState, 
  KeyboardEvent,
  MouseEvent,
  useId
} from 'react'
import { createPortal } from 'react-dom'

import styles from './ConfirmModal.module.scss'
import { Button } from '../Button/Button'

export interface ConfirmModalProps {
  /** 모달 열림 상태 */
  isOpen: boolean
  /** 모달 제목 */
  title: string
  /** 모달 메시지 (children이 있으면 무시됨) */
  message?: string
  /** 커스텀 내용 */
  children?: ReactNode
  /** 확인 버튼 텍스트 */
  confirmText?: string
  /** 취소 버튼 텍스트 */
  cancelText?: string
  /** 모달 변형 */
  variant?: 'default' | 'danger' | 'warning'
  /** 모달 크기 */
  size?: 'sm' | 'md' | 'lg'
  /** 로딩 상태 */
  loading?: boolean
  /** 아이콘 */
  icon?: ReactNode
  /** 백드롭 클릭으로 닫기 */
  closeOnBackdrop?: boolean
  /** ESC 키로 닫기 */
  closeOnEscape?: boolean
  /** 확인 버튼 클릭 핸들러 */
  onConfirm: () => void | Promise<void>
  /** 취소/닫기 버튼 클릭 핸들러 */
  onCancel: () => void
  /** 추가 클래스명 */
  className?: string
}

/**
 * ConfirmModal - 4개 모듈에서 공통 사용하는 확인 모달
 * 
 * @features
 * - 사용자 액션 확인 (삭제, 변경 등)
 * - 포커스 트랩 및 키보드 네비게이션
 * - 백드롭 클릭 및 ESC 키 지원
 * - 로딩 상태 및 에러 처리
 * - 접근성 완전 지원 (WCAG 2.1 AA)
 * - 애니메이션 및 reduced-motion 지원
 * - 레거시 디자인 토큰 100% 적용
 */
export function ConfirmModal({
  isOpen,
  title,
  message,
  children,
  confirmText = '확인',
  cancelText = '취소',
  variant = 'default',
  size = 'md',
  loading = false,
  icon,
  closeOnBackdrop = true,
  closeOnEscape = true,
  onConfirm,
  onCancel,
  className = ''
}: ConfirmModalProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<Element | null>(null)
  
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    // prefers-reduced-motion 감지
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches)
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  useEffect(() => {
    if (isOpen) {
      // 이전 포커스 저장
      previousFocus.current = document.activeElement
      
      setIsVisible(true)
      setIsAnimating(true)
      
      // 애니메이션 완료 후
      const timer = setTimeout(() => {
        setIsAnimating(false)
        // 첫 번째 버튼에 포커스
        const firstButton = modalRef.current?.querySelector('button')
        firstButton?.focus()
      }, reducedMotion ? 0 : 200)

      return () => clearTimeout(timer)
    } else {
      if (isVisible) {
        setIsAnimating(true)
        
        const timer = setTimeout(() => {
          setIsVisible(false)
          setIsAnimating(false)
          
          // 이전 포커스 복원
          if (previousFocus.current instanceof HTMLElement) {
            previousFocus.current.focus()
          }
        }, reducedMotion ? 0 : 200)

        return () => clearTimeout(timer)
      }
    }
  }, [isOpen, isVisible, reducedMotion])

  useEffect(() => {
    if (!isOpen || !closeOnEscape) return

    const handleEscape = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, closeOnEscape, onCancel])

  const handleBackdropClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onCancel()
    }
  }

  const handleConfirm = async () => {
    try {
      await onConfirm()
    } catch (error) {
      console.error('Error in onConfirm:', error)
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      // 포커스 트랩 구현
      const focusableElements = modalRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
      )
      
      if (!focusableElements || focusableElements.length === 0) return

      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }
  }

  if (!isVisible && !isAnimating) {
    return null
  }

  const classNames = [
    styles.modal,
    styles[size],
    styles[variant],
    isAnimating && (isOpen ? styles.entering : styles.exiting),
    reducedMotion && styles.reducedMotion,
    className
  ].filter(Boolean).join(' ')

  const content = (
    <div 
      className={styles.backdrop}
      onClick={handleBackdropClick}
      aria-hidden="true"
    >
      <div
        ref={modalRef}
        className={classNames}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={children ? undefined : descriptionId}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.header}>
          {icon && (
            <div className={styles.icon} aria-hidden="true">
              {icon}
            </div>
          )}
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
        </div>

        <div className={styles.content}>
          {children ? (
            children
          ) : (
            <p id={descriptionId} className={styles.message}>
              {message}
            </p>
          )}
        </div>

        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={loading}
            aria-label={cancelText}
          >
            {cancelText}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={handleConfirm}
            loading={loading}
            disabled={loading}
            aria-label={confirmText}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )

  return createPortal(content, document.body)
}