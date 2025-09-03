'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/shared/ui/Button/Button'

export interface MenuItem {
  id: string
  label: string
  href: string
  icon: string
}

export interface SideBarProps {
  menuItems?: MenuItem[]
  activeItemId?: string
  isCollapsed?: boolean
  theme?: 'light' | 'dark'
  onItemClick?: (itemId: string) => void
  onToggle?: () => void
}

export function SideBar({
  menuItems = [],
  activeItemId,
  isCollapsed = false,
  theme = 'light',
  onItemClick,
  onToggle,
}: SideBarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(isCollapsed)

  const handleToggle = () => {
    setInternalCollapsed(!internalCollapsed)
    onToggle?.()
  }

  const handleItemClick = (itemId: string) => {
    onItemClick?.(itemId)
  }

  const sidebarWidth = internalCollapsed ? 'w-16' : 'w-64'
  const themeClasses = theme === 'dark' 
    ? 'bg-gray-900 border-gray-700 text-white' 
    : 'bg-white border-gray-200 text-gray-900'

  if (!menuItems || menuItems.length === 0) {
    return (
      <nav 
        className={`${sidebarWidth} ${themeClasses} border-r h-full flex flex-col p-4`}
        aria-label="주 네비게이션"
      >
        <div className="text-center text-gray-500">메뉴가 없습니다</div>
      </nav>
    )
  }

  return (
    <nav 
      className={`${sidebarWidth} ${themeClasses} border-r h-full flex flex-col transition-all duration-300`}
      aria-label="주 네비게이션"
    >
      {/* 토글 버튼 */}
      <div className="p-4 border-b border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggle}
          aria-label="사이드바 토글"
          className="w-full justify-center"
        >
          {internalCollapsed ? '→' : '←'}
        </Button>
      </div>

      {/* 메뉴 목록 */}
      <ul className="flex-1 p-2" role="list">
        {menuItems.map((item) => {
          const isActive = item.id === activeItemId
          const activeClasses = isActive 
            ? 'bg-primary/10 text-primary border-r-2 border-primary' 
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'

          return (
            <li key={item.id} className="mb-1">
              <Link
                href={item.href}
                onClick={() => handleItemClick(item.id)}
                className={`
                  flex items-center px-3 py-2 rounded-l-lg transition-colors duration-200
                  ${activeClasses}
                `}
                tabIndex={0}
              >
                {/* 아이콘 영역 */}
                <span className="flex-shrink-0 w-5 h-5 mr-3" aria-hidden="true">
                  {getIconByName(item.icon)}
                </span>
                
                {/* 레이블 텍스트 - 축소 시 숨김 */}
                {!internalCollapsed && (
                  <span className="font-medium">{item.label}</span>
                )}
                
                {/* 축소 상태에서 툴팁용 숨김 텍스트 */}
                {internalCollapsed && (
                  <span className="sr-only">{item.label}</span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

// 간단한 아이콘 렌더링 함수 (실제로는 별도 아이콘 라이브러리 사용)
function getIconByName(iconName: string): React.ReactNode {
  const iconMap: Record<string, React.ReactNode> = {
    dashboard: <div>📊</div>,
    projects: <div>📁</div>,
    calendar: <div>📅</div>,
    feedback: <div>💬</div>,
    planning: <div>🎬</div>,
  }
  
  return iconMap[iconName] || <div>📄</div>
}