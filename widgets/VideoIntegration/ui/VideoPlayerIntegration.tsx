/**
 * VideoPlayerIntegration - 통합 비디오 플레이어
 * Phase 2 - 멀티미디어 접근성 60%→90% 향상
 */

'use client'

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react'

import styles from './VideoPlayerIntegration.module.scss'
import { VideoPlayer } from '../../VideoFeedback/ui/VideoPlayer'
import { 
  getVideoQualityOptions, 
  getCaptionTracks, 
  saveVideoStats,
  getAccessibilityPreferences,
  saveAccessibilityPreferences 
} from '../api/videoIntegrationApi'
import type { 
  VideoIntegrationProps, 
  EnhancedVideoState, 
  VideoIntegrationConfig,
  VideoQualityOption,
  CaptionTrack,
  VideoStats 
} from '../model/types'


const DEFAULT_CONFIG: VideoIntegrationConfig = {
  autoplay: false,
  loop: false,
  muted: false,
  controls: true,
  accessibility: {
    captions: {
      enabled: false,
      language: 'ko',
      fontSize: 'medium',
      position: 'bottom'
    },
    audioDescription: {
      enabled: false
    },
    keyboard: {
      enabled: true,
      shortcuts: {
        'Space': '재생/일시정지',
        'ArrowLeft': '5초 뒤로',
        'ArrowRight': '5초 앞으로',
        'ArrowUp': '볼륨 증가',
        'ArrowDown': '볼륨 감소',
        'M': '음소거 토글',
        'F': '전체화면 토글',
        'C': '자막 토글'
      }
    },
    screenReader: {
      announceTimeUpdates: true,
      announceStateChanges: true,
      detailedDescriptions: false
    },
    visual: {
      highContrast: false,
      reducedMotion: false,
      focusIndicators: true
    }
  },
  performance: {
    preload: 'metadata',
    adaptiveQuality: {
      enabled: true,
      minBitrate: 500000,
      maxBitrate: 8000000,
      bufferSize: 30
    },
    buffering: {
      ahead: 30,
      behind: 10,
      maxBuffer: 60
    },
    resourceSaving: {
      pauseOnHidden: true,
      lowPowerMode: false,
      memoryOptimization: true
    }
  },
  collaboration: {
    syncPlayback: {
      enabled: false,
      tolerance: 500
    },
    realTimeMarkers: {
      enabled: false,
      maxMarkers: 50,
      persistence: 'session'
    },
    coEditing: {
      enabled: false,
      lockTimeout: 30000,
      conflictResolution: 'last-write-wins'
    }
  }
}

export function VideoPlayerIntegration({
  videoMetadata,
  playbackState,
  markers = [],
  comments = [],
  onMarkerClick,
  onVideoClick,
  config: configOverride = {},
  onStateChange,
  onStatsUpdate,
  qualityOptions: initialQualityOptions,
  onQualityChange,
  captionTracks: initialCaptionTracks,
  onCaptionChange,
  onAccessibilityAction,
  onCollaborationEvent,
  theme = 'auto',
  size = 'medium',
  className = ''
}: VideoIntegrationProps) {
  // 설정 병합
  const config = useMemo(() => ({
    ...DEFAULT_CONFIG,
    ...configOverride,
    accessibility: {
      ...DEFAULT_CONFIG.accessibility,
      ...configOverride.accessibility
    },
    performance: {
      ...DEFAULT_CONFIG.performance,
      ...configOverride.performance
    },
    collaboration: {
      ...DEFAULT_CONFIG.collaboration,
      ...configOverride.collaboration
    }
  }), [configOverride])

  // 상태 관리
  const [enhancedState, setEnhancedState] = useState<EnhancedVideoState>({
    playback: {
      isPlaying: playbackState.isPlaying,
      isPaused: playbackState.isPaused,
      currentTime: playbackState.currentTime,
      duration: playbackState.duration,
      buffered: null,
      volume: playbackState.volume,
      isMuted: playbackState.isMuted,
      playbackRate: playbackState.playbackRate
    },
    loading: {
      isLoading: false,
      progress: 0,
      error: null,
      networkState: 0,
      readyState: 0
    },
    accessibility: {
      captionsVisible: config.accessibility.captions.enabled,
      audioDescriptionActive: config.accessibility.audioDescription.enabled,
      keyboardFocused: false,
      screenReaderActive: false
    },
    collaboration: {
      syncedUsers: [],
      activeMarkers: markers.length,
      isLeader: false,
      connectionStatus: 'disconnected'
    }
  })

  // 품질 및 자막 상태
  const [qualityOptions, setQualityOptions] = useState<VideoQualityOption[]>(initialQualityOptions || [])
  const [captionTracks, setCaptionTracks] = useState<CaptionTrack[]>(initialCaptionTracks || [])
  const [activeCaptionTrack, setActiveCaptionTrack] = useState<CaptionTrack | null>(null)

  // 통계 추적
  const [stats, setStats] = useState<VideoStats>({
    playback: {
      totalPlayTime: 0,
      bufferingTime: 0,
      seekCount: 0,
      qualityChanges: 0
    },
    network: {
      bytesLoaded: 0,
      downloadSpeed: 0,
      bufferHealth: 0,
      droppedFrames: 0
    },
    user: {
      pauseCount: 0,
      volumeChanges: 0,
      rateChanges: 0,
      fullscreenToggle: 0
    }
  })

  // 스크린 리더 알림을 위한 라이브 리전
  const [screenReaderMessage, setScreenReaderMessage] = useState<string>('')
  
  // Ref 관리
  const containerRef = useRef<HTMLDivElement>(null)
  const statsTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 접근성 설정 로드
  useEffect(() => {
    if (config.accessibility.keyboard.enabled) {
      getAccessibilityPreferences().then(preferences => {
        if (preferences) {
          // 사용자 접근성 설정 적용
          setActiveCaptionTrack(
            captionTracks.find(track => track.language === preferences.captionLanguage) || null
          )
        }
      })
    }
  }, [config.accessibility.keyboard.enabled, captionTracks])

  // 품질 옵션 및 자막 트랙 초기화
  useEffect(() => {
    if (!initialQualityOptions) {
      getVideoQualityOptions(videoMetadata.id || 'default').then(setQualityOptions)
    }
    
    if (!initialCaptionTracks) {
      getCaptionTracks(videoMetadata.id || 'default').then(setCaptionTracks)
    }
  }, [videoMetadata.id, initialQualityOptions, initialCaptionTracks])

  // 키보드 접근성 핸들러
  const handleAccessibilityKeyboard = useCallback((event: KeyboardEvent) => {
    // TODO(human): 키보드 단축키 시스템 구현
    // - 스페이스바: 재생/일시정지
    // - 좌우 화살표: 5초 이동  
    // - 상하 화살표: 볼륨 조절
    // - M키: 음소거
    // - F키: 전체화면
    // - C키: 자막 토글
    // - preventDefault()로 기본 동작 방지
    // - 스크린 리더 알림 포함
  }, [enhancedState, activeCaptionTrack, onAccessibilityAction])

  // 키보드 이벤트 리스너 등록
  useEffect(() => {
    if (!config.accessibility.keyboard.enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // 입력 필드에서는 단축키 비활성화
      const target = event.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
        return
      }

      handleAccessibilityKeyboard(event)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [handleAccessibilityKeyboard, config.accessibility.keyboard.enabled])

  // 향상된 상태 업데이트 핸들러
  const handlePlaybackStateChange = useCallback((newState: Partial<typeof playbackState>) => {
    setEnhancedState(prev => {
      const updated = {
        ...prev,
        playback: {
          ...prev.playback,
          ...newState
        }
      }
      
      // 상태 변경 알림 (스크린 리더)
      if (config.accessibility.screenReader.announceStateChanges) {
        if (newState.isPlaying !== undefined) {
          const message = newState.isPlaying ? '재생이 시작되었습니다' : '재생이 일시정지되었습니다'
          setScreenReaderMessage(message)
          onAccessibilityAction?.('announce', message)
        }
      }
      
      // 통계 업데이트
      if (newState.isPlaying !== prev.playback.isPlaying) {
        setStats(prevStats => ({
          ...prevStats,
          user: {
            ...prevStats.user,
            pauseCount: prevStats.user.pauseCount + (newState.isPlaying ? 0 : 1)
          }
        }))
      }

      onStateChange?.(updated)
      return updated
    })
  }, [config.accessibility.screenReader.announceStateChanges, onStateChange, onAccessibilityAction])

  // 품질 변경 핸들러
  const handleQualityChange = useCallback((quality: VideoQualityOption) => {
    setQualityOptions(prev => 
      prev.map(option => ({
        ...option,
        isActive: option.value === quality.value
      }))
    )
    
    setStats(prev => ({
      ...prev,
      playback: {
        ...prev.playback,
        qualityChanges: prev.playback.qualityChanges + 1
      }
    }))
    
    onQualityChange?.(quality)
    
    if (config.accessibility.screenReader.announceStateChanges) {
      const message = `비디오 품질이 ${quality.label}로 변경되었습니다`
      setScreenReaderMessage(message)
      onAccessibilityAction?.('announce', message)
    }
  }, [config.accessibility.screenReader.announceStateChanges, onQualityChange, onAccessibilityAction])

  // 자막 변경 핸들러  
  const handleCaptionChange = useCallback((track: CaptionTrack | null) => {
    setActiveCaptionTrack(track)
    setCaptionTracks(prev => 
      prev.map(captionTrack => ({
        ...captionTrack,
        isActive: captionTrack.id === track?.id
      }))
    )
    
    setEnhancedState(prev => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        captionsVisible: track !== null
      }
    }))
    
    onCaptionChange?.(track)
    
    if (config.accessibility.screenReader.announceStateChanges) {
      const message = track 
        ? `${track.label} 자막이 활성화되었습니다`
        : '자막이 비활성화되었습니다'
      setScreenReaderMessage(message)
      onAccessibilityAction?.('announce', message)
    }
    
    // 사용자 설정 저장
    if (track) {
      saveAccessibilityPreferences({
        captionsEnabled: true,
        captionLanguage: track.language,
        captionFontSize: config.accessibility.captions.fontSize,
        audioDescriptionEnabled: config.accessibility.audioDescription.enabled,
        keyboardShortcutsEnabled: config.accessibility.keyboard.enabled,
        highContrastEnabled: config.accessibility.visual.highContrast,
        reducedMotionEnabled: config.accessibility.visual.reducedMotion
      })
    }
  }, [config, onCaptionChange, onAccessibilityAction])

  // 통계 주기적 저장
  useEffect(() => {
    statsTimerRef.current = setInterval(() => {
      if (videoMetadata.id && stats.playback.totalPlayTime > 0) {
        saveVideoStats(videoMetadata.id, stats)
        onStatsUpdate?.(stats)
      }
    }, 30000) // 30초마다 통계 저장

    return () => {
      if (statsTimerRef.current) {
        clearInterval(statsTimerRef.current)
      }
    }
  }, [videoMetadata.id, stats, onStatsUpdate])

  // 포커스 상태 관리
  const handleFocus = useCallback(() => {
    setEnhancedState(prev => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        keyboardFocused: true
      }
    }))
  }, [])

  const handleBlur = useCallback(() => {
    setEnhancedState(prev => ({
      ...prev,
      accessibility: {
        ...prev.accessibility,
        keyboardFocused: false
      }
    }))
  }, [])

  return (
    <div 
      ref={containerRef}
      className={`${styles.videoIntegrationContainer} ${styles[theme]} ${styles[size]} ${className}`}
      onFocus={handleFocus}
      onBlur={handleBlur}
      tabIndex={0}
      role="application"
      aria-label="통합 비디오 플레이어"
      aria-describedby="video-integration-description"
    >
      {/* 스크린 리더를 위한 설명 */}
      <div id="video-integration-description" className={styles.srOnly}>
        접근성이 향상된 비디오 플레이어입니다. 
        {config.accessibility.keyboard.enabled && '키보드 단축키를 지원합니다. '}
        {enhancedState.accessibility.captionsVisible && '자막이 활성화되어 있습니다. '}
        {config.accessibility.audioDescription.enabled && '음성 해설이 활성화되어 있습니다.'}
      </div>

      {/* 라이브 리전 (스크린 리더 알림) */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className={styles.srOnly}
      >
        {screenReaderMessage}
      </div>

      {/* 메인 비디오 플레이어 */}
      <VideoPlayer
        videoMetadata={videoMetadata}
        playbackState={playbackState}
        markers={markers}
        comments={comments}
        onPlaybackStateChange={handlePlaybackStateChange}
        onMarkerClick={onMarkerClick}
        onVideoClick={onVideoClick}
        className={styles.videoPlayer}
      />

      {/* 접근성 컨트롤 패널 */}
      {config.accessibility.keyboard.enabled && enhancedState.accessibility.keyboardFocused && (
        <div className={styles.accessibilityPanel} role="region" aria-label="접근성 설정">
          {/* 자막 선택 */}
          {captionTracks.length > 0 && (
            <div className={styles.captionControls}>
              <label htmlFor="caption-select" className={styles.label}>
                자막 언어
              </label>
              <select
                id="caption-select"
                value={activeCaptionTrack?.id || ''}
                onChange={(e) => {
                  const track = captionTracks.find(t => t.id === e.target.value) || null
                  handleCaptionChange(track)
                }}
                className={styles.select}
              >
                <option value="">자막 없음</option>
                {captionTracks.map(track => (
                  <option key={track.id} value={track.id}>
                    {track.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 품질 선택 */}
          {qualityOptions.length > 0 && (
            <div className={styles.qualityControls}>
              <label htmlFor="quality-select" className={styles.label}>
                비디오 품질
              </label>
              <select
                id="quality-select"
                value={qualityOptions.find(q => q.isActive)?.value || ''}
                onChange={(e) => {
                  const quality = qualityOptions.find(q => q.value === e.target.value)
                  if (quality) {
                    handleQualityChange(quality)
                  }
                }}
                className={styles.select}
              >
                {qualityOptions.map(option => (
                  <option key={option.value} value={option.value} disabled={!option.isAvailable}>
                    {option.label} {!option.isAvailable && '(사용 불가)'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 키보드 단축키 도움말 */}
          <details className={styles.keyboardHelp}>
            <summary className={styles.helpSummary}>키보드 단축키 도움말</summary>
            <dl className={styles.shortcutList}>
              {Object.entries(config.accessibility.keyboard.shortcuts).map(([key, description]) => (
                <div key={key} className={styles.shortcutItem}>
                  <dt className={styles.shortcutKey}>
                    <kbd>{key === 'Space' ? '스페이스' : key}</kbd>
                  </dt>
                  <dd className={styles.shortcutDescription}>{description}</dd>
                </div>
              ))}
            </dl>
          </details>
        </div>
      )}

      {/* 통계 패널 (개발 모드에서만 표시) */}
      {process.env.NODE_ENV === 'development' && (
        <div className={styles.statsPanel} role="region" aria-label="비디오 통계">
          <h3>비디오 통계</h3>
          <dl className={styles.statsList}>
            <dt>총 재생 시간</dt>
            <dd>{Math.round(stats.playback.totalPlayTime)}초</dd>
            <dt>일시정지 횟수</dt>
            <dd>{stats.user.pauseCount}회</dd>
            <dt>품질 변경</dt>
            <dd>{stats.playback.qualityChanges}회</dd>
            <dt>볼륨 변경</dt>
            <dd>{stats.user.volumeChanges}회</dd>
          </dl>
        </div>
      )}
    </div>
  )
}