import type { NavigationState } from '../model/navigationStore'

export interface KeyboardNavigationConfig {
  trapFocus: boolean
  escapeToClose: boolean
  arrowNavigation: boolean
}

export const defaultKeyboardConfig: KeyboardNavigationConfig = {
  trapFocus: true,
  escapeToClose: true,
  arrowNavigation: true
}

export class KeyboardNavigationHandler {
  private config: KeyboardNavigationConfig
  private navigationStore: NavigationState
  private containerRef: React.RefObject<HTMLElement>

  constructor(
    navigationStore: NavigationState,
    containerRef: React.RefObject<HTMLElement>,
    config: KeyboardNavigationConfig = defaultKeyboardConfig
  ) {
    this.config = config
    this.navigationStore = navigationStore
    this.containerRef = containerRef
  }

  handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.navigationStore.isSubMenuOpen) return

    switch (event.key) {
      case 'Escape':
        if (this.config.escapeToClose) {
          event.preventDefault()
          this.navigationStore.closeSubMenu()
        }
        break

      case 'ArrowDown':
        if (this.config.arrowNavigation) {
          event.preventDefault()
          this.navigationStore.focusNext()
          this.focusCurrentItem()
        }
        break

      case 'ArrowUp':
        if (this.config.arrowNavigation) {
          event.preventDefault()
          this.navigationStore.focusPrevious()
          this.focusCurrentItem()
        }
        break

      case 'Tab':
        if (this.config.trapFocus) {
          this.handleTabKeyForFocusTrap(event)
        }
        break

      case 'Enter':
      case ' ':
        event.preventDefault()
        this.activateCurrentItem()
        break

      default:
        // Handle alphanumeric keys for quick navigation
        if (event.key.length === 1 && event.key.match(/[a-zA-Z0-9]/)) {
          this.handleCharacterNavigation(event.key.toLowerCase())
        }
    }
  }

  private focusCurrentItem(): void {
    const { focusedIndex } = this.navigationStore
    const container = this.containerRef.current
    
    if (!container || focusedIndex < 0) return

    const menuItems = container.querySelectorAll('[role="menuitem"]')
    const targetItem = menuItems[focusedIndex] as HTMLElement
    
    if (targetItem) {
      targetItem.focus()
      // Announce to screen readers
      this.announceToScreenReader(`Menu item ${focusedIndex + 1} of ${menuItems.length}: ${targetItem.textContent}`)
    }
  }

  private handleTabKeyForFocusTrap(event: KeyboardEvent): void {
    const container = this.containerRef.current
    if (!container) return

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    if (event.shiftKey) {
      // Shift + Tab (backward)
      if (document.activeElement === firstElement) {
        event.preventDefault()
        lastElement?.focus()
      }
    } else {
      // Tab (forward)
      if (document.activeElement === lastElement) {
        event.preventDefault()
        firstElement?.focus()
      }
    }
  }

  private activateCurrentItem(): void {
    const { focusedIndex, subMenuItems } = this.navigationStore
    
    if (focusedIndex >= 0 && focusedIndex < subMenuItems.length) {
      const selectedItem = subMenuItems[focusedIndex]
      // This would typically trigger navigation
      // Implementation depends on routing system
      console.log('Navigate to:', selectedItem.path)
    }
  }

  private handleCharacterNavigation(char: string): void {
    const { subMenuItems, setFocusedIndex } = this.navigationStore
    
    const matchingIndex = subMenuItems.findIndex(item => 
      item.name.toLowerCase().startsWith(char)
    )
    
    if (matchingIndex !== -1) {
      setFocusedIndex(matchingIndex)
      this.focusCurrentItem()
    }
  }

  private announceToScreenReader(message: string): void {
    // Create a visually hidden element for screen reader announcements
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', 'polite')
    announcement.setAttribute('aria-atomic', 'true')
    announcement.className = 'sr-only'
    announcement.textContent = message
    
    document.body.appendChild(announcement)
    
    // Clean up after announcement
    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }

  // Public methods for external control
  setupEventListeners(): void {
    document.addEventListener('keydown', this.handleKeyDown)
  }

  cleanupEventListeners(): void {
    document.removeEventListener('keydown', this.handleKeyDown)
  }

  focusFirstItem(): void {
    this.navigationStore.setFocusedIndex(0)
    this.focusCurrentItem()
  }

  focusLastItem(): void {
    const { subMenuItems } = this.navigationStore
    this.navigationStore.setFocusedIndex(subMenuItems.length - 1)
    this.focusCurrentItem()
  }
}