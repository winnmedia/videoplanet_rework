/**
 * @fileoverview 초미니멀 Card 컴포넌트 - Tailwind CSS 기반
 * @description VRidge 디자인 시스템의 핵심 Card 컴포넌트
 */

'use client'

import React, { forwardRef, HTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// Card variants 정의 (CVA 사용)
const cardVariants = cva(
  // 기본 스타일 (초미니멀)
  [
    'rounded-lg',
    'transition-all duration-200 ease-out',
    'focus:outline-none'
  ],
  {
    variants: {
      variant: {
        default: [
          'bg-white border border-gray-200',
          'shadow-sm'
        ],
        outlined: [
          'bg-transparent border-2 border-gray-300'
        ],
        filled: [
          'bg-gray-50 border border-transparent'
        ],
        elevated: [
          'bg-white shadow-md border border-transparent'
        ]
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        default: 'p-4',
        lg: 'p-6'
      },
      fullWidth: {
        true: 'w-full'
      }
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default'
    }
  }
)

// 클릭 가능한 Card의 추가 스타일
const clickableVariants = cva('', {
  variants: {
    clickable: {
      true: [
        'cursor-pointer',
        'hover:shadow-md',
        'active:scale-[0.98] active:transition-transform active:duration-75',
        'focus:ring-2 focus:ring-vridge-500 focus:ring-offset-2'
      ]
    },
    disabled: {
      true: [
        'opacity-50 cursor-not-allowed',
        'hover:shadow-sm active:scale-100'
      ]
    },
    loading: {
      true: [
        'animate-pulse cursor-wait'
      ]
    }
  }
})

export interface CardProps 
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'>,
    VariantProps<typeof cardVariants> {
  /**
   * 카드 내부에 표시될 콘텐츠
   */
  children: React.ReactNode
  
  /**
   * 카드 헤더 컴포넌트
   */
  header?: React.ReactNode
  
  /**
   * 카드 푸터 컴포넌트
   */
  footer?: React.ReactNode
  
  /**
   * 클릭 가능 여부
   */
  clickable?: boolean
  
  /**
   * 비활성화 여부
   */
  disabled?: boolean
  
  /**
   * 로딩 상태 표시 여부
   */
  loading?: boolean
  
  /**
   * 클릭 이벤트 핸들러
   */
  onClick?: () => void
  
  /**
   * 전체 너비 사용 여부
   */
  fullWidth?: boolean
}

/**
 * Card 컴포넌트
 * 
 * @description VRidge 디자인 시스템의 핵심 Card 컴포넌트
 * 초미니멀한 디자인과 완벽한 접근성을 제공합니다.
 * 
 * @example
 * ```tsx
 * <Card variant="default" padding="default">
 *   기본 카드
 * </Card>
 * 
 * <Card variant="outlined" clickable onClick={handleClick}>
 *   클릭 가능한 카드
 * </Card>
 * 
 * <Card 
 *   header={<h2>제목</h2>} 
 *   footer={<button>액션</button>}
 * >
 *   헤더와 푸터가 있는 카드
 * </Card>
 * ```
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className,
    variant,
    padding,
    fullWidth,
    clickable = false,
    disabled = false,
    loading = false,
    onClick,
    header,
    footer,
    children,
    style,
    'aria-label': ariaLabel,
    ...props 
  }, ref) => {
    const isInteractive = clickable && !disabled && !loading
    const isDisabled = disabled || loading
    
    const handleClick = () => {
      if (isInteractive && onClick) {
        onClick()
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isInteractive) return
      
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleClick()
      }
    }

    // 접근성 속성 설정
    const accessibilityProps = isInteractive ? {
      role: 'button',
      tabIndex: 0,
      onKeyDown: handleKeyDown,
      onClick: handleClick
    } : {}

    if (isDisabled) {
      accessibilityProps['aria-disabled'] = 'true'
      accessibilityProps.tabIndex = -1
    }

    if (loading) {
      accessibilityProps['aria-busy'] = 'true'
    }

    return (
      <div
        ref={ref}
        className={cn(
          cardVariants({ variant, padding, fullWidth }),
          clickableVariants({ 
            clickable: clickable ? true : false, 
            disabled: isDisabled ? true : false,
            loading: loading ? true : false 
          }),
          className
        )}
        style={style}
        aria-label={ariaLabel}
        {...accessibilityProps}
        {...props}
      >
        {header && (
          <div className="mb-4">
            {header}
          </div>
        )}
        
        <div>
          {children}
        </div>
        
        {footer && (
          <div className="mt-4">
            {footer}
          </div>
        )}
      </div>
    )
  }
)

Card.displayName = 'Card'