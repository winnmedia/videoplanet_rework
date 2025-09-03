import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { clsx } from 'clsx'

// Typography variants using class-variance-authority
const typographyVariants = cva([], {
  variants: {
    variant: {
      h1: [
        'text-4xl',
        'font-bold',
        'leading-tight',
        'text-foreground',
      ],
      h2: [
        'text-3xl',
        'font-bold',
        'leading-tight',
        'text-foreground',
      ],
      h3: [
        'text-2xl',
        'font-semibold',
        'leading-tight',
        'text-foreground',
      ],
      h4: [
        'text-xl',
        'font-semibold',
        'leading-snug',
        'text-foreground',
      ],
      h5: [
        'text-lg',
        'font-medium',
        'leading-snug',
        'text-foreground',
      ],
      h6: [
        'text-base',
        'font-medium',
        'leading-normal',
        'text-foreground',
      ],
      body: [
        'text-base',
        'leading-relaxed',
        'text-foreground',
      ],
      body2: [
        'text-sm',
        'leading-relaxed',
        'text-foreground',
      ],
      caption: [
        'text-xs',
        'leading-normal',
        'text-gray-600',
      ],
      overline: [
        'text-xs',
        'font-medium',
        'uppercase',
        'tracking-wider',
        'text-gray-500',
      ],
    },
    color: {
      default: '',
      primary: 'text-primary',
      secondary: 'text-secondary',
      accent: 'text-accent',
      danger: 'text-danger',
      warning: 'text-warning',
      info: 'text-info',
      success: 'text-success',
      muted: 'text-gray-500',
    },
    weight: {
      light: 'font-light',
      normal: 'font-normal',
      medium: 'font-medium',
      semibold: 'font-semibold',
      bold: 'font-bold',
    },
    align: {
      left: 'text-left',
      center: 'text-center',
      right: 'text-right',
      justify: 'text-justify',
    },
  },
  defaultVariants: {
    variant: 'body',
    color: 'default',
  },
})

// Element mapping for semantic HTML
const elementMap = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body: 'p',
  body2: 'p',
  caption: 'span',
  overline: 'span',
} as const

// Typography props interface
export interface TypographyProps
  extends Omit<React.HTMLAttributes<HTMLElement>, 'color'>,
    VariantProps<typeof typographyVariants> {
  as?: React.ElementType
  truncate?: boolean
  children?: React.ReactNode
}

// Typography component
export const Typography = React.forwardRef<HTMLElement, TypographyProps>(
  (
    {
      className,
      variant = 'body',
      color,
      weight,
      align,
      as,
      truncate = false,
      children,
      ...props
    },
    ref
  ) => {
    // Determine the element to render
    const Component = as || elementMap[variant as keyof typeof elementMap] || 'p'

    // Build className with variants and additional modifiers
    const computedClassName = clsx(
      typographyVariants({ variant, color, weight, align }),
      {
        truncate: truncate,
      },
      className
    )

    return (
      <Component
        ref={ref}
        className={computedClassName}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

Typography.displayName = 'Typography'