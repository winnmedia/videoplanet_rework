'use client'

import clsx from 'clsx'
import Image from 'next/image'
import React, { forwardRef, useState, useCallback } from 'react'

import type { MenuItem } from '../../../entities/menu'
import { usePrecisionTiming } from '../../../features/navigation/lib/useReducedMotion'

interface MenuButtonProps {
  item: MenuItem
  isActive?: boolean
  isExpanded?: boolean
  isLoading?: boolean
  onClick: () => void
  onFocus?: () => void
  onMouseEnter?: () => void
  className?: string
  tabIndex?: number
  'data-testid'?: string
}

/**
 * MenuButtonImproved Component - Enhanced Shared UI Layer
 * Tailwind CSS 기반 개선된 메뉴 버튼
 * - 향상된 접근성 완전 지원
 * - 부드러운 애니메이션 및 마이크로 인터랙션
 * - 로딩 상태 지원
 * - 키보드 네비게이션 최적화
 * - 스크린 리더 친화적
 */
export const MenuButtonImproved = forwardRef<HTMLButtonElement, MenuButtonProps>(
  function MenuButtonImproved(
    {
      item,
      isActive = false,
      isExpanded = false,
      isLoading = false,
      onClick,
      onFocus,
      onMouseEnter,
      className,
      tabIndex = 0,
      'data-testid': testId
    },
    ref
  ) {
    const { reducedMotion } = usePrecisionTiming()
    const [isPressed, setIsPressed] = useState(false)
    const [ripplePosition, setRipplePosition] = useState<{ x: number; y: number } | null>(null)

    // ARIA 레이블 생성
    const getAriaLabel = useCallback((): string => {
      let label = item.label
      
      if (item.hasSubMenu) {
        label += ` 서브메뉴 ${isExpanded ? '닫기' : '열기'}`
      } else {
        label += '로 이동'
      }
      
      if (typeof item.count === 'number' && item.count > 0) {
        label += `, ${item.count}개 항목`
      }
      
      if (isLoading) {
        label += ', 로딩 중'
      }
      
      return label
    }, [item.label, item.hasSubMenu, item.count, isExpanded, isLoading])

    // 상태별 설명 텍스트 생성
    const getAriaDescription = useCallback((): string => {
      const descriptions = []
      
      if (isActive) {
        descriptions.push('현재 활성화된 메뉴입니다')
      }
      
      if (item.hasSubMenu) {
        descriptions.push('서브메뉴가 있습니다. Enter 또는 Space로 열 수 있습니다')
      }
      
      if (item.path.startsWith('http')) {
        descriptions.push('외부 링크입니다. 새 탭에서 열립니다')
      }
      
      return descriptions.join('. ')
    }, [isActive, item.hasSubMenu, item.path])

    // 리플 효과 처리
    const handleMouseDown = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      if (reducedMotion) return
      
      const rect = event.currentTarget.getBoundingClientRect()
      setRipplePosition({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      })
      setIsPressed(true)
      
      setTimeout(() => {
        setRipplePosition(null)
        setIsPressed(false)
      }, 600)
    }, [reducedMotion])

    const handleClick = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
      handleMouseDown(event)
      onClick()
    }, [handleMouseDown, onClick])

    return (
      <button
        ref={ref}
        type="button"
        className={clsx(
          // Base styles with enhanced visual feedback
          'group relative flex items-center w-full px-3 py-3 rounded-xl text-left',
          'transition-all duration-200 ease-out overflow-hidden',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
          
          // Hover effects
          'hover:bg-gray-50 hover:scale-102 hover:shadow-md',
          'hover:border-gray-200',
          
          // Active state
          isActive && [
            'bg-blue-50 text-blue-900 border-blue-200',
            'ring-1 ring-blue-200',
            'shadow-sm'
          ],
          
          // Loading state
          isLoading && 'opacity-75 cursor-wait',
          
          // Expanded state for submenu
          isExpanded && [
            'bg-gray-100',
            'shadow-inner'
          ],
          
          // Pressed state
          isPressed && 'scale-95',
          
          // Reduced motion
          reducedMotion && 'transition-none hover:scale-100',
          
          // Border
          'border border-transparent',
          
          className
        )}
        onClick={handleClick}
        onFocus={onFocus}
        onMouseEnter={onMouseEnter}
        onMouseDown={handleMouseDown}
        tabIndex={tabIndex}
        aria-label={getAriaLabel()}
        aria-describedby={`menu-desc-${item.id}`}
        aria-expanded={item.hasSubMenu ? isExpanded : undefined}
        aria-current={isActive ? 'page' : undefined}
        disabled={isLoading}
        data-testid={testId || `menu-button-${item.id}`}
        data-menu-id={item.id}
      >
        {/* Hidden Description for Screen Readers */}
        <span 
          id={`menu-desc-${item.id}`} 
          className="sr-only"
        >
          {getAriaDescription()}
        </span>

        {/* Ripple Effect */}
        {ripplePosition && !reducedMotion && (
          <span
            className="absolute bg-blue-400 rounded-full opacity-30 animate-ping pointer-events-none"
            style={{
              left: ripplePosition.x - 10,
              top: ripplePosition.y - 10,
              width: 20,
              height: 20,
            }}
          />
        )}

        {/* Icon Container with Enhanced Styling */}
        <div 
          className={clsx(
            'relative flex-shrink-0 w-6 h-6 mr-3',
            'transition-all duration-200',
            // Shimmer effect for loading
            isLoading && 'animate-pulse bg-gray-200 rounded',
            // Scale on active
            isActive && 'scale-110',
            // Group hover effect
            'group-hover:scale-110'
          )}
          aria-hidden="true"
        >
          {!isLoading ? (
            <>
              <Image
                src={isActive ? item.activeIcon : item.icon}
                alt=""
                width={24}
                height={24}
                className={clsx(
                  'w-full h-full object-contain',
                  'transition-opacity duration-200',
                  isActive && 'drop-shadow-sm'
                )}
                priority={isActive}
              />
              
              {/* Icon glow effect for active state */}
              {isActive && !reducedMotion && (
                <div className="absolute inset-0 bg-blue-400 opacity-20 blur-sm rounded-full -z-10" />
              )}
            </>
          ) : (
            // Loading shimmer for icon
            <div 
              className="w-full h-full bg-gray-300 rounded animate-pulse"
              data-testid="shimmer-effect"
            />
          )}
        </div>

        {/* Label Container */}
        <div className="flex-1 min-w-0">
          <span 
            className={clsx(
              'block text-sm font-medium truncate',
              'transition-colors duration-200',
              isActive ? 'text-blue-900' : 'text-gray-900',
              'group-hover:text-gray-900'
            )}
          >
            {item.label}
          </span>
          
          {/* Loading state indicator text */}
          {isLoading && (
            <span className="block text-xs text-gray-500 animate-pulse">
              로딩 중...
            </span>
          )}
        </div>

        {/* Right side elements container */}
        <div className="flex items-center space-x-2 ml-2">
          {/* Count Badge */}
          {typeof item.count === 'number' && item.count > 0 && (
            <span 
              className={clsx(
                'inline-flex items-center justify-center',
                'min-w-[20px] h-5 px-1.5',
                'text-xs font-semibold',
                'rounded-full',
                'transition-all duration-200',
                isActive 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-200 text-gray-700 group-hover:bg-gray-300'
              )}
              aria-label={`${item.count}개 항목`}
            >
              {item.count > 99 ? '99+' : item.count}
            </span>
          )}

          {/* Loading Spinner */}
          {isLoading && (
            <div 
              className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"
              aria-label="로딩 중"
            />
          )}

          {/* External Link Indicator */}
          {item.path.startsWith('http') && (
            <span 
              className={clsx(
                'p-1 rounded',
                'text-gray-500 group-hover:text-gray-700',
                'transition-colors duration-200'
              )}
              aria-label="외부 링크"
              title="새 탭에서 열립니다"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M3.5 3.5L8.5 3.5L8.5 8.5"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.5 3.5L3.5 8.5"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          )}

          {/* SubMenu Indicator with Enhanced Animation */}
          {item.hasSubMenu && (
            <span 
              className={clsx(
                'p-1 rounded-full',
                'transition-all duration-300',
                isExpanded ? 'rotate-180 bg-gray-200' : 'rotate-0',
                'group-hover:bg-gray-100'
              )}
              aria-hidden="true"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                className="transition-transform duration-300"
              >
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
          )}
        </div>

        {/* Focus indicator */}
        <div 
          className={clsx(
            'absolute inset-0 rounded-xl border-2 border-transparent',
            'transition-colors duration-200',
            'group-focus-visible:border-blue-500'
          )}
          aria-hidden="true"
        />
      </button>
    )
  }
)

export default MenuButtonImproved