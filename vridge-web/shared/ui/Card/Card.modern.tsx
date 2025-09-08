/**
 * @fileoverview 초미니멀 Card 컴포넌트 - Tailwind CSS 기반
 * @description VRidge 디자인 시스템의 핵심 Card 컴포넌트
 */

'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import React, { forwardRef, HTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

// Card variants 정의 (CVA 사용)
const cardVariants = cva(
  // VRidge 레거시 Card 완전 재현 (초미니멀 세련됨)
  [
    // 기본 구조 (레거시 .card 매핑)
    'bg-white flex flex-col relative',
    
    // 레거시 transition (all 0.2s ease)
    'transition-all duration-200 ease-in-out',
    
    // 접근성
    'focus:outline-none'
  ],
  {
    variants: {
      variant: {
        default: [
          // 레거시 .default 완전 재현
          'bg-white border border-neutral-300',    // border: 1px solid $color-border
          'rounded-lg',                           // 기본 12px radius
          'shadow-sm'                             // 기본 그림자
        ],
        outline: [
          // 레거시 .outline 완전 재현
          'bg-transparent border-2 border-neutral-300', // border: 2px solid $color-border
          'rounded-lg'
        ],
        elevated: [
          // 레거시 .elevated 완전 재현
          'bg-white border border-transparent',
          'rounded-lg',
          'shadow-lg'                             // $shadow-lg
        ],
        ghost: [
          // 레거시 .ghost 완전 재현
          'bg-transparent border-none shadow-none',
          'rounded-lg'
        ],
        legacy: [
          // 레거시 .legacyStyle + .legacyRadius 완전 재현
          'bg-white border border-neutral-300',
          'rounded-2xl',                          // 20px radius (legacyRadius)
          'shadow-legacy'                         // 0 2px 8px rgba(0, 0, 0, 0.1)
        ]
      },
      padding: {
        none: 'p-0',
        sm: 'p-2',      // $spacing-sm: 8px
        default: 'p-4', // $spacing-md: 16px  
        lg: 'p-6'       // $spacing-lg: 24px
      },
      fullWidth: {
        true: 'w-full' // 레거시 .fullWidth 매핑
      }
    },
    defaultVariants: {
      variant: 'default',
      padding: 'default'
    }
  }
)

// 클릭 가능한 Card의 추가 스타일 (레거시 정확 매핑)
const clickableVariants = cva('', {
  variants: {
    clickable: {
      true: [
        'cursor-pointer',
        
        // 레거시 .hover:hover 완전 재현
        'hover:shadow-xl hover:-translate-y-0.5',   // translateY(-2px) + $shadow-xl
        
        // 포커스 스타일 (레거시 focus-visible 매핑)
        'focus-visible:ring-2 focus-visible:ring-vridge-500 focus-visible:ring-offset-2'
      ]
    },
    disabled: {
      true: [
        // 레거시 .disabled 완전 재현
        'opacity-60 cursor-not-allowed',            // opacity: 0.6
        
        // 호버 효과 비활성화
        'hover:shadow-sm hover:translate-y-0'
      ]
    },
    loading: {
      true: [
        // 레거시 .loading 완전 재현
        'pointer-events-none opacity-70'           // opacity: 0.7
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

    // 접근성 속성 설정 (React 19 호환)
    const accessibilityProps: React.HTMLAttributes<HTMLDivElement> = isInteractive ? {
      role: 'button',
      tabIndex: 0,
      onKeyDown: handleKeyDown,
      onClick: handleClick
    } : {}

    if (isDisabled) {
      accessibilityProps['aria-disabled'] = true
      accessibilityProps.tabIndex = -1
    }

    if (loading) {
      accessibilityProps['aria-busy'] = true
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