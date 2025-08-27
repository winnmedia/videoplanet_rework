/**
 * @description Video Feedback Widget 타입 정의
 * @purpose 비디오 피드백 시스템의 핵심 데이터 모델
 */

// 비디오 파일 메타데이터
export interface VideoMetadata {
  id: string;
  filename: string;
  url: string;
  thumbnail?: string;
  duration: number; // 초 단위
  fileSize: number; // 바이트 단위
  format: string; // 'mp4', 'webm', 'mov' 등
  resolution: {
    width: number;
    height: number;
  };
  uploadedAt: string; // ISO 8601 format
  uploadedBy: string; // 업로드한 사용자 ID
}

// 타임스탬프 기반 코멘트
export interface TimestampComment {
  id: string;
  videoId: string;
  timestamp: number; // 초 단위 (예: 75 = 1분 15초)
  x?: number; // 비디오 상에서 X 좌표 (percentage)
  y?: number; // 비디오 상에서 Y 좌표 (percentage)
  content: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: 'client' | 'editor' | 'reviewer' | 'admin';
  };
  createdAt: string; // ISO 8601 format
  updatedAt?: string;
  status: 'open' | 'resolved' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[]; // ['색상', '음향', '자막', '편집'] 등
}

// 댓글 스레드 (답글 시스템)
export interface CommentThread {
  parentCommentId: string;
  replies: TimestampComment[];
  totalReplies: number;
  lastReplyAt?: string;
}

// 비디오 마커 (시각적 주석)
export interface VideoMarker {
  id: string;
  videoId: string;
  timestamp: number;
  type: 'point' | 'rectangle' | 'circle' | 'arrow';
  coordinates: {
    x: number; // percentage
    y: number; // percentage
    width?: number; // 사각형의 경우
    height?: number; // 사각형의 경우
    radius?: number; // 원형의 경우
  };
  style: {
    color: string;
    strokeWidth: number;
    opacity: number;
  };
  linkedCommentId?: string; // 연결된 코멘트
  createdBy: string;
  createdAt: string;
}

// 피드백 상태
export type FeedbackStatus = 
  | 'draft'          // 초안
  | 'pending'        // 검토 대기
  | 'in_review'      // 검토중
  | 'revision_needed' // 수정 필요
  | 'approved'       // 승인됨
  | 'rejected'       // 거절됨
  | 'completed';     // 완료

// 비디오 피드백 세션
export interface VideoFeedbackSession {
  id: string;
  projectId: string;
  videoMetadata: VideoMetadata;
  status: FeedbackStatus;
  title: string;
  description?: string;
  version: string; // 'v1.0', 'v2.1' 등
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deadline?: string;
  reviewers: string[]; // 리뷰어 ID 목록
  comments: TimestampComment[];
  markers: VideoMarker[];
  totalComments: number;
  resolvedComments: number;
  pendingComments: number;
}

// 피드백 통계
export interface FeedbackStats {
  totalSessions: number;
  activeSessions: number;
  completedSessions: number;
  averageResolutionTime: number; // 시간 단위
  commentsByStatus: {
    open: number;
    resolved: number;
    archived: number;
  };
  commentsByPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
}

// 비디오 재생 상태
export interface VideoPlaybackState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isPaused: boolean;
  isMuted: boolean;
  volume: number; // 0-1
  playbackRate: number; // 0.25, 0.5, 1, 1.25, 1.5, 2
  isFullscreen: boolean;
  quality: 'auto' | '240p' | '480p' | '720p' | '1080p';
}

// 비디오 컨트롤 이벤트
export interface VideoControlEvents {
  onPlay: () => void;
  onPause: () => void;
  onSeek: (timestamp: number) => void;
  onVolumeChange: (volume: number) => void;
  onPlaybackRateChange: (rate: number) => void;
  onFullscreenToggle: () => void;
  onQualityChange: (quality: string) => void;
}

// 피드백 이벤트
export interface FeedbackEvents {
  onCommentAdd: (comment: Omit<TimestampComment, 'id' | 'createdAt'>) => void;
  onCommentUpdate: (commentId: string, updates: Partial<TimestampComment>) => void;
  onCommentDelete: (commentId: string) => void;
  onCommentResolve: (commentId: string) => void;
  onMarkerAdd: (marker: Omit<VideoMarker, 'id' | 'createdAt'>) => void;
  onMarkerUpdate: (markerId: string, updates: Partial<VideoMarker>) => void;
  onMarkerDelete: (markerId: string) => void;
  onStatusChange: (sessionId: string, newStatus: FeedbackStatus) => void;
}

// API 응답 타입
export interface VideoFeedbackResponse {
  session: VideoFeedbackSession;
  success: boolean;
  message?: string;
  errors?: string[];
}

export interface VideoFeedbackListResponse {
  sessions: VideoFeedbackSession[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// 컴포넌트 Props 타입들
export interface VideoFeedbackWidgetProps {
  sessionId: string;
  isReadOnly?: boolean;
  showTimeline?: boolean;
  showMarkers?: boolean;
  showStats?: boolean;
  onSessionUpdate?: (session: VideoFeedbackSession) => void;
  onError?: (error: string) => void;
}

export interface VideoPlayerProps {
  videoMetadata: VideoMetadata;
  playbackState: VideoPlaybackState;
  markers?: VideoMarker[];
  comments?: TimestampComment[];
  onPlaybackStateChange: (state: Partial<VideoPlaybackState>) => void;
  onMarkerClick?: (marker: VideoMarker) => void;
  onVideoClick?: (coordinates: { x: number; y: number; timestamp: number }) => void;
  className?: string;
}

export interface FeedbackTimelineProps {
  comments: TimestampComment[];
  markers: VideoMarker[];
  duration: number;
  currentTime: number;
  onTimelineClick: (timestamp: number) => void;
  onCommentClick: (comment: TimestampComment) => void;
  className?: string;
}

export interface CommentThreadProps {
  comments: TimestampComment[];
  threads: CommentThread[];
  currentUser: { id: string; name: string; role: string };
  onCommentAdd: FeedbackEvents['onCommentAdd'];
  onCommentUpdate: FeedbackEvents['onCommentUpdate'];
  onCommentDelete: FeedbackEvents['onCommentDelete'];
  onCommentResolve: FeedbackEvents['onCommentResolve'];
  isReadOnly?: boolean;
  className?: string;
}

export interface VideoControlsProps {
  playbackState: VideoPlaybackState;
  onControlEvent: VideoControlEvents;
  showAdvancedControls?: boolean;
  className?: string;
}

export interface FeedbackStatusBarProps {
  session: VideoFeedbackSession;
  stats: FeedbackStats;
  onStatusChange: FeedbackEvents['onStatusChange'];
  isReadOnly?: boolean;
  className?: string;
}

// 유틸리티 타입들
export interface TimeFormat {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string; // "01:23:45" 형식
}

export interface CommentPosition {
  timestamp: number;
  x: number;
  y: number;
  isVisible: boolean;
}