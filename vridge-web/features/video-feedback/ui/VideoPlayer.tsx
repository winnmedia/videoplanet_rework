'use client';

/**
 * @fileoverview Custom Video Player Component
 * @module features/video-feedback/ui
 * 
 * 커스텀 비디오 플레이어
 * - 커스텀 컨트롤
 * - 타임스탬프 마커
 * - 재생 속도 조절
 * - 전체화면 지원
 * - 키보드 단축키
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { PlayerState, PlaybackSpeed, TimeMarker, KeyboardShortcuts } from '../model/feedback.schema';

// ============================================================
// Types
// ============================================================

export interface VideoPlayerProps {
  /**
   * 비디오 소스 URL
   */
  src: string;
  
  /**
   * 포스터 이미지 URL (썸네일)
   */
  poster?: string;
  
  /**
   * 타임스탬프 마커 목록
   */
  markers?: TimeMarker[];
  
  /**
   * 마커 클릭 핸들러
   */
  onMarkerClick?: (marker: TimeMarker) => void;
  
  /**
   * 새 마커 추가 핸들러
   */
  onAddMarker?: (timestamp: number) => void;
  
  /**
   * 플레이어 상태 변경 콜백
   */
  onStateChange?: (state: Partial<PlayerState>) => void;
  
  /**
   * 자막 URL (VTT 형식)
   */
  captionsUrl?: string;
  
  /**
   * 자동 재생
   */
  autoplay?: boolean;
  
  /**
   * 컨트롤 자동 숨김 시간 (ms)
   */
  controlsHideDelay?: number;
  
  /**
   * 키보드 단축키 사용 여부
   */
  enableShortcuts?: boolean;
  
  /**
   * 커스텀 클래스명
   */
  className?: string;
}

// ============================================================
// Main Component
// ============================================================

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  markers = [],
  onMarkerClick,
  onAddMarker,
  onStateChange,
  captionsUrl,
  autoplay = false,
  controlsHideDelay = 3000,
  enableShortcuts = true,
  className = ''
}) => {
  // ============================================================
  // State Management
  // ============================================================
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<PlaybackSpeed>('1');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  
  // ============================================================
  // Refs
  // ============================================================
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const seekBarRef = useRef<HTMLDivElement>(null);
  
  // ============================================================
  // Utility Functions
  // ============================================================
  
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    setShowControls(true);
    
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
        setShowVolumeSlider(false);
        setShowSpeedMenu(false);
      }, controlsHideDelay);
    }
  }, [isPlaying, controlsHideDelay]);
  
  // ============================================================
  // Video Control Methods
  // ============================================================
  
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  }, [isPlaying]);
  
  const seek = useCallback((time: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.currentTime = Math.max(0, Math.min(time, duration));
  }, [duration]);
  
  const seekRelative = useCallback((delta: number) => {
    seek(currentTime + delta);
  }, [currentTime, seek]);
  
  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  }, [isMuted]);
  
  const changeVolume = useCallback((newVolume: number) => {
    const video = videoRef.current;
    if (!video) return;
    
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    video.volume = clampedVolume;
    setVolume(clampedVolume);
    
    if (clampedVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
      video.muted = false;
    }
  }, [isMuted]);
  
  const changeSpeed = useCallback((speed: PlaybackSpeed) => {
    const video = videoRef.current;
    if (!video) return;
    
    video.playbackRate = parseFloat(speed);
    setPlaybackSpeed(speed);
    setShowSpeedMenu(false);
  }, []);
  
  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;
    
    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  }, []);
  
  const toggleCaptions = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.textTracks[0]) return;
    
    const track = video.textTracks[0];
    if (captionsEnabled) {
      track.mode = 'hidden';
      setCaptionsEnabled(false);
    } else {
      track.mode = 'showing';
      setCaptionsEnabled(true);
    }
  }, [captionsEnabled]);
  
  // ============================================================
  // Seek Bar Handler
  // ============================================================
  
  const handleSeekBarClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = seekBarRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    
    seek(newTime);
  }, [duration, seek]);
  
  // ============================================================
  // Keyboard Shortcuts
  // ============================================================
  
  useEffect(() => {
    if (!enableShortcuts) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      // 입력 필드에 포커스가 있으면 무시
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekRelative(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekRelative(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(volume + 0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(volume - 0.1);
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'f':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'c':
          e.preventDefault();
          toggleCaptions();
          break;
        case '-':
        case '_':
          e.preventDefault();
          const speeds: PlaybackSpeed[] = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2'];
          const currentIndex = speeds.indexOf(playbackSpeed);
          if (currentIndex > 0) {
            changeSpeed(speeds[currentIndex - 1]);
          }
          break;
        case '=':
        case '+':
          e.preventDefault();
          const speedsUp: PlaybackSpeed[] = ['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2'];
          const currentIndexUp = speedsUp.indexOf(playbackSpeed);
          if (currentIndexUp < speedsUp.length - 1) {
            changeSpeed(speedsUp[currentIndexUp + 1]);
          }
          break;
      }
      
      // Shift + M: 현재 시간에 마커 추가
      if (e.shiftKey && e.key === 'M') {
        e.preventDefault();
        onAddMarker?.(currentTime);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    enableShortcuts,
    togglePlay,
    seekRelative,
    changeVolume,
    volume,
    toggleMute,
    toggleFullscreen,
    toggleCaptions,
    playbackSpeed,
    changeSpeed,
    currentTime,
    onAddMarker
  ]);
  
  // ============================================================
  // Video Event Handlers
  // ============================================================
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handlePlay = () => {
      setIsPlaying(true);
      onStateChange?.({ isPlaying: true });
    };
    
    const handlePause = () => {
      setIsPlaying(false);
      onStateChange?.({ isPlaying: false });
    };
    
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onStateChange?.({ currentTime: video.currentTime });
    };
    
    const handleDurationChange = () => {
      setDuration(video.duration);
      onStateChange?.({ duration: video.duration });
    };
    
    const handleVolumeChange = () => {
      setVolume(video.volume);
      setIsMuted(video.muted);
      onStateChange?.({ volume: video.volume, isMuted: video.muted });
    };
    
    const handleWaiting = () => setIsBuffering(true);
    const handleCanPlay = () => setIsBuffering(false);
    
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('volumechange', handleVolumeChange);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('volumechange', handleVolumeChange);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [onStateChange]);
  
  // ============================================================
  // Auto-hide Controls
  // ============================================================
  
  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [resetControlsTimeout]);
  
  // ============================================================
  // Render
  // ============================================================
  
  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-lg overflow-hidden group ${className}`}
      onMouseMove={resetControlsTimeout}
      onMouseLeave={() => {
        if (isPlaying) {
          setShowControls(false);
          setShowVolumeSlider(false);
          setShowSpeedMenu(false);
        }
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoplay}
        className="w-full h-full object-contain"
        onClick={togglePlay}
      >
        {captionsUrl && (
          <track
            kind="captions"
            src={captionsUrl}
            srcLang="ko"
            label="한국어"
            default
          />
        )}
      </video>
      
      {/* Loading Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white" />
        </div>
      )}
      
      {/* Controls Overlay */}
      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Timeline with Markers */}
        <div className="px-4 pb-2">
          <div
            ref={seekBarRef}
            className="relative h-1 bg-white/20 rounded-full cursor-pointer group/seekbar"
            onClick={handleSeekBarClick}
            role="slider"
            aria-label="비디오 진행 시간"
            aria-valuemin={0}
            aria-valuemax={duration}
            aria-valuenow={currentTime}
          >
            {/* Buffered Progress */}
            <div className="absolute inset-0 bg-white/30 rounded-full" />
            
            {/* Played Progress */}
            <div
              className="absolute left-0 top-0 h-full bg-vridge-500 rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            
            {/* Markers */}
            {markers.map((marker) => (
              <button
                key={marker.id}
                className="absolute top-1/2 -translate-y-1/2 w-2 h-2 bg-warning-500 rounded-full hover:scale-150 transition-transform"
                style={{ left: `${(marker.timestamp / duration) * 100}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  seek(marker.timestamp);
                  onMarkerClick?.(marker);
                }}
                aria-label={`마커: ${marker.label} (${formatTime(marker.timestamp)})`}
              />
            ))}
            
            {/* Scrubber */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg group-hover/seekbar:scale-125 transition-transform"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>
        </div>
        
        {/* Control Buttons */}
        <div className="flex items-center justify-between px-4 pb-4">
          {/* Left Controls */}
          <div className="flex items-center space-x-3">
            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-vridge-300 transition-colors"
              aria-label={isPlaying ? '일시정지' : '재생'}
            >
              {isPlaying ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>
            
            {/* Volume */}
            <div className="relative flex items-center">
              <button
                onClick={toggleMute}
                onMouseEnter={() => setShowVolumeSlider(true)}
                className="text-white hover:text-vridge-300 transition-colors"
                aria-label={isMuted ? '음소거 해제' : '음소거'}
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              
              {/* Volume Slider */}
              {showVolumeSlider && (
                <div
                  className="absolute left-8 flex items-center"
                  onMouseLeave={() => setShowVolumeSlider(false)}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={volume}
                    onChange={(e) => changeVolume(parseFloat(e.target.value))}
                    className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer"
                    aria-label="음량 조절"
                  />
                </div>
              )}
            </div>
            
            {/* Time Display */}
            <div className="text-white text-sm">
              <span>{formatTime(currentTime)}</span>
              <span className="mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
          
          {/* Right Controls */}
          <div className="flex items-center space-x-3">
            {/* Speed Control */}
            <div className="relative">
              <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="text-white hover:text-vridge-300 transition-colors text-sm font-medium"
                aria-label="재생 속도"
              >
                {playbackSpeed}x
              </button>
              
              {showSpeedMenu && (
                <div className="absolute bottom-8 right-0 bg-neutral-900 rounded-lg shadow-lg py-1">
                  {(['0.25', '0.5', '0.75', '1', '1.25', '1.5', '1.75', '2'] as PlaybackSpeed[]).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => changeSpeed(speed)}
                      className={`block w-full px-4 py-1 text-sm text-left hover:bg-neutral-800 ${
                        playbackSpeed === speed ? 'text-vridge-400' : 'text-white'
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Captions Toggle */}
            {captionsUrl && (
              <button
                onClick={toggleCaptions}
                className={`text-white hover:text-vridge-300 transition-colors ${
                  captionsEnabled ? 'text-vridge-400' : ''
                }`}
                aria-label="자막"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 11c0 1.66-1.34 3-3 3h-1.5v1.5h1.5c2.48 0 4.5-2.02 4.5-4.5S17.48 6.5 15 6.5h-1.5V8H15c1.66 0 3 1.34 3 3zm-9 0c0 1.66-1.34 3-3 3H4.5v1.5H6c2.48 0 4.5-2.02 4.5-4.5S8.48 6.5 6 6.5H4.5V8H6c1.66 0 3 1.34 3 3zM20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2z" />
                </svg>
              </button>
            )}
            
            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-vridge-300 transition-colors"
              aria-label={isFullscreen ? '전체화면 나가기' : '전체화면'}
            >
              {isFullscreen ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Keyboard Shortcuts Help (Screen Reader) */}
      <div className="sr-only" aria-live="polite">
        키보드 단축키: 스페이스바-재생/일시정지, 화살표 좌우-탐색, 화살표 상하-음량, M-음소거, F-전체화면, C-자막
      </div>
    </div>
  );
};