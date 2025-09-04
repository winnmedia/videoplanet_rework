'use client'

import { SelectHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/utils'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: SelectOption[]
  label?: string
  error?: string
}

export function Select({
  options,
  label,
  error,
  className,
  id,
  ...props
}: SelectProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-neutral-700 mb-1">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'block w-full px-3 py-2.5 border border-neutral-300 bg-white',
          'rounded-lg shadow-sm transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary',
          'hover:border-neutral-400',
          'h-input text-base',
          error && 'border-error-500 focus:ring-error-500/20 focus:border-error-500',
          className
        )}
        data-testid="select"
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-error-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}