'use client';

/**
 * @fileoverview Comment Thread Component
 * @module features/video-feedback/ui
 * 
 * 타임스탬프 기반 코멘트 스레드 컴포넌트
 * - 대댓글 지원
 * - @멘션 기능
 * - 실시간 업데이트
 */

import React, { useState, useCallback, useMemo } from 'react';

import { Comment, CommentStatus } from '../model/feedback.schema';
import { useTimecodeRenderer } from '../lib/useTimecodeSync';
import { TimecodeCommentInput } from './TimecodeCommentInput';

// ============================================================
// Types
// ============================================================

interface CommentThreadProps {
  /**
   * 코멘트 목록
   */
  comments: Comment[];
  
  /**
   * 현재 사용자 ID
   */
  currentUserId: string;
  
  /**
   * 코멘트 추가 핸들러
   */
  onAddComment: (content: string, parentId?: string, timestamp?: number) => void;
  
  /**
   * 코멘트 수정 핸들러
   */
  onEditComment: (commentId: string, content: string) => void;
  
  /**
   * 코멘트 삭제 핸들러
   */
  onDeleteComment: (commentId: string) => void;
  
  /**
   * 코멘트 해결 상태 변경 핸들러
   */
  onResolveComment?: (commentId: string) => void;
  
  /**
   * 타임스탬프 클릭 핸들러 (비디오 시간으로 이동)
   */
  onTimestampClick?: (timestamp: number) => void;
  
  /**
   * 멘션 가능한 사용자 목록
   */
  mentionableUsers?: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  }>;
  
  /**
   * 타임스탬프 표시 여부
   */
  showTimestamps?: boolean;
  
  /**
   * 답글 허용 여부
   */
  allowReplies?: boolean;
  
  /**
   * 비디오 엘리먼트 ref (타임코드 자동 삽입용)
   */
  videoRef?: React.RefObject<HTMLVideoElement>;
  
  /**
   * 타임코드 자동 삽입 사용 여부
   */
  enableTimecodeInsertion?: boolean;
}

// ============================================================
// Helper Functions
// ============================================================

const formatTimestamp = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return '방금 전';
  if (diffMins < 60) return `${diffMins}분 전`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;
  
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}일 전`;
  
  return date.toLocaleDateString('ko-KR');
};

// ============================================================
// Comment Item Component
// ============================================================

interface CommentItemProps {
  comment: Comment;
  currentUserId: string;
  depth: number;
  onReply: (parentId: string) => void;
  onEdit: (commentId: string, content: string) => void;
  onDelete: (commentId: string) => void;
  onResolve?: (commentId: string) => void;
  onTimestampClick?: (timestamp: number) => void;
  showTimestamp?: boolean;
  allowReplies?: boolean;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  depth,
  onReply,
  onEdit,
  onDelete,
  onResolve,
  onTimestampClick,
  showTimestamp,
  allowReplies
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [showReplyForm, setShowReplyForm] = useState(false);
  
  const isAuthor = comment.createdBy.id === currentUserId;
  const isResolved = comment.status === 'resolved';
  const isDeleted = comment.status === 'deleted';
  
  const handleEdit = useCallback(() => {
    if (editContent.trim() && editContent !== comment.content) {
      onEdit(comment.id, editContent.trim());
      setIsEditing(false);
    }
  }, [comment.id, comment.content, editContent, onEdit]);
  
  const handleCancelEdit = useCallback(() => {
    setEditContent(comment.content);
    setIsEditing(false);
  }, [comment.content]);
  
  if (isDeleted) {
    return (
      <div className={`${depth > 0 ? 'ml-12' : ''} py-2`}>
        <p className="text-sm text-neutral-500 italic">삭제된 댓글입니다</p>
      </div>
    );
  }
  
  return (
    <div className={`${depth > 0 ? 'ml-12 border-l-2 border-neutral-200 pl-4' : ''}`}>
      <div className={`py-3 ${isResolved ? 'opacity-60' : ''}`}>
        {/* Comment Header */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {comment.createdBy.avatarUrl ? (
              <img
                src={comment.createdBy.avatarUrl}
                alt={comment.createdBy.name}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-vridge-100 flex items-center justify-center">
                <span className="text-sm font-medium text-vridge-700">
                  {comment.createdBy.name.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          
          {/* Comment Content */}
          <div className="flex-1 min-w-0">
            {/* Meta Info */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm text-neutral-900">
                {comment.createdBy.name}
              </span>
              {showTimestamp && comment.timestamp !== undefined && (
                <button
                  onClick={() => onTimestampClick?.(comment.timestamp!)}
                  className="text-xs text-vridge-600 hover:text-vridge-700 font-medium"
                  aria-label={`${formatTimestamp(comment.timestamp)} 시점으로 이동`}
                >
                  {formatTimestamp(comment.timestamp)}
                </button>
              )}
              <span className="text-xs text-neutral-500">
                {formatRelativeTime(comment.createdAt)}
              </span>
              {comment.status === 'edited' && (
                <span className="text-xs text-neutral-500">(수정됨)</span>
              )}
              {isResolved && (
                <span className="text-xs text-success-600 font-medium">해결됨</span>
              )}
            </div>
            
            {/* Content or Edit Form */}
            {isEditing ? (
              <div className="space-y-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:border-transparent resize-none"
                  rows={3}
                  autoFocus
                  aria-label="댓글 수정"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleEdit}
                    disabled={!editContent.trim()}
                    className="px-3 py-1 bg-vridge-600 text-white text-sm rounded-lg hover:bg-vridge-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="수정 완료"
                  >
                    수정
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="px-3 py-1 border border-neutral-300 text-neutral-700 text-sm rounded-lg hover:bg-neutral-50"
                    aria-label="수정 취소"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Comment Text with Mentions and Timecodes */}
                <CommentContent
                  content={comment.content}
                  mentions={comment.mentions}
                  onTimestampClick={onTimestampClick}
                />
                
                {/* Actions */}
                <div className="flex items-center gap-3 mt-2">
                  {allowReplies && depth < 2 && (
                    <button
                      onClick={() => setShowReplyForm(true)}
                      className="text-xs text-neutral-600 hover:text-vridge-600"
                      aria-label="답글 작성"
                    >
                      답글
                    </button>
                  )}
                  
                  {isAuthor && !isResolved && (
                    <>
                      <button
                        onClick={() => setIsEditing(true)}
                        className="text-xs text-neutral-600 hover:text-vridge-600"
                        aria-label="댓글 수정"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => onDelete(comment.id)}
                        className="text-xs text-neutral-600 hover:text-error-600"
                        aria-label="댓글 삭제"
                      >
                        삭제
                      </button>
                    </>
                  )}
                  
                  {onResolve && !isResolved && (
                    <button
                      onClick={() => onResolve(comment.id)}
                      className="text-xs text-neutral-600 hover:text-success-600"
                      aria-label="해결됨으로 표시"
                    >
                      해결됨으로 표시
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Reply Form */}
        {showReplyForm && (
          <div className="ml-11 mt-3">
            <CommentInput
              placeholder="답글을 작성하세요..."
              onSubmit={(content) => {
                onReply(comment.id);
                setShowReplyForm(false);
              }}
              onCancel={() => setShowReplyForm(false)}
              autoFocus
            />
          </div>
        )}
      </div>
      
      {/* Nested Replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div>
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              currentUserId={currentUserId}
              depth={depth + 1}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onResolve={onResolve}
              onTimestampClick={onTimestampClick}
              showTimestamp={showTimestamp}
              allowReplies={allowReplies}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Comment Content Component
// ============================================================

interface CommentContentProps {
  content: string;
  mentions?: Array<{
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  }>;
  onTimestampClick?: (timestamp: number) => void;
}

const CommentContent: React.FC<CommentContentProps> = ({
  content,
  mentions,
  onTimestampClick
}) => {
  const { renderTimecodeText } = useTimecodeRenderer(
    content,
    (timestamp) => onTimestampClick?.(timestamp)
  );

  return (
    <div className="text-sm text-neutral-800 break-words">
      {renderTimecodeText((part, isTimecode, timestamp, onClick) => {
        if (isTimecode) {
          return (
            <button
              key={`timecode-${timestamp}`}
              onClick={onClick}
              className="inline-flex items-center px-1 py-0.5 rounded text-xs font-mono bg-vridge-100 text-vridge-700 hover:bg-vridge-200 hover:text-vridge-800 transition-colors cursor-pointer mx-0.5"
              title={`${Math.floor(timestamp! / 60)}분 ${(timestamp! % 60).toFixed(1)}초로 이동`}
              aria-label={`타임코드 ${part} 클릭하여 해당 시점으로 이동`}
            >
              {part}
            </button>
          );
        }
        
        // 멘션 처리
        return part.split(/(@\w+)/g).map((mentionPart, index) => {
          if (mentionPart.startsWith('@')) {
            const mention = mentions?.find(m => `@${m.username}` === mentionPart);
            if (mention) {
              return (
                <span key={`mention-${index}`} className="text-vridge-600 font-medium">
                  @{mention.displayName}
                </span>
              );
            }
          }
          return <span key={`text-${index}`}>{mentionPart}</span>;
        });
      })}
    </div>
  );
};

// ============================================================
// Comment Input Component
// ============================================================

interface CommentInputProps {
  placeholder?: string;
  onSubmit: (content: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

const CommentInput: React.FC<CommentInputProps> = ({
  placeholder = "댓글을 작성하세요...",
  onSubmit,
  onCancel,
  autoFocus = false
}) => {
  const [content, setContent] = useState('');
  
  const handleSubmit = useCallback(() => {
    if (content.trim()) {
      onSubmit(content.trim());
      setContent('');
    }
  }, [content, onSubmit]);
  
  return (
    <div className="space-y-2">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-vridge-500 focus:border-transparent resize-none"
        rows={3}
        autoFocus={autoFocus}
        aria-label="댓글 입력"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && e.ctrlKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      />
      <div className="flex justify-between items-center">
        <span className="text-xs text-neutral-500">
          Ctrl+Enter로 댓글 작성
        </span>
        <div className="flex gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1 border border-neutral-300 text-neutral-700 text-sm rounded-lg hover:bg-neutral-50"
              aria-label="취소"
            >
              취소
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!content.trim()}
            className="px-3 py-1 bg-vridge-600 text-white text-sm rounded-lg hover:bg-vridge-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="댓글 작성"
          >
            작성
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================

export const CommentThread: React.FC<CommentThreadProps> = ({
  comments,
  currentUserId,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onResolveComment,
  onTimestampClick,
  mentionableUsers,
  showTimestamps = true,
  allowReplies = true,
  videoRef,
  enableTimecodeInsertion = true
}) => {
  const [replyToId, setReplyToId] = useState<string | null>(null);
  
  // Filter out top-level comments (no parentId)
  const topLevelComments = useMemo(
    () => comments.filter(c => !c.parentId),
    [comments]
  );
  
  const handleAddComment = useCallback((content: string) => {
    onAddComment(content, replyToId || undefined);
    setReplyToId(null);
  }, [onAddComment, replyToId]);
  
  return (
    <div className="space-y-4">
      {/* Comment List */}
      <div className="space-y-1">
        {topLevelComments.length > 0 ? (
          topLevelComments.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              currentUserId={currentUserId}
              depth={0}
              onReply={setReplyToId}
              onEdit={onEditComment}
              onDelete={onDeleteComment}
              onResolve={onResolveComment}
              onTimestampClick={onTimestampClick}
              showTimestamp={showTimestamps}
              allowReplies={allowReplies}
            />
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-neutral-500">
              아직 댓글이 없습니다. 첫 번째 댓글을 작성해보세요!
            </p>
          </div>
        )}
      </div>
      
      {/* New Comment Input */}
      <div className="border-t border-neutral-200 pt-4">
        {videoRef && enableTimecodeInsertion ? (
          <TimecodeCommentInput
            videoRef={videoRef}
            placeholder="댓글을 작성하세요... (@를 입력하여 멘션, Shift+T로 타임코드 삽입)"
            onSubmit={handleAddComment}
            enableTimecodeInsertion={enableTimecodeInsertion}
            showPreview={true}
          />
        ) : (
          <CommentInput
            placeholder="댓글을 작성하세요... (@를 입력하여 멘션)"
            onSubmit={handleAddComment}
          />
        )}
      </div>
    </div>
  );
};