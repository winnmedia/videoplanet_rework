/**
 * Navigation Hook Error Cases Tests - TDD Red Phase
 * 
 * 이 테스트는 useNavigation 훅의 오류 상황을 검증합니다.
 * FSD Feature Layer - 결정론적 테스트 (MSW 미사용, 순수 컨텍스트 테스트)
 */

import { renderHook } from '@testing-library/react'
import React from 'react'

import { useNavigation, useNavigationWithPath } from '../useNavigation'
import { NavigationContext } from '../useNavigation'
import type { NavigationContextType } from '../types'

// Mock data for testing
const mockNavigationContext: NavigationContextType = {
  state: {
    currentPath: '/dashboard',
    activeMenuId: 'dashboard',
    isSubMenuOpen: false,
    openSubMenuId: null,
    subMenuItems: [],
    focusedIndex: -1,
    isNavigating: false,
    reducedMotionEnabled: false,
    announcementText: ''
  },
  actions: {
    setCurrentPath: jest.fn(),
    setActiveMenu: jest.fn(),
    openSubMenu: jest.fn(),
    closeSubMenu: jest.fn(),
    setFocusedIndex: jest.fn(),
    setNavigating: jest.fn(),
    announceToScreenReader: jest.fn()
  }
}

describe('useNavigation Hook Error Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Console.error를 모킹하여 테스트 출력 정리
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Context Provider 누락 시 오류 처리', () => {
    test('useNavigation: Provider 없이 호출 시 명확한 에러 메시지와 함께 실패해야 함', () => {
      // Red Phase: 이 테스트는 현재 실패할 것 (Provider 없음)
      expect(() => {
        renderHook(() => useNavigation())
      }).toThrow('useNavigation must be used within a NavigationProvider')
    })

    test('useNavigationWithPath: Provider 없이 호출 시 명확한 에러 메시지와 함께 실패해야 함', () => {
      // Red Phase: 이 테스트는 현재 실패할 것
      expect(() => {
        renderHook(() => useNavigationWithPath())
      }).toThrow('useNavigation must be used within a NavigationProvider')
    })
  })

  describe('Context Provider가 null을 제공할 때', () => {
    const NullContextProvider = ({ children }: { children: React.ReactNode }) => (
      <NavigationContext.Provider value={null}>
        {children}
      </NavigationContext.Provider>
    )

    test('useNavigation: null 컨텍스트에서 명확한 에러 발생해야 함', () => {
      // Red Phase: 현재 구현에서는 이 케이스가 제대로 처리되지 않을 수 있음
      expect(() => {
        renderHook(() => useNavigation(), {
          wrapper: NullContextProvider
        })
      }).toThrow('useNavigation must be used within a NavigationProvider')
    })
  })

  describe('정상적인 Context Provider 제공 시', () => {
    const MockProvider = ({ children }: { children: React.ReactNode }) => (
      <NavigationContext.Provider value={mockNavigationContext}>
        {children}
      </NavigationContext.Provider>
    )

    test('useNavigation: 정상적인 컨텍스트 반환해야 함', () => {
      // Green Phase: Provider가 정상적으로 설정되면 통과해야 함
      const { result } = renderHook(() => useNavigation(), {
        wrapper: MockProvider
      })

      expect(result.current.state).toBe(mockNavigationContext.state)
      expect(result.current.actions).toBe(mockNavigationContext.actions)
    })

    test('useNavigationWithPath: isMenuActive 함수 정상 작동해야 함', () => {
      // Green Phase: 경로 기반 메뉴 활성화 로직 테스트
      const { result } = renderHook(() => useNavigationWithPath(), {
        wrapper: MockProvider
      })

      // Exact match test
      expect(result.current.isMenuActive('/dashboard', true)).toBe(true)
      expect(result.current.isMenuActive('/projects', true)).toBe(false)

      // Starts with test  
      expect(result.current.isMenuActive('/dash')).toBe(true)
      expect(result.current.isMenuActive('/proj')).toBe(false)
    })

    test('useNavigationWithPath: navigateWithAnnouncement 함수 호출 검증', () => {
      // Green Phase: 네비게이션 액션이 올바르게 호출되는지 테스트
      const { result } = renderHook(() => useNavigationWithPath(), {
        wrapper: MockProvider
      })

      result.current.navigateWithAnnouncement('/projects', '프로젝트')

      expect(mockNavigationContext.actions.setCurrentPath).toHaveBeenCalledWith('/projects')
      expect(mockNavigationContext.actions.setNavigating).toHaveBeenCalledWith(true)
      expect(mockNavigationContext.actions.announceToScreenReader).toHaveBeenCalledWith('프로젝트로 이동 중')
    })
  })

  describe('Accessibility 및 Screen Reader 지원', () => {
    const MockProvider = ({ children }: { children: React.ReactNode }) => (
      <NavigationContext.Provider value={mockNavigationContext}>
        {children}
      </NavigationContext.Provider>
    )

    test('navigateWithAnnouncement: 접근성 알림 타이밍 검증', (done) => {
      // Green Phase: 스크린 리더 지원이 올바르게 작동하는지 테스트
      const { result } = renderHook(() => useNavigationWithPath(), {
        wrapper: MockProvider
      })

      // Mock setTimeout to control timing
      const originalSetTimeout = global.setTimeout
      global.setTimeout = jest.fn().mockImplementation((callback, delay) => {
        // Reduced motion이 false일 때는 262ms 후에 setNavigating(false) 호출
        if (delay === 262) {
          callback()
          expect(mockNavigationContext.actions.setNavigating).toHaveBeenLastCalledWith(false)
          global.setTimeout = originalSetTimeout
          done()
        }
        return 123 // mock timer id
      })

      result.current.navigateWithAnnouncement('/calendar', '캘린더')
    })
  })
})

// 이 테스트 파일의 핵심: 현재 실패하는 케이스들을 먼저 정의
// 1. Provider 누락 시 명확한 에러
// 2. null 컨텍스트 처리  
// 3. 정상 케이스의 예상 동작
// 4. 접근성 기능 검증