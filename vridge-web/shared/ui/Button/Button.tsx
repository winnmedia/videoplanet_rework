'use client'

import { ButtonHTMLAttributes, ReactNode } from 'react'
import clsx from 'clsx'

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
  
  // Variant styles using Tailwind CSS and design tokens
  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-600 focus:ring-primary/20',
    secondary: 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 focus:ring-neutral-500/20',
    outline: 'border border-neutral-300 text-neutral-700 hover:bg-neutral-50 focus:ring-neutral-500/20',
    danger: 'bg-error-500 text-white hover:bg-error-600 focus:ring-error-500/20',
    ghost: 'text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-500/20'
  }
  
  // Size styles using design tokens
  const sizeClasses = {
    sm: 'px-3 py-2 text-sm h-button-sm',
    md: 'px-4 py-2.5 text-base h-button',
    lg: 'px-6 py-3 text-lg h-button-lg'
  }
  
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium rounded-lg',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'disabled:pointer-events-none'
  ].join(' ')
  
  const classes = clsx(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full',
    loading && 'cursor-wait',
    className
  )
  
  const LoadingSpinner = () => (
    <svg 
      className="animate-spin -ml-1 mr-2 h-4 w-4" 
      fill="none" 
      viewBox="0 0 24 24"
    >
      <circle 
        className="opacity-25" 
        cx="12" 
        cy="12" 
        r="10" 
        stroke="currentColor" 
        strokeWidth="4"
      />
      <path 
        className="opacity-75" 
        fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
  
  const iconSpacing = icon ? (iconPosition === 'left' ? 'mr-2' : 'ml-2') : ''
  
  return (
    <button
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      aria-label={ariaLabel || (loading ? '처리 중' : undefined)}
      data-testid="button"
      {...props}
    >
      {loading && <LoadingSpinner />}
      {!loading && icon && iconPosition === 'left' && (
        <span className={iconSpacing}>{icon}</span>
      )}
      <span>{children}</span>
      {!loading && icon && iconPosition === 'right' && (
        <span className={iconSpacing}>{icon}</span>
      )}
    </button>
  )
}