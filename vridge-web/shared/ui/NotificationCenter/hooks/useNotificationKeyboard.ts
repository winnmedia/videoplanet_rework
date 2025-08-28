import { useEffect, useState, useCallback, useRef } from 'react'
import type { Notification } from '../types'

interface UseNotificationKeyboardProps {
  isOpen: boolean
  notifications: Notification[]
  onClose: () => void
  onNotificationClick: (notification: Notification) => void
}

export function useNotificationKeyboard({
  isOpen,
  notifications,
  onClose,
  onNotificationClick
}: UseNotificationKeyboardProps) {
  const [focusedIndex, setFocusedIndex] = useState(0)
  const notificationRefs = useRef<(HTMLElement | null)[]>([])
  const refreshButtonRef = useRef<HTMLButtonElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  // 알림 센터가 열릴 때 포커스 초기화
  useEffect(() => {
    if (isOpen) {
      if (notifications.length > 0) {
        setFocusedIndex(0)
      }
    }
  }, [isOpen, notifications.length])

  // 포커스된 항목에 실제 포커스 적용
  useEffect(() => {
    if (isOpen && notificationRefs.current[focusedIndex]) {
      notificationRefs.current[focusedIndex]?.focus()
    }
  }, [focusedIndex, isOpen])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        onClose()
        break

      case 'ArrowDown':
        event.preventDefault()
        if (notifications.length > 0) {
          setFocusedIndex(prev => (prev + 1) % notifications.length)
        }
        break

      case 'ArrowUp':
        event.preventDefault()
        if (notifications.length > 0) {
          setFocusedIndex(prev => (prev - 1 + notifications.length) % notifications.length)
        }
        break

      case 'Home':
        event.preventDefault()
        if (notifications.length > 0) {
          setFocusedIndex(0)
        }
        break

      case 'End':
        event.preventDefault()
        if (notifications.length > 0) {
          setFocusedIndex(notifications.length - 1)
        }
        break

      case 'Enter':
      case ' ':
        event.preventDefault()
        if (notifications[focusedIndex]) {
          onNotificationClick(notifications[focusedIndex])
        }
        break

      case 'Tab':
        // 포커스 트랩 구현
        const focusableElements = [
          refreshButtonRef.current,
          closeButtonRef.current,
          ...notificationRefs.current.filter(Boolean)
        ].filter(Boolean) as HTMLElement[]

        const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement)
        
        if (event.shiftKey) {
          // Shift+Tab (역방향)
          event.preventDefault()
          const prevIndex = (currentIndex - 1 + focusableElements.length) % focusableElements.length
          focusableElements[prevIndex]?.focus()
        } else {
          // Tab (정방향)
          event.preventDefault()
          const nextIndex = (currentIndex + 1) % focusableElements.length
          focusableElements[nextIndex]?.focus()
        }
        break
    }
  }, [isOpen, notifications, focusedIndex, onClose, onNotificationClick])

  const setNotificationRef = useCallback((index: number) => (element: HTMLElement | null) => {
    notificationRefs.current[index] = element
  }, [])

  return {
    focusedIndex,
    handleKeyDown,
    setNotificationRef,
    refreshButtonRef,
    closeButtonRef
  }
}