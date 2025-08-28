/**
 * UnreadBadge 컴포넌트
 * TDD Green Phase: 읽지 않음 배지 시스템 구현
 * 
 * 기능:
 * - 미열람 수를 점 배지로 표시 (최대 9+)
 * - 우선순위별 색상 구분
 * - 크기 변형 지원 (sm, md, lg)
 * - 접근성 ARIA 레이블 동적 갱신
 * - 높은 우선순위 시 펄스 애니메이션
 */

import type { UnreadBadgeProps } from '../model/types'

export function UnreadBadge({
  count,
  priority = 'medium',
  size = 'md',
  showZero = false,
  className = '',
  ariaLabel
}: UnreadBadgeProps) {
  // 음수나 NaN 처리
  const normalizedCount = isNaN(count) || count < 0 ? 0 : count
  
  // 0일 때 숨김 처리 (showZero가 false인 경우)
  if (normalizedCount === 0 && !showZero) {
    return null
  }

  // 표시할 텍스트 (9 초과 시 9+)
  const displayText = normalizedCount > 9 ? '9+' : normalizedCount.toString()

  // 우선순위별 색상
  const getPriorityColor = () => {
    switch (priority) {
      case 'high': return 'bg-error-500'
      case 'medium': return 'bg-warning-500'
      case 'low': return 'bg-gray-500'
      default: return 'bg-primary-500'
    }
  }

  // 크기별 클래스
  const getSizeClasses = () => {
    switch (size) {
      case 'sm': return 'min-w-4 h-4 px-1 text-xs'
      case 'lg': return 'min-w-8 h-8 px-2 text-base'
      case 'md':
      default: return 'min-w-6 h-6 px-2 text-sm'
    }
  }

  // ARIA 레이블 생성
  const getAriaLabel = () => {
    if (ariaLabel) return ariaLabel
    
    const priorityPrefix = priority === 'high' ? '중요한 ' : ''
    return `${priorityPrefix}읽지 않음 ${normalizedCount}개`
  }

  // 애니메이션 클래스 (높은 우선순위만)
  const getAnimationClass = () => {
    return priority === 'high' ? 'animate-pulse-soft' : ''
  }

  return (
    <span
      className={`
        inline-flex items-center justify-center
        ${getSizeClasses()}
        ${getPriorityColor()}
        text-white font-bold
        rounded-full
        ${getAnimationClass()}
        ${className}
      `.trim()}
      role="status"
      aria-label={getAriaLabel()}
    >
      {displayText}
    </span>
  )
}