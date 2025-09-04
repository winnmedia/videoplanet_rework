/**
 * @description VideoFeedback 위젯 격리된 단위 테스트
 * @purpose 하위 컴포넌트 모킹으로 순수한 위젯 로직만 테스트
 * @strategy TDD Red → Green 단계별 접근
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

import { VideoFeedbackWidget } from './VideoFeedbackWidget'
import { VideoFeedbackApi } from '../api/videoFeedbackApi'
import type { VideoFeedbackSession } from '../model/types'

// ===== 핵심 전략: 모든 하위 컴포넌트를 단순 모킹으로 대체 =====

// VideoPlayer 모킹 - DOM 렌더링 최소화
vi.mock('./VideoPlayer', () => ({
  VideoPlayer: ({ videoMetadata, onPlaybackStateChange, ...props }: any) => {
    React.useEffect(() => {
      // 즉시 로딩 완료 시뮬레이션
      onPlaybackStateChange?.({ duration: 180 })
    }, [onPlaybackStateChange])
    
    return (
      <div data-testid="video-player" role="video" aria-label={videoMetadata?.filename?.replace('.mp4', '') || 'video'}>
        <video src={videoMetadata?.url} />
      </div>
    )
  }
}))

// CommentThread 모킹 - 댓글 렌더링 최소화  
vi.mock('./CommentThread', () => ({
  CommentThread: ({ comments, currentUser, ...props }: any) => (
    <div data-testid="comment-thread" role="region" aria-label="댓글 스레드">
      {comments?.map((comment: { id: string; author: { name: string }; content: string; timestamp: number }) => (
        <article key={comment.id} data-testid={`comment-${comment.id}`} role="article" aria-label={`${comment.author.name}의 댓글`}>
          <div>{comment.author.name}</div>
          <div>{comment.content}</div>
          <div>0분 {Math.floor(comment.timestamp)}초</div>
          <button role="button" aria-label="답글">답글</button>
          <button role="button" aria-label="수정">수정</button>
          <button role="button" aria-label="삭제">삭제</button>
          <button role="button" aria-label="해결됨 표시">해결됨 표시</button>
        </article>
      ))}
    </div>
  )
}))

// FeedbackTimeline 모킹 - 타임라인 렌더링 최소화
vi.mock('./FeedbackTimeline', () => ({
  FeedbackTimeline: ({ duration, currentTime, comments, ...props }: { duration?: number; currentTime?: number; comments?: Array<{ id: string; timestamp: number }> }) => (
    <div data-testid="feedback-timeline" role="slider" aria-label="비디오 진행률" aria-valuemin={0} aria-valuemax={duration} aria-valuenow={currentTime}>
      {comments?.map((comment: { id: string; author: { name: string }; content: string; timestamp: number }) => (
        <div key={comment.id} data-testid={`timeline-comment-marker-${comment.id}`} role="button" tabIndex={0} aria-label={`15초 지점의 댓글`}>
          마커
        </div>
      ))}
    </div>
  )
}))

// FeedbackStatusBar 모킹 - 상태바 렌더링 최소화
vi.mock('./FeedbackStatusBar', () => ({
  FeedbackStatusBar: ({ session, stats, ...props }: { session?: { totalComments?: number; resolvedComments?: number; pendingComments?: number }; stats?: unknown }) => (
    <div data-testid="feedback-status-bar" className="statusBar vridgePrimary">
      <select role="combobox" aria-label="상태 변경">
        <option value="approved">승인됨</option>
      </select>
      <span>총 댓글: {session?.totalComments || 1}개</span>
      <span>해결됨: {session?.resolvedComments || 0}개</span>  
      <span>미해결: {session?.pendingComments || 1}개</span>
    </div>
  )
}))

// VideoControls 모킹 - 비디오 컨트롤 최소화
vi.mock('./VideoControls', () => ({
  VideoControls: ({ playbackState, onControlEvent, showAdvancedControls, ...props }: { playbackState?: { isPlaying?: boolean }; onControlEvent?: unknown; showAdvancedControls?: boolean }) => (
    <div data-testid="video-controls">
      <button role="button" aria-label={playbackState?.isPlaying ? '일시정지' : '재생'}>
        {playbackState?.isPlaying ? '⏸️' : '▶️'}
      </button>
      {showAdvancedControls && (
        <>
          <button role="button" aria-label="구간 반복">🔁</button>
          <select role="button" aria-label="재생 속도">
            <option value="0.5">0.5x</option>
            <option value="2">2x</option>
          </select>
          <button role="button" aria-label="전체화면">⛶️</button>
        </>
      )}
    </div>
  )
}))

// VideoFeedbackApi 모킹 - 최적화된 응답
vi.mock('../api/videoFeedbackApi', () => ({
  VideoFeedbackApi: {
    getSession: vi.fn(),
    getStats: vi.fn(), 
    resolveComment: vi.fn(),
    addComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
    updateSessionStatus: vi.fn(),
    formatTimestamp: vi.fn((seconds: number) => {
      const mins = Math.floor(seconds / 60)
      const secs = Math.floor(seconds % 60)
      return `${mins}분 ${secs}초`
    })
  }
}))

// ===== 테스트 데이터 =====

const mockVideoMetadata = {
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
}

const mockComment = {
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
}

const mockFeedbackSession: VideoFeedbackSession = {
  id: 'session-001',
  projectId: 'project-brand-promo',
  videoMetadata: mockVideoMetadata,
  status: 'in_review',
  title: '브랜드 홍보 영상 v2.0 피드백',
  description: '클라이언트 1차 검토 후 수정된 버전입니다',
  version: 'v2.0',
  createdBy: 'user-editor-001',
  createdAt: '2025-08-25T14:30:00Z',
  updatedAt: '2025-08-26T12:00:00Z',
  deadline: '2025-08-28T18:00:00Z',
  reviewers: ['user-client-001', 'user-client-002'],
  comments: [mockComment],
  markers: [],
  totalComments: 1,
  resolvedComments: 0,
  pendingComments: 1
}

describe('VideoFeedbackWidget - 격리된 단위 테스트 (TDD Green Phase)', () => {
  let user: ReturnType<typeof userEvent.setup>

  beforeEach(() => {
    vi.clearAllMocks()
    
    // 타이머 모킹 (필수)
    vi.useFakeTimers()
    user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    
    // API 모킹 설정 - 즉시 응답
    const mockApi = vi.mocked(VideoFeedbackApi)
    mockApi.getSession.mockResolvedValue({
      success: true,
      session: mockFeedbackSession,
      message: ''
    })
    mockApi.getStats.mockResolvedValue({
      stats: {
        totalComments: 1,
        resolvedComments: 0, 
        pendingComments: 1,
        highPriorityComments: 1,
        averageResponseTime: 2.5
      }
    })
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  describe('✅ GREEN: 메인 위젯 렌더링 (하위 컴포넌트 모킹됨)', () => {
    it('비디오 피드백 위젯이 렌더링되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      // 로딩 상태 확인
      expect(screen.getByTestId('video-feedback-loading')).toBeInTheDocument()
      
      // 타이머 진행으로 useEffect 실행
      vi.advanceTimersByTime(100)
      
      // API 호출 완료 대기 (모킹된 즉시 응답)
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      }, { timeout: 3000 })

      // 메인 컨테이너 확인
      expect(screen.getByRole('main', { name: /비디오 피드백/i })).toBeInTheDocument()
    })

    it('세션 제목과 상태 정보가 표시되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      vi.advanceTimersByTime(100)
      
      await waitFor(() => {
        expect(screen.getByText('브랜드 홍보 영상 v2.0 피드백')).toBeInTheDocument()
      })
      
      expect(screen.getByText('v2.0')).toBeInTheDocument()
      expect(screen.getByTestId('session-status')).toHaveTextContent('검토중')
    })

    it('모킹된 하위 컴포넌트들이 렌더링되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" showTimeline={true} showStats={true} />)
      
      vi.advanceTimersByTime(100)
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 모든 모킹된 하위 컴포넌트 확인
      expect(screen.getByTestId('video-player')).toBeInTheDocument()
      expect(screen.getByTestId('comment-thread')).toBeInTheDocument()
      expect(screen.getByTestId('feedback-timeline')).toBeInTheDocument()  
      expect(screen.getByTestId('feedback-status-bar')).toBeInTheDocument()
    })

    it('댓글 데이터가 하위 컴포넌트에 올바르게 전달되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      vi.advanceTimersByTime(100)
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 댓글 데이터 렌더링 확인
      expect(screen.getByText('김클라이언트')).toBeInTheDocument()
      expect(screen.getByText('로고 크기가 너무 작습니다')).toBeInTheDocument()
      expect(screen.getByText(/0분 15초/)).toBeInTheDocument()
    })
  })

  describe('✅ GREEN: 위젯 상태 관리', () => {
    it('로딩 상태에서 정상 상태로 전환되어야 함', async () => {
      render(<VideoFeedbackWidget sessionId="session-001" />)
      
      // 초기 로딩 상태
      expect(screen.getByTestId('video-feedback-loading')).toBeInTheDocument()
      
      vi.advanceTimersByTime(100)
      
      // 로딩 완료 후 위젯 표시  
      await waitFor(() => {
        expect(screen.queryByTestId('video-feedback-loading')).not.toBeInTheDocument()
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })
    })

    it('props를 통한 기능 토글이 동작해야 함', async () => {
      const { rerender } = render(
        <VideoFeedbackWidget sessionId="session-001" showTimeline={false} showStats={false} />
      )
      
      vi.advanceTimersByTime(100)
      
      await waitFor(() => {
        expect(screen.getByTestId('video-feedback-widget')).toBeInTheDocument()
      })

      // 타임라인과 상태바가 없어야 함
      expect(screen.queryByTestId('feedback-timeline')).not.toBeInTheDocument()
      expect(screen.queryByTestId('feedback-status-bar')).not.toBeInTheDocument()

      // props 변경 후 다시 렌더링
      rerender(<VideoFeedbackWidget sessionId="session-001" showTimeline={true} showStats={true} />)
      
      vi.advanceTimersByTime(100)
      
      await waitFor(() => {
        expect(screen.getByTestId('feedback-timeline')).toBeInTheDocument()
        expect(screen.getByTestId('feedback-status-bar')).toBeInTheDocument()  
      })
    })
  })

  describe('✅ GREEN: 에러 처리', () => {
    it('API 에러 시 에러 메시지가 표시되어야 함', async () => {
      const mockApi = vi.mocked(VideoFeedbackApi)
      mockApi.getSession.mockRejectedValue(new Error('Network error'))

      const mockOnError = vi.fn()
      render(<VideoFeedbackWidget sessionId="error-test" onError={mockOnError} />)
      
      vi.advanceTimersByTime(100)
      
      await waitFor(() => {
        expect(screen.getByText(/네트워크 오류가 발생했습니다/)).toBeInTheDocument()
      })
      
      expect(mockOnError).toHaveBeenCalledWith('네트워크 오류가 발생했습니다')
    })
  })
})