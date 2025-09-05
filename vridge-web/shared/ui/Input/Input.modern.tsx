/**
 * @fileoverview 초미니멀 Input 컴포넌트 - Tailwind CSS 기반
 * @description VRidge 디자인 시스템의 핵심 Input 컴포넌트
 */

'use client'

import { cva, type VariantProps } from 'class-variance-authority'
import React, { forwardRef, InputHTMLAttributes, useId } from 'react'

import { cn } from '../../lib/utils'

// Input variants 정의 (CVA 사용)
const inputVariants = cva(
  // 기본 스타일 (초미니멀)
  [
    'block w-full rounded border',
    'font-medium',
    'transition-colors duration-200 ease-out',
    'focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:border-vridge-500',
    'placeholder:text-gray-400',
    'disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50'
  ],
  {
    variants: {
      size: {
        sm: 'h-8 px-2 text-sm',
        default: 'h-input px-3 text-base',
        lg: 'h-12 px-4 text-lg'
      },
      state: {
        default: 'border-gray-300 bg-white text-gray-900',
        error: 'border-error-500 bg-white text-gray-900 focus:ring-error-500 focus:border-error-500'
      },
      hasStartIcon: {
        true: {
          sm: 'pl-8',
          default: 'pl-10',
          lg: 'pl-12'
        }
      },
      hasEndIcon: {
        true: {
          sm: 'pr-8',
          default: 'pr-10',
          lg: 'pr-12'
        }
      }
    },
    defaultVariants: {
      size: 'default',
      state: 'default'
    }
  }
)

// 컨테이너 스타일
const containerVariants = cva('relative', {
  variants: {
    fullWidth: {
      true: 'w-full'
    }
  }
})

// 레이블 스타일
const labelVariants = cva([
  'block text-sm font-medium text-gray-700 mb-1.5'
])

// 아이콘 컨테이너 스타일
const iconVariants = cva([
  'absolute top-1/2 transform -translate-y-1/2',
  'pointer-events-none text-gray-400'
], {
  variants: {
    position: {
      start: {
        sm: 'left-2',
        default: 'left-3',
        lg: 'left-4'
      },
      end: {
        sm: 'right-2',
        default: 'right-3',
        lg: 'right-4'
      }
    },
    size: {
      sm: 'w-4 h-4',
      default: 'w-5 h-5',
      lg: 'w-6 h-6'
    }
  }
})

// 헬퍼 텍스트 스타일
const helperTextVariants = cva('mt-1.5 text-sm', {
  variants: {
    type: {
      helper: 'text-gray-500',
      error: 'text-error-500'
    }
  }
})

export interface InputProps 
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /**
   * 입력 필드 라벨
   */
  label?: string
  
  /**
   * 도움말 텍스트
   */
  helperText?: string
  
  /**
   * 에러 메시지 (존재할 경우 helperText를 대체)
   */
  error?: string
  
  /**
   * 필수 필드 여부
   */
  required?: boolean
  
  /**
   * 선택적 필드 여부 (required와 반대 개념)
   */
  optional?: boolean
  
  /**
   * 시작 아이콘
   */
  startIcon?: React.ReactNode
  
  /**
   * 끝 아이콘
   */
  endIcon?: React.ReactNode
  
  /**
   * 전체 너비 사용 여부
   */
  fullWidth?: boolean
  
  /**
   * 입력 필드 크기
   */
  size?: 'sm' | 'default' | 'lg'
}

/**
 * Input 컴포넌트
 * 
 * @description VRidge 디자인 시스템의 핵심 Input 컴포넌트
 * 초미니멀한 디자인과 완벽한 접근성을 제공합니다.
 * 
 * @example
 * ```tsx
 * <Input 
 *   label="이메일"
 *   type="email"
 *   placeholder="이메일을 입력하세요"
 *   required
 * />
 * 
 * <Input 
 *   label="검색"
 *   startIcon={<SearchIcon />}
 *   placeholder="검색어 입력..."
 * />
 * 
 * <Input 
 *   label="비밀번호"
 *   type="password"
 *   error="비밀번호가 일치하지 않습니다"
 * />
 * ```
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className,
    id,
    label,
    helperText,
    error,
    required = false,
    optional = false,
    startIcon,
    endIcon,
    fullWidth = false,
    size = 'default',
    disabled,
    'aria-describedby': ariaDescribedBy,
    ...props 
  }, ref) => {
    const generatedId = useId()
    const inputId = id || generatedId
    const helperTextId = `${inputId}-helper-text`
    const errorId = `${inputId}-error`
    
    const hasError = !!error
    const state = hasError ? 'error' : 'default'
    const hasStartIcon = !!startIcon
    const hasEndIcon = !!endIcon
    
    const describedBy = [
      ariaDescribedBy,
      hasError ? errorId : helperText ? helperTextId : undefined
    ].filter(Boolean).join(' ') || undefined

    return (
      <div className={cn(containerVariants({ fullWidth }))}>
        {/* 라벨 */}
        {label && (
          <label htmlFor={inputId} className={cn(labelVariants())}>
            {label}
            {required && <span className="text-error-500 ml-1">*</span>}
            {optional && <span className="text-gray-500 ml-1 text-sm">(선택)</span>}
          </label>
        )}
        
        {/* 입력 필드 컨테이너 */}
        <div className="relative">
          {/* 시작 아이콘 */}
          {startIcon && (
            <div className={cn(iconVariants({ position: 'start', size }))}>
              {startIcon}
            </div>
          )}
          
          {/* 입력 필드 */}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputVariants({ 
                size, 
                state,
                hasStartIcon: hasStartIcon ? true : undefined,
                hasEndIcon: hasEndIcon ? true : undefined
              }),
              className
            )}
            disabled={disabled}
            required={required}
            aria-invalid={hasError}
            aria-describedby={describedBy}
            aria-required={required}
            aria-disabled={disabled}
            {...props}
          />
          
          {/* 끝 아이콘 */}
          {endIcon && (
            <div className={cn(iconVariants({ position: 'end', size }))}>
              {endIcon}
            </div>
          )}
        </div>
        
        {/* 헬퍼 텍스트 / 에러 메시지 */}
        {(hasError || helperText) && (
          <div 
            id={hasError ? errorId : helperTextId}
            className={cn(helperTextVariants({ type: hasError ? 'error' : 'helper' }))}
          >
            {hasError ? error : helperText}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'