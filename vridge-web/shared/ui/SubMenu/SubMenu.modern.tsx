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
      active: { 
        label: '진행중', 
        className: 'bg-success-50 dark:bg-success-900/30 text-success-600 dark:text-success-400 border border-success-200 dark:border-success-800/50' 
      },
      completed: { 
        label: '완료', 
        className: 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/50' 
      },
      pending: { 
        label: '대기', 
        className: 'bg-warning-50 dark:bg-warning-900/30 text-warning-600 dark:text-warning-400 border border-warning-200 dark:border-warning-800/50' 
      },
      'in-progress': { 
        label: '진행중', 
        className: 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border border-yellow-200 dark:border-yellow-800/50' 
      },
      draft: { 
        label: '임시저장', 
        className: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50' 
      }
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
    <div className="text-center py-16" role="alert">
      <div className="w-16 h-16 mx-auto mb-6 text-gray-300 dark:text-gray-600">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-8 leading-relaxed">
        등록된<br />
        프로젝트가 없습니다
      </p>
      {onCreateNew && (
        <button
          className="px-6 py-3 bg-primary hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white text-sm font-medium rounded-xl shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all duration-200"
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
      {/* Backdrop - DEVPLAN.md 요구사항: 고급 블러 효과 */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-lg md:hidden z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* SubMenu Panel - DEVPLAN.md 핵심: 투명도 90% + 라이트/다크 일관성 */}
      <nav
        ref={containerRef}
        className={clsx(
          'fixed top-20 h-[calc(100vh-5rem)] w-80 overflow-y-auto overflow-x-hidden',
          // 🎯 DEVPLAN.md 핵심 요구사항: 투명도 90% (라이트/다크 일관)
          'bg-white/90 dark:bg-gray-900/90',
          'backdrop-blur-xl',
          'border border-gray-200/60 dark:border-gray-700/60',
          'shadow-2xl',
          'transition-all duration-300 ease-out',
          'left-[18.75rem] z-40',
          isOpen ? 'translate-x-0' : 'translate-x-[-100%]',
          'md:relative md:translate-x-0 md:shadow-xl md:border-l',
          className
        )}
        role="menu"
        aria-label={title}
        aria-orientation="vertical"
        data-testid={testId}
        onKeyDown={handleKeyDown}
      >
        {/* Header - 95% 투명도 + 다크모드 지원 */}
        <header className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200/60 dark:border-gray-700/60 px-6 py-5 z-10" role="banner" aria-label={title}>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white truncate" id="submenu-title">
              {title}
            </h2>
            
            <div className="flex items-center space-x-2 flex-shrink-0">
              {onCreateNew && items.length > 0 && (
                <button
                  className="p-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
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
                className="p-2.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/20"
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
        <div className="flex-1 px-6 py-6" role="none">
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
                        'w-full text-left px-4 py-4 rounded-xl transition-all duration-200 min-h-14 group',
                        'hover:bg-gray-50/80 dark:hover:bg-gray-800/40 focus:outline-none focus:ring-2 focus:ring-primary/20',
                        isActive && 'bg-primary/8 dark:bg-primary/12 ring-1 ring-primary/30 dark:ring-primary/50 shadow-sm',
                        isFocused && 'bg-gray-50/80 dark:bg-gray-800/40'
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
                          isActive 
                            ? 'text-primary-600 dark:text-primary-400' 
                            : 'text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white'
                        )}>
                          {item.name}
                        </span>
                        
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {renderStatusBadge(item.status)}
                          
                          {item.badge && item.badge > 0 && (
                            <span 
                              className="px-2.5 py-1 bg-primary dark:bg-primary-600 text-white text-xs font-medium rounded-full min-w-6 text-center shadow-sm"
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