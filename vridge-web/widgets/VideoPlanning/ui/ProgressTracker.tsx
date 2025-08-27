'use client';

/**
 * @description Progress Tracker - 진행률 추적기
 * @purpose 프로젝트 진행 상황 시각화 및 통계
 */

import React from 'react';

import styles from './ProgressTracker.module.scss';
import { planningUtils } from '../api/planningApi';
import type { ProgressTrackerProps } from '../model/types';

export const ProgressTracker: React.FC<ProgressTrackerProps> = ({
  project,
  stats,
  showDetailedView = true,
  showBudgetInfo = true,
  className
}) => {
  const daysUntilShooting = project.shootingDate
    ? Math.ceil((new Date(project.shootingDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;
  
  const daysUntilDelivery = Math.ceil(
    (new Date(project.deliveryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className={`${styles.tracker} ${className || ''}`} data-testid="progress-tracker">
      <div className={styles.header}>
        <h3>진행 상황</h3>
      </div>

      {/* 전체 진행률 */}
      <div className={styles.overallProgress}>
        <div className={styles.progressHeader}>
          <span>전체 진행률</span>
          <span className={styles.percentage}>{stats.completionPercentage}% 완료</span>
        </div>
        <div className={styles.progressBar} role="progressbar" aria-valuenow={stats.completionPercentage} aria-valuemin={0} aria-valuemax={100} aria-label="프로젝트 진행률">
          <div 
            className={styles.progressFill} 
            style={{ width: `${stats.completionPercentage}%` }}
          />
        </div>
      </div>

      {/* 작업 통계 */}
      <div className={styles.taskStats}>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{stats.completedTasks}</span>
          <span className={styles.statLabel}>완료</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{stats.inProgressTasks}</span>
          <span className={styles.statLabel}>진행중</span>
        </div>
        <div className={styles.statItem}>
          <span className={styles.statNumber}>{stats.totalTasks - stats.completedTasks - stats.inProgressTasks}</span>
          <span className={styles.statLabel}>대기중</span>
        </div>
        {stats.blockedTasks > 0 && (
          <div className={styles.statItem}>
            <span className={`${styles.statNumber} ${styles.blocked}`}>{stats.blockedTasks}</span>
            <span className={styles.statLabel}>보류</span>
          </div>
        )}
      </div>

      {/* 일정 정보 */}
      <div className={styles.schedule}>
        {daysUntilShooting !== null && (
          <div className={styles.scheduleItem}>
            <span className={styles.scheduleLabel}>촬영까지</span>
            <span className={`${styles.scheduleValue} ${daysUntilShooting <= 3 ? styles.urgent : ''}`}>
              {daysUntilShooting}일 남음
            </span>
          </div>
        )}
        <div className={styles.scheduleItem}>
          <span className={styles.scheduleLabel}>납기까지</span>
          <span className={`${styles.scheduleValue} ${daysUntilDelivery <= 7 ? styles.urgent : ''}`}>
            {daysUntilDelivery}일 남음
          </span>
        </div>
      </div>

      {/* 예산 정보 */}
      {showBudgetInfo && (
        <div className={styles.budget}>
          <div className={styles.budgetHeader}>
            <span>예산 사용률</span>
            <span className={styles.budgetAmount}>
              {planningUtils.formatKoreanCurrency(project.budget.spent)} / {planningUtils.formatKoreanCurrency(project.budget.total)}
            </span>
          </div>
          <div className={styles.progressBar}>
            <div 
              className={styles.budgetFill} 
              style={{ width: `${planningUtils.calculateBudgetUsage(project.budget.spent, project.budget.total)}%` }}
            />
          </div>
        </div>
      )}

      {/* 마일스톤 */}
      {showDetailedView && stats.milestones.length > 0 && (
        <div className={styles.milestones}>
          <h4>주요 마일스톤</h4>
          {stats.milestones.map(milestone => (
            <div key={milestone.id} className={styles.milestone} data-testid={`stage-progress-${milestone.title}`}>
              <div className={styles.milestoneHeader}>
                <span className={styles.milestoneTitle}>{milestone.title}</span>
                <span className={styles.milestoneProgress}>{milestone.progress}%</span>
              </div>
              <div className={styles.milestoneBar}>
                <div 
                  className={`${styles.milestoneFill} ${styles[`status-${milestone.status}`]}`}
                  style={{ width: `${milestone.progress}%` }}
                />
              </div>
              <div className={styles.milestoneDate}>
                {new Date(milestone.dueDate).toLocaleDateString('ko-KR')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};