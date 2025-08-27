'use client'

import clsx from 'clsx'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import React, { useState, useEffect } from 'react'

import styles from './SideBar.module.scss'
import type { SideBarItem, SubMenuItem } from '../model/types'

interface SideBarProps {
  className?: string
  isCollapsed?: boolean
  onToggle?: () => void
}

// TODO(human): 실제 프로젝트 데이터 연동
// Redux useSelector 또는 커스텀 훅으로 실제 프로젝트 목록을 가져오세요
// 예: const { projects, loading, error } = useSelector((state) => state.projects)
// 또는: const { projects, loading, error } = useProjects()

// Mock data - 임시 데이터 (실제 데이터 연동 후 제거)
const mockProjects: SubMenuItem[] = [
  { id: '1', name: '웹사이트 리뉴얼 프로젝트', path: '/projects/1' },
  { id: '2', name: '모바일 앱 개발', path: '/projects/2' },
  { id: '3', name: '브랜딩 영상 제작', path: '/projects/3' },
]

const menuItems: SideBarItem[] = [
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
    count: mockProjects.length
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

export function SideBar({ className, isCollapsed = false }: SideBarProps) {
  const router = useRouter()
  const pathname = usePathname()
  
  const [isSubMenuOpen, setIsSubMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('')
  const [subMenuItems, setSubMenuItems] = useState<SubMenuItem[]>([])

  // 현재 경로에 따라 활성 메뉴 결정
  useEffect(() => {
    const currentItem = menuItems.find(item => pathname.startsWith(item.path))
    if (currentItem) {
      setActiveTab(currentItem.id)
    }
  }, [pathname])

  const handleMenuClick = (item: SideBarItem) => {
    if (item.hasSubMenu) {
      // 서브메뉴가 있는 경우
      if (activeTab === item.id && isSubMenuOpen) {
        // 이미 열려있는 경우 닫기
        setIsSubMenuOpen(false)
      } else {
        // 새로운 서브메뉴 열기
        setActiveTab(item.id)
        setIsSubMenuOpen(true)
        
        // TODO(human): 실제 API 데이터 연동
        // if (item.id === 'projects') {
        //   setSubMenuItems(projects || [])
        // } else if (item.id === 'feedback') {
        //   setSubMenuItems(projects?.map(p => ({ ...p, path: `/feedback/${p.id}` })) || [])
        // }
        
        // 임시 Mock 데이터 사용
        if (item.id === 'projects') {
          setSubMenuItems(mockProjects)
        } else if (item.id === 'feedback') {
          setSubMenuItems(mockProjects.map(p => ({ ...p, path: `/feedback/${p.id}` })))
        }
      }
    } else {
      // 서브메뉴가 없는 경우 바로 이동
      setIsSubMenuOpen(false)
      setActiveTab(item.id)
      router.push(item.path)
    }
  }

  const handleSubMenuClick = (subItem: SubMenuItem) => {
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

  const isMenuActive = (item: SideBarItem) => {
    if (item.hasSubMenu && isSubMenuOpen && activeTab === item.id) {
      return true
    }
    return pathname.startsWith(item.path) || activeTab === item.id
  }

  return (
    <>
      {/* Overlay for mobile */}
      <div 
        className={clsx(styles.overlay, { [styles.active]: isSubMenuOpen })}
        onClick={() => setIsSubMenuOpen(false)}
      />
      
      {/* Main Sidebar */}
      <aside className={clsx(styles.sideBar, className, { [styles.collapsed]: isCollapsed })}>
        <nav className={styles.nav}>
          <ul>
            {menuItems.map((item) => {
              const active = isMenuActive(item)
              
              return (
                <li 
                  key={item.id}
                  className={clsx({ 
                    [styles.active]: active,
                    [styles.menuProject]: item.id === 'projects'
                  })}
                  onClick={() => handleMenuClick(item)}
                >
                  <div className={clsx(styles.menuIcon, { [styles.active]: active })}>
                    <Image
                      src={active ? item.activeIcon : item.icon}
                      alt={item.label}
                      width={16}
                      height={16}
                    />
                  </div>
                  <span>{item.label}</span>
                  {item.count !== undefined && (
                    <span className={styles.projectCount}>{item.count}</span>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>

        <div className={styles.logout} onClick={handleLogout}>
          로그아웃
        </div>
      </aside>

      {/* SubMenu */}
      <div className={clsx(styles.subMenu, { [styles.active]: isSubMenuOpen })}>
        <div className={styles.subMenuHeader}>
          <div className={styles.title}>
            {activeTab === 'projects' ? '프로젝트 관리' : '영상 피드백'}
          </div>
          <div className={styles.actions}>
            {activeTab === 'projects' && subMenuItems.length > 0 && (
              <button className={styles.actionButton} onClick={handleCreateProject}>
                <Image src="/images/icons/plus.png" alt="추가" width={16} height={16} />
              </button>
            )}
            <button 
              className={clsx(styles.actionButton, styles.close)} 
              onClick={() => setIsSubMenuOpen(false)}
            >
              <Image src="/images/icons/close.png" alt="닫기" width={12} height={12} />
            </button>
          </div>
        </div>

        <nav className={styles.subMenuNav}>
          {subMenuItems.length > 0 ? (
            <ul>
              {subMenuItems.map((subItem) => (
                <li 
                  key={subItem.id}
                  className={clsx({ 
                    [styles.active]: pathname === subItem.path 
                  })}
                  onClick={() => handleSubMenuClick(subItem)}
                >
                  {subItem.name}
                </li>
              ))}
            </ul>
          ) : (
            <div className={styles.emptyState}>
              등록된 <br />
              프로젝트가 없습니다
              <button 
                className={styles.createButton}
                onClick={handleCreateProject}
              >
                프로젝트 등록
              </button>
            </div>
          )}
        </nav>
      </div>
    </>
  )
}