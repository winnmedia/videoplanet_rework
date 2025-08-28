'use client'

import { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
  'data-testid'?: string
  className?: string
}

/**
 * 빈 상태를 표시하는 컴포넌트 (Tailwind CSS 기반)
 * 사용자에게 명확한 피드백과 다음 액션을 안내
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  'data-testid': testId = 'empty-state',
  className = ''
}: EmptyStateProps) {
  return (
    <div 
      className={`text-center py-12 px-6 ${className}`}
      role="status"
      aria-live="polite"
      data-testid={testId}
    >
      {/* 아이콘 */}
      {icon && (
        <div className="mx-auto mb-4 w-16 h-16 text-gray-300" aria-hidden="true">
          {icon}
        </div>
      )}
      
      {/* 제목 */}
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {title}
      </h3>
      
      {/* 설명 */}
      <p className="text-gray-500 text-sm leading-relaxed mb-6 max-w-md mx-auto">
        {description}
      </p>
      
      {/* 액션 버튼 */}
      {action && (
        <div className="flex justify-center">
          {action}
        </div>
      )}
    </div>
  )
}