'use client'

import clsx from 'clsx'
import { useRouter } from 'next/navigation'
import React, { useState, useEffect, useCallback, useRef } from 'react'

// FSD Imports
import { menuApi, createMenuItem, createSubMenuItem, type MenuItem, type SubMenuItem } from '../../../entities/menu'
import { useNavigation, useSubMenuKeyboard, useFocusTrap, NavigationProvider } from '../../../features/navigation'
import { MenuButtonImproved, SubMenuImproved } from '../../../shared/ui'
import type { SideBarItem } from '../model/types'

interface SideBarProps {
  className?: string
  isCollapsed?: boolean
  onToggle?: () => void
  'data-testid'?: string
}

interface LoadingState {
  isLoading: boolean
  error: string | null
  retryCount: number
}

// Hook for responsive sidebar behavior with enhanced mobile support
function useResponsiveSidebar() {
  const [isMobile, setIsMobile] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null)
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null)

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

  // Swipe gesture handling
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd({
      x: e.targetTouches[0].clientX,
      y: e.targetTouches[0].clientY
    })
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart.x - touchEnd.x
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50
    
    if (isLeftSwipe && !isCollapsed) {
      setIsCollapsed(true)
    } else if (isRightSwipe && isCollapsed) {
      setIsCollapsed(false)
    }
  }, [touchStart, touchEnd, isCollapsed])

  return { 
    isMobile, 
    isCollapsed, 
    setIsCollapsed,
    touchHandlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  }
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
    count: 3
  },
  {
    id: 'planning',
    label: '영상 기획',
    path: '/planning',
    icon: '/images/icons/sidebar/planning-inactive.svg',
    activeIcon: '/images/icons/sidebar/planning-active.svg',
    hasSubMenu: false
  },
  {
    id: 'feedback',
    label: '영상 피드백',
    path: '/feedback',
    icon: '/images/icons/sidebar/feedback-inactive.svg',
    activeIcon: '/images/icons/sidebar/feedback-active.svg',
    hasSubMenu: false
  }
]

// Loading Skeleton Component
function MenuSkeleton() {
  return (
    <div data-testid="menu-skeleton" className="space-y-3 animate-pulse">
      {Array.from({ length: 5 }).map((_, index) => (
        <div key={index} className="flex items-center space-x-3 p-3">
          <div className="w-4 h-4 bg-gray-300 rounded"></div>
          <div className="flex-1 h-4 bg-gray-300 rounded"></div>
        </div>
      ))}
    </div>
  )
}

// Loading Spinner Component
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <div 
      className={clsx('inline-flex items-center justify-center', className)}
      data-testid="pulse-loader"
      aria-label="로딩 중"
    >
      <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
    </div>
  )
}

// Error State Component
function ErrorState({ 
  message, 
  onRetry, 
  className 
}: { 
  message: string
  onRetry: () => void
  className?: string 
}) {
  return (
    <div 
      className={clsx('p-4 bg-red-50 border border-red-200 rounded-lg', className)}
      data-testid="submenu-error"
      role="alert"
    >
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-800">{message}</p>
          <button
            onClick={onRetry}
            data-testid="retry-button"
            className="mt-2 px-3 py-1 bg-red-100 text-red-800 text-xs rounded hover:bg-red-200 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            다시 시도
          </button>
        </div>
      </div>
    </div>
  )
}

// Success Feedback Component
function NavigationSuccess() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setShow(true)
    const timer = setTimeout(() => setShow(false), 2000)
    return () => clearTimeout(timer)
  }, [])

  if (!show) return null

  return (
    <div 
      data-testid="navigation-success"
      className="fixed top-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded z-50 animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="flex">
        <div className="py-1">
          <svg className="fill-current h-4 w-4 text-green-500 mr-2" viewBox="0 0 20 20">
            <path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
          </svg>
        </div>
        <div>
          <p className="text-sm">페이지로 이동했습니다.</p>
        </div>
      </div>
    </div>
  )
}

// Internal SideBar component that uses navigation context
function SideBarInternal({ 
  className, 
  isCollapsed: propIsCollapsed = false, 
  onToggle, 
  'data-testid': testId 
}: SideBarProps) {
  const router = useRouter()
  const { state, actions } = useNavigation()
  const { isMobile, isCollapsed, setIsCollapsed, touchHandlers } = useResponsiveSidebar()
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    retryCount: 0
  })
  const [showSuccess, setShowSuccess] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)
  
  // Use prop or responsive state
  const actualIsCollapsed = propIsCollapsed || isCollapsed
  
  // Convert legacy items to new format
  const menuItems = legacyMenuItems.map(convertToMenuItem)
  
  // Local state for data loading
  const [subMenuItems, setSubMenuItems] = useState<SubMenuItem[]>([])

  // Prefetch menu data on hover
  const prefetchMenuData = useCallback(async (menuId: string) => {
    if (menuId === 'projects') {
      try {
        await menuApi.getSubMenuItems(menuId)
      } catch (error) {
        console.warn('Prefetch failed:', error)
      }
    }
  }, [])

  // Load sub menu items when sub menu opens
  const loadSubMenuItems = useCallback(async (menuId: string, isRetry = false) => {
    try {
      setLoadingState(prev => ({ 
        ...prev, 
        isLoading: true, 
        error: null,
        retryCount: isRetry ? prev.retryCount + 1 : 0
      }))
      
      const items = await menuApi.getSubMenuItems(menuId)
      setSubMenuItems(items)
      actions.openSubMenu(menuId, items)
    } catch (error) {
      console.error('Failed to load sub menu items:', error)
      setLoadingState(prev => ({
        ...prev,
        error: '데이터를 불러오는데 실패했습니다',
      }))
      setSubMenuItems([])
    } finally {
      setLoadingState(prev => ({ ...prev, isLoading: false }))
    }
  }, [actions])

  const handleMenuClick = useCallback((item: MenuItem) => {
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
      setShowSuccess(true)
      router.push(item.path)
    }
  }, [state.activeMenuId, state.isSubMenuOpen, actions, loadSubMenuItems, router])

  const handleSubMenuClick = useCallback((subItem: SubMenuItem) => {
    actions.closeSubMenu()
    setShowSuccess(true)
    router.push(subItem.path)
  }, [actions, router])

  const handleToggle = useCallback(() => {
    if (isMobile) {
      setIsCollapsed(!isCollapsed)
    }
    onToggle?.()
  }, [isMobile, isCollapsed, setIsCollapsed, onToggle])

  const handleLogout = useCallback(() => {
    localStorage.removeItem('VGID')
    router.push('/login')
  }, [router])

  const handleRetry = useCallback(() => {
    if (state.activeMenuId) {
      loadSubMenuItems(state.activeMenuId, true)
    }
  }, [state.activeMenuId, loadSubMenuItems])

  const isMenuActive = useCallback((item: MenuItem) => {
    if (item.hasSubMenu && state.isSubMenuOpen && state.activeMenuId === item.id) {
      return true
    }
    return state.currentPath.startsWith(item.path) || state.activeMenuId === item.id
  }, [state.isSubMenuOpen, state.activeMenuId, state.currentPath])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key === 'm') {
        event.preventDefault()
        handleToggle()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleToggle])

  return (
    <>
      {/* Live Region for Screen Reader Announcements */}
      <div 
        role="status" 
        aria-live="polite" 
        aria-label="네비게이션 상태 알림"
        className="sr-only"
        data-testid="navigation-status"
      >
        {loadingState.isLoading && '메뉴 로딩 중'}
        {loadingState.error && `오류 발생: ${loadingState.error}`}
        {state.isSubMenuOpen && `${state.activeMenuId} 서브메뉴가 열렸습니다`}
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="sr-only">
        <span>Alt + M: 메뉴 토글</span>
        <span>화살표 키: 메뉴 탐색</span>
        <span>Enter 또는 Space: 선택</span>
        <span>Escape: 서브메뉴 닫기</span>
      </div>

      {/* Mobile Hamburger Button with Enhanced Styling */}
      {isMobile && (
        <button
          className={clsx(
            'fixed top-4 left-4 z-50 p-3',
            'bg-white shadow-lg hover:shadow-xl',
            'rounded-xl border border-gray-200',
            'transition-all duration-200',
            'active:scale-95 hover:bg-gray-50',
            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
          )}
          onClick={handleToggle}
          aria-label="메뉴 토글"
          data-testid="mobile-hamburger"
        >
          <svg 
            width="20" 
            height="20" 
            viewBox="0 0 24 24" 
            fill="none"
            className={clsx(
              'transition-transform duration-300',
              !actualIsCollapsed && 'rotate-90'
            )}
          >
            <path 
              d="M3 12H21M3 6H21M3 18H21" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
              className="text-gray-700"
            />
          </svg>
        </button>
      )}
      
      {/* Mobile Backdrop with Smooth Transition */}
      {isMobile && !actualIsCollapsed && (
        <div 
          className={clsx(
            'fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden',
            'transition-opacity duration-300',
            'backdrop-blur-sm'
          )}
          onClick={handleToggle}
        />
      )}
      
      {/* Main Sidebar with Enhanced Styling */}
      <aside 
        ref={sidebarRef}
        className={clsx(
          // Base styles
          'fixed left-0 top-0 h-full bg-white border-r border-gray-200 shadow-xl',
          'transform transition-transform duration-300 ease-in-out',
          'z-30 flex flex-col',
          // Width management
          'w-64',
          // Mobile responsive
          isMobile ? (actualIsCollapsed ? '-translate-x-full' : 'translate-x-0') : 'translate-x-0',
          // Desktop responsive
          !isMobile && actualIsCollapsed && 'w-16',
          className
        )}
        role="complementary"
        aria-label="네비게이션 사이드바"
        aria-describedby="sidebar-description"
        data-testid={testId || 'sidebar'}
        data-swipe-closing={loadingState.isLoading ? 'false' : undefined}
        {...touchHandlers}
      >
        {/* Hidden Description for Screen Readers */}
        <div id="sidebar-description" className="sr-only">
          주요 네비게이션 메뉴입니다. Alt + M으로 토글할 수 있습니다.
        </div>

        {/* Loading State Overlay */}
        {loadingState.isLoading && (
          <div 
            className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10"
            data-testid="sidebar-loading"
          >
            <LoadingSpinner className="text-blue-600" />
          </div>
        )}

        <nav 
          className={clsx(
            'flex-1 px-4 py-6 space-y-2 overflow-y-auto',
            'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'
          )}
          role="navigation" 
          aria-label="주 메뉴"
        >
          {menuItems.map((item) => {
            const active = isMenuActive(item)
            const isExpanded = item.hasSubMenu && state.isSubMenuOpen && state.activeMenuId === item.id
            
            return (
              <MenuButtonImproved
                key={item.id}
                item={item}
                isActive={active}
                isExpanded={isExpanded}
                onClick={() => handleMenuClick(item)}
                onMouseEnter={() => prefetchMenuData(item.id)}
                isLoading={loadingState.isLoading && state.activeMenuId === item.id}
                className={clsx(
                  'w-full transition-all duration-200',
                  'hover:scale-105 hover:shadow-md',
                  active && 'bg-blue-50 border-blue-200',
                  item.id === 'projects' && 'animate-expand'
                )}
                data-testid={`menu-${item.id}`}
              />
            )
          })}
        </nav>

        {/* Error State */}
        {loadingState.error && (
          <div className="px-4 pb-4">
            <ErrorState 
              message={loadingState.error}
              onRetry={handleRetry}
            />
          </div>
        )}

        {/* Logout Button with Enhanced Styling */}
        <div className="p-4 border-t border-gray-200">
          <button 
            type="button"
            className={clsx(
              'w-full px-4 py-3 text-left text-gray-700',
              'hover:bg-gray-100 hover:text-gray-900',
              'rounded-lg transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2',
              'active:scale-95'
            )}
            onClick={handleLogout}
            aria-label="로그아웃"
            aria-describedby="logout-description"
            data-testid="logout-button"
          >
            <div className="flex items-center space-x-3">
              <svg 
                className="w-5 h-5" 
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
              <span>로그아웃</span>
            </div>
            <div id="logout-description" className="sr-only">
              현재 세션에서 로그아웃합니다
            </div>
          </button>
        </div>
      </aside>

      {/* Enhanced SubMenu */}
      <SubMenuImproved
        isOpen={state.isSubMenuOpen}
        items={subMenuItems}
        title={state.activeMenuId === 'projects' ? '프로젝트 관리' : '메뉴'}
        onClose={() => actions.closeSubMenu()}
        onItemClick={handleSubMenuClick}
        isLoading={loadingState.isLoading}
        error={loadingState.error}
        onRetry={handleRetry}
        data-testid="sidebar-submenu"
        className="animate-slide-in"
      />

      {/* Success Notification */}
      {showSuccess && <NavigationSuccess />}
    </>
  )
}

// Main SideBar component with NavigationProvider
export function SideBarImproved(props: SideBarProps) {
  return (
    <NavigationProvider>
      <SideBarInternal {...props} />
    </NavigationProvider>
  )
}