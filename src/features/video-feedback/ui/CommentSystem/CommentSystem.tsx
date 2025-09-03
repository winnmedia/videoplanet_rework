/**
 * Advanced Comment System Component
 * 실시간 타임코드 기반 댓글 시스템
 * - 실시간 동기화
 * - 타임코드 마커
 * - 스레드 댓글
 * - 사용자별 색상 구분
 * - 멘션 및 알림
 */

'use client'

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { cva, type VariantProps } from 'class-variance-authority'
import { VideoComment, CreateCommentData, VideoFeedbackDetails, RealtimeUser } from '../../model/types'

// Comment System 변형 스타일
const commentSystemVariants = cva(
  'flex flex-col h-full bg-white border-l border-gray-200',
  {
    variants: {
      size: {
        sm: 'w-72',
        md: 'w-80',
        lg: 'w-96',
        xl: 'w-[28rem]'
      },
      theme: {
        light: 'bg-white text-gray-900',
        dark: 'bg-gray-900 text-white border-gray-700'
      }
    },
    defaultVariants: {
      size: 'lg',
      theme: 'light'
    }
  }
)

interface CommentSystemProps extends VariantProps<typeof commentSystemVariants> {
  // 비디오 정보
  video: VideoFeedbackDetails
  currentTime: number
  duration: number
  
  // 댓글 데이터
  comments: VideoComment[]
  selectedCommentId?: string | null
  
  // 실시간 사용자
  realtimeUsers: RealtimeUser[]
  currentUser: {
    id: string
    name: string
    avatar?: string
    role: string
    color: string
  }
  
  // 필터링 및 정렬
  showResolved?: boolean
  sortBy?: 'timestamp' | 'created' | 'priority'
  sortOrder?: 'asc' | 'desc'
  filterBy?: {
    author?: string[]
    type?: string[]
    priority?: string[]
    tags?: string[]
  }
  
  // 기능 설정
  enableRealtime?: boolean
  enableThreads?: boolean
  enableMentions?: boolean
  enableReactions?: boolean
  enablePriority?: boolean
  enableTags?: boolean
  enableAttachments?: boolean
  
  // 이벤트 핸들러
  onCommentAdd?: (data: CreateCommentData) => void
  onCommentUpdate?: (commentId: string, updates: Partial<VideoComment>) => void
  onCommentDelete?: (commentId: string) => void
  onCommentSelect?: (commentId: string | null) => void
  onCommentResolve?: (commentId: string) => void
  onReactionAdd?: (commentId: string, emoji: string) => void
  onReactionRemove?: (commentId: string, emoji: string) => void
  onTimeSeek?: (time: number) => void
  onMention?: (userId: string) => void
  
  className?: string
  'data-testid'?: string
}

const CommentSystem: React.FC<CommentSystemProps> = ({
  video,
  currentTime,
  duration,
  comments,
  selectedCommentId,
  realtimeUsers,
  currentUser,
  showResolved = true,
  sortBy = 'timestamp',
  sortOrder = 'asc',
  filterBy = {},
  enableRealtime = true,
  enableThreads = true,
  enableMentions = true,
  enableReactions = true,
  enablePriority = true,
  enableTags = true,
  enableAttachments = false,
  onCommentAdd,
  onCommentUpdate,
  onCommentDelete,
  onCommentSelect,
  onCommentResolve,
  onReactionAdd,
  onReactionRemove,
  onTimeSeek,
  onMention,
  size,
  theme,
  className,
  'data-testid': testId = 'comment-system'
}) => {
  // State
  const [isAddingComment, setIsAddingComment] = useState(false)
  const [newCommentContent, setNewCommentContent] = useState('')
  const [newCommentType, setNewCommentType] = useState<'text' | 'annotation'>('text')
  const [newCommentPriority, setNewCommentPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [newCommentTags, setNewCommentTags] = useState<string[]>([])
  const [newCommentMentions, setNewCommentMentions] = useState<string[]>([])
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  
  // Refs
  const commentListRef = useRef<HTMLDivElement>(null)
  const newCommentRef = useRef<HTMLTextAreaElement>(null)
  
  // 시간 포맷 함수
  const formatTimecode = useCallback((seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const frames = Math.floor((seconds % 1) * 30) // 30fps 기준
    
    return hours > 0 
      ? `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(3, '0')}`
      : `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}:${frames.toString().padStart(3, '0')}`
  }, [])
  
  // 댓글 필터링 및 정렬
  const filteredAndSortedComments = useMemo(() => {
    const filtered = comments.filter(comment => {
      // 해결된 댓글 필터
      if (!showResolved && comment.status === 'resolved') return false
      
      // 작성자 필터
      if (filterBy.author && filterBy.author.length > 0) {
        if (!filterBy.author.includes(comment.author.id)) return false
      }
      
      // 타입 필터
      if (filterBy.type && filterBy.type.length > 0) {
        if (!filterBy.type.includes(comment.type)) return false
      }
      
      // 우선순위 필터  
      if (filterBy.priority && filterBy.priority.length > 0) {
        if (!filterBy.priority.includes(comment.priority)) return false
      }
      
      // 태그 필터
      if (filterBy.tags && filterBy.tags.length > 0) {
        if (!filterBy.tags.some(tag => comment.tags.includes(tag))) return false
      }
      
      return true
    })
    
    // 정렬
    filtered.sort((a, b) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'timestamp':
          comparison = a.timestamp - b.timestamp
          break
        case 'created':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        case 'priority':
          const priorityOrder = { low: 0, medium: 1, high: 2, critical: 3 }
          comparison = priorityOrder[b.priority] - priorityOrder[a.priority]
          break
        default:
          comparison = a.timestamp - b.timestamp
      }
      
      return sortOrder === 'asc' ? comparison : -comparison
    })
    
    return filtered
  }, [comments, showResolved, filterBy, sortBy, sortOrder])
  
  // 스레드 구조로 댓글 그룹화
  const commentThreads = useMemo(() => {
    const threads: Array<{ parent: VideoComment; replies: VideoComment[] }> = []
    const mainComments = filteredAndSortedComments.filter(c => !c.parentId)
    
    mainComments.forEach(parent => {
      const replies = filteredAndSortedComments.filter(c => c.parentId === parent.id)
      threads.push({ parent, replies })
    })
    
    return threads
  }, [filteredAndSortedComments])
  
  // 댓글 추가 핸들러
  const handleAddComment = useCallback(async () => {
    if (!newCommentContent.trim() || !onCommentAdd) return
    
    const commentData: CreateCommentData = {
      content: newCommentContent,
      timestamp: currentTime,
      type: newCommentType,
      priority: newCommentPriority,
      tags: newCommentTags,
      mentions: newCommentMentions,
      isPrivate: false
    }
    
    await onCommentAdd(commentData)
    
    // 상태 초기화
    setNewCommentContent('')
    setNewCommentType('text')
    setNewCommentPriority('medium')
    setNewCommentTags([])
    setNewCommentMentions([])
    setIsAddingComment(false)
  }, [newCommentContent, currentTime, newCommentType, newCommentPriority, newCommentTags, newCommentMentions, onCommentAdd])
  
  // 답글 추가 핸들러
  const handleAddReply = useCallback(async (parentId: string, content: string) => {
    if (!content.trim() || !onCommentAdd) return
    
    const replyData: CreateCommentData = {
      content,
      timestamp: currentTime,
      type: 'text',
      priority: 'medium',
      tags: [],
      mentions: []
    }
    
    // parentId는 별도로 처리 (API 레벨에서)
    await onCommentAdd({ ...replyData, parentId })
    setReplyingTo(null)
  }, [currentTime, onCommentAdd])
  
  // 댓글 선택 핸들러
  const handleCommentSelect = useCallback((comment: VideoComment) => {
    onCommentSelect?.(comment.id)
    onTimeSeek?.(comment.timestamp)
  }, [onCommentSelect, onTimeSeek])
  
  // 리액션 핸들러
  const handleReactionClick = useCallback((commentId: string, emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      onReactionRemove?.(commentId, emoji)
    } else {
      onReactionAdd?.(commentId, emoji)
    }
  }, [onReactionAdd, onReactionRemove])
  
  // 스레드 확장/축소
  const toggleThread = useCallback((commentId: string) => {
    const newExpanded = new Set(expandedThreads)
    if (newExpanded.has(commentId)) {
      newExpanded.delete(commentId)
    } else {
      newExpanded.add(commentId)
    }
    setExpandedThreads(newExpanded)
  }, [expandedThreads])
  
  // 멘션 자동완성
  const handleMentionInput = useCallback((value: string) => {
    const mentionMatch = value.match(/@(\w+)$/)
    if (mentionMatch && enableMentions) {
      // 멘션 제안 로직 (실제 구현에서는 사용자 검색 API 호출)
      // 여기서는 현재 실시간 사용자만 제안
      return realtimeUsers.filter(user => 
        user.name.toLowerCase().includes(mentionMatch[1].toLowerCase())
      )
    }
    return []
  }, [realtimeUsers, enableMentions])
  
  // 댓글이 추가될 때 자동 스크롤
  useEffect(() => {
    if (commentListRef.current && comments.length > 0) {
      const lastComment = comments[comments.length - 1]
      if (lastComment.author.id === currentUser.id) {
        commentListRef.current.scrollTop = commentListRef.current.scrollHeight
      }
    }
  }, [comments, currentUser.id])
  
  // 컨테이너 클래스
  const containerClasses = clsx(
    commentSystemVariants({ size, theme }),
    className
  )
  
  return (
    <div className={containerClasses} data-testid={testId}>
      {/* 헤더 */}
      <div className={clsx(
        'flex items-center justify-between p-4 border-b',
        theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
      )}>
        <h3 className="text-lg font-semibold">
          댓글 ({filteredAndSortedComments.length})
        </h3>
        
        <div className="flex items-center space-x-2">
          {/* 실시간 사용자 표시 */}
          {enableRealtime && realtimeUsers.length > 0 && (
            <div className="flex -space-x-2" data-testid={`${testId}-realtime-users`}>
              {realtimeUsers.slice(0, 3).map(user => (
                <div
                  key={user.id}
                  className="w-8 h-8 rounded-full border-2 border-white overflow-hidden"
                  style={{ borderColor: user.color }}
                  title={user.name}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    <div 
                      className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ backgroundColor: user.color }}
                    >
                      {user.name.charAt(0)}
                    </div>
                  )}
                </div>
              ))}
              {realtimeUsers.length > 3 && (
                <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium">
                  +{realtimeUsers.length - 3}
                </div>
              )}
            </div>
          )}
          
          {/* 댓글 추가 버튼 */}
          <button
            onClick={() => setIsAddingComment(true)}
            className={clsx(
              'px-3 py-1 text-sm rounded-lg transition-colors',
              theme === 'dark'
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            )}
            data-testid={`${testId}-add-button`}
          >
            + 추가
          </button>
        </div>
      </div>
      
      {/* 댓글 목록 */}
      <div 
        ref={commentListRef}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        data-testid={`${testId}-list`}
        role="log"
        aria-live="polite"
        aria-label="댓글 목록"
      >
        {commentThreads.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-400">
              <svg fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4l4 4 4-4h4c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
              </svg>
            </div>
            <p className="text-gray-500 mb-4">아직 댓글이 없습니다</p>
            <button
              onClick={() => setIsAddingComment(true)}
              className="text-blue-500 hover:text-blue-600 font-medium"
            >
              첫 댓글 작성하기
            </button>
          </div>
        ) : (
          commentThreads.map(({ parent, replies }) => (
            <div key={parent.id} className="space-y-3">
              {/* 메인 댓글 */}
              <div
                className={clsx(
                  'p-4 rounded-lg border transition-colors',
                  selectedCommentId === parent.id
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : theme === 'dark'
                    ? 'border-gray-700 hover:bg-gray-800'
                    : 'border-gray-200 hover:bg-gray-50',
                  parent.isPinned && 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                )}
                onClick={() => handleCommentSelect(parent)}
                role="article"
                aria-label={`${parent.author.name}의 댓글, ${formatTimecode(parent.timestamp)}`}
                data-testid={`${testId}-comment-${parent.id}`}
                data-comment-id={parent.id}
                data-timecode={formatTimecode(parent.timestamp)}
              >
                {/* 댓글 헤더 */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    {/* 아바타 */}
                    <div
                      className="w-8 h-8 rounded-full border-2 overflow-hidden"
                      style={{ borderColor: parent.author.color || '#6B7280' }}
                    >
                      {parent.author.avatar ? (
                        <img 
                          src={parent.author.avatar} 
                          alt={parent.author.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div 
                          className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: parent.author.color || '#6B7280' }}
                        >
                          {parent.author.name.charAt(0)}
                        </div>
                      )}
                    </div>
                    
                    {/* 작성자 정보 */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm" data-testid={`${testId}-comment-author-${parent.id}`}>
                          {parent.author.name}
                        </span>
                        <span className="text-xs text-gray-500 uppercase">
                          {parent.author.role}
                        </span>
                        {parent.isPinned && (
                          <span className="text-yellow-500" title="고정됨">📌</span>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onTimeSeek?.(parent.timestamp)
                        }}
                        className={clsx(
                          'text-xs font-mono px-2 py-0.5 rounded transition-colors',
                          theme === 'dark'
                            ? 'bg-gray-700 hover:bg-gray-600 text-blue-300'
                            : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                        )}
                        data-testid={`${testId}-timecode-${parent.id}`}
                      >
                        {formatTimecode(parent.timestamp)}
                      </button>
                    </div>
                  </div>
                  
                  {/* 우선순위 배지 */}
                  {enablePriority && parent.priority !== 'medium' && (
                    <span
                      className={clsx(
                        'text-xs px-2 py-0.5 rounded-full font-medium',
                        {
                          'bg-red-100 text-red-700': parent.priority === 'high' || parent.priority === 'critical',
                          'bg-gray-100 text-gray-700': parent.priority === 'low'
                        }
                      )}
                      data-testid={`${testId}-priority-${parent.id}`}
                    >
                      {parent.priority === 'high' && '높음'}
                      {parent.priority === 'critical' && '긴급'}
                      {parent.priority === 'low' && '낮음'}
                    </span>
                  )}
                </div>
                
                {/* 댓글 내용 */}
                <div className="mb-3">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {parent.content}
                  </p>
                </div>
                
                {/* 태그 */}
                {enableTags && parent.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3" data-testid={`${testId}-tags-${parent.id}`}>
                    {parent.tags.map((tag) => (
                      <span
                        key={tag}
                        className={clsx(
                          'text-xs px-2 py-0.5 rounded',
                          theme === 'dark'
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-100 text-gray-600'
                        )}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* 하단 액션 */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    {/* 리액션 */}
                    {enableReactions && parent.reactions.length > 0 && (
                      <div className="flex items-center space-x-1">
                        {parent.reactions.map((reaction) => {
                          const hasReacted = reaction.users.some(u => u.id === currentUser.id)
                          return (
                            <button
                              key={reaction.emoji}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleReactionClick(parent.id, reaction.emoji, hasReacted)
                              }}
                              className={clsx(
                                'flex items-center space-x-1 px-2 py-1 rounded transition-colors',
                                hasReacted
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'hover:bg-gray-100'
                              )}
                            >
                              <span>{reaction.emoji}</span>
                              <span>{reaction.count}</span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                    
                    {/* 답글 개수 */}
                    {enableThreads && replies.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleThread(parent.id)
                        }}
                        className="hover:text-blue-500 transition-colors"
                      >
                        답글 {replies.length}개
                      </button>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <span>{new Date(parent.createdAt).toLocaleDateString('ko-KR')}</span>
                    
                    {/* 액션 메뉴 */}
                    <div className="flex space-x-1">
                      {enableThreads && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setReplyingTo(parent.id)
                          }}
                          className="hover:text-blue-500 transition-colors"
                          data-testid={`${testId}-reply-button-${parent.id}`}
                        >
                          답글
                        </button>
                      )}
                      
                      {parent.status === 'pending' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onCommentResolve?.(parent.id)
                          }}
                          className="hover:text-green-500 transition-colors"
                        >
                          해결
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* 답글 목록 */}
              {enableThreads && replies.length > 0 && expandedThreads.has(parent.id) && (
                <div className="ml-8 space-y-2" data-testid={`${testId}-replies-${parent.id}`}>
                  {replies.map((reply) => (
                    <div
                      key={reply.id}
                      className={clsx(
                        'p-3 rounded-lg border-l-2 transition-colors',
                        selectedCommentId === reply.id
                          ? 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : theme === 'dark'
                          ? 'border-l-gray-600 bg-gray-800'
                          : 'border-l-gray-300 bg-gray-50'
                      )}
                      onClick={() => handleCommentSelect(reply)}
                      data-testid={`${testId}-reply-${reply.id}`}
                    >
                      <div className="flex items-start space-x-2 mb-2">
                        <div
                          className="w-6 h-6 rounded-full border overflow-hidden flex-shrink-0"
                          style={{ borderColor: reply.author.color || '#6B7280' }}
                        >
                          {reply.author.avatar ? (
                            <img src={reply.author.avatar} alt={reply.author.name} className="w-full h-full object-cover" />
                          ) : (
                            <div 
                              className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                              style={{ backgroundColor: reply.author.color || '#6B7280' }}
                            >
                              {reply.author.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium">{reply.author.name}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                onTimeSeek?.(reply.timestamp)
                              }}
                              className="text-xs font-mono text-blue-600 hover:text-blue-700"
                            >
                              {formatTimecode(reply.timestamp)}
                            </button>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{reply.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {/* 답글 작성 폼 */}
              {replyingTo === parent.id && (
                <div className="ml-8">
                  <div className="flex space-x-2">
                    <div
                      className="w-6 h-6 rounded-full border flex-shrink-0"
                      style={{ borderColor: currentUser.color }}
                    >
                      <div 
                        className="w-full h-full flex items-center justify-center text-white text-xs font-bold rounded-full"
                        style={{ backgroundColor: currentUser.color }}
                      >
                        {currentUser.name.charAt(0)}
                      </div>
                    </div>
                    <div className="flex-1">
                      <textarea
                        className="w-full px-3 py-2 text-sm border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="답글을 입력하세요..."
                        rows={3}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            handleAddReply(parent.id, e.currentTarget.value)
                            e.currentTarget.value = ''
                          }
                        }}
                        data-testid={`${testId}-reply-textarea-${parent.id}`}
                      />
                      <div className="flex justify-end space-x-2 mt-2">
                        <button
                          onClick={() => setReplyingTo(null)}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                        >
                          취소
                        </button>
                        <button
                          onClick={(e) => {
                            const textarea = e.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement
                            if (textarea) {
                              handleAddReply(parent.id, textarea.value)
                              textarea.value = ''
                            }
                          }}
                          className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                          data-testid={`${testId}-reply-submit-${parent.id}`}
                        >
                          답글 작성
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* 댓글 작성 폼 */}
      {isAddingComment && (
        <div 
          className={clsx(
            'border-t p-4',
            theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
          )}
          data-testid={`${testId}-add-form`}
        >
          <div className="flex space-x-3 mb-3">
            <div
              className="w-8 h-8 rounded-full border-2 flex-shrink-0"
              style={{ borderColor: currentUser.color }}
            >
              <div 
                className="w-full h-full flex items-center justify-center text-white text-xs font-bold rounded-full"
                style={{ backgroundColor: currentUser.color }}
              >
                {currentUser.name.charAt(0)}
              </div>
            </div>
            
            <div className="flex-1">
              <div className="mb-2">
                <span className="text-sm text-gray-600">
                  현재 시간: {formatTimecode(currentTime)}
                </span>
              </div>
              
              <textarea
                ref={newCommentRef}
                value={newCommentContent}
                onChange={(e) => setNewCommentContent(e.target.value)}
                className="w-full px-3 py-2 text-sm border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="피드백을 입력하세요..."
                rows={4}
                data-testid={`${testId}-textarea`}
              />
              
              {/* 댓글 옵션 */}
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center space-x-4">
                  {/* 타입 선택 */}
                  <select
                    value={newCommentType}
                    onChange={(e) => setNewCommentType(e.target.value as 'text' | 'annotation')}
                    className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                    data-testid={`${testId}-type-select`}
                  >
                    <option value="text">일반</option>
                    <option value="annotation">주석</option>
                  </select>
                  
                  {/* 우선순위 선택 */}
                  {enablePriority && (
                    <select
                      value={newCommentPriority}
                      onChange={(e) => setNewCommentPriority(e.target.value as 'low' | 'medium' | 'high')}
                      className="text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                      data-testid={`${testId}-priority-select`}
                    >
                      <option value="low">낮음</option>
                      <option value="medium">보통</option>
                      <option value="high">높음</option>
                    </select>
                  )}
                </div>
                
                {/* 액션 버튼 */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => {
                      setIsAddingComment(false)
                      setNewCommentContent('')
                      setNewCommentType('text')
                      setNewCommentPriority('medium')
                      setNewCommentTags([])
                      setNewCommentMentions([])
                    }}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                    data-testid={`${testId}-cancel-button`}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleAddComment}
                    disabled={!newCommentContent.trim()}
                    className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    data-testid={`${testId}-submit-button`}
                  >
                    댓글 추가
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default CommentSystem