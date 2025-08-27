/**
 * @description Video Feedback 메인 위젯 컴포넌트
 * @purpose 비디오 피드백 시스템의 통합 인터페이스 제공
 */

'use client'

import React, { useState, useEffect, useCallback } from 'react'

import { CommentThread } from './CommentThread'
import { FeedbackStatusBar } from './FeedbackStatusBar'
import { FeedbackTimeline } from './FeedbackTimeline'
import { VideoControls } from './VideoControls'
import styles from './VideoFeedbackWidget.module.scss'
import { VideoPlayer } from './VideoPlayer'
import { VideoFeedbackApi } from '../api/videoFeedbackApi'
import type {
  VideoFeedbackSession,
  VideoFeedbackWidgetProps,
  VideoPlaybackState,
  TimestampComment,
  VideoMarker,
  FeedbackStatus,
  FeedbackStats,
  CommentThread as CommentThreadType
} from '../model/types'

export function VideoFeedbackWidget({
  sessionId,
  isReadOnly = false,
  showTimeline = true,
  showMarkers = true,
  showStats = true,
  onSessionUpdate,
  onError
}: VideoFeedbackWidgetProps) {
  // 상태 관리
  const [session, setSession] = useState<VideoFeedbackSession | null>(null)
  const [stats, setStats] = useState<FeedbackStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [playbackState, setPlaybackState] = useState<VideoPlaybackState>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    isPaused: true,
    isMuted: false,
    volume: 1,
    playbackRate: 1,
    isFullscreen: false,
    quality: 'auto'
  })

  // 댓글 스레드 상태
  const [commentThreads, setCommentThreads] = useState<CommentThreadType[]>([])
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null)
  const [showAddCommentModal, setShowAddCommentModal] = useState(false)
  const [newCommentPosition, setNewCommentPosition] = useState<{
    x: number
    y: number
    timestamp: number
  } | null>(null)

  // 현재 사용자 정보 (실제로는 context에서 가져와야 함)
  const currentUser = {
    id: 'user-current',
    name: '현재 사용자',
    role: 'editor'
  }

  // 세션 데이터 로드
  useEffect(() => {
    let isMounted = true
    
    const loadData = async () => {
      if (!isMounted) return
      
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await VideoFeedbackApi.getSession(sessionId)
        
        if (!isMounted) return
        
        if (response.success) {
          setSession(response.session)
          setPlaybackState(prev => ({
            ...prev,
            duration: response.session.videoMetadata.duration
          }))
          
          // 댓글 스레드 초기화
          setCommentThreads([])
          
          onSessionUpdate?.(response.session)
          
          // stats 로딩 (별도 try-catch)
          if (showStats) {
            try {
              const { stats: feedbackStats } = await VideoFeedbackApi.getStats(response.session.projectId)
              if (isMounted) {
                setStats(feedbackStats)
              }
            } catch (statsError) {
              console.error('Failed to load feedback stats:', statsError)
            }
          }
        } else {
          if (isMounted) {
            setError(response.message || '세션을 불러올 수 없습니다')
            onError?.(response.errors?.[0] || 'UNKNOWN_ERROR')
          }
        }
      } catch (err) {
        if (isMounted) {
          const errorMessage = '네트워크 오류가 발생했습니다'
          setError(errorMessage)
          onError?.(errorMessage)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    // 테스트 환경에서는 즉시 실행
    if (process.env.NODE_ENV === 'test') {
      loadData()
    } else {
      // 프로덕션에서는 약간의 딜레이
      const timeout = setTimeout(loadData, 50)
      return () => {
        isMounted = false
        clearTimeout(timeout)
      }
    }

    return () => {
      isMounted = false
    }
  }, [sessionId, showStats, onSessionUpdate, onError]) // 안정된 의존성 배열

  // 비디오 재생 상태 변경 핸들러
  const handlePlaybackStateChange = useCallback((newState: Partial<VideoPlaybackState>) => {
    setPlaybackState(prev => ({ ...prev, ...newState }))
  }, [])

  // 비디오 컨트롤 이벤트 핸들러
  const videoControlEvents = {
    onPlay: () => handlePlaybackStateChange({ isPlaying: true, isPaused: false }),
    onPause: () => handlePlaybackStateChange({ isPlaying: false, isPaused: true }),
    onSeek: (timestamp: number) => handlePlaybackStateChange({ currentTime: timestamp }),
    onVolumeChange: (volume: number) => handlePlaybackStateChange({ volume, isMuted: volume === 0 }),
    onPlaybackRateChange: (rate: number) => handlePlaybackStateChange({ playbackRate: rate }),
    onFullscreenToggle: () => handlePlaybackStateChange({ isFullscreen: !playbackState.isFullscreen }),
    onQualityChange: (quality: string) => handlePlaybackStateChange({ quality: quality as any })
  }

  // 비디오 클릭 처리 (새 댓글 추가)
  const handleVideoClick = useCallback((coordinates: { x: number; y: number; timestamp: number }) => {
    if (isReadOnly) return
    
    setNewCommentPosition(coordinates)
    setShowAddCommentModal(true)
  }, [isReadOnly])

  // 타임라인 클릭 처리
  const handleTimelineClick = useCallback((timestamp: number) => {
    videoControlEvents.onSeek(timestamp)
  }, [videoControlEvents])

  // 댓글 클릭 처리
  const handleCommentClick = useCallback((comment: TimestampComment) => {
    // 해당 시간으로 이동
    videoControlEvents.onSeek(comment.timestamp)
    
    // 댓글 하이라이트
    setHighlightedCommentId(comment.id)
    setTimeout(() => setHighlightedCommentId(null), 3000)
  }, [videoControlEvents])

  // 마커 클릭 처리
  const handleMarkerClick = useCallback((marker: VideoMarker) => {
    if (marker.linkedCommentId) {
      const linkedComment = session?.comments.find(c => c.id === marker.linkedCommentId)
      if (linkedComment) {
        handleCommentClick(linkedComment)
      }
    }
    videoControlEvents.onSeek(marker.timestamp)
  }, [session?.comments, handleCommentClick, videoControlEvents])

  // 댓글 추가
  const handleCommentAdd = async (comment: Omit<TimestampComment, 'id' | 'createdAt'>) => {
    if (!session) return

    try {
      const response = await VideoFeedbackApi.addComment(session.id, comment)
      if (response.success) {
        setSession(response.session)
        onSessionUpdate?.(response.session)
        setShowAddCommentModal(false)
        setNewCommentPosition(null)
      }
    } catch (err) {
      console.error('Failed to add comment:', err)
    }
  }

  // 댓글 업데이트
  const handleCommentUpdate = async (commentId: string, updates: Partial<TimestampComment>) => {
    if (!session) return

    try {
      const response = await VideoFeedbackApi.updateComment(session.id, commentId, updates)
      if (response.success) {
        setSession(response.session)
        onSessionUpdate?.(response.session)
      }
    } catch (err) {
      console.error('Failed to update comment:', err)
    }
  }

  // 댓글 삭제
  const handleCommentDelete = async (commentId: string) => {
    if (!session) return

    try {
      const response = await VideoFeedbackApi.deleteComment(session.id, commentId)
      if (response.success) {
        setSession(response.session)
        onSessionUpdate?.(response.session)
      }
    } catch (err) {
      console.error('Failed to delete comment:', err)
    }
  }

  // 댓글 해결
  const handleCommentResolve = async (commentId: string) => {
    if (!session) return

    try {
      const response = await VideoFeedbackApi.resolveComment(session.id, commentId)
      if (response.success) {
        setSession(response.session)
        onSessionUpdate?.(response.session)
        if (showStats) {
          // TODO: 통계 새로고침 로직 구현 필요
        }
      }
    } catch (err) {
      console.error('Failed to resolve comment:', err)
    }
  }

  // 상태 변경
  const handleStatusChange = async (sessionId: string, newStatus: FeedbackStatus) => {
    try {
      const response = await VideoFeedbackApi.updateSessionStatus(sessionId, newStatus)
      if (response.success) {
        setSession(response.session)
        onSessionUpdate?.(response.session)
      }
    } catch (err) {
      console.error('Failed to update session status:', err)
    }
  }

  // 마감일까지 남은 시간 계산
  const getTimeUntilDeadline = () => {
    if (!session?.deadline) return null
    
    const now = new Date()
    const deadline = new Date(session.deadline)
    const diff = deadline.getTime() - now.getTime()
    
    if (diff <= 0) return '마감 지남'
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    
    if (days > 0) return `${days}일 ${hours}시간 남음`
    return `${hours}시간 남음`
  }

  // 로딩 상태
  if (isLoading) {
    return (
      <div className={styles.loadingContainer} data-testid="video-feedback-loading">
        <div className={styles.spinner} />
        <p>피드백 세션을 불러오고 있습니다...</p>
      </div>
    )
  }

  // 에러 상태
  if (error || !session) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>⚠️</div>
        <h3>오류가 발생했습니다</h3>
        <p>{error || '세션을 찾을 수 없습니다'}</p>
        <button 
          onClick={() => window.location.reload()} 
          className={styles.retryButton}
        >
          다시 시도
        </button>
      </div>
    )
  }

  const deadlineCountdown = getTimeUntilDeadline()

  // 반응형 클래스 계산
  const getResponsiveClasses = () => {
    const classes = [styles.videoFeedbackWidget]
    
    if (typeof window !== 'undefined') {
      if (window.innerWidth <= 768) {
        classes.push(styles.mobileStack)
      } else if (window.innerWidth >= 1200) {
        classes.push(styles.desktopSidebar)
      }
    }
    
    // 접근성 지원
    classes.push(styles.supportsHighContrast)
    
    return classes.join(' ')
  }

  return (
    <main 
      className={getResponsiveClasses()}
      data-testid="video-feedback-widget"
      role="main"
      aria-label="비디오 피드백"
    >
      {/* 헤더 - 세션 정보 */}
      <header className={styles.sessionHeader}>
        <div className={styles.sessionInfo}>
          <h1>{session.title}</h1>
          <div className={styles.sessionMeta}>
            <span className={styles.version}>{session.version}</span>
            <span 
              className={`${styles.status} ${styles[`status-${session.status.replace('_', '-')}`]}`}
              data-testid="session-status"
            >
              {getStatusLabel(session.status)}
            </span>
            <span className={styles.duration}>
              {VideoFeedbackApi.formatTimestamp(session.videoMetadata.duration)}
            </span>
            {deadlineCountdown && (
              <span 
                className={styles.deadline}
                data-testid="deadline-countdown"
              >
                마감까지 {deadlineCountdown}
              </span>
            )}
          </div>
        </div>
        
        {showStats && stats && (
          <FeedbackStatusBar
            session={session}
            stats={stats}
            onStatusChange={handleStatusChange}
            isReadOnly={isReadOnly}
            className={styles.statusBar}
          />
        )}
      </header>

      {/* 메인 컨텐츠 */}
      <div className={styles.mainContent}>
        {/* 비디오 영역 */}
        <section className={styles.videoSection}>
          <VideoPlayer
            videoMetadata={session.videoMetadata}
            playbackState={playbackState}
            markers={showMarkers ? session.markers : undefined}
            comments={session.comments}
            onPlaybackStateChange={handlePlaybackStateChange}
            onMarkerClick={handleMarkerClick}
            onVideoClick={handleVideoClick}
            className={styles.videoPlayer}
          />
          
          <VideoControls
            playbackState={playbackState}
            onControlEvent={videoControlEvents}
            showAdvancedControls={true}
            className={styles.videoControls}
          />
          
          {showTimeline && (
            <FeedbackTimeline
              comments={session.comments}
              markers={session.markers}
              duration={session.videoMetadata.duration}
              currentTime={playbackState.currentTime}
              onTimelineClick={handleTimelineClick}
              onCommentClick={handleCommentClick}
              className={styles.feedbackTimeline}
            />
          )}
        </section>

        {/* 댓글 영역 */}
        <aside className={styles.commentsSection}>
          <CommentThread
            comments={session.comments}
            threads={commentThreads}
            currentUser={currentUser}
            onCommentAdd={handleCommentAdd}
            onCommentUpdate={handleCommentUpdate}
            onCommentDelete={handleCommentDelete}
            onCommentResolve={handleCommentResolve}
            isReadOnly={isReadOnly}
            className={styles.commentThread}
          />
        </aside>
      </div>
    </main>
  )
}

// 유틸리티 함수
function getStatusLabel(status: FeedbackStatus): string {
  const labels: Record<FeedbackStatus, string> = {
    draft: '초안',
    pending: '검토 대기',
    in_review: '검토중',
    revision_needed: '수정 필요',
    approved: '승인됨',
    rejected: '거절됨',
    completed: '완료'
  }
  return labels[status] || status
}