import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface NavigationState {
  // Core state
  activeMenu: string
  isSubMenuOpen: boolean
  subMenuItems: SubMenuItem[]
  
  // Focus management
  focusedIndex: number
  
  // Actions
  setActiveMenu: (menuId: string) => void
  toggleSubMenu: () => void
  openSubMenu: () => void
  closeSubMenu: () => void
  setSubMenuItems: (items: SubMenuItem[]) => void
  
  // Keyboard navigation
  setFocusedIndex: (index: number) => void
  focusNext: () => void
  focusPrevious: () => void
  resetFocus: () => void
  
  // Complex actions
  handleMenuClick: (menuId: string) => Promise<void>
}

export interface SubMenuItem {
  id: string
  name: string
  path: string
  icon?: string
  badge?: number
}

export const useNavigationStore = create<NavigationState>()(
  devtools(
    (set, get) => ({
      // Initial state
      activeMenu: '',
      isSubMenuOpen: false,
      subMenuItems: [],
      focusedIndex: -1,

      // Basic actions
      setActiveMenu: (menuId: string) => {
        set({ activeMenu: menuId }, false, 'setActiveMenu')
      },

      toggleSubMenu: () => {
        const { isSubMenuOpen } = get()
        set({ isSubMenuOpen: !isSubMenuOpen }, false, 'toggleSubMenu')
      },

      openSubMenu: () => {
        set({ isSubMenuOpen: true, focusedIndex: 0 }, false, 'openSubMenu')
      },

      closeSubMenu: () => {
        set({ 
          isSubMenuOpen: false, 
          focusedIndex: -1 
        }, false, 'closeSubMenu')
      },

      setSubMenuItems: (items: SubMenuItem[]) => {
        set({ subMenuItems: items }, false, 'setSubMenuItems')
      },

      // Keyboard navigation
      setFocusedIndex: (index: number) => {
        set({ focusedIndex: index }, false, 'setFocusedIndex')
      },

      focusNext: () => {
        const { subMenuItems, focusedIndex } = get()
        const nextIndex = focusedIndex < subMenuItems.length - 1 
          ? focusedIndex + 1 
          : 0
        set({ focusedIndex: nextIndex }, false, 'focusNext')
      },

      focusPrevious: () => {
        const { subMenuItems, focusedIndex } = get()
        const prevIndex = focusedIndex > 0 
          ? focusedIndex - 1 
          : subMenuItems.length - 1
        set({ focusedIndex: prevIndex }, false, 'focusPrevious')
      },

      resetFocus: () => {
        set({ focusedIndex: -1 }, false, 'resetFocus')
      },

      // Complex business logic
      handleMenuClick: async (menuId: string) => {
        const { activeMenu, isSubMenuOpen, openSubMenu, closeSubMenu, setActiveMenu } = get()
        
        if (activeMenu === menuId && isSubMenuOpen) {
          closeSubMenu()
        } else {
          setActiveMenu(menuId)
          
          // Load submenu items based on menu type
          if (menuId === 'projects' || menuId === 'feedback') {
            try {
              const { menuApi } = await import('../../entities/menu/api/menuApi')
              const items = await menuApi.getSubMenuItems(menuId)
              set({ subMenuItems: items }, false, 'loadSubMenuItems')
              openSubMenu()
            } catch (error) {
              console.error('Failed to load submenu items:', error)
              // Fallback to empty state
              set({ subMenuItems: [] }, false, 'loadSubMenuItemsError')
            }
          }
        }
      }
    }),
    { name: 'navigation-store' }
  )
)