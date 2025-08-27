export interface MenuItem {
  id: string
  label: string
  path: string
  icon: string
  activeIcon: string
  hasSubMenu?: boolean
  count?: number
  role?: 'navigation' | 'management' | 'content'
}

export interface SubMenuItem {
  id: string
  name: string
  path: string
  icon?: string
  badge?: number
  status?: 'active' | 'completed' | 'pending'
  lastModified?: Date
}

export interface MenuConfig {
  id: string
  items: MenuItem[]
  defaultActive?: string
  enableKeyboardNav?: boolean
  enableTooltips?: boolean
}

export interface MenuApiResponse {
  items: SubMenuItem[]
  total: number
  hasMore: boolean
}