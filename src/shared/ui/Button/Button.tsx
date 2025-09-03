import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

// Button variants using class-variance-authority
const buttonVariants = cva(
  [
    // Base styles
    'inline-flex',
    'items-center',
    'justify-center',
    'rounded-md',
    'text-sm',
    'font-medium',
    'transition-colors',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-ring',
    'focus-visible:ring-offset-2',
    'disabled:pointer-events-none',
    'disabled:opacity-50',
    'disabled:cursor-not-allowed',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-primary',
          'text-white',
          'hover:bg-primary-dark',
          'active:bg-primary-dark',
        ],
        secondary: [
          'bg-secondary',
          'text-white',
          'hover:bg-secondary-dark',
          'active:bg-secondary-dark',
        ],
        accent: [
          'bg-accent',
          'text-white',
          'hover:bg-accent-dark',
          'active:bg-accent-dark',
        ],
        danger: [
          'bg-danger',
          'text-white',
          'hover:bg-danger-dark',
          'active:bg-danger-dark',
        ],
        outline: [
          'border',
          'border-gray-300',
          'bg-background',
          'text-foreground',
          'hover:bg-gray-50',
          'hover:text-accent-dark',
        ],
        ghost: [
          'hover:bg-gray-100',
          'hover:text-accent-dark',
          'text-foreground',
        ],
        link: [
          'text-primary',
          'underline-offset-4',
          'hover:underline',
        ],
      },
      size: {
        sm: ['h-9', 'px-3', 'text-sm'],
        md: ['h-10', 'px-4', 'text-sm'],
        lg: ['h-11', 'px-xl', 'py-lg', 'text-lg'],
        xl: ['h-12', 'px-6', 'text-base'],
        icon: ['h-10', 'w-10'],
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
)

// Loading spinner component
const Spinner = ({ className }: { className?: string }) => (
  <div
    role="progressbar"
    aria-label="Loading"
    className={clsx(
      'animate-spin rounded-full border-2 border-current border-t-transparent',
      className
    )}
  />
)

// Button props interface
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  as?: React.ElementType
  href?: string
  loading?: boolean
  children?: React.ReactNode
}

// Button component
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      as: Component = 'button',
      loading = false,
      disabled = false,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    // Common props for both button and other elements
    const commonProps = {
      className: clsx(buttonVariants({ variant, size }), className),
      'aria-disabled': isDisabled,
      ...(loading && { 'aria-busy': true }),
    }

    if (Component === 'button') {
      return (
        <button
          ref={ref}
          disabled={isDisabled}
          {...commonProps}
          {...props}
        >
          {loading && (
            <Spinner className="mr-2 h-4 w-4" />
          )}
          {children}
        </button>
      )
    }

    // For non-button elements (like links)
    return (
      <Component
        ref={ref}
        {...commonProps}
        {...props}
      >
        {loading && (
          <Spinner className="mr-2 h-4 w-4" />
        )}
        {children}
      </Component>
    )
  }
)

Button.displayName = 'Button'