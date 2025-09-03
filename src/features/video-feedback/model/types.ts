// Video Feedback Feature Types

export interface VideoFeedbackState {
  currentVideo: VideoFeedbackDetails | null
  comments: VideoComment[]
  feedbackSessions: FeedbackSession[]
  playbackState: PlaybackState
  canvasState: CanvasState
  isLoading: boolean
  error: string | null
  selectedComment: string | null
  filters: CommentFilters
  realtimeUsers: RealtimeUser[]
}

export interface VideoFeedbackDetails {
  id: string
  projectId: string
  fileName: string
  originalFileName: string
  fileUrl: string
  thumbnailUrl?: string
  duration: number
  resolution: {
    width: number
    height: number
  }
  fileSize: number
  format: string
  uploadedAt: string
  uploadedBy: {
    id: string
    name: string
    avatar?: string
  }
  version: number
  status: 'processing' | 'ready' | 'error' | 'archived'
  metadata: {
    fps: number
    bitrate: number
    codec: string
    hasAudio: boolean
  }
  permissions: {
    canComment: boolean
    canEdit: boolean
    canDelete: boolean
    canShare: boolean
    canDownload: boolean
  }
  settings: {
    allowAnonymousComments: boolean
    requireApproval: boolean
    autoplay: boolean
    showTimestamps: boolean
    allowDrawing: boolean
  }
}

export interface VideoComment {
  id: string
  videoId: string
  parentId?: string // For threaded comments
  author: {
    id: string
    name: string
    avatar?: string
    role: string
  }
  content: string
  timestamp: number // Video timestamp in seconds
  timeRange?: {
    start: number
    end: number
  }
  position?: {
    x: number
    y: number
    width?: number
    height?: number
  }
  type: 'text' | 'drawing' | 'annotation' | 'approval' | 'revision'
  status: 'pending' | 'approved' | 'resolved' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  tags: string[]
  attachments?: CommentAttachment[]
  reactions: CommentReaction[]
  mentions: string[] // User IDs mentioned in the comment
  createdAt: string
  updatedAt: string
  editHistory?: CommentEdit[]
  isEdited: boolean
  isPinned: boolean
  isPrivate: boolean
  drawingData?: DrawingData
}

export interface CommentAttachment {
  id: string
  type: 'image' | 'document' | 'audio' | 'link'
  url: string
  name: string
  size: number
  mimeType: string
}

export interface CommentReaction {
  emoji: string
  users: Array<{
    id: string
    name: string
  }>
  count: number
}

export interface CommentEdit {
  editedAt: string
  editedBy: string
  previousContent: string
  reason?: string
}

export interface DrawingData {
  shapes: DrawingShape[]
  strokeColor: string
  strokeWidth: number
  fillColor?: string
  opacity: number
}

export interface DrawingShape {
  id: string
  type: 'rectangle' | 'circle' | 'arrow' | 'line' | 'freehand' | 'text'
  points: number[]
  style: {
    strokeColor: string
    strokeWidth: number
    fillColor?: string
    opacity: number
    fontSize?: number
    fontFamily?: string
  }
  createdAt: string
}

export interface FeedbackSession {
  id: string
  videoId: string
  name: string
  description?: string
  status: 'active' | 'completed' | 'scheduled' | 'cancelled'
  type: 'review' | 'approval' | 'collaborative' | 'presentation'
  participants: SessionParticipant[]
  scheduledAt?: string
  startedAt?: string
  endedAt?: string
  settings: {
    allowAnonymousParticipants: boolean
    requireModerator: boolean
    autoRecord: boolean
    maxParticipants?: number
    password?: string
  }
  moderator: {
    id: string
    name: string
  }
  createdAt: string
}

export interface SessionParticipant {
  id: string
  userId?: string
  name: string
  email?: string
  role: 'moderator' | 'participant' | 'observer'
  status: 'invited' | 'joined' | 'left' | 'removed'
  joinedAt?: string
  leftAt?: string
  permissions: {
    canComment: boolean
    canDraw: boolean
    canControlPlayback: boolean
    canInviteOthers: boolean
  }
}

export interface PlaybackState {
  currentTime: number
  duration: number
  isPlaying: boolean
  playbackRate: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  quality: 'auto' | '240p' | '360p' | '480p' | '720p' | '1080p'
  bufferedRanges: Array<{
    start: number
    end: number
  }>
  isBuffering: boolean
  hasError: boolean
  errorMessage?: string
}

export interface CanvasState {
  isDrawingMode: boolean
  activeTool: DrawingTool
  strokeColor: string
  strokeWidth: number
  fillColor?: string
  opacity: number
  fontSize: number
  fontFamily: string
  shapes: DrawingShape[]
  selectedShapeId?: string
  history: CanvasHistoryEntry[]
  historyIndex: number
  isVisible: boolean
  scale: number
  panOffset: { x: number; y: number }
}

export interface CanvasHistoryEntry {
  id: string
  shapes: DrawingShape[]
  timestamp: string
  action: 'add' | 'modify' | 'delete' | 'clear'
}

export type DrawingTool = 
  | 'select'
  | 'rectangle' 
  | 'circle' 
  | 'arrow' 
  | 'line' 
  | 'freehand' 
  | 'text' 
  | 'eraser'

export interface CommentFilters {
  author?: string[]
  type?: ('text' | 'drawing' | 'annotation' | 'approval' | 'revision')[]
  status?: ('pending' | 'approved' | 'resolved' | 'archived')[]
  priority?: ('low' | 'medium' | 'high' | 'critical')[]
  tags?: string[]
  timeRange?: {
    start: number
    end: number
  }
  dateRange?: {
    from: string
    to: string
  }
  sortBy: 'timestamp' | 'created' | 'priority' | 'author'
  sortOrder: 'asc' | 'desc'
  showResolved: boolean
  showPrivate: boolean
}

export interface RealtimeUser {
  id: string
  name: string
  avatar?: string
  cursor?: {
    x: number
    y: number
    timestamp: string
  }
  isTyping: boolean
  currentTool?: DrawingTool
  color: string
  lastSeen: string
  status: 'active' | 'idle' | 'offline'
}

// Form Data Types
export interface CreateCommentData {
  content: string
  timestamp: number
  timeRange?: {
    start: number
    end: number
  }
  position?: {
    x: number
    y: number
    width?: number
    height?: number
  }
  type: 'text' | 'drawing' | 'annotation'
  priority: 'low' | 'medium' | 'high' | 'critical'
  tags?: string[]
  attachments?: File[]
  mentions?: string[]
  isPrivate?: boolean
  drawingData?: DrawingData
}

export interface UpdateCommentData {
  content?: string
  priority?: 'low' | 'medium' | 'high' | 'critical'
  tags?: string[]
  isPrivate?: boolean
  isPinned?: boolean
}

export interface CreateFeedbackSessionData {
  name: string
  description?: string
  type: 'review' | 'approval' | 'collaborative' | 'presentation'
  scheduledAt?: string
  participants: Array<{
    email: string
    role: 'moderator' | 'participant' | 'observer'
  }>
  settings: {
    allowAnonymousParticipants: boolean
    requireModerator: boolean
    autoRecord: boolean
    maxParticipants?: number
    password?: string
  }
}

// Action Types
export interface VideoFeedbackActions {
  // Video Loading
  loadVideo: (videoId: string) => Promise<void>
  unloadVideo: () => void
  
  // Playback Control
  play: () => void
  pause: () => void
  seek: (time: number) => void
  setPlaybackRate: (rate: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
  toggleFullscreen: () => void
  setQuality: (quality: string) => void
  
  // Comment Management
  addComment: (data: CreateCommentData) => Promise<string>
  updateComment: (commentId: string, data: UpdateCommentData) => Promise<void>
  deleteComment: (commentId: string) => Promise<void>
  resolveComment: (commentId: string) => Promise<void>
  pinComment: (commentId: string) => Promise<void>
  addReaction: (commentId: string, emoji: string) => Promise<void>
  removeReaction: (commentId: string, emoji: string) => Promise<void>
  filterComments: (filters: Partial<CommentFilters>) => void
  selectComment: (commentId: string | null) => void
  
  // Drawing/Canvas
  enterDrawingMode: () => void
  exitDrawingMode: () => void
  selectDrawingTool: (tool: DrawingTool) => void
  setStrokeColor: (color: string) => void
  setStrokeWidth: (width: number) => void
  setFillColor: (color: string) => void
  setOpacity: (opacity: number) => void
  addShape: (shape: Omit<DrawingShape, 'id' | 'createdAt'>) => void
  updateShape: (shapeId: string, updates: Partial<DrawingShape>) => void
  deleteShape: (shapeId: string) => void
  clearCanvas: () => void
  undoCanvas: () => void
  redoCanvas: () => void
  
  // Feedback Sessions
  createSession: (data: CreateFeedbackSessionData) => Promise<string>
  joinSession: (sessionId: string, password?: string) => Promise<void>
  leaveSession: (sessionId: string) => Promise<void>
  inviteToSession: (sessionId: string, emails: string[]) => Promise<void>
  
  // Realtime Features
  updateCursor: (position: { x: number; y: number }) => void
  setTypingStatus: (isTyping: boolean) => void
  
  // State Management
  clearError: () => void
  resetState: () => void
}

// Event Types for real-time updates
export type VideoFeedbackEvent = 
  | { type: 'comment_added'; payload: { comment: VideoComment } }
  | { type: 'comment_updated'; payload: { commentId: string; updates: Partial<VideoComment> } }
  | { type: 'comment_deleted'; payload: { commentId: string } }
  | { type: 'comment_resolved'; payload: { commentId: string } }
  | { type: 'user_joined'; payload: { user: RealtimeUser } }
  | { type: 'user_left'; payload: { userId: string } }
  | { type: 'cursor_moved'; payload: { userId: string; position: { x: number; y: number } } }
  | { type: 'shape_added'; payload: { shape: DrawingShape } }
  | { type: 'shape_updated'; payload: { shapeId: string; updates: Partial<DrawingShape> } }
  | { type: 'shape_deleted'; payload: { shapeId: string } }
  | { type: 'playback_sync'; payload: { currentTime: number; isPlaying: boolean; userId: string } }