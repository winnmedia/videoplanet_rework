'use client'

import clsx from 'clsx'
import { useEffect, useRef } from 'react'

import type { SubMenuItem } from '@/entities/menu/model/types'
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation'

interface SubMenuProps {
  isOpen: boolean
  title: string
  items: SubMenuItem[]
  activeItemId?: string
  onClose: () => void
  onItemClick: (item: SubMenuItem) => void
  onCreateNew?: () => void
  className?: string
  'data-testid'?: string
}

export function SubMenu({
  isOpen,
  title,
  items,
  activeItemId,
  onClose,
  onItemClick,
  onCreateNew,
  className,
  'data-testid': testId = 'submenu'
}: SubMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)

  // Keyboard navigation hook
  const { focusedIndex, handleKeyDown } = useKeyboardNavigation({
    isOpen,
    items,
    onClose,
    onItemSelect: onItemClick
  })

  // Focus management
  useEffect(() => {
    if (isOpen && firstItemRef.current) {
      // Focus first item when submenu opens
      firstItemRef.current.focus()
    }
  }, [isOpen])

  // Click outside to close
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscapeKey)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscapeKey)
    }
  }, [isOpen, onClose])

  const renderStatusBadge = (status: SubMenuItem['status']) => {
    if (!status) return null
    
    const statusConfig = {
      active: { label: '진행중', className: 'bg-success-50 text-success-600' },
      completed: { label: '완료', className: 'bg-primary-50 text-primary-600' },
      pending: { label: '대기', className: 'bg-warning-50 text-warning-600' }
    }
    
    const config = statusConfig[status]
    if (!config) return null
    
    return (
      <span 
        className={clsx(
          'px-2 py-0.5 text-2xs font-medium rounded uppercase tracking-wide',
          config.className
        )}
        aria-label={`Status: ${status}`}
      >
        {config.label}
      </span>
    )
  }

  const renderEmptyState = () => (
    <div className="text-center py-12" role="alert">
      <div className="w-12 h-12 mx-auto mb-4 text-gray-300">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-gray-500 text-sm mb-6 leading-relaxed">
        등록된<br />
        프로젝트가 없습니다
      </p>
      {onCreateNew && (
        <button
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-600 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-colors duration-200"
          onClick={onCreateNew}
          type="button"
          aria-label="새 프로젝트 생성"
        >
          프로젝트 등록
        </button>
      )}
    </div>
  )

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop with proper z-index */}
      <div 
        className="fixed inset-0 bg-black/50 z-backdrop backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* SubMenu Panel - positioned after sidebar with higher z-index */}
      <nav
        ref={containerRef}
        className={clsx(
          'fixed top-0 h-full w-full bg-white shadow-xl z-45 overflow-y-auto overflow-x-hidden',
          'md:left-sidebar md:w-80 animate-slide-in-left motion-reduce:animate-none',
          className
        )}
        role="menu"
        aria-label={title}
        aria-orientation="vertical"
        data-testid={testId}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <header className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 truncate" id="submenu-title">
              {title}
            </h2>
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              {onCreateNew && items.length > 0 && (
                <button
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                  onClick={onCreateNew}
                  type="button"
                  aria-label="새 항목 추가"
                  data-testid="add-button"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
              
              <button
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
                onClick={onClose}
                type="button"
                aria-label="서브메뉴 닫기"
                data-testid="close-button"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Menu Items */}
        <div className="flex-1 px-6 py-4" role="none">
          {items.length === 0 ? renderEmptyState() : (
            <ul role="none" className="space-y-2">
              {items.map((item, index) => {
                const isActive = activeItemId === item.id
                const isFocused = focusedIndex === index
                
                return (
                  <li key={item.id} role="none">
                    <button
                      ref={index === 0 ? firstItemRef : undefined}
                      className={clsx(
                        'w-full text-left px-4 py-3 rounded-lg transition-all duration-200 min-h-12 group',
                        'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20',
                        isActive && 'bg-primary/5 ring-1 ring-primary/20',
                        isFocused && 'bg-gray-50'
                      )}
                      role="menuitem"
                      tabIndex={index === 0 ? 0 : -1}
                      onClick={() => onItemClick(item)}
                      aria-current={isActive ? 'page' : undefined}
                      data-testid={`menu-item-${item.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={clsx(
                          'flex-1 text-sm font-medium truncate pr-3',
                          isActive ? 'text-primary-600' : 'text-gray-700 group-hover:text-gray-900'
                        )}>
                          {item.name}
                        </span>
                        
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {renderStatusBadge(item.status)}
                          
                          {item.badge && item.badge > 0 && (
                            <span 
                              className="px-2 py-1 bg-primary text-white text-xs font-medium rounded-full min-w-5 text-center"
                              aria-label={`${item.badge} notifications`}
                            >
                              {item.badge > 9 ? '9+' : item.badge}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </nav>
    </>
  )
}