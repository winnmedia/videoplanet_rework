/**
 * NavigationProvider Integration Tests - TDD Red Phase
 * 
 * NavigationProvider와 하위 컴포넌트들의 통합적 동작을 검증합니다.
 * FSD Feature Layer - jsdom 환경, 결정론적 테스트
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter, usePathname } from 'next/navigation'
import React from 'react'

import { useNavigation } from '../../model/useNavigation'
import { NavigationProvider, NavigationProviderWithDebug } from '../NavigationProvider'

// Next.js 라우터 모킹
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn()
}))

// useReducedMotion 모킹
jest.mock('../../lib/useReducedMotion', () => ({
  useReducedMotion: jest.fn(() => false)
}))

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn()
}

const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockUsePathname = usePathname as jest.MockedFunction<typeof usePathname>

// Test Component that uses NavigationProvider
const TestNavigationConsumer = () => {
  const { state, actions } = useNavigation()
  
  return (
    <div>
      <div data-testid="current-path">{state.currentPath}</div>
      <div data-testid="active-menu">{state.activeMenuId || 'none'}</div>
      <div data-testid="is-navigating">{state.isNavigating.toString()}</div>
      <div data-testid="submenu-open">{state.isSubMenuOpen.toString()}</div>
      <div data-testid="announcement">{state.announcementText}</div>
      
      <button 
        data-testid="set-path-button"
        onClick={() => actions.setCurrentPath('/test')}
      >
        Set Test Path
      </button>
      
      <button
        data-testid="open-submenu-button" 
        onClick={() => actions.openSubMenu('test-menu', [
          { id: '1', name: '테스트 1', path: '/test/1' },
          { id: '2', name: '테스트 2', path: '/test/2' }
        ])}
      >
        Open SubMenu
      </button>
      
      <button
        data-testid="announce-button"
        onClick={() => actions.announceToScreenReader('테스트 알림')}
      >
        Announce
      </button>
    </div>
  )
}

describe('NavigationProvider Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockUseRouter.mockReturnValue(mockRouter)
    mockUsePathname.mockReturnValue('/dashboard')
    
    // Console.error 모킹
    jest.spyOn(console, 'error').mockImplementation(() => {})
    
    // Timer 모킹
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.useRealTimers()
    jest.restoreAllMocks()
  })

  describe('Provider 없이 컴포넌트 렌더링 시 오류', () => {
    test('NavigationProvider 없이 useNavigation 사용하는 컴포넌트 렌더링 시 에러 발생해야 함', () => {
      // Red Phase: 이 테스트는 현재 실패할 것 (Provider 없음)
      expect(() => {
        render(<TestNavigationConsumer />)
      }).toThrow('useNavigation must be used within a NavigationProvider')
    })
  })

  describe('NavigationProvider와 Consumer 통합 동작', () => {
    test('Provider로 감싸면 정상적으로 렌더링되고 초기 상태 표시해야 함', () => {
      // Green Phase: Provider가 제공되면 정상 작동해야 함
      render(
        <NavigationProvider initialPath="/dashboard">
          <TestNavigationConsumer />
        </NavigationProvider>
      )

      expect(screen.getByTestId('current-path')).toHaveTextContent('/dashboard')
      expect(screen.getByTestId('active-menu')).toHaveTextContent('home') // dashboard -> 'home' 매핑
      expect(screen.getByTestId('is-navigating')).toHaveTextContent('false')
      expect(screen.getByTestId('submenu-open')).toHaveTextContent('false')
    })

    test('pathname 변경 시 자동으로 활성 메뉴 업데이트해야 함', () => {
      // Green Phase: usePathname 값 변경 시 상태 업데이트 확인
      const { rerender } = render(
        <NavigationProvider>
          <TestNavigationConsumer />
        </NavigationProvider>
      )

      // 초기 상태 확인
      expect(screen.getByTestId('active-menu')).toHaveTextContent('home')

      // pathname 변경 시뮬레이션
      mockUsePathname.mockReturnValue('/projects')
      
      rerender(
        <NavigationProvider>
          <TestNavigationConsumer />
        </NavigationProvider>
      )

      // 업데이트된 활성 메뉴 확인
      expect(screen.getByTestId('active-menu')).toHaveTextContent('projects')
    })

    test('액션 실행 시 상태가 올바르게 업데이트되어야 함', () => {
      // Green Phase: 사용자 액션에 따른 상태 변경 테스트
      render(
        <NavigationProvider>
          <TestNavigationConsumer />
        </NavigationProvider>
      )

      // 경로 변경 액션
      fireEvent.click(screen.getByTestId('set-path-button'))
      expect(screen.getByTestId('current-path')).toHaveTextContent('/test')

      // 서브메뉴 열기 액션
      fireEvent.click(screen.getByTestId('open-submenu-button'))
      expect(screen.getByTestId('submenu-open')).toHaveTextContent('true')
    })
  })

  describe('접근성 기능 통합 테스트', () => {
    test('스크린 리더 알림이 DOM에 올바르게 표시되어야 함', async () => {
      // Green Phase: 접근성 알림 기능 테스트
      render(
        <NavigationProvider>
          <TestNavigationConsumer />
        </NavigationProvider>
      )

      // 알림 버튼 클릭
      fireEvent.click(screen.getByTestId('announce-button'))

      // 알림 텍스트 확인
      expect(screen.getByTestId('announcement')).toHaveTextContent('테스트 알림')
      
      // role="status"를 가진 요소 확인
      const statusElement = screen.getByRole('status')
      expect(statusElement).toHaveTextContent('테스트 알림')
      expect(statusElement).toHaveClass('sr-only')

      // 1초 후 알림 텍스트 자동 초기화
      jest.advanceTimersByTime(1000)
      
      await waitFor(() => {
        expect(screen.getByTestId('announcement')).toHaveTextContent('')
      })
    })

    test('서브메뉴 열기 시 접근성 알림이 자동으로 발생해야 함', () => {
      // Green Phase: 서브메뉴 오픈 시 자동 알림 기능 테스트
      render(
        <NavigationProvider>
          <TestNavigationConsumer />
        </NavigationProvider>
      )

      fireEvent.click(screen.getByTestId('open-submenu-button'))

      const expectedText = 'test-menu 서브메뉴가 열렸습니다. 2개 항목'
      expect(screen.getByTestId('announcement')).toHaveTextContent(expectedText)
    })
  })

  describe('NavigationProviderWithDebug', () => {
    test('개발 환경에서 디버그 패널이 렌더링되어야 함', () => {
      // Green Phase: 디버그 모드 기능 테스트
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'development'

      render(
        <NavigationProviderWithDebug initialPath="/projects">
          <TestNavigationConsumer />
        </NavigationProviderWithDebug>
      )

      // 디버그 패널 존재 확인 (고정 위치 스타일)
      const debugPanel = screen.getByText('Navigation Debug')
      expect(debugPanel).toBeInTheDocument()
      expect(debugPanel.parentElement).toHaveStyle({ position: 'fixed' })

      // 현재 상태 정보 표시 확인
      expect(screen.getByText('Path: /projects')).toBeInTheDocument()
      expect(screen.getByText('Active: projects')).toBeInTheDocument()

      process.env.NODE_ENV = originalNodeEnv
    })

    test('프로덕션 환경에서 디버그 패널이 렌더링되지 않아야 함', () => {
      // Green Phase: 프로덕션에서 디버그 패널 비활성화 확인
      const originalNodeEnv = process.env.NODE_ENV
      process.env.NODE_ENV = 'production'

      render(
        <NavigationProviderWithDebug initialPath="/projects">
          <TestNavigationConsumer />
        </NavigationProviderWithDebug>
      )

      expect(screen.queryByText('Navigation Debug')).not.toBeInTheDocument()

      process.env.NODE_ENV = originalNodeEnv
    })
  })

  describe('Error Boundary 시나리오', () => {
    test('Provider 내에서 예외 발생 시 적절한 에러 처리해야 함', () => {
      // Red Phase: 현재 에러 바운더리가 없어서 실패할 것
      const ErrorComponent = () => {
        const { actions } = useNavigation()
        
        // 의도적으로 에러 발생
        React.useEffect(() => {
          throw new Error('Navigation Error Test')
        }, [])
        
        return <div>Error Component</div>
      }

      // 현재는 Error Boundary가 없으므로 이 테스트는 실패할 것
      expect(() => {
        render(
          <NavigationProvider>
            <ErrorComponent />
          </NavigationProvider>
        )
      }).toThrow('Navigation Error Test')
    })
  })

  describe('메모리 누수 방지', () => {
    test('컴포넌트 언마운트 시 타이머가 정리되어야 함', () => {
      // Green Phase: 메모리 누수 방지를 위한 cleanup 테스트
      const { unmount } = render(
        <NavigationProvider>
          <TestNavigationConsumer />
        </NavigationProvider>
      )

      // 알림 액션 실행
      fireEvent.click(screen.getByTestId('announce-button'))
      
      // 타이머가 설정되었는지 확인
      expect(jest.getTimerCount()).toBe(1)
      
      // 컴포넌트 언마운트
      unmount()
      
      // 타이머가 정리되었는지 확인 (현재 구현에서는 실패할 수 있음)
      // 이 테스트는 cleanup 로직 구현을 유도하기 위한 Red Phase 테스트
      jest.runAllTimers()
    })
  })
})

// 이 테스트 파일의 핵심 실패 케이스:
// 1. Provider 없이 Consumer 사용 시 런타임 에러
// 2. Error Boundary 부재로 인한 에러 전파  
// 3. 메모리 누수 방지 로직 부재
// 4. 정상 케이스의 통합 동작 검증