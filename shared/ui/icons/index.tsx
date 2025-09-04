'use client'

import React from 'react'

interface IconProps {
  className?: string
  size?: number | string
  'aria-label'?: string
}

/**
 * Project Icon - 프로젝트 관련 아이콘
 */
export function ProjectIcon({ className = '', size = 20, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block ${className}`}
      aria-label={ariaLabel || '프로젝트'}
      role="img"
      {...props}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  )
}

/**
 * Feedback Icon - 피드백 관련 아이콘
 */
export function FeedbackIcon({ className = '', size = 20, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block ${className}`}
      aria-label={ariaLabel || '피드백'}
      role="img"
      {...props}
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      <line x1="9" y1="9" x2="15" y2="9" />
      <line x1="9" y1="13" x2="15" y2="13" />
    </svg>
  )
}

/**
 * Planning Icon - 영상 기획 관련 아이콘
 */
export function PlanningIcon({ className = '', size = 20, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block ${className}`}
      aria-label={ariaLabel || '영상 기획'}
      role="img"
      {...props}
    >
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}

/**
 * Team Icon - 팀/사용자 관련 아이콘
 */
export function TeamIcon({ className = '', size = 20, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block ${className}`}
      aria-label={ariaLabel || '팀'}
      role="img"
      {...props}
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

/**
 * Plus Icon - 추가/생성 관련 아이콘
 */
export function PlusIcon({ className = '', size = 20, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block ${className}`}
      aria-label={ariaLabel || '추가'}
      role="img"
      {...props}
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

/**
 * Progress Icon - 진행률/상태 관련 아이콘
 */
export function ProgressIcon({ className = '', size = 20, 'aria-label': ariaLabel, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block ${className}`}
      aria-label={ariaLabel || '진행률'}
      role="img"
      {...props}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  )
}

/**
 * Status Badge Icons - 프로젝트 상태별 아이콘
 */
export function StatusIcon({ 
  status, 
  className = '', 
  size = 16, 
  'aria-label': ariaLabel,
  ...props 
}: IconProps & { status: 'active' | 'completed' | 'pending' }) {
  const statusConfig = {
    active: {
      color: 'text-success-600',
      label: '진행중',
      path: <circle cx="12" cy="12" r="10" />,
      innerPath: <path d="M9 12l2 2 4-4" />
    },
    completed: {
      color: 'text-primary-600',
      label: '완료',
      path: <circle cx="12" cy="12" r="10" />,
      innerPath: <path d="M9 12l2 2 4-4" />
    },
    pending: {
      color: 'text-warning-600',
      label: '대기',
      path: <circle cx="12" cy="12" r="10" />,
      innerPath: <path d="M12 6v6l4 2" />
    }
  }

  const config = statusConfig[status]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`inline-block ${config.color} ${className}`}
      aria-label={ariaLabel || config.label}
      role="img"
      {...props}
    >
      {config.path}
      {config.innerPath}
    </svg>
  )
}