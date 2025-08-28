/**
 * @fileoverview 초미니멀 Button 컴포넌트 - Tailwind CSS 기반
 * @description VRidge 디자인 시스템의 핵심 Button 컴포넌트
 */

'use client'

import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// Button variants 정의 (CVA 사용)
const buttonVariants = cva(
  // 기본 스타일 (초미니멀)
  [
    'inline-flex items-center justify-center gap-2',
    'font-medium text-base leading-none',
    'border border-transparent rounded',
    'transition-colors duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:ring-offset-2',
    'active:scale-95 active:transition-transform active:duration-75',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-vridge-500 text-white',
          'hover:bg-vridge-600',
          'focus:ring-vridge-500'
        ],
        secondary: [
          'bg-gray-100 text-gray-900',
          'hover:bg-gray-200',
          'focus:ring-gray-500'
        ],
        outline: [
          'bg-transparent border-gray-300 text-gray-900',
          'hover:bg-gray-50 hover:border-gray-400',
          'focus:ring-gray-500'
        ],
        ghost: [
          'bg-transparent text-gray-900',
          'hover:bg-gray-50',
          'focus:ring-gray-500'
        ],
        destructive: [
          'bg-error-500 text-white',
          'hover:bg-error-600',
          'focus:ring-error-500'
        ]
      },
      size: {
        sm: [
          'h-button-sm px-3 text-sm',
          'gap-1.5'
        ],
        default: [
          'h-button px-4 text-base',
          'gap-2'
        ],
        lg: [
          'h-button-lg px-6 text-lg',
          'gap-2.5'
        ]
      },
      fullWidth: {
        true: 'w-full'
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default'
    }
  }
)

export interface ButtonProps 
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
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
    className="w-4 h-4 animate-spin"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
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
      d="M4 12a8 8 0 0 1 8-8v8H4z"
    />
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
  ({ 
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
  }, ref) => {
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
        className={cn(
          buttonVariants({ variant, size, fullWidth }),
          className
        )}
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