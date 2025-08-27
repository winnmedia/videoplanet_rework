'use client'

import React from 'react'
import styles from './Card.module.scss'

export interface CardProps {
  children: React.ReactNode
  variant?: 'default' | 'outline' | 'elevated' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  hover?: boolean
  fullWidth?: boolean
  header?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  style?: React.CSSProperties
  'data-testid'?: string
}

export const Card = React.memo(React.forwardRef<HTMLDivElement, CardProps>(
  function Card({
    children,
    variant = 'default',
    size = 'md',
    onClick,
    disabled = false,
    loading = false,
    hover = false,
    fullWidth = false,
    header,
    footer,
    className = '',
    style,
    'data-testid': testId,
    ...props
  }, ref) {
    const isClickable = !!onClick && !disabled && !loading
    const shouldHover = hover || isClickable
    
    const handleClick = () => {
      if (isClickable) {
        onClick()
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (isClickable && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        onClick()
      }
    }

    // TODO(human): Add validation for variant and size props
    const validVariants = ['default', 'outline', 'elevated', 'ghost']
    const validSizes = ['sm', 'md', 'lg']
    
    const safeVariant = validVariants.includes(variant) ? variant : 'default'
    const safeSize = validSizes.includes(size) ? size : 'md'
    
    const cardClasses = [
      styles.card,
      styles[safeVariant],
      styles[safeSize],
      styles.legacyStyle,
      styles.legacyRadius,
      shouldHover && styles.hover,
      isClickable && styles.clickable,
      disabled && styles.disabled,
      loading && styles.loading,
      fullWidth && styles.fullWidth,
      className
    ].filter(Boolean).join(' ')

    const cardProps: React.HTMLProps<HTMLDivElement> & { 'data-testid'?: string } = {
      ref,
      className: cardClasses,
      style,
      'data-testid': testId,
      ...props
    }

    if (isClickable) {
      cardProps.role = 'button'
      cardProps.tabIndex = 0
      cardProps.onClick = handleClick
      cardProps.onKeyDown = handleKeyDown
    }

    if (disabled) {
      cardProps['aria-disabled'] = 'true'
      cardProps.tabIndex = -1
    }

    if (loading) {
      cardProps['aria-busy'] = 'true'
    }

    return (
      <div {...cardProps}>
        {header && <div className={styles.header}>{header}</div>}
        <div className={styles.content}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    )
  }
))