'use client'

import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import React, { useState, useEffect, useCallback } from 'react'

// FSD Imports
import { menuApi, createMenuItem, createSubMenuItem, type MenuItem, type SubMenuItem } from '../../../entities/menu'
import { useNavigation, useSubMenuKeyboard, useFocusTrap, NavigationProvider } from '../../../features/navigation'
import { MenuButton, SubMenu } from '../../../shared/ui'
import type { SideBarItem } from '../model/types'

interface SideBarProps {
  className?: string
  isCollapsed?: boolean
  onToggle?: () => void
  'data-testid'?: string
}

// Hook for responsive sidebar behavior
function useResponsiveSidebar() {
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768
      setIsMobile(mobile)
      if (mobile && !isCollapsed) {
        setIsCollapsed(true)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [isCollapsed])

  return { isMobile, isCollapsed, setIsCollapsed }
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
    hasSubMenu: false  // 직접 네비게이션으로 변경
  },
  {
    id: 'feedback',
    label: '영상 피드백',
    path: '/feedback',
    icon: '/images/icons/sidebar/feedback-inactive.svg',
    activeIcon: '/images/icons/sidebar/feedback-active.svg',
    hasSubMenu: false  // 직접 네비게이션으로 변경
  }
]

// Internal SideBar component that uses navigation context
function SideBarInternal({ className, isCollapsed: propIsCollapsed = false, onToggle, 'data-testid': testId }: SideBarProps) {
  const router = useRouter()
  const { state, actions } = useNavigation()
  const { isMobile, isCollapsed, setIsCollapsed } = useResponsiveSidebar()
  
  // Use prop or responsive state
  const actualIsCollapsed = propIsCollapsed || isCollapsed
  
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

  const handleToggle = () => {
    if (isMobile) {
      setIsCollapsed(!isCollapsed)
    }
    onToggle?.()
  }

  const handleLogout = () => {
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
      {/* Mobile Hamburger Button - 최고 우선순위 z-index */}
      {isMobile && (
        <button
          className="fixed top-4 left-4 z-modal p-2 bg-white rounded-lg shadow-lg md:hidden"
          onClick={handleToggle}
          aria-label="메뉴 토글"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M3 12H21M3 6H21M3 18H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </button>
      )}
      
      {/* Mobile Backdrop - 백드롭 z-index */}
      {isMobile && !actualIsCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-backdrop md:hidden"
          onClick={handleToggle}
          data-testid="mobile-backdrop"
        />
      )}
      
      {/* Main Sidebar - 사이드바 전용 z-index */}
      <aside 
        className={clsx(
          'fixed left-0 top-0 h-full bg-white shadow-lg transition-all duration-300 z-40',
          'w-full md:w-sidebar',
          actualIsCollapsed && 'translate-x-[-100%] md:translate-x-0 md:w-sidebar-collapsed',
          !actualIsCollapsed && 'translate-x-0',
          className
        )}
        role="complementary"
        aria-label="네비게이션 사이드바"
        data-testid={testId || 'sidebar'}
      >
        <nav 
          className="flex flex-col h-full p-4" 
          role="navigation" 
          aria-label="주 메뉴"
        >
          {/* Logo Section */}
          <div className="flex items-center justify-center mb-8 p-4">
            <img 
              src="/images/Common/logo.svg" 
              alt="VRidge Logo" 
              className="h-8 w-auto"
            />
          </div>

          {/* Menu Items */}
          <div className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const active = isMenuActive(item)
              const isExpanded = item.hasSubMenu && state.isSubMenuOpen && state.activeMenuId === item.id
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleMenuClick(item)}
                  className={clsx(
                    'w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-all duration-200',
                    'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20',
                    active && 'bg-primary/10 text-primary font-medium',
                    !active && 'text-gray-700 hover:text-gray-900'
                  )}
                  data-testid={`menu-${item.id}`}
                >
                  <img 
                    src={active ? item.activeIcon : item.icon}
                    alt=""
                    className="w-5 h-5 flex-shrink-0"
                  />
                  <span className="flex-1 text-sm">{item.label}</span>
                  {item.hasSubMenu && (
                    <svg
                      className={clsx(
                        'w-4 h-4 transition-transform duration-200',
                        isExpanded && 'rotate-90'
                      )}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                  {item.count && item.count > 0 && (
                    <span className="px-2 py-1 bg-primary text-white text-xs rounded-full">
                      {item.count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* Logout Button */}
          <button 
            type="button"
            className="w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-left transition-all duration-200 hover:bg-red-50 text-red-600 hover:text-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/20"
            onClick={handleLogout}
            aria-label="로그아웃"
            data-testid="logout-button"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="text-sm">로그아웃</span>
          </button>
        </nav>
      </aside>

      {/* SubMenu - 서브메뉴 전용 z-index (사이드바보다 높음) */}
      <SubMenu
        isOpen={state.isSubMenuOpen}
        items={subMenuItems}
        title={getSubMenuTitle()}
        onClose={() => actions.closeSubMenu()}
        onItemClick={handleSubMenuClick}
        className="z-45"
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