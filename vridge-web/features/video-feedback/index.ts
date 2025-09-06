/**
 * @fileoverview Video Feedback Feature - Public API
 * @module features/video-feedback
 * 
 * 비디오 피드백 시스템의 공개 API
 * FSD 아키텍처에 따른 Public API 엔트리포인트
 */

// ============================================================
// UI Components
// ============================================================

export { VideoUploader } from './ui/VideoUploader';
export { VideoPlayer } from './ui/VideoPlayer';
export { CommentThread } from './ui/CommentThread';
export { TimecodeCommentInput } from './ui/TimecodeCommentInput';
export { ReactionBar } from './ui/ReactionBar';
export { TimelineMarkers } from './ui/TimelineMarkers';

// ============================================================
// Model (Schema & Types)
// ============================================================

export {
  // Enums
  VideoUploadStatus,
  PlaybackSpeed,
  ReactionType,
  CommentStatus,
  
  // Schemas
  TimeMarkerSchema,
  VideoMetadataSchema,
  UploadProgressSchema,
  MentionSchema,
  CommentSchema,
  ReactionSchema,
  VideoFeedbackSessionSchema,
  PlayerStateSchema,
  KeyboardShortcutsSchema,
  VideoFileValidationSchema,
  RealtimeEventSchema,
  
  // Types
  type TimeMarker,
  type VideoMetadata,
  type UploadProgress,
  type Mention,
  type Comment,
  type Reaction,
  type VideoFeedbackSession,
  type PlayerState,
  type KeyboardShortcuts,
  type VideoFileValidation,
  type RealtimeEvent
} from './model/feedback.schema';

// ============================================================
// Redux State Management
// ============================================================

export {
  // Slice
  default as videoFeedbackReducer,
  
  // State Type
  type VideoFeedbackState,
  
  // Actions
  setCurrentSession,
  clearSession,
  updatePlayerState,
  optimisticAddComment,
  optimisticUpdateComment,
  optimisticDeleteComment,
  optimisticAddReaction,
  optimisticRemoveReaction,
  optimisticAddMarker,
  optimisticUpdateMarker,
  optimisticDeleteMarker,
  handleRealtimeEvent,
  setConnectionStatus,
  confirmPendingUpdate,
  setCommentFilter,
  selectMarker,
  selectComment,
  setUploadProgress,
  setError,
  
  // Async Thunks
  loadSession,
  addComment,
  addReaction,
  addMarker
} from './model/feedbackSlice';

// ============================================================
// Utility Functions
// ============================================================

export {
  // Time Formatting
  formatDuration,
  parseDuration,
  formatRelativeTime,
  
  // File Size Formatting
  formatFileSize,
  formatUploadSpeed,
  calculateTimeRemaining,
  
  // Video Metadata
  extractVideoMetadata,
  type VideoMetadata as VideoMetadataInfo,
  
  // Thumbnail Generation
  generateThumbnail,
  generateMultipleThumbnails,
  type ThumbnailOptions,
  
  // Chunk Upload
  createFileChunks,
  calculateChunkHash,
  type ChunkUploadOptions,
  
  // Video Validation
  validateVideoFile,
  type VideoValidationResult,
  
  // WebRTC Utilities
  checkMediaCapabilities,
  getSupportedVideoCodecs
} from './lib/videoUtils';

// ============================================================
// Timecode Utilities
// ============================================================

export {
  // Timecode Formatting
  formatTimecode,
  parseTimecode,
  insertTimecode,
  extractTimecodes,
  isValidTimecodeFormat,
  normalizeTimecodeSpacing,
  removeDuplicateTimecodes,
  extractTimecodesInRange,
  findNearestTimecode,
  
  // Types
  type TimecodeInsertResult,
  type TimecodeMatch
} from './lib/timecodeUtils';

// ============================================================
// Timecode Hooks
// ============================================================

export {
  useTimecodeSync,
  useTimecodeClickHandler,
  useTimecodeRenderer,
  
  // Types
  type TimecodeSync,
  type TimecodeOptions
} from './lib/useTimecodeSync';

// ============================================================
// Component Props Types (for external usage)
// ============================================================

export type { VideoUploaderProps } from './ui/VideoUploader';
export type { VideoPlayerProps } from './ui/VideoPlayer';
export type { CommentThreadProps } from './ui/CommentThread';
export type { ReactionBarProps } from './ui/ReactionBar';
export type { TimelineMarkersProps } from './ui/TimelineMarkers';