export interface SideBarItem {
  id: string
  label: string
  path: string
  icon: string
  activeIcon: string
  hasSubMenu?: boolean
  isActive?: boolean
  count?: number
}

export interface SubMenuItem {
  id: string
  name: string
  path: string
}

export interface SideBarState {
  isSubMenuOpen: boolean
  activeTab: string
  activeSubMenu?: SubMenuItem[]
}