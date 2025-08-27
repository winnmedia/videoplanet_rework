'use client'

import { usePathname } from 'next/navigation'
import React, { useReducer, useCallback, useEffect } from 'react'

import { useReducedMotion } from '../lib/useReducedMotion'
import type {
  NavigationState,
  NavigationActions,
  NavigationContextType,
  SubMenuItemData
} from '../model/types'
import { NavigationContext, useNavigation } from '../model/useNavigation'

// Navigation State Reducer
type NavigationAction =
  | { type: 'SET_CURRENT_PATH'; payload: string }
  | { type: 'SET_ACTIVE_MENU'; payload: string | null }
  | { type: 'OPEN_SUB_MENU'; payload: { menuId: string; items: SubMenuItemData[] } }
  | { type: 'CLOSE_SUB_MENU' }
  | { type: 'SET_FOCUSED_INDEX'; payload: number }
  | { type: 'SET_NAVIGATING'; payload: boolean }
  | { type: 'SET_REDUCED_MOTION'; payload: boolean }
  | { type: 'ANNOUNCE_TO_SCREEN_READER'; payload: string }

const initialState: NavigationState = {
  currentPath: '',
  activeMenuId: null,
  isSubMenuOpen: false,
  openSubMenuId: null,
  subMenuItems: [],
  focusedIndex: -1,
  isNavigating: false,
  reducedMotionEnabled: false,
  announcementText: ''
}

function navigationReducer(
  state: NavigationState,
  action: NavigationAction
): NavigationState {
  switch (action.type) {
    case 'SET_CURRENT_PATH':
      return {
        ...state,
        currentPath: action.payload
      }

    case 'SET_ACTIVE_MENU':
      return {
        ...state,
        activeMenuId: action.payload
      }

    case 'OPEN_SUB_MENU':
      return {
        ...state,
        isSubMenuOpen: true,
        openSubMenuId: action.payload.menuId,
        subMenuItems: action.payload.items,
        focusedIndex: action.payload.items.length > 0 ? 0 : -1,
        announcementText: `${action.payload.menuId} 서브메뉴가 열렸습니다. ${action.payload.items.length}개 항목`
      }

    case 'CLOSE_SUB_MENU':
      return {
        ...state,
        isSubMenuOpen: false,
        openSubMenuId: null,
        subMenuItems: [],
        focusedIndex: -1,
        announcementText: '서브메뉴가 닫혔습니다'
      }

    case 'SET_FOCUSED_INDEX':
      return {
        ...state,
        focusedIndex: Math.max(-1, Math.min(action.payload, state.subMenuItems.length - 1))
      }

    case 'SET_NAVIGATING':
      return {
        ...state,
        isNavigating: action.payload
      }

    case 'SET_REDUCED_MOTION':
      return {
        ...state,
        reducedMotionEnabled: action.payload
      }

    case 'ANNOUNCE_TO_SCREEN_READER':
      return {
        ...state,
        announcementText: action.payload
      }

    default:
      return state
  }
}

interface NavigationProviderProps {
  children: React.ReactNode
  initialPath?: string
}

/**
 * Navigation Provider - FSD Feature Layer
 * 네비게이션 상태를 관리하고 하위 컴포넌트들에게 컨텍스트 제공
 */
export function NavigationProvider({
  children,
  initialPath = ''
}: NavigationProviderProps) {
  const pathname = usePathname()
  const reducedMotion = useReducedMotion()
  
  const [state, dispatch] = useReducer(navigationReducer, {
    ...initialState,
    currentPath: initialPath || pathname
  })

  // Pathname 변경 감지
  useEffect(() => {
    dispatch({ type: 'SET_CURRENT_PATH', payload: pathname })
    
    // 경로 변경 시 활성 메뉴 결정
    if (pathname.startsWith('/dashboard')) {
      dispatch({ type: 'SET_ACTIVE_MENU', payload: 'home' })
    } else if (pathname.startsWith('/calendar')) {
      dispatch({ type: 'SET_ACTIVE_MENU', payload: 'calendar' })
    } else if (pathname.startsWith('/projects')) {
      dispatch({ type: 'SET_ACTIVE_MENU', payload: 'projects' })
    } else if (pathname.startsWith('/feedback')) {
      dispatch({ type: 'SET_ACTIVE_MENU', payload: 'feedback' })
    } else if (pathname.startsWith('/content')) {
      dispatch({ type: 'SET_ACTIVE_MENU', payload: 'content' })
    }
  }, [pathname])

  // Reduced motion 설정 동기화
  useEffect(() => {
    dispatch({ type: 'SET_REDUCED_MOTION', payload: reducedMotion })
  }, [reducedMotion])

  // Actions 생성
  const actions: NavigationActions = {
    setCurrentPath: useCallback((path: string) => {
      dispatch({ type: 'SET_CURRENT_PATH', payload: path })
    }, []),

    setActiveMenu: useCallback((menuId: string | null) => {
      dispatch({ type: 'SET_ACTIVE_MENU', payload: menuId })
    }, []),

    openSubMenu: useCallback((menuId: string, items: SubMenuItemData[]) => {
      dispatch({ type: 'OPEN_SUB_MENU', payload: { menuId, items } })
    }, []),

    closeSubMenu: useCallback(() => {
      dispatch({ type: 'CLOSE_SUB_MENU' })
    }, []),

    setFocusedIndex: useCallback((index: number) => {
      dispatch({ type: 'SET_FOCUSED_INDEX', payload: index })
    }, []),

    setNavigating: useCallback((isNavigating: boolean) => {
      dispatch({ type: 'SET_NAVIGATING', payload: isNavigating })
    }, []),

    announceToScreenReader: useCallback((text: string) => {
      dispatch({ type: 'ANNOUNCE_TO_SCREEN_READER', payload: text })
      
      // 스크린 리더 알림을 위한 짧은 지연 후 텍스트 초기화
      setTimeout(() => {
        dispatch({ type: 'ANNOUNCE_TO_SCREEN_READER', payload: '' })
      }, 1000)
    }, [])
  }

  const contextValue: NavigationContextType = {
    state,
    actions
  }

  return (
    <NavigationContext.Provider value={contextValue}>
      {children}
      
      {/* Screen Reader Announcements */}
      {state.announcementText && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          {state.announcementText}
        </div>
      )}
    </NavigationContext.Provider>
  )
}

/**
 * Navigation Provider with Debug
 * 개발 환경에서 네비게이션 상태를 디버깅하기 위한 컴포넌트
 */
export function NavigationProviderWithDebug(props: NavigationProviderProps) {
  return (
    <>
      <NavigationProvider {...props} />
      {process.env.NODE_ENV === 'development' && (
        <NavigationDebugPanel />
      )}
    </>
  )
}

// 개발용 디버그 패널 (선택적)
function NavigationDebugPanel() {
  const { state } = useNavigation()
  
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        background: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        padding: '8px',
        fontSize: '12px',
        zIndex: 9999,
        maxWidth: '200px'
      }}
    >
      <h4>Navigation Debug</h4>
      <div>Path: {state.currentPath}</div>
      <div>Active: {state.activeMenuId}</div>
      <div>SubMenu: {state.isSubMenuOpen ? 'Open' : 'Closed'}</div>
      <div>Focus: {state.focusedIndex}</div>
      <div>Items: {state.subMenuItems.length}</div>
      <div>Motion: {state.reducedMotionEnabled ? 'Reduced' : 'Normal'}</div>
    </div>
  )
}

export default NavigationProvider