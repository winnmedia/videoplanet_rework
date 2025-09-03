import React from 'react'
import { clsx } from 'clsx'
import Link from 'next/link'

export interface SubmenuItemProps {
  /** 메뉴 아이템 텍스트 */
  children: React.ReactNode
  /** 링크 URL (제공되지 않으면 버튼으로 렌더링) */
  href?: string
  /** 클릭 핸들러 (버튼 모드에서 사용) */
  onClick?: () => void
  /** 키보드 네비게이션을 위한 키다운 핸들러 */
  onKeyDown?: (event: React.KeyboardEvent) => void
  /** 추가 CSS 클래스명 */
  className?: string
  /** 아이콘 컴포넌트 */
  icon?: React.ReactNode
  /** 위험 액션 (예: 로그아웃) 표시 */
  variant?: 'default' | 'danger'
  /** 접근성을 위한 설명 텍스트 */
  'aria-label'?: string
  /** 테스트 식별자 */
  'data-testid'?: string
}

export const SubmenuItem = React.forwardRef<HTMLElement, SubmenuItemProps>(
  ({ 
    children, 
    href, 
    onClick, 
    onKeyDown,
    className,
    icon,
    variant = 'default',
    'aria-label': ariaLabel,
    'data-testid': dataTestId,
    ...rest 
  }, ref) => {
    const baseClasses = clsx(
      // Layout
      'flex items-center w-full px-4 py-2 text-sm',
      // Typography
      'text-left font-medium',
      // Interaction states
      'hover:bg-gray-100 focus:bg-gray-100',
      // Focus management
      'focus:outline-none focus:ring-0',
      // Transitions
      'transition-colors duration-150',
      // Variant styles
      {
        'text-gray-700': variant === 'default',
        'text-red-600 hover:bg-red-50 focus:bg-red-50': variant === 'danger',
      },
      className
    )

    const content = (
      <>
        {icon && (
          <span className="mr-3 flex-shrink-0 w-4 h-4" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="truncate">{children}</span>
      </>
    )

    // 링크가 제공된 경우 Link 컴포넌트로 렌더링
    if (href) {
      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          href={href}
          className={baseClasses}
          onKeyDown={onKeyDown}
          role="menuitem"
          aria-label={ariaLabel}
          data-testid={dataTestId}
          {...rest}
        >
          {content}
        </Link>
      )
    }

    // 그렇지 않으면 버튼으로 렌더링
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        onClick={onClick}
        onKeyDown={onKeyDown}
        className={baseClasses}
        role="menuitem"
        aria-label={ariaLabel}
        type="button"
        data-testid={dataTestId}
        {...rest}
      >
        {content}
      </button>
    )
  }
)

SubmenuItem.displayName = 'SubmenuItem'