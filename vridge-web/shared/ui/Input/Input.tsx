'use client'

import { InputHTMLAttributes } from 'react'

import { cn } from '@/shared/lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export function Input({
  label,
  error,
  className,
  id,
  ...props
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input
        id={id}
        className={cn(
          'appearance-none relative block w-full px-3 py-2 border border-gray-300',
          'placeholder-gray-500 text-gray-900 rounded-md',
          'focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm',
          error && 'border-red-500',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  )
}