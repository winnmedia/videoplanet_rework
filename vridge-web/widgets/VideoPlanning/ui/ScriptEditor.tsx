'use client';

/**
 * @description Script Editor - 대본 에디터
 * @purpose 비디오 대본 작성 및 편집 기능
 */

import React, { useState, useCallback, useEffect } from 'react';

import styles from './ScriptEditor.module.scss';
import type {
  ScriptEditorProps,
  ScriptSection
} from '../model/types';

export const ScriptEditor: React.FC<ScriptEditorProps> = ({
  sections,
  onSectionUpdate,
  onSectionCreate,
  onSectionDelete,
  onSectionReorder,
  isReadOnly = false,
  showWordCount = true,
  showTimingInfo = true,
  className
}) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // 총 통계 계산
  const totalStats = {
    duration: sections.reduce((sum, section) => sum + (section.duration || 0), 0),
    wordCount: sections.reduce((sum, section) => sum + section.characterCount, 0),
    sectionCount: sections.length
  };

  // 자동 저장 시뮬레이션
  const simulateAutoSave = useCallback(() => {
    setIsAutoSaving(true);
    setTimeout(() => setIsAutoSaving(false), 1000);
  }, []);

  // 섹션 내용 업데이트 핸들러
  const handleContentChange = useCallback((sectionId: string, content: string) => {
    const characterCount = content.replace(/\s/g, '').length;
    const estimatedReadingTime = Math.ceil(characterCount * 0.2); // 한국어 읽기 속도 추정
    
    onSectionUpdate(sectionId, {
      content,
      characterCount,
      estimatedReadingTime
    });
    
    simulateAutoSave();
  }, [onSectionUpdate, simulateAutoSave]);

  return (
    <div className={`${styles.editor} ${className || ''}`} data-testid="script-editor">
      {/* 에디터 헤더 */}
      <div className={styles.header}>
        <div className={styles.headerInfo}>
          <h2>대본 편집</h2>
          {showWordCount && (
            <div className={styles.stats}>
              <span>{totalStats.sectionCount}개 섹션</span>
              <span>{totalStats.wordCount}단어</span>
              {showTimingInfo && (
                <span>{Math.floor(totalStats.duration / 60)}분 {totalStats.duration % 60}초</span>
              )}
            </div>
          )}
        </div>
        
        {!isReadOnly && (
          <button
            className={styles.addButton}
            onClick={() => onSectionCreate({
              title: '새 섹션',
              order: sections.length + 1,
              type: 'scene',
              content: '',
              characterCount: 0,
              estimatedReadingTime: 0
            })}
            aria-label="새 섹션 추가"
          >
            + 섹션 추가
          </button>
        )}
      </div>

      {/* 자동 저장 상태 */}
      {isAutoSaving && (
        <div className={styles.autoSave}>
          자동 저장됨
        </div>
      )}

      {/* 섹션 목록 */}
      <div className={styles.sections}>
        {sections.map((section, index) => (
          <div
            key={section.id}
            className={styles.section}
            data-testid={`script-section-${section.id}`}
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionMeta}>
                <span className={styles.sectionNumber}>{section.order}</span>
                <span className={`${styles.sectionType} ${styles[`type-${section.type}`]}`}>
                  {getSectionTypeLabel(section.type)}
                </span>
              </div>
              
              <h3 className={styles.sectionTitle}>
                {isReadOnly ? (
                  section.title
                ) : (
                  <input
                    type="text"
                    value={section.title}
                    onChange={(e) => onSectionUpdate(section.id, { title: e.target.value })}
                    className={styles.titleInput}
                    placeholder="섹션 제목"
                  />
                )}
              </h3>

              <div className={styles.sectionActions}>
                {!isReadOnly && (
                  <>
                    <button
                      className={styles.moveUpButton}
                      onClick={() => {
                        if (index > 0) {
                          const reorderedIds = [...sections];
                          [reorderedIds[index - 1], reorderedIds[index]] = [reorderedIds[index], reorderedIds[index - 1]];
                          onSectionReorder(reorderedIds.map(s => s.id));
                        }
                      }}
                      disabled={index === 0}
                      aria-label="위로 이동"
                      title="위로 이동"
                    >
                      ↑
                    </button>
                    <button
                      className={styles.moveDownButton}
                      onClick={() => {
                        if (index < sections.length - 1) {
                          const reorderedIds = [...sections];
                          [reorderedIds[index], reorderedIds[index + 1]] = [reorderedIds[index + 1], reorderedIds[index]];
                          onSectionReorder(reorderedIds.map(s => s.id));
                        }
                      }}
                      disabled={index === sections.length - 1}
                      aria-label="아래로 이동"
                      title="아래로 이동"
                    >
                      ↓
                    </button>
                    <button
                      className={styles.deleteButton}
                      onClick={() => onSectionDelete(section.id)}
                      aria-label="섹션 삭제"
                      title="섹션 삭제"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* 섹션 내용 */}
            <div className={styles.sectionContent}>
              {isReadOnly ? (
                <p className={styles.contentDisplay}>{section.content}</p>
              ) : (
                <textarea
                  className={styles.contentTextarea}
                  value={section.content}
                  onChange={(e) => handleContentChange(section.id, e.target.value)}
                  placeholder="섹션 내용을 입력하세요..."
                  rows={Math.max(3, section.content.split('\n').length + 1)}
                  aria-label="섹션 내용"
                />
              )}
            </div>

            {/* 섹션 통계 */}
            {showTimingInfo && (
              <div className={styles.sectionStats}>
                <span>{section.characterCount}자</span>
                <span>약 {section.estimatedReadingTime}초</span>
                {section.duration && <span>목표: {section.duration}초</span>}
              </div>
            )}

            {/* 섹션 노트 */}
            {(section.notes || !isReadOnly) && (
              <div className={styles.sectionNotes}>
                {isReadOnly ? (
                  section.notes && <p className={styles.notesDisplay}>{section.notes}</p>
                ) : (
                  <textarea
                    className={styles.notesTextarea}
                    value={section.notes || ''}
                    onChange={(e) => onSectionUpdate(section.id, { notes: e.target.value })}
                    placeholder="제작 노트 (선택사항)"
                    rows={2}
                    aria-label="제작 노트"
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 빈 상태 */}
      {sections.length === 0 && (
        <div className={styles.emptyState}>
          <p>아직 대본이 없습니다</p>
          {!isReadOnly && (
            <button
              className={styles.addFirstSection}
              onClick={() => onSectionCreate({
                title: '오프닝',
                order: 1,
                type: 'intro',
                content: '',
                characterCount: 0,
                estimatedReadingTime: 0
              })}
            >
              첫 번째 섹션 추가하기
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// 섹션 타입 라벨
function getSectionTypeLabel(type: ScriptSection['type']): string {
  const labels = {
    scene: '장면',
    voiceover: '내레이션',
    interview: '인터뷰',
    transition: '전환',
    intro: '인트로',
    outro: '아웃트로'
  };
  return labels[type] || type;
}