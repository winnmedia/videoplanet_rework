// Menu Entity Business Logic - FSD Domain Layer
import type {
  MenuItem,
  SubMenuItem,
  MenuGroup,
  MenuValidationResult,
  MenuValidationError,
  MenuConfig
} from './types'

/**
 * MenuItem Factory - 일관된 메뉴 아이템 생성
 */
export function createMenuItem(params: {
  id: string
  label: string
  path: string
  icon: string
  activeIcon?: string
  hasSubMenu?: boolean
  sortOrder?: number
  permissions?: string[]
  count?: number
  isNew?: boolean
}): MenuItem {
  return {
    id: params.id,
    label: params.label,
    path: params.path,
    icon: params.icon,
    activeIcon: params.activeIcon || params.icon,
    hasSubMenu: params.hasSubMenu || false,
    count: params.count,
    role: 'navigation'
  }
}

/**
 * SubMenuItem Factory - 일관된 서브메뉴 아이템 생성
 */
export function createSubMenuItem(params: {
  id: string
  name: string
  path: string
  icon?: string
  badge?: number
  status?: 'active' | 'completed' | 'pending'
}): SubMenuItem {
  return {
    id: params.id,
    name: params.name,
    path: params.path,
    icon: params.icon,
    badge: params.badge,
    status: params.status || 'active',
    lastModified: new Date().toISOString()
  }
}

/**
 * MenuGroup Factory - 메뉴 그룹 생성
 */
export function createMenuGroup(params: {
  id: string
  label: string
  items: MenuItem[]
  sortOrder?: number
  isCollapsible?: boolean
  isCollapsed?: boolean
}): MenuGroup {
  return {
    id: params.id,
    title: params.label,
    items: params.items,
    collapsed: params.isCollapsed || false
  }
}

/**
 * MenuItem Validation - 메뉴 아이템 유효성 검사
 */
export function validateMenuItem(item: MenuItem): MenuValidationResult {
  const errors: MenuValidationError[] = []
  // Validation warnings removed for simplicity

  // Required fields validation
  if (!item.id) {
    errors.push({
      field: 'id',
      message: 'Menu item ID is required',
      code: 'MENU_ID_REQUIRED'
    })
  }

  if (!item.label) {
    errors.push({
      field: 'label',
      message: 'Menu item label is required',
      code: 'MENU_LABEL_REQUIRED'
    })
  }

  if (!item.path) {
    errors.push({
      field: 'path',
      message: 'Menu item path is required',
      code: 'MENU_PATH_REQUIRED'
    })
  }

  if (!item.icon) {
    errors.push({
      field: 'icon',
      message: 'Menu item icon is required',
      code: 'MENU_ICON_REQUIRED'
    })
  }

  // Format validation
  if (item.id && !/^[a-z][a-z0-9_-]*$/.test(item.id)) {
    errors.push({
      field: 'id',
      message: 'Menu item ID must be lowercase with hyphens or underscores',
      code: 'MENU_ID_INVALID_FORMAT'
    })
  }

  if (item.path && !item.path.startsWith('http') && !item.path.startsWith('/')) {
    errors.push({
      field: 'path',
      message: 'Internal menu path must start with /',
      code: 'MENU_PATH_INVALID_FORMAT'
    })
  }

  // Accessibility warnings
  if (item.label && item.label.length > 25) {
    // Warning: Menu label is longer than recommended 25 characters
  }

  // SubMenu accessibility check removed - tooltip not in MenuItem interface

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Menu Icon Resolution - 아이콘 경로 해결
 */
export function getMenuIcon(item: MenuItem, isActive: boolean = false): string {
  const iconPath = isActive ? item.activeIcon : item.icon
  
  // 절대 경로인 경우 그대로 반환
  if (iconPath.startsWith('/') || iconPath.startsWith('http')) {
    return iconPath
  }

  // 상대 경로인 경우 기본 경로 추가
  return `/images/icons/sidebar/${iconPath}`
}

/**
 * Menu Path Resolution - 메뉴 경로 해결
 */
export function getMenuPath(item: MenuItem): string {
  if (item.path.startsWith('http')) {
    return item.path
  }

  // 내부 링크 정규화
  return item.path.startsWith('/') ? item.path : `/${item.path}`
}

/**
 * Menu Active State Check - 메뉴 활성 상태 확인
 */
export function isMenuActive(
  item: MenuItem,
  currentPath: string,
  exact: boolean = false
): boolean {
  const menuPath = getMenuPath(item)
  
  if (exact) {
    return currentPath === menuPath
  }

  return currentPath.startsWith(menuPath)
}

/**
 * SubMenu Items Filtering - 서브메뉴 아이템 필터링
 */
export function filterSubMenuItems(
  items: SubMenuItem[],
  parentMenuId: string,
  userPermissions: string[] = []
): SubMenuItem[] {
  return items.filter(item => item.id.includes(parentMenuId))
}

/**
 * Menu Items Grouping - 메뉴 아이템 그룹핑
 */
export function groupMenuItems(
  items: MenuItem[],
  groupBy: keyof MenuItem = 'role'
): Record<string, MenuItem[]> {
  return items.reduce((groups, item) => {
    const key = String(item[groupBy] || 'default')
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
    return groups
  }, {} as Record<string, MenuItem[]>)
}

/**
 * Menu Search - 메뉴 검색 기능
 */
export function searchMenuItems(
  items: MenuItem[],
  query: string
): MenuItem[] {
  if (!query.trim()) {
    return items
  }

  const searchQuery = query.toLowerCase()
  
  return items.filter(item =>
    item.label.toLowerCase().includes(searchQuery) ||
    item.path.toLowerCase().includes(searchQuery)
  )
}

/**
 * Menu Configuration Validation - 메뉴 설정 유효성 검사
 */
export function validateMenuConfig(config: MenuConfig): MenuValidationResult {
  const errors: MenuValidationError[] = []
  
  if (!config.id || config.id.length === 0) {
    errors.push({
      field: 'id',
      message: 'Menu config ID is required',
      code: 'CONFIG_ID_REQUIRED'
    })
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Default Menu Configuration
 */
export const DEFAULT_MENU_CONFIG: MenuConfig = {
  id: 'default-menu',
  items: [],
  defaultActive: 'home',
  enableKeyboardNav: true,
  enableTooltips: false
}