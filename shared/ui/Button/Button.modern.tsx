/**
 * @fileoverview 초미니멀 Button 컴포넌트 - Tailwind CSS 기반
 * @description VRidge 디자인 시스템의 핵심 Button 컴포넌트
 */

'use client'

import { type VariantProps } from 'class-variance-authority'
import React from 'react'
import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'

import { cn } from '../../lib/utils'

// Dynamic CVA import for bundle size optimization
let cvaFn: any = null
async function getCva() {
  if (!cvaFn) {
    const { cva } = await import('class-variance-authority')
    cvaFn = cva
  }
  return cvaFn
}

// Simplified base classes (essential only)
const baseButtonClasses =
  'relative inline-flex items-center justify-center font-semibold rounded-full border-none outline-none cursor-pointer transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'

// Essential variant styles (reduced from 40+ classes to core 15 classes)
const variantStyles = {
  primary:
    'bg-gradient-to-br from-vridge-500 to-vridge-700 text-white hover:from-vridge-700 hover:to-vridge-800 focus-visible:ring-vridge-500',
  secondary:
    'bg-white text-gray-900 border border-gray-300 hover:bg-gray-100 hover:border-vridge-500 hover:text-vridge-500 focus-visible:ring-gray-500',
  outline:
    'bg-transparent text-vridge-500 border-2 border-vridge-500 hover:bg-vridge-500/5 focus-visible:ring-vridge-500',
  danger:
    'bg-gradient-to-br from-error-500 to-error-600 text-white hover:from-error-600 hover:to-error-700 focus-visible:ring-error-500',
  ghost: 'bg-transparent text-gray-900 hover:bg-gray-900/5 active:bg-gray-900/10 focus-visible:ring-gray-500',
}

const sizeStyles = {
  sm: 'h-9 px-4 text-sm rounded-xl gap-1 sm:h-8 sm:px-2 sm:text-xs',
  default: 'h-11 px-6 text-base rounded-xl gap-2 sm:h-10 sm:px-4 sm:text-sm',
  lg: 'h-14 px-10 text-lg rounded-2xl gap-2 sm:h-12 sm:px-6 sm:text-base',
}

// Optimized button variants with reduced class count
const getButtonVariants = (variant: string = 'primary', size: string = 'default', fullWidth?: boolean) => {
  const variantClass = variantStyles[variant as keyof typeof variantStyles] || variantStyles.primary
  const sizeClass = sizeStyles[size as keyof typeof sizeStyles] || sizeStyles.default
  const widthClass = fullWidth ? 'w-full' : ''

  return `${baseButtonClasses} ${variantClass} ${sizeClass} ${widthClass}`.trim()
}

// Interface compatibility fixed - properly exposing all variant types
type ButtonVariantsType = {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
  size?: 'sm' | 'default' | 'lg'
  fullWidth?: boolean
}

// CVA compatibility type for backward compatibility
type ButtonVariants = ButtonVariantsType

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, ButtonVariantsType {
  /**
   * 버튼 내부에 표시될 콘텐츠
   */
  children: ReactNode

  /**
   * 로딩 상태 표시 여부
   */
  loading?: boolean

  /**
   * 아이콘 컴포넌트
   */
  icon?: ReactNode

  /**
   * 아이콘 위치
   */
  iconPosition?: 'left' | 'right'

  /**
   * 전체 너비 사용 여부
   */
  fullWidth?: boolean
}

/**
 * 로딩 스피너 컴포넌트
 */
const LoadingSpinner = () => (
  <svg
    role="status"
    aria-hidden="true"
    className="h-4 w-4 animate-spin"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8v8H4z" />
  </svg>
)

/**
 * Button 컴포넌트
 *
 * @description VRidge 디자인 시스템의 핵심 Button 컴포넌트
 * 초미니멀한 디자인과 완벽한 접근성을 제공합니다.
 *
 * @example
 * ```tsx
 * <Button variant="primary" size="default">
 *   클릭하세요
 * </Button>
 *
 * <Button variant="outline" loading>
 *   로딩 중...
 * </Button>
 *
 * <Button variant="ghost" icon={<Icon />} iconPosition="right">
 *   아이콘과 함께
 * </Button>
 * ```
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      fullWidth,
      loading = false,
      icon,
      iconPosition = 'left',
      disabled,
      children,
      onClick,
      'aria-label': ariaLabel,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (isDisabled) {
        e.preventDefault()
        return
      }
      onClick?.(e)
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (isDisabled) return

      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick(e as any)
      }
    }

    return (
      <button
        ref={ref}
        className={cn(getButtonVariants(variant, size, fullWidth), className)}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        aria-label={ariaLabel || (loading ? '처리 중' : undefined)}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        {...props}
      >
        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {icon && iconPosition === 'left' && icon}
            <span className="truncate">{children}</span>
            {icon && iconPosition === 'right' && icon}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
