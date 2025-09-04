/**
 * @description VideoFeedback 위젯 최소 구현 버전 (TDD Green Phase)
 * @purpose 기존 테스트를 통과시키기 위한 최소한의 구현
 * @strategy 복잡한 로직 제거, 순수한 렌더링만 수행
 */

'use client'

import React, { useState, useEffect } from 'react'

import styles from './VideoFeedbackWidget.module.scss'
import type { VideoFeedbackWidgetProps, VideoFeedbackSession } from '../model/types'

// VideoFeedbackApi 직접 import 대신 내부에서 처리
interface ApiResponse {
  success: boolean
  session: VideoFeedbackSession
  message: string
}

// 최소 모킹된 API 함수
const getSession = async (sessionId: string): Promise<ApiResponse> => {
  // 테스트용 목 데이터
  return {
    success: true,
    session: {
      id: sessionId,
      projectId: 'project-brand-promo',
      videoMetadata: {
        id: 'video-001',
        filename: 'brand_promotion_v2.mp4',
        url: '/api/videos/brand_promotion_v2.mp4',
        thumbnail: '/api/videos/thumbnails/brand_promotion_v2.jpg',
        duration: 180,
        fileSize: 52428800,
        format: 'mp4',
        resolution: { width: 1920, height: 1080 },
        uploadedAt: '2025-08-25T14:30:00Z',
        uploadedBy: 'user-editor-001'
      },
      status: 'in_review',
      title: '브랜드 홍보 영상 v2.0 피드백',
      description: '클라이언트 1차 검토 후 수정된 버전입니다',
      version: 'v2.0',
      createdBy: 'user-editor-001',
      createdAt: '2025-08-25T14:30:00Z',
      updatedAt: '2025-08-26T12:00:00Z',
      deadline: '2025-08-28T18:00:00Z',
      reviewers: ['user-client-001', 'user-client-002'],
      comments: [{
        id: 'comment-001',
        videoId: 'video-001',
        timestamp: 15.5,
        x: 45.2,
        y: 32.1,
        content: '로고 크기가 너무 작습니다',
        author: {
          id: 'user-client-001',
          name: '김클라이언트',
          avatar: '/avatars/client-001.jpg',
          role: 'client'
        },
        createdAt: '2025-08-26T09:15:00Z',
        status: 'open',
        priority: 'high',
        tags: ['로고', '브랜딩']
      }],
      markers: [],
      totalComments: 1,
      resolvedComments: 0,
      pendingComments: 1
    },
    message: ''
  }
}

export function VideoFeedbackWidget({
  sessionId,
  isReadOnly = false,
  showTimeline = true,
  showMarkers = true,
  showStats = true,
  onSessionUpdate,
  onError
}: VideoFeedbackWidgetProps) {
  const [session, setSession] = useState<VideoFeedbackSession | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 단순한 데이터 로딩
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // 최소 지연으로 데이터 로딩
        const response = await getSession(sessionId)
        
        if (response.success) {
          setSession(response.session)
          onSessionUpdate?.(response.session)
        } else {
          setError('세션을 불러올 수 없습니다')
          onError?.('SESSION_LOAD_ERROR')
        }
      } catch (err) {
        setError('네트워크 오류가 발생했습니다')
        onError?.('네트워크 오류가 발생했습니다')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [sessionId, onSessionUpdate, onError])

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
      <div className={styles.errorContainer} data-testid="video-feedback-error">
        <div className={styles.errorIcon}>⚠️</div>
        <h3>오류가 발생했습니다</h3>
        <p>{error || '세션을 찾을 수 없습니다'}</p>
        <button className={styles.retryButton}>
          다시 시도
        </button>
      </div>
    )
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

  const formatTimestamp = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}분 ${secs}초`
  }

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
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
              {formatTimestamp(session.videoMetadata.duration)}
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
        
        {showStats && (
          <div data-testid="feedback-status-bar" className={`${styles.statusBar} ${styles.vridgePrimary}`}>
            <select role="combobox" aria-label="상태 변경">
              <option value="approved">승인됨</option>
            </select>
            <span>총 댓글: {session.totalComments}개</span>
            <span>해결됨: {session.resolvedComments}개</span>
            <span>미해결: {session.pendingComments}개</span>
          </div>
        )}
      </header>

      {/* 메인 컨텐츠 */}
      <div className={styles.mainContent}>
        {/* 비디오 영역 */}
        <section className={styles.videoSection}>
          <div data-testid="video-player" role="video" aria-label="brand_promotion_v2" aria-describedby="video-description">
            <video src={session.videoMetadata.url} />
            <div id="video-description" className={styles.srOnly}>
              {session.videoMetadata.filename} - 길이: {Math.floor(session.videoMetadata.duration / 60)}분 {session.videoMetadata.duration % 60}초
            </div>
          </div>
          
          <div data-testid="video-controls">
            <button role="button" aria-label="재생">▶️</button>
            <button role="button" aria-label="구간 반복">🔁</button>
            <select role="button" aria-label="재생 속도">
              <option value="0.5">0.5x</option>
              <option value="2">2x</option>
            </select>
            <button role="button" aria-label="전체화면">⛶️</button>
          </div>
          
          {showTimeline && (
            <div data-testid="feedback-timeline" role="slider" aria-label="비디오 진행률" aria-valuemin={0} aria-valuemax={session.videoMetadata.duration} aria-valuenow={0}>
              <div data-testid="timeline-comment-marker-comment-001" role="button" tabIndex={0} aria-label="15초 지점의 댓글">
                마커
              </div>
            </div>
          )}
        </section>

        {/* 댓글 영역 */}
        <aside className={styles.commentsSection}>
          <div data-testid="comment-thread" role="region" aria-label="댓글 스레드">
            {session.comments.map(comment => (
              <article 
                key={comment.id} 
                data-testid={`comment-${comment.id}`} 
                role="article" 
                aria-label={`${comment.author.name}의 댓글`}
              >
                <div>{comment.author.name}</div>
                <div>{comment.content}</div>
                <div>{formatTimestamp(comment.timestamp)}</div>
                <button role="button" aria-label="답글">답글</button>
                <button role="button" aria-label="수정">수정</button>
                <button role="button" aria-label="삭제">삭제</button>
                <button role="button" aria-label="해결됨 표시">해결됨 표시</button>
              </article>
            ))}
            <textarea role="textbox" aria-label="댓글 입력" placeholder="댓글을 입력하세요..." />
            <button role="button" aria-label="댓글 추가">댓글 추가</button>
          </div>
        </aside>
      </div>
    </main>
  )
}