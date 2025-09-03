import React, { useState, useRef, useEffect } from 'react'
import { clsx } from 'clsx'
import Link from 'next/link'
import { GlobalSubmenu, MenuItem } from '../GlobalSubmenu'
import { NotificationCenter } from '../../features/notifications'

// 아이콘 컴포넌트들
const UserIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
)

const SettingsIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

export interface HeaderProps {
  className?: string
  isAuthenticated?: boolean
  userId?: string
  onLogout?: () => void
}

export const Header = React.forwardRef<HTMLElement, HeaderProps>(
  ({ 
    className, 
    isAuthenticated = false, 
    userId,
    onLogout 
  }, ref) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)
    const userMenuRef = useRef<HTMLDivElement>(null)
    const userButtonRef = useRef<HTMLButtonElement>(null)

    // GlobalSubmenu가 외부 클릭 감지를 처리하므로 더 이상 필요하지 않음
    // 모바일 메뉴만 처리
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        const mobileMenuButton = document.querySelector('[aria-controls="mobile-menu"]')
        const mobileMenu = document.getElementById('mobile-menu')
        
        if (mobileMenu && 
            !mobileMenu.contains(event.target as Node) &&
            !mobileMenuButton?.contains(event.target as Node)) {
          setIsMobileMenuOpen(false)
        }
      }

      if (isMobileMenuOpen) {
        document.addEventListener('mousedown', handleClickOutside)
      }

      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isMobileMenuOpen])

    // Handle keyboard navigation
    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setIsUserMenuOpen(false)
          setIsMobileMenuOpen(false)
        }
      }

      document.addEventListener('keydown', handleKeyDown)
      return () => {
        document.removeEventListener('keydown', handleKeyDown)
      }
    }, [])

    const handleMobileToggle = () => {
      setIsMobileMenuOpen(!isMobileMenuOpen)
    }

    const handleUserMenuToggle = () => {
      setIsUserMenuOpen(!isUserMenuOpen)
    }

    const handleNavigationClick = () => {
      setIsMobileMenuOpen(false)
    }

    // GlobalSubmenu가 키보드 네비게이션을 처리하므로 더 이상 필요하지 않음
    const handleUserMenuKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowDown' && isUserMenuOpen) {
        event.preventDefault()
        // GlobalSubmenu에서 포커스 관리를 담당
      }
    }

    const navigationItems = [
      { name: 'Dashboard', href: '/dashboard' },
      { name: 'Projects', href: '/projects' },
      { name: 'Calendar', href: '/calendar' },
      { name: 'Feedback', href: '/feedback' },
    ]

    // GlobalSubmenu 메뉴 아이템 정의
    const menuItems: MenuItem[] = [
      {
        id: 'profile',
        label: 'Profile',
        href: '/profile',
        icon: <UserIcon />,
        'aria-label': 'View and edit your profile',
      },
      {
        id: 'settings',
        label: 'Settings',
        href: '/settings',
        icon: <SettingsIcon />,
        'aria-label': 'Access application settings',
      },
      {
        id: 'logout',
        label: 'Log out',
        onClick: onLogout,
        icon: <LogoutIcon />,
        variant: 'danger',
        'aria-label': 'Sign out of your account',
      },
    ]

    // 메뉴 닫기 핸들러
    const handleCloseSubmenu = () => {
      setIsUserMenuOpen(false)
    }

    return (
      <header
        ref={ref}
        className={clsx(
          'sticky top-0 z-50',
          'bg-white border-b border-gray-200',
          'w-full',
          className
        )}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Brand Logo */}
            <div className="flex-shrink-0">
              <Link
                href="/"
                className="text-primary font-bold text-xl hover:text-primary-dark transition-colors"
              >
                VideoPlanet
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav
              className="hidden md:flex space-x-8"
              aria-label="Main navigation"
            >
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-700 hover:text-primary transition-colors px-3 py-2 text-sm font-medium"
                  onClick={handleNavigationClick}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Right side - Auth buttons or User menu */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  {/* Notification Center */}
                  {userId && (
                    <NotificationCenter userId={userId} />
                  )}

                  {/* User Menu */}
                  <div className="relative" ref={userMenuRef}>
                  <button
                    ref={userButtonRef}
                    onClick={handleUserMenuToggle}
                    onKeyDown={handleUserMenuKeyDown}
                    className="flex items-center text-sm bg-white rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    aria-label="User menu"
                    aria-haspopup="true"
                    aria-expanded={isUserMenuOpen}
                    id="user-menu-button"
                    {...(process.env.NODE_ENV === 'test' && { 'data-testid': 'user-menu-trigger' })}
                  >
                    <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-700">U</span>
                    </div>
                  </button>

                  {/* GlobalSubmenu */}
                  <GlobalSubmenu
                    isOpen={isUserMenuOpen}
                    onClose={handleCloseSubmenu}
                    items={menuItems}
                    position="right"
                    triggerRef={userButtonRef}
                  />
                </div>
                </>
              ) : (
                /* Auth Buttons */
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="text-gray-700 hover:text-primary transition-colors px-3 py-2 text-sm font-medium"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/signup"
                    className="bg-primary hover:bg-primary-dark text-white px-4 py-2 text-sm font-medium rounded-md transition-colors"
                  >
                    Sign up
                  </Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button
                onClick={handleMobileToggle}
                className="md:hidden inline-flex items-center justify-center p-2 text-gray-700 hover:text-primary hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-md"
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
                aria-controls="mobile-menu"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <div id="mobile-menu" className="md:hidden">
              <nav className="px-2 pt-2 pb-3 space-y-1 bg-white border-t border-gray-200">
                {navigationItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="block text-gray-700 hover:text-primary hover:bg-gray-100 px-3 py-2 text-base font-medium rounded-md transition-colors"
                    onClick={handleNavigationClick}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
          )}
        </div>
      </header>
    )
  }
)

Header.displayName = 'Header'