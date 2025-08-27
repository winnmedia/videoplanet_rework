'use client'

import { useState, useCallback, useEffect } from 'react'
import type { SubMenuItem } from '@/entities/menu/model/types'

interface UseKeyboardNavigationProps {
  isOpen: boolean
  items: SubMenuItem[]
  onClose: () => void
  onItemSelect: (item: SubMenuItem) => void
}

export function useKeyboardNavigation({
  isOpen,
  items,
  onClose,
  onItemSelect
}: UseKeyboardNavigationProps) {
  const [focusedIndex, setFocusedIndex] = useState(0)

  // Reset focus when menu opens
  useEffect(() => {
    if (isOpen) {
      setFocusedIndex(0)
    }
  }, [isOpen])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen || items.length === 0) return

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        onClose()
        break

      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex(current => 
          current < items.length - 1 ? current + 1 : 0
        )
        break

      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex(current => 
          current > 0 ? current - 1 : items.length - 1
        )
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
        if (focusedIndex >= 0 && focusedIndex < items.length) {
          onItemSelect(items[focusedIndex])
        }
        break

      default:
        // Handle character navigation (first letter matching)
        if (event.key.length === 1 && event.key.match(/[a-zA-Z0-9]/)) {
          const char = event.key.toLowerCase()
          const currentIndex = focusedIndex
          
          // Find next item starting with this character
          let nextIndex = -1
          
          // Search from current position forward
          for (let i = currentIndex + 1; i < items.length; i++) {
            if (items[i].name.toLowerCase().startsWith(char)) {
              nextIndex = i
              break
            }
          }
          
          // If not found, search from beginning
          if (nextIndex === -1) {
            for (let i = 0; i <= currentIndex; i++) {
              if (items[i].name.toLowerCase().startsWith(char)) {
                nextIndex = i
                break
              }
            }
          }
          
          if (nextIndex !== -1) {
            setFocusedIndex(nextIndex)
          }
        }
        break
    }
  }, [isOpen, items, focusedIndex, onClose, onItemSelect])

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown
  }
}