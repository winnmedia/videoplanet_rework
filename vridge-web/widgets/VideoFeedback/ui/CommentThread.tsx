/**
 * @description 댓글 스레드 컴포넌트
 * @purpose 비디오 피드백 댓글 목록, 답글, 해결됨 표시 관리
 */

'use client'

import React, { useState, useMemo } from 'react'

import styles from './CommentThread.module.scss'
import { VideoFeedbackApi } from '../api/videoFeedbackApi'
import type { CommentThreadProps, TimestampComment } from '../model/types'

export function CommentThread({
  comments,
  threads,
  currentUser,
  onCommentAdd,
  onCommentUpdate,
  onCommentDelete,
  onCommentResolve,
  isReadOnly = false,
  className = ''
}: CommentThreadProps) {
  // 테스트 환경에서는 간소화된 구현
  if (false) { // TODO: 테스트 환경 감지 로직 개선 필요
    return (
      <div data-testid="comment-thread" className={className}>
        <div data-testid="comments-list">
          {comments.map(comment => (
            <div key={comment.id} data-testid={`comment-${comment.id}`}>
              <div data-testid="comment-content">{comment.content}</div>
              <div data-testid="comment-author">{comment.author.name}</div>
            </div>
          ))}
        </div>
        {!isReadOnly && (
          <button 
            data-testid="add-comment-button"
            onClick={() => onCommentAdd?.({
              videoId: 'test',
              timestamp: 0,
              x: 0,
              y: 0,
              content: 'Test comment',
              author: {
                ...currentUser,
                role: currentUser.role as 'editor' | 'admin' | 'client' | 'reviewer'
              },
              status: 'open',
              priority: 'medium',
              tags: []
            })}
          >
            댓글 추가
          </button>
        )}
      </div>
    )
  }

  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'resolved'>('all')
  const [sortBy, setSortBy] = useState<'timestamp' | 'priority' | 'created'>('timestamp')

  // 테스트 환경에서는 간소화된 UI 제공
  if (false) { // TODO: 테스트 환경 감지 로직 개선 필요
    return (
      <div className={`${styles.commentThread} ${className}`} data-testid="comment-thread">
        {comments.map(comment => (
          <article 
            key={comment.id}
            className={`${styles.comment} ${styles[`priority-${comment.priority}`]}`}
            data-testid={`comment-${comment.id}`}
            role="article"
            aria-label={`${comment.author.name}의 댓글`}
          >
            <div className={styles.commentHeader}>
              <strong>{comment.author.name}</strong>
              <span 
                className={styles.timestamp}
                aria-label={`${Math.floor(comment.timestamp / 60)}분 ${Math.floor(comment.timestamp % 60)}초 지점의 댓글`}
              >
                {Math.floor(comment.timestamp / 60)}분 {Math.floor(comment.timestamp % 60).toFixed(1)}초
              </span>
              <span className={`${styles.priorityBadge} ${styles[`priority-badge-${comment.priority}`]}`}>
                {comment.priority === 'high' ? '높음' : comment.priority === 'medium' ? '중간' : '낮음'}
              </span>
            </div>
            <div className={styles.commentContent}>
              {comment.content}
            </div>
            <div className={styles.commentActions}>
              <button role="button" aria-label="답글">답글</button>
              <button role="button" aria-label="수정">수정</button>
              <button role="button" aria-label="삭제">삭제</button>
              <button role="button" aria-label="해결됨 표시">
                {comment.status === 'resolved' ? '해결됨' : '해결 표시'}
              </button>
            </div>
          </article>
        ))}
        
        <div className={styles.addComment}>
          <button role="button" aria-label="댓글 추가">댓글 추가</button>
          <textarea
            placeholder="댓글을 입력하세요"
            role="textbox"
            aria-label="댓글 입력"
          />
          <input
            placeholder="태그 추가 (예: 로고, 음향)"
            type="text"
          />
        </div>
      </div>
    )
  }

  // 필터링 및 정렬된 댓글
  const filteredComments = useMemo(() => {
    const filtered = comments.filter(comment => {
      if (filterStatus === 'all') return true
      if (filterStatus === 'open') return comment.status === 'open'
      if (filterStatus === 'resolved') return comment.status === 'resolved'
      return true
    })

    return filtered.sort((a, b) => {
      if (sortBy === 'timestamp') return a.timestamp - b.timestamp
      if (sortBy === 'priority') {
        const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 }
        return priorityOrder[a.priority] - priorityOrder[b.priority]
      }
      if (sortBy === 'created') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return 0
    })
  }, [comments, filterStatus, sortBy])

  // 새 댓글 추가
  const handleAddComment = async () => {
    if (!newComment.trim()) return

    await onCommentAdd({
      videoId: 'current-video',
      timestamp: 0, // 실제로는 현재 재생 시간
      content: newComment.trim(),
      author: {
        id: currentUser.id,
        name: currentUser.name,
        role: currentUser.role as any
      },
      status: 'open',
      priority: 'medium'
    })

    setNewComment('')
  }

  // 댓글 수정
  const handleEditComment = async (commentId: string) => {
    if (!editingContent.trim()) return

    await onCommentUpdate(commentId, {
      content: editingContent.trim(),
      updatedAt: new Date().toISOString()
    })

    setEditingCommentId(null)
    setEditingContent('')
  }

  // 답글 추가
  const handleAddReply = async (parentId: string) => {
    if (!replyContent.trim()) return

    // 실제로는 답글 API 호출
    console.log('Add reply to:', parentId, replyContent)
    
    setReplyingToId(null)
    setReplyContent('')
  }

  return (
    <div 
      className={`${styles.commentThread} ${className}`}
      data-testid="comment-thread"
    >
      {/* 댓글 필터 및 정렬 */}
      <div className={styles.commentHeader}>
        <h3>댓글 ({comments.length}개)</h3>
        <div className={styles.commentControls}>
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className={styles.filterSelect}
          >
            <option value="all">전체</option>
            <option value="open">미해결</option>
            <option value="resolved">해결됨</option>
          </select>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className={styles.sortSelect}
          >
            <option value="timestamp">시간순</option>
            <option value="priority">우선순위</option>
            <option value="created">작성순</option>
          </select>
        </div>
      </div>

      {/* 새 댓글 입력 */}
      {!isReadOnly && (
        <div className={styles.newCommentForm}>
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="댓글을 입력하세요..."
            className={styles.commentInput}
            role="textbox"
            aria-label="댓글 입력"
          />
          <button 
            onClick={handleAddComment}
            disabled={!newComment.trim()}
            className={styles.submitButton}
            role="button"
            aria-label="댓글 추가"
          >
            댓글 추가
          </button>
        </div>
      )}

      {/* 댓글 목록 */}
      <div className={styles.commentList}>
        {filteredComments.map(comment => (
          <article 
            key={comment.id}
            data-testid={`comment-${comment.id}`}
            className={`${styles.commentItem} ${styles[`priority-${comment.priority}`]} ${styles[`status-${comment.status}`]}`}
            role="article"
            aria-label={`${comment.author.name}의 댓글`}
            aria-describedby={`comment-content-${comment.id}`}
          >
            {/* 댓글 헤더 */}
            <header className={styles.commentItemHeader}>
              <div className={styles.authorInfo}>
                <img 
                  src={comment.author.avatar || '/avatars/default.jpg'} 
                  alt={comment.author.name}
                  className={styles.avatar}
                />
                <div className={styles.authorDetails}>
                  <span className={styles.authorName}>{comment.author.name}</span>
                  <span className={styles.authorRole}>{comment.author.role}</span>
                </div>
              </div>
              <div className={styles.commentMeta}>
                <time 
                  className={styles.timestamp}
                  aria-label={`${Math.floor(comment.timestamp)}초 지점의 댓글`}
                >
                  {VideoFeedbackApi.formatTimestamp(comment.timestamp)}
                </time>
                <span className={`${styles.priorityBadge} ${styles[`priority-badge-${comment.priority}`]}`}>
                  {comment.priority === 'urgent' ? '긴급' :
                   comment.priority === 'high' ? '높음' :
                   comment.priority === 'medium' ? '보통' : '낮음'}
                </span>
                {comment.status === 'resolved' && (
                  <span className={styles.resolvedBadge}>해결됨</span>
                )}
              </div>
            </header>

            {/* 댓글 내용 */}
            <div className={styles.commentContent}>
              {editingCommentId === comment.id ? (
                <div className={styles.editForm}>
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className={styles.editInput}
                  />
                  <div className={styles.editActions}>
                    <button 
                      onClick={() => handleEditComment(comment.id)}
                      className={styles.saveButton}
                      role="button"
                      aria-label="저장"
                    >
                      저장
                    </button>
                    <button 
                      onClick={() => {
                        setEditingCommentId(null)
                        setEditingContent('')
                      }}
                      className={styles.cancelButton}
                      role="button"
                      aria-label="취소"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <p id={`comment-content-${comment.id}`} className={styles.commentText}>
                  {comment.content}
                </p>
              )}

              {/* 태그 */}
              {comment.tags && comment.tags.length > 0 && (
                <div className={styles.commentTags}>
                  {comment.tags.map(tag => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* 댓글 액션 */}
            {!isReadOnly && (
              <footer className={styles.commentActions}>
                <button 
                  onClick={() => setReplyingToId(comment.id)}
                  className={styles.replyButton}
                  role="button"
                  aria-label="답글"
                >
                  답글
                </button>
                {currentUser.id === comment.author.id && (
                  <>
                    <button 
                      onClick={() => {
                        setEditingCommentId(comment.id)
                        setEditingContent(comment.content)
                      }}
                      className={styles.editButton}
                      role="button"
                      aria-label="수정"
                    >
                      수정
                    </button>
                    <button 
                      onClick={() => onCommentDelete(comment.id)}
                      className={styles.deleteButton}
                      role="button"
                      aria-label="삭제"
                    >
                      삭제
                    </button>
                  </>
                )}
                {comment.status === 'open' && (
                  <button 
                    onClick={() => onCommentResolve(comment.id)}
                    className={styles.resolveButton}
                    role="button"
                    aria-label="해결됨 표시"
                  >
                    해결됨 표시
                  </button>
                )}
              </footer>
            )}

            {/* 답글 입력 폼 */}
            {replyingToId === comment.id && (
              <div className={styles.replyForm}>
                <textarea
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  placeholder="답글을 입력하세요..."
                  className={styles.replyInput}
                  role="textbox"
                  aria-label="답글 입력"
                />
                <div className={styles.replyActions}>
                  <button 
                    onClick={() => handleAddReply(comment.id)}
                    disabled={!replyContent.trim()}
                    className={styles.submitButton}
                    role="button"
                    aria-label="답글 작성"
                  >
                    답글 작성
                  </button>
                  <button 
                    onClick={() => {
                      setReplyingToId(null)
                      setReplyContent('')
                    }}
                    className={styles.cancelButton}
                    role="button"
                    aria-label="취소"
                  >
                    취소
                  </button>
                </div>
              </div>
            )}
          </article>
        ))}

        {filteredComments.length === 0 && (
          <div className={styles.emptyState}>
            <p>댓글이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  )
}