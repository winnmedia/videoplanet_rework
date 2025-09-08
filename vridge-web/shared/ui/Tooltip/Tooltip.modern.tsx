'use client'

import React, { useState, useRef, useId, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'

export interface TooltipProps {
  content: React.ReactNode
  children: React.ReactElement<any, any>
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  disabled?: boolean
}

/**
 * 접근성을 고려한 툴팁 컴포넌트 (React 19 + Tailwind CSS)
 * DEVPLAN.md 요구사항: 카운트다운 툴팁, 접근성 준수 (WCAG 2.1)
 */
export const Tooltip = React.memo(function Tooltip({
  content,
  children,
  position = 'top',
  delay = 0,
  disabled = false
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null)
  
  const triggerRef = useRef<HTMLElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  
  const tooltipId = useId()

  // 툴팁 위치 계산
  const calculatePosition = useCallback((triggerElement: HTMLElement) => {
    const rect = triggerElement.getBoundingClientRect()
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft
    const scrollY = window.pageYOffset || document.documentElement.scrollTop
    
    let top: number, left: number
    
    switch (position) {
      case 'top':
        top = rect.top + scrollY - 8 // 8px gap
        left = rect.left + scrollX + rect.width / 2
        break
      case 'bottom':
        top = rect.bottom + scrollY + 8
        left = rect.left + scrollX + rect.width / 2
        break
      case 'left':
        top = rect.top + scrollY + rect.height / 2
        left = rect.left + scrollX - 8
        break
      case 'right':
        top = rect.top + scrollY + rect.height / 2
        left = rect.right + scrollX + 8
        break
    }
    
    return { top, left }
  }, [position])

  // 툴팁 표시
  const showTooltip = useCallback(() => {
    if (disabled || !triggerRef.current) return

    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setTooltipPosition(calculatePosition(triggerRef.current!))
        setIsVisible(true)
      }, delay)
    } else {
      setTooltipPosition(calculatePosition(triggerRef.current))
      setIsVisible(true)
    }
  }, [disabled, delay, calculatePosition])

  // 툴팁 숨기기
  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setIsVisible(false)
    setTooltipPosition(null)
  }, [])

  // 키보드 이벤트 핸들러
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      hideTooltip()
    }
  }, [hideTooltip])

  // 키보드 이벤트 리스너 등록/해제
  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, handleKeyDown])

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // 트리거 요소에 이벤트 핸들러 추가
  const childProps = children.props as Record<string, any>
  const originalRef = (children as any).ref
  
  const clonedChildren = React.cloneElement(children, {
    ...childProps,
    ref: (element: HTMLElement | null) => {
      // React 19 ref 합성 처리
      triggerRef.current = element
      if (typeof originalRef === 'function') {
        originalRef(element)
      } else if (originalRef && typeof originalRef === 'object') {
        originalRef.current = element
      }
    },
    onMouseEnter: (event: React.MouseEvent) => {
      childProps?.onMouseEnter?.(event)
      showTooltip()
    },
    onMouseLeave: (event: React.MouseEvent) => {
      childProps?.onMouseLeave?.(event)
      hideTooltip()
    },
    onFocus: (event: React.FocusEvent) => {
      childProps?.onFocus?.(event)
      showTooltip()
    },
    onBlur: (event: React.FocusEvent) => {
      childProps?.onBlur?.(event)
      hideTooltip()
    },
    'aria-describedby': isVisible ? tooltipId : childProps?.['aria-describedby']
  })

  // 툴팁 스타일
  const getTooltipClasses = () => {
    const baseClasses = 'absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap pointer-events-none transition-opacity duration-200'
    
    const positionClasses = {
      top: 'transform -translate-x-1/2 -translate-y-full',
      bottom: 'transform -translate-x-1/2',
      left: 'transform -translate-y-1/2 -translate-x-full',
      right: 'transform -translate-y-1/2'
    }
    
    return `${baseClasses} ${positionClasses[position]} ${
      isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
    }`
  }

  // 화살표 스타일
  const getArrowClasses = () => {
    const baseClasses = 'absolute w-0 h-0'
    
    switch (position) {
      case 'top':
        return `${baseClasses} top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900`
      case 'bottom':
        return `${baseClasses} bottom-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900`
      case 'left':
        return `${baseClasses} left-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-900`
      case 'right':
        return `${baseClasses} right-full top-1/2 transform -translate-y-1/2 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900`
    }
  }

  return (
    <>
      {clonedChildren}
      {typeof document !== 'undefined' && tooltipPosition && createPortal(
        <div
          id={tooltipId}
          ref={tooltipRef}
          role="tooltip"
          className={getTooltipClasses()}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left
          }}
          aria-hidden={!isVisible}
        >
          {content}
          <div className={getArrowClasses()} />
        </div>,
        document.body
      )}
    </>
  )
})