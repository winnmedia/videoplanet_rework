'use client'

import React, { forwardRef } from 'react'
import clsx from 'clsx'
import Image from 'next/image'
import { usePrecisionTiming } from '../../../features/navigation/lib/useReducedMotion'
import type { MenuItem } from '../../../entities/menu'
import styles from './MenuButton.module.scss'

interface MenuButtonProps {
  item: MenuItem
  isActive?: boolean
  isExpanded?: boolean
  onClick: () => void
  onFocus?: () => void
  className?: string
  tabIndex?: number
  'data-testid'?: string
}

/**
 * MenuButton Component - Shared UI Layer
 * FSD 아키텍처에 맞춘 재사용 가능한 메뉴 버튼
 * - 접근성 완전 지원
 * - Precision Craft 디자인
 * - 키보드 네비게이션
 * - 스크린 리더 친화적
 */
export const MenuButton = forwardRef<HTMLButtonElement, MenuButtonProps>(
  function MenuButton(
    {
      item,
      isActive = false,
      isExpanded = false,
      onClick,
      onFocus,
      className,
      tabIndex = 0,
      'data-testid': testId
    },
    ref
  ) {
    const { reducedMotion, createTransition } = usePrecisionTiming()

    // ARIA 레이블 생성
    const getAriaLabel = (): string => {
      if (item.hasSubMenu) {
        return `${item.label} 서브메뉴 ${isExpanded ? '닫기' : '열기'}`
      }
      return `${item.label}로 이동`
    }

    // 툴팁 텍스트 생성
    const getTooltipText = (): string => {
      return item.tooltip || item.label
    }

    return (
      <button
        ref={ref}
        type="button"
        className={clsx(
          styles.menuButton,
          {
            [styles.active]: isActive,
            [styles.hasSubMenu]: item.hasSubMenu,
            [styles.withCount]: typeof item.count === 'number',
            [styles.isNew]: item.isNew,
            [styles.isDeprecated]: item.isDeprecated,
            [styles.reducedMotion]: reducedMotion
          },
          className
        )}
        onClick={onClick}
        onFocus={onFocus}
        tabIndex={tabIndex}
        aria-label={getAriaLabel()}
        aria-expanded={item.hasSubMenu ? isExpanded : undefined}
        aria-current={isActive ? 'page' : undefined}
        title={getTooltipText()}
        data-testid={testId || `menu-button-${item.id}`}
        data-menu-id={item.id}
        style={createTransition()}
      >
        {/* Icon Container */}
        <div 
          className={clsx(styles.iconContainer, {
            [styles.active]: isActive
          })}
          aria-hidden="true"
        >
          <Image
            src={isActive ? item.activeIcon : item.icon}
            alt=""
            width={16}
            height={16}
            className={styles.icon}
          />
        </div>

        {/* Label */}
        <span className={styles.label}>
          {item.label}
        </span>

        {/* Count Badge */}
        {typeof item.count === 'number' && item.count > 0 && (
          <span 
            className={styles.countBadge}
            aria-label={`${item.count}개 항목`}
          >
            {item.count > 99 ? '99+' : item.count}
          </span>
        )}

        {/* Badge Text */}
        {item.badgeText && (
          <span 
            className={styles.badgeText}
            aria-label={item.badgeText}
          >
            {item.badgeText}
          </span>
        )}

        {/* New Indicator */}
        {item.isNew && (
          <span 
            className={styles.newIndicator}
            aria-label="새로운 기능"
          />
        )}

        {/* Deprecated Warning */}
        {item.isDeprecated && (
          <span 
            className={styles.deprecatedWarning}
            aria-label="곧 사라질 기능"
            title="이 기능은 곧 사라질 예정입니다"
          />
        )}

        {/* SubMenu Indicator */}
        {item.hasSubMenu && (
          <span 
            className={clsx(styles.subMenuIndicator, {
              [styles.expanded]: isExpanded
            })}
            aria-hidden="true"
          >
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              className={styles.chevron}
            >
              <path
                d="M2 3L4 5L6 3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
        )}

        {/* External Link Indicator */}
        {item.externalLink && (
          <span 
            className={styles.externalIndicator}
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
      </button>
    )
  }
)

export default MenuButton