/**
 * VideoIntegration Widget - Public API
 * 통합 비디오 플레이어 위젯의 공개 인터페이스
 * 
 * FSD 준수: 이 파일만을 통해 VideoIntegration widget에 접근
 */

// Main Component
export { VideoPlayerIntegration } from './ui/VideoPlayerIntegration';

// Types
export type {
  VideoIntegrationConfig,
  VideoAccessibilityConfig,
  VideoPerformanceConfig,
  VideoCollaborationConfig,
  EnhancedVideoState,
  VideoQualityOption,
  CaptionTrack,
  VideoStats,
  VideoIntegrationProps,
} from './model/types';

// API Functions
export {
  getVideoQualityOptions,
  getCaptionTracks,
  saveVideoStats,
  saveAccessibilityPreferences,
  getAccessibilityPreferences,
  createCollaborationSession,
  joinCollaborationSession,
} from './api/videoIntegrationApi';