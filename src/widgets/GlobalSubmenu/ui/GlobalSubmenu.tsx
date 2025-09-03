import React, { useRef, useEffect, useCallback } from 'react'
import { clsx } from 'clsx'
import { SubmenuItem } from './SubmenuItem'

export interface MenuItem {
  /** 메뉴 아이템 고유 식별자 */
  id: string
  /** 표시할 텍스트 */
  label: string
  /** 링크 URL (선택적) */
  href?: string
  /** 클릭 핸들러 (선택적) */
  onClick?: () => void
  /** 아이콘 컴포넌트 (선택적) */
  icon?: React.ReactNode
  /** 메뉴 아이템 변형 */
  variant?: 'default' | 'danger'
  /** 접근성 설명 */
  'aria-label'?: string
}

export interface GlobalSubmenuProps {
  /** 메뉴가 열려있는지 여부 */
  isOpen: boolean
  /** 메뉴 닫기 핸들러 */
  onClose: () => void
  /** 메뉴 아이템 목록 */
  items: MenuItem[]
  /** 메뉴 컨테이너 추가 클래스명 */
  className?: string
  /** 메뉴 위치 조정 */
  position?: 'left' | 'right'
  /** 트리거 요소 참조 (포커스 복원용) */
  triggerRef?: React.RefObject<HTMLElement>
}

export const GlobalSubmenu = React.forwardRef<HTMLDivElement, GlobalSubmenuProps>(
  ({ 
    isOpen, 
    onClose, 
    items, 
    className,
    position = 'right',
    triggerRef,
    ...rest 
  }, _ref) => {
    const menuRef = useRef<HTMLDivElement>(null)
    const firstItemRef = useRef<HTMLElement>(null)
    const lastItemRef = useRef<HTMLElement>(null)
    
    // 메뉴가 열릴 때 첫 번째 아이템에 포커스
    useEffect(() => {
      if (isOpen && firstItemRef.current) {
        // 다음 틴에서 포커스를 설정하여 애니메이션과 충돌 방지
        setTimeout(() => {
          firstItemRef.current?.focus()
        }, 100)
      }
    }, [isOpen])

    // 외부 클릭 감지
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const target = event.target as Node
        
        // 메뉴 외부 클릭 시 메뉴 닫기
        if (menuRef.current && !menuRef.current.contains(target)) {
          // 트리거 버튼 클릭이 아닌 경우에만 메뉴 닫기
          if (!triggerRef?.current?.contains(target)) {
            onClose()
          }
        }
      }

      if (isOpen) {
        // 이벤트 리스너를 지연 등록하여 초기 클릭 이벤트와 충돌 방지
        setTimeout(() => {
          document.addEventListener('mousedown', handleClickOutside)
        }, 100)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isOpen, onClose, triggerRef])

    // 키보드 네비게이션 처리
    const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
      if (!isOpen) return

      switch (event.key) {
        case 'Escape':
          event.preventDefault()
          onClose()
          // 포커스를 트리거 버튼으로 복원
          triggerRef?.current?.focus()
          break

        case 'ArrowDown':
          event.preventDefault()
          const currentElement = event.target as HTMLElement
          const menuItems = menuRef.current?.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLElement>
          
          if (menuItems) {
            const currentIndex = Array.from(menuItems).indexOf(currentElement)
            const nextIndex = (currentIndex + 1) % menuItems.length
            menuItems[nextIndex]?.focus()
          }
          break

        case 'ArrowUp':
          event.preventDefault()
          const currentEl = event.target as HTMLElement
          const items = menuRef.current?.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLElement>
          
          if (items) {
            const currentIdx = Array.from(items).indexOf(currentEl)
            const prevIndex = currentIdx <= 0 ? items.length - 1 : currentIdx - 1
            items[prevIndex]?.focus()
          }
          break

        case 'Home':
          event.preventDefault()
          firstItemRef.current?.focus()
          break

        case 'End':
          event.preventDefault()
          lastItemRef.current?.focus()
          break

        case 'Tab':
          event.preventDefault()
          // Tab 키로 포커스 트랩: 다음 아이템으로 이동
          const currentTabElement = event.target as HTMLElement
          const menuTabItems = menuRef.current?.querySelectorAll('[role="menuitem"]') as NodeListOf<HTMLElement>
          
          if (menuTabItems) {
            const currentTabIndex = Array.from(menuTabItems).indexOf(currentTabElement)
            if (event.shiftKey) {
              // Shift+Tab: 이전 아이템으로
              const prevTabIndex = currentTabIndex <= 0 ? menuTabItems.length - 1 : currentTabIndex - 1
              menuTabItems[prevTabIndex]?.focus()
            } else {
              // Tab: 다음 아이템으로
              const nextTabIndex = (currentTabIndex + 1) % menuTabItems.length
              menuTabItems[nextTabIndex]?.focus()
            }
          }
          break
      }
    }, [isOpen, onClose, triggerRef])

    // 메뉴 아이템 클릭 핸들러
    const handleItemClick = useCallback((item: MenuItem) => {
      return () => {
        item.onClick?.()
        onClose() // 메뉴 아이템 클릭 후 메뉴 닫기
      }
    }, [onClose])

    if (!isOpen) {
      return null
    }

    return (
      <div
        ref={menuRef}
        className={clsx(
          // Position and layout
          'absolute mt-2 w-48 z-50',
          {
            'right-0': position === 'right',
            'left-0': position === 'left',
          },
          // Appearance
          'bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5',
          // Transparency
          'opacity-90',
          // Animation
          'animate-fade-in',
          className
        )}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="user-menu-button"
        onKeyDown={handleKeyDown}
        {...(process.env.NODE_ENV === 'test' && { 'data-testid': 'global-submenu' })}
        {...rest}
      >
        <div className="py-1">
          {items.map((item, index) => {
            const isFirst = index === 0
            const isLast = index === items.length - 1

            return (
              <SubmenuItem
                key={item.id}
                ref={isFirst ? firstItemRef : isLast ? lastItemRef : undefined}
                href={item.href}
                onClick={item.href ? undefined : handleItemClick(item)}
                onKeyDown={handleKeyDown}
                variant={item.variant}
                icon={item.icon}
                aria-label={item['aria-label']}
                {...(process.env.NODE_ENV === 'test' && { 'data-testid': `submenu-item-${item.id}` })}
              >
                {item.label}
              </SubmenuItem>
            )
          })}
        </div>
      </div>
    )
  }
)

GlobalSubmenu.displayName = 'GlobalSubmenu'