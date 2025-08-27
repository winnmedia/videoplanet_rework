'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import clsx from 'clsx'

// FSD Imports
import { useNavigation, useSubMenuKeyboard, useFocusTrap, NavigationProvider } from '../../../features/navigation'
import { menuApi, createMenuItem, createSubMenuItem, type MenuItem, type SubMenuItem } from '../../../entities/menu'
import { MenuButton, SubMenu } from '../../../shared/ui'

import styles from './SideBar.module.scss'
import type { SideBarItem } from '../model/types'

interface SideBarProps {
  className?: string
  isCollapsed?: boolean
  onToggle?: () => void
  'data-testid'?: string
}

// Convert legacy SideBarItem to MenuItem
function convertToMenuItem(item: SideBarItem): MenuItem {
  return createMenuItem({
    id: item.id,
    label: item.label,
    path: item.path,
    icon: item.icon,
    activeIcon: item.activeIcon,
    hasSubMenu: item.hasSubMenu,
    count: item.count
  })
}

const legacyMenuItems: SideBarItem[] = [
  {
    id: 'home',
    label: '홈',
    path: '/dashboard',
    icon: '/images/icons/sidebar/home-inactive.svg',
    activeIcon: '/images/icons/sidebar/home-active.svg'
  },
  {
    id: 'calendar',
    label: '전체 일정',
    path: '/calendar',
    icon: '/images/icons/sidebar/calendar-inactive.svg',
    activeIcon: '/images/icons/sidebar/calendar-active.svg'
  },
  {
    id: 'projects',
    label: '프로젝트 관리',
    path: '/projects',
    icon: '/images/icons/sidebar/projects-inactive.svg',
    activeIcon: '/images/icons/sidebar/projects-active.svg',
    hasSubMenu: true,
    count: 3 // Mock count
  },
  {
    id: 'planning',
    label: '영상 기획',
    path: '/planning',
    icon: '/images/icons/sidebar/planning-inactive.svg',
    activeIcon: '/images/icons/sidebar/planning-active.svg',
    hasSubMenu: true
  },
  {
    id: 'feedback',
    label: '영상 피드백',
    path: '/feedback',
    icon: '/images/icons/sidebar/feedback-inactive.svg',
    activeIcon: '/images/icons/sidebar/feedback-active.svg',
    hasSubMenu: true
  },
  {
    id: 'content',
    label: '콘텐츠',
    path: '/content',
    icon: '/images/icons/sidebar/content-inactive.svg',
    activeIcon: '/images/icons/sidebar/content-active.svg'
  }
]

// Internal SideBar component that uses navigation context
function SideBarInternal({ className, isCollapsed = false, 'data-testid': testId }: SideBarProps) {
  const router = useRouter()
  const { state, actions } = useNavigation()
  
  // Convert legacy items to new format
  const menuItems = legacyMenuItems.map(convertToMenuItem)
  
  // Local state for data loading
  const [subMenuItems, setSubMenuItems] = useState<SubMenuItem[]>([])
  const [loading, setLoading] = useState(false)

  // Load sub menu items when sub menu opens
  const loadSubMenuItems = useCallback(async (menuId: string) => {
    try {
      setLoading(true)
      const items = await menuApi.getSubMenuItems(menuId)
      setSubMenuItems(items)
      actions.openSubMenu(menuId, items)
    } catch (error) {
      console.error('Failed to load sub menu items:', error)
      setSubMenuItems([])
    } finally {
      setLoading(false)
    }
  }, [state.currentPath, actions])

  const handleMenuClick = (item: MenuItem) => {
    if (item.hasSubMenu) {
      // Toggle sub menu
      if (state.activeMenuId === item.id && state.isSubMenuOpen) {
        actions.closeSubMenu()
      } else {
        actions.setActiveMenu(item.id)
        loadSubMenuItems(item.id)
      }
    } else {
      // Direct navigation
      actions.closeSubMenu()
      actions.setActiveMenu(item.id)
      router.push(item.path)
    }
  }

  const handleSubMenuClick = (subItem: SubMenuItem) => {
    actions.closeSubMenu()
    router.push(subItem.path)
  }

  const handleLogout = () => {
    // TODO: 실제 로그아웃 로직 구현
    localStorage.removeItem('VGID')
    router.push('/login')
  }

  const handleCreateProject = () => {
    router.push('/projects/create')
  }

  const isMenuActive = (item: MenuItem) => {
    if (item.hasSubMenu && state.isSubMenuOpen && state.activeMenuId === item.id) {
      return true
    }
    return state.currentPath.startsWith(item.path) || state.activeMenuId === item.id
  }

  // Keyboard navigation for sub menu
  const keyboardOptions = {
    onNavigateUp: () => {
      const newIndex = state.focusedIndex <= 0 ? subMenuItems.length - 1 : state.focusedIndex - 1
      actions.setFocusedIndex(newIndex)
    },
    onNavigateDown: () => {
      const newIndex = state.focusedIndex >= subMenuItems.length - 1 ? 0 : state.focusedIndex + 1
      actions.setFocusedIndex(newIndex)
    },
    onSelect: (index: number) => {
      if (subMenuItems[index]) {
        handleSubMenuClick(subMenuItems[index])
      }
    },
    onClose: () => actions.closeSubMenu(),
    focusedIndex: state.focusedIndex,
    itemsCount: subMenuItems.length,
    trapFocus: true
  }

  useSubMenuKeyboard(keyboardOptions)

  const getSubMenuTitle = (): string => {
    if (state.activeMenuId === 'projects') return '프로젝트 관리'
    if (state.activeMenuId === 'feedback') return '영상 피드백'
    return '메뉴'
  }

  return (
    <>
      {/* Main Sidebar */}
      <aside 
        className={clsx(styles.sideBar, className, { [styles.collapsed]: isCollapsed })}
        role="complementary"
        aria-label="네비게이션 사이드바"
        data-testid={testId || 'sidebar'}
      >
        <nav className={styles.nav} role="navigation" aria-label="주 메뉴">
          {menuItems.map((item) => {
            const active = isMenuActive(item)
            const isExpanded = item.hasSubMenu && state.isSubMenuOpen && state.activeMenuId === item.id
            
            return (
              <MenuButton
                key={item.id}
                item={item}
                isActive={active}
                isExpanded={isExpanded}
                onClick={() => handleMenuClick(item)}
                className={clsx({ [styles.menuProject]: item.id === 'projects' })}
                data-testid={`menu-${item.id}`}
              />
            )
          })}
        </nav>

        <button 
          type="button"
          className={styles.logout} 
          onClick={handleLogout}
          aria-label="로그아웃"
          data-testid="logout-button"
        >
          로그아웃
        </button>
      </aside>

      {/* SubMenu */}
      <SubMenu
        isOpen={state.isSubMenuOpen}
        items={subMenuItems}
        title={getSubMenuTitle()}
        onClose={() => actions.closeSubMenu()}
        onItemClick={handleSubMenuClick}
        // focusedIndex and onFocusChange removed - not in SubMenuProps
        data-testid="sidebar-submenu"
      />
    </>
  )
}

// Main SideBar component with NavigationProvider
export function SideBar(props: SideBarProps) {
  return (
    <NavigationProvider>
      <SideBarInternal {...props} />
    </NavigationProvider>
  )
}