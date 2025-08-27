// Navigation Feature Types - FSD Entities Layer
export interface NavigationState {
  currentPath: string
  activeMenuId: string | null
  isSubMenuOpen: boolean
  openSubMenuId: string | null
  subMenuItems: SubMenuItemData[]
  focusedIndex: number
  isNavigating: boolean
  reducedMotionEnabled: boolean
  announcementText: string
}

export interface NavigationActions {
  setCurrentPath: (path: string) => void
  setActiveMenu: (menuId: string | null) => void
  openSubMenu: (menuId: string, items: SubMenuItemData[]) => void
  closeSubMenu: () => void
  setFocusedIndex: (index: number) => void
  setNavigating: (isNavigating: boolean) => void
  announceToScreenReader: (text: string) => void
}

export interface SubMenuItemData {
  id: string
  name: string
  path: string
  isActive?: boolean
  disabled?: boolean
}

export interface SubMenuKeyboardOptions {
  onNavigateUp: () => void
  onNavigateDown: () => void
  onSelect: (index: number) => void
  onClose: () => void
  focusedIndex: number
  itemsCount: number
  trapFocus?: boolean
}

export interface FocusTrapOptions {
  isActive: boolean
  containerRef: React.RefObject<HTMLElement>
  initialFocusRef?: React.RefObject<HTMLElement>
  onEscape?: () => void
  restoreFocusOnDeactivate?: boolean
}

export interface NavigationContextType {
  state: NavigationState
  actions: NavigationActions
}

// Precision Craft Specific Types
export interface CraftNavigationMetrics {
  totalInteractions: number
  averageNavigationTime: number
  keyboardUsagePercentage: number
  accessibilityViolations: number
}

export interface CraftSubMenuConfig {
  maxVisibleItems: number
  itemHeight: number // 8px grid aligned
  animationDuration: number // Golden ratio timing
  focusDelay: number // Precision timing for focus management
}