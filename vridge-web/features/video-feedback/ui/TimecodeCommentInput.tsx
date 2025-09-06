'use client';

/**
 * @fileoverview Timecode-Enabled Comment Input Component
 * @module features/video-feedback/ui
 * 
 * 타임코드 자동 삽입 기능이 있는 피드백 입력 컴포넌트
 * - 현재 재생 시점 타임코드 자동 삽입
 * - 키보드 단축키 지원 (Shift+T)
 * - 타임코드 클릭 시 비디오 이동
 * - 실시간 미리보기
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';

import { useTimecodeSync, useTimecodeRenderer } from '../lib/useTimecodeSync';
import { normalizeTimecodeSpacing } from '../lib/timecodeUtils';

// ============================================================
// Types
// ============================================================

interface TimecodeCommentInputProps {
  /**
   * 비디오 엘리먼트 ref (타임코드 동기화용)
   */
  videoRef: React.RefObject<HTMLVideoElement>;
  
  /**
   * 초기 값
   */
  initialValue?: string;
  
  /**
   * 플레이스홀더 텍스트
   */
  placeholder?: string;
  
  /**
   * 제출 핸들러
   */
  onSubmit: (content: string, timestamp?: number) => void;
  
  /**
   * 취소 핸들러
   */
  onCancel?: () => void;
  
  /**
   * 내용 변경 핸들러
   */
  onChange?: (content: string) => void;
  
  /**
   * 자동 포커스 여부
   */
  autoFocus?: boolean;
  
  /**
   * 최대 글자 수
   */
  maxLength?: number;
  
  /**
   * 행 수 (최소/최대)
   */
  rows?: {
    min: number;
    max: number;
  };
  
  /**
   * 타임코드 자동 삽입 여부
   */
  enableTimecodeInsertion?: boolean;
  
  /**
   * 미리보기 표시 여부
   */
  showPreview?: boolean;
  
  /**
   * 커스텀 클래스명
   */
  className?: string;
  
  /**
   * 제출 버튼 텍스트
   */
  submitText?: string;
}

// ============================================================
// Component
// ============================================================

export const TimecodeCommentInput: React.FC<TimecodeCommentInputProps> = ({
  videoRef,
  initialValue = '',
  placeholder = '댓글을 작성하세요... (Shift+T로 현재 시점 타임코드 삽입)',
  onSubmit,
  onCancel,
  onChange,
  autoFocus = false,
  maxLength = 1000,
  rows = { min: 3, max: 8 },
  enableTimecodeInsertion = true,
  showPreview = true,
  className = '',
  submitText = '작성'
}) => {
  // ============================================================
  // State & Refs
  // ============================================================
  
  const [content, setContent] = useState(initialValue);
  const [showPreviewPanel, setShowPreviewPanel] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [cursorPosition, setCursorPosition] = useState(0);
  
  // ============================================================
  // Timecode Integration
  // ============================================================
  
  const {
    currentTimecode,
    insertCurrentTimecode,
    seekToTime,
    registerTimecodeShortcut,
    unregisterTimecodeShortcut
  } = useTimecodeSync(videoRef, {
    enableShortcuts: enableTimecodeInsertion
  });
  
  const { renderTimecodeText } = useTimecodeRenderer(
    content,
    (timestamp) => seekToTime(timestamp)
  );
  
  // ============================================================
  // Event Handlers
  // ============================================================
  
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    onChange?.(newContent);
  }, [onChange]);
  
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    if (maxLength && newContent.length > maxLength) return;
    
    handleContentChange(newContent);
    setCursorPosition(e.target.selectionStart);
  }, [handleContentChange, maxLength]);
  
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter로 제출
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
    
    // Tab 키로 미리보기 토글
    if (e.key === 'Tab' && e.shiftKey && showPreview) {
      e.preventDefault();
      setShowPreviewPanel(!showPreviewPanel);
    }
  }, [showPreviewPanel, showPreview]);
  
  const handleSelectionChange = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      setCursorPosition(textarea.selectionStart);
    }
  }, []);
  
  const insertTimecodeAtCursor = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea || !enableTimecodeInsertion) return;
    
    const cursorPos = textarea.selectionStart;
    const result = insertCurrentTimecode(content, cursorPos);
    
    handleContentChange(result.newText);
    
    // 커서 위치 업데이트
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(result.newCursorPosition, result.newCursorPosition);
      setCursorPosition(result.newCursorPosition);
    }, 0);
  }, [content, insertCurrentTimecode, handleContentChange, enableTimecodeInsertion]);
  
  const handleSubmit = useCallback(() => {
    const trimmedContent = content.trim();
    if (!trimmedContent) return;
    
    // 타임코드 정리
    const normalizedContent = normalizeTimecodeSpacing(trimmedContent);
    onSubmit(normalizedContent);
    
    // 입력 필드 초기화
    setContent('');
    setCursorPosition(0);
  }, [content, onSubmit]);
  
  const handleCancel = useCallback(() => {
    setContent(initialValue);
    setCursorPosition(0);
    onCancel?.();
  }, [initialValue, onCancel]);
  
  // ============================================================
  // Effects
  // ============================================================
  
  // 키보드 단축키 등록
  useEffect(() => {
    if (enableTimecodeInsertion) {
      registerTimecodeShortcut(insertTimecodeAtCursor);
    }
    
    return () => {
      unregisterTimecodeShortcut();
    };
  }, [enableTimecodeInsertion, registerTimecodeShortcut, unregisterTimecodeShortcut, insertTimecodeAtCursor]);
  
  // 자동 포커스
  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);
  
  // 자동 높이 조절
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    const minHeight = rows.min * 24; // 대략적인 line-height
    const maxHeight = rows.max * 24;
    
    textarea.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
  }, [content, rows]);
  
  // ============================================================
  // Render Helpers
  // ============================================================
  
  const renderPreview = useCallback(() => {
    if (!content.trim()) {
      return (
        <p className="text-neutral-500 italic text-sm">
          미리보기가 여기에 표시됩니다
        </p>
      );
    }
    
    return (
      <div className="prose prose-sm max-w-none">
        {renderTimecodeText((content, isTimecode, timestamp, onClick) => {
          if (isTimecode) {
            return (
              <button
                key={`timecode-${timestamp}`}
                onClick={onClick}
                className="inline-flex items-center px-1 py-0.5 rounded text-xs font-mono bg-vridge-100 text-vridge-700 hover:bg-vridge-200 hover:text-vridge-800 transition-colors cursor-pointer"
                title={`${(timestamp! / 60).toFixed(0)}분 ${(timestamp! % 60).toFixed(1)}초로 이동`}
                aria-label={`타임코드 ${content} 클릭하여 해당 시점으로 이동`}
              >
                {content}
              </button>
            );
          }
          return <span key={Math.random()}>{content}</span>;
        })}
      </div>
    );
  }, [content, renderTimecodeText]);
  
  // ============================================================
  // Render
  // ============================================================
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* 현재 타임코드 표시 */}
      {enableTimecodeInsertion && (
        <div className="flex items-center gap-2 text-sm text-neutral-600">
          <span>현재 시점:</span>
          <span className="font-mono bg-neutral-100 px-2 py-1 rounded text-xs">
            {currentTimecode}
          </span>
          <button
            onClick={insertTimecodeAtCursor}
            className="text-xs text-vridge-600 hover:text-vridge-700 underline"
            type="button"
            aria-label="현재 시점 타임코드 삽입"
          >
            삽입 (Shift+T)
          </button>
        </div>
      )}
      
      {/* 탭 네비게이션 (미리보기 있을 때) */}
      {showPreview && (
        <div className="flex border-b border-neutral-200">
          <button
            type="button"
            onClick={() => setShowPreviewPanel(false)}
            className={`px-4 py-2 text-sm font-medium ${
              !showPreviewPanel
                ? 'text-vridge-600 border-b-2 border-vridge-600'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
            aria-label="작성 모드"
          >
            작성
          </button>
          <button
            type="button"
            onClick={() => setShowPreviewPanel(true)}
            className={`px-4 py-2 text-sm font-medium ${
              showPreviewPanel
                ? 'text-vridge-600 border-b-2 border-vridge-600'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
            aria-label="미리보기 모드"
          >
            미리보기
          </button>
        </div>
      )}
      
      {/* 입력 영역 */}
      {!showPreviewPanel ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onSelect={handleSelectionChange}
            onClick={handleSelectionChange}
            placeholder={placeholder}
            className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:border-transparent"
            rows={rows.min}
            maxLength={maxLength}
            aria-label="피드백 내용 입력"
          />
          
          {/* 글자 수 표시 */}
          {maxLength && (
            <div className="absolute bottom-2 right-2 text-xs text-neutral-400">
              {content.length}/{maxLength}
            </div>
          )}
        </div>
      ) : (
        // 미리보기 패널
        <div className="min-h-[80px] p-3 border border-neutral-200 rounded-lg bg-neutral-50">
          {renderPreview()}
        </div>
      )}
      
      {/* 도움말 텍스트 */}
      <div className="text-xs text-neutral-500 space-y-1">
        <p>• Ctrl+Enter: 댓글 작성</p>
        {enableTimecodeInsertion && (
          <p>• Shift+T: 현재 시점 타임코드 삽입</p>
        )}
        {showPreview && (
          <p>• Shift+Tab: 미리보기 토글</p>
        )}
        <p>• 타임코드를 클릭하면 해당 시점으로 이동합니다</p>
      </div>
      
      {/* 버튼 영역 */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-neutral-300 text-neutral-700 text-sm rounded-lg hover:bg-neutral-50 transition-colors"
              aria-label="취소"
            >
              취소
            </button>
          )}
        </div>
        
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!content.trim()}
          className="px-4 py-2 bg-vridge-600 text-white text-sm rounded-lg hover:bg-vridge-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          aria-label="댓글 작성"
        >
          {submitText}
        </button>
      </div>
    </div>
  );
};