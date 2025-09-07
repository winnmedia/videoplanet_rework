'use client'

import clsx from 'clsx'
import { useEffect, useRef, useState, useCallback } from 'react'

import type { SubMenuItem } from '@/entities/menu/model/types'

import { useKeyboardNavigation } from './hooks/useKeyboardNavigation'

interface SubMenuProps {
  isOpen: boolean
  title: string
  items: SubMenuItem[]
  activeItemId?: string
  isLoading?: boolean
  error?: string | null
  onClose: () => void
  onItemClick: (item: SubMenuItem) => void
  onCreateNew?: () => void
  onRetry?: () => void
  className?: string
  'data-testid'?: string
}

// Loading Skeleton for SubMenu Items
function SubMenuSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-2" data-testid="submenu-loading">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="p-3 bg-gray-50 rounded-lg animate-pulse"
        >
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
            <div className="w-6 h-6 bg-gray-200 rounded"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Error State Component
function SubMenuError({ 
  message, 
  onRetry 
}: { 
  message: string
  onRetry?: () => void 
}) {
  return (
    <div 
      className="p-6 text-center"
      data-testid="submenu-error"
      role="alert"
    >
      <div className="mb-4">
        <svg 
          className="mx-auto w-12 h-12 text-red-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 48 48"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" 
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        오류가 발생했습니다
      </h3>
      
      <p className="text-sm text-gray-600 mb-4">
        {message}
      </p>
      
      {onRetry && (
        <button
          onClick={onRetry}
          data-testid="retry-button"
          className={clsx(
            'inline-flex items-center px-4 py-2',
            'bg-red-600 text-white rounded-lg',
            'hover:bg-red-700 focus:bg-red-700',
            'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
            'transition-colors duration-200'
          )}
        >
          <svg 
            className="w-4 h-4 mr-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          다시 시도
        </button>
      )}
    </div>
  )
}

// Empty State Component with Enhanced Design
function SubMenuEmpty({ onCreateNew }: { onCreateNew?: () => void }) {
  return (
    <div className="p-8 text-center" role="region" aria-label="비어있는 상태">
      <div className="mb-6">
        <svg 
          className="mx-auto w-16 h-16 text-gray-300" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 48 48"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m-16-5c.835 0 1.643.051 2.395.144M12 28.395A28.93 28.93 0 0024 28c4.59 0 8.819.73 12 1.995" 
          />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        등록된 프로젝트가 없습니다
      </h3>
      
      <p className="text-sm text-gray-600 mb-6">
        새로운 프로젝트를 생성하여 시작해보세요.
      </p>
      
      {onCreateNew && (
        <button
          className={clsx(
            'inline-flex items-center px-6 py-3',
            'bg-blue-600 text-white rounded-lg',
            'hover:bg-blue-700 focus:bg-blue-700',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
            'transition-all duration-200',
            'shadow-sm hover:shadow-md'
          )}
          onClick={onCreateNew}
          aria-label="새 프로젝트 생성"
        >
          <svg 
            className="w-5 h-5 mr-2" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 4v16m8-8H4" 
            />
          </svg>
          프로젝트 등록
        </button>
      )}
    </div>
  )
}

export function SubMenuImproved({
  isOpen,
  title,
  items,
  activeItemId,
  isLoading = false,
  error = null,
  onClose,
  onItemClick,
  onCreateNew,
  onRetry,
  className,
  'data-testid': testId = 'submenu'
}: SubMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const firstItemRef = useRef<HTMLButtonElement>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [animationPhase, setAnimationPhase] = useState<'entering' | 'entered' | 'leaving'>('entering')

  // Keyboard navigation hook
  const { focusedIndex, handleKeyDown } = useKeyboardNavigation({
    isOpen,
    items,
    onClose,
    onItemSelect: onItemClick
  })

  // Animation management
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true)
      setAnimationPhase('entering')
      
      const timer = setTimeout(() => {
        setAnimationPhase('entered')
      }, 50)
      
      return () => clearTimeout(timer)
    } else {
      setAnimationPhase('leaving')
      const timer = setTimeout(() => {
        setIsVisible(false)
      }, 300)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen])

  // Focus management
  useEffect(() => {
    if (isOpen && animationPhase === 'entered' && firstItemRef.current && !isLoading && !error) {
      firstItemRef.current.focus()
    }
  }, [isOpen, animationPhase, isLoading, error])

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

  const renderStatusBadge = useCallback((status: SubMenuItem['status']) => {
    if (!status) return null
    
    const statusConfig = {
      active: { label: '진행중', className: 'bg-green-100 text-green-800' },
      completed: { label: '완료', className: 'bg-blue-100 text-blue-800' },
      pending: { label: '대기', className: 'bg-gray-100 text-gray-800' },
      'in-progress': { label: '진행중', className: 'bg-yellow-100 text-yellow-800' },
      draft: { label: '임시저장', className: 'bg-orange-100 text-orange-800' }
    }
    
    const config = statusConfig[status]
    
    return (
      <span 
        className={clsx(
          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
          config.className
        )}
        aria-label={`상태: ${config.label}`}
      >
        {config.label}
      </span>
    )
  }, [])

  if (!isVisible) return null

  return (
    <>
      {/* Enhanced Backdrop with Blur */}
      <div 
        className={clsx(
          'fixed inset-0 z-40 transition-all duration-300',
          animationPhase === 'entered' ? 'bg-black/60 backdrop-blur-sm' : 'bg-black/0 backdrop-blur-none'
        )}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* SubMenu Panel with Enhanced Animation */}
      <nav
        ref={containerRef}
        className={clsx(
          'fixed right-0 top-0 h-full w-96 max-w-[90vw]',
          'bg-white border-l border-gray-200 shadow-2xl',
          'z-50 flex flex-col overflow-hidden',
          'transition-transform duration-300 ease-out',
          animationPhase === 'entered' ? 'translate-x-0' : 'translate-x-full',
          className
        )}
        role="menu"
        aria-label={title}
        aria-orientation="vertical"
        aria-describedby="submenu-description"
        data-testid={testId}
        onKeyDown={handleKeyDown}
      >
        {/* Hidden Description for Screen Readers */}
        <div id="submenu-description" className="sr-only">
          {title} 서브메뉴입니다. 화살표 키로 탐색하고 Enter로 선택할 수 있습니다.
        </div>

        {/* Enhanced Header */}
        <header className="flex-shrink-0 px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900" id="submenu-title">
                {title}
              </h2>
              {items.length > 0 && (
                <p className="text-sm text-gray-600">
                  총 {items.length}개 항목
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Add Button */}
              {onCreateNew && items.length > 0 && !isLoading && !error && (
                <button
                  className={clsx(
                    'p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200',
                    'rounded-lg transition-colors duration-200',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                  )}
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
              
              {/* Close Button */}
              <button
                className={clsx(
                  'p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-200',
                  'rounded-lg transition-colors duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                )}
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

        {/* Content Area with Scroll */}
        <div 
          className="flex-1 overflow-y-auto"
          role="none"
        >
          {isLoading ? (
            <div className="p-6">
              <SubMenuSkeleton />
            </div>
          ) : error ? (
            <SubMenuError message={error} onRetry={onRetry} />
          ) : items.length === 0 ? (
            <SubMenuEmpty onCreateNew={onCreateNew} />
          ) : (
            <div className="p-4">
              <ul role="none" className="space-y-2">
                {items.map((item, index) => {
                  const isActive = activeItemId === item.id
                  const isFocused = focusedIndex === index
                  
                  return (
                    <li key={item.id} role="none">
                      <button
                        ref={index === 0 ? firstItemRef : undefined}
                        className={clsx(
                          'w-full p-4 text-left rounded-xl border transition-all duration-200',
                          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                          isActive && [
                            'bg-blue-50 border-blue-200 text-blue-900',
                            'shadow-sm ring-1 ring-blue-200'
                          ],
                          isFocused && 'ring-2 ring-blue-300 ring-offset-1',
                          !isActive && !isFocused && [
                            'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300',
                            'hover:shadow-sm'
                          ]
                        )}
                        role="menuitem"
                        tabIndex={index === 0 ? 0 : -1}
                        onClick={() => onItemClick(item)}
                        aria-current={isActive ? 'page' : undefined}
                        aria-describedby={`item-desc-${item.id}`}
                        data-testid={`menu-item-${item.id}`}
                      >
                        {/* Hidden Description */}
                        <span id={`item-desc-${item.id}`} className="sr-only">
                          {item.status && `상태: ${item.status}`}
                          {item.badge && `, ${item.badge}개 알림`}
                        </span>

                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                              {item.name}
                            </h3>
                            
                            {item.description && (
                              <p className="text-xs text-gray-600 line-clamp-2">
                                {item.description}
                              </p>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-2 ml-3">
                            {/* Status Badge */}
                            {renderStatusBadge(item.status)}
                            
                            {/* Notification Badge */}
                            {item.badge && item.badge > 0 && (
                              <span 
                                className="inline-flex items-center justify-center w-6 h-6 bg-red-500 text-white text-xs font-semibold rounded-full"
                                aria-label={`${item.badge}개 알림`}
                              >
                                {item.badge > 9 ? '9+' : item.badge}
                              </span>
                            )}
                            
                            {/* Arrow Icon */}
                            <svg 
                              className="w-4 h-4 text-gray-400" 
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth={2} 
                                d="M9 5l7 7-7 7" 
                              />
                            </svg>
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer with Additional Actions */}
        {!isLoading && !error && items.length > 0 && (
          <footer className="flex-shrink-0 p-4 bg-gray-50 border-t border-gray-200">
            <div className="text-xs text-gray-500 text-center">
              Esc 키를 누르면 닫을 수 있습니다
            </div>
          </footer>
        )}
      </nav>
    </>
  )
}