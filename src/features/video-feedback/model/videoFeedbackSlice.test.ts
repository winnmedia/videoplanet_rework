import { configureStore } from '@reduxjs/toolkit'
import videoFeedbackSlice, {
  loadVideoStart,
  loadVideoSuccess,
  loadVideoFailure,
  play,
  pause,
  seek,
  setPlaybackRate,
  setVolume,
  toggleMute,
  addCommentSuccess,
  updateCommentSuccess,
  deleteCommentSuccess,
  selectComment,
  filterComments,
  enterDrawingMode,
  exitDrawingMode,
  selectDrawingTool,
  setStrokeColor,
  addShape,
  clearError,
  resetState
} from './videoFeedbackSlice'
import type { 
  VideoFeedbackState, 
  VideoFeedbackDetails, 
  VideoComment,
  CommentFilters,
  DrawingShape
} from './types'

describe('Video Feedback Slice', () => {
  type RootState = {
    videoFeedback: VideoFeedbackState
  }
  
  let store: ReturnType<typeof configureStore<RootState>>

  const mockVideo: VideoFeedbackDetails = {
    id: 'video_123',
    projectId: 'project_456',
    fileName: 'test-video.mp4',
    originalFileName: 'Test Video.mp4',
    fileUrl: 'https://example.com/videos/test-video.mp4',
    thumbnailUrl: 'https://example.com/thumbnails/test-video.jpg',
    duration: 120,
    resolution: { width: 1920, height: 1080 },
    fileSize: 50000000,
    format: 'mp4',
    uploadedAt: '2025-01-01T10:00:00Z',
    uploadedBy: {
      id: 'user_789',
      name: '김철수',
      avatar: 'https://example.com/avatar.jpg'
    },
    version: 1,
    status: 'ready',
    metadata: {
      fps: 30,
      bitrate: 2000,
      codec: 'h264',
      hasAudio: true
    },
    permissions: {
      canComment: true,
      canEdit: true,
      canDelete: false,
      canShare: true,
      canDownload: false
    },
    settings: {
      allowAnonymousComments: false,
      requireApproval: false,
      autoplay: false,
      showTimestamps: true,
      allowDrawing: true
    }
  }

  const mockComment: VideoComment = {
    id: 'comment_123',
    videoId: 'video_123',
    author: {
      id: 'user_456',
      name: '홍길동',
      avatar: 'https://example.com/avatar2.jpg',
      role: 'member'
    },
    content: '이 부분이 좀 어색해 보입니다.',
    timestamp: 30.5,
    type: 'text',
    status: 'pending',
    priority: 'medium',
    tags: ['review'],
    reactions: [],
    mentions: [],
    createdAt: '2025-01-01T11:00:00Z',
    updatedAt: '2025-01-01T11:00:00Z',
    isEdited: false,
    isPinned: false,
    isPrivate: false
  }

  const mockDrawingShape: DrawingShape = {
    id: 'shape_123',
    type: 'rectangle',
    points: [100, 100, 200, 150],
    style: {
      strokeColor: '#ff0000',
      strokeWidth: 2,
      fillColor: 'transparent',
      opacity: 1
    },
    createdAt: '2025-01-01T11:30:00Z'
  }

  beforeEach(() => {
    store = configureStore({
      reducer: {
        videoFeedback: videoFeedbackSlice
      }
    })
  })

  describe('초기 상태', () => {
    it('올바른 초기 상태를 가져야 함', () => {
      const state = store.getState().videoFeedback

      expect(state.currentVideo).toBeNull()
      expect(state.comments).toEqual([])
      expect(state.feedbackSessions).toEqual([])
      expect(state.isLoading).toBe(false)
      expect(state.error).toBeNull()
      expect(state.selectedComment).toBeNull()
      expect(state.realtimeUsers).toEqual([])
      expect(state.playbackState.currentTime).toBe(0)
      expect(state.playbackState.isPlaying).toBe(false)
      expect(state.canvasState.isDrawingMode).toBe(false)
    })
  })

  describe('비디오 로딩 액션', () => {
    it('loadVideoStart - 로딩 상태를 설정해야 함', () => {
      store.dispatch(loadVideoStart())
      
      const state = store.getState().videoFeedback
      expect(state.isLoading).toBe(true)
      expect(state.error).toBeNull()
    })

    it('loadVideoSuccess - 비디오 정보를 설정해야 함', () => {
      store.dispatch(loadVideoSuccess({ video: mockVideo }))
      
      const state = store.getState().videoFeedback
      expect(state.isLoading).toBe(false)
      expect(state.currentVideo).toEqual(mockVideo)
      expect(state.playbackState.duration).toBe(120)
    })

    it('loadVideoFailure - 에러 상태를 설정해야 함', () => {
      const errorMessage = '비디오를 불러올 수 없습니다'
      
      store.dispatch(loadVideoFailure(errorMessage))
      
      const state = store.getState().videoFeedback
      expect(state.isLoading).toBe(false)
      expect(state.error).toBe(errorMessage)
    })
  })

  describe('재생 제어 액션', () => {
    it('play - 재생 상태를 설정해야 함', () => {
      store.dispatch(play())
      
      const state = store.getState().videoFeedback
      expect(state.playbackState.isPlaying).toBe(true)
    })

    it('pause - 일시정지 상태를 설정해야 함', () => {
      store.dispatch(play())
      store.dispatch(pause())
      
      const state = store.getState().videoFeedback
      expect(state.playbackState.isPlaying).toBe(false)
    })

    it('seek - 재생 시점을 변경해야 함', () => {
      const targetTime = 45.5
      
      store.dispatch(seek(targetTime))
      
      const state = store.getState().videoFeedback
      expect(state.playbackState.currentTime).toBe(targetTime)
    })

    it('setPlaybackRate - 재생 속도를 설정해야 함', () => {
      const rate = 1.5
      
      store.dispatch(setPlaybackRate(rate))
      
      const state = store.getState().videoFeedback
      expect(state.playbackState.playbackRate).toBe(rate)
    })

    it('setVolume - 볼륨을 설정해야 함', () => {
      const volume = 0.7
      
      store.dispatch(setVolume(volume))
      
      const state = store.getState().videoFeedback
      expect(state.playbackState.volume).toBe(volume)
    })

    it('toggleMute - 음소거를 토글해야 함', () => {
      store.dispatch(toggleMute())
      
      const state = store.getState().videoFeedback
      expect(state.playbackState.isMuted).toBe(true)

      store.dispatch(toggleMute())
      
      const updatedState = store.getState().videoFeedback
      expect(updatedState.playbackState.isMuted).toBe(false)
    })
  })

  describe('댓글 관리 액션', () => {
    it('addCommentSuccess - 새 댓글을 추가해야 함', () => {
      store.dispatch(addCommentSuccess({ comment: mockComment }))
      
      const state = store.getState().videoFeedback
      expect(state.comments).toContain(mockComment)
    })

    it('updateCommentSuccess - 댓글을 업데이트해야 함', () => {
      // 먼저 댓글 추가
      store.dispatch(addCommentSuccess({ comment: mockComment }))
      
      const updates = { content: '수정된 댓글 내용', isEdited: true }
      store.dispatch(updateCommentSuccess({ 
        commentId: 'comment_123', 
        updates 
      }))
      
      const state = store.getState().videoFeedback
      const updatedComment = state.comments.find(c => c.id === 'comment_123')
      expect(updatedComment?.content).toBe('수정된 댓글 내용')
      expect(updatedComment?.isEdited).toBe(true)
    })

    it('deleteCommentSuccess - 댓글을 삭제해야 함', () => {
      // 먼저 댓글 추가
      store.dispatch(addCommentSuccess({ comment: mockComment }))
      
      store.dispatch(deleteCommentSuccess({ commentId: 'comment_123' }))
      
      const state = store.getState().videoFeedback
      expect(state.comments.find(c => c.id === 'comment_123')).toBeUndefined()
    })

    it('selectComment - 댓글을 선택해야 함', () => {
      const commentId = 'comment_123'
      
      store.dispatch(selectComment(commentId))
      
      const state = store.getState().videoFeedback
      expect(state.selectedComment).toBe(commentId)
    })

    it('filterComments - 댓글 필터를 설정해야 함', () => {
      const filters: Partial<CommentFilters> = {
        status: ['pending'],
        priority: ['high'],
        showResolved: false
      }
      
      store.dispatch(filterComments(filters))
      
      const state = store.getState().videoFeedback
      expect(state.filters.status).toEqual(['pending'])
      expect(state.filters.priority).toEqual(['high'])
      expect(state.filters.showResolved).toBe(false)
    })
  })

  describe('드로잉/캔버스 액션', () => {
    it('enterDrawingMode - 드로잉 모드를 활성화해야 함', () => {
      store.dispatch(enterDrawingMode())
      
      const state = store.getState().videoFeedback
      expect(state.canvasState.isDrawingMode).toBe(true)
      expect(state.canvasState.isVisible).toBe(true)
    })

    it('exitDrawingMode - 드로잉 모드를 비활성화해야 함', () => {
      store.dispatch(enterDrawingMode())
      store.dispatch(exitDrawingMode())
      
      const state = store.getState().videoFeedback
      expect(state.canvasState.isDrawingMode).toBe(false)
    })

    it('selectDrawingTool - 드로잉 도구를 선택해야 함', () => {
      const tool = 'rectangle'
      
      store.dispatch(selectDrawingTool(tool))
      
      const state = store.getState().videoFeedback
      expect(state.canvasState.activeTool).toBe(tool)
    })

    it('setStrokeColor - 선 색상을 설정해야 함', () => {
      const color = '#00ff00'
      
      store.dispatch(setStrokeColor(color))
      
      const state = store.getState().videoFeedback
      expect(state.canvasState.strokeColor).toBe(color)
    })

    it('addShape - 도형을 추가해야 함', () => {
      store.dispatch(addShape({ shape: mockDrawingShape }))
      
      const state = store.getState().videoFeedback
      expect(state.canvasState.shapes).toContain(mockDrawingShape)
    })
  })

  describe('유틸리티 액션', () => {
    it('clearError - 에러를 클리어해야 함', () => {
      // 먼저 에러 설정
      store.dispatch(loadVideoFailure('테스트 에러'))
      
      store.dispatch(clearError())
      
      const state = store.getState().videoFeedback
      expect(state.error).toBeNull()
    })

    it('resetState - 상태를 초기값으로 리셋해야 함', () => {
      // 먼저 상태 변경
      store.dispatch(loadVideoSuccess({ video: mockVideo }))
      store.dispatch(play())
      store.dispatch(addCommentSuccess({ comment: mockComment }))
      
      store.dispatch(resetState())
      
      const state = store.getState().videoFeedback
      expect(state.currentVideo).toBeNull()
      expect(state.comments).toEqual([])
      expect(state.playbackState.isPlaying).toBe(false)
    })
  })
})