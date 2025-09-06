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
  status?: 'active' | 'completed' | 'pending' | 'in-progress' | 'draft'
  lastModified?: string
  priority?: 'high' | 'medium' | 'low'
  description?: string
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

export interface MenuGroup {
  id: string
  title: string
  items: MenuItem[]
  collapsed?: boolean
}

export interface MenuValidationError {
  field: string
  message: string
  code: string
}

export interface MenuValidationResult {
  isValid: boolean
  errors: MenuValidationError[]
}