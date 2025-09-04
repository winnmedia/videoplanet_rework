/**
 * @fileoverview 초미니멀 Button 컴포넌트 - Tailwind CSS 기반
 * @description VRidge 디자인 시스템의 핵심 Button 컴포넌트
 */

'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react'

import { cn } from '../../lib/utils'

// Button variants 정의 (CVA 사용)
const buttonVariants = cva(
  // VRidge 레거시 Button 완전 재현 (초미니멀 + 세련됨)
  [
    // 기본 구조 (@include button-base 매핑)
    'relative overflow-hidden',
    'inline-flex items-center justify-center',
    'font-semibold leading-none',
    'rounded-full border-none outline-none cursor-pointer',
    
    // VRidge 브랜드 전환 효과 (레거시 정확 매핑)
    'transition-all duration-200 ease-in-out',
    
    // 포커스 스타일 (레거시 @include focus-visible 매핑)
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vridge-500 focus-visible:ring-offset-2',
    
    // 액티브 상태 (레거시 scale 효과 정확 매핑)
    'active:scale-95 active:transition-transform active:duration-75',
    
    // 비활성화 상태
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
    
    // 리플 효과를 위한 기본 설정 (레거시 &::before 매핑)
    'before:absolute before:inset-1/2 before:w-0 before:h-0 before:rounded-full',
    'before:bg-white/50 before:-translate-x-1/2 before:-translate-y-1/2',
    'before:transition-all before:duration-[600ms]',
    'active:before:w-[300px] active:before:h-[300px]'
  ],
  {
    variants: {
      variant: {
        primary: [
          // 레거시 그라데이션 완전 재현 (135deg, primary → primary-dark)
          'bg-gradient-to-br from-vridge-500 to-vridge-700',
          'text-white',
          
          // 호버 효과 (레거시 hover-lift + 그라데이션 변경)
          'hover:from-vridge-700 hover:to-vridge-800',
          'hover:shadow-primary hover:-translate-y-0.5',
          'transition-transform transition-shadow',
          
          // 액티브 상태 (translate 원복)
          'active:translate-y-0',
          
          // 포커스 링 색상
          'focus-visible:ring-vridge-500'
        ],
        secondary: [
          // 레거시 secondary 완전 재현
          'bg-white text-neutral-950',
          'border border-neutral-300',
          
          // 호버 효과 (레거시 정확 매핑)
          'hover:bg-neutral-100 hover:border-vridge-500 hover:text-vridge-500',
          'hover:-translate-y-px hover:shadow-sm',
          
          // 액티브 상태
          'active:translate-y-0',
          
          // 리플 효과 색상
          'before:bg-vridge-500/20',
          
          // 포커스 링
          'focus-visible:ring-neutral-500'
        ],
        outline: [
          // 레거시 outline 완전 재현
          'bg-transparent text-vridge-500',
          'border-2 border-vridge-500',
          
          // 호버 효과
          'hover:bg-vridge-500/5 hover:-translate-y-px hover:shadow-sm',
          
          // 액티브 상태
          'active:translate-y-0',
          
          // 리플 효과 (레거시 rgba($color-primary, 0.2))
          'before:bg-vridge-500/20',
          
          // 포커스 링
          'focus-visible:ring-vridge-500'
        ],
        danger: [
          // 레거시 danger 완전 재현
          'bg-gradient-to-br from-error-500 to-error-600',
          'text-white',
          
          // 호버 효과 (error shadow 매핑)
          'hover:from-error-600 hover:to-error-700',
          'hover:shadow-[0_5px_20px_rgba(217,58,58,0.3)] hover:-translate-y-0.5',
          
          // 액티브 상태
          'active:translate-y-0',
          
          // 포커스 링
          'focus-visible:ring-error-500'
        ],
        ghost: [
          // 레거시 ghost 완전 재현
          'bg-transparent text-neutral-950',
          
          // 호버 효과 (rgba 정확 매핑)
          'hover:bg-neutral-950/5',
          
          // 액티브 상태
          'active:bg-neutral-950/10',
          
          // 포커스 링
          'focus-visible:ring-neutral-500'
        ]
      },
      size: {
        sm: [
          // 레거시 .sm 정확 매핑
          'h-9 px-4 text-sm',        // $button-height-sm: 36px, $spacing-md: 16px, $font-size-sm: 14px
          'rounded-xl',              // $radius-xl: 16px (레거시)
          'gap-1.5',                 // 6px gap
          
          // 모바일 대응 (레거시 @include mobile 매핑)
          'sm:h-8 sm:px-2 sm:text-xs' // 32px, 8px, 12px (모바일)
        ],
        default: [
          // 레거시 .md 정확 매핑 (기본값)
          'h-11 px-6 text-base',     // $button-height-md: 44px, $spacing-lg: 24px, $font-size-base: 16px
          'rounded-xl',              // $radius-xl: 16px
          'gap-2',                   // 8px gap
          
          // 모바일 대응
          'sm:h-10 sm:px-4 sm:text-sm' // 40px, 16px, 14px (모바일)
        ],
        lg: [
          // 레거시 .lg 정확 매핑
          'h-14 px-10 text-lg',      // $button-height-lg: 54px → 56px 근사, $spacing-2xl: 40px, $font-size-md: 18px
          'rounded-2xl',             // $radius-2xl: 20px (레거시)
          'gap-2.5',                 // 10px gap
          
          // 모바일 대응
          'sm:h-12 sm:px-6 sm:text-base' // 48px, 24px, 16px (모바일)
        ]
      },
      fullWidth: {
        true: 'w-full'              // 레거시 .fullWidth 매핑
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