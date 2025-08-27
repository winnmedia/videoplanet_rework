'use client';

/**
 * @description Planning Board - 칸반 스타일 기획 보드
 * @purpose 프로젝트 작업들을 단계별로 관리하는 드래그앤드롭 보드
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';

import styles from './PlanningBoard.module.scss';
import type {
  PlanningBoardProps,
  PlanningCard,
  PlanningStage,
  TeamMember,
  TaskStatus
} from '../model/types';

export const PlanningBoard: React.FC<PlanningBoardProps> = ({
  cards,
  stages,
  teamMembers,
  onCardMove,
  onCardUpdate,
  onCardCreate,
  onCardDelete,
  isReadOnly = false,
  className
}) => {
  const [draggedCard, setDraggedCard] = useState<PlanningCard | null>(null);
  const [dragOverStage, setDragOverStage] = useState<PlanningStage | null>(null);
  const [showAddCardModal, setShowAddCardModal] = useState<PlanningStage | null>(null);
  const [newCard, setNewCard] = useState({
    title: '',
    description: '',
    priority: 'medium' as PlanningCard['priority'],
    assignedTo: null as TeamMember | null,
    dueDate: '',
    tags: [] as string[],
    type: 'task' as PlanningCard['type']
  });

  const dragRef = useRef<HTMLDivElement>(null);
  const [keyboardFocus, setKeyboardFocus] = useState<string | null>(null);

  // 단계별 카드 그룹핑
  const getCardsByStage = (stage: PlanningStage) => {
    return cards
      .filter(card => card.stage === stage)
      .sort((a, b) => {
        // 우선순위별 정렬 (urgent > high > medium > low)
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // 생성일 순 정렬
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  };

  // 드래그 시작
  const handleDragStart = useCallback((e: React.DragEvent, card: PlanningCard) => {
    if (isReadOnly) return;
    
    setDraggedCard(card);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.id);
    
    // 드래그 이미지 커스터마이징
    const dragElement = e.currentTarget.cloneNode(true) as HTMLElement;
    dragElement.style.transform = 'rotate(5deg)';
    dragElement.style.opacity = '0.8';
    document.body.appendChild(dragElement);
    e.dataTransfer.setDragImage(dragElement, 0, 0);
    setTimeout(() => document.body.removeChild(dragElement), 0);
  }, [isReadOnly]);

  // 드래그 오버
  const handleDragOver = useCallback((e: React.DragEvent, stage: PlanningStage) => {
    if (isReadOnly || !draggedCard) return;
    
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  }, [isReadOnly, draggedCard]);

  // 드래그 리브
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // 컨테이너를 완전히 벗어났을 때만 드래그 오버 상태 해제
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragOverStage(null);
  }, []);

  // 드롭 처리
  const handleDrop = useCallback((e: React.DragEvent, stage: PlanningStage) => {
    if (isReadOnly || !draggedCard) return;
    
    e.preventDefault();
    
    if (draggedCard.stage !== stage) {
      onCardMove(draggedCard.id, stage);
    }
    
    setDraggedCard(null);
    setDragOverStage(null);
  }, [isReadOnly, draggedCard, onCardMove]);

  // 키보드 네비게이션
  const handleKeyDown = useCallback((e: React.KeyboardEvent, card: PlanningCard) => {
    if (isReadOnly) return;

    const currentStageIndex = stages.indexOf(card.stage);
    
    switch (e.key) {
      case 'ArrowRight':
        if (currentStageIndex < stages.length - 1) {
          onCardMove(card.id, stages[currentStageIndex + 1]);
        }
        break;
      case 'ArrowLeft':
        if (currentStageIndex > 0) {
          onCardMove(card.id, stages[currentStageIndex - 1]);
        }
        break;
      case 'Delete':
      case 'Backspace':
        if (e.shiftKey) {
          onCardDelete(card.id);
        }
        break;
      case 'Enter':
      case ' ':
        setKeyboardFocus(card.id);
        break;
    }
  }, [isReadOnly, stages, onCardMove, onCardDelete]);

  // 새 카드 추가 모달 처리
  const handleAddCard = useCallback((stage: PlanningStage) => {
    if (isReadOnly) return;
    setShowAddCardModal(stage);
  }, [isReadOnly]);

  const handleCreateCard = useCallback(() => {
    if (!showAddCardModal || !newCard.title.trim()) return;

    const cardToCreate = {
      ...newCard,
      stage: showAddCardModal,
      status: 'todo' as TaskStatus,
      createdBy: teamMembers[0]?.id || 'unknown', // TODO: 실제 현재 사용자
      tags: newCard.tags.filter(tag => tag.trim()),
      dependencies: []
    };

    onCardCreate({
      ...cardToCreate,
      assignedTo: cardToCreate.assignedTo || undefined
    });
    
    // 모달 초기화
    setShowAddCardModal(null);
    setNewCard({
      title: '',
      description: '',
      priority: 'medium',
      assignedTo: null,
      dueDate: '',
      tags: [],
      type: 'task'
    });
  }, [showAddCardModal, newCard, onCardCreate, teamMembers]);

  // 태그 입력 처리
  const handleTagInput = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      const newTag = e.currentTarget.value.trim();
      if (!newCard.tags.includes(newTag)) {
        setNewCard(prev => ({
          ...prev,
          tags: [...prev.tags, newTag]
        }));
      }
      e.currentTarget.value = '';
    }
  }, [newCard.tags]);

  // 단계 라벨 변환
  const getStageLabel = (stage: PlanningStage): string => {
    const labels: Record<PlanningStage, string> = {
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
    return labels[stage] || stage;
  };

  // 우선순위 색상 클래스
  const getPriorityClass = (priority: PlanningCard['priority']): string => {
    return `priority-${priority}`;
  };

  // 상태 색상 클래스  
  const getStatusClass = (status: TaskStatus): string => {
    return `status-${status}`;
  };

  return (
    <div 
      className={`${styles.board} ${className || ''}`} 
      data-testid="planning-board"
      ref={dragRef}
    >
      {stages.map(stage => {
        const stageCards = getCardsByStage(stage);
        const isDragOver = dragOverStage === stage;

        return (
          <div 
            key={stage}
            className={`${styles.column} ${isDragOver ? styles.dragOver : ''}`}
            data-testid={`stage-column-${stage}`}
            onDragOver={(e) => handleDragOver(e, stage)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage)}
          >
            {/* 컬럼 헤더 */}
            <div className={styles.columnHeader}>
              <h3 className={styles.stageTitle}>{getStageLabel(stage)}</h3>
              <div className={styles.stageInfo}>
                <span className={styles.cardCount}>{stageCards.length}</span>
                {!isReadOnly && (
                  <button
                    className={styles.addButton}
                    onClick={() => handleAddCard(stage)}
                    aria-label="새 작업 추가"
                    data-testid="add-card-button"
                  >
                    +
                  </button>
                )}
              </div>
            </div>

            {/* 카드 리스트 */}
            <div className={styles.cardList} role="list">
              {stageCards.map(card => (
                <div
                  key={card.id}
                  className={`${styles.card} ${getPriorityClass(card.priority)} ${getStatusClass(card.status)}`}
                  data-testid={`planning-card-${card.id}`}
                  draggable={!isReadOnly}
                  onDragStart={(e) => handleDragStart(e, card)}
                  onKeyDown={(e) => handleKeyDown(e, card)}
                  tabIndex={0}
                  role="listitem"
                  aria-label={`${card.title} - ${card.priority} 우선순위`}
                >
                  {/* 카드 헤더 */}
                  <div className={styles.cardHeader}>
                    <div className={styles.cardType}>
                      <span className={`${styles.typeIcon} ${styles[`type-${card.type}`]}`}>
                        {getTypeIcon(card.type)}
                      </span>
                    </div>
                    <div className={styles.cardActions}>
                      {!isReadOnly && (
                        <button
                          className={styles.deleteButton}
                          onClick={() => onCardDelete(card.id)}
                          aria-label="작업 삭제"
                          title="Shift+Delete로도 삭제 가능"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 카드 내용 */}
                  <div className={styles.cardContent}>
                    <h4 className={styles.cardTitle}>{card.title}</h4>
                    {card.description && (
                      <p className={styles.cardDescription}>{card.description}</p>
                    )}
                  </div>

                  {/* 카드 태그 */}
                  {card.tags && card.tags.length > 0 && (
                    <div className={styles.cardTags}>
                      {card.tags.map(tag => (
                        <span key={tag} className={styles.tag}>{tag}</span>
                      ))}
                    </div>
                  )}

                  {/* 카드 푸터 */}
                  <div className={styles.cardFooter}>
                    {/* 담당자 */}
                    {card.assignedTo && (
                      <div className={styles.assignee}>
                        {card.assignedTo.avatar ? (
                          <img
                            src={card.assignedTo.avatar}
                            alt={card.assignedTo.name}
                            className={styles.avatar}
                          />
                        ) : (
                          <div className={styles.avatarPlaceholder}>
                            {card.assignedTo.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* 마감일 */}
                    {card.dueDate && (
                      <div className={styles.dueDate}>
                        <span className={styles.dueDateIcon}>📅</span>
                        <time dateTime={card.dueDate}>
                          {new Date(card.dueDate).toLocaleDateString('ko-KR', {
                            month: 'short',
                            day: 'numeric'
                          })}
                        </time>
                      </div>
                    )}

                    {/* 작업 시간 */}
                    {card.estimatedHours && (
                      <div className={styles.workHours}>
                        <span className={styles.hoursIcon}>⏱</span>
                        <span>{card.estimatedHours}h</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {/* 빈 상태 */}
              {stageCards.length === 0 && (
                <div className={styles.emptyColumn}>
                  <p>아직 작업이 없습니다</p>
                  {!isReadOnly && (
                    <button 
                      className={styles.emptyAddButton}
                      onClick={() => handleAddCard(stage)}
                    >
                      첫 번째 작업 추가하기
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* 새 카드 추가 모달 */}
      {showAddCardModal && (
        <div className={styles.modal} role="dialog" aria-labelledby="add-card-title">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 id="add-card-title">새 작업 추가 - {getStageLabel(showAddCardModal)}</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowAddCardModal(null)}
                aria-label="모달 닫기"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* 제목 */}
              <div className={styles.formGroup}>
                <label htmlFor="card-title">작업 제목 *</label>
                <input
                  id="card-title"
                  type="text"
                  value={newCard.title}
                  onChange={(e) => setNewCard(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="작업 제목을 입력하세요"
                  required
                />
              </div>

              {/* 설명 */}
              <div className={styles.formGroup}>
                <label htmlFor="card-description">설명</label>
                <textarea
                  id="card-description"
                  value={newCard.description}
                  onChange={(e) => setNewCard(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="작업에 대한 상세 설명을 입력하세요"
                  rows={3}
                />
              </div>

              {/* 우선순위 */}
              <div className={styles.formGroup}>
                <label htmlFor="card-priority">우선순위</label>
                <select
                  id="card-priority"
                  value={newCard.priority}
                  onChange={(e) => setNewCard(prev => ({ 
                    ...prev, 
                    priority: e.target.value as PlanningCard['priority']
                  }))}
                >
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                  <option value="urgent">긴급</option>
                </select>
              </div>

              {/* 담당자 */}
              <div className={styles.formGroup}>
                <label htmlFor="card-assignee">담당자</label>
                <select
                  id="card-assignee"
                  value={newCard.assignedTo?.id || ''}
                  onChange={(e) => {
                    const member = teamMembers.find(m => m.id === e.target.value);
                    setNewCard(prev => ({ ...prev, assignedTo: member || null }));
                  }}
                >
                  <option value="">담당자를 선택하세요</option>
                  {teamMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>

              {/* 마감일 */}
              <div className={styles.formGroup}>
                <label htmlFor="card-due-date">마감일</label>
                <input
                  id="card-due-date"
                  type="datetime-local"
                  value={newCard.dueDate}
                  onChange={(e) => setNewCard(prev => ({ ...prev, dueDate: e.target.value }))}
                />
              </div>

              {/* 태그 */}
              <div className={styles.formGroup}>
                <label htmlFor="card-tags">태그</label>
                <div className={styles.tagContainer}>
                  {newCard.tags.map(tag => (
                    <span key={tag} className={styles.tag}>
                      {tag}
                      <button
                        type="button"
                        onClick={() => setNewCard(prev => ({
                          ...prev,
                          tags: prev.tags.filter(t => t !== tag)
                        }))}
                        aria-label={`${tag} 태그 제거`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                  <input
                    id="card-tags"
                    type="text"
                    placeholder="태그 입력 후 Enter"
                    onKeyDown={handleTagInput}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowAddCardModal(null)}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.createButton}
                onClick={handleCreateCard}
                disabled={!newCard.title.trim()}
              >
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// 타입별 아이콘
function getTypeIcon(type: PlanningCard['type']): string {
  const icons = {
    task: '📝',
    milestone: '🎯',
    note: '💭',
    decision: '⚖️'
  };
  return icons[type] || '📝';
}