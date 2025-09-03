import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

// Input variants using class-variance-authority
const inputVariants = cva(
  [
    // Base styles
    'w-full',
    'px-3',
    'border',
    'border-gray-300',
    'rounded-md',
    'text-foreground',
    'placeholder-gray-400',
    'transition-colors',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-primary',
    'focus:border-transparent',
    'disabled:bg-gray-100',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
  ],
  {
    variants: {
      size: {
        sm: ['h-9', 'text-sm', 'px-3'],
        md: ['h-10', 'text-sm', 'px-3'],
        lg: ['h-11', 'text-base', 'px-4'],
      },
      variant: {
        default: ['border-gray-300', 'bg-background'],
        error: [
          'border-danger',
          'focus:ring-danger',
          'focus:border-danger',
          'bg-background',
        ],
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
)

const textareaVariants = cva(
  [
    // Base styles for textarea
    'w-full',
    'px-3',
    'py-2',
    'border',
    'border-gray-300',
    'rounded-md',
    'text-foreground',
    'placeholder-gray-400',
    'transition-colors',
    'focus:outline-none',
    'focus:ring-2',
    'focus:ring-primary',
    'focus:border-transparent',
    'disabled:bg-gray-100',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    'resize-none',
  ],
  {
    variants: {
      variant: {
        default: ['border-gray-300', 'bg-background'],
        error: [
          'border-danger',
          'focus:ring-danger',
          'focus:border-danger',
          'bg-background',
        ],
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

// Input props interface
export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label: string
  error?: string
  helperText?: string
  multiline?: boolean
  rows?: number
}

// Textarea props interface
interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
  label: string
  error?: string
  helperText?: string
  multiline: true
  rows?: number
}

// Combined props type
type CombinedProps = InputProps | TextareaProps

// Input component
export const Input = React.forwardRef<
  HTMLInputElement | HTMLTextAreaElement,
  CombinedProps
>(
  (
    {
      label,
      error,
      helperText,
      multiline = false,
      rows = 4,
      className,
      size,
      variant,
      required = false,
      disabled = false,
      id,
      ...props
    },
    ref
  ) => {
    // Generate unique IDs for accessibility
    const generatedId = React.useId()
    const inputId = id || `input-${generatedId}`
    const errorId = error ? `${inputId}-error` : undefined
    const helperTextId = helperText ? `${inputId}-helper` : undefined
    
    // Determine aria-describedby
    const describedBy = [helperTextId, errorId].filter(Boolean).join(' ') || undefined
    
    // Determine variant based on error state
    const computedVariant = error ? 'error' : variant || 'default'

    // Common props for both input and textarea
    const commonProps = {
      id: inputId,
      'aria-required': required,
      'aria-invalid': !!error,
      'aria-describedby': describedBy,
      disabled,
      ...props,
    }

    return (
      <div className="w-full">
        {/* Label */}
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-foreground mb-2"
        >
          {label}
          {required && (
            <span className="text-danger ml-1" aria-label="필수 항목">
              *
            </span>
          )}
        </label>

        {/* Input or Textarea */}
        {multiline ? (
          <textarea
            ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
            rows={rows}
            className={clsx(
              textareaVariants({ variant: computedVariant }),
              className
            )}
            {...(commonProps as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as React.ForwardedRef<HTMLInputElement>}
            className={clsx(
              inputVariants({ size, variant: computedVariant }),
              className
            )}
            {...(commonProps as React.InputHTMLAttributes<HTMLInputElement>)}
          />
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <div
            id={helperTextId}
            className="text-xs text-gray-500 mt-1"
          >
            {helperText}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div
            id={errorId}
            role="alert"
            aria-live="polite"
            className="text-danger text-sm mt-1"
          >
            {error}
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'