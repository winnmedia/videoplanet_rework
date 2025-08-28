/**
 * @fileoverview 현대화된 SideBar - Tailwind CSS 기반
 * @description VRidge 초미니멀 디자인 시스템을 적용한 사이드바
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { cn } from '../../../shared/lib/utils'

// 메뉴 아이콘 컴포넌트들
const HomeIcon = ({ active = false }: { active?: boolean }) => (
  <svg
    className={cn('menu-icon w-5 h-5 transition-colors', active ? 'text-vridge-600' : 'text-gray-500')}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 2.5 : 2}
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
)

const CalendarIcon = ({ active = false }: { active?: boolean }) => (
  <svg
    className={cn('menu-icon w-5 h-5 transition-colors', active ? 'text-vridge-600' : 'text-gray-500')}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 2.5 : 2}
      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
    />
  </svg>
)

const ProjectIcon = ({ active = false }: { active?: boolean }) => (
  <svg
    className={cn('menu-icon w-5 h-5 transition-colors', active ? 'text-vridge-600' : 'text-gray-500')}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 2.5 : 2}
      d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
    />
  </svg>
)

const PlanningIcon = ({ active = false }: { active?: boolean }) => (
  <svg
    className={cn('menu-icon w-5 h-5 transition-colors', active ? 'text-vridge-600' : 'text-gray-500')}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 2.5 : 2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
)

const FeedbackIcon = ({ active = false }: { active?: boolean }) => (
  <svg
    className={cn('menu-icon w-5 h-5 transition-colors', active ? 'text-vridge-600' : 'text-gray-500')}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={active ? 2.5 : 2}
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
    />
  </svg>
)

const LogoutIcon = () => (
  <svg
    className="w-5 h-5 text-gray-500"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
    />
  </svg>
)

const ChevronDownIcon = ({ isOpen = false }: { isOpen?: boolean }) => (
  <svg
    className={cn(
      'w-4 h-4 transition-transform duration-200',
      isOpen ? 'rotate-180' : 'rotate-0'
    )}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 9l-7 7-7-7"
    />
  </svg>
)

// 메뉴 항목 인터페이스
interface MenuItem {
  id: string
  label: string
  path: string
  icon: React.ComponentType<{ active?: boolean }>
  hasSubMenu?: boolean
  count?: number
}

interface SubMenuItem {
  id: string
  label: string
  path: string
}

// 사이드바 Props 인터페이스
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

// 메뉴 데이터
const menuItems: MenuItem[] = [
  {
    id: 'home',
    label: '홈',
    path: '/dashboard',
    icon: HomeIcon
  },
  {
    id: 'calendar',
    label: '전체 일정',
    path: '/calendar',
    icon: CalendarIcon
  },
  {
    id: 'projects',
    label: '프로젝트 관리',
    path: '/projects',
    icon: ProjectIcon,
    hasSubMenu: true,
    count: 3
  },
  {
    id: 'planning',
    label: '영상 기획',
    path: '/planning',
    icon: PlanningIcon,
    hasSubMenu: true
  },
  {
    id: 'feedback',
    label: '영상 피드백',
    path: '/feedback',
    icon: FeedbackIcon,
    hasSubMenu: true
  }
]

// 서브메뉴 데이터
const subMenuData: Record<string, SubMenuItem[]> = {
  projects: [
    { id: 'all-projects', label: '모든 프로젝트', path: '/projects' },
    { id: 'active-projects', label: '진행중인 프로젝트', path: '/projects?status=active' },
    { id: 'completed-projects', label: '완료된 프로젝트', path: '/projects?status=completed' }
  ],
  planning: [
    { id: 'all-planning', label: '모든 기획', path: '/planning' },
    { id: 'script-planning', label: '스크립트 작성', path: '/planning/script' },
    { id: 'storyboard-planning', label: '스토리보드', path: '/planning/storyboard' }
  ],
  feedback: [
    { id: 'all-feedback', label: '모든 피드백', path: '/feedback' },
    { id: 'pending-feedback', label: '대기중인 피드백', path: '/feedback?status=pending' },
    { id: 'completed-feedback', label: '완료된 피드백', path: '/feedback?status=completed' }
  ]
}

/**
 * 현대화된 SideBar 컴포넌트
 * 
 * @description VRidge 초미니멀 디자인 시스템을 적용한 사이드바
 * Tailwind CSS를 사용하여 깔끔하고 현대적인 내비게이션을 제공
 */
export const SideBar: React.FC<SideBarProps> = ({
  className,
  isCollapsed: propIsCollapsed = false,
  onToggle,
  'data-testid': testId
}) => {
  const router = useRouter()
  const pathname = usePathname()
  const { isMobile, isCollapsed, setIsCollapsed } = useResponsiveSidebar()
  
  // Use prop or responsive state
  const actualIsCollapsed = propIsCollapsed || isCollapsed
  
  // 서브메뉴 상태 관리
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null)
  const [subMenuItems, setSubMenuItems] = useState<SubMenuItem[]>([])

  // 현재 활성 메뉴 확인
  const getActiveMenuId = useCallback(() => {
    for (const item of menuItems) {
      if (pathname.startsWith(item.path)) {
        return item.id
      }
    }
    return null
  }, [pathname])

  // 메뉴 클릭 핸들러
  const handleMenuClick = (item: MenuItem) => {
    if (item.hasSubMenu) {
      // 서브메뉴 토글
      if (activeMenuId === item.id) {
        setActiveMenuId(null)
        setSubMenuItems([])
      } else {
        setActiveMenuId(item.id)
        setSubMenuItems(subMenuData[item.id] || [])
      }
    } else {
      // 직접 이동
      setActiveMenuId(null)
      setSubMenuItems([])
      router.push(item.path)
    }
  }

  // 서브메뉴 클릭 핸들러
  const handleSubMenuClick = (subItem: SubMenuItem) => {
    setActiveMenuId(null)
    setSubMenuItems([])
    router.push(subItem.path)
  }

  // 토글 핸들러
  const handleToggle = () => {
    if (isMobile) {
      setIsCollapsed(!isCollapsed)
    }
    onToggle?.()
  }

  // 로그아웃 핸들러
  const handleLogout = () => {
    localStorage.removeItem('VGID')
    router.push('/login')
  }

  // 서브메뉴 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('[data-testid="sidebar-submenu"]') && 
          !target.closest('.submenu-trigger')) {
        setActiveMenuId(null)
        setSubMenuItems([])
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Escape 키로 서브메뉴 닫기
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setActiveMenuId(null)
        setSubMenuItems([])
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <>
      {/* 모바일 햄버거 버튼 */}
      {isMobile && (
        <button
          className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-lg md:hidden"
          onClick={handleToggle}
          aria-label="메뉴 토글"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}
      
      {/* 모바일 백드롭 */}
      {isMobile && !actualIsCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={handleToggle}
        />
      )}
      
      {/* 메인 사이드바 */}
      <aside 
        className={cn(
          'fixed left-0 top-0 h-screen bg-white border-r border-gray-200 shadow-sm transition-all duration-300 z-50',
          actualIsCollapsed ? 'w-16' : 'w-64',
          className
        )}
        role="complementary"
        aria-label="네비게이션 사이드바"
        data-testid={testId || 'sidebar'}
      >
        <div className="flex flex-col h-full">
          {/* 로고 영역 */}
          <div className="flex items-center justify-center h-16 border-b border-gray-200">
            {actualIsCollapsed ? (
              <div className="w-8 h-8 bg-vridge-500 rounded flex items-center justify-center">
                <span className="text-white font-bold text-sm">V</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-vridge-500 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-sm">V</span>
                </div>
                <span className="text-xl font-bold text-gray-900">VRidge</span>
              </div>
            )}
          </div>

          {/* 네비게이션 메뉴 */}
          <nav className="flex-1 p-4" role="navigation" aria-label="주 메뉴">
            <div className="space-y-2">
              {menuItems.map((item) => {
                const IconComponent = item.icon
                const isActive = getActiveMenuId() === item.id
                const hasSubMenu = item.hasSubMenu
                const isExpanded = activeMenuId === item.id

                return (
                  <div key={item.id}>
                    <button
                      className={cn(
                        'flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors duration-200',
                        'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:ring-offset-2',
                        isActive 
                          ? 'bg-vridge-50 text-vridge-600 border border-vridge-200' 
                          : 'text-gray-700 hover:text-gray-900',
                        hasSubMenu && 'submenu-trigger'
                      )}
                      onClick={() => handleMenuClick(item)}
                      aria-expanded={hasSubMenu ? isExpanded : undefined}
                    >
                      <IconComponent active={isActive} />
                      
                      {!actualIsCollapsed && (
                        <>
                          <span className="ml-3 font-medium">{item.label}</span>
                          
                          {/* 카운트 배지 */}
                          {item.count && item.count > 0 && (
                            <span className="count-badge ml-auto bg-vridge-500 text-white text-xs font-semibold px-2 py-1 rounded-full">
                              {item.count}
                            </span>
                          )}
                          
                          {/* 서브메뉴 화살표 */}
                          {hasSubMenu && (
                            <ChevronDownIcon isOpen={isExpanded} />
                          )}
                        </>
                      )}
                    </button>
                  </div>
                )
              })}
            </div>
          </nav>

          {/* 로그아웃 버튼 */}
          <div className="mt-auto p-4 border-t border-gray-200">
            <button 
              className={cn(
                'flex items-center w-full px-4 py-3 text-left rounded-lg transition-colors duration-200',
                'text-gray-700 hover:text-gray-900 hover:bg-gray-50',
                'focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:ring-offset-2'
              )}
              onClick={handleLogout}
              aria-label="로그아웃"
            >
              <LogoutIcon />
              {!actualIsCollapsed && (
                <span className="ml-3 font-medium">로그아웃</span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* 서브메뉴 */}
      {activeMenuId && subMenuItems.length > 0 && !actualIsCollapsed && (
        <div
          className="fixed left-64 top-20 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-40 p-2"
          data-testid="sidebar-submenu"
        >
          <div className="space-y-1">
            {subMenuItems.map((subItem) => (
              <button
                key={subItem.id}
                className="flex items-center w-full px-3 py-2 text-left rounded-md text-sm text-gray-700 hover:text-gray-900 hover:bg-gray-50 transition-colors duration-200"
                onClick={() => handleSubMenuClick(subItem)}
              >
                {subItem.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  )
}