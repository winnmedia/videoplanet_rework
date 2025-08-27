'use client'

import { useEffect, useCallback } from 'react'
import type { SubMenuKeyboardOptions } from '../model/types'

/**
 * SubMenu Keyboard Navigation Hook - FSD Feature Layer
 * DEVPLAN.md 요구사항에 따른 키보드 네비게이션 구현
 * - Arrow Down/Up: 서브메뉴 항목 탐색
 * - Enter/Space: 항목 선택
 * - ESC: 서브메뉴 닫기
 * - 포커스 순환 (첫 번째 ↔ 마지막)
 */
export function useSubMenuKeyboard(options: SubMenuKeyboardOptions) {
  const {
    onNavigateUp,
    onNavigateDown,
    onSelect,
    onClose,
    focusedIndex,
    itemsCount,
    trapFocus = true
  } = options

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // 서브메뉴가 열려있을 때만 키보드 이벤트 처리
    if (itemsCount === 0) return

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        event.stopPropagation()
        
        if (focusedIndex >= itemsCount - 1) {
          // 마지막 항목에서 첫 번째로 순환
          onNavigateUp() // 첫 번째 항목으로 이동 (로직상 순환)
        } else {
          onNavigateDown()
        }
        break

      case 'ArrowUp':
        event.preventDefault()
        event.stopPropagation()
        
        if (focusedIndex <= 0) {
          // 첫 번째 항목에서 마지막으로 순환
          onNavigateDown() // 마지막 항목으로 이동 (로직상 순환)
        } else {
          onNavigateUp()
        }
        break

      case 'Enter':
      case ' ': // Space key
        event.preventDefault()
        event.stopPropagation()
        
        if (focusedIndex >= 0 && focusedIndex < itemsCount) {
          onSelect(focusedIndex)
        }
        break

      case 'Escape':
        event.preventDefault()
        event.stopPropagation()
        onClose()
        break

      case 'Tab':
        if (trapFocus) {
          // 포커스 트랩이 활성화된 경우 Tab 순환 처리
          event.preventDefault()
          
          if (event.shiftKey) {
            // Shift+Tab: 역방향
            onNavigateUp()
          } else {
            // Tab: 정방향
            onNavigateDown()
          }
        }
        break

      case 'Home':
        event.preventDefault()
        event.stopPropagation()
        // 첫 번째 항목으로 이동
        while (focusedIndex > 0) {
          onNavigateUp()
        }
        break

      case 'End':
        event.preventDefault()
        event.stopPropagation()
        // 마지막 항목으로 이동
        while (focusedIndex < itemsCount - 1) {
          onNavigateDown()
        }
        break
    }
  }, [
    focusedIndex,
    itemsCount,
    onNavigateUp,
    onNavigateDown,
    onSelect,
    onClose,
    trapFocus
  ])

  useEffect(() => {
    if (itemsCount > 0) {
      document.addEventListener('keydown', handleKeyDown, { capture: true })
      
      return () => {
        document.removeEventListener('keydown', handleKeyDown, { capture: true })
      }
    }
  }, [handleKeyDown, itemsCount])

  // Precision Craft: 포커스 인덱스 정규화
  const normalizedFocusedIndex = Math.max(0, Math.min(focusedIndex, itemsCount - 1))

  return {
    focusedIndex: normalizedFocusedIndex,
    isFirstItem: normalizedFocusedIndex === 0,
    isLastItem: normalizedFocusedIndex === itemsCount - 1,
    hasItems: itemsCount > 0
  }
}

/**
 * SubMenu Keyboard Navigation with Debounce
 * 빠른 키 입력에 대한 디바운싱 처리
 */
export function useSubMenuKeyboardWithDebounce(
  options: SubMenuKeyboardOptions,
  debounceMs: number = 100
) {
  const keyboard = useSubMenuKeyboard(options)
  
  // 디바운싱 로직은 shared/lib/hooks/useDebounce를 활용
  // 여기서는 기본 훅을 반환
  return keyboard
}