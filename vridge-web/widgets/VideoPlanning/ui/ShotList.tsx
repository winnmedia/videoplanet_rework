'use client';

/**
 * @description Shot List - 촬영 리스트 관리
 * @purpose 촬영 샷별 세부 정보 관리 및 편집
 */

import React, { useState, useMemo } from 'react';

import styles from './ShotList.module.scss';
import type { ShotListProps, Shot } from '../model/types';

export const ShotList: React.FC<ShotListProps> = ({
  shots,
  scriptSections,
  teamMembers,
  onShotUpdate,
  onShotCreate,
  onShotDelete,
  onShotReorder,
  groupBy = 'location',
  isReadOnly = false,
  className
}) => {
  const [expandedShot, setExpandedShot] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // 그룹별 샷 정리
  const groupedShots = useMemo(() => {
    if (!groupBy) return { 'All Shots': shots };
    
    return shots.reduce((groups, shot) => {
      let key: string;
      switch (groupBy) {
        case 'location':
          key = shot.location || '미정';
          break;
        case 'equipment':
          key = shot.equipment[0] || '장비 미정';
          break;
        case 'cast':
          key = shot.cast.length > 0 ? shot.cast[0] : '출연자 없음';
          break;
        default:
          key = 'All Shots';
      }
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(shot);
      return groups;
    }, {} as Record<string, Shot[]>);
  }, [shots, groupBy]);

  // 예상 총 촬영 시간 계산
  const totalEstimatedTime = useMemo(() => {
    return shots.reduce((total, shot) => total + shot.estimatedSetupTime, 0);
  }, [shots]);

  // 샷 타입 라벨 변환
  const getShotTypeLabel = (type: Shot['shotType']): string => {
    const labels = {
      wide: '와이드',
      medium: '미디엄',
      close_up: '클로즈업',
      extreme_close: '익스트림 클로즈업',
      over_shoulder: '오버 숄더',
      insert: '인서트',
      establishing: '익스테블리싱'
    };
    return labels[type] || type;
  };

  // 앵글 라벨 변환
  const getAngleLabel = (angle: Shot['angle']): string => {
    const labels = {
      eye_level: '정면',
      low: '로우앵글',
      high: '하이앵글',
      dutch: '더치앵글',
      bird_eye: '버드아이',
      worm_eye: '웜아이'
    };
    return labels[angle] || angle;
  };

  // 상태 라벨 변환
  const getStatusLabel = (status: Shot['status']): string => {
    const labels = {
      todo: '대기',
      in_progress: '진행중',
      review: '검토중',
      completed: '완료',
      blocked: '차단됨'
    };
    return labels[status] || status;
  };

  return (
    <div className={`${styles.shotList} ${className || ''}`} data-testid="shot-list">
      {/* 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2>촬영 리스트</h2>
          <div className={styles.stats}>
            <span>{shots.length}개 샷</span>
            <span>예상 촬영 시간: {totalEstimatedTime}분</span>
          </div>
        </div>

        {!isReadOnly && (
          <button
            className={styles.addButton}
            onClick={() => setShowAddModal(true)}
            aria-label="새 샷 추가"
          >
            + 샷 추가
          </button>
        )}
      </div>

      {/* 그룹별 샷 목록 */}
      <div className={styles.groups}>
        {Object.entries(groupedShots).map(([groupName, groupShots]) => (
          <div key={groupName} className={styles.group} data-testid={`location-group-${groupName}`}>
            <h3 className={styles.groupTitle}>{groupName}</h3>
            
            <div className={styles.shotGrid}>
              {groupShots.map(shot => (
                <div
                  key={shot.id}
                  className={`${styles.shotCard} ${styles[`status-${shot.status}`]} ${styles[`priority-${shot.priority}`]}`}
                  data-testid={`shot-card-${shot.id}`}
                >
                  {/* 샷 헤더 */}
                  <div className={styles.shotHeader}>
                    <span className={styles.shotNumber}>{shot.shotNumber}</span>
                    <span className={`${styles.statusBadge} ${styles[`status-${shot.status}`]}`}>
                      {getStatusLabel(shot.status)}
                    </span>
                    {!isReadOnly && (
                      <button
                        className={styles.deleteButton}
                        onClick={() => onShotDelete(shot.id)}
                        aria-label="샷 삭제"
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* 샷 제목 */}
                  <h4 className={styles.shotTitle}>
                    {shot.shotNumber} - {shot.title}
                  </h4>

                  {/* 샷 정보 */}
                  <div className={styles.shotInfo}>
                    <div className={styles.shotSpecs}>
                      <span className={styles.shotType}>{getShotTypeLabel(shot.shotType)}</span>
                      <span className={styles.shotAngle}>{getAngleLabel(shot.angle)}</span>
                    </div>
                    
                    <p className={styles.shotDescription}>{shot.description}</p>
                    
                    <div className={styles.shotDetails}>
                      <div className={styles.detailRow}>
                        <strong>위치:</strong> {shot.location}
                      </div>
                      <div className={styles.detailRow}>
                        <strong>시간:</strong> {shot.duration}초
                      </div>
                      <div className={styles.detailRow}>
                        <strong>준비시간:</strong> {shot.estimatedSetupTime}분
                      </div>
                    </div>

                    {/* 장비 */}
                    {shot.equipment.length > 0 && (
                      <div className={styles.equipment}>
                        <strong>장비:</strong>
                        <div className={styles.equipmentList}>
                          {shot.equipment.map(eq => (
                            <span key={eq} className={styles.equipmentTag}>{eq}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* 출연진 */}
                    {shot.cast.length > 0 && (
                      <div className={styles.cast}>
                        <strong>출연:</strong> {shot.cast.join(', ')}
                      </div>
                    )}

                    {/* 담당자 */}
                    {shot.assignedTo && (
                      <div className={styles.assignee}>
                        <strong>담당자:</strong> {teamMembers.find(m => m.id === shot.assignedTo)?.name || shot.assignedTo}
                      </div>
                    )}
                  </div>

                  {/* 상태 변경 */}
                  {!isReadOnly && (
                    <div className={styles.shotActions}>
                      <select
                        value={shot.status}
                        onChange={(e) => onShotUpdate(shot.id, { status: e.target.value as Shot['status'] })}
                        className={styles.statusSelect}
                        aria-label="상태 변경"
                      >
                        <option value="todo">대기</option>
                        <option value="in_progress">진행중</option>
                        <option value="review">검토중</option>
                        <option value="completed">완료</option>
                        <option value="blocked">차단됨</option>
                      </select>
                    </div>
                  )}

                  {/* 노트 */}
                  {shot.notes && (
                    <div className={styles.shotNotes}>
                      <strong>노트:</strong> {shot.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 빈 상태 */}
      {shots.length === 0 && (
        <div className={styles.emptyState}>
          <p>아직 촬영 샷이 없습니다</p>
          {!isReadOnly && (
            <button
              className={styles.addFirstShot}
              onClick={() => setShowAddModal(true)}
            >
              첫 번째 샷 추가하기
            </button>
          )}
        </div>
      )}

      {/* 새 샷 추가 모달 */}
      {showAddModal && !isReadOnly && (
        <div className={styles.modal} role="dialog" aria-labelledby="add-shot-title">
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h2 id="add-shot-title">새 촬영 샷 추가</h2>
              <button
                className={styles.closeButton}
                onClick={() => setShowAddModal(false)}
                aria-label="모달 닫기"
              >
                ×
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* 기본 정보 */}
              <div className={styles.formGroup}>
                <label htmlFor="shot-title">샷 제목 *</label>
                <input
                  id="shot-title"
                  type="text"
                  placeholder="샷 제목을 입력하세요"
                  aria-label="샷 제목"
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="shot-type">샷 타입 *</label>
                <select id="shot-type" aria-label="샷 타입" required>
                  <option value="wide">와이드</option>
                  <option value="medium">미디엄</option>
                  <option value="close_up">클로즈업</option>
                  <option value="extreme_close">익스트림 클로즈업</option>
                  <option value="over_shoulder">오버 숄더</option>
                  <option value="insert">인서트</option>
                  <option value="establishing">익스테블리싱</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="shot-location">촬영 위치</label>
                <input
                  id="shot-location"
                  type="text"
                  placeholder="촬영 위치"
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setShowAddModal(false)}
              >
                취소
              </button>
              <button
                type="button"
                className={styles.createButton}
                onClick={() => {
                  const titleInput = document.getElementById('shot-title') as HTMLInputElement;
                  const typeSelect = document.getElementById('shot-type') as HTMLSelectElement;
                  const locationInput = document.getElementById('shot-location') as HTMLInputElement;
                  
                  if (titleInput.value.trim()) {
                    onShotCreate({
                      shotNumber: String(shots.length + 1).padStart(3, '0'),
                      title: titleInput.value,
                      description: '새로 추가된 촬영 샷',
                      shotType: typeSelect.value as Shot['shotType'],
                      angle: 'eye_level',
                      movement: 'static',
                      location: locationInput.value || '미정',
                      duration: 30,
                      equipment: [],
                      lighting: '기본 조명',
                      props: [],
                      cast: [],
                      notes: '',
                      priority: 'medium',
                      status: 'todo',
                      estimatedSetupTime: 15
                    });
                    setShowAddModal(false);
                  }
                }}
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};