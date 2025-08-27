'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'

import styles from './Button.module.scss'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  children: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  disabled,
  children,
  'aria-label': ariaLabel,
  ...props
}: ButtonProps) {
  const classNames = [
    styles.button,
    styles[variant],
    styles[size],
    fullWidth && styles.fullWidth,
    loading && styles.loading,
    icon && styles.icon,
    className
  ].filter(Boolean).join(' ')
  
  const content = (
    <>
      {!loading && icon && iconPosition === 'left' && icon}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && icon}
    </>
  )
  
  return (
    <button
      className={classNames}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-label={ariaLabel || (loading ? '처리 중' : undefined)}
      {...props}
    >
      {content}
    </button>
  )
}