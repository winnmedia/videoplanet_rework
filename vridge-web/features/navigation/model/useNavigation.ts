'use client'

import { useContext, createContext } from 'react'
import type { NavigationContextType } from './types'

// Navigation Context
export const NavigationContext = createContext<NavigationContextType | null>(null)

/**
 * Navigation Hook - FSD Feature Layer
 * 네비게이션 상태 관리 및 액션을 제공하는 커스텀 훅
 */
export function useNavigation() {
  const context = useContext(NavigationContext)
  
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider')
  }
  
  return context
}

/**
 * Navigation Hook with Path Management
 * 현재 경로 기반 네비게이션 로직을 처리
 */
export function useNavigationWithPath() {
  const { state, actions } = useNavigation()
  
  const isMenuActive = (menuPath: string, exact: boolean = false): boolean => {
    if (exact) {
      return state.currentPath === menuPath
    }
    return state.currentPath.startsWith(menuPath)
  }
  
  const navigateWithAnnouncement = (path: string, menuLabel: string) => {
    actions.setCurrentPath(path)
    actions.setNavigating(true)
    actions.announceToScreenReader(`${menuLabel}로 이동 중`)
    
    // Reset navigation state after transition
    setTimeout(() => {
      actions.setNavigating(false)
    }, state.reducedMotionEnabled ? 0 : 262) // Precision Craft timing
  }
  
  return {
    ...context,
    isMenuActive,
    navigateWithAnnouncement
  }
}