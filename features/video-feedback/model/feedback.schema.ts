/**
 * @fileoverview Video Feedback Domain Schema
 * @module features/video-feedback/model
 * 
 * 비디오 피드백 시스템의 도메인 모델과 타입 정의
 * Zod를 사용한 런타임 스키마 검증
 */

import { z } from 'zod';

// ============================================================
// Base Types & Enums
// ============================================================

/**
 * 비디오 업로드 상태
 */
export const VideoUploadStatus = z.enum([
  'idle',
  'validating',
  'uploading', 
  'processing',
  'generating_thumbnail',
  'completed',
  'failed'
]);

/**
 * 재생 속도 옵션
 */
export const PlaybackSpeed = z.enum([
  '0.25',
  '0.5',
  '0.75',
  '1',
  '1.25',
  '1.5',
  '1.75',
  '2'
]);

/**
 * 감정 반응 타입
 */
export const ReactionType = z.enum([
  'like',
  'heart',
  'celebrate',
  'insightful',
  'curious'
]);

/**
 * 코멘트 상태
 */
export const CommentStatus = z.enum([
  'active',
  'edited',
  'deleted',
  'resolved'
]);

// ============================================================
// Core Domain Models
// ============================================================

/**
 * 타임스탬프 마커
 */
export const TimeMarkerSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.number().min(0), // 초 단위
  label: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  createdAt: z.string().datetime(),
  createdBy: z.string().uuid()
});

/**
 * 비디오 메타데이터
 */
export const VideoMetadataSchema = z.object({
  id: z.string().uuid(),
  filename: z.string(),
  size: z.number().positive(), // bytes
  duration: z.number().positive(), // seconds
  width: z.number().positive(),
  height: z.number().positive(),
  frameRate: z.number().positive(),
  bitRate: z.number().positive(),
  codec: z.string(),
  mimeType: z.string(),
  thumbnailUrl: z.string().url().optional(),
  uploadedAt: z.string().datetime(),
  uploadedBy: z.string().uuid()
});

/**
 * 업로드 진행 상태
 */
export const UploadProgressSchema = z.object({
  status: VideoUploadStatus,
  progress: z.number().min(0).max(100),
  speed: z.number().optional(), // bytes/sec
  timeRemaining: z.number().optional(), // seconds
  error: z.string().optional()
});

/**
 * 사용자 멘션
 */
export const MentionSchema = z.object({
  id: z.string().uuid(),
  username: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().url().optional()
});

/**
 * 코멘트 스레드
 */
export const CommentSchema = z.object({
  id: z.string().uuid(),
  content: z.string().min(1).max(1000),
  timestamp: z.number().min(0).optional(), // 비디오 타임스탬프 (초)
  status: CommentStatus,
  mentions: z.array(MentionSchema).optional(),
  createdAt: z.string().datetime(),
  createdBy: z.object({
    id: z.string().uuid(),
    name: z.string(),
    avatarUrl: z.string().url().optional()
  }),
  updatedAt: z.string().datetime().optional(),
  parentId: z.string().uuid().optional(), // 대댓글용
  replies: z.lazy(() => z.array(CommentSchema)).optional()
});

/**
 * 감정 반응
 */
export const ReactionSchema = z.object({
  id: z.string().uuid(),
  type: ReactionType,
  timestamp: z.number().min(0).optional(), // 비디오 타임스탬프
  userId: z.string().uuid(),
  userName: z.string(),
  createdAt: z.string().datetime()
});

/**
 * 비디오 피드백 세션
 */
export const VideoFeedbackSessionSchema = z.object({
  id: z.string().uuid(),
  projectId: z.string().uuid(),
  video: VideoMetadataSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  markers: z.array(TimeMarkerSchema),
  comments: z.array(CommentSchema),
  reactions: z.array(ReactionSchema),
  participants: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    role: z.enum(['owner', 'reviewer', 'viewer']),
    avatarUrl: z.string().url().optional(),
    lastSeenAt: z.string().datetime().optional()
  })),
  settings: z.object({
    allowComments: z.boolean().default(true),
    allowReactions: z.boolean().default(true),
    allowDownload: z.boolean().default(false),
    autoplay: z.boolean().default(false),
    defaultSpeed: PlaybackSpeed.default('1'),
    captionsEnabled: z.boolean().default(false),
    captionsUrl: z.string().url().optional()
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

// ============================================================
// Player State Models
// ============================================================

/**
 * 비디오 플레이어 상태
 */
export const PlayerStateSchema = z.object({
  isPlaying: z.boolean(),
  currentTime: z.number().min(0),
  duration: z.number().min(0),
  volume: z.number().min(0).max(1),
  isMuted: z.boolean(),
  playbackSpeed: PlaybackSpeed,
  isFullscreen: z.boolean(),
  isBuffering: z.boolean(),
  bufferedRanges: z.array(z.tuple([z.number(), z.number()])),
  quality: z.enum(['auto', '360p', '480p', '720p', '1080p', '4k']).optional(),
  captionsEnabled: z.boolean(),
  selectedCaptionTrack: z.string().optional()
});

/**
 * 키보드 단축키 정의
 */
export const KeyboardShortcutsSchema = z.object({
  playPause: z.string().default('Space'),
  seekBackward: z.string().default('ArrowLeft'),
  seekForward: z.string().default('ArrowRight'),
  volumeUp: z.string().default('ArrowUp'),
  volumeDown: z.string().default('ArrowDown'),
  toggleMute: z.string().default('m'),
  toggleFullscreen: z.string().default('f'),
  toggleCaptions: z.string().default('c'),
  speedDecrease: z.string().default('-'),
  speedIncrease: z.string().default('+'),
  addMarker: z.string().default('Shift+m'),
  addComment: z.string().default('Shift+c')
});

// ============================================================
// File Validation
// ============================================================

/**
 * 비디오 파일 검증 규칙
 */
export const VideoFileValidationSchema = z.object({
  maxSize: z.number().default(5 * 1024 * 1024 * 1024), // 5GB
  allowedFormats: z.array(z.string()).default([
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo',
    'video/x-matroska'
  ]),
  minDuration: z.number().default(1), // 1 second
  maxDuration: z.number().default(3600), // 1 hour
  minResolution: z.object({
    width: z.number().default(320),
    height: z.number().default(240)
  }),
  maxResolution: z.object({
    width: z.number().default(3840), // 4K
    height: z.number().default(2160)
  })
});

// ============================================================
// Real-time Updates
// ============================================================

/**
 * 실시간 업데이트 이벤트
 */
export const RealtimeEventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('comment_added'),
    payload: CommentSchema
  }),
  z.object({
    type: z.literal('comment_updated'),
    payload: CommentSchema
  }),
  z.object({
    type: z.literal('comment_deleted'),
    payload: z.object({ id: z.string().uuid() })
  }),
  z.object({
    type: z.literal('reaction_added'),
    payload: ReactionSchema
  }),
  z.object({
    type: z.literal('reaction_removed'),
    payload: z.object({ id: z.string().uuid() })
  }),
  z.object({
    type: z.literal('marker_added'),
    payload: TimeMarkerSchema
  }),
  z.object({
    type: z.literal('marker_updated'),
    payload: TimeMarkerSchema
  }),
  z.object({
    type: z.literal('marker_deleted'),
    payload: z.object({ id: z.string().uuid() })
  }),
  z.object({
    type: z.literal('participant_joined'),
    payload: z.object({
      id: z.string().uuid(),
      name: z.string(),
      avatarUrl: z.string().url().optional()
    })
  }),
  z.object({
    type: z.literal('participant_left'),
    payload: z.object({ id: z.string().uuid() })
  })
]);

// ============================================================
// Type Exports
// ============================================================

export type VideoUploadStatus = z.infer<typeof VideoUploadStatus>;
export type PlaybackSpeed = z.infer<typeof PlaybackSpeed>;
export type ReactionType = z.infer<typeof ReactionType>;
export type CommentStatus = z.infer<typeof CommentStatus>;
export type TimeMarker = z.infer<typeof TimeMarkerSchema>;
export type VideoMetadata = z.infer<typeof VideoMetadataSchema>;
export type UploadProgress = z.infer<typeof UploadProgressSchema>;
export type Mention = z.infer<typeof MentionSchema>;
export type Comment = z.infer<typeof CommentSchema>;
export type Reaction = z.infer<typeof ReactionSchema>;
export type VideoFeedbackSession = z.infer<typeof VideoFeedbackSessionSchema>;
export type PlayerState = z.infer<typeof PlayerStateSchema>;
export type KeyboardShortcuts = z.infer<typeof KeyboardShortcutsSchema>;
export type VideoFileValidation = z.infer<typeof VideoFileValidationSchema>;
export type RealtimeEvent = z.infer<typeof RealtimeEventSchema>;