/**
 * @description VideoFeedback Widget Public API
 * @purpose FSD 아키텍처에 따른 공개 인터페이스 제공
 */

// Main Widget Component
export { VideoFeedbackWidget } from './ui/VideoFeedbackWidget'

// Sub Components
export { VideoPlayer } from './ui/VideoPlayer'
export { FeedbackTimeline } from './ui/FeedbackTimeline'
export { CommentThread } from './ui/CommentThread'
export { VideoControls } from './ui/VideoControls'
export { FeedbackStatusBar } from './ui/FeedbackStatusBar'

// API Layer
export { VideoFeedbackApi } from './api/videoFeedbackApi'

// Types
export type {
  // Core Types
  VideoMetadata,
  TimestampComment,
  CommentThread as CommentThreadType,
  VideoMarker,
  VideoFeedbackSession,
  FeedbackStatus,
  FeedbackStats,
  
  // Playback Types
  VideoPlaybackState,
  VideoControlEvents,
  FeedbackEvents,
  
  // Component Props Types
  VideoFeedbackWidgetProps,
  VideoPlayerProps,
  FeedbackTimelineProps,
  CommentThreadProps,
  VideoControlsProps,
  FeedbackStatusBarProps,
  
  // API Response Types
  VideoFeedbackResponse,
  VideoFeedbackListResponse,
  
  // Utility Types
  TimeFormat,
  CommentPosition
} from './model/types'