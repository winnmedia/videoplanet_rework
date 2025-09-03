import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { 
  VideoFeedbackState, 
  VideoFeedbackDetails, 
  VideoComment,
  FeedbackSession,
  CommentFilters,
  DrawingTool,
  DrawingShape,
  RealtimeUser
} from './types'

const initialState: VideoFeedbackState = {
  currentVideo: null,
  comments: [],
  feedbackSessions: [],
  playbackState: {
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    playbackRate: 1,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    quality: 'auto',
    bufferedRanges: [],
    isBuffering: false,
    hasError: false
  },
  canvasState: {
    isDrawingMode: false,
    activeTool: 'select',
    strokeColor: '#ff0000',
    strokeWidth: 2,
    opacity: 1,
    fontSize: 16,
    fontFamily: 'Arial',
    shapes: [],
    history: [],
    historyIndex: -1,
    isVisible: false,
    scale: 1,
    panOffset: { x: 0, y: 0 }
  },
  isLoading: false,
  error: null,
  selectedComment: null,
  filters: {
    sortBy: 'timestamp',
    sortOrder: 'asc',
    showResolved: true,
    showPrivate: true
  },
  realtimeUsers: []
}

const videoFeedbackSlice = createSlice({
  name: 'videoFeedback',
  initialState,
  reducers: {
    // 비디오 로딩
    loadVideoStart: (state) => {
      state.isLoading = true
      state.error = null
    },
    loadVideoSuccess: (state, action: PayloadAction<{ video: VideoFeedbackDetails }>) => {
      state.isLoading = false
      state.currentVideo = action.payload.video
      state.playbackState.duration = action.payload.video.duration
      state.error = null
    },
    loadVideoFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },
    unloadVideo: (state) => {
      state.currentVideo = null
      state.comments = []
      state.playbackState = { ...initialState.playbackState }
      state.canvasState = { ...initialState.canvasState }
      state.selectedComment = null
    },

    // 재생 제어
    play: (state) => {
      state.playbackState.isPlaying = true
    },
    pause: (state) => {
      state.playbackState.isPlaying = false
    },
    seek: (state, action: PayloadAction<number>) => {
      state.playbackState.currentTime = action.payload
    },
    setPlaybackRate: (state, action: PayloadAction<number>) => {
      state.playbackState.playbackRate = action.payload
    },
    setVolume: (state, action: PayloadAction<number>) => {
      state.playbackState.volume = action.payload
      if (action.payload > 0) {
        state.playbackState.isMuted = false
      }
    },
    toggleMute: (state) => {
      state.playbackState.isMuted = !state.playbackState.isMuted
    },
    toggleFullscreen: (state) => {
      state.playbackState.isFullscreen = !state.playbackState.isFullscreen
    },
    setQuality: (state, action: PayloadAction<string>) => {
      state.playbackState.quality = action.payload as '360p' | '480p' | '720p' | '1080p' | 'auto'
    },
    setBuffering: (state, action: PayloadAction<boolean>) => {
      state.playbackState.isBuffering = action.payload
    },
    setBufferedRanges: (state, action: PayloadAction<Array<{ start: number; end: number }>>) => {
      state.playbackState.bufferedRanges = action.payload
    },
    setPlaybackError: (state, action: PayloadAction<string>) => {
      state.playbackState.hasError = true
      state.playbackState.errorMessage = action.payload
    },

    // 댓글 관리
    loadCommentsStart: (state) => {
      state.isLoading = true
    },
    loadCommentsSuccess: (state, action: PayloadAction<{ comments: VideoComment[] }>) => {
      state.isLoading = false
      state.comments = action.payload.comments
    },
    loadCommentsFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },
    addCommentStart: (state) => {
      state.isLoading = true
    },
    addCommentSuccess: (state, action: PayloadAction<{ comment: VideoComment }>) => {
      state.isLoading = false
      state.comments.push(action.payload.comment)
      // 타임스탬프순으로 정렬
      state.comments.sort((a, b) => a.timestamp - b.timestamp)
    },
    addCommentFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false
      state.error = action.payload
    },
    updateCommentSuccess: (state, action: PayloadAction<{ 
      commentId: string
      updates: Partial<VideoComment>
    }>) => {
      const { commentId, updates } = action.payload
      const commentIndex = state.comments.findIndex(c => c.id === commentId)
      if (commentIndex !== -1) {
        state.comments[commentIndex] = { ...state.comments[commentIndex], ...updates }
      }
    },
    deleteCommentSuccess: (state, action: PayloadAction<{ commentId: string }>) => {
      state.comments = state.comments.filter(c => c.id !== action.payload.commentId)
      if (state.selectedComment === action.payload.commentId) {
        state.selectedComment = null
      }
    },
    selectComment: (state, action: PayloadAction<string | null>) => {
      state.selectedComment = action.payload
      // 선택된 댓글의 타임스탬프로 이동
      if (action.payload) {
        const comment = state.comments.find(c => c.id === action.payload)
        if (comment) {
          state.playbackState.currentTime = comment.timestamp
        }
      }
    },
    filterComments: (state, action: PayloadAction<Partial<CommentFilters>>) => {
      state.filters = { ...state.filters, ...action.payload }
    },
    addCommentReaction: (state, action: PayloadAction<{ 
      commentId: string
      emoji: string
      user: { id: string; name: string }
    }>) => {
      const { commentId, emoji, user } = action.payload
      const comment = state.comments.find(c => c.id === commentId)
      if (comment) {
        const existingReaction = comment.reactions.find(r => r.emoji === emoji)
        if (existingReaction) {
          const userExists = existingReaction.users.some(u => u.id === user.id)
          if (!userExists) {
            existingReaction.users.push(user)
            existingReaction.count += 1
          }
        } else {
          comment.reactions.push({
            emoji,
            users: [user],
            count: 1
          })
        }
      }
    },
    removeCommentReaction: (state, action: PayloadAction<{ 
      commentId: string
      emoji: string
      userId: string
    }>) => {
      const { commentId, emoji, userId } = action.payload
      const comment = state.comments.find(c => c.id === commentId)
      if (comment) {
        const reactionIndex = comment.reactions.findIndex(r => r.emoji === emoji)
        if (reactionIndex !== -1) {
          const reaction = comment.reactions[reactionIndex]
          reaction.users = reaction.users.filter(u => u.id !== userId)
          reaction.count = reaction.users.length
          if (reaction.count === 0) {
            comment.reactions.splice(reactionIndex, 1)
          }
        }
      }
    },

    // 드로잉/캔버스
    enterDrawingMode: (state) => {
      state.canvasState.isDrawingMode = true
      state.canvasState.isVisible = true
    },
    exitDrawingMode: (state) => {
      state.canvasState.isDrawingMode = false
      state.canvasState.activeTool = 'select'
    },
    selectDrawingTool: (state, action: PayloadAction<DrawingTool>) => {
      state.canvasState.activeTool = action.payload
    },
    setStrokeColor: (state, action: PayloadAction<string>) => {
      state.canvasState.strokeColor = action.payload
    },
    setStrokeWidth: (state, action: PayloadAction<number>) => {
      state.canvasState.strokeWidth = action.payload
    },
    setFillColor: (state, action: PayloadAction<string>) => {
      state.canvasState.fillColor = action.payload
    },
    setOpacity: (state, action: PayloadAction<number>) => {
      state.canvasState.opacity = action.payload
    },
    setFontSize: (state, action: PayloadAction<number>) => {
      state.canvasState.fontSize = action.payload
    },
    addShape: (state, action: PayloadAction<{ shape: DrawingShape }>) => {
      state.canvasState.shapes.push(action.payload.shape)
      // 히스토리에 추가
      state.canvasState.history = state.canvasState.history.slice(0, state.canvasState.historyIndex + 1)
      state.canvasState.history.push({
        id: `history_${Date.now()}`,
        shapes: [...state.canvasState.shapes],
        timestamp: new Date().toISOString(),
        action: 'add'
      })
      state.canvasState.historyIndex += 1
    },
    updateShape: (state, action: PayloadAction<{ 
      shapeId: string
      updates: Partial<DrawingShape>
    }>) => {
      const { shapeId, updates } = action.payload
      const shapeIndex = state.canvasState.shapes.findIndex(s => s.id === shapeId)
      if (shapeIndex !== -1) {
        state.canvasState.shapes[shapeIndex] = { 
          ...state.canvasState.shapes[shapeIndex], 
          ...updates 
        }
      }
    },
    deleteShape: (state, action: PayloadAction<{ shapeId: string }>) => {
      state.canvasState.shapes = state.canvasState.shapes.filter(
        s => s.id !== action.payload.shapeId
      )
      if (state.canvasState.selectedShapeId === action.payload.shapeId) {
        state.canvasState.selectedShapeId = undefined
      }
    },
    selectShape: (state, action: PayloadAction<string | undefined>) => {
      state.canvasState.selectedShapeId = action.payload
    },
    clearCanvas: (state) => {
      state.canvasState.shapes = []
      state.canvasState.selectedShapeId = undefined
      // 히스토리에 추가
      state.canvasState.history.push({
        id: `history_${Date.now()}`,
        shapes: [],
        timestamp: new Date().toISOString(),
        action: 'clear'
      })
      state.canvasState.historyIndex += 1
    },
    undoCanvas: (state) => {
      if (state.canvasState.historyIndex > 0) {
        state.canvasState.historyIndex -= 1
        const prevState = state.canvasState.history[state.canvasState.historyIndex]
        state.canvasState.shapes = [...prevState.shapes]
      }
    },
    redoCanvas: (state) => {
      if (state.canvasState.historyIndex < state.canvasState.history.length - 1) {
        state.canvasState.historyIndex += 1
        const nextState = state.canvasState.history[state.canvasState.historyIndex]
        state.canvasState.shapes = [...nextState.shapes]
      }
    },
    toggleCanvasVisibility: (state) => {
      state.canvasState.isVisible = !state.canvasState.isVisible
    },
    setCanvasScale: (state, action: PayloadAction<number>) => {
      state.canvasState.scale = action.payload
    },
    setCanvasPan: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.canvasState.panOffset = action.payload
    },

    // 피드백 세션
    loadFeedbackSessionsSuccess: (state, action: PayloadAction<{ sessions: FeedbackSession[] }>) => {
      state.feedbackSessions = action.payload.sessions
    },
    addFeedbackSessionSuccess: (state, action: PayloadAction<{ session: FeedbackSession }>) => {
      state.feedbackSessions.push(action.payload.session)
    },
    updateFeedbackSessionSuccess: (state, action: PayloadAction<{ 
      sessionId: string
      updates: Partial<FeedbackSession>
    }>) => {
      const { sessionId, updates } = action.payload
      const sessionIndex = state.feedbackSessions.findIndex(s => s.id === sessionId)
      if (sessionIndex !== -1) {
        state.feedbackSessions[sessionIndex] = { 
          ...state.feedbackSessions[sessionIndex], 
          ...updates 
        }
      }
    },

    // 실시간 사용자
    addRealtimeUser: (state, action: PayloadAction<{ user: RealtimeUser }>) => {
      const existingUserIndex = state.realtimeUsers.findIndex(u => u.id === action.payload.user.id)
      if (existingUserIndex !== -1) {
        state.realtimeUsers[existingUserIndex] = action.payload.user
      } else {
        state.realtimeUsers.push(action.payload.user)
      }
    },
    removeRealtimeUser: (state, action: PayloadAction<{ userId: string }>) => {
      state.realtimeUsers = state.realtimeUsers.filter(u => u.id !== action.payload.userId)
    },
    updateUserCursor: (state, action: PayloadAction<{ 
      userId: string
      cursor: { x: number; y: number; timestamp: string }
    }>) => {
      const user = state.realtimeUsers.find(u => u.id === action.payload.userId)
      if (user) {
        user.cursor = action.payload.cursor
      }
    },
    setUserTyping: (state, action: PayloadAction<{ userId: string; isTyping: boolean }>) => {
      const user = state.realtimeUsers.find(u => u.id === action.payload.userId)
      if (user) {
        user.isTyping = action.payload.isTyping
      }
    },

    // 유틸리티
    clearError: (state) => {
      state.error = null
      state.playbackState.hasError = false
      state.playbackState.errorMessage = undefined
    },
    resetState: () => initialState
  }
})

export const {
  loadVideoStart,
  loadVideoSuccess,
  loadVideoFailure,
  unloadVideo,
  play,
  pause,
  seek,
  setPlaybackRate,
  setVolume,
  toggleMute,
  toggleFullscreen,
  setQuality,
  setBuffering,
  setBufferedRanges,
  setPlaybackError,
  loadCommentsStart,
  loadCommentsSuccess,
  loadCommentsFailure,
  addCommentStart,
  addCommentSuccess,
  addCommentFailure,
  updateCommentSuccess,
  deleteCommentSuccess,
  selectComment,
  filterComments,
  addCommentReaction,
  removeCommentReaction,
  enterDrawingMode,
  exitDrawingMode,
  selectDrawingTool,
  setStrokeColor,
  setStrokeWidth,
  setFillColor,
  setOpacity,
  setFontSize,
  addShape,
  updateShape,
  deleteShape,
  selectShape,
  clearCanvas,
  undoCanvas,
  redoCanvas,
  toggleCanvasVisibility,
  setCanvasScale,
  setCanvasPan,
  loadFeedbackSessionsSuccess,
  addFeedbackSessionSuccess,
  updateFeedbackSessionSuccess,
  addRealtimeUser,
  removeRealtimeUser,
  updateUserCursor,
  setUserTyping,
  clearError,
  resetState
} = videoFeedbackSlice.actions

export default videoFeedbackSlice.reducer