import { useEffect, useState, useCallback, useRef } from 'react'

import type { GlobalSubMenuItem } from '../types'

interface UseGlobalSubMenuKeyboardProps {
  isOpen: boolean
  items: GlobalSubMenuItem[]
  onClose: () => void
  onItemSelect: (item: GlobalSubMenuItem) => void
}

export function useGlobalSubMenuKeyboard({
  isOpen,
  items,
  onClose,
  onItemSelect
}: UseGlobalSubMenuKeyboardProps) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const itemRefs = useRef<(HTMLElement | null)[]>([])

  // 첫 번째 항목으로 포커스 초기화
  useEffect(() => {
    if (isOpen && items.length > 0) {
      setFocusedIndex(0)
    }
  }, [isOpen, items.length])

  // 포커스된 항목에 실제 포커스 적용
  useEffect(() => {
    if (isOpen && itemRefs.current[focusedIndex]) {
      itemRefs.current[focusedIndex]?.focus()
    }
  }, [focusedIndex, isOpen])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen || items.length === 0) return

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        onClose()
        break

      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex(prev => (prev + 1) % items.length)
        break

      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex(prev => (prev - 1 + items.length) % items.length)
        break

      case 'Home':
        event.preventDefault()
        setFocusedIndex(0)
        break

      case 'End':
        event.preventDefault()
        setFocusedIndex(items.length - 1)
        break

      case 'Enter':
      case ' ':
        event.preventDefault()
        if (items[focusedIndex]) {
          onItemSelect(items[focusedIndex])
        }
        break

      case 'Tab':
        // 포커스 트랩 구현
        const focusableElements = [
          ...itemRefs.current.filter(Boolean),
          document.querySelector('[data-testid="global-submenu-close"]')
        ].filter(Boolean)

        const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement)
        
        if (event.shiftKey) {
          // Shift+Tab (역방향)
          event.preventDefault()
          const prevIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length
          ;(focusableElements[prevIndex] as HTMLElement)?.focus()
        } else {
          // Tab (정방향)
          event.preventDefault()
          const nextIndex = (currentIndex + 1) % focusableElements.length
          ;(focusableElements[nextIndex] as HTMLElement)?.focus()
        }
        break
    }
  }, [isOpen, items, focusedIndex, onClose, onItemSelect])

  const setItemRef = useCallback((index: number) => (element: HTMLElement | null) => {
    itemRefs.current[index] = element
  }, [])

  return {
    focusedIndex,
    handleKeyDown,
    setItemRef
  }
}