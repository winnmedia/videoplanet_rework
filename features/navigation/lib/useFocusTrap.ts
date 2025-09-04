'use client'

import { useEffect, useRef, useCallback } from 'react'

import type { FocusTrapOptions } from '../model/types'

/**
 * Focus Trap Hook - FSD Feature Layer
 * DEVPLAN.md 요구사항에 따른 포커스 트랩 구현
 * - 서브메뉴 열릴 때 포커스를 서브메뉴 영역 안에 가둠
 * - Tab/Shift+Tab으로 순환
 * - ESC로 트랩 해제
 * - 트랩 해제 시 이전 포커스 복원
 */
export function useFocusTrap(options: FocusTrapOptions) {
  const {
    isActive,
    containerRef,
    initialFocusRef,
    onEscape,
    restoreFocusOnDeactivate = true
  } = options

  const previousActiveElement = useRef<Element | null>(null)
  const trapEnabled = useRef(false)

  // 포커스 가능한 요소들을 찾는 함수
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return []

    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ')

    return Array.from(
      containerRef.current.querySelectorAll(focusableSelectors)
    ) as HTMLElement[]
  }, [containerRef])

  // 포커스 트랩 내에서 Tab 키 처리
  const handleTabKey = useCallback((event: KeyboardEvent) => {
    if (!trapEnabled.current || !containerRef.current) return

    const focusableElements = getFocusableElements()
    if (focusableElements.length === 0) return

    const firstFocusable = focusableElements[0]
    const lastFocusable = focusableElements[focusableElements.length - 1]

    if (event.shiftKey) {
      // Shift + Tab: 역방향 순환
      if (document.activeElement === firstFocusable) {
        event.preventDefault()
        lastFocusable.focus()
      }
    } else {
      // Tab: 정방향 순환
      if (document.activeElement === lastFocusable) {
        event.preventDefault()
        firstFocusable.focus()
      }
    }
  }, [getFocusableElements, containerRef])

  // ESC 키 처리
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (!trapEnabled.current) return
    
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      onEscape?.()
    }
  }, [onEscape])

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!trapEnabled.current) return

    switch (event.key) {
      case 'Tab':
        handleTabKey(event)
        break
      case 'Escape':
        handleEscapeKey(event)
        break
    }
  }, [handleTabKey, handleEscapeKey])

  // 포커스 트랩 활성화
  const activateTrap = useCallback(() => {
    if (!containerRef.current) return

    // 현재 포커스된 요소 저장
    previousActiveElement.current = document.activeElement
    
    const focusableElements = getFocusableElements()
    if (focusableElements.length === 0) return

    // 초기 포커스 설정
    const elementToFocus = initialFocusRef?.current || focusableElements[0]
    elementToFocus.focus()

    trapEnabled.current = true
    
    // 키보드 이벤트 리스너 등록
    document.addEventListener('keydown', handleKeyDown, { capture: true })
  }, [containerRef, initialFocusRef, getFocusableElements, handleKeyDown])

  // 포커스 트랩 비활성화
  const deactivateTrap = useCallback(() => {
    trapEnabled.current = false
    
    // 키보드 이벤트 리스너 제거
    document.removeEventListener('keydown', handleKeyDown, { capture: true })

    // 이전 포커스 복원
    if (restoreFocusOnDeactivate && previousActiveElement.current) {
      // 이전 요소가 여전히 존재하고 포커스 가능한지 확인
      const previousEl = previousActiveElement.current as HTMLElement
      if (previousEl.isConnected && typeof previousEl.focus === 'function') {
        // Precision Craft: 자연스러운 포커스 복원을 위한 지연
        setTimeout(() => {
          previousEl.focus()
        }, 50)
      }
    }

    previousActiveElement.current = null
  }, [handleKeyDown, restoreFocusOnDeactivate])

  // isActive 상태에 따른 트랩 활성화/비활성화
  useEffect(() => {
    if (isActive) {
      // 약간의 지연을 두어 DOM이 완전히 렌더링된 후 포커스 설정
      const timeoutId = setTimeout(activateTrap, 16) // 1 frame delay
      
      return () => {
        clearTimeout(timeoutId)
        deactivateTrap()
      }
    } else {
      deactivateTrap()
    }
  }, [isActive, activateTrap, deactivateTrap])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      deactivateTrap()
    }
  }, [deactivateTrap])

  return {
    isTrapped: trapEnabled.current,
    focusableElements: getFocusableElements(),
    activateTrap,
    deactivateTrap
  }
}

/**
 * Simple Focus Trap Hook
 * 기본적인 포커스 트랩 기능만 제공하는 경량 버전
 */
export function useSimpleFocusTrap(
  isActive: boolean,
  containerRef: React.RefObject<HTMLElement>
) {
  return useFocusTrap({
    isActive,
    containerRef,
    restoreFocusOnDeactivate: true
  })
}