'use client'

import clsx from 'clsx'
import { useEffect, useRef, memo } from 'react'

import { useGlobalSubMenuKeyboard } from './hooks/useGlobalSubMenuKeyboard'
import type { GlobalSubMenuProps } from './types'

export const GlobalSubMenu = memo(function GlobalSubMenu({
  isOpen,
  title,
  items,
  activeItemId,
  onClose,
  onItemClick,
  className,
  'data-testid': testId = 'global-submenu'
}: GlobalSubMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // 키보드 네비게이션 훅
  const { focusedIndex, handleKeyDown, setItemRef } = useGlobalSubMenuKeyboard({
    isOpen,
    items,
    onClose,
    onItemSelect: onItemClick
  })

  // 포커스 관리 - 메뉴가 열릴 때 첫 번째 항목에 포커스
  useEffect(() => {
    if (isOpen && items.length > 0) {
      // 약간의 지연을 두어 렌더링이 완료된 후 포커스
      const timer = setTimeout(() => {
        const firstItem = containerRef.current?.querySelector('[role="menuitem"]') as HTMLElement
        firstItem?.focus()
      }, 10)
      
      return () => clearTimeout(timer)
    }
  }, [isOpen, items.length])

  // 외부 클릭으로 닫기
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

  // 빈 상태 렌더링
  const renderEmptyState = () => (
    <div className="text-center py-8" role="alert">
      <div className="w-8 h-8 mx-auto mb-3 text-gray-400 dark:text-gray-500">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        항목이 없습니다
      </p>
    </div>
  )

  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* 배경 오버레이 */}
      <div 
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* 메뉴 패널 */}
      <div
        ref={containerRef}
        className={clsx(
          'fixed top-20 right-4 w-80 max-h-96 z-50',
          'bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm',
          'border border-gray-200/50 dark:border-gray-700/50',
          'rounded-lg shadow-xl',
          'overflow-hidden',
          'transition-all duration-200 ease-out',
          className
        )}
        role="menu"
        aria-label={title}
        aria-orientation="vertical"
        data-testid={testId}
        onKeyDown={handleKeyDown}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
            {title}
          </h2>
          <button
            ref={closeButtonRef}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100/50 dark:hover:bg-gray-700/50 rounded transition-colors"
            onClick={onClose}
            type="button"
            aria-label="메뉴 닫기"
            data-testid="global-submenu-close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 메뉴 항목들 */}
        <div className="max-h-80 overflow-y-auto overflow-x-hidden">
          {items.length === 0 ? renderEmptyState() : (
            <ul role="none" className="py-2">
              {items.map((item, index) => {
                const isActive = activeItemId === item.id
                const isFocused = focusedIndex === index
                
                return (
                  <li key={item.id} role="none">
                    <button
                      ref={setItemRef(index)}
                      className={clsx(
                        'w-full text-left px-4 py-3 transition-colors',
                        'hover:bg-gray-100/70 dark:hover:bg-gray-700/70',
                        'focus:outline-none focus:bg-gray-100/70 dark:focus:bg-gray-700/70',
                        isActive && 'bg-blue-50/70 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                        isFocused && !isActive && 'bg-gray-100/70 dark:bg-gray-700/70'
                      )}
                      role="menuitem"
                      tabIndex={index === 0 ? 0 : -1}
                      onClick={() => onItemClick(item)}
                      aria-current={isActive ? 'page' : undefined}
                      data-testid={`menu-item-${item.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3 min-w-0 flex-1">
                          {item.icon && (
                            <div className="w-4 h-4 text-gray-500 dark:text-gray-400 flex-shrink-0">
                              <i className={item.icon} />
                            </div>
                          )}
                          <span className={clsx(
                            'text-sm font-medium truncate',
                            isActive 
                              ? 'text-blue-700 dark:text-blue-300' 
                              : 'text-gray-700 dark:text-gray-200'
                          )}>
                            {item.name}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 flex-shrink-0">
                          {item.isNew && (
                            <span className="px-1.5 py-0.5 text-xs font-medium bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded">
                              NEW
                            </span>
                          )}
                          
                          {item.badge && item.badge > 0 && (
                            <span 
                              className="px-1.5 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full min-w-4 text-center"
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
      </div>
    </>
  )
})