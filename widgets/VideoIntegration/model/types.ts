/**
 * VideoIntegration - 타입 정의
 * Phase 2 - 60%→90% 완성도 향상
 */

import type { VideoPlayerProps } from '../../VideoFeedback/model/types'

/**
 * 비디오 통합 설정
 */
export interface VideoIntegrationConfig {
  // 기본 설정
  autoplay: boolean
  loop: boolean
  muted: boolean
  controls: boolean
  
  // 접근성 설정
  accessibility: VideoAccessibilityConfig
  
  // 성능 설정
  performance: VideoPerformanceConfig
  
  // 협업 설정
  collaboration: VideoCollaborationConfig
}

/**
 * 비디오 접근성 설정 (WCAG 2.1 AA 준수)
 */
export interface VideoAccessibilityConfig {
  // 자막 설정
  captions: {
    enabled: boolean
    language: string
    fontSize: 'small' | 'medium' | 'large'
    position: 'bottom' | 'top'
  }
  
  // 음성 해설
  audioDescription: {
    enabled: boolean
    track?: string
  }
  
  // 키보드 내비게이션
  keyboard: {
    enabled: boolean
    shortcuts: Record<string, string>
  }
  
  // 화면 낭독기 지원
  screenReader: {
    announceTimeUpdates: boolean
    announceStateChanges: boolean
    detailedDescriptions: boolean
  }
  
  // 시각적 접근성
  visual: {
    highContrast: boolean
    reducedMotion: boolean
    focusIndicators: boolean
  }
}

/**
 * 비디오 성능 설정
 */
export interface VideoPerformanceConfig {
  // 프리로딩 전략
  preload: 'none' | 'metadata' | 'auto'
  
  // 품질 자동 조정
  adaptiveQuality: {
    enabled: boolean
    minBitrate: number
    maxBitrate: number
    bufferSize: number
  }
  
  // 버퍼링 최적화
  buffering: {
    ahead: number // 초 단위
    behind: number
    maxBuffer: number
  }
  
  // 리소스 절약
  resourceSaving: {
    pauseOnHidden: boolean
    lowPowerMode: boolean
    memoryOptimization: boolean
  }
}

/**
 * 비디오 협업 설정
 */
export interface VideoCollaborationConfig {
  // 동기화 재생
  syncPlayback: {
    enabled: boolean
    tolerance: number // ms
    leaderUserId?: string
  }
  
  // 실시간 마커
  realTimeMarkers: {
    enabled: boolean
    maxMarkers: number
    persistence: 'session' | 'permanent'
  }
  
  // 공동 편집
  coEditing: {
    enabled: boolean
    lockTimeout: number
    conflictResolution: 'last-write-wins' | 'merge' | 'manual'
  }
}

/**
 * 비디오 플레이어 상태 확장
 */
export interface EnhancedVideoState {
  // 기본 재생 상태
  playback: {
    isPlaying: boolean
    isPaused: boolean
    currentTime: number
    duration: number
    buffered: TimeRanges | null
    volume: number
    isMuted: boolean
    playbackRate: number
  }
  
  // 로딩 상태
  loading: {
    isLoading: boolean
    progress: number
    error: string | null
    networkState: number
    readyState: number
  }
  
  // 접근성 상태
  accessibility: {
    captionsVisible: boolean
    audioDescriptionActive: boolean
    keyboardFocused: boolean
    screenReaderActive: boolean
  }
  
  // 협업 상태
  collaboration: {
    syncedUsers: string[]
    activeMarkers: number
    isLeader: boolean
    connectionStatus: 'connected' | 'disconnected' | 'syncing'
  }
}

/**
 * 비디오 품질 옵션
 */
export interface VideoQualityOption {
  label: string
  value: string
  bitrate: number
  resolution: {
    width: number
    height: number
  }
  isActive: boolean
  isAvailable: boolean
}

/**
 * 자막 트랙 정보
 */
export interface CaptionTrack {
  id: string
  language: string
  label: string
  kind: 'subtitles' | 'captions' | 'descriptions'
  src: string
  isDefault: boolean
  isActive: boolean
}

/**
 * 비디오 통계 정보
 */
export interface VideoStats {
  // 재생 통계
  playback: {
    totalPlayTime: number
    bufferingTime: number
    seekCount: number
    qualityChanges: number
  }
  
  // 네트워크 통계
  network: {
    bytesLoaded: number
    downloadSpeed: number
    bufferHealth: number
    droppedFrames: number
  }
  
  // 사용자 행동
  user: {
    pauseCount: number
    volumeChanges: number
    rateChanges: number
    fullscreenToggle: number
  }
}

/**
 * VideoIntegration 컴포넌트 Props
 */
export interface VideoIntegrationProps extends Omit<VideoPlayerProps, 'onPlaybackStateChange'> {
  // 통합 설정
  config: Partial<VideoIntegrationConfig>
  
  // 상태 관리
  onStateChange?: (state: EnhancedVideoState) => void
  onStatsUpdate?: (stats: VideoStats) => void
  
  // 품질 관리
  qualityOptions?: VideoQualityOption[]
  onQualityChange?: (quality: VideoQualityOption) => void
  
  // 자막 관리
  captionTracks?: CaptionTrack[]
  onCaptionChange?: (track: CaptionTrack | null) => void
  
  // 접근성 이벤트
  onAccessibilityAction?: (action: string, data?: unknown) => void
  
  // 협업 이벤트
  onCollaborationEvent?: (event: string, data?: unknown) => void
  
  // 추가 스타일링
  theme?: 'light' | 'dark' | 'auto'
  size?: 'small' | 'medium' | 'large' | 'fullscreen'
}