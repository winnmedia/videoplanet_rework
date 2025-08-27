'use client'

import clsx from 'clsx'
import { useEffect, useRef } from 'react'

import type { SubMenuItem } from '@/entities/menu/model/types'

import { useKeyboardNavigation } from './hooks/useKeyboardNavigation'
import styles from './SubMenu.module.scss'

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
    
    return (
      <span 
        className={clsx(styles.statusBadge, styles[status])}
        aria-label={`Status: ${status}`}
      >
        {status === 'active' && '진행중'}
        {status === 'completed' && '완료'}
        {status === 'pending' && '대기'}
      </span>
    )
  }

  const renderEmptyState = () => (
    <div className={styles.emptyState} role="alert">
      <p className={styles.emptyMessage}>
        등록된<br />
        프로젝트가 없습니다
      </p>
      {onCreateNew && (
        <button
          className={styles.createButton}
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
      {/* Backdrop with 90% opacity as per DEVPLAN.md */}
      <div 
        className={styles.backdrop}
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* SubMenu Panel */}
      <nav
        ref={containerRef}
        className={clsx(styles.subMenu, className)}
        role="menu"
        aria-label={title}
        aria-orientation="vertical"
        data-testid={testId}
        onKeyDown={handleKeyDown}
      >
        {/* Header */}
        <header className={styles.header}>
          <h2 className={styles.title} id="submenu-title">
            {title}
          </h2>
          
          <div className={styles.actions}>
            {onCreateNew && items.length > 0 && (
              <button
                className={styles.actionButton}
                onClick={onCreateNew}
                type="button"
                aria-label="새 항목 추가"
                data-testid="add-button"
              >
                <span className={styles.plusIcon} aria-hidden="true">+</span>
              </button>
            )}
            
            <button
              className={clsx(styles.actionButton, styles.closeButton)}
              onClick={onClose}
              type="button"
              aria-label="서브메뉴 닫기"
              data-testid="close-button"
            >
              <span className={styles.closeIcon} aria-hidden="true">×</span>
            </button>
          </div>
        </header>

        {/* Menu Items */}
        <div className={styles.content} role="none">
          {items.length === 0 ? renderEmptyState() : (
            <ul role="none" className={styles.menuList}>
              {items.map((item, index) => {
                const isActive = activeItemId === item.id
                const isFocused = focusedIndex === index
                
                return (
                  <li key={item.id} role="none">
                    <button
                      ref={index === 0 ? firstItemRef : undefined}
                      className={clsx(styles.menuItem, {
                        [styles.active]: isActive,
                        [styles.focused]: isFocused
                      })}
                      role="menuitem"
                      tabIndex={index === 0 ? 0 : -1}
                      onClick={() => onItemClick(item)}
                      aria-current={isActive ? 'page' : undefined}
                      data-testid={`menu-item-${item.id}`}
                    >
                      <div className={styles.itemContent}>
                        <span className={styles.itemName}>
                          {item.name}
                        </span>
                        
                        <div className={styles.itemMeta}>
                          {renderStatusBadge(item.status)}
                          
                          {item.badge && item.badge > 0 && (
                            <span 
                              className={styles.badge}
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