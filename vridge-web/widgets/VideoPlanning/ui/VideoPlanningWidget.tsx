'use client';

/**
 * @description Video Planning Widget - 메인 위젯
 * @purpose 비디오 기획 프로젝트의 통합 인터페이스
 */

import React, { useState, useEffect, useCallback } from 'react';

import { CollaborationPanel } from './CollaborationPanel';
import { PlanningBoard } from './PlanningBoard';
import { ProgressTracker } from './ProgressTracker';
import { ScriptEditor } from './ScriptEditor';
import { ShotList } from './ShotList';
import styles from './VideoPlanningWidget.module.scss';
import { VideoPlanningApi } from '../api/planningApi';
import type {
  VideoPlanningProject,
  VideoPlanningWidgetProps,
  PlanningStage,
  ProgressStats
} from '../model/types';

export const VideoPlanningWidget: React.FC<VideoPlanningWidgetProps> = ({
  projectId,
  mode = 'edit',
  showSidebar = true,
  defaultStage = 'concept',
  onProjectUpdate,
  onError,
  className
}) => {
  const [project, setProject] = useState<VideoPlanningProject | null>(null);
  const [progressStats, setProgressStats] = useState<ProgressStats | null>(null);
  const [currentStage, setCurrentStage] = useState<PlanningStage>(defaultStage);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // 프로젝트 데이터 로드
  const loadProject = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [projectResponse, statsResponse] = await Promise.all([
        VideoPlanningApi.getProject(projectId),
        VideoPlanningApi.getProgressStats(projectId)
      ]);

      setProject(projectResponse.project);
      setProgressStats(statsResponse);
      // defaultStage prop이 있으면 우선 사용, 없으면 API 응답의 currentStage 사용
      setCurrentStage(defaultStage || projectResponse.project.currentStage);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '프로젝트를 불러올 수 없습니다';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, onError]);

  // 프로젝트 업데이트
  const updateProject = useCallback(async (updates: Partial<VideoPlanningProject>) => {
    if (!project) return;

    try {
      setIsAutoSaving(true);
      
      const response = await VideoPlanningApi.updateProject(projectId, updates);
      const updatedProject = response.project;
      
      setProject(updatedProject);
      setLastSaved(new Date());
      onProjectUpdate?.(updatedProject);
      
      // 진행률 통계 업데이트
      const newStats = await VideoPlanningApi.getProgressStats(projectId);
      setProgressStats(newStats);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '프로젝트 저장에 실패했습니다';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsAutoSaving(false);
    }
  }, [project, projectId, onProjectUpdate, onError]);

  // 단계 변경 핸들러
  const handleStageChange = useCallback((newStage: PlanningStage) => {
    setCurrentStage(newStage);
    updateProject({ currentStage: newStage });
  }, [updateProject]);

  // 실시간 협업 이벤트 리스너
  useEffect(() => {
    const handleProjectUpdate = (event: CustomEvent) => {
      if (event.detail && event.detail.id === projectId) {
        setProject(event.detail);
      }
    };

    const handleUserCursor = (event: CustomEvent) => {
      // 다른 사용자 커서 위치 표시 (실시간 협업)
      console.log('User cursor update:', event.detail);
    };

    const handleEditConflict = (event: CustomEvent) => {
      // 동시 편집 충돌 처리
      console.log('Edit conflict detected:', event.detail);
    };

    window.addEventListener('project-update', handleProjectUpdate as EventListener);
    window.addEventListener('user-cursor', handleUserCursor as EventListener);
    window.addEventListener('edit-conflict', handleEditConflict as EventListener);

    return () => {
      window.removeEventListener('project-update', handleProjectUpdate as EventListener);
      window.removeEventListener('user-cursor', handleUserCursor as EventListener);
      window.removeEventListener('edit-conflict', handleEditConflict as EventListener);
    };
  }, [projectId]);

  // 자동저장 표시
  const getAutoSaveStatus = () => {
    if (isAutoSaving) return '저장 중...';
    if (lastSaved) return `${lastSaved.toLocaleTimeString('ko-KR')}에 자동 저장됨`;
    return null;
  };

  // 컴포넌트 초기 로드
  useEffect(() => {
    // 테스트 환경에서는 로딩 시간을 최소화
    if (process.env.NODE_ENV === 'test') {
      // 테스트에서 즉시 실행되도록 setTimeout 사용
      setTimeout(() => {
        loadProject();
      }, 0);
    } else {
      loadProject();
    }
  }, [loadProject]);

  // 로딩 상태
  if (isLoading) {
    return (
      <div className={`${styles.widget} ${className}`}>
        <div className={styles.loading} role="progressbar" aria-label="프로젝트 로딩 중">
          <div className={styles.loadingSpinner} />
          <p>프로젝트를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error && !project) {
    return (
      <div className={`${styles.widget} ${className}`}>
        <div className={styles.error} role="alert">
          <h2>오류 발생</h2>
          <p>프로젝트를 불러올 수 없습니다</p>
          {error.includes('권한') ? (
            <p>이 프로젝트에 접근할 권한이 없습니다</p>
          ) : (
            <button onClick={loadProject} className={styles.retryButton}>
              다시 시도
            </button>
          )}
        </div>
      </div>
    );
  }

  // 빈 프로젝트 상태
  if (!project) {
    return (
      <div className={`${styles.widget} ${className}`}>
        <div className={styles.emptyState}>
          <h2>아직 기획 내용이 없습니다</h2>
          <p>새 작업을 추가하여 프로젝트를 시작하세요</p>
        </div>
      </div>
    );
  }

  // 단계별 컨텐츠 렌더링
  const renderStageContent = () => {
    switch (currentStage) {
      case 'concept':
      case 'storyboard':
      case 'schedule':
      case 'budget':
      case 'casting':
      case 'location':
      case 'equipment':
      case 'ready':
        return (
          <PlanningBoard
            cards={project.planningCards}
            stages={['concept', 'script', 'storyboard', 'shot_list', 'schedule', 'equipment']}
            teamMembers={project.teamMembers}
            onCardMove={(cardId, newStage) => {
              const updatedCards = project.planningCards.map(card =>
                card.id === cardId ? { ...card, stage: newStage, updatedAt: new Date().toISOString() } : card
              );
              updateProject({ planningCards: updatedCards });
            }}
            onCardUpdate={(cardId, updates) => {
              const updatedCards = project.planningCards.map(card =>
                card.id === cardId ? { ...card, ...updates, updatedAt: new Date().toISOString() } : card
              );
              updateProject({ planningCards: updatedCards });
            }}
            onCardCreate={(card) => {
              const newCard = {
                ...card,
                id: `card-${Date.now()}`,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
              updateProject({ planningCards: [...project.planningCards, newCard] });
            }}
            onCardDelete={(cardId) => {
              const updatedCards = project.planningCards.filter(card => card.id !== cardId);
              updateProject({ planningCards: updatedCards });
            }}
            isReadOnly={mode === 'view'}
            data-testid="planning-board"
          />
        );

      case 'script':
        return (
          <ScriptEditor
            sections={project.script.sections}
            onSectionUpdate={(sectionId, updates) => {
              const updatedSections = project.script.sections.map(section =>
                section.id === sectionId ? { ...section, ...updates } : section
              );
              const updatedScript = {
                ...project.script,
                sections: updatedSections,
                lastModified: new Date().toISOString()
              };
              updateProject({ script: updatedScript });
            }}
            onSectionCreate={(section) => {
              const newSection = { ...section, id: `script-${Date.now()}` };
              const updatedScript = {
                ...project.script,
                sections: [...project.script.sections, newSection],
                lastModified: new Date().toISOString()
              };
              updateProject({ script: updatedScript });
            }}
            onSectionDelete={(sectionId) => {
              const updatedSections = project.script.sections.filter(section => section.id !== sectionId);
              const updatedScript = {
                ...project.script,
                sections: updatedSections,
                lastModified: new Date().toISOString()
              };
              updateProject({ script: updatedScript });
            }}
            onSectionReorder={(sectionIds) => {
              const sectionMap = new Map(project.script.sections.map(s => [s.id, s]));
              const reorderedSections = sectionIds.map((id, index) => ({
                ...sectionMap.get(id)!,
                order: index + 1
              }));
              const updatedScript = {
                ...project.script,
                sections: reorderedSections,
                lastModified: new Date().toISOString()
              };
              updateProject({ script: updatedScript });
            }}
            isReadOnly={mode === 'view'}
            showWordCount={true}
            showTimingInfo={true}
            data-testid="script-editor"
          />
        );

      case 'shot_list':
        return (
          <ShotList
            shots={project.shots}
            scriptSections={project.script.sections}
            teamMembers={project.teamMembers}
            onShotUpdate={(shotId, updates) => {
              const updatedShots = project.shots.map(shot =>
                shot.id === shotId ? { ...shot, ...updates } : shot
              );
              updateProject({ shots: updatedShots });
            }}
            onShotCreate={(shot) => {
              const newShot = { ...shot, id: `shot-${Date.now()}` };
              updateProject({ shots: [...project.shots, newShot] });
            }}
            onShotDelete={(shotId) => {
              const updatedShots = project.shots.filter(shot => shot.id !== shotId);
              updateProject({ shots: updatedShots });
            }}
            onShotReorder={(shotIds) => {
              const shotMap = new Map(project.shots.map(s => [s.id, s]));
              const reorderedShots = shotIds.map(id => shotMap.get(id)!);
              updateProject({ shots: reorderedShots });
            }}
            groupBy="location"
            isReadOnly={mode === 'view'}
            data-testid="shot-list"
          />
        );

      default:
        return (
          <PlanningBoard
            cards={project.planningCards}
            stages={['concept', 'script', 'storyboard', 'shot_list', 'schedule', 'equipment']}
            teamMembers={project.teamMembers}
            onCardMove={() => {}}
            onCardUpdate={() => {}}
            onCardCreate={() => {}}
            onCardDelete={() => {}}
            isReadOnly={mode === 'view'}
            data-testid="planning-board"
          />
        );
    }
  };

  return (
    <div className={`${styles.widget} ${className}`} data-testid="video-planning-widget">
      {/* 메인 헤더 */}
      <header className={styles.header} role="banner">
        <div className={styles.headerTop}>
          <div className={styles.projectInfo}>
            <h1 className={styles.title}>{project.title}</h1>
            <p className={styles.description}>{project.description}</p>
          </div>
          
          <div className={styles.statusInfo}>
            <div className={styles.status} role="status" aria-label={`현재 단계: ${getCurrentStageLabel(project.currentStage)}`}>
              <span className={styles.statusLabel}>현재 단계</span>
              <span className={styles.statusValue}>{getCurrentStageLabel(project.currentStage)}</span>
            </div>
            
            <div className={styles.projectStatus}>
              <span className={`${styles.statusBadge} ${styles[`status-${project.status}`]}`}>
                {getStatusLabel(project.status)}
              </span>
              <span className={`${styles.priorityBadge} ${styles[`priority-${project.priority}`]}`}>
                {getPriorityLabel(project.priority)}
              </span>
            </div>
          </div>
        </div>

        {/* 단계 네비게이션 */}
        <nav className={styles.stageNav} role="navigation" aria-label="기획 단계 이동">
          {['concept', 'script', 'storyboard', 'shot_list', 'schedule', 'equipment'].map((stage) => (
            <button
              key={stage}
              className={`${styles.stageButton} ${currentStage === stage ? styles.active : ''}`}
              onClick={() => handleStageChange(stage as PlanningStage)}
              disabled={mode === 'view'}
              aria-current={currentStage === stage ? 'page' : undefined}
            >
              {getCurrentStageLabel(stage as PlanningStage)}
            </button>
          ))}
        </nav>

        {/* 자동 저장 상태 */}
        {getAutoSaveStatus() && (
          <div className={styles.autoSaveStatus} role="status" aria-live="polite">
            {getAutoSaveStatus()}
          </div>
        )}
      </header>

      <div className={styles.content}>
        {/* 메인 콘텐츠 */}
        <main className={styles.main} role="main">
          {renderStageContent()}
        </main>

        {/* 사이드바 */}
        {showSidebar && (
          <aside className={styles.sidebar} role="complementary">
            {/* 진행률 추적기 */}
            {progressStats && (
              <ProgressTracker
                project={project}
                stats={progressStats}
                showDetailedView={true}
                showBudgetInfo={true}
                data-testid="progress-tracker"
              />
            )}

            {/* 협업 패널 */}
            <CollaborationPanel
              project={project}
              comments={project.comments}
              teamMembers={project.teamMembers}
              currentUser={project.teamMembers[0]} // TODO: 실제 현재 사용자로 변경
              onCommentAdd={(comment) => {
                const newComment = {
                  ...comment,
                  id: `comment-${Date.now()}`,
                  author: project.teamMembers[0], // TODO: 실제 현재 사용자
                  createdAt: new Date().toISOString()
                };
                updateProject({ comments: [...project.comments, newComment] });
              }}
              onCommentUpdate={(commentId, updates) => {
                const updatedComments = project.comments.map(comment =>
                  comment.id === commentId ? { ...comment, ...updates } : comment
                );
                updateProject({ comments: updatedComments });
              }}
              onCommentDelete={(commentId) => {
                const updatedComments = project.comments.filter(comment => comment.id !== commentId);
                updateProject({ comments: updatedComments });
              }}
              onCommentResolve={(commentId) => {
                const updatedComments = project.comments.map(comment =>
                  comment.id === commentId ? { ...comment, isResolved: true } : comment
                );
                updateProject({ comments: updatedComments });
              }}
              onMemberInvite={async (email, role) => {
                try {
                  await VideoPlanningApi.inviteTeamMember(projectId, email, role);
                } catch (err) {
                  onError?.(err instanceof Error ? err.message : '팀멤버 초대에 실패했습니다');
                }
              }}
              showOnlineStatus={true}
              isReadOnly={mode === 'view'}
              data-testid="collaboration-panel"
            />
          </aside>
        )}
      </div>
    </div>
  );
};

// 헬퍼 함수들
function getCurrentStageLabel(stage: PlanningStage): string {
  const stageLabels: Record<PlanningStage, string> = {
    concept: '컨셉 기획',
    script: '대본 작성',
    storyboard: '스토리보드',
    shot_list: '촬영 리스트',
    schedule: '일정 계획',
    budget: '예산 계획',
    casting: '캐스팅',
    location: '장소 섭외',
    equipment: '장비 준비',
    ready: '촬영 준비 완료'
  };
  return stageLabels[stage] || stage;
}

function getStatusLabel(status: VideoPlanningProject['status']): string {
  const statusLabels = {
    draft: '초안',
    active: '진행중',
    on_hold: '보류',
    completed: '완료',
    cancelled: '취소'
  };
  return statusLabels[status] || status;
}

function getPriorityLabel(priority: VideoPlanningProject['priority']): string {
  const priorityLabels = {
    low: '낮음',
    medium: '보통',
    high: '높음',
    urgent: '긴급'
  };
  return priorityLabels[priority] || priority;
}