'use client'

/**
 * Workflow Progress Visualization Component
 * XState 8단계 워크플로우 진행 상황 시각화
 */

import React, { useMemo } from 'react'

import { WorkflowStage } from '@/processes/video-production/model/workflowMachine'

import styles from './WorkflowProgressVisualization.module.scss'
import { WorkflowProgressProps, WorkflowStageData } from '../model/types'

// 헬퍼 함수: 단계별 예상 시간 계산
const getEstimatedTime = (stage: string, metadata: Record<string, any>): number => {
  const baseTime = metadata.estimatedMinutes || 30 // 기본 30분
  return baseTime
}

const STAGE_INFO: Record<WorkflowStage, { label: string; icon: string; color: string; description: string }> = {
  planning: {
    label: '기획',
    icon: '📝',
    color: '#0031ff',
    description: '프로젝트 기획 및 컨셉 설정'
  },
  scripting: {
    label: '대본',
    icon: '📄',
    color: '#17a2b8',
    description: '스크립트 작성 및 검토'
  },
  storyboard: {
    label: '스토리보드',
    icon: '🎨',
    color: '#28a745',
    description: '스토리보드 제작 및 승인'
  },
  shooting: {
    label: '촬영',
    icon: '📹',
    color: '#ffc107',
    description: '비디오 촬영 및 제작'
  },
  editing: {
    label: '편집',
    icon: '✂️',
    color: '#fd7e14',
    description: '비디오 편집 및 컷 작업'
  },
  post_production: {
    label: '후반작업',
    icon: '🎧',
    color: '#6f42c1',
    description: '사운드 믹싱 및 효과 작업'
  },
  review: {
    label: '리뷰',
    icon: '👀',
    color: '#e83e8c',
    description: '최종 검토 및 피드백'
  },
  delivery: {
    label: '배포',
    icon: '🚀',
    color: '#20c997',
    description: '최종 산출물 배포'
  }
}

export const WorkflowProgressVisualization: React.FC<WorkflowProgressProps> = ({
  workflow,
  isLoading = false,
  onStageClick,
  className = '',
  'data-testid': testId = 'workflow-progress-visualization'
}) => {
  // 단계별 데이터 처리
  const stageData = useMemo((): WorkflowStageData[] => {
    const stages: WorkflowStage[] = [
      'planning', 'scripting', 'storyboard', 'shooting',
      'editing', 'post_production', 'review', 'delivery'
    ]

    return stages.map((stage, index) => {
      const isCompleted = workflow.completedStages.includes(stage)
      const isCurrent = !isCompleted && (
        index === 0 || workflow.completedStages.includes(stages[index - 1])
      )
      const progress = isCompleted ? 100 : (isCurrent ? workflow.currentProgress : 0)
      
      return {
        stage,
        isCompleted,
        isCurrent,
        progress,
        metadata: workflow.stageMetadata?.[stage] || {},
        estimatedTime: getEstimatedTime(stage, workflow.stageMetadata?.[stage] || {})
      }
    })
  }, [workflow])

  // 전체 진행률 계산
  const overallProgress = useMemo(() => {
    return Math.round((workflow.completedStages.length / 8) * 100)
  }, [workflow.completedStages.length])

  // 예상 완료일 계산
  const estimatedCompletion = useMemo(() => {
    const today = new Date()
    const completionDate = new Date(today.getTime() + workflow.estimatedCompletionDays * 24 * 60 * 60 * 1000)
    return completionDate.toLocaleDateString('ko-KR', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }, [workflow.estimatedCompletionDays])

  // 현재 단계 상태 메시지
  const currentStageMessage = useMemo(() => {
    const completedCount = workflow.completedStages.length
    if (completedCount === 8) return '프로젝트가 완료되었습니다!'
    if (completedCount === 0) return '기획 단계를 시작해주세요'
    
    const currentStage = stageData.find(s => s.isCurrent)
    if (currentStage) {
      return `${STAGE_INFO[currentStage.stage].label} 단계를 진행 중입니다`
    }
    
    return '다음 단계로 진행해주세요'
  }, [stageData, workflow.completedStages.length])

  // 단계 클릭 핸들러
  const handleStageClick = (stage: WorkflowStage) => {
    if (onStageClick && !isLoading) {
      onStageClick(stage)
    }
  }

  // 예상 시간 계산 도우미 함수
  function getEstimatedTime(stage: WorkflowStage, metadata: any): number {
    const defaultTimes = {
      planning: 2,
      scripting: 3,
      storyboard: 2,
      shooting: 5,
      editing: 7,
      post_production: 4,
      review: 2,
      delivery: 1
    }
    
    if (metadata?.estimatedDays) {
      return metadata.estimatedDays
    }
    
    return defaultTimes[stage] || 1
  }

  if (isLoading) {
    return (
      <div 
        className={`${styles.container} ${styles.loading} ${className}`}
        data-testid={testId}
        aria-label="워크플로우 진행 상황 로딩 중"
      >
        <div className={styles.loadingSkeleton}>
          <div className={styles.skeletonHeader} />
          <div className={styles.skeletonProgress} />
          <div className={styles.skeletonStages}>
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className={styles.skeletonStage} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div 
      className={`${styles.container} ${className}`}
      data-testid={testId}
      role="region"
      aria-labelledby="workflow-title"
      aria-describedby="workflow-description"
    >
      {/* 헤더 */}
      <div className={styles.header}>
        <h2 id="workflow-title" className={styles.title}>
          워크플로우 진행 상황
        </h2>
        <div className={styles.projectInfo}>
          <div className={styles.projectTitle}>{workflow.title}</div>
          <div className={styles.projectMeta}>
            ID: {workflow.projectId} | 예상 완료: {estimatedCompletion}
          </div>
        </div>
      </div>

      {/* 전체 진행률 */}
      <div className={styles.overallProgress}>
        <div className={styles.progressHeader}>
          <span className={styles.progressLabel}>전체 진행률</span>
          <span className={styles.progressPercentage}>{overallProgress}%</span>
        </div>
        <div 
          className={styles.progressBar}
          role="progressbar"
          aria-valuenow={overallProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`전체 진행률 ${overallProgress}%`}
        >
          <div 
            className={styles.progressFill}
            style={{ width: `${overallProgress}%` }}
          />
        </div>
        <div 
          id="workflow-description" 
          className={styles.statusMessage}
          role="status"
          aria-live="polite"
        >
          {currentStageMessage}
        </div>
      </div>

      {/* 단계별 진행 상황 */}
      <div className={styles.stages}>
        {stageData.map((stage, index) => {
          const stageInfo = STAGE_INFO[stage.stage]
          const isClickable = onStageClick && (stage.isCompleted || stage.isCurrent)
          
          return (
            <div
              key={stage.stage}
              className={`
                ${styles.stage}
                ${stage.isCompleted ? styles.stageCompleted : ''}
                ${stage.isCurrent ? styles.stageCurrent : ''}
                ${isClickable ? styles.stageClickable : ''}
              `}
              onClick={() => handleStageClick(stage.stage)}
              onKeyDown={(e) => {
                if ((e.key === 'Enter' || e.key === ' ') && isClickable) {
                  e.preventDefault()
                  handleStageClick(stage.stage)
                }
              }}
              role={isClickable ? 'button' : 'status'}
              tabIndex={isClickable ? 0 : -1}
              aria-label={`
                ${stageInfo.label} 단계: 
                ${stage.isCompleted ? '완료' : stage.isCurrent ? '진행 중' : '대기 중'}
                ${isClickable ? ' - 클릭하여 상세 정보 보기' : ''}
              `}
            >
              {/* 단계 아이콘 */}
              <div className={styles.stageIcon} style={{ color: stageInfo.color }}>
                {stageInfo.icon}
              </div>
              
              {/* 단계 정보 */}
              <div className={styles.stageInfo}>
                <div className={styles.stageName}>{stageInfo.label}</div>
                <div className={styles.stageDescription}>{stageInfo.description}</div>
                
                {/* 단계 상태 */}
                <div className={styles.stageStatus}>
                  {stage.isCompleted && (
                    <span className={styles.statusCompleted}>✓ 완료</span>
                  )}
                  {stage.isCurrent && (
                    <span className={styles.statusCurrent}>진행 중</span>
                  )}
                  {!stage.isCompleted && !stage.isCurrent && (
                    <span className={styles.statusPending}>대기</span>
                  )}
                </div>
                
                {/* 메타데이터 */}
                {stage.metadata && (
                  <div className={styles.stageMetadata}>
                    {stage.stage === 'scripting' && (stage.metadata as any)?.scriptLength && (
                      <span>대본 길이: {(stage.metadata as any).scriptLength}줄</span>
                    )}
                    {stage.stage === 'shooting' && (stage.metadata as any)?.footageHours && (
                      <span>촬영 시간: {(stage.metadata as any).footageHours}시간</span>
                    )}
                    {stage.stage === 'editing' && (stage.metadata as any)?.cuts && (
                      <span>컷 수: {(stage.metadata as any).cuts}개</span>
                    )}
                  </div>
                )}
                
                {/* 예상 소요 시간 */}
                <div className={styles.estimatedTime}>
                  예상: {stage.estimatedTime}일
                </div>
              </div>
              
              {/* 진행 표시기 */}
              {stage.isCurrent && stage.progress > 0 && (
                <div className={styles.stageProgress}>
                  <div 
                    className={styles.stageProgressBar}
                    role="progressbar"
                    aria-valuenow={stage.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${stageInfo.label} 단계 진행률 ${stage.progress}%`}
                  >
                    <div 
                      className={styles.stageProgressFill}
                      style={{ 
                        width: `${stage.progress}%`,
                        backgroundColor: stageInfo.color 
                      }}
                    />
                  </div>
                  <span className={styles.stageProgressText}>
                    {Math.round(stage.progress)}%
                  </span>
                </div>
              )}
              
              {/* 연결선 */}
              {index < stageData.length - 1 && (
                <div className={`
                  ${styles.connector}
                  ${stage.isCompleted ? styles.connectorCompleted : ''}
                `} aria-hidden="true" />
              )}
            </div>
          )
        })}
      </div>

      {/* 위젯 연동 정보 */}
      {workflow.connectedWidgets.length > 0 && (
        <div className={styles.widgetConnections}>
          <h3>연동된 위젯</h3>
          <div className={styles.connectedWidgets}>
            {workflow.connectedWidgets.map(widget => (
              <div key={widget} className={styles.widgetChip}>
                {widget === 'videoPlanning' && '📋 영상 기획'}
                {widget === 'videoFeedback' && '💬 영상 피드백'}
                {widget}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 일시정지/에러 상태 */}
      {workflow.pauseReason && (
        <div className={styles.pausedAlert} role="alert">
          <div className={styles.alertIcon}>⏸️</div>
          <div className={styles.alertContent}>
            <strong>워크플로우 일시정지</strong>
            <p>{workflow.pauseReason}</p>
          </div>
        </div>
      )}
      
      {workflow.rejectionReason && (
        <div className={styles.rejectionAlert} role="alert">
          <div className={styles.alertIcon}>⚠️</div>
          <div className={styles.alertContent}>
            <strong>기획 수정 필요</strong>
            <p>{workflow.rejectionReason}</p>
          </div>
        </div>
      )}
    </div>
  )
}