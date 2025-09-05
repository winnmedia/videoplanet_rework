'use client'

import { memo } from 'react'

export interface HeaderItem {
  id: string
  label: string
  href?: string
  onClick?: () => void
  icon?: React.ReactNode
}

interface HeaderProps {
  leftItems?: HeaderItem[]
  rightItems?: HeaderItem[]
  className?: string
}

export const Header = memo(function Header({ 
  leftItems = [], 
  rightItems = [], 
  className = '' 
}: HeaderProps) {
  return (
    <header className={`bg-white shadow-sm border-b border-gray-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side items */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">VRidge</h1>
            </div>
            {leftItems.map((item) => (
              <HeaderItemComponent key={item.id} item={item} />
            ))}
          </div>

          {/* Right side items */}
          <div className="flex items-center space-x-4">
            {rightItems.map((item) => (
              <HeaderItemComponent key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </header>
  )
})

function HeaderItemComponent({ item }: { item: HeaderItem }) {
  const baseClasses = "inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
  
  if (item.href) {
    return (
      <a href={item.href} className={baseClasses}>
        {item.icon && <span className="mr-2">{item.icon}</span>}
        {item.label}
      </a>
    )
  }

  return (
    <button
      onClick={item.onClick}
      className={baseClasses}
    >
      {item.icon && <span className="mr-2">{item.icon}</span>}
      {item.label}
    </button>
  )
}