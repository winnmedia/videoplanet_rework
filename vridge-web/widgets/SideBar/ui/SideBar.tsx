'use client'

import { useRouter, usePathname } from 'next/navigation'
import React, { useState } from 'react'

import type { SubMenuItem } from '@/entities/menu'
import { useNavigation } from '@/features/navigation'
// Emergency deployment - temporarily disable missing import
import { SubMenu } from '@/shared/ui'
// import { MenuButton } from '@/shared/ui'

// Temporary MenuButton placeholder
const MenuButton = ({ onClick, className, item, isActive, isExpanded, ...props }: {
  onClick?: () => void
  className?: string
  item: {
    id: string
    label: string
    path: string
    icon: string
    activeIcon: string
    hasSubMenu: boolean
  }
  isActive: boolean
  isExpanded: boolean
  [key: string]: unknown
}) => (
  <button onClick={onClick} className={className} {...props}>
    <i className={isActive ? item.activeIcon : item.icon} />
    <span>{item.label}</span>
    {item.hasSubMenu && (
      <i className={isExpanded ? 'fas fa-chevron-down' : 'fas fa-chevron-right'} />
    )}
  </button>
)

interface SideBarProps {
  isCollapsed?: boolean
  onToggle?: () => void
}

interface ExtendedMenuItem {
  id: string
  label: string
  icon: string
  activeIcon: string
  path: string
  hasSubMenu?: boolean
  subItems?: SubMenuItem[]
}

const mainMenuItems: ExtendedMenuItem[] = [
  {
    id: 'dashboard',
    label: '대시보드',
    icon: 'fas fa-chart-line',
    activeIcon: 'fas fa-chart-line',
    path: '/dashboard',
    hasSubMenu: false
  },
  {
    id: 'projects',
    label: '프로젝트',
    icon: 'fas fa-video',
    activeIcon: 'fas fa-video',
    path: '/projects',
    hasSubMenu: true,
    subItems: [
      { id: 'all-projects', name: '모든 프로젝트', path: '/projects' },
      { id: 'my-projects', name: '내 프로젝트', path: '/projects/my' },
      { id: 'create-project', name: '새 프로젝트', path: '/projects/create' }
    ]
  },
  {
    id: 'planning',
    label: '기획',
    icon: 'fas fa-clipboard-list',
    activeIcon: 'fas fa-clipboard-list',
    path: '/planning',
    hasSubMenu: true,
    subItems: [
      { id: 'video-planning', name: '영상 기획', path: '/planning/video' },
      { id: 'script-writing', name: '스크립트 작성', path: '/planning/script' },
      { id: 'storyboard', name: '스토리보드', path: '/planning/storyboard' }
    ]
  },
  {
    id: 'calendar',
    label: '캘린더',
    icon: 'fas fa-calendar',
    activeIcon: 'fas fa-calendar',
    path: '/calendar',
    hasSubMenu: false
  },
  {
    id: 'feedback',
    label: '피드백',
    icon: 'fas fa-comments',
    activeIcon: 'fas fa-comments',
    path: '/feedback',
    hasSubMenu: true,
    subItems: [
      { id: 'received-feedback', name: '받은 피드백', path: '/feedback/received' },
      { id: 'sent-feedback', name: '보낸 피드백', path: '/feedback/sent' },
      { id: 'feedback-templates', name: '피드백 템플릿', path: '/feedback/templates' }
    ]
  }
]

export function SideBar({ isCollapsed = false, onToggle }: SideBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { state, actions } = useNavigation()
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null)

  const handleMenuClick = (item: ExtendedMenuItem) => {
    if (item.hasSubMenu) {
      // Toggle submenu with NavigationProvider integration
      const newActiveSubmenu = activeSubmenu === item.id ? null : item.id
      setActiveSubmenu(newActiveSubmenu)
      
      if (newActiveSubmenu && item.subItems) {
        const subMenuData = item.subItems.map(subItem => ({
          id: subItem.id,
          name: subItem.name,
          path: subItem.path,
          isActive: isActive(subItem.path)
        }))
        actions.openSubMenu(item.id, subMenuData)
      } else {
        actions.closeSubMenu()
      }
    } else {
      // Navigate directly
      actions.setNavigating(true)
      actions.setCurrentPath(item.path)
      router.push(item.path)
      setActiveSubmenu(null)
      actions.closeSubMenu()
    }
  }

  const handleSubmenuItemClick = (path: string) => {
    actions.setNavigating(true)
    actions.setCurrentPath(path)
    router.push(path)
    setActiveSubmenu(null)
    actions.closeSubMenu()
  }

  const isActive = (path: string) => {
    return pathname === path || pathname?.startsWith(path + '/')
  }


  return (
    <>
      <aside 
        className="fixed left-0 top-0 h-screen bg-white z-50 transition-all duration-300"
        style={{ 
          width: isCollapsed ? '4rem' : '18.75rem',
          boxShadow: '16px 0px 16px rgba(0, 0, 0, 0.06)',
          borderRadius: '0 30px 30px 0',
          padding: '20px 30px'
        }}
        data-testid="sidebar"
        role="navigation"
        aria-label="주 메뉴"
      >
        {/* Logo */}
        <div className="h-20 flex items-center justify-center mb-8">
          {!isCollapsed ? (
            <h1 className="text-2xl font-bold" style={{ color: '#012fff' }}>VLANET</h1>
          ) : (
            <div className="w-10 h-10 rounded text-white flex items-center justify-center font-bold text-lg" style={{ backgroundColor: '#012fff' }}>
              V
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="flex-1 space-y-4">
          {state.isNavigating ? (
            <div className="flex items-center justify-center py-8" data-testid="loading-spinner">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              {!isCollapsed && <span className="ml-2 text-sm text-gray-600">이동 중...</span>}
            </div>
          ) : (
            mainMenuItems.map((item) => (
              <div key={item.id}>
                <MenuButton
                  item={{
                    id: item.id,
                    label: item.label,
                    path: item.path,
                    icon: item.icon,
                    activeIcon: item.activeIcon,
                    hasSubMenu: item.hasSubMenu || false
                  }}
                  isActive={isActive(item.path)}
                  isExpanded={activeSubmenu === item.id}
                  onClick={() => handleMenuClick(item)}
                  data-testid={`sidebar-menu-item-${item.id}`}
                />
                
                {/* Submenu */}
                {item.hasSubMenu && activeSubmenu === item.id && !isCollapsed && (
                  <SubMenu
                    isOpen={true}
                    title={item.label}
                    items={item.subItems || []}
                    onClose={() => {}}
                    onItemClick={(subItem) => handleSubmenuItemClick(subItem.path)}
                    className="mt-2 ml-4"
                    data-testid="submenu-container"
                  />
                )}
              </div>
            ))
          )}
        </nav>

        {/* Toggle Button (Mobile) */}
        {onToggle && (
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={onToggle}
              className="w-full p-2 text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              data-testid="hamburger-button"
              aria-label="메뉴 토글"
            >
              {isCollapsed ? '→' : '←'}
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Backdrop */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={onToggle}
          data-testid="sidebar-backdrop"
          aria-hidden="true"
        />
      )}
    </>
  )
}