'use client'

import React from 'react'

import styles from './ProjectStatusCard.module.scss'
import type { ProjectStatusCardProps } from '../model/types'

// 상태별 한국어 매핑
const STATUS_LABELS = {
  planning: '기획중',
  shooting: '촬영중',
  editing: '편집중', 
  completed: '완료',
  cancelled: '취소됨'
} as const

// 상태별 색상 클래스 매핑
const STATUS_CLASSES = {
  planning: styles.statusPlanning,
  shooting: styles.statusShooting,
  editing: styles.statusEditing,
  completed: styles.statusCompleted,
  cancelled: styles.statusCancelled
} as const

// 우선순위별 색상 클래스 매핑
const PRIORITY_CLASSES = {
  high: styles.priorityHigh,
  medium: styles.priorityMedium,
  low: styles.priorityLow
} as const

// 우선순위별 한국어 매핑
const PRIORITY_LABELS = {
  high: '높음',
  medium: '보통',
  low: '낮음'
} as const

export const ProjectStatusCard: React.FC<ProjectStatusCardProps> = ({
  project,
  onClick,
  showProgress = true,
  compact = false
}) => {
  const handleClick = () => {
    onClick?.(project.id)
  }

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick?.(project.id)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const cardClasses = [
    styles.projectCard,
    'project-card',
    'hover-lift',
    compact ? styles.compact : ''
  ].filter(Boolean).join(' ')

  return (
    <div
      className={cardClasses}
      onClick={onClick ? handleClick : undefined}
      onKeyDown={onClick ? handleKeyPress : undefined}
      role={onClick ? 'button' : 'article'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? project.title : undefined}
      data-testid="project-status-card"
      style={{ borderRadius: '20px' }} // legacy-card 스타일 적용
    >
      {/* 카드 헤더 */}
      <div className={styles.cardHeader}>
        <div className={styles.projectInfo}>
          <h3 className={styles.projectTitle}>{project.title}</h3>
          <div className={styles.metaInfo}>
            <span className={`${styles.statusBadge} ${STATUS_CLASSES[project.status]}`}>
              {STATUS_LABELS[project.status]}
            </span>
            <span className={`${styles.priorityBadge} ${PRIORITY_CLASSES[project.priority]}`}>
              {PRIORITY_LABELS[project.priority]}
            </span>
          </div>
        </div>

        {/* 팀 멤버 수 (있는 경우) */}
        {project.teamMembers && !compact && (
          <div className={styles.teamInfo}>
            <span className={styles.teamIcon}>👥</span>
            <span className={styles.teamCount}>{project.teamMembers}</span>
          </div>
        )}
      </div>

      {/* 진행률 (showProgress가 true일 때만) */}
      {showProgress && (
        <div className={styles.progressSection}>
          <div className={styles.progressHeader}>
            <span className={styles.progressLabel}>진행률</span>
            <span className={styles.progressValue}>{project.progress}%</span>
          </div>
          <div className={styles.progressBarContainer}>
            <div
              className={styles.progressBar}
              role="progressbar"
              aria-valuenow={project.progress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${project.title} 프로젝트 ${project.progress}% 완료`}
            >
              <div
                className={styles.progressFill}
                style={{ width: `${project.progress}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 날짜 정보 */}
      {!compact && (
        <div className={styles.dateInfo}>
          <div className={styles.dateItem}>
            <span className={styles.dateLabel}>시작일</span>
            <span className={styles.dateValue}>{formatDate(project.startDate)}</span>
          </div>
          {project.endDate && (
            <div className={styles.dateItem}>
              <span className={styles.dateLabel}>종료일</span>
              <span className={styles.dateValue}>{formatDate(project.endDate)}</span>
            </div>
          )}
        </div>
      )}

      {/* Compact 모드에서는 간단한 정보만 */}
      {compact && (
        <div className={styles.compactInfo}>
          <span className={styles.compactDate}>{formatDate(project.startDate)}</span>
          {project.endDate && (
            <span className={styles.compactEndDate}>
              ~ {formatDate(project.endDate)}
            </span>
          )}
        </div>
      )}

      {/* 클릭 가능한 경우 화살표 아이콘 */}
      {onClick && (
        <div className={styles.actionIcon}>
          →
        </div>
      )}
    </div>
  )
}

// 기본 props 설정
ProjectStatusCard.displayName = 'ProjectStatusCard'