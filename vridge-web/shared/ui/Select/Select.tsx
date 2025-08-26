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
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <select
        id={id}
        className={cn(
          'block w-full px-3 py-2 border border-gray-300 bg-white',
          'rounded-md shadow-sm focus:outline-none focus:ring-blue-500',
          'focus:border-blue-500 sm:text-sm',
          error && 'border-red-500',
          className
        )}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}